# Task 13 — Frontend: Mua hàng (Purchasing)

## Bối cảnh
Backend đã có: `/api/v1/purchasing/requests`, `/purchasing/orders` (CRUD + lines + costs + actions/{actionName}), `/purchasing/orders/{id}/payment-requests|payment-actuals`, `/purchasing/payments` (duyệt ĐNTT), `/purchasing/supplier-returns`, `/purchasing/outsourcing-costs`. Workflow: PO DRAFT→APPROVED→NOT_RECEIVED→RECEIVED→COMPLETED/CANCELLED; ĐNTT DRAFT→APPROVED. Yêu cầu task 08-10 (scaffold, CrudPage, LookupSelect, WorkflowBar, DataTable) đã xong.

## PROMPT (dán cho Claude)

```
Làm việc trong C:\Project\Personal\ERP\sourcecode\erp-frontend (đã có scaffold + components task 08-10).
Đọc system_design/api_design.md mục 5 và WorkflowService.Definitions trong backend (purchase-orders, po-payments, purchase-requests, supplier-returns) để map nút action.

Hãy code nhóm trang Mua hàng (menu "Mua hàng"):
1. /purchasing/requests — Yêu cầu mua hàng: lưới + chi tiết master-detail (header: người YC, bộ phận; lines: sản phẩm LookupSelect, SL, ngày cần); WorkflowBar (Duyệt, Hủy kèm lý do).
2. /purchasing/orders — Đơn hàng mua: lưới (lọc status, NCC LookupSelect partners?is_supplier=true) + trang chi tiết:
   - Header: NCC, ngày đặt/ngày nhận KH, hình thức (NORMAL/SERVICE/OUTSOURCING — Select), PTTT, ĐC nhận, cờ VAT.
   - Tab Hàng hóa: lines editable (sản phẩm, SL, đơn giá, VAT) — khóa khi status ≠ DRAFT.
   - Tab Chi phí: po_cost CRUD (loại chi phí LookupSelect cost-types, NCC dịch vụ, mức phí, VAT, số phiếu nhập tham chiếu) + nút Duyệt chi phí từng dòng; lỗi COST_NO_RECEIPT_REF hiện rõ message.
   - Tab Thanh toán: 2 bảng — Đề nghị thanh toán (thêm đợt: hạn, số tiền; nút Duyệt) và Thực tế thanh toán.
   - Tab Nhận hàng: list stock_doc RECEIPT tham chiếu PO (link sang trang kho); nút "Thêm phiếu nhập kho" gọi action create-receipt-request.
   - WorkflowBar: Duyệt, Hoàn tất, Hủy (lý do).
3. /purchasing/payments — màn hình Thanh toán mua hàng: lưới tất cả ĐNTT (lọc trạng thái, NCC), nút Duyệt thanh toán (confirm) — sau duyệt hiện tag "Đã chuyển FRM" nếu backend trả SENT_FRM.
4. /purchasing/supplier-returns — Trả hàng NCC: lưới + chi tiết đơn giản (chọn PO nguồn, lines, Duyệt).
Tổng tiền/VAT footer các tab lines; format vi-VN; label tiếng Việt. Test thủ công: tạo PO → duyệt → thêm ĐNTT → duyệt ĐNTT.
```

## Nghiệm thu
- Luồng UI: tạo PO 2 dòng hàng → Duyệt → tab Thanh toán thêm ĐNTT → màn Thanh toán mua hàng duyệt được.
- PO đã APPROVED khóa sửa lines; duyệt chi phí thiếu số phiếu nhập hiện lỗi đúng.
