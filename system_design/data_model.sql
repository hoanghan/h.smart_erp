-- ============================================================
-- ERP DATA MODEL — PostgreSQL 16
-- Schemas: core, sales, purchasing, inventory, finance
-- Đi kèm: system_design.md, data_model.md
-- ============================================================

CREATE SCHEMA IF NOT EXISTS core;
CREATE SCHEMA IF NOT EXISTS sales;
CREATE SCHEMA IF NOT EXISTS purchasing;
CREATE SCHEMA IF NOT EXISTS inventory;
CREATE SCHEMA IF NOT EXISTS finance;

-- ============================================================
-- 0. AUDIT COLUMNS (lặp lại trong từng bảng):
--    created_by BIGINT, created_at timestamptz DEFAULT now(),
--    updated_by BIGINT, updated_at timestamptz
-- ============================================================

-- ============================================================
-- 1. CORE — Tổ chức, người dùng, danh mục
-- ============================================================

CREATE TABLE core.department (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code        TEXT NOT NULL UNIQUE,
    name        TEXT NOT NULL,
    parent_id   BIGINT REFERENCES core.department(id),
    is_active   BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE core.job_title (
    id   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL
);

CREATE TABLE core.work_position (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code          TEXT NOT NULL UNIQUE,
    name          TEXT NOT NULL,
    department_id BIGINT REFERENCES core.department(id),
    job_title_id  BIGINT REFERENCES core.job_title(id)
);

CREATE TABLE core.employee (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code          TEXT NOT NULL UNIQUE,
    full_name     TEXT NOT NULL,
    department_id BIGINT REFERENCES core.department(id),
    position_id   BIGINT REFERENCES core.work_position(id),
    phone         TEXT,
    email         TEXT,
    base_salary   NUMERIC(18,2),
    insurance_no  TEXT,
    is_active     BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE core.app_user (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    username      TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    employee_id   BIGINT REFERENCES core.employee(id),
    is_admin      BOOLEAN NOT NULL DEFAULT FALSE,
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE core.user_group (
    id   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL
);

CREATE TABLE core.user_group_member (
    group_id BIGINT NOT NULL REFERENCES core.user_group(id) ON DELETE CASCADE,
    user_id  BIGINT NOT NULL REFERENCES core.app_user(id) ON DELETE CASCADE,
    PRIMARY KEY (group_id, user_id)
);

-- Phân quyền: Chức năng / Danh mục / Chứng từ / Nghiệp vụ / Báo cáo
CREATE TABLE core.permission (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    grantee_type TEXT NOT NULL CHECK (grantee_type IN ('USER','GROUP')),
    grantee_id   BIGINT NOT NULL,
    subject_type TEXT NOT NULL CHECK (subject_type IN ('FUNCTION','CATALOG','DOCUMENT','OPERATION','REPORT')),
    subject_code TEXT NOT NULL,
    action       TEXT NOT NULL CHECK (action IN ('VIEW','CREATE','UPDATE','DELETE','APPROVE','POST','UNLOCK')),
    UNIQUE (grantee_type, grantee_id, subject_type, subject_code, action)
);

-- Phân quyền dữ liệu theo cơ cấu tổ chức
CREATE TABLE core.data_scope (
    user_id       BIGINT NOT NULL REFERENCES core.app_user(id) ON DELETE CASCADE,
    department_id BIGINT NOT NULL REFERENCES core.department(id),
    PRIMARY KEY (user_id, department_id)
);

CREATE TABLE core.approval_right (
    id       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id  BIGINT NOT NULL REFERENCES core.app_user(id),
    doc_type TEXT NOT NULL,          -- QUOTATION, SALES_ORDER, PURCHASE_ORDER, PAYMENT, COST, ...
    UNIQUE (user_id, doc_type)
);

-- Thiết lập hệ thống
CREATE TABLE core.company_info (
    id              BIGINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    full_name       TEXT NOT NULL,
    foreign_name    TEXT,
    trading_name    TEXT,
    tax_code        TEXT,
    phone           TEXT, fax TEXT, email TEXT, website TEXT,
    business_field  TEXT,
    address         TEXT, district TEXT, province TEXT,
    legal_rep       TEXT,            -- người đại diện
    chief_accountant TEXT,
    cashier         TEXT,            -- thủ quỹ
    logo            BYTEA
);

-- Mẫu đánh số chứng từ, vd 'PT-{MM}{####}'
CREATE TABLE core.doc_numbering (
    id        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    doc_type  TEXT NOT NULL UNIQUE,
    pattern   TEXT NOT NULL,
    last_seq  BIGINT NOT NULL DEFAULT 0,
    reset_by  TEXT NOT NULL DEFAULT 'MONTH' CHECK (reset_by IN ('NONE','MONTH','YEAR'))
);

-- Danh mục chung
CREATE TABLE core.uom (
    id   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL
);

CREATE TABLE core.uom_conversion (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    from_uom_id BIGINT NOT NULL REFERENCES core.uom(id),
    to_uom_id   BIGINT NOT NULL REFERENCES core.uom(id),
    factor      NUMERIC(18,6) NOT NULL,
    UNIQUE (from_uom_id, to_uom_id)
);

CREATE TABLE core.currency (
    code TEXT PRIMARY KEY,            -- VND, USD...
    name TEXT NOT NULL
);

CREATE TABLE core.exchange_rate (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    currency_code TEXT NOT NULL REFERENCES core.currency(code),
    rate_date     DATE NOT NULL,
    rate          NUMERIC(18,4) NOT NULL,
    UNIQUE (currency_code, rate_date)
);

CREATE TABLE core.payment_method (
    id       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code     TEXT NOT NULL UNIQUE,
    name     TEXT NOT NULL,           -- tiền mặt, chuyển khoản...
    due_days INT  NOT NULL DEFAULT 0  -- số ngày để tự sinh YC thanh toán
);

CREATE TABLE core.delivery_method (
    id   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL
);

CREATE TABLE core.cost_type (
    id        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code      TEXT NOT NULL UNIQUE,
    name      TEXT NOT NULL,          -- vận chuyển ĐH mua, hoa hồng, gia công xi...
    scope     TEXT NOT NULL CHECK (scope IN ('SALES','PURCHASE','RECEIPT','OUTSOURCING')),
    account_code TEXT                 -- TK hạch toán mặc định
);

-- Quy trình gia công
CREATE TABLE core.process (
    id   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,        -- XI, NHUNG_NONG, TARO_TAN
    name TEXT NOT NULL
);

-- Hàng hóa
CREATE TABLE core.product_group (
    id        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code      TEXT NOT NULL UNIQUE,
    name      TEXT NOT NULL,
    parent_id BIGINT REFERENCES core.product_group(id)
);

CREATE TABLE core.product (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code         TEXT NOT NULL UNIQUE,
    name         TEXT NOT NULL,
    product_type TEXT NOT NULL DEFAULT 'GOODS'
                 CHECK (product_type IN ('GOODS','SERVICE','FINISHED','MATERIAL','TOOL')),
    group_id     BIGINT REFERENCES core.product_group(id),
    uom_id       BIGINT NOT NULL REFERENCES core.uom(id),
    is_kit       BOOLEAN NOT NULL DEFAULT FALSE,   -- hàng BỘ
    price_weight NUMERIC(9,4),                      -- tỷ trọng tính giá
    barcode      TEXT,
    qr_code      TEXT,
    spec         TEXT,                              -- quy cách
    min_stock    NUMERIC(18,4),
    is_active    BOOLEAN NOT NULL DEFAULT TRUE
);

-- Cấu trúc hàng BỘ: 1 bộ = n thành phần
CREATE TABLE core.product_bom (
    id                   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    kit_product_id       BIGINT NOT NULL REFERENCES core.product(id),
    component_product_id BIGINT NOT NULL REFERENCES core.product(id),
    quantity             NUMERIC(18,4) NOT NULL,
    UNIQUE (kit_product_id, component_product_id)
);

-- Đối tác: khách hàng + nhà cung cấp (2 cờ)
CREATE TABLE core.partner (
    id                 BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code               TEXT NOT NULL UNIQUE,
    tax_code           TEXT,
    short_name         TEXT NOT NULL,
    full_name          TEXT,
    is_customer        BOOLEAN NOT NULL DEFAULT FALSE,
    is_supplier        BOOLEAN NOT NULL DEFAULT FALSE,
    customer_group     TEXT,
    source             TEXT,            -- nguồn
    ranking            TEXT,            -- xếp hạng
    country            TEXT, province TEXT, district TEXT,
    address            TEXT,
    phone              TEXT, hotline TEXT, fax TEXT, email TEXT, website TEXT,
    payment_method_id  BIGINT REFERENCES core.payment_method(id),
    delivery_method_id BIGINT REFERENCES core.delivery_method(id),
    salesperson_id     BIGINT REFERENCES core.employee(id),  -- NV phụ trách
    credit_limit       NUMERIC(18,2),   -- hạn mức
    credit_days        INT,             -- số ngày công nợ
    is_active          BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE core.partner_contact (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    partner_id BIGINT NOT NULL REFERENCES core.partner(id) ON DELETE CASCADE,
    name       TEXT NOT NULL,
    title      TEXT, phone TEXT, email TEXT, note TEXT
);

CREATE TABLE core.partner_address (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    partner_id BIGINT NOT NULL REFERENCES core.partner(id) ON DELETE CASCADE,
    address    TEXT NOT NULL,
    addr_type  TEXT NOT NULL DEFAULT 'DELIVERY' CHECK (addr_type IN ('DELIVERY','BILLING','OTHER'))
);

CREATE TABLE core.partner_bank_account (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    partner_id BIGINT NOT NULL REFERENCES core.partner(id) ON DELETE CASCADE,
    bank_name  TEXT NOT NULL,
    account_no TEXT NOT NULL,
    holder     TEXT, branch TEXT
);

-- Chi phí bán hàng mặc định theo khách hàng (hoa hồng...)
CREATE TABLE core.partner_sales_cost (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    partner_id    BIGINT NOT NULL REFERENCES core.partner(id) ON DELETE CASCADE,
    cost_type_id  BIGINT NOT NULL REFERENCES core.cost_type(id),
    payee_id      BIGINT NOT NULL REFERENCES core.partner(id), -- đối tượng nhận (NCC)
    rate_pct      NUMERIC(9,4),
    vat_pct       NUMERIC(5,2)
);

-- Kho & vị trí
CREATE TABLE core.warehouse (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code           TEXT NOT NULL UNIQUE,
    name           TEXT NOT NULL,
    is_outsourcing BOOLEAN NOT NULL DEFAULT FALSE,  -- kho gia công
    is_active      BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE core.warehouse_location (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    warehouse_id BIGINT NOT NULL REFERENCES core.warehouse(id) ON DELETE CASCADE,
    code         TEXT NOT NULL,
    name         TEXT,
    UNIQUE (warehouse_id, code)
);

-- Đính kèm, công việc, ghi chú (đa chứng từ)
CREATE TABLE core.attachment (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ref_table  TEXT NOT NULL,
    ref_id     BIGINT NOT NULL,
    file_name  TEXT NOT NULL,
    file_path  TEXT NOT NULL,
    uploaded_by BIGINT REFERENCES core.app_user(id),
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_attachment_ref ON core.attachment(ref_table, ref_id);

CREATE TABLE core.task (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ref_table   TEXT, ref_id BIGINT,
    title       TEXT NOT NULL,
    content     TEXT,
    assignee_id BIGINT REFERENCES core.employee(id),
    due_date    DATE,
    status      TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','DOING','DONE','CANCELLED'))
);

CREATE TABLE core.note (
    id        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ref_table TEXT NOT NULL, ref_id BIGINT NOT NULL,
    content   TEXT NOT NULL,
    created_by BIGINT REFERENCES core.app_user(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Workflow log + audit
CREATE TABLE core.wf_transition_log (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ref_table   TEXT NOT NULL, ref_id BIGINT NOT NULL,
    from_status TEXT, to_status TEXT NOT NULL,
    reason      TEXT,                  -- lý do (từ chối báo giá, hủy...)
    acted_by    BIGINT REFERENCES core.app_user(id),
    acted_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_wf_log_ref ON core.wf_transition_log(ref_table, ref_id);

CREATE TABLE core.audit_log (
    id        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ref_table TEXT NOT NULL, ref_id BIGINT,
    action    TEXT NOT NULL,
    detail    JSONB,
    acted_by  BIGINT REFERENCES core.app_user(id),
    acted_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 2. SALES — CRM, Báo giá, Đơn hàng bán
-- ============================================================

CREATE TABLE sales.opportunity (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code           TEXT NOT NULL UNIQUE,
    name           TEXT NOT NULL,
    partner_id     BIGINT REFERENCES core.partner(id),
    expected_value NUMERIC(18,2),
    stage          TEXT NOT NULL DEFAULT 'NEW',
    salesperson_id BIGINT REFERENCES core.employee(id),
    sales_order_id BIGINT,             -- gán khi chuyển thành đơn
    note           TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE sales.price_list (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code       TEXT NOT NULL UNIQUE,
    name       TEXT NOT NULL,           -- hình thức áp giá
    valid_from DATE NOT NULL,
    valid_to   DATE,
    is_active  BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE sales.price_list_item (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    price_list_id BIGINT NOT NULL REFERENCES sales.price_list(id) ON DELETE CASCADE,
    product_id    BIGINT NOT NULL REFERENCES core.product(id),
    price         NUMERIC(18,2) NOT NULL,
    UNIQUE (price_list_id, product_id)
);

CREATE TABLE sales.promotion (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code         TEXT NOT NULL UNIQUE,
    name         TEXT NOT NULL,
    group_name   TEXT,
    date_from    DATE NOT NULL,
    date_to      DATE,
    sponsor      TEXT,                  -- công ty hỗ trợ
    discount_pct NUMERIC(9,4),
    has_gift     BOOLEAN NOT NULL DEFAULT FALSE,
    note         TEXT
);

CREATE TABLE sales.promotion_discount_item (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    promotion_id  BIGINT NOT NULL REFERENCES sales.promotion(id) ON DELETE CASCADE,
    product_id    BIGINT NOT NULL REFERENCES core.product(id),
    total_pct     NUMERIC(9,4) NOT NULL,  -- tổng tỷ lệ CK
    company_pct   NUMERIC(9,4),           -- tỷ lệ CK công ty
    vendor_pct    NUMERIC(9,4)            -- tỷ lệ CK hãng
);

CREATE TABLE sales.promotion_gift_item (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    promotion_id    BIGINT NOT NULL REFERENCES sales.promotion(id) ON DELETE CASCADE,
    buy_product_id  BIGINT NOT NULL REFERENCES core.product(id),
    gift_product_id BIGINT NOT NULL REFERENCES core.product(id),
    required_qty    NUMERIC(18,4) NOT NULL, -- SL yêu cầu mua
    total_gift_qty  NUMERIC(18,4) NOT NULL,
    company_gift_qty NUMERIC(18,4),
    vendor_gift_qty NUMERIC(18,4)
);

CREATE TABLE sales.sales_target (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    employee_id BIGINT NOT NULL REFERENCES core.employee(id),
    period      TEXT NOT NULL,           -- '2026-06'
    target_amount NUMERIC(18,2) NOT NULL,
    UNIQUE (employee_id, period)
);

-- Công thức tính giá báo giá (mặc định theo nhóm/mã hàng)
CREATE TABLE sales.pricing_formula (
    id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    product_group_id BIGINT REFERENCES core.product_group(id),
    product_id       BIGINT REFERENCES core.product(id),
    formula          JSONB NOT NULL,     -- tham số: hệ số, tỷ trọng...
    CHECK (product_group_id IS NOT NULL OR product_id IS NOT NULL)
);

CREATE TABLE sales.quotation (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    doc_no          TEXT NOT NULL UNIQUE,  -- số YCBG
    doc_date        DATE NOT NULL DEFAULT CURRENT_DATE,
    requester_id    BIGINT REFERENCES core.employee(id),  -- người Y/C báo giá
    requester_dept_id BIGINT REFERENCES core.department(id),
    creator_id      BIGINT REFERENCES core.app_user(id),
    approver_id     BIGINT REFERENCES core.app_user(id),
    approved_at     TIMESTAMPTZ,
    partner_id      BIGINT NOT NULL REFERENCES core.partner(id),
    contact_id      BIGINT REFERENCES core.partner_contact(id),
    delivery_addr_id BIGINT REFERENCES core.partner_address(id),
    quote_type      TEXT NOT NULL DEFAULT 'NORMAL' CHECK (quote_type IN ('NORMAL','PROJECT')),     -- thông thường / công trình-nhà
    quote_form      TEXT NOT NULL DEFAULT 'NORMAL' CHECK (quote_form IN ('NORMAL','ESTIMATE')),    -- hàng thường / dự toán
    request_delivery_date DATE,
    validity_days   INT DEFAULT 2,        -- thời hạn báo giá
    delivery_lead   TEXT,                 -- giao hàng từ 3-5 ngày
    payment_method_id  BIGINT REFERENCES core.payment_method(id),
    delivery_method_id BIGINT REFERENCES core.delivery_method(id),
    bank_account    TEXT,                 -- TK thanh toán
    attached_service TEXT,
    note            TEXT,
    status          TEXT NOT NULL DEFAULT 'NEW' CHECK (status IN
        ('NEW','PRICE_REQUESTED','PRICING','APPROVAL_REQUESTED','APPROVED',
         'ORDER_PENDING','FAILED','CANCELLED','ORDERED','REJECTED')),
    status_reason   TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE sales.quotation_line (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    quotation_id  BIGINT NOT NULL REFERENCES sales.quotation(id) ON DELETE CASCADE,
    product_id    BIGINT NOT NULL REFERENCES core.product(id),
    project_house TEXT,                  -- dự án – nhà (loại PROJECT)
    quantity      NUMERIC(18,4) NOT NULL,
    vat_pct       NUMERIC(5,2) DEFAULT 10,
    calc_price    NUMERIC(18,2),         -- giá tính
    approved_price NUMERIC(18,2),        -- giá duyệt
    price_weight  NUMERIC(9,4),          -- tỷ trọng
    note          TEXT
);

CREATE TABLE sales.quotation_cost (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    quotation_id BIGINT NOT NULL REFERENCES sales.quotation(id) ON DELETE CASCADE,
    cost_type_id BIGINT NOT NULL REFERENCES core.cost_type(id),
    payee_id     BIGINT REFERENCES core.partner(id),
    rate_pct     NUMERIC(9,4),
    amount       NUMERIC(18,2),
    vat_pct      NUMERIC(5,2)
);

CREATE TABLE sales.sales_order (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    doc_no          TEXT NOT NULL UNIQUE,
    doc_date        DATE NOT NULL DEFAULT CURRENT_DATE,
    quotation_id    BIGINT UNIQUE REFERENCES sales.quotation(id),
    partner_id      BIGINT NOT NULL REFERENCES core.partner(id),
    order_form      TEXT NOT NULL DEFAULT 'NORMAL' CHECK (order_form IN ('NORMAL','GIFT')),  -- đơn hàng tặng
    sales_channel   TEXT,
    sales_region    TEXT,                -- vùng bán hàng
    warehouse_id    BIGINT REFERENCES core.warehouse(id),  -- kho bán hàng
    delivery_date_plan DATE,             -- ngày giao (KH)
    payment_method_id  BIGINT REFERENCES core.payment_method(id),
    delivery_method_id BIGINT REFERENCES core.delivery_method(id),
    delivery_addr_id BIGINT REFERENCES core.partner_address(id),
    salesperson_id  BIGINT REFERENCES core.employee(id),
    approver_id     BIGINT REFERENCES core.app_user(id),
    approved_at     TIMESTAMPTZ,
    total_amount    NUMERIC(18,2),
    total_vat       NUMERIC(18,2),
    note            TEXT,
    status          TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN
        ('DRAFT','APPROVAL_REQUESTED','APPROVED','NOT_DELIVERED','DELIVERED','COMPLETED','CANCELLED')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE sales.sales_order_line (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id       BIGINT NOT NULL REFERENCES sales.sales_order(id) ON DELETE CASCADE,
    product_id     BIGINT NOT NULL REFERENCES core.product(id),
    quantity       NUMERIC(18,4) NOT NULL,
    kit_qty        NUMERIC(18,4),        -- số lượng bộ
    unit_price     NUMERIC(18,2) NOT NULL DEFAULT 0,
    list_price     NUMERIC(18,2),        -- giá quy định từ bảng giá
    vat_pct        NUMERIC(5,2) DEFAULT 10,
    amount         NUMERIC(18,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    is_gift        BOOLEAN NOT NULL DEFAULT FALSE,  -- dòng hàng khuyến mại
    note           TEXT
);

CREATE TABLE sales.so_promotion (
    order_id     BIGINT NOT NULL REFERENCES sales.sales_order(id) ON DELETE CASCADE,
    promotion_id BIGINT NOT NULL REFERENCES sales.promotion(id),
    PRIMARY KEY (order_id, promotion_id)
);

CREATE TABLE sales.so_payment_request (
    id        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id  BIGINT NOT NULL REFERENCES sales.sales_order(id) ON DELETE CASCADE,
    due_date  DATE NOT NULL,
    amount    NUMERIC(18,2) NOT NULL,
    auto_generated BOOLEAN NOT NULL DEFAULT FALSE,   -- tự sinh theo PTTT
    status    TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','SENT_FRM','PAID','CANCELLED'))
);

CREATE TABLE sales.so_payment_actual (
    id        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id  BIGINT NOT NULL REFERENCES sales.sales_order(id) ON DELETE CASCADE,
    pay_date  DATE NOT NULL,
    amount    NUMERIC(18,2) NOT NULL,
    method_id BIGINT REFERENCES core.payment_method(id),
    note      TEXT
);

CREATE TABLE sales.so_cost (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id     BIGINT NOT NULL REFERENCES sales.sales_order(id) ON DELETE CASCADE,
    cost_type_id BIGINT NOT NULL REFERENCES core.cost_type(id),
    payee_id     BIGINT REFERENCES core.partner(id),
    rate_pct     NUMERIC(9,4),
    amount       NUMERIC(18,2),
    vat_pct      NUMERIC(5,2),
    due_date     DATE,
    note         TEXT,
    approved     BOOLEAN NOT NULL DEFAULT FALSE,     -- duyệt chi phí → PGC
    approved_by  BIGINT REFERENCES core.app_user(id),
    approved_at  TIMESTAMPTZ
);

-- Giảm giá hàng bán
CREATE TABLE sales.sales_allowance (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    doc_no      TEXT NOT NULL UNIQUE,
    doc_date    DATE NOT NULL DEFAULT CURRENT_DATE,
    order_id    BIGINT NOT NULL REFERENCES sales.sales_order(id),
    allow_form  TEXT NOT NULL CHECK (allow_form IN ('CREDIT_NOTE','CASH_REFUND')), -- giảm trừ công nợ / trả tiền mặt
    status      TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','APPROVED','POSTED','CANCELLED')),
    note        TEXT
);

CREATE TABLE sales.sales_allowance_line (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    allowance_id BIGINT NOT NULL REFERENCES sales.sales_allowance(id) ON DELETE CASCADE,
    product_id   BIGINT NOT NULL REFERENCES core.product(id),
    quantity     NUMERIC(18,4) NOT NULL,    -- SL giảm giá
    reduced_price NUMERIC(18,2) NOT NULL    -- đơn giá SAU giảm
);

-- ============================================================
-- 3. PURCHASING — Mua hàng, gia công, thanh toán NCC
-- ============================================================

CREATE TABLE purchasing.purchase_request (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    doc_no       TEXT NOT NULL UNIQUE,
    doc_date     DATE NOT NULL DEFAULT CURRENT_DATE,
    requester_id BIGINT REFERENCES core.employee(id),
    department_id BIGINT REFERENCES core.department(id),
    status       TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','APPROVED','ORDERED','CANCELLED')),
    note         TEXT
);

CREATE TABLE purchasing.purchase_request_line (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    request_id BIGINT NOT NULL REFERENCES purchasing.purchase_request(id) ON DELETE CASCADE,
    product_id BIGINT NOT NULL REFERENCES core.product(id),
    quantity   NUMERIC(18,4) NOT NULL,
    need_date  DATE,
    note       TEXT
);

CREATE TABLE purchasing.purchase_order (
    id                 BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    doc_no             TEXT NOT NULL UNIQUE,
    order_date         DATE NOT NULL DEFAULT CURRENT_DATE,
    receive_date_plan  DATE,                -- ngày nhận (KH)
    partner_id         BIGINT NOT NULL REFERENCES core.partner(id),
    order_form         TEXT NOT NULL DEFAULT 'NORMAL'
                       CHECK (order_form IN ('NORMAL','SERVICE','OUTSOURCING')),  -- thường/dịch vụ/gia công
    payment_method_id  BIGINT REFERENCES core.payment_method(id),
    delivery_method_id BIGINT REFERENCES core.delivery_method(id),
    receive_address    TEXT,
    vat_included       BOOLEAN NOT NULL DEFAULT TRUE,
    request_id         BIGINT REFERENCES purchasing.purchase_request(id),
    approver_id        BIGINT REFERENCES core.app_user(id),
    approved_at        TIMESTAMPTZ,
    total_amount       NUMERIC(18,2),
    total_vat          NUMERIC(18,2),
    note               TEXT,
    status             TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN
        ('DRAFT','APPROVED','NOT_RECEIVED','RECEIVED','COMPLETED','CANCELLED')),
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE purchasing.purchase_order_line (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id   BIGINT NOT NULL REFERENCES purchasing.purchase_order(id) ON DELETE CASCADE,
    product_id BIGINT NOT NULL REFERENCES core.product(id),
    quantity   NUMERIC(18,4) NOT NULL,
    unit_price NUMERIC(18,2) NOT NULL DEFAULT 0,
    vat_pct    NUMERIC(5,2) DEFAULT 10,
    amount     NUMERIC(18,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    note       TEXT
);

-- Chi phí đơn hàng mua (vận chuyển...) — phải gắn phiếu nhập để phân bổ
CREATE TABLE purchasing.po_cost (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id        BIGINT NOT NULL REFERENCES purchasing.purchase_order(id) ON DELETE CASCADE,
    receipt_doc_id  BIGINT,              -- FK inventory.stock_doc (số phiếu nhập) - thêm sau
    cost_type_id    BIGINT NOT NULL REFERENCES core.cost_type(id),
    service_supplier_id BIGINT REFERENCES core.partner(id),
    amount          NUMERIC(18,2) NOT NULL,
    vat_pct         NUMERIC(5,2),
    payment_method_id BIGINT REFERENCES core.payment_method(id),
    approved        BOOLEAN NOT NULL DEFAULT FALSE,
    approved_by     BIGINT REFERENCES core.app_user(id),
    approved_at     TIMESTAMPTZ
);

CREATE TABLE purchasing.po_payment_request (
    id        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id  BIGINT NOT NULL REFERENCES purchasing.purchase_order(id) ON DELETE CASCADE,
    due_date  DATE,
    amount    NUMERIC(18,2) NOT NULL,
    note      TEXT,
    status    TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','APPROVED','SENT_FRM','PAID','CANCELLED')),
    approved_by BIGINT REFERENCES core.app_user(id),
    approved_at TIMESTAMPTZ
);

CREATE TABLE purchasing.po_payment_actual (
    id       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id BIGINT NOT NULL REFERENCES purchasing.purchase_order(id) ON DELETE CASCADE,
    pay_date DATE NOT NULL,
    amount   NUMERIC(18,2) NOT NULL,
    method_id BIGINT REFERENCES core.payment_method(id),
    note     TEXT
);

-- Chi phí gia công theo mã hàng (gắn phiếu nhập SP-TP)
CREATE TABLE purchasing.outsourcing_cost (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    receipt_doc_id  BIGINT NOT NULL,     -- FK inventory.stock_doc - thêm sau
    product_id      BIGINT REFERENCES core.product(id),
    payee_id        BIGINT NOT NULL REFERENCES core.partner(id), -- đối tượng
    cost_type_id    BIGINT NOT NULL REFERENCES core.cost_type(id),
    process_id      BIGINT REFERENCES core.process(id),
    amount_fc       NUMERIC(18,2) NOT NULL,
    currency_code   TEXT NOT NULL DEFAULT 'VND' REFERENCES core.currency(code),
    exchange_rate   NUMERIC(18,4) NOT NULL DEFAULT 1,
    amount          NUMERIC(18,2) NOT NULL,            -- quy đổi
    vat_pct         NUMERIC(5,2),
    payment_method_id BIGINT REFERENCES core.payment_method(id),
    collected_po_id BIGINT REFERENCES purchasing.purchase_order(id), -- đã tập hợp vào PO dịch vụ
    approved        BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE purchasing.supplier_return (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    doc_no     TEXT NOT NULL UNIQUE,
    doc_date   DATE NOT NULL DEFAULT CURRENT_DATE,
    order_id   BIGINT REFERENCES purchasing.purchase_order(id),
    partner_id BIGINT NOT NULL REFERENCES core.partner(id),
    status     TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','APPROVED','POSTED','CANCELLED')),
    note       TEXT
);

CREATE TABLE purchasing.supplier_return_line (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    return_id  BIGINT NOT NULL REFERENCES purchasing.supplier_return(id) ON DELETE CASCADE,
    product_id BIGINT NOT NULL REFERENCES core.product(id),
    quantity   NUMERIC(18,4) NOT NULL,
    unit_price NUMERIC(18,2)
);

-- ============================================================
-- 4. INVENTORY — Kho vận
-- ============================================================

-- Chứng từ kho hợp nhất (nhập / xuất / chuyển)
CREATE TABLE inventory.stock_doc (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    doc_no         TEXT NOT NULL UNIQUE,
    doc_type       TEXT NOT NULL CHECK (doc_type IN ('RECEIPT','ISSUE','TRANSFER')),
    sub_type       TEXT NOT NULL CHECK (sub_type IN (
        -- nhập
        'PURCHASE','CUSTOMER_RETURN','FINISHED_GOODS','RECEIPT_OTHER','RECEIPT_CODE_ADJUST',
        -- xuất
        'SALES','OUTSOURCING','SUPPLIER_RETURN','ISSUE_OTHER','ISSUE_CODE_ADJUST',
        -- chuyển
        'INTERNAL_TRANSFER')),
    request_date   DATE NOT NULL DEFAULT CURRENT_DATE,
    actual_date    DATE,                  -- ngày thực xuất/nhập (cập nhật khi hoàn tất)
    sales_order_id BIGINT REFERENCES sales.sales_order(id),
    purchase_order_id BIGINT REFERENCES purchasing.purchase_order(id),
    supplier_return_id BIGINT REFERENCES purchasing.supplier_return(id),
    partner_id     BIGINT REFERENCES core.partner(id),     -- mã đối tượng
    from_warehouse_id BIGINT REFERENCES core.warehouse(id),
    to_warehouse_id   BIGINT REFERENCES core.warehouse(id),
    org_unit       TEXT,                  -- xuất cho/nhập từ đơn vị (BỘ PHẬN GIA CÔNG)
    process_id     BIGINT REFERENCES core.process(id),     -- quy trình gia công
    counterpart_doc_id BIGINT REFERENCES inventory.stock_doc(id), -- phiếu đối ứng (điều chỉnh mã, SX-DV↔SP-TP)
    ref_no         TEXT,                  -- số tham chiếu hiển thị
    note           TEXT,
    status         TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN
        ('DRAFT','REQUESTED','CONFIRMED','COMPLETED','CANCELLED')),
    created_by     BIGINT REFERENCES core.app_user(id),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_by   BIGINT REFERENCES core.app_user(id),
    completed_at   TIMESTAMPTZ
);
CREATE INDEX idx_stock_doc_so ON inventory.stock_doc(sales_order_id);
CREATE INDEX idx_stock_doc_po ON inventory.stock_doc(purchase_order_id);

CREATE TABLE inventory.lot (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    lot_no      TEXT NOT NULL,
    product_id  BIGINT NOT NULL REFERENCES core.product(id),
    expiry_date DATE,
    UNIQUE (lot_no, product_id)
);

CREATE TABLE inventory.stock_doc_line (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    doc_id       BIGINT NOT NULL REFERENCES inventory.stock_doc(id) ON DELETE CASCADE,
    product_id   BIGINT NOT NULL REFERENCES core.product(id),
    requested_qty NUMERIC(18,4) NOT NULL,    -- SL yêu cầu
    actual_qty   NUMERIC(18,4),               -- SL thực xuất/nhập
    kit_qty      NUMERIC(18,4),               -- SL bộ
    unit_price   NUMERIC(18,2),
    lot_id       BIGINT REFERENCES inventory.lot(id),
    expiry_date  DATE,
    location_id  BIGINT REFERENCES core.warehouse_location(id),
    note         TEXT
);

-- Ledger nhập xuất (nguồn sự thật về tồn kho)
CREATE TABLE inventory.stock_move (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    move_date    DATE NOT NULL,
    doc_id       BIGINT NOT NULL REFERENCES inventory.stock_doc(id),
    doc_line_id  BIGINT NOT NULL REFERENCES inventory.stock_doc_line(id),
    product_id   BIGINT NOT NULL REFERENCES core.product(id),
    warehouse_id BIGINT NOT NULL REFERENCES core.warehouse(id),
    lot_id       BIGINT REFERENCES inventory.lot(id),
    location_id  BIGINT REFERENCES core.warehouse_location(id),
    qty          NUMERIC(18,4) NOT NULL,      -- (+) nhập, (-) xuất
    unit_cost    NUMERIC(18,4),               -- giá vốn (tính lại cuối kỳ)
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_stock_move_prod_wh ON inventory.stock_move(product_id, warehouse_id, move_date);

-- Tồn hiện thời (materialized từ stock_move)
CREATE TABLE inventory.stock_balance (
    product_id   BIGINT NOT NULL REFERENCES core.product(id),
    warehouse_id BIGINT NOT NULL REFERENCES core.warehouse(id),
    lot_id       BIGINT REFERENCES inventory.lot(id),
    qty_on_hand  NUMERIC(18,4) NOT NULL DEFAULT 0,
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- lot_id NULL được coi là 1 dòng tồn riêng (kho không theo lô)
CREATE UNIQUE INDEX uq_stock_balance
    ON inventory.stock_balance (product_id, warehouse_id, COALESCE(lot_id, 0));

-- Chi phí nhập kho (gia công, vận chuyển theo phiếu nhập) → PGC khi duyệt
CREATE TABLE inventory.gr_cost (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    doc_id       BIGINT NOT NULL REFERENCES inventory.stock_doc(id) ON DELETE CASCADE,
    cost_type_id BIGINT NOT NULL REFERENCES core.cost_type(id),
    payee_id     BIGINT REFERENCES core.partner(id),
    process_id   BIGINT REFERENCES core.process(id),
    amount       NUMERIC(18,2) NOT NULL,
    vat_pct      NUMERIC(5,2),
    approved     BOOLEAN NOT NULL DEFAULT FALSE,
    approved_by  BIGINT REFERENCES core.app_user(id),
    approved_at  TIMESTAMPTZ
);

-- Đóng gói – soạn hàng
CREATE TABLE inventory.packing_line (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    doc_id       BIGINT NOT NULL REFERENCES inventory.stock_doc(id) ON DELETE CASCADE,
    doc_line_id  BIGINT REFERENCES inventory.stock_doc_line(id),
    units_per_pack NUMERIC(18,4),   -- số con/bao
    pack_count   NUMERIC(18,4),     -- số bao
    loose_units  NUMERIC(18,4),     -- số con lẻ
    performer_id BIGINT REFERENCES core.employee(id),
    is_done      BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE inventory.delivery_plan (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    doc_id      BIGINT NOT NULL REFERENCES inventory.stock_doc(id) ON DELETE CASCADE,
    plan_date   DATE,
    vehicle     TEXT,
    driver      TEXT,
    note        TEXT
);

-- FK trễ (tránh phụ thuộc vòng)
ALTER TABLE purchasing.po_cost
    ADD CONSTRAINT fk_po_cost_receipt FOREIGN KEY (receipt_doc_id) REFERENCES inventory.stock_doc(id);
ALTER TABLE purchasing.outsourcing_cost
    ADD CONSTRAINT fk_oc_receipt FOREIGN KEY (receipt_doc_id) REFERENCES inventory.stock_doc(id);

-- ============================================================
-- 5. FINANCE — Kế toán
-- ============================================================

-- Danh mục đối tượng quản lý (mở rộng được)
CREATE TABLE finance.object_category (
    id   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,        -- CUSTOMER, SUPPLIER, EMPLOYEE, ASSET_CARD, PREPAID_CARD, FUND...
    name TEXT NOT NULL,
    source_table TEXT                 -- bảng nguồn danh mục
);

-- Hệ thống tài khoản
CREATE TABLE finance.account (
    id                 BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code               TEXT NOT NULL UNIQUE,   -- 131, 1561, 3311...
    name               TEXT NOT NULL,
    parent_id          BIGINT REFERENCES finance.account(id),
    account_type       TEXT NOT NULL DEFAULT 'NORMAL'
                       CHECK (account_type IN ('ASSET','LIABILITY','EQUITY','REVENUE','EXPENSE','OFF_BALANCE','NORMAL')),
    object_category_id BIGINT REFERENCES finance.object_category(id), -- chi tiết PS theo đối tượng
    balance_detail     TEXT NOT NULL DEFAULT 'NONE'
                       CHECK (balance_detail IN ('NONE','OBJECT','OBJECT_FX','OBJECT_QTY')),
    balance_side       TEXT NOT NULL DEFAULT 'GREATER'
                       CHECK (balance_side IN ('NONE','DEBIT','CREDIT','GREATER','BOTH')),
    is_active          BOOLEAN NOT NULL DEFAULT TRUE
);

-- Kỳ kế toán
CREATE TABLE finance.fiscal_period (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    fiscal_year INT NOT NULL,
    period_no   INT NOT NULL CHECK (period_no BETWEEN 1 AND 12),
    date_from   DATE NOT NULL,
    date_to     DATE NOT NULL,
    status      TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','CLOSED')),
    UNIQUE (fiscal_year, period_no)
);

-- Chính sách kế toán & tùy chọn hệ thống
CREATE TABLE finance.accounting_policy (
    id                 BIGINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    base_currency      TEXT NOT NULL DEFAULT 'VND' REFERENCES core.currency(code),
    accounting_regime  TEXT,             -- TT133 / TT200 / QĐ48
    fiscal_start_month INT NOT NULL DEFAULT 1,
    inventory_costing  TEXT NOT NULL DEFAULT 'AVG' CHECK (inventory_costing IN ('AVG','FIFO','SPECIFIC')),
    first_period_id    BIGINT REFERENCES finance.fiscal_period(id),
    options            JSONB NOT NULL DEFAULT '{}'  -- các tùy chọn: cho xuất vượt tồn, kiểm tra trùng HĐ...
);

-- Số dư đầu kỳ
CREATE TABLE finance.opening_balance (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    period_id     BIGINT NOT NULL REFERENCES finance.fiscal_period(id),
    account_id    BIGINT NOT NULL REFERENCES finance.account(id),
    object_type   TEXT,                  -- bảng đối tượng
    object_id     BIGINT,
    currency_code TEXT REFERENCES core.currency(code),
    warehouse_id  BIGINT REFERENCES core.warehouse(id),
    product_id    BIGINT REFERENCES core.product(id),
    debit_fc      NUMERIC(18,2) DEFAULT 0,  -- nguyên tệ
    credit_fc     NUMERIC(18,2) DEFAULT 0,
    debit         NUMERIC(18,2) DEFAULT 0,  -- quy đổi
    credit        NUMERIC(18,2) DEFAULT 0,
    quantity      NUMERIC(18,4)
);

-- Danh mục Nghiệp vụ (mẫu định khoản)
CREATE TABLE finance.business_operation (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code         TEXT NOT NULL UNIQUE,
    name         TEXT NOT NULL,
    voucher_type TEXT NOT NULL,          -- áp cho loại phiếu nào
    template     JSONB NOT NULL          -- [{dr_account, cr_account, amount_expr, vat...}]
);

-- Quỹ tiền
CREATE TABLE finance.cash_fund (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code       TEXT NOT NULL UNIQUE,
    name       TEXT NOT NULL,
    fund_type  TEXT NOT NULL CHECK (fund_type IN ('CASH','BANK')),
    account_id BIGINT NOT NULL REFERENCES finance.account(id), -- 1111/1121...
    bank_name  TEXT, account_no TEXT,
    currency_code TEXT NOT NULL DEFAULT 'VND' REFERENCES core.currency(code)
);

-- Outbox & LERP
CREATE TABLE finance.outbox_event (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    event_type   TEXT NOT NULL,
    source_table TEXT NOT NULL,
    source_id    BIGINT NOT NULL,
    payload      JSONB NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    processed_at TIMESTAMPTZ
);
CREATE INDEX idx_outbox_unprocessed ON finance.outbox_event(created_at) WHERE processed_at IS NULL;

CREATE TABLE finance.lerp_voucher (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    voucher_type  TEXT NOT NULL CHECK (voucher_type IN (
        'YCT','YCC','BAN_HANG','HANG_TRA_LAI','PHIEU_XUAT','MUA_HANG','PHIEU_NHAP',
        'TRA_HANG_NCC','XUAT_KHO','NHAP_KHO','CHUYEN_KHO','PGC')),
    source_table  TEXT NOT NULL,         -- chứng từ nguồn SCRM
    source_id     BIGINT NOT NULL,
    ref_no        TEXT,
    partner_id    BIGINT REFERENCES core.partner(id),
    amount        NUMERIC(18,2),
    status        TEXT NOT NULL DEFAULT 'PENDING'
                  CHECK (status IN ('PENDING','GENERATED','POSTED','DELETED')),
    voucher_id    BIGINT,                -- FK finance.voucher (thêm sau)
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (source_table, source_id, voucher_type)
);

-- Chứng từ kế toán hợp nhất
CREATE TABLE finance.voucher (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    voucher_type    TEXT NOT NULL CHECK (voucher_type IN (
        'PHIEU_THU','PHIEU_CHI','CHUYEN_TIEN','YEU_CAU_CHI','YEU_CAU_THU',
        'HOA_DON_BAN','HANG_BAN_TRA_LAI','PHIEU_GHI_NO',
        'PHIEU_MUA_HANG','TRA_HANG_NCC','PHIEU_GHI_CO',
        'PHIEU_XUAT_KT','PHIEU_NHAP_KT','DIEU_CHUYEN_KT',
        'CT_GIAM_GIA','CT_KHAU_HAO','CT_PHAN_BO','CT_KET_CHUYEN','CT_TONG_HOP')),
    doc_no          TEXT NOT NULL,
    doc_date        DATE NOT NULL DEFAULT CURRENT_DATE,
    posting_date    DATE,
    period_id       BIGINT REFERENCES finance.fiscal_period(id),
    operation_id    BIGINT REFERENCES finance.business_operation(id), -- nghiệp vụ
    partner_id      BIGINT REFERENCES core.partner(id),               -- đối tượng
    employee_id     BIGINT REFERENCES core.employee(id),
    fund_id         BIGINT REFERENCES finance.cash_fund(id),          -- quỹ tiền
    warehouse_id    BIGINT REFERENCES core.warehouse(id),
    ycc_type        TEXT,                 -- loại YCC: trả NCC & chi khác / HĐ chi phí kê khai thuế
    invoice_no      TEXT, invoice_serial TEXT, invoice_form TEXT, invoice_date DATE,
    currency_code   TEXT NOT NULL DEFAULT 'VND' REFERENCES core.currency(code),
    exchange_rate   NUMERIC(18,4) NOT NULL DEFAULT 1,
    total_amount    NUMERIC(18,2),
    total_vat       NUMERIC(18,2),
    description     TEXT,
    lerp_voucher_id BIGINT REFERENCES finance.lerp_voucher(id),
    status          TEXT NOT NULL DEFAULT 'DRAFT'
                    CHECK (status IN ('DRAFT','APPROVED','POSTED','UNLOCKED','CANCELLED')),
    posted_by       BIGINT REFERENCES core.app_user(id),
    posted_at       TIMESTAMPTZ,
    created_by      BIGINT REFERENCES core.app_user(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (voucher_type, doc_no)
);
ALTER TABLE finance.lerp_voucher
    ADD CONSTRAINT fk_lerp_voucher FOREIGN KEY (voucher_id) REFERENCES finance.voucher(id);

CREATE TABLE finance.voucher_line (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    voucher_id    BIGINT NOT NULL REFERENCES finance.voucher(id) ON DELETE CASCADE,
    product_id    BIGINT REFERENCES core.product(id),
    description   TEXT,
    quantity      NUMERIC(18,4),
    unit_price    NUMERIC(18,2),
    amount        NUMERIC(18,2) NOT NULL DEFAULT 0,
    vat_pct       NUMERIC(5,2),
    vat_amount    NUMERIC(18,2),
    dr_account_id BIGINT REFERENCES finance.account(id),  -- TK Nợ override
    cr_account_id BIGINT REFERENCES finance.account(id),  -- TK Có override
    dr_object_id  BIGINT, dr_object_type TEXT,
    cr_object_id  BIGINT, cr_object_type TEXT,
    ref_voucher_id BIGINT REFERENCES finance.voucher(id), -- chứng từ thanh toán tham chiếu
    lot_id        BIGINT REFERENCES inventory.lot(id),
    warehouse_id  BIGINT REFERENCES core.warehouse(id)
);

-- Sổ cái (immutable khi POSTED; partition theo kỳ khi triển khai)
CREATE TABLE finance.gl_entry (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    voucher_id    BIGINT NOT NULL REFERENCES finance.voucher(id),
    period_id     BIGINT NOT NULL REFERENCES finance.fiscal_period(id),
    posting_date  DATE NOT NULL,
    account_id    BIGINT NOT NULL REFERENCES finance.account(id),
    side          CHAR(1) NOT NULL CHECK (side IN ('D','C')),
    object_type   TEXT, object_id BIGINT,
    currency_code TEXT NOT NULL DEFAULT 'VND',
    amount_fc     NUMERIC(18,2) NOT NULL DEFAULT 0,
    amount        NUMERIC(18,2) NOT NULL,
    quantity      NUMERIC(18,4),
    warehouse_id  BIGINT REFERENCES core.warehouse(id),
    product_id    BIGINT REFERENCES core.product(id),
    lot_id        BIGINT REFERENCES inventory.lot(id),
    description   TEXT
);
CREATE INDEX idx_gl_acct_period ON finance.gl_entry(account_id, period_id);
CREATE INDEX idx_gl_object ON finance.gl_entry(object_type, object_id);

CREATE TABLE finance.bank_fee (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    voucher_id  BIGINT NOT NULL REFERENCES finance.voucher(id) ON DELETE CASCADE,
    amount      NUMERIC(18,2) NOT NULL,
    vat_pct     NUMERIC(5,2),
    description TEXT
);

-- TSCĐ / CCDC
CREATE TABLE finance.asset_group (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code            TEXT NOT NULL UNIQUE,
    name            TEXT NOT NULL,
    cost_account_id BIGINT REFERENCES finance.account(id),  -- TK nguyên giá (211/153...)
    dep_account_id  BIGINT REFERENCES finance.account(id)   -- TK khấu hao (214/242...)
);

CREATE TABLE finance.fixed_asset (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code          TEXT NOT NULL UNIQUE,
    name          TEXT NOT NULL,
    group_id      BIGINT REFERENCES finance.asset_group(id),
    department_id BIGINT REFERENCES core.department(id),
    start_use_date DATE,
    is_tool       BOOLEAN NOT NULL DEFAULT FALSE,    -- CCDC
    is_active     BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE finance.asset_report (   -- biên bản TSCĐ
    id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    asset_id         BIGINT NOT NULL REFERENCES finance.fixed_asset(id),
    report_date      DATE NOT NULL,
    report_type      TEXT NOT NULL CHECK (report_type IN ('INCREASE','DECREASE','ADJUST')),
    asset_operation  TEXT,              -- tăng do mua mới, XDCB hoàn thành...
    dep_method       TEXT NOT NULL CHECK (dep_method IN
                     ('STRAIGHT_LINE','DECLINING','OUTPUT','WEAR','NONE')),
    dep_start_rule   TEXT CHECK (dep_start_rule IN ('PERIOD_START','REPORT_DATE','NEXT_PERIOD')),
    original_cost    NUMERIC(18,2),
    remaining_months INT,
    monthly_dep      NUMERIC(18,2),     -- KH bình quân tháng
    status           TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','APPLIED','CLOSED'))
);

CREATE TABLE finance.asset_alloc_rule (  -- thiết lập bút toán phân bổ khấu hao
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    asset_id    BIGINT NOT NULL REFERENCES finance.fixed_asset(id),
    account_id  BIGINT NOT NULL REFERENCES finance.account(id),  -- TK phân bổ
    object_type TEXT, object_id BIGINT,                          -- đối tượng phân bổ
    factor      NUMERIC(9,4) NOT NULL DEFAULT 1,                 -- hệ số; tỷ lệ = hệ số/tổng
    apply_from_period_id BIGINT REFERENCES finance.fiscal_period(id),
    apply_future BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE finance.depreciation_entry (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    asset_id   BIGINT NOT NULL REFERENCES finance.fixed_asset(id),
    period_id  BIGINT NOT NULL REFERENCES finance.fiscal_period(id),
    amount     NUMERIC(18,2) NOT NULL,
    voucher_id BIGINT REFERENCES finance.voucher(id),
    is_valid   BOOLEAN NOT NULL DEFAULT TRUE,   -- dòng đỏ = cần kiểm tra
    UNIQUE (asset_id, period_id)
);

-- Chi phí trả trước / phân bổ
CREATE TABLE finance.prepaid_expense (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code          TEXT NOT NULL UNIQUE,
    name          TEXT NOT NULL,
    department_id BIGINT REFERENCES core.department(id),
    account_id    BIGINT REFERENCES finance.account(id),  -- 2421
    card_date     DATE
);

CREATE TABLE finance.prepaid_card (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    prepaid_id    BIGINT NOT NULL REFERENCES finance.prepaid_expense(id),
    source_type   TEXT NOT NULL CHECK (source_type IN ('TRANSACTION','OPENING')), -- số PS / số dư
    alloc_method  TEXT NOT NULL CHECK (alloc_method IN ('TIME','OUTPUT')),
    total_amount  NUMERIC(18,2) NOT NULL,
    alloc_months  INT,
    status        TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','DONE','CANCELLED'))
);

CREATE TABLE finance.prepaid_alloc_rule (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    card_id     BIGINT NOT NULL REFERENCES finance.prepaid_card(id) ON DELETE CASCADE,
    account_id  BIGINT NOT NULL REFERENCES finance.account(id),
    object_type TEXT, object_id BIGINT,
    factor      NUMERIC(9,4) NOT NULL DEFAULT 1
);

CREATE TABLE finance.prepaid_alloc_entry (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    card_id    BIGINT NOT NULL REFERENCES finance.prepaid_card(id),
    period_id  BIGINT NOT NULL REFERENCES finance.fiscal_period(id),
    amount     NUMERIC(18,2) NOT NULL,
    voucher_id BIGINT REFERENCES finance.voucher(id),
    is_valid   BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE (card_id, period_id)
);

-- Thuế & hóa đơn
CREATE TABLE finance.vat_invoice (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    direction     TEXT NOT NULL CHECK (direction IN ('IN','OUT')),  -- mua vào / bán ra
    invoice_no    TEXT NOT NULL,
    invoice_serial TEXT,
    invoice_form  TEXT,                 -- mẫu số
    invoice_date  DATE NOT NULL,
    partner_id    BIGINT REFERENCES core.partner(id),
    partner_tax_code TEXT,
    pre_tax_amount NUMERIC(18,2) NOT NULL,
    vat_pct       NUMERIC(5,2),
    vat_amount    NUMERIC(18,2) NOT NULL,
    declare_period_id BIGINT REFERENCES finance.fiscal_period(id),
    voucher_id    BIGINT REFERENCES finance.voucher(id),
    UNIQUE (direction, invoice_no, invoice_serial, partner_tax_code) -- chống trùng hóa đơn
);

CREATE TABLE finance.vat_deduction (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    period_id   BIGINT NOT NULL UNIQUE REFERENCES finance.fiscal_period(id),
    input_vat   NUMERIC(18,2) NOT NULL,
    output_vat  NUMERIC(18,2) NOT NULL,
    deducted    NUMERIC(18,2) NOT NULL,
    voucher_id  BIGINT REFERENCES finance.voucher(id)
);

CREATE TABLE finance.cit_declaration (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    decl_type   TEXT NOT NULL CHECK (decl_type IN ('PROVISIONAL','FINAL')), -- tạm tính / quyết toán
    fiscal_year INT NOT NULL,
    quarter     INT,
    data        JSONB NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Giá thành gia công theo quy trình
CREATE TABLE finance.costing_object (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    process_id BIGINT NOT NULL REFERENCES core.process(id),
    period_id  BIGINT NOT NULL REFERENCES finance.fiscal_period(id),
    total_cost NUMERIC(18,2),
    total_qty  NUMERIC(18,4),
    unit_cost  NUMERIC(18,4),
    status     TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','CALCULATED','CLOSED')),
    UNIQUE (process_id, period_id)
);

-- Nghiệp vụ cuối kỳ
CREATE TABLE finance.period_closing (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    period_id  BIGINT NOT NULL REFERENCES finance.fiscal_period(id),
    step       TEXT NOT NULL CHECK (step IN (
        'DEPRECIATION',          -- khấu hao TSCĐ
        'PREPAID_ALLOC',         -- phân bổ CCDC/CPPB
        'RECALC_COGS',           -- tính lại giá xuất kho
        'VAT_DEDUCTION',         -- khấu trừ GTGT
        'PURCHASE_COST_ALLOC',   -- phân bổ CP mua hàng cho hàng tiêu thụ
        'FX_REVALUATION',        -- lãi/lỗ chênh lệch tỷ giá
        'CLOSING_ENTRIES',       -- kết chuyển
        'CARRY_FORWARD')),       -- chuyển số dư
    executed_at TIMESTAMPTZ,
    executed_by BIGINT REFERENCES core.app_user(id),
    status     TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','DONE','ERROR')),
    detail     JSONB,
    UNIQUE (period_id, step)
);

-- ============================================================
-- HẾT — xem data_model.md để giải thích từng bảng
-- ============================================================
