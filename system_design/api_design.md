# THIẾT KẾ API — Hệ thống ERP

> REST API do BackEnd (ASP.NET Core 8) cung cấp; FrontEnd (React + TypeScript) và mọi client khác chỉ giao tiếp qua tầng này.
> Base URL: `https://<host>/api/v1` · OpenAPI spec: `/api/v1/openapi.json` (FE sinh client tự động).

## 1. Quy ước chung

| Mục | Quy ước |
|---|---|
| Versioning | Prefix `/api/v1`; breaking change → `/api/v2`, giữ v1 song song |
| Auth | `POST /auth/login` → access token (JWT, 15') + refresh token (httpOnly cookie, 7d); header `Authorization: Bearer <token>` |
| Phân quyền | RBAC kiểm tra ở middleware theo bảng `core.permission` (subject × action); 403 nếu thiếu quyền |
| Phân trang | `?page=1&size=50` → `{ "items": [...], "total": n, "page": 1, "size": 50 }` |
| Lọc/sắp xếp | `?filter[status]=APPROVED&filter[partner_id]=5&sort=-doc_date` |
| Lỗi | `{ "error": { "code": "SO_INVALID_STATE", "message": "...", "detail": {...} } }`; 400/401/403/404/409/422 |
| Idempotency | Header `Idempotency-Key` cho các POST tạo chứng từ |
| Audit | Mọi request ghi `core.audit_log` (user, action, payload) |
| Realtime | WebSocket `/ws/notifications` — thông báo duyệt, LERP mới, job cuối kỳ xong |

Chuyển trạng thái chứng từ dùng chung mẫu **action endpoint**: `POST /<resource>/{id}/actions/<action>` (body có thể kèm `reason`). Server kiểm tra máy trạng thái + quyền duyệt, ghi `wf_transition_log`.

## 2. Auth & Quản trị

```
POST   /auth/login                 # đăng nhập → tokens
POST   /auth/refresh               # cấp lại access token
POST   /auth/logout
GET    /auth/me                    # user + quyền + data scope

GET/POST       /admin/users        ·  GET/PUT/DELETE /admin/users/{id}
GET/POST       /admin/groups      ·  PUT /admin/groups/{id}/members
GET/PUT        /admin/permissions  # gán quyền theo user/group
GET/PUT        /admin/doc-numbering
GET/PUT        /admin/company-info
```

## 3. Master data (`/md`)

CRUD chuẩn `GET/POST /md/<res>`, `GET/PUT/DELETE /md/<res>/{id}` cho:
`departments, job-titles, positions, employees, uoms, currencies, exchange-rates, payment-methods, delivery-methods, cost-types, processes, product-groups, products, warehouses, warehouse-locations, partners`.

Điểm riêng:

```
GET    /md/products/{id}/bom              # cấu trúc hàng BỘ
PUT    /md/products/{id}/bom
GET    /md/partners?is_customer=true      # lọc KH / NCC
GET    /md/partners/{id}/contacts|addresses|bank-accounts|sales-costs
GET    /md/products/lookup?q=...          # lookup nhanh cho lưới nhập liệu
```

## 4. Sales (`/sales`)

```
# Cơ hội
GET/POST /sales/opportunities · GET/PUT /sales/opportunities/{id}
POST     /sales/opportunities/{id}/actions/convert-to-order

# Báo giá
GET/POST /sales/quotations · GET/PUT /sales/quotations/{id}
POST /sales/quotations/{id}/actions/request-pricing | calc-price | request-approval
     | approve | reject | convert-to-order | mark-failed | cancel
POST /sales/quotations/{id}/pricing/calc        # body: {mode: ALL|BY_CODE|WEIGHT|COPY}
GET/PUT /sales/pricing-formulas

# Bảng giá, KM-CK, chỉ tiêu
GET/POST /sales/price-lists · /sales/price-lists/{id}/items
GET/POST /sales/promotions  · /sales/promotions/{id}/discount-items | gift-items
GET/PUT  /sales/targets

# Đơn hàng bán
GET/POST /sales/orders · GET/PUT /sales/orders/{id}
POST /sales/orders/{id}/actions/request-approval | approve | complete
     | reprocess | cancel                          # reprocess = "Xử lý lại đơn hàng"
GET/POST /sales/orders/{id}/lines
PUT      /sales/orders/{id}/promotions             # áp KM-CK (tab Khấu trừ)
GET/POST /sales/orders/{id}/payment-requests | payment-actuals
GET/POST /sales/orders/{id}/costs
POST     /sales/orders/{id}/costs/{cid}/actions/approve | unapprove   # duyệt chi phí → PGC
POST     /sales/orders/{id}/delivery-requests      # tạo YC xuất kho → trả về stock_doc

# Giảm giá hàng bán
GET/POST /sales/allowances · POST /sales/allowances/{id}/actions/approve
```

## 5. Purchasing (`/purchasing`)

```
GET/POST /purchasing/requests                      # yêu cầu mua hàng
GET/POST /purchasing/orders · GET/PUT /purchasing/orders/{id}
POST /purchasing/orders/{id}/actions/approve | complete | cancel
GET/POST /purchasing/orders/{id}/lines | costs
POST /purchasing/orders/{id}/costs/{cid}/actions/approve
POST /purchasing/orders/{id}/receipt-requests      # tạo YC nhập kho
POST /purchasing/orders/{id}/collect-service-costs # tập hợp chi phí gia công → PO dịch vụ

# Thanh toán NCC
GET/POST /purchasing/orders/{id}/payment-requests | payment-actuals
GET      /purchasing/payments                      # màn hình Thanh toán mua hàng
POST     /purchasing/payments/{id}/actions/approve # duyệt → sinh LERP-YCC

# Trả hàng NCC & chi phí gia công
GET/POST /purchasing/supplier-returns
GET/POST /purchasing/outsourcing-costs
```

## 6. Inventory (`/inventory`)

```
GET/POST /inventory/docs                # ?doc_type=RECEIPT|ISSUE|TRANSFER&sub_type=...
GET/PUT  /inventory/docs/{id}
POST /inventory/docs/{id}/actions/request | confirm | complete | cancel
POST /inventory/docs/{id}/actions/fill-from-order      # "Thêm các mặt hàng từ đơn hàng"
POST /inventory/docs/{id}/actions/set-actual-as-requested  # "Cập nhật thực tế (Như yêu cầu)"
POST /inventory/docs/{id}/actions/create-outsourcing-issue # YC Xuất cho SX-DV
POST /inventory/docs/{id}/actions/create-finished-receipt  # YC Nhập SP-TP
POST /inventory/docs/{id}/actions/create-adjust-counterpart # YC nhập/xuất điều chỉnh mã

GET/POST /inventory/docs/{id}/lines | costs | packing | delivery-plans
POST     /inventory/docs/{id}/costs/{cid}/actions/approve

GET /inventory/stock-balance            # ?warehouse_id=&product_id=&lot_id=
GET /inventory/stock-moves              # thẻ kho / nhật ký
GET /inventory/lots · POST /inventory/lots
GET /inventory/docs/{id}/print?template=phieu_xuat|lenh_soan_hang   # PDF
```

## 7. Finance (`/finance`)

```
# Danh mục kế toán
GET/POST /finance/accounts · GET/PUT /finance/accounts/{id}     # cây TK
GET/POST /finance/object-categories · /finance/operations · /finance/funds
GET/POST /finance/periods · POST /finance/periods/{id}/actions/open | close
GET/PUT  /finance/opening-balances · GET/PUT /finance/policy

# LERP (cầu nối SCRM → kế toán)
GET  /finance/lerp?type=PHIEU_NHAP&status=PENDING
POST /finance/lerp/{id}/actions/generate       # "Phát sinh phiếu" → voucher
POST /finance/lerp/{id}/actions/delete

# Chứng từ kế toán
GET/POST /finance/vouchers                     # ?voucher_type=...
GET/PUT  /finance/vouchers/{id}
POST /finance/vouchers/{id}/actions/approve | post | unlock      # Duyệt / Ghi sổ / Mở khóa
GET  /finance/vouchers/{id}/gl-entries         # nút "C/từ" — xem bút toán
POST /finance/vouchers/{id}/actions/declare-vat  # kê khai hóa đơn

# TSCĐ / CCDC / CPPB
GET/POST /finance/assets · /finance/assets/{id}/reports | alloc-rules
GET/POST /finance/prepaid · /finance/prepaid/{id}/cards | alloc-rules
GET      /finance/depreciation?period_id=      # bảng khấu hao (đen/đỏ = is_valid)

# Thuế
GET/POST /finance/vat-invoices · GET /finance/vat-deduction?period_id=
GET/POST /finance/cit-declarations

# Cuối kỳ (chạy async qua worker, theo dõi job)
POST /finance/closing/{period_id}/run          # body: {steps: [DEPRECIATION, ...]}
GET  /finance/closing/{period_id}              # trạng thái từng bước
GET  /finance/costing?period_id=&process_id=   # giá thành gia công
```

## 8. Báo cáo (`/reports`)

```
GET  /reports                                   # danh sách báo cáo theo quyền
POST /reports/{code}/run                        # body: tham số kỳ/kho/đối tượng
GET  /reports/jobs/{job_id}                     # poll kết quả (báo cáo nặng chạy worker)
GET  /reports/jobs/{job_id}/download?format=pdf|xlsx
GET  /dashboard/widgets                         # số liệu đồ thị phân tích
```

## 9. Mã lỗi nghiệp vụ tiêu biểu

| Code | Tình huống |
|---|---|
| `WF_INVALID_TRANSITION` | Chuyển trạng thái không hợp lệ với máy trạng thái |
| `WF_NO_APPROVAL_RIGHT` | User không có quyền duyệt loại chứng từ này |
| `SO_HAS_ACCOUNTING_DOC` | Sửa/hủy đơn khi đã có phiếu kế toán — yêu cầu kế toán xóa phiếu trước |
| `STK_INSUFFICIENT` | Xuất vượt tồn (khi policy không cho phép) |
| `STK_KIT_STRUCTURE` | Số lượng hàng BỘ không khớp cấu trúc bộ |
| `FIN_PERIOD_CLOSED` | Ghi sổ vào kỳ đã khóa |
| `FIN_DUP_INVOICE` | Trùng hóa đơn mua vào/bán ra |
| `COST_NO_RECEIPT_REF` | Duyệt chi phí mua hàng thiếu Số phiếu nhập |
