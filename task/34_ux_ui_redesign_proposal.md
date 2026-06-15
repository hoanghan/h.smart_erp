# Đề xuất Redesign UX/UI cho ERP (tham khảo MBW Next — giữ Syncfusion)

> Mục tiêu: nâng trải nghiệm từ "form CRUD chạy được" lên "ERP/DMS dùng hằng ngày được", tham khảo cách MBW Next (xây trên ERPNext/Frappe) tổ chức màn hình, **vẫn dùng Syncfusion EJ2** làm thư viện component chính.

---

## 1. Đánh giá hiện trạng (từ source code)

| Vấn đề | Hiện trạng trong code | Hệ quả UX |
|---|---|---|
| **Hai thư viện UI song song** | `antd@6` + `@syncfusion/ej2-*@29` dùng lẫn lộn (DocForm dùng antd input, list dùng Syncfusion Grid) | Style không đồng nhất (font, border-radius, màu focus, spacing), bundle nặng gấp đôi, khó bảo trì |
| **Không có design token** | Màu/spacing hardcode inline khắp nơi (`#001529`, `#1677ff`, `padding:'24px'`) trong `AppLayout.tsx` | Đổi theme = sửa tay nhiều file; không có dark mode; thiếu nhất quán |
| **Layout tối giản** | Sidebar 250px cố định, header chỉ có username + Đăng xuất | Thiếu: tìm kiếm toàn cục, breadcrumb, thu gọn sidebar, tạo nhanh, thông báo, hồ sơ user |
| **Menu phẳng, dài** | 9 nhóm × nhiều mục, không có "trang chủ module", không favorites/recent | Người dùng phải cuộn & nhớ đường dẫn; không có điểm bắt đầu công việc |
| **Theme `bootstrap5`** | Theme cũ, bo góc/đổ bóng kiểu Bootstrap | Trông "web nội bộ 2018" hơn là SaaS hiện đại |
| **List view "trơn"** | Grid hiển thị data nhưng (suy đoán) thiếu saved view, bộ lọc lưu, bulk action, density | Nghiệp vụ ERP cần lọc/lưu nhiều — thao tác lặp lại tốn thời gian |
| **Điểm cộng cần giữ** | `DocForm` nén dày, ô bắt buộc nền vàng, cảnh báo giá nền đỏ | Đây là convention ERP tốt (giống ERPNext) — giữ và chuẩn hóa |

---

## 2. Bài học rút từ MBW Next / ERPNext (Frappe UI)

MBW Next là bản ERPNext tùy biến cho phân phối (DMS). Những pattern UX đáng học:

1. **Workspace (trang chủ module)** — mỗi phân hệ có một trang landing gồm các "shortcut card" (số liệu + lối tắt), nhóm chức năng theo card, thay vì thả thẳng người dùng vào một danh sách.
2. **Awesomebar (tìm kiếm toàn cục)** — gõ ở bất kỳ đâu để nhảy tới chứng từ/danh mục/báo cáo (kiểu command palette `Ctrl+K`).
3. **List view chuẩn hóa** — bộ lọc lưu được ("saved filters"), chuyển nhanh List/Report/Kanban/Calendar, bulk edit, đếm số theo trạng thái.
4. **Form 3 vùng** — thân chứng từ (sections + tab) | sidebar phải (trạng thái, assigned, tags, timeline hoạt động) | thanh action dính trên cùng.
5. **Number cards + chart dashboard** — KPI dạng thẻ số, biểu đồ trực tiếp trên workspace.
6. **Mobile/SFA** — DMS có app bán hàng hiện trường; layout phải responsive.

> Ta không cần (và không nên) copy y hệt giao diện Frappe, mà **mượn cấu trúc thông tin & luồng thao tác**, dựng lại bằng component Syncfusion.

---

## 3. Giải pháp cải thiện (cụ thể theo Syncfusion)

### A. Hệ thống thiết kế (ưu tiên #1 — nền tảng cho mọi thứ)

**A1. Chọn một thư viện UI, bỏ trùng lặp.**
Đề xuất: **chuẩn hóa về Syncfusion**, gỡ dần `antd`. Lý do: Grid/Scheduler/Charts/TreeGrid nghiệp vụ ERP đều là thế mạnh Syncfusion; giữ antd chỉ vì vài input là không đáng. Trước mắt: bọc input trong DocForm bằng `TextBoxComponent`, `NumericTextBoxComponent`, `DropDownListComponent`, `DatePickerComponent` của Syncfusion để đồng bộ focus/validation.
*(Nếu muốn giữ antd cho form: ít nhất đồng bộ token màu/bo góc giữa 2 lib — xem A3.)*

