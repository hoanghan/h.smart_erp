# THIẾT KẾ HỆ THỐNG ERP (LeanSCRM + LeanFRM/FACM)

> Tài liệu thiết kế hệ thống, xây dựng từ bộ tài liệu nghiệp vụ trong `document/`:
> HDSD LeanSCRM, Quy trình bán hàng/mua hàng/báo giá, Hướng dẫn nghiệp vụ kho,
> Thanh toán & gia công, FRM Nghiệp vụ định kỳ, LeanFACM User Manual 2024.
>
> **Công nghệ:** .NET 8 (ASP.NET Core) · React + TypeScript · PostgreSQL

---

## 1. Tổng quan

Hệ thống ERP quản lý doanh nghiệp thương mại – gia công, gồm 2 khối chính:

| Khối | Vai trò | Nguồn tài liệu |
|---|---|---|
| **SCRM** (Supply Chain & CRM) | Báo giá, Bán hàng, Mua hàng, Gia công, Kho vận, Khách hàng/NCC | HDSD LeanSCRM, các quy trình CTEG SCRM |
| **FRM/FACM** (Tài chính – Kế toán) | Sổ cái, Tiền & Quỹ, Phải thu, Phải trả, Kho kế toán, TSCĐ/CCDC, Thuế, Báo cáo | LeanFACM Manual, FRM Nghiệp vụ định kỳ |

Hai khối liên kết qua **lớp tích hợp LERP**: chứng từ nghiệp vụ phát sinh ở SCRM (phiếu xuất, phiếu nhập, yêu cầu thanh toán, chuyển kho…) được đẩy sang kế toán dưới dạng phiếu chờ (LERP-*), kế toán "Phát sinh phiếu" → bổ sung định khoản → **Ghi sổ**.

### Nguyên tắc thiết kế

- **Modular monolith**: một codebase .NET, tách module theo bounded context; có thể tách microservice sau.
- **Workflow trạng thái rõ ràng**: mọi chứng từ có máy trạng thái (Mới tạo → Yêu cầu duyệt → Đã duyệt → …) và quy trình duyệt theo phân quyền.
- **Đồng nhất dữ liệu SCRM ↔ FRM**: chứng từ kế toán chỉ sinh từ chứng từ nguồn; hủy/sửa chứng từ nguồn bắt buộc xử lý chứng từ kế toán liên quan (quy tắc "Xử lý lại đơn hàng").
- **Audit đầy đủ**: lưu vết người tạo/duyệt/ghi sổ, nhật ký bán hàng, mua hàng, kho.

---

## 2. Kiến trúc tổng thể

Hệ thống tách thành **2 tầng triển khai độc lập**: FrontEnd (SPA) và BackEnd (API server), giao tiếp duy nhất qua **REST API** (chi tiết tại [`api_design.md`](./api_design.md)). FE và BE là 2 repo/2 artifact riêng, deploy và scale độc lập.

### 2.1. FRONTEND (repo `erp-frontend`)

```
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND — SPA (React + TypeScript)          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │ Bán hàng │ │ Mua hàng │ │   Kho    │ │ Kế toán  │  (pages)  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │
│  Shared UI: DataGrid (lưới master-detail), Form, Workflow bar,  │
│  Lookup (mã hàng/KH/NCC), In phiếu (PDF preview), Dashboard     │
│  State: TanStack Query (server-state) + Zustand (UI-state)      │
│  API client: tự sinh từ OpenAPI spec của BE (openapi-ts)        │
│  Auth: JWT (access in-memory + refresh httpOnly cookie)         │
│  Build: Vite → static files → Nginx/CDN                         │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS · REST /api/v1 · WebSocket /ws
```

- Stack đề xuất: **React 18 + TypeScript + Vite + Syncfusion React (Community License)** — bộ component thương mại kiểu DevExpress (DataGrid group-panel kéo thả, banded columns, TreeGrid, Scheduler, Charts, PivotView), miễn phí cho doanh nghiệp <$1M doanh thu/≤5 dev; TanStack Query, react-router.
- FE không chứa business logic nghiệp vụ (tính giá, định khoản, tồn kho) — chỉ validate hiển thị; mọi quy tắc do BE quyết định.
- i18n: vi mặc định, chuẩn bị en.

