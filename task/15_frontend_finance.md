# Task 15 — Frontend: Kế toán (Finance)

## Bối cảnh
Backend đã có (task 05-07): `/api/v1/finance/accounts` (cây TK), `/object-categories`, `/operations`, `/funds`, `/periods` (+open/close), `/opening-balances`, `/finance/lerp` (PENDING→GENERATED→POSTED, action generate/delete), `/finance/vouchers` (CRUD + lines + approve/post/unlock), `/vouchers/{id}/gl-entries`, TSCĐ (`/finance/assets`, reports, alloc-rules), CPPB, `/vat-invoices`, `/finance/closing/{periodId}`. Workflow voucher: DRAFT→APPROVED→POSTED→UNLOCKED.

## PROMPT (dán cho Claude)

```
Làm việc trong C:\Project\Personal\ERP\sourcecode\erp-frontend (đã xong task 08-10, 13-14).
Đọc system_design/api_design.md mục 7 và các controller finance trong backend để khớp endpoint/DTO.

Hãy code nhóm trang Kế toán (menu "Kế toán") :
1. /finance/accounts — Hệ thống tài khoản: TreeViewComponent (Syncfusion) bên trái (cây TK theo parent), panel phải form sửa thuộc tính (tên, loại TK, chi tiết theo đối tượng DropDownList object-categories, chi tiết số dư, kiểu số dư); nút Thêm cùng cấp / Thêm tiểu khoản. Chọn TK trong form chứng từ dùng DropDownTreeComponent.
2. /finance/periods — Kỳ kế toán: bảng 12 kỳ theo năm (Select năm), tag OPEN/CLOSED, nút Mở sổ/Khóa sổ (confirm; lỗi khi còn chứng từ DRAFT hiện message).
3. /finance/opening-balances — Số dư đầu kỳ: chọn kỳ → bảng TK có thể nhập Nợ/Có; dòng TK có đối tượng cho mở rộng (expandable row) nhập chi tiết theo đối tượng.
4. /finance/lerp — Phiếu LERP: lưới lọc theo voucher_type (Tabs: YCC, YCT, Phiếu xuất, Phiếu nhập, Trả hàng, Chuyển kho, PGC) + status; nút "Phát sinh phiếu" (generate) → mở chi tiết voucher vừa tạo; nút Xóa (chỉ PENDING/GENERATED).
5. /finance/vouchers — Chứng từ kế toán: lưới (lọc voucher_type, kỳ, trạng thái) + trang chi tiết:
   - Header: loại phiếu, số CT, ngày lập/hạch toán, đối tượng, nghiệp vụ (Select operations), quỹ tiền (Select funds), hóa đơn (số/ký hiệu/ngày), tiền tệ + tỷ giá.
   - Lines: diễn giải, hàng hóa, SL, đơn giá, tiền, VAT, TK Nợ/Có (TreeSelect accounts), đối tượng Nợ/Có.
   - WorkflowBar: Duyệt → Ghi sổ → Mở khóa (quyền POST/UNLOCK; Ghi sổ xong khóa form, hiện nút "C/từ").
   - Nút "C/từ": Drawer hiển thị gl-entries (bảng Nợ/Có 2 cột, footer kiểm tra cân).
6. /finance/assets — TSCĐ/CCDC: lưới + chi tiết (thông tin + tab Biên bản: PP khấu hao, nguyên giá, số tháng còn lại, KH bình quân; tab Bút toán phân bổ: TK + đối tượng + hệ số). /finance/depreciation: chọn kỳ → bảng khấu hao (dòng is_valid=false tô đỏ), nút "Lập c/từ khấu hao" (gọi closing step DEPRECIATION hoặc endpoint riêng nếu có).
7. /finance/vat-invoices — Hóa đơn GTGT: Tabs Mua vào/Bán ra, CRUD; trùng hóa đơn hiện lỗi FIN_DUP_INVOICE.
8. /finance/closing — Nghiệp vụ cuối kỳ: chọn kỳ → checklist các bước (checkbox DEPRECIATION, PREPAID_ALLOC, VAT_DEDUCTION, CLOSING_ENTRIES...), nút Thực hiện → poll GET trạng thái từng bước (Steps với icon done/error), hiện detail lỗi.
Label tiếng Việt, tiền vi-VN. Test: generate 1 LERP phiếu xuất → mở voucher → Ghi sổ → xem C/từ cân Nợ/Có.
```

## Nghiệm thu
- Cây TK sửa được thuộc tính; LERP generate → voucher → Ghi sổ → gl-entries cân, voucher khóa.
- Ghi sổ vào kỳ CLOSED hiện lỗi FIN_PERIOD_CLOSED; màn cuối kỳ chạy DEPRECIATION hiển thị tiến trình.