**A2. Đổi theme `bootstrap5` → `tailwind3` hoặc `fluent2`.**
Syncfusion EJ2 29.x có sẵn các theme này. `tailwind3`/`fluent2` cho cảm giác phẳng, hiện đại, spacing thoáng hơn hẳn. Đổi import trong `main.tsx`:
```ts
// thay '@syncfusion/ej2-*/styles/bootstrap5.css'
import '@syncfusion/ej2-base/styles/tailwind3.css'
// ... các module tương ứng
```

**A3. Định nghĩa design token bằng CSS variables + override biến theme Syncfusion.**
Tạo `src/theme/tokens.css`:
```css
:root {
  --brand-600:#2563eb; --brand-700:#1d4ed8;
  --bg-app:#f6f8fb; --bg-surface:#ffffff;
  --text-1:#0f172a; --text-2:#475569; --border:#e2e8f0;
  --radius:8px; --space:8px;
  --ok:#16a34a; --warn:#d97706; --danger:#dc2626;
  /* map sang biến theme Syncfusion */
  --color-sf-primary: var(--brand-600);
}
```
Thay toàn bộ màu/spacing hardcode trong `AppLayout.tsx` bằng các biến này → mở đường cho **dark mode** (chỉ cần đổi giá trị biến theo `[data-theme="dark"]`).

### B. Layout & Điều hướng

**B1. Sidebar thu gọn được + nhóm theo "workspace".**
- Dùng `SidebarComponent` với `enableDock` + nút collapse (icon-only 64px ↔ 250px), nhớ trạng thái vào `localStorage`.
- Thêm logo/tên công ty (lấy từ `/admin/company-info`) thay chữ "ERP" cứng.
- Đánh dấu mục đang active (hiện chưa highlight theo route).
- Cân nhắc gom 9 nhóm xuống còn các "workspace" lớn: **Bán hàng & CRM**, **Mua hàng & Kho**, **Sản xuất**, **Kế toán**, **Danh mục**, **Quản trị**.

**B2. Header giàu chức năng hơn.**
Bổ sung từ trái sang phải: nút toggle sidebar → **breadcrumb** (theo route) → **ô tìm kiếm toàn cục** → nút **＋ Tạo nhanh** (SplitButton: tạo Báo giá / Đơn hàng / Phiếu nhập…) → chuông thông báo → avatar user (dropdown: hồ sơ, đổi mật khẩu, đăng xuất).

**B3. Awesomebar / Command palette (`Ctrl+K`).**
Dùng `AutoCompleteComponent` của Syncfusion trong một dialog, nguồn = danh sách route + API tìm chứng từ. Cho phép nhảy nhanh "BG-2026-..." hay "Tồn kho". Đây là nâng cấp UX lớn nhất cho người dùng nhập liệu nhiều.

**B4. Trang chủ module (Workspace).**
Thay `Home.tsx` hiện tại bằng dashboard có **number card** (Syncfusion không có sẵn card → tự dựng bằng div + token) và `DashboardLayoutComponent` (`ej2-react-layouts`) cho phép kéo-thả widget. Mỗi module (Bán hàng, Kho…) có một trang landing tương tự với shortcut + KPI riêng.

### C. List view (Grid danh sách)

Chuẩn hóa một `<ListView>` component tái dùng dựa trên `GridComponent`, bật:
- **Toolbar dính**: tìm kiếm, cột (ColumnChooser), lọc nâng cao (`FilterType=Menu/Excel`), xuất Excel/PDF, density (Compact/Normal).
- **Saved views / bộ lọc lưu**: lưu cấu hình filter+column vào localStorage/BE, hiển thị dạng tab hoặc dropdown ("Của tôi", "Quá hạn", "Chờ duyệt"…).
- **Trạng thái dạng chip màu** trong cột (template) thay vì text trơn — tái dùng token `--ok/--warn/--danger`.
- **Bulk action**: bật `selectionSettings.checkbox` + thanh hành động hàng loạt (duyệt nhiều, đóng nhiều, xuất).
- **Đếm theo trạng thái** trên đầu list (Tất cả 120 · Nháp 8 · Chờ duyệt 5…).
- Cân nhắc **Kanban** (`ej2-react-kanban` nếu thêm) cho CRM Opportunities và Lệnh sản xuất.

