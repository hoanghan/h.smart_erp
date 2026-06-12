# Task 28 — Kết nối đơn hàng Shopee & TikTok Shop

## Bối cảnh
Solution chi tiết: `system_design/ecommerce_integration.md` (đọc trước khi code). Tóm tắt: connector layer chung (schema `channel`) kéo đơn từ sàn → map SKU → tự tạo Sales Order → xuất kho → đối soát phí sàn vào kế toán TT200; đẩy tồn kho ngược lên sàn. Chia 3 phần làm tuần tự (có thể 3 phiên).

## PROMPT A — Connector core + kết nối shop (dán cho Claude)

```
Làm việc trong C:\Project\Personal\ERP\sourcecode\erp-backend (.NET 9, EF Core, PostgreSQL g_erp).
Đọc system_design/ecommerce_integration.md trước. Tạo schema channel (SchemaBootstrap idempotent).

1. Bảng: channel.connection (platform SHOPEE/TIKTOK, shop_id, shop_name, access_token_enc, refresh_token_enc, token_expire_at, refresh_expire_at, status ACTIVE/EXPIRED/REVOKED, default_warehouse_id, partner_id — partner đại diện khách sàn, last_pull_at), channel.sync_log (connection_id, job_type, from/to time, total, success, failed, error JSONB, created_at).
2. Interface IChannelClient { GetOrdersAsync(since, cursor), GetOrderDetailAsync(orderSn), PushStockAsync(items), GetSettlementsAsync(from,to), RefreshTokenAsync() } + ChannelClientFactory theo platform.
3. ShopeeClient (Open Platform v2): ký HMAC-SHA256 (partner_key, path, timestamp, access_token, shop_id), base URL config (sandbox/prod), endpoints get_order_list (paging cursor, theo update_time) + get_order_detail + update_stock + escrow_detail + auth/token/get + access_token/refresh. TikTokClient tương tự (sign theo app_secret, /orders/search, /order/detail, /inventory, /settlements, /token/refresh). Dùng HttpClientFactory + Polly (retry 3 lần exponential, xử lý 429 rate limit).
4. OAuth kết nối shop: GET /api/v1/channel/connect/{platform} trả authorize URL; GET /api/v1/channel/callback/{platform}?code=&shop_id= đổi code lấy token, mã hóa bằng ASP.NET Data Protection, lưu connection. CRUD /api/v1/channel/connections (list/ngắt kết nối/chọn kho mặc định + partner đại diện — tự tạo partner "Khách {platform} - {shop}" nếu chưa có).
5. Hangfire RefreshTokenJob: refresh trước hạn 30', connection lỗi refresh → status EXPIRED + notification.
6. Secrets: Channel:Shopee:PartnerId/PartnerKey, Channel:TikTok:AppKey/AppSecret từ config/env. KHÔNG hardcode.
Test: unit test ký HMAC đúng vector mẫu của docs sàn; mock IChannelClient. Build pass.
```

## PROMPT B — Đồng bộ đơn → Sales Order + tồn kho (dán cho Claude)

