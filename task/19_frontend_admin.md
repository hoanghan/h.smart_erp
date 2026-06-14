# Task 19 — Frontend: Trang Quản trị (Admin)

## Bối cảnh
Theo LeanSCRM/FACM mục Quản lý người dùng: quản trị viên quản lý user, nhóm user, phân quyền theo 5 nhóm đối tượng (Chức năng/Danh mục/Chứng từ/Nghiệp vụ/Báo cáo) × action (VIEW/CREATE/UPDATE/DELETE/APPROVE/POST/UNLOCK/IMPORT/EXPORT), phân quyền dữ liệu theo cơ cấu tổ chức, phân quyền phê duyệt; ngoài ra: cấu hình đánh số chứng từ, thông tin doanh nghiệp, xem audit log. Bảng backend đã có: `core.app_user`, `user_group(_member)`, `permission`, `data_scope`, `approval_right`, `doc_numbering`, `company_info`, `audit_log`, `wf_transition_log`.

## PROMPT (dán cho Claude)

```
Làm việc trong C:\Project\Personal\ERP\sourcecode (backend .NET 9 + frontend React, đã có scaffold + usePermissions từ task 08).

== BACKEND (bổ sung nếu thiếu) ==
1. AdminController (/api/v1/admin, chỉ quyền FUNCTION:admin:VIEW hoặc is_admin):
   - users: GET list (kèm employee name) / POST (username, password, employee_id, is_admin) / PUT {id} (đổi thông tin, khóa is_active, reset password) / GET {id}/permissions.
   - groups: CRUD + PUT {id}/members (danh sách user_id).
   - permissions: GET ?granteeType=&granteeId= trả ma trận; PUT ghi đè theo grantee (transaction: xóa cũ, insert mới).
   - permission-catalog: GET trả danh sách subject có thể phân quyền (FUNCTION/CATALOG/DOCUMENT/OPERATION/REPORT × subject_code lấy từ code: danh sách resource CRUD + WorkflowService.Definitions.Keys + danh sách báo cáo) — để FE render ma trận động, không hard-code.
   - data-scopes: GET/PUT theo user (danh sách department_id).
   - approval-rights: GET/PUT theo user (danh sách doc_type).
   - doc-numbering: GET/PUT (pattern, reset_by; validate pattern có token {####}).
   - company-info: GET/PUT.
   - audit-log: GET phân trang (lọc user, ref_table, khoảng ngày); wf-log: GET theo ref_table+ref_id.

== FRONTEND (menu "Quản trị" — chỉ hiện với admin hoặc có quyền) ==
2. /admin/users — Người dùng: lưới (username, nhân viên, admin?, trạng thái, ngày tạo) + Drawer thêm/sửa (LookupSelect employee, switch admin, nút Reset mật khẩu với confirm, nút Khóa/Mở khóa); tab trong Drawer: "Thuộc nhóm" (chọn groups), "Phạm vi dữ liệu" (Tree departments checkable), "Quyền phê duyệt" (checkbox theo doc_type).
3. /admin/groups — Nhóm người dùng: lưới + Drawer (tên, Transfer chọn members).
4. /admin/permissions — Phân quyền: chọn đối tượng (radio User/Nhóm + LookupSelect) → render ma trận từ permission-catalog: Collapse theo subject_type (Chức năng/Danh mục/Chứng từ/Nghiệp vụ/Báo cáo), mỗi subject 1 hàng, cột là các action (checkbox; ô không áp dụng thì ẩn — vd REPORT chỉ có VIEW/EXPORT, DOCUMENT có thêm APPROVE/POST/UNLOCK); hàng đầu "Chọn tất cả" theo cột; nút Lưu gọi PUT ghi đè; cảnh báo khi rời trang chưa lưu.
5. /admin/doc-numbering — Đánh số chứng từ: lưới editable (doc_type, pattern, reset_by Select, last_seq readonly) + preview số kế tiếp realtime khi sửa pattern.
6. /admin/company-info — Thông tin doanh nghiệp: form (tên, MST, địa chỉ, người đại diện, kế toán trưởng, thủ quỹ, logo upload base64).
7. /admin/audit-log — Nhật ký hệ thống: bảng phân trang (thời gian, user, hành động, ref, detail JSON expandable) + filter; tab thứ 2 "Lịch sử duyệt" xem wf_transition_log theo chứng từ (search ref_table + ref_id hoặc dán số chứng từ).
8. Route guard: toàn bộ /admin/* chặn nếu !isAdmin && !can('FUNCTION','admin','VIEW').
Label tiếng Việt. Test thủ công: tạo user mới chỉ có CATALOG:products:VIEW → login user đó chỉ xem được Hàng hóa, các nút Thêm/Sửa/Import ẩn, menu khác ẩn.
```

## Nghiệm thu
- Tạo user + gán quyền qua ma trận → login user đó thấy đúng phạm vi (menu, nút theo quyền); đổi pattern đánh số có preview và áp dụng cho phiếu tạo mới.
- Audit log ghi và xem được các thao tác ghi dữ liệu; lịch sử duyệt tra theo chứng từ.
