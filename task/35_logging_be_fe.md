# Task 35 — Ghi log ra file cho Backend & Frontend (Smart ERP)

## Bối cảnh
Hiện **Smart ERP** chỉ có các file `*.log/*.txt` rời rạc (api_log.txt, backend_run.log, vite_log.txt...) là output redirect thủ công, **không phải logging có cấu trúc**. Backend là .NET (Erp.Api, net8/net9) mới dùng `Microsoft.Extensions.Logging` mặc định, chưa ghi ra file. Frontend React/Vite chưa có cơ chế log tập trung. Task này thiết lập ghi log ra file chuẩn cho cả hai phía, có xoay vòng (rolling) theo ngày.

## Quy trình Git (BẮT BUỘC)
Không commit trực tiếp lên `main`.
1. `git checkout main && git pull && git checkout -b feat/35-logging-be-fe`
2. Code trên branch, commit theo từng phần (BE riêng, FE riêng).
3. Push và tạo PR về `main`. Chờ review, không tự merge.

## PROMPT (dán cho Claude)
```
Làm việc trong C:\Project\Personal\ERP\sourcecode. Tạo branch feat/35-logging-be-fe từ main (không commit thẳng main).

== BACKEND (erp-backend/src/Erp.Api) ==
1. Thêm Serilog: gói Serilog.AspNetCore + Serilog.Sinks.File. Cấu hình trong Program.cs (UseSerilog), đọc cấu hình từ appsettings.json.
2. Ghi log ra thư mục logs/ (ví dụ logs/erp-YYYYMMDD.log), rolling theo NGÀY, giữ tối đa N ngày (vd 14), kèm thông tin: timestamp, level, RequestId/TraceId, message, exception.
3. Mức log: Information mặc định, Warning/Error cho lỗi; tách file lỗi riêng logs/error-YYYYMMDD.log (tùy chọn). Cấu hình level qua appsettings (Serilog:MinimumLevel).
4. Middleware log request/response (method, path, status, thời gian xử lý ms) — tránh log body nhạy cảm (mật khẩu, token).
5. Thêm thư mục logs/ vào .gitignore.

== FRONTEND (erp-frontend) ==
6. Tạo src/utils/logger.ts: API log thống nhất (debug/info/warn/error), gắn timestamp + context (route, user). Ở DEV in console; ở PROD hạ mức ồn.
7. Bắt lỗi toàn cục: window.onerror + unhandledrejection + React ErrorBoundary → đẩy qua logger.
8. (Tùy chọn) Gửi log mức error/warn về backend qua endpoint POST /api/client-logs để ghi vào file log BE (buffer + gửi theo lô, không chặn UI). Nếu làm, thêm controller nhận log ở BE.
9. Thay các console.log rải rác bằng logger.

== DỌN DẸP ==
10. Bỏ theo dõi các file log thủ công cũ (api_log.txt, *_run.log, vite_log.txt...) khỏi git, thêm pattern *.log và các file log tạm vào .gitignore.

Test: chạy BE → có file logs/erp-<ngày>.log ghi request và lỗi; gọi 1 API lỗi → thấy ở error log. Chạy FE → ném 1 lỗi thử → logger ghi/đẩy đúng; ErrorBoundary hiện màn lỗi thân thiện.
```

## Nghiệm thu
- Backend ghi log có cấu trúc ra file, rolling theo ngày, có log request/response và lỗi; cấu hình mức log qua appsettings.
- Frontend có logger tập trung + bắt lỗi toàn cục (ErrorBoundary, onerror, unhandledrejection).
- (Nếu làm) log lỗi FE gửi về và ghi được ở BE.
- Thư mục/file log được .gitignore; log thủ công cũ không còn theo dõi trong git.