```
Tiếp tục task 28 (PROMPT A đã xong). Đọc system_design/ecommerce_integration.md mục 3.

1. Bảng: channel.product_map (connection_id, platform_item_id, platform_sku, product_id, UNIQUE(connection_id, platform_sku)); channel.order (connection_id, order_sn UNIQUE theo connection, order_status sàn, payload JSONB, buyer_name/phone/address masked, total, fee_total, mapped_so_id, sync_status RAW/MAPPED/SO_CREATED/MAPPING_ERROR/CANCELLED, error_detail, pulled_at).
2. PullOrdersJob (Hangfire 5'/connection ACTIVE): GetOrders theo last_pull_at (trừ 10' overlap) → upsert channel.order idempotent → với đơn mới: map từng dòng qua product_map; thiếu map → MAPPING_ERROR (không chặn đơn khác).
3. Đơn MAPPED → tạo sales.sales_order tự động: partner = partner đại diện connection, sales_channel = platform, order_form ECOMMERCE (thêm enum), warehouse = default_warehouse, lines theo map (giá = giá bán sàn), ghi địa chỉ người nhận vào delivery addr/note; SO tự APPROVED (bỏ bước duyệt tay với đơn sàn — config được) → reserve tồn.
4. Map trạng thái sàn → hành động: READY_TO_SHIP → tạo phiếu xuất (create-delivery-request + fill-from-order); SHIPPED/COMPLETED → hoàn tất phiếu xuất + SO; CANCELLED trước giao → hủy SO (giải phóng reserve); trả hàng → tạo stock_doc CUSTOMER_RETURN. Xử lý qua webhook POST /api/v1/channel/webhooks/{platform} (verify chữ ký, enqueue Hangfire, trả 200 ngay) + đối chiếu khi pull.
5. PushStockJob: khi stock_balance thay đổi (debounce 1', gom theo product) → PushStock các SKU đã map ở mọi connection ACTIVE; log sync_log; lỗi từng SKU không chặn batch.
6. Màn hình FE (erp-frontend, menu "Kênh bán hàng"): /channel/connections (kết nối OAuth, trạng thái token), /channel/product-map (lưới map SKU + import Excel theo cơ chế task 18), /channel/orders (lưới đơn sàn: tab theo sync_status, nút "Map lại & tạo đơn" cho MAPPING_ERROR, link sang SO), badge số đơn lỗi map trên menu.
Test integration với MockChannelClient: pull 3 đơn (1 thiếu map) → 2 SO tự tạo + 1 MAPPING_ERROR → map bổ sung → retry OK; webhook READY_TO_SHIP sinh phiếu xuất. Build pass.
```

## PROMPT C — Đối soát & kế toán TT200 (dán cho Claude)

```
Tiếp tục task 28 (A, B đã xong; task 06/23 finance đã có). Đọc system_design/ecommerce_integration.md mục 4.

1. Bảng channel.settlement (connection_id, settlement_id/escrow order_sn, period, gross_amount, fee_commission, fee_payment, fee_service, voucher_platform, net_amount, payload JSONB, status PULLED/POSTED, voucher_id) — PullSettlementJob hằng ngày.
2. Seed TK: 131 mở tiểu khoản theo sàn (131SHP, 131TTS — object = partner đại diện), 641 chi tiết "Phí sàn TMĐT" (6418), cấu hình mapping trong accounting_policy hoặc bảng channel.account_map (platform → TK 131 con, TK phí).
3. Hạch toán (qua PostingService, TT200):
   - Sàn xác nhận giao thành công (COMPLETED): Nợ 131-sàn / Có 511, Có 33311 theo từng SO (make-invoice tự động).
   - Post settlement: Nợ 112 (net) + Nợ 6418 (tổng phí + voucher sàn) / Có 131-sàn (gross); chênh lệch đối soát ≠ 0 → treo 1388/3388 + cảnh báo.
   - Đơn hoàn sau ghi nhận DT: 5212 + nhập kho trả (đã có flow B).
4. Màn hình FE /channel/settlements: lưới kỳ đối soát, chi tiết phí theo đơn, nút Ghi sổ (xem trước bút toán), trạng thái lệch; báo cáo /channel/reports/revenue?platform=&from=&to= (doanh thu, phí, net theo sàn/shop — đối chiếu GL).
Test: settlement mẫu gross 10tr, phí 1.2tr → bút toán Nợ 112 8.8tr + Nợ 6418 1.2tr / Có 131SHP 10tr, trial balance cân; lệch 50k → treo 1388 + cảnh báo. Build pass.
```

## Nghiệm thu tổng
- Kết nối shop OAuth, token tự refresh; đơn sàn về tự thành SO + phiếu xuất theo trạng thái sàn; đơn thiếu map không chặn luồng và xử lý lại được.
- Tồn kho đẩy lên sàn khi thay đổi; hủy/hoàn xử lý đúng tồn + kế toán.
- Đối soát ghi sổ đúng TT200, lệch được phát hiện; báo cáo doanh thu theo sàn khớp GL.
