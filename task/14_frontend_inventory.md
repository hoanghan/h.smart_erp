# Task 14 — Frontend: Quản lý kho (Inventory)

## Bối cảnh
Backend đã có: `/api/v1/inventory/docs` (CRUD + lines + actions: request/confirm/complete/cancel, fill-from-order, set-actual-as-requested, create-outsourcing-issue, create-finished-receipt), `/inventory/stock-balance`, `/inventory/stock-moves`, lô (`lot`), chi phí nhập kho (`gr_cost`). Workflow stock-docs: DRAFT→REQUESTED→CONFIRMED→COMPLETED/CANCELLED. Sub_type nhập: PURCHASE, CUSTOMER_RETURN, FINISHED_GOODS, RECEIPT_OTHER, RECEIPT_CODE_ADJUST; xuất: SALES, OUTSOURCING, SUPPLIER_RETURN, ISSUE_OTHER, ISSUE_CODE_ADJUST; chuyển: INTERNAL_TRANSFER.

## PROMPT (dán cho Claude)

```
Làm việc trong C:\Project\Personal\ERP\sourcecode\erp-frontend (đã xong task 08-10, 13).
Đọc system_design/api_design.md mục 6 và WorkflowService.Definitions["stock-docs"].

Hãy code nhóm trang Kho hàng (menu "Kho hàng"):
1. /inventory/receipts — Nhập kho: lưới stock_doc doc_type=RECEIPT (cột: số phiếu, sub_type Tag màu, số tham chiếu PO/SO, kho nhập, đối tượng, trạng thái, ngày). Nút Thêm chọn sub_type. 
2. /inventory/issues — Xuất kho: tương tự với doc_type=ISSUE; /inventory/transfers — Chuyển kho (kho xuất + kho nhập).
3. Trang chi tiết phiếu kho dùng chung /inventory/docs/:id:
   - Header theo doc_type: kho xuất/nhập, đối tượng (LookupSelect partner), quy trình gia công (Select process — chỉ hiện khi sub_type OUTSOURCING/FINISHED_GOODS), số tham chiếu, ghi chú.
   - Lưới lines: sản phẩm, SL yêu cầu, SL thực tế (cột editable chỉ khi REQUESTED/CONFIRMED), lô (input mã lô + ngày hết hạn khi nhập), SL bộ.
   - Nút "Lấy hàng từ đơn" (fill-from-order — hiện khi có PO/SO tham chiếu và DRAFT), "Cập nhật thực tế = yêu cầu" (set-actual-as-requested).
   - WorkflowBar: Yêu cầu → Xác nhận → Hoàn tất → (Hủy kèm lý do). Sau Hoàn tất: phiếu khóa toàn bộ, hiện ngày thực tế.
   - Với phiếu nhập COMPLETED sub_type PURCHASE: nút "YC Xuất cho SX-DV" (create-outsourcing-issue, modal chọn quy trình + NCC gia công); phiếu xuất OUTSOURCING COMPLETED: nút "YC Nhập SP-TP" (create-finished-receipt). Điều hướng sang phiếu mới sinh.
   - Tab Chi phí nhập kho (gr_cost) cho phiếu nhập: CRUD + Duyệt chi phí.
4. /inventory/stock — Tồn kho: bảng stock-balance (lọc kho Select, sản phẩm LookupSelect; cột SL tồn, lô); highlight đỏ khi tồn < min_stock của sản phẩm.
5. /inventory/moves — Thẻ kho: chọn sản phẩm + kho + khoảng ngày → bảng stock_move (+/- SL, số phiếu link sang chi tiết, tồn lũy kế tính phía client).
Label tiếng Việt, số format vi-VN. Test: nhập 100 → xuất 10 → tồn kho hiện 90, thẻ kho 2 dòng.
```

## Nghiệm thu
- Luồng UI nhập kho từ PO (fill-from-order → xác nhận SL thực → hoàn tất) và xuất kho bán; tồn kho + thẻ kho khớp số.
- Chuỗi gia công trên UI: nút sinh phiếu xuất SX-DV / nhập SP-TP điều hướng đúng, bắt buộc chọn quy trình.
