# Task 12 — Hardening: Tests, CI, Deployment

## Bối cảnh
Chuẩn bị đưa lên môi trường dùng chung: test tự động, CI, đóng gói Docker (xem system_design.md mục 6).

## PROMPT (dán cho Claude)

```
Làm việc trong C:\Project\Personal\ERP\sourcecode.

1. Backend tests: tạo tests/Erp.Tests (xUnit) — unit test DocNumberingService (format, reset kỳ), WorkflowService (transition hợp lệ/không hợp lệ/thiếu lý do), Mapper; integration test (WebApplicationFactory + Testcontainers.PostgreSql chạy data_model.sql) cho luồng auth + quotation→order. Thêm vào ErpBackend.sln.
2. Bảo mật: chuyển secrets khỏi appsettings.json — đọc ConnectionStrings__ErpDb và Jwt__Secret từ biến môi trường (giữ appsettings làm default dev); thêm rate limiting (AddRateLimiter, 100 req/phút/IP cho /auth/login 10 req/phút); audit log middleware ghi core.audit_log cho mọi request ghi (POST/PUT/DELETE: user, path, status).
3. Docker: Dockerfile multi-stage cho Erp.Api; Dockerfile build static cho erp-frontend (nginx serve + proxy /api → backend); docker-compose.yml: postgres 16 (init data_model.sql), backend, frontend, redis (chuẩn bị Hangfire). Biến môi trường qua .env.
4. CI: .github/workflows/ci.yml — dotnet build + test, npm build; chạy khi push.
5. Cập nhật README tổng tại sourcecode/ hướng dẫn dev và deploy bằng docker compose.
Dọn dẹp: xóa các file *.bat và *_log.txt tạm ở erp-backend (giữ run_api.bat), đảm bảo .gitignore đủ.
```

## Nghiệm thu
- `dotnet test` xanh; `docker compose up` → FE http://localhost, API /health ok, login hoạt động.
