# Task 32 — Frontend: Các màn bổ sung Purchase/Inventory v2 (ERPNext)

## Bối cảnh
Task 13/14 (FE mua hàng, kho) viết trước khi nâng cấp ERPNext 21/22/27 nên còn thiếu màn hình cho: RFQ + Supplier Quotation, Landed Cost, payment terms/tax templates, item_supplier, % nhận hàng trên PO, Stock Reconciliation, Bin đầy đủ cột, repost valuation, subcontracting theo BOM. Stack Syncfusion (bảng quy đổi task 08).

## PROMPT (dán cho Claude)

```
Làm việc trong C:\Project\Personal\ERP\sourcecode\erp-frontend. Đọc task/21_purchase_erpnext.md, 22_inventory_erpnext.md, 27_mrp_crm_integration.md (API) + bảng component task 08. Bổ sung vào menu Mua hàng / Kho hàng hiện có.

== MUA HÀNG ==
1. /purchasing/rfqs — Hỏi giá NCC: lưới + chi tiết (lines hàng + danh sách NCC nhận RFQ); nút "Nhập báo giá NCC" mở Dialog theo từng NCC (giá, lead time, hiệu lực — hoặc Import Excel cơ chế task 18); màn **So sánh giá**: Grid pivot dòng = mặt hàng, cột = NCC (ô rẻ nhất tô xanh), chọn NCC thắng từng dòng/toàn bộ → nút "Tạo PO từ báo giá".
2. Cập nhật trang PO (task 13): cột tiến độ — received_qty/billed_qty per line (ProgressBar trong ô), trạng thái mới TO_RECEIVE_AND_BILL/TO_BILL/TO_RECEIVE/CLOSED; WorkflowBar thêm Close (lý do)/Reopen; header thêm payment terms template (DropDownList — hiện preview các đợt ĐNTT sẽ sinh) + tax template (hiện tax_total/grand_total).
3. /purchasing/landed-costs — Phân bổ chi phí mua: chọn 1..n phiếu nhập (Grid checkbox) + lưới chi phí (từ po_cost approved hoặc thêm tay) + radio phân bổ QTY/AMOUNT → bảng preview phân bổ từng dòng phiếu nhập → Submit. 
4. Danh mục: /md/payment-terms-templates (lines % + ngày, validate tổng=100%), /md/tax-templates; tab "NCC theo NVL" trong chi tiết Hàng hóa (item_supplier: NCC, is_default, part no, lead time, giá gần nhất).
5. Subcontracting: trên PO hình thức OUTSOURCING thêm chọn BOM; tab Nhận hàng hiện đối chiếu NVL đã cấp vs định mức (cảnh báo vàng khi lệch).

== KHO ==
6. /inventory/reconciliations — Kiểm kê: tạo phiếu (chọn kho, nút "Lấy tồn hiện tại" đổ system_qty), lưới editable nhập actual_qty (chênh lệch tự tính, tô đỏ/xanh), Import Excel số đếm; WorkflowBar Duyệt → POSTED (hiện link move điều chỉnh).
7. Cập nhật /inventory/stock (task 14): Bin đầy đủ cột actual / reserved / ordered / planned / reserved_for_production / **projected** (tô đỏ khi projected < 0 hoặc < min_stock); bộ lọc nhóm kho theo cây (DropDownTree).
8. Thẻ kho (/inventory/moves): thêm cột valuation_rate, qty_after_transaction, stock_value_difference; footer tổng giá trị.
9. /inventory/valuation — công cụ admin: chọn sản phẩm + kho → nút "Tính lại giá" (repost-valuation, confirm + hiện tiến trình); bảng SLE trước/sau.
10. Phiếu kho REPACK (đổi mã): chi tiết hiện 2 vùng dòng Xuất (mã cũ) / Nhập (mã mới) với tổng giá trị 2 bên phải bằng nhau (cảnh báo khi lệch).
Label tiếng Việt. Test: RFQ 2 NCC → so sánh (ô rẻ tô xanh) → tạo PO → nhận 1 phần (progress bar đúng %) → landed cost phân bổ preview khớp; kiểm kê lệch -5 POSTED ra move điều chỉnh; màn Bin hiện projected đúng sau khi duyệt SO/PO.
```

## Nghiệm thu
- So sánh báo giá NCC trực quan, tạo PO từ dòng thắng; PO hiện % nhận/hóa đơn theo dòng và Close/Reopen được.
- Landed cost preview = kết quả backend; kiểm kê và REPACK thao tác trọn trên UI.
- Màn tồn kho hiện đủ 6 loại số lượng, cảnh báo đúng; repost valuation chạy và đối chiếu được.
