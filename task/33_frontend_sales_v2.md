# Task 33 — Frontend: Sales v2 (Quotation ERPNext, Promotional Scheme, SO per-line)

## Bối cảnh
Task 10 viết theo luồng báo giá LeanSCRM cũ — **đã bỏ** (task 24 thay bằng Quotation ERPNext + Promotional Scheme + Pricing Rule + Coupon; SO theo dõi delivered/billed per-line, reserve tồn, credit limit). Task này THAY THẾ task 10 cho phần báo giá và cập nhật trang đơn hàng. Stack Syncfusion (bảng quy đổi task 08).

## PROMPT (dán cho Claude)

```
Làm việc trong C:\Project\Personal\ERP\sourcecode\erp-frontend. Đọc task/24_sales_erpnext.md (API + workflow mới: DRAFT→OPEN→ORDERED/LOST/EXPIRED/CANCELLED) + bảng component task 08.

1. /sales/quotations — Báo giá (viết lại):
   - Lưới: lọc trạng thái ChipList (Draft/Open/Ordered/Lost/Expired/Cancelled), KH, valid_till sắp hết hạn tô vàng.
   - Chi tiết: header (KH, order_type, valid_till DatePicker, price list, tax template, terms) + lưới lines (LookupSelect sản phẩm — thêm dòng tự gọi /sales/pricing/resolve điền rate + discount%, cột ordered_qty readonly, amount tự tính) + ô nhập Coupon (validate qua resolve, lỗi COUPON_INVALID hiện Toast).
   - WorkflowBar: Submit → Tạo đơn hàng (Dialog chọn dòng + qty cho phép tạo MỘT PHẦN — mặc định toàn bộ; sau tạo quotation vẫn OPEN nếu còn dư, hiện ordered/total từng dòng) | Set as Lost (Dialog multi-select lý do + đối thủ) | Extend (khi EXPIRED) | Cancel | Amend (khi CANCELLED → mở bản DRAFT mới).
2. /sales/promotional-schemes — Chương trình khuyến mãi:
   - Lưới + chi tiết: header (áp dụng cho item/item group/ALL, KH/nhóm KH/territory, hiệu lực) + tab "Bậc giảm giá" (grid editable: min_qty, max_qty, discount% hoặc rate) + tab "Bậc tặng hàng" (min/max qty, hàng tặng LookupSelect, SL tặng); lưu xong hiện danh sách Pricing Rule con đã sinh (readonly).
   - /sales/pricing-rules: lưới readonly toàn bộ rule (lọc nguồn SCHEME/MANUAL, priority) + form thêm rule thủ công; /sales/coupons: CRUD (code, rule, max_use/used, hiệu lực).
   - Công cụ "Thử giá": form chọn KH + sản phẩm + qty (+coupon) → gọi resolve hiện rate/discount/quà/rule áp — để sale kiểm tra nhanh.
3. /sales/orders — cập nhật trang chi tiết (trên nền task 10/20):
   - Lưới lines thêm cột delivered_qty / billed_qty (ProgressBar), delivery_date theo dòng; dòng quà is_gift Tag.
   - Trạng thái mới TO_DELIVER_AND_BILL/TO_DELIVER/TO_BILL/COMPLETED + WorkflowBar thêm Close/Hold/Resume; nút "Xuất hóa đơn" (make-invoice — Dialog hiện SL đã giao chưa hóa đơn từng dòng).
   - Khi duyệt vượt hạn mức: hiện Dialog cảnh báo CREDIT_LIMIT_EXCEEDED với số liệu (hạn mức/đang nợ/đơn này), nút "Vẫn duyệt" chỉ enable nếu user có quyền bypass.
   - Panel phải hiện tồn kho khả dụng (projected) của dòng đang chọn.
4. Dọn dẹp: xóa route/màn hình của luồng báo giá cũ (Yêu cầu tính giá, tab Tính giá tỷ trọng) nếu đã code từ task 10/20; giữ layout form task 20 cho phần header/lưới.
Label tiếng Việt. Test: tạo BG 2 dòng (giá tự áp từ scheme bậc 10+) → Submit → tạo đơn 1 phần dòng 1 → BG vẫn OPEN → tạo nốt → ORDERED; đơn vượt hạn mức hiện dialog chặn; Thử giá khớp resolve.
```

## Nghiệm thu
- Luồng Quotation mới đủ trên UI (kể cả tạo SO một phần, Lost có lý do, Extend, Amend); giá tự áp theo scheme/coupon khi thêm dòng.
- Scheme lưu xong thấy rules con; công cụ Thử giá đúng theo bậc số lượng.
- SO hiện tiến độ giao/hóa đơn per-line, Close/Hold, cảnh báo hạn mức với bypass theo quyền.
