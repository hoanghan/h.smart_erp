# SOLUTION — Tích hợp đơn hàng Shopee & TikTok Shop

## 1. Mục tiêu
Đồng bộ 2 chiều giữa ERP và sàn TMĐT: **kéo đơn hàng về** tự tạo Sales Order → xuất kho → đối soát doanh thu/phí sàn vào kế toán (TT200); **đẩy tồn kho/giá lên sàn** để tránh oversell.

## 2. Kiến trúc

```
   Shopee Open Platform v2            TikTok Shop Open API
   (OAuth shop, sign HMAC)            (app key/secret, sign HMAC)
          │  pull (Hangfire) + webhook push  │
          ▼                                   ▼
┌──────────────────────────────────────────────────────────┐
│         CHANNEL CONNECTOR LAYER (schema: channel)        │
│  IChannelClient (interface chung)                        │
│   ├── ShopeeClient    (token, sign, paging, rate limit)  │
│   └── TikTokClient                                       │
│  channel_connection   — shop đã kết nối + token (mã hóa) │
│  channel_product_map  — SKU sàn ↔ product ERP            │
│  channel_order        — đơn RAW từ sàn (payload JSONB)   │
│  channel_sync_log     — nhật ký pull/push, lỗi, retry    │
└──────────────┬───────────────────────────────────────────┘
               ▼ map SKU + khách sàn
        sales.sales_order (sales_channel = SHOPEE/TIKTOK)
               ▼ ready-to-ship
        inventory.stock_doc (xuất bán) → SLE → GL perpetual
               ▼ đối soát (escrow/settlement)
        finance: 131-sàn / 511 / 641 phí sàn / 33311
```

### Nguyên tắc
- **Connector pattern**: mọi sàn implement chung `IChannelClient` (GetOrders, GetOrderDetail, AckOrder, PushStock, PushPrice, GetSettlements) — thêm Lazada/Tiki sau không sửa core.
- **Idempotent**: channel_order unique theo (platform, shop_id, order_sn); pull lặp không tạo trùng SO.
- **Đơn RAW tách khỏi SO**: lưu payload gốc JSONB để đối chiếu/đồng bộ lại; map SKU lỗi thì đơn nằm trạng thái MAPPING_ERROR chờ xử lý tay, không chặn các đơn khác.
- **Token an toàn**: access/refresh token mã hóa (Data Protection API), tự refresh trước hạn (Shopee ~4h, refresh 30 ngày; TikTok ~7 ngày) bằng Hangfire.
- **Webhook + Pull kép**: webhook (order status push) cho realtime, pull định kỳ 5-10 phút làm lưới an toàn (sàn có thể miss webhook).

## 3. Luồng nghiệp vụ

| Bước | Shopee | TikTok | ERP |
|---|---|---|---|
| Kết nối shop | OAuth authorize → code → access_token (partner sign HMAC-SHA256) | OAuth shop cấp quyền → access_token | Lưu channel_connection |
| Kéo đơn | get_order_list + get_order_detail (theo update_time, paging cursor) | /orders/search + detail | channel_order RAW → map → SO |
| Khách hàng | Ẩn danh (masked) | Ẩn danh | 1 partner đại diện mỗi shop ("Khách Shopee — {shop}") + lưu tên/ĐT người nhận trên SO |
| Xác nhận giao | ship_order / logistics | fulfillment | SO duyệt tự động → phiếu xuất khi READY_TO_SHIP |
| Hủy/Trả | webhook status CANCELLED / return | reverse order | Hủy SO/phiếu xuất hoặc tạo nhập hàng trả |
| Đối soát | escrow_detail (phí sàn, phí TT, voucher sàn) | settlements | Bút toán TT200 (mục 4) |
| Tồn kho | update_stock theo model/SKU | inventory sync | Push khi stock_balance đổi (debounce) |

## 4. Hạch toán TT200 cho đơn sàn
- Khi xuất kho giao hàng: Nợ 632 / Có 156 (perpetual như SO thường); doanh thu ghi nhận khi sàn xác nhận giao thành công: Nợ 131-{sàn} / Có 511, Có 33311.
- Đối soát escrow/settlement: số tiền thực nhận = doanh thu − phí cố định − phí TT − phí dịch vụ − voucher sàn tài trợ:
  Nợ 112 (thực nhận) + Nợ 641-phí sàn (tổng phí) / Có 131-{sàn}.
- Hàng hủy sau xuất / hoàn: nhập lại kho (Nợ 156/Có 632) + giảm doanh thu (5212) nếu đã ghi nhận.
- Mỗi sàn 1 tiểu khoản 131 (vd 131SHP, 131TTS) — đối tượng partner đại diện shop.

## 5. Thành phần triển khai
- Schema `channel` + entities/EF; `ShopeeClient`/`TikTokClient` (HttpClientFactory + Polly retry, ký HMAC, quản lý token).
- Hangfire jobs: `PullOrdersJob` (mỗi 5'), `RefreshTokenJob`, `PushStockJob` (debounce 1'), `PullSettlementJob` (hằng ngày).
- Webhook endpoints: `POST /api/v1/channel/webhooks/shopee|tiktok` (verify chữ ký, enqueue xử lý — trả 200 ngay).
- Màn hình FE: Kết nối shop (OAuth), Map SKU (lưới + import Excel), Đơn sàn (lưới theo trạng thái + lỗi map), Đối soát.
- Cấu hình: partner_id/key (Shopee), app_key/secret (TikTok) trong biến môi trường; mỗi shop 1 connection.
- Sandbox/test: dùng môi trường test của 2 sàn; mock IChannelClient cho unit test.