### 2.2. BACKEND (repo `erp-backend`)

```
┌────────────────────────────▼────────────────────────────────────┐
│             BACKEND — API SERVER (ASP.NET Core 8)               │
│   API Layer /api/v1: AuthN (JWT) · AuthZ (RBAC) · Rate limit    │
│   · Versioning · OpenAPI/Swagger (nguồn sinh API client cho FE) │
├──────────────────────────────────────────────────────────────────┤
│                     APPLICATION LAYER                            │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌──────────────┐  │
│  │  SALES     │ │ PURCHASING │ │ INVENTORY  │ │  CRM         │  │
│  │ Báo giá    │ │ ĐH mua     │ │ Nhập/Xuất  │ │ Cơ hội       │  │
│  │ ĐH bán     │ │ YC mua hàng│ │ Chuyển kho │ │ Liên hệ      │  │
│  │ Bảng giá   │ │ Gia công   │ │ Tồn kho/Lô │ │ Công việc    │  │
│  │ KM-CK      │ │ TT NCC     │ │ Soạn hàng  │ │ Ghi chú      │  │
│  └─────┬──────┘ └─────┬──────┘ └─────┬──────┘ └──────────────┘  │
│        │              │              │                           │
│  ┌─────▼──────────────▼──────────────▼──────────────────────┐   │
│  │            INTEGRATION LAYER (LERP Bridge)                │   │
│  │  Outbox events → LERP vouchers → Phát sinh phiếu kế toán  │   │
│  └─────┬─────────────────────────────────────────────────────┘  │
│  ┌─────▼──────────────────────────────────────────────────────┐ │
│  │                 FINANCE / ACCOUNTING (FACM)                 │ │
│  │  Sổ cái & Hệ thống TK · Tiền & Quỹ · Phải thu · Phải trả   │ │
│  │  Kho kế toán & Giá xuất · TSCĐ/CCDC/CPPB · Thuế · Cuối kỳ  │ │
│  └─────────────────────────────────────────────────────────────┘│
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  SHARED KERNEL: Danh mục · Tổ chức-Nhân viên · Phân quyền │   │
│  │  Đánh số chứng từ · Workflow/Duyệt · Đính kèm · Audit log │   │
│  └──────────────────────────────────────────────────────────┘   │
├──────────────────────────────────────────────────────────────────┤
│  JOBS (Hangfire): khấu hao, phân bổ CPPB, tính lại giá xuất kho, │
│  kết chuyển cuối kỳ, đồng bộ LERP, báo cáo nền                   │
├──────────────────────────────────────────────────────────────────┤
│  PostgreSQL 16 (schema: core, sales, purchasing, inventory,      │
│  finance)  ·  Redis (cache, tùy chọn)  ·  Object storage (file)  │
└──────────────────────────────────────────────────────────────────┘
```

### 2.3. Stack đề xuất

