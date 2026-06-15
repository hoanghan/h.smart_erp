# Task UI-04 — Nâng cấp Form chứng từ (DocForm 3 vùng) (Smart ERP)

## Bối cảnh
`DocForm` của **Smart ERP** nén dày, ô bắt buộc nền vàng (giữ lại — convention tốt) nhưng form dài một mạch, thiếu sidebar trạng thái/timeline, thiếu dirty-guard và phím tắt. Task này nâng DocForm theo bố cục 3 vùng kiểu ERPNext. Phụ thuộc UI-01. Tham khảo `task/34_ux_ui_redesign_proposal.md` mục 3.D.

## Quy trình Git (BẮT BUỘC)
Không commit trực tiếp lên `main`.
1. `git checkout main && git pull && git checkout -b feat/ui-04-docform`
2. Code trên branch, commit theo từng phần.
3. Push và tạo PR về `main`, kèm ảnh trước/sau. Chờ review, không tự merge.

## PROMPT (dán cho Claude)
```
Làm việc trong C:\Project\Personal\ERP\sourcecode\erp-frontend. Tạo branch feat/ui-04-docform từ main (dùng token UI-01, không commit thẳng main). Đọc src/components/DocForm/* và src/components/WorkflowBar.tsx, Timeline.tsx.

1. Bố cục 3 vùng cho DocForm:
   - Thân (giữa): các section gập được (AccordionComponent) + Tab cho nhóm dài; giữ lưới nén dày và quy ước ô bắt buộc nền vàng, cảnh báo giá nền đỏ.
   - Sidebar phải: trạng thái workflow, người tạo/người duyệt, ngày, tags, và Timeline hoạt động (tái dùng Timeline.tsx).
   - Thanh action dính trên cùng: tái dùng WorkflowBar (Lưu/Submit/Duyệt...), luôn thấy khi cuộn.
2. Dirty-state guard: cảnh báo khi rời trang/đóng dialog lúc form chưa lưu.
3. Phím tắt: Ctrl+S lưu, Esc đóng dialog.
4. Thống nhất validation hiển thị lỗi theo một cơ chế (theo lựa chọn thư viện ở UI-01).
5. Áp dụng cho 2 form mẫu (ví dụ Báo giá và Phiếu nhập) làm chuẩn nhân rộng.
Label tiếng Việt. Test: form dài gập section được; sidebar hiện trạng thái + timeline; Ctrl+S lưu; rời trang khi dơ dữ liệu hiện cảnh báo; ô bắt buộc vẫn nền vàng.
```

## Nghiệm thu
- DocForm có bố cục 3 vùng (thân sections/tab + sidebar trạng thái/timeline + action bar dính).
- Dirty-guard và phím tắt hoạt động.
- 2 form mẫu áp dụng xong, giữ nguyên quy ước ô bắt buộc/cảnh báo giá.
