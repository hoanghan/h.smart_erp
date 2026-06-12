# Task 05 — LERP Bridge (SCRM → Kế toán)

## Bối cảnh
Mọi chứng từ nguồn khi hoàn tất/duyệt phát sinh phiếu LERP chờ kế toán "Phát sinh phiếu" → Ghi sổ (xem system_design.md mục 3.5). Bảng: `finance.outbox_event`, `finance.lerp_voucher` (UNIQUE source_table+source_id+voucher_type, trạng thái PENDING→GENERATED→POSTED/DELETED).

## PROMPT (dán cho Claude)

```
Làm việc trong C:\Project\Personal\ERP\sourcecode\erp-backend. Yêu cầu task 01-04 đã xong.
Đọc system_design.md mục 3.5 (bảng mapping LERP) và data_model.md mục 5.

Hãy code lớp tích hợp LERP:
1. Entities + mapping finance.outbox_event, finance.lerp_voucher.
2. OutboxService.Publish(eventType, sourceTable, sourceId, payload) — ghi outbox_event TRONG CÙNG transaction với chứng từ nguồn. Gắn vào các điểm phát sinh:
   - stock_doc COMPLETED: ISSUE/SALES→PHIEU_XUAT, RECEIPT/PURCHASE→PHIEU_NHAP, RECEIPT/CUSTOMER_RETURN→HANG_TRA_LAI, ISSUE/SUPPLIER_RETURN→TRA_HANG_NCC, TRANSFER→CHUYEN_KHO, RECEIPT/ISSUE khác→NHAP_KHO/XUAT_KHO.
   - po-payment approve→YCC; so_payment_request→YCT; cost approve (so_cost, po_cost, gr_cost)→PGC.
3. Worker BackgroundService (IHostedService) poll outbox_event chưa processed mỗi 5s → tạo lerp_voucher PENDING (idempotent nhờ unique constraint, bỏ qua duplicate), đánh dấu processed_at.
4. Controller /api/v1/finance/lerp: GET list (lọc type/status), action generate (PENDING→GENERATED — tạm thời chỉ đổi trạng thái, phần sinh finance.voucher để task 06), action delete (→DELETED, chỉ khi chưa POSTED).
5. Ràng buộc đồng nhất dữ liệu: chặn cancel/reprocess chứng từ nguồn nếu lerp_voucher tương ứng đã GENERATED/POSTED → 409 SO_HAS_ACCOUNTING_DOC (đúng quy tắc "Xử lý lại đơn hàng" trong tài liệu).
Tạo test_lerp.bat: hoàn tất 1 phiếu xuất → đợi 6s → GET /finance/lerp thấy PHIEU_XUAT PENDING → generate → thử reprocess đơn hàng nguồn expect 409. Build pass.
```

## Nghiệm thu
- Hoàn tất phiếu kho → sau ≤6s có lerp_voucher PENDING tương ứng, không trùng khi chạy lại.
- Hủy chứng từ nguồn khi đã GENERATED → 409 SO_HAS_ACCOUNTING_DOC.
