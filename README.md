# Personal ERP

ERP nội bộ gồm Backend (ASP.NET Core 9 Web API) và Frontend (React 19 + Vite), dùng PostgreSQL.

## Cấu trúc thư mục

```
sourcecode/
  erp-backend/   -> ASP.NET Core 9 Web API (src/Erp.Api), port 5000
  erp-frontend/  -> React 19 + Vite + AntD 6 + Syncfusion, port 5173
system_design/   -> Tài liệu thiết kế: data model, API design, file backup DB
task/            -> Các task triển khai dạng task/NN_*.md
erd/             -> Sơ đồ ERD
document/        -> Tài liệu nghiệp vụ
```

## Yêu cầu môi trường

- .NET SDK 9 (đang dùng `10.0.202`)
- Node.js >= 20 (đang dùng `v24.16.0`) + npm
- Truy cập PostgreSQL `g_erp` tại `10.161.53.11:5000` (qua VPN/mạng nội bộ)

## 1. Cấu hình Backend

File cấu hình: `sourcecode/erp-backend/src/Erp.Api/appsettings.json`

```json
{
  "ConnectionStrings": {
    "ErpDb": "Host=10.161.53.11;Port=5000;Database=g_erp;Username=gdev;Password=Apg@161VVT"
  },
  "Jwt": {
    "Secret": "doi-chuoi-bi-mat-nay-toi-thieu-32-ky-tu!!",
    "AccessTokenMinutes": 15,
    "RefreshTokenDays": 7,
    "Issuer": "erp-api"
  },
  "Cors": {
    "Origins": "http://localhost:5173,http://localhost:5174"
  }
}
```

- `ConnectionStrings:ErpDb`: DB `g_erp` chỉ truy cập được khi máy đang kết nối VPN/mạng nội bộ tới `10.161.53.11:5000`. Nếu `/auth/login` trả 500 và log báo `Npgsql...Failed to connect to 10.161.53.11:5000`, đó là do mất kết nối mạng tới host này — kết nối lại VPN rồi chạy lại backend, **không sửa connection string**.
- `Cors:Origins`: phải chứa origin của frontend (mặc định Vite chạy port `5173`).

### Chạy backend

```bash
cd sourcecode/erp-backend
dotnet run --project src/Erp.Api --urls http://localhost:5000
```

Lần đầu chạy, `SchemaBootstrap` sẽ tự kiểm tra/tạo các cột còn thiếu trong DB.

Sau khi chạy:
- API: `http://localhost:5000/api/v1/...`
- Swagger UI: `http://localhost:5000/api/v1/docs`
- Health check: `http://localhost:5000/health`
- Hangfire dashboard (job nền): `http://localhost:5000/hangfire`

> Vì chạy bằng `dotnet run` (không `dotnet watch`), sau khi sửa code C# phải dừng process rồi `dotnet build` + chạy lại — process cũ giữ lock file build output.

## 2. Cấu hình Frontend

```bash
cd sourcecode/erp-frontend
npm install
```

### License Syncfusion

Tạo file `.env.local` (đã có sẵn trong repo, không commit thêm key mới) dựa theo `.env.example`:

```
VITE_SYNCFUSION_LICENSE=<your-syncfusion-community-license-key>
```

Lấy license miễn phí (Community) tại: https://www.syncfusion.com/products/communitylicense

### Chạy frontend

```bash
npm run dev
```

- App: `http://localhost:5173`
- Vite dev server proxy `/api/*` -> `http://localhost:5000` (xem `vite.config.ts`), nên khi dev chỉ cần backend chạy ở port 5000, không cần cấu hình `baseURL` thêm.

### Build production

```bash
npm run build   # tsc -b && vite build
```

## 3. Đăng nhập

Tài khoản test: **admin / admin123** (`POST /api/v1/auth/login`)

## 4. Backup / Restore database

Backup mới nhất: `system_design/g_erp_backup_20260614.sql` (pg_dump plain SQL, full schema + data).

Tạo backup mới:

```bash
PGPASSWORD='Apg@161VVT' pg_dump -h 10.161.53.11 -p 5000 -U gdev -d g_erp \
  -f system_design/g_erp_backup_$(date +%Y%m%d).sql --no-owner --no-privileges
```

Restore vào DB rỗng:

```bash
PGPASSWORD='Apg@161VVT' psql -h <host> -p <port> -U gdev -d g_erp \
  -f system_design/g_erp_backup_YYYYMMDD.sql
```

## 5. Quy trình phát triển

Các task triển khai nằm trong `task/NN_*.md` (tiếng Việt), mỗi file gồm "Bối cảnh", "PROMPT" (yêu cầu cụ thể) và "Nghiệm thu" (tiêu chí chấp nhận). Tài liệu thiết kế tham khảo: `system_design/data_model.md`, `system_design/api_design.md`, `system_design/system_design.md`.
