# Task 26 — Module MRP / Manufacturing theo ERPNext

## Bối cảnh
Thêm phân hệ sản xuất theo ERPNext Manufacturing, tận dụng Stock đã nâng cấp (task 22: SLE, Bin projected qty, purpose MANUFACTURE):

```
BOM (đa cấp, costing) → Production Plan (MRP: gom nhu cầu từ SO
   → đề xuất Work Order + Material Request mua NVL thiếu)
→ Work Order → Stock Entry "Material Transfer for Manufacture" (NVL → kho WIP)
→ Job Card theo công đoạn → Stock Entry "Manufacture" (tiêu hao NVL, nhập thành phẩm)
```

Lưu ý: `core.product_bom` hiện tại là BỘ bán hàng (kit) — giữ nguyên; BOM sản xuất là khái niệm riêng trong schema `mfg`.

## PROMPT (dán cho Claude)

```
Làm việc trong C:\Project\Personal\ERP\sourcecode\erp-backend (.NET 9, EF Core, PostgreSQL g_erp). Yêu cầu task 22 (SLE/Bin/purpose) đã xong. Tạo schema mfg (SchemaBootstrap idempotent), pattern chuẩn của repo.

1. Danh mục sản xuất:
   - mfg.workstation: tên, chi phí giờ (điện, nhân công, thuê máy), giờ làm việc/ngày.
   - mfg.operation: công đoạn (tên, workstation mặc định, thời gian chuẩn phút). Map 3 quy trình gia công cũ (XI, NHUNG_NONG, TARO_TAN) thành operations seed.
2. BOM (mfg.bom + bom_item + bom_operation + bom_scrap):
   - Header: product_id (thành phẩm), quantity (mẻ chuẩn), is_active, is_default (1 BOM mặc định/sản phẩm), with_operations bool, ghi chú; doc_no BOM-{####}; trạng thái DRAFT → SUBMITTED → CANCELLED (sửa = bản mới, amend).
   - bom_item: NVL con (product, qty per mẻ, rate lấy valuation hiện hành hoặc nhập, cho phép chọn bom_id con → BOM ĐA CẤP).
   - bom_operation: operation, workstation, thời gian phút, chi phí = thời gian × rate giờ.
   - GET /mfg/boms/{id}/explode?qty= : phá BOM đa cấp ra NVL lá + tổng chi phí (NVL + công đoạn) → unit cost dự kiến.
3. Work Order (mfg.work_order + wo_item + wo_operation):
   - Tạo từ BOM (+qty) hoặc từ Production Plan; fields: product, bom_id, qty, produced_qty, wip_warehouse_id, fg_warehouse_id, planned_start/end.
   - Trạng thái: DRAFT → NOT_STARTED (submit) → IN_PROCESS → COMPLETED / STOPPED (lý do); qua WorkflowService.
   - Action start: sinh stock_doc purpose=MATERIAL_TRANSFER_FOR_MANUFACTURE (NVL theo BOM × qty từ kho chính → WIP) — hoàn tất phiếu thì WO → IN_PROCESS.
   - Action finish {qty}: sinh stock_doc purpose=MANUFACTURE — dòng tiêu hao NVL (xuất WIP, theo BOM × qty thực) + dòng nhập thành phẩm vào fg_warehouse; GIÁ VỐN thành phẩm = tổng stock_value NVL tiêu hao + chi phí công đoạn (từ job cards thực tế nếu có, không thì theo BOM) — ghi đúng vào SLE valuation; produced_qty cộng dồn, đủ thì COMPLETED. Cho sản xuất nhiều đợt.
4. Job Card (mfg.job_card): sinh tự động theo wo_operation khi submit WO; fields: operation, workstation, time logs (from/to, phút), completed_qty, status OPEN/WIP/COMPLETED; tổng phút thực tế × rate giờ = chi phí công đoạn thực dùng cho mục 3.
5. Production Plan / MRP (mfg.production_plan + pp_so + pp_item + pp_material):
   - Chọn các SO (hoặc nhập nhu cầu tay) → gom thành phẩm cần sản xuất; explode BOM → nhu cầu NVL.
   - Tính thiếu/đủ theo Bin: shortage = nhu cầu - projected_qty (actual + ordered - reserved).
   - Action generate-work-orders: tạo WO DRAFT cho từng thành phẩm; action generate-material-requests: tạo purchasing.purchase_request (type=PURCHASE) cho NVL thiếu.
   - Trạng thái DRAFT → SUBMITTED → COMPLETED/CANCELLED.
6. Tích hợp kế toán (nếu task 23 perpetual đã có): stock entry Manufacture tự sinh GL theo stock_value_difference (WIP/154 ↔ 155/156) — không thì để outbox event như cũ.
Viết test_mrp.bat: tạo workstation + operation → BOM 2 cấp (TP A = 2×B + 1×C; B = 3×D) → explode qty 10 ra D=60, C=10 + chi phí → Production Plan từ 1 SO (A×10, tồn D=20 → shortage D=40, sinh PR mua 40 D) → WO 10 A → start (transfer NVL vào WIP) → finish 6 (nhập 6 A, giá vốn = NVL + công đoạn) → finish 4 → COMPLETED. Build pass.
```

## Nghiệm thu
- BOM đa cấp explode đúng số lượng + chi phí; 1 BOM default/sản phẩm.
- WO chạy đủ vòng đời, sản xuất nhiều đợt, produced_qty khớp; giá vốn thành phẩm = NVL tiêu hao + chi phí công đoạn (kiểm bằng SLE).
- Production Plan tính shortage theo projected_qty và sinh đúng PR mua NVL thiếu + WO.
