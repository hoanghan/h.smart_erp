# Task UI-02 — Khung điều hướng: Sidebar, Header, Breadcrumb, Awesomebar (Smart ERP)

## Bối cảnh
Sidebar **Smart ERP** đang cố định 250px, không thu gọn, không highlight mục active; header chỉ có username + Đăng xuất. Thiếu tìm kiếm toàn cục, breadcrumb, tạo nhanh. Task này dựng khung điều hướng hiện đại kiểu ERPNext/MBW Next. Phụ thuộc UI-01 (token/theme). Tham khảo `task/34_ux_ui_redesign_proposal.md` mục 3.B.

## Quy trình Git (BẮT BUỘC)
Không commit trực tiếp lên `main`.
1. `git checkout main && git pull && git checkout -b feat/ui-02-navigation`
2. Code trên branch, commit theo từng phần.
3. Push và tạo PR về `main`, kèm ảnh trước/sau. Chờ review, không tự merge.

## PROMPT (dán cho Claude)
```
Làm việc trong C:\Project\Personal\ERP\sourcecode\erp-frontend. Tạo branch feat/ui-02-navigation từ main (dùng token từ UI-01, không commit thẳng main).

1. Sidebar (src/layout/AppLayout.tsx): bật thu gọn (icon-only 64px ↔ 250px) qua SidebarComponent enableDock + nút toggle; nhớ trạng thái vào localStorage. Highlight mục menu đang active theo route hiện tại. Thay chữ "ERP" cứng bằng logo + tên "Smart ERP" (sau này lấy tên công ty từ /admin/company-info).
2. Header: từ trái sang phải — nút toggle sidebar, Breadcrumb theo route (BreadcrumbComponent), ô tìm kiếm toàn cục, nút "＋ Tạo nhanh" (DropDownButton/SplitButton: Báo giá, Đơn hàng bán, Phiếu nhập...), avatar user (DropDownButton: Hồ sơ, Đổi mật khẩu, Đăng xuất). Tất cả dùng token màu.
3. Awesomebar / Command palette: mở bằng Ctrl+K, dùng Dialog + AutoCompleteComponent; nguồn dữ liệu = danh sách route trong src/router.tsx (+ có thể mở rộng gọi API tìm chứng từ sau). Enter để điều hướng.
4. Breadcrumb tự suy ra từ cấu trúc route (map path → nhãn tiếng Việt).
Label tiếng Việt, tên phần mềm "Smart ERP". Test: thu gọn/mở sidebar nhớ trạng thái; menu active đúng; Ctrl+K mở và nhảy được tới ít nhất 3 màn; breadcrumb đúng trên trang chi tiết.
```

## Nghiệm thu
- Sidebar thu gọn được, nhớ trạng thái, highlight active đúng, có branding Smart ERP.
- Header có breadcrumb + tìm kiếm + tạo nhanh + menu user.
- Awesomebar Ctrl+K hoạt động, điều hướng được.
