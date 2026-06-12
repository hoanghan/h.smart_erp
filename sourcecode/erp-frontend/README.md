# ERP Frontend

SPA cho hệ thống ERP, viết bằng React 18 + TypeScript + Vite + Ant Design + TanStack Query + Zustand + react-router-dom.

Backend tương ứng nằm tại `../erp-backend` (ASP.NET Core, expose `http://localhost:5000/api/v1`).

## Cài đặt & chạy

```bash
npm install
npm run dev      # http://localhost:5173
```

> **Backend phải chạy trước** (`http://localhost:5000`). Vite dev server proxy mọi request `/api/*`
> sang backend (xem `vite.config.ts`), nên FE gọi `apiClient` với `baseURL: /api/v1` mà không cần CORS.

Đăng nhập với tài khoản mặc định: `admin` / `admin123`.

## Cấu trúc thư mục

```
src/
  api/
    client.ts      # axios instance, gắn Bearer token, tự refresh khi 401
    types.ts        # PageResult, ApiErrorBody, các DTO dùng chung
  stores/
    auth.ts          # zustand store: user, accessToken, refreshToken (refreshToken persist sessionStorage)
  layout/
    AppLayout.tsx    # Sider menu + Header (user/logout) + Outlet
    RequireAuth.tsx  # route guard, chưa đăng nhập -> /login
  pages/
    Login.tsx
    Home.tsx         # dashboard placeholder (số báo giá / đơn hàng)
    sales/, purchasing/, inventory/, accounting/, admin/   # placeholder theo nhóm menu
    masterdata/Products.tsx  # ví dụ dùng DataTable với /md/products
  components/
    DataTable.tsx    # bảng AntD dùng chung: phân trang + tìm kiếm server-side (PageResult)
    PlaceholderPage.tsx
  router.tsx         # khai báo route, lazy-load theo feature
  App.tsx            # bootstrap phiên đăng nhập (refresh token đã lưu) trước khi vào router
  main.tsx           # providers: ConfigProvider (vi), AntApp, QueryClientProvider, BrowserRouter
```

## Auth flow

- `POST /auth/login` → lưu `accessToken` (in-memory) + `refreshToken` (persist `sessionStorage`).
- Mọi request gắn header `Authorization: Bearer <accessToken>`.
- Access token hết hạn (15') → response 401 → client tự gọi `POST /auth/refresh`, cập nhật token rồi
  retry request gốc. Nếu refresh thất bại → xoá phiên, điều hướng `/login`.
- Khi tải lại trang, `App.tsx` thử khôi phục phiên từ `refreshToken` trong `sessionStorage` trước khi
  render router (màn hình loading `Spin`).

## Build

```bash
npm run build     # tsc -b && vite build
npm run preview
```
