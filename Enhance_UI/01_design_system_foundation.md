# Task UI-01 — Nền tảng Design System & Theme (Smart ERP)

## Bối cảnh
Frontend **Smart ERP** hiện dùng song song `antd@6` + `@syncfusion/ej2@29` (theme `bootstrap5`), màu/spacing hardcode inline trong `AppLayout.tsx`. Đây là task nền: thống nhất thư viện, đổi theme hiện đại, dựng hệ token để mọi task UI sau kế thừa. Tham khảo `task/34_ux_ui_redesign_proposal.md` mục 3.A.

## Quy trình Git (BẮT BUỘC)
Không commit trực tiếp lên `main`.
1. `git checkout main && git pull && git checkout -b feat/ui-01-design-system`
2. Code trên branch, commit theo từng phần.
3. Push và tạo PR về `main`, kèm ảnh chụp trước/sau. Chờ review, không tự merge.

## PROMPT (dán cho Claude)
```
Làm việc trong C:\Project\Personal\ERP\sourcecode\erp-frontend. Tạo branch feat/ui-01-design-system từ main (không commit thẳng main). Đọc task/34_ux_ui_redesign_proposal.md.

1. Đổi theme Syncfusion bootstrap5 → tailwind3: sửa toàn bộ import '@syncfusion/ej2-*/styles/bootstrap5.css' trong src/main.tsx sang tailwind3.css tương ứng.
2. Tạo src/theme/tokens.css định nghĩa CSS variables: màu thương hiệu (--brand-600/700), nền (--bg-app/--bg-surface), chữ (--text-1/2), --border, --radius, --space, trạng thái (--ok/--warn/--danger). Import vào main.tsx.
3. Thống nhất thư viện UI: chuẩn hóa về Syncfusion. Trước mắt thay các input antd trong src/components/DocForm bằng component Syncfusion (TextBoxComponent, NumericTextBoxComponent, DropDownListComponent, DatePickerComponent) hoặc — nếu rủi ro cao — tối thiểu đồng bộ token màu/bo góc giữa antd và Syncfusion. Ghi rõ lựa chọn trong PR.
4. Thay toàn bộ màu/spacing hardcode inline trong src/layout/AppLayout.tsx bằng biến token.
5. Gắn culture 'vi' cho Syncfusion (loadCldr + L10n) để Grid/ngày/số hiển thị tiếng Việt.
6. Chuẩn bị sẵn cấu trúc dark mode: [data-theme="dark"] override biến token (chưa cần bật UI).
Tên hiển thị phần mềm: "Smart ERP". Test: app build chạy, các trang chính (list + form) hiển thị theme mới đồng nhất, không vỡ layout.
```

## Nghiệm thu
- Toàn app dùng theme tailwind3, không còn import bootstrap5.
- File tokens.css tồn tại, AppLayout không còn màu/spacing hardcode.
- Quyết định "một thư viện UI" được ghi rõ và áp dụng tối thiểu cho DocForm.
- Grid/ngày/số hiển thị culture vi.
