# Task 06 — Finance Core (Sổ cái & Chứng từ)

## Bối cảnh
FACM: hệ thống tài khoản (cây, chi tiết theo đối tượng/ngoại tệ/số lượng), kỳ kế toán, số dư đầu kỳ, nghiệp vụ (mẫu định khoản), chứng từ hợp nhất `finance.voucher` → Ghi sổ thành `finance.gl_entry` (immutable). Xem data_model.md mục 6.1–6.2 và LeanFACM User Manual.

## PROMPT (dán cho Claude)

```
Làm việc trong C:\Project\Personal\ERP\sourcecode\erp-backend. Yêu cầu task 05 đã xong.
Đọc data_model.md mục 6.1-6.2, api_design.md mục 7, và document/20240404 LeanFACM - User Manual.docx (mục Tổ chức hệ thống tài khoản + Phiếu Tool nghiệp vụ) để hiểu nghiệp vụ.

Hãy code Finance core:
1. Entities + mapping: finance.account, object_category, fiscal_period, opening_balance, accounting_policy, business_operation, cash_fund, voucher(_line), gl_entry, bank_fee.
2. Seed (SchemaBootstrap, idempotent): hệ thống TK theo **THÔNG TƯ 200/2014/TT-BTC** (accounting_regime mặc định 'TT200'), tối thiểu gồm cấp 1 + tiểu khoản thông dụng:
   - Tiền & đầu tư: 111(1111,1112), 112(1121,1122), 113, 121, 128
   - Phải thu: 131, 133(1331,1332), 136, 138(1381,1388), 141
   - Hàng tồn kho: 151, 152, 153, 154, 155, 156(1561,1562), 157
   - TSCĐ & đầu tư: 211, 213, 214(2141,2143), 217, 241(2411,2412,2413), 242
   - Nợ phải trả: 331, 333(3331/33311,3334,3335,3338), 334, 335, 338(3383,3384,3386), 341
   - Vốn CSH: 411(4111,4112), 414, 418, 421(4211,4212)
   - Doanh thu & giảm trừ: 511(5111,5112,5113,5118), 515, 521(5211,5212,5213)
   - Chi phí: 621, 622, 627, 632, 635, 641, 642(6421,6422), 711, 811, 821(8211,8212), 911
   - Ngoài bảng: 001-007 (account_type OFF_BALANCE, không theo dõi số dư)
   Kèm tên chuẩn TT200, balance_side, object_category cho 131/331/141 (đối tượng KH/NCC/nhân viên); kỳ hạch toán năm hiện tại 12 kỳ.
   LƯU Ý TT200: phân biệt 641 (chi phí bán hàng) và 642 (QLDN) — KHÔNG gộp như TT133; giảm trừ doanh thu dùng 521; chi phí trả trước dùng 242 (không chia 2421/2422).
3. Controllers:
   - /api/v1/finance/accounts (CRUD cây), /object-categories, /operations, /funds (CRUD)
   - /api/v1/finance/periods (list + action open/close — close chặn khi còn voucher DRAFT trong kỳ)
   - /api/v1/finance/opening-balances (GET/PUT theo kỳ + TK + đối tượng)
   - /api/v1/finance/vouchers: CRUD theo voucher_type + lines; workflow DRAFT→approve→APPROVED→post→POSTED→unlock→UNLOCKED (RBAC action POST/UNLOCK).
4. PostingService: khi post voucher → sinh gl_entry theo business_operation template (Nợ/Có, đối tượng, tiền) hoặc theo dr/cr override trên line; validate: kỳ OPEN (lỗi FIN_PERIOD_CLOSED), tổng Nợ = tổng Có; POSTED rồi thì voucher + gl_entry bất biến (sửa = unlock có quyền, xóa gl_entry cũ trong cùng transaction, ghi audit).
5. Hoàn thiện lerp generate (task 05): PENDING→GENERATED đồng thời tạo finance.voucher tương ứng (map voucher_type theo bảng system_design.md mục 3.5) với lines copy từ payload; POSTED khi voucher post.
Tạo test_finance.bat: tạo phiếu thu thủ công 1tr (Nợ 1111/Có 131) → post → GET gl-entries thấy 2 dòng cân; post vào kỳ CLOSED expect 409. Build pass.
```

## Nghiệm thu
- Post phiếu → gl_entry cân Nợ/Có; kỳ đóng → 409 FIN_PERIOD_CLOSED.
- LERP generate tạo voucher đúng loại, post xong lerp_voucher → POSTED.
