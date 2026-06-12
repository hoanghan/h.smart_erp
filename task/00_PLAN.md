# KẾ HOẠCH PHÁT TRIỂN ERP — Roadmap & Prompts

> Mỗi task có 1 file riêng trong folder này, chứa: mục tiêu, phạm vi, **prompt sẵn để dán cho Claude**, và tiêu chí nghiệm thu.
> Làm theo thứ tự; mỗi task độc lập đủ nhỏ để hoàn thành trong 1 phiên.

## Trạng thái hiện tại (đã xong)

| Hạng mục | Vị trí |
|---|---|
| Thiết kế hệ thống, API spec, data model | `system_design/` |
| Database `g_erp` (99 bảng, 5 schema) trên 10.161.53.11 | đã chạy `data_model.sql` |
| Backend .NET 9: auth JWT + RBAC, CRUD master data (9 danh mục) | `sourcecode/erp-backend` |
| Workflow engine + đánh số chứng từ (`BG{YY}{MM}-{####}`) | `Core/WorkflowService.cs`, `Core/DocNumberingService.cs` |
| Báo giá → Đơn hàng bán (tạo, duyệt, chuyển đơn, hủy) — đã test | `Controllers/Quotations*`, `SalesOrders*` |

Chạy dev: `dotnet run --project src/Erp.Api` → Swagger `http://localhost:5000/api/v1/docs`, login `admin/admin123`.

## Lộ trình

| # | Task | File | Ưu tiên |
|---|---|---|---|
| 01 | Hoàn thiện Sales: KM-CK, bảng giá, giảm giá, chi phí, thanh toán | `01_sales_complete.md` | Cao |
| 02 | Purchasing: đơn mua, ĐNTT, trả hàng NCC | `02_purchasing.md` | Cao |
| 03 | Inventory: nhập/xuất/chuyển kho, tồn, lô | `03_inventory.md` | Cao |
| 04 | Gia công: chuỗi xuất SX-DV → nhập SP-TP, chi phí gia công | `04_outsourcing.md` | Trung |
| 05 | LERP bridge: outbox → lerp_voucher | `05_lerp_integration.md` | Trung |
| 06 | Finance core: COA, kỳ, chứng từ, Ghi sổ (gl_entry) | `06_finance_core.md` | Trung |
| 07 | Finance định kỳ: TSCĐ/CCDC/CPPB, thuế, cuối kỳ (Hangfire) | `07_finance_periodic.md` | Thấp |
| 08 | Frontend: scaffold React + login + layout | `08_frontend_scaffold.md` | Cao |
| 09 | Frontend: trang danh mục (master data) | `09_frontend_masterdata.md` | Cao |
| 10 | Frontend: Báo giá + Đơn hàng + workflow bar | `10_frontend_sales.md` | Cao |
| 11 | Báo cáo + dashboard | `11_reports.md` | Thấp |
| 12 | Hardening: tests, CI, Docker deployment | `12_hardening.md` | Thấp |
| 13 | Frontend: Mua hàng (PO, ĐNTT, trả hàng NCC) | `13_frontend_purchasing.md` | Cao |
| 14 | Frontend: Kho hàng (nhập/xuất/chuyển, tồn, thẻ kho, gia công) | `14_frontend_inventory.md` | Cao |
| 15 | Frontend: Kế toán (TK, kỳ, LERP, chứng từ, TSCĐ, cuối kỳ) | `15_frontend_finance.md` | Trung |
| 16 | Kế toán: Config nghiệp vụ + Phiếu thu/chi/tổng hợp manual (BE+FE) | `16_finance_manual_vouchers.md` | Cao |
| 17 | Người tạo & Người duyệt trên mọi chứng từ (cross-cutting BE+FE) | `17_creator_approver.md` | Cao |
| 18 | Import/Export Excel tại các màn hình + quyền IMPORT/EXPORT (đợt 2 phủ các đối tượng ERPNext: item_supplier, SQ, scheme, Lead, BOM, kiểm kê, COA) | `18_import_export.md` | Trung |
| 19 | Frontend: Trang Quản trị (user, nhóm, ma trận phân quyền, đánh số, audit) | `19_frontend_admin.md` | Cao |
| 20 | ~~Form Báo giá layout LeanSCRM~~ — **ĐÃ BỎ phần Báo giá** (thay bằng task 24 thuần ERPNext); chỉ còn tham khảo phần form Đơn hàng nếu cần | `20_quotation_form_layout.md` | Bỏ |
| 21 | Nâng cấp Purchase theo ERPNext (MR→RFQ→SQ→PO, payment terms, landed cost) | `21_purchase_erpnext.md` | Cao |
| 22 | Nâng cấp Inventory theo ERPNext (SLE valuation, Bin, Reconciliation, Repack) | `22_inventory_erpnext.md` | Cao |
| 23 | Nâng cấp Finance theo ERPNext (GL reversal, Payment allocation, Cost Center, Perpetual inventory, Aging) | `23_finance_erpnext.md` | Cao |
| 24 | Sales thuần ERPNext: **Quotation mới (bỏ báo giá cũ)** + Promotional Scheme + Pricing Rule + Coupon; SO per-line, reserve tồn, credit limit | `24_sales_erpnext.md` | Cao |
| 25 | CRM theo ERPNext: Lead → Opportunity → Quotation, campaign, timeline hoạt động, funnel | `25_crm_erpnext.md` | Trung |
| 26 | MRP/Manufacturing theo ERPNext: BOM đa cấp, Work Order, Job Card, Production Plan | `26_mrp_erpnext.md` | Trung |
| 27 | Tích hợp liên phân hệ cho MRP & CRM: Kho (WIP, Manufacture 2 chiều, Bin planned), Mua hàng (PR→PO theo NCC, subcontracting BOM), Finance (GL 154/155, cost center, campaign ROI) | `27_mrp_crm_integration.md` | Trung |
| 28 | Kết nối Shopee + TikTok Shop: connector OAuth/token, đơn sàn → SO → xuất kho, push tồn, đối soát phí sàn TT200 (3 prompt A/B/C) — solution: `system_design/ecommerce_integration.md` | `28_ecommerce_shopee_tiktok.md` | Cao |
| 29 | Tái cấu trúc cho AI agent: CLAUDE.md, module README, tách file lớn, SchemaBootstrap → migrations runner, docs sinh từ code (ENDPOINTS/STATUS_MACHINES/DB_TABLES) | `29_agent_friendly_structure.md` | **Làm sớm** |

