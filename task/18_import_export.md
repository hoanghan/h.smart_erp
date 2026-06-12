# Task 18 — Import / Export Excel tại các màn hình + phân quyền

## Bối cảnh
Yêu cầu: các màn hình (danh mục + chứng từ) có nút **Import** (nhập từ Excel, có file mẫu, validate trước khi ghi) và **Export** (xuất Excel theo bộ lọc hiện tại). Quyền Import/Export là **action riêng trong RBAC** (thêm `IMPORT`, `EXPORT` bên cạnh VIEW/CREATE/UPDATE/DELETE/APPROVE/POST/UNLOCK) — gán được theo từng màn hình cho user/nhóm.

Lưu ý kỹ thuật: bảng `core.permission` có CHECK constraint trên cột `action` — phải nới constraint trước khi dùng action mới.

## PROMPT (dán cho Claude)

```
Làm việc trong C:\Project\Personal\ERP\sourcecode (backend .NET 9 + frontend React).
Pattern hiện có: CrudControllerBase (CATALOG) + các DocumentController (DOCUMENT), RbacService, PageResult.

== BACKEND ==
1. RBAC mở rộng:
   - SchemaBootstrap: ALTER TABLE core.permission DROP CONSTRAINT IF EXISTS <tên check action>, ADD CONSTRAINT ... CHECK (action IN ('VIEW','CREATE','UPDATE','DELETE','APPROVE','POST','UNLOCK','IMPORT','EXPORT')) — idempotent (tra tên constraint qua pg_constraint).
   - GET /api/v1/auth/me trả thêm danh sách quyền của user: [{subjectType, subjectCode, action}] (admin trả ["*"]) để FE ẩn/hiện nút.
2. Export (generic):
   - Cài ClosedXML. Thêm vào CrudControllerBase: GET {resource}/export?q=&...filter → kiểm quyền (CATALOG, resource, EXPORT) → query như List nhưng KHÔNG phân trang (giới hạn 50.000 dòng, quá thì 422 EXPORT_TOO_LARGE) → trả file xlsx (header tiếng Việt theo tên cột DTO, định dạng số/ngày), tên file {resource}_{yyyyMMdd_HHmm}.xlsx.
   - Các controller chứng từ (quotations, sales-orders, purchasing/orders, inventory/docs, finance/vouchers): endpoint /export tương tự theo filter hiện có (DOCUMENT, resource, EXPORT); xuất dạng phẳng header + tổng tiền, và tùy chọn ?includeLines=true xuất sheet thứ 2 chi tiết dòng.
3. Import (generic, an toàn):
   - GET {resource}/import/template → file xlsx mẫu: header đúng cột cho phép import + sheet "HuongDan" mô tả từng cột (bắt buộc/kiểu/ví dụ; cột lookup dùng CODE: uom_code, partner_code, product_code...).
   - POST {resource}/import?dryRun=true (multipart file) → parse, validate từng dòng (mã lookup tồn tại, kiểu dữ liệu, trùng code trong file/DB), trả {totalRows, validRows, errors:[{row, column, message}]}; dryRun=false: chỉ ghi khi 0 lỗi (toàn bộ trong 1 transaction), hỗ trợ mode=INSERT|UPSERT (theo code).
   - Quyền: (CATALOG/DOCUMENT, resource, IMPORT). Ghi core.audit_log mỗi lần import (file name, số dòng, user).
   - Phạm vi import đợt 1: danh mục (products, partners, uoms, warehouses, employees, price-list items) + số dư đầu kỳ (finance/opening-balances) + chứng từ kho dạng lines (import lines vào stock_doc DRAFT đang mở). KHÔNG import chứng từ đã duyệt.
   - Phạm vi đợt 2 (sau các task ERPNext 21-27): NCC theo NVL (item_supplier), báo giá NCC hàng loạt (supplier_quotation lines từ file NCC gửi), bậc Promotional Scheme + pricing_rule (task 24), Lead CRM (task 25 — kèm chống trùng email/phone như API), BOM + bom_item (task 26, validate vòng lặp BOM đa cấp), số đếm kiểm kê Stock Reconciliation (task 22), hệ thống tài khoản + cost center (task 23). Export bổ sung: SLE/thẻ kho, gl_entry/sổ cái, AR-AP aging, BOM explode.
== FRONTEND ==
4. Mở rộng DataTable/CrudPage: prop enableImportExport — render 2 nút cạnh ô tìm kiếm:
   - Export: gọi /export với filter hiện tại, tải file (blob). Hiện theo quyền EXPORT.
   - Import: Modal 3 bước — (1) link "Tải file mẫu", upload .xlsx; (2) gọi dryRun hiển thị bảng kết quả validate (dòng lỗi tô đỏ, cột/lý do); (3) nút "Nhập dữ liệu" (disabled khi còn lỗi) → gọi thật, message số dòng đã nhập, refresh lưới. Hiện theo quyền IMPORT.
5. Hook usePermissions(): đọc quyền từ /auth/me (đã mở rộng) → hàm can(subjectType, subjectCode, action); áp vào nút Import/Export và dùng dần cho các nút khác.
6. Bật enableImportExport cho: 9 trang danh mục, bảng giá items, số dư đầu kỳ, các lưới chứng từ (chỉ Export), phiếu kho DRAFT (Import lines).
7. Trang phân quyền /admin/permissions (nếu đã có thì mở rộng): ma trận checkbox theo resource × action, gồm cả IMPORT/EXPORT.
Tạo test_import_export.bat: export products ra file → import template products → dryRun file có 1 dòng lỗi mã ĐVT không tồn tại expect errors>0 → import file sạch 2 dòng expect 2 dòng mới; user không quyền IMPORT expect 403. Build pass.
```

## Nghiệm thu
- Mỗi màn hình bật tính năng có nút Import/Export hiển thị đúng theo quyền; user thiếu quyền → nút ẩn và API trả 403.
- Import dryRun báo lỗi theo dòng/cột; import thật rollback toàn bộ nếu có lỗi giữa chừng; audit_log có bản ghi.
- Export tôn trọng bộ lọc hiện tại, mở được bằng Excel, header tiếng Việt.
