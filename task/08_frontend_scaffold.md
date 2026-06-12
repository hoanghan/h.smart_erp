# Task 08 — Frontend Scaffold (React + TypeScript + Syncfusion)

## Bối cảnh
FE tách riêng tại `sourcecode/erp-frontend`, gọi API `http://localhost:5000/api/v1`. Stack đã chốt: React 18 + TypeScript + Vite + **Syncfusion React (Community License)** + TanStack Query + Zustand + react-router. CORS backend đã mở `http://localhost:5173`.

Trước khi code: đăng ký **Syncfusion Community License** tại syncfusion.com/products/communitylicense (free nếu doanh thu <$1M & ≤5 dev) để lấy license key.

## PROMPT (dán cho Claude)

```
Tạo project mới tại C:\Project\Personal\ERP\sourcecode\erp-frontend.
Đọc system_design/system_design.md mục 2.1 và api_design.md mục 1-2 trước.

Yêu cầu:
1. Vite + React 18 + TypeScript; cài @tanstack/react-query, zustand, react-router-dom, axios, dayjs và các gói Syncfusion: @syncfusion/ej2-react-grids, ej2-react-inputs, ej2-react-dropdowns, ej2-react-buttons, ej2-react-navigations (Sidebar, Tabs, Toolbar, Menu), ej2-react-popups (Dialog, Toast), ej2-react-calendars, ej2-react-layouts.
   - src/syncfusion.ts: registerLicense(import.meta.env.VITE_SYNCFUSION_LICENSE) — key đặt trong .env.local (tạo .env.example, KHÔNG commit key); import CSS theme (material3 hoặc bootstrap5) trong main.tsx; bật CLDR/locale vi cho L10n (loadCldr + L10n.load nhãn lưới tiếng Việt: phân trang, filter, group panel...).
2. src/api/client.ts: axios instance baseURL /api/v1 (proxy vite → http://localhost:5000); interceptor gắn Bearer access token; tự refresh khi 401 (gọi /auth/refresh bằng refreshToken trong zustand store, retry request, logout nếu refresh fail).
3. src/stores/auth.ts (zustand): user, tokens, login/logout; persist refreshToken vào sessionStorage.
4. Layout: SidebarComponent (menu Bán hàng / Mua hàng / Kho / Kế toán / CRM / Kênh bán hàng / Danh mục / Quản trị — MenuComponent dọc), header Toolbar hiện user + nút logout; router lazy theo feature; route guard chưa login → /login.
5. Trang /login: form Syncfusion (TextBoxComponent + ButtonComponent) gọi POST /auth/login, lỗi hiện ToastComponent tiếng Việt.
6. Trang Home: dashboard placeholder (Card số liệu gọi GET /sales/quotations?size=1 và /sales/orders?size=1 lấy total).
7. components/DataTable.tsx generic bọc GridComponent: phân trang server-side qua state page/size (map PageResult{items,total,page,size} của backend — KHÔNG dùng DataManager mặc định, tự fetch bằng TanStack Query), ô tìm kiếm map ?q=, sort server-side, toolbar slot cho nút thêm/sửa/xóa, sẵn prop cho group panel (allowGrouping) và footer aggregate dùng sau.
8. README.md hướng dẫn: đăng ký Community License, npm install, set VITE_SYNCFUSION_LICENSE, npm run dev (port 5173), backend chạy trước.
Theme mặc định Syncfusion, không tự chế CSS ngoài file theme override nhỏ. Code chạy được ngay với backend hiện tại (admin/admin123).
```

## Quy ước component Syncfusion cho TOÀN BỘ các task FE sau (09, 10, 13-16, 18-20)
| Nhu cầu | Dùng |
|---|---|
| Lưới dữ liệu / editable / group / banded | GridComponent (+ ColumnsDirective, stackedHeader, AggregatesDirective, editSettings batch) |
| Form thêm/sửa trượt bên phải | SidebarComponent hoặc DialogComponent |
| Lookup remote (mã hàng, KH...) | ComboBoxComponent/DropDownListComponent filtering server-side (thay LookupSelect) |
| Cây (TK, phòng ban, kho) | TreeViewComponent / TreeGridComponent; chọn cây trong form: DropDownTreeComponent |
| Chọn nhiều 2 cột (thành viên nhóm) | ListBoxComponent dual với toolbar |
| Tag trạng thái / Steps workflow | ChipListComponent / custom WorkflowBar + ButtonComponent |
| Khoảng ngày báo cáo | DateRangePickerComponent |
| Thông báo | ToastComponent; xác nhận: DialogUtility.confirm |
| Chart dashboard/báo cáo | @syncfusion/ej2-react-charts (thay @ant-design/charts) |
| Upload import Excel | UploaderComponent |
Các task FE viết trước theo AntD: khi thực thi prompt, agent tự thay thành component tương ứng theo bảng này (đã ghi chú trong 00_PLAN.md).

## Nghiệm thu
- `npm run dev` → /login đăng nhập admin/admin123 → layout sidebar đủ menu; không có cảnh báo license trên console (key hợp lệ).
- DataTable phân trang server-side đúng total/page; nhãn lưới tiếng Việt.
- Access token hết hạn (15') → request tự refresh không văng login.
