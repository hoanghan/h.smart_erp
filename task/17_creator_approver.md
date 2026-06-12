# Task 17 — Người tạo & Người duyệt trên mọi chứng từ (cross-cutting)

## Bối cảnh
Yêu cầu: **tất cả** chứng từ Đơn hàng bán, Báo giá, Purchasing (YC mua, PO, ĐNTT, trả hàng NCC), Xuất/Nhập/Chuyển kho đều phải lưu và hiển thị **người tạo** + **người duyệt** (kèm thời điểm). Hiện trạng: quotation đã có creator_id/approver_id; sales_order có approver_id nhưng thiếu creator_id; stock_doc có created_by/completed_by nhưng thiếu người duyệt; các bảng purchasing có creator_id (bootstrap) nhưng chưa đồng bộ approver.

## PROMPT (dán cho Claude)

```
Làm việc trong C:\Project\Personal\ERP\sourcecode (backend .NET 9 + frontend React).
Đây là task cross-cutting áp dụng cho MỌI chứng từ: quotations, sales-orders, sales-allowances, purchase-requests, purchase-orders, po-payments, supplier-returns, stock-docs (và vouchers kế toán nếu đã có).

== BACKEND ==
1. SchemaBootstrap (idempotent): bảo đảm các bảng sau có đủ 3 cột creator_id BIGINT, approver_id BIGINT, approved_at TIMESTAMPTZ:
   sales.sales_order, sales.sales_allowance, purchasing.purchase_request, purchasing.purchase_order,
   purchasing.po_payment_request, purchasing.supplier_return, inventory.stock_doc
   (ALTER TABLE ... ADD COLUMN IF NOT EXISTS; quotation đã đủ).
2. Chuẩn hóa bằng interface trong Entities:
   public interface IHasAudit { long? CreatorId { get; set; } }
   public interface IApprovable { long? ApproverId { get; set; } DateTimeOffset? ApprovedAt { get; set; } }
   Cho các entity chứng từ implement 2 interface này (thêm property nếu entity chưa có; mapping snake_case tự khớp).
3. Tự động gán:
   - Người tạo: trong các action POST tạo chứng từ, set CreatorId = RbacService.GetUserId(User). Có thể viết helper chung hoặc SaveChanges interceptor: với entity Added implement IHasAudit và CreatorId == null thì gán từ ICurrentUser (tạo service CurrentUserService đọc HttpContext).
   - Người duyệt: sửa WorkflowService.TransitionAsync thêm overload nhận object entity; sau khi transition thành công, nếu transition có PermAction == "APPROVE" và entity là IApprovable thì set ApproverId + ApprovedAt = now. Refactor các controller đang set tay (QuotationsController, SalesOrdersController...) dùng cơ chế chung này, xóa code lặp.
4. DTO: thêm CreatorId, ApproverId, ApprovedAt vào mọi *Out của các chứng từ trên. Để FE hiển thị tên: thêm endpoint GET /api/v1/admin/users/lookup trả [{id, username, employeeName}] (cache được) — KHÔNG join tên vào từng response để tránh N+1.
5. Riêng stock-docs: hiện các transition đều PermAction UPDATE — đổi transition "confirm" (Xác nhận xuất/nhập kho) thành PermAction "APPROVE" để bước này được coi là bước duyệt của thủ kho (tự gán ApproverId) và phân quyền duyệt kho tách khỏi quyền sửa.
6. Ràng buộc nghiệp vụ: người duyệt không được là người tạo nếu cấu hình bật (thêm option "RequireDifferentApprover" trong appsettings, default false; khi bật và approver == creator → 409 WF_SELF_APPROVAL).

== FRONTEND ==
6. Hook useUserLookup(): tải /admin/users/lookup 1 lần (TanStack Query staleTime dài), expose hàm getUserName(id).
7. Mọi lưới chứng từ (BG, ĐH bán, YC mua, PO, ĐNTT, trả hàng, phiếu kho): thêm 2 cột "Người tạo", "Người duyệt" (render qua getUserName).
8. Trang chi tiết: hiển thị dòng meta dưới header: "Tạo bởi {tên} lúc {created_at} · Duyệt bởi {tên} lúc {approved_at}" (ẩn phần duyệt khi chưa duyệt).
Cập nhật test bat liên quan: sau approve, GET chứng từ kiểm tra approverId != null và creatorId != null. Build pass.
```

## Nghiệm thu
- Tạo bất kỳ chứng từ nào → creatorId tự gán; duyệt → approverId + approvedAt tự gán (kể cả stock-doc khi confirm/complete... transition APPROVE).
- Bật RequireDifferentApprover → tự duyệt chứng từ mình tạo bị chặn 409 WF_SELF_APPROVAL.
- FE hiện đủ cột/meta Người tạo, Người duyệt ở lưới và trang chi tiết.
