# Task 20 — Form Báo giá & Đơn hàng bán theo đúng layout LeanSCRM

## Bối cảnh
Phân tích từ ảnh chụp màn hình trong `document/Quy trinh bao gia ban hang xuat kho CTEG SCRM updated 4.docx`. Yêu cầu: làm lại form FE **giống bản gốc** về bố cục, field, lưới và chức năng chuột phải. Thay thế trang chi tiết báo giá/đơn hàng của task 10.

---

## ĐẶC TẢ FORM 1 — "Thông tin báo giá" (theo ảnh gốc)

### Vùng header: form 2 khối — khối trái 3 cột (label phải-trái ~110px), khối phải cố định ~260px

| Hàng | Khối trái (3 cột) | Khối phải |
|---|---|---|
| 1 | Số YCBG (ro, tự sinh) · Loại báo giá (Select: Thông thường/Công trình - nhà) · Ngày lập (ro) · Người lập (ro) | Hiện trạng (ro, tag) |
| 2 | Bộ phận Y/C (Select) · Người Y/C báo giá (Select NV) · Số ĐT · Email (tự điền theo người Y/C) | ☑ Mẫu in theo bộ |
| 3 | Người duyệt (Select) · Ngày duyệt (ro) · Ngày Y/C giao (DatePicker) | Thời hạn báo giá (number, mặc định 2,00) |
| 4 | Khách Hàng (Select search, colspan 2) · Người liên hệ (Select theo KH + nút "…" thêm nhanh) · Số ĐT (tự điền) | Giao hàng từ [3,00] đến [5,00] |
| 5 | Đ/C giao hàng (Select địa chỉ KH + nút "…", colspan rộng) · Email | Loại tiền [VND ▼] · Tỷ giá [1] |
| 6 | Hình thức (Select: Hàng thông thường/Báo giá dự toán) · PT thanh toán (Select) · PT giao hàng (Select) | Tổng tiền hàng (ro) |
| 7 | TK thanh toán (Select TK ngân hàng cty, colspan 2) · DV đính kèm (Input) | VAT 10% (ro) |
| 8 | Ghi chú (Input dài, colspan hết khối trái) | **Tổng cộng (ro, đậm)** |

Ô bắt buộc nền **vàng nhạt**: Khách hàng, Bộ phận Y/C... (theo quy ước LeanSCRM "ô vàng = bắt buộc").

### Tabs dưới header: `Hàng hóa | Chi phí | Tính giá | Tài liệu | Công việc`

**Tab Hàng hóa** — lưới editable, có dòng filter (ô ≡ mỗi cột), group panel "Kéo thả tiêu đề để nhóm cột":

| STT | Mã hàng (lookup) | Tên hàng hóa | Quy cách | Dự án - Nhà (chỉ hiện khi Loại = Công trình-nhà) | ĐVT | Số lượng | Trọng lượng | Đơn giá (REF) | Giá duyệt | Thành tiền | VAT (%) | Ghi chú |

Footer: đếm dòng + tổng Số lượng, Trọng lượng, Thành tiền. Navigator góc trái dưới (+ − ✓ ✗).

**Context menu (chuột phải) trên lưới Hàng hóa** — đúng thứ tự gốc:
Thêm (Ctrl+Alt+I) · Thêm dòng cuối (Ctrl+I) · Xóa · Lưu (Ctrl+S) · Không lưu ─ Import báo giá từ Excel · Kết xuất Excel ─ Duyệt báo giá · Hủy duyệt · Từ chối báo giá · Hủy báo giá · Cập nhật báo giá ▸ (Chờ xác nhận đơn / Không thành công) ─ Đọc lại dữ liệu (Ctrl+F5) · Lịch sử thao tác ─ **Chuyển thành đơn hàng** ─ Thông tin hàng hóa · Thông tin tồn kho.
(Item disable theo trạng thái + quyền, map vào các action API: approve, reject, cancel, mark-order-pending, mark-failed, convert-to-order...)

**Tab Tính giá** — lưới group theo **Bộ**, header 2 tầng (banded columns):
`Hàng Hóa` | `Nguyên vật liệu` (ĐVT, Giá vốn) | `Chi phí` (CP gia công neo/Cái, CP mạ…) | `Tính giá` (Tổng gv/cái, Tổng giá vốn, Tỷ lệ %, Giá đề xuất, Giá tham khảo, **Giá duyệt** — ô vàng editable, Giá duyệt (Kg), Giá trị duyệt). Footer tổng Tổng giá vốn + Giá trị duyệt.
Context menu: Tính giá (Toàn bộ) / (Theo mã) / (Cập nhật tỷ trọng) / (Copy) · Lưu/Không lưu · Kết xuất Excel · Thiết lập công thức tính · Thiết lập NVL · Thông tin hàng hóa/tồn kho/tồn kho NVL.

**Tab Chi phí**: lưới (Loại chi phí, Đối tượng NCC, Tỷ lệ %, Mức phí, VAT %, Ghi chú) + chuột phải "Thêm chi phí theo khách hàng". **Tab Tài liệu**: upload/list đính kèm. **Tab Công việc**: list task + ghi chú.

### Toolbar đáy form (trái → phải):
`[+ Thêm] [✗ Xóa] [💾 Lưu] [Bỏ lưu] [⏮ ◀ ▶ ⏭ điều hướng bản ghi] [In ▼ (Xem trước khi in)] [Yêu cầu tính giá]` … bên phải `[Đóng]`.
Nút workflow đổi theo trạng thái: Yêu cầu tính giá → Yêu cầu duyệt → Duyệt báo giá → Chuyển đơn hàng.

