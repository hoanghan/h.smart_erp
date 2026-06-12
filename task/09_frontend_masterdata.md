# Task 09 — Frontend: Trang danh mục (Master Data)

## Bối cảnh
Backend đã có CRUD: uoms, payment-methods, delivery-methods, product-groups, products, partners, warehouses, departments, employees (PageResult + ?q=&page=&size=). Cần UI quản trị danh mục theo phong cách lưới của LeanSCRM.

## PROMPT (dán cho Claude)

```
Làm việc trong C:\Project\Personal\ERP\sourcecode\erp-frontend (đã có scaffold task 08).

Yêu cầu:
1. Tạo factory CrudPage<T>: nhận config {resource, columns, formFields} → render DataTable (GridComponent server-side pagination + search, task 08) + form thêm/sửa trong DialogComponent/SidebarComponent + nút xóa (DialogUtility.confirm, gọi DELETE — backend soft-delete). Dùng TanStack Query (queryKey theo resource+page+q, invalidate sau mutation). Lỗi 409 hiện ToastComponent với ApiError.message.
2. Áp dụng cho 9 trang: /md/uoms, /md/payment-methods, /md/delivery-methods, /md/product-groups, /md/products, /md/partners, /md/warehouses, /md/departments, /md/employees — menu nhóm "Danh mục".
3. Trường đặc thù:
   - products: select uom (lookup GET /md/uoms), select group (product-groups), switch is_kit;
   - partners: switch is_customer/is_supplier, số credit_limit/credit_days, select NV phụ trách (employees);
   - product-groups/departments: select parent (cùng resource).
4. Component LookupSelect tái sử dụng: bọc ComboBoxComponent (Syncfusion) filtering server-side (debounce 300ms, gọi ?q=), hiển thị "code — name".
5. Cột boolean hiển thị Tag (Hoạt động/Ngừng), tiền format vi-VN.
Tất cả label tiếng Việt. Chạy được ngay với backend (admin/admin123).
```

## Nghiệm thu
- Thêm/sửa/xóa Hàng hóa với lookup ĐVT hoạt động; search lưới gọi đúng ?q=.
- Tạo mã trùng → message lỗi 409 tiếng Việt, form không đóng.
