# Task 10 — Frontend: Báo giá + Đơn hàng bán

## Bối cảnh
Backend: /sales/quotations, /sales/orders (CRUD + lines + actions/{actionName}). Trạng thái báo giá: NEW→PRICE_REQUESTED→PRICING→APPROVAL_REQUESTED→APPROVED→(ORDER_PENDING/ORDERED/FAILED/CANCELLED/REJECTED). Đơn: DRAFT→APPROVAL_REQUESTED→APPROVED→NOT_DELIVERED→DELIVERED→COMPLETED/CANCELLED.

## PROMPT (dán cho Claude)

```
Làm việc trong C:\Project\Personal\ERP\sourcecode\erp-frontend (đã xong task 08-09).
Đọc system_design/api_design.md mục 4.

Yêu cầu:
1. Component WorkflowBar: nhận status + danh sách action khả dụng theo trạng thái (map cứng theo WorkflowService backend) → render nút (Y/C duyệt, Duyệt, Từ chối, Chuyển đơn hàng, Hủy...); action cần lý do (reject/cancel/mark-failed) mở Modal nhập reason; gọi POST .../actions/{action}; hiện Steps/Tag trạng thái màu theo nhóm (xám draft, xanh dương chờ duyệt, xanh lá approved, đỏ hủy).
2. Trang /sales/quotations: lưới danh sách (lọc status Select, partner LookupSelect, phân trang) + trang chi tiết /sales/quotations/:id kiểu master-detail giống LeanSCRM: header form (KH, loại báo giá, PTTT...), tab Hàng hóa (bảng lines editable: thêm dòng bằng LookupSelect sản phẩm, SL, giá duyệt; xóa dòng), WorkflowBar trên cùng. Chỉ cho sửa khi status NEW/PRICE_REQUESTED/PRICING (khóa form khi khác).
3. Nút "Chuyển đơn hàng" (APPROVED) gọi convert-to-order → điều hướng sang /sales/orders/:newId, message hiện số đơn.
4. Trang /sales/orders tương tự: lưới + chi tiết (header + tab Hàng hóa lines, hiện amount backend tính, tổng tiền + VAT footer), WorkflowBar (Y/C duyệt, Duyệt, Hoàn tất, Xử lý lại, Hủy).
5. Trang tạo mới (/sales/quotations/new): chọn KH bắt buộc, thêm lines, lưu → POST rồi điều hướng chi tiết.
Label/tiền/ngày định dạng vi-VN. Test thủ công đủ luồng: tạo BG → duyệt → chuyển đơn → duyệt đơn.
```

## Nghiệm thu
- Luồng đầy đủ trên UI: tạo báo giá → Y/C duyệt → Duyệt → Chuyển đơn hàng → Duyệt đơn.
- Đơn APPROVED khóa form sửa; nút Hủy bắt nhập lý do; lỗi 409 backend hiện message.
