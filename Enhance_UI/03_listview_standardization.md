# Task UI-03 — Chuẩn hóa List View (Grid danh sách) (Smart ERP)

## Bối cảnh
Các trang danh sách **Smart ERP** dùng Syncfusion Grid nhưng rời rạc, thiếu bộ lọc lưu, chip trạng thái, bulk action, density. Nghiệp vụ ERP/DMS lọc & thao tác hàng loạt rất nhiều. Task này tạo một component `<ListView>` dùng chung rồi refactor dần các trang. Phụ thuộc UI-01. Tham khảo `task/34_ux_ui_redesign_proposal.md` mục 3.C.

## Quy trình Git (BẮT BUỘC)
Không commit trực tiếp lên `main`.
1. `git checkout main && git pull && git checkout -b feat/ui-03-listview`
2. Code trên branch, commit theo từng phần.
3. Push và tạo PR về `main`, kèm ảnh trước/sau. Chờ review, không tự merge.

## PROMPT (dán cho Claude)
```
Làm việc trong C:\Project\Personal\ERP\sourcecode\erp-frontend. Tạo branch feat/ui-03-listview từ main (dùng token UI-01, không commit thẳng main).

1. Tạo component dùng chung src/components/ListView.tsx bọc GridComponent với các tính năng bật sẵn:
   - Toolbar dính: ô tìm kiếm, ColumnChooser, lọc nâng cao (filterSettings type Menu/Excel), xuất Excel/PDF, nút đổi density (Compact/Normal/Comfortable).
   - Saved views / bộ lọc lưu: lưu cấu hình filter + cột vào localStorage (đặt key theo tên màn), hiển thị dropdown/tab ("Của tôi", "Quá hạn", "Chờ duyệt"...).
   - Cột trạng thái dạng chip màu qua column template, dùng token --ok/--warn/--danger.
   - Bulk action: selectionSettings checkbox + thanh hành động hàng loạt (props truyền vào, ví dụ Duyệt nhiều / Đóng nhiều / Xuất).
   - Thanh đếm theo trạng thái trên đầu (Tất cả N · Nháp · Chờ duyệt...).
   - enableAdaptiveUI cho màn hình nhỏ.
2. Refactor 2 màn mẫu sang ListView: src/pages/sales/... (Đơn hàng bán) và src/pages/inventory/ReceiptsList.tsx — làm mẫu chuẩn để nhân rộng.
3. Viết README ngắn trong components/ về cách dùng ListView.
Label tiếng Việt. Test: trên 2 màn mẫu — lọc rồi lưu view, tải lại trang vẫn giữ; chip trạng thái đúng màu; chọn nhiều dòng chạy được bulk action; đếm trạng thái khớp số liệu.
```

## Nghiệm thu
- Có component ListView tái dùng với saved view, chip trạng thái, bulk action, density.
- 2 màn mẫu đã refactor và hoạt động đầy đủ.
- Bộ lọc/cột lưu được qua lần tải lại.
