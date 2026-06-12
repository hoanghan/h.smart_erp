using Erp.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace Erp.Api.Core;

/// <summary>
/// Các thay đổi schema idempotent ngoài data_model.sql gốc (chạy mỗi lần khởi động).
/// </summary>
public static class SchemaBootstrap
{
    public static async Task RunAsync(ErpDbContext db)
    {
        await db.Database.ExecuteSqlRawAsync("""
            ALTER TABLE core.doc_numbering
                ADD COLUMN IF NOT EXISTS last_period TEXT;
            """);

        // Purchasing — extra columns used by EF entities but not in data_model.sql
        await db.Database.ExecuteSqlRawAsync("""
            ALTER TABLE purchasing.purchase_request
                ADD COLUMN IF NOT EXISTS status_reason TEXT,
                ADD COLUMN IF NOT EXISTS creator_id BIGINT,
                ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                ADD COLUMN IF NOT EXISTS request_type TEXT NOT NULL DEFAULT 'PURCHASE',
                ADD COLUMN IF NOT EXISTS required_by DATE;
            """);
        await db.Database.ExecuteSqlRawAsync("""
            ALTER TABLE purchasing.purchase_order
                ADD COLUMN IF NOT EXISTS status_reason TEXT,
                ADD COLUMN IF NOT EXISTS creator_id BIGINT,
                ADD COLUMN IF NOT EXISTS rfq_id BIGINT,
                ADD COLUMN IF NOT EXISTS tax_template_id BIGINT,
                ADD COLUMN IF NOT EXISTS payment_terms_template_id BIGINT,
                ADD COLUMN IF NOT EXISTS tax_total NUMERIC(18,2),
                ADD COLUMN IF NOT EXISTS grand_total NUMERIC(18,2);
            """);
        await db.Database.ExecuteSqlRawAsync("""
            ALTER TABLE purchasing.purchase_order_line
                ADD COLUMN IF NOT EXISTS received_qty NUMERIC(18,4) NOT NULL DEFAULT 0,
                ADD COLUMN IF NOT EXISTS billed_qty NUMERIC(18,4) NOT NULL DEFAULT 0;
            """);
        await db.Database.ExecuteSqlRawAsync("""
            ALTER TABLE purchasing.po_cost
                ADD COLUMN IF NOT EXISTS note TEXT;
            """);
        await db.Database.ExecuteSqlRawAsync("""
            ALTER TABLE purchasing.po_payment_request
                ADD COLUMN IF NOT EXISTS creator_id BIGINT;
            """);
        await db.Database.ExecuteSqlRawAsync("""
            ALTER TABLE purchasing.supplier_return
                ADD COLUMN IF NOT EXISTS creator_id BIGINT;
            """);
        await db.Database.ExecuteSqlRawAsync("""
            ALTER TABLE purchasing.supplier_return_line
                ADD COLUMN IF NOT EXISTS note TEXT;
            """);

        // Inventory — extra columns used by EF entities but not in data_model.sql
        await db.Database.ExecuteSqlRawAsync("""
            ALTER TABLE inventory.stock_doc
                ADD COLUMN IF NOT EXISTS status_reason TEXT;
            """);
        await db.Database.ExecuteSqlRawAsync("""
            ALTER TABLE inventory.stock_doc_line
                ADD COLUMN IF NOT EXISTS landed_cost NUMERIC(18,4) NOT NULL DEFAULT 0;
            """);
        // stock_balance không có PK trong data_model.sql (chỉ unique theo product+warehouse+COALESCE(lot_id,0));
        // thêm cột id surrogate để EF Core dùng làm khóa chính.
        await db.Database.ExecuteSqlRawAsync("""
            ALTER TABLE inventory.stock_balance
                ADD COLUMN IF NOT EXISTS id BIGINT GENERATED ALWAYS AS IDENTITY;
            """);

        // ===== Inventory v2 — ERPNext Stock upgrade =====
        // Warehouse tree: parent_id
        await db.Database.ExecuteSqlRawAsync("""
            ALTER TABLE core.warehouse ADD COLUMN IF NOT EXISTS parent_id BIGINT NULL;
            """);

        // StockDoc: purpose column (ERPNext purpose mapping)
        await db.Database.ExecuteSqlRawAsync("""
            ALTER TABLE inventory.stock_doc ADD COLUMN IF NOT EXISTS purpose TEXT;
            """);

        // StockMove → SLE: valuation fields
        await db.Database.ExecuteSqlRawAsync("""
            ALTER TABLE inventory.stock_move
                ADD COLUMN IF NOT EXISTS qty_after_transaction NUMERIC(18,4),
                ADD COLUMN IF NOT EXISTS valuation_rate NUMERIC(18,4),
                ADD COLUMN IF NOT EXISTS stock_value NUMERIC(18,2),
                ADD COLUMN IF NOT EXISTS stock_value_difference NUMERIC(18,2),
                ADD COLUMN IF NOT EXISTS posting_datetime TIMESTAMPTZ;
            """);

        // StockBalance → Bin: reserved/ordered
        await db.Database.ExecuteSqlRawAsync("""
            ALTER TABLE inventory.stock_balance
                ADD COLUMN IF NOT EXISTS reserved_qty NUMERIC(18,4) NOT NULL DEFAULT 0,
                ADD COLUMN IF NOT EXISTS ordered_qty NUMERIC(18,4) NOT NULL DEFAULT 0;
            """);

        // Stock Reconciliation tables
        await db.Database.ExecuteSqlRawAsync("""
            CREATE TABLE IF NOT EXISTS inventory.stock_reconciliation (
                id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                doc_no TEXT NOT NULL,
                warehouse_id BIGINT NOT NULL,
                reconciliation_date DATE NOT NULL,
                status TEXT NOT NULL DEFAULT 'DRAFT',
                note TEXT,
                created_by BIGINT,
                created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                posted_by BIGINT,
                posted_at TIMESTAMPTZ
            );
            """);
        await db.Database.ExecuteSqlRawAsync("""
            CREATE TABLE IF NOT EXISTS inventory.stock_reconciliation_line (
                id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                reconciliation_id BIGINT NOT NULL REFERENCES inventory.stock_reconciliation(id),
                product_id BIGINT NOT NULL,
                lot_id BIGINT,
                system_qty NUMERIC(18,4) NOT NULL DEFAULT 0,
                actual_qty NUMERIC(18,4) NOT NULL DEFAULT 0,
                difference NUMERIC(18,4) NOT NULL DEFAULT 0
            );
            """);

        // Seed core.process — quy trình gia công (idempotent)
        await db.Database.ExecuteSqlRawAsync("""
            INSERT INTO core.process (code, name) VALUES ('XI', 'Gia công xi')
            ON CONFLICT (code) DO NOTHING;
            """);
        await db.Database.ExecuteSqlRawAsync("""
            INSERT INTO core.process (code, name) VALUES ('NHUNG_NONG', 'Nhúng nóng')
            ON CONFLICT (code) DO NOTHING;
            """);
        await db.Database.ExecuteSqlRawAsync("""
            INSERT INTO core.process (code, name) VALUES ('TARO_TAN', 'Taro tán')
            ON CONFLICT (code) DO NOTHING;
            """);

        // ===== Finance schema =====
        await db.Database.ExecuteSqlRawAsync("CREATE SCHEMA IF NOT EXISTS finance");

        // finance tables (idempotent via IF NOT EXISTS)
        await db.Database.ExecuteSqlRawAsync("""
            CREATE TABLE IF NOT EXISTS finance.object_category (
                id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                code TEXT NOT NULL UNIQUE, name TEXT NOT NULL, source_table TEXT
            );
            """);
        await db.Database.ExecuteSqlRawAsync("""
            CREATE TABLE IF NOT EXISTS finance.account (
                id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                code TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
                parent_id BIGINT, account_type TEXT NOT NULL DEFAULT 'NORMAL',
                object_category_id BIGINT, balance_detail TEXT NOT NULL DEFAULT 'NONE',
                balance_side TEXT NOT NULL DEFAULT 'GREATER', is_active BOOLEAN NOT NULL DEFAULT TRUE
            );
            """);
        await db.Database.ExecuteSqlRawAsync("""
            CREATE TABLE IF NOT EXISTS finance.fiscal_period (
                id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                fiscal_year INT NOT NULL, period_no INT NOT NULL,
                date_from DATE NOT NULL, date_to DATE NOT NULL,
                status TEXT NOT NULL DEFAULT 'OPEN',
                UNIQUE(fiscal_year, period_no)
            );
            """);
        await db.Database.ExecuteSqlRawAsync("""
            CREATE TABLE IF NOT EXISTS finance.accounting_policy (
                id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                base_currency TEXT NOT NULL DEFAULT 'VND',
                accounting_regime TEXT, fiscal_start_month INT NOT NULL DEFAULT 1,
                inventory_costing TEXT NOT NULL DEFAULT 'AVG', first_period_id BIGINT
            );
            """);
        await db.Database.ExecuteSqlRawAsync("""
            CREATE TABLE IF NOT EXISTS finance.opening_balance (
                id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                period_id BIGINT NOT NULL, account_id BIGINT NOT NULL,
                object_type TEXT, object_id BIGINT, currency_code TEXT,
                warehouse_id BIGINT, product_id BIGINT,
                debit_fc NUMERIC(18,2) DEFAULT 0, credit_fc NUMERIC(18,2) DEFAULT 0,
                debit NUMERIC(18,2) DEFAULT 0, credit NUMERIC(18,2) DEFAULT 0,
                quantity NUMERIC(18,4)
            );
            """);
        await db.Database.ExecuteSqlRawAsync("""
            CREATE TABLE IF NOT EXISTS finance.business_operation (
                id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                code TEXT NOT NULL, name TEXT NOT NULL,
                voucher_type TEXT NOT NULL, template JSONB NOT NULL
            );
            """);
        await db.Database.ExecuteSqlRawAsync("""
            CREATE TABLE IF NOT EXISTS finance.cash_fund (
                id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                code TEXT NOT NULL, name TEXT NOT NULL,
                fund_type TEXT NOT NULL DEFAULT 'CASH', account_id BIGINT NOT NULL,
                bank_name TEXT, account_no TEXT, currency_code TEXT NOT NULL DEFAULT 'VND'
            );
            """);
        await db.Database.ExecuteSqlRawAsync("""
            CREATE TABLE IF NOT EXISTS finance.outbox_event (
                id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                event_type TEXT NOT NULL, source_table TEXT NOT NULL,
                source_id BIGINT NOT NULL, payload JSONB NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT now(), processed_at TIMESTAMPTZ
            );
            """);
        await db.Database.ExecuteSqlRawAsync("""
            CREATE TABLE IF NOT EXISTS finance.lerp_voucher (
                id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                voucher_type TEXT NOT NULL, source_table TEXT NOT NULL,
                source_id BIGINT NOT NULL, ref_no TEXT, partner_id BIGINT,
                amount NUMERIC(18,2), status TEXT NOT NULL DEFAULT 'PENDING',
                voucher_id BIGINT, created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                UNIQUE(source_table, source_id, voucher_type)
            );
            """);
        await db.Database.ExecuteSqlRawAsync("""
            CREATE TABLE IF NOT EXISTS finance.voucher (
                id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                voucher_type TEXT NOT NULL, doc_no TEXT NOT NULL,
                doc_date DATE NOT NULL, posting_date DATE,
                period_id BIGINT, operation_id BIGINT,
                partner_id BIGINT, employee_id BIGINT,
                fund_id BIGINT, warehouse_id BIGINT,
                ycc_type TEXT, invoice_no TEXT,
                invoice_serial TEXT, invoice_form TEXT, invoice_date DATE,
                currency_code TEXT NOT NULL DEFAULT 'VND',
                exchange_rate NUMERIC(18,6) DEFAULT 1,
                total_amount NUMERIC(18,2), total_vat NUMERIC(18,2),
                description TEXT, lerp_voucher_id BIGINT,
                status TEXT NOT NULL DEFAULT 'DRAFT',
                posted_by BIGINT, posted_at TIMESTAMPTZ,
                created_by BIGINT, created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                UNIQUE(voucher_type, doc_no)
            );
            """);
        await db.Database.ExecuteSqlRawAsync("""
            CREATE TABLE IF NOT EXISTS finance.voucher_line (
                id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                voucher_id BIGINT NOT NULL REFERENCES finance.voucher(id),
                product_id BIGINT, description TEXT,
                quantity NUMERIC(18,4), unit_price NUMERIC(18,4),
                amount NUMERIC(18,2) DEFAULT 0,
                vat_pct NUMERIC(5,2), vat_amount NUMERIC(18,2),
                dr_account_id BIGINT, cr_account_id BIGINT,
                dr_object_id BIGINT, dr_object_type TEXT,
                cr_object_id BIGINT, cr_object_type TEXT,
                ref_voucher_id BIGINT
            );
            """);
        await db.Database.ExecuteSqlRawAsync("""
            CREATE TABLE IF NOT EXISTS finance.gl_entry (
                id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                voucher_id BIGINT NOT NULL, voucher_line_id BIGINT,
                account_id BIGINT NOT NULL,
                object_type TEXT, object_id BIGINT,
                currency_code TEXT, exchange_rate NUMERIC(18,6),
                fc_amount NUMERIC(18,2) DEFAULT 0, amount NUMERIC(18,2) DEFAULT 0,
                side TEXT NOT NULL, description TEXT,
                posting_date DATE, period_id BIGINT,
                created_at TIMESTAMPTZ NOT NULL DEFAULT now()
            );
            """);
        // gl_entry đã tồn tại từ trước khi có currency_code/exchange_rate — CREATE TABLE IF NOT EXISTS không thêm cột.
        await db.Database.ExecuteSqlRawAsync("""
            ALTER TABLE finance.gl_entry
                ADD COLUMN IF NOT EXISTS currency_code TEXT,
                ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(18,6);
            """);
        await db.Database.ExecuteSqlRawAsync("""
            CREATE TABLE IF NOT EXISTS finance.bank_fee (
                id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                transfer_voucher_id BIGINT NOT NULL,
                amount NUMERIC(18,2) NOT NULL,
                fee_account_id BIGINT NOT NULL,
                paid_from_fund_id BIGINT, note TEXT
            );
            """);

        // ===== New purchasing tables (RFQ, Supplier Quotation, Landed Cost) =====
        await db.Database.ExecuteSqlRawAsync("""
            CREATE TABLE IF NOT EXISTS purchasing.rfq (
                id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                doc_no TEXT NOT NULL, doc_date DATE NOT NULL,
                request_id BIGINT, status TEXT NOT NULL DEFAULT 'DRAFT',
                note TEXT, creator_id BIGINT,
                created_at TIMESTAMPTZ NOT NULL DEFAULT now()
            );
            """);
        await db.Database.ExecuteSqlRawAsync("""
            CREATE TABLE IF NOT EXISTS purchasing.rfq_line (
                id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                rfq_id BIGINT NOT NULL REFERENCES purchasing.rfq(id),
                product_id BIGINT NOT NULL, quantity NUMERIC(18,4) NOT NULL, note TEXT
            );
            """);
        await db.Database.ExecuteSqlRawAsync("""
            CREATE TABLE IF NOT EXISTS purchasing.rfq_supplier (
                id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                rfq_id BIGINT NOT NULL REFERENCES purchasing.rfq(id),
                partner_id BIGINT NOT NULL, note TEXT
            );
            """);
        await db.Database.ExecuteSqlRawAsync("""
            CREATE TABLE IF NOT EXISTS purchasing.supplier_quotation (
                id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                doc_no TEXT NOT NULL, doc_date DATE NOT NULL,
                rfq_id BIGINT NOT NULL, partner_id BIGINT NOT NULL,
                valid_until DATE, lead_time_days INT,
                note TEXT, status TEXT NOT NULL DEFAULT 'DRAFT',
                creator_id BIGINT, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
            );
            """);
        await db.Database.ExecuteSqlRawAsync("""
            CREATE TABLE IF NOT EXISTS purchasing.supplier_quotation_line (
                id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                quotation_id BIGINT NOT NULL REFERENCES purchasing.supplier_quotation(id),
                product_id BIGINT NOT NULL, quantity NUMERIC(18,4) NOT NULL,
                unit_price NUMERIC(18,4) NOT NULL DEFAULT 0,
                lead_time_days NUMERIC(5), note TEXT
            );
            """);
        await db.Database.ExecuteSqlRawAsync("""
            CREATE TABLE IF NOT EXISTS purchasing.landed_cost_voucher (
                id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                doc_no TEXT NOT NULL, doc_date DATE NOT NULL,
                allocation_method TEXT NOT NULL DEFAULT 'QTY',
                status TEXT NOT NULL DEFAULT 'DRAFT',
                note TEXT, creator_id BIGINT,
                created_at TIMESTAMPTZ NOT NULL DEFAULT now()
            );
            """);
        await db.Database.ExecuteSqlRawAsync("""
            CREATE TABLE IF NOT EXISTS purchasing.landed_cost_voucher_line (
                id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                voucher_id BIGINT NOT NULL REFERENCES purchasing.landed_cost_voucher(id),
                cost_type_id BIGINT NOT NULL, service_supplier_id BIGINT,
                amount NUMERIC(18,2) NOT NULL DEFAULT 0, note TEXT
            );
            """);
        await db.Database.ExecuteSqlRawAsync("""
            CREATE TABLE IF NOT EXISTS purchasing.landed_cost_receipt (
                id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                voucher_id BIGINT NOT NULL REFERENCES purchasing.landed_cost_voucher(id),
                receipt_doc_id BIGINT NOT NULL
            );
            """);

        // ===== New master data tables (Templates) =====
        await db.Database.ExecuteSqlRawAsync("""
            CREATE TABLE IF NOT EXISTS core.payment_terms_template (
                id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                code TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
                is_active BOOLEAN NOT NULL DEFAULT TRUE
            );
            """);
        await db.Database.ExecuteSqlRawAsync("""
            CREATE TABLE IF NOT EXISTS core.payment_terms_template_line (
                id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                template_id BIGINT NOT NULL REFERENCES core.payment_terms_template(id),
                pct NUMERIC(5,2) NOT NULL, days_after INT NOT NULL, note TEXT
            );
            """);
        await db.Database.ExecuteSqlRawAsync("""
            CREATE TABLE IF NOT EXISTS core.tax_charge_template (
                id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                code TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
                is_active BOOLEAN NOT NULL DEFAULT TRUE
            );
            """);
        await db.Database.ExecuteSqlRawAsync("""
            CREATE TABLE IF NOT EXISTS core.tax_charge_template_line (
                id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                template_id BIGINT NOT NULL REFERENCES core.tax_charge_template(id),
                charge_type TEXT NOT NULL DEFAULT 'ON_NET_TOTAL',
                rate_pct NUMERIC(5,2), fixed_amount NUMERIC(18,2),
                account_code TEXT, note TEXT
            );
            """);

        // Seed core.currency — accounting_policy.base_currency tham chiếu tới đây
        await db.Database.ExecuteSqlRawAsync("""
            INSERT INTO core.currency (code, name) VALUES
                ('VND', 'Việt Nam Đồng'),
                ('USD', 'Đô la Mỹ')
            ON CONFLICT (code) DO NOTHING;
            """);

        // Seed accounting_policy (id=1)
        await db.Database.ExecuteSqlRawAsync("""
            INSERT INTO finance.accounting_policy (id, base_currency, accounting_regime, fiscal_start_month, inventory_costing)
            VALUES (1, 'VND', 'TT200', 1, 'AVG')
            ON CONFLICT (id) DO NOTHING;
            """);

        // Seed object categories
        await db.Database.ExecuteSqlRawAsync("""
            INSERT INTO finance.object_category (code, name, source_table) VALUES
                ('KHACH_HANG', 'Khách hàng', 'core.partner'),
                ('NHA_CUNG_CAP', 'Nhà cung cấp', 'core.partner'),
                ('NHAN_VIEN', 'Nhân viên', 'core.employee'),
                ('KHO', 'Kho', 'core.warehouse'),
                ('SP', 'Sản phẩm', 'core.product')
            ON CONFLICT (code) DO NOTHING;
            """);

        // Seed TT200 chart of accounts (simplified)
        await db.Database.ExecuteSqlRawAsync("""
            INSERT INTO finance.account (code, name, account_type, balance_detail, balance_side) VALUES
                ('111', 'Tiền mặt', 'ASSET', 'NONE', 'GREATER'),
                ('112', 'Tiền gửi ngân hàng', 'ASSET', 'NONE', 'GREATER'),
                ('113', 'Tiền đang chuyển', 'ASSET', 'NONE', 'GREATER'),
                ('131', 'Phải thu của khách hàng', 'ASSET', 'OBJECT', 'GREATER'),
                ('133', 'Thuế GTGT được khấu trừ', 'ASSET', 'NONE', 'GREATER'),
                ('136', 'Phải thu nội bộ', 'ASSET', 'NONE', 'GREATER'),
                ('138', 'Phải thu khác', 'ASSET', 'NONE', 'GREATER'),
                ('141', 'Tạm ứng', 'ASSET', 'NONE', 'GREATER'),
                ('151', 'Hàng mua đang đi đường', 'ASSET', 'NONE', 'GREATER'),
                ('152', 'Nguyên liệu, vật liệu', 'ASSET', 'OBJECT_QTY', 'GREATER'),
                ('153', 'Công cụ, dụng cụ', 'ASSET', 'OBJECT_QTY', 'GREATER'),
                ('155', 'Thành phẩm', 'ASSET', 'OBJECT_QTY', 'GREATER'),
                ('156', 'Hàng hóa', 'ASSET', 'OBJECT_QTY', 'GREATER'),
                ('157', 'Hàng gửi đi bán', 'ASSET', 'OBJECT_QTY', 'GREATER'),
                ('211', 'TSCĐ hữu hình', 'ASSET', 'NONE', 'GREATER'),
                ('214', 'Hao mòn TSCĐ', 'ASSET', 'NONE', 'CREDIT'),
                ('241', 'Chi phí SXKD dở dang', 'ASSET', 'NONE', 'GREATER'),
                ('331', 'Phải trả người bán', 'LIABILITY', 'OBJECT', 'CREDIT'),
                ('333', 'Thuế và các khoản phải nộp nhà nước', 'LIABILITY', 'NONE', 'CREDIT'),
                ('334', 'Phải trả người lao động', 'LIABILITY', 'OBJECT', 'CREDIT'),
                ('336', 'Phải trả nội bộ', 'LIABILITY', 'NONE', 'CREDIT'),
                ('338', 'Phải trả, phải nộp khác', 'LIABILITY', 'NONE', 'CREDIT'),
                ('341', 'Vay và nợ thuê TC', 'LIABILITY', 'NONE', 'CREDIT'),
                ('411', 'Nguồn vốn kinh doanh', 'EQUITY', 'NONE', 'CREDIT'),
                ('421', 'Lợi nhuận chưa phân phối', 'EQUITY', 'NONE', 'CREDIT'),
                ('511', 'Doanh thu bán hàng', 'REVENUE', 'NONE', 'CREDIT'),
                ('512', 'Doanh thu cung cấp DV', 'REVENUE', 'NONE', 'CREDIT'),
                ('515', 'Doanh thu hoạt động tài chính', 'REVENUE', 'NONE', 'CREDIT'),
                ('521', 'Các khoản giảm trừ doanh thu', 'REVENUE', 'NONE', 'GREATER'),
                ('611', 'Xác định KQ kinh doanh', 'NORMAL', 'NONE', 'NONE'),
                ('621', 'Giá vốn hàng bán', 'EXPENSE', 'NONE', 'GREATER'),
                ('622', 'Chi phí bán hàng', 'EXPENSE', 'NONE', 'GREATER'),
                ('627', 'Chi phí sản xuất chung', 'EXPENSE', 'NONE', 'GREATER'),
                ('632', 'Giá vốn hàng bán', 'EXPENSE', 'NONE', 'GREATER'),
                ('635', 'Chi phí tài chính', 'EXPENSE', 'NONE', 'GREATER'),
                ('641', 'Chi phí bán hàng', 'EXPENSE', 'NONE', 'GREATER'),
                ('642', 'Chi phí quản lý DN', 'EXPENSE', 'NONE', 'GREATER'),
                ('711', 'Thu nhập khác', 'REVENUE', 'NONE', 'CREDIT'),
                ('811', 'Chi phí khác', 'EXPENSE', 'NONE', 'GREATER'),
                ('821', 'Chi phí thuế TNDN', 'EXPENSE', 'NONE', 'GREATER'),
                ('911', 'Xác định kết quả kinh doanh', 'NORMAL', 'NONE', 'NONE')
            ON CONFLICT (code) DO NOTHING;
            """);

        // Seed fiscal periods for current year
        var year = DateTime.Today.Year;
        await db.Database.ExecuteSqlRawAsync($"""
            INSERT INTO finance.fiscal_period (fiscal_year, period_no, date_from, date_to, status)
            SELECT {year}, m,
                   MAKE_DATE({year}, m, 1),
                   (MAKE_DATE({year}, m, 1) + INTERVAL '1 month' - INTERVAL '1 day')::DATE,
                   'OPEN'
            FROM generate_series(1, 12) AS m
            ON CONFLICT (fiscal_year, period_no) DO NOTHING;
            """);

        // Seed cash fund (quỹ tiền mặt)
        await db.Database.ExecuteSqlRawAsync("""
            INSERT INTO finance.cash_fund (code, name, fund_type, account_id)
            SELECT 'TM01', 'Quỹ tiền mặt', 'CASH', a.id
            FROM finance.account a
            WHERE a.code = '111'
              AND NOT EXISTS (SELECT 1 FROM finance.cash_fund WHERE code = 'TM01');
            """);

        // Seed business operations
        await db.Database.ExecuteSqlRawAsync("""
            INSERT INTO finance.business_operation (code, name, voucher_type, template) VALUES
                ('BH_GHINO', 'Bán hàng ghi nợ', 'PHIEU_GHI_NO', '{{"dr":"131","cr":"511"}}'),
                ('BH_THANHTOAN', 'Bán hàng thanh toán', 'HOA_DON_BAN', '{{"dr":"111","cr":"511"}}'),
                ('NHAP_MUA', 'Nhập kho mua hàng', 'PHIEU_NHAP_KT', '{{"dr":"156","cr":"331"}}'),
                ('XUAT_BAN', 'Xuất kho bán hàng', 'PHIEU_XUAT_KT', '{{"dr":"632","cr":"156"}}'),
                ('THU_NO', 'Thu tiền khách hàng', 'PHIEU_THU', '{{"dr":"111","cr":"131"}}'),
                ('CHI_NCC', 'Chi tiền NCC', 'PHIEU_CHI', '{{"dr":"331","cr":"111"}}'),
                ('YCC_THANHTOAN', 'Yêu cầu chi', 'YEU_CAU_CHI', '{{"dr":"331","cr":"111"}}'),
                ('TRA_HANG', 'Trả hàng NCC', 'TRA_HANG_NCC', '{{"dr":"331","cr":"156"}}'),
                ('GIA_CONG', 'Chi phí gia công', 'PHIEU_GHI_NO', '{{"dr":"627","cr":"331"}}'),
                ('CHUYEN_KHO', 'Điều chuyển kho', 'DIEU_CHUYEN_KT', '{{"dr":"156-w2","cr":"156-w1"}}')
            ON CONFLICT DO NOTHING;
            """);

        // ===== Task 24: Quotation -> ERPNext Selling model =====
        await db.Database.ExecuteSqlRawAsync("""
            ALTER TABLE sales.quotation
                ADD COLUMN IF NOT EXISTS valid_till DATE,
                ADD COLUMN IF NOT EXISTS order_type TEXT NOT NULL DEFAULT 'SALES',
                ADD COLUMN IF NOT EXISTS price_list_id BIGINT,
                ADD COLUMN IF NOT EXISTS tax_template_id BIGINT,
                ADD COLUMN IF NOT EXISTS lost_reason_ids BIGINT[],
                ADD COLUMN IF NOT EXISTS competitor TEXT,
                ADD COLUMN IF NOT EXISTS terms TEXT;
            """);
        await db.Database.ExecuteSqlRawAsync("""
            ALTER TABLE sales.quotation_line
                ADD COLUMN IF NOT EXISTS ordered_qty NUMERIC(18,4) NOT NULL DEFAULT 0,
                ADD COLUMN IF NOT EXISTS rate NUMERIC(18,2),
                ADD COLUMN IF NOT EXISTS discount_pct NUMERIC(9,4);
            """);
        // amount = qty * rate * (1 - discount_pct/100), cot generated (chi them neu chua co)
        await db.Database.ExecuteSqlRawAsync("""
            ALTER TABLE sales.quotation_line
                ADD COLUMN IF NOT EXISTS amount NUMERIC(18,2)
                GENERATED ALWAYS AS (quantity * COALESCE(rate, 0) * (1 - COALESCE(discount_pct, 0) / 100)) STORED;
            """);

        // make-sales-order cho phep tao SO mot phan theo dong -> 1 quotation co the sinh nhieu sales_order
        await db.Database.ExecuteSqlRawAsync("""
            ALTER TABLE sales.sales_order DROP CONSTRAINT IF EXISTS sales_order_quotation_id_key;
            """);

        // Bo check constraint trang thai cu (NEW/PRICE_REQUESTED/.../ORDERED) truoc khi migrate du lieu
        await db.Database.ExecuteSqlRawAsync("""
            ALTER TABLE sales.quotation DROP CONSTRAINT IF EXISTS quotation_status_check;
            """);

        // Migrate trang thai quotation cu -> model moi (DRAFT/OPEN/ORDERED/LOST/EXPIRED/CANCELLED)
        await db.Database.ExecuteSqlRawAsync("""
            UPDATE sales.quotation SET status = 'OPEN' WHERE status IN ('APPROVED','ORDER_PENDING');
            UPDATE sales.quotation SET status = 'LOST' WHERE status = 'FAILED';
            UPDATE sales.quotation SET status = 'CANCELLED' WHERE status = 'REJECTED';
            UPDATE sales.quotation SET status = 'DRAFT' WHERE status IN ('NEW','PRICE_REQUESTED','PRICING','APPROVAL_REQUESTED');
            """);

        // Them lai check constraint voi bo trang thai moi (ERPNext Selling)
        await db.Database.ExecuteSqlRawAsync("""
            ALTER TABLE sales.quotation ADD CONSTRAINT quotation_status_check
                CHECK (status IN ('DRAFT','OPEN','ORDERED','LOST','EXPIRED','CANCELLED'));
            """);

        // sales.lost_reason + CRUD /md/lost-reasons
        await db.Database.ExecuteSqlRawAsync("""
            CREATE TABLE IF NOT EXISTS sales.lost_reason (
                id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                code TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
                is_active BOOLEAN NOT NULL DEFAULT TRUE
            );
            """);

        // ===== Task 24: Promotional Scheme (thay KM-CK cu) =====
        await db.Database.ExecuteSqlRawAsync("""
            CREATE TABLE IF NOT EXISTS sales.promotional_scheme (
                id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                code TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
                apply_on TEXT NOT NULL DEFAULT 'ITEM',
                product_group_id BIGINT, partner_id BIGINT,
                valid_from DATE, valid_to DATE,
                is_active BOOLEAN NOT NULL DEFAULT TRUE,
                legacy_promotion_id BIGINT
            );
            """);
        await db.Database.ExecuteSqlRawAsync("""
            CREATE TABLE IF NOT EXISTS sales.scheme_item (
                id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                scheme_id BIGINT NOT NULL REFERENCES sales.promotional_scheme(id) ON DELETE CASCADE,
                product_id BIGINT NOT NULL
            );
            """);
        await db.Database.ExecuteSqlRawAsync("""
            CREATE TABLE IF NOT EXISTS sales.scheme_price_slab (
                id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                scheme_id BIGINT NOT NULL REFERENCES sales.promotional_scheme(id) ON DELETE CASCADE,
                product_id BIGINT,
                min_qty NUMERIC(18,4) NOT NULL DEFAULT 0,
                max_qty NUMERIC(18,4),
                discount_pct NUMERIC(9,4),
                rate NUMERIC(18,2)
            );
            """);
        await db.Database.ExecuteSqlRawAsync("""
            CREATE TABLE IF NOT EXISTS sales.scheme_product_slab (
                id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                scheme_id BIGINT NOT NULL REFERENCES sales.promotional_scheme(id) ON DELETE CASCADE,
                product_id BIGINT,
                min_qty NUMERIC(18,4) NOT NULL DEFAULT 0,
                max_qty NUMERIC(18,4),
                free_product_id BIGINT NOT NULL,
                free_qty NUMERIC(18,4) NOT NULL,
                free_rate NUMERIC(18,2) NOT NULL DEFAULT 0
            );
            """);
        await db.Database.ExecuteSqlRawAsync("""
            CREATE TABLE IF NOT EXISTS sales.pricing_rule (
                id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                rule_source TEXT NOT NULL DEFAULT 'SCHEME',
                scheme_id BIGINT REFERENCES sales.promotional_scheme(id) ON DELETE CASCADE,
                priority INT NOT NULL DEFAULT 0,
                product_id BIGINT,
                product_group_id BIGINT,
                partner_id BIGINT,
                min_qty NUMERIC(18,4) NOT NULL DEFAULT 0,
                max_qty NUMERIC(18,4),
                discount_pct NUMERIC(9,4),
                rate NUMERIC(18,2),
                free_product_id BIGINT,
                free_qty NUMERIC(18,4),
                free_rate NUMERIC(18,2) NOT NULL DEFAULT 0,
                valid_from DATE, valid_to DATE,
                is_active BOOLEAN NOT NULL DEFAULT TRUE
            );
            """);
        await db.Database.ExecuteSqlRawAsync("""
            CREATE TABLE IF NOT EXISTS sales.coupon_code (
                id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                code TEXT NOT NULL UNIQUE,
                pricing_rule_id BIGINT NOT NULL REFERENCES sales.pricing_rule(id),
                max_use INT,
                used INT NOT NULL DEFAULT 0,
                valid_from DATE, valid_to DATE,
                is_active BOOLEAN NOT NULL DEFAULT TRUE
            );
            """);

        // Migrate promotion cu -> promotional_scheme + slabs (idempotent qua legacy_promotion_id)
        await db.Database.ExecuteSqlRawAsync("""
            INSERT INTO sales.promotional_scheme (code, name, apply_on, valid_from, valid_to, is_active, legacy_promotion_id)
            SELECT 'PROMO-' || p.code, p.name, 'ITEM', p.date_from, p.date_to, TRUE, p.id
            FROM sales.promotion p
            WHERE NOT EXISTS (SELECT 1 FROM sales.promotional_scheme s WHERE s.legacy_promotion_id = p.id);
            """);
        await db.Database.ExecuteSqlRawAsync("""
            INSERT INTO sales.scheme_item (scheme_id, product_id)
            SELECT DISTINCT s.id, di.product_id
            FROM sales.promotion_discount_item di
            JOIN sales.promotional_scheme s ON s.legacy_promotion_id = di.promotion_id
            WHERE NOT EXISTS (
                SELECT 1 FROM sales.scheme_item si WHERE si.scheme_id = s.id AND si.product_id = di.product_id);
            """);
        await db.Database.ExecuteSqlRawAsync("""
            INSERT INTO sales.scheme_item (scheme_id, product_id)
            SELECT DISTINCT s.id, gi.buy_product_id
            FROM sales.promotion_gift_item gi
            JOIN sales.promotional_scheme s ON s.legacy_promotion_id = gi.promotion_id
            WHERE NOT EXISTS (
                SELECT 1 FROM sales.scheme_item si WHERE si.scheme_id = s.id AND si.product_id = gi.buy_product_id);
            """);
        await db.Database.ExecuteSqlRawAsync("""
            INSERT INTO sales.scheme_price_slab (scheme_id, product_id, min_qty, max_qty, discount_pct)
            SELECT s.id, di.product_id, 0, NULL, di.total_pct
            FROM sales.promotion_discount_item di
            JOIN sales.promotional_scheme s ON s.legacy_promotion_id = di.promotion_id
            WHERE NOT EXISTS (
                SELECT 1 FROM sales.scheme_price_slab sps
                WHERE sps.scheme_id = s.id AND sps.product_id = di.product_id AND sps.min_qty = 0);
            """);
        await db.Database.ExecuteSqlRawAsync("""
            INSERT INTO sales.scheme_product_slab (scheme_id, product_id, min_qty, max_qty, free_product_id, free_qty, free_rate)
            SELECT s.id, gi.buy_product_id, gi.required_qty, NULL, gi.gift_product_id, gi.total_gift_qty, 0
            FROM sales.promotion_gift_item gi
            JOIN sales.promotional_scheme s ON s.legacy_promotion_id = gi.promotion_id
            WHERE NOT EXISTS (
                SELECT 1 FROM sales.scheme_product_slab sps
                WHERE sps.scheme_id = s.id AND sps.product_id = gi.buy_product_id
                  AND sps.free_product_id = gi.gift_product_id AND sps.min_qty = gi.required_qty);
            """);

        // Sinh pricing_rule cho cac scheme chua co rule (moi migrate hoac tao truoc khi PromotionsController chay)
        /* var schemesNeedingRules = await db.Promotions
            .Include(s => s.Items).Include(s => s.PriceSlabs).Include(s => s.ProductSlabs)
            .Where(s => !db.PromotionDiscountItems.Any(r => r.SchemeId == s.Id))
            .ToListAsync();
        foreach (var scheme in schemesNeedingRules)
            db.PromotionDiscountItems.AddRange(Mapper.BuildRules(scheme));
        if (schemesNeedingRules.Count > 0)*/
            await db.SaveChangesAsync();
    }
}