Ghi chú: task 21/22/23 NÂNG CẤP trên nền task 02-07 (làm nền trước rồi nâng cấp, hoặc gộp luôn khi làm mới). Thứ tự nâng cấp: 21 → 22 → 23 (23 mục perpetual inventory cần SLE của 22). FE task 13/14/15 khi làm cần đọc kèm 21/22/23 để bổ sung màn hình: RFQ/so sánh báo giá NCC, % nhận hàng trên PO, Landed Cost, Kiểm kê, cột reserved/ordered/projected, Payment Entry phân bổ hóa đơn, cấn trừ tạm ứng, Cost Center, báo cáo Trial Balance/AR-AP Aging.

Thứ tự FE đề xuất: 08 → 09 → 19 → 10 → 13 → 14 → 15 → 16 → 18 → 11.

## Stack Frontend

**Đã chốt: Syncfusion React (Community License)** thay Ant Design — đăng ký key free tại syncfusion.com/products/communitylicense. Bảng quy đổi component nằm trong `08_frontend_scaffold.md` (mục "Quy ước component"). Các task FE (09-10, 13-16, 18-20) nếu còn nhắc AntD/Drawer/Tag... thì agent tự thay theo bảng quy đổi đó: Grid→GridComponent, Drawer→Dialog/Sidebar, Select lookup→ComboBox filtering, Tree→TreeView/DropDownTree, Transfer→ListBox dual, RangePicker→DateRangePicker, message→Toast, chart→ej2-react-charts.

## Chuẩn mực kế toán

**Toàn bộ task Finance (06, 07, 16, 23, 27) hạch toán theo THÔNG TƯ 200/2014/TT-BTC**: hệ thống TK TT200 (tách 641/642, giảm trừ DT 521, CP trả trước 242, giá thành qua 621/622/627→154→155), khấu hao theo khung TT45/2013, BCTC mẫu B01/B02/B03-DN, kết chuyển cuối kỳ đúng trình tự 521→511→911→4212. Khi viết code/seed liên quan kế toán luôn đối chiếu TT200.

## Cách dùng

1. Mở file task, đọc phần **Bối cảnh** để nắm phạm vi.
2. Copy nguyên khối **PROMPT** dán vào Claude (kèm quyền truy cập folder `C:\Project\Personal\ERP`).
3. Sau khi code xong, chạy mục **Nghiệm thu** để kiểm tra.
4. Tick vào bảng trạng thái dưới đây.

## Theo dõi

- [ ] 01 Sales hoàn thiện
- [ ] 02 Purchasing
- [ ] 03 Inventory
- [ ] 04 Gia công
- [ ] 05 LERP
- [ ] 06 Finance core
- [ ] 07 Finance định kỳ
- [ ] 08 FE scaffold
- [ ] 09 FE master data
- [ ] 10 FE sales
- [ ] 11 Báo cáo
- [ ] 12 Hardening
- [ ] 13 FE Mua hàng
- [ ] 14 FE Kho hàng
- [ ] 15 FE Kế toán
- [ ] 16 Config nghiệp vụ + phiếu thu/chi/tổng hợp
- [ ] 17 Người tạo & người duyệt mọi chứng từ
- [ ] 18 Import/Export + phân quyền
- [ ] 19 FE Trang quản trị
- [ ] 20 Form Báo giá/Đơn hàng layout LeanSCRM
- [ ] 21 Purchase theo ERPNext
- [ ] 22 Inventory theo ERPNext
- [ ] 23 Finance theo ERPNext
- [ ] 24 Sales theo ERPNext
- [ ] 25 CRM theo ERPNext
- [ ] 26 MRP theo ERPNext
- [ ] 27 Tích hợp Kho/Mua hàng/Finance cho MRP & CRM
- [ ] 28 Kết nối Shopee/TikTok Shop (A connector, B đơn hàng, C đối soát)
- [ ] 29 Cấu trúc agent-friendly (CLAUDE.md, tách file, docs sinh từ code)
