# Task 16 — Kế toán: Config Nghiệp vụ + Phiếu Thu/Chi/Tổng hợp (manual)

## Bối cảnh
Theo LeanFACM: ngoài phiếu LERP tự động, kế toán phải **định nghĩa Nghiệp vụ** (mẫu định khoản sẵn cho từng loại phiếu — bảng `finance.business_operation`, template JSONB) và **lập phiếu thủ công**:
- **Phiếu thu tiền** (PHIEU_THU): thu tiền KH, hoàn ứng, thu lãi... — Nợ 111x/112x, Có theo nghiệp vụ (131, 141, 711...).
- **Phiếu chi tiền** (PHIEU_CHI): trả NCC, tạm ứng, chi phí... — Có 111x/112x, Nợ theo nghiệp vụ (331, 141, 642...).
- **Phiếu kế toán tổng hợp** (CT_TONG_HOP): định khoản trực tiếp nhiều dòng Nợ/Có bất kỳ (chứng từ ghi sổ).

Luồng: chọn Nghiệp vụ → hệ thống điền sẵn TK Nợ/Có → người dùng bổ sung đối tượng, số tiền → Duyệt → Ghi sổ (PostingService task 06).

## PROMPT (dán cho Claude)

```
Làm việc trong C:\Project\Personal\ERP\sourcecode (backend .NET 9 + frontend React). Yêu cầu task 06 (finance core, PostingService) đã xong.
Đọc data_model.md mục 6.2, bảng finance.business_operation (template JSONB) và VoucherController/PostingService hiện có.

== BACKEND ==
1. Config Nghiệp vụ — /api/v1/finance/operations (CRUD đầy đủ):
   - Fields: code, name, voucher_type (PHIEU_THU/PHIEU_CHI/CT_TONG_HOP/HOA_DON_BAN/PHIEU_MUA_HANG/...), template JSONB.
   - Template là mảng dòng định khoản mẫu: [{"dr_account":"1111","cr_account":"131","amount_expr":"AMOUNT","dr_object_required":false,"cr_object_required":true,"description":"Thu tiền khách hàng"}]; hỗ trợ amount_expr: AMOUNT (tiền dòng), VAT (tiền thuế), TOTAL (tổng).
   - Validate khi lưu: TK trong template phải tồn tại trong finance.account → 422 kèm danh sách TK sai.
   - Seed (SchemaBootstrap, idempotent) các nghiệp vụ chuẩn:
     (TK theo TT200) PT01 Thu tiền KH (N 1111 / C 131), PT02 Rút TGNH nhập quỹ (N 1111 / C 1121), PT03 Thu khác (N 1111 / C 711),
     PC01 Trả tiền NCC (N 331 / C 1111), PC02 Tạm ứng NV (N 141 / C 1111),
     PC03 Chi phí QLDN (N 6422, N 1331 / C 1111), PC04 Chi phí bán hàng (N 641, N 1331 / C 1111),
     TH01 Phiếu kế toán tổng hợp (template rỗng — tự định khoản).
2. Endpoint hỗ trợ lập phiếu: GET /api/v1/finance/operations?voucherType=PHIEU_THU (lọc); POST /api/v1/finance/vouchers/from-operation {operationId, partnerId?, fundId?, amount, description?, docDate?} → tạo voucher DRAFT với lines điền sẵn từ template (TK Nợ/Có, amount theo amount_expr); trả voucher đầy đủ.
3. Phiếu thu/chi: trên VoucherController đảm bảo voucher_type PHIEU_THU/PHIEU_CHI bắt buộc fund_id (quỹ tiền) khi Ghi sổ — lỗi FIN_FUND_REQUIRED; đánh số PT{YY}{MM}-{####} / PC{YY}{MM}-{####} qua DocNumberingService ("Lấy số PC" trong tài liệu).
4. Phiếu tổng hợp CT_TONG_HOP: lines nhập tự do dr_account/cr_account/đối tượng/tiền; Ghi sổ validate tổng Nợ = tổng Có (lỗi FIN_UNBALANCED), số CT dạng KTTH{YY}{MM}-{####}.

== FRONTEND ==
5. /finance/operations — Config nghiệp vụ: lưới (lọc voucher_type) + Drawer: code, tên, loại phiếu, bảng template editable (TK Nợ/Có TreeSelect accounts, amount_expr Select AMOUNT/VAT/TOTAL, cờ bắt buộc đối tượng, diễn giải). Nút Nhân bản nghiệp vụ.
6. /finance/cash-receipts (Phiếu thu) và /finance/cash-payments (Phiếu chi): lưới lọc kỳ/quỹ/đối tượng + nút "Tạo phiếu":
   - Modal bước 1 chọn Nghiệp vụ (Select từ operations theo loại) → gọi from-operation → mở trang chi tiết voucher với lines điền sẵn.
   - Trang chi tiết: header (ngày, đối tượng LookupSelect, quỹ tiền Select funds, nội dung, hóa đơn nếu có), lines cho sửa tiền/đối tượng (TK khóa theo template, mở khóa nếu user có quyền UPDATE DOCUMENT:vouchers), footer tổng; WorkflowBar Duyệt → Lấy số & Ghi sổ → nút C/từ xem gl-entries.
7. /finance/general-vouchers (Phiếu kế toán tổng hợp): trang chi tiết lines tự do (mỗi dòng: diễn giải, TK Nợ, TK Có, đối tượng, tiền); cảnh báo đỏ realtime khi tổng Nợ ≠ tổng Có; Ghi sổ.
8. Thêm 3 menu trên vào nhóm "Kế toán" (sau Chứng từ kế toán).
Tạo test_manual_vouchers.bat: tạo nghiệp vụ → from-operation phiếu thu 1tr KH → ghi sổ → check gl-entries N1111/C131 cân; phiếu tổng hợp lệch Nợ/Có expect 409 FIN_UNBALANCED. Build pass.
```

## Nghiệm thu
- Tạo phiếu thu từ nghiệp vụ PT01: lines tự điền N 1111/C 131, ghi sổ ra gl_entry cân, số phiếu PT{YY}{MM}-xxxx.
- Phiếu tổng hợp lệch Nợ/Có → 409 FIN_UNBALANCED; thiếu quỹ tiền khi ghi sổ phiếu thu/chi → FIN_FUND_REQUIRED.
- UI config nghiệp vụ lưu template, validate TK không tồn tại.
