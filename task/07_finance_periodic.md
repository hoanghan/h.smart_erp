# Task 07 — Finance định kỳ (TSCĐ/CCDC/CPPB, Thuế, Cuối kỳ)

## Bối cảnh
Theo "FRM - Hướng dẫn xử lý nghiệp vụ định kỳ": khấu hao TSCĐ (4 phương pháp), phân bổ CCDC/CPPB (hệ số: tỷ lệ = hệ số/tổng hệ số), khấu trừ GTGT, tính lại giá xuất kho, kết chuyển cuối kỳ. Bảng: `finance.fixed_asset`, `asset_group`, `asset_report`, `asset_alloc_rule`, `depreciation_entry`, `prepaid_*`, `vat_invoice`, `vat_deduction`, `costing_object`, `period_closing`.

## PROMPT (dán cho Claude)

```
Làm việc trong C:\Project\Personal\ERP\sourcecode\erp-backend. Yêu cầu task 06 đã xong.
Đọc data_model.md mục 6.3-6.4 và document/CTEG FRM - Huong dan xu ly nghiep vu dinh ky 19082021A.pdf.

Hãy code Finance định kỳ:
1. Cài Hangfire (Hangfire.AspNetCore + Hangfire.PostgreSql), dashboard /hangfire (chỉ admin).
2. TSCĐ/CCDC: CRUD /api/v1/finance/assets (+asset-groups), /assets/{id}/reports (biên bản: PP khấu hao STRAIGHT_LINE trước, các PP khác để stub), /assets/{id}/alloc-rules. DepreciationService.RunAsync(periodId): mỗi tài sản có biên bản APPLIED → tính KH tháng = nguyên giá/số tháng SD, phân bổ theo alloc_rules (tỷ lệ = hệ số/tổng), sinh 1 voucher CT_KHAU_HAO + gl_entry (Nợ TK phân bổ/Có 214), ghi depreciation_entry (is_valid=false nếu thiếu thiết lập — tương ứng "dòng đỏ").
3. CPPB: tương tự với prepaid_card phân bổ theo thời gian, TK **242** (chi phí trả trước theo TT200); TK phân bổ đích thường 627/641/642. Khấu hao TSCĐ: khung thời gian theo TT45/2013/TT-BTC, hạch toán Nợ 627/641/642 / Có 214.
4. Thuế GTGT: CRUD /api/v1/finance/vat-invoices (unique chống trùng → 409 FIN_DUP_INVOICE); VatDeductionService(periodId): tổng VAT vào/ra → bút toán khấu trừ (Nợ 3331/Có 1331 phần nhỏ hơn), ghi vat_deduction.
5. Cuối kỳ: POST /api/v1/finance/closing/{periodId}/run body {steps:[...]} → enqueue Hangfire job chạy tuần tự các bước trong finance.period_closing (DEPRECIATION, PREPAID_ALLOC, VAT_DEDUCTION, CLOSING_ENTRIES). Trình tự kết chuyển ĐÚNG TT200:
   (a) 521 → giảm 511 (Nợ 511/Có 521);
   (b) Doanh thu & thu nhập: 511, 515, 711 → Có 911;
   (c) Chi phí: 632, 635, 641, 642, 811 → Nợ 911;
   (d) Thuế TNDN: tính 8211 (Nợ 8211/Có 3334) rồi 8211 → 911;
   (e) Lãi/lỗ: 911 → 4212 (lãi: Nợ 911/Có 4212, lỗ ngược lại).
   GET trạng thái từng bước. RECALC_COGS/FX_REVALUATION/PURCHASE_COST_ALLOC để stub trả NOT_IMPLEMENTED.
Tạo test_closing.bat: tạo 1 TSCĐ + biên bản 12 tháng + alloc rule → run DEPRECIATION → check voucher CT_KHAU_HAO và gl_entry cân. Build pass.
```

## Nghiệm thu
- Chạy khấu hao sinh đúng bút toán, chạy lại cùng kỳ không nhân đôi (idempotent theo UNIQUE asset+period).
- Hóa đơn trùng → 409; kết chuyển đưa 911 về 421 cân.
