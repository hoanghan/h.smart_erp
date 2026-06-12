# Task 21 — Nâng cấp Purchase theo mô hình ERPNext (Buying)

## Bối cảnh
Điều chỉnh module Purchasing hiện tại (task 02) theo chu trình Buying của ERPNext:

```
Material Request → Request for Quotation (RFQ) → Supplier Quotation
      → Purchase Order → Purchase Receipt (nhiều lần) → Purchase Invoice → Payment
```

Điểm khác biệt chính so với bản hiện tại:
- **Material Request** có loại (PURCHASE / TRANSFER / ISSUE) thay cho purchase_request đơn thuần.
- **RFQ + Supplier Quotation**: gửi yêu cầu báo giá nhiều NCC, so sánh, tạo PO từ báo giá thắng.
- **PO theo dõi tiến độ theo dòng**: `received_qty`, `billed_qty` từng line; trạng thái kiểu ERPNext: TO_RECEIVE_AND_BILL → TO_BILL / TO_RECEIVE → COMPLETED, và **CLOSED** (đóng chủ động khi không nhận nữa); nhận hàng từng phần tự cập nhật %.
- **Payment Terms Template**: lịch thanh toán theo % + số ngày (thay nhập tay từng đợt) — khi PO duyệt tự sinh các đợt ĐNTT theo template.
- **Taxes & Charges Template**: mẫu thuế/phụ phí áp vào PO.
- **Landed Cost**: phân bổ po_cost vào giá vốn các dòng phiếu nhập theo tỷ lệ số lượng/giá trị (như Landed Cost Voucher của ERPNext) — thay cho việc chỉ gắn Số phiếu nhập.

## PROMPT (dán cho Claude)

```
Làm việc trong C:\Project\Personal\ERP\sourcecode\erp-backend (.NET 9, EF Core, PostgreSQL g_erp). Module purchasing hiện có giữ nguyên API cũ, NÂNG CẤP theo mô hình ERPNext Buying như sau (schema mới thêm qua SchemaBootstrap idempotent):

1. Material Request:
   - ALTER purchasing.purchase_request thêm request_type TEXT DEFAULT 'PURCHASE' (PURCHASE/TRANSFER/ISSUE), required_by DATE.
   - Khi APPROVED: type=PURCHASE cho phép gom thành RFQ hoặc PO; type=TRANSFER tạo stock_doc TRANSFER; type=ISSUE tạo stock_doc ISSUE_OTHER.
   - GET /purchasing/requests/{id}/actions/make-rfq | make-po | make-stock-entry.
2. RFQ + Supplier Quotation (bảng mới purchasing.rfq, rfq_supplier, rfq_line, supplier_quotation(_line)):
   - POST /purchasing/rfqs (từ material request hoặc tự do): lines + danh sách NCC.
   - POST /purchasing/rfqs/{id}/suppliers/{sid}/quotation: nhập báo giá NCC (giá, thời gian giao, hiệu lực).
   - GET /purchasing/rfqs/{id}/compare: bảng so sánh giá theo dòng (NCC × giá) → POST /purchasing/supplier-quotations/{id}/actions/make-po tạo PO từ báo giá chọn.
3. Purchase Order nâng cấp:
   - ALTER purchase_order_line thêm received_qty NUMERIC(18,4) DEFAULT 0, billed_qty NUMERIC(18,4) DEFAULT 0.
   - Khi stock_doc RECEIPT/PURCHASE hoàn tất: cộng received_qty từng line (theo product); khi Purchase Invoice (finance) ghi sổ: cộng billed_qty.
   - Status tự tính (không cần user bấm): APPROVED → TO_RECEIVE_AND_BILL → (nhận đủ) TO_BILL → (hóa đơn đủ) COMPLETED; thêm action close (→ CLOSED, mọi lúc sau APPROVED, lý do bắt buộc) và reopen. Cập nhật WorkflowService cho khớp; giữ map cũ NOT_RECEIVED/RECEIVED như alias khi đọc (DB migrate giá trị cũ).
   - Cho phép nhận từng phần: validate tổng actual_qty các phiếu nhập ≤ ordered qty × (1 + over_receipt_pct config, default 0).
4. Payment Terms Template (bảng core.payment_terms_template(_line): tên, lines {tỷ lệ %, số ngày sau ngày hóa đơn/PO}):
   - CRUD /md/payment-terms-templates; gán template_id vào partner và purchase_order.
   - Khi PO approve: tự sinh po_payment_request theo các dòng template (amount = tổng PO × %, due = ngày PO + days). Sales order dùng lại cơ chế này thay due_days đơn (giữ tương thích).
5. Taxes & Charges Template (core.tax_charge_template(_line): loại ON_NET_TOTAL/ACTUAL, tỷ lệ/tiền, TK hạch toán):
   - CRUD /md/tax-templates; PO chọn template → tính tax_total, grand_total.
6. Landed Cost Voucher (purchasing.landed_cost_voucher(_line)):
   - POST /purchasing/landed-costs: chọn 1..n phiếu nhập + các khoản chi phí (từ po_cost approved hoặc nhập mới) + phương pháp phân bổ QTY/AMOUNT → tính phân bổ vào từng dòng phiếu nhập (cột mới stock_doc_line.landed_cost NUMERIC) và cập nhật giá vốn stock_move (valuation) của các dòng liên quan; sinh outbox event cho kế toán.
Viết test_purchase_v2.bat: MR → RFQ 2 NCC → nhập 2 báo giá → so sánh → tạo PO từ NCC rẻ hơn → duyệt (payment terms 50/50 tự sinh 2 ĐNTT) → nhập kho 1 phần (received_qty cập nhật, status TO_RECEIVE_AND_BILL) → nhập nốt → TO_BILL → landed cost phân bổ → check giá vốn. Build pass, giữ các test cũ xanh.
```

## Nghiệm thu
- Chuỗi MR → RFQ → SQ → PO chạy đủ; bảng so sánh giá trả đúng; PO sinh từ báo giá thắng.
- Nhận 1 phần: line.received_qty đúng, status PO tự chuyển; close/reopen hoạt động.
- PO duyệt với payment terms 30/70 → tự có 2 ĐNTT đúng số tiền + hạn; landed cost làm thay đổi giá vốn dòng nhập.
