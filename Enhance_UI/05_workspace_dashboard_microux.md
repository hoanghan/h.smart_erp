# Task UI-05 — Workspace, Dashboard & Micro-UX (Smart ERP)

## Bối cảnh
Trang chủ **Smart ERP** còn sơ sài, các module chưa có landing page với KPI/shortcut; phản hồi (toast, loading, empty state) chưa thống nhất. Task này dựng workspace + dashboard kiểu MBW Next và chuẩn hóa micro-UX. Phụ thuộc UI-01/02. Tham khảo `task/34_ux_ui_redesign_proposal.md` mục 3.E & 3.F.

## Quy trình Git (BẮT BUỘC)
Không commit trực tiếp lên `main`.
1. `git checkout main && git pull && git checkout -b feat/ui-05-workspace-dashboard`
2. Code trên branch, commit theo từng phần.
3. Push và tạo PR về `main`, kèm ảnh trước/sau. Chờ review, không tự merge.

## PROMPT (dán cho Claude)
```
Làm việc trong C:\Project\Personal\ERP\sourcecode\erp-frontend. Tạo branch feat/ui-05-workspace-dashboard từ main (dùng token UI-01 + khung điều hướng UI-02, không commit thẳng main).

1. Trang chủ Smart ERP (thay src/pages/Home.tsx): dùng DashboardLayoutComponent (ej2-react-layouts) kéo-thả widget; gồm:
   - Number card KPI (tự dựng bằng div + token): doanh thu, công nợ, tồn kho, đơn chờ duyệt... (số liệu từ API báo cáo, tạm mock nếu chưa có endpoint).
   - Chart (ej2-react-charts): doanh thu theo tháng, tiến độ sản xuất.
   - Khối shortcut tới các chức năng hay dùng.
2. Landing page cho 2 module mẫu (Bán hàng, Kho) theo cùng pattern: KPI card + shortcut + danh sách nhanh. Drill-down từ card → list đã lọc sẵn.
3. Micro-UX thống nhất toàn app:
   - Toast dùng chung (ToastComponent) cho mọi thành công/lỗi — thay alert rời rạc.
   - Skeleton/loading khi tải Grid & form.
   - Empty state có minh họa + nút hành động ("Chưa có báo giá — Tạo báo giá đầu tiên").
   - Confirm dialog chuẩn cho thao tác xóa/hủy.
Label tiếng Việt, tên phần mềm "Smart ERP". Test: trang chủ hiện KPI + chart + shortcut, kéo-thả widget được; 2 landing module hoạt động, drill-down sang list đúng; toast/empty state/confirm xuất hiện đúng ngữ cảnh.
```

## Nghiệm thu
- Trang chủ Smart ERP có dashboard KPI + chart + shortcut, kéo-thả được.
- 2 module có landing page, drill-down sang list đã lọc.
- Toast, skeleton, empty state, confirm dialog dùng nhất quán toàn app.