| Thành phần | Lựa chọn |
|---|---|
| Frontend | React 18 + TypeScript + Vite + **Syncfusion React (Community)** + TanStack Query |
| Backend | .NET 8 LTS — ASP.NET Core Web API (C#) |
| ORM | Entity Framework Core 8 + Npgsql (DB-first theo `data_model.sql`) |
| CSDL | PostgreSQL 16 (schema-per-module) |
| Jobs / Worker | Hangfire (PostgreSQL storage) — khấu hao, phân bổ, LERP, báo cáo nền |
| Cache | Redis (StackExchange.Redis) — tùy chọn giai đoạn đầu |
| Báo cáo / In phiếu | QuestPDF (PDF), ClosedXML (Excel) |
| OpenAPI | Swashbuckle (Swagger UI + spec sinh API client cho FE) |
| AuthN/AuthZ | JWT + RBAC (bảng quyền theo Chức năng/Danh mục/Chứng từ/Nghiệp vụ/Báo cáo) |

---

## 3. Danh sách module

### 3.1. Shared Kernel (core)

| Module | Chức năng chính (theo tài liệu) |
|---|---|
| **Quản lý người dùng & phân quyền** | Người dùng, nhóm người dùng; phân quyền theo **Chức năng, Danh mục, Chứng từ, Nghiệp vụ, Báo cáo** (Xem/Thêm/Sửa/Xóa/Duyệt/Ghi sổ/Mở khóa); phân quyền dữ liệu theo cơ cấu tổ chức; phân quyền phê duyệt |
| **Thiết lập hệ thống** | Thông tin doanh nghiệp; định dạng & đánh số phiếu tự động (vd `PT-MM###`); tùy chọn nghiệp vụ (cho xuất vượt tồn, kiểm tra trùng hóa đơn…) |
| **Tổ chức – Nhân viên** | Bộ phận/phòng ban (cây), chức danh, vị trí làm việc, nhân viên (kèm SĐT/email dùng cho báo giá) |
| **Danh mục dùng chung** | Đơn vị tính + chuyển đổi ĐVT, tiền tệ & tỷ giá, quốc gia/tỉnh/quận, phương thức thanh toán (kèm số ngày), phương thức giao hàng, loại chi phí, quy trình gia công |
| **Hàng hóa – Dịch vụ** | Phân nhóm hàng (cây), danh mục hàng hóa, quy cách, hàng **BỘ** (BOM bán hàng: 1 bộ = n thành phần), tỷ trọng tính giá, barcode/QR |
| **Đối tác** | Khách hàng (nhóm, nguồn, xếp hạng, hạn mức công nợ–số ngày, NV phụ trách, cờ *là NCC*), Nhà cung cấp (cờ *là KH*), người liên hệ, địa chỉ giao dịch, TK ngân hàng, **chi phí bán hàng mặc định theo KH** (hoa hồng…) |
| **Workflow & Audit** | Máy trạng thái chứng từ, lịch sử duyệt, audit log, đính kèm tài liệu, công việc – ghi chú – trao đổi |

### 3.2. SALES – Bán hàng & CRM

| Module | Chức năng |
|---|---|
| **Cơ hội (CRM)** | Danh sách cơ hội, chi tiết, chuyển cơ hội → đơn hàng |
| **Báo giá** | Lập báo giá (thông thường / công trình–nhà; hàng thông thường / dự toán); tab Chi phí, Tài liệu; **Tính giá** (toàn bộ / theo mã / cập nhật tỷ trọng / copy; thiết lập công thức tính theo nhóm hàng); trạng thái: Yêu cầu mới → Yêu cầu tính giá → Đang tính giá → Yêu cầu duyệt → Đã duyệt → (Chờ xác nhận đơn / Không thành công / Hủy / **Đơn hàng**), Từ chối báo giá kèm lý do |
| **Chính sách giá** | Bảng giá theo hiệu lực ngày, tự áp lên đơn hàng; chỉ tiêu bán hàng |
| **Khuyến mại – Chiết khấu** | Chương trình KM-CK (nhóm, hiệu lực, công ty hỗ trợ): hàng chiết khấu (tỷ lệ công ty/hãng), hàng tặng (mua X tặng Y, SL công ty/hãng tặng) |
| **Đơn hàng bán** | Tạo từ báo giá hoặc trực tiếp; hình thức Hàng thông thường / **Đơn hàng tặng**; vùng & kho bán hàng; tab Hàng hóa (xử lý hàng BỘ), Khấu trừ (áp KM-CK), Thanh toán (YC thanh toán tự sinh theo PTTT, thực tế thanh toán), Giao hàng (YC xuất kho, xuất nhiều lần), Chi phí (duyệt chi phí → đẩy PGC sang kế toán); trạng thái: Mới tạo → YC duyệt → Đã duyệt → Chưa xuất hàng → Đã xuất kho → Hoàn tất / Hủy; **Xử lý lại đơn hàng** (hủy phiếu xuất + về Mới tạo, yêu cầu kế toán xóa phiếu trước) |
| **Giảm giá hàng bán** | Lập từ đơn hàng; hình thức Giảm trừ công nợ / Trả lại tiền mặt; duyệt; sinh chứng từ giảm giá bên kế toán |
| **Hàng bán bị trả lại** | Phiếu nhập kho hình thức *Nhập hàng khách trả* tham chiếu đơn hàng; đổi hàng → lập báo giá mới |
| **Nhật ký bán hàng** | Log mọi thao tác trên chứng từ bán |

### 3.3. PURCHASING – Mua hàng

| Module | Chức năng |
|---|---|
| **Yêu cầu mua hàng** | Đề nghị mua nội bộ → gom thành đơn hàng mua |
| **Đơn hàng mua** | Hình thức **Hàng thông thường / Dịch vụ / Gia công**; tab Hàng hóa, Chi phí (loại chi phí, NCC dịch vụ, gắn **Số phiếu nhập** để phân bổ), Thanh toán, Nhận hàng; duyệt; **Tập hợp chi phí dịch vụ** (gom chi phí gia công từ các phiếu nhập thành đơn hàng dịch vụ) |
| **Gia công** | Chuỗi: ĐH mua gia công → nhập kho gia công → tự sinh **Xuất cho SX-DV** (chọn Quy trình: Gia công xi / Nhúng nóng / Taro tán; đơn vị BỘ PHẬN GIA CÔNG) → tự sinh **Nhập SP-TP** (thành phẩm, kèm chi phí gia công theo mã hàng) → đối tượng tính giá thành theo quy trình |
| **Thanh toán NCC** | Đề nghị thanh toán theo đơn hàng (nhiều đợt), thực tế thanh toán, **Duyệt thanh toán** → đẩy LERP-YCC sang kế toán |
| **Trả hàng NCC** | Phiếu xuất trả hàng → LERP-Trả hàng NCC |
| **Nhật ký mua hàng** | Log thao tác |

### 3.4. INVENTORY – Kho vận

| Module | Chức năng |
|---|---|
| **Nhập kho** | Hình thức: Nhập mua, Nhập hàng khách trả, Nhập SP-TP (gia công), Nhập khác / **Nhập điều chỉnh mã**; luồng: Mới tạo → YC nhập → Xác nhận (SL thực nhập, ngày hết hạn, **mã lô**) → Hoàn tất; tab **Chi phí nhập kho** (chi phí gia công, duyệt chi phí → PGC) |
| **Xuất kho** | Hình thức: Xuất bán, Xuất cho SX-DV, Xuất trả NCC, Xuất khác / **Xuất điều chỉnh mã**; luồng: YC xuất → Xác nhận (chọn lô, SL thực xuất) → Hoàn tất; in **Lệnh soạn hàng**, Phiếu xuất kho; tab **Đóng gói – Soạn hàng** (số con/bao, số bao, người thực hiện, hoàn thành, xử lý lại); tab **Kế hoạch giao hàng**; xuất nhiều lần, xuất hàng BỘ theo cấu trúc bộ |
| **Chuyển kho** | Phiếu chuyển kho: Mới tạo → Xác nhận → Hoàn tất; sinh LERP-Phiếu điều chuyển |
| **Tồn kho & Lô** | Tồn theo kho/lô/vị trí; thẻ kho; nhật ký kho; vị trí lưu kho & sắp xếp |
| **Điều chỉnh mã hàng** | Cặp phiếu Xuất điều chỉnh mã ↔ Nhập điều chỉnh mã (chuyển mã A → B cùng ĐVT) |
| **Barcode / QR** | Quản lý in & quét mã |

### 3.5. INTEGRATION – Cầu nối LERP (SCRM → FACM)

Mỗi chứng từ nguồn khi hoàn tất/duyệt phát sinh bản ghi LERP chờ kế toán xử lý:

| Phiếu LERP | Chứng từ nguồn | Phiếu kế toán đích |
|---|---|---|
| LERP-Phiếu xuất / Bán hàng | Phiếu xuất kho bán | Hóa đơn bán hàng (Phải thu) |
| LERP-Hàng trả lại | Nhập hàng khách trả | Hàng bán trả lại |
| LERP-Phiếu nhập / Mua hàng | Phiếu nhập kho mua | Phiếu mua hàng — có / chưa có hóa đơn (Phải trả) |
| LERP-Trả hàng NCC | Xuất trả NCC | Trả hàng NCC |
| LERP-YCC | Duyệt thanh toán mua hàng | Yêu cầu chi → Phiếu chi |
| LERP-YCT | Yêu cầu thu tiền bán hàng | Yêu cầu thu → Phiếu thu |
| LERP-Xuất kho / Nhập kho | Phiếu xuất/nhập khác | Phiếu xuất kho (2) / Phiếu nhập kho |
| LERP-Chuyển kho | Phiếu chuyển kho | Phiếu điều chuyển |
| PGC (chi phí) | Duyệt chi phí bán hàng / mua hàng / nhập kho gia công | Phiếu ghi Có → phân bổ vào giá vốn |

Cơ chế: **transactional outbox** trong PostgreSQL — chứng từ nguồn và event ghi cùng transaction; worker chuyển thành phiếu LERP (idempotent, có trạng thái Chưa tạo phiếu / Đã tạo phiếu / Đã ghi sổ). Hủy chứng từ nguồn khi đã có phiếu kế toán → bắt buộc kế toán xóa phiếu trước (ràng buộc nghiệp vụ).

### 3.6. FINANCE – Kế toán (FACM)

| Module | Chức năng |
|---|---|
| **Hệ thống tài khoản** | Cây TK theo chế độ kế toán (TT133/QĐ48/TT200); thuộc tính: loại TK, **chi tiết PS theo đối tượng** (1 danh mục đối tượng/TK), **chi tiết số dư** (đối tượng / ngoại tệ / số lượng-kho, kết hợp), kiểu số dư (Nợ/Có/bên lớn/2 bên/không theo dõi); danh mục đối tượng quản lý mở rộng được |
| **Kỳ kế toán & Số dư** | Kỳ làm việc, mở/khóa sổ kỳ; số dư đầu kỳ (theo TK, đối tượng, ngoại tệ, kho–số lượng); chính sách kế toán; phần hành kế toán cấu hình được |
| **Nghiệp vụ & Định khoản** | Danh mục **Nghiệp vụ** (mẫu bút toán định nghĩa sẵn Nợ/Có); chứng từ kế toán ghi sổ trực tiếp; phiếu Tool nghiệp vụ; luồng: Tạo → Duyệt → **Ghi sổ** → (Mở khóa để sửa) |
| **Tiền & Quỹ** | Quỹ tiền mặt/ngân hàng; Phiếu chuyển tiền nội bộ (kèm phí NH); Yêu cầu chi (loại: trả NCC & chi khác / hóa đơn chi phí có kê khai thuế) → lấy số PC → Ghi sổ; Yêu cầu thu / phiếu thu; kiểm soát ngân sách thu chi (tùy chọn) |
| **Phải thu** | Phiếu bán hàng, Hàng bán trả lại, Phiếu ghi Nợ; chứng từ giảm giá hàng bán; công nợ KH theo hạn mức/tuổi nợ |
| **Phải trả** | Phiếu mua hàng (2), Trả hàng NCC, **Phiếu ghi Có (PGC)** — nhận chi phí từ SCRM, ghi tăng TSCĐ/CCDC/CPTT (hình thức Phải trả 3311); phân bổ chi phí mua hàng vào giá vốn phiếu nhập |
| **Kho (kế toán)** | Phiếu xuất kho (2), nhập kho, điều chuyển; kiểm tra nhập-xuất-tồn; **tính lại giá xuất kho** (bình quân…) |
| **TSCĐ / CCDC / CPPB** | Danh mục TSCĐ-CCDC, thẻ tài sản, biên bản (tăng/giảm, 4 PP khấu hao: đường thẳng, số dư giảm dần, theo sản lượng, hao mòn); thiết lập **bút toán phân bổ** (TK + đối tượng + hệ số, tỷ lệ = hệ số/tổng hệ số); thẻ CPPB phân bổ theo thời gian/sản lượng; chạy khấu hao/phân bổ cuối kỳ + kiểm tra |
| **Giá thành gia công** | Đối tượng tính giá thành theo **quy trình** (xi, nhúng nóng, taro tán); tập hợp chi phí theo quy trình, tính giá thành SP-TP |
| **Thuế & Hóa đơn** | Kê khai hóa đơn mua vào/bán ra, khấu trừ GTGT (mẫu chứng từ, bút toán tự động), tờ khai TNDN tạm tính & quyết toán; kiểm tra trùng hóa đơn |
| **Cuối kỳ & Tổng hợp** | Lãi/lỗ chênh lệch tỷ giá; phân bổ chi phí mua hàng cho hàng tiêu thụ; bút toán kết chuyển; chuyển số dư kỳ sau; khóa sổ |
| **Sổ sách – Báo cáo** | Sổ kế toán (sổ cái, sổ chi tiết theo đối tượng), bảng cân đối TK, BCTC, báo cáo quản trị, báo cáo nhanh & đồ thị; in chứng từ |

### 3.7. REPORTING & Tiện ích

Báo cáo nhanh, báo cáo tổng hợp, dashboard/đồ thị; tìm kiếm & trích lọc; import/export Excel; kiểm tra & xác nhận dữ liệu.

---

## 4. Luồng nghiệp vụ chính (end-to-end)

### 4.1. Bán hàng (Quote-to-Cash)

```
Cơ hội → Báo giá (tính giá, duyệt) → Đơn hàng bán (duyệt)
   → YC xuất kho → Xác nhận (lô, SL thực) → Hoàn tất xuất kho
   → LERP-Phiếu xuất → Hóa đơn bán hàng → Ghi sổ (DT, giá vốn, 131)
   → YC thanh toán → LERP-YCT → Phiếu thu → Ghi sổ
   (song song: Duyệt chi phí bán hàng → PGC → Ghi sổ chi phí hoa hồng…)
```

### 4.2. Mua hàng (Procure-to-Pay)

```
YC mua hàng → Đơn hàng mua (duyệt) → YC nhập kho → Xác nhận → Hoàn tất
   → LERP-Phiếu nhập → Phiếu mua hàng (có/chưa hóa đơn) → Ghi sổ (156, 331, 1331)
   → Đề nghị thanh toán → Duyệt → LERP-YCC → YC chi → Phiếu chi → Ghi sổ
   (chi phí mua hàng gắn Số phiếu nhập → PGC → phân bổ vào giá vốn)
```

### 4.3. Gia công

```
ĐH mua gia công → Nhập kho gia công (NVL) → Xuất cho SX-DV (chọn QUY TRÌNH)
   → Nhập SP-TP (thành phẩm + chi phí gia công theo mã hàng)
   → Duyệt chi phí → PGC → tập hợp giá thành theo quy trình
   → Tập hợp chi phí gia công → ĐH mua dịch vụ → ĐNTT → LERP-YCC → chi tiền
```

### 4.4. Đồng bộ & toàn vẹn SCRM ↔ FRM

- Mọi sửa/hủy chứng từ nguồn đã sang kế toán phải qua quy trình: kế toán xóa phiếu → SCRM "Xử lý lại" → sửa/hủy.
- Hủy đơn hàng từ báo giá → báo giá tự chuyển *Không thành công*.
- Bút toán ghi sổ là **immutable**; sửa = Mở khóa (phân quyền) + ghi sổ lại + audit.

---

## 5. Thiết kế kỹ thuật

### 5.1. Cấu trúc mã nguồn (2 repo riêng)

```
erp-backend/                          erp-frontend/
├── ErpBackend.sln                    ├── src/
├── src/Erp.Api/                      │   ├── api/        # client sinh từ OpenAPI
│   ├── Program.cs                    │   ├── components/ # DataGrid, Form, Lookup,
│   ├── appsettings.json              │   │               # WorkflowBar, PrintPreview
│   ├── Core/      # Jwt, Rbac,       │   ├── features/
│   │              # Numbering,       │   │   ├── sales/      # báo giá, đơn bán...
│   │              # Workflow         │   │   ├── purchasing/
│   ├── Data/      # ErpDbContext     │   │   ├── inventory/
│   ├── Entities/  # map data_model   │   │   ├── finance/
│   ├── Dtos/                         │   │   └── admin/      # user, phân quyền
│   ├── Controllers/                  │   ├── stores/     # Zustand
│   │   # Auth, MasterData, Sales,    │   ├── routes/
│   │   # Purchasing, Inventory,      │   └── i18n/
│   │   # Finance (theo module)       ├── public/
│   └── Jobs/      # Hangfire jobs    └── vite.config.ts
└── tests/Erp.Tests/
```

Mỗi module BE gồm: `Controller` (API) → `Service` (nghiệp vụ) → `ErpDbContext`/EF (dữ liệu) → `Dto` (request/response). FE chỉ gọi API, không truy cập DB.

### 5.2. Quy ước chung cho chứng từ

- Mọi chứng từ: `doc_no` (sinh theo mẫu cấu hình), `doc_date`, `status`, `created_by/at`, `approved_by/at`, header–lines.
- Trạng thái & chuyển trạng thái qua **workflow engine** chung (bảng `wf_transition_log`).
- Số lượng/Tiền: `NUMERIC(18,4)` / `NUMERIC(18,2)`; đa tiền tệ: lưu nguyên tệ + quy đổi + tỷ giá.
- Soft-delete + audit log; chứng từ đã ghi sổ không xóa vật lý.

### 5.3. Bảo mật & phân quyền

- RBAC: user ∈ nhiều nhóm; quyền gán cho user/nhóm trên 5 đối tượng (chức năng, danh mục, chứng từ, nghiệp vụ, báo cáo) × hành động (xem/thêm/sửa/xóa/duyệt/ghi sổ/mở khóa).
- Row-level theo cơ cấu tổ chức (sale chỉ thấy KH mình phụ trách / bộ phận mình).
- JWT access + refresh; mật khẩu bcrypt; audit đăng nhập.

### 5.4. Hiệu năng & vận hành

- Tồn kho realtime: bảng `stock_balance` cập nhật theo ledger `stock_move` (trigger/application-level), partition `gl_entry` & `stock_move` theo kỳ.
- Báo cáo nặng chạy worker + materialized view.
- Backup PITR (WAL), môi trường dev/staging/prod, CI chạy `dotnet test` + kiểm tra migration script.

---

## 6. Triển khai (Deployment)

```
                    ┌──────────────┐
   Users ── HTTPS ──▶  Nginx / LB  │
                    └──┬────────┬──┘
            static FE  │        │  /api, /ws
        ┌──────────────▼─┐   ┌──▼──────────────────┐
        │ erp-frontend    │   │ erp-backend          │
        │ (static build)  │   │ Kestrel × N replicas │
        └─────────────────┘   └──┬───────────┬───────┘
                                 │           │
                       ┌─────────▼──┐   ┌────▼─────┐   ┌────────────┐
                       │ PostgreSQL │   │  Redis   │◀──│ Hangfire   │
                       │ 16 (g_erp) │   └──────────┘   │ workers/beat│
                       └────────────┘                  └────────────┘
```

- Docker Compose (giai đoạn đầu) → Kubernetes khi cần scale; FE build static phục vụ qua Nginx/CDN, BE stateless scale ngang.
- Cấu hình qua biến môi trường (12-factor): `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `CORS_ORIGINS`.
- CI/CD: build + `dotnet test` + áp migration script theo môi trường dev/staging/prod; backup PostgreSQL PITR.
- Vì FE/BE tách rời, có thể deploy thêm client khác sau này (mobile, máy quét kho, tích hợp bên thứ ba) dùng chung REST API.

## 7. Tài liệu liên quan

- Thiết kế API: [`api_design.md`](./api_design.md)
- Data model: [`data_model.md`](./data_model.md) · DDL: [`data_model.sql`](./data_model.sql) (đã chạy trên DB `g_erp`)
