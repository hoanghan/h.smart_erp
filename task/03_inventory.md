# Task 03 — Module Inventory (Kho vận)

## Bối cảnh
Theo "Hướng dẫn nghiệp vụ kho": chứng từ kho hợp nhất `inventory.stock_doc` (RECEIPT/ISSUE/TRANSFER + sub_type), luồng DRAFT → REQUESTED → CONFIRMED (SL thực, lô) → COMPLETED. Tồn kho ghi theo ledger `stock_move` → `stock_balance`. Bảng: `stock_doc(_line)`, `lot`, `stock_move`, `stock_balance`, `gr_cost`, `packing_line`, `delivery_plan`.

## PROMPT (dán cho Claude)

```
Làm việc trong C:\Project\Personal\ERP\sourcecode\erp-backend (.NET 9, EF Core, PostgreSQL g_erp).
Đọc system_design/api_design.md mục Inventory, data_model.md mục 4, pattern controllers hiện có.

Hãy code module Inventory:
1. Entities + mapping: inventory.stock_doc(_line), lot, stock_move, stock_balance (khóa unique product+warehouse+lot), gr_cost, packing_line, delivery_plan.
2. Workflow stock-docs: DRAFT→request→REQUESTED→confirm→CONFIRMED→complete→COMPLETED; cancel (chỉ khi chưa COMPLETED, lý do bắt buộc).
3. Controller /api/v1/inventory/docs:
   - CRUD + lines; lọc theo doc_type/sub_type/status/sales_order_id/purchase_order_id.
   - Action fill-from-order: copy các dòng từ SO (ISSUE/SALES) hoặc PO (RECEIPT/PURCHASE) sang doc lines (requested_qty).
   - Action set-actual-as-requested: actual_qty = requested_qty toàn bộ dòng ("Cập nhật thực tế (Như yêu cầu)").
   - Action complete: validate actual_qty đã nhập; sinh stock_move (+/- theo doc_type; TRANSFER sinh 2 move) trong transaction, cập nhật stock_balance; với ISSUE kiểm tra tồn đủ (lỗi STK_INSUFFICIENT) trừ khi policy cho phép; cập nhật actual_date = hôm nay; cập nhật trạng thái SO (NOT_DELIVERED→DELIVERED khi xuất đủ) / PO (NOT_RECEIVED→RECEIVED).
   - Đánh số: PN/PX/CK{YY}{MM}-{####} theo doc_type (đã có DocNumberingService).
4. GET /api/v1/inventory/stock-balance?warehouseId=&productId= và GET /inventory/stock-moves (thẻ kho, lọc theo product+warehouse+khoảng ngày).
5. Tạo SO action create-delivery-request (trên SalesOrdersController): sinh stock_doc ISSUE/SALES tham chiếu đơn, đơn → NOT_DELIVERED. Tương tự PO create-receipt-request.
Sau khi xong: tạo test_inventory.bat: nhập kho 100 (PO) → xuất 10 (SO) → check stock-balance = 90 → xuất 1000 expect 409 STK_INSUFFICIENT. Build pass.
```

## Nghiệm thu
- Hoàn tất phiếu nhập 100, xuất 10 → stock_balance 90, stock_move 2 dòng.
- Xuất vượt tồn → 409 STK_INSUFFICIENT; đơn hàng bán chuyển DELIVERED khi xuất đủ.