### D. Form chứng từ (nâng cấp `DocForm`)

Giữ triết lý nén dày + ô bắt buộc nền vàng (tốt rồi), bổ sung:
- **Bố cục 3 vùng kiểu ERPNext**: thân (sections gập được + Tab) | **sidebar phải** (trạng thái workflow, người tạo/duyệt, ngày, tags, `Timeline.tsx` hoạt động) | **thanh action dính** trên cùng (Lưu/Submit/…, hiện sẵn `WorkflowBar.tsx`).
- **Chia section gập được** cho form dài (dùng `AccordionComponent`), tránh form một mạch quá dài.
- **Dirty-state guard**: cảnh báo khi rời trang lúc chưa lưu.
- **Phím tắt**: `Ctrl+S` lưu, `Esc` đóng dialog.
- **Inline validation** đồng bộ (đang trộn cơ chế antd + Syncfusion → thống nhất theo A1).

### E. Dashboard & Báo cáo

- Tận dụng `@syncfusion/ej2-react-charts` (đã có) cho doanh thu, công nợ, tồn kho, tiến độ SX.
- **Number card** KPI + sparkline ở đầu mỗi trang báo cáo (`CrmReportsPage`, `MfgReportsPage` đã có khung).
- Cho phép lọc theo kỳ/kho/nhóm và **drill-down** từ card → list đã lọc sẵn.

### F. Micro-UX & phản hồi

- **Toast** thống nhất (`ToastComponent`) cho mọi thành công/lỗi — thay alert rời rạc.
- **Skeleton/loading** khi tải Grid & form (tránh nhảy layout).
- **Empty state** có hình + nút hành động ("Chưa có báo giá — Tạo báo giá đầu tiên").
- **Confirm dialog** chuẩn cho thao tác phá hủy (xóa, hủy chứng từ).
- **i18n nhất quán**: gắn culture `vi` cho Syncfusion (số, ngày, nút Grid) qua `L10n.load` + `loadCldr`.

### G. Responsive / DMS hiện trường

DMS phân phối (điểm mạnh MBW Next) cần dùng trên tablet/điện thoại của sale: sidebar tự ẩn ở breakpoint nhỏ, Grid chuyển chế độ cuộn ngang/`enableAdaptiveUI`, form 1 cột trên mobile.

---

## 4. Lộ trình triển khai (đề xuất theo giai đoạn)

**Giai đoạn 0 — Nền tảng (1–2 tuần)**
Quyết định A1 (một lib), đổi theme A2, dựng token A3, thay inline-style trong `AppLayout`. → Toàn app đổi "diện mạo" ngay.

**Giai đoạn 1 — Khung điều hướng (1 tuần)**
Sidebar collapse + active state, header mới (breadcrumb, tạo nhanh, user menu), awesomebar `Ctrl+K`.

**Giai đoạn 2 — List & Form chuẩn (2–3 tuần)**
Component `<ListView>` dùng chung (saved view, chip trạng thái, bulk action) + nâng cấp `DocForm` 3 vùng. Refactor dần từng module.

**Giai đoạn 3 — Workspace & Dashboard (1–2 tuần)**
Trang chủ + landing từng module với number card + chart + shortcut.

**Giai đoạn 4 — Tinh chỉnh (liên tục)**
Toast/skeleton/empty state, dark mode, responsive/mobile.

---

## 5. Quick wins (làm ngay, hiệu quả/chi phí cao)

1. Đổi theme `bootstrap5` → `tailwind3` (vài dòng import) — đổi cảm nhận tức thì.
2. Highlight menu item đang active theo route.
3. Thêm breadcrumb vào header.
4. Thay chữ "ERP" bằng logo/tên công ty.
5. Trạng thái chứng từ → chip màu trong Grid.
6. Toast thống nhất cho lưu/lỗi.
7. Gắn culture `vi` cho Syncfusion (Grid/ngày/số hiển thị tiếng Việt).

---

*Ghi chú: phần đánh giá list view dựa trên cấu trúc thư mục & pattern code hiện có; nên rà từng trang để xác nhận tính năng Grid nào đã bật trước khi refactor.*
