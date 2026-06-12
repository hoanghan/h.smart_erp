# Task 01 — Hoàn thiện module Sales

## Bối cảnh
Backend đã có Báo giá + Đơn hàng bán cơ bản. Cần bổ sung các nghiệp vụ còn lại theo tài liệu LeanSCRM: bảng giá, khuyến mại – chiết khấu, giảm giá hàng bán, chi phí bán hàng (duyệt → PGC), yêu cầu/thực tế thanh toán.

Bảng đã có sẵn trong DB: `sales.price_list(_item)`, `sales.promotion(+discount_item, gift_item)`, `sales.sales_allowance(_line)`, `sales.so_cost`, `sales.so_payment_request`, `sales.so_payment_actual`, `sales.so_promotion`, `core.partner_sales_cost`.

## PROMPT (dán cho Claude)

```
Làm việc trong C:\Project\Personal\ERP\sourcecode\erp-backend (.NET 9, EF Core, PostgreSQL g_erp).
Đọc system_design/api_design.md mục Sales và data_model.md mục 2 trước khi code.
Theo đúng pattern hiện có (Entities + ErpDbContext mapping snake_case schema sales, DTO records, Controller + RbacService, WorkflowService nếu có trạng thái).

Hãy bổ sung module Sales:
1. Bảng giá: CRUD /api/v1/sales/price-lists và /price-lists/{id}/items; khi tạo SalesOrderLine, nếu có bảng giá hiệu lực (valid_from <= hôm nay <= valid_to) chứa product thì tự điền list_price.
2. Khuyến mại – chiết khấu: CRUD /api/v1/sales/promotions (+discount-items, gift-items); endpoint PUT /sales/orders/{id}/promotions áp chương trình vào đơn (ghi sales.so_promotion): hàng chiết khấu giảm % đơn giá theo total_pct, hàng tặng thêm dòng is_gift=true đơn giá 0 theo tỷ lệ required_qty/total_gift_qty.
3. Giảm giá hàng bán: /api/v1/sales/allowances (CRUD + lines + action approve theo WorkflowService, trạng thái DRAFT→APPROVED; hình thức CREDIT_NOTE/CASH_REFUND); chỉ tạo được từ đơn DELIVERED/COMPLETED.
4. Chi phí đơn hàng: /sales/orders/{id}/costs CRUD + action approve/unapprove (đánh dấu approved, approved_by, approved_at); mặc định khi tạo đơn tự copy từ core.partner_sales_cost của khách hàng.
5. Thanh toán: /sales/orders/{id}/payment-requests và /payment-actuals (CRUD); khi đơn được duyệt, nếu PTTT có due_days > 0 thì tự sinh 1 payment request hạn = doc_date + due_days.
Sau khi code xong: cập nhật test_sales.bat thêm các bước test mới (bảng giá tự áp, áp KM, duyệt chi phí, payment request tự sinh), build và liệt kê các endpoint mới.
```

## Nghiệm thu
- `dotnet build` 0 lỗi; chạy `test_sales.bat` pass toàn bộ.
- Tạo đơn cho KH có `partner_sales_cost` → tab costs có sẵn dòng chi phí.
- Duyệt đơn có PTTT due_days=30 → tự có payment request hạn +30 ngày.
