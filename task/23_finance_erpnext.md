# Task 23 — Nâng cấp Finance theo mô hình ERPNext (Accounting)

## Bối cảnh
Điều chỉnh module Finance (task 06/07/16) theo kiến trúc kế toán của ERPNext. Map khái niệm:

| ERPNext | Hệ thống hiện tại | Việc cần làm |
|---|---|---|
| GL Entry (immutable, hủy = bút toán đảo) | `gl_entry` xóa khi unlock | Chuyển sang **reversal**: không xóa, sinh dòng đảo + is_cancelled |
| Sales/Purchase Invoice + outstanding | voucher HOA_DON_BAN/PHIEU_MUA_HANG | Thêm `outstanding_amount`, trạng thái UNPAID/PARTLY_PAID/PAID/OVERDUE |
| **Payment Entry + allocation** | Phiếu thu/chi rời | Thanh toán **phân bổ vào từng hóa đơn**, hỗ trợ tạm ứng (advance) |
| Payment Reconciliation | (chưa có) | Màn cấn trừ tạm ứng ↔ hóa đơn |
| Journal Entry | CT_TONG_HOP (task 16) | Giữ, thêm loại (Journal/Contra/Credit Note/Debit Note...) |
| Cost Center tree | (chưa có) | Thêm chiều phân tích chi phí trên gl_entry |
| Period Closing Voucher | bước CLOSING_ENTRIES | Chuẩn hóa thành chứng từ kết chuyển 911→421 có thể hủy (đảo) |
| Perpetual inventory (Stock→GL) | LERP phiếu kho | GL tự động từ SLE: Nợ/Có TK tồn kho theo `stock_value_difference` (khớp task 22) |
| AR/AP Aging, Trial Balance, GL report | báo cáo task 11 | Bổ sung aging buckets + Trial Balance + sổ cái theo party |

## PROMPT (dán cho Claude)

```
Làm việc trong C:\Project\Personal\ERP\sourcecode\erp-backend (.NET 9, EF Core, PostgreSQL g_erp). Yêu cầu task 06 (finance core) đã xong; task 22 (SLE valuation) nên xong trước mục 6. Schema mới qua SchemaBootstrap idempotent, giữ API cũ tương thích.

1. GL Entry immutable kiểu ERPNext:
   - ALTER finance.gl_entry thêm is_cancelled BOOLEAN DEFAULT FALSE, remarks TEXT, cost_center_id BIGINT, against TEXT (TK đối ứng tóm tắt), party_type/party_id (chuẩn hóa từ object_type/object_id).
   - Bỏ cơ chế unlock-xóa-gl_entry: hủy voucher đã POSTED = action "cancel-posting" → sinh bộ gl_entry ĐẢO (đổi Nợ↔Có) cùng voucher, đánh dấu is_cancelled cả 2 bộ, voucher → CANCELLED_POSTED. Sửa voucher = cancel rồi amend (tạo voucher mới copy, doc_no thêm hậu tố -1 như ERPNext).
2. Invoice outstanding:
   - ALTER finance.voucher thêm outstanding_amount NUMERIC(18,2), due_date DATE, payment_status TEXT (UNPAID/PARTLY_PAID/PAID/OVERDUE/RETURN).
   - Khi post HOA_DON_BAN/PHIEU_MUA_HANG: outstanding = grand_total; job hằng ngày (Hangfire) set OVERDUE khi quá due_date.
3. Payment Entry + allocation (bảng finance.payment_allocation: payment_voucher_id, invoice_voucher_id, allocated_amount):
   - PHIEU_THU/PHIEU_CHI thêm payment_type (RECEIVE/PAY/INTERNAL_TRANSFER), party, paid_amount, unallocated_amount.
   - POST /finance/payments/{id}/allocations: phân bổ vào 1..n hóa đơn của cùng party (validate ≤ outstanding từng hóa đơn, tổng ≤ paid_amount); khi post: giảm outstanding các hóa đơn, phần dư = tạm ứng (unallocated, hạch toán vào TK ứng trước 131/331 dư Có/Nợ).
   - GET /finance/payments/pending-invoices?partyId= trả hóa đơn còn outstanding để FE tick chọn (như màn Payment Entry của ERPNext).
4. Payment Reconciliation: POST /finance/payment-reconciliation {partyId, allocations:[{paymentId, invoiceId, amount}]} — cấn trừ tạm ứng đang treo vào hóa đơn, sinh bút toán chuyển (không thu thêm tiền).
5. Cost Center: bảng finance.cost_center (cây, is_group); thêm cost_center_id vào voucher_line + gl_entry; CRUD /finance/cost-centers; các chi phí (642...) bắt buộc cost center nếu accounting_policy.require_cost_center = true.
6. Perpetual inventory (định khoản theo TT200, kê khai thường xuyên): thay LERP thủ công cho phiếu kho bằng GL tự động — khi stock_doc COMPLETED (đã có SLE từ task 22): sinh voucher tự động + gl_entry theo stock_value_difference. Nhập mua: Nợ 152/153/156 + Nợ 1331 / Có 331 (hàng về cùng hóa đơn; hàng đang đi đường dùng 151); Xuất bán: Nợ 632/Có 155-156; Hàng bán trả lại: Nợ 155-156/Có 632 + ghi giảm DT qua 5212; Trả hàng NCC: Nợ 331/Có 152-156 + giảm 1331; Chuyển kho nội bộ cùng công ty: không sinh GL. Bật/tắt qua accounting_policy.perpetual_inventory (default true). LERP giữ cho YCC/YCT/PGC.
6b. Báo cáo tài chính theo mẫu TT200 (endpoint trả cấu trúc chỉ tiêu + số liệu, FE/Excel render): B01-DN Bảng cân đối kế toán, B02-DN Báo cáo KQKD, B03-DN Lưu chuyển tiền tệ (phương pháp gián tiếp tối thiểu); mapping chỉ tiêu ↔ TK cấu hình bằng bảng finance.fs_mapping (seed theo TT200, sửa được).
7. Period Closing Voucher: chứng từ CT_KET_CHUYEN có thể cancel (đảo); chạy lại được sau khi cancel.
8. Báo cáo kế toán (endpoint, FE làm ở task 15/11):
   - /finance/reports/general-ledger?accountId=&partyId=&costCenterId=&from=&to= (số dư đầu, phát sinh, lũy kế)
   - /finance/reports/trial-balance?periodId= (dư đầu Nợ/Có, PS Nợ/Có, dư cuối — kiểm tra cân)
   - /finance/reports/ar-aging?asOf=&buckets=30,60,90 và /ap-aging (outstanding theo party, phân tuổi nợ theo due_date)
Viết test_finance_v2.bat: hóa đơn bán 10tr (outstanding 10tr) → payment 6tr allocate (PARTLY_PAID, outstanding 4tr) → payment 5tr allocate 4tr (PAID, dư 1tr tạm ứng) → reconciliation dùng 1tr vào hóa đơn mới → cancel-posting 1 voucher check gl_entry đảo + trial balance vẫn cân. Build pass, test cũ xanh.
```

## Nghiệm thu
- Hủy ghi sổ sinh bút toán đảo, không xóa gl_entry; trial balance luôn cân trước/sau cancel.
- Thanh toán phân bổ nhiều hóa đơn, outstanding/payment_status cập nhật đúng, phần dư thành tạm ứng và cấn trừ được.
- Phiếu kho hoàn tất tự sinh GL theo giá trị tồn (perpetual), khớp số với SLE; AR aging chia bucket đúng theo due_date.
