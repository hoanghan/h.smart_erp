# erp-backend (.NET 9)

Backend API: ASP.NET Core 9 + EF Core 9 + Npgsql, CSDL PostgreSQL `g_erp`
(đã tạo bằng `../../system_design/data_model.sql`).
Thiết kế: `../../system_design/` (system_design.md, api_design.md).

## Yêu cầu

- .NET SDK 8.0 — kiểm tra: `dotnet --list-sdks` (Visual Studio 2022 thường có sẵn;
  nếu chưa: https://dotnet.microsoft.com/download/dotnet/8.0)

## Chạy lần đầu

```powershell
cd C:\Project\Personal\ERP\sourcecode\erp-backend

# 1. Sửa src\Erp.Api\appsettings.json:
#    ConnectionStrings:ErpDb → đúng user/password server PostgreSQL (10.161.53.11/g_erp)

# 2. Build
dotnet build

# 3. Tạo user admin
dotnet run --project src/Erp.Api -- seed-admin admin admin123

# 4. Chạy API
dotnet run --project src/Erp.Api
```

- Swagger UI: http://localhost:5000/api/v1/docs (port xem console khi chạy)
- Health: `GET /health`
- Login: `POST /api/v1/auth/login` body `{"username":"admin","password":"admin123"}`
  → dùng `access_token` bấm **Authorize** trong Swagger để gọi các API khác.

## Cấu trúc

```
src/Erp.Api/
├── Program.cs            # DI, JWT, CORS, Swagger, seed-admin
├── appsettings.json
├── Core/                 # JwtService, RbacService, Mapper, PageResult
├── Data/ErpDbContext.cs  # map EF ↔ schema core (snake_case)
├── Entities/             # Org + MasterData entities
├── Dtos/                 # Auth + MasterData records
└── Controllers/
    ├── AuthController.cs           # login / refresh / me
    ├── CrudControllerBase.cs       # CRUD generic + RBAC + soft-delete
    └── MasterDataControllers.cs    # uoms, products, partners, warehouses,...
```

## API hiện có

| Nhóm | Endpoint |
|---|---|
| Auth | `POST /api/v1/auth/login`, `POST /auth/refresh`, `GET /auth/me` |
| Master data | `GET/POST/PUT/DELETE /api/v1/md/{uoms, payment-methods, delivery-methods, product-groups, products, partners, warehouses, departments, employees}` — phân trang `?page=&size=`, tìm kiếm `?q=` |

Phân quyền: admin full; user thường cần bản ghi trong `core.permission`
(subject_type=`CATALOG`, subject_code=`<resource>`, action=`VIEW/CREATE/UPDATE/DELETE`).

## Kế hoạch tiếp

- [ ] Workflow engine (máy trạng thái chứng từ) + đánh số phiếu (`core.doc_numbering`)
- [ ] Sales: báo giá, đơn hàng bán
- [ ] Purchasing, Inventory, LERP bridge, Finance
- [ ] Hangfire jobs (khấu hao, phân bổ, cuối kỳ)
- [ ] Tests (xUnit + Testcontainers PostgreSQL)
