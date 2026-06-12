# Task 11 — Báo cáo & Dashboard

## Bối cảnh
LeanSCRM/FACM có hệ thống báo cáo nhanh, báo cáo tổng hợp, đồ thị (HDSD mục 18) và sổ sách kế toán (FACM mục 5). Giai đoạn đầu làm các báo cáo cốt lõi.

## PROMPT (dán cho Claude)

```
Làm việc trong C:\Project\Personal\ERP\sourcecode (backend + frontend, các task 01-10 đã xong).

Backend (.NET):
1. /api/v1/reports/sales-summary?from=&to=&groupBy=day|month|partner|product — doanh số từ sales_order APPROVED trở lên (tổng tiền, VAT, số đơn).
2. /api/v1/reports/stock-summary?warehouseId= — tồn kho hiện thời kèm giá trị (stock_balance join product).
3. /api/v1/reports/receivables?asOf= — công nợ phải thu theo KH (từ gl_entry TK 131 nếu đã có task 06, ngược lại từ payment_request - payment_actual).
4. /api/v1/reports/quotation-funnel?from=&to= — đếm báo giá theo trạng thái (funnel chuyển đổi).
5. Xuất Excel: thêm ?format=xlsx dùng ClosedXML trả file (Content-Disposition).
Frontend (React):
6. Trang /dashboard: 4 Card số liệu (doanh số tháng, số BG chờ duyệt, đơn chưa giao, tồn kho âm nếu có) + chart doanh số 12 tháng (dùng @ant-design/charts hoặc recharts) + funnel báo giá.
7. Trang /reports: chọn báo cáo, bộ lọc khoảng ngày (RangePicker), bảng kết quả + nút Xuất Excel.
```

## Nghiệm thu
- Dashboard hiện số liệu thật từ DB; xuất Excel mở được trong MS Excel.
