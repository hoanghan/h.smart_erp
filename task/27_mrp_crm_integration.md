# Task 27 — Cập nhật Finance / Kho / Mua hàng khi thêm MRP & CRM

## Bối cảnh
Task 25 (CRM) và 26 (MRP) tạo phân hệ mới nhưng các phân hệ hiện có phải mở rộng mới chạy trọn vòng. Task này gom toàn bộ thay đổi liên phân hệ — làm **sau 22/23 và song song/ngay sau 25/26**.

| Phân hệ | Vì MRP cần | Vì CRM cần |
|---|---|---|
| Kho | Kho WIP, purpose Manufacture 2 chiều, Bin thêm planned/reserved-for-production, valuation thành phẩm theo cost truyền vào | — |
| Mua hàng | PR nguồn Production Plan, NCC mặc định theo NVL, lead time, gom PR→PO theo NCC, subcontracting theo BOM | — |
| Finance | TK WIP/FG/overhead, GL cho 2 phiếu sản xuất, cost center theo workstation | Chi phí campaign + báo cáo ROI |

## PROMPT (dán cho Claude)

```
Làm việc trong C:\Project\Personal\ERP\sourcecode\erp-backend (.NET 9, EF Core, PostgreSQL g_erp). Yêu cầu task 22, 23 đã xong; 25/26 đã hoặc đang làm (nếu bảng mfg/crm chưa có thì phần phụ thuộc để hook + TODO). SchemaBootstrap idempotent, giữ API cũ.

== A. KHO (Inventory) phục vụ MRP ==
1. Warehouse: thêm warehouse_type TEXT (STANDARD/WIP/REJECTED/TRANSIT); validate phiếu MANUFACTURE chỉ tiêu hao từ kho WIP.
2. stock_doc purpose bổ sung enum: MATERIAL_TRANSFER_FOR_MANUFACTURE, MANUFACTURE; stock_doc thêm work_order_id BIGINT.
   - MANUFACTURE là phiếu 2 chiều trong 1 chứng từ: stock_doc_line thêm direction CHAR(1) ('C' consume / 'P' produce); complete sinh SLE xuất (WIP) + nhập (FG) trong cùng transaction.
   - Dòng produce nhận incoming_rate do MRP truyền (cost NVL + công đoạn) — KHÔNG lấy unit_price thường; ValuationService thêm overload nhập rate chỉ định.
3. Bin (stock_balance) thêm: planned_qty (SL thành phẩm trên WO chưa sản xuất xong) và reserved_for_production_qty (NVL bị WO NOT_STARTED/IN_PROCESS giữ). projected_qty = actual + ordered + planned - reserved - reserved_for_production. Cập nhật tại submit/start/finish/stop WO. GET stock-balance trả đủ 6 cột.
4. Stock Entry cho phế phẩm: dòng produce thêm is_scrap bool (nhập kho REJECTED, rate 0 hoặc theo BOM scrap).

== B. MUA HÀNG (Purchasing) phục vụ MRP ==
5. purchase_request thêm source_type TEXT (MANUAL/PRODUCTION_PLAN/REORDER) + production_plan_id BIGINT; list lọc theo source.
6. Bảng core.item_supplier (product_id, supplier_id, is_default, supplier_part_no, lead_time_days, last_rate): CRUD /md/products/{id}/suppliers. product thêm lead_time_days INT (fallback khi không có item_supplier).
7. POST /purchasing/requests/consolidate-to-po {requestIds:[]}: gom các PR APPROVED, nhóm dòng theo NCC mặc định (item_supplier) → tạo 1 PO/NCC (dòng thiếu NCC mặc định trả về danh sách yêu cầu chọn tay). MRP (task 26) sẽ gọi chuỗi: generate-material-requests → consolidate-to-po.
8. Subcontracting theo BOM: purchase_order thêm bom_id (hình thức OUTSOURCING) — khi tạo phiếu xuất SEND_TO_SUBCONTRACTOR tự đề xuất NVL theo BOM × qty; nhận SP-TP đối chiếu đủ NVL đã cấp (cảnh báo lệch SUBCON_MATERIAL_MISMATCH, không chặn).

== C. FINANCE phục vụ MRP ==
9. accounting_policy thêm: wip_account_id (154), fg_account_id (155), material_cost_account_id (621), labor_cost_account_id (622), mfg_overhead_account_id (627), scrap_account_id. Seed TK 154, 155, 621, 622, 627 nếu thiếu (đều là TK chuẩn TT200).
   Hạch toán sản xuất ĐÚNG TT200 (kê khai thường xuyên): xuất NVL vào sản xuất Nợ 621/Có 152; chi phí nhân công job card Nợ 622/Có 334-335; chi phí SX chung (khấu hao máy, điện...) Nợ 627; khi hoàn thành/cuối kỳ kết chuyển Nợ 154/Có 621-622-627; nhập kho thành phẩm Nợ 155/Có 154. (Cho phép chế độ "rút gọn" cấu hình: ghi thẳng 154 bỏ qua 621/622/627 — default theo TT200 đầy đủ.)
10. Perpetual GL mở rộng cho 2 purpose mới (theo sơ đồ TT200 mục 9):
    - MATERIAL_TRANSFER_FOR_MANUFACTURE: Nợ 621 / Có 152 theo stock_value_difference (chế độ rút gọn: Nợ 154/Có 152).
    - MANUFACTURE: kết chuyển Nợ 154/Có 621-622-627 (phần chi phí phát sinh của WO) rồi Nợ 155/Có 154 theo rate produce; lệch làm tròn vào TK chênh lệch. Tổng Nợ = Có (test cân).
11. Cost center: workstation thêm cost_center_id; GL từ job card/manufacture gắn cost center tương ứng để phân tích chi phí sản xuất.
12. Báo cáo: /finance/reports/wip-balance?asOf= (số dư 154 theo work order) và /mfg/reports/production-cost?workOrderId= (NVL + công đoạn + overhead so với chuẩn BOM — variance).

== D. FINANCE + SALES phục vụ CRM ==
13. crm.campaign thêm budget NUMERIC, expense_cost_center_id; chi phí thực chiến dịch = gl_entry theo cost center đó. sales_order/quotation/lead thêm campaign_id (lead đã có — truyền xuôi khi convert).
14. GET /crm/reports/campaign-roi?campaignId= : ngân sách vs chi thực (GL) vs doanh thu (SO từ campaign, trạng thái APPROVED trở lên) vs số lead/đơn — ROI %.
Viết test_integration_mrp.bat: tạo kho WIP → WO start (reserved_for_production tăng, GL Nợ 154) → finish 1 phần (FG nhập đúng rate, GL Nợ 155/Có 154+627 cân, planned giảm) → PR từ production plan → consolidate-to-po gom theo NCC mặc định; campaign-roi trả số khớp. Build pass, trial balance cân.
```

## Nghiệm thu
- Phiếu MANUFACTURE 2 chiều: SLE + GL cân (155 = 154 tiêu hao + overhead), tồn WIP/FG đúng; projected_qty phản ánh planned/reserved_for_production.
- consolidate-to-po gom đúng NCC mặc định, dòng không có NCC được trả về xử lý tay; subcontracting đề xuất NVL theo BOM.
- Campaign ROI: ngân sách / chi thực / doanh thu / ROI khớp dữ liệu test.
