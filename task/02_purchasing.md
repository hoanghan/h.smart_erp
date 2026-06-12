# Task 02 — Module Purchasing (Mua hàng)

## Bối cảnh
Theo quy trình "Mua hàng nhập kho CTEG SCRM": yêu cầu mua → đơn hàng mua (NORMAL/SERVICE/OUTSOURCING) → duyệt → đề nghị thanh toán (nhiều đợt) → duyệt thanh toán. Bảng: `purchasing.purchase_request(_line)`, `purchase_order(_line)`, `po_cost`, `po_payment_request`, `po_payment_actual`, `supplier_return(_line)`.

## PROMPT (dán cho Claude)

```
Làm việc trong C:\Project\Personal\ERP\sourcecode\erp-backend (.NET 9, EF Core, PostgreSQL g_erp).
Đọc system_design/api_design.md mục Purchasing, data_model.md mục 3, và pattern QuotationsController hiện có.

Hãy code module Purchasing:
1. Entities + DbContext mapping cho purchasing.purchase_request(_line), purchase_order(_line), po_cost, po_payment_request, po_payment_actual, supplier_return(_line) (schema purchasing, snake_case, id Identity always).
2. Workflow (thêm vào WorkflowService.Definitions):
   - purchase-orders: DRAFT→approve→APPROVED→(receive flows do Inventory cập nhật NOT_RECEIVED/RECEIVED)→complete→COMPLETED; cancel (lý do bắt buộc).
   - po-payments: DRAFT→approve→APPROVED (chuẩn bị cho LERP-YCC sau này).
3. Controllers:
   - /api/v1/purchasing/requests (CRUD + lines + action approve)
   - /api/v1/purchasing/orders (CRUD + lines + costs + actions; đánh số PO{YY}{MM}-{####} qua DocNumberingService)
   - /api/v1/purchasing/orders/{id}/payment-requests + /payment-actuals; /api/v1/purchasing/payments (list tất cả ĐNTT + action approve)
   - /api/v1/purchasing/supplier-returns (CRUD + lines + approve)
4. Ràng buộc nghiệp vụ: po_cost trước khi approve bắt buộc có receipt_doc_id (lỗi COST_NO_RECEIPT_REF — theo tài liệu phải gắn Số phiếu nhập mới đẩy được sang kế toán).
Sau khi xong: tạo test_purchasing.bat (pattern như test_sales.bat: tạo PO → duyệt → ĐNTT → duyệt ĐNTT → check 409 khi duyệt 2 lần), build pass.
```

## Nghiệm thu
- Build 0 lỗi, test_purchasing.bat pass.
- PO có doc_no dạng `PO2606-0001`; duyệt chi phí thiếu phiếu nhập → 409 COST_NO_RECEIPT_REF.
