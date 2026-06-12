# Task 22 — Nâng cấp Inventory theo mô hình ERPNext (Stock)

## Bối cảnh
Điều chỉnh module Inventory (task 03) theo mô hình Stock của ERPNext: sổ kho bất biến **Stock Ledger Entry** kèm định giá tồn, **Bin** theo dõi các loại số lượng (actual/reserved/ordered/projected), **Stock Reconciliation** (kiểm kê), cây kho cha-con, và chuẩn hóa loại Stock Entry.

Map khái niệm:

| ERPNext | Hệ thống hiện tại | Việc cần làm |
|---|---|---|
| Stock Ledger Entry | `stock_move` | Thêm valuation: qty_after_transaction, valuation_rate, stock_value, stock_value_difference |
| Bin | `stock_balance` | Thêm reserved_qty, ordered_qty, projected_qty |
| Stock Entry purpose | `sub_type` | Chuẩn hóa: MATERIAL_RECEIPT / MATERIAL_ISSUE / MATERIAL_TRANSFER / SEND_TO_SUBCONTRACTOR (xuất gia công) / RECEIVE_FROM_SUBCONTRACTOR (nhập SP-TP) / REPACK (điều chỉnh mã) |
| Stock Reconciliation | (chưa có) | Bảng + màn hình kiểm kê |
| Warehouse tree | `warehouse` phẳng | Thêm parent_id |
| Valuation FIFO/MA | (chưa có) | Moving Average trước, FIFO sau |

## PROMPT (dán cho Claude)

```
Làm việc trong C:\Project\Personal\ERP\sourcecode\erp-backend (.NET 9, EF Core, PostgreSQL g_erp). Nâng cấp Inventory theo ERPNext Stock, giữ API cũ tương thích, schema mới qua SchemaBootstrap (idempotent):

1. Warehouse tree: ALTER core.warehouse ADD COLUMN parent_id BIGINT; chỉ kho lá được phát sinh giao dịch (validate, lỗi WH_NOT_LEAF); GET /md/warehouses?tree=true trả dạng cây.
2. Stock Ledger (nâng cấp stock_move thành SLE):
   - ALTER inventory.stock_move thêm: qty_after_transaction NUMERIC(18,4), valuation_rate NUMERIC(18,4), stock_value NUMERIC(18,2), stock_value_difference NUMERIC(18,2), posting_datetime TIMESTAMPTZ.
   - ValuationService (Moving Average per product+warehouse): khi nhập → rate mới = (giá trị tồn + giá trị nhập [đơn giá + landed_cost])/(qty tồn + qty nhập); khi xuất → dùng rate hiện hành, stock_value_difference âm. Ghi các cột trên trong cùng transaction hoàn tất phiếu. Cấu hình AVG/FIFO trong accounting_policy (FIFO để stub NOT_IMPLEMENTED).
   - Endpoint POST /inventory/repost-valuation?productId=&warehouseId= (admin): tính lại toàn bộ SLE theo thứ tự thời gian (như Repost Item Valuation của ERPNext).
3. Bin (stock_balance): thêm reserved_qty (tổng SL chưa giao của SO APPROVED/NOT_DELIVERED), ordered_qty (SL chưa nhận của PO APPROVED/TO_RECEIVE*), projected_qty GENERATED hoặc tính khi đọc = qty_on_hand + ordered_qty - reserved_qty. Cập nhật reserved/ordered tại các sự kiện duyệt/hoàn tất tương ứng. GET /inventory/stock-balance trả đủ 4 cột.
4. Chuẩn hóa Stock Entry purpose: thêm cột purpose TEXT map từ sub_type cũ (giữ sub_type tương thích): MATERIAL_RECEIPT, MATERIAL_ISSUE, MATERIAL_TRANSFER, SEND_TO_SUBCONTRACTOR, RECEIVE_FROM_SUBCONTRACTOR, REPACK. REPACK thay cặp phiếu điều chỉnh mã: 1 phiếu duy nhất có dòng xuất (mã A, qty âm) và dòng nhập (mã B) — giá trị bảo toàn (tổng stock_value_difference = 0).
5. Stock Reconciliation (bảng inventory.stock_reconciliation(_line): kho, ngày, line {product, lot, SL hệ thống snapshot, SL thực đếm, chênh lệch}):
   - POST /inventory/reconciliations (+ nút lấy tồn hiện tại), workflow DRAFT→approve→POSTED: sinh stock_move điều chỉnh (+/- chênh lệch, valuation theo rate hiện hành), outbox event cho kế toán.
   - Import Excel số đếm thực tế (dùng cơ chế import task 18 nếu có).
6. Giữ nguyên các action cũ (fill-from-order, set-actual-as-requested, chuỗi gia công) — chỉ refactor bên dưới sang purpose/valuation mới.
Viết test_inventory_v2.bat: nhập 100 @10k → nhập 50 @16k → check valuation_rate = 12k (MA) → xuất 30 (stock_value_difference = -360k) → reconciliation đếm thực 115 (lệch -5) → POSTED sinh move điều chỉnh → repost-valuation idempotent. Build pass, test cũ vẫn xanh.
```

## Nghiệm thu
- Moving Average đúng số học ví dụ trên; thẻ kho hiện qty_after_transaction + valuation_rate từng dòng.
- Bin: tạo SO 20 chưa giao → reserved_qty 20, projected giảm; PO 50 chưa nhận → ordered_qty 50.
- REPACK 1 phiếu đổi mã giữ nguyên tổng giá trị tồn; Reconciliation lệch âm sinh move điều chỉnh đúng.
