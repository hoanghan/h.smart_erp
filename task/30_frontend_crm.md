# Task 30 — Frontend: CRM (Lead, Opportunity, Campaign)

## Bối cảnh
Backend task 25: `/api/v1/crm/leads`, `/crm/opportunities` (+lines, actions, make-quotation), `/md/lead-sources|sales-stages|campaigns|lost-reasons`, `/crm/{ref}/{id}/timeline`, `/crm/reports/funnel|lead-conversion|lost-reasons`, notification TODO quá hạn. Stack: Syncfusion (bảng quy đổi trong task 08); cần task 08-10 xong.

## PROMPT (dán cho Claude)

```
Làm việc trong C:\Project\Personal\ERP\sourcecode\erp-frontend. Đọc task/25_crm_erpnext.md (API) + bảng component task 08. Menu mới "CRM".

1. Danh mục (CrudPage): /crm/lead-sources, /crm/sales-stages (cột thứ tự + probability %), /crm/campaigns (kèm budget, cost center), /crm/lost-reasons.
2. /crm/leads — Lead:
   - Lưới (lọc trạng thái ChipList, nguồn, campaign, NV phụ trách) + nút Thêm: form DialogComponent; khi nhập email/phone gọi check trùng → hiện danh sách nghi trùng (cho phép "Vẫn tạo" force=true).
   - Trang chi tiết: thông tin liên hệ + WorkflowBar (Open/Replied/Convert to Opportunity/Convert to Customer/Lost kèm lý do/Do Not Contact) + panel Timeline bên phải (mục 4).
3. /crm/opportunities — Opportunity:
   - 2 chế độ xem chuyển bằng Toolbar: Lưới (GridComponent) và **Kanban theo sales_stage** (KanbanComponent của Syncfusion — kéo thả card đổi stage gọi PUT, card hiện tên KH, giá trị, probability, ngày dự kiến chốt).
   - Chi tiết: header (KH/Lead nguồn, loại, stage DropDownList, probability, expected_closing) + lưới lines hàng quan tâm (LookupSelect sản phẩm, qty, rate ước tính) + nút "Tạo báo giá" (make-quotation → điều hướng sang quotation) + WorkflowBar (Won/Lost/Closed) + Timeline.
4. Component Timeline dùng chung (crm/activity): list trộn activity + lịch sử trạng thái theo thời gian (icon theo loại NOTE/CALL/EMAIL/MEETING/TODO); ô nhập nhanh ghi chú; nút thêm TODO (nội dung + hạn + người phụ trách); TODO quá hạn tô đỏ. Gắn được vào trang Lead/Opportunity/Khách hàng.
5. Notification: chuông trên header poll /notifications (30s) — TODO quá hạn, lead mới gán cho tôi; click điều hướng.
6. /crm/reports — Tabs: Funnel (FunnelChart ej2-react-charts theo stage, đếm + giá trị), Chuyển đổi theo nguồn/campaign (Grid + cột %), Lý do thua (Pie). DateRangePicker lọc kỳ; nút Export Excel (cơ chế task 18).
Data scope: lưới tự lọc theo quyền (backend đã xử lý); label tiếng Việt. Test luồng: tạo lead → convert opportunity → kéo kanban đổi stage → tạo báo giá → submit → make-sales-order → opportunity tự WON (kiểm tra card sang cột Won).
```

## Nghiệm thu
- Kanban kéo thả đổi stage hoạt động; luồng Lead → Opportunity → Quotation → SO → WON chạy đủ trên UI.
- Timeline trộn hoạt động + trạng thái đúng thứ tự; TODO quá hạn đỏ + lên chuông thông báo.
- Funnel/chuyển đổi/lý do thua khớp số backend; check trùng lead hiển thị khi nhập email đã tồn tại.
