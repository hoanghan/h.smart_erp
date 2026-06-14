# Task 31 — Frontend: MRP / Sản xuất (BOM, Work Order, Production Plan)

## Bối cảnh
Backend task 26 + 27: `/api/v1/mfg/boms` (+explode), `/mfg/work-orders` (+start/finish/stop, job-cards), `/mfg/production-plans` (+generate-work-orders, generate-material-requests), `/md/workstations|operations`, `/mfg/reports/production-cost`, kho WIP + Bin planned/reserved_for_production. Stack Syncfusion (bảng quy đổi task 08); cần task 13-14 (FE mua hàng, kho) xong để link chéo.

## PROMPT (dán cho Claude)

```
Làm việc trong C:\Project\Personal\ERP\sourcecode\erp-frontend. Đọc task/26_mrp_erpnext.md + 27_mrp_crm_integration.md (API) + bảng component task 08. Menu mới "Sản xuất".

1. Danh mục (CrudPage): /mfg/workstations (chi phí giờ, cost center), /mfg/operations (workstation mặc định, phút chuẩn).
2. /mfg/boms — BOM:
   - Lưới (lọc sản phẩm, is_default Tag, trạng thái) + chi tiết: header (thành phẩm LookupSelect, SL mẻ, switch default/with_operations) + tab "Nguyên vật liệu" dùng **TreeGridComponent** (BOM đa cấp: dòng chọn BOM con expand được, cột qty/rate/thành tiền) + tab "Công đoạn" (operation, workstation, phút, chi phí tự tính) + tab "Phế phẩm".
   - Nút "Phá BOM" (explode): Dialog nhập qty → TreeGrid kết quả NVL lá + tổng chi phí + unit cost dự kiến; nút Export Excel.
   - WorkflowBar: Submit / Cancel / Amend (bản mới).
3. /mfg/work-orders — Lệnh sản xuất:
   - Lưới (lọc trạng thái, sản phẩm, kỳ) + chi tiết: header (sản phẩm, BOM, qty, produced_qty ProgressBar, kho WIP/FG, planned start-end) + tab NVL (theo BOM × qty, cột đã chuyển vào WIP) + tab Công đoạn/Job Cards (grid: operation, workstation, completed_qty, tổng phút, chi phí thực) + tab Phiếu kho liên quan (link sang /inventory/docs/:id).
   - WorkflowBar: Submit → **Bắt đầu** (start — confirm sinh phiếu chuyển NVL vào WIP, điều hướng xem phiếu) → **Hoàn thành** (finish — Dialog nhập qty đợt này, hiện cost dự kiến) → Stop (lý do). Nhiều đợt finish: lưới lịch sử các đợt.
   - Job Card chi tiết: Dialog chấm công đoạn — time log (from/to TimePicker, phút tự tính), completed_qty, trạng thái.
4. /mfg/production-plans — Kế hoạch sản xuất (MRP):
   - Bước 1: chọn các SO (Grid checkbox, lọc kỳ giao) hoặc nhập nhu cầu tay → bước 2: bảng thành phẩm cần SX; bước 3: bảng NVL (cột nhu cầu / tồn / ordered / reserved / projected / THIẾU tô đỏ).
   - Nút "Tạo Lệnh SX" (generate-work-orders) và "Tạo YC mua NVL thiếu" (generate-material-requests) → hiện danh sách chứng từ đã sinh kèm link; với YC mua: nút tiếp "Gom thành PO theo NCC" (consolidate-to-po của task 27 — hiện nhóm theo NCC mặc định, dòng thiếu NCC yêu cầu chọn ComboBox).
5. /mfg/reports — Tabs: Chi phí sản xuất theo Lệnh (variance thực tế vs BOM chuẩn — Grid + cột lệch % tô màu), Số dư WIP theo Lệnh (/finance/reports/wip-balance).
Label tiếng Việt, số vi-VN. Test luồng: BOM 2 cấp → explode → Production Plan từ SO (thiếu NVL đỏ) → sinh WO + PR → gom PO → WO start (xem phiếu WIP) → finish 2 đợt → COMPLETED, produced bar 100%, báo cáo variance có số.
```

## Nghiệm thu
- TreeGrid BOM đa cấp expand đúng; explode khớp số backend.
- Vòng đời WO trên UI đủ: start sinh phiếu WIP, finish nhiều đợt cập nhật progress + giá vốn; job card chấm giờ được.
- Production Plan tính thiếu theo projected, sinh WO + PR + gom PO theo NCC ngay trên UI.
