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

        // core.audit_log đã tồn tại từ trước nhưng thiếu cột so với entity hiện tại
        await db.Database.ExecuteSqlRawAsync("""
            ALTER TABLE core.audit_log
                ADD COLUMN IF NOT EXISTS user_id BIGINT,
                ADD COLUMN IF NOT EXISTS username TEXT,
                ADD COLUMN IF NOT EXISTS action TEXT,
                ADD COLUMN IF NOT EXISTS ref_table TEXT,
                ADD COLUMN IF NOT EXISTS ref_id BIGINT,
                ADD COLUMN IF NOT EXISTS detail TEXT,
                ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
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
        // gl_entry đã tồn tại từ trước khi có voucher_line_id/object_*/currency_code/exchange_rate/fc_amount/created_at — CREATE TABLE IF NOT EXISTS không thêm cột.
        await db.Database.ExecuteSqlRawAsync("""
            ALTER TABLE finance.gl_entry
                ADD COLUMN IF NOT EXISTS voucher_line_id BIGINT,
                ADD COLUMN IF NOT EXISTS object_type TEXT,
                ADD COLUMN IF NOT EXISTS object_id BIGINT,
                ADD COLUMN IF NOT EXISTS currency_code TEXT,
                ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(18,6),
                ADD COLUMN IF NOT EXISTS fc_amount NUMERIC(18,2) DEFAULT 0,
                ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
            """);
        // side đã tồn tại từ trước dạng CHAR(1) ('D'/'C') với CHECK constraint cũ — code hiện tại ghi "DEBIT"/"CREDIT".
        await db.Database.ExecuteSqlRawAsync("""
            ALTER TABLE finance.gl_entry DROP CONSTRAINT IF EXISTS gl_entry_side_check;
            """);
        await db.Database.ExecuteSqlRawAsync("""
            ALTER TABLE finance.gl_entry ALTER COLUMN side TYPE TEXT;
            """);
        await db.Database.ExecuteSqlRawAsync("""
            ALTER TABLE finance.gl_entry ADD CONSTRAINT gl_entry_side_check CHECK (side IN ('DEBIT','CREDIT'));
            """);
        // voucher.status đã tồn tại từ trước với CHECK constraint cũ chưa có UNLOCKED/CANCELLED_POSTED (Task 23).
        await db.Database.ExecuteSqlRawAsync("""
            ALTER TABLE finance.voucher DROP CONSTRAINT IF EXISTS voucher_status_check;
            """);
        await db.Database.ExecuteSqlRawAsync("""
            ALTER TABLE finance.voucher ADD CONSTRAINT voucher_status_check
                CHECK (status IN ('DRAFT','POSTED','CANCELLED','UNLOCKED','CANCELLED_POSTED'));
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

        // ===== Task 17: Creator & Approver tracking =====
        // SalesOrder - add CreatorId
        await db.Database.ExecuteSqlRawAsync("""
            ALTER TABLE sales.sales_order
                ADD COLUMN IF NOT EXISTS creator_id BIGINT;
            """);
        
        // SalesAllowance - add creator/approver
        await db.Database.ExecuteSqlRawAsync("""
            ALTER TABLE sales.sales_allowance
                ADD COLUMN IF NOT EXISTS creator_id BIGINT,
                ADD COLUMN IF NOT EXISTS approver_id BIGINT,
                ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
            """);
        
        // PurchaseRequest - add approver
        await db.Database.ExecuteSqlRawAsync("""
            ALTER TABLE purchasing.purchase_request
                ADD COLUMN IF NOT EXISTS approver_id BIGINT,
                ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
            """);
        
        // PurchaseOrder - add approver
        await db.Database.ExecuteSqlRawAsync("""
            ALTER TABLE purchasing.purchase_order
                ADD COLUMN IF NOT EXISTS approver_id BIGINT,
                ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
            """);
        
        // PoPayment - add approver
        await db.Database.ExecuteSqlRawAsync("""
            ALTER TABLE purchasing.po_payment_request
                ADD COLUMN IF NOT EXISTS approver_id BIGINT,
                ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
            """);
        
        // SupplierReturn - add approver
        await db.Database.ExecuteSqlRawAsync("""
            ALTER TABLE purchasing.supplier_return
                ADD COLUMN IF NOT EXISTS approver_id BIGINT,
                ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
            """);
        
        // StockDoc - add approver
        await db.Database.ExecuteSqlRawAsync("""
            ALTER TABLE inventory.stock_doc
                ADD COLUMN IF NOT EXISTS approver_id BIGINT,
                ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
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

        // ===== Task 25: CRM Module =====
        await db.Database.ExecuteSqlRawAsync("CREATE SCHEMA IF NOT EXISTS crm");

        // CRM catalogs
        await db.Database.ExecuteSqlRawAsync("""
            CREATE TABLE IF NOT EXISTS crm.lead_source (
                id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                code TEXT NOT NULL UNIQUE, name TEXT NOT NULL, is_active BOOLEAN NOT NULL DEFAULT TRUE
            );
            """);
        await db.Database.ExecuteSqlRawAsync("""
            CREATE TABLE IF NOT EXISTS crm.sales_stage (
                id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                code TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
                order_no INT NOT NULL DEFAULT 0, probability_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
                is_active BOOLEAN NOT NULL DEFAULT TRUE
            );
            """);
        await db.Database.ExecuteSqlRawAsync("""
            CREATE TABLE IF NOT EXISTS crm.campaign (
                id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                doc_no TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
                campaign_type TEXT, budget NUMERIC(18,2) NOT NULL DEFAULT 0,
                start_date DATE NOT NULL, end_date DATE NOT NULL,
                status TEXT NOT NULL DEFAULT 'DRAFT', note TEXT,
                creator_id BIGINT, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
            );
            """);

        // Lead
        await db.Database.ExecuteSqlRawAsync("""
            CREATE TABLE IF NOT EXISTS crm.lead (
                id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                doc_no TEXT NOT NULL UNIQUE, first_name TEXT NOT NULL, last_name TEXT,
                company_name TEXT, job_title TEXT, phone TEXT, mobile_no TEXT, email TEXT,
                lead_source_id BIGINT, campaign_id BIGINT, territory_id BIGINT, salesperson_id BIGINT,
                status TEXT NOT NULL DEFAULT 'LEAD', lost_reason TEXT,
                partner_id BIGINT, opportunity_id BIGINT, note TEXT,
                creator_id BIGINT, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
            );
            """);

        // Opportunity
        await db.Database.ExecuteSqlRawAsync("""
            CREATE TABLE IF NOT EXISTS crm.opportunity (
                id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                doc_no TEXT NOT NULL UNIQUE, lead_id BIGINT, partner_id BIGINT,
                opportunity_type TEXT NOT NULL DEFAULT 'SALES',
                sales_stage_id BIGINT, probability_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
                expected_closing_date DATE, expected_value NUMERIC(18,2) NOT NULL DEFAULT 0,
                currency TEXT NOT NULL DEFAULT 'VND', salesperson_id BIGINT, territory_id BIGINT,
                status TEXT NOT NULL DEFAULT 'OPEN', lost_reason_id BIGINT, competitor TEXT,
                quotation_id BIGINT, note TEXT,
                creator_id BIGINT, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
            );
            """);
        await db.Database.ExecuteSqlRawAsync("""
            CREATE TABLE IF NOT EXISTS crm.opportunity_line (
                id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                opportunity_id BIGINT NOT NULL REFERENCES crm.opportunity(id),
                product_id BIGINT NOT NULL, qty NUMERIC(18,4) NOT NULL,
                estimated_rate NUMERIC(18,2), amount NUMERIC(18,2) NOT NULL DEFAULT 0,
                note TEXT
            );
            """);

        // Activity
        await db.Database.ExecuteSqlRawAsync("""
            CREATE TABLE IF NOT EXISTS crm.activity (
                id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                ref_table TEXT NOT NULL, ref_id BIGINT NOT NULL,
                activity_type TEXT NOT NULL, subject TEXT NOT NULL, description TEXT,
                due_date DATE, is_reminder BOOLEAN NOT NULL DEFAULT FALSE,
                assignee_id BIGINT, status TEXT NOT NULL DEFAULT 'OPEN',
                creator_id BIGINT, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), completed_at TIMESTAMPTZ
            );
            """);

        // Seed sales_stage
        await db.Database.ExecuteSqlRawAsync("""
            INSERT INTO crm.sales_stage (code, name, order_no, probability_pct) VALUES
                ('PROSPECTING', 'Prospecting', 1, 10),
                ('QUALIFICATION', 'Qualification', 2, 25),
                ('PROPOSAL', 'Proposal', 3, 50),
                ('NEGOTIATION', 'Negotiation', 4, 75),
                ('CLOSED_WON', 'Won', 5, 100)
            ON CONFLICT (code) DO NOTHING;
            """);

        // Seed lead_source
        await db.Database.ExecuteSqlRawAsync("""
            INSERT INTO crm.lead_source (code, name) VALUES
                ('WEBSITE', 'Website'),
                ('REFERRAL', 'Giới thiệu'),
                ('TRADE_SHOW', 'Hội chợ'),
                ('COLD_CALL', 'Gọi chào hàng'),
                ('ADVERTISEMENT', 'Quảng cáo'),
                ('PARTNER', 'Đối tác')
            ON CONFLICT (code) DO NOTHING;
            """);

        // Quotation link to Opportunity
        await db.Database.ExecuteSqlRawAsync("""
            ALTER TABLE sales.quotation
                ADD COLUMN IF NOT EXISTS opportunity_id BIGINT;
            """);

        // ===== Task 26: Manufacturing Module =====
        await db.Database.ExecuteSqlRawAsync("CREATE SCHEMA IF NOT EXISTS mfg");

        // Manufacturing catalogs
        await db.Database.ExecuteSqlRawAsync("""
            CREATE TABLE IF NOT EXISTS mfg.workstation (
                id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                code TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
                hourly_rate NUMERIC(18,2) NOT NULL DEFAULT 0,
                working_hours_per_day NUMERIC(5,2) NOT NULL DEFAULT 8,
                is_active BOOLEAN NOT NULL DEFAULT TRUE
            );
            """);
        await db.Database.ExecuteSqlRawAsync("""
            CREATE TABLE IF NOT EXISTS mfg.operation (
                id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                code TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
                default_workstation_id BIGINT,
                standard_time_minutes NUMERIC(10,2) NOT NULL DEFAULT 0,
                is_active BOOLEAN NOT NULL DEFAULT TRUE
            );
            """);

        // BOM
        await db.Database.ExecuteSqlRawAsync("""
            CREATE TABLE IF NOT EXISTS mfg.bom (
                id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                doc_no TEXT NOT NULL UNIQUE, product_id BIGINT NOT NULL,
                quantity NUMERIC(18,4) NOT NULL DEFAULT 1,
                is_active BOOLEAN NOT NULL DEFAULT TRUE, is_default BOOLEAN NOT NULL DEFAULT TRUE,
                with_operations BOOLEAN NOT NULL, status TEXT NOT NULL DEFAULT 'DRAFT',
                note TEXT, creator_id BIGINT,
                created_at TIMESTAMPTZ NOT NULL DEFAULT now(), submitted_at TIMESTAMPTZ
            );
            """);
        await db.Database.ExecuteSqlRawAsync("""
            CREATE TABLE IF NOT EXISTS mfg.bom_item (
                id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                bom_id BIGINT NOT NULL REFERENCES mfg.bom(id),
                product_id BIGINT NOT NULL, qty NUMERIC(18,4) NOT NULL,
                rate NUMERIC(18,2), scrap_loss_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
                sub_bom_id BIGINT
            );
            """);
        await db.Database.ExecuteSqlRawAsync("""
            CREATE TABLE IF NOT EXISTS mfg.bom_operation (
                id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                bom_id BIGINT NOT NULL REFERENCES mfg.bom(id),
                operation_id BIGINT NOT NULL, workstation_id BIGINT,
                time_minutes NUMERIC(10,2) NOT NULL, hourly_rate NUMERIC(18,2) NOT NULL
            );
            """);

        // Work Order
        await db.Database.ExecuteSqlRawAsync("""
            CREATE TABLE IF NOT EXISTS mfg.work_order (
                id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                doc_no TEXT NOT NULL UNIQUE, product_id BIGINT NOT NULL, bom_id BIGINT NOT NULL,
                qty NUMERIC(18,4) NOT NULL, produced_qty NUMERIC(18,4) NOT NULL DEFAULT 0,
                wip_warehouse_id BIGINT NOT NULL, fg_warehouse_id BIGINT NOT NULL,
                planned_start_date DATE, planned_end_date DATE,
                status TEXT NOT NULL DEFAULT 'DRAFT', stop_reason TEXT,
                stock_doc_transfer_id BIGINT, stock_doc_manufacture_id BIGINT,
                note TEXT, creator_id BIGINT,
                created_at TIMESTAMPTZ NOT NULL DEFAULT now(), started_at TIMESTAMPTZ, completed_at TIMESTAMPTZ
            );
            """);
        await db.Database.ExecuteSqlRawAsync("""
            CREATE TABLE IF NOT EXISTS mfg.wo_item (
                id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                work_order_id BIGINT NOT NULL REFERENCES mfg.work_order(id),
                product_id BIGINT NOT NULL, required_qty NUMERIC(18,4) NOT NULL,
                transferred_qty NUMERIC(18,4) NOT NULL DEFAULT 0,
                consumed_qty NUMERIC(18,4) NOT NULL DEFAULT 0
            );
            """);
        await db.Database.ExecuteSqlRawAsync("""
            CREATE TABLE IF NOT EXISTS mfg.wo_operation (
                id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                work_order_id BIGINT NOT NULL REFERENCES mfg.work_order(id),
                operation_id BIGINT NOT NULL, workstation_id BIGINT,
                planned_time_minutes NUMERIC(10,2) NOT NULL,
                status TEXT NOT NULL DEFAULT 'PENDING'
            );
            """);

        // Job Card
        await db.Database.ExecuteSqlRawAsync("""
            CREATE TABLE IF NOT EXISTS mfg.job_card (
                id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                work_order_id BIGINT NOT NULL, wo_operation_id BIGINT NOT NULL,
                operation_id BIGINT NOT NULL, workstation_id BIGINT,
                time_log_minutes NUMERIC(10,2) NOT NULL DEFAULT 0,
                completed_qty NUMERIC(18,4) NOT NULL DEFAULT 0,
                status TEXT NOT NULL DEFAULT 'OPEN', note TEXT,
                created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                started_at TIMESTAMPTZ, completed_at TIMESTAMPTZ
            );
            """);

        // Production Plan / MRP
        await db.Database.ExecuteSqlRawAsync("""
            CREATE TABLE IF NOT EXISTS mfg.production_plan (
                id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                doc_no TEXT NOT NULL UNIQUE, plan_date DATE NOT NULL,
                status TEXT NOT NULL DEFAULT 'DRAFT', note TEXT,
                creator_id BIGINT, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), submitted_at TIMESTAMPTZ
            );
            """);
        await db.Database.ExecuteSqlRawAsync("""
            CREATE TABLE IF NOT EXISTS mfg.pp_so (
                production_plan_id BIGINT NOT NULL REFERENCES mfg.production_plan(id),
                sales_order_id BIGINT NOT NULL,
                PRIMARY KEY (production_plan_id, sales_order_id)
            );
            """);
        await db.Database.ExecuteSqlRawAsync("""
            CREATE TABLE IF NOT EXISTS mfg.pp_item (
                id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                production_plan_id BIGINT NOT NULL REFERENCES mfg.production_plan(id),
                product_id BIGINT NOT NULL, planned_qty NUMERIC(18,4) NOT NULL
            );
            """);
        await db.Database.ExecuteSqlRawAsync("""
            CREATE TABLE IF NOT EXISTS mfg.pp_material (
                id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                production_plan_id BIGINT NOT NULL REFERENCES mfg.production_plan(id),
                product_id BIGINT NOT NULL, required_qty NUMERIC(18,4) NOT NULL,
                projected_qty NUMERIC(18,4) NOT NULL, shortage_qty NUMERIC(18,4) NOT NULL,
                is_manufacturable BOOLEAN NOT NULL
            );
            """);

        // Seed operations from core.process
        await db.Database.ExecuteSqlRawAsync("""
            INSERT INTO mfg.operation (code, name, standard_time_minutes)
            SELECT code, name, 0 FROM core.process
            WHERE NOT EXISTS (SELECT 1 FROM mfg.operation WHERE code = core.process.code);
            """);

        // ===== Task 26: Manufacturing additions (description, scrap, finish batches, snapshots) =====
        await db.Database.ExecuteSqlRawAsync("""
            ALTER TABLE mfg.workstation ADD COLUMN IF NOT EXISTS description TEXT;
            """);
        await db.Database.ExecuteSqlRawAsync("""
            ALTER TABLE mfg.operation ADD COLUMN IF NOT EXISTS description TEXT;
            """);
        await db.Database.ExecuteSqlRawAsync("""
            CREATE TABLE IF NOT EXISTS mfg.bom_scrap (
                id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                bom_id BIGINT NOT NULL REFERENCES mfg.bom(id),
                product_id BIGINT NOT NULL, qty NUMERIC(18,4) NOT NULL, rate NUMERIC(18,2)
            );
            """);
        await db.Database.ExecuteSqlRawAsync("""
            ALTER TABLE mfg.work_order
                ADD COLUMN IF NOT EXISTS source_warehouse_id BIGINT,
                ADD COLUMN IF NOT EXISTS production_plan_id BIGINT;
            """);
        await db.Database.ExecuteSqlRawAsync("""
            ALTER TABLE mfg.wo_item ADD COLUMN IF NOT EXISTS rate NUMERIC(18,2) NOT NULL DEFAULT 0;
            """);
        await db.Database.ExecuteSqlRawAsync("""
            ALTER TABLE mfg.wo_operation ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC(18,2) NOT NULL DEFAULT 0;
            """);
        await db.Database.ExecuteSqlRawAsync("""
            CREATE TABLE IF NOT EXISTS mfg.wo_finish_batch (
                id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                work_order_id BIGINT NOT NULL REFERENCES mfg.work_order(id),
                qty NUMERIC(18,4) NOT NULL, cost NUMERIC(18,2) NOT NULL,
                stock_doc_id BIGINT NOT NULL, completed_at TIMESTAMPTZ NOT NULL
            );
            """);
        await db.Database.ExecuteSqlRawAsync("""
            ALTER TABLE mfg.pp_material
                ADD COLUMN IF NOT EXISTS on_hand NUMERIC(18,4) NOT NULL DEFAULT 0,
                ADD COLUMN IF NOT EXISTS ordered NUMERIC(18,4) NOT NULL DEFAULT 0,
                ADD COLUMN IF NOT EXISTS reserved NUMERIC(18,4) NOT NULL DEFAULT 0,
                ADD COLUMN IF NOT EXISTS rate NUMERIC(18,2),
                ADD COLUMN IF NOT EXISTS suggested_supplier_id BIGINT;
            """);
        await db.Database.ExecuteSqlRawAsync("""
            ALTER TABLE purchasing.purchase_request ADD COLUMN IF NOT EXISTS production_plan_id BIGINT;
            """);

        // stock_doc.sub_type: cho phep them MANUFACTURE (WO finish - nhap kho thanh pham)
        await db.Database.ExecuteSqlRawAsync("""
            ALTER TABLE inventory.stock_doc DROP CONSTRAINT IF EXISTS stock_doc_sub_type_check;
            """);
        await db.Database.ExecuteSqlRawAsync("""
            ALTER TABLE inventory.stock_doc ADD CONSTRAINT stock_doc_sub_type_check
                CHECK (sub_type IN (
                    'PURCHASE','CUSTOMER_RETURN','FINISHED_GOODS','RECEIPT_OTHER','RECEIPT_CODE_ADJUST',
                    'SALES','OUTSOURCING','SUPPLIER_RETURN','ISSUE_OTHER','ISSUE_CODE_ADJUST',
                    'INTERNAL_TRANSFER','MANUFACTURE'
                ));
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

        // ===== Task 23: Finance ERPNext upgrade =====
        // 1. GL Entry immutable + reversal
        await db.Database.ExecuteSqlRawAsync("""
            ALTER TABLE finance.gl_entry
                ADD COLUMN IF NOT EXISTS is_cancelled BOOLEAN NOT NULL DEFAULT FALSE,
                ADD COLUMN IF NOT EXISTS remarks TEXT,
                ADD COLUMN IF NOT EXISTS cost_center_id BIGINT,
                ADD COLUMN IF NOT EXISTS against TEXT,
                ADD COLUMN IF NOT EXISTS party_type TEXT,
                ADD COLUMN IF NOT EXISTS party_id BIGINT;
            """);

        // 2/3. Invoice outstanding + Payment Entry fields
        await db.Database.ExecuteSqlRawAsync("""
            ALTER TABLE finance.voucher
                ADD COLUMN IF NOT EXISTS outstanding_amount NUMERIC(18,2),
                ADD COLUMN IF NOT EXISTS due_date DATE,
                ADD COLUMN IF NOT EXISTS payment_status TEXT,
                ADD COLUMN IF NOT EXISTS payment_type TEXT,
                ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(18,2),
                ADD COLUMN IF NOT EXISTS unallocated_amount NUMERIC(18,2),
                ADD COLUMN IF NOT EXISTS amended_from_id BIGINT;
            """);

        // 5. Cost center on voucher_line / gl_entry
        await db.Database.ExecuteSqlRawAsync("""
            ALTER TABLE finance.voucher_line
                ADD COLUMN IF NOT EXISTS cost_center_id BIGINT;
            """);

        // 3. finance.payment_allocation
        await db.Database.ExecuteSqlRawAsync("""
            CREATE TABLE IF NOT EXISTS finance.payment_allocation (
                id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                payment_voucher_id BIGINT NOT NULL REFERENCES finance.voucher(id),
                invoice_voucher_id BIGINT NOT NULL REFERENCES finance.voucher(id),
                allocated_amount NUMERIC(18,2) NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT now()
            );
            """);

        // 5. finance.cost_center (tree)
        await db.Database.ExecuteSqlRawAsync("""
            CREATE TABLE IF NOT EXISTS finance.cost_center (
                id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                code TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
                parent_id BIGINT, is_group BOOLEAN NOT NULL DEFAULT FALSE,
                is_active BOOLEAN NOT NULL DEFAULT TRUE
            );
            """);

        // accounting_policy toggles cho cost center & perpetual inventory
        await db.Database.ExecuteSqlRawAsync("""
            ALTER TABLE finance.accounting_policy
                ADD COLUMN IF NOT EXISTS require_cost_center BOOLEAN NOT NULL DEFAULT FALSE,
                ADD COLUMN IF NOT EXISTS perpetual_inventory BOOLEAN NOT NULL DEFAULT TRUE;
            """);

        // 6b. TT200 financial statement mapping (B01/B02/B03)
        await db.Database.ExecuteSqlRawAsync("""
            CREATE TABLE IF NOT EXISTS finance.fs_mapping (
                id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                statement TEXT NOT NULL,
                item_code TEXT NOT NULL,
                item_name TEXT NOT NULL,
                display_order INT NOT NULL DEFAULT 0,
                indent_level INT NOT NULL DEFAULT 0,
                account_prefixes TEXT[],
                formula_item_codes TEXT[],
                formula_signs INT[],
                sign INT NOT NULL DEFAULT 1,
                is_period_delta BOOLEAN NOT NULL DEFAULT FALSE,
                UNIQUE(statement, item_code)
            );
            """);

        // Seed cost centers
        await db.Database.ExecuteSqlRawAsync("""
            INSERT INTO finance.cost_center (code, name, parent_id, is_group) VALUES
                ('CC', 'Toàn công ty', NULL, TRUE)
            ON CONFLICT (code) DO NOTHING;
            """);
        await db.Database.ExecuteSqlRawAsync("""
            INSERT INTO finance.cost_center (code, name, parent_id, is_group)
            SELECT 'CC-VP', 'Văn phòng', cc.id, FALSE FROM finance.cost_center cc WHERE cc.code = 'CC'
            ON CONFLICT (code) DO NOTHING;
            """);

        // Seed fs_mapping B01-DN (Bảng cân đối kế toán, rút gọn theo TT200)
        await db.Database.ExecuteSqlRawAsync("""
            INSERT INTO finance.fs_mapping (statement, item_code, item_name, display_order, indent_level, account_prefixes, formula_item_codes, formula_signs, sign) VALUES
                ('B01','110','Tiền và các khoản tương đương tiền',11,1,ARRAY['111','112','113'],NULL,NULL,1),
                ('B01','130','Các khoản phải thu ngắn hạn',12,1,ARRAY['131','136','138','141'],NULL,NULL,1),
                ('B01','140','Hàng tồn kho',13,1,ARRAY['151','152','153','154','155','156','157'],NULL,NULL,1),
                ('B01','150','Tài sản ngắn hạn khác',14,1,ARRAY['133'],NULL,NULL,1),
                ('B01','100','TÀI SẢN NGẮN HẠN',10,0,NULL,ARRAY['110','130','140','150'],ARRAY[1,1,1,1],1),
                ('B01','211','Nguyên giá TSCĐ',21,2,ARRAY['211'],NULL,NULL,1),
                ('B01','214','Hao mòn TSCĐ',22,2,ARRAY['214'],NULL,NULL,1),
                ('B01','210','Tài sản cố định',20,1,NULL,ARRAY['211','214'],ARRAY[1,1],1),
                ('B01','240','Chi phí SXKD dở dang dài hạn',23,1,ARRAY['241'],NULL,NULL,1),
                ('B01','200','TÀI SẢN DÀI HẠN',19,0,NULL,ARRAY['210','240'],ARRAY[1,1],1),
                ('B01','270','TỔNG CỘNG TÀI SẢN',30,0,NULL,ARRAY['100','200'],ARRAY[1,1],1),
                ('B01','300','NỢ PHẢI TRẢ',40,0,ARRAY['331','333','334','336','338','341'],NULL,NULL,-1),
                ('B01','400','VỐN CHỦ SỞ HỮU',50,0,ARRAY['411','421'],NULL,NULL,-1),
                ('B01','440','TỔNG CỘNG NGUỒN VỐN',60,0,NULL,ARRAY['300','400'],ARRAY[1,1],1)
            ON CONFLICT (statement, item_code) DO NOTHING;
            """);

        // Seed fs_mapping B02-DN (Báo cáo kết quả kinh doanh, rút gọn theo TT200)
        await db.Database.ExecuteSqlRawAsync("""
            INSERT INTO finance.fs_mapping (statement, item_code, item_name, display_order, indent_level, account_prefixes, formula_item_codes, formula_signs, sign) VALUES
                ('B02','01','Doanh thu bán hàng và cung cấp dịch vụ',1,0,ARRAY['511','512'],NULL,NULL,-1),
                ('B02','02','Các khoản giảm trừ doanh thu',2,0,ARRAY['521'],NULL,NULL,1),
                ('B02','10','Doanh thu thuần',3,0,NULL,ARRAY['01','02'],ARRAY[1,-1],1),
                ('B02','11','Giá vốn hàng bán',4,0,ARRAY['632'],NULL,NULL,1),
                ('B02','20','Lợi nhuận gộp',5,0,NULL,ARRAY['10','11'],ARRAY[1,-1],1),
                ('B02','21','Doanh thu hoạt động tài chính',6,0,ARRAY['515'],NULL,NULL,-1),
                ('B02','22','Chi phí tài chính',7,0,ARRAY['635'],NULL,NULL,1),
                ('B02','25','Chi phí bán hàng',8,0,ARRAY['641'],NULL,NULL,1),
                ('B02','26','Chi phí quản lý doanh nghiệp',9,0,ARRAY['642'],NULL,NULL,1),
                ('B02','30','Lợi nhuận thuần từ hoạt động kinh doanh',10,0,NULL,ARRAY['20','21','22','25','26'],ARRAY[1,1,-1,-1,-1],1),
                ('B02','31','Thu nhập khác',11,0,ARRAY['711'],NULL,NULL,-1),
                ('B02','32','Chi phí khác',12,0,ARRAY['811'],NULL,NULL,1),
                ('B02','40','Lợi nhuận khác',13,0,NULL,ARRAY['31','32'],ARRAY[1,-1],1),
                ('B02','50','Tổng lợi nhuận kế toán trước thuế',14,0,NULL,ARRAY['30','40'],ARRAY[1,1],1),
                ('B02','51','Chi phí thuế TNDN hiện hành',15,0,ARRAY['821'],NULL,NULL,1),
                ('B02','60','Lợi nhuận sau thuế thu nhập doanh nghiệp',16,0,NULL,ARRAY['50','51'],ARRAY[1,-1],1)
            ON CONFLICT (statement, item_code) DO NOTHING;
            """);

        // Seed fs_mapping B03-DN (Lưu chuyển tiền tệ - phương pháp gián tiếp, tối thiểu)
        await db.Database.ExecuteSqlRawAsync("""
            INSERT INTO finance.fs_mapping (statement, item_code, item_name, display_order, indent_level, account_prefixes, formula_item_codes, formula_signs, sign, is_period_delta) VALUES
                ('B03','01','Lợi nhuận trước thuế',1,0,NULL,ARRAY['B02:50'],ARRAY[1],1,FALSE),
                ('B03','02','Khấu hao TSCĐ',2,1,ARRAY['214'],NULL,NULL,-1,TRUE),
                ('B03','03','Tăng/giảm các khoản phải thu',3,1,ARRAY['131','136','138','141'],NULL,NULL,-1,TRUE),
                ('B03','04','Tăng/giảm hàng tồn kho',4,1,ARRAY['151','152','153','154','155','156','157'],NULL,NULL,-1,TRUE),
                ('B03','05','Tăng/giảm các khoản phải trả',5,1,ARRAY['331','333','334','336','338'],NULL,NULL,-1,TRUE),
                ('B03','20','Lưu chuyển tiền thuần từ hoạt động kinh doanh',6,0,NULL,ARRAY['01','02','03','04','05'],ARRAY[1,1,1,1,1],1,FALSE)
            ON CONFLICT (statement, item_code) DO NOTHING;
            """);

        // ===== Task 33: Sales Order v2 (delivered/billed per-line, status TO_DELIVER_AND_BILL/TO_DELIVER/TO_BILL/COMPLETED) =====
        await db.Database.ExecuteSqlRawAsync("""
            ALTER TABLE sales.sales_order_line
                ADD COLUMN IF NOT EXISTS delivered_qty NUMERIC(18,4) NOT NULL DEFAULT 0,
                ADD COLUMN IF NOT EXISTS billed_qty NUMERIC(18,4) NOT NULL DEFAULT 0,
                ADD COLUMN IF NOT EXISTS delivery_date DATE;
            """);

        // Bo CHECK constraint cu cua sales_order.status truoc khi remap du lieu sang model v2
        await db.Database.ExecuteSqlRawAsync("""
            ALTER TABLE sales.sales_order DROP CONSTRAINT IF EXISTS sales_order_status_check;
            """);

        // Backfill delivered/billed cho don da giao/hoan tat truoc khi doi sang status model v2
        await db.Database.ExecuteSqlRawAsync("""
            UPDATE sales.sales_order_line l SET delivered_qty = l.quantity
            FROM sales.sales_order o
            WHERE l.order_id = o.id AND o.status IN ('DELIVERED','COMPLETED') AND l.delivered_qty = 0;
            """);
        await db.Database.ExecuteSqlRawAsync("""
            UPDATE sales.sales_order_line l SET billed_qty = l.quantity
            FROM sales.sales_order o
            WHERE l.order_id = o.id AND o.status = 'COMPLETED' AND l.billed_qty = 0;
            """);

        // Map status cu -> model v2 (DRAFT/TO_DELIVER_AND_BILL/TO_DELIVER/TO_BILL/COMPLETED/ON_HOLD/CLOSED/CANCELLED)
        await db.Database.ExecuteSqlRawAsync("""
            UPDATE sales.sales_order SET status = 'DRAFT' WHERE status = 'APPROVAL_REQUESTED';
            UPDATE sales.sales_order SET status = 'TO_DELIVER_AND_BILL' WHERE status IN ('APPROVED','NOT_DELIVERED');
            UPDATE sales.sales_order SET status = 'TO_BILL' WHERE status = 'DELIVERED';
            """);

        // Them lai CHECK constraint voi danh sach status model v2
        await db.Database.ExecuteSqlRawAsync("""
            ALTER TABLE sales.sales_order ADD CONSTRAINT sales_order_status_check
                CHECK (status IN ('DRAFT','TO_DELIVER_AND_BILL','TO_DELIVER','TO_BILL','COMPLETED','ON_HOLD','CLOSED','CANCELLED'));
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


