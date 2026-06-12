# Task 04 — Gia công (Outsourcing)

## Bối cảnh
Chuỗi nghiệp vụ theo tài liệu CTEG: ĐH mua gia công → nhập kho NVL (kho gia công) → tự sinh phiếu **Xuất cho SX-DV** (chọn quy trình: Gia công xi / Nhúng nóng / Taro tán, đơn vị BỘ PHẬN GIA CÔNG) → tự sinh **Nhập SP-TP** (thành phẩm + chi phí gia công theo mã hàng) → duyệt chi phí → tập hợp chi phí thành ĐH mua dịch vụ → ĐNTT. Bảng: `purchasing.outsourcing_cost`, `core.process`, stock_doc sub_type OUTSOURCING/FINISHED_GOODS, `counterpart_doc_id`.

## PROMPT (dán cho Claude)

```
Làm việc trong C:\Project\Personal\ERP\sourcecode\erp-backend. Yêu cầu task 03 (Inventory) đã xong.
Đọc data_model.md mục 3-4 (outsourcing_cost, stock_doc) và tài liệu nghiệp vụ document/CTEG SCRM - Huong dan nghiep vu kho.pdf mục 2.2 nếu cần.

Hãy code nghiệp vụ gia công:
1. Seed core.process: XI (Gia công xi), NHUNG_NONG (Nhúng nóng), TARO_TAN (Taro tán) — idempotent trong SchemaBootstrap.
2. Action create-outsourcing-issue trên stock_doc RECEIPT đã COMPLETED: sinh stock_doc ISSUE/OUTSOURCING copy lines, bắt buộc chọn process_id + partner (NCC gia công), org_unit='BO_PHAN_GIA_CONG', counterpart_doc_id trỏ ngược.
3. Action create-finished-receipt trên phiếu xuất OUTSOURCING đã COMPLETED: sinh stock_doc RECEIPT/FINISHED_GOODS cùng process_id (validate trùng quy trình với phiếu xuất — sai thì 409 PROCESS_MISMATCH).
4. CRUD /api/v1/purchasing/outsourcing-costs gắn theo receipt_doc_id (phiếu Nhập SP-TP): đối tượng, loại chi phí, quy trình, tiền tệ + tỷ giá, VAT; action approve.
5. POST /api/v1/purchasing/orders/{id}/collect-service-costs: với PO hình thức SERVICE, gom các outsourcing_cost đã approve chưa collected của NCC đó thành PO lines (mỗi cost 1 dòng dịch vụ), set collected_po_id.
Tạo test_outsourcing.bat chạy đủ chuỗi trên. Build pass.
```

## Nghiệm thu
- Chuỗi nhập NVL → xuất SX-DV → nhập SP-TP chạy trơn, quy trình khớp nhau; sai quy trình → 409.
- Tập hợp chi phí tạo đúng dòng trong PO dịch vụ, cost đánh dấu collected.
