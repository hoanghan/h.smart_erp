# Task 25 — Module CRM theo ERPNext

## Bối cảnh
Thêm phân hệ CRM trước-bán-hàng theo ERPNext, nối vào Quotation mới (task 24):

```
Campaign → Lead → Opportunity → Quotation → Sales Order
              ↘ convert thành Customer (partner)
Timeline hoạt động (note/call/todo/event) gắn trên mọi đối tượng CRM
```

Hiện trạng: đã có `sales.opportunity` sơ khai (code, partner, expected_value, stage, salesperson) và `core.task`/`core.note` dùng chung — sẽ nâng cấp.

## PROMPT (dán cho Claude)

```
Làm việc trong C:\Project\Personal\ERP\sourcecode\erp-backend (.NET 9, EF Core, PostgreSQL g_erp). Tạo schema crm (SchemaBootstrap idempotent), pattern như các module hiện có (Entities/DTO/Controller/WorkflowService/DocNumbering). Task 24 (quotation mới) là đầu ra của luồng này.

1. Danh mục CRM (CRUD /md/...): crm.lead_source (nguồn: website, giới thiệu, hội chợ...), crm.sales_stage (giai đoạn opportunity: Prospecting, Qualification, Proposal, Negotiation — có thứ tự + probability % mặc định), crm.campaign (chiến dịch: tên, loại, ngân sách, từ/đến ngày).
2. Lead (crm.lead): doc_no LEAD{YY}{MM}-{####}; thông tin người/công ty (tên, chức danh, công ty, phone, email, nguồn lead_source_id, campaign_id, territory_id, NV phụ trách); trạng thái: LEAD → OPEN → REPLIED → OPPORTUNITY / LOST (lý do) / DO_NOT_CONTACT — qua WorkflowService.
   - Action convert-to-opportunity: tạo crm.opportunity link lead_id, lead → OPPORTUNITY.
   - Action convert-to-customer: tạo core.partner (is_customer=true, copy thông tin + contact), lưu partner_id ngược vào lead.
   - Chống trùng: cảnh báo khi tạo lead trùng email/phone với lead hoặc partner hiện có (trả danh sách nghi trùng, vẫn cho tạo nếu force=true).
3. Opportunity nâng cấp (migrate sales.opportunity → crm.opportunity): doc_no OPP...; nguồn (từ Lead hoặc Customer), opportunity_type (SALES/MAINTENANCE), sales_stage_id, probability %, expected_closing DATE, currency, lines hàng hóa quan tâm (product, qty, rate ước tính) → tổng giá trị; trạng thái OPEN → QUOTATION / WON / LOST (lý do + đối thủ, dùng chung sales.lost_reason task 24) / CLOSED.
   - Action make-quotation: tạo sales.quotation DRAFT copy lines, link opportunity_id (thêm cột vào quotation); khi quotation ORDERED → opportunity tự WON.
4. Hoạt động & timeline (crm.activity): ref_table + ref_id (lead/opportunity/partner/quotation), activity_type (NOTE/CALL/EMAIL/MEETING/TODO), nội dung, due_date + reminder, assignee, trạng thái OPEN/DONE; GET /crm/{ref}/{id}/timeline trả hợp nhất activity + wf_transition_log theo thời gian. Job Hangfire: TODO quá hạn → thông báo (ghi bảng notification đơn giản, FE poll).
5. Báo cáo CRM: GET /crm/reports/funnel?from=&to= (đếm + giá trị theo sales_stage), /crm/reports/lead-conversion?from=&to= (lead → opportunity → quotation → order theo nguồn/campaign), /crm/reports/lost-reasons (thống kê lý do thua).
6. RBAC: subject DOCUMENT leads/opportunities + CATALOG các danh mục; data scope: NV chỉ thấy lead/opportunity mình phụ trách trừ khi có quyền VIEW-ALL (dùng core.data_scope).
Viết test_crm.bat: tạo campaign + lead → convert opportunity (stage Proposal, 3 dòng hàng) → make-quotation → submit → make-sales-order → check opportunity WON, funnel report đếm đúng; lead trùng email cảnh báo. Build pass.
```

## Nghiệm thu
- Chuỗi Lead → Opportunity → Quotation → SO chạy đủ, opportunity tự WON khi quotation ORDERED.
- Timeline gộp hoạt động + lịch sử trạng thái theo thời gian; TODO quá hạn sinh notification.
- Funnel/lead-conversion trả số khớp dữ liệu test; NV không thấy lead người khác khi thiếu quyền.
