# Task 29 — Tái cấu trúc dự án cho AI Agent đọc dễ, tiết kiệm token

## Bối cảnh
Dự án sẽ được code chủ yếu bằng AI agent qua các prompt trong `task/`. Hiện trạng gây tốn token: file khổng lồ (SchemaBootstrap ~700 dòng, MasterDataControllers, SalesDtos gộp mọi thứ), không có file định hướng cho agent, agent phải đọc nhiều file mới hiểu convention. Mục tiêu: **agent mở 1-2 file nhỏ là nắm được luật chơi + biết chính xác phải đọc gì tiếp**.

## Nguyên tắc thiết kế cho agent
1. **CLAUDE.md ở gốc mỗi repo** — bản đồ + luật, dưới 150 dòng, luôn đúng.
2. **Module tự mô tả**: mỗi module 1 thư mục có README ~30 dòng (bảng, endpoint, trạng thái, file nào làm gì).
3. **File nhỏ theo chủ đề**: mục tiêu ≤300 dòng/file; 1 file = 1 nhóm trách nhiệm.
4. **Tài liệu sinh từ code** (endpoints, máy trạng thái) — không viết tay để khỏi lệch.
5. **Convention ghi 1 chỗ duy nhất**, mọi nơi khác chỉ trỏ tới.

## PROMPT (dán cho Claude)

```
Làm việc trong C:\Project\Personal\ERP\sourcecode (backend .NET 9 + frontend nếu có). Đây là task REFACTOR CẤU TRÚC — không đổi hành vi, build + test bat hiện có phải vẫn pass sau khi xong.

== A. FILE ĐỊNH HƯỚNG CHO AGENT ==
1. Tạo erp-backend/CLAUDE.md (≤150 dòng, tiếng Việt) gồm:
   - Stack + lệnh: build/run/test (dotnet build; dotnet run --project src/Erp.Api; các *.bat), connection string ở đâu, Swagger URL.
   - Bản đồ thư mục 1 dòng/mục + "muốn làm X thì đọc/sửa file Y".
   - LUẬT BẤT BIẾN: schema DB snake_case qua UseSnakeCaseNamingConvention; id Identity ALWAYS; mọi đổi schema qua SchemaBootstrap idempotent (KHÔNG sửa data_model.sql); chứng từ mới = thêm WorkflowService.Definitions + DocNumbering + controller pattern actions/{actionName}; lỗi trả ApiError{code,message} với mã WF_*/FIN_*/STK_*; kế toán theo TT200 (xem task/00_PLAN.md mục Chuẩn mực); RBAC subject/action; tiền NUMERIC(18,2), SL (18,4).
   - DON'T: không xóa gl_entry đã POSTED (chỉ reversal), không hardcode secrets, không tạo migration EF (dùng SchemaBootstrap), không sửa file trong document/.
   - Trỏ tới: ../system_design/*.md, ../task/00_PLAN.md, docs/ sinh tự động.
2. Mỗi module 1 README.md ~30 dòng theo template: Phạm vi | Bảng (schema.table) | Endpoints chính | Máy trạng thái (nếu có) | File trong module | Phụ thuộc module khác | Task liên quan (task/NN).

== B. TÁCH NHỎ FILE LỚN (giữ nguyên namespace/public API) ==
3. Tổ chức lại theo module thực sự (hiện Entities/Dtos/Controllers để phẳng):
   src/Erp.Api/Modules/{Core,MasterData,Sales,Purchasing,Inventory,Finance,Channel,Crm,Mfg}/
     ├── README.md
     ├── Entities/   (tách theo doc-type: Quotation.cs, SalesOrder.cs... mỗi file 1 aggregate)
     ├── Dtos/       (QuotationDtos.cs, SalesOrderDtos.cs... — tách SalesDtos.cs hiện tại)
     ├── Controllers/(mỗi resource 1 file — tách MasterDataControllers.cs)
     └── Services/
   Shared: src/Erp.Api/Core/ giữ (Workflow, Numbering, Rbac, Mapper, PageResult...).
4. Tách SchemaBootstrap thành Migrations/ theo module + thứ tự:
   src/Erp.Api/Migrations/001_core.sql, 010_sales.sql, 020_purchasing.sql, 030_inventory.sql, 040_finance.sql, 050_seeds.sql...
   SchemaBootstrap chỉ còn runner: đọc các .sql embedded resource theo thứ tự tên, chạy idempotent, log file nào đã chạy (bảng core.schema_migration ghi tên+hash — hash đổi thì chạy lại). Chuyển toàn bộ SQL hiện tại vào các file tương ứng, KHÔNG đổi nội dung câu lệnh.
5. WorkflowService.Definitions tách thành partial/per-module: Modules/Sales/SalesWorkflows.cs đăng ký vào registry chung — file core không phình khi thêm module.

== C. DOCS SINH TỪ CODE (chống lệch tài liệu) ==
6. Lệnh dotnet run --project src/Erp.Api -- export-docs sinh ra erp-backend/docs/:
   - ENDPOINTS.md: liệt kê route + method + controller (từ ApiExplorer), nhóm theo module.
   - STATUS_MACHINES.md: render WorkflowService.Definitions thành bảng action/from/to/quyền (+ mermaid stateDiagram).
   - DB_TABLES.md: từ EF model — bảng, cột, kiểu (nhóm theo schema).
   - ERROR_CODES.md: scan các mã ApiError dùng trong code.
   Chạy lại lệnh này cuối mỗi task; CLAUDE.md ghi rõ "đọc docs/ trước khi grep code".
7. Tạo GLOSSARY.md (gốc sourcecode/): thuật ngữ Việt ↔ khái niệm code (Báo giá=Quotation, Phiếu xuất=stock_doc ISSUE, ĐNTT=po_payment_request, Ghi sổ=post, KM-CK=promotional_scheme...).
== D. FRONTEND (nếu erp-frontend đã tồn tại) ==
8. erp-frontend/CLAUDE.md tương tự (lệnh dev, cấu trúc features/, quy ước DataTable/CrudPage/LookupSelect/WorkflowBar, gọi API qua client sinh OpenAPI) + README mỗi feature.
== E. CẬP NHẬT TÀI LIỆU PROMPT ==
9. Sửa task/00_PLAN.md mục Cách dùng: thêm bước "Agent bắt đầu phiên: đọc CLAUDE.md + README module liên quan + docs/STATUS_MACHINES.md, KHÔNG đọc cả thư mục".
Sau refactor: dotnet build pass, chạy lại test_sales/test_api bat xanh, export-docs sinh đủ 4 file. Liệt kê file đã di chuyển (mapping cũ→mới) vào REFACTOR_LOG.md.
```

## Nghiệm thu
- Mở `CLAUDE.md` + 1 README module là code được task mới không cần grep diện rộng; mỗi file ≤ ~300 dòng.
- `export-docs` sinh ENDPOINTS/STATUS_MACHINES/DB_TABLES/ERROR_CODES khớp code thật; SchemaBootstrap thành runner + SQL theo module, app khởi động bình thường với DB hiện có (schema_migration ghi nhận).
- Build + các bat test cũ pass nguyên trạng.