---

## ĐẶC TẢ FORM 2 — "Thông tin chi tiết đơn hàng"

Header (khối trái 3 cột + khối phải):
| 1 | Số đơn hàng (ro) · Số hợp đồng · Hình thức (Đơn hàng bán/Đơn hàng tặng) | Hiện trạng (ro) |
| 2 | Ngày lập (ro) · Ngày đặt hàng · Ngày giao (KH) | Loại tiền - Tỷ giá |
| 3 | Khách hàng (mã, Select) · Tên khách hàng (ro, dài) | **Kho bán hàng (Select, vàng)** |
| 4 | **Vùng bán hàng (Select, vàng)** · Đ/C giao hàng (dài) | |
| 5 | Kênh bán hàng · PT thanh toán · PT giao hàng | Tổng thanh toán (ro) |
| 6 | Người lập (ro) · NV bán hàng (Select) · Người duyệt (Select) | Đã thanh toán (ro) |
| 7 | Ghi chú (dài) | Còn lại (ro, đậm) |
| 8 | Dịch vụ đính kèm (dài) | |

Tabs: `Hàng hóa | Chi phí | Khấu trừ | Thanh toán | Giao hàng | Tài liệu | Công việc`.
Lưới Hàng hóa: Mã hàng, Tên hàng, ĐVT, Số lượng, Số lượng (kg), Đơn giá bán (**nền đỏ nhạt khi < giá vốn/giá sàn**), Thành tiền, VAT(%), Ghi chú.
Tab Giao hàng: lưới phiếu xuất + chuột phải "Thêm yêu cầu xuất kho". Tab Thanh toán: 2 lưới Yêu cầu/Thực tế thanh toán (chuột phải Thêm, Chi tiết thanh toán). Tab Khấu trừ: danh sách CTKM tick chọn.

---

## PROMPT (dán cho Claude)

```
Làm việc trong C:\Project\Personal\ERP\sourcecode\erp-frontend (đã có scaffold + API sales đầy đủ).
Đọc đặc tả layout trong file task/20_quotation_form_layout.md (2 form trên) — làm GIỐNG BẢN GỐC LeanSCRM, không sáng tạo lại bố cục.

Yêu cầu kỹ thuật:
1. Tạo components/DocForm/: HeaderGrid (form 2 khối: khối trái 3 cột label-input compact như WinForms — label width cố định, khoảng cách hẹp; khối phải cố định ~260px các ô tổng), EditableGrid bọc GridComponent Syncfusion (filterSettings type FilterBar = dòng filter dưới header y như bản gốc, AggregatesDirective footer tổng, editSettings mode Batch cell editable, allowGrouping + groupSettings showDropArea = panel "Kéo thả tiêu đề để nhóm cột", StackedHeader = banded columns 2 tầng), GridContextMenu (contextMenuItems custom của GridComponent — items disable theo trạng thái/quyền, hiển thị phím tắt), BottomToolbar (ToolbarComponent). Syncfusion Grid có sẵn gần như toàn bộ hành vi DevExpress trong ảnh gốc — ưu tiên dùng tính năng built-in thay vì tự code.
2. Trang /sales/quotations/:id và /sales/orders/:id viết lại theo đúng đặc tả: đủ field, đúng vị trí, đúng tab, đúng context menu, ô bắt buộc nền vàng (#FFF9C4), ô tổng bên phải, Tổng cộng in đậm. Trường nào backend chưa có (Trọng lượng, Số hợp đồng, Quy cách...) thì hiển thị readonly/disabled và ghi chú TODO-BE ở đầu file.
3. Map chức năng vào API hiện có: lưu (PUT + lines), workflow actions, convert-to-order, Kết xuất Excel (/export nếu có task 18, chưa có thì xuất client-side từ dữ liệu lưới), Import từ Excel (chỉ enable khi DRAFT/NEW), In ▼ → window.print với mẫu in báo giá đơn giản (logo + header cty + bảng hàng hóa; "Mẫu in theo bộ" gộp dòng theo bộ), Lịch sử thao tác → Drawer wf_transition_log, Thông tin tồn kho → Drawer stock-balance theo mã hàng đang chọn.
4. Tab Tính giá: dùng dữ liệu quotation lines (giá vốn/chi phí lấy từ API nếu có, chưa có thì cột ro trống + TODO-BE); ô Giá duyệt editable nền vàng, đổi xong tính lại Giá trị duyệt; menu Tính giá (Toàn bộ/Theo mã) gọi endpoint pricing nếu có.
5. Phím tắt trong form: Ctrl+S lưu, Ctrl+I thêm dòng cuối, Ctrl+F5 reload data.
Hoàn thành xong chụp so sánh với mô tả từng vùng; label/format vi-VN.
```

## Nghiệm thu
- Đặt form cạnh ảnh gốc (image1/image5 trong docx): cùng số hàng header, đúng tên + vị trí field, đúng danh sách tab và cột lưới, đúng item context menu.
- Luồng nghiệp vụ chạy được từ form: nhập liệu → Yêu cầu tính giá → nhập Giá duyệt (tab Tính giá) → Yêu cầu duyệt → Duyệt → Chuyển thành đơn hàng (chuột phải hoặc nút).
- Ctrl+S / Ctrl+I / Ctrl+F5 hoạt động; ô bắt buộc nền vàng; Đơn giá bán đỏ khi dưới giá tham chiếu.
