# ListView — list view chuẩn hóa (task UI-03)

Component dùng chung bọc `GridComponent` (Syncfusion) cho các trang danh sách, thay
cho việc tự dựng `DataTable` + filter rời rạc ở từng trang. Đã refactor mẫu:
`src/pages/sales/SalesOrdersList.tsx` và `src/pages/inventory/ReceiptsList.tsx`.

## Tính năng có sẵn

- **Toolbar dính** (sticky): tìm kiếm, ColumnChooser, xuất Excel/PDF, lọc nâng cao theo cột
  (`filterSettings.type = 'Menu' | 'Excel'`, mặc định `Menu`).
- **Saved views**: dropdown/tab gồm "Tất cả", các `presetViews` theo nghiệp vụ (vd "Chờ duyệt",
  "Tạm giữ"), và view do người dùng tự lưu ("+ Lưu view" → đặt tên → lưu filter hiện tại).
  Toàn bộ cấu hình (filter trạng thái, từ khóa tìm kiếm, density, cột đã ẩn, view tự lưu) được
  lưu vào `localStorage` theo khóa `erp.listview.<viewKey>` và tự khôi phục khi tải lại trang.
- **Thanh đếm theo trạng thái**: "Tất cả 120 · Nháp 8 · Chờ duyệt 5 ..." — bấm vào để lọc nhanh
  theo `statusField` (mặc định `status`). Số đếm lấy từ `total` của API (1 request/trạng thái).
- **Chip trạng thái màu**: dùng component `<StatusChip label tone />` trong column template,
  `tone` ∈ `ok | warn | danger | info | neutral` ánh xạ tới token `--ok/--warn/--danger` (UI-01).
  Hàm `toneFromStatusColor(statusColor(status))` quy đổi nhanh từ màu Tag antd cũ sang tone.
- **Bulk action**: truyền `bulkActions` → tự thêm cột checkbox, hiện thanh hành động khi chọn
  >= 1 dòng, có thể giới hạn điều kiện qua `isEnabled(rows)` và xác nhận qua `confirmMessage`.
- **Density**: 3 nút Gọn/Vừa/Thoáng đổi `rowHeight` của Grid, lưu theo `viewKey`.
- **enableAdaptiveUI**: bật sẵn cho màn hình nhỏ.

## Cách dùng

```tsx
import ListView, { StatusChip, toneFromStatusColor } from '../../components/ListView'
import { MY_STATUS_LABELS, statusColor } from '../../api/workflow'

const columns = [
  { field: 'docNo', headerText: 'Số phiếu', width: 140, template: (r) => <a onClick={...}>{r.docNo}</a> },
  // ...
  {
    field: 'status', headerText: 'Trạng thái', width: 130,
    template: (r) => <StatusChip label={MY_STATUS_LABELS[r.status] ?? r.status} tone={toneFromStatusColor(statusColor(r.status))} />,
  },
]

<ListView
  viewKey="my-screen"          // khóa localStorage — đặt riêng theo từng màn
  queryKey="my-screen"          // khóa react-query
  endpoint="/module/resource"   // trả về PageResult { items, total, page, size }
  columns={columns}
  baseParams={{ extraFilter: someValue }}   // filter cố định/riêng của trang
  statusOptions={Object.entries(MY_STATUS_LABELS).map(([value, label]) => ({ value, label }))}
  presetViews={[{ id: 'pending', label: 'Chờ duyệt', filters: { status: 'DRAFT' } }]}
  bulkActions={[{
    key: 'approve',
    label: 'Duyệt nhiều',
    confirmMessage: 'Duyệt các dòng đã chọn?',
    isEnabled: (rows) => rows.every((r) => r.status === 'DRAFT'),
    onRun: async (rows) => { /* gọi API rồi invalidateQueries(queryKey) */ },
  }]}
  toolbarExtra={<MyExtraFilterSelect />}  // filter riêng của trang (Select/LookupSelect...)
/>
```

## Lưu ý

- `endpoint` phải trả `{ items, total, page, size }` (PageResult chuẩn của API).
- `statusField` (mặc định `'status'`) là field dùng cho saved view + thanh đếm; đổi nếu API
  dùng tên khác.
- Filter riêng của trang (`baseParams`, `toolbarExtra`) KHÔNG được lưu vào saved view — chỉ
  filter trạng thái (`statusField`) và từ khóa tìm kiếm được lưu/khôi phục.
- Xuất Excel/PDF xuất dữ liệu của **trang hiện tại** (theo phân trang server), không xuất toàn
  bộ kết quả lọc.
- Sau khi `bulkActions` chạy xong, gọi `queryClient.invalidateQueries({ queryKey: [queryKey] })`
  ở trang để Grid tải lại dữ liệu mới.
