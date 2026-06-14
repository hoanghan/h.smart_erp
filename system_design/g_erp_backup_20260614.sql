--
-- PostgreSQL database dump
--

-- Dumped from database version 16.13 (Ubuntu 16.13-0ubuntu0.24.04.1)
-- Dumped by pg_dump version 17.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: core; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA core;


--
-- Name: crm; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA crm;


--
-- Name: finance; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA finance;


--
-- Name: hangfire; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA hangfire;


--
-- Name: inventory; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA inventory;


--
-- Name: mfg; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA mfg;


--
-- Name: purchasing; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA purchasing;


--
-- Name: sales; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA sales;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: app_user; Type: TABLE; Schema: core; Owner: -
--

CREATE TABLE core.app_user (
    id bigint NOT NULL,
    username text NOT NULL,
    password_hash text NOT NULL,
    employee_id bigint,
    is_admin boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: app_user_id_seq; Type: SEQUENCE; Schema: core; Owner: -
--

ALTER TABLE core.app_user ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME core.app_user_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: approval_right; Type: TABLE; Schema: core; Owner: -
--

CREATE TABLE core.approval_right (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    doc_type text NOT NULL
);


--
-- Name: approval_right_id_seq; Type: SEQUENCE; Schema: core; Owner: -
--

ALTER TABLE core.approval_right ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME core.approval_right_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: attachment; Type: TABLE; Schema: core; Owner: -
--

CREATE TABLE core.attachment (
    id bigint NOT NULL,
    ref_table text NOT NULL,
    ref_id bigint NOT NULL,
    file_name text NOT NULL,
    file_path text NOT NULL,
    uploaded_by bigint,
    uploaded_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: attachment_id_seq; Type: SEQUENCE; Schema: core; Owner: -
--

ALTER TABLE core.attachment ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME core.attachment_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: audit_log; Type: TABLE; Schema: core; Owner: -
--

CREATE TABLE core.audit_log (
    id bigint NOT NULL,
    ref_table text NOT NULL,
    ref_id bigint,
    action text NOT NULL,
    detail jsonb,
    acted_by bigint,
    acted_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    user_id bigint,
    username text
);


--
-- Name: audit_log_id_seq; Type: SEQUENCE; Schema: core; Owner: -
--

ALTER TABLE core.audit_log ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME core.audit_log_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: company_info; Type: TABLE; Schema: core; Owner: -
--

CREATE TABLE core.company_info (
    id bigint DEFAULT 1 NOT NULL,
    full_name text NOT NULL,
    foreign_name text,
    trading_name text,
    tax_code text,
    phone text,
    fax text,
    email text,
    website text,
    business_field text,
    address text,
    district text,
    province text,
    legal_rep text,
    chief_accountant text,
    cashier text,
    logo bytea,
    CONSTRAINT company_info_id_check CHECK ((id = 1))
);


--
-- Name: cost_type; Type: TABLE; Schema: core; Owner: -
--

CREATE TABLE core.cost_type (
    id bigint NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    scope text NOT NULL,
    account_code text,
    CONSTRAINT cost_type_scope_check CHECK ((scope = ANY (ARRAY['SALES'::text, 'PURCHASE'::text, 'RECEIPT'::text, 'OUTSOURCING'::text])))
);


--
-- Name: cost_type_id_seq; Type: SEQUENCE; Schema: core; Owner: -
--

ALTER TABLE core.cost_type ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME core.cost_type_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: currency; Type: TABLE; Schema: core; Owner: -
--

CREATE TABLE core.currency (
    code text NOT NULL,
    name text NOT NULL
);


--
-- Name: data_scope; Type: TABLE; Schema: core; Owner: -
--

CREATE TABLE core.data_scope (
    user_id bigint NOT NULL,
    department_id bigint NOT NULL
);


--
-- Name: delivery_method; Type: TABLE; Schema: core; Owner: -
--

CREATE TABLE core.delivery_method (
    id bigint NOT NULL,
    code text NOT NULL,
    name text NOT NULL
);


--
-- Name: delivery_method_id_seq; Type: SEQUENCE; Schema: core; Owner: -
--

ALTER TABLE core.delivery_method ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME core.delivery_method_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: department; Type: TABLE; Schema: core; Owner: -
--

CREATE TABLE core.department (
    id bigint NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    parent_id bigint,
    is_active boolean DEFAULT true NOT NULL
);


--
-- Name: department_id_seq; Type: SEQUENCE; Schema: core; Owner: -
--

ALTER TABLE core.department ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME core.department_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: doc_numbering; Type: TABLE; Schema: core; Owner: -
--

CREATE TABLE core.doc_numbering (
    id bigint NOT NULL,
    doc_type text NOT NULL,
    pattern text NOT NULL,
    last_seq bigint DEFAULT 0 NOT NULL,
    reset_by text DEFAULT 'MONTH'::text NOT NULL,
    last_period text,
    CONSTRAINT doc_numbering_reset_by_check CHECK ((reset_by = ANY (ARRAY['NONE'::text, 'MONTH'::text, 'YEAR'::text])))
);


--
-- Name: doc_numbering_id_seq; Type: SEQUENCE; Schema: core; Owner: -
--

ALTER TABLE core.doc_numbering ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME core.doc_numbering_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: employee; Type: TABLE; Schema: core; Owner: -
--

CREATE TABLE core.employee (
    id bigint NOT NULL,
    code text NOT NULL,
    full_name text NOT NULL,
    department_id bigint,
    position_id bigint,
    phone text,
    email text,
    base_salary numeric(18,2),
    insurance_no text,
    is_active boolean DEFAULT true NOT NULL
);


--
-- Name: employee_id_seq; Type: SEQUENCE; Schema: core; Owner: -
--

ALTER TABLE core.employee ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME core.employee_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: exchange_rate; Type: TABLE; Schema: core; Owner: -
--

CREATE TABLE core.exchange_rate (
    id bigint NOT NULL,
    currency_code text NOT NULL,
    rate_date date NOT NULL,
    rate numeric(18,4) NOT NULL
);


--
-- Name: exchange_rate_id_seq; Type: SEQUENCE; Schema: core; Owner: -
--

ALTER TABLE core.exchange_rate ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME core.exchange_rate_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: job_title; Type: TABLE; Schema: core; Owner: -
--

CREATE TABLE core.job_title (
    id bigint NOT NULL,
    code text NOT NULL,
    name text NOT NULL
);


--
-- Name: job_title_id_seq; Type: SEQUENCE; Schema: core; Owner: -
--

ALTER TABLE core.job_title ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME core.job_title_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: note; Type: TABLE; Schema: core; Owner: -
--

CREATE TABLE core.note (
    id bigint NOT NULL,
    ref_table text NOT NULL,
    ref_id bigint NOT NULL,
    content text NOT NULL,
    created_by bigint,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: note_id_seq; Type: SEQUENCE; Schema: core; Owner: -
--

ALTER TABLE core.note ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME core.note_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: partner; Type: TABLE; Schema: core; Owner: -
--

CREATE TABLE core.partner (
    id bigint NOT NULL,
    code text NOT NULL,
    tax_code text,
    short_name text NOT NULL,
    full_name text,
    is_customer boolean DEFAULT false NOT NULL,
    is_supplier boolean DEFAULT false NOT NULL,
    customer_group text,
    source text,
    ranking text,
    country text,
    province text,
    district text,
    address text,
    phone text,
    hotline text,
    fax text,
    email text,
    website text,
    payment_method_id bigint,
    delivery_method_id bigint,
    salesperson_id bigint,
    credit_limit numeric(18,2),
    credit_days integer,
    is_active boolean DEFAULT true NOT NULL
);


--
-- Name: partner_address; Type: TABLE; Schema: core; Owner: -
--

CREATE TABLE core.partner_address (
    id bigint NOT NULL,
    partner_id bigint NOT NULL,
    address text NOT NULL,
    addr_type text DEFAULT 'DELIVERY'::text NOT NULL,
    CONSTRAINT partner_address_addr_type_check CHECK ((addr_type = ANY (ARRAY['DELIVERY'::text, 'BILLING'::text, 'OTHER'::text])))
);


--
-- Name: partner_address_id_seq; Type: SEQUENCE; Schema: core; Owner: -
--

ALTER TABLE core.partner_address ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME core.partner_address_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: partner_bank_account; Type: TABLE; Schema: core; Owner: -
--

CREATE TABLE core.partner_bank_account (
    id bigint NOT NULL,
    partner_id bigint NOT NULL,
    bank_name text NOT NULL,
    account_no text NOT NULL,
    holder text,
    branch text
);


--
-- Name: partner_bank_account_id_seq; Type: SEQUENCE; Schema: core; Owner: -
--

ALTER TABLE core.partner_bank_account ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME core.partner_bank_account_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: partner_contact; Type: TABLE; Schema: core; Owner: -
--

CREATE TABLE core.partner_contact (
    id bigint NOT NULL,
    partner_id bigint NOT NULL,
    name text NOT NULL,
    title text,
    phone text,
    email text,
    note text
);


--
-- Name: partner_contact_id_seq; Type: SEQUENCE; Schema: core; Owner: -
--

ALTER TABLE core.partner_contact ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME core.partner_contact_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: partner_id_seq; Type: SEQUENCE; Schema: core; Owner: -
--

ALTER TABLE core.partner ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME core.partner_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: partner_sales_cost; Type: TABLE; Schema: core; Owner: -
--

CREATE TABLE core.partner_sales_cost (
    id bigint NOT NULL,
    partner_id bigint NOT NULL,
    cost_type_id bigint NOT NULL,
    payee_id bigint NOT NULL,
    rate_pct numeric(9,4),
    vat_pct numeric(5,2)
);


--
-- Name: partner_sales_cost_id_seq; Type: SEQUENCE; Schema: core; Owner: -
--

ALTER TABLE core.partner_sales_cost ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME core.partner_sales_cost_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: payment_method; Type: TABLE; Schema: core; Owner: -
--

CREATE TABLE core.payment_method (
    id bigint NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    due_days integer DEFAULT 0 NOT NULL
);


--
-- Name: payment_method_id_seq; Type: SEQUENCE; Schema: core; Owner: -
--

ALTER TABLE core.payment_method ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME core.payment_method_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: payment_terms_template; Type: TABLE; Schema: core; Owner: -
--

CREATE TABLE core.payment_terms_template (
    id bigint NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);


--
-- Name: payment_terms_template_id_seq; Type: SEQUENCE; Schema: core; Owner: -
--

ALTER TABLE core.payment_terms_template ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME core.payment_terms_template_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: payment_terms_template_line; Type: TABLE; Schema: core; Owner: -
--

CREATE TABLE core.payment_terms_template_line (
    id bigint NOT NULL,
    template_id bigint NOT NULL,
    pct numeric(5,2) NOT NULL,
    days_after integer NOT NULL,
    note text
);


--
-- Name: payment_terms_template_line_id_seq; Type: SEQUENCE; Schema: core; Owner: -
--

ALTER TABLE core.payment_terms_template_line ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME core.payment_terms_template_line_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: permission; Type: TABLE; Schema: core; Owner: -
--

CREATE TABLE core.permission (
    id bigint NOT NULL,
    grantee_type text NOT NULL,
    grantee_id bigint NOT NULL,
    subject_type text NOT NULL,
    subject_code text NOT NULL,
    action text NOT NULL,
    CONSTRAINT permission_action_check CHECK ((action = ANY (ARRAY['VIEW'::text, 'CREATE'::text, 'UPDATE'::text, 'DELETE'::text, 'APPROVE'::text, 'POST'::text, 'UNLOCK'::text]))),
    CONSTRAINT permission_grantee_type_check CHECK ((grantee_type = ANY (ARRAY['USER'::text, 'GROUP'::text]))),
    CONSTRAINT permission_subject_type_check CHECK ((subject_type = ANY (ARRAY['FUNCTION'::text, 'CATALOG'::text, 'DOCUMENT'::text, 'OPERATION'::text, 'REPORT'::text])))
);


--
-- Name: permission_id_seq; Type: SEQUENCE; Schema: core; Owner: -
--

ALTER TABLE core.permission ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME core.permission_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: process; Type: TABLE; Schema: core; Owner: -
--

CREATE TABLE core.process (
    id bigint NOT NULL,
    code text NOT NULL,
    name text NOT NULL
);


--
-- Name: process_id_seq; Type: SEQUENCE; Schema: core; Owner: -
--

ALTER TABLE core.process ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME core.process_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: product; Type: TABLE; Schema: core; Owner: -
--

CREATE TABLE core.product (
    id bigint NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    product_type text DEFAULT 'GOODS'::text NOT NULL,
    group_id bigint,
    uom_id bigint NOT NULL,
    is_kit boolean DEFAULT false NOT NULL,
    price_weight numeric(9,4),
    barcode text,
    qr_code text,
    spec text,
    min_stock numeric(18,4),
    is_active boolean DEFAULT true NOT NULL,
    CONSTRAINT product_product_type_check CHECK ((product_type = ANY (ARRAY['GOODS'::text, 'SERVICE'::text, 'FINISHED'::text, 'MATERIAL'::text, 'TOOL'::text])))
);


--
-- Name: product_bom; Type: TABLE; Schema: core; Owner: -
--

CREATE TABLE core.product_bom (
    id bigint NOT NULL,
    kit_product_id bigint NOT NULL,
    component_product_id bigint NOT NULL,
    quantity numeric(18,4) NOT NULL
);


--
-- Name: product_bom_id_seq; Type: SEQUENCE; Schema: core; Owner: -
--

ALTER TABLE core.product_bom ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME core.product_bom_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: product_group; Type: TABLE; Schema: core; Owner: -
--

CREATE TABLE core.product_group (
    id bigint NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    parent_id bigint
);


--
-- Name: product_group_id_seq; Type: SEQUENCE; Schema: core; Owner: -
--

ALTER TABLE core.product_group ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME core.product_group_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: product_id_seq; Type: SEQUENCE; Schema: core; Owner: -
--

ALTER TABLE core.product ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME core.product_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: task; Type: TABLE; Schema: core; Owner: -
--

CREATE TABLE core.task (
    id bigint NOT NULL,
    ref_table text,
    ref_id bigint,
    title text NOT NULL,
    content text,
    assignee_id bigint,
    due_date date,
    status text DEFAULT 'OPEN'::text NOT NULL,
    CONSTRAINT task_status_check CHECK ((status = ANY (ARRAY['OPEN'::text, 'DOING'::text, 'DONE'::text, 'CANCELLED'::text])))
);


--
-- Name: task_id_seq; Type: SEQUENCE; Schema: core; Owner: -
--

ALTER TABLE core.task ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME core.task_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: tax_charge_template; Type: TABLE; Schema: core; Owner: -
--

CREATE TABLE core.tax_charge_template (
    id bigint NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);


--
-- Name: tax_charge_template_id_seq; Type: SEQUENCE; Schema: core; Owner: -
--

ALTER TABLE core.tax_charge_template ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME core.tax_charge_template_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: tax_charge_template_line; Type: TABLE; Schema: core; Owner: -
--

CREATE TABLE core.tax_charge_template_line (
    id bigint NOT NULL,
    template_id bigint NOT NULL,
    charge_type text DEFAULT 'ON_NET_TOTAL'::text NOT NULL,
    rate_pct numeric(5,2),
    fixed_amount numeric(18,2),
    account_code text,
    note text
);


--
-- Name: tax_charge_template_line_id_seq; Type: SEQUENCE; Schema: core; Owner: -
--

ALTER TABLE core.tax_charge_template_line ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME core.tax_charge_template_line_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: uom; Type: TABLE; Schema: core; Owner: -
--

CREATE TABLE core.uom (
    id bigint NOT NULL,
    code text NOT NULL,
    name text NOT NULL
);


--
-- Name: uom_conversion; Type: TABLE; Schema: core; Owner: -
--

CREATE TABLE core.uom_conversion (
    id bigint NOT NULL,
    from_uom_id bigint NOT NULL,
    to_uom_id bigint NOT NULL,
    factor numeric(18,6) NOT NULL
);


--
-- Name: uom_conversion_id_seq; Type: SEQUENCE; Schema: core; Owner: -
--

ALTER TABLE core.uom_conversion ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME core.uom_conversion_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: uom_id_seq; Type: SEQUENCE; Schema: core; Owner: -
--

ALTER TABLE core.uom ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME core.uom_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: user_group; Type: TABLE; Schema: core; Owner: -
--

CREATE TABLE core.user_group (
    id bigint NOT NULL,
    code text NOT NULL,
    name text NOT NULL
);


--
-- Name: user_group_id_seq; Type: SEQUENCE; Schema: core; Owner: -
--

ALTER TABLE core.user_group ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME core.user_group_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: user_group_member; Type: TABLE; Schema: core; Owner: -
--

CREATE TABLE core.user_group_member (
    group_id bigint NOT NULL,
    user_id bigint NOT NULL
);


--
-- Name: warehouse; Type: TABLE; Schema: core; Owner: -
--

CREATE TABLE core.warehouse (
    id bigint NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    is_outsourcing boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    parent_id bigint
);


--
-- Name: warehouse_id_seq; Type: SEQUENCE; Schema: core; Owner: -
--

ALTER TABLE core.warehouse ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME core.warehouse_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: warehouse_location; Type: TABLE; Schema: core; Owner: -
--

CREATE TABLE core.warehouse_location (
    id bigint NOT NULL,
    warehouse_id bigint NOT NULL,
    code text NOT NULL,
    name text
);


--
-- Name: warehouse_location_id_seq; Type: SEQUENCE; Schema: core; Owner: -
--

ALTER TABLE core.warehouse_location ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME core.warehouse_location_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: wf_transition_log; Type: TABLE; Schema: core; Owner: -
--

CREATE TABLE core.wf_transition_log (
    id bigint NOT NULL,
    ref_table text NOT NULL,
    ref_id bigint NOT NULL,
    from_status text,
    to_status text NOT NULL,
    reason text,
    acted_by bigint,
    acted_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: wf_transition_log_id_seq; Type: SEQUENCE; Schema: core; Owner: -
--

ALTER TABLE core.wf_transition_log ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME core.wf_transition_log_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: work_position; Type: TABLE; Schema: core; Owner: -
--

CREATE TABLE core.work_position (
    id bigint NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    department_id bigint,
    job_title_id bigint
);


--
-- Name: work_position_id_seq; Type: SEQUENCE; Schema: core; Owner: -
--

ALTER TABLE core.work_position ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME core.work_position_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: activity; Type: TABLE; Schema: crm; Owner: -
--

CREATE TABLE crm.activity (
    id bigint NOT NULL,
    ref_table text NOT NULL,
    ref_id bigint NOT NULL,
    activity_type text NOT NULL,
    subject text NOT NULL,
    description text,
    due_date date,
    is_reminder boolean DEFAULT false NOT NULL,
    assignee_id bigint,
    status text DEFAULT 'OPEN'::text NOT NULL,
    creator_id bigint,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone
);


--
-- Name: activity_id_seq; Type: SEQUENCE; Schema: crm; Owner: -
--

ALTER TABLE crm.activity ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME crm.activity_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: campaign; Type: TABLE; Schema: crm; Owner: -
--

CREATE TABLE crm.campaign (
    id bigint NOT NULL,
    doc_no text NOT NULL,
    name text NOT NULL,
    campaign_type text,
    budget numeric(18,2) DEFAULT 0 NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    status text DEFAULT 'DRAFT'::text NOT NULL,
    note text,
    creator_id bigint,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: campaign_id_seq; Type: SEQUENCE; Schema: crm; Owner: -
--

ALTER TABLE crm.campaign ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME crm.campaign_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: lead; Type: TABLE; Schema: crm; Owner: -
--

CREATE TABLE crm.lead (
    id bigint NOT NULL,
    doc_no text NOT NULL,
    first_name text NOT NULL,
    last_name text,
    company_name text,
    job_title text,
    phone text,
    mobile_no text,
    email text,
    lead_source_id bigint,
    campaign_id bigint,
    territory_id bigint,
    salesperson_id bigint,
    status text DEFAULT 'LEAD'::text NOT NULL,
    lost_reason text,
    partner_id bigint,
    opportunity_id bigint,
    note text,
    creator_id bigint,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: lead_id_seq; Type: SEQUENCE; Schema: crm; Owner: -
--

ALTER TABLE crm.lead ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME crm.lead_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: lead_source; Type: TABLE; Schema: crm; Owner: -
--

CREATE TABLE crm.lead_source (
    id bigint NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);


--
-- Name: lead_source_id_seq; Type: SEQUENCE; Schema: crm; Owner: -
--

ALTER TABLE crm.lead_source ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME crm.lead_source_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: opportunity; Type: TABLE; Schema: crm; Owner: -
--

CREATE TABLE crm.opportunity (
    id bigint NOT NULL,
    doc_no text NOT NULL,
    lead_id bigint,
    partner_id bigint,
    opportunity_type text DEFAULT 'SALES'::text NOT NULL,
    sales_stage_id bigint,
    probability_pct numeric(5,2) DEFAULT 0 NOT NULL,
    expected_closing_date date,
    expected_value numeric(18,2) DEFAULT 0 NOT NULL,
    currency text DEFAULT 'VND'::text NOT NULL,
    salesperson_id bigint,
    territory_id bigint,
    status text DEFAULT 'OPEN'::text NOT NULL,
    lost_reason_id bigint,
    competitor text,
    quotation_id bigint,
    note text,
    creator_id bigint,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: opportunity_id_seq; Type: SEQUENCE; Schema: crm; Owner: -
--

ALTER TABLE crm.opportunity ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME crm.opportunity_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: opportunity_line; Type: TABLE; Schema: crm; Owner: -
--

CREATE TABLE crm.opportunity_line (
    id bigint NOT NULL,
    opportunity_id bigint NOT NULL,
    product_id bigint NOT NULL,
    qty numeric(18,4) NOT NULL,
    estimated_rate numeric(18,2),
    amount numeric(18,2) DEFAULT 0 NOT NULL,
    note text
);


--
-- Name: opportunity_line_id_seq; Type: SEQUENCE; Schema: crm; Owner: -
--

ALTER TABLE crm.opportunity_line ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME crm.opportunity_line_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: sales_stage; Type: TABLE; Schema: crm; Owner: -
--

CREATE TABLE crm.sales_stage (
    id bigint NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    order_no integer DEFAULT 0 NOT NULL,
    probability_pct numeric(5,2) DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);


--
-- Name: sales_stage_id_seq; Type: SEQUENCE; Schema: crm; Owner: -
--

ALTER TABLE crm.sales_stage ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME crm.sales_stage_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: account; Type: TABLE; Schema: finance; Owner: -
--

CREATE TABLE finance.account (
    id bigint NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    parent_id bigint,
    account_type text DEFAULT 'NORMAL'::text NOT NULL,
    object_category_id bigint,
    balance_detail text DEFAULT 'NONE'::text NOT NULL,
    balance_side text DEFAULT 'GREATER'::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    CONSTRAINT account_account_type_check CHECK ((account_type = ANY (ARRAY['ASSET'::text, 'LIABILITY'::text, 'EQUITY'::text, 'REVENUE'::text, 'EXPENSE'::text, 'OFF_BALANCE'::text, 'NORMAL'::text]))),
    CONSTRAINT account_balance_detail_check CHECK ((balance_detail = ANY (ARRAY['NONE'::text, 'OBJECT'::text, 'OBJECT_FX'::text, 'OBJECT_QTY'::text]))),
    CONSTRAINT account_balance_side_check CHECK ((balance_side = ANY (ARRAY['NONE'::text, 'DEBIT'::text, 'CREDIT'::text, 'GREATER'::text, 'BOTH'::text])))
);


--
-- Name: account_id_seq; Type: SEQUENCE; Schema: finance; Owner: -
--

ALTER TABLE finance.account ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME finance.account_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: accounting_policy; Type: TABLE; Schema: finance; Owner: -
--

CREATE TABLE finance.accounting_policy (
    id bigint DEFAULT 1 NOT NULL,
    base_currency text DEFAULT 'VND'::text NOT NULL,
    accounting_regime text,
    fiscal_start_month integer DEFAULT 1 NOT NULL,
    inventory_costing text DEFAULT 'AVG'::text NOT NULL,
    first_period_id bigint,
    options jsonb DEFAULT '{}'::jsonb NOT NULL,
    require_cost_center boolean DEFAULT false NOT NULL,
    perpetual_inventory boolean DEFAULT true NOT NULL,
    CONSTRAINT accounting_policy_id_check CHECK ((id = 1)),
    CONSTRAINT accounting_policy_inventory_costing_check CHECK ((inventory_costing = ANY (ARRAY['AVG'::text, 'FIFO'::text, 'SPECIFIC'::text])))
);


--
-- Name: asset_alloc_rule; Type: TABLE; Schema: finance; Owner: -
--

CREATE TABLE finance.asset_alloc_rule (
    id bigint NOT NULL,
    asset_id bigint NOT NULL,
    account_id bigint NOT NULL,
    object_type text,
    object_id bigint,
    factor numeric(9,4) DEFAULT 1 NOT NULL,
    apply_from_period_id bigint,
    apply_future boolean DEFAULT true NOT NULL
);


--
-- Name: asset_alloc_rule_id_seq; Type: SEQUENCE; Schema: finance; Owner: -
--

ALTER TABLE finance.asset_alloc_rule ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME finance.asset_alloc_rule_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: asset_group; Type: TABLE; Schema: finance; Owner: -
--

CREATE TABLE finance.asset_group (
    id bigint NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    cost_account_id bigint,
    dep_account_id bigint
);


--
-- Name: asset_group_id_seq; Type: SEQUENCE; Schema: finance; Owner: -
--

ALTER TABLE finance.asset_group ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME finance.asset_group_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: asset_report; Type: TABLE; Schema: finance; Owner: -
--

CREATE TABLE finance.asset_report (
    id bigint NOT NULL,
    asset_id bigint NOT NULL,
    report_date date NOT NULL,
    report_type text NOT NULL,
    asset_operation text,
    dep_method text NOT NULL,
    dep_start_rule text,
    original_cost numeric(18,2),
    remaining_months integer,
    monthly_dep numeric(18,2),
    status text DEFAULT 'DRAFT'::text NOT NULL,
    CONSTRAINT asset_report_dep_method_check CHECK ((dep_method = ANY (ARRAY['STRAIGHT_LINE'::text, 'DECLINING'::text, 'OUTPUT'::text, 'WEAR'::text, 'NONE'::text]))),
    CONSTRAINT asset_report_dep_start_rule_check CHECK ((dep_start_rule = ANY (ARRAY['PERIOD_START'::text, 'REPORT_DATE'::text, 'NEXT_PERIOD'::text]))),
    CONSTRAINT asset_report_report_type_check CHECK ((report_type = ANY (ARRAY['INCREASE'::text, 'DECREASE'::text, 'ADJUST'::text]))),
    CONSTRAINT asset_report_status_check CHECK ((status = ANY (ARRAY['DRAFT'::text, 'APPLIED'::text, 'CLOSED'::text])))
);


--
-- Name: asset_report_id_seq; Type: SEQUENCE; Schema: finance; Owner: -
--

ALTER TABLE finance.asset_report ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME finance.asset_report_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: bank_fee; Type: TABLE; Schema: finance; Owner: -
--

CREATE TABLE finance.bank_fee (
    id bigint NOT NULL,
    voucher_id bigint NOT NULL,
    amount numeric(18,2) NOT NULL,
    vat_pct numeric(5,2),
    description text
);


--
-- Name: bank_fee_id_seq; Type: SEQUENCE; Schema: finance; Owner: -
--

ALTER TABLE finance.bank_fee ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME finance.bank_fee_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: business_operation; Type: TABLE; Schema: finance; Owner: -
--

CREATE TABLE finance.business_operation (
    id bigint NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    voucher_type text NOT NULL,
    template jsonb NOT NULL
);


--
-- Name: business_operation_id_seq; Type: SEQUENCE; Schema: finance; Owner: -
--

ALTER TABLE finance.business_operation ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME finance.business_operation_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: cash_fund; Type: TABLE; Schema: finance; Owner: -
--

CREATE TABLE finance.cash_fund (
    id bigint NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    fund_type text NOT NULL,
    account_id bigint NOT NULL,
    bank_name text,
    account_no text,
    currency_code text DEFAULT 'VND'::text NOT NULL,
    CONSTRAINT cash_fund_fund_type_check CHECK ((fund_type = ANY (ARRAY['CASH'::text, 'BANK'::text])))
);


--
-- Name: cash_fund_id_seq; Type: SEQUENCE; Schema: finance; Owner: -
--

ALTER TABLE finance.cash_fund ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME finance.cash_fund_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: cit_declaration; Type: TABLE; Schema: finance; Owner: -
--

CREATE TABLE finance.cit_declaration (
    id bigint NOT NULL,
    decl_type text NOT NULL,
    fiscal_year integer NOT NULL,
    quarter integer,
    data jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT cit_declaration_decl_type_check CHECK ((decl_type = ANY (ARRAY['PROVISIONAL'::text, 'FINAL'::text])))
);


--
-- Name: cit_declaration_id_seq; Type: SEQUENCE; Schema: finance; Owner: -
--

ALTER TABLE finance.cit_declaration ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME finance.cit_declaration_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: cost_center; Type: TABLE; Schema: finance; Owner: -
--

CREATE TABLE finance.cost_center (
    id bigint NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    parent_id bigint,
    is_group boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);


--
-- Name: cost_center_id_seq; Type: SEQUENCE; Schema: finance; Owner: -
--

ALTER TABLE finance.cost_center ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME finance.cost_center_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: costing_object; Type: TABLE; Schema: finance; Owner: -
--

CREATE TABLE finance.costing_object (
    id bigint NOT NULL,
    process_id bigint NOT NULL,
    period_id bigint NOT NULL,
    total_cost numeric(18,2),
    total_qty numeric(18,4),
    unit_cost numeric(18,4),
    status text DEFAULT 'OPEN'::text NOT NULL,
    CONSTRAINT costing_object_status_check CHECK ((status = ANY (ARRAY['OPEN'::text, 'CALCULATED'::text, 'CLOSED'::text])))
);


--
-- Name: costing_object_id_seq; Type: SEQUENCE; Schema: finance; Owner: -
--

ALTER TABLE finance.costing_object ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME finance.costing_object_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: depreciation_entry; Type: TABLE; Schema: finance; Owner: -
--

CREATE TABLE finance.depreciation_entry (
    id bigint NOT NULL,
    asset_id bigint NOT NULL,
    period_id bigint NOT NULL,
    amount numeric(18,2) NOT NULL,
    voucher_id bigint,
    is_valid boolean DEFAULT true NOT NULL
);


--
-- Name: depreciation_entry_id_seq; Type: SEQUENCE; Schema: finance; Owner: -
--

ALTER TABLE finance.depreciation_entry ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME finance.depreciation_entry_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: fiscal_period; Type: TABLE; Schema: finance; Owner: -
--

CREATE TABLE finance.fiscal_period (
    id bigint NOT NULL,
    fiscal_year integer NOT NULL,
    period_no integer NOT NULL,
    date_from date NOT NULL,
    date_to date NOT NULL,
    status text DEFAULT 'OPEN'::text NOT NULL,
    CONSTRAINT fiscal_period_period_no_check CHECK (((period_no >= 1) AND (period_no <= 12))),
    CONSTRAINT fiscal_period_status_check CHECK ((status = ANY (ARRAY['OPEN'::text, 'CLOSED'::text])))
);


--
-- Name: fiscal_period_id_seq; Type: SEQUENCE; Schema: finance; Owner: -
--

ALTER TABLE finance.fiscal_period ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME finance.fiscal_period_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: fixed_asset; Type: TABLE; Schema: finance; Owner: -
--

CREATE TABLE finance.fixed_asset (
    id bigint NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    group_id bigint,
    department_id bigint,
    start_use_date date,
    is_tool boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);


--
-- Name: fixed_asset_id_seq; Type: SEQUENCE; Schema: finance; Owner: -
--

ALTER TABLE finance.fixed_asset ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME finance.fixed_asset_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: fs_mapping; Type: TABLE; Schema: finance; Owner: -
--

CREATE TABLE finance.fs_mapping (
    id bigint NOT NULL,
    statement text NOT NULL,
    item_code text NOT NULL,
    item_name text NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    indent_level integer DEFAULT 0 NOT NULL,
    account_prefixes text[],
    formula_item_codes text[],
    formula_signs integer[],
    sign integer DEFAULT 1 NOT NULL,
    is_period_delta boolean DEFAULT false NOT NULL
);


--
-- Name: fs_mapping_id_seq; Type: SEQUENCE; Schema: finance; Owner: -
--

ALTER TABLE finance.fs_mapping ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME finance.fs_mapping_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: gl_entry; Type: TABLE; Schema: finance; Owner: -
--

CREATE TABLE finance.gl_entry (
    id bigint NOT NULL,
    voucher_id bigint NOT NULL,
    period_id bigint NOT NULL,
    posting_date date NOT NULL,
    account_id bigint NOT NULL,
    side text NOT NULL,
    object_type text,
    object_id bigint,
    currency_code text DEFAULT 'VND'::text NOT NULL,
    amount_fc numeric(18,2) DEFAULT 0 NOT NULL,
    amount numeric(18,2) NOT NULL,
    quantity numeric(18,4),
    warehouse_id bigint,
    product_id bigint,
    lot_id bigint,
    description text,
    exchange_rate numeric(18,6),
    is_cancelled boolean DEFAULT false NOT NULL,
    remarks text,
    cost_center_id bigint,
    against text,
    party_type text,
    party_id bigint,
    fc_amount numeric(18,2) DEFAULT 0,
    voucher_line_id bigint,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT gl_entry_side_check CHECK ((side = ANY (ARRAY['DEBIT'::text, 'CREDIT'::text])))
);


--
-- Name: gl_entry_id_seq; Type: SEQUENCE; Schema: finance; Owner: -
--

ALTER TABLE finance.gl_entry ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME finance.gl_entry_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: lerp_voucher; Type: TABLE; Schema: finance; Owner: -
--

CREATE TABLE finance.lerp_voucher (
    id bigint NOT NULL,
    voucher_type text NOT NULL,
    source_table text NOT NULL,
    source_id bigint NOT NULL,
    ref_no text,
    partner_id bigint,
    amount numeric(18,2),
    status text DEFAULT 'PENDING'::text NOT NULL,
    voucher_id bigint,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT lerp_voucher_status_check CHECK ((status = ANY (ARRAY['PENDING'::text, 'GENERATED'::text, 'POSTED'::text, 'DELETED'::text]))),
    CONSTRAINT lerp_voucher_voucher_type_check CHECK ((voucher_type = ANY (ARRAY['YCT'::text, 'YCC'::text, 'BAN_HANG'::text, 'HANG_TRA_LAI'::text, 'PHIEU_XUAT'::text, 'MUA_HANG'::text, 'PHIEU_NHAP'::text, 'TRA_HANG_NCC'::text, 'XUAT_KHO'::text, 'NHAP_KHO'::text, 'CHUYEN_KHO'::text, 'PGC'::text])))
);


--
-- Name: lerp_voucher_id_seq; Type: SEQUENCE; Schema: finance; Owner: -
--

ALTER TABLE finance.lerp_voucher ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME finance.lerp_voucher_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: object_category; Type: TABLE; Schema: finance; Owner: -
--

CREATE TABLE finance.object_category (
    id bigint NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    source_table text
);


--
-- Name: object_category_id_seq; Type: SEQUENCE; Schema: finance; Owner: -
--

ALTER TABLE finance.object_category ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME finance.object_category_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: opening_balance; Type: TABLE; Schema: finance; Owner: -
--

CREATE TABLE finance.opening_balance (
    id bigint NOT NULL,
    period_id bigint NOT NULL,
    account_id bigint NOT NULL,
    object_type text,
    object_id bigint,
    currency_code text,
    warehouse_id bigint,
    product_id bigint,
    debit_fc numeric(18,2) DEFAULT 0,
    credit_fc numeric(18,2) DEFAULT 0,
    debit numeric(18,2) DEFAULT 0,
    credit numeric(18,2) DEFAULT 0,
    quantity numeric(18,4)
);


--
-- Name: opening_balance_id_seq; Type: SEQUENCE; Schema: finance; Owner: -
--

ALTER TABLE finance.opening_balance ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME finance.opening_balance_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: outbox_event; Type: TABLE; Schema: finance; Owner: -
--

CREATE TABLE finance.outbox_event (
    id bigint NOT NULL,
    event_type text NOT NULL,
    source_table text NOT NULL,
    source_id bigint NOT NULL,
    payload jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    processed_at timestamp with time zone
);


--
-- Name: outbox_event_id_seq; Type: SEQUENCE; Schema: finance; Owner: -
--

ALTER TABLE finance.outbox_event ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME finance.outbox_event_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: payment_allocation; Type: TABLE; Schema: finance; Owner: -
--

CREATE TABLE finance.payment_allocation (
    id bigint NOT NULL,
    payment_voucher_id bigint NOT NULL,
    invoice_voucher_id bigint NOT NULL,
    allocated_amount numeric(18,2) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: payment_allocation_id_seq; Type: SEQUENCE; Schema: finance; Owner: -
--

ALTER TABLE finance.payment_allocation ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME finance.payment_allocation_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: period_closing; Type: TABLE; Schema: finance; Owner: -
--

CREATE TABLE finance.period_closing (
    id bigint NOT NULL,
    period_id bigint NOT NULL,
    step text NOT NULL,
    executed_at timestamp with time zone,
    executed_by bigint,
    status text DEFAULT 'PENDING'::text NOT NULL,
    detail jsonb,
    CONSTRAINT period_closing_status_check CHECK ((status = ANY (ARRAY['PENDING'::text, 'DONE'::text, 'ERROR'::text]))),
    CONSTRAINT period_closing_step_check CHECK ((step = ANY (ARRAY['DEPRECIATION'::text, 'PREPAID_ALLOC'::text, 'RECALC_COGS'::text, 'VAT_DEDUCTION'::text, 'PURCHASE_COST_ALLOC'::text, 'FX_REVALUATION'::text, 'CLOSING_ENTRIES'::text, 'CARRY_FORWARD'::text])))
);


--
-- Name: period_closing_id_seq; Type: SEQUENCE; Schema: finance; Owner: -
--

ALTER TABLE finance.period_closing ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME finance.period_closing_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: prepaid_alloc_entry; Type: TABLE; Schema: finance; Owner: -
--

CREATE TABLE finance.prepaid_alloc_entry (
    id bigint NOT NULL,
    card_id bigint NOT NULL,
    period_id bigint NOT NULL,
    amount numeric(18,2) NOT NULL,
    voucher_id bigint,
    is_valid boolean DEFAULT true NOT NULL
);


--
-- Name: prepaid_alloc_entry_id_seq; Type: SEQUENCE; Schema: finance; Owner: -
--

ALTER TABLE finance.prepaid_alloc_entry ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME finance.prepaid_alloc_entry_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: prepaid_alloc_rule; Type: TABLE; Schema: finance; Owner: -
--

CREATE TABLE finance.prepaid_alloc_rule (
    id bigint NOT NULL,
    card_id bigint NOT NULL,
    account_id bigint NOT NULL,
    object_type text,
    object_id bigint,
    factor numeric(9,4) DEFAULT 1 NOT NULL
);


--
-- Name: prepaid_alloc_rule_id_seq; Type: SEQUENCE; Schema: finance; Owner: -
--

ALTER TABLE finance.prepaid_alloc_rule ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME finance.prepaid_alloc_rule_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: prepaid_card; Type: TABLE; Schema: finance; Owner: -
--

CREATE TABLE finance.prepaid_card (
    id bigint NOT NULL,
    prepaid_id bigint NOT NULL,
    source_type text NOT NULL,
    alloc_method text NOT NULL,
    total_amount numeric(18,2) NOT NULL,
    alloc_months integer,
    status text DEFAULT 'ACTIVE'::text NOT NULL,
    CONSTRAINT prepaid_card_alloc_method_check CHECK ((alloc_method = ANY (ARRAY['TIME'::text, 'OUTPUT'::text]))),
    CONSTRAINT prepaid_card_source_type_check CHECK ((source_type = ANY (ARRAY['TRANSACTION'::text, 'OPENING'::text]))),
    CONSTRAINT prepaid_card_status_check CHECK ((status = ANY (ARRAY['ACTIVE'::text, 'DONE'::text, 'CANCELLED'::text])))
);


--
-- Name: prepaid_card_id_seq; Type: SEQUENCE; Schema: finance; Owner: -
--

ALTER TABLE finance.prepaid_card ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME finance.prepaid_card_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: prepaid_expense; Type: TABLE; Schema: finance; Owner: -
--

CREATE TABLE finance.prepaid_expense (
    id bigint NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    department_id bigint,
    account_id bigint,
    card_date date
);


--
-- Name: prepaid_expense_id_seq; Type: SEQUENCE; Schema: finance; Owner: -
--

ALTER TABLE finance.prepaid_expense ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME finance.prepaid_expense_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: vat_deduction; Type: TABLE; Schema: finance; Owner: -
--

CREATE TABLE finance.vat_deduction (
    id bigint NOT NULL,
    period_id bigint NOT NULL,
    input_vat numeric(18,2) NOT NULL,
    output_vat numeric(18,2) NOT NULL,
    deducted numeric(18,2) NOT NULL,
    voucher_id bigint
);


--
-- Name: vat_deduction_id_seq; Type: SEQUENCE; Schema: finance; Owner: -
--

ALTER TABLE finance.vat_deduction ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME finance.vat_deduction_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: vat_invoice; Type: TABLE; Schema: finance; Owner: -
--

CREATE TABLE finance.vat_invoice (
    id bigint NOT NULL,
    direction text NOT NULL,
    invoice_no text NOT NULL,
    invoice_serial text,
    invoice_form text,
    invoice_date date NOT NULL,
    partner_id bigint,
    partner_tax_code text,
    pre_tax_amount numeric(18,2) NOT NULL,
    vat_pct numeric(5,2),
    vat_amount numeric(18,2) NOT NULL,
    declare_period_id bigint,
    voucher_id bigint,
    CONSTRAINT vat_invoice_direction_check CHECK ((direction = ANY (ARRAY['IN'::text, 'OUT'::text])))
);


--
-- Name: vat_invoice_id_seq; Type: SEQUENCE; Schema: finance; Owner: -
--

ALTER TABLE finance.vat_invoice ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME finance.vat_invoice_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: voucher; Type: TABLE; Schema: finance; Owner: -
--

CREATE TABLE finance.voucher (
    id bigint NOT NULL,
    voucher_type text NOT NULL,
    doc_no text NOT NULL,
    doc_date date DEFAULT CURRENT_DATE NOT NULL,
    posting_date date,
    period_id bigint,
    operation_id bigint,
    partner_id bigint,
    employee_id bigint,
    fund_id bigint,
    warehouse_id bigint,
    ycc_type text,
    invoice_no text,
    invoice_serial text,
    invoice_form text,
    invoice_date date,
    currency_code text DEFAULT 'VND'::text NOT NULL,
    exchange_rate numeric(18,4) DEFAULT 1 NOT NULL,
    total_amount numeric(18,2),
    total_vat numeric(18,2),
    description text,
    lerp_voucher_id bigint,
    status text DEFAULT 'DRAFT'::text NOT NULL,
    posted_by bigint,
    posted_at timestamp with time zone,
    created_by bigint,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    outstanding_amount numeric(18,2),
    due_date date,
    payment_status text,
    payment_type text,
    paid_amount numeric(18,2),
    unallocated_amount numeric(18,2),
    amended_from_id bigint,
    CONSTRAINT voucher_status_check CHECK ((status = ANY (ARRAY['DRAFT'::text, 'POSTED'::text, 'CANCELLED'::text, 'UNLOCKED'::text, 'CANCELLED_POSTED'::text]))),
    CONSTRAINT voucher_voucher_type_check CHECK ((voucher_type = ANY (ARRAY['PHIEU_THU'::text, 'PHIEU_CHI'::text, 'CHUYEN_TIEN'::text, 'YEU_CAU_CHI'::text, 'YEU_CAU_THU'::text, 'HOA_DON_BAN'::text, 'HANG_BAN_TRA_LAI'::text, 'PHIEU_GHI_NO'::text, 'PHIEU_MUA_HANG'::text, 'TRA_HANG_NCC'::text, 'PHIEU_GHI_CO'::text, 'PHIEU_XUAT_KT'::text, 'PHIEU_NHAP_KT'::text, 'DIEU_CHUYEN_KT'::text, 'CT_GIAM_GIA'::text, 'CT_KHAU_HAO'::text, 'CT_PHAN_BO'::text, 'CT_KET_CHUYEN'::text, 'CT_TONG_HOP'::text])))
);


--
-- Name: voucher_id_seq; Type: SEQUENCE; Schema: finance; Owner: -
--

ALTER TABLE finance.voucher ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME finance.voucher_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: voucher_line; Type: TABLE; Schema: finance; Owner: -
--

CREATE TABLE finance.voucher_line (
    id bigint NOT NULL,
    voucher_id bigint NOT NULL,
    product_id bigint,
    description text,
    quantity numeric(18,4),
    unit_price numeric(18,2),
    amount numeric(18,2) DEFAULT 0 NOT NULL,
    vat_pct numeric(5,2),
    vat_amount numeric(18,2),
    dr_account_id bigint,
    cr_account_id bigint,
    dr_object_id bigint,
    dr_object_type text,
    cr_object_id bigint,
    cr_object_type text,
    ref_voucher_id bigint,
    lot_id bigint,
    warehouse_id bigint,
    cost_center_id bigint
);


--
-- Name: voucher_line_id_seq; Type: SEQUENCE; Schema: finance; Owner: -
--

ALTER TABLE finance.voucher_line ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME finance.voucher_line_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: aggregatedcounter; Type: TABLE; Schema: hangfire; Owner: -
--

CREATE TABLE hangfire.aggregatedcounter (
    id bigint NOT NULL,
    key text NOT NULL,
    value bigint NOT NULL,
    expireat timestamp with time zone
);


--
-- Name: aggregatedcounter_id_seq; Type: SEQUENCE; Schema: hangfire; Owner: -
--

CREATE SEQUENCE hangfire.aggregatedcounter_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: aggregatedcounter_id_seq; Type: SEQUENCE OWNED BY; Schema: hangfire; Owner: -
--

ALTER SEQUENCE hangfire.aggregatedcounter_id_seq OWNED BY hangfire.aggregatedcounter.id;


--
-- Name: counter; Type: TABLE; Schema: hangfire; Owner: -
--

CREATE TABLE hangfire.counter (
    id bigint NOT NULL,
    key text NOT NULL,
    value bigint NOT NULL,
    expireat timestamp with time zone
);


--
-- Name: counter_id_seq; Type: SEQUENCE; Schema: hangfire; Owner: -
--

CREATE SEQUENCE hangfire.counter_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: counter_id_seq; Type: SEQUENCE OWNED BY; Schema: hangfire; Owner: -
--

ALTER SEQUENCE hangfire.counter_id_seq OWNED BY hangfire.counter.id;


--
-- Name: hash; Type: TABLE; Schema: hangfire; Owner: -
--

CREATE TABLE hangfire.hash (
    id bigint NOT NULL,
    key text NOT NULL,
    field text NOT NULL,
    value text,
    expireat timestamp with time zone,
    updatecount integer DEFAULT 0 NOT NULL
);


--
-- Name: hash_id_seq; Type: SEQUENCE; Schema: hangfire; Owner: -
--

CREATE SEQUENCE hangfire.hash_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: hash_id_seq; Type: SEQUENCE OWNED BY; Schema: hangfire; Owner: -
--

ALTER SEQUENCE hangfire.hash_id_seq OWNED BY hangfire.hash.id;


--
-- Name: job; Type: TABLE; Schema: hangfire; Owner: -
--

CREATE TABLE hangfire.job (
    id bigint NOT NULL,
    stateid bigint,
    statename text,
    invocationdata jsonb NOT NULL,
    arguments jsonb NOT NULL,
    createdat timestamp with time zone NOT NULL,
    expireat timestamp with time zone,
    updatecount integer DEFAULT 0 NOT NULL
);


--
-- Name: job_id_seq; Type: SEQUENCE; Schema: hangfire; Owner: -
--

CREATE SEQUENCE hangfire.job_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: job_id_seq; Type: SEQUENCE OWNED BY; Schema: hangfire; Owner: -
--

ALTER SEQUENCE hangfire.job_id_seq OWNED BY hangfire.job.id;


--
-- Name: jobparameter; Type: TABLE; Schema: hangfire; Owner: -
--

CREATE TABLE hangfire.jobparameter (
    id bigint NOT NULL,
    jobid bigint NOT NULL,
    name text NOT NULL,
    value text,
    updatecount integer DEFAULT 0 NOT NULL
);


--
-- Name: jobparameter_id_seq; Type: SEQUENCE; Schema: hangfire; Owner: -
--

CREATE SEQUENCE hangfire.jobparameter_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: jobparameter_id_seq; Type: SEQUENCE OWNED BY; Schema: hangfire; Owner: -
--

ALTER SEQUENCE hangfire.jobparameter_id_seq OWNED BY hangfire.jobparameter.id;


--
-- Name: jobqueue; Type: TABLE; Schema: hangfire; Owner: -
--

CREATE TABLE hangfire.jobqueue (
    id bigint NOT NULL,
    jobid bigint NOT NULL,
    queue text NOT NULL,
    fetchedat timestamp with time zone,
    updatecount integer DEFAULT 0 NOT NULL
);


--
-- Name: jobqueue_id_seq; Type: SEQUENCE; Schema: hangfire; Owner: -
--

CREATE SEQUENCE hangfire.jobqueue_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: jobqueue_id_seq; Type: SEQUENCE OWNED BY; Schema: hangfire; Owner: -
--

ALTER SEQUENCE hangfire.jobqueue_id_seq OWNED BY hangfire.jobqueue.id;


--
-- Name: list; Type: TABLE; Schema: hangfire; Owner: -
--

CREATE TABLE hangfire.list (
    id bigint NOT NULL,
    key text NOT NULL,
    value text,
    expireat timestamp with time zone,
    updatecount integer DEFAULT 0 NOT NULL
);


--
-- Name: list_id_seq; Type: SEQUENCE; Schema: hangfire; Owner: -
--

CREATE SEQUENCE hangfire.list_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: list_id_seq; Type: SEQUENCE OWNED BY; Schema: hangfire; Owner: -
--

ALTER SEQUENCE hangfire.list_id_seq OWNED BY hangfire.list.id;


--
-- Name: lock; Type: TABLE; Schema: hangfire; Owner: -
--

CREATE TABLE hangfire.lock (
    resource text NOT NULL,
    updatecount integer DEFAULT 0 NOT NULL,
    acquired timestamp with time zone
);


--
-- Name: schema; Type: TABLE; Schema: hangfire; Owner: -
--

CREATE TABLE hangfire.schema (
    version integer NOT NULL
);


--
-- Name: server; Type: TABLE; Schema: hangfire; Owner: -
--

CREATE TABLE hangfire.server (
    id text NOT NULL,
    data jsonb,
    lastheartbeat timestamp with time zone NOT NULL,
    updatecount integer DEFAULT 0 NOT NULL
);


--
-- Name: set; Type: TABLE; Schema: hangfire; Owner: -
--

CREATE TABLE hangfire.set (
    id bigint NOT NULL,
    key text NOT NULL,
    score double precision NOT NULL,
    value text NOT NULL,
    expireat timestamp with time zone,
    updatecount integer DEFAULT 0 NOT NULL
);


--
-- Name: set_id_seq; Type: SEQUENCE; Schema: hangfire; Owner: -
--

CREATE SEQUENCE hangfire.set_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: set_id_seq; Type: SEQUENCE OWNED BY; Schema: hangfire; Owner: -
--

ALTER SEQUENCE hangfire.set_id_seq OWNED BY hangfire.set.id;


--
-- Name: state; Type: TABLE; Schema: hangfire; Owner: -
--

CREATE TABLE hangfire.state (
    id bigint NOT NULL,
    jobid bigint NOT NULL,
    name text NOT NULL,
    reason text,
    createdat timestamp with time zone NOT NULL,
    data jsonb,
    updatecount integer DEFAULT 0 NOT NULL
);


--
-- Name: state_id_seq; Type: SEQUENCE; Schema: hangfire; Owner: -
--

CREATE SEQUENCE hangfire.state_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: state_id_seq; Type: SEQUENCE OWNED BY; Schema: hangfire; Owner: -
--

ALTER SEQUENCE hangfire.state_id_seq OWNED BY hangfire.state.id;


--
-- Name: delivery_plan; Type: TABLE; Schema: inventory; Owner: -
--

CREATE TABLE inventory.delivery_plan (
    id bigint NOT NULL,
    doc_id bigint NOT NULL,
    plan_date date,
    vehicle text,
    driver text,
    note text
);


--
-- Name: delivery_plan_id_seq; Type: SEQUENCE; Schema: inventory; Owner: -
--

ALTER TABLE inventory.delivery_plan ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME inventory.delivery_plan_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: gr_cost; Type: TABLE; Schema: inventory; Owner: -
--

CREATE TABLE inventory.gr_cost (
    id bigint NOT NULL,
    doc_id bigint NOT NULL,
    cost_type_id bigint NOT NULL,
    payee_id bigint,
    process_id bigint,
    amount numeric(18,2) NOT NULL,
    vat_pct numeric(5,2),
    approved boolean DEFAULT false NOT NULL,
    approved_by bigint,
    approved_at timestamp with time zone
);


--
-- Name: gr_cost_id_seq; Type: SEQUENCE; Schema: inventory; Owner: -
--

ALTER TABLE inventory.gr_cost ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME inventory.gr_cost_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: lot; Type: TABLE; Schema: inventory; Owner: -
--

CREATE TABLE inventory.lot (
    id bigint NOT NULL,
    lot_no text NOT NULL,
    product_id bigint NOT NULL,
    expiry_date date
);


--
-- Name: lot_id_seq; Type: SEQUENCE; Schema: inventory; Owner: -
--

ALTER TABLE inventory.lot ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME inventory.lot_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: packing_line; Type: TABLE; Schema: inventory; Owner: -
--

CREATE TABLE inventory.packing_line (
    id bigint NOT NULL,
    doc_id bigint NOT NULL,
    doc_line_id bigint,
    units_per_pack numeric(18,4),
    pack_count numeric(18,4),
    loose_units numeric(18,4),
    performer_id bigint,
    is_done boolean DEFAULT false NOT NULL
);


--
-- Name: packing_line_id_seq; Type: SEQUENCE; Schema: inventory; Owner: -
--

ALTER TABLE inventory.packing_line ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME inventory.packing_line_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: stock_balance; Type: TABLE; Schema: inventory; Owner: -
--

CREATE TABLE inventory.stock_balance (
    product_id bigint NOT NULL,
    warehouse_id bigint NOT NULL,
    lot_id bigint,
    qty_on_hand numeric(18,4) DEFAULT 0 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    id bigint NOT NULL,
    reserved_qty numeric(18,4) DEFAULT 0 NOT NULL,
    ordered_qty numeric(18,4) DEFAULT 0 NOT NULL
);


--
-- Name: stock_balance_id_seq; Type: SEQUENCE; Schema: inventory; Owner: -
--

ALTER TABLE inventory.stock_balance ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME inventory.stock_balance_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: stock_doc; Type: TABLE; Schema: inventory; Owner: -
--

CREATE TABLE inventory.stock_doc (
    id bigint NOT NULL,
    doc_no text NOT NULL,
    doc_type text NOT NULL,
    sub_type text NOT NULL,
    request_date date DEFAULT CURRENT_DATE NOT NULL,
    actual_date date,
    sales_order_id bigint,
    purchase_order_id bigint,
    supplier_return_id bigint,
    partner_id bigint,
    from_warehouse_id bigint,
    to_warehouse_id bigint,
    org_unit text,
    process_id bigint,
    counterpart_doc_id bigint,
    ref_no text,
    note text,
    status text DEFAULT 'DRAFT'::text NOT NULL,
    created_by bigint,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_by bigint,
    completed_at timestamp with time zone,
    status_reason text,
    purpose text,
    approver_id bigint,
    approved_at timestamp with time zone,
    CONSTRAINT stock_doc_doc_type_check CHECK ((doc_type = ANY (ARRAY['RECEIPT'::text, 'ISSUE'::text, 'TRANSFER'::text]))),
    CONSTRAINT stock_doc_status_check CHECK ((status = ANY (ARRAY['DRAFT'::text, 'REQUESTED'::text, 'CONFIRMED'::text, 'COMPLETED'::text, 'CANCELLED'::text]))),
    CONSTRAINT stock_doc_sub_type_check CHECK ((sub_type = ANY (ARRAY['PURCHASE'::text, 'CUSTOMER_RETURN'::text, 'FINISHED_GOODS'::text, 'RECEIPT_OTHER'::text, 'RECEIPT_CODE_ADJUST'::text, 'SALES'::text, 'OUTSOURCING'::text, 'SUPPLIER_RETURN'::text, 'ISSUE_OTHER'::text, 'ISSUE_CODE_ADJUST'::text, 'INTERNAL_TRANSFER'::text, 'MANUFACTURE'::text])))
);


--
-- Name: stock_doc_id_seq; Type: SEQUENCE; Schema: inventory; Owner: -
--

ALTER TABLE inventory.stock_doc ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME inventory.stock_doc_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: stock_doc_line; Type: TABLE; Schema: inventory; Owner: -
--

CREATE TABLE inventory.stock_doc_line (
    id bigint NOT NULL,
    doc_id bigint NOT NULL,
    product_id bigint NOT NULL,
    requested_qty numeric(18,4) NOT NULL,
    actual_qty numeric(18,4),
    kit_qty numeric(18,4),
    unit_price numeric(18,2),
    lot_id bigint,
    expiry_date date,
    location_id bigint,
    note text,
    landed_cost numeric(18,4) DEFAULT 0 NOT NULL
);


--
-- Name: stock_doc_line_id_seq; Type: SEQUENCE; Schema: inventory; Owner: -
--

ALTER TABLE inventory.stock_doc_line ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME inventory.stock_doc_line_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: stock_move; Type: TABLE; Schema: inventory; Owner: -
--

CREATE TABLE inventory.stock_move (
    id bigint NOT NULL,
    move_date date NOT NULL,
    doc_id bigint NOT NULL,
    doc_line_id bigint NOT NULL,
    product_id bigint NOT NULL,
    warehouse_id bigint NOT NULL,
    lot_id bigint,
    location_id bigint,
    qty numeric(18,4) NOT NULL,
    unit_cost numeric(18,4),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    qty_after_transaction numeric(18,4),
    valuation_rate numeric(18,4),
    stock_value numeric(18,2),
    stock_value_difference numeric(18,2),
    posting_datetime timestamp with time zone
);


--
-- Name: stock_move_id_seq; Type: SEQUENCE; Schema: inventory; Owner: -
--

ALTER TABLE inventory.stock_move ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME inventory.stock_move_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: stock_reconciliation; Type: TABLE; Schema: inventory; Owner: -
--

CREATE TABLE inventory.stock_reconciliation (
    id bigint NOT NULL,
    doc_no text NOT NULL,
    warehouse_id bigint NOT NULL,
    reconciliation_date date NOT NULL,
    status text DEFAULT 'DRAFT'::text NOT NULL,
    note text,
    created_by bigint,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    posted_by bigint,
    posted_at timestamp with time zone
);


--
-- Name: stock_reconciliation_id_seq; Type: SEQUENCE; Schema: inventory; Owner: -
--

ALTER TABLE inventory.stock_reconciliation ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME inventory.stock_reconciliation_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: stock_reconciliation_line; Type: TABLE; Schema: inventory; Owner: -
--

CREATE TABLE inventory.stock_reconciliation_line (
    id bigint NOT NULL,
    reconciliation_id bigint NOT NULL,
    product_id bigint NOT NULL,
    lot_id bigint,
    system_qty numeric(18,4) DEFAULT 0 NOT NULL,
    actual_qty numeric(18,4) DEFAULT 0 NOT NULL,
    difference numeric(18,4) DEFAULT 0 NOT NULL
);


--
-- Name: stock_reconciliation_line_id_seq; Type: SEQUENCE; Schema: inventory; Owner: -
--

ALTER TABLE inventory.stock_reconciliation_line ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME inventory.stock_reconciliation_line_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: bom; Type: TABLE; Schema: mfg; Owner: -
--

CREATE TABLE mfg.bom (
    id bigint NOT NULL,
    doc_no text NOT NULL,
    product_id bigint NOT NULL,
    quantity numeric(18,4) DEFAULT 1 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    is_default boolean DEFAULT true NOT NULL,
    with_operations boolean NOT NULL,
    status text DEFAULT 'DRAFT'::text NOT NULL,
    note text,
    creator_id bigint,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    submitted_at timestamp with time zone
);


--
-- Name: bom_id_seq; Type: SEQUENCE; Schema: mfg; Owner: -
--

ALTER TABLE mfg.bom ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME mfg.bom_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: bom_item; Type: TABLE; Schema: mfg; Owner: -
--

CREATE TABLE mfg.bom_item (
    id bigint NOT NULL,
    bom_id bigint NOT NULL,
    product_id bigint NOT NULL,
    qty numeric(18,4) NOT NULL,
    rate numeric(18,2),
    scrap_loss_pct numeric(5,2) DEFAULT 0 NOT NULL,
    sub_bom_id bigint
);


--
-- Name: bom_item_id_seq; Type: SEQUENCE; Schema: mfg; Owner: -
--

ALTER TABLE mfg.bom_item ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME mfg.bom_item_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: bom_operation; Type: TABLE; Schema: mfg; Owner: -
--

CREATE TABLE mfg.bom_operation (
    id bigint NOT NULL,
    bom_id bigint NOT NULL,
    operation_id bigint NOT NULL,
    workstation_id bigint,
    time_minutes numeric(10,2) NOT NULL,
    hourly_rate numeric(18,2) NOT NULL
);


--
-- Name: bom_operation_id_seq; Type: SEQUENCE; Schema: mfg; Owner: -
--

ALTER TABLE mfg.bom_operation ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME mfg.bom_operation_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: bom_scrap; Type: TABLE; Schema: mfg; Owner: -
--

CREATE TABLE mfg.bom_scrap (
    id bigint NOT NULL,
    bom_id bigint NOT NULL,
    product_id bigint NOT NULL,
    qty numeric(18,4) NOT NULL,
    rate numeric(18,2)
);


--
-- Name: bom_scrap_id_seq; Type: SEQUENCE; Schema: mfg; Owner: -
--

ALTER TABLE mfg.bom_scrap ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME mfg.bom_scrap_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: job_card; Type: TABLE; Schema: mfg; Owner: -
--

CREATE TABLE mfg.job_card (
    id bigint NOT NULL,
    work_order_id bigint NOT NULL,
    wo_operation_id bigint NOT NULL,
    operation_id bigint NOT NULL,
    workstation_id bigint,
    time_log_minutes numeric(10,2) DEFAULT 0 NOT NULL,
    completed_qty numeric(18,4) DEFAULT 0 NOT NULL,
    status text DEFAULT 'OPEN'::text NOT NULL,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    started_at timestamp with time zone,
    completed_at timestamp with time zone
);


--
-- Name: job_card_id_seq; Type: SEQUENCE; Schema: mfg; Owner: -
--

ALTER TABLE mfg.job_card ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME mfg.job_card_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: operation; Type: TABLE; Schema: mfg; Owner: -
--

CREATE TABLE mfg.operation (
    id bigint NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    default_workstation_id bigint,
    standard_time_minutes numeric(10,2) DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    description text
);


--
-- Name: operation_id_seq; Type: SEQUENCE; Schema: mfg; Owner: -
--

ALTER TABLE mfg.operation ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME mfg.operation_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: pp_item; Type: TABLE; Schema: mfg; Owner: -
--

CREATE TABLE mfg.pp_item (
    id bigint NOT NULL,
    production_plan_id bigint NOT NULL,
    product_id bigint NOT NULL,
    planned_qty numeric(18,4) NOT NULL
);


--
-- Name: pp_item_id_seq; Type: SEQUENCE; Schema: mfg; Owner: -
--

ALTER TABLE mfg.pp_item ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME mfg.pp_item_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: pp_material; Type: TABLE; Schema: mfg; Owner: -
--

CREATE TABLE mfg.pp_material (
    id bigint NOT NULL,
    production_plan_id bigint NOT NULL,
    product_id bigint NOT NULL,
    required_qty numeric(18,4) NOT NULL,
    projected_qty numeric(18,4) NOT NULL,
    shortage_qty numeric(18,4) NOT NULL,
    is_manufacturable boolean NOT NULL,
    on_hand numeric(18,4) DEFAULT 0 NOT NULL,
    ordered numeric(18,4) DEFAULT 0 NOT NULL,
    reserved numeric(18,4) DEFAULT 0 NOT NULL,
    rate numeric(18,2),
    suggested_supplier_id bigint
);


--
-- Name: pp_material_id_seq; Type: SEQUENCE; Schema: mfg; Owner: -
--

ALTER TABLE mfg.pp_material ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME mfg.pp_material_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: pp_so; Type: TABLE; Schema: mfg; Owner: -
--

CREATE TABLE mfg.pp_so (
    production_plan_id bigint NOT NULL,
    sales_order_id bigint NOT NULL
);


--
-- Name: production_plan; Type: TABLE; Schema: mfg; Owner: -
--

CREATE TABLE mfg.production_plan (
    id bigint NOT NULL,
    doc_no text NOT NULL,
    plan_date date NOT NULL,
    status text DEFAULT 'DRAFT'::text NOT NULL,
    note text,
    creator_id bigint,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    submitted_at timestamp with time zone
);


--
-- Name: production_plan_id_seq; Type: SEQUENCE; Schema: mfg; Owner: -
--

ALTER TABLE mfg.production_plan ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME mfg.production_plan_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: wo_finish_batch; Type: TABLE; Schema: mfg; Owner: -
--

CREATE TABLE mfg.wo_finish_batch (
    id bigint NOT NULL,
    work_order_id bigint NOT NULL,
    qty numeric(18,4) NOT NULL,
    cost numeric(18,2) NOT NULL,
    stock_doc_id bigint NOT NULL,
    completed_at timestamp with time zone NOT NULL
);


--
-- Name: wo_finish_batch_id_seq; Type: SEQUENCE; Schema: mfg; Owner: -
--

ALTER TABLE mfg.wo_finish_batch ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME mfg.wo_finish_batch_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: wo_item; Type: TABLE; Schema: mfg; Owner: -
--

CREATE TABLE mfg.wo_item (
    id bigint NOT NULL,
    work_order_id bigint NOT NULL,
    product_id bigint NOT NULL,
    required_qty numeric(18,4) NOT NULL,
    transferred_qty numeric(18,4) DEFAULT 0 NOT NULL,
    consumed_qty numeric(18,4) DEFAULT 0 NOT NULL,
    rate numeric(18,2) DEFAULT 0 NOT NULL
);


--
-- Name: wo_item_id_seq; Type: SEQUENCE; Schema: mfg; Owner: -
--

ALTER TABLE mfg.wo_item ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME mfg.wo_item_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: wo_operation; Type: TABLE; Schema: mfg; Owner: -
--

CREATE TABLE mfg.wo_operation (
    id bigint NOT NULL,
    work_order_id bigint NOT NULL,
    operation_id bigint NOT NULL,
    workstation_id bigint,
    planned_time_minutes numeric(10,2) NOT NULL,
    status text DEFAULT 'PENDING'::text NOT NULL,
    hourly_rate numeric(18,2) DEFAULT 0 NOT NULL
);


--
-- Name: wo_operation_id_seq; Type: SEQUENCE; Schema: mfg; Owner: -
--

ALTER TABLE mfg.wo_operation ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME mfg.wo_operation_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: work_order; Type: TABLE; Schema: mfg; Owner: -
--

CREATE TABLE mfg.work_order (
    id bigint NOT NULL,
    doc_no text NOT NULL,
    product_id bigint NOT NULL,
    bom_id bigint NOT NULL,
    qty numeric(18,4) NOT NULL,
    produced_qty numeric(18,4) DEFAULT 0 NOT NULL,
    wip_warehouse_id bigint NOT NULL,
    fg_warehouse_id bigint NOT NULL,
    planned_start_date date,
    planned_end_date date,
    status text DEFAULT 'DRAFT'::text NOT NULL,
    stop_reason text,
    stock_doc_transfer_id bigint,
    stock_doc_manufacture_id bigint,
    note text,
    creator_id bigint,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    source_warehouse_id bigint,
    production_plan_id bigint
);


--
-- Name: work_order_id_seq; Type: SEQUENCE; Schema: mfg; Owner: -
--

ALTER TABLE mfg.work_order ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME mfg.work_order_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: workstation; Type: TABLE; Schema: mfg; Owner: -
--

CREATE TABLE mfg.workstation (
    id bigint NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    hourly_rate numeric(18,2) DEFAULT 0 NOT NULL,
    working_hours_per_day numeric(5,2) DEFAULT 8 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    description text
);


--
-- Name: workstation_id_seq; Type: SEQUENCE; Schema: mfg; Owner: -
--

ALTER TABLE mfg.workstation ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME mfg.workstation_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: landed_cost_receipt; Type: TABLE; Schema: purchasing; Owner: -
--

CREATE TABLE purchasing.landed_cost_receipt (
    id bigint NOT NULL,
    voucher_id bigint NOT NULL,
    receipt_doc_id bigint NOT NULL
);


--
-- Name: landed_cost_receipt_id_seq; Type: SEQUENCE; Schema: purchasing; Owner: -
--

ALTER TABLE purchasing.landed_cost_receipt ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME purchasing.landed_cost_receipt_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: landed_cost_voucher; Type: TABLE; Schema: purchasing; Owner: -
--

CREATE TABLE purchasing.landed_cost_voucher (
    id bigint NOT NULL,
    doc_no text NOT NULL,
    doc_date date NOT NULL,
    allocation_method text DEFAULT 'QTY'::text NOT NULL,
    status text DEFAULT 'DRAFT'::text NOT NULL,
    note text,
    creator_id bigint,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: landed_cost_voucher_id_seq; Type: SEQUENCE; Schema: purchasing; Owner: -
--

ALTER TABLE purchasing.landed_cost_voucher ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME purchasing.landed_cost_voucher_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: landed_cost_voucher_line; Type: TABLE; Schema: purchasing; Owner: -
--

CREATE TABLE purchasing.landed_cost_voucher_line (
    id bigint NOT NULL,
    voucher_id bigint NOT NULL,
    cost_type_id bigint NOT NULL,
    service_supplier_id bigint,
    amount numeric(18,2) DEFAULT 0 NOT NULL,
    note text
);


--
-- Name: landed_cost_voucher_line_id_seq; Type: SEQUENCE; Schema: purchasing; Owner: -
--

ALTER TABLE purchasing.landed_cost_voucher_line ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME purchasing.landed_cost_voucher_line_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: outsourcing_cost; Type: TABLE; Schema: purchasing; Owner: -
--

CREATE TABLE purchasing.outsourcing_cost (
    id bigint NOT NULL,
    receipt_doc_id bigint NOT NULL,
    product_id bigint,
    payee_id bigint NOT NULL,
    cost_type_id bigint NOT NULL,
    process_id bigint,
    amount_fc numeric(18,2) NOT NULL,
    currency_code text DEFAULT 'VND'::text NOT NULL,
    exchange_rate numeric(18,4) DEFAULT 1 NOT NULL,
    amount numeric(18,2) NOT NULL,
    vat_pct numeric(5,2),
    payment_method_id bigint,
    collected_po_id bigint,
    approved boolean DEFAULT false NOT NULL
);


--
-- Name: outsourcing_cost_id_seq; Type: SEQUENCE; Schema: purchasing; Owner: -
--

ALTER TABLE purchasing.outsourcing_cost ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME purchasing.outsourcing_cost_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: po_cost; Type: TABLE; Schema: purchasing; Owner: -
--

CREATE TABLE purchasing.po_cost (
    id bigint NOT NULL,
    order_id bigint NOT NULL,
    receipt_doc_id bigint,
    cost_type_id bigint NOT NULL,
    service_supplier_id bigint,
    amount numeric(18,2) NOT NULL,
    vat_pct numeric(5,2),
    payment_method_id bigint,
    approved boolean DEFAULT false NOT NULL,
    approved_by bigint,
    approved_at timestamp with time zone,
    note text
);


--
-- Name: po_cost_id_seq; Type: SEQUENCE; Schema: purchasing; Owner: -
--

ALTER TABLE purchasing.po_cost ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME purchasing.po_cost_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: po_payment_actual; Type: TABLE; Schema: purchasing; Owner: -
--

CREATE TABLE purchasing.po_payment_actual (
    id bigint NOT NULL,
    order_id bigint NOT NULL,
    pay_date date NOT NULL,
    amount numeric(18,2) NOT NULL,
    method_id bigint,
    note text
);


--
-- Name: po_payment_actual_id_seq; Type: SEQUENCE; Schema: purchasing; Owner: -
--

ALTER TABLE purchasing.po_payment_actual ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME purchasing.po_payment_actual_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: po_payment_request; Type: TABLE; Schema: purchasing; Owner: -
--

CREATE TABLE purchasing.po_payment_request (
    id bigint NOT NULL,
    order_id bigint NOT NULL,
    due_date date,
    amount numeric(18,2) NOT NULL,
    note text,
    status text DEFAULT 'DRAFT'::text NOT NULL,
    approved_by bigint,
    approved_at timestamp with time zone,
    creator_id bigint,
    approver_id bigint,
    CONSTRAINT po_payment_request_status_check CHECK ((status = ANY (ARRAY['DRAFT'::text, 'APPROVED'::text, 'SENT_FRM'::text, 'PAID'::text, 'CANCELLED'::text])))
);


--
-- Name: po_payment_request_id_seq; Type: SEQUENCE; Schema: purchasing; Owner: -
--

ALTER TABLE purchasing.po_payment_request ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME purchasing.po_payment_request_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: purchase_order; Type: TABLE; Schema: purchasing; Owner: -
--

CREATE TABLE purchasing.purchase_order (
    id bigint NOT NULL,
    doc_no text NOT NULL,
    order_date date DEFAULT CURRENT_DATE NOT NULL,
    receive_date_plan date,
    partner_id bigint NOT NULL,
    order_form text DEFAULT 'NORMAL'::text NOT NULL,
    payment_method_id bigint,
    delivery_method_id bigint,
    receive_address text,
    vat_included boolean DEFAULT true NOT NULL,
    request_id bigint,
    approver_id bigint,
    approved_at timestamp with time zone,
    total_amount numeric(18,2),
    total_vat numeric(18,2),
    note text,
    status text DEFAULT 'DRAFT'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    status_reason text,
    creator_id bigint,
    rfq_id bigint,
    tax_template_id bigint,
    payment_terms_template_id bigint,
    tax_total numeric(18,2),
    grand_total numeric(18,2),
    CONSTRAINT purchase_order_order_form_check CHECK ((order_form = ANY (ARRAY['NORMAL'::text, 'SERVICE'::text, 'OUTSOURCING'::text]))),
    CONSTRAINT purchase_order_status_check CHECK ((status = ANY (ARRAY['DRAFT'::text, 'APPROVED'::text, 'NOT_RECEIVED'::text, 'RECEIVED'::text, 'COMPLETED'::text, 'CANCELLED'::text])))
);


--
-- Name: purchase_order_id_seq; Type: SEQUENCE; Schema: purchasing; Owner: -
--

ALTER TABLE purchasing.purchase_order ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME purchasing.purchase_order_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: purchase_order_line; Type: TABLE; Schema: purchasing; Owner: -
--

CREATE TABLE purchasing.purchase_order_line (
    id bigint NOT NULL,
    order_id bigint NOT NULL,
    product_id bigint NOT NULL,
    quantity numeric(18,4) NOT NULL,
    unit_price numeric(18,2) DEFAULT 0 NOT NULL,
    vat_pct numeric(5,2) DEFAULT 10,
    amount numeric(18,2) GENERATED ALWAYS AS ((quantity * unit_price)) STORED,
    note text,
    received_qty numeric(18,4) DEFAULT 0 NOT NULL,
    billed_qty numeric(18,4) DEFAULT 0 NOT NULL
);


--
-- Name: purchase_order_line_id_seq; Type: SEQUENCE; Schema: purchasing; Owner: -
--

ALTER TABLE purchasing.purchase_order_line ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME purchasing.purchase_order_line_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: purchase_request; Type: TABLE; Schema: purchasing; Owner: -
--

CREATE TABLE purchasing.purchase_request (
    id bigint NOT NULL,
    doc_no text NOT NULL,
    doc_date date DEFAULT CURRENT_DATE NOT NULL,
    requester_id bigint,
    department_id bigint,
    status text DEFAULT 'DRAFT'::text NOT NULL,
    note text,
    status_reason text,
    creator_id bigint,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    request_type text DEFAULT 'PURCHASE'::text NOT NULL,
    required_by date,
    approver_id bigint,
    approved_at timestamp with time zone,
    production_plan_id bigint,
    CONSTRAINT purchase_request_status_check CHECK ((status = ANY (ARRAY['DRAFT'::text, 'APPROVED'::text, 'ORDERED'::text, 'CANCELLED'::text])))
);


--
-- Name: purchase_request_id_seq; Type: SEQUENCE; Schema: purchasing; Owner: -
--

ALTER TABLE purchasing.purchase_request ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME purchasing.purchase_request_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: purchase_request_line; Type: TABLE; Schema: purchasing; Owner: -
--

CREATE TABLE purchasing.purchase_request_line (
    id bigint NOT NULL,
    request_id bigint NOT NULL,
    product_id bigint NOT NULL,
    quantity numeric(18,4) NOT NULL,
    need_date date,
    note text
);


--
-- Name: purchase_request_line_id_seq; Type: SEQUENCE; Schema: purchasing; Owner: -
--

ALTER TABLE purchasing.purchase_request_line ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME purchasing.purchase_request_line_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: rfq; Type: TABLE; Schema: purchasing; Owner: -
--

CREATE TABLE purchasing.rfq (
    id bigint NOT NULL,
    doc_no text NOT NULL,
    doc_date date NOT NULL,
    request_id bigint,
    status text DEFAULT 'DRAFT'::text NOT NULL,
    note text,
    creator_id bigint,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: rfq_id_seq; Type: SEQUENCE; Schema: purchasing; Owner: -
--

ALTER TABLE purchasing.rfq ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME purchasing.rfq_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: rfq_line; Type: TABLE; Schema: purchasing; Owner: -
--

CREATE TABLE purchasing.rfq_line (
    id bigint NOT NULL,
    rfq_id bigint NOT NULL,
    product_id bigint NOT NULL,
    quantity numeric(18,4) NOT NULL,
    note text
);


--
-- Name: rfq_line_id_seq; Type: SEQUENCE; Schema: purchasing; Owner: -
--

ALTER TABLE purchasing.rfq_line ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME purchasing.rfq_line_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: rfq_supplier; Type: TABLE; Schema: purchasing; Owner: -
--

CREATE TABLE purchasing.rfq_supplier (
    id bigint NOT NULL,
    rfq_id bigint NOT NULL,
    partner_id bigint NOT NULL,
    note text
);


--
-- Name: rfq_supplier_id_seq; Type: SEQUENCE; Schema: purchasing; Owner: -
--

ALTER TABLE purchasing.rfq_supplier ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME purchasing.rfq_supplier_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: supplier_quotation; Type: TABLE; Schema: purchasing; Owner: -
--

CREATE TABLE purchasing.supplier_quotation (
    id bigint NOT NULL,
    doc_no text NOT NULL,
    doc_date date NOT NULL,
    rfq_id bigint NOT NULL,
    partner_id bigint NOT NULL,
    valid_until date,
    lead_time_days integer,
    note text,
    status text DEFAULT 'DRAFT'::text NOT NULL,
    creator_id bigint,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: supplier_quotation_id_seq; Type: SEQUENCE; Schema: purchasing; Owner: -
--

ALTER TABLE purchasing.supplier_quotation ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME purchasing.supplier_quotation_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: supplier_quotation_line; Type: TABLE; Schema: purchasing; Owner: -
--

CREATE TABLE purchasing.supplier_quotation_line (
    id bigint NOT NULL,
    quotation_id bigint NOT NULL,
    product_id bigint NOT NULL,
    quantity numeric(18,4) NOT NULL,
    unit_price numeric(18,4) DEFAULT 0 NOT NULL,
    lead_time_days numeric(5,0),
    note text
);


--
-- Name: supplier_quotation_line_id_seq; Type: SEQUENCE; Schema: purchasing; Owner: -
--

ALTER TABLE purchasing.supplier_quotation_line ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME purchasing.supplier_quotation_line_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: supplier_return; Type: TABLE; Schema: purchasing; Owner: -
--

CREATE TABLE purchasing.supplier_return (
    id bigint NOT NULL,
    doc_no text NOT NULL,
    doc_date date DEFAULT CURRENT_DATE NOT NULL,
    order_id bigint,
    partner_id bigint NOT NULL,
    status text DEFAULT 'DRAFT'::text NOT NULL,
    note text,
    creator_id bigint,
    approver_id bigint,
    approved_at timestamp with time zone,
    CONSTRAINT supplier_return_status_check CHECK ((status = ANY (ARRAY['DRAFT'::text, 'APPROVED'::text, 'POSTED'::text, 'CANCELLED'::text])))
);


--
-- Name: supplier_return_id_seq; Type: SEQUENCE; Schema: purchasing; Owner: -
--

ALTER TABLE purchasing.supplier_return ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME purchasing.supplier_return_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: supplier_return_line; Type: TABLE; Schema: purchasing; Owner: -
--

CREATE TABLE purchasing.supplier_return_line (
    id bigint NOT NULL,
    return_id bigint NOT NULL,
    product_id bigint NOT NULL,
    quantity numeric(18,4) NOT NULL,
    unit_price numeric(18,2),
    note text
);


--
-- Name: supplier_return_line_id_seq; Type: SEQUENCE; Schema: purchasing; Owner: -
--

ALTER TABLE purchasing.supplier_return_line ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME purchasing.supplier_return_line_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: coupon_code; Type: TABLE; Schema: sales; Owner: -
--

CREATE TABLE sales.coupon_code (
    id bigint NOT NULL,
    code text NOT NULL,
    pricing_rule_id bigint NOT NULL,
    max_use integer,
    used integer DEFAULT 0 NOT NULL,
    valid_from date,
    valid_to date,
    is_active boolean DEFAULT true NOT NULL
);


--
-- Name: coupon_code_id_seq; Type: SEQUENCE; Schema: sales; Owner: -
--

ALTER TABLE sales.coupon_code ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME sales.coupon_code_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: lost_reason; Type: TABLE; Schema: sales; Owner: -
--

CREATE TABLE sales.lost_reason (
    id bigint NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);


--
-- Name: lost_reason_id_seq; Type: SEQUENCE; Schema: sales; Owner: -
--

ALTER TABLE sales.lost_reason ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME sales.lost_reason_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: opportunity; Type: TABLE; Schema: sales; Owner: -
--

CREATE TABLE sales.opportunity (
    id bigint NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    partner_id bigint,
    expected_value numeric(18,2),
    stage text DEFAULT 'NEW'::text NOT NULL,
    salesperson_id bigint,
    sales_order_id bigint,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: opportunity_id_seq; Type: SEQUENCE; Schema: sales; Owner: -
--

ALTER TABLE sales.opportunity ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME sales.opportunity_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: price_list; Type: TABLE; Schema: sales; Owner: -
--

CREATE TABLE sales.price_list (
    id bigint NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    valid_from date NOT NULL,
    valid_to date,
    is_active boolean DEFAULT true NOT NULL
);


--
-- Name: price_list_id_seq; Type: SEQUENCE; Schema: sales; Owner: -
--

ALTER TABLE sales.price_list ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME sales.price_list_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: price_list_item; Type: TABLE; Schema: sales; Owner: -
--

CREATE TABLE sales.price_list_item (
    id bigint NOT NULL,
    price_list_id bigint NOT NULL,
    product_id bigint NOT NULL,
    price numeric(18,2) NOT NULL
);


--
-- Name: price_list_item_id_seq; Type: SEQUENCE; Schema: sales; Owner: -
--

ALTER TABLE sales.price_list_item ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME sales.price_list_item_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: pricing_formula; Type: TABLE; Schema: sales; Owner: -
--

CREATE TABLE sales.pricing_formula (
    id bigint NOT NULL,
    product_group_id bigint,
    product_id bigint,
    formula jsonb NOT NULL,
    CONSTRAINT pricing_formula_check CHECK (((product_group_id IS NOT NULL) OR (product_id IS NOT NULL)))
);


--
-- Name: pricing_formula_id_seq; Type: SEQUENCE; Schema: sales; Owner: -
--

ALTER TABLE sales.pricing_formula ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME sales.pricing_formula_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: pricing_rule; Type: TABLE; Schema: sales; Owner: -
--

CREATE TABLE sales.pricing_rule (
    id bigint NOT NULL,
    rule_source text DEFAULT 'SCHEME'::text NOT NULL,
    scheme_id bigint,
    priority integer DEFAULT 0 NOT NULL,
    product_id bigint,
    product_group_id bigint,
    partner_id bigint,
    min_qty numeric(18,4) DEFAULT 0 NOT NULL,
    max_qty numeric(18,4),
    discount_pct numeric(9,4),
    rate numeric(18,2),
    free_product_id bigint,
    free_qty numeric(18,4),
    free_rate numeric(18,2) DEFAULT 0 NOT NULL,
    valid_from date,
    valid_to date,
    is_active boolean DEFAULT true NOT NULL
);


--
-- Name: pricing_rule_id_seq; Type: SEQUENCE; Schema: sales; Owner: -
--

ALTER TABLE sales.pricing_rule ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME sales.pricing_rule_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: promotion; Type: TABLE; Schema: sales; Owner: -
--

CREATE TABLE sales.promotion (
    id bigint NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    group_name text,
    date_from date NOT NULL,
    date_to date,
    sponsor text,
    discount_pct numeric(9,4),
    has_gift boolean DEFAULT false NOT NULL,
    note text
);


--
-- Name: promotion_discount_item; Type: TABLE; Schema: sales; Owner: -
--

CREATE TABLE sales.promotion_discount_item (
    id bigint NOT NULL,
    promotion_id bigint NOT NULL,
    product_id bigint NOT NULL,
    total_pct numeric(9,4) NOT NULL,
    company_pct numeric(9,4),
    vendor_pct numeric(9,4)
);


--
-- Name: promotion_discount_item_id_seq; Type: SEQUENCE; Schema: sales; Owner: -
--

ALTER TABLE sales.promotion_discount_item ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME sales.promotion_discount_item_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: promotion_gift_item; Type: TABLE; Schema: sales; Owner: -
--

CREATE TABLE sales.promotion_gift_item (
    id bigint NOT NULL,
    promotion_id bigint NOT NULL,
    buy_product_id bigint NOT NULL,
    gift_product_id bigint NOT NULL,
    required_qty numeric(18,4) NOT NULL,
    total_gift_qty numeric(18,4) NOT NULL,
    company_gift_qty numeric(18,4),
    vendor_gift_qty numeric(18,4)
);


--
-- Name: promotion_gift_item_id_seq; Type: SEQUENCE; Schema: sales; Owner: -
--

ALTER TABLE sales.promotion_gift_item ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME sales.promotion_gift_item_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: promotion_id_seq; Type: SEQUENCE; Schema: sales; Owner: -
--

ALTER TABLE sales.promotion ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME sales.promotion_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: promotional_scheme; Type: TABLE; Schema: sales; Owner: -
--

CREATE TABLE sales.promotional_scheme (
    id bigint NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    apply_on text DEFAULT 'ITEM'::text NOT NULL,
    product_group_id bigint,
    partner_id bigint,
    valid_from date,
    valid_to date,
    is_active boolean DEFAULT true NOT NULL,
    legacy_promotion_id bigint
);


--
-- Name: promotional_scheme_id_seq; Type: SEQUENCE; Schema: sales; Owner: -
--

ALTER TABLE sales.promotional_scheme ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME sales.promotional_scheme_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: quotation; Type: TABLE; Schema: sales; Owner: -
--

CREATE TABLE sales.quotation (
    id bigint NOT NULL,
    doc_no text NOT NULL,
    doc_date date DEFAULT CURRENT_DATE NOT NULL,
    requester_id bigint,
    requester_dept_id bigint,
    creator_id bigint,
    approver_id bigint,
    approved_at timestamp with time zone,
    partner_id bigint NOT NULL,
    contact_id bigint,
    delivery_addr_id bigint,
    quote_type text DEFAULT 'NORMAL'::text NOT NULL,
    quote_form text DEFAULT 'NORMAL'::text NOT NULL,
    request_delivery_date date,
    validity_days integer DEFAULT 2,
    delivery_lead text,
    payment_method_id bigint,
    delivery_method_id bigint,
    bank_account text,
    attached_service text,
    note text,
    status text DEFAULT 'NEW'::text NOT NULL,
    status_reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    valid_till date,
    order_type text DEFAULT 'SALES'::text NOT NULL,
    price_list_id bigint,
    tax_template_id bigint,
    lost_reason_ids bigint[],
    competitor text,
    terms text,
    opportunity_id bigint,
    CONSTRAINT quotation_quote_form_check CHECK ((quote_form = ANY (ARRAY['NORMAL'::text, 'ESTIMATE'::text]))),
    CONSTRAINT quotation_quote_type_check CHECK ((quote_type = ANY (ARRAY['NORMAL'::text, 'PROJECT'::text]))),
    CONSTRAINT quotation_status_check CHECK ((status = ANY (ARRAY['DRAFT'::text, 'OPEN'::text, 'ORDERED'::text, 'LOST'::text, 'EXPIRED'::text, 'CANCELLED'::text])))
);


--
-- Name: quotation_cost; Type: TABLE; Schema: sales; Owner: -
--

CREATE TABLE sales.quotation_cost (
    id bigint NOT NULL,
    quotation_id bigint NOT NULL,
    cost_type_id bigint NOT NULL,
    payee_id bigint,
    rate_pct numeric(9,4),
    amount numeric(18,2),
    vat_pct numeric(5,2)
);


--
-- Name: quotation_cost_id_seq; Type: SEQUENCE; Schema: sales; Owner: -
--

ALTER TABLE sales.quotation_cost ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME sales.quotation_cost_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: quotation_id_seq; Type: SEQUENCE; Schema: sales; Owner: -
--

ALTER TABLE sales.quotation ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME sales.quotation_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: quotation_line; Type: TABLE; Schema: sales; Owner: -
--

CREATE TABLE sales.quotation_line (
    id bigint NOT NULL,
    quotation_id bigint NOT NULL,
    product_id bigint NOT NULL,
    project_house text,
    quantity numeric(18,4) NOT NULL,
    vat_pct numeric(5,2) DEFAULT 10,
    calc_price numeric(18,2),
    approved_price numeric(18,2),
    price_weight numeric(9,4),
    note text,
    ordered_qty numeric(18,4) DEFAULT 0 NOT NULL,
    rate numeric(18,2),
    discount_pct numeric(9,4),
    amount numeric(18,2) GENERATED ALWAYS AS (((quantity * COALESCE(rate, (0)::numeric)) * ((1)::numeric - (COALESCE(discount_pct, (0)::numeric) / (100)::numeric)))) STORED
);


--
-- Name: quotation_line_id_seq; Type: SEQUENCE; Schema: sales; Owner: -
--

ALTER TABLE sales.quotation_line ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME sales.quotation_line_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: sales_allowance; Type: TABLE; Schema: sales; Owner: -
--

CREATE TABLE sales.sales_allowance (
    id bigint NOT NULL,
    doc_no text NOT NULL,
    doc_date date DEFAULT CURRENT_DATE NOT NULL,
    order_id bigint NOT NULL,
    allow_form text NOT NULL,
    status text DEFAULT 'DRAFT'::text NOT NULL,
    note text,
    creator_id bigint,
    approver_id bigint,
    approved_at timestamp with time zone,
    CONSTRAINT sales_allowance_allow_form_check CHECK ((allow_form = ANY (ARRAY['CREDIT_NOTE'::text, 'CASH_REFUND'::text]))),
    CONSTRAINT sales_allowance_status_check CHECK ((status = ANY (ARRAY['DRAFT'::text, 'APPROVED'::text, 'POSTED'::text, 'CANCELLED'::text])))
);


--
-- Name: sales_allowance_id_seq; Type: SEQUENCE; Schema: sales; Owner: -
--

ALTER TABLE sales.sales_allowance ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME sales.sales_allowance_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: sales_allowance_line; Type: TABLE; Schema: sales; Owner: -
--

CREATE TABLE sales.sales_allowance_line (
    id bigint NOT NULL,
    allowance_id bigint NOT NULL,
    product_id bigint NOT NULL,
    quantity numeric(18,4) NOT NULL,
    reduced_price numeric(18,2) NOT NULL
);


--
-- Name: sales_allowance_line_id_seq; Type: SEQUENCE; Schema: sales; Owner: -
--

ALTER TABLE sales.sales_allowance_line ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME sales.sales_allowance_line_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: sales_order; Type: TABLE; Schema: sales; Owner: -
--

CREATE TABLE sales.sales_order (
    id bigint NOT NULL,
    doc_no text NOT NULL,
    doc_date date DEFAULT CURRENT_DATE NOT NULL,
    quotation_id bigint,
    partner_id bigint NOT NULL,
    order_form text DEFAULT 'NORMAL'::text NOT NULL,
    sales_channel text,
    sales_region text,
    warehouse_id bigint,
    delivery_date_plan date,
    payment_method_id bigint,
    delivery_method_id bigint,
    delivery_addr_id bigint,
    salesperson_id bigint,
    approver_id bigint,
    approved_at timestamp with time zone,
    total_amount numeric(18,2),
    total_vat numeric(18,2),
    note text,
    status text DEFAULT 'DRAFT'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    creator_id bigint,
    CONSTRAINT sales_order_order_form_check CHECK ((order_form = ANY (ARRAY['NORMAL'::text, 'GIFT'::text]))),
    CONSTRAINT sales_order_status_check CHECK ((status = ANY (ARRAY['DRAFT'::text, 'APPROVAL_REQUESTED'::text, 'APPROVED'::text, 'NOT_DELIVERED'::text, 'DELIVERED'::text, 'COMPLETED'::text, 'CANCELLED'::text])))
);


--
-- Name: sales_order_id_seq; Type: SEQUENCE; Schema: sales; Owner: -
--

ALTER TABLE sales.sales_order ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME sales.sales_order_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: sales_order_line; Type: TABLE; Schema: sales; Owner: -
--

CREATE TABLE sales.sales_order_line (
    id bigint NOT NULL,
    order_id bigint NOT NULL,
    product_id bigint NOT NULL,
    quantity numeric(18,4) NOT NULL,
    kit_qty numeric(18,4),
    unit_price numeric(18,2) DEFAULT 0 NOT NULL,
    list_price numeric(18,2),
    vat_pct numeric(5,2) DEFAULT 10,
    amount numeric(18,2) GENERATED ALWAYS AS ((quantity * unit_price)) STORED,
    is_gift boolean DEFAULT false NOT NULL,
    note text
);


--
-- Name: sales_order_line_id_seq; Type: SEQUENCE; Schema: sales; Owner: -
--

ALTER TABLE sales.sales_order_line ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME sales.sales_order_line_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: sales_target; Type: TABLE; Schema: sales; Owner: -
--

CREATE TABLE sales.sales_target (
    id bigint NOT NULL,
    employee_id bigint NOT NULL,
    period text NOT NULL,
    target_amount numeric(18,2) NOT NULL
);


--
-- Name: sales_target_id_seq; Type: SEQUENCE; Schema: sales; Owner: -
--

ALTER TABLE sales.sales_target ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME sales.sales_target_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: scheme_item; Type: TABLE; Schema: sales; Owner: -
--

CREATE TABLE sales.scheme_item (
    id bigint NOT NULL,
    scheme_id bigint NOT NULL,
    product_id bigint NOT NULL
);


--
-- Name: scheme_item_id_seq; Type: SEQUENCE; Schema: sales; Owner: -
--

ALTER TABLE sales.scheme_item ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME sales.scheme_item_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: scheme_price_slab; Type: TABLE; Schema: sales; Owner: -
--

CREATE TABLE sales.scheme_price_slab (
    id bigint NOT NULL,
    scheme_id bigint NOT NULL,
    product_id bigint,
    min_qty numeric(18,4) DEFAULT 0 NOT NULL,
    max_qty numeric(18,4),
    discount_pct numeric(9,4),
    rate numeric(18,2)
);


--
-- Name: scheme_price_slab_id_seq; Type: SEQUENCE; Schema: sales; Owner: -
--

ALTER TABLE sales.scheme_price_slab ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME sales.scheme_price_slab_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: scheme_product_slab; Type: TABLE; Schema: sales; Owner: -
--

CREATE TABLE sales.scheme_product_slab (
    id bigint NOT NULL,
    scheme_id bigint NOT NULL,
    product_id bigint,
    min_qty numeric(18,4) DEFAULT 0 NOT NULL,
    max_qty numeric(18,4),
    free_product_id bigint NOT NULL,
    free_qty numeric(18,4) NOT NULL,
    free_rate numeric(18,2) DEFAULT 0 NOT NULL
);


--
-- Name: scheme_product_slab_id_seq; Type: SEQUENCE; Schema: sales; Owner: -
--

ALTER TABLE sales.scheme_product_slab ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME sales.scheme_product_slab_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: so_cost; Type: TABLE; Schema: sales; Owner: -
--

CREATE TABLE sales.so_cost (
    id bigint NOT NULL,
    order_id bigint NOT NULL,
    cost_type_id bigint NOT NULL,
    payee_id bigint,
    rate_pct numeric(9,4),
    amount numeric(18,2),
    vat_pct numeric(5,2),
    due_date date,
    note text,
    approved boolean DEFAULT false NOT NULL,
    approved_by bigint,
    approved_at timestamp with time zone
);


--
-- Name: so_cost_id_seq; Type: SEQUENCE; Schema: sales; Owner: -
--

ALTER TABLE sales.so_cost ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME sales.so_cost_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: so_payment_actual; Type: TABLE; Schema: sales; Owner: -
--

CREATE TABLE sales.so_payment_actual (
    id bigint NOT NULL,
    order_id bigint NOT NULL,
    pay_date date NOT NULL,
    amount numeric(18,2) NOT NULL,
    method_id bigint,
    note text
);


--
-- Name: so_payment_actual_id_seq; Type: SEQUENCE; Schema: sales; Owner: -
--

ALTER TABLE sales.so_payment_actual ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME sales.so_payment_actual_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: so_payment_request; Type: TABLE; Schema: sales; Owner: -
--

CREATE TABLE sales.so_payment_request (
    id bigint NOT NULL,
    order_id bigint NOT NULL,
    due_date date NOT NULL,
    amount numeric(18,2) NOT NULL,
    auto_generated boolean DEFAULT false NOT NULL,
    status text DEFAULT 'PENDING'::text NOT NULL,
    CONSTRAINT so_payment_request_status_check CHECK ((status = ANY (ARRAY['PENDING'::text, 'SENT_FRM'::text, 'PAID'::text, 'CANCELLED'::text])))
);


--
-- Name: so_payment_request_id_seq; Type: SEQUENCE; Schema: sales; Owner: -
--

ALTER TABLE sales.so_payment_request ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME sales.so_payment_request_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: so_promotion; Type: TABLE; Schema: sales; Owner: -
--

CREATE TABLE sales.so_promotion (
    order_id bigint NOT NULL,
    promotion_id bigint NOT NULL
);


--
-- Name: aggregatedcounter id; Type: DEFAULT; Schema: hangfire; Owner: -
--

ALTER TABLE ONLY hangfire.aggregatedcounter ALTER COLUMN id SET DEFAULT nextval('hangfire.aggregatedcounter_id_seq'::regclass);


--
-- Name: counter id; Type: DEFAULT; Schema: hangfire; Owner: -
--

ALTER TABLE ONLY hangfire.counter ALTER COLUMN id SET DEFAULT nextval('hangfire.counter_id_seq'::regclass);


--
-- Name: hash id; Type: DEFAULT; Schema: hangfire; Owner: -
--

ALTER TABLE ONLY hangfire.hash ALTER COLUMN id SET DEFAULT nextval('hangfire.hash_id_seq'::regclass);


--
-- Name: job id; Type: DEFAULT; Schema: hangfire; Owner: -
--

ALTER TABLE ONLY hangfire.job ALTER COLUMN id SET DEFAULT nextval('hangfire.job_id_seq'::regclass);


--
-- Name: jobparameter id; Type: DEFAULT; Schema: hangfire; Owner: -
--

ALTER TABLE ONLY hangfire.jobparameter ALTER COLUMN id SET DEFAULT nextval('hangfire.jobparameter_id_seq'::regclass);


--
-- Name: jobqueue id; Type: DEFAULT; Schema: hangfire; Owner: -
--

ALTER TABLE ONLY hangfire.jobqueue ALTER COLUMN id SET DEFAULT nextval('hangfire.jobqueue_id_seq'::regclass);


--
-- Name: list id; Type: DEFAULT; Schema: hangfire; Owner: -
--

ALTER TABLE ONLY hangfire.list ALTER COLUMN id SET DEFAULT nextval('hangfire.list_id_seq'::regclass);


--
-- Name: set id; Type: DEFAULT; Schema: hangfire; Owner: -
--

ALTER TABLE ONLY hangfire.set ALTER COLUMN id SET DEFAULT nextval('hangfire.set_id_seq'::regclass);


--
-- Name: state id; Type: DEFAULT; Schema: hangfire; Owner: -
--

ALTER TABLE ONLY hangfire.state ALTER COLUMN id SET DEFAULT nextval('hangfire.state_id_seq'::regclass);


--
-- Data for Name: app_user; Type: TABLE DATA; Schema: core; Owner: -
--

COPY core.app_user (id, username, password_hash, employee_id, is_admin, is_active, created_at) FROM stdin;
1	admin	$2a$11$iwZHK6jJV0Uro5cF30zEYebcJ2Dc.8Rvw4teH9BETKjXRbvRe4Seq	\N	t	t	2026-06-11 12:03:46.21607+07
2	testuser19	$2a$11$Mv4m5bzKdwlgCwdYF3UvheA2KSX5BZSv/LOlaMO5YPFQJTcUDvZy6	\N	f	t	2026-06-13 15:55:09.493769+07
\.


--
-- Data for Name: approval_right; Type: TABLE DATA; Schema: core; Owner: -
--

COPY core.approval_right (id, user_id, doc_type) FROM stdin;
\.


--
-- Data for Name: attachment; Type: TABLE DATA; Schema: core; Owner: -
--

COPY core.attachment (id, ref_table, ref_id, file_name, file_path, uploaded_by, uploaded_at) FROM stdin;
\.


--
-- Data for Name: audit_log; Type: TABLE DATA; Schema: core; Owner: -
--

COPY core.audit_log (id, ref_table, ref_id, action, detail, acted_by, acted_at, created_at, user_id, username) FROM stdin;
1	lead	2	CREATE	{"Id": -9223372036854774807, "Note": "smoke test 2", "DocNo": "LEAD-000002", "Email": "audit2@test.com", "Phone": "0987654321", "Status": "LEAD", "JobTitle": "Tester2", "LastName": "Test2", "MobileNo": null, "CreatedAt": "0001-01-01T00:00:00+00:00", "CreatorId": null, "FirstName": "Audit2", "PartnerId": null, "CampaignId": null, "LostReason": null, "CompanyName": "AuditCo2", "TerritoryId": null, "LeadSourceId": null, "OpportunityId": null, "SalespersonId": null}	\N	2026-06-13 13:32:45.479979+07	2026-06-13 13:32:44.730331+07	1	admin
2	lead	2	UPDATE	{"Note": {"new": "updated remarks", "old": "smoke test 2"}, "Status": {"new": "NEW", "old": "LEAD"}, "LastName": {"new": "TestUpdated", "old": "Test2"}}	\N	2026-06-13 13:33:30.099411+07	2026-06-13 13:33:29.359332+07	1	admin
3	lead	2	DELETE	{"Id": 2, "Note": "updated remarks", "DocNo": "LEAD-000002", "Email": "audit2@test.com", "Phone": "0987654321", "Status": "NEW", "JobTitle": "Tester2", "LastName": "TestUpdated", "MobileNo": null, "CreatedAt": "2026-06-13T06:32:45.427238+00:00", "CreatorId": null, "FirstName": "Audit2", "PartnerId": null, "CampaignId": null, "LostReason": null, "CompanyName": "AuditCo2", "TerritoryId": null, "LeadSourceId": null, "OpportunityId": null, "SalespersonId": null}	\N	2026-06-13 13:33:30.398266+07	2026-06-13 13:33:29.6587+07	1	admin
4	user_group	1	CREATE	{"Id": -9223372036854774807, "Code": "TESTGRP01", "Name": "Test Group 19"}	\N	2026-06-13 14:01:08.813528+07	2026-06-13 14:01:08.050382+07	1	admin
5	app_user	2	CREATE	{"Id": -9223372036854774807, "IsAdmin": false, "IsActive": true, "Username": "testuser19", "CreatedAt": "0001-01-01T00:00:00+00:00", "EmployeeId": null}	\N	2026-06-13 15:55:09.523674+07	2026-06-13 15:55:08.687312+07	1	admin
6	product	13	CREATE	{"Id": -9223372036854774807, "Code": "MRPA6069", "Name": "San pham A", "Spec": null, "IsKit": false, "UomId": 1, "QrCode": null, "Barcode": null, "GroupId": null, "IsActive": true, "MinStock": null, "PriceWeight": null, "ProductType": "GOODS"}	\N	2026-06-13 21:43:14.605485+07	2026-06-13 21:43:13.513412+07	1	admin
7	product	14	CREATE	{"Id": -9223372036854774806, "Code": "MRPB10261", "Name": "Ban thanh pham B", "Spec": null, "IsKit": false, "UomId": 1, "QrCode": null, "Barcode": null, "GroupId": null, "IsActive": true, "MinStock": null, "PriceWeight": null, "ProductType": "GOODS"}	\N	2026-06-13 21:43:16.09174+07	2026-06-13 21:43:15.031972+07	1	admin
8	product	15	CREATE	{"Id": -9223372036854774805, "Code": "MRPC19134", "Name": "NVL C", "Spec": null, "IsKit": false, "UomId": 1, "QrCode": null, "Barcode": null, "GroupId": null, "IsActive": true, "MinStock": null, "PriceWeight": null, "ProductType": "GOODS"}	\N	2026-06-13 21:43:17.290097+07	2026-06-13 21:43:16.231486+07	1	admin
9	product	16	CREATE	{"Id": -9223372036854774804, "Code": "MRPD19288", "Name": "NVL D", "Spec": null, "IsKit": false, "UomId": 1, "QrCode": null, "Barcode": null, "GroupId": null, "IsActive": true, "MinStock": null, "PriceWeight": null, "ProductType": "GOODS"}	\N	2026-06-13 21:43:18.4367+07	2026-06-13 21:43:17.377382+07	1	admin
10	warehouse	2	CREATE	{"Id": -9223372036854774807, "Code": "WHMRP9204", "Name": "Kho MRP test", "IsActive": true, "ParentId": null, "IsOutsourcing": false}	\N	2026-06-13 21:43:19.553026+07	2026-06-13 21:43:18.49457+07	1	admin
11	partner	6	CREATE	{"Id": -9223372036854774807, "Fax": null, "Code": "KHMRP3666", "Email": null, "Phone": null, "Source": null, "Address": null, "Country": null, "Hotline": null, "Ranking": null, "TaxCode": null, "Website": null, "District": null, "FullName": null, "IsActive": true, "Province": null, "ShortName": "KH MRP test", "CreditDays": null, "IsCustomer": true, "IsSupplier": false, "CreditLimit": null, "CustomerGroup": null, "SalespersonId": null, "PaymentMethodId": null, "DeliveryMethodId": null}	\N	2026-06-13 21:43:20.940619+07	2026-06-13 21:43:19.88214+07	1	admin
12	partner	7	CREATE	{"Id": -9223372036854774806, "Fax": null, "Code": "NCCMRP10325", "Email": null, "Phone": null, "Source": null, "Address": null, "Country": null, "Hotline": null, "Ranking": null, "TaxCode": null, "Website": null, "District": null, "FullName": null, "IsActive": true, "Province": null, "ShortName": "NCC MRP test", "CreditDays": null, "IsCustomer": false, "IsSupplier": true, "CreditLimit": null, "CustomerGroup": null, "SalespersonId": null, "PaymentMethodId": null, "DeliveryMethodId": null}	\N	2026-06-13 21:43:22.028134+07	2026-06-13 21:43:20.967222+07	1	admin
13	workstation	1	CREATE	{"Id": -9223372036854774807, "Code": "WS-TMP", "Name": "Gia cong chinh", "IsActive": true, "HourlyRate": 150000, "Description": null, "WorkingHoursPerDay": 8}	\N	2026-06-13 21:43:23.185256+07	2026-06-13 21:43:22.126052+07	1	admin
14	workstation	1	UPDATE	{"Code": {"new": "WS1", "old": "WS-TMP"}}	\N	2026-06-13 21:43:23.227328+07	2026-06-13 21:43:22.168689+07	1	admin
15	bom	1	CREATE	{"Id": -9223372036854774807, "Note": null, "DocNo": "BOM2606-0001", "Status": "DRAFT", "IsActive": true, "Quantity": 1, "CreatedAt": "0001-01-01T00:00:00+00:00", "CreatorId": 1, "IsDefault": true, "ProductId": 14, "SubmittedAt": null, "WithOperations": true}	\N	2026-06-13 21:43:26.031636+07	2026-06-13 21:43:24.968294+07	1	admin
16	bom_item	1	CREATE	{"Id": -9223372036854774807, "Qty": 3, "Rate": 10000, "BomId": -9223372036854774807, "SubBomId": null, "ProductId": 16, "ScrapLossPct": 0}	\N	2026-06-13 21:43:26.031636+07	2026-06-13 21:43:24.968294+07	1	admin
17	bom_operation	1	CREATE	{"Id": -9223372036854774807, "BomId": -9223372036854774807, "HourlyRate": 150000.00, "OperationId": 1, "TimeMinutes": 30, "WorkstationId": 1}	\N	2026-06-13 21:43:26.031636+07	2026-06-13 21:43:24.968294+07	1	admin
18	bom	2	CREATE	{"Id": -9223372036854774806, "Note": null, "DocNo": "BOM2606-0002", "Status": "DRAFT", "IsActive": true, "Quantity": 1, "CreatedAt": "0001-01-01T00:00:00+00:00", "CreatorId": 1, "IsDefault": true, "ProductId": 13, "SubmittedAt": null, "WithOperations": true}	\N	2026-06-13 21:43:27.451147+07	2026-06-13 21:43:26.390931+07	1	admin
19	bom_item	2	CREATE	{"Id": -9223372036854774806, "Qty": 2, "Rate": 0, "BomId": -9223372036854774806, "SubBomId": 1, "ProductId": 14, "ScrapLossPct": 0}	\N	2026-06-13 21:43:27.451147+07	2026-06-13 21:43:26.390931+07	1	admin
20	bom_item	3	CREATE	{"Id": -9223372036854774805, "Qty": 1, "Rate": 20000, "BomId": -9223372036854774806, "SubBomId": null, "ProductId": 15, "ScrapLossPct": 0}	\N	2026-06-13 21:43:27.451147+07	2026-06-13 21:43:26.390931+07	1	admin
21	bom_operation	2	CREATE	{"Id": -9223372036854774806, "BomId": -9223372036854774806, "HourlyRate": 150000.00, "OperationId": 1, "TimeMinutes": 45, "WorkstationId": 1}	\N	2026-06-13 21:43:27.451147+07	2026-06-13 21:43:26.390931+07	1	admin
22	stock_reconciliation	1	CREATE	{"Id": -9223372036854774807, "Note": null, "DocNo": "STOCK_RECONCILIATION-000001", "Status": "DRAFT", "PostedAt": null, "PostedBy": null, "CreatedAt": "0001-01-01T00:00:00+00:00", "CreatedBy": 1, "WarehouseId": 2, "ReconciliationDate": "2026-06-13"}	\N	2026-06-13 21:43:29.1111+07	2026-06-13 21:43:28.050852+07	1	admin
23	stock_reconciliation_line	1	CREATE	{"Id": -9223372036854774807, "LotId": null, "ActualQty": 20, "ProductId": 16, "SystemQty": 0, "Difference": 0, "ReconciliationId": -9223372036854774807}	\N	2026-06-13 21:43:29.1111+07	2026-06-13 21:43:28.050852+07	1	admin
25	stock_reconciliation_line	1	UPDATE	{"Difference": {"new": 20.0000, "old": 0.0000}}	\N	2026-06-13 21:43:30.366759+07	2026-06-13 21:43:29.307396+07	1	admin
24	stock_reconciliation_line	2	CREATE	{"Id": -9223372036854774806, "LotId": null, "ActualQty": 10, "ProductId": 15, "SystemQty": 0, "Difference": 0, "ReconciliationId": -9223372036854774807}	\N	2026-06-13 21:43:29.1111+07	2026-06-13 21:43:28.050852+07	1	admin
26	stock_reconciliation_line	2	UPDATE	{"Difference": {"new": 10.0000, "old": 0.0000}}	\N	2026-06-13 21:43:30.366759+07	2026-06-13 21:43:29.307396+07	1	admin
27	stock_reconciliation	1	UPDATE	{"Status": {"new": "APPROVED", "old": "DRAFT"}}	\N	2026-06-13 21:43:30.498632+07	2026-06-13 21:43:29.439384+07	1	admin
28	sales_order	11	CREATE	{"Id": -9223372036854774807, "Note": null, "DocNo": "DH2606-0010", "Status": "DRAFT", "DocDate": "2026-06-13", "TotalVat": 500000, "CreatedAt": "0001-01-01T00:00:00+00:00", "CreatorId": null, "OrderForm": "NORMAL", "PartnerId": 6, "ApprovedAt": null, "ApproverId": null, "QuotationId": null, "SalesRegion": null, "TotalAmount": 5000000, "WarehouseId": 2, "SalesChannel": null, "SalespersonId": null, "DeliveryAddrId": null, "PaymentMethodId": null, "DeliveryDatePlan": null, "DeliveryMethodId": null}	\N	2026-06-13 21:43:31.069734+07	2026-06-13 21:43:30.416548+07	1	admin
29	sales_order_line	15	CREATE	{"Id": -9223372036854774807, "Note": null, "Amount": 0, "IsGift": false, "KitQty": null, "VatPct": 10, "OrderId": -9223372036854774807, "Quantity": 10, "ListPrice": null, "ProductId": 13, "UnitPrice": 500000}	\N	2026-06-13 21:43:31.069734+07	2026-06-13 21:43:30.416548+07	1	admin
30	production_plan	1	CREATE	{"Id": -9223372036854774807, "Note": null, "DocNo": "KHSX2606-0001", "Status": "DRAFT", "PlanDate": "2026-06-13", "CreatedAt": "0001-01-01T00:00:00+00:00", "CreatorId": 1, "SubmittedAt": null}	\N	2026-06-13 21:43:32.8703+07	2026-06-13 21:43:31.811765+07	1	admin
31	pp_item	1	CREATE	{"Id": -9223372036854774807, "ProductId": 13, "PlannedQty": 10.0000, "ProductionPlanId": -9223372036854774807}	\N	2026-06-13 21:43:32.8703+07	2026-06-13 21:43:31.811765+07	1	admin
32	pp_so	\N	CREATE	{"SalesOrderId": 11, "ProductionPlanId": -9223372036854774807}	\N	2026-06-13 21:43:32.8703+07	2026-06-13 21:43:31.811765+07	1	admin
33	pp_material	2	CREATE	{"Id": -9223372036854774806, "Rate": 20000.00, "OnHand": 0, "Ordered": 0, "Reserved": 0, "ProductId": 15, "RequiredQty": 10.0000, "ShortageQty": 10.0000, "ProjectedQty": 0, "IsManufacturable": false, "ProductionPlanId": 1, "SuggestedSupplierId": null}	\N	2026-06-13 21:43:33.043578+07	2026-06-13 21:43:31.983132+07	1	admin
34	pp_material	1	CREATE	{"Id": -9223372036854774807, "Rate": 10000.00, "OnHand": 0, "Ordered": 0, "Reserved": 0, "ProductId": 16, "RequiredQty": 60.0000, "ShortageQty": 60.0000, "ProjectedQty": 0, "IsManufacturable": false, "ProductionPlanId": 1, "SuggestedSupplierId": null}	\N	2026-06-13 21:43:33.043578+07	2026-06-13 21:43:31.983132+07	1	admin
35	production_plan	1	UPDATE	{"Status": {"new": "SUBMITTED", "old": "DRAFT"}, "SubmittedAt": {"new": "2026-06-13T14:43:34.6842784+00:00", "old": null}}	\N	2026-06-13 21:43:35.837408+07	2026-06-13 21:43:34.777674+07	1	admin
39	stock_reconciliation	2	CREATE	{"Id": -9223372036854774806, "Note": null, "DocNo": "STOCK_RECONCILIATION-000002", "Status": "DRAFT", "PostedAt": null, "PostedBy": null, "CreatedAt": "0001-01-01T00:00:00+00:00", "CreatedBy": 1, "WarehouseId": 2, "ReconciliationDate": "2026-06-13"}	\N	2026-06-13 21:43:36.927725+07	2026-06-13 21:43:35.86793+07	1	admin
40	stock_reconciliation_line	3	CREATE	{"Id": -9223372036854774805, "LotId": null, "ActualQty": 60, "ProductId": 16, "SystemQty": 0, "Difference": 0, "ReconciliationId": -9223372036854774806}	\N	2026-06-13 21:43:36.927725+07	2026-06-13 21:43:35.86793+07	1	admin
41	stock_reconciliation_line	3	UPDATE	{"Difference": {"new": 60.0000, "old": 0.0000}}	\N	2026-06-13 21:43:38.137401+07	2026-06-13 21:43:37.078155+07	1	admin
47	job_card	1	CREATE	{"Id": -9223372036854774807, "Note": null, "Status": "OPEN", "CreatedAt": "0001-01-01T00:00:00+00:00", "StartedAt": null, "CompletedAt": null, "OperationId": 1, "WorkOrderId": 1, "CompletedQty": 0, "WoOperationId": 1, "WorkstationId": 1, "TimeLogMinutes": 0}	\N	2026-06-13 21:43:40.272785+07	2026-06-13 21:43:39.213713+07	1	admin
48	work_order	1	UPDATE	{"Status": {"new": "NOT_STARTED", "old": "DRAFT"}}	\N	2026-06-13 21:43:40.272785+07	2026-06-13 21:43:39.213713+07	1	admin
36	purchase_request	5	CREATE	{"Id": -9223372036854774807, "Note": null, "DocNo": "YC2606-0005", "Status": "DRAFT", "DocDate": "2026-06-13", "CreatedAt": "0001-01-01T00:00:00+00:00", "CreatorId": 1, "ApprovedAt": null, "ApproverId": null, "RequiredBy": null, "RequestType": "PURCHASE", "RequesterId": null, "DepartmentId": null, "StatusReason": null, "ProductionPlanId": 1}	\N	2026-06-13 21:43:36.079724+07	2026-06-13 21:43:35.019961+07	1	admin
37	purchase_request_line	5	CREATE	{"Id": -9223372036854774807, "Note": null, "Quantity": 60.0000, "ProductId": 16, "RequestId": -9223372036854774807}	\N	2026-06-13 21:43:36.079724+07	2026-06-13 21:43:35.019961+07	1	admin
38	purchase_request_line	6	CREATE	{"Id": -9223372036854774806, "Note": null, "Quantity": 10.0000, "ProductId": 15, "RequestId": -9223372036854774807}	\N	2026-06-13 21:43:36.079724+07	2026-06-13 21:43:35.019961+07	1	admin
42	stock_reconciliation	2	UPDATE	{"Status": {"new": "APPROVED", "old": "DRAFT"}}	\N	2026-06-13 21:43:38.31941+07	2026-06-13 21:43:37.256962+07	1	admin
43	work_order	1	CREATE	{"Id": -9223372036854774807, "Qty": 10.0000, "Note": null, "BomId": 2, "DocNo": "LSX2606-0001", "Status": "DRAFT", "CreatedAt": "0001-01-01T00:00:00+00:00", "CreatorId": 1, "ProductId": 13, "StartedAt": null, "StopReason": null, "CompletedAt": null, "ProducedQty": 0, "FgWarehouseId": 2, "PlannedEndDate": null, "WipWarehouseId": 2, "PlannedStartDate": null, "ProductionPlanId": 1, "SourceWarehouseId": 2, "StockDocTransferId": null}	\N	2026-06-13 21:43:38.814801+07	2026-06-13 21:43:37.7547+07	1	admin
44	wo_item	1	CREATE	{"Id": -9223372036854774807, "Rate": 10000.00, "ProductId": 16, "ConsumedQty": 0, "RequiredQty": 60.0000, "WorkOrderId": -9223372036854774807, "TransferredQty": 0}	\N	2026-06-13 21:43:38.814801+07	2026-06-13 21:43:37.7547+07	1	admin
45	wo_item	2	CREATE	{"Id": -9223372036854774806, "Rate": 20000.00, "ProductId": 15, "ConsumedQty": 0, "RequiredQty": 10.0000, "WorkOrderId": -9223372036854774807, "TransferredQty": 0}	\N	2026-06-13 21:43:38.814801+07	2026-06-13 21:43:37.7547+07	1	admin
46	wo_operation	1	CREATE	{"Id": -9223372036854774807, "Status": "PENDING", "HourlyRate": 150000.00, "OperationId": 1, "WorkOrderId": -9223372036854774807, "WorkstationId": 1, "PlannedTimeMinutes": 450.00}	\N	2026-06-13 21:43:38.814801+07	2026-06-13 21:43:37.7547+07	1	admin
49	purchase_order	7	CREATE	{"Id": -9223372036854774807, "Note": null, "DocNo": "PO2606-0007", "RfqId": null, "Status": "DRAFT", "TaxTotal": null, "TotalVat": null, "CreatedAt": "0001-01-01T00:00:00+00:00", "CreatorId": 1, "OrderDate": "2026-06-13", "OrderForm": "NORMAL", "PartnerId": 7, "RequestId": 5, "ApprovedAt": null, "ApproverId": null, "GrandTotal": null, "TotalAmount": null, "VatIncluded": true, "StatusReason": null, "TaxTemplateId": null, "ReceiveAddress": null, "PaymentMethodId": null, "ReceiveDatePlan": null, "DeliveryMethodId": null, "PaymentTermsTemplateId": null}	\N	2026-06-13 21:43:44.108351+07	2026-06-13 21:43:43.048383+07	1	admin
50	purchase_order_line	12	CREATE	{"Id": -9223372036854774807, "Note": null, "Amount": 0, "VatPct": 10, "OrderId": -9223372036854774807, "Quantity": 60.0000, "BilledQty": 0, "ProductId": 16, "UnitPrice": 10000.00, "ReceivedQty": 0}	\N	2026-06-13 21:43:44.108351+07	2026-06-13 21:43:43.048383+07	1	admin
51	product	17	CREATE	{"Id": -9223372036854774807, "Code": "MRPA9472", "Name": "San pham A", "Spec": null, "IsKit": false, "UomId": 1, "QrCode": null, "Barcode": null, "GroupId": null, "IsActive": true, "MinStock": null, "PriceWeight": null, "ProductType": "GOODS"}	\N	2026-06-13 22:00:31.292637+07	2026-06-13 22:00:30.197799+07	1	admin
52	product	18	CREATE	{"Id": -9223372036854774806, "Code": "MRPB3444", "Name": "Ban thanh pham B", "Spec": null, "IsKit": false, "UomId": 1, "QrCode": null, "Barcode": null, "GroupId": null, "IsActive": true, "MinStock": null, "PriceWeight": null, "ProductType": "GOODS"}	\N	2026-06-13 22:00:32.561267+07	2026-06-13 22:00:31.49096+07	1	admin
53	product	19	CREATE	{"Id": -9223372036854774805, "Code": "MRPC21377", "Name": "NVL C", "Spec": null, "IsKit": false, "UomId": 1, "QrCode": null, "Barcode": null, "GroupId": null, "IsActive": true, "MinStock": null, "PriceWeight": null, "ProductType": "GOODS"}	\N	2026-06-13 22:00:33.758375+07	2026-06-13 22:00:32.688536+07	1	admin
54	product	20	CREATE	{"Id": -9223372036854774804, "Code": "MRPD25741", "Name": "NVL D", "Spec": null, "IsKit": false, "UomId": 1, "QrCode": null, "Barcode": null, "GroupId": null, "IsActive": true, "MinStock": null, "PriceWeight": null, "ProductType": "GOODS"}	\N	2026-06-13 22:00:34.980636+07	2026-06-13 22:00:33.909805+07	1	admin
55	warehouse	3	CREATE	{"Id": -9223372036854774807, "Code": "WHMRP9087", "Name": "Kho MRP test", "IsActive": true, "ParentId": null, "IsOutsourcing": false}	\N	2026-06-13 22:00:36.312543+07	2026-06-13 22:00:35.2355+07	1	admin
56	partner	8	CREATE	{"Id": -9223372036854774807, "Fax": null, "Code": "KHMRP32086", "Email": null, "Phone": null, "Source": null, "Address": null, "Country": null, "Hotline": null, "Ranking": null, "TaxCode": null, "Website": null, "District": null, "FullName": null, "IsActive": true, "Province": null, "ShortName": "KH MRP test", "CreditDays": null, "IsCustomer": true, "IsSupplier": false, "CreditLimit": null, "CustomerGroup": null, "SalespersonId": null, "PaymentMethodId": null, "DeliveryMethodId": null}	\N	2026-06-13 22:00:37.549421+07	2026-06-13 22:00:36.475367+07	1	admin
57	partner	9	CREATE	{"Id": -9223372036854774806, "Fax": null, "Code": "NCCMRP9467", "Email": null, "Phone": null, "Source": null, "Address": null, "Country": null, "Hotline": null, "Ranking": null, "TaxCode": null, "Website": null, "District": null, "FullName": null, "IsActive": true, "Province": null, "ShortName": "NCC MRP test", "CreditDays": null, "IsCustomer": false, "IsSupplier": true, "CreditLimit": null, "CustomerGroup": null, "SalespersonId": null, "PaymentMethodId": null, "DeliveryMethodId": null}	\N	2026-06-13 22:00:38.890966+07	2026-06-13 22:00:37.818187+07	1	admin
58	workstation	2	CREATE	{"Id": -9223372036854774807, "Code": "WS-TMP", "Name": "Gia cong chinh", "IsActive": true, "HourlyRate": 150000, "Description": null, "WorkingHoursPerDay": 8}	\N	2026-06-13 22:00:40.176125+07	2026-06-13 22:00:39.100139+07	1	admin
59	workstation	2	UPDATE	{"Code": {"new": "WS2", "old": "WS-TMP"}}	\N	2026-06-13 22:00:40.248032+07	2026-06-13 22:00:39.169352+07	1	admin
60	bom	3	CREATE	{"Id": -9223372036854774807, "Note": null, "DocNo": "BOM2606-0003", "Status": "DRAFT", "IsActive": true, "Quantity": 1, "CreatedAt": "0001-01-01T00:00:00+00:00", "CreatorId": 1, "IsDefault": true, "ProductId": 18, "SubmittedAt": null, "WithOperations": true}	\N	2026-06-13 22:00:43.121322+07	2026-06-13 22:00:42.045659+07	1	admin
61	bom_item	4	CREATE	{"Id": -9223372036854774807, "Qty": 3, "Rate": 10000, "BomId": -9223372036854774807, "SubBomId": null, "ProductId": 20, "ScrapLossPct": 0}	\N	2026-06-13 22:00:43.121322+07	2026-06-13 22:00:42.045659+07	1	admin
62	bom_operation	3	CREATE	{"Id": -9223372036854774807, "BomId": -9223372036854774807, "HourlyRate": 150000.00, "OperationId": 1, "TimeMinutes": 30, "WorkstationId": 2}	\N	2026-06-13 22:00:43.121322+07	2026-06-13 22:00:42.045659+07	1	admin
63	bom	4	CREATE	{"Id": -9223372036854774806, "Note": null, "DocNo": "BOM2606-0004", "Status": "DRAFT", "IsActive": true, "Quantity": 1, "CreatedAt": "0001-01-01T00:00:00+00:00", "CreatorId": 1, "IsDefault": true, "ProductId": 17, "SubmittedAt": null, "WithOperations": true}	\N	2026-06-13 22:00:44.73977+07	2026-06-13 22:00:43.668358+07	1	admin
64	bom_item	5	CREATE	{"Id": -9223372036854774806, "Qty": 2, "Rate": 0, "BomId": -9223372036854774806, "SubBomId": 3, "ProductId": 18, "ScrapLossPct": 0}	\N	2026-06-13 22:00:44.73977+07	2026-06-13 22:00:43.668358+07	1	admin
65	bom_item	6	CREATE	{"Id": -9223372036854774805, "Qty": 1, "Rate": 20000, "BomId": -9223372036854774806, "SubBomId": null, "ProductId": 19, "ScrapLossPct": 0}	\N	2026-06-13 22:00:44.73977+07	2026-06-13 22:00:43.668358+07	1	admin
66	bom_operation	4	CREATE	{"Id": -9223372036854774806, "BomId": -9223372036854774806, "HourlyRate": 150000.00, "OperationId": 1, "TimeMinutes": 45, "WorkstationId": 2}	\N	2026-06-13 22:00:44.73977+07	2026-06-13 22:00:43.668358+07	1	admin
67	stock_reconciliation	3	CREATE	{"Id": -9223372036854774807, "Note": null, "DocNo": "STOCK_RECONCILIATION-000003", "Status": "DRAFT", "PostedAt": null, "PostedBy": null, "CreatedAt": "0001-01-01T00:00:00+00:00", "CreatedBy": 1, "WarehouseId": 3, "ReconciliationDate": "2026-06-13"}	\N	2026-06-13 22:00:46.373717+07	2026-06-13 22:00:45.302302+07	1	admin
68	stock_reconciliation_line	4	CREATE	{"Id": -9223372036854774807, "LotId": null, "ActualQty": 20, "ProductId": 20, "SystemQty": 0, "Difference": 0, "ReconciliationId": -9223372036854774807}	\N	2026-06-13 22:00:46.373717+07	2026-06-13 22:00:45.302302+07	1	admin
69	stock_reconciliation_line	5	CREATE	{"Id": -9223372036854774806, "LotId": null, "ActualQty": 10, "ProductId": 19, "SystemQty": 0, "Difference": 0, "ReconciliationId": -9223372036854774807}	\N	2026-06-13 22:00:46.373717+07	2026-06-13 22:00:45.302302+07	1	admin
70	stock_reconciliation_line	4	UPDATE	{"Difference": {"new": 20.0000, "old": 0.0000}}	\N	2026-06-13 22:00:47.973226+07	2026-06-13 22:00:46.902677+07	1	admin
71	stock_reconciliation_line	5	UPDATE	{"Difference": {"new": 10.0000, "old": 0.0000}}	\N	2026-06-13 22:00:47.973226+07	2026-06-13 22:00:46.902677+07	1	admin
72	stock_reconciliation	3	UPDATE	{"Status": {"new": "APPROVED", "old": "DRAFT"}}	\N	2026-06-13 22:00:48.140496+07	2026-06-13 22:00:47.069824+07	1	admin
73	stock_doc	5	CREATE	{"Id": -9223372036854774807, "Note": "Điều chỉnh tăng theo kiểm kê STOCK_RECONCILIATION-000003", "DocNo": "PN2606-0003", "RefNo": null, "Status": "COMPLETED", "DocType": "RECEIPT", "OrgUnit": null, "Purpose": "MATERIAL_RECEIPT", "SubType": "RECEIPT_CODE_ADJUST", "CreatedAt": "0001-01-01T00:00:00+00:00", "CreatedBy": 1, "PartnerId": null, "ProcessId": null, "ActualDate": "2026-06-13", "CompletedAt": "2026-06-13T15:00:47.1745254+00:00", "CompletedBy": 1, "RequestDate": "2026-06-13", "SalesOrderId": null, "StatusReason": null, "ToWarehouseId": 3, "FromWarehouseId": null, "PurchaseOrderId": null, "CounterpartDocId": null, "SupplierReturnId": null}	\N	2026-06-13 22:00:48.245204+07	2026-06-13 22:00:47.413+07	1	admin
74	stock_doc_line	4	CREATE	{"Id": -9223372036854774807, "Note": null, "DocId": -9223372036854774807, "LotId": null, "KitQty": null, "ActualQty": 20.0000, "ProductId": 20, "UnitPrice": null, "ExpiryDate": null, "LandedCost": 0, "LocationId": null, "RequestedQty": 20.0000}	\N	2026-06-13 22:00:48.245204+07	2026-06-13 22:00:47.413+07	1	admin
75	stock_doc_line	5	CREATE	{"Id": -9223372036854774806, "Note": null, "DocId": -9223372036854774807, "LotId": null, "KitQty": null, "ActualQty": 10.0000, "ProductId": 19, "UnitPrice": null, "ExpiryDate": null, "LandedCost": 0, "LocationId": null, "RequestedQty": 10.0000}	\N	2026-06-13 22:00:48.245204+07	2026-06-13 22:00:47.413+07	1	admin
76	stock_reconciliation	3	UPDATE	{"Status": {"new": "POSTED", "old": "APPROVED"}, "PostedAt": {"new": "2026-06-13T15:00:47.1745254+00:00", "old": null}, "PostedBy": {"new": 1, "old": null}}	\N	2026-06-13 22:00:48.245204+07	2026-06-13 22:00:47.569166+07	1	admin
77	sales_order	12	CREATE	{"Id": -9223372036854774807, "Note": null, "DocNo": "DH2606-0011", "Status": "DRAFT", "DocDate": "2026-06-13", "TotalVat": 500000, "CreatedAt": "0001-01-01T00:00:00+00:00", "CreatorId": null, "OrderForm": "NORMAL", "PartnerId": 8, "ApprovedAt": null, "ApproverId": null, "QuotationId": null, "SalesRegion": null, "TotalAmount": 5000000, "WarehouseId": 3, "SalesChannel": null, "SalespersonId": null, "DeliveryAddrId": null, "PaymentMethodId": null, "DeliveryDatePlan": null, "DeliveryMethodId": null}	\N	2026-06-13 22:00:48.782573+07	2026-06-13 22:00:47.949601+07	1	admin
78	sales_order_line	16	CREATE	{"Id": -9223372036854774807, "Note": null, "Amount": 0, "IsGift": false, "KitQty": null, "VatPct": 10, "OrderId": -9223372036854774807, "Quantity": 10, "ListPrice": null, "ProductId": 17, "UnitPrice": 500000}	\N	2026-06-13 22:00:48.782573+07	2026-06-13 22:00:47.949601+07	1	admin
79	production_plan	2	CREATE	{"Id": -9223372036854774807, "Note": null, "DocNo": "KHSX2606-0002", "Status": "DRAFT", "PlanDate": "2026-06-13", "CreatedAt": "0001-01-01T00:00:00+00:00", "CreatorId": 1, "SubmittedAt": null}	\N	2026-06-13 22:00:50.58407+07	2026-06-13 22:00:49.512741+07	1	admin
80	pp_item	2	CREATE	{"Id": -9223372036854774807, "ProductId": 17, "PlannedQty": 10.0000, "ProductionPlanId": -9223372036854774807}	\N	2026-06-13 22:00:50.58407+07	2026-06-13 22:00:49.512741+07	1	admin
81	pp_so	\N	CREATE	{"SalesOrderId": 12, "ProductionPlanId": -9223372036854774807}	\N	2026-06-13 22:00:50.58407+07	2026-06-13 22:00:49.512741+07	1	admin
82	pp_material	4	CREATE	{"Id": -9223372036854774806, "Rate": 20000.00, "OnHand": 10.0000, "Ordered": 0.0000, "Reserved": 0.0000, "ProductId": 19, "RequiredQty": 10.0000, "ShortageQty": 0, "ProjectedQty": 10.0000, "IsManufacturable": false, "ProductionPlanId": 2, "SuggestedSupplierId": null}	\N	2026-06-13 22:00:50.754543+07	2026-06-13 22:00:49.683021+07	1	admin
83	pp_material	3	CREATE	{"Id": -9223372036854774807, "Rate": 10000.00, "OnHand": 20.0000, "Ordered": 0.0000, "Reserved": 0.0000, "ProductId": 20, "RequiredQty": 60.0000, "ShortageQty": 40.0000, "ProjectedQty": 20.0000, "IsManufacturable": false, "ProductionPlanId": 2, "SuggestedSupplierId": null}	\N	2026-06-13 22:00:50.754543+07	2026-06-13 22:00:49.683021+07	1	admin
84	production_plan	2	UPDATE	{"Status": {"new": "SUBMITTED", "old": "DRAFT"}, "SubmittedAt": {"new": "2026-06-13T15:00:52.4830623+00:00", "old": null}}	\N	2026-06-13 22:00:53.588195+07	2026-06-13 22:00:52.516783+07	1	admin
85	purchase_request	6	CREATE	{"Id": -9223372036854774807, "Note": null, "DocNo": "YC2606-0006", "Status": "DRAFT", "DocDate": "2026-06-13", "CreatedAt": "0001-01-01T00:00:00+00:00", "CreatorId": 1, "ApprovedAt": null, "ApproverId": null, "RequiredBy": null, "RequestType": "PURCHASE", "RequesterId": null, "DepartmentId": null, "StatusReason": null, "ProductionPlanId": 2}	\N	2026-06-13 22:00:53.830152+07	2026-06-13 22:00:52.760751+07	1	admin
86	purchase_request_line	7	CREATE	{"Id": -9223372036854774807, "Note": null, "Quantity": 40.0000, "ProductId": 20, "RequestId": -9223372036854774807}	\N	2026-06-13 22:00:53.830152+07	2026-06-13 22:00:52.760751+07	1	admin
87	stock_reconciliation	4	CREATE	{"Id": -9223372036854774806, "Note": null, "DocNo": "STOCK_RECONCILIATION-000004", "Status": "DRAFT", "PostedAt": null, "PostedBy": null, "CreatedAt": "0001-01-01T00:00:00+00:00", "CreatedBy": 1, "WarehouseId": 3, "ReconciliationDate": "2026-06-13"}	\N	2026-06-13 22:00:54.121737+07	2026-06-13 22:00:53.051613+07	1	admin
88	stock_reconciliation_line	6	CREATE	{"Id": -9223372036854774805, "LotId": null, "ActualQty": 60, "ProductId": 20, "SystemQty": 0, "Difference": 0, "ReconciliationId": -9223372036854774806}	\N	2026-06-13 22:00:54.121737+07	2026-06-13 22:00:53.051613+07	1	admin
89	stock_reconciliation_line	6	UPDATE	{"SystemQty": {"new": 20.0000, "old": 0.0000}, "Difference": {"new": 40.0000, "old": 0.0000}}	\N	2026-06-13 22:00:55.336221+07	2026-06-13 22:00:54.266408+07	1	admin
90	stock_reconciliation	4	UPDATE	{"Status": {"new": "APPROVED", "old": "DRAFT"}}	\N	2026-06-13 22:00:55.443333+07	2026-06-13 22:00:54.372592+07	1	admin
91	stock_doc	6	CREATE	{"Id": -9223372036854774806, "Note": "Điều chỉnh tăng theo kiểm kê STOCK_RECONCILIATION-000004", "DocNo": "PN2606-0004", "RefNo": null, "Status": "COMPLETED", "DocType": "RECEIPT", "OrgUnit": null, "Purpose": "MATERIAL_RECEIPT", "SubType": "RECEIPT_CODE_ADJUST", "CreatedAt": "0001-01-01T00:00:00+00:00", "CreatedBy": 1, "PartnerId": null, "ProcessId": null, "ActualDate": "2026-06-13", "CompletedAt": "2026-06-13T15:00:54.4525797+00:00", "CompletedBy": 1, "RequestDate": "2026-06-13", "SalesOrderId": null, "StatusReason": null, "ToWarehouseId": 3, "FromWarehouseId": null, "PurchaseOrderId": null, "CounterpartDocId": null, "SupplierReturnId": null}	\N	2026-06-13 22:00:55.523754+07	2026-06-13 22:00:54.539916+07	1	admin
92	stock_doc_line	6	CREATE	{"Id": -9223372036854774805, "Note": null, "DocId": -9223372036854774806, "LotId": null, "KitQty": null, "ActualQty": 40.0000, "ProductId": 20, "UnitPrice": null, "ExpiryDate": null, "LandedCost": 0, "LocationId": null, "RequestedQty": 40.0000}	\N	2026-06-13 22:00:55.523754+07	2026-06-13 22:00:54.539916+07	1	admin
93	stock_reconciliation	4	UPDATE	{"Status": {"new": "POSTED", "old": "APPROVED"}, "PostedAt": {"new": "2026-06-13T15:00:54.4525797+00:00", "old": null}, "PostedBy": {"new": 1, "old": null}}	\N	2026-06-13 22:00:55.523754+07	2026-06-13 22:00:54.632117+07	1	admin
104	wo_item	3	UPDATE	{"TransferredQty": {"new": 60.0000, "old": 0.0000}}	\N	2026-06-13 22:00:57.835002+07	2026-06-13 22:00:56.764234+07	1	admin
94	work_order	2	CREATE	{"Id": -9223372036854774807, "Qty": 10.0000, "Note": null, "BomId": 4, "DocNo": "LSX2606-0002", "Status": "DRAFT", "CreatedAt": "0001-01-01T00:00:00+00:00", "CreatorId": 1, "ProductId": 17, "StartedAt": null, "StopReason": null, "CompletedAt": null, "ProducedQty": 0, "FgWarehouseId": 3, "PlannedEndDate": null, "WipWarehouseId": 3, "PlannedStartDate": null, "ProductionPlanId": 2, "SourceWarehouseId": 3, "StockDocTransferId": null}	\N	2026-06-13 22:00:56.052329+07	2026-06-13 22:00:54.981237+07	1	admin
95	wo_item	3	CREATE	{"Id": -9223372036854774807, "Rate": 10000.00, "ProductId": 20, "ConsumedQty": 0, "RequiredQty": 60.0000, "WorkOrderId": -9223372036854774807, "TransferredQty": 0}	\N	2026-06-13 22:00:56.052329+07	2026-06-13 22:00:54.981237+07	1	admin
96	wo_item	4	CREATE	{"Id": -9223372036854774806, "Rate": 20000.00, "ProductId": 19, "ConsumedQty": 0, "RequiredQty": 10.0000, "WorkOrderId": -9223372036854774807, "TransferredQty": 0}	\N	2026-06-13 22:00:56.052329+07	2026-06-13 22:00:54.981237+07	1	admin
97	wo_operation	2	CREATE	{"Id": -9223372036854774807, "Status": "PENDING", "HourlyRate": 150000.00, "OperationId": 1, "WorkOrderId": -9223372036854774807, "WorkstationId": 2, "PlannedTimeMinutes": 450.00}	\N	2026-06-13 22:00:56.052329+07	2026-06-13 22:00:54.981237+07	1	admin
98	job_card	2	CREATE	{"Id": -9223372036854774807, "Note": null, "Status": "OPEN", "CreatedAt": "0001-01-01T00:00:00+00:00", "StartedAt": null, "CompletedAt": null, "OperationId": 1, "WorkOrderId": 2, "CompletedQty": 0, "WoOperationId": 2, "WorkstationId": 2, "TimeLogMinutes": 0}	\N	2026-06-13 22:00:57.43218+07	2026-06-13 22:00:56.361251+07	1	admin
99	work_order	2	UPDATE	{"Status": {"new": "NOT_STARTED", "old": "DRAFT"}}	\N	2026-06-13 22:00:57.43218+07	2026-06-13 22:00:56.361251+07	1	admin
100	work_order	2	UPDATE	{"Status": {"new": "IN_PROCESS", "old": "NOT_STARTED"}}	\N	2026-06-13 22:00:57.671378+07	2026-06-13 22:00:56.601278+07	1	admin
101	stock_doc_line	7	CREATE	{"Id": -9223372036854774804, "Note": null, "DocId": -9223372036854774805, "LotId": null, "KitQty": null, "ActualQty": 60.0000, "ProductId": 20, "UnitPrice": 10000.00, "ExpiryDate": null, "LandedCost": 0, "LocationId": null, "RequestedQty": 60.0000}	\N	2026-06-13 22:00:57.730427+07	2026-06-13 22:00:56.659666+07	1	admin
102	stock_doc	7	CREATE	{"Id": -9223372036854774805, "Note": "Chuyển NVL vào WIP cho lệnh sản xuất LSX2606-0002", "DocNo": "PXSX2606-0001", "RefNo": null, "Status": "COMPLETED", "DocType": "TRANSFER", "OrgUnit": null, "Purpose": "MATERIAL_TRANSFER_FOR_MANUFACTURE", "SubType": "INTERNAL_TRANSFER", "CreatedAt": "0001-01-01T00:00:00+00:00", "CreatedBy": 1, "PartnerId": null, "ProcessId": null, "ActualDate": "2026-06-13", "CompletedAt": "2026-06-13T15:00:56.5005902+00:00", "CompletedBy": 1, "RequestDate": "2026-06-13", "SalesOrderId": null, "StatusReason": null, "ToWarehouseId": 3, "FromWarehouseId": 3, "PurchaseOrderId": null, "CounterpartDocId": null, "SupplierReturnId": null}	\N	2026-06-13 22:00:57.730427+07	2026-06-13 22:00:56.659666+07	1	admin
103	stock_doc_line	8	CREATE	{"Id": -9223372036854774803, "Note": null, "DocId": -9223372036854774805, "LotId": null, "KitQty": null, "ActualQty": 10.0000, "ProductId": 19, "UnitPrice": 20000.00, "ExpiryDate": null, "LandedCost": 0, "LocationId": null, "RequestedQty": 10.0000}	\N	2026-06-13 22:00:57.730427+07	2026-06-13 22:00:56.659666+07	1	admin
105	wo_item	4	UPDATE	{"TransferredQty": {"new": 10.0000, "old": 0.0000}}	\N	2026-06-13 22:00:57.835002+07	2026-06-13 22:00:56.764234+07	1	admin
106	work_order	2	UPDATE	{"StartedAt": {"new": "2026-06-13T15:00:56.5005902+00:00", "old": null}, "StockDocTransferId": {"new": 7, "old": null}}	\N	2026-06-13 22:00:57.835002+07	2026-06-13 22:00:56.764234+07	1	admin
107	purchase_order	8	CREATE	{"Id": -9223372036854774807, "Note": null, "DocNo": "PO2606-0008", "RfqId": null, "Status": "DRAFT", "TaxTotal": null, "TotalVat": null, "CreatedAt": "0001-01-01T00:00:00+00:00", "CreatorId": 1, "OrderDate": "2026-06-13", "OrderForm": "NORMAL", "PartnerId": 9, "RequestId": 6, "ApprovedAt": null, "ApproverId": null, "GrandTotal": null, "TotalAmount": null, "VatIncluded": true, "StatusReason": null, "TaxTemplateId": null, "ReceiveAddress": null, "PaymentMethodId": null, "ReceiveDatePlan": null, "DeliveryMethodId": null, "PaymentTermsTemplateId": null}	\N	2026-06-13 22:01:01.353614+07	2026-06-13 22:01:00.282218+07	1	admin
108	purchase_order_line	13	CREATE	{"Id": -9223372036854774807, "Note": null, "Amount": 0, "VatPct": 10, "OrderId": -9223372036854774807, "Quantity": 40.0000, "BilledQty": 0, "ProductId": 20, "UnitPrice": 10000.00, "ReceivedQty": 0}	\N	2026-06-13 22:01:01.353614+07	2026-06-13 22:01:00.282218+07	1	admin
109	product	21	CREATE	{"Id": -9223372036854774807, "Code": "MRPA10641", "Name": "San pham A", "Spec": null, "IsKit": false, "UomId": 1, "QrCode": null, "Barcode": null, "GroupId": null, "IsActive": true, "MinStock": null, "PriceWeight": null, "ProductType": "GOODS"}	\N	2026-06-13 22:06:30.512982+07	2026-06-13 22:06:29.413088+07	1	admin
110	product	22	CREATE	{"Id": -9223372036854774806, "Code": "MRPB17517", "Name": "Ban thanh pham B", "Spec": null, "IsKit": false, "UomId": 1, "QrCode": null, "Barcode": null, "GroupId": null, "IsActive": true, "MinStock": null, "PriceWeight": null, "ProductType": "GOODS"}	\N	2026-06-13 22:06:31.967346+07	2026-06-13 22:06:30.892798+07	1	admin
111	product	23	CREATE	{"Id": -9223372036854774805, "Code": "MRPC26990", "Name": "NVL C", "Spec": null, "IsKit": false, "UomId": 1, "QrCode": null, "Barcode": null, "GroupId": null, "IsActive": true, "MinStock": null, "PriceWeight": null, "ProductType": "GOODS"}	\N	2026-06-13 22:06:33.376914+07	2026-06-13 22:06:32.301574+07	1	admin
112	product	24	CREATE	{"Id": -9223372036854774804, "Code": "MRPD22424", "Name": "NVL D", "Spec": null, "IsKit": false, "UomId": 1, "QrCode": null, "Barcode": null, "GroupId": null, "IsActive": true, "MinStock": null, "PriceWeight": null, "ProductType": "GOODS"}	\N	2026-06-13 22:06:34.596414+07	2026-06-13 22:06:33.522059+07	1	admin
113	warehouse	4	CREATE	{"Id": -9223372036854774807, "Code": "WHMRP31689", "Name": "Kho MRP test", "IsActive": true, "ParentId": null, "IsOutsourcing": false}	\N	2026-06-13 22:06:35.767734+07	2026-06-13 22:06:34.692795+07	1	admin
114	partner	10	CREATE	{"Id": -9223372036854774807, "Fax": null, "Code": "KHMRP28831", "Email": null, "Phone": null, "Source": null, "Address": null, "Country": null, "Hotline": null, "Ranking": null, "TaxCode": null, "Website": null, "District": null, "FullName": null, "IsActive": true, "Province": null, "ShortName": "KH MRP test", "CreditDays": null, "IsCustomer": true, "IsSupplier": false, "CreditLimit": null, "CustomerGroup": null, "SalespersonId": null, "PaymentMethodId": null, "DeliveryMethodId": null}	\N	2026-06-13 22:06:37.029229+07	2026-06-13 22:06:35.9546+07	1	admin
115	partner	11	CREATE	{"Id": -9223372036854774806, "Fax": null, "Code": "NCCMRP9612", "Email": null, "Phone": null, "Source": null, "Address": null, "Country": null, "Hotline": null, "Ranking": null, "TaxCode": null, "Website": null, "District": null, "FullName": null, "IsActive": true, "Province": null, "ShortName": "NCC MRP test", "CreditDays": null, "IsCustomer": false, "IsSupplier": true, "CreditLimit": null, "CustomerGroup": null, "SalespersonId": null, "PaymentMethodId": null, "DeliveryMethodId": null}	\N	2026-06-13 22:06:38.362591+07	2026-06-13 22:06:37.288289+07	1	admin
116	workstation	3	CREATE	{"Id": -9223372036854774807, "Code": "WS-TMP", "Name": "Gia cong chinh", "IsActive": true, "HourlyRate": 150000, "Description": null, "WorkingHoursPerDay": 8}	\N	2026-06-13 22:06:39.550933+07	2026-06-13 22:06:38.476783+07	1	admin
117	workstation	3	UPDATE	{"Code": {"new": "WS3", "old": "WS-TMP"}}	\N	2026-06-13 22:06:39.59466+07	2026-06-13 22:06:38.517049+07	1	admin
118	bom	5	CREATE	{"Id": -9223372036854774807, "Note": null, "DocNo": "BOM2606-0005", "Status": "DRAFT", "IsActive": true, "Quantity": 1, "CreatedAt": "0001-01-01T00:00:00+00:00", "CreatorId": 1, "IsDefault": true, "ProductId": 22, "SubmittedAt": null, "WithOperations": true}	\N	2026-06-13 22:06:42.503053+07	2026-06-13 22:06:41.427006+07	1	admin
119	bom_item	7	CREATE	{"Id": -9223372036854774807, "Qty": 3, "Rate": 10000, "BomId": -9223372036854774807, "SubBomId": null, "ProductId": 24, "ScrapLossPct": 0}	\N	2026-06-13 22:06:42.503053+07	2026-06-13 22:06:41.427006+07	1	admin
120	bom_operation	5	CREATE	{"Id": -9223372036854774807, "BomId": -9223372036854774807, "HourlyRate": 150000.00, "OperationId": 1, "TimeMinutes": 30, "WorkstationId": 3}	\N	2026-06-13 22:06:42.503053+07	2026-06-13 22:06:41.427006+07	1	admin
121	bom	6	CREATE	{"Id": -9223372036854774806, "Note": null, "DocNo": "BOM2606-0006", "Status": "DRAFT", "IsActive": true, "Quantity": 1, "CreatedAt": "0001-01-01T00:00:00+00:00", "CreatorId": 1, "IsDefault": true, "ProductId": 21, "SubmittedAt": null, "WithOperations": true}	\N	2026-06-13 22:06:43.865293+07	2026-06-13 22:06:42.789882+07	1	admin
122	bom_item	8	CREATE	{"Id": -9223372036854774806, "Qty": 2, "Rate": 0, "BomId": -9223372036854774806, "SubBomId": 5, "ProductId": 22, "ScrapLossPct": 0}	\N	2026-06-13 22:06:43.865293+07	2026-06-13 22:06:42.789882+07	1	admin
123	bom_item	9	CREATE	{"Id": -9223372036854774805, "Qty": 1, "Rate": 20000, "BomId": -9223372036854774806, "SubBomId": null, "ProductId": 23, "ScrapLossPct": 0}	\N	2026-06-13 22:06:43.865293+07	2026-06-13 22:06:42.789882+07	1	admin
124	bom_operation	6	CREATE	{"Id": -9223372036854774806, "BomId": -9223372036854774806, "HourlyRate": 150000.00, "OperationId": 1, "TimeMinutes": 45, "WorkstationId": 3}	\N	2026-06-13 22:06:43.865293+07	2026-06-13 22:06:42.789882+07	1	admin
125	stock_reconciliation	5	CREATE	{"Id": -9223372036854774807, "Note": null, "DocNo": "STOCK_RECONCILIATION-000005", "Status": "DRAFT", "PostedAt": null, "PostedBy": null, "CreatedAt": "0001-01-01T00:00:00+00:00", "CreatedBy": 1, "WarehouseId": 4, "ReconciliationDate": "2026-06-13"}	\N	2026-06-13 22:06:45.453413+07	2026-06-13 22:06:44.378014+07	1	admin
126	stock_reconciliation_line	7	CREATE	{"Id": -9223372036854774807, "LotId": null, "ActualQty": 20, "ProductId": 24, "SystemQty": 0, "Difference": 0, "ReconciliationId": -9223372036854774807}	\N	2026-06-13 22:06:45.453413+07	2026-06-13 22:06:44.378014+07	1	admin
127	stock_reconciliation_line	8	CREATE	{"Id": -9223372036854774806, "LotId": null, "ActualQty": 10, "ProductId": 23, "SystemQty": 0, "Difference": 0, "ReconciliationId": -9223372036854774807}	\N	2026-06-13 22:06:45.453413+07	2026-06-13 22:06:44.378014+07	1	admin
128	stock_reconciliation_line	7	UPDATE	{"Difference": {"new": 20.0000, "old": 0.0000}}	\N	2026-06-13 22:06:46.588977+07	2026-06-13 22:06:45.513863+07	1	admin
129	stock_reconciliation_line	8	UPDATE	{"Difference": {"new": 10.0000, "old": 0.0000}}	\N	2026-06-13 22:06:46.588977+07	2026-06-13 22:06:45.513863+07	1	admin
130	stock_reconciliation	5	UPDATE	{"Status": {"new": "APPROVED", "old": "DRAFT"}}	\N	2026-06-13 22:06:46.753063+07	2026-06-13 22:06:45.67884+07	1	admin
131	stock_doc	10	CREATE	{"Id": -9223372036854774807, "Note": "Điều chỉnh tăng theo kiểm kê STOCK_RECONCILIATION-000005", "DocNo": "PN2606-0005", "RefNo": null, "Status": "COMPLETED", "DocType": "RECEIPT", "OrgUnit": null, "Purpose": "MATERIAL_RECEIPT", "SubType": "RECEIPT_CODE_ADJUST", "CreatedAt": "0001-01-01T00:00:00+00:00", "CreatedBy": 1, "PartnerId": null, "ProcessId": null, "ActualDate": "2026-06-13", "CompletedAt": "2026-06-13T15:06:45.8242111+00:00", "CompletedBy": 1, "RequestDate": "2026-06-13", "SalesOrderId": null, "StatusReason": null, "ToWarehouseId": 4, "FromWarehouseId": null, "PurchaseOrderId": null, "CounterpartDocId": null, "SupplierReturnId": null}	\N	2026-06-13 22:06:46.898688+07	2026-06-13 22:06:45.976219+07	1	admin
132	stock_doc_line	9	CREATE	{"Id": -9223372036854774807, "Note": null, "DocId": -9223372036854774807, "LotId": null, "KitQty": null, "ActualQty": 20.0000, "ProductId": 24, "UnitPrice": null, "ExpiryDate": null, "LandedCost": 0, "LocationId": null, "RequestedQty": 20.0000}	\N	2026-06-13 22:06:46.898688+07	2026-06-13 22:06:45.976219+07	1	admin
133	stock_doc_line	10	CREATE	{"Id": -9223372036854774806, "Note": null, "DocId": -9223372036854774807, "LotId": null, "KitQty": null, "ActualQty": 10.0000, "ProductId": 23, "UnitPrice": null, "ExpiryDate": null, "LandedCost": 0, "LocationId": null, "RequestedQty": 10.0000}	\N	2026-06-13 22:06:46.898688+07	2026-06-13 22:06:45.976219+07	1	admin
134	stock_reconciliation	5	UPDATE	{"Status": {"new": "POSTED", "old": "APPROVED"}, "PostedAt": {"new": "2026-06-13T15:06:45.8242111+00:00", "old": null}, "PostedBy": {"new": 1, "old": null}}	\N	2026-06-13 22:06:46.898688+07	2026-06-13 22:06:46.126305+07	1	admin
135	sales_order	13	CREATE	{"Id": -9223372036854774807, "Note": null, "DocNo": "DH2606-0012", "Status": "DRAFT", "DocDate": "2026-06-13", "TotalVat": 500000, "CreatedAt": "0001-01-01T00:00:00+00:00", "CreatorId": null, "OrderForm": "NORMAL", "PartnerId": 10, "ApprovedAt": null, "ApproverId": null, "QuotationId": null, "SalesRegion": null, "TotalAmount": 5000000, "WarehouseId": 4, "SalesChannel": null, "SalespersonId": null, "DeliveryAddrId": null, "PaymentMethodId": null, "DeliveryDatePlan": null, "DeliveryMethodId": null}	\N	2026-06-13 22:06:47.367594+07	2026-06-13 22:06:46.597516+07	1	admin
136	sales_order_line	17	CREATE	{"Id": -9223372036854774807, "Note": null, "Amount": 0, "IsGift": false, "KitQty": null, "VatPct": 10, "OrderId": -9223372036854774807, "Quantity": 10, "ListPrice": null, "ProductId": 21, "UnitPrice": 500000}	\N	2026-06-13 22:06:47.367594+07	2026-06-13 22:06:46.597516+07	1	admin
137	production_plan	3	CREATE	{"Id": -9223372036854774807, "Note": null, "DocNo": "KHSX2606-0003", "Status": "DRAFT", "PlanDate": "2026-06-13", "CreatedAt": "0001-01-01T00:00:00+00:00", "CreatorId": 1, "SubmittedAt": null}	\N	2026-06-13 22:06:49.382464+07	2026-06-13 22:06:48.307894+07	1	admin
138	pp_item	3	CREATE	{"Id": -9223372036854774807, "ProductId": 21, "PlannedQty": 10.0000, "ProductionPlanId": -9223372036854774807}	\N	2026-06-13 22:06:49.382464+07	2026-06-13 22:06:48.307894+07	1	admin
139	pp_so	\N	CREATE	{"SalesOrderId": 13, "ProductionPlanId": -9223372036854774807}	\N	2026-06-13 22:06:49.382464+07	2026-06-13 22:06:48.307894+07	1	admin
140	pp_material	6	CREATE	{"Id": -9223372036854774806, "Rate": 20000.00, "OnHand": 10.0000, "Ordered": 0.0000, "Reserved": 0.0000, "ProductId": 23, "RequiredQty": 10.0000, "ShortageQty": 0, "ProjectedQty": 10.0000, "IsManufacturable": false, "ProductionPlanId": 3, "SuggestedSupplierId": null}	\N	2026-06-13 22:06:49.782645+07	2026-06-13 22:06:48.702077+07	1	admin
141	pp_material	5	CREATE	{"Id": -9223372036854774807, "Rate": 10000.00, "OnHand": 20.0000, "Ordered": 0.0000, "Reserved": 0.0000, "ProductId": 24, "RequiredQty": 60.0000, "ShortageQty": 40.0000, "ProjectedQty": 20.0000, "IsManufacturable": false, "ProductionPlanId": 3, "SuggestedSupplierId": null}	\N	2026-06-13 22:06:49.782645+07	2026-06-13 22:06:48.702077+07	1	admin
142	production_plan	3	UPDATE	{"Status": {"new": "SUBMITTED", "old": "DRAFT"}, "SubmittedAt": {"new": "2026-06-13T15:06:51.4433605+00:00", "old": null}}	\N	2026-06-13 22:06:52.594469+07	2026-06-13 22:06:51.482578+07	1	admin
143	purchase_request	7	CREATE	{"Id": -9223372036854774807, "Note": null, "DocNo": "YC2606-0007", "Status": "DRAFT", "DocDate": "2026-06-13", "CreatedAt": "0001-01-01T00:00:00+00:00", "CreatorId": 1, "ApprovedAt": null, "ApproverId": null, "RequiredBy": null, "RequestType": "PURCHASE", "RequesterId": null, "DepartmentId": null, "StatusReason": null, "ProductionPlanId": 3}	\N	2026-06-13 22:06:52.847548+07	2026-06-13 22:06:51.772772+07	1	admin
144	purchase_request_line	8	CREATE	{"Id": -9223372036854774807, "Note": null, "Quantity": 40.0000, "ProductId": 24, "RequestId": -9223372036854774807}	\N	2026-06-13 22:06:52.847548+07	2026-06-13 22:06:51.772772+07	1	admin
145	stock_reconciliation	6	CREATE	{"Id": -9223372036854774806, "Note": null, "DocNo": "STOCK_RECONCILIATION-000006", "Status": "DRAFT", "PostedAt": null, "PostedBy": null, "CreatedAt": "0001-01-01T00:00:00+00:00", "CreatedBy": 1, "WarehouseId": 4, "ReconciliationDate": "2026-06-13"}	\N	2026-06-13 22:06:53.182961+07	2026-06-13 22:06:52.107984+07	1	admin
146	stock_reconciliation_line	9	CREATE	{"Id": -9223372036854774805, "LotId": null, "ActualQty": 60, "ProductId": 24, "SystemQty": 0, "Difference": 0, "ReconciliationId": -9223372036854774806}	\N	2026-06-13 22:06:53.182961+07	2026-06-13 22:06:52.107984+07	1	admin
147	stock_reconciliation_line	9	UPDATE	{"SystemQty": {"new": 20.0000, "old": 0.0000}, "Difference": {"new": 40.0000, "old": 0.0000}}	\N	2026-06-13 22:06:54.383178+07	2026-06-13 22:06:53.309071+07	1	admin
148	stock_reconciliation	6	UPDATE	{"Status": {"new": "APPROVED", "old": "DRAFT"}}	\N	2026-06-13 22:06:54.483927+07	2026-06-13 22:06:53.409439+07	1	admin
149	stock_doc	11	CREATE	{"Id": -9223372036854774806, "Note": "Điều chỉnh tăng theo kiểm kê STOCK_RECONCILIATION-000006", "DocNo": "PN2606-0006", "RefNo": null, "Status": "COMPLETED", "DocType": "RECEIPT", "OrgUnit": null, "Purpose": "MATERIAL_RECEIPT", "SubType": "RECEIPT_CODE_ADJUST", "CreatedAt": "0001-01-01T00:00:00+00:00", "CreatedBy": 1, "PartnerId": null, "ProcessId": null, "ActualDate": "2026-06-13", "CompletedAt": "2026-06-13T15:06:53.4889486+00:00", "CompletedBy": 1, "RequestDate": "2026-06-13", "SalesOrderId": null, "StatusReason": null, "ToWarehouseId": 4, "FromWarehouseId": null, "PurchaseOrderId": null, "CounterpartDocId": null, "SupplierReturnId": null}	\N	2026-06-13 22:06:54.563353+07	2026-06-13 22:06:53.578695+07	1	admin
150	stock_doc_line	11	CREATE	{"Id": -9223372036854774805, "Note": null, "DocId": -9223372036854774806, "LotId": null, "KitQty": null, "ActualQty": 40.0000, "ProductId": 24, "UnitPrice": null, "ExpiryDate": null, "LandedCost": 0, "LocationId": null, "RequestedQty": 40.0000}	\N	2026-06-13 22:06:54.563353+07	2026-06-13 22:06:53.578695+07	1	admin
151	stock_reconciliation	6	UPDATE	{"Status": {"new": "POSTED", "old": "APPROVED"}, "PostedAt": {"new": "2026-06-13T15:06:53.4889486+00:00", "old": null}, "PostedBy": {"new": 1, "old": null}}	\N	2026-06-13 22:06:54.563353+07	2026-06-13 22:06:53.67547+07	1	admin
152	work_order	3	CREATE	{"Id": -9223372036854774807, "Qty": 10.0000, "Note": null, "BomId": 6, "DocNo": "LSX2606-0003", "Status": "DRAFT", "CreatedAt": "0001-01-01T00:00:00+00:00", "CreatorId": 1, "ProductId": 21, "StartedAt": null, "StopReason": null, "CompletedAt": null, "ProducedQty": 0, "FgWarehouseId": 4, "PlannedEndDate": null, "WipWarehouseId": 4, "PlannedStartDate": null, "ProductionPlanId": 3, "SourceWarehouseId": 4, "StockDocTransferId": null}	\N	2026-06-13 22:06:55.132376+07	2026-06-13 22:06:54.056435+07	1	admin
153	wo_item	5	CREATE	{"Id": -9223372036854774807, "Rate": 10000.00, "ProductId": 24, "ConsumedQty": 0, "RequiredQty": 60.0000, "WorkOrderId": -9223372036854774807, "TransferredQty": 0}	\N	2026-06-13 22:06:55.132376+07	2026-06-13 22:06:54.056435+07	1	admin
154	wo_item	6	CREATE	{"Id": -9223372036854774806, "Rate": 20000.00, "ProductId": 23, "ConsumedQty": 0, "RequiredQty": 10.0000, "WorkOrderId": -9223372036854774807, "TransferredQty": 0}	\N	2026-06-13 22:06:55.132376+07	2026-06-13 22:06:54.056435+07	1	admin
155	wo_operation	3	CREATE	{"Id": -9223372036854774807, "Status": "PENDING", "HourlyRate": 150000.00, "OperationId": 1, "WorkOrderId": -9223372036854774807, "WorkstationId": 3, "PlannedTimeMinutes": 450.00}	\N	2026-06-13 22:06:55.132376+07	2026-06-13 22:06:54.056435+07	1	admin
156	job_card	3	CREATE	{"Id": -9223372036854774807, "Note": null, "Status": "OPEN", "CreatedAt": "0001-01-01T00:00:00+00:00", "StartedAt": null, "CompletedAt": null, "OperationId": 1, "WorkOrderId": 3, "CompletedQty": 0, "WoOperationId": 3, "WorkstationId": 3, "TimeLogMinutes": 0}	\N	2026-06-13 22:06:56.559621+07	2026-06-13 22:06:55.484321+07	1	admin
157	work_order	3	UPDATE	{"Status": {"new": "NOT_STARTED", "old": "DRAFT"}}	\N	2026-06-13 22:06:56.559621+07	2026-06-13 22:06:55.484321+07	1	admin
158	work_order	3	UPDATE	{"Status": {"new": "IN_PROCESS", "old": "NOT_STARTED"}}	\N	2026-06-13 22:06:56.732401+07	2026-06-13 22:06:55.657777+07	1	admin
159	stock_doc	12	CREATE	{"Id": -9223372036854774805, "Note": "Chuyển NVL vào WIP cho lệnh sản xuất LSX2606-0003", "DocNo": "PXSX2606-0002", "RefNo": null, "Status": "COMPLETED", "DocType": "TRANSFER", "OrgUnit": null, "Purpose": "MATERIAL_TRANSFER_FOR_MANUFACTURE", "SubType": "INTERNAL_TRANSFER", "CreatedAt": "0001-01-01T00:00:00+00:00", "CreatedBy": 1, "PartnerId": null, "ProcessId": null, "ActualDate": "2026-06-13", "CompletedAt": "2026-06-13T15:06:55.5857122+00:00", "CompletedBy": 1, "RequestDate": "2026-06-13", "SalesOrderId": null, "StatusReason": null, "ToWarehouseId": 4, "FromWarehouseId": 4, "PurchaseOrderId": null, "CounterpartDocId": null, "SupplierReturnId": null}	\N	2026-06-13 22:06:56.790146+07	2026-06-13 22:06:55.71452+07	1	admin
160	stock_doc_line	12	CREATE	{"Id": -9223372036854774804, "Note": null, "DocId": -9223372036854774805, "LotId": null, "KitQty": null, "ActualQty": 60.0000, "ProductId": 24, "UnitPrice": 10000.00, "ExpiryDate": null, "LandedCost": 0, "LocationId": null, "RequestedQty": 60.0000}	\N	2026-06-13 22:06:56.790146+07	2026-06-13 22:06:55.71452+07	1	admin
161	stock_doc_line	13	CREATE	{"Id": -9223372036854774803, "Note": null, "DocId": -9223372036854774805, "LotId": null, "KitQty": null, "ActualQty": 10.0000, "ProductId": 23, "UnitPrice": 20000.00, "ExpiryDate": null, "LandedCost": 0, "LocationId": null, "RequestedQty": 10.0000}	\N	2026-06-13 22:06:56.790146+07	2026-06-13 22:06:55.71452+07	1	admin
162	wo_item	5	UPDATE	{"TransferredQty": {"new": 60.0000, "old": 0.0000}}	\N	2026-06-13 22:06:56.895665+07	2026-06-13 22:06:55.820913+07	1	admin
163	work_order	3	UPDATE	{"StartedAt": {"new": "2026-06-13T15:06:55.5857122+00:00", "old": null}, "StockDocTransferId": {"new": 12, "old": null}}	\N	2026-06-13 22:06:56.895665+07	2026-06-13 22:06:55.820913+07	1	admin
164	wo_item	6	UPDATE	{"TransferredQty": {"new": 10.0000, "old": 0.0000}}	\N	2026-06-13 22:06:56.895665+07	2026-06-13 22:06:55.820913+07	1	admin
165	stock_doc	13	CREATE	{"Id": -9223372036854774804, "Note": "Hoàn thành đợt sản xuất LSX2606-0003 - SL 6", "DocNo": "PNSX2606-0003", "RefNo": null, "Status": "COMPLETED", "DocType": "TRANSFER", "OrgUnit": null, "Purpose": "MANUFACTURE", "SubType": "MANUFACTURE", "CreatedAt": "0001-01-01T00:00:00+00:00", "CreatedBy": 1, "PartnerId": null, "ProcessId": null, "ActualDate": "2026-06-13", "CompletedAt": "2026-06-13T15:06:55.9534127+00:00", "CompletedBy": 1, "RequestDate": "2026-06-13", "SalesOrderId": null, "StatusReason": null, "ToWarehouseId": 4, "FromWarehouseId": 4, "PurchaseOrderId": null, "CounterpartDocId": null, "SupplierReturnId": null}	\N	2026-06-13 22:06:57.103398+07	2026-06-13 22:06:56.028477+07	1	admin
166	stock_doc_line	14	CREATE	{"Id": -9223372036854774802, "Note": null, "DocId": -9223372036854774804, "LotId": null, "KitQty": null, "ActualQty": 36.00000, "ProductId": 24, "UnitPrice": 10000.00, "ExpiryDate": null, "LandedCost": 0, "LocationId": null, "RequestedQty": 36.00000}	\N	2026-06-13 22:06:57.103398+07	2026-06-13 22:06:56.028477+07	1	admin
167	stock_doc_line	15	CREATE	{"Id": -9223372036854774801, "Note": null, "DocId": -9223372036854774804, "LotId": null, "KitQty": null, "ActualQty": 6.00000, "ProductId": 23, "UnitPrice": 20000.00, "ExpiryDate": null, "LandedCost": 0, "LocationId": null, "RequestedQty": 6.00000}	\N	2026-06-13 22:06:57.103398+07	2026-06-13 22:06:56.028477+07	1	admin
168	stock_doc_line	16	CREATE	{"Id": -9223372036854774800, "Note": null, "DocId": -9223372036854774804, "LotId": null, "KitQty": null, "ActualQty": 6, "ProductId": 21, "UnitPrice": 192500.00, "ExpiryDate": null, "LandedCost": 0, "LocationId": null, "RequestedQty": 6}	\N	2026-06-13 22:06:57.103398+07	2026-06-13 22:06:56.028477+07	1	admin
169	wo_finish_batch	1	CREATE	{"Id": -9223372036854774807, "Qty": 6, "Cost": 1155000.00, "StockDocId": 13, "CompletedAt": "2026-06-13T15:06:55.9534127+00:00", "WorkOrderId": 3}	\N	2026-06-13 22:06:57.244357+07	2026-06-13 22:06:56.168729+07	1	admin
170	work_order	3	UPDATE	{"ProducedQty": {"new": 6.0000, "old": 0.0000}}	\N	2026-06-13 22:06:57.244357+07	2026-06-13 22:06:56.168729+07	1	admin
171	wo_item	5	UPDATE	{"ConsumedQty": {"new": 36.00000, "old": 0.0000}}	\N	2026-06-13 22:06:57.244357+07	2026-06-13 22:06:56.168729+07	1	admin
172	wo_item	6	UPDATE	{"ConsumedQty": {"new": 6.00000, "old": 0.0000}}	\N	2026-06-13 22:06:57.244357+07	2026-06-13 22:06:56.168729+07	1	admin
173	stock_doc	14	CREATE	{"Id": -9223372036854774803, "Note": "Hoàn thành đợt sản xuất LSX2606-0003 - SL 4", "DocNo": "PNSX2606-0004", "RefNo": null, "Status": "COMPLETED", "DocType": "TRANSFER", "OrgUnit": null, "Purpose": "MANUFACTURE", "SubType": "MANUFACTURE", "CreatedAt": "0001-01-01T00:00:00+00:00", "CreatedBy": 1, "PartnerId": null, "ProcessId": null, "ActualDate": "2026-06-13", "CompletedAt": "2026-06-13T15:06:56.4782011+00:00", "CompletedBy": 1, "RequestDate": "2026-06-13", "SalesOrderId": null, "StatusReason": null, "ToWarehouseId": 4, "FromWarehouseId": 4, "PurchaseOrderId": null, "CounterpartDocId": null, "SupplierReturnId": null}	\N	2026-06-13 22:06:57.625678+07	2026-06-13 22:06:56.549932+07	1	admin
174	stock_doc_line	17	CREATE	{"Id": -9223372036854774799, "Note": null, "DocId": -9223372036854774803, "LotId": null, "KitQty": null, "ActualQty": 24.00000, "ProductId": 24, "UnitPrice": 10000.00, "ExpiryDate": null, "LandedCost": 0, "LocationId": null, "RequestedQty": 24.00000}	\N	2026-06-13 22:06:57.625678+07	2026-06-13 22:06:56.549932+07	1	admin
175	stock_doc_line	18	CREATE	{"Id": -9223372036854774798, "Note": null, "DocId": -9223372036854774803, "LotId": null, "KitQty": null, "ActualQty": 4.00000, "ProductId": 23, "UnitPrice": 20000.00, "ExpiryDate": null, "LandedCost": 0, "LocationId": null, "RequestedQty": 4.00000}	\N	2026-06-13 22:06:57.625678+07	2026-06-13 22:06:56.549932+07	1	admin
176	stock_doc_line	19	CREATE	{"Id": -9223372036854774797, "Note": null, "DocId": -9223372036854774803, "LotId": null, "KitQty": null, "ActualQty": 4, "ProductId": 21, "UnitPrice": 192500.00, "ExpiryDate": null, "LandedCost": 0, "LocationId": null, "RequestedQty": 4}	\N	2026-06-13 22:06:57.625678+07	2026-06-13 22:06:56.549932+07	1	admin
177	wo_finish_batch	2	CREATE	{"Id": -9223372036854774806, "Qty": 4, "Cost": 770000.00, "StockDocId": 14, "CompletedAt": "2026-06-13T15:06:56.4782011+00:00", "WorkOrderId": 3}	\N	2026-06-13 22:06:57.760473+07	2026-06-13 22:06:56.685155+07	1	admin
178	work_order	3	UPDATE	{"Status": {"new": "COMPLETED", "old": "IN_PROCESS"}, "CompletedAt": {"new": "2026-06-13T15:06:56.4782011+00:00", "old": null}, "ProducedQty": {"new": 10.0000, "old": 6.0000}}	\N	2026-06-13 22:06:57.760473+07	2026-06-13 22:06:56.685155+07	1	admin
179	wo_item	5	UPDATE	{"ConsumedQty": {"new": 60.00000, "old": 36.0000}}	\N	2026-06-13 22:06:57.760473+07	2026-06-13 22:06:56.685155+07	1	admin
180	wo_item	6	UPDATE	{"ConsumedQty": {"new": 10.00000, "old": 6.0000}}	\N	2026-06-13 22:06:57.760473+07	2026-06-13 22:06:56.685155+07	1	admin
181	purchase_order	9	CREATE	{"Id": -9223372036854774807, "Note": null, "DocNo": "PO2606-0009", "RfqId": null, "Status": "DRAFT", "TaxTotal": null, "TotalVat": null, "CreatedAt": "0001-01-01T00:00:00+00:00", "CreatorId": 1, "OrderDate": "2026-06-13", "OrderForm": "NORMAL", "PartnerId": 11, "RequestId": 7, "ApprovedAt": null, "ApproverId": null, "GrandTotal": null, "TotalAmount": null, "VatIncluded": true, "StatusReason": null, "TaxTemplateId": null, "ReceiveAddress": null, "PaymentMethodId": null, "ReceiveDatePlan": null, "DeliveryMethodId": null, "PaymentTermsTemplateId": null}	\N	2026-06-13 22:07:00.814148+07	2026-06-13 22:06:59.739467+07	1	admin
182	purchase_order_line	14	CREATE	{"Id": -9223372036854774807, "Note": null, "Amount": 0, "VatPct": 10, "OrderId": -9223372036854774807, "Quantity": 40.0000, "BilledQty": 0, "ProductId": 24, "UnitPrice": 10000.00, "ReceivedQty": 0}	\N	2026-06-13 22:07:00.814148+07	2026-06-13 22:06:59.739467+07	1	admin
183	partner	12	CREATE	{"Id": -9223372036854774807, "Fax": null, "Code": "KHFV218661", "Email": null, "Phone": null, "Source": null, "Address": null, "Country": null, "Hotline": null, "Ranking": null, "TaxCode": null, "Website": null, "District": null, "FullName": null, "IsActive": true, "Province": null, "ShortName": "KH Finance V2", "CreditDays": null, "IsCustomer": true, "IsSupplier": false, "CreditLimit": null, "CustomerGroup": null, "SalespersonId": null, "PaymentMethodId": null, "DeliveryMethodId": null}	\N	2026-06-14 07:09:07.264474+07	2026-06-14 07:09:05.809448+07	1	admin
184	voucher	2	CREATE	{"Id": -9223372036854774807, "DocNo": "FINANCE_VOUCHER-000001", "FundId": null, "Status": "DRAFT", "DocDate": "2026-06-14", "DueDate": null, "YccType": null, "PeriodId": null, "PostedAt": null, "PostedBy": null, "TotalVat": null, "CreatedAt": "0001-01-01T00:00:00+00:00", "CreatedBy": 1, "InvoiceNo": null, "PartnerId": 12, "EmployeeId": null, "PaidAmount": null, "Description": "Hoa don ban FV2-1", "InvoiceDate": null, "InvoiceForm": null, "OperationId": null, "PaymentType": null, "PostingDate": null, "TotalAmount": null, "VoucherType": "HOA_DON_BAN", "WarehouseId": null, "CurrencyCode": "VND", "ExchangeRate": 1, "AmendedFromId": null, "InvoiceSerial": null, "LerpVoucherId": null, "PaymentStatus": null, "OutstandingAmount": null, "UnallocatedAmount": null}	\N	2026-06-14 07:09:08.695096+07	2026-06-14 07:09:07.262001+07	1	admin
185	voucher	3	CREATE	{"Id": -9223372036854774806, "DocNo": "FINANCE_VOUCHER-000002", "FundId": 2, "Status": "DRAFT", "DocDate": "2026-06-14", "DueDate": null, "YccType": null, "PeriodId": null, "PostedAt": null, "PostedBy": null, "TotalVat": null, "CreatedAt": "0001-01-01T00:00:00+00:00", "CreatedBy": 1, "InvoiceNo": null, "PartnerId": 12, "EmployeeId": null, "PaidAmount": null, "Description": "Thu tien KH lan 1", "InvoiceDate": null, "InvoiceForm": null, "OperationId": null, "PaymentType": "RECEIVE", "PostingDate": null, "TotalAmount": null, "VoucherType": "PHIEU_THU", "WarehouseId": null, "CurrencyCode": "VND", "ExchangeRate": 1, "AmendedFromId": null, "InvoiceSerial": null, "LerpVoucherId": null, "PaymentStatus": null, "OutstandingAmount": null, "UnallocatedAmount": null}	\N	2026-06-14 07:09:12.237267+07	2026-06-14 07:09:10.803655+07	1	admin
186	voucher	4	CREATE	{"Id": -9223372036854774805, "DocNo": "FINANCE_VOUCHER-000003", "FundId": 2, "Status": "DRAFT", "DocDate": "2026-06-14", "DueDate": null, "YccType": null, "PeriodId": null, "PostedAt": null, "PostedBy": null, "TotalVat": null, "CreatedAt": "0001-01-01T00:00:00+00:00", "CreatedBy": 1, "InvoiceNo": null, "PartnerId": 12, "EmployeeId": null, "PaidAmount": null, "Description": "Thu tien KH lan 2", "InvoiceDate": null, "InvoiceForm": null, "OperationId": null, "PaymentType": "RECEIVE", "PostingDate": null, "TotalAmount": null, "VoucherType": "PHIEU_THU", "WarehouseId": null, "CurrencyCode": "VND", "ExchangeRate": 1, "AmendedFromId": null, "InvoiceSerial": null, "LerpVoucherId": null, "PaymentStatus": null, "OutstandingAmount": null, "UnallocatedAmount": null}	\N	2026-06-14 07:09:18.588357+07	2026-06-14 07:09:17.156708+07	1	admin
286	voucher	42	UPDATE	{"PaymentStatus": {"new": "PAID", "old": "UNPAID"}, "OutstandingAmount": {"new": 0.00, "old": 1000000.00}}	\N	2026-06-14 07:30:22.563094+07	2026-06-14 07:30:21.118635+07	1	admin
187	voucher	5	CREATE	{"Id": -9223372036854774804, "DocNo": "FINANCE_VOUCHER-000004", "FundId": null, "Status": "DRAFT", "DocDate": "2026-06-14", "DueDate": null, "YccType": null, "PeriodId": null, "PostedAt": null, "PostedBy": null, "TotalVat": null, "CreatedAt": "0001-01-01T00:00:00+00:00", "CreatedBy": 1, "InvoiceNo": null, "PartnerId": 12, "EmployeeId": null, "PaidAmount": null, "Description": "Hoa don ban FV2-2", "InvoiceDate": null, "InvoiceForm": null, "OperationId": null, "PaymentType": null, "PostingDate": null, "TotalAmount": null, "VoucherType": "HOA_DON_BAN", "WarehouseId": null, "CurrencyCode": "VND", "ExchangeRate": 1, "AmendedFromId": null, "InvoiceSerial": null, "LerpVoucherId": null, "PaymentStatus": null, "OutstandingAmount": null, "UnallocatedAmount": null}	\N	2026-06-14 07:09:22.857734+07	2026-06-14 07:09:21.424754+07	1	admin
188	voucher	6	CREATE	{"Id": -9223372036854774803, "DocNo": "FINANCE_VOUCHER-000005", "FundId": null, "Status": "DRAFT", "DocDate": "2026-06-14", "DueDate": null, "YccType": null, "PeriodId": null, "PostedAt": null, "PostedBy": null, "TotalVat": null, "CreatedAt": "0001-01-01T00:00:00+00:00", "CreatedBy": 1, "InvoiceNo": null, "PartnerId": null, "EmployeeId": null, "PaidAmount": null, "Description": "CP QLDN khong CC", "InvoiceDate": null, "InvoiceForm": null, "OperationId": null, "PaymentType": null, "PostingDate": null, "TotalAmount": null, "VoucherType": "CT_TONG_HOP", "WarehouseId": null, "CurrencyCode": "VND", "ExchangeRate": 1, "AmendedFromId": null, "InvoiceSerial": null, "LerpVoucherId": null, "PaymentStatus": null, "OutstandingAmount": null, "UnallocatedAmount": null}	\N	2026-06-14 07:09:41.712119+07	2026-06-14 07:09:40.280587+07	1	admin
189	voucher	7	CREATE	{"Id": -9223372036854774802, "DocNo": "FINANCE_VOUCHER-000006", "FundId": null, "Status": "DRAFT", "DocDate": "2026-06-14", "DueDate": null, "YccType": null, "PeriodId": null, "PostedAt": null, "PostedBy": null, "TotalVat": null, "CreatedAt": "0001-01-01T00:00:00+00:00", "CreatedBy": 1, "InvoiceNo": null, "PartnerId": null, "EmployeeId": null, "PaidAmount": null, "Description": "CP QLDN co CC", "InvoiceDate": null, "InvoiceForm": null, "OperationId": null, "PaymentType": null, "PostingDate": null, "TotalAmount": null, "VoucherType": "CT_TONG_HOP", "WarehouseId": null, "CurrencyCode": "VND", "ExchangeRate": 1, "AmendedFromId": null, "InvoiceSerial": null, "LerpVoucherId": null, "PaymentStatus": null, "OutstandingAmount": null, "UnallocatedAmount": null}	\N	2026-06-14 07:09:43.016252+07	2026-06-14 07:09:41.584722+07	1	admin
190	cost_center	25	CREATE	{"Id": -9223372036854774807, "Code": "CCV212641", "Name": "Kinh doanh V2 Test", "IsGroup": false, "IsActive": true, "ParentId": 1}	\N	2026-06-14 07:09:45.209393+07	2026-06-14 07:09:43.777572+07	1	admin
191	cost_center	25	UPDATE	{"Name": {"new": "Kinh doanh V2 Test (updated)", "old": "Kinh doanh V2 Test"}}	\N	2026-06-14 07:09:46.353032+07	2026-06-14 07:09:44.921289+07	1	admin
192	partner	13	CREATE	{"Id": -9223372036854774807, "Fax": null, "Code": "KHFV219428", "Email": null, "Phone": null, "Source": null, "Address": null, "Country": null, "Hotline": null, "Ranking": null, "TaxCode": null, "Website": null, "District": null, "FullName": null, "IsActive": true, "Province": null, "ShortName": "KH Finance V2", "CreditDays": null, "IsCustomer": true, "IsSupplier": false, "CreditLimit": null, "CustomerGroup": null, "SalespersonId": null, "PaymentMethodId": null, "DeliveryMethodId": null}	\N	2026-06-14 07:13:09.411942+07	2026-06-14 07:13:07.961281+07	1	admin
193	voucher	8	CREATE	{"Id": -9223372036854774807, "DocNo": "FINANCE_VOUCHER-000007", "FundId": null, "Status": "DRAFT", "DocDate": "2026-06-14", "DueDate": null, "YccType": null, "PeriodId": null, "PostedAt": null, "PostedBy": null, "TotalVat": null, "CreatedAt": "0001-01-01T00:00:00+00:00", "CreatedBy": 1, "InvoiceNo": null, "PartnerId": 13, "EmployeeId": null, "PaidAmount": null, "Description": "Hoa don ban FV2-1", "InvoiceDate": null, "InvoiceForm": null, "OperationId": null, "PaymentType": null, "PostingDate": null, "TotalAmount": null, "VoucherType": "HOA_DON_BAN", "WarehouseId": null, "CurrencyCode": "VND", "ExchangeRate": 1, "AmendedFromId": null, "InvoiceSerial": null, "LerpVoucherId": null, "PaymentStatus": null, "OutstandingAmount": null, "UnallocatedAmount": null}	\N	2026-06-14 07:13:10.915188+07	2026-06-14 07:13:09.48005+07	1	admin
194	voucher	9	CREATE	{"Id": -9223372036854774806, "DocNo": "FINANCE_VOUCHER-000008", "FundId": 2, "Status": "DRAFT", "DocDate": "2026-06-14", "DueDate": null, "YccType": null, "PeriodId": null, "PostedAt": null, "PostedBy": null, "TotalVat": null, "CreatedAt": "0001-01-01T00:00:00+00:00", "CreatedBy": 1, "InvoiceNo": null, "PartnerId": 13, "EmployeeId": null, "PaidAmount": null, "Description": "Thu tien KH lan 1", "InvoiceDate": null, "InvoiceForm": null, "OperationId": null, "PaymentType": "RECEIVE", "PostingDate": null, "TotalAmount": null, "VoucherType": "PHIEU_THU", "WarehouseId": null, "CurrencyCode": "VND", "ExchangeRate": 1, "AmendedFromId": null, "InvoiceSerial": null, "LerpVoucherId": null, "PaymentStatus": null, "OutstandingAmount": null, "UnallocatedAmount": null}	\N	2026-06-14 07:13:15.290636+07	2026-06-14 07:13:13.855462+07	1	admin
195	voucher	10	CREATE	{"Id": -9223372036854774805, "DocNo": "FINANCE_VOUCHER-000009", "FundId": 2, "Status": "DRAFT", "DocDate": "2026-06-14", "DueDate": null, "YccType": null, "PeriodId": null, "PostedAt": null, "PostedBy": null, "TotalVat": null, "CreatedAt": "0001-01-01T00:00:00+00:00", "CreatedBy": 1, "InvoiceNo": null, "PartnerId": 13, "EmployeeId": null, "PaidAmount": null, "Description": "Thu tien KH lan 2", "InvoiceDate": null, "InvoiceForm": null, "OperationId": null, "PaymentType": "RECEIVE", "PostingDate": null, "TotalAmount": null, "VoucherType": "PHIEU_THU", "WarehouseId": null, "CurrencyCode": "VND", "ExchangeRate": 1, "AmendedFromId": null, "InvoiceSerial": null, "LerpVoucherId": null, "PaymentStatus": null, "OutstandingAmount": null, "UnallocatedAmount": null}	\N	2026-06-14 07:13:22.35247+07	2026-06-14 07:13:20.905985+07	1	admin
196	voucher	11	CREATE	{"Id": -9223372036854774804, "DocNo": "FINANCE_VOUCHER-000010", "FundId": null, "Status": "DRAFT", "DocDate": "2026-06-14", "DueDate": null, "YccType": null, "PeriodId": null, "PostedAt": null, "PostedBy": null, "TotalVat": null, "CreatedAt": "0001-01-01T00:00:00+00:00", "CreatedBy": 1, "InvoiceNo": null, "PartnerId": 13, "EmployeeId": null, "PaidAmount": null, "Description": "Hoa don ban FV2-2", "InvoiceDate": null, "InvoiceForm": null, "OperationId": null, "PaymentType": null, "PostingDate": null, "TotalAmount": null, "VoucherType": "HOA_DON_BAN", "WarehouseId": null, "CurrencyCode": "VND", "ExchangeRate": 1, "AmendedFromId": null, "InvoiceSerial": null, "LerpVoucherId": null, "PaymentStatus": null, "OutstandingAmount": null, "UnallocatedAmount": null}	\N	2026-06-14 07:13:26.82528+07	2026-06-14 07:13:25.391615+07	1	admin
197	voucher	12	CREATE	{"Id": -9223372036854774803, "DocNo": "FINANCE_VOUCHER-000011", "FundId": null, "Status": "DRAFT", "DocDate": "2026-06-14", "DueDate": null, "YccType": null, "PeriodId": null, "PostedAt": null, "PostedBy": null, "TotalVat": null, "CreatedAt": "0001-01-01T00:00:00+00:00", "CreatedBy": 1, "InvoiceNo": null, "PartnerId": null, "EmployeeId": null, "PaidAmount": null, "Description": "CP QLDN khong CC", "InvoiceDate": null, "InvoiceForm": null, "OperationId": null, "PaymentType": null, "PostingDate": null, "TotalAmount": null, "VoucherType": "CT_TONG_HOP", "WarehouseId": null, "CurrencyCode": "VND", "ExchangeRate": 1, "AmendedFromId": null, "InvoiceSerial": null, "LerpVoucherId": null, "PaymentStatus": null, "OutstandingAmount": null, "UnallocatedAmount": null}	\N	2026-06-14 07:13:43.274113+07	2026-06-14 07:13:41.83975+07	1	admin
200	cost_center	28	UPDATE	{"Name": {"new": "Kinh doanh V2 Test (updated)", "old": "Kinh doanh V2 Test"}}	\N	2026-06-14 07:13:47.665438+07	2026-06-14 07:13:46.23166+07	1	admin
198	voucher	13	CREATE	{"Id": -9223372036854774802, "DocNo": "FINANCE_VOUCHER-000012", "FundId": null, "Status": "DRAFT", "DocDate": "2026-06-14", "DueDate": null, "YccType": null, "PeriodId": null, "PostedAt": null, "PostedBy": null, "TotalVat": null, "CreatedAt": "0001-01-01T00:00:00+00:00", "CreatedBy": 1, "InvoiceNo": null, "PartnerId": null, "EmployeeId": null, "PaidAmount": null, "Description": "CP QLDN co CC", "InvoiceDate": null, "InvoiceForm": null, "OperationId": null, "PaymentType": null, "PostingDate": null, "TotalAmount": null, "VoucherType": "CT_TONG_HOP", "WarehouseId": null, "CurrencyCode": "VND", "ExchangeRate": 1, "AmendedFromId": null, "InvoiceSerial": null, "LerpVoucherId": null, "PaymentStatus": null, "OutstandingAmount": null, "UnallocatedAmount": null}	\N	2026-06-14 07:13:44.537453+07	2026-06-14 07:13:43.101619+07	1	admin
199	cost_center	28	CREATE	{"Id": -9223372036854774807, "Code": "CCV215381", "Name": "Kinh doanh V2 Test", "IsGroup": false, "IsActive": true, "ParentId": 1}	\N	2026-06-14 07:13:46.637219+07	2026-06-14 07:13:45.202799+07	1	admin
201	partner	14	CREATE	{"Id": -9223372036854774807, "Fax": null, "Code": "KHFV220101", "Email": null, "Phone": null, "Source": null, "Address": null, "Country": null, "Hotline": null, "Ranking": null, "TaxCode": null, "Website": null, "District": null, "FullName": null, "IsActive": true, "Province": null, "ShortName": "KH Finance V2", "CreditDays": null, "IsCustomer": true, "IsSupplier": false, "CreditLimit": null, "CustomerGroup": null, "SalespersonId": null, "PaymentMethodId": null, "DeliveryMethodId": null}	\N	2026-06-14 07:16:29.378383+07	2026-06-14 07:16:27.926105+07	1	admin
202	voucher	14	CREATE	{"Id": -9223372036854774807, "DocNo": "FINANCE_VOUCHER-000013", "FundId": null, "Status": "DRAFT", "DocDate": "2026-06-14", "DueDate": null, "YccType": null, "PeriodId": null, "PostedAt": null, "PostedBy": null, "TotalVat": null, "CreatedAt": "0001-01-01T00:00:00+00:00", "CreatedBy": 1, "InvoiceNo": null, "PartnerId": 14, "EmployeeId": null, "PaidAmount": null, "Description": "Hoa don ban FV2-1", "InvoiceDate": null, "InvoiceForm": null, "OperationId": null, "PaymentType": null, "PostingDate": null, "TotalAmount": null, "VoucherType": "HOA_DON_BAN", "WarehouseId": null, "CurrencyCode": "VND", "ExchangeRate": 1, "AmendedFromId": null, "InvoiceSerial": null, "LerpVoucherId": null, "PaymentStatus": null, "OutstandingAmount": null, "UnallocatedAmount": null}	\N	2026-06-14 07:16:30.612417+07	2026-06-14 07:16:29.171003+07	1	admin
203	voucher	15	CREATE	{"Id": -9223372036854774806, "DocNo": "FINANCE_VOUCHER-000014", "FundId": 2, "Status": "DRAFT", "DocDate": "2026-06-14", "DueDate": null, "YccType": null, "PeriodId": null, "PostedAt": null, "PostedBy": null, "TotalVat": null, "CreatedAt": "0001-01-01T00:00:00+00:00", "CreatedBy": 1, "InvoiceNo": null, "PartnerId": 14, "EmployeeId": null, "PaidAmount": null, "Description": "Thu tien KH lan 1", "InvoiceDate": null, "InvoiceForm": null, "OperationId": null, "PaymentType": "RECEIVE", "PostingDate": null, "TotalAmount": null, "VoucherType": "PHIEU_THU", "WarehouseId": null, "CurrencyCode": "VND", "ExchangeRate": 1, "AmendedFromId": null, "InvoiceSerial": null, "LerpVoucherId": null, "PaymentStatus": null, "OutstandingAmount": null, "UnallocatedAmount": null}	\N	2026-06-14 07:16:33.738067+07	2026-06-14 07:16:32.30104+07	1	admin
204	voucher	16	CREATE	{"Id": -9223372036854774805, "DocNo": "FINANCE_VOUCHER-000015", "FundId": 2, "Status": "DRAFT", "DocDate": "2026-06-14", "DueDate": null, "YccType": null, "PeriodId": null, "PostedAt": null, "PostedBy": null, "TotalVat": null, "CreatedAt": "0001-01-01T00:00:00+00:00", "CreatedBy": 1, "InvoiceNo": null, "PartnerId": 14, "EmployeeId": null, "PaidAmount": null, "Description": "Thu tien KH lan 2", "InvoiceDate": null, "InvoiceForm": null, "OperationId": null, "PaymentType": "RECEIVE", "PostingDate": null, "TotalAmount": null, "VoucherType": "PHIEU_THU", "WarehouseId": null, "CurrencyCode": "VND", "ExchangeRate": 1, "AmendedFromId": null, "InvoiceSerial": null, "LerpVoucherId": null, "PaymentStatus": null, "OutstandingAmount": null, "UnallocatedAmount": null}	\N	2026-06-14 07:16:40.008129+07	2026-06-14 07:16:38.571698+07	1	admin
205	voucher	17	CREATE	{"Id": -9223372036854774804, "DocNo": "FINANCE_VOUCHER-000016", "FundId": null, "Status": "DRAFT", "DocDate": "2026-06-14", "DueDate": null, "YccType": null, "PeriodId": null, "PostedAt": null, "PostedBy": null, "TotalVat": null, "CreatedAt": "0001-01-01T00:00:00+00:00", "CreatedBy": 1, "InvoiceNo": null, "PartnerId": 14, "EmployeeId": null, "PaidAmount": null, "Description": "Hoa don ban FV2-2", "InvoiceDate": null, "InvoiceForm": null, "OperationId": null, "PaymentType": null, "PostingDate": null, "TotalAmount": null, "VoucherType": "HOA_DON_BAN", "WarehouseId": null, "CurrencyCode": "VND", "ExchangeRate": 1, "AmendedFromId": null, "InvoiceSerial": null, "LerpVoucherId": null, "PaymentStatus": null, "OutstandingAmount": null, "UnallocatedAmount": null}	\N	2026-06-14 07:16:43.989302+07	2026-06-14 07:16:42.553565+07	1	admin
206	voucher	18	CREATE	{"Id": -9223372036854774803, "DocNo": "FINANCE_VOUCHER-000017", "FundId": null, "Status": "DRAFT", "DocDate": "2026-06-14", "DueDate": null, "YccType": null, "PeriodId": null, "PostedAt": null, "PostedBy": null, "TotalVat": null, "CreatedAt": "0001-01-01T00:00:00+00:00", "CreatedBy": 1, "InvoiceNo": null, "PartnerId": null, "EmployeeId": null, "PaidAmount": null, "Description": "CP QLDN khong CC", "InvoiceDate": null, "InvoiceForm": null, "OperationId": null, "PaymentType": null, "PostingDate": null, "TotalAmount": null, "VoucherType": "CT_TONG_HOP", "WarehouseId": null, "CurrencyCode": "VND", "ExchangeRate": 1, "AmendedFromId": null, "InvoiceSerial": null, "LerpVoucherId": null, "PaymentStatus": null, "OutstandingAmount": null, "UnallocatedAmount": null}	\N	2026-06-14 07:16:59.621524+07	2026-06-14 07:16:58.183637+07	1	admin
207	voucher	19	CREATE	{"Id": -9223372036854774802, "DocNo": "FINANCE_VOUCHER-000018", "FundId": null, "Status": "DRAFT", "DocDate": "2026-06-14", "DueDate": null, "YccType": null, "PeriodId": null, "PostedAt": null, "PostedBy": null, "TotalVat": null, "CreatedAt": "0001-01-01T00:00:00+00:00", "CreatedBy": 1, "InvoiceNo": null, "PartnerId": null, "EmployeeId": null, "PaidAmount": null, "Description": "CP QLDN co CC", "InvoiceDate": null, "InvoiceForm": null, "OperationId": null, "PaymentType": null, "PostingDate": null, "TotalAmount": null, "VoucherType": "CT_TONG_HOP", "WarehouseId": null, "CurrencyCode": "VND", "ExchangeRate": 1, "AmendedFromId": null, "InvoiceSerial": null, "LerpVoucherId": null, "PaymentStatus": null, "OutstandingAmount": null, "UnallocatedAmount": null}	\N	2026-06-14 07:17:00.817164+07	2026-06-14 07:16:59.380597+07	1	admin
208	cost_center	31	CREATE	{"Id": -9223372036854774807, "Code": "CCV21328", "Name": "Kinh doanh V2 Test", "IsGroup": false, "IsActive": true, "ParentId": 1}	\N	2026-06-14 07:17:02.95259+07	2026-06-14 07:17:01.516139+07	1	admin
209	cost_center	31	UPDATE	{"Name": {"new": "Kinh doanh V2 Test (updated)", "old": "Kinh doanh V2 Test"}}	\N	2026-06-14 07:17:03.975743+07	2026-06-14 07:17:02.539809+07	1	admin
210	partner	15	CREATE	{"Id": -9223372036854774807, "Fax": null, "Code": "KHFV220650", "Email": null, "Phone": null, "Source": null, "Address": null, "Country": null, "Hotline": null, "Ranking": null, "TaxCode": null, "Website": null, "District": null, "FullName": null, "IsActive": true, "Province": null, "ShortName": "KH Finance V2", "CreditDays": null, "IsCustomer": true, "IsSupplier": false, "CreditLimit": null, "CustomerGroup": null, "SalespersonId": null, "PaymentMethodId": null, "DeliveryMethodId": null}	\N	2026-06-14 07:19:19.267505+07	2026-06-14 07:19:17.804428+07	1	admin
279	payment_allocation	8	CREATE	{"Id": -9223372036854774806, "CreatedAt": "0001-01-01T00:00:00+00:00", "AllocatedAmount": 4000000, "InvoiceVoucherId": 39, "PaymentVoucherId": 41}	\N	2026-06-14 07:30:16.49331+07	2026-06-14 07:30:15.048347+07	1	admin
211	voucher	20	CREATE	{"Id": -9223372036854774807, "DocNo": "FINANCE_VOUCHER-000019", "FundId": null, "Status": "DRAFT", "DocDate": "2026-06-14", "DueDate": null, "YccType": null, "PeriodId": null, "PostedAt": null, "PostedBy": null, "TotalVat": null, "CreatedAt": "0001-01-01T00:00:00+00:00", "CreatedBy": 1, "InvoiceNo": null, "PartnerId": 15, "EmployeeId": null, "PaidAmount": null, "Description": "Hoa don ban FV2-1", "InvoiceDate": null, "InvoiceForm": null, "OperationId": null, "PaymentType": null, "PostingDate": null, "TotalAmount": null, "VoucherType": "HOA_DON_BAN", "WarehouseId": null, "CurrencyCode": "VND", "ExchangeRate": 1, "AmendedFromId": null, "InvoiceSerial": null, "LerpVoucherId": null, "PaymentStatus": null, "OutstandingAmount": null, "UnallocatedAmount": null}	\N	2026-06-14 07:19:20.659191+07	2026-06-14 07:19:19.220986+07	1	admin
212	voucher	21	CREATE	{"Id": -9223372036854774806, "DocNo": "FINANCE_VOUCHER-000020", "FundId": 2, "Status": "DRAFT", "DocDate": "2026-06-14", "DueDate": null, "YccType": null, "PeriodId": null, "PostedAt": null, "PostedBy": null, "TotalVat": null, "CreatedAt": "0001-01-01T00:00:00+00:00", "CreatedBy": 1, "InvoiceNo": null, "PartnerId": 15, "EmployeeId": null, "PaidAmount": null, "Description": "Thu tien KH lan 1", "InvoiceDate": null, "InvoiceForm": null, "OperationId": null, "PaymentType": "RECEIVE", "PostingDate": null, "TotalAmount": null, "VoucherType": "PHIEU_THU", "WarehouseId": null, "CurrencyCode": "VND", "ExchangeRate": 1, "AmendedFromId": null, "InvoiceSerial": null, "LerpVoucherId": null, "PaymentStatus": null, "OutstandingAmount": null, "UnallocatedAmount": null}	\N	2026-06-14 07:19:23.768209+07	2026-06-14 07:19:22.329662+07	1	admin
213	voucher	22	CREATE	{"Id": -9223372036854774805, "DocNo": "FINANCE_VOUCHER-000021", "FundId": 2, "Status": "DRAFT", "DocDate": "2026-06-14", "DueDate": null, "YccType": null, "PeriodId": null, "PostedAt": null, "PostedBy": null, "TotalVat": null, "CreatedAt": "0001-01-01T00:00:00+00:00", "CreatedBy": 1, "InvoiceNo": null, "PartnerId": 15, "EmployeeId": null, "PaidAmount": null, "Description": "Thu tien KH lan 2", "InvoiceDate": null, "InvoiceForm": null, "OperationId": null, "PaymentType": "RECEIVE", "PostingDate": null, "TotalAmount": null, "VoucherType": "PHIEU_THU", "WarehouseId": null, "CurrencyCode": "VND", "ExchangeRate": 1, "AmendedFromId": null, "InvoiceSerial": null, "LerpVoucherId": null, "PaymentStatus": null, "OutstandingAmount": null, "UnallocatedAmount": null}	\N	2026-06-14 07:19:29.729131+07	2026-06-14 07:19:28.288606+07	1	admin
214	voucher	23	CREATE	{"Id": -9223372036854774804, "DocNo": "FINANCE_VOUCHER-000022", "FundId": null, "Status": "DRAFT", "DocDate": "2026-06-14", "DueDate": null, "YccType": null, "PeriodId": null, "PostedAt": null, "PostedBy": null, "TotalVat": null, "CreatedAt": "0001-01-01T00:00:00+00:00", "CreatedBy": 1, "InvoiceNo": null, "PartnerId": 15, "EmployeeId": null, "PaidAmount": null, "Description": "Hoa don ban FV2-2", "InvoiceDate": null, "InvoiceForm": null, "OperationId": null, "PaymentType": null, "PostingDate": null, "TotalAmount": null, "VoucherType": "HOA_DON_BAN", "WarehouseId": null, "CurrencyCode": "VND", "ExchangeRate": 1, "AmendedFromId": null, "InvoiceSerial": null, "LerpVoucherId": null, "PaymentStatus": null, "OutstandingAmount": null, "UnallocatedAmount": null}	\N	2026-06-14 07:19:33.814473+07	2026-06-14 07:19:32.376374+07	1	admin
215	voucher	24	CREATE	{"Id": -9223372036854774803, "DocNo": "FINANCE_VOUCHER-000023", "FundId": null, "Status": "DRAFT", "DocDate": "2026-06-14", "DueDate": null, "YccType": null, "PeriodId": null, "PostedAt": null, "PostedBy": null, "TotalVat": null, "CreatedAt": "0001-01-01T00:00:00+00:00", "CreatedBy": 1, "InvoiceNo": null, "PartnerId": null, "EmployeeId": null, "PaidAmount": null, "Description": "CP QLDN khong CC", "InvoiceDate": null, "InvoiceForm": null, "OperationId": null, "PaymentType": null, "PostingDate": null, "TotalAmount": null, "VoucherType": "CT_TONG_HOP", "WarehouseId": null, "CurrencyCode": "VND", "ExchangeRate": 1, "AmendedFromId": null, "InvoiceSerial": null, "LerpVoucherId": null, "PaymentStatus": null, "OutstandingAmount": null, "UnallocatedAmount": null}	\N	2026-06-14 07:19:49.429559+07	2026-06-14 07:19:47.991345+07	1	admin
216	voucher	25	CREATE	{"Id": -9223372036854774802, "DocNo": "FINANCE_VOUCHER-000024", "FundId": null, "Status": "DRAFT", "DocDate": "2026-06-14", "DueDate": null, "YccType": null, "PeriodId": null, "PostedAt": null, "PostedBy": null, "TotalVat": null, "CreatedAt": "0001-01-01T00:00:00+00:00", "CreatedBy": 1, "InvoiceNo": null, "PartnerId": null, "EmployeeId": null, "PaidAmount": null, "Description": "CP QLDN co CC", "InvoiceDate": null, "InvoiceForm": null, "OperationId": null, "PaymentType": null, "PostingDate": null, "TotalAmount": null, "VoucherType": "CT_TONG_HOP", "WarehouseId": null, "CurrencyCode": "VND", "ExchangeRate": 1, "AmendedFromId": null, "InvoiceSerial": null, "LerpVoucherId": null, "PaymentStatus": null, "OutstandingAmount": null, "UnallocatedAmount": null}	\N	2026-06-14 07:19:50.60661+07	2026-06-14 07:19:49.168554+07	1	admin
217	cost_center	34	CREATE	{"Id": -9223372036854774807, "Code": "CCV24821", "Name": "Kinh doanh V2 Test", "IsGroup": false, "IsActive": true, "ParentId": 1}	\N	2026-06-14 07:19:52.572662+07	2026-06-14 07:19:51.135472+07	1	admin
218	cost_center	34	UPDATE	{"Name": {"new": "Kinh doanh V2 Test (updated)", "old": "Kinh doanh V2 Test"}}	\N	2026-06-14 07:19:53.576054+07	2026-06-14 07:19:52.138587+07	1	admin
219	partner	16	CREATE	{"Id": -9223372036854774807, "Fax": null, "Code": "KHFV221090", "Email": null, "Phone": null, "Source": null, "Address": null, "Country": null, "Hotline": null, "Ranking": null, "TaxCode": null, "Website": null, "District": null, "FullName": null, "IsActive": true, "Province": null, "ShortName": "KH Finance V2", "CreditDays": null, "IsCustomer": true, "IsSupplier": false, "CreditLimit": null, "CustomerGroup": null, "SalespersonId": null, "PaymentMethodId": null, "DeliveryMethodId": null}	\N	2026-06-14 07:21:34.596835+07	2026-06-14 07:21:33.135972+07	1	admin
220	voucher	26	CREATE	{"Id": -9223372036854774807, "DocNo": "FINANCE_VOUCHER-000025", "FundId": null, "Status": "DRAFT", "DocDate": "2026-06-14", "DueDate": null, "YccType": null, "PeriodId": null, "PostedAt": null, "PostedBy": null, "TotalVat": null, "CreatedAt": "0001-01-01T00:00:00+00:00", "CreatedBy": 1, "InvoiceNo": null, "PartnerId": 16, "EmployeeId": null, "PaidAmount": null, "Description": "Hoa don ban FV2-1", "InvoiceDate": null, "InvoiceForm": null, "OperationId": null, "PaymentType": null, "PostingDate": null, "TotalAmount": null, "VoucherType": "HOA_DON_BAN", "WarehouseId": null, "CurrencyCode": "VND", "ExchangeRate": 1, "AmendedFromId": null, "InvoiceSerial": null, "LerpVoucherId": null, "PaymentStatus": null, "OutstandingAmount": null, "UnallocatedAmount": null}	\N	2026-06-14 07:21:35.949069+07	2026-06-14 07:21:34.50872+07	1	admin
221	voucher	26	UPDATE	{"Status": {"new": "POSTED", "old": "DRAFT"}, "DueDate": {"new": "2026-06-14", "old": null}, "PeriodId": {"new": 18, "old": null}, "PostedAt": {"new": "2026-06-14T00:21:35.6596982+00:00", "old": null}, "PostedBy": {"new": 1, "old": null}, "PostingDate": {"new": "2026-06-14", "old": null}, "PaymentStatus": {"new": "UNPAID", "old": null}, "OutstandingAmount": {"new": 10000000.00, "old": null}}	\N	2026-06-14 07:21:37.274789+07	2026-06-14 07:21:35.833775+07	1	admin
280	voucher	41	UPDATE	{"UnallocatedAmount": {"new": 1000000.00, "old": 5000000.00}}	\N	2026-06-14 07:30:16.49331+07	2026-06-14 07:30:15.048347+07	1	admin
281	voucher	39	UPDATE	{"PaymentStatus": {"new": "PAID", "old": "PARTLY_PAID"}, "OutstandingAmount": {"new": 0.00, "old": 4000000.00}}	\N	2026-06-14 07:30:16.49331+07	2026-06-14 07:30:15.048347+07	1	admin
222	voucher	27	CREATE	{"Id": -9223372036854774806, "DocNo": "FINANCE_VOUCHER-000026", "FundId": 2, "Status": "DRAFT", "DocDate": "2026-06-14", "DueDate": null, "YccType": null, "PeriodId": null, "PostedAt": null, "PostedBy": null, "TotalVat": null, "CreatedAt": "0001-01-01T00:00:00+00:00", "CreatedBy": 1, "InvoiceNo": null, "PartnerId": 16, "EmployeeId": null, "PaidAmount": null, "Description": "Thu tien KH lan 1", "InvoiceDate": null, "InvoiceForm": null, "OperationId": null, "PaymentType": "RECEIVE", "PostingDate": null, "TotalAmount": null, "VoucherType": "PHIEU_THU", "WarehouseId": null, "CurrencyCode": "VND", "ExchangeRate": 1, "AmendedFromId": null, "InvoiceSerial": null, "LerpVoucherId": null, "PaymentStatus": null, "OutstandingAmount": null, "UnallocatedAmount": null}	\N	2026-06-14 07:21:39.219802+07	2026-06-14 07:21:37.779788+07	1	admin
223	voucher	27	UPDATE	{"Status": {"new": "POSTED", "old": "DRAFT"}, "PeriodId": {"new": 18, "old": null}, "PostedAt": {"new": "2026-06-14T00:21:38.8529024+00:00", "old": null}, "PostedBy": {"new": 1, "old": null}, "PaidAmount": {"new": 6000000.00, "old": null}, "PostingDate": {"new": "2026-06-14", "old": null}, "UnallocatedAmount": {"new": 6000000.00, "old": null}}	\N	2026-06-14 07:21:40.339229+07	2026-06-14 07:21:38.897006+07	1	admin
224	payment_allocation	1	CREATE	{"Id": -9223372036854774807, "CreatedAt": "0001-01-01T00:00:00+00:00", "AllocatedAmount": 6000000, "InvoiceVoucherId": 26, "PaymentVoucherId": 27}	\N	2026-06-14 07:21:42.311327+07	2026-06-14 07:21:40.871328+07	1	admin
225	voucher	27	UPDATE	{"UnallocatedAmount": {"new": 0.00, "old": 6000000.00}}	\N	2026-06-14 07:21:42.311327+07	2026-06-14 07:21:40.871328+07	1	admin
226	voucher	26	UPDATE	{"PaymentStatus": {"new": "PARTLY_PAID", "old": "UNPAID"}, "OutstandingAmount": {"new": 4000000.00, "old": 10000000.00}}	\N	2026-06-14 07:21:42.311327+07	2026-06-14 07:21:40.871328+07	1	admin
227	voucher	28	CREATE	{"Id": -9223372036854774805, "DocNo": "FINANCE_VOUCHER-000027", "FundId": 2, "Status": "DRAFT", "DocDate": "2026-06-14", "DueDate": null, "YccType": null, "PeriodId": null, "PostedAt": null, "PostedBy": null, "TotalVat": null, "CreatedAt": "0001-01-01T00:00:00+00:00", "CreatedBy": 1, "InvoiceNo": null, "PartnerId": 16, "EmployeeId": null, "PaidAmount": null, "Description": "Thu tien KH lan 2", "InvoiceDate": null, "InvoiceForm": null, "OperationId": null, "PaymentType": "RECEIVE", "PostingDate": null, "TotalAmount": null, "VoucherType": "PHIEU_THU", "WarehouseId": null, "CurrencyCode": "VND", "ExchangeRate": 1, "AmendedFromId": null, "InvoiceSerial": null, "LerpVoucherId": null, "PaymentStatus": null, "OutstandingAmount": null, "UnallocatedAmount": null}	\N	2026-06-14 07:21:45.382119+07	2026-06-14 07:21:43.942534+07	1	admin
228	voucher	28	UPDATE	{"Status": {"new": "POSTED", "old": "DRAFT"}, "PeriodId": {"new": 18, "old": null}, "PostedAt": {"new": "2026-06-14T00:21:44.9695429+00:00", "old": null}, "PostedBy": {"new": 1, "old": null}, "PaidAmount": {"new": 5000000.00, "old": null}, "PostingDate": {"new": "2026-06-14", "old": null}, "UnallocatedAmount": {"new": 5000000.00, "old": null}}	\N	2026-06-14 07:21:46.448157+07	2026-06-14 07:21:45.008989+07	1	admin
229	payment_allocation	2	CREATE	{"Id": -9223372036854774806, "CreatedAt": "0001-01-01T00:00:00+00:00", "AllocatedAmount": 4000000, "InvoiceVoucherId": 26, "PaymentVoucherId": 28}	\N	2026-06-14 07:21:46.595063+07	2026-06-14 07:21:45.153894+07	1	admin
230	voucher	28	UPDATE	{"UnallocatedAmount": {"new": 1000000.00, "old": 5000000.00}}	\N	2026-06-14 07:21:46.595063+07	2026-06-14 07:21:45.153894+07	1	admin
231	voucher	26	UPDATE	{"PaymentStatus": {"new": "PAID", "old": "PARTLY_PAID"}, "OutstandingAmount": {"new": 0.00, "old": 4000000.00}}	\N	2026-06-14 07:21:46.595063+07	2026-06-14 07:21:45.153894+07	1	admin
232	voucher	29	CREATE	{"Id": -9223372036854774804, "DocNo": "FINANCE_VOUCHER-000028", "FundId": null, "Status": "DRAFT", "DocDate": "2026-06-14", "DueDate": null, "YccType": null, "PeriodId": null, "PostedAt": null, "PostedBy": null, "TotalVat": null, "CreatedAt": "0001-01-01T00:00:00+00:00", "CreatedBy": 1, "InvoiceNo": null, "PartnerId": 16, "EmployeeId": null, "PaidAmount": null, "Description": "Hoa don ban FV2-2", "InvoiceDate": null, "InvoiceForm": null, "OperationId": null, "PaymentType": null, "PostingDate": null, "TotalAmount": null, "VoucherType": "HOA_DON_BAN", "WarehouseId": null, "CurrencyCode": "VND", "ExchangeRate": 1, "AmendedFromId": null, "InvoiceSerial": null, "LerpVoucherId": null, "PaymentStatus": null, "OutstandingAmount": null, "UnallocatedAmount": null}	\N	2026-06-14 07:21:49.683479+07	2026-06-14 07:21:48.244029+07	1	admin
233	voucher	29	UPDATE	{"Status": {"new": "POSTED", "old": "DRAFT"}, "DueDate": {"new": "2026-06-14", "old": null}, "PeriodId": {"new": 18, "old": null}, "PostedAt": {"new": "2026-06-14T00:21:50.1912783+00:00", "old": null}, "PostedBy": {"new": 1, "old": null}, "PostingDate": {"new": "2026-06-14", "old": null}, "PaymentStatus": {"new": "UNPAID", "old": null}, "OutstandingAmount": {"new": 1000000.00, "old": null}}	\N	2026-06-14 07:21:51.667101+07	2026-06-14 07:21:50.226996+07	1	admin
234	payment_allocation	3	CREATE	{"Id": -9223372036854774805, "CreatedAt": "0001-01-01T00:00:00+00:00", "AllocatedAmount": 1000000, "InvoiceVoucherId": 29, "PaymentVoucherId": 28}	\N	2026-06-14 07:21:52.965684+07	2026-06-14 07:21:51.523619+07	1	admin
235	voucher	28	UPDATE	{"UnallocatedAmount": {"new": 0.00, "old": 1000000.00}}	\N	2026-06-14 07:21:52.965684+07	2026-06-14 07:21:51.523619+07	1	admin
236	voucher	29	UPDATE	{"PaymentStatus": {"new": "PAID", "old": "UNPAID"}, "OutstandingAmount": {"new": 0.00, "old": 1000000.00}}	\N	2026-06-14 07:21:52.965684+07	2026-06-14 07:21:51.523619+07	1	admin
237	voucher	30	CREATE	{"Id": -9223372036854774803, "DocNo": "FINANCE_VOUCHER-000029", "FundId": null, "Status": "DRAFT", "DocDate": "2026-06-14", "DueDate": null, "YccType": null, "PeriodId": null, "PostedAt": null, "PostedBy": null, "TotalVat": null, "CreatedAt": "0001-01-01T00:00:00+00:00", "CreatedBy": 1, "InvoiceNo": null, "PartnerId": null, "EmployeeId": null, "PaidAmount": null, "Description": "CP QLDN khong CC", "InvoiceDate": null, "InvoiceForm": null, "OperationId": null, "PaymentType": null, "PostingDate": null, "TotalAmount": null, "VoucherType": "CT_TONG_HOP", "WarehouseId": null, "CurrencyCode": "VND", "ExchangeRate": 1, "AmendedFromId": null, "InvoiceSerial": null, "LerpVoucherId": null, "PaymentStatus": null, "OutstandingAmount": null, "UnallocatedAmount": null}	\N	2026-06-14 07:22:05.740006+07	2026-06-14 07:22:04.300629+07	1	admin
238	voucher	30	UPDATE	{"Status": {"new": "POSTED", "old": "DRAFT"}, "PeriodId": {"new": 18, "old": null}, "PostedAt": {"new": "2026-06-14T00:22:05.3325316+00:00", "old": null}, "PostedBy": {"new": 1, "old": null}, "PostingDate": {"new": "2026-06-14", "old": null}}	\N	2026-06-14 07:22:06.85126+07	2026-06-14 07:22:05.412191+07	1	admin
241	cost_center	37	CREATE	{"Id": -9223372036854774807, "Code": "CCV214063", "Name": "Kinh doanh V2 Test", "IsGroup": false, "IsActive": true, "ParentId": 1}	\N	2026-06-14 07:22:09.104992+07	2026-06-14 07:22:07.665974+07	1	admin
242	cost_center	37	UPDATE	{"Name": {"new": "Kinh doanh V2 Test (updated)", "old": "Kinh doanh V2 Test"}}	\N	2026-06-14 07:22:10.106776+07	2026-06-14 07:22:08.667386+07	1	admin
239	voucher	31	CREATE	{"Id": -9223372036854774802, "DocNo": "FINANCE_VOUCHER-000030", "FundId": null, "Status": "DRAFT", "DocDate": "2026-06-14", "DueDate": null, "YccType": null, "PeriodId": null, "PostedAt": null, "PostedBy": null, "TotalVat": null, "CreatedAt": "0001-01-01T00:00:00+00:00", "CreatedBy": 1, "InvoiceNo": null, "PartnerId": null, "EmployeeId": null, "PaidAmount": null, "Description": "CP QLDN co CC", "InvoiceDate": null, "InvoiceForm": null, "OperationId": null, "PaymentType": null, "PostingDate": null, "TotalAmount": null, "VoucherType": "CT_TONG_HOP", "WarehouseId": null, "CurrencyCode": "VND", "ExchangeRate": 1, "AmendedFromId": null, "InvoiceSerial": null, "LerpVoucherId": null, "PaymentStatus": null, "OutstandingAmount": null, "UnallocatedAmount": null}	\N	2026-06-14 07:22:07.03049+07	2026-06-14 07:22:05.590731+07	1	admin
240	voucher	31	UPDATE	{"Status": {"new": "POSTED", "old": "DRAFT"}, "PeriodId": {"new": 18, "old": null}, "PostedAt": {"new": "2026-06-14T00:22:06.5632111+00:00", "old": null}, "PostedBy": {"new": 1, "old": null}, "PostingDate": {"new": "2026-06-14", "old": null}}	\N	2026-06-14 07:22:08.039817+07	2026-06-14 07:22:06.600891+07	1	admin
243	partner	17	CREATE	{"Id": -9223372036854774807, "Fax": null, "Code": "KHFV222178", "Email": null, "Phone": null, "Source": null, "Address": null, "Country": null, "Hotline": null, "Ranking": null, "TaxCode": null, "Website": null, "District": null, "FullName": null, "IsActive": true, "Province": null, "ShortName": "KH Finance V2", "CreditDays": null, "IsCustomer": true, "IsSupplier": false, "CreditLimit": null, "CustomerGroup": null, "SalespersonId": null, "PaymentMethodId": null, "DeliveryMethodId": null}	\N	2026-06-14 07:27:08.067802+07	2026-06-14 07:27:06.610459+07	1	admin
244	voucher	32	CREATE	{"Id": -9223372036854774807, "DocNo": "FINANCE_VOUCHER-000031", "FundId": null, "Status": "DRAFT", "DocDate": "2026-06-14", "DueDate": null, "YccType": null, "PeriodId": null, "PostedAt": null, "PostedBy": null, "TotalVat": null, "CreatedAt": "0001-01-01T00:00:00+00:00", "CreatedBy": 1, "InvoiceNo": null, "PartnerId": 17, "EmployeeId": null, "PaidAmount": null, "Description": "Hoa don ban FV2-1", "InvoiceDate": null, "InvoiceForm": null, "OperationId": null, "PaymentType": null, "PostingDate": null, "TotalAmount": null, "VoucherType": "HOA_DON_BAN", "WarehouseId": null, "CurrencyCode": "VND", "ExchangeRate": 1, "AmendedFromId": null, "InvoiceSerial": null, "LerpVoucherId": null, "PaymentStatus": null, "OutstandingAmount": null, "UnallocatedAmount": null}	\N	2026-06-14 07:27:09.285344+07	2026-06-14 07:27:07.84219+07	1	admin
245	voucher	32	UPDATE	{"Status": {"new": "POSTED", "old": "DRAFT"}, "DueDate": {"new": "2026-06-14", "old": null}, "PeriodId": {"new": 18, "old": null}, "PostedAt": {"new": "2026-06-14T00:27:09.012012+00:00", "old": null}, "PostedBy": {"new": 1, "old": null}, "PostingDate": {"new": "2026-06-14", "old": null}, "PaymentStatus": {"new": "UNPAID", "old": null}, "OutstandingAmount": {"new": 10000000.00, "old": null}}	\N	2026-06-14 07:27:10.515782+07	2026-06-14 07:27:09.071985+07	1	admin
246	voucher	33	CREATE	{"Id": -9223372036854774806, "DocNo": "FINANCE_VOUCHER-000032", "FundId": 2, "Status": "DRAFT", "DocDate": "2026-06-14", "DueDate": null, "YccType": null, "PeriodId": null, "PostedAt": null, "PostedBy": null, "TotalVat": null, "CreatedAt": "0001-01-01T00:00:00+00:00", "CreatedBy": 1, "InvoiceNo": null, "PartnerId": 17, "EmployeeId": null, "PaidAmount": null, "Description": "Thu tien KH lan 1", "InvoiceDate": null, "InvoiceForm": null, "OperationId": null, "PaymentType": "RECEIVE", "PostingDate": null, "TotalAmount": null, "VoucherType": "PHIEU_THU", "WarehouseId": null, "CurrencyCode": "VND", "ExchangeRate": 1, "AmendedFromId": null, "InvoiceSerial": null, "LerpVoucherId": null, "PaymentStatus": null, "OutstandingAmount": null, "UnallocatedAmount": null}	\N	2026-06-14 07:27:12.530157+07	2026-06-14 07:27:11.087351+07	1	admin
247	voucher	33	UPDATE	{"Status": {"new": "POSTED", "old": "DRAFT"}, "PeriodId": {"new": 18, "old": null}, "PostedAt": {"new": "2026-06-14T00:27:12.1200315+00:00", "old": null}, "PostedBy": {"new": 1, "old": null}, "PaidAmount": {"new": 6000000.00, "old": null}, "PostingDate": {"new": "2026-06-14", "old": null}, "UnallocatedAmount": {"new": 6000000.00, "old": null}}	\N	2026-06-14 07:27:13.602205+07	2026-06-14 07:27:12.158996+07	1	admin
248	payment_allocation	4	CREATE	{"Id": -9223372036854774807, "CreatedAt": "0001-01-01T00:00:00+00:00", "AllocatedAmount": 6000000, "InvoiceVoucherId": 32, "PaymentVoucherId": 33}	\N	2026-06-14 07:27:15.646524+07	2026-06-14 07:27:14.20249+07	1	admin
249	voucher	33	UPDATE	{"UnallocatedAmount": {"new": 0.00, "old": 6000000.00}}	\N	2026-06-14 07:27:15.646524+07	2026-06-14 07:27:14.20249+07	1	admin
250	voucher	32	UPDATE	{"PaymentStatus": {"new": "PARTLY_PAID", "old": "UNPAID"}, "OutstandingAmount": {"new": 4000000.00, "old": 10000000.00}}	\N	2026-06-14 07:27:15.646524+07	2026-06-14 07:27:14.20249+07	1	admin
251	voucher	34	CREATE	{"Id": -9223372036854774805, "DocNo": "FINANCE_VOUCHER-000033", "FundId": 2, "Status": "DRAFT", "DocDate": "2026-06-14", "DueDate": null, "YccType": null, "PeriodId": null, "PostedAt": null, "PostedBy": null, "TotalVat": null, "CreatedAt": "0001-01-01T00:00:00+00:00", "CreatedBy": 1, "InvoiceNo": null, "PartnerId": 17, "EmployeeId": null, "PaidAmount": null, "Description": "Thu tien KH lan 2", "InvoiceDate": null, "InvoiceForm": null, "OperationId": null, "PaymentType": "RECEIVE", "PostingDate": null, "TotalAmount": null, "VoucherType": "PHIEU_THU", "WarehouseId": null, "CurrencyCode": "VND", "ExchangeRate": 1, "AmendedFromId": null, "InvoiceSerial": null, "LerpVoucherId": null, "PaymentStatus": null, "OutstandingAmount": null, "UnallocatedAmount": null}	\N	2026-06-14 07:27:18.879592+07	2026-06-14 07:27:17.437526+07	1	admin
252	voucher	34	UPDATE	{"Status": {"new": "POSTED", "old": "DRAFT"}, "PeriodId": {"new": 18, "old": null}, "PostedAt": {"new": "2026-06-14T00:27:18.618986+00:00", "old": null}, "PostedBy": {"new": 1, "old": null}, "PaidAmount": {"new": 5000000.00, "old": null}, "PostingDate": {"new": "2026-06-14", "old": null}, "UnallocatedAmount": {"new": 5000000.00, "old": null}}	\N	2026-06-14 07:27:20.100136+07	2026-06-14 07:27:18.657058+07	1	admin
253	payment_allocation	5	CREATE	{"Id": -9223372036854774806, "CreatedAt": "0001-01-01T00:00:00+00:00", "AllocatedAmount": 4000000, "InvoiceVoucherId": 32, "PaymentVoucherId": 34}	\N	2026-06-14 07:27:20.2661+07	2026-06-14 07:27:18.823478+07	1	admin
254	voucher	34	UPDATE	{"UnallocatedAmount": {"new": 1000000.00, "old": 5000000.00}}	\N	2026-06-14 07:27:20.2661+07	2026-06-14 07:27:18.823478+07	1	admin
255	voucher	32	UPDATE	{"PaymentStatus": {"new": "PAID", "old": "PARTLY_PAID"}, "OutstandingAmount": {"new": 0.00, "old": 4000000.00}}	\N	2026-06-14 07:27:20.2661+07	2026-06-14 07:27:18.823478+07	1	admin
261	voucher	35	UPDATE	{"Status": {"new": "CANCELLED_POSTED", "old": "POSTED"}}	\N	2026-06-14 07:27:31.41568+07	2026-06-14 07:27:29.973496+07	1	admin
284	payment_allocation	9	CREATE	{"Id": -9223372036854774805, "CreatedAt": "0001-01-01T00:00:00+00:00", "AllocatedAmount": 1000000, "InvoiceVoucherId": 42, "PaymentVoucherId": 41}	\N	2026-06-14 07:30:22.563094+07	2026-06-14 07:30:21.118635+07	1	admin
285	voucher	41	UPDATE	{"UnallocatedAmount": {"new": 0.00, "old": 1000000.00}}	\N	2026-06-14 07:30:22.563094+07	2026-06-14 07:30:21.118635+07	1	admin
256	voucher	35	CREATE	{"Id": -9223372036854774804, "DocNo": "FINANCE_VOUCHER-000034", "FundId": null, "Status": "DRAFT", "DocDate": "2026-06-14", "DueDate": null, "YccType": null, "PeriodId": null, "PostedAt": null, "PostedBy": null, "TotalVat": null, "CreatedAt": "0001-01-01T00:00:00+00:00", "CreatedBy": 1, "InvoiceNo": null, "PartnerId": 17, "EmployeeId": null, "PaidAmount": null, "Description": "Hoa don ban FV2-2", "InvoiceDate": null, "InvoiceForm": null, "OperationId": null, "PaymentType": null, "PostingDate": null, "TotalAmount": null, "VoucherType": "HOA_DON_BAN", "WarehouseId": null, "CurrencyCode": "VND", "ExchangeRate": 1, "AmendedFromId": null, "InvoiceSerial": null, "LerpVoucherId": null, "PaymentStatus": null, "OutstandingAmount": null, "UnallocatedAmount": null}	\N	2026-06-14 07:27:23.16442+07	2026-06-14 07:27:21.722402+07	1	admin
257	voucher	35	UPDATE	{"Status": {"new": "POSTED", "old": "DRAFT"}, "DueDate": {"new": "2026-06-14", "old": null}, "PeriodId": {"new": 18, "old": null}, "PostedAt": {"new": "2026-06-14T00:27:23.7582227+00:00", "old": null}, "PostedBy": {"new": 1, "old": null}, "PostingDate": {"new": "2026-06-14", "old": null}, "PaymentStatus": {"new": "UNPAID", "old": null}, "OutstandingAmount": {"new": 1000000.00, "old": null}}	\N	2026-06-14 07:27:25.23636+07	2026-06-14 07:27:23.793514+07	1	admin
258	payment_allocation	6	CREATE	{"Id": -9223372036854774805, "CreatedAt": "0001-01-01T00:00:00+00:00", "AllocatedAmount": 1000000, "InvoiceVoucherId": 35, "PaymentVoucherId": 34}	\N	2026-06-14 07:27:26.440462+07	2026-06-14 07:27:24.998459+07	1	admin
259	voucher	34	UPDATE	{"UnallocatedAmount": {"new": 0.00, "old": 1000000.00}}	\N	2026-06-14 07:27:26.440462+07	2026-06-14 07:27:24.998459+07	1	admin
260	voucher	35	UPDATE	{"PaymentStatus": {"new": "PAID", "old": "UNPAID"}, "OutstandingAmount": {"new": 0.00, "old": 1000000.00}}	\N	2026-06-14 07:27:26.440462+07	2026-06-14 07:27:24.998459+07	1	admin
262	voucher	36	CREATE	{"Id": -9223372036854774803, "DocNo": "FINANCE_VOUCHER-000034-1", "FundId": null, "Status": "DRAFT", "DocDate": "2026-06-14", "DueDate": "2026-06-14", "YccType": null, "PeriodId": null, "PostedAt": null, "PostedBy": null, "TotalVat": null, "CreatedAt": "0001-01-01T00:00:00+00:00", "CreatedBy": 1, "InvoiceNo": null, "PartnerId": 17, "EmployeeId": null, "PaidAmount": null, "Description": "Hoa don ban FV2-2", "InvoiceDate": null, "InvoiceForm": null, "OperationId": null, "PaymentType": null, "PostingDate": null, "TotalAmount": null, "VoucherType": "HOA_DON_BAN", "WarehouseId": null, "CurrencyCode": "VND", "ExchangeRate": 1.0000, "AmendedFromId": 35, "InvoiceSerial": null, "LerpVoucherId": null, "PaymentStatus": null, "OutstandingAmount": null, "UnallocatedAmount": null}	\N	2026-06-14 07:27:36.485108+07	2026-06-14 07:27:35.04309+07	1	admin
263	voucher	37	CREATE	{"Id": -9223372036854774802, "DocNo": "FINANCE_VOUCHER-000035", "FundId": null, "Status": "DRAFT", "DocDate": "2026-06-14", "DueDate": null, "YccType": null, "PeriodId": null, "PostedAt": null, "PostedBy": null, "TotalVat": null, "CreatedAt": "0001-01-01T00:00:00+00:00", "CreatedBy": 1, "InvoiceNo": null, "PartnerId": null, "EmployeeId": null, "PaidAmount": null, "Description": "CP QLDN khong CC", "InvoiceDate": null, "InvoiceForm": null, "OperationId": null, "PaymentType": null, "PostingDate": null, "TotalAmount": null, "VoucherType": "CT_TONG_HOP", "WarehouseId": null, "CurrencyCode": "VND", "ExchangeRate": 1, "AmendedFromId": null, "InvoiceSerial": null, "LerpVoucherId": null, "PaymentStatus": null, "OutstandingAmount": null, "UnallocatedAmount": null}	\N	2026-06-14 07:27:39.773587+07	2026-06-14 07:27:38.331367+07	1	admin
264	voucher	37	UPDATE	{"Status": {"new": "POSTED", "old": "DRAFT"}, "PeriodId": {"new": 18, "old": null}, "PostedAt": {"new": "2026-06-14T00:27:39.3326447+00:00", "old": null}, "PostedBy": {"new": 1, "old": null}, "PostingDate": {"new": "2026-06-14", "old": null}}	\N	2026-06-14 07:27:40.805675+07	2026-06-14 07:27:39.363427+07	1	admin
265	voucher	38	CREATE	{"Id": -9223372036854774801, "DocNo": "FINANCE_VOUCHER-000036", "FundId": null, "Status": "DRAFT", "DocDate": "2026-06-14", "DueDate": null, "YccType": null, "PeriodId": null, "PostedAt": null, "PostedBy": null, "TotalVat": null, "CreatedAt": "0001-01-01T00:00:00+00:00", "CreatedBy": 1, "InvoiceNo": null, "PartnerId": null, "EmployeeId": null, "PaidAmount": null, "Description": "CP QLDN co CC", "InvoiceDate": null, "InvoiceForm": null, "OperationId": null, "PaymentType": null, "PostingDate": null, "TotalAmount": null, "VoucherType": "CT_TONG_HOP", "WarehouseId": null, "CurrencyCode": "VND", "ExchangeRate": 1, "AmendedFromId": null, "InvoiceSerial": null, "LerpVoucherId": null, "PaymentStatus": null, "OutstandingAmount": null, "UnallocatedAmount": null}	\N	2026-06-14 07:27:40.933505+07	2026-06-14 07:27:39.491353+07	1	admin
266	voucher	38	UPDATE	{"Status": {"new": "POSTED", "old": "DRAFT"}, "PeriodId": {"new": 18, "old": null}, "PostedAt": {"new": "2026-06-14T00:27:40.543356+00:00", "old": null}, "PostedBy": {"new": 1, "old": null}, "PostingDate": {"new": "2026-06-14", "old": null}}	\N	2026-06-14 07:27:42.025174+07	2026-06-14 07:27:40.583254+07	1	admin
267	cost_center	40	CREATE	{"Id": -9223372036854774807, "Code": "CCV221571", "Name": "Kinh doanh V2 Test", "IsGroup": false, "IsActive": true, "ParentId": 1}	\N	2026-06-14 07:27:43.075127+07	2026-06-14 07:27:41.633008+07	1	admin
268	cost_center	40	UPDATE	{"Name": {"new": "Kinh doanh V2 Test (updated)", "old": "Kinh doanh V2 Test"}}	\N	2026-06-14 07:27:44.059216+07	2026-06-14 07:27:42.616841+07	1	admin
269	partner	18	CREATE	{"Id": -9223372036854774807, "Fax": null, "Code": "KHFV222756", "Email": null, "Phone": null, "Source": null, "Address": null, "Country": null, "Hotline": null, "Ranking": null, "TaxCode": null, "Website": null, "District": null, "FullName": null, "IsActive": true, "Province": null, "ShortName": "KH Finance V2", "CreditDays": null, "IsCustomer": true, "IsSupplier": false, "CreditLimit": null, "CustomerGroup": null, "SalespersonId": null, "PaymentMethodId": null, "DeliveryMethodId": null}	\N	2026-06-14 07:30:04.442466+07	2026-06-14 07:30:02.963235+07	1	admin
270	voucher	39	CREATE	{"Id": -9223372036854774807, "DocNo": "FINANCE_VOUCHER-000037", "FundId": null, "Status": "DRAFT", "DocDate": "2026-06-14", "DueDate": null, "YccType": null, "PeriodId": null, "PostedAt": null, "PostedBy": null, "TotalVat": null, "CreatedAt": "0001-01-01T00:00:00+00:00", "CreatedBy": 1, "InvoiceNo": null, "PartnerId": 18, "EmployeeId": null, "PaidAmount": null, "Description": "Hoa don ban FV2-1", "InvoiceDate": null, "InvoiceForm": null, "OperationId": null, "PaymentType": null, "PostingDate": null, "TotalAmount": null, "VoucherType": "HOA_DON_BAN", "WarehouseId": null, "CurrencyCode": "VND", "ExchangeRate": 1, "AmendedFromId": null, "InvoiceSerial": null, "LerpVoucherId": null, "PaymentStatus": null, "OutstandingAmount": null, "UnallocatedAmount": null}	\N	2026-06-14 07:30:05.868176+07	2026-06-14 07:30:04.423846+07	1	admin
271	voucher	39	UPDATE	{"Status": {"new": "POSTED", "old": "DRAFT"}, "DueDate": {"new": "2026-06-14", "old": null}, "PeriodId": {"new": 18, "old": null}, "PostedAt": {"new": "2026-06-14T00:30:05.6252516+00:00", "old": null}, "PostedBy": {"new": 1, "old": null}, "PostingDate": {"new": "2026-06-14", "old": null}, "PaymentStatus": {"new": "UNPAID", "old": null}, "OutstandingAmount": {"new": 10000000.00, "old": null}}	\N	2026-06-14 07:30:07.146301+07	2026-06-14 07:30:05.700297+07	1	admin
272	voucher	40	CREATE	{"Id": -9223372036854774806, "DocNo": "FINANCE_VOUCHER-000038", "FundId": 2, "Status": "DRAFT", "DocDate": "2026-06-14", "DueDate": null, "YccType": null, "PeriodId": null, "PostedAt": null, "PostedBy": null, "TotalVat": null, "CreatedAt": "0001-01-01T00:00:00+00:00", "CreatedBy": 1, "InvoiceNo": null, "PartnerId": 18, "EmployeeId": null, "PaidAmount": null, "Description": "Thu tien KH lan 1", "InvoiceDate": null, "InvoiceForm": null, "OperationId": null, "PaymentType": "RECEIVE", "PostingDate": null, "TotalAmount": null, "VoucherType": "PHIEU_THU", "WarehouseId": null, "CurrencyCode": "VND", "ExchangeRate": 1, "AmendedFromId": null, "InvoiceSerial": null, "LerpVoucherId": null, "PaymentStatus": null, "OutstandingAmount": null, "UnallocatedAmount": null}	\N	2026-06-14 07:30:09.161157+07	2026-06-14 07:30:07.716561+07	1	admin
273	voucher	40	UPDATE	{"Status": {"new": "POSTED", "old": "DRAFT"}, "PeriodId": {"new": 18, "old": null}, "PostedAt": {"new": "2026-06-14T00:30:08.8040302+00:00", "old": null}, "PostedBy": {"new": 1, "old": null}, "PaidAmount": {"new": 6000000.00, "old": null}, "PostingDate": {"new": "2026-06-14", "old": null}, "UnallocatedAmount": {"new": 6000000.00, "old": null}}	\N	2026-06-14 07:30:10.292309+07	2026-06-14 07:30:08.846934+07	1	admin
274	payment_allocation	7	CREATE	{"Id": -9223372036854774807, "CreatedAt": "0001-01-01T00:00:00+00:00", "AllocatedAmount": 6000000, "InvoiceVoucherId": 39, "PaymentVoucherId": 40}	\N	2026-06-14 07:30:12.284342+07	2026-06-14 07:30:10.840542+07	1	admin
275	voucher	40	UPDATE	{"UnallocatedAmount": {"new": 0.00, "old": 6000000.00}}	\N	2026-06-14 07:30:12.284342+07	2026-06-14 07:30:10.840542+07	1	admin
276	voucher	39	UPDATE	{"PaymentStatus": {"new": "PARTLY_PAID", "old": "UNPAID"}, "OutstandingAmount": {"new": 4000000.00, "old": 10000000.00}}	\N	2026-06-14 07:30:12.284342+07	2026-06-14 07:30:10.840542+07	1	admin
277	voucher	41	CREATE	{"Id": -9223372036854774805, "DocNo": "FINANCE_VOUCHER-000039", "FundId": 2, "Status": "DRAFT", "DocDate": "2026-06-14", "DueDate": null, "YccType": null, "PeriodId": null, "PostedAt": null, "PostedBy": null, "TotalVat": null, "CreatedAt": "0001-01-01T00:00:00+00:00", "CreatedBy": 1, "InvoiceNo": null, "PartnerId": 18, "EmployeeId": null, "PaidAmount": null, "Description": "Thu tien KH lan 2", "InvoiceDate": null, "InvoiceForm": null, "OperationId": null, "PaymentType": "RECEIVE", "PostingDate": null, "TotalAmount": null, "VoucherType": "PHIEU_THU", "WarehouseId": null, "CurrencyCode": "VND", "ExchangeRate": 1, "AmendedFromId": null, "InvoiceSerial": null, "LerpVoucherId": null, "PaymentStatus": null, "OutstandingAmount": null, "UnallocatedAmount": null}	\N	2026-06-14 07:30:15.269132+07	2026-06-14 07:30:13.825364+07	1	admin
278	voucher	41	UPDATE	{"Status": {"new": "POSTED", "old": "DRAFT"}, "PeriodId": {"new": 18, "old": null}, "PostedAt": {"new": "2026-06-14T00:30:14.8710907+00:00", "old": null}, "PostedBy": {"new": 1, "old": null}, "PaidAmount": {"new": 5000000.00, "old": null}, "PostingDate": {"new": "2026-06-14", "old": null}, "UnallocatedAmount": {"new": 5000000.00, "old": null}}	\N	2026-06-14 07:30:16.351312+07	2026-06-14 07:30:14.907395+07	1	admin
289	accounting_policy	1	UPDATE	{"RequireCostCenter": {"new": true, "old": false}}	\N	2026-06-14 07:30:35.465827+07	2026-06-14 07:30:34.021792+07	1	admin
282	voucher	42	CREATE	{"Id": -9223372036854774804, "DocNo": "FINANCE_VOUCHER-000040", "FundId": null, "Status": "DRAFT", "DocDate": "2026-06-14", "DueDate": null, "YccType": null, "PeriodId": null, "PostedAt": null, "PostedBy": null, "TotalVat": null, "CreatedAt": "0001-01-01T00:00:00+00:00", "CreatedBy": 1, "InvoiceNo": null, "PartnerId": 18, "EmployeeId": null, "PaidAmount": null, "Description": "Hoa don ban FV2-2", "InvoiceDate": null, "InvoiceForm": null, "OperationId": null, "PaymentType": null, "PostingDate": null, "TotalAmount": null, "VoucherType": "HOA_DON_BAN", "WarehouseId": null, "CurrencyCode": "VND", "ExchangeRate": 1, "AmendedFromId": null, "InvoiceSerial": null, "LerpVoucherId": null, "PaymentStatus": null, "OutstandingAmount": null, "UnallocatedAmount": null}	\N	2026-06-14 07:30:19.48463+07	2026-06-14 07:30:18.039783+07	1	admin
283	voucher	42	UPDATE	{"Status": {"new": "POSTED", "old": "DRAFT"}, "DueDate": {"new": "2026-06-14", "old": null}, "PeriodId": {"new": 18, "old": null}, "PostedAt": {"new": "2026-06-14T00:30:19.9605946+00:00", "old": null}, "PostedBy": {"new": 1, "old": null}, "PostingDate": {"new": "2026-06-14", "old": null}, "PaymentStatus": {"new": "UNPAID", "old": null}, "OutstandingAmount": {"new": 1000000.00, "old": null}}	\N	2026-06-14 07:30:21.448174+07	2026-06-14 07:30:20.004246+07	1	admin
287	voucher	42	UPDATE	{"Status": {"new": "CANCELLED_POSTED", "old": "POSTED"}}	\N	2026-06-14 07:30:27.583327+07	2026-06-14 07:30:26.139264+07	1	admin
288	voucher	43	CREATE	{"Id": -9223372036854774803, "DocNo": "FINANCE_VOUCHER-000040-1", "FundId": null, "Status": "DRAFT", "DocDate": "2026-06-14", "DueDate": "2026-06-14", "YccType": null, "PeriodId": null, "PostedAt": null, "PostedBy": null, "TotalVat": null, "CreatedAt": "0001-01-01T00:00:00+00:00", "CreatedBy": 1, "InvoiceNo": null, "PartnerId": 18, "EmployeeId": null, "PaidAmount": null, "Description": "Hoa don ban FV2-2", "InvoiceDate": null, "InvoiceForm": null, "OperationId": null, "PaymentType": null, "PostingDate": null, "TotalAmount": null, "VoucherType": "HOA_DON_BAN", "WarehouseId": null, "CurrencyCode": "VND", "ExchangeRate": 1.0000, "AmendedFromId": 42, "InvoiceSerial": null, "LerpVoucherId": null, "PaymentStatus": null, "OutstandingAmount": null, "UnallocatedAmount": null}	\N	2026-06-14 07:30:32.647994+07	2026-06-14 07:30:31.203236+07	1	admin
290	voucher	44	CREATE	{"Id": -9223372036854774802, "DocNo": "FINANCE_VOUCHER-000041", "FundId": null, "Status": "DRAFT", "DocDate": "2026-06-14", "DueDate": null, "YccType": null, "PeriodId": null, "PostedAt": null, "PostedBy": null, "TotalVat": null, "CreatedAt": "0001-01-01T00:00:00+00:00", "CreatedBy": 1, "InvoiceNo": null, "PartnerId": null, "EmployeeId": null, "PaidAmount": null, "Description": "CP QLDN khong CC", "InvoiceDate": null, "InvoiceForm": null, "OperationId": null, "PaymentType": null, "PostingDate": null, "TotalAmount": null, "VoucherType": "CT_TONG_HOP", "WarehouseId": null, "CurrencyCode": "VND", "ExchangeRate": 1, "AmendedFromId": null, "InvoiceSerial": null, "LerpVoucherId": null, "PaymentStatus": null, "OutstandingAmount": null, "UnallocatedAmount": null}	\N	2026-06-14 07:30:35.594586+07	2026-06-14 07:30:34.150525+07	1	admin
291	voucher	45	CREATE	{"Id": -9223372036854774801, "DocNo": "FINANCE_VOUCHER-000042", "FundId": null, "Status": "DRAFT", "DocDate": "2026-06-14", "DueDate": null, "YccType": null, "PeriodId": null, "PostedAt": null, "PostedBy": null, "TotalVat": null, "CreatedAt": "0001-01-01T00:00:00+00:00", "CreatedBy": 1, "InvoiceNo": null, "PartnerId": null, "EmployeeId": null, "PaidAmount": null, "Description": "CP QLDN co CC", "InvoiceDate": null, "InvoiceForm": null, "OperationId": null, "PaymentType": null, "PostingDate": null, "TotalAmount": null, "VoucherType": "CT_TONG_HOP", "WarehouseId": null, "CurrencyCode": "VND", "ExchangeRate": 1, "AmendedFromId": null, "InvoiceSerial": null, "LerpVoucherId": null, "PaymentStatus": null, "OutstandingAmount": null, "UnallocatedAmount": null}	\N	2026-06-14 07:30:36.804701+07	2026-06-14 07:30:35.360388+07	1	admin
294	cost_center	43	CREATE	{"Id": -9223372036854774807, "Code": "CCV223495", "Name": "Kinh doanh V2 Test", "IsGroup": false, "IsActive": true, "ParentId": 1}	\N	2026-06-14 07:30:39.029169+07	2026-06-14 07:30:37.584916+07	1	admin
292	voucher	45	UPDATE	{"Status": {"new": "POSTED", "old": "DRAFT"}, "PeriodId": {"new": 18, "old": null}, "PostedAt": {"new": "2026-06-14T00:30:36.3893084+00:00", "old": null}, "PostedBy": {"new": 1, "old": null}, "PostingDate": {"new": "2026-06-14", "old": null}}	\N	2026-06-14 07:30:37.877595+07	2026-06-14 07:30:36.432681+07	1	admin
293	accounting_policy	1	UPDATE	{"RequireCostCenter": {"new": false, "old": true}}	\N	2026-06-14 07:30:38.923397+07	2026-06-14 07:30:37.479597+07	1	admin
295	cost_center	43	UPDATE	{"Name": {"new": "Kinh doanh V2 Test (updated)", "old": "Kinh doanh V2 Test"}}	\N	2026-06-14 07:30:40.117386+07	2026-06-14 07:30:38.67011+07	1	admin
296	partner	19	CREATE	{"Id": -9223372036854774807, "Fax": null, "Code": "KHFINOLD7979", "Email": null, "Phone": null, "Source": null, "Address": null, "Country": null, "Hotline": null, "Ranking": null, "TaxCode": null, "Website": null, "District": null, "FullName": null, "IsActive": true, "Province": null, "ShortName": "Khach hang test old", "CreditDays": null, "IsCustomer": true, "IsSupplier": false, "CreditLimit": null, "CustomerGroup": null, "SalespersonId": null, "PaymentMethodId": null, "DeliveryMethodId": null}	\N	2026-06-14 07:34:04.151328+07	2026-06-14 07:34:02.691854+07	1	admin
297	partner	20	CREATE	{"Id": -9223372036854774807, "Fax": null, "Code": "KH24650", "Email": null, "Phone": null, "Source": null, "Address": null, "Country": null, "Hotline": null, "Ranking": null, "TaxCode": null, "Website": null, "District": null, "FullName": null, "IsActive": true, "Province": null, "ShortName": "Khach hang test", "CreditDays": null, "IsCustomer": true, "IsSupplier": false, "CreditLimit": null, "CustomerGroup": null, "SalespersonId": null, "PaymentMethodId": null, "DeliveryMethodId": null}	\N	2026-06-14 07:40:11.033702+07	2026-06-14 07:40:09.570562+07	1	admin
298	voucher	48	CREATE	{"Id": -9223372036854774807, "DocNo": "FINANCE_VOUCHER-000045", "FundId": 2, "Status": "DRAFT", "DocDate": "2026-06-14", "DueDate": null, "YccType": null, "PeriodId": null, "PostedAt": null, "PostedBy": null, "TotalVat": null, "CreatedAt": "0001-01-01T00:00:00+00:00", "CreatedBy": 1, "InvoiceNo": null, "PartnerId": 20, "EmployeeId": null, "PaidAmount": null, "Description": "Thu tien test", "InvoiceDate": null, "InvoiceForm": null, "OperationId": null, "PaymentType": null, "PostingDate": null, "TotalAmount": null, "VoucherType": "PHIEU_THU", "WarehouseId": null, "CurrencyCode": "VND", "ExchangeRate": 1, "AmendedFromId": null, "InvoiceSerial": null, "LerpVoucherId": null, "PaymentStatus": null, "OutstandingAmount": null, "UnallocatedAmount": null}	\N	2026-06-14 07:40:12.455656+07	2026-06-14 07:40:11.004435+07	1	admin
299	voucher	48	UPDATE	{"Status": {"new": "POSTED", "old": "DRAFT"}, "PeriodId": {"new": 18, "old": null}, "PostedAt": {"new": "2026-06-14T00:40:12.2233148+00:00", "old": null}, "PostedBy": {"new": 1, "old": null}, "PostingDate": {"new": "2026-06-14", "old": null}}	\N	2026-06-14 07:40:13.743326+07	2026-06-14 07:40:12.29252+07	1	admin
\.


--
-- Data for Name: company_info; Type: TABLE DATA; Schema: core; Owner: -
--

COPY core.company_info (id, full_name, foreign_name, trading_name, tax_code, phone, fax, email, website, business_field, address, district, province, legal_rep, chief_accountant, cashier, logo) FROM stdin;
\.


--
-- Data for Name: cost_type; Type: TABLE DATA; Schema: core; Owner: -
--

COPY core.cost_type (id, code, name, scope, account_code) FROM stdin;
1	VANCHUYEN	Phi van chuyen	PURCHASE	\N
\.


--
-- Data for Name: currency; Type: TABLE DATA; Schema: core; Owner: -
--

COPY core.currency (code, name) FROM stdin;
VND	Việt Nam Đồng
USD	Đô la Mỹ
\.


--
-- Data for Name: data_scope; Type: TABLE DATA; Schema: core; Owner: -
--

COPY core.data_scope (user_id, department_id) FROM stdin;
\.


--
-- Data for Name: delivery_method; Type: TABLE DATA; Schema: core; Owner: -
--

COPY core.delivery_method (id, code, name) FROM stdin;
1	Xe	Xe
2	TAU	Xe lửa
3	MB	Máy bay
\.


--
-- Data for Name: department; Type: TABLE DATA; Schema: core; Owner: -
--

COPY core.department (id, code, name, parent_id, is_active) FROM stdin;
1	PKD	Phong Kinh Doanh	\N	t
\.


--
-- Data for Name: doc_numbering; Type: TABLE DATA; Schema: core; Owner: -
--

COPY core.doc_numbering (id, doc_type, pattern, last_seq, reset_by, last_period) FROM stdin;
10	BOM	BOM{YY}{MM}-{####}	6	MONTH	2606
5	STOCK_ISSUE	PX{YY}{MM}-{####}	2	MONTH	2606
8	FINANCE_VOUCHER	FINANCE_VOUCHER-{######}	45	NONE	
2	SALES_ORDER	DH{YY}{MM}-{####}	12	MONTH	2606
12	PRODUCTION_PLAN	KHSX{YY}{MM}-{####}	3	MONTH	2606
6	PURCHASE_REQUEST	YC{YY}{MM}-{####}	7	MONTH	2606
11	STOCK_RECONCILIATION	STOCK_RECONCILIATION-{######}	6	MONTH	2606
4	STOCK_RECEIPT	PN{YY}{MM}-{####}	6	MONTH	2606
13	WORK_ORDER	LSX{YY}{MM}-{####}	3	MONTH	2606
14	MATERIAL_TRANSFER	PXSX{YY}{MM}-{####}	2	MONTH	2606
7	SUPPLIER_RETURN	TH{YY}{MM}-{####}	1	MONTH	2606
15	MANUFACTURE	PNSX{YY}{MM}-{####}	4	MONTH	2606
3	PURCHASE_ORDER	PO{YY}{MM}-{####}	9	MONTH	2606
1	QUOTATION	BG{YY}{MM}-{####}	18	MONTH	2606
9	LEAD	LEAD-{######}	2	MONTH	2606
\.


--
-- Data for Name: employee; Type: TABLE DATA; Schema: core; Owner: -
--

COPY core.employee (id, code, full_name, department_id, position_id, phone, email, base_salary, insurance_no, is_active) FROM stdin;
\.


--
-- Data for Name: exchange_rate; Type: TABLE DATA; Schema: core; Owner: -
--

COPY core.exchange_rate (id, currency_code, rate_date, rate) FROM stdin;
\.


--
-- Data for Name: job_title; Type: TABLE DATA; Schema: core; Owner: -
--

COPY core.job_title (id, code, name) FROM stdin;
\.


--
-- Data for Name: note; Type: TABLE DATA; Schema: core; Owner: -
--

COPY core.note (id, ref_table, ref_id, content, created_by, created_at) FROM stdin;
\.


--
-- Data for Name: partner; Type: TABLE DATA; Schema: core; Owner: -
--

COPY core.partner (id, code, tax_code, short_name, full_name, is_customer, is_supplier, customer_group, source, ranking, country, province, district, address, phone, hotline, fax, email, website, payment_method_id, delivery_method_id, salesperson_id, credit_limit, credit_days, is_active) FROM stdin;
1	KH001	\N	Cty ABC	\N	t	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	30	t
2	NCC32456	\N	NCC ton kho	\N	f	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t
3	KH26657	\N	KH ton kho	\N	t	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t
4	KHV3_25729	\N	KH test v3	\N	t	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t
5	KHV3_13884	\N	KH test v3	\N	t	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t
6	KHMRP3666	\N	KH MRP test	\N	t	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t
7	NCCMRP10325	\N	NCC MRP test	\N	f	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t
8	KHMRP32086	\N	KH MRP test	\N	t	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t
9	NCCMRP9467	\N	NCC MRP test	\N	f	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t
10	KHMRP28831	\N	KH MRP test	\N	t	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t
11	NCCMRP9612	\N	NCC MRP test	\N	f	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t
12	KHFV218661	\N	KH Finance V2	\N	t	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t
13	KHFV219428	\N	KH Finance V2	\N	t	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t
14	KHFV220101	\N	KH Finance V2	\N	t	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t
15	KHFV220650	\N	KH Finance V2	\N	t	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t
16	KHFV221090	\N	KH Finance V2	\N	t	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t
17	KHFV222178	\N	KH Finance V2	\N	t	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t
18	KHFV222756	\N	KH Finance V2	\N	t	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t
19	KHFINOLD7979	\N	Khach hang test old	\N	t	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t
20	KH24650	\N	Khach hang test	\N	t	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t
\.


--
-- Data for Name: partner_address; Type: TABLE DATA; Schema: core; Owner: -
--

COPY core.partner_address (id, partner_id, address, addr_type) FROM stdin;
\.


--
-- Data for Name: partner_bank_account; Type: TABLE DATA; Schema: core; Owner: -
--

COPY core.partner_bank_account (id, partner_id, bank_name, account_no, holder, branch) FROM stdin;
\.


--
-- Data for Name: partner_contact; Type: TABLE DATA; Schema: core; Owner: -
--

COPY core.partner_contact (id, partner_id, name, title, phone, email, note) FROM stdin;
\.


--
-- Data for Name: partner_sales_cost; Type: TABLE DATA; Schema: core; Owner: -
--

COPY core.partner_sales_cost (id, partner_id, cost_type_id, payee_id, rate_pct, vat_pct) FROM stdin;
\.


--
-- Data for Name: payment_method; Type: TABLE DATA; Schema: core; Owner: -
--

COPY core.payment_method (id, code, name, due_days) FROM stdin;
1	Xe	Công nợ	0
2	AAA	Tiền mặt	0
\.


--
-- Data for Name: payment_terms_template; Type: TABLE DATA; Schema: core; Owner: -
--

COPY core.payment_terms_template (id, code, name, is_active) FROM stdin;
\.


--
-- Data for Name: payment_terms_template_line; Type: TABLE DATA; Schema: core; Owner: -
--

COPY core.payment_terms_template_line (id, template_id, pct, days_after, note) FROM stdin;
\.


--
-- Data for Name: permission; Type: TABLE DATA; Schema: core; Owner: -
--

COPY core.permission (id, grantee_type, grantee_id, subject_type, subject_code, action) FROM stdin;
\.


--
-- Data for Name: process; Type: TABLE DATA; Schema: core; Owner: -
--

COPY core.process (id, code, name) FROM stdin;
1	XI	Gia công xi
2	NHUNG_NONG	Nhúng nóng
3	TARO_TAN	Taro tán
\.


--
-- Data for Name: product; Type: TABLE DATA; Schema: core; Owner: -
--

COPY core.product (id, code, name, product_type, group_id, uom_id, is_kit, price_weight, barcode, qr_code, spec, min_stock, is_active) FROM stdin;
1	BL10	Bu long M10	GOODS	\N	1	f	\N	\N	\N	\N	\N	t
2	BL23999	Bu long M10	GOODS	\N	1	f	\N	\N	\N	\N	\N	t
3	SP16185	San pham ton kho	GOODS	\N	1	f	\N	\N	\N	\N	\N	t
7	TEST09001	Test trung ma 409	GOODS	\N	1	f	\N	\N	\N	\N	\N	f
8	SPV3_11533	San pham test v3	GOODS	\N	1	f	\N	\N	\N	\N	\N	t
9	GIFTV3_11344	Hang tang test v3	GOODS	\N	1	f	\N	\N	\N	\N	\N	t
10	SPV3_14652	San pham test v3	GOODS	\N	1	f	\N	\N	\N	\N	\N	t
11	GIFTV3_19688	Hang tang test v3	GOODS	\N	1	f	\N	\N	\N	\N	\N	t
12	Xe	HOANG UYEN PHUONG	GOODS	1	1	f	\N	\N	\N	\N	\N	t
13	MRPA6069	San pham A	GOODS	\N	1	f	\N	\N	\N	\N	\N	t
14	MRPB10261	Ban thanh pham B	GOODS	\N	1	f	\N	\N	\N	\N	\N	t
15	MRPC19134	NVL C	GOODS	\N	1	f	\N	\N	\N	\N	\N	t
16	MRPD19288	NVL D	GOODS	\N	1	f	\N	\N	\N	\N	\N	t
17	MRPA9472	San pham A	GOODS	\N	1	f	\N	\N	\N	\N	\N	t
18	MRPB3444	Ban thanh pham B	GOODS	\N	1	f	\N	\N	\N	\N	\N	t
19	MRPC21377	NVL C	GOODS	\N	1	f	\N	\N	\N	\N	\N	t
20	MRPD25741	NVL D	GOODS	\N	1	f	\N	\N	\N	\N	\N	t
21	MRPA10641	San pham A	GOODS	\N	1	f	\N	\N	\N	\N	\N	t
22	MRPB17517	Ban thanh pham B	GOODS	\N	1	f	\N	\N	\N	\N	\N	t
23	MRPC26990	NVL C	GOODS	\N	1	f	\N	\N	\N	\N	\N	t
24	MRPD22424	NVL D	GOODS	\N	1	f	\N	\N	\N	\N	\N	t
\.


--
-- Data for Name: product_bom; Type: TABLE DATA; Schema: core; Owner: -
--

COPY core.product_bom (id, kit_product_id, component_product_id, quantity) FROM stdin;
\.


--
-- Data for Name: product_group; Type: TABLE DATA; Schema: core; Owner: -
--

COPY core.product_group (id, code, name, parent_id) FROM stdin;
1	BL	Bu long	\N
\.


--
-- Data for Name: task; Type: TABLE DATA; Schema: core; Owner: -
--

COPY core.task (id, ref_table, ref_id, title, content, assignee_id, due_date, status) FROM stdin;
\.


--
-- Data for Name: tax_charge_template; Type: TABLE DATA; Schema: core; Owner: -
--

COPY core.tax_charge_template (id, code, name, is_active) FROM stdin;
\.


--
-- Data for Name: tax_charge_template_line; Type: TABLE DATA; Schema: core; Owner: -
--

COPY core.tax_charge_template_line (id, template_id, charge_type, rate_pct, fixed_amount, account_code, note) FROM stdin;
\.


--
-- Data for Name: uom; Type: TABLE DATA; Schema: core; Owner: -
--

COPY core.uom (id, code, name) FROM stdin;
1	CAI	Cai
\.


--
-- Data for Name: uom_conversion; Type: TABLE DATA; Schema: core; Owner: -
--

COPY core.uom_conversion (id, from_uom_id, to_uom_id, factor) FROM stdin;
\.


--
-- Data for Name: user_group; Type: TABLE DATA; Schema: core; Owner: -
--

COPY core.user_group (id, code, name) FROM stdin;
1	TESTGRP01	Test Group 19
\.


--
-- Data for Name: user_group_member; Type: TABLE DATA; Schema: core; Owner: -
--

COPY core.user_group_member (group_id, user_id) FROM stdin;
\.


--
-- Data for Name: warehouse; Type: TABLE DATA; Schema: core; Owner: -
--

COPY core.warehouse (id, code, name, is_outsourcing, is_active, parent_id) FROM stdin;
1	KHO13029	Kho test ton kho	f	t	\N
2	WHMRP9204	Kho MRP test	f	t	\N
3	WHMRP9087	Kho MRP test	f	t	\N
4	WHMRP31689	Kho MRP test	f	t	\N
\.


--
-- Data for Name: warehouse_location; Type: TABLE DATA; Schema: core; Owner: -
--

COPY core.warehouse_location (id, warehouse_id, code, name) FROM stdin;
\.


--
-- Data for Name: wf_transition_log; Type: TABLE DATA; Schema: core; Owner: -
--

COPY core.wf_transition_log (id, ref_table, ref_id, from_status, to_status, reason, acted_by, acted_at) FROM stdin;
1	quotations	2	NEW	APPROVAL_REQUESTED	\N	1	2026-06-11 12:42:49.993699+07
2	quotations	2	APPROVAL_REQUESTED	APPROVED	\N	1	2026-06-11 12:42:51.195503+07
3	quotations	2	APPROVED	ORDERED	\N	1	2026-06-11 12:42:52.76321+07
4	sales-orders	1	DRAFT	APPROVAL_REQUESTED	\N	1	2026-06-11 12:42:54.565419+07
5	sales-orders	1	APPROVAL_REQUESTED	APPROVED	\N	1	2026-06-11 12:42:55.927604+07
6	purchase-orders	1	DRAFT	APPROVED	\N	1	2026-06-11 17:37:14.406112+07
7	purchase-orders	1	APPROVED	NOT_RECEIVED	\N	1	2026-06-11 17:37:14.506814+07
8	stock-docs	1	DRAFT	REQUESTED	\N	1	2026-06-11 17:37:17.498944+07
9	stock-docs	1	REQUESTED	CONFIRMED	\N	1	2026-06-11 17:37:18.421885+07
10	stock-docs	1	CONFIRMED	COMPLETED	\N	1	2026-06-11 17:37:19.366334+07
11	purchase-orders	1	NOT_RECEIVED	RECEIVED	Nhập kho đủ theo phiếu PN2606-0001	1	2026-06-11 17:37:19.366334+07
12	sales-orders	2	DRAFT	APPROVAL_REQUESTED	\N	1	2026-06-11 17:37:22.390681+07
13	sales-orders	2	APPROVAL_REQUESTED	APPROVED	\N	1	2026-06-11 17:37:22.471758+07
14	sales-orders	2	APPROVED	NOT_DELIVERED	\N	1	2026-06-11 17:37:22.553252+07
15	stock-docs	2	DRAFT	REQUESTED	\N	1	2026-06-11 17:37:25.514594+07
16	stock-docs	2	REQUESTED	CONFIRMED	\N	1	2026-06-11 17:37:26.401164+07
17	stock-docs	2	CONFIRMED	COMPLETED	\N	1	2026-06-11 17:37:27.355278+07
18	sales-orders	2	NOT_DELIVERED	DELIVERED	Xuất kho đủ theo phiếu PX2606-0001	1	2026-06-11 17:37:27.355278+07
19	sales-orders	3	DRAFT	APPROVAL_REQUESTED	\N	1	2026-06-11 17:37:32.359953+07
20	sales-orders	3	APPROVAL_REQUESTED	APPROVED	\N	1	2026-06-11 17:37:32.453923+07
21	sales-orders	3	APPROVED	NOT_DELIVERED	\N	1	2026-06-11 17:37:32.528267+07
22	stock-docs	3	DRAFT	REQUESTED	\N	1	2026-06-11 17:37:33.618295+07
23	stock-docs	3	REQUESTED	CONFIRMED	\N	1	2026-06-11 17:37:33.684815+07
24	quotations	3	NEW	APPROVAL_REQUESTED	\N	1	2026-06-11 23:39:09.577106+07
25	quotations	3	APPROVAL_REQUESTED	APPROVED	\N	1	2026-06-11 23:39:10.632955+07
26	quotations	3	APPROVED	ORDERED	\N	1	2026-06-11 23:39:11.796124+07
27	sales-orders	4	DRAFT	APPROVAL_REQUESTED	\N	1	2026-06-11 23:39:12.638595+07
28	sales-orders	4	APPROVAL_REQUESTED	APPROVED	\N	1	2026-06-11 23:39:13.682573+07
29	quotations	4	NEW	CANCELLED	Khách hàng hủy yêu cầu	1	2026-06-11 23:43:18.649243+07
30	quotations	5	NEW	CANCELLED	test reason	1	2026-06-11 23:43:59.091157+07
31	quotations	6	NEW	CANCELLED	test reason	1	2026-06-11 23:44:20.618482+07
32	purchase-orders	2	DRAFT	APPROVED	\N	1	2026-06-12 06:04:22.780041+07
33	purchase-orders	3	DRAFT	APPROVED	\N	1	2026-06-12 06:05:59.382924+07
34	po-payments	1	DRAFT	APPROVED	\N	1	2026-06-12 06:06:02.223903+07
35	purchase-orders	4	DRAFT	APPROVED	\N	1	2026-06-12 06:07:48.18836+07
36	po-payments	2	DRAFT	APPROVED	\N	1	2026-06-12 06:07:51.010563+07
37	purchase-orders	5	DRAFT	APPROVED	\N	1	2026-06-12 06:17:08.94723+07
38	po-payments	3	DRAFT	APPROVED	\N	1	2026-06-12 06:17:11.685818+07
39	purchase-requests	1	DRAFT	APPROVED	\N	1	2026-06-12 06:20:20.293913+07
40	supplier-returns	1	DRAFT	APPROVED	\N	1	2026-06-12 06:20:55.990275+07
41	purchase-orders	6	DRAFT	APPROVED	\N	1	2026-06-12 06:22:14.18613+07
42	po-payments	4	DRAFT	APPROVED	\N	1	2026-06-12 06:22:17.050947+07
43	quotations	8	NEW	PRICE_REQUESTED	\N	1	2026-06-12 10:43:32.970506+07
44	quotations	9	NEW	PRICE_REQUESTED	\N	1	2026-06-12 10:46:14.240153+07
45	quotations	10	NEW	PRICE_REQUESTED	\N	1	2026-06-12 10:48:16.469473+07
46	quotations	11	NEW	PRICE_REQUESTED	\N	1	2026-06-12 10:50:29.786643+07
47	quotations	11	PRICE_REQUESTED	APPROVAL_REQUESTED	\N	1	2026-06-12 10:50:34.259015+07
48	quotations	11	APPROVAL_REQUESTED	APPROVED	\N	1	2026-06-12 10:50:35.09249+07
49	quotations	11	APPROVED	ORDERED	\N	1	2026-06-12 10:50:36.025494+07
50	quotations	10	PRICE_REQUESTED	PRICING	\N	1	2026-06-12 10:54:04.045754+07
51	quotations	12	NEW	PRICE_REQUESTED	\N	1	2026-06-12 10:58:14.364735+07
52	quotations	12	PRICE_REQUESTED	APPROVAL_REQUESTED	\N	1	2026-06-12 10:58:18.988257+07
53	quotations	12	APPROVAL_REQUESTED	APPROVED	\N	1	2026-06-12 10:58:19.844423+07
54	quotations	12	APPROVED	ORDERED	\N	1	2026-06-12 10:58:20.800358+07
55	quotations	13	DRAFT	OPEN	\N	1	2026-06-12 21:06:06.014807+07
56	quotations	14	DRAFT	OPEN	\N	1	2026-06-12 21:06:17.86169+07
57	quotations	14	OPEN	LOST	Gia cao hon doi thu	1	2026-06-12 21:06:19.139517+07
58	quotations	15	DRAFT	CANCELLED	Khach doi y	1	2026-06-12 21:06:27.097111+07
59	quotations	17	DRAFT	OPEN	\N	1	2026-06-12 21:22:09.088995+07
60	quotations	17	OPEN	ORDERED	\N	1	2026-06-12 21:22:14.257186+07
61	quotations	18	DRAFT	OPEN	\N	1	2026-06-12 21:22:19.67176+07
62	quotations	18	OPEN	LOST	Gia cao hon doi thu	1	2026-06-12 21:22:20.622028+07
63	quotations	19	DRAFT	CANCELLED	Khach doi y	1	2026-06-12 21:22:26.519548+07
64	production-plans	1	DRAFT	SUBMITTED	\N	1	2026-06-13 21:43:35.746337+07
65	work-orders	1	DRAFT	NOT_STARTED	\N	1	2026-06-13 21:43:40.235598+07
66	production-plans	2	DRAFT	SUBMITTED	\N	1	2026-06-13 22:00:53.559632+07
67	work-orders	2	DRAFT	NOT_STARTED	\N	1	2026-06-13 22:00:57.393365+07
68	work-orders	2	NOT_STARTED	IN_PROCESS	\N	1	2026-06-13 22:00:57.623754+07
69	production-plans	3	DRAFT	SUBMITTED	\N	1	2026-06-13 22:06:52.51948+07
70	work-orders	3	DRAFT	NOT_STARTED	\N	1	2026-06-13 22:06:56.525628+07
71	work-orders	3	NOT_STARTED	IN_PROCESS	\N	1	2026-06-13 22:06:56.704162+07
\.


--
-- Data for Name: work_position; Type: TABLE DATA; Schema: core; Owner: -
--

COPY core.work_position (id, code, name, department_id, job_title_id) FROM stdin;
\.


--
-- Data for Name: activity; Type: TABLE DATA; Schema: crm; Owner: -
--

COPY crm.activity (id, ref_table, ref_id, activity_type, subject, description, due_date, is_reminder, assignee_id, status, creator_id, created_at, completed_at) FROM stdin;
\.


--
-- Data for Name: campaign; Type: TABLE DATA; Schema: crm; Owner: -
--

COPY crm.campaign (id, doc_no, name, campaign_type, budget, start_date, end_date, status, note, creator_id, created_at) FROM stdin;
\.


--
-- Data for Name: lead; Type: TABLE DATA; Schema: crm; Owner: -
--

COPY crm.lead (id, doc_no, first_name, last_name, company_name, job_title, phone, mobile_no, email, lead_source_id, campaign_id, territory_id, salesperson_id, status, lost_reason, partner_id, opportunity_id, note, creator_id, created_at) FROM stdin;
1	LEAD-000001	Audit	Test	AuditCo	Tester	0123456789	\N	audit@test.com	\N	\N	\N	\N	LEAD	\N	\N	\N	smoke test	\N	2026-06-13 13:30:43.769657+07
\.


--
-- Data for Name: lead_source; Type: TABLE DATA; Schema: crm; Owner: -
--

COPY crm.lead_source (id, code, name, is_active) FROM stdin;
1	WEBSITE	Website	t
2	REFERRAL	Giới thiệu	t
3	TRADE_SHOW	Hội chợ	t
4	COLD_CALL	Gọi chào hàng	t
5	ADVERTISEMENT	Quảng cáo	t
6	PARTNER	Đối tác	t
\.


--
-- Data for Name: opportunity; Type: TABLE DATA; Schema: crm; Owner: -
--

COPY crm.opportunity (id, doc_no, lead_id, partner_id, opportunity_type, sales_stage_id, probability_pct, expected_closing_date, expected_value, currency, salesperson_id, territory_id, status, lost_reason_id, competitor, quotation_id, note, creator_id, created_at) FROM stdin;
\.


--
-- Data for Name: opportunity_line; Type: TABLE DATA; Schema: crm; Owner: -
--

COPY crm.opportunity_line (id, opportunity_id, product_id, qty, estimated_rate, amount, note) FROM stdin;
\.


--
-- Data for Name: sales_stage; Type: TABLE DATA; Schema: crm; Owner: -
--

COPY crm.sales_stage (id, code, name, order_no, probability_pct, is_active) FROM stdin;
1	PROSPECTING	Prospecting	1	10.00	t
2	QUALIFICATION	Qualification	2	25.00	t
3	PROPOSAL	Proposal	3	50.00	t
4	NEGOTIATION	Negotiation	4	75.00	t
5	CLOSED_WON	Won	5	100.00	t
\.


--
-- Data for Name: account; Type: TABLE DATA; Schema: finance; Owner: -
--

COPY finance.account (id, code, name, parent_id, account_type, object_category_id, balance_detail, balance_side, is_active) FROM stdin;
3	112	Tiền gửi ngân hàng	\N	ASSET	\N	NONE	GREATER	t
4	113	Tiền đang chuyển	\N	ASSET	\N	NONE	GREATER	t
5	131	Phải thu của khách hàng	\N	ASSET	\N	OBJECT	GREATER	t
6	133	Thuế GTGT được khấu trừ	\N	ASSET	\N	NONE	GREATER	t
7	136	Phải thu nội bộ	\N	ASSET	\N	NONE	GREATER	t
8	138	Phải thu khác	\N	ASSET	\N	NONE	GREATER	t
9	141	Tạm ứng	\N	ASSET	\N	NONE	GREATER	t
10	151	Hàng mua đang đi đường	\N	ASSET	\N	NONE	GREATER	t
11	152	Nguyên liệu, vật liệu	\N	ASSET	\N	OBJECT_QTY	GREATER	t
12	153	Công cụ, dụng cụ	\N	ASSET	\N	OBJECT_QTY	GREATER	t
13	155	Thành phẩm	\N	ASSET	\N	OBJECT_QTY	GREATER	t
14	156	Hàng hóa	\N	ASSET	\N	OBJECT_QTY	GREATER	t
15	157	Hàng gửi đi bán	\N	ASSET	\N	OBJECT_QTY	GREATER	t
16	211	TSCĐ hữu hình	\N	ASSET	\N	NONE	GREATER	t
17	214	Hao mòn TSCĐ	\N	ASSET	\N	NONE	CREDIT	t
18	241	Chi phí SXKD dở dang	\N	ASSET	\N	NONE	GREATER	t
19	331	Phải trả người bán	\N	LIABILITY	\N	OBJECT	CREDIT	t
20	333	Thuế và các khoản phải nộp nhà nước	\N	LIABILITY	\N	NONE	CREDIT	t
21	334	Phải trả người lao động	\N	LIABILITY	\N	OBJECT	CREDIT	t
22	336	Phải trả nội bộ	\N	LIABILITY	\N	NONE	CREDIT	t
23	338	Phải trả, phải nộp khác	\N	LIABILITY	\N	NONE	CREDIT	t
24	341	Vay và nợ thuê TC	\N	LIABILITY	\N	NONE	CREDIT	t
25	411	Nguồn vốn kinh doanh	\N	EQUITY	\N	NONE	CREDIT	t
26	421	Lợi nhuận chưa phân phối	\N	EQUITY	\N	NONE	CREDIT	t
27	511	Doanh thu bán hàng	\N	REVENUE	\N	NONE	CREDIT	t
28	512	Doanh thu cung cấp DV	\N	REVENUE	\N	NONE	CREDIT	t
29	515	Doanh thu hoạt động tài chính	\N	REVENUE	\N	NONE	CREDIT	t
30	521	Các khoản giảm trừ doanh thu	\N	REVENUE	\N	NONE	GREATER	t
31	611	Xác định KQ kinh doanh	\N	NORMAL	\N	NONE	NONE	t
32	621	Giá vốn hàng bán	\N	EXPENSE	\N	NONE	GREATER	t
33	622	Chi phí bán hàng	\N	EXPENSE	\N	NONE	GREATER	t
34	627	Chi phí sản xuất chung	\N	EXPENSE	\N	NONE	GREATER	t
35	632	Giá vốn hàng bán	\N	EXPENSE	\N	NONE	GREATER	t
36	635	Chi phí tài chính	\N	EXPENSE	\N	NONE	GREATER	t
37	641	Chi phí bán hàng	\N	EXPENSE	\N	NONE	GREATER	t
38	642	Chi phí quản lý DN	\N	EXPENSE	\N	NONE	GREATER	t
39	711	Thu nhập khác	\N	REVENUE	\N	NONE	CREDIT	t
40	811	Chi phí khác	\N	EXPENSE	\N	NONE	GREATER	t
41	821	Chi phí thuế TNDN	\N	EXPENSE	\N	NONE	GREATER	t
42	911	Xác định kết quả kinh doanh	\N	NORMAL	\N	NONE	NONE	t
2	111	Tiền mặt	\N	ASSET	\N	NONE	GREATER	t
\.


--
-- Data for Name: accounting_policy; Type: TABLE DATA; Schema: finance; Owner: -
--

COPY finance.accounting_policy (id, base_currency, accounting_regime, fiscal_start_month, inventory_costing, first_period_id, options, require_cost_center, perpetual_inventory) FROM stdin;
1	VND	TT200	1	AVG	\N	{}	f	t
\.


--
-- Data for Name: asset_alloc_rule; Type: TABLE DATA; Schema: finance; Owner: -
--

COPY finance.asset_alloc_rule (id, asset_id, account_id, object_type, object_id, factor, apply_from_period_id, apply_future) FROM stdin;
\.


--
-- Data for Name: asset_group; Type: TABLE DATA; Schema: finance; Owner: -
--

COPY finance.asset_group (id, code, name, cost_account_id, dep_account_id) FROM stdin;
\.


--
-- Data for Name: asset_report; Type: TABLE DATA; Schema: finance; Owner: -
--

COPY finance.asset_report (id, asset_id, report_date, report_type, asset_operation, dep_method, dep_start_rule, original_cost, remaining_months, monthly_dep, status) FROM stdin;
\.


--
-- Data for Name: bank_fee; Type: TABLE DATA; Schema: finance; Owner: -
--

COPY finance.bank_fee (id, voucher_id, amount, vat_pct, description) FROM stdin;
\.


--
-- Data for Name: business_operation; Type: TABLE DATA; Schema: finance; Owner: -
--

COPY finance.business_operation (id, code, name, voucher_type, template) FROM stdin;
1	BH_GHINO	Bán hàng ghi nợ	PHIEU_GHI_NO	{"cr": "511", "dr": "131"}
2	BH_THANHTOAN	Bán hàng thanh toán	HOA_DON_BAN	{"cr": "511", "dr": "111"}
3	NHAP_MUA	Nhập kho mua hàng	PHIEU_NHAP_KT	{"cr": "331", "dr": "156"}
4	XUAT_BAN	Xuất kho bán hàng	PHIEU_XUAT_KT	{"cr": "156", "dr": "632"}
5	THU_NO	Thu tiền khách hàng	PHIEU_THU	{"cr": "131", "dr": "111"}
6	CHI_NCC	Chi tiền NCC	PHIEU_CHI	{"cr": "111", "dr": "331"}
7	YCC_THANHTOAN	Yêu cầu chi	YEU_CAU_CHI	{"cr": "111", "dr": "331"}
8	TRA_HANG	Trả hàng NCC	TRA_HANG_NCC	{"cr": "156", "dr": "331"}
9	GIA_CONG	Chi phí gia công	PHIEU_GHI_NO	{"cr": "331", "dr": "627"}
10	CHUYEN_KHO	Điều chuyển kho	DIEU_CHUYEN_KT	{"cr": "156-w1", "dr": "156-w2"}
\.


--
-- Data for Name: cash_fund; Type: TABLE DATA; Schema: finance; Owner: -
--

COPY finance.cash_fund (id, code, name, fund_type, account_id, bank_name, account_no, currency_code) FROM stdin;
2	TM01	Quỹ tiền mặt	CASH	2	\N	\N	VND
\.


--
-- Data for Name: cit_declaration; Type: TABLE DATA; Schema: finance; Owner: -
--

COPY finance.cit_declaration (id, decl_type, fiscal_year, quarter, data, created_at) FROM stdin;
\.


--
-- Data for Name: cost_center; Type: TABLE DATA; Schema: finance; Owner: -
--

COPY finance.cost_center (id, code, name, parent_id, is_group, is_active) FROM stdin;
1	CC	Toàn công ty	\N	t	t
2	CC-VP	Văn phòng	1	f	t
25	CCV212641	Kinh doanh V2 Test (updated)	1	f	t
28	CCV215381	Kinh doanh V2 Test (updated)	1	f	t
31	CCV21328	Kinh doanh V2 Test (updated)	1	f	t
34	CCV24821	Kinh doanh V2 Test (updated)	1	f	t
37	CCV214063	Kinh doanh V2 Test (updated)	1	f	t
40	CCV221571	Kinh doanh V2 Test (updated)	1	f	t
43	CCV223495	Kinh doanh V2 Test (updated)	1	f	t
\.


--
-- Data for Name: costing_object; Type: TABLE DATA; Schema: finance; Owner: -
--

COPY finance.costing_object (id, process_id, period_id, total_cost, total_qty, unit_cost, status) FROM stdin;
\.


--
-- Data for Name: depreciation_entry; Type: TABLE DATA; Schema: finance; Owner: -
--

COPY finance.depreciation_entry (id, asset_id, period_id, amount, voucher_id, is_valid) FROM stdin;
\.


--
-- Data for Name: fiscal_period; Type: TABLE DATA; Schema: finance; Owner: -
--

COPY finance.fiscal_period (id, fiscal_year, period_no, date_from, date_to, status) FROM stdin;
13	2026	1	2026-01-01	2026-01-31	OPEN
14	2026	2	2026-02-01	2026-02-28	OPEN
15	2026	3	2026-03-01	2026-03-31	OPEN
16	2026	4	2026-04-01	2026-04-30	OPEN
17	2026	5	2026-05-01	2026-05-31	OPEN
18	2026	6	2026-06-01	2026-06-30	OPEN
20	2026	8	2026-08-01	2026-08-31	OPEN
21	2026	9	2026-09-01	2026-09-30	OPEN
22	2026	10	2026-10-01	2026-10-31	OPEN
23	2026	11	2026-11-01	2026-11-30	OPEN
24	2026	12	2026-12-01	2026-12-31	OPEN
19	2026	7	2026-07-01	2026-07-31	CLOSED
\.


--
-- Data for Name: fixed_asset; Type: TABLE DATA; Schema: finance; Owner: -
--

COPY finance.fixed_asset (id, code, name, group_id, department_id, start_use_date, is_tool, is_active) FROM stdin;
\.


--
-- Data for Name: fs_mapping; Type: TABLE DATA; Schema: finance; Owner: -
--

COPY finance.fs_mapping (id, statement, item_code, item_name, display_order, indent_level, account_prefixes, formula_item_codes, formula_signs, sign, is_period_delta) FROM stdin;
1	B01	110	Tiền và các khoản tương đương tiền	11	1	{111,112,113}	\N	\N	1	f
2	B01	130	Các khoản phải thu ngắn hạn	12	1	{131,136,138,141}	\N	\N	1	f
3	B01	140	Hàng tồn kho	13	1	{151,152,153,154,155,156,157}	\N	\N	1	f
4	B01	150	Tài sản ngắn hạn khác	14	1	{133}	\N	\N	1	f
5	B01	100	TÀI SẢN NGẮN HẠN	10	0	\N	{110,130,140,150}	{1,1,1,1}	1	f
6	B01	211	Nguyên giá TSCĐ	21	2	{211}	\N	\N	1	f
7	B01	214	Hao mòn TSCĐ	22	2	{214}	\N	\N	1	f
8	B01	210	Tài sản cố định	20	1	\N	{211,214}	{1,1}	1	f
9	B01	240	Chi phí SXKD dở dang dài hạn	23	1	{241}	\N	\N	1	f
10	B01	200	TÀI SẢN DÀI HẠN	19	0	\N	{210,240}	{1,1}	1	f
11	B01	270	TỔNG CỘNG TÀI SẢN	30	0	\N	{100,200}	{1,1}	1	f
12	B01	300	NỢ PHẢI TRẢ	40	0	{331,333,334,336,338,341}	\N	\N	-1	f
13	B01	400	VỐN CHỦ SỞ HỮU	50	0	{411,421}	\N	\N	-1	f
14	B01	440	TỔNG CỘNG NGUỒN VỐN	60	0	\N	{300,400}	{1,1}	1	f
15	B02	01	Doanh thu bán hàng và cung cấp dịch vụ	1	0	{511,512}	\N	\N	-1	f
16	B02	02	Các khoản giảm trừ doanh thu	2	0	{521}	\N	\N	1	f
17	B02	10	Doanh thu thuần	3	0	\N	{01,02}	{1,-1}	1	f
18	B02	11	Giá vốn hàng bán	4	0	{632}	\N	\N	1	f
19	B02	20	Lợi nhuận gộp	5	0	\N	{10,11}	{1,-1}	1	f
20	B02	21	Doanh thu hoạt động tài chính	6	0	{515}	\N	\N	-1	f
21	B02	22	Chi phí tài chính	7	0	{635}	\N	\N	1	f
22	B02	25	Chi phí bán hàng	8	0	{641}	\N	\N	1	f
23	B02	26	Chi phí quản lý doanh nghiệp	9	0	{642}	\N	\N	1	f
24	B02	30	Lợi nhuận thuần từ hoạt động kinh doanh	10	0	\N	{20,21,22,25,26}	{1,1,-1,-1,-1}	1	f
25	B02	31	Thu nhập khác	11	0	{711}	\N	\N	-1	f
26	B02	32	Chi phí khác	12	0	{811}	\N	\N	1	f
27	B02	40	Lợi nhuận khác	13	0	\N	{31,32}	{1,-1}	1	f
28	B02	50	Tổng lợi nhuận kế toán trước thuế	14	0	\N	{30,40}	{1,1}	1	f
29	B02	51	Chi phí thuế TNDN hiện hành	15	0	{821}	\N	\N	1	f
30	B02	60	Lợi nhuận sau thuế thu nhập doanh nghiệp	16	0	\N	{50,51}	{1,-1}	1	f
31	B03	01	Lợi nhuận trước thuế	1	0	\N	{B02:50}	{1}	1	f
32	B03	02	Khấu hao TSCĐ	2	1	{214}	\N	\N	-1	t
33	B03	03	Tăng/giảm các khoản phải thu	3	1	{131,136,138,141}	\N	\N	-1	t
34	B03	04	Tăng/giảm hàng tồn kho	4	1	{151,152,153,154,155,156,157}	\N	\N	-1	t
35	B03	05	Tăng/giảm các khoản phải trả	5	1	{331,333,334,336,338}	\N	\N	-1	t
36	B03	20	Lưu chuyển tiền thuần từ hoạt động kinh doanh	6	0	\N	{01,02,03,04,05}	{1,1,1,1,1}	1	f
\.


--
-- Data for Name: gl_entry; Type: TABLE DATA; Schema: finance; Owner: -
--

COPY finance.gl_entry (id, voucher_id, period_id, posting_date, account_id, side, object_type, object_id, currency_code, amount_fc, amount, quantity, warehouse_id, product_id, lot_id, description, exchange_rate, is_cancelled, remarks, cost_center_id, against, party_type, party_id, fc_amount, voucher_line_id, created_at) FROM stdin;
7	26	18	2026-06-14	5	DEBIT	PARTNER	16	VND	0.00	10000000.00	\N	\N	\N	\N	Ban hang	1.000000	f	\N	\N	511	PARTNER	16	10000000.00	26	2026-06-14 07:21:37.11503+07
8	26	18	2026-06-14	27	CREDIT	\N	\N	VND	0.00	10000000.00	\N	\N	\N	\N	Ban hang	1.000000	f	\N	\N	131	\N	\N	10000000.00	26	2026-06-14 07:21:37.11503+07
9	27	18	2026-06-14	2	DEBIT	\N	\N	VND	0.00	6000000.00	\N	\N	\N	\N	Thu tien	1.000000	f	\N	\N	131	\N	\N	6000000.00	27	2026-06-14 07:21:40.292675+07
10	27	18	2026-06-14	5	CREDIT	PARTNER	16	VND	0.00	6000000.00	\N	\N	\N	\N	Thu tien	1.000000	f	\N	\N	111	PARTNER	16	6000000.00	27	2026-06-14 07:21:40.292675+07
11	28	18	2026-06-14	2	DEBIT	\N	\N	VND	0.00	5000000.00	\N	\N	\N	\N	Thu tien	1.000000	f	\N	\N	131	\N	\N	5000000.00	28	2026-06-14 07:21:46.409633+07
12	28	18	2026-06-14	5	CREDIT	PARTNER	16	VND	0.00	5000000.00	\N	\N	\N	\N	Thu tien	1.000000	f	\N	\N	111	PARTNER	16	5000000.00	28	2026-06-14 07:21:46.409633+07
13	29	18	2026-06-14	5	DEBIT	PARTNER	16	VND	0.00	1000000.00	\N	\N	\N	\N	Ban hang	1.000000	f	\N	\N	511	PARTNER	16	1000000.00	29	2026-06-14 07:21:51.630751+07
14	29	18	2026-06-14	27	CREDIT	\N	\N	VND	0.00	1000000.00	\N	\N	\N	\N	Ban hang	1.000000	f	\N	\N	131	\N	\N	1000000.00	29	2026-06-14 07:21:51.630751+07
47	45	18	2026-06-14	38	DEBIT	\N	\N	VND	0.00	500000.00	\N	\N	\N	\N	Chi phi QLDN	1.000000	f	\N	2	111	\N	\N	500000.00	45	2026-06-14 07:30:37.834095+07
48	45	18	2026-06-14	2	CREDIT	\N	\N	VND	0.00	500000.00	\N	\N	\N	\N	Chi phi QLDN	1.000000	f	\N	2	642	\N	\N	500000.00	45	2026-06-14 07:30:37.834095+07
49	48	18	2026-06-14	2	DEBIT	\N	\N	VND	0.00	1000000.00	\N	\N	\N	\N	Thu tien KH	1.000000	f	\N	\N	131	\N	\N	1000000.00	46	2026-06-14 07:40:13.696222+07
50	48	18	2026-06-14	5	CREDIT	\N	\N	VND	0.00	1000000.00	\N	\N	\N	\N	Thu tien KH	1.000000	f	\N	\N	111	\N	\N	1000000.00	46	2026-06-14 07:40:13.696222+07
19	30	18	2026-06-14	38	DEBIT	\N	\N	VND	0.00	500000.00	\N	\N	\N	\N	Chi phi QLDN	1.000000	f	\N	\N	111	\N	\N	500000.00	30	2026-06-14 07:22:06.771596+07
20	30	18	2026-06-14	2	CREDIT	\N	\N	VND	0.00	500000.00	\N	\N	\N	\N	Chi phi QLDN	1.000000	f	\N	\N	642	\N	\N	500000.00	30	2026-06-14 07:22:06.771596+07
21	31	18	2026-06-14	38	DEBIT	\N	\N	VND	0.00	500000.00	\N	\N	\N	\N	Chi phi QLDN	1.000000	f	\N	2	111	\N	\N	500000.00	31	2026-06-14 07:22:08.004961+07
22	31	18	2026-06-14	2	CREDIT	\N	\N	VND	0.00	500000.00	\N	\N	\N	\N	Chi phi QLDN	1.000000	f	\N	2	642	\N	\N	500000.00	31	2026-06-14 07:22:08.004961+07
23	32	18	2026-06-14	5	DEBIT	PARTNER	17	VND	0.00	10000000.00	\N	\N	\N	\N	Ban hang	1.000000	f	\N	\N	511	PARTNER	17	10000000.00	32	2026-06-14 07:27:10.471713+07
24	32	18	2026-06-14	27	CREDIT	\N	\N	VND	0.00	10000000.00	\N	\N	\N	\N	Ban hang	1.000000	f	\N	\N	131	\N	\N	10000000.00	32	2026-06-14 07:27:10.471713+07
25	33	18	2026-06-14	2	DEBIT	\N	\N	VND	0.00	6000000.00	\N	\N	\N	\N	Thu tien	1.000000	f	\N	\N	131	\N	\N	6000000.00	33	2026-06-14 07:27:13.562768+07
26	33	18	2026-06-14	5	CREDIT	PARTNER	17	VND	0.00	6000000.00	\N	\N	\N	\N	Thu tien	1.000000	f	\N	\N	111	PARTNER	17	6000000.00	33	2026-06-14 07:27:13.562768+07
27	34	18	2026-06-14	2	DEBIT	\N	\N	VND	0.00	5000000.00	\N	\N	\N	\N	Thu tien	1.000000	f	\N	\N	131	\N	\N	5000000.00	34	2026-06-14 07:27:20.061659+07
28	34	18	2026-06-14	5	CREDIT	PARTNER	17	VND	0.00	5000000.00	\N	\N	\N	\N	Thu tien	1.000000	f	\N	\N	111	PARTNER	17	5000000.00	34	2026-06-14 07:27:20.061659+07
29	35	18	2026-06-14	5	DEBIT	PARTNER	17	VND	0.00	1000000.00	\N	\N	\N	\N	Ban hang	1.000000	t	\N	\N	511	PARTNER	17	1000000.00	35	2026-06-14 07:27:25.20236+07
30	35	18	2026-06-14	27	CREDIT	\N	\N	VND	0.00	1000000.00	\N	\N	\N	\N	Ban hang	1.000000	t	\N	\N	131	\N	\N	1000000.00	35	2026-06-14 07:27:25.20236+07
31	35	18	2026-06-14	5	CREDIT	PARTNER	17	VND	0.00	1000000.00	\N	\N	\N	\N	Ban hang	1.000000	t	Đảo bút toán hủy chứng từ FINANCE_VOUCHER-000034	\N	511	PARTNER	17	1000000.00	35	2026-06-14 07:27:31.349748+07
32	35	18	2026-06-14	27	DEBIT	\N	\N	VND	0.00	1000000.00	\N	\N	\N	\N	Ban hang	1.000000	t	Đảo bút toán hủy chứng từ FINANCE_VOUCHER-000034	\N	131	\N	\N	1000000.00	35	2026-06-14 07:27:31.349748+07
33	37	18	2026-06-14	38	DEBIT	\N	\N	VND	0.00	500000.00	\N	\N	\N	\N	Chi phi QLDN	1.000000	f	\N	\N	111	\N	\N	500000.00	37	2026-06-14 07:27:40.775237+07
34	37	18	2026-06-14	2	CREDIT	\N	\N	VND	0.00	500000.00	\N	\N	\N	\N	Chi phi QLDN	1.000000	f	\N	\N	642	\N	\N	500000.00	37	2026-06-14 07:27:40.775237+07
35	38	18	2026-06-14	38	DEBIT	\N	\N	VND	0.00	500000.00	\N	\N	\N	\N	Chi phi QLDN	1.000000	f	\N	2	111	\N	\N	500000.00	38	2026-06-14 07:27:41.986564+07
36	38	18	2026-06-14	2	CREDIT	\N	\N	VND	0.00	500000.00	\N	\N	\N	\N	Chi phi QLDN	1.000000	f	\N	2	642	\N	\N	500000.00	38	2026-06-14 07:27:41.986564+07
37	39	18	2026-06-14	5	DEBIT	PARTNER	18	VND	0.00	10000000.00	\N	\N	\N	\N	Ban hang	1.000000	f	\N	\N	511	PARTNER	18	10000000.00	39	2026-06-14 07:30:07.096272+07
38	39	18	2026-06-14	27	CREDIT	\N	\N	VND	0.00	10000000.00	\N	\N	\N	\N	Ban hang	1.000000	f	\N	\N	131	\N	\N	10000000.00	39	2026-06-14 07:30:07.096272+07
39	40	18	2026-06-14	2	DEBIT	\N	\N	VND	0.00	6000000.00	\N	\N	\N	\N	Thu tien	1.000000	f	\N	\N	131	\N	\N	6000000.00	40	2026-06-14 07:30:10.249523+07
40	40	18	2026-06-14	5	CREDIT	PARTNER	18	VND	0.00	6000000.00	\N	\N	\N	\N	Thu tien	1.000000	f	\N	\N	111	PARTNER	18	6000000.00	40	2026-06-14 07:30:10.249523+07
41	41	18	2026-06-14	2	DEBIT	\N	\N	VND	0.00	5000000.00	\N	\N	\N	\N	Thu tien	1.000000	f	\N	\N	131	\N	\N	5000000.00	41	2026-06-14 07:30:16.319185+07
42	41	18	2026-06-14	5	CREDIT	PARTNER	18	VND	0.00	5000000.00	\N	\N	\N	\N	Thu tien	1.000000	f	\N	\N	111	PARTNER	18	5000000.00	41	2026-06-14 07:30:16.319185+07
43	42	18	2026-06-14	5	DEBIT	PARTNER	18	VND	0.00	1000000.00	\N	\N	\N	\N	Ban hang	1.000000	t	\N	\N	511	PARTNER	18	1000000.00	42	2026-06-14 07:30:21.405392+07
44	42	18	2026-06-14	27	CREDIT	\N	\N	VND	0.00	1000000.00	\N	\N	\N	\N	Ban hang	1.000000	t	\N	\N	131	\N	\N	1000000.00	42	2026-06-14 07:30:21.405392+07
45	42	18	2026-06-14	5	CREDIT	PARTNER	18	VND	0.00	1000000.00	\N	\N	\N	\N	Ban hang	1.000000	t	Đảo bút toán hủy chứng từ FINANCE_VOUCHER-000040	\N	511	PARTNER	18	1000000.00	42	2026-06-14 07:30:27.543192+07
46	42	18	2026-06-14	27	DEBIT	\N	\N	VND	0.00	1000000.00	\N	\N	\N	\N	Ban hang	1.000000	t	Đảo bút toán hủy chứng từ FINANCE_VOUCHER-000040	\N	131	\N	\N	1000000.00	42	2026-06-14 07:30:27.543192+07
\.


--
-- Data for Name: lerp_voucher; Type: TABLE DATA; Schema: finance; Owner: -
--

COPY finance.lerp_voucher (id, voucher_type, source_table, source_id, ref_no, partner_id, amount, status, voucher_id, created_at) FROM stdin;
\.


--
-- Data for Name: object_category; Type: TABLE DATA; Schema: finance; Owner: -
--

COPY finance.object_category (id, code, name, source_table) FROM stdin;
1	KHACH_HANG	Khách hàng	core.partner
2	NHA_CUNG_CAP	Nhà cung cấp	core.partner
3	NHAN_VIEN	Nhân viên	core.employee
4	KHO	Kho	core.warehouse
5	SP	Sản phẩm	core.product
\.


--
-- Data for Name: opening_balance; Type: TABLE DATA; Schema: finance; Owner: -
--

COPY finance.opening_balance (id, period_id, account_id, object_type, object_id, currency_code, warehouse_id, product_id, debit_fc, credit_fc, debit, credit, quantity) FROM stdin;
1	13	2	\N	\N	\N	\N	\N	0.00	0.00	5000000.00	0.00	\N
\.


--
-- Data for Name: outbox_event; Type: TABLE DATA; Schema: finance; Owner: -
--

COPY finance.outbox_event (id, event_type, source_table, source_id, payload, created_at, processed_at) FROM stdin;
\.


--
-- Data for Name: payment_allocation; Type: TABLE DATA; Schema: finance; Owner: -
--

COPY finance.payment_allocation (id, payment_voucher_id, invoice_voucher_id, allocated_amount, created_at) FROM stdin;
1	27	26	6000000.00	2026-06-14 07:21:42.214391+07
2	28	26	4000000.00	2026-06-14 07:21:46.563081+07
3	28	29	1000000.00	2026-06-14 07:21:52.936135+07
4	33	32	6000000.00	2026-06-14 07:27:15.602454+07
5	34	32	4000000.00	2026-06-14 07:27:20.227691+07
6	34	35	1000000.00	2026-06-14 07:27:26.299015+07
7	40	39	6000000.00	2026-06-14 07:30:12.244026+07
8	41	39	4000000.00	2026-06-14 07:30:16.46074+07
9	41	42	1000000.00	2026-06-14 07:30:22.531597+07
\.


--
-- Data for Name: period_closing; Type: TABLE DATA; Schema: finance; Owner: -
--

COPY finance.period_closing (id, period_id, step, executed_at, executed_by, status, detail) FROM stdin;
\.


--
-- Data for Name: prepaid_alloc_entry; Type: TABLE DATA; Schema: finance; Owner: -
--

COPY finance.prepaid_alloc_entry (id, card_id, period_id, amount, voucher_id, is_valid) FROM stdin;
\.


--
-- Data for Name: prepaid_alloc_rule; Type: TABLE DATA; Schema: finance; Owner: -
--

COPY finance.prepaid_alloc_rule (id, card_id, account_id, object_type, object_id, factor) FROM stdin;
\.


--
-- Data for Name: prepaid_card; Type: TABLE DATA; Schema: finance; Owner: -
--

COPY finance.prepaid_card (id, prepaid_id, source_type, alloc_method, total_amount, alloc_months, status) FROM stdin;
\.


--
-- Data for Name: prepaid_expense; Type: TABLE DATA; Schema: finance; Owner: -
--

COPY finance.prepaid_expense (id, code, name, department_id, account_id, card_date) FROM stdin;
\.


--
-- Data for Name: vat_deduction; Type: TABLE DATA; Schema: finance; Owner: -
--

COPY finance.vat_deduction (id, period_id, input_vat, output_vat, deducted, voucher_id) FROM stdin;
\.


--
-- Data for Name: vat_invoice; Type: TABLE DATA; Schema: finance; Owner: -
--

COPY finance.vat_invoice (id, direction, invoice_no, invoice_serial, invoice_form, invoice_date, partner_id, partner_tax_code, pre_tax_amount, vat_pct, vat_amount, declare_period_id, voucher_id) FROM stdin;
\.


--
-- Data for Name: voucher; Type: TABLE DATA; Schema: finance; Owner: -
--

COPY finance.voucher (id, voucher_type, doc_no, doc_date, posting_date, period_id, operation_id, partner_id, employee_id, fund_id, warehouse_id, ycc_type, invoice_no, invoice_serial, invoice_form, invoice_date, currency_code, exchange_rate, total_amount, total_vat, description, lerp_voucher_id, status, posted_by, posted_at, created_by, created_at, outstanding_amount, due_date, payment_status, payment_type, paid_amount, unallocated_amount, amended_from_id) FROM stdin;
1	CT_TONG_HOP	FINANCE_VOUCHER-000001	2026-06-12	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	VND	1.0000	\N	\N	Voucher test #1 - cùng kỳ mở	\N	DRAFT	\N	\N	1	2026-06-12 13:16:51.80968+07	\N	\N	\N	\N	\N	\N	\N
2	HOA_DON_BAN	FINANCE_VOUCHER-000001	2026-06-14	\N	\N	\N	12	\N	\N	\N	\N	\N	\N	\N	\N	VND	1.0000	\N	\N	Hoa don ban FV2-1	\N	DRAFT	\N	\N	1	2026-06-14 07:09:08.516809+07	\N	\N	\N	\N	\N	\N	\N
3	PHIEU_THU	FINANCE_VOUCHER-000002	2026-06-14	\N	\N	\N	12	\N	2	\N	\N	\N	\N	\N	\N	VND	1.0000	\N	\N	Thu tien KH lan 1	\N	DRAFT	\N	\N	1	2026-06-14 07:09:12.175464+07	\N	\N	\N	RECEIVE	\N	\N	\N
4	PHIEU_THU	FINANCE_VOUCHER-000003	2026-06-14	\N	\N	\N	12	\N	2	\N	\N	\N	\N	\N	\N	VND	1.0000	\N	\N	Thu tien KH lan 2	\N	DRAFT	\N	\N	1	2026-06-14 07:09:18.536021+07	\N	\N	\N	RECEIVE	\N	\N	\N
5	HOA_DON_BAN	FINANCE_VOUCHER-000004	2026-06-14	\N	\N	\N	12	\N	\N	\N	\N	\N	\N	\N	\N	VND	1.0000	\N	\N	Hoa don ban FV2-2	\N	DRAFT	\N	\N	1	2026-06-14 07:09:22.809369+07	\N	\N	\N	\N	\N	\N	\N
6	CT_TONG_HOP	FINANCE_VOUCHER-000005	2026-06-14	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	VND	1.0000	\N	\N	CP QLDN khong CC	\N	DRAFT	\N	\N	1	2026-06-14 07:09:41.66624+07	\N	\N	\N	\N	\N	\N	\N
7	CT_TONG_HOP	FINANCE_VOUCHER-000006	2026-06-14	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	VND	1.0000	\N	\N	CP QLDN co CC	\N	DRAFT	\N	\N	1	2026-06-14 07:09:42.971693+07	\N	\N	\N	\N	\N	\N	\N
8	HOA_DON_BAN	FINANCE_VOUCHER-000007	2026-06-14	\N	\N	\N	13	\N	\N	\N	\N	\N	\N	\N	\N	VND	1.0000	\N	\N	Hoa don ban FV2-1	\N	DRAFT	\N	\N	1	2026-06-14 07:13:10.842551+07	\N	\N	\N	\N	\N	\N	\N
9	PHIEU_THU	FINANCE_VOUCHER-000008	2026-06-14	\N	\N	\N	13	\N	2	\N	\N	\N	\N	\N	\N	VND	1.0000	\N	\N	Thu tien KH lan 1	\N	DRAFT	\N	\N	1	2026-06-14 07:13:15.234927+07	\N	\N	\N	RECEIVE	\N	\N	\N
10	PHIEU_THU	FINANCE_VOUCHER-000009	2026-06-14	\N	\N	\N	13	\N	2	\N	\N	\N	\N	\N	\N	VND	1.0000	\N	\N	Thu tien KH lan 2	\N	DRAFT	\N	\N	1	2026-06-14 07:13:22.283328+07	\N	\N	\N	RECEIVE	\N	\N	\N
11	HOA_DON_BAN	FINANCE_VOUCHER-000010	2026-06-14	\N	\N	\N	13	\N	\N	\N	\N	\N	\N	\N	\N	VND	1.0000	\N	\N	Hoa don ban FV2-2	\N	DRAFT	\N	\N	1	2026-06-14 07:13:26.779047+07	\N	\N	\N	\N	\N	\N	\N
12	CT_TONG_HOP	FINANCE_VOUCHER-000011	2026-06-14	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	VND	1.0000	\N	\N	CP QLDN khong CC	\N	DRAFT	\N	\N	1	2026-06-14 07:13:43.234329+07	\N	\N	\N	\N	\N	\N	\N
13	CT_TONG_HOP	FINANCE_VOUCHER-000012	2026-06-14	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	VND	1.0000	\N	\N	CP QLDN co CC	\N	DRAFT	\N	\N	1	2026-06-14 07:13:44.484741+07	\N	\N	\N	\N	\N	\N	\N
14	HOA_DON_BAN	FINANCE_VOUCHER-000013	2026-06-14	\N	\N	\N	14	\N	\N	\N	\N	\N	\N	\N	\N	VND	1.0000	\N	\N	Hoa don ban FV2-1	\N	DRAFT	\N	\N	1	2026-06-14 07:16:30.537383+07	\N	\N	\N	\N	\N	\N	\N
15	PHIEU_THU	FINANCE_VOUCHER-000014	2026-06-14	\N	\N	\N	14	\N	2	\N	\N	\N	\N	\N	\N	VND	1.0000	\N	\N	Thu tien KH lan 1	\N	DRAFT	\N	\N	1	2026-06-14 07:16:33.659367+07	\N	\N	\N	RECEIVE	\N	\N	\N
16	PHIEU_THU	FINANCE_VOUCHER-000015	2026-06-14	\N	\N	\N	14	\N	2	\N	\N	\N	\N	\N	\N	VND	1.0000	\N	\N	Thu tien KH lan 2	\N	DRAFT	\N	\N	1	2026-06-14 07:16:39.950486+07	\N	\N	\N	RECEIVE	\N	\N	\N
17	HOA_DON_BAN	FINANCE_VOUCHER-000016	2026-06-14	\N	\N	\N	14	\N	\N	\N	\N	\N	\N	\N	\N	VND	1.0000	\N	\N	Hoa don ban FV2-2	\N	DRAFT	\N	\N	1	2026-06-14 07:16:43.943223+07	\N	\N	\N	\N	\N	\N	\N
18	CT_TONG_HOP	FINANCE_VOUCHER-000017	2026-06-14	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	VND	1.0000	\N	\N	CP QLDN khong CC	\N	DRAFT	\N	\N	1	2026-06-14 07:16:59.576276+07	\N	\N	\N	\N	\N	\N	\N
19	CT_TONG_HOP	FINANCE_VOUCHER-000018	2026-06-14	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	VND	1.0000	\N	\N	CP QLDN co CC	\N	DRAFT	\N	\N	1	2026-06-14 07:17:00.761224+07	\N	\N	\N	\N	\N	\N	\N
20	HOA_DON_BAN	FINANCE_VOUCHER-000019	2026-06-14	\N	\N	\N	15	\N	\N	\N	\N	\N	\N	\N	\N	VND	1.0000	\N	\N	Hoa don ban FV2-1	\N	DRAFT	\N	\N	1	2026-06-14 07:19:20.589364+07	\N	\N	\N	\N	\N	\N	\N
21	PHIEU_THU	FINANCE_VOUCHER-000020	2026-06-14	\N	\N	\N	15	\N	2	\N	\N	\N	\N	\N	\N	VND	1.0000	\N	\N	Thu tien KH lan 1	\N	DRAFT	\N	\N	1	2026-06-14 07:19:23.721941+07	\N	\N	\N	RECEIVE	\N	\N	\N
22	PHIEU_THU	FINANCE_VOUCHER-000021	2026-06-14	\N	\N	\N	15	\N	2	\N	\N	\N	\N	\N	\N	VND	1.0000	\N	\N	Thu tien KH lan 2	\N	DRAFT	\N	\N	1	2026-06-14 07:19:29.674184+07	\N	\N	\N	RECEIVE	\N	\N	\N
23	HOA_DON_BAN	FINANCE_VOUCHER-000022	2026-06-14	\N	\N	\N	15	\N	\N	\N	\N	\N	\N	\N	\N	VND	1.0000	\N	\N	Hoa don ban FV2-2	\N	DRAFT	\N	\N	1	2026-06-14 07:19:33.769552+07	\N	\N	\N	\N	\N	\N	\N
24	CT_TONG_HOP	FINANCE_VOUCHER-000023	2026-06-14	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	VND	1.0000	\N	\N	CP QLDN khong CC	\N	DRAFT	\N	\N	1	2026-06-14 07:19:49.386687+07	\N	\N	\N	\N	\N	\N	\N
25	CT_TONG_HOP	FINANCE_VOUCHER-000024	2026-06-14	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	VND	1.0000	\N	\N	CP QLDN co CC	\N	DRAFT	\N	\N	1	2026-06-14 07:19:50.554442+07	\N	\N	\N	\N	\N	\N	\N
35	HOA_DON_BAN	FINANCE_VOUCHER-000034	2026-06-14	2026-06-14	18	\N	17	\N	\N	\N	\N	\N	\N	\N	\N	VND	1.0000	\N	\N	Hoa don ban FV2-2	\N	CANCELLED_POSTED	1	2026-06-14 07:27:23.758222+07	1	2026-06-14 07:27:23.118409+07	0.00	2026-06-14	PAID	\N	\N	\N	\N
38	CT_TONG_HOP	FINANCE_VOUCHER-000036	2026-06-14	2026-06-14	18	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	VND	1.0000	\N	\N	CP QLDN co CC	\N	POSTED	1	2026-06-14 07:27:40.543356+07	1	2026-06-14 07:27:40.896155+07	\N	\N	\N	\N	\N	\N	\N
33	PHIEU_THU	FINANCE_VOUCHER-000032	2026-06-14	2026-06-14	18	\N	17	\N	2	\N	\N	\N	\N	\N	\N	VND	1.0000	\N	\N	Thu tien KH lan 1	\N	POSTED	1	2026-06-14 07:27:12.120031+07	1	2026-06-14 07:27:12.482295+07	\N	\N	\N	RECEIVE	6000000.00	0.00	\N
27	PHIEU_THU	FINANCE_VOUCHER-000026	2026-06-14	2026-06-14	18	\N	16	\N	2	\N	\N	\N	\N	\N	\N	VND	1.0000	\N	\N	Thu tien KH lan 1	\N	POSTED	1	2026-06-14 07:21:38.852902+07	1	2026-06-14 07:21:39.1681+07	\N	\N	\N	RECEIVE	6000000.00	0.00	\N
26	HOA_DON_BAN	FINANCE_VOUCHER-000025	2026-06-14	2026-06-14	18	\N	16	\N	\N	\N	\N	\N	\N	\N	\N	VND	1.0000	\N	\N	Hoa don ban FV2-1	\N	POSTED	1	2026-06-14 07:21:35.659698+07	1	2026-06-14 07:21:35.784258+07	0.00	2026-06-14	PAID	\N	\N	\N	\N
32	HOA_DON_BAN	FINANCE_VOUCHER-000031	2026-06-14	2026-06-14	18	\N	17	\N	\N	\N	\N	\N	\N	\N	\N	VND	1.0000	\N	\N	Hoa don ban FV2-1	\N	POSTED	1	2026-06-14 07:27:09.012012+07	1	2026-06-14 07:27:09.226714+07	0.00	2026-06-14	PAID	\N	\N	\N	\N
28	PHIEU_THU	FINANCE_VOUCHER-000027	2026-06-14	2026-06-14	18	\N	16	\N	2	\N	\N	\N	\N	\N	\N	VND	1.0000	\N	\N	Thu tien KH lan 2	\N	POSTED	1	2026-06-14 07:21:44.969542+07	1	2026-06-14 07:21:45.332265+07	\N	\N	\N	RECEIVE	5000000.00	0.00	\N
29	HOA_DON_BAN	FINANCE_VOUCHER-000028	2026-06-14	2026-06-14	18	\N	16	\N	\N	\N	\N	\N	\N	\N	\N	VND	1.0000	\N	\N	Hoa don ban FV2-2	\N	POSTED	1	2026-06-14 07:21:50.191278+07	1	2026-06-14 07:21:49.637745+07	0.00	2026-06-14	PAID	\N	\N	\N	\N
30	CT_TONG_HOP	FINANCE_VOUCHER-000029	2026-06-14	2026-06-14	18	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	VND	1.0000	\N	\N	CP QLDN khong CC	\N	POSTED	1	2026-06-14 07:22:05.332531+07	1	2026-06-14 07:22:05.696558+07	\N	\N	\N	\N	\N	\N	\N
31	CT_TONG_HOP	FINANCE_VOUCHER-000030	2026-06-14	2026-06-14	18	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	VND	1.0000	\N	\N	CP QLDN co CC	\N	POSTED	1	2026-06-14 07:22:06.563211+07	1	2026-06-14 07:22:06.980426+07	\N	\N	\N	\N	\N	\N	\N
36	HOA_DON_BAN	FINANCE_VOUCHER-000034-1	2026-06-14	\N	\N	\N	17	\N	\N	\N	\N	\N	\N	\N	\N	VND	1.0000	\N	\N	Hoa don ban FV2-2	\N	DRAFT	\N	\N	1	2026-06-14 07:27:36.442397+07	\N	2026-06-14	\N	\N	\N	\N	35
41	PHIEU_THU	FINANCE_VOUCHER-000039	2026-06-14	2026-06-14	18	\N	18	\N	2	\N	\N	\N	\N	\N	\N	VND	1.0000	\N	\N	Thu tien KH lan 2	\N	POSTED	1	2026-06-14 07:30:14.87109+07	1	2026-06-14 07:30:15.217776+07	\N	\N	\N	RECEIVE	5000000.00	0.00	\N
34	PHIEU_THU	FINANCE_VOUCHER-000033	2026-06-14	2026-06-14	18	\N	17	\N	2	\N	\N	\N	\N	\N	\N	VND	1.0000	\N	\N	Thu tien KH lan 2	\N	POSTED	1	2026-06-14 07:27:18.618986+07	1	2026-06-14 07:27:18.832727+07	\N	\N	\N	RECEIVE	5000000.00	0.00	\N
37	CT_TONG_HOP	FINANCE_VOUCHER-000035	2026-06-14	2026-06-14	18	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	VND	1.0000	\N	\N	CP QLDN khong CC	\N	POSTED	1	2026-06-14 07:27:39.332644+07	1	2026-06-14 07:27:39.730454+07	\N	\N	\N	\N	\N	\N	\N
45	CT_TONG_HOP	FINANCE_VOUCHER-000042	2026-06-14	2026-06-14	18	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	VND	1.0000	\N	\N	CP QLDN co CC	\N	POSTED	1	2026-06-14 07:30:36.389308+07	1	2026-06-14 07:30:36.761296+07	\N	\N	\N	\N	\N	\N	\N
40	PHIEU_THU	FINANCE_VOUCHER-000038	2026-06-14	2026-06-14	18	\N	18	\N	2	\N	\N	\N	\N	\N	\N	VND	1.0000	\N	\N	Thu tien KH lan 1	\N	POSTED	1	2026-06-14 07:30:08.80403+07	1	2026-06-14 07:30:09.11319+07	\N	\N	\N	RECEIVE	6000000.00	0.00	\N
39	HOA_DON_BAN	FINANCE_VOUCHER-000037	2026-06-14	2026-06-14	18	\N	18	\N	\N	\N	\N	\N	\N	\N	\N	VND	1.0000	\N	\N	Hoa don ban FV2-1	\N	POSTED	1	2026-06-14 07:30:05.625251+07	1	2026-06-14 07:30:05.743366+07	0.00	2026-06-14	PAID	\N	\N	\N	\N
42	HOA_DON_BAN	FINANCE_VOUCHER-000040	2026-06-14	2026-06-14	18	\N	18	\N	\N	\N	\N	\N	\N	\N	\N	VND	1.0000	\N	\N	Hoa don ban FV2-2	\N	CANCELLED_POSTED	1	2026-06-14 07:30:19.960594+07	1	2026-06-14 07:30:19.44035+07	0.00	2026-06-14	PAID	\N	\N	\N	\N
43	HOA_DON_BAN	FINANCE_VOUCHER-000040-1	2026-06-14	\N	\N	\N	18	\N	\N	\N	\N	\N	\N	\N	\N	VND	1.0000	\N	\N	Hoa don ban FV2-2	\N	DRAFT	\N	\N	1	2026-06-14 07:30:32.604254+07	\N	2026-06-14	\N	\N	\N	\N	42
44	CT_TONG_HOP	FINANCE_VOUCHER-000041	2026-06-14	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	VND	1.0000	\N	\N	CP QLDN khong CC	\N	DRAFT	\N	\N	1	2026-06-14 07:30:35.554718+07	\N	\N	\N	\N	\N	\N	\N
48	PHIEU_THU	FINANCE_VOUCHER-000045	2026-06-14	2026-06-14	18	\N	20	\N	2	\N	\N	\N	\N	\N	\N	VND	1.0000	\N	\N	Thu tien test	\N	POSTED	1	2026-06-14 07:40:12.223314+07	1	2026-06-14 07:40:12.388217+07	\N	\N	\N	\N	\N	\N	\N
\.


--
-- Data for Name: voucher_line; Type: TABLE DATA; Schema: finance; Owner: -
--

COPY finance.voucher_line (id, voucher_id, product_id, description, quantity, unit_price, amount, vat_pct, vat_amount, dr_account_id, cr_account_id, dr_object_id, dr_object_type, cr_object_id, cr_object_type, ref_voucher_id, lot_id, warehouse_id, cost_center_id) FROM stdin;
1	1	\N	Thu tiền bán hàng test	\N	\N	1000000.00	\N	\N	2	27	\N	\N	\N	\N	\N	\N	\N	\N
2	2	\N	Ban hang	\N	\N	10000000.00	\N	\N	5	27	12	PARTNER	\N	\N	\N	\N	\N	\N
3	3	\N	Thu tien	\N	\N	6000000.00	\N	\N	2	5	\N	\N	12	PARTNER	\N	\N	\N	\N
4	4	\N	Thu tien	\N	\N	5000000.00	\N	\N	2	5	\N	\N	12	PARTNER	\N	\N	\N	\N
5	5	\N	Ban hang	\N	\N	1000000.00	\N	\N	5	27	12	PARTNER	\N	\N	\N	\N	\N	\N
6	6	\N	Chi phi QLDN	\N	\N	500000.00	\N	\N	38	2	\N	\N	\N	\N	\N	\N	\N	\N
7	7	\N	Chi phi QLDN	\N	\N	500000.00	\N	\N	38	2	\N	\N	\N	\N	\N	\N	\N	2
8	8	\N	Ban hang	\N	\N	10000000.00	\N	\N	5	27	13	PARTNER	\N	\N	\N	\N	\N	\N
9	9	\N	Thu tien	\N	\N	6000000.00	\N	\N	2	5	\N	\N	13	PARTNER	\N	\N	\N	\N
10	10	\N	Thu tien	\N	\N	5000000.00	\N	\N	2	5	\N	\N	13	PARTNER	\N	\N	\N	\N
11	11	\N	Ban hang	\N	\N	1000000.00	\N	\N	5	27	13	PARTNER	\N	\N	\N	\N	\N	\N
12	12	\N	Chi phi QLDN	\N	\N	500000.00	\N	\N	38	2	\N	\N	\N	\N	\N	\N	\N	\N
13	13	\N	Chi phi QLDN	\N	\N	500000.00	\N	\N	38	2	\N	\N	\N	\N	\N	\N	\N	2
14	14	\N	Ban hang	\N	\N	10000000.00	\N	\N	5	27	14	PARTNER	\N	\N	\N	\N	\N	\N
15	15	\N	Thu tien	\N	\N	6000000.00	\N	\N	2	5	\N	\N	14	PARTNER	\N	\N	\N	\N
16	16	\N	Thu tien	\N	\N	5000000.00	\N	\N	2	5	\N	\N	14	PARTNER	\N	\N	\N	\N
17	17	\N	Ban hang	\N	\N	1000000.00	\N	\N	5	27	14	PARTNER	\N	\N	\N	\N	\N	\N
18	18	\N	Chi phi QLDN	\N	\N	500000.00	\N	\N	38	2	\N	\N	\N	\N	\N	\N	\N	\N
19	19	\N	Chi phi QLDN	\N	\N	500000.00	\N	\N	38	2	\N	\N	\N	\N	\N	\N	\N	2
20	20	\N	Ban hang	\N	\N	10000000.00	\N	\N	5	27	15	PARTNER	\N	\N	\N	\N	\N	\N
21	21	\N	Thu tien	\N	\N	6000000.00	\N	\N	2	5	\N	\N	15	PARTNER	\N	\N	\N	\N
22	22	\N	Thu tien	\N	\N	5000000.00	\N	\N	2	5	\N	\N	15	PARTNER	\N	\N	\N	\N
23	23	\N	Ban hang	\N	\N	1000000.00	\N	\N	5	27	15	PARTNER	\N	\N	\N	\N	\N	\N
24	24	\N	Chi phi QLDN	\N	\N	500000.00	\N	\N	38	2	\N	\N	\N	\N	\N	\N	\N	\N
25	25	\N	Chi phi QLDN	\N	\N	500000.00	\N	\N	38	2	\N	\N	\N	\N	\N	\N	\N	2
26	26	\N	Ban hang	\N	\N	10000000.00	\N	\N	5	27	16	PARTNER	\N	\N	\N	\N	\N	\N
27	27	\N	Thu tien	\N	\N	6000000.00	\N	\N	2	5	\N	\N	16	PARTNER	\N	\N	\N	\N
28	28	\N	Thu tien	\N	\N	5000000.00	\N	\N	2	5	\N	\N	16	PARTNER	\N	\N	\N	\N
29	29	\N	Ban hang	\N	\N	1000000.00	\N	\N	5	27	16	PARTNER	\N	\N	\N	\N	\N	\N
30	30	\N	Chi phi QLDN	\N	\N	500000.00	\N	\N	38	2	\N	\N	\N	\N	\N	\N	\N	\N
31	31	\N	Chi phi QLDN	\N	\N	500000.00	\N	\N	38	2	\N	\N	\N	\N	\N	\N	\N	2
32	32	\N	Ban hang	\N	\N	10000000.00	\N	\N	5	27	17	PARTNER	\N	\N	\N	\N	\N	\N
33	33	\N	Thu tien	\N	\N	6000000.00	\N	\N	2	5	\N	\N	17	PARTNER	\N	\N	\N	\N
34	34	\N	Thu tien	\N	\N	5000000.00	\N	\N	2	5	\N	\N	17	PARTNER	\N	\N	\N	\N
35	35	\N	Ban hang	\N	\N	1000000.00	\N	\N	5	27	17	PARTNER	\N	\N	\N	\N	\N	\N
36	36	\N	Ban hang	\N	\N	1000000.00	\N	\N	5	27	17	PARTNER	\N	\N	\N	\N	\N	\N
37	37	\N	Chi phi QLDN	\N	\N	500000.00	\N	\N	38	2	\N	\N	\N	\N	\N	\N	\N	\N
38	38	\N	Chi phi QLDN	\N	\N	500000.00	\N	\N	38	2	\N	\N	\N	\N	\N	\N	\N	2
39	39	\N	Ban hang	\N	\N	10000000.00	\N	\N	5	27	18	PARTNER	\N	\N	\N	\N	\N	\N
40	40	\N	Thu tien	\N	\N	6000000.00	\N	\N	2	5	\N	\N	18	PARTNER	\N	\N	\N	\N
41	41	\N	Thu tien	\N	\N	5000000.00	\N	\N	2	5	\N	\N	18	PARTNER	\N	\N	\N	\N
42	42	\N	Ban hang	\N	\N	1000000.00	\N	\N	5	27	18	PARTNER	\N	\N	\N	\N	\N	\N
43	43	\N	Ban hang	\N	\N	1000000.00	\N	\N	5	27	18	PARTNER	\N	\N	\N	\N	\N	\N
44	44	\N	Chi phi QLDN	\N	\N	500000.00	\N	\N	38	2	\N	\N	\N	\N	\N	\N	\N	\N
45	45	\N	Chi phi QLDN	\N	\N	500000.00	\N	\N	38	2	\N	\N	\N	\N	\N	\N	\N	2
46	48	\N	Thu tien KH	\N	\N	1000000.00	\N	\N	2	5	\N	\N	\N	\N	\N	\N	\N	\N
\.


--
-- Data for Name: aggregatedcounter; Type: TABLE DATA; Schema: hangfire; Owner: -
--

COPY hangfire.aggregatedcounter (id, key, value, expireat) FROM stdin;
1	stats:succeeded:2026-06-14-00	1	2026-06-15 07:00:02.957057+07
2	stats:succeeded:2026-06-14	1	2026-07-14 07:00:01.957057+07
3	stats:succeeded	1	\N
\.


--
-- Data for Name: counter; Type: TABLE DATA; Schema: hangfire; Owner: -
--

COPY hangfire.counter (id, key, value, expireat) FROM stdin;
\.


--
-- Data for Name: hash; Type: TABLE DATA; Schema: hangfire; Owner: -
--

COPY hangfire.hash (id, key, field, value, expireat, updatecount) FROM stdin;
1	recurring-job:finance-mark-overdue-invoices	Queue	default	\N	0
2	recurring-job:finance-mark-overdue-invoices	Cron	0 0 * * *	\N	0
3	recurring-job:finance-mark-overdue-invoices	TimeZoneId	UTC	\N	0
4	recurring-job:finance-mark-overdue-invoices	Job	{"t":"Erp.Api.Core.FinanceJobs, Erp.Api","m":"MarkOverdueInvoicesAsync"}	\N	0
5	recurring-job:finance-mark-overdue-invoices	CreatedAt	1781321116438	\N	0
7	recurring-job:finance-mark-overdue-invoices	V	2	\N	0
8	recurring-job:finance-mark-overdue-invoices	LastExecution	1781395200763	\N	0
6	recurring-job:finance-mark-overdue-invoices	NextExecution	1781481600000	\N	0
9	recurring-job:finance-mark-overdue-invoices	LastJobId	1	\N	0
\.


--
-- Data for Name: job; Type: TABLE DATA; Schema: hangfire; Owner: -
--

COPY hangfire.job (id, stateid, statename, invocationdata, arguments, createdat, expireat, updatecount) FROM stdin;
1	3	Succeeded	{"Type": "Erp.Api.Core.FinanceJobs, Erp.Api", "Method": "MarkOverdueInvoicesAsync", "Arguments": "[]", "ParameterTypes": "[]"}	[]	2026-06-14 07:00:00.877336+07	2026-06-15 07:00:02.957057+07	0
\.


--
-- Data for Name: jobparameter; Type: TABLE DATA; Schema: hangfire; Owner: -
--

COPY hangfire.jobparameter (id, jobid, name, value, updatecount) FROM stdin;
1	1	RecurringJobId	"finance-mark-overdue-invoices"	0
2	1	Time	1781395200	0
3	1	CurrentCulture	"en-US"	0
\.


--
-- Data for Name: jobqueue; Type: TABLE DATA; Schema: hangfire; Owner: -
--

COPY hangfire.jobqueue (id, jobid, queue, fetchedat, updatecount) FROM stdin;
\.


--
-- Data for Name: list; Type: TABLE DATA; Schema: hangfire; Owner: -
--

COPY hangfire.list (id, key, value, expireat, updatecount) FROM stdin;
\.


--
-- Data for Name: lock; Type: TABLE DATA; Schema: hangfire; Owner: -
--

COPY hangfire.lock (resource, updatecount, acquired) FROM stdin;
\.


--
-- Data for Name: schema; Type: TABLE DATA; Schema: hangfire; Owner: -
--

COPY hangfire.schema (version) FROM stdin;
23
\.


--
-- Data for Name: server; Type: TABLE DATA; Schema: hangfire; Owner: -
--

COPY hangfire.server (id, data, lastheartbeat, updatecount) FROM stdin;
lho4310hkj:5548:2ac5be6a-6e89-46cf-a7b5-d3c4549dab1f	{"Queues": ["default"], "StartedAt": "2026-06-14T07:24:46.6594061Z", "WorkerCount": 20}	2026-06-14 15:10:20.832082+07	0
\.


--
-- Data for Name: set; Type: TABLE DATA; Schema: hangfire; Owner: -
--

COPY hangfire.set (id, key, score, value, expireat, updatecount) FROM stdin;
1	recurring-jobs	1781481600	finance-mark-overdue-invoices	\N	0
\.


--
-- Data for Name: state; Type: TABLE DATA; Schema: hangfire; Owner: -
--

COPY hangfire.state (id, jobid, name, reason, createdat, data, updatecount) FROM stdin;
1	1	Enqueued	Triggered by recurring job scheduler	2026-06-14 07:00:01.009959+07	{"Queue": "default", "EnqueuedAt": "1781395200999"}	0
2	1	Processing	\N	2026-06-14 07:00:01.249883+07	{"ServerId": "lho4310hkj:33704:17719ba3-ff5f-4acc-9bb2-35e1173e264e", "WorkerId": "cf29c891-866f-4a6a-9243-e5dbbf9d98ad", "StartedAt": "1781395201185"}	0
3	1	Succeeded	\N	2026-06-14 07:00:01.567764+07	{"Latency": "413", "SucceededAt": "1781395201360", "PerformanceDuration": "69"}	0
\.


--
-- Data for Name: delivery_plan; Type: TABLE DATA; Schema: inventory; Owner: -
--

COPY inventory.delivery_plan (id, doc_id, plan_date, vehicle, driver, note) FROM stdin;
\.


--
-- Data for Name: gr_cost; Type: TABLE DATA; Schema: inventory; Owner: -
--

COPY inventory.gr_cost (id, doc_id, cost_type_id, payee_id, process_id, amount, vat_pct, approved, approved_by, approved_at) FROM stdin;
\.


--
-- Data for Name: lot; Type: TABLE DATA; Schema: inventory; Owner: -
--

COPY inventory.lot (id, lot_no, product_id, expiry_date) FROM stdin;
\.


--
-- Data for Name: packing_line; Type: TABLE DATA; Schema: inventory; Owner: -
--

COPY inventory.packing_line (id, doc_id, doc_line_id, units_per_pack, pack_count, loose_units, performer_id, is_done) FROM stdin;
\.


--
-- Data for Name: stock_balance; Type: TABLE DATA; Schema: inventory; Owner: -
--

COPY inventory.stock_balance (product_id, warehouse_id, lot_id, qty_on_hand, updated_at, id, reserved_qty, ordered_qty) FROM stdin;
3	1	\N	90.0000	2026-06-11 17:37:27.19943+07	1	0.0000	0.0000
20	3	\N	60.0000	2026-06-13 22:00:56.707998+07	7	0.0000	0.0000
19	3	\N	10.0000	2026-06-13 22:00:56.729143+07	8	0.0000	0.0000
24	4	\N	0.0000	2026-06-13 22:06:56.603379+07	9	0.0000	0.0000
23	4	\N	0.0000	2026-06-13 22:06:56.619389+07	10	0.0000	0.0000
21	4	\N	10.0000	2026-06-13 22:06:56.637504+07	11	0.0000	0.0000
\.


--
-- Data for Name: stock_doc; Type: TABLE DATA; Schema: inventory; Owner: -
--

COPY inventory.stock_doc (id, doc_no, doc_type, sub_type, request_date, actual_date, sales_order_id, purchase_order_id, supplier_return_id, partner_id, from_warehouse_id, to_warehouse_id, org_unit, process_id, counterpart_doc_id, ref_no, note, status, created_by, created_at, completed_by, completed_at, status_reason, purpose, approver_id, approved_at) FROM stdin;
1	PN2606-0001	RECEIPT	PURCHASE	2026-06-11	2026-06-11	\N	1	\N	2	\N	1	\N	\N	\N	\N	\N	COMPLETED	1	2026-06-11 17:37:14.506814+07	1	2026-06-11 17:37:19.217778+07	\N	\N	\N	\N
2	PX2606-0001	ISSUE	SALES	2026-06-11	2026-06-11	2	\N	\N	3	1	\N	\N	\N	\N	\N	\N	COMPLETED	1	2026-06-11 17:37:22.553252+07	1	2026-06-11 17:37:27.199436+07	\N	\N	\N	\N
3	PX2606-0002	ISSUE	SALES	2026-06-11	\N	3	\N	\N	3	1	\N	\N	\N	\N	\N	\N	CONFIRMED	1	2026-06-11 17:37:32.528267+07	\N	\N	\N	\N	\N	\N
4	PN2606-0002	RECEIPT	PURCHASE	2026-06-13	\N	\N	\N	\N	1	\N	1	\N	\N	\N	\N	\N	DRAFT	1	2026-06-13 12:05:28.714309+07	\N	\N	\N	MATERIAL_RECEIPT	\N	\N
5	PN2606-0003	RECEIPT	RECEIPT_CODE_ADJUST	2026-06-13	2026-06-13	\N	\N	\N	\N	\N	3	\N	\N	\N	\N	Điều chỉnh tăng theo kiểm kê STOCK_RECONCILIATION-000003	COMPLETED	1	2026-06-13 22:00:48.245204+07	1	2026-06-13 22:00:47.174525+07	\N	MATERIAL_RECEIPT	\N	\N
6	PN2606-0004	RECEIPT	RECEIPT_CODE_ADJUST	2026-06-13	2026-06-13	\N	\N	\N	\N	\N	3	\N	\N	\N	\N	Điều chỉnh tăng theo kiểm kê STOCK_RECONCILIATION-000004	COMPLETED	1	2026-06-13 22:00:55.523754+07	1	2026-06-13 22:00:54.452579+07	\N	MATERIAL_RECEIPT	\N	\N
7	PXSX2606-0001	TRANSFER	INTERNAL_TRANSFER	2026-06-13	2026-06-13	\N	\N	\N	\N	3	3	\N	\N	\N	\N	Chuyển NVL vào WIP cho lệnh sản xuất LSX2606-0002	COMPLETED	1	2026-06-13 22:00:57.682446+07	1	2026-06-13 22:00:56.50059+07	\N	MATERIAL_TRANSFER_FOR_MANUFACTURE	\N	\N
10	PN2606-0005	RECEIPT	RECEIPT_CODE_ADJUST	2026-06-13	2026-06-13	\N	\N	\N	\N	\N	4	\N	\N	\N	\N	Điều chỉnh tăng theo kiểm kê STOCK_RECONCILIATION-000005	COMPLETED	1	2026-06-13 22:06:46.898688+07	1	2026-06-13 22:06:45.824211+07	\N	MATERIAL_RECEIPT	\N	\N
11	PN2606-0006	RECEIPT	RECEIPT_CODE_ADJUST	2026-06-13	2026-06-13	\N	\N	\N	\N	\N	4	\N	\N	\N	\N	Điều chỉnh tăng theo kiểm kê STOCK_RECONCILIATION-000006	COMPLETED	1	2026-06-13 22:06:54.563353+07	1	2026-06-13 22:06:53.488948+07	\N	MATERIAL_RECEIPT	\N	\N
12	PXSX2606-0002	TRANSFER	INTERNAL_TRANSFER	2026-06-13	2026-06-13	\N	\N	\N	\N	4	4	\N	\N	\N	\N	Chuyển NVL vào WIP cho lệnh sản xuất LSX2606-0003	COMPLETED	1	2026-06-13 22:06:56.74639+07	1	2026-06-13 22:06:55.585712+07	\N	MATERIAL_TRANSFER_FOR_MANUFACTURE	\N	\N
13	PNSX2606-0003	TRANSFER	MANUFACTURE	2026-06-13	2026-06-13	\N	\N	\N	\N	4	4	\N	\N	\N	\N	Hoàn thành đợt sản xuất LSX2606-0003 - SL 6	COMPLETED	1	2026-06-13 22:06:57.060148+07	1	2026-06-13 22:06:55.953412+07	\N	MANUFACTURE	\N	\N
14	PNSX2606-0004	TRANSFER	MANUFACTURE	2026-06-13	2026-06-13	\N	\N	\N	\N	4	4	\N	\N	\N	\N	Hoàn thành đợt sản xuất LSX2606-0003 - SL 4	COMPLETED	1	2026-06-13 22:06:57.571061+07	1	2026-06-13 22:06:56.478201+07	\N	MANUFACTURE	\N	\N
\.


--
-- Data for Name: stock_doc_line; Type: TABLE DATA; Schema: inventory; Owner: -
--

COPY inventory.stock_doc_line (id, doc_id, product_id, requested_qty, actual_qty, kit_qty, unit_price, lot_id, expiry_date, location_id, note, landed_cost) FROM stdin;
1	1	3	100.0000	100.0000	\N	5000.00	\N	\N	\N	\N	0.0000
2	2	3	10.0000	10.0000	\N	8000.00	\N	\N	\N	\N	0.0000
3	3	3	1000.0000	1000.0000	\N	8000.00	\N	\N	\N	\N	0.0000
4	5	20	20.0000	20.0000	\N	\N	\N	\N	\N	\N	0.0000
5	5	19	10.0000	10.0000	\N	\N	\N	\N	\N	\N	0.0000
6	6	20	40.0000	40.0000	\N	\N	\N	\N	\N	\N	0.0000
7	7	20	60.0000	60.0000	\N	10000.00	\N	\N	\N	\N	0.0000
8	7	19	10.0000	10.0000	\N	20000.00	\N	\N	\N	\N	0.0000
9	10	24	20.0000	20.0000	\N	\N	\N	\N	\N	\N	0.0000
10	10	23	10.0000	10.0000	\N	\N	\N	\N	\N	\N	0.0000
11	11	24	40.0000	40.0000	\N	\N	\N	\N	\N	\N	0.0000
12	12	24	60.0000	60.0000	\N	10000.00	\N	\N	\N	\N	0.0000
13	12	23	10.0000	10.0000	\N	20000.00	\N	\N	\N	\N	0.0000
14	13	24	36.0000	36.0000	\N	10000.00	\N	\N	\N	\N	0.0000
15	13	23	6.0000	6.0000	\N	20000.00	\N	\N	\N	\N	0.0000
16	13	21	6.0000	6.0000	\N	192500.00	\N	\N	\N	\N	0.0000
17	14	24	24.0000	24.0000	\N	10000.00	\N	\N	\N	\N	0.0000
18	14	23	4.0000	4.0000	\N	20000.00	\N	\N	\N	\N	0.0000
19	14	21	4.0000	4.0000	\N	192500.00	\N	\N	\N	\N	0.0000
\.


--
-- Data for Name: stock_move; Type: TABLE DATA; Schema: inventory; Owner: -
--

COPY inventory.stock_move (id, move_date, doc_id, doc_line_id, product_id, warehouse_id, lot_id, location_id, qty, unit_cost, created_at, qty_after_transaction, valuation_rate, stock_value, stock_value_difference, posting_datetime) FROM stdin;
1	2026-06-11	1	1	3	1	\N	\N	100.0000	5000.0000	2026-06-11 17:37:19.366334+07	\N	\N	\N	\N	\N
2	2026-06-11	2	2	3	1	\N	\N	-10.0000	8000.0000	2026-06-11 17:37:27.355278+07	\N	\N	\N	\N	\N
6	2026-06-13	5	4	20	3	\N	\N	20.0000	0.0000	2026-06-13 22:00:48.245204+07	20.0000	0.0000	0.00	0.00	2026-06-13 22:00:47.174525+07
7	2026-06-13	5	5	19	3	\N	\N	10.0000	0.0000	2026-06-13 22:00:48.245204+07	10.0000	0.0000	0.00	0.00	2026-06-13 22:00:47.174525+07
8	2026-06-13	6	6	20	3	\N	\N	40.0000	0.0000	2026-06-13 22:00:55.523754+07	60.0000	0.0000	0.00	0.00	2026-06-13 22:00:54.452579+07
9	2026-06-13	7	7	20	3	\N	\N	-60.0000	10000.0000	2026-06-13 22:00:57.80063+07	0.0000	0.0000	0.00	0.00	2026-06-13 22:00:56.698679+07
10	2026-06-13	7	7	20	3	\N	\N	60.0000	10000.0000	2026-06-13 22:00:57.80063+07	120.0000	5000.0000	600000.00	600000.00	2026-06-13 22:00:56.707938+07
11	2026-06-13	7	8	19	3	\N	\N	-10.0000	20000.0000	2026-06-13 22:00:57.80063+07	0.0000	0.0000	0.00	0.00	2026-06-13 22:00:56.715599+07
12	2026-06-13	7	8	19	3	\N	\N	10.0000	20000.0000	2026-06-13 22:00:57.80063+07	20.0000	10000.0000	200000.00	200000.00	2026-06-13 22:00:56.729072+07
13	2026-06-13	10	9	24	4	\N	\N	20.0000	0.0000	2026-06-13 22:06:46.898688+07	20.0000	0.0000	0.00	0.00	2026-06-13 22:06:45.824211+07
14	2026-06-13	10	10	23	4	\N	\N	10.0000	0.0000	2026-06-13 22:06:46.898688+07	10.0000	0.0000	0.00	0.00	2026-06-13 22:06:45.824211+07
15	2026-06-13	11	11	24	4	\N	\N	40.0000	0.0000	2026-06-13 22:06:54.563353+07	60.0000	0.0000	0.00	0.00	2026-06-13 22:06:53.488948+07
16	2026-06-13	12	12	24	4	\N	\N	-60.0000	10000.0000	2026-06-13 22:06:56.855222+07	0.0000	0.0000	0.00	0.00	2026-06-13 22:06:55.745993+07
17	2026-06-13	12	12	24	4	\N	\N	60.0000	10000.0000	2026-06-13 22:06:56.855222+07	120.0000	5000.0000	600000.00	600000.00	2026-06-13 22:06:55.758642+07
18	2026-06-13	12	13	23	4	\N	\N	-10.0000	20000.0000	2026-06-13 22:06:56.855222+07	0.0000	0.0000	0.00	0.00	2026-06-13 22:06:55.768173+07
19	2026-06-13	12	13	23	4	\N	\N	10.0000	20000.0000	2026-06-13 22:06:56.855222+07	20.0000	10000.0000	200000.00	200000.00	2026-06-13 22:06:55.780321+07
20	2026-06-13	13	14	24	4	\N	\N	-36.0000	10000.0000	2026-06-13 22:06:57.196526+07	84.0000	5000.0000	420000.00	-180000.00	2026-06-13 22:06:56.058299+07
21	2026-06-13	13	15	23	4	\N	\N	-6.0000	20000.0000	2026-06-13 22:06:57.196526+07	14.0000	10000.0000	140000.00	-60000.00	2026-06-13 22:06:56.08147+07
22	2026-06-13	13	16	21	4	\N	\N	6.0000	192500.0000	2026-06-13 22:06:57.196526+07	6.0000	192500.0000	1155000.00	1155000.00	2026-06-13 22:06:56.099135+07
23	2026-06-13	14	17	24	4	\N	\N	-24.0000	10000.0000	2026-06-13 22:06:57.713778+07	60.0000	5000.0000	300000.00	-120000.00	2026-06-13 22:06:56.591847+07
24	2026-06-13	14	18	23	4	\N	\N	-4.0000	20000.0000	2026-06-13 22:06:57.713778+07	10.0000	10000.0000	100000.00	-40000.00	2026-06-13 22:06:56.611248+07
25	2026-06-13	14	19	21	4	\N	\N	4.0000	192500.0000	2026-06-13 22:06:57.713778+07	10.0000	192500.0000	1925000.00	770000.00	2026-06-13 22:06:56.628024+07
\.


--
-- Data for Name: stock_reconciliation; Type: TABLE DATA; Schema: inventory; Owner: -
--

COPY inventory.stock_reconciliation (id, doc_no, warehouse_id, reconciliation_date, status, note, created_by, created_at, posted_by, posted_at) FROM stdin;
1	STOCK_RECONCILIATION-000001	2	2026-06-13	APPROVED	\N	1	2026-06-13 21:43:29.008051+07	\N	\N
2	STOCK_RECONCILIATION-000002	2	2026-06-13	APPROVED	\N	1	2026-06-13 21:43:36.73316+07	\N	\N
3	STOCK_RECONCILIATION-000003	3	2026-06-13	POSTED	\N	1	2026-06-13 22:00:46.311293+07	1	2026-06-13 22:00:47.174525+07
4	STOCK_RECONCILIATION-000004	3	2026-06-13	POSTED	\N	1	2026-06-13 22:00:54.087048+07	1	2026-06-13 22:00:54.452579+07
5	STOCK_RECONCILIATION-000005	4	2026-06-13	POSTED	\N	1	2026-06-13 22:06:45.301697+07	1	2026-06-13 22:06:45.824211+07
6	STOCK_RECONCILIATION-000006	4	2026-06-13	POSTED	\N	1	2026-06-13 22:06:53.131441+07	1	2026-06-13 22:06:53.488948+07
\.


--
-- Data for Name: stock_reconciliation_line; Type: TABLE DATA; Schema: inventory; Owner: -
--

COPY inventory.stock_reconciliation_line (id, reconciliation_id, product_id, lot_id, system_qty, actual_qty, difference) FROM stdin;
1	1	16	\N	0.0000	20.0000	20.0000
2	1	15	\N	0.0000	10.0000	10.0000
3	2	16	\N	0.0000	60.0000	60.0000
4	3	20	\N	0.0000	20.0000	20.0000
5	3	19	\N	0.0000	10.0000	10.0000
6	4	20	\N	20.0000	60.0000	40.0000
7	5	24	\N	0.0000	20.0000	20.0000
8	5	23	\N	0.0000	10.0000	10.0000
9	6	24	\N	20.0000	60.0000	40.0000
\.


--
-- Data for Name: bom; Type: TABLE DATA; Schema: mfg; Owner: -
--

COPY mfg.bom (id, doc_no, product_id, quantity, is_active, is_default, with_operations, status, note, creator_id, created_at, submitted_at) FROM stdin;
1	BOM2606-0001	14	1.0000	t	t	t	DRAFT	\N	1	2026-06-13 21:43:25.833689+07	\N
2	BOM2606-0002	13	1.0000	t	t	t	DRAFT	\N	1	2026-06-13 21:43:27.409069+07	\N
3	BOM2606-0003	18	1.0000	t	t	t	DRAFT	\N	1	2026-06-13 22:00:42.995112+07	\N
4	BOM2606-0004	17	1.0000	t	t	t	DRAFT	\N	1	2026-06-13 22:00:44.680123+07	\N
5	BOM2606-0005	22	1.0000	t	t	t	DRAFT	\N	1	2026-06-13 22:06:42.454573+07	\N
6	BOM2606-0006	21	1.0000	t	t	t	DRAFT	\N	1	2026-06-13 22:06:43.816694+07	\N
\.


--
-- Data for Name: bom_item; Type: TABLE DATA; Schema: mfg; Owner: -
--

COPY mfg.bom_item (id, bom_id, product_id, qty, rate, scrap_loss_pct, sub_bom_id) FROM stdin;
1	1	16	3.0000	10000.00	0.00	\N
2	2	14	2.0000	0.00	0.00	1
3	2	15	1.0000	20000.00	0.00	\N
4	3	20	3.0000	10000.00	0.00	\N
5	4	18	2.0000	0.00	0.00	3
6	4	19	1.0000	20000.00	0.00	\N
7	5	24	3.0000	10000.00	0.00	\N
8	6	22	2.0000	0.00	0.00	5
9	6	23	1.0000	20000.00	0.00	\N
\.


--
-- Data for Name: bom_operation; Type: TABLE DATA; Schema: mfg; Owner: -
--

COPY mfg.bom_operation (id, bom_id, operation_id, workstation_id, time_minutes, hourly_rate) FROM stdin;
1	1	1	1	30.00	150000.00
2	2	1	1	45.00	150000.00
3	3	1	2	30.00	150000.00
4	4	1	2	45.00	150000.00
5	5	1	3	30.00	150000.00
6	6	1	3	45.00	150000.00
\.


--
-- Data for Name: bom_scrap; Type: TABLE DATA; Schema: mfg; Owner: -
--

COPY mfg.bom_scrap (id, bom_id, product_id, qty, rate) FROM stdin;
\.


--
-- Data for Name: job_card; Type: TABLE DATA; Schema: mfg; Owner: -
--

COPY mfg.job_card (id, work_order_id, wo_operation_id, operation_id, workstation_id, time_log_minutes, completed_qty, status, note, created_at, started_at, completed_at) FROM stdin;
1	1	1	1	1	0.00	0.0000	OPEN	\N	2026-06-13 21:43:40.235598+07	\N	\N
2	2	2	1	2	0.00	0.0000	OPEN	\N	2026-06-13 22:00:57.393365+07	\N	\N
3	3	3	1	3	0.00	0.0000	OPEN	\N	2026-06-13 22:06:56.525628+07	\N	\N
\.


--
-- Data for Name: operation; Type: TABLE DATA; Schema: mfg; Owner: -
--

COPY mfg.operation (id, code, name, default_workstation_id, standard_time_minutes, is_active, description) FROM stdin;
1	XI	Gia công xi	\N	0.00	t	\N
2	NHUNG_NONG	Nhúng nóng	\N	0.00	t	\N
3	TARO_TAN	Taro tán	\N	0.00	t	\N
\.


--
-- Data for Name: pp_item; Type: TABLE DATA; Schema: mfg; Owner: -
--

COPY mfg.pp_item (id, production_plan_id, product_id, planned_qty) FROM stdin;
1	1	13	10.0000
2	2	17	10.0000
3	3	21	10.0000
\.


--
-- Data for Name: pp_material; Type: TABLE DATA; Schema: mfg; Owner: -
--

COPY mfg.pp_material (id, production_plan_id, product_id, required_qty, projected_qty, shortage_qty, is_manufacturable, on_hand, ordered, reserved, rate, suggested_supplier_id) FROM stdin;
1	1	16	60.0000	0.0000	60.0000	f	0.0000	0.0000	0.0000	10000.00	\N
2	1	15	10.0000	0.0000	10.0000	f	0.0000	0.0000	0.0000	20000.00	\N
3	2	20	60.0000	20.0000	40.0000	f	20.0000	0.0000	0.0000	10000.00	\N
4	2	19	10.0000	10.0000	0.0000	f	10.0000	0.0000	0.0000	20000.00	\N
5	3	24	60.0000	20.0000	40.0000	f	20.0000	0.0000	0.0000	10000.00	\N
6	3	23	10.0000	10.0000	0.0000	f	10.0000	0.0000	0.0000	20000.00	\N
\.


--
-- Data for Name: pp_so; Type: TABLE DATA; Schema: mfg; Owner: -
--

COPY mfg.pp_so (production_plan_id, sales_order_id) FROM stdin;
1	11
2	12
3	13
\.


--
-- Data for Name: production_plan; Type: TABLE DATA; Schema: mfg; Owner: -
--

COPY mfg.production_plan (id, doc_no, plan_date, status, note, creator_id, created_at, submitted_at) FROM stdin;
1	KHSX2606-0001	2026-06-13	SUBMITTED	\N	1	2026-06-13 21:43:32.804269+07	2026-06-13 21:43:34.684278+07
2	KHSX2606-0002	2026-06-13	SUBMITTED	\N	1	2026-06-13 22:00:50.528182+07	2026-06-13 22:00:52.483062+07
3	KHSX2606-0003	2026-06-13	SUBMITTED	\N	1	2026-06-13 22:06:49.333607+07	2026-06-13 22:06:51.44336+07
\.


--
-- Data for Name: wo_finish_batch; Type: TABLE DATA; Schema: mfg; Owner: -
--

COPY mfg.wo_finish_batch (id, work_order_id, qty, cost, stock_doc_id, completed_at) FROM stdin;
1	3	6.0000	1155000.00	13	2026-06-13 22:06:55.953412+07
2	3	4.0000	770000.00	14	2026-06-13 22:06:56.478201+07
\.


--
-- Data for Name: wo_item; Type: TABLE DATA; Schema: mfg; Owner: -
--

COPY mfg.wo_item (id, work_order_id, product_id, required_qty, transferred_qty, consumed_qty, rate) FROM stdin;
1	1	16	60.0000	0.0000	0.0000	10000.00
2	1	15	10.0000	0.0000	0.0000	20000.00
3	2	20	60.0000	60.0000	0.0000	10000.00
4	2	19	10.0000	10.0000	0.0000	20000.00
5	3	24	60.0000	60.0000	60.0000	10000.00
6	3	23	10.0000	10.0000	10.0000	20000.00
\.


--
-- Data for Name: wo_operation; Type: TABLE DATA; Schema: mfg; Owner: -
--

COPY mfg.wo_operation (id, work_order_id, operation_id, workstation_id, planned_time_minutes, status, hourly_rate) FROM stdin;
1	1	1	1	450.00	PENDING	150000.00
2	2	1	2	450.00	PENDING	150000.00
3	3	1	3	450.00	PENDING	150000.00
\.


--
-- Data for Name: work_order; Type: TABLE DATA; Schema: mfg; Owner: -
--

COPY mfg.work_order (id, doc_no, product_id, bom_id, qty, produced_qty, wip_warehouse_id, fg_warehouse_id, planned_start_date, planned_end_date, status, stop_reason, stock_doc_transfer_id, stock_doc_manufacture_id, note, creator_id, created_at, started_at, completed_at, source_warehouse_id, production_plan_id) FROM stdin;
1	LSX2606-0001	13	2	10.0000	0.0000	2	2	\N	\N	NOT_STARTED	\N	\N	\N	\N	1	2026-06-13 21:43:38.745707+07	\N	\N	2	1
2	LSX2606-0002	17	4	10.0000	0.0000	3	3	\N	\N	IN_PROCESS	\N	7	\N	\N	1	2026-06-13 22:00:55.999768+07	2026-06-13 22:00:56.50059+07	\N	3	2
3	LSX2606-0003	21	6	10.0000	10.0000	4	4	\N	\N	COMPLETED	\N	12	\N	\N	1	2026-06-13 22:06:55.012478+07	2026-06-13 22:06:55.585712+07	2026-06-13 22:06:56.478201+07	4	3
\.


--
-- Data for Name: workstation; Type: TABLE DATA; Schema: mfg; Owner: -
--

COPY mfg.workstation (id, code, name, hourly_rate, working_hours_per_day, is_active, description) FROM stdin;
1	WS1	Gia cong chinh	150000.00	8.00	t	\N
2	WS2	Gia cong chinh	150000.00	8.00	t	\N
3	WS3	Gia cong chinh	150000.00	8.00	t	\N
\.


--
-- Data for Name: landed_cost_receipt; Type: TABLE DATA; Schema: purchasing; Owner: -
--

COPY purchasing.landed_cost_receipt (id, voucher_id, receipt_doc_id) FROM stdin;
\.


--
-- Data for Name: landed_cost_voucher; Type: TABLE DATA; Schema: purchasing; Owner: -
--

COPY purchasing.landed_cost_voucher (id, doc_no, doc_date, allocation_method, status, note, creator_id, created_at) FROM stdin;
\.


--
-- Data for Name: landed_cost_voucher_line; Type: TABLE DATA; Schema: purchasing; Owner: -
--

COPY purchasing.landed_cost_voucher_line (id, voucher_id, cost_type_id, service_supplier_id, amount, note) FROM stdin;
\.


--
-- Data for Name: outsourcing_cost; Type: TABLE DATA; Schema: purchasing; Owner: -
--

COPY purchasing.outsourcing_cost (id, receipt_doc_id, product_id, payee_id, cost_type_id, process_id, amount_fc, currency_code, exchange_rate, amount, vat_pct, payment_method_id, collected_po_id, approved) FROM stdin;
\.


--
-- Data for Name: po_cost; Type: TABLE DATA; Schema: purchasing; Owner: -
--

COPY purchasing.po_cost (id, order_id, receipt_doc_id, cost_type_id, service_supplier_id, amount, vat_pct, payment_method_id, approved, approved_by, approved_at, note) FROM stdin;
1	4	\N	1	\N	0.00	10.00	\N	f	\N	\N	\N
2	5	\N	1	\N	0.00	10.00	\N	f	\N	\N	\N
3	6	\N	1	\N	0.00	10.00	\N	f	\N	\N	\N
\.


--
-- Data for Name: po_payment_actual; Type: TABLE DATA; Schema: purchasing; Owner: -
--

COPY purchasing.po_payment_actual (id, order_id, pay_date, amount, method_id, note) FROM stdin;
\.


--
-- Data for Name: po_payment_request; Type: TABLE DATA; Schema: purchasing; Owner: -
--

COPY purchasing.po_payment_request (id, order_id, due_date, amount, note, status, approved_by, approved_at, creator_id, approver_id) FROM stdin;
1	3	2026-06-30	5000000.00	\N	APPROVED	1	2026-06-12 06:06:01.773661+07	1	\N
2	4	2026-06-30	5000000.00	\N	APPROVED	1	2026-06-12 06:07:50.558259+07	1	\N
3	5	2026-06-30	5000000.00	\N	APPROVED	1	2026-06-12 06:17:11.22592+07	1	\N
4	6	2026-06-30	5000000.00	\N	APPROVED	1	2026-06-12 06:22:16.589514+07	1	\N
\.


--
-- Data for Name: purchase_order; Type: TABLE DATA; Schema: purchasing; Owner: -
--

COPY purchasing.purchase_order (id, doc_no, order_date, receive_date_plan, partner_id, order_form, payment_method_id, delivery_method_id, receive_address, vat_included, request_id, approver_id, approved_at, total_amount, total_vat, note, status, created_at, status_reason, creator_id, rfq_id, tax_template_id, payment_terms_template_id, tax_total, grand_total) FROM stdin;
1	PO2606-0001	2026-06-11	\N	2	NORMAL	\N	\N	\N	t	\N	1	2026-06-11 17:37:14.239097+07	500000.00	50000.00	\N	RECEIVED	2026-06-11 17:37:13.113141+07	\N	1	\N	\N	\N	\N	\N
2	PO2606-0002	2026-06-12	\N	1	NORMAL	\N	\N	\N	t	\N	1	2026-06-12 06:04:22.329853+07	300000.00	30000.00	\N	APPROVED	2026-06-12 06:04:21.887297+07	\N	1	\N	\N	\N	\N	\N
3	PO2606-0003	2026-06-12	\N	1	NORMAL	\N	\N	\N	t	\N	1	2026-06-12 06:05:58.931924+07	300000.00	30000.00	\N	APPROVED	2026-06-12 06:05:58.591393+07	\N	1	\N	\N	\N	\N	\N
4	PO2606-0004	2026-06-12	\N	1	NORMAL	\N	\N	\N	t	\N	1	2026-06-12 06:07:47.737289+07	300000.00	30000.00	\N	APPROVED	2026-06-12 06:07:47.425247+07	\N	1	\N	\N	\N	\N	\N
5	PO2606-0005	2026-06-12	\N	1	NORMAL	\N	\N	\N	t	\N	1	2026-06-12 06:17:08.478695+07	300000.00	30000.00	\N	APPROVED	2026-06-12 06:17:08.065456+07	\N	1	\N	\N	\N	\N	\N
6	PO2606-0006	2026-06-12	\N	1	NORMAL	\N	\N	\N	t	\N	1	2026-06-12 06:22:13.724293+07	300000.00	30000.00	\N	APPROVED	2026-06-12 06:22:13.423514+07	\N	1	\N	\N	\N	\N	\N
7	PO2606-0007	2026-06-13	\N	7	NORMAL	\N	\N	\N	t	5	\N	\N	\N	\N	\N	DRAFT	2026-06-13 21:43:43.86949+07	\N	1	\N	\N	\N	\N	\N
8	PO2606-0008	2026-06-13	\N	9	NORMAL	\N	\N	\N	t	6	\N	\N	\N	\N	\N	DRAFT	2026-06-13 22:01:01.306041+07	\N	1	\N	\N	\N	\N	\N
9	PO2606-0009	2026-06-13	\N	11	NORMAL	\N	\N	\N	t	7	\N	\N	\N	\N	\N	DRAFT	2026-06-13 22:07:00.757396+07	\N	1	\N	\N	\N	\N	\N
\.


--
-- Data for Name: purchase_order_line; Type: TABLE DATA; Schema: purchasing; Owner: -
--

COPY purchasing.purchase_order_line (id, order_id, product_id, quantity, unit_price, vat_pct, note, received_qty, billed_qty) FROM stdin;
1	1	3	100.0000	5000.00	10.00	\N	0.0000	0.0000
2	2	1	1.0000	100000.00	10.00	\N	0.0000	0.0000
3	2	1	1.0000	200000.00	10.00	\N	0.0000	0.0000
4	3	1	1.0000	100000.00	10.00	\N	0.0000	0.0000
5	3	1	1.0000	200000.00	10.00	\N	0.0000	0.0000
6	4	1	1.0000	100000.00	10.00	\N	0.0000	0.0000
7	4	1	1.0000	200000.00	10.00	\N	0.0000	0.0000
8	5	1	1.0000	100000.00	10.00	\N	0.0000	0.0000
9	5	1	1.0000	200000.00	10.00	\N	0.0000	0.0000
10	6	1	1.0000	100000.00	10.00	\N	0.0000	0.0000
11	6	1	1.0000	200000.00	10.00	\N	0.0000	0.0000
12	7	16	60.0000	10000.00	10.00	\N	0.0000	0.0000
13	8	20	40.0000	10000.00	10.00	\N	0.0000	0.0000
14	9	24	40.0000	10000.00	10.00	\N	0.0000	0.0000
\.


--
-- Data for Name: purchase_request; Type: TABLE DATA; Schema: purchasing; Owner: -
--

COPY purchasing.purchase_request (id, doc_no, doc_date, requester_id, department_id, status, note, status_reason, creator_id, created_at, request_type, required_by, approver_id, approved_at, production_plan_id) FROM stdin;
1	YC2606-0001	2026-06-12	\N	\N	APPROVED	\N	\N	1	2026-06-12 06:20:19.689648+07	PURCHASE	\N	\N	\N	\N
2	YC2606-0002	2026-06-13	\N	1	DRAFT	\N	\N	1	2026-06-13 12:04:40.629008+07	PURCHASE	\N	\N	\N	\N
3	YC2606-0003	2026-06-13	\N	1	DRAFT	\N	\N	1	2026-06-13 12:04:51.305371+07	PURCHASE	\N	\N	\N	\N
4	YC2606-0004	2026-06-13	\N	1	DRAFT	\N	\N	1	2026-06-13 12:04:52.367778+07	PURCHASE	\N	\N	\N	\N
5	YC2606-0005	2026-06-13	\N	\N	DRAFT	\N	\N	1	2026-06-13 21:43:36.032358+07	PURCHASE	\N	\N	\N	1
6	YC2606-0006	2026-06-13	\N	\N	DRAFT	\N	\N	1	2026-06-13 22:00:53.790451+07	PURCHASE	\N	\N	\N	2
7	YC2606-0007	2026-06-13	\N	\N	DRAFT	\N	\N	1	2026-06-13 22:06:52.795424+07	PURCHASE	\N	\N	\N	3
\.


--
-- Data for Name: purchase_request_line; Type: TABLE DATA; Schema: purchasing; Owner: -
--

COPY purchasing.purchase_request_line (id, request_id, product_id, quantity, need_date, note) FROM stdin;
1	1	1	1.0000	\N	\N
2	2	2	1.0000	\N	\N
3	3	2	1.0000	\N	\N
4	4	2	1.0000	\N	\N
5	5	16	60.0000	\N	\N
6	5	15	10.0000	\N	\N
7	6	20	40.0000	\N	\N
8	7	24	40.0000	\N	\N
\.


--
-- Data for Name: rfq; Type: TABLE DATA; Schema: purchasing; Owner: -
--

COPY purchasing.rfq (id, doc_no, doc_date, request_id, status, note, creator_id, created_at) FROM stdin;
\.


--
-- Data for Name: rfq_line; Type: TABLE DATA; Schema: purchasing; Owner: -
--

COPY purchasing.rfq_line (id, rfq_id, product_id, quantity, note) FROM stdin;
\.


--
-- Data for Name: rfq_supplier; Type: TABLE DATA; Schema: purchasing; Owner: -
--

COPY purchasing.rfq_supplier (id, rfq_id, partner_id, note) FROM stdin;
\.


--
-- Data for Name: supplier_quotation; Type: TABLE DATA; Schema: purchasing; Owner: -
--

COPY purchasing.supplier_quotation (id, doc_no, doc_date, rfq_id, partner_id, valid_until, lead_time_days, note, status, creator_id, created_at) FROM stdin;
\.


--
-- Data for Name: supplier_quotation_line; Type: TABLE DATA; Schema: purchasing; Owner: -
--

COPY purchasing.supplier_quotation_line (id, quotation_id, product_id, quantity, unit_price, lead_time_days, note) FROM stdin;
\.


--
-- Data for Name: supplier_return; Type: TABLE DATA; Schema: purchasing; Owner: -
--

COPY purchasing.supplier_return (id, doc_no, doc_date, order_id, partner_id, status, note, creator_id, approver_id, approved_at) FROM stdin;
1	TH2606-0001	2026-06-12	5	1	APPROVED	\N	1	\N	\N
\.


--
-- Data for Name: supplier_return_line; Type: TABLE DATA; Schema: purchasing; Owner: -
--

COPY purchasing.supplier_return_line (id, return_id, product_id, quantity, unit_price, note) FROM stdin;
1	1	1	1.0000	50000.00	\N
\.


--
-- Data for Name: coupon_code; Type: TABLE DATA; Schema: sales; Owner: -
--

COPY sales.coupon_code (id, code, pricing_rule_id, max_use, used, valid_from, valid_to, is_active) FROM stdin;
1	EXPV3_283	1	\N	0	2020-01-01	2020-01-02	t
2	EXPV3_22783	4	\N	0	2020-01-01	2020-01-02	t
\.


--
-- Data for Name: lost_reason; Type: TABLE DATA; Schema: sales; Owner: -
--

COPY sales.lost_reason (id, code, name, is_active) FROM stdin;
1	LR1_26554	Gia cao hon doi thu	t
2	LR2_15733	Giao hang cham	t
3	LR1_13805	Gia cao hon doi thu	t
4	LR2_30208	Giao hang cham	t
\.


--
-- Data for Name: opportunity; Type: TABLE DATA; Schema: sales; Owner: -
--

COPY sales.opportunity (id, code, name, partner_id, expected_value, stage, salesperson_id, sales_order_id, note, created_at) FROM stdin;
\.


--
-- Data for Name: price_list; Type: TABLE DATA; Schema: sales; Owner: -
--

COPY sales.price_list (id, code, name, valid_from, valid_to, is_active) FROM stdin;
1	PL-T20	Bang gia test task20	2026-01-01	\N	t
2	PLV3_22629	Bang gia v3	2026-06-12	\N	t
\.


--
-- Data for Name: price_list_item; Type: TABLE DATA; Schema: sales; Owner: -
--

COPY sales.price_list_item (id, price_list_id, product_id, price) FROM stdin;
1	1	1	100000.00
2	2	10	100000.00
\.


--
-- Data for Name: pricing_formula; Type: TABLE DATA; Schema: sales; Owner: -
--

COPY sales.pricing_formula (id, product_group_id, product_id, formula) FROM stdin;
\.


--
-- Data for Name: pricing_rule; Type: TABLE DATA; Schema: sales; Owner: -
--

COPY sales.pricing_rule (id, rule_source, scheme_id, priority, product_id, product_group_id, partner_id, min_qty, max_qty, discount_pct, rate, free_product_id, free_qty, free_rate, valid_from, valid_to, is_active) FROM stdin;
1	SCHEME	1	10	8	\N	\N	10.0000	\N	5.0000	\N	\N	\N	0.00	\N	\N	t
2	SCHEME	1	50	8	\N	\N	50.0000	\N	10.0000	\N	\N	\N	0.00	\N	\N	t
3	SCHEME	1	100	8	\N	\N	100.0000	\N	\N	\N	9	5.0000	0.00	\N	\N	t
4	SCHEME	2	10	10	\N	\N	10.0000	\N	5.0000	\N	\N	\N	0.00	\N	\N	t
5	SCHEME	2	50	10	\N	\N	50.0000	\N	10.0000	\N	\N	\N	0.00	\N	\N	t
6	SCHEME	2	100	10	\N	\N	100.0000	\N	\N	\N	11	5.0000	0.00	\N	\N	t
\.


--
-- Data for Name: promotion; Type: TABLE DATA; Schema: sales; Owner: -
--

COPY sales.promotion (id, code, name, group_name, date_from, date_to, sponsor, discount_pct, has_gift, note) FROM stdin;
\.


--
-- Data for Name: promotion_discount_item; Type: TABLE DATA; Schema: sales; Owner: -
--

COPY sales.promotion_discount_item (id, promotion_id, product_id, total_pct, company_pct, vendor_pct) FROM stdin;
\.


--
-- Data for Name: promotion_gift_item; Type: TABLE DATA; Schema: sales; Owner: -
--

COPY sales.promotion_gift_item (id, promotion_id, buy_product_id, gift_product_id, required_qty, total_gift_qty, company_gift_qty, vendor_gift_qty) FROM stdin;
\.


--
-- Data for Name: promotional_scheme; Type: TABLE DATA; Schema: sales; Owner: -
--

COPY sales.promotional_scheme (id, code, name, apply_on, product_group_id, partner_id, valid_from, valid_to, is_active, legacy_promotion_id) FROM stdin;
1	SCHV3_8910	Mua 10 giam 5%, mua 50 giam 10%, mua 100 tang 5	ITEM	\N	\N	\N	\N	t	\N
2	SCHV3_32181	Mua 10 giam 5%, mua 50 giam 10%, mua 100 tang 5	ITEM	\N	\N	\N	\N	t	\N
\.


--
-- Data for Name: quotation; Type: TABLE DATA; Schema: sales; Owner: -
--

COPY sales.quotation (id, doc_no, doc_date, requester_id, requester_dept_id, creator_id, approver_id, approved_at, partner_id, contact_id, delivery_addr_id, quote_type, quote_form, request_delivery_date, validity_days, delivery_lead, payment_method_id, delivery_method_id, bank_account, attached_service, note, status, status_reason, created_at, valid_till, order_type, price_list_id, tax_template_id, lost_reason_ids, competitor, terms, opportunity_id) FROM stdin;
18	BG2606-0017	2026-06-12	\N	\N	1	\N	\N	5	\N	\N	NORMAL	NORMAL	\N	2	\N	\N	\N	\N	\N	\N	LOST	Gia cao hon doi thu	2026-06-12 21:22:18.466792+07	2026-06-14	SALES	\N	\N	{3,4}	Doi thu ABC	\N	\N
2	BG2606-0002	2026-06-11	\N	\N	1	1	2026-06-11 12:42:51.05087+07	1	\N	\N	NORMAL	NORMAL	\N	2	\N	\N	\N	\N	\N	BG test	ORDERED	\N	2026-06-11 12:42:47.868524+07	\N	SALES	\N	\N	\N	\N	\N	\N
19	BG2606-0018	2026-06-12	\N	\N	1	\N	\N	5	\N	\N	NORMAL	NORMAL	\N	2	\N	\N	\N	\N	\N	\N	CANCELLED	Khach doi y	2026-06-12 21:22:24.138272+07	2026-06-14	SALES	\N	\N	\N	\N	\N	\N
20	BG2606-0018-1	2026-06-12	\N	\N	1	\N	\N	5	\N	\N	NORMAL	NORMAL	\N	2	\N	\N	\N	\N	\N	\N	DRAFT	\N	2026-06-12 21:22:27.424072+07	2026-06-14	SALES	\N	\N	\N	\N	\N	\N
3	BG2606-0003	2026-06-11	\N	\N	1	1	2026-06-11 23:39:10.414963+07	1	\N	\N	NORMAL	NORMAL	\N	2	\N	\N	\N	\N	\N	\N	ORDERED	\N	2026-06-11 23:39:08.617053+07	\N	SALES	\N	\N	\N	\N	\N	\N
4	BG2606-0004	2026-06-11	\N	\N	1	\N	\N	1	\N	\N	NORMAL	NORMAL	\N	2	\N	\N	\N	\N	\N	\N	CANCELLED	Khách hàng hủy yêu cầu	2026-06-11 23:43:16.939806+07	\N	SALES	\N	\N	\N	\N	\N	\N
5	BG2606-0005	2026-06-11	\N	\N	1	\N	\N	1	\N	\N	NORMAL	NORMAL	\N	2	\N	\N	\N	\N	\N	\N	CANCELLED	test reason	2026-06-11 23:43:57.378285+07	\N	SALES	\N	\N	\N	\N	\N	\N
6	BG2606-0006	2026-06-11	\N	\N	1	\N	\N	1	\N	\N	NORMAL	NORMAL	\N	2	\N	\N	\N	\N	\N	\N	CANCELLED	test reason	2026-06-11 23:44:18.80932+07	\N	SALES	\N	\N	\N	\N	\N	\N
11	BG2606-0011	2026-06-12	\N	1	1	1	2026-06-12 10:50:35.084869+07	1	\N	\N	NORMAL	NORMAL	\N	2		\N	\N	\N		\N	ORDERED	\N	2026-06-12 10:50:27.568022+07	\N	SALES	\N	\N	\N	\N	\N	\N
12	BG2606-0012	2026-06-12	\N	1	1	1	2026-06-12 10:58:19.839145+07	1	\N	\N	NORMAL	NORMAL	\N	2		\N	\N	\N		\N	ORDERED	\N	2026-06-12 10:58:12.047435+07	\N	SALES	\N	\N	\N	\N	\N	\N
1	BG2606-0001	2026-06-11	\N	\N	1	\N	\N	1	\N	\N	NORMAL	NORMAL	\N	2	\N	\N	\N	\N	\N	BG test	DRAFT	\N	2026-06-11 12:38:20.126604+07	\N	SALES	\N	\N	\N	\N	\N	\N
7	BG2606-0007	2026-06-12	\N	\N	1	\N	\N	1	\N	\N	NORMAL	NORMAL	\N	2	\N	\N	\N	\N	\N	\N	DRAFT	\N	2026-06-12 10:39:29.93501+07	\N	SALES	\N	\N	\N	\N	\N	\N
8	BG2606-0008	2026-06-12	\N	1	1	\N	\N	1	\N	\N	NORMAL	NORMAL	\N	2		\N	\N	\N		\N	DRAFT	\N	2026-06-12 10:43:30.835687+07	\N	SALES	\N	\N	\N	\N	\N	\N
9	BG2606-0009	2026-06-12	\N	1	1	\N	\N	1	\N	\N	NORMAL	NORMAL	\N	2		\N	\N	\N		\N	DRAFT	\N	2026-06-12 10:46:11.999618+07	\N	SALES	\N	\N	\N	\N	\N	\N
10	BG2606-0010	2026-06-12	\N	1	1	\N	\N	1	\N	\N	NORMAL	NORMAL	\N	2		\N	\N	\N		\N	DRAFT	\N	2026-06-12 10:48:14.349461+07	\N	SALES	\N	\N	\N	\N	\N	\N
13	BG2606-0013	2026-06-12	\N	\N	1	\N	\N	4	\N	\N	NORMAL	NORMAL	\N	2	\N	\N	\N	\N	\N	\N	OPEN	\N	2026-06-12 21:06:01.626596+07	2026-06-14	SALES	\N	\N	\N	\N	\N	\N
14	BG2606-0014	2026-06-12	\N	\N	1	\N	\N	4	\N	\N	NORMAL	NORMAL	\N	2	\N	\N	\N	\N	\N	\N	LOST	Gia cao hon doi thu	2026-06-12 21:06:16.463271+07	2026-06-14	SALES	\N	\N	{1,2}	Doi thu ABC	\N	\N
15	BG2606-0015	2026-06-12	\N	\N	1	\N	\N	4	\N	\N	NORMAL	NORMAL	\N	2	\N	\N	\N	\N	\N	\N	CANCELLED	Khach doi y	2026-06-12 21:06:24.428953+07	2026-06-14	SALES	\N	\N	\N	\N	\N	\N
16	BG2606-0015-1	2026-06-12	\N	\N	1	\N	\N	4	\N	\N	NORMAL	NORMAL	\N	2	\N	\N	\N	\N	\N	\N	DRAFT	\N	2026-06-12 21:06:28.150316+07	2026-06-14	SALES	\N	\N	\N	\N	\N	\N
17	BG2606-0016	2026-06-12	\N	\N	1	\N	\N	5	\N	\N	NORMAL	NORMAL	\N	2	\N	\N	\N	\N	\N	\N	ORDERED	\N	2026-06-12 21:22:04.797341+07	2026-06-14	SALES	\N	\N	\N	\N	\N	\N
\.


--
-- Data for Name: quotation_cost; Type: TABLE DATA; Schema: sales; Owner: -
--

COPY sales.quotation_cost (id, quotation_id, cost_type_id, payee_id, rate_pct, amount, vat_pct) FROM stdin;
\.


--
-- Data for Name: quotation_line; Type: TABLE DATA; Schema: sales; Owner: -
--

COPY sales.quotation_line (id, quotation_id, product_id, project_house, quantity, vat_pct, calc_price, approved_price, price_weight, note, ordered_qty, rate, discount_pct) FROM stdin;
1	1	1	\N	10.0000	10.00	\N	15000.00	\N	\N	0.0000	\N	\N
2	2	2	\N	10.0000	10.00	\N	15000.00	\N	\N	0.0000	\N	\N
3	3	1	\N	1.0000	10.00	\N	150000.00	\N	\N	0.0000	\N	\N
4	7	1	\N	10.0000	10.00	\N	50000.00	\N	\N	0.0000	\N	\N
5	8	1	\N	10.0000	10.00	\N	50000.00	\N	\N	0.0000	\N	\N
6	9	1	\N	10.0000	10.00	\N	50000.00	\N	\N	0.0000	\N	\N
7	10	1	\N	10.0000	10.00	\N	60000.00	\N	\N	0.0000	\N	\N
8	11	1	\N	10.0000	10.00	\N	60000.00	\N	\N	0.0000	\N	\N
9	11	1	\N	3.0000	10.00	\N	\N	\N	\N	0.0000	\N	\N
10	12	1	\N	10.0000	10.00	\N	60000.00	\N	\N	0.0000	\N	\N
11	12	1	\N	3.0000	10.00	\N	\N	\N	\N	0.0000	\N	\N
13	13	8	\N	100.0000	10.00	\N	\N	\N	\N	0.0000	0.00	10.0000
12	13	8	\N	10.0000	10.00	\N	\N	\N	\N	10.0000	0.00	5.0000
14	14	8	\N	1.0000	10.00	\N	\N	\N	\N	0.0000	0.00	0.0000
15	15	8	\N	1.0000	10.00	\N	\N	\N	\N	0.0000	0.00	0.0000
16	16	8	\N	1.0000	10.00	\N	\N	\N	\N	0.0000	0.00	0.0000
17	17	10	\N	10.0000	10.00	\N	\N	\N	\N	10.0000	100000.00	5.0000
18	17	10	\N	100.0000	10.00	\N	\N	\N	\N	100.0000	100000.00	10.0000
19	18	10	\N	1.0000	10.00	\N	\N	\N	\N	0.0000	100000.00	0.0000
20	19	10	\N	1.0000	10.00	\N	\N	\N	\N	0.0000	100000.00	0.0000
21	20	10	\N	1.0000	10.00	\N	\N	\N	\N	0.0000	100000.00	0.0000
\.


--
-- Data for Name: sales_allowance; Type: TABLE DATA; Schema: sales; Owner: -
--

COPY sales.sales_allowance (id, doc_no, doc_date, order_id, allow_form, status, note, creator_id, approver_id, approved_at) FROM stdin;
\.


--
-- Data for Name: sales_allowance_line; Type: TABLE DATA; Schema: sales; Owner: -
--

COPY sales.sales_allowance_line (id, allowance_id, product_id, quantity, reduced_price) FROM stdin;
\.


--
-- Data for Name: sales_order; Type: TABLE DATA; Schema: sales; Owner: -
--

COPY sales.sales_order (id, doc_no, doc_date, quotation_id, partner_id, order_form, sales_channel, sales_region, warehouse_id, delivery_date_plan, payment_method_id, delivery_method_id, delivery_addr_id, salesperson_id, approver_id, approved_at, total_amount, total_vat, note, status, created_at, creator_id) FROM stdin;
1	DH2606-0001	2026-06-11	2	1	NORMAL	\N	\N	\N	\N	\N	\N	\N	\N	1	2026-06-11 12:42:55.7832+07	150000.00	15000.00	BG test	APPROVED	2026-06-11 12:42:52.76321+07	\N
2	DH2606-0002	2026-06-11	\N	3	NORMAL	\N	\N	1	\N	\N	\N	\N	\N	1	2026-06-11 17:37:22.310738+07	80000.00	8000.00	\N	DELIVERED	2026-06-11 17:37:21.333565+07	\N
3	DH2606-0003	2026-06-11	\N	3	NORMAL	\N	\N	1	\N	\N	\N	\N	\N	1	2026-06-11 17:37:32.292842+07	8000000.00	800000.00	\N	NOT_DELIVERED	2026-06-11 17:37:31.289595+07	\N
4	DH2606-0004	2026-06-11	3	1	NORMAL	\N	\N	\N	\N	\N	\N	\N	\N	1	2026-06-11 23:39:13.466633+07	150000.00	15000.00	\N	APPROVED	2026-06-11 23:39:11.796124+07	\N
5	DH2606-0005	2026-06-12	11	1	NORMAL	\N	\N	1	\N	\N	\N	\N	\N	\N	\N	760000.00	76000.00	\N	DRAFT	2026-06-12 10:50:36.025494+07	\N
6	DH2606-0006	2026-06-12	12	1	NORMAL	\N	\N	1	\N	\N	\N	\N	\N	\N	\N	760000.00	76000.00	\N	DRAFT	2026-06-12 10:58:20.800358+07	\N
7	DH2606-0007	2026-06-12	13	4	NORMAL	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	0.00	0.00	\N	DRAFT	2026-06-12 21:06:06.914179+07	\N
9	DH2606-0008	2026-06-12	17	5	NORMAL	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	950000.00	95000.00	\N	DRAFT	2026-06-12 21:22:09.98889+07	\N
10	DH2606-0009	2026-06-12	17	5	NORMAL	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	9000000.00	900000.00	\N	DRAFT	2026-06-12 21:22:14.257186+07	\N
11	DH2606-0010	2026-06-13	\N	6	NORMAL	\N	\N	2	\N	\N	\N	\N	\N	\N	\N	5000000.00	500000.00	\N	DRAFT	2026-06-13 21:43:31.069734+07	\N
12	DH2606-0011	2026-06-13	\N	8	NORMAL	\N	\N	3	\N	\N	\N	\N	\N	\N	\N	5000000.00	500000.00	\N	DRAFT	2026-06-13 22:00:48.782573+07	\N
13	DH2606-0012	2026-06-13	\N	10	NORMAL	\N	\N	4	\N	\N	\N	\N	\N	\N	\N	5000000.00	500000.00	\N	DRAFT	2026-06-13 22:06:47.367594+07	\N
\.


--
-- Data for Name: sales_order_line; Type: TABLE DATA; Schema: sales; Owner: -
--

COPY sales.sales_order_line (id, order_id, product_id, quantity, kit_qty, unit_price, list_price, vat_pct, is_gift, note) FROM stdin;
1	1	2	10.0000	\N	15000.00	\N	10.00	f	\N
2	2	3	10.0000	\N	8000.00	\N	10.00	f	\N
3	3	3	1000.0000	\N	8000.00	\N	10.00	f	\N
4	4	1	1.0000	\N	150000.00	\N	10.00	f	\N
5	5	1	10.0000	\N	60000.00	\N	10.00	f	\N
6	5	1	3.0000	\N	0.00	\N	10.00	f	\N
7	5	1	2.0000	\N	80000.00	100000.00	10.00	f	\N
8	6	1	10.0000	\N	60000.00	100000.00	10.00	f	\N
9	6	1	3.0000	\N	0.00	100000.00	10.00	f	\N
10	6	1	2.0000	\N	80000.00	100000.00	10.00	f	\N
11	7	8	10.0000	\N	0.00	0.00	10.00	f	\N
12	9	10	10.0000	\N	95000.00	100000.00	10.00	f	\N
13	10	10	100.0000	\N	90000.00	100000.00	10.00	f	\N
14	10	11	5.0000	\N	0.00	\N	0.00	t	Hàng tặng theo CTKM (báo giá BG2606-0016)
15	11	13	10.0000	\N	500000.00	\N	10.00	f	\N
16	12	17	10.0000	\N	500000.00	\N	10.00	f	\N
17	13	21	10.0000	\N	500000.00	\N	10.00	f	\N
\.


--
-- Data for Name: sales_target; Type: TABLE DATA; Schema: sales; Owner: -
--

COPY sales.sales_target (id, employee_id, period, target_amount) FROM stdin;
\.


--
-- Data for Name: scheme_item; Type: TABLE DATA; Schema: sales; Owner: -
--

COPY sales.scheme_item (id, scheme_id, product_id) FROM stdin;
1	1	8
2	2	10
\.


--
-- Data for Name: scheme_price_slab; Type: TABLE DATA; Schema: sales; Owner: -
--

COPY sales.scheme_price_slab (id, scheme_id, product_id, min_qty, max_qty, discount_pct, rate) FROM stdin;
1	1	\N	10.0000	\N	5.0000	\N
2	1	\N	50.0000	\N	10.0000	\N
3	2	\N	10.0000	\N	5.0000	\N
4	2	\N	50.0000	\N	10.0000	\N
\.


--
-- Data for Name: scheme_product_slab; Type: TABLE DATA; Schema: sales; Owner: -
--

COPY sales.scheme_product_slab (id, scheme_id, product_id, min_qty, max_qty, free_product_id, free_qty, free_rate) FROM stdin;
1	1	\N	100.0000	\N	9	5.0000	0.00
2	2	\N	100.0000	\N	11	5.0000	0.00
\.


--
-- Data for Name: so_cost; Type: TABLE DATA; Schema: sales; Owner: -
--

COPY sales.so_cost (id, order_id, cost_type_id, payee_id, rate_pct, amount, vat_pct, due_date, note, approved, approved_by, approved_at) FROM stdin;
\.


--
-- Data for Name: so_payment_actual; Type: TABLE DATA; Schema: sales; Owner: -
--

COPY sales.so_payment_actual (id, order_id, pay_date, amount, method_id, note) FROM stdin;
\.


--
-- Data for Name: so_payment_request; Type: TABLE DATA; Schema: sales; Owner: -
--

COPY sales.so_payment_request (id, order_id, due_date, amount, auto_generated, status) FROM stdin;
\.


--
-- Data for Name: so_promotion; Type: TABLE DATA; Schema: sales; Owner: -
--

COPY sales.so_promotion (order_id, promotion_id) FROM stdin;
\.


--
-- Name: app_user_id_seq; Type: SEQUENCE SET; Schema: core; Owner: -
--

SELECT pg_catalog.setval('core.app_user_id_seq', 2, true);


--
-- Name: approval_right_id_seq; Type: SEQUENCE SET; Schema: core; Owner: -
--

SELECT pg_catalog.setval('core.approval_right_id_seq', 1, false);


--
-- Name: attachment_id_seq; Type: SEQUENCE SET; Schema: core; Owner: -
--

SELECT pg_catalog.setval('core.attachment_id_seq', 1, false);


--
-- Name: audit_log_id_seq; Type: SEQUENCE SET; Schema: core; Owner: -
--

SELECT pg_catalog.setval('core.audit_log_id_seq', 299, true);


--
-- Name: cost_type_id_seq; Type: SEQUENCE SET; Schema: core; Owner: -
--

SELECT pg_catalog.setval('core.cost_type_id_seq', 1, true);


--
-- Name: delivery_method_id_seq; Type: SEQUENCE SET; Schema: core; Owner: -
--

SELECT pg_catalog.setval('core.delivery_method_id_seq', 3, true);


--
-- Name: department_id_seq; Type: SEQUENCE SET; Schema: core; Owner: -
--

SELECT pg_catalog.setval('core.department_id_seq', 1, true);


--
-- Name: doc_numbering_id_seq; Type: SEQUENCE SET; Schema: core; Owner: -
--

SELECT pg_catalog.setval('core.doc_numbering_id_seq', 15, true);


--
-- Name: employee_id_seq; Type: SEQUENCE SET; Schema: core; Owner: -
--

SELECT pg_catalog.setval('core.employee_id_seq', 1, false);


--
-- Name: exchange_rate_id_seq; Type: SEQUENCE SET; Schema: core; Owner: -
--

SELECT pg_catalog.setval('core.exchange_rate_id_seq', 1, false);


--
-- Name: job_title_id_seq; Type: SEQUENCE SET; Schema: core; Owner: -
--

SELECT pg_catalog.setval('core.job_title_id_seq', 1, false);


--
-- Name: note_id_seq; Type: SEQUENCE SET; Schema: core; Owner: -
--

SELECT pg_catalog.setval('core.note_id_seq', 1, false);


--
-- Name: partner_address_id_seq; Type: SEQUENCE SET; Schema: core; Owner: -
--

SELECT pg_catalog.setval('core.partner_address_id_seq', 1, false);


--
-- Name: partner_bank_account_id_seq; Type: SEQUENCE SET; Schema: core; Owner: -
--

SELECT pg_catalog.setval('core.partner_bank_account_id_seq', 1, false);


--
-- Name: partner_contact_id_seq; Type: SEQUENCE SET; Schema: core; Owner: -
--

SELECT pg_catalog.setval('core.partner_contact_id_seq', 1, false);


--
-- Name: partner_id_seq; Type: SEQUENCE SET; Schema: core; Owner: -
--

SELECT pg_catalog.setval('core.partner_id_seq', 20, true);


--
-- Name: partner_sales_cost_id_seq; Type: SEQUENCE SET; Schema: core; Owner: -
--

SELECT pg_catalog.setval('core.partner_sales_cost_id_seq', 1, false);


--
-- Name: payment_method_id_seq; Type: SEQUENCE SET; Schema: core; Owner: -
--

SELECT pg_catalog.setval('core.payment_method_id_seq', 2, true);


--
-- Name: payment_terms_template_id_seq; Type: SEQUENCE SET; Schema: core; Owner: -
--

SELECT pg_catalog.setval('core.payment_terms_template_id_seq', 1, false);


--
-- Name: payment_terms_template_line_id_seq; Type: SEQUENCE SET; Schema: core; Owner: -
--

SELECT pg_catalog.setval('core.payment_terms_template_line_id_seq', 1, false);


--
-- Name: permission_id_seq; Type: SEQUENCE SET; Schema: core; Owner: -
--

SELECT pg_catalog.setval('core.permission_id_seq', 1, false);


--
-- Name: process_id_seq; Type: SEQUENCE SET; Schema: core; Owner: -
--

SELECT pg_catalog.setval('core.process_id_seq', 123, true);


--
-- Name: product_bom_id_seq; Type: SEQUENCE SET; Schema: core; Owner: -
--

SELECT pg_catalog.setval('core.product_bom_id_seq', 1, false);


--
-- Name: product_group_id_seq; Type: SEQUENCE SET; Schema: core; Owner: -
--

SELECT pg_catalog.setval('core.product_group_id_seq', 1, true);


--
-- Name: product_id_seq; Type: SEQUENCE SET; Schema: core; Owner: -
--

SELECT pg_catalog.setval('core.product_id_seq', 24, true);


--
-- Name: task_id_seq; Type: SEQUENCE SET; Schema: core; Owner: -
--

SELECT pg_catalog.setval('core.task_id_seq', 1, false);


--
-- Name: tax_charge_template_id_seq; Type: SEQUENCE SET; Schema: core; Owner: -
--

SELECT pg_catalog.setval('core.tax_charge_template_id_seq', 1, false);


--
-- Name: tax_charge_template_line_id_seq; Type: SEQUENCE SET; Schema: core; Owner: -
--

SELECT pg_catalog.setval('core.tax_charge_template_line_id_seq', 1, false);


--
-- Name: uom_conversion_id_seq; Type: SEQUENCE SET; Schema: core; Owner: -
--

SELECT pg_catalog.setval('core.uom_conversion_id_seq', 1, false);


--
-- Name: uom_id_seq; Type: SEQUENCE SET; Schema: core; Owner: -
--

SELECT pg_catalog.setval('core.uom_id_seq', 1, true);


--
-- Name: user_group_id_seq; Type: SEQUENCE SET; Schema: core; Owner: -
--

SELECT pg_catalog.setval('core.user_group_id_seq', 1, true);


--
-- Name: warehouse_id_seq; Type: SEQUENCE SET; Schema: core; Owner: -
--

SELECT pg_catalog.setval('core.warehouse_id_seq', 4, true);


--
-- Name: warehouse_location_id_seq; Type: SEQUENCE SET; Schema: core; Owner: -
--

SELECT pg_catalog.setval('core.warehouse_location_id_seq', 1, false);


--
-- Name: wf_transition_log_id_seq; Type: SEQUENCE SET; Schema: core; Owner: -
--

SELECT pg_catalog.setval('core.wf_transition_log_id_seq', 71, true);


--
-- Name: work_position_id_seq; Type: SEQUENCE SET; Schema: core; Owner: -
--

SELECT pg_catalog.setval('core.work_position_id_seq', 1, false);


--
-- Name: activity_id_seq; Type: SEQUENCE SET; Schema: crm; Owner: -
--

SELECT pg_catalog.setval('crm.activity_id_seq', 1, false);


--
-- Name: campaign_id_seq; Type: SEQUENCE SET; Schema: crm; Owner: -
--

SELECT pg_catalog.setval('crm.campaign_id_seq', 1, false);


--
-- Name: lead_id_seq; Type: SEQUENCE SET; Schema: crm; Owner: -
--

SELECT pg_catalog.setval('crm.lead_id_seq', 2, true);


--
-- Name: lead_source_id_seq; Type: SEQUENCE SET; Schema: crm; Owner: -
--

SELECT pg_catalog.setval('crm.lead_source_id_seq', 132, true);


--
-- Name: opportunity_id_seq; Type: SEQUENCE SET; Schema: crm; Owner: -
--

SELECT pg_catalog.setval('crm.opportunity_id_seq', 1, false);


--
-- Name: opportunity_line_id_seq; Type: SEQUENCE SET; Schema: crm; Owner: -
--

SELECT pg_catalog.setval('crm.opportunity_line_id_seq', 1, false);


--
-- Name: sales_stage_id_seq; Type: SEQUENCE SET; Schema: crm; Owner: -
--

SELECT pg_catalog.setval('crm.sales_stage_id_seq', 110, true);


--
-- Name: account_id_seq; Type: SEQUENCE SET; Schema: finance; Owner: -
--

SELECT pg_catalog.setval('finance.account_id_seq', 1559, true);


--
-- Name: asset_alloc_rule_id_seq; Type: SEQUENCE SET; Schema: finance; Owner: -
--

SELECT pg_catalog.setval('finance.asset_alloc_rule_id_seq', 1, false);


--
-- Name: asset_group_id_seq; Type: SEQUENCE SET; Schema: finance; Owner: -
--

SELECT pg_catalog.setval('finance.asset_group_id_seq', 1, false);


--
-- Name: asset_report_id_seq; Type: SEQUENCE SET; Schema: finance; Owner: -
--

SELECT pg_catalog.setval('finance.asset_report_id_seq', 1, false);


--
-- Name: bank_fee_id_seq; Type: SEQUENCE SET; Schema: finance; Owner: -
--

SELECT pg_catalog.setval('finance.bank_fee_id_seq', 1, false);


--
-- Name: business_operation_id_seq; Type: SEQUENCE SET; Schema: finance; Owner: -
--

SELECT pg_catalog.setval('finance.business_operation_id_seq', 350, true);


--
-- Name: cash_fund_id_seq; Type: SEQUENCE SET; Schema: finance; Owner: -
--

SELECT pg_catalog.setval('finance.cash_fund_id_seq', 2, true);


--
-- Name: cit_declaration_id_seq; Type: SEQUENCE SET; Schema: finance; Owner: -
--

SELECT pg_catalog.setval('finance.cit_declaration_id_seq', 1, false);


--
-- Name: cost_center_id_seq; Type: SEQUENCE SET; Schema: finance; Owner: -
--

SELECT pg_catalog.setval('finance.cost_center_id_seq', 51, true);


--
-- Name: costing_object_id_seq; Type: SEQUENCE SET; Schema: finance; Owner: -
--

SELECT pg_catalog.setval('finance.costing_object_id_seq', 1, false);


--
-- Name: depreciation_entry_id_seq; Type: SEQUENCE SET; Schema: finance; Owner: -
--

SELECT pg_catalog.setval('finance.depreciation_entry_id_seq', 1, false);


--
-- Name: fiscal_period_id_seq; Type: SEQUENCE SET; Schema: finance; Owner: -
--

SELECT pg_catalog.setval('finance.fiscal_period_id_seq', 456, true);


--
-- Name: fixed_asset_id_seq; Type: SEQUENCE SET; Schema: finance; Owner: -
--

SELECT pg_catalog.setval('finance.fixed_asset_id_seq', 1, false);


--
-- Name: fs_mapping_id_seq; Type: SEQUENCE SET; Schema: finance; Owner: -
--

SELECT pg_catalog.setval('finance.fs_mapping_id_seq', 792, true);


--
-- Name: gl_entry_id_seq; Type: SEQUENCE SET; Schema: finance; Owner: -
--

SELECT pg_catalog.setval('finance.gl_entry_id_seq', 50, true);


--
-- Name: lerp_voucher_id_seq; Type: SEQUENCE SET; Schema: finance; Owner: -
--

SELECT pg_catalog.setval('finance.lerp_voucher_id_seq', 1, false);


--
-- Name: object_category_id_seq; Type: SEQUENCE SET; Schema: finance; Owner: -
--

SELECT pg_catalog.setval('finance.object_category_id_seq', 195, true);


--
-- Name: opening_balance_id_seq; Type: SEQUENCE SET; Schema: finance; Owner: -
--

SELECT pg_catalog.setval('finance.opening_balance_id_seq', 1, true);


--
-- Name: outbox_event_id_seq; Type: SEQUENCE SET; Schema: finance; Owner: -
--

SELECT pg_catalog.setval('finance.outbox_event_id_seq', 1, false);


--
-- Name: payment_allocation_id_seq; Type: SEQUENCE SET; Schema: finance; Owner: -
--

SELECT pg_catalog.setval('finance.payment_allocation_id_seq', 9, true);


--
-- Name: period_closing_id_seq; Type: SEQUENCE SET; Schema: finance; Owner: -
--

SELECT pg_catalog.setval('finance.period_closing_id_seq', 1, false);


--
-- Name: prepaid_alloc_entry_id_seq; Type: SEQUENCE SET; Schema: finance; Owner: -
--

SELECT pg_catalog.setval('finance.prepaid_alloc_entry_id_seq', 1, false);


--
-- Name: prepaid_alloc_rule_id_seq; Type: SEQUENCE SET; Schema: finance; Owner: -
--

SELECT pg_catalog.setval('finance.prepaid_alloc_rule_id_seq', 1, false);


--
-- Name: prepaid_card_id_seq; Type: SEQUENCE SET; Schema: finance; Owner: -
--

SELECT pg_catalog.setval('finance.prepaid_card_id_seq', 1, false);


--
-- Name: prepaid_expense_id_seq; Type: SEQUENCE SET; Schema: finance; Owner: -
--

SELECT pg_catalog.setval('finance.prepaid_expense_id_seq', 1, false);


--
-- Name: vat_deduction_id_seq; Type: SEQUENCE SET; Schema: finance; Owner: -
--

SELECT pg_catalog.setval('finance.vat_deduction_id_seq', 1, false);


--
-- Name: vat_invoice_id_seq; Type: SEQUENCE SET; Schema: finance; Owner: -
--

SELECT pg_catalog.setval('finance.vat_invoice_id_seq', 1, false);


--
-- Name: voucher_id_seq; Type: SEQUENCE SET; Schema: finance; Owner: -
--

SELECT pg_catalog.setval('finance.voucher_id_seq', 48, true);


--
-- Name: voucher_line_id_seq; Type: SEQUENCE SET; Schema: finance; Owner: -
--

SELECT pg_catalog.setval('finance.voucher_line_id_seq', 46, true);


--
-- Name: aggregatedcounter_id_seq; Type: SEQUENCE SET; Schema: hangfire; Owner: -
--

SELECT pg_catalog.setval('hangfire.aggregatedcounter_id_seq', 3, true);


--
-- Name: counter_id_seq; Type: SEQUENCE SET; Schema: hangfire; Owner: -
--

SELECT pg_catalog.setval('hangfire.counter_id_seq', 3, true);


--
-- Name: hash_id_seq; Type: SEQUENCE SET; Schema: hangfire; Owner: -
--

SELECT pg_catalog.setval('hangfire.hash_id_seq', 9, true);


--
-- Name: job_id_seq; Type: SEQUENCE SET; Schema: hangfire; Owner: -
--

SELECT pg_catalog.setval('hangfire.job_id_seq', 1, true);


--
-- Name: jobparameter_id_seq; Type: SEQUENCE SET; Schema: hangfire; Owner: -
--

SELECT pg_catalog.setval('hangfire.jobparameter_id_seq', 3, true);


--
-- Name: jobqueue_id_seq; Type: SEQUENCE SET; Schema: hangfire; Owner: -
--

SELECT pg_catalog.setval('hangfire.jobqueue_id_seq', 1, true);


--
-- Name: list_id_seq; Type: SEQUENCE SET; Schema: hangfire; Owner: -
--

SELECT pg_catalog.setval('hangfire.list_id_seq', 1, false);


--
-- Name: set_id_seq; Type: SEQUENCE SET; Schema: hangfire; Owner: -
--

SELECT pg_catalog.setval('hangfire.set_id_seq', 2, true);


--
-- Name: state_id_seq; Type: SEQUENCE SET; Schema: hangfire; Owner: -
--

SELECT pg_catalog.setval('hangfire.state_id_seq', 3, true);


--
-- Name: delivery_plan_id_seq; Type: SEQUENCE SET; Schema: inventory; Owner: -
--

SELECT pg_catalog.setval('inventory.delivery_plan_id_seq', 1, false);


--
-- Name: gr_cost_id_seq; Type: SEQUENCE SET; Schema: inventory; Owner: -
--

SELECT pg_catalog.setval('inventory.gr_cost_id_seq', 1, false);


--
-- Name: lot_id_seq; Type: SEQUENCE SET; Schema: inventory; Owner: -
--

SELECT pg_catalog.setval('inventory.lot_id_seq', 1, false);


--
-- Name: packing_line_id_seq; Type: SEQUENCE SET; Schema: inventory; Owner: -
--

SELECT pg_catalog.setval('inventory.packing_line_id_seq', 1, false);


--
-- Name: stock_balance_id_seq; Type: SEQUENCE SET; Schema: inventory; Owner: -
--

SELECT pg_catalog.setval('inventory.stock_balance_id_seq', 11, true);


--
-- Name: stock_doc_id_seq; Type: SEQUENCE SET; Schema: inventory; Owner: -
--

SELECT pg_catalog.setval('inventory.stock_doc_id_seq', 14, true);


--
-- Name: stock_doc_line_id_seq; Type: SEQUENCE SET; Schema: inventory; Owner: -
--

SELECT pg_catalog.setval('inventory.stock_doc_line_id_seq', 19, true);


--
-- Name: stock_move_id_seq; Type: SEQUENCE SET; Schema: inventory; Owner: -
--

SELECT pg_catalog.setval('inventory.stock_move_id_seq', 25, true);


--
-- Name: stock_reconciliation_id_seq; Type: SEQUENCE SET; Schema: inventory; Owner: -
--

SELECT pg_catalog.setval('inventory.stock_reconciliation_id_seq', 6, true);


--
-- Name: stock_reconciliation_line_id_seq; Type: SEQUENCE SET; Schema: inventory; Owner: -
--

SELECT pg_catalog.setval('inventory.stock_reconciliation_line_id_seq', 9, true);


--
-- Name: bom_id_seq; Type: SEQUENCE SET; Schema: mfg; Owner: -
--

SELECT pg_catalog.setval('mfg.bom_id_seq', 6, true);


--
-- Name: bom_item_id_seq; Type: SEQUENCE SET; Schema: mfg; Owner: -
--

SELECT pg_catalog.setval('mfg.bom_item_id_seq', 9, true);


--
-- Name: bom_operation_id_seq; Type: SEQUENCE SET; Schema: mfg; Owner: -
--

SELECT pg_catalog.setval('mfg.bom_operation_id_seq', 6, true);


--
-- Name: bom_scrap_id_seq; Type: SEQUENCE SET; Schema: mfg; Owner: -
--

SELECT pg_catalog.setval('mfg.bom_scrap_id_seq', 1, false);


--
-- Name: job_card_id_seq; Type: SEQUENCE SET; Schema: mfg; Owner: -
--

SELECT pg_catalog.setval('mfg.job_card_id_seq', 3, true);


--
-- Name: operation_id_seq; Type: SEQUENCE SET; Schema: mfg; Owner: -
--

SELECT pg_catalog.setval('mfg.operation_id_seq', 3, true);


--
-- Name: pp_item_id_seq; Type: SEQUENCE SET; Schema: mfg; Owner: -
--

SELECT pg_catalog.setval('mfg.pp_item_id_seq', 3, true);


--
-- Name: pp_material_id_seq; Type: SEQUENCE SET; Schema: mfg; Owner: -
--

SELECT pg_catalog.setval('mfg.pp_material_id_seq', 6, true);


--
-- Name: production_plan_id_seq; Type: SEQUENCE SET; Schema: mfg; Owner: -
--

SELECT pg_catalog.setval('mfg.production_plan_id_seq', 3, true);


--
-- Name: wo_finish_batch_id_seq; Type: SEQUENCE SET; Schema: mfg; Owner: -
--

SELECT pg_catalog.setval('mfg.wo_finish_batch_id_seq', 2, true);


--
-- Name: wo_item_id_seq; Type: SEQUENCE SET; Schema: mfg; Owner: -
--

SELECT pg_catalog.setval('mfg.wo_item_id_seq', 6, true);


--
-- Name: wo_operation_id_seq; Type: SEQUENCE SET; Schema: mfg; Owner: -
--

SELECT pg_catalog.setval('mfg.wo_operation_id_seq', 3, true);


--
-- Name: work_order_id_seq; Type: SEQUENCE SET; Schema: mfg; Owner: -
--

SELECT pg_catalog.setval('mfg.work_order_id_seq', 3, true);


--
-- Name: workstation_id_seq; Type: SEQUENCE SET; Schema: mfg; Owner: -
--

SELECT pg_catalog.setval('mfg.workstation_id_seq', 3, true);


--
-- Name: landed_cost_receipt_id_seq; Type: SEQUENCE SET; Schema: purchasing; Owner: -
--

SELECT pg_catalog.setval('purchasing.landed_cost_receipt_id_seq', 1, false);


--
-- Name: landed_cost_voucher_id_seq; Type: SEQUENCE SET; Schema: purchasing; Owner: -
--

SELECT pg_catalog.setval('purchasing.landed_cost_voucher_id_seq', 1, false);


--
-- Name: landed_cost_voucher_line_id_seq; Type: SEQUENCE SET; Schema: purchasing; Owner: -
--

SELECT pg_catalog.setval('purchasing.landed_cost_voucher_line_id_seq', 1, false);


--
-- Name: outsourcing_cost_id_seq; Type: SEQUENCE SET; Schema: purchasing; Owner: -
--

SELECT pg_catalog.setval('purchasing.outsourcing_cost_id_seq', 1, false);


--
-- Name: po_cost_id_seq; Type: SEQUENCE SET; Schema: purchasing; Owner: -
--

SELECT pg_catalog.setval('purchasing.po_cost_id_seq', 3, true);


--
-- Name: po_payment_actual_id_seq; Type: SEQUENCE SET; Schema: purchasing; Owner: -
--

SELECT pg_catalog.setval('purchasing.po_payment_actual_id_seq', 1, false);


--
-- Name: po_payment_request_id_seq; Type: SEQUENCE SET; Schema: purchasing; Owner: -
--

SELECT pg_catalog.setval('purchasing.po_payment_request_id_seq', 4, true);


--
-- Name: purchase_order_id_seq; Type: SEQUENCE SET; Schema: purchasing; Owner: -
--

SELECT pg_catalog.setval('purchasing.purchase_order_id_seq', 9, true);


--
-- Name: purchase_order_line_id_seq; Type: SEQUENCE SET; Schema: purchasing; Owner: -
--

SELECT pg_catalog.setval('purchasing.purchase_order_line_id_seq', 14, true);


--
-- Name: purchase_request_id_seq; Type: SEQUENCE SET; Schema: purchasing; Owner: -
--

SELECT pg_catalog.setval('purchasing.purchase_request_id_seq', 7, true);


--
-- Name: purchase_request_line_id_seq; Type: SEQUENCE SET; Schema: purchasing; Owner: -
--

SELECT pg_catalog.setval('purchasing.purchase_request_line_id_seq', 8, true);


--
-- Name: rfq_id_seq; Type: SEQUENCE SET; Schema: purchasing; Owner: -
--

SELECT pg_catalog.setval('purchasing.rfq_id_seq', 1, false);


--
-- Name: rfq_line_id_seq; Type: SEQUENCE SET; Schema: purchasing; Owner: -
--

SELECT pg_catalog.setval('purchasing.rfq_line_id_seq', 1, false);


--
-- Name: rfq_supplier_id_seq; Type: SEQUENCE SET; Schema: purchasing; Owner: -
--

SELECT pg_catalog.setval('purchasing.rfq_supplier_id_seq', 1, false);


--
-- Name: supplier_quotation_id_seq; Type: SEQUENCE SET; Schema: purchasing; Owner: -
--

SELECT pg_catalog.setval('purchasing.supplier_quotation_id_seq', 1, false);


--
-- Name: supplier_quotation_line_id_seq; Type: SEQUENCE SET; Schema: purchasing; Owner: -
--

SELECT pg_catalog.setval('purchasing.supplier_quotation_line_id_seq', 1, false);


--
-- Name: supplier_return_id_seq; Type: SEQUENCE SET; Schema: purchasing; Owner: -
--

SELECT pg_catalog.setval('purchasing.supplier_return_id_seq', 1, true);


--
-- Name: supplier_return_line_id_seq; Type: SEQUENCE SET; Schema: purchasing; Owner: -
--

SELECT pg_catalog.setval('purchasing.supplier_return_line_id_seq', 1, true);


--
-- Name: coupon_code_id_seq; Type: SEQUENCE SET; Schema: sales; Owner: -
--

SELECT pg_catalog.setval('sales.coupon_code_id_seq', 2, true);


--
-- Name: lost_reason_id_seq; Type: SEQUENCE SET; Schema: sales; Owner: -
--

SELECT pg_catalog.setval('sales.lost_reason_id_seq', 4, true);


--
-- Name: opportunity_id_seq; Type: SEQUENCE SET; Schema: sales; Owner: -
--

SELECT pg_catalog.setval('sales.opportunity_id_seq', 1, false);


--
-- Name: price_list_id_seq; Type: SEQUENCE SET; Schema: sales; Owner: -
--

SELECT pg_catalog.setval('sales.price_list_id_seq', 2, true);


--
-- Name: price_list_item_id_seq; Type: SEQUENCE SET; Schema: sales; Owner: -
--

SELECT pg_catalog.setval('sales.price_list_item_id_seq', 2, true);


--
-- Name: pricing_formula_id_seq; Type: SEQUENCE SET; Schema: sales; Owner: -
--

SELECT pg_catalog.setval('sales.pricing_formula_id_seq', 1, false);


--
-- Name: pricing_rule_id_seq; Type: SEQUENCE SET; Schema: sales; Owner: -
--

SELECT pg_catalog.setval('sales.pricing_rule_id_seq', 6, true);


--
-- Name: promotion_discount_item_id_seq; Type: SEQUENCE SET; Schema: sales; Owner: -
--

SELECT pg_catalog.setval('sales.promotion_discount_item_id_seq', 1, false);


--
-- Name: promotion_gift_item_id_seq; Type: SEQUENCE SET; Schema: sales; Owner: -
--

SELECT pg_catalog.setval('sales.promotion_gift_item_id_seq', 1, false);


--
-- Name: promotion_id_seq; Type: SEQUENCE SET; Schema: sales; Owner: -
--

SELECT pg_catalog.setval('sales.promotion_id_seq', 1, false);


--
-- Name: promotional_scheme_id_seq; Type: SEQUENCE SET; Schema: sales; Owner: -
--

SELECT pg_catalog.setval('sales.promotional_scheme_id_seq', 2, true);


--
-- Name: quotation_cost_id_seq; Type: SEQUENCE SET; Schema: sales; Owner: -
--

SELECT pg_catalog.setval('sales.quotation_cost_id_seq', 1, false);


--
-- Name: quotation_id_seq; Type: SEQUENCE SET; Schema: sales; Owner: -
--

SELECT pg_catalog.setval('sales.quotation_id_seq', 20, true);


--
-- Name: quotation_line_id_seq; Type: SEQUENCE SET; Schema: sales; Owner: -
--

SELECT pg_catalog.setval('sales.quotation_line_id_seq', 21, true);


--
-- Name: sales_allowance_id_seq; Type: SEQUENCE SET; Schema: sales; Owner: -
--

SELECT pg_catalog.setval('sales.sales_allowance_id_seq', 1, false);


--
-- Name: sales_allowance_line_id_seq; Type: SEQUENCE SET; Schema: sales; Owner: -
--

SELECT pg_catalog.setval('sales.sales_allowance_line_id_seq', 1, false);


--
-- Name: sales_order_id_seq; Type: SEQUENCE SET; Schema: sales; Owner: -
--

SELECT pg_catalog.setval('sales.sales_order_id_seq', 13, true);


--
-- Name: sales_order_line_id_seq; Type: SEQUENCE SET; Schema: sales; Owner: -
--

SELECT pg_catalog.setval('sales.sales_order_line_id_seq', 17, true);


--
-- Name: sales_target_id_seq; Type: SEQUENCE SET; Schema: sales; Owner: -
--

SELECT pg_catalog.setval('sales.sales_target_id_seq', 1, false);


--
-- Name: scheme_item_id_seq; Type: SEQUENCE SET; Schema: sales; Owner: -
--

SELECT pg_catalog.setval('sales.scheme_item_id_seq', 2, true);


--
-- Name: scheme_price_slab_id_seq; Type: SEQUENCE SET; Schema: sales; Owner: -
--

SELECT pg_catalog.setval('sales.scheme_price_slab_id_seq', 4, true);


--
-- Name: scheme_product_slab_id_seq; Type: SEQUENCE SET; Schema: sales; Owner: -
--

SELECT pg_catalog.setval('sales.scheme_product_slab_id_seq', 2, true);


--
-- Name: so_cost_id_seq; Type: SEQUENCE SET; Schema: sales; Owner: -
--

SELECT pg_catalog.setval('sales.so_cost_id_seq', 1, false);


--
-- Name: so_payment_actual_id_seq; Type: SEQUENCE SET; Schema: sales; Owner: -
--

SELECT pg_catalog.setval('sales.so_payment_actual_id_seq', 1, false);


--
-- Name: so_payment_request_id_seq; Type: SEQUENCE SET; Schema: sales; Owner: -
--

SELECT pg_catalog.setval('sales.so_payment_request_id_seq', 1, false);


--
-- Name: app_user app_user_pkey; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.app_user
    ADD CONSTRAINT app_user_pkey PRIMARY KEY (id);


--
-- Name: app_user app_user_username_key; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.app_user
    ADD CONSTRAINT app_user_username_key UNIQUE (username);


--
-- Name: approval_right approval_right_pkey; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.approval_right
    ADD CONSTRAINT approval_right_pkey PRIMARY KEY (id);


--
-- Name: approval_right approval_right_user_id_doc_type_key; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.approval_right
    ADD CONSTRAINT approval_right_user_id_doc_type_key UNIQUE (user_id, doc_type);


--
-- Name: attachment attachment_pkey; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.attachment
    ADD CONSTRAINT attachment_pkey PRIMARY KEY (id);


--
-- Name: audit_log audit_log_pkey; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id);


--
-- Name: company_info company_info_pkey; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.company_info
    ADD CONSTRAINT company_info_pkey PRIMARY KEY (id);


--
-- Name: cost_type cost_type_code_key; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.cost_type
    ADD CONSTRAINT cost_type_code_key UNIQUE (code);


--
-- Name: cost_type cost_type_pkey; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.cost_type
    ADD CONSTRAINT cost_type_pkey PRIMARY KEY (id);


--
-- Name: currency currency_pkey; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.currency
    ADD CONSTRAINT currency_pkey PRIMARY KEY (code);


--
-- Name: data_scope data_scope_pkey; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.data_scope
    ADD CONSTRAINT data_scope_pkey PRIMARY KEY (user_id, department_id);


--
-- Name: delivery_method delivery_method_code_key; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.delivery_method
    ADD CONSTRAINT delivery_method_code_key UNIQUE (code);


--
-- Name: delivery_method delivery_method_pkey; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.delivery_method
    ADD CONSTRAINT delivery_method_pkey PRIMARY KEY (id);


--
-- Name: department department_code_key; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.department
    ADD CONSTRAINT department_code_key UNIQUE (code);


--
-- Name: department department_pkey; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.department
    ADD CONSTRAINT department_pkey PRIMARY KEY (id);


--
-- Name: doc_numbering doc_numbering_doc_type_key; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.doc_numbering
    ADD CONSTRAINT doc_numbering_doc_type_key UNIQUE (doc_type);


--
-- Name: doc_numbering doc_numbering_pkey; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.doc_numbering
    ADD CONSTRAINT doc_numbering_pkey PRIMARY KEY (id);


--
-- Name: employee employee_code_key; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.employee
    ADD CONSTRAINT employee_code_key UNIQUE (code);


--
-- Name: employee employee_pkey; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.employee
    ADD CONSTRAINT employee_pkey PRIMARY KEY (id);


--
-- Name: exchange_rate exchange_rate_currency_code_rate_date_key; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.exchange_rate
    ADD CONSTRAINT exchange_rate_currency_code_rate_date_key UNIQUE (currency_code, rate_date);


--
-- Name: exchange_rate exchange_rate_pkey; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.exchange_rate
    ADD CONSTRAINT exchange_rate_pkey PRIMARY KEY (id);


--
-- Name: job_title job_title_code_key; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.job_title
    ADD CONSTRAINT job_title_code_key UNIQUE (code);


--
-- Name: job_title job_title_pkey; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.job_title
    ADD CONSTRAINT job_title_pkey PRIMARY KEY (id);


--
-- Name: note note_pkey; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.note
    ADD CONSTRAINT note_pkey PRIMARY KEY (id);


--
-- Name: partner_address partner_address_pkey; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.partner_address
    ADD CONSTRAINT partner_address_pkey PRIMARY KEY (id);


--
-- Name: partner_bank_account partner_bank_account_pkey; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.partner_bank_account
    ADD CONSTRAINT partner_bank_account_pkey PRIMARY KEY (id);


--
-- Name: partner partner_code_key; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.partner
    ADD CONSTRAINT partner_code_key UNIQUE (code);


--
-- Name: partner_contact partner_contact_pkey; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.partner_contact
    ADD CONSTRAINT partner_contact_pkey PRIMARY KEY (id);


--
-- Name: partner partner_pkey; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.partner
    ADD CONSTRAINT partner_pkey PRIMARY KEY (id);


--
-- Name: partner_sales_cost partner_sales_cost_pkey; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.partner_sales_cost
    ADD CONSTRAINT partner_sales_cost_pkey PRIMARY KEY (id);


--
-- Name: payment_method payment_method_code_key; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.payment_method
    ADD CONSTRAINT payment_method_code_key UNIQUE (code);


--
-- Name: payment_method payment_method_pkey; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.payment_method
    ADD CONSTRAINT payment_method_pkey PRIMARY KEY (id);


--
-- Name: payment_terms_template payment_terms_template_code_key; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.payment_terms_template
    ADD CONSTRAINT payment_terms_template_code_key UNIQUE (code);


--
-- Name: payment_terms_template_line payment_terms_template_line_pkey; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.payment_terms_template_line
    ADD CONSTRAINT payment_terms_template_line_pkey PRIMARY KEY (id);


--
-- Name: payment_terms_template payment_terms_template_pkey; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.payment_terms_template
    ADD CONSTRAINT payment_terms_template_pkey PRIMARY KEY (id);


--
-- Name: permission permission_grantee_type_grantee_id_subject_type_subject_cod_key; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.permission
    ADD CONSTRAINT permission_grantee_type_grantee_id_subject_type_subject_cod_key UNIQUE (grantee_type, grantee_id, subject_type, subject_code, action);


--
-- Name: permission permission_pkey; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.permission
    ADD CONSTRAINT permission_pkey PRIMARY KEY (id);


--
-- Name: process process_code_key; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.process
    ADD CONSTRAINT process_code_key UNIQUE (code);


--
-- Name: process process_pkey; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.process
    ADD CONSTRAINT process_pkey PRIMARY KEY (id);


--
-- Name: product_bom product_bom_kit_product_id_component_product_id_key; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.product_bom
    ADD CONSTRAINT product_bom_kit_product_id_component_product_id_key UNIQUE (kit_product_id, component_product_id);


--
-- Name: product_bom product_bom_pkey; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.product_bom
    ADD CONSTRAINT product_bom_pkey PRIMARY KEY (id);


--
-- Name: product product_code_key; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.product
    ADD CONSTRAINT product_code_key UNIQUE (code);


--
-- Name: product_group product_group_code_key; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.product_group
    ADD CONSTRAINT product_group_code_key UNIQUE (code);


--
-- Name: product_group product_group_pkey; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.product_group
    ADD CONSTRAINT product_group_pkey PRIMARY KEY (id);


--
-- Name: product product_pkey; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.product
    ADD CONSTRAINT product_pkey PRIMARY KEY (id);


--
-- Name: task task_pkey; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.task
    ADD CONSTRAINT task_pkey PRIMARY KEY (id);


--
-- Name: tax_charge_template tax_charge_template_code_key; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.tax_charge_template
    ADD CONSTRAINT tax_charge_template_code_key UNIQUE (code);


--
-- Name: tax_charge_template_line tax_charge_template_line_pkey; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.tax_charge_template_line
    ADD CONSTRAINT tax_charge_template_line_pkey PRIMARY KEY (id);


--
-- Name: tax_charge_template tax_charge_template_pkey; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.tax_charge_template
    ADD CONSTRAINT tax_charge_template_pkey PRIMARY KEY (id);


--
-- Name: uom uom_code_key; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.uom
    ADD CONSTRAINT uom_code_key UNIQUE (code);


--
-- Name: uom_conversion uom_conversion_from_uom_id_to_uom_id_key; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.uom_conversion
    ADD CONSTRAINT uom_conversion_from_uom_id_to_uom_id_key UNIQUE (from_uom_id, to_uom_id);


--
-- Name: uom_conversion uom_conversion_pkey; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.uom_conversion
    ADD CONSTRAINT uom_conversion_pkey PRIMARY KEY (id);


--
-- Name: uom uom_pkey; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.uom
    ADD CONSTRAINT uom_pkey PRIMARY KEY (id);


--
-- Name: user_group user_group_code_key; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.user_group
    ADD CONSTRAINT user_group_code_key UNIQUE (code);


--
-- Name: user_group_member user_group_member_pkey; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.user_group_member
    ADD CONSTRAINT user_group_member_pkey PRIMARY KEY (group_id, user_id);


--
-- Name: user_group user_group_pkey; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.user_group
    ADD CONSTRAINT user_group_pkey PRIMARY KEY (id);


--
-- Name: warehouse warehouse_code_key; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.warehouse
    ADD CONSTRAINT warehouse_code_key UNIQUE (code);


--
-- Name: warehouse_location warehouse_location_pkey; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.warehouse_location
    ADD CONSTRAINT warehouse_location_pkey PRIMARY KEY (id);


--
-- Name: warehouse_location warehouse_location_warehouse_id_code_key; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.warehouse_location
    ADD CONSTRAINT warehouse_location_warehouse_id_code_key UNIQUE (warehouse_id, code);


--
-- Name: warehouse warehouse_pkey; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.warehouse
    ADD CONSTRAINT warehouse_pkey PRIMARY KEY (id);


--
-- Name: wf_transition_log wf_transition_log_pkey; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.wf_transition_log
    ADD CONSTRAINT wf_transition_log_pkey PRIMARY KEY (id);


--
-- Name: work_position work_position_code_key; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.work_position
    ADD CONSTRAINT work_position_code_key UNIQUE (code);


--
-- Name: work_position work_position_pkey; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.work_position
    ADD CONSTRAINT work_position_pkey PRIMARY KEY (id);


--
-- Name: activity activity_pkey; Type: CONSTRAINT; Schema: crm; Owner: -
--

ALTER TABLE ONLY crm.activity
    ADD CONSTRAINT activity_pkey PRIMARY KEY (id);


--
-- Name: campaign campaign_doc_no_key; Type: CONSTRAINT; Schema: crm; Owner: -
--

ALTER TABLE ONLY crm.campaign
    ADD CONSTRAINT campaign_doc_no_key UNIQUE (doc_no);


--
-- Name: campaign campaign_pkey; Type: CONSTRAINT; Schema: crm; Owner: -
--

ALTER TABLE ONLY crm.campaign
    ADD CONSTRAINT campaign_pkey PRIMARY KEY (id);


--
-- Name: lead lead_doc_no_key; Type: CONSTRAINT; Schema: crm; Owner: -
--

ALTER TABLE ONLY crm.lead
    ADD CONSTRAINT lead_doc_no_key UNIQUE (doc_no);


--
-- Name: lead lead_pkey; Type: CONSTRAINT; Schema: crm; Owner: -
--

ALTER TABLE ONLY crm.lead
    ADD CONSTRAINT lead_pkey PRIMARY KEY (id);


--
-- Name: lead_source lead_source_code_key; Type: CONSTRAINT; Schema: crm; Owner: -
--

ALTER TABLE ONLY crm.lead_source
    ADD CONSTRAINT lead_source_code_key UNIQUE (code);


--
-- Name: lead_source lead_source_pkey; Type: CONSTRAINT; Schema: crm; Owner: -
--

ALTER TABLE ONLY crm.lead_source
    ADD CONSTRAINT lead_source_pkey PRIMARY KEY (id);


--
-- Name: opportunity opportunity_doc_no_key; Type: CONSTRAINT; Schema: crm; Owner: -
--

ALTER TABLE ONLY crm.opportunity
    ADD CONSTRAINT opportunity_doc_no_key UNIQUE (doc_no);


--
-- Name: opportunity_line opportunity_line_pkey; Type: CONSTRAINT; Schema: crm; Owner: -
--

ALTER TABLE ONLY crm.opportunity_line
    ADD CONSTRAINT opportunity_line_pkey PRIMARY KEY (id);


--
-- Name: opportunity opportunity_pkey; Type: CONSTRAINT; Schema: crm; Owner: -
--

ALTER TABLE ONLY crm.opportunity
    ADD CONSTRAINT opportunity_pkey PRIMARY KEY (id);


--
-- Name: sales_stage sales_stage_code_key; Type: CONSTRAINT; Schema: crm; Owner: -
--

ALTER TABLE ONLY crm.sales_stage
    ADD CONSTRAINT sales_stage_code_key UNIQUE (code);


--
-- Name: sales_stage sales_stage_pkey; Type: CONSTRAINT; Schema: crm; Owner: -
--

ALTER TABLE ONLY crm.sales_stage
    ADD CONSTRAINT sales_stage_pkey PRIMARY KEY (id);


--
-- Name: account account_code_key; Type: CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.account
    ADD CONSTRAINT account_code_key UNIQUE (code);


--
-- Name: account account_pkey; Type: CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.account
    ADD CONSTRAINT account_pkey PRIMARY KEY (id);


--
-- Name: accounting_policy accounting_policy_pkey; Type: CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.accounting_policy
    ADD CONSTRAINT accounting_policy_pkey PRIMARY KEY (id);


--
-- Name: asset_alloc_rule asset_alloc_rule_pkey; Type: CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.asset_alloc_rule
    ADD CONSTRAINT asset_alloc_rule_pkey PRIMARY KEY (id);


--
-- Name: asset_group asset_group_code_key; Type: CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.asset_group
    ADD CONSTRAINT asset_group_code_key UNIQUE (code);


--
-- Name: asset_group asset_group_pkey; Type: CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.asset_group
    ADD CONSTRAINT asset_group_pkey PRIMARY KEY (id);


--
-- Name: asset_report asset_report_pkey; Type: CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.asset_report
    ADD CONSTRAINT asset_report_pkey PRIMARY KEY (id);


--
-- Name: bank_fee bank_fee_pkey; Type: CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.bank_fee
    ADD CONSTRAINT bank_fee_pkey PRIMARY KEY (id);


--
-- Name: business_operation business_operation_code_key; Type: CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.business_operation
    ADD CONSTRAINT business_operation_code_key UNIQUE (code);


--
-- Name: business_operation business_operation_pkey; Type: CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.business_operation
    ADD CONSTRAINT business_operation_pkey PRIMARY KEY (id);


--
-- Name: cash_fund cash_fund_code_key; Type: CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.cash_fund
    ADD CONSTRAINT cash_fund_code_key UNIQUE (code);


--
-- Name: cash_fund cash_fund_pkey; Type: CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.cash_fund
    ADD CONSTRAINT cash_fund_pkey PRIMARY KEY (id);


--
-- Name: cit_declaration cit_declaration_pkey; Type: CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.cit_declaration
    ADD CONSTRAINT cit_declaration_pkey PRIMARY KEY (id);


--
-- Name: cost_center cost_center_code_key; Type: CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.cost_center
    ADD CONSTRAINT cost_center_code_key UNIQUE (code);


--
-- Name: cost_center cost_center_pkey; Type: CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.cost_center
    ADD CONSTRAINT cost_center_pkey PRIMARY KEY (id);


--
-- Name: costing_object costing_object_pkey; Type: CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.costing_object
    ADD CONSTRAINT costing_object_pkey PRIMARY KEY (id);


--
-- Name: costing_object costing_object_process_id_period_id_key; Type: CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.costing_object
    ADD CONSTRAINT costing_object_process_id_period_id_key UNIQUE (process_id, period_id);


--
-- Name: depreciation_entry depreciation_entry_asset_id_period_id_key; Type: CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.depreciation_entry
    ADD CONSTRAINT depreciation_entry_asset_id_period_id_key UNIQUE (asset_id, period_id);


--
-- Name: depreciation_entry depreciation_entry_pkey; Type: CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.depreciation_entry
    ADD CONSTRAINT depreciation_entry_pkey PRIMARY KEY (id);


--
-- Name: fiscal_period fiscal_period_fiscal_year_period_no_key; Type: CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.fiscal_period
    ADD CONSTRAINT fiscal_period_fiscal_year_period_no_key UNIQUE (fiscal_year, period_no);


--
-- Name: fiscal_period fiscal_period_pkey; Type: CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.fiscal_period
    ADD CONSTRAINT fiscal_period_pkey PRIMARY KEY (id);


--
-- Name: fixed_asset fixed_asset_code_key; Type: CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.fixed_asset
    ADD CONSTRAINT fixed_asset_code_key UNIQUE (code);


--
-- Name: fixed_asset fixed_asset_pkey; Type: CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.fixed_asset
    ADD CONSTRAINT fixed_asset_pkey PRIMARY KEY (id);


--
-- Name: fs_mapping fs_mapping_pkey; Type: CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.fs_mapping
    ADD CONSTRAINT fs_mapping_pkey PRIMARY KEY (id);


--
-- Name: fs_mapping fs_mapping_statement_item_code_key; Type: CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.fs_mapping
    ADD CONSTRAINT fs_mapping_statement_item_code_key UNIQUE (statement, item_code);


--
-- Name: gl_entry gl_entry_pkey; Type: CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.gl_entry
    ADD CONSTRAINT gl_entry_pkey PRIMARY KEY (id);


--
-- Name: lerp_voucher lerp_voucher_pkey; Type: CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.lerp_voucher
    ADD CONSTRAINT lerp_voucher_pkey PRIMARY KEY (id);


--
-- Name: lerp_voucher lerp_voucher_source_table_source_id_voucher_type_key; Type: CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.lerp_voucher
    ADD CONSTRAINT lerp_voucher_source_table_source_id_voucher_type_key UNIQUE (source_table, source_id, voucher_type);


--
-- Name: object_category object_category_code_key; Type: CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.object_category
    ADD CONSTRAINT object_category_code_key UNIQUE (code);


--
-- Name: object_category object_category_pkey; Type: CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.object_category
    ADD CONSTRAINT object_category_pkey PRIMARY KEY (id);


--
-- Name: opening_balance opening_balance_pkey; Type: CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.opening_balance
    ADD CONSTRAINT opening_balance_pkey PRIMARY KEY (id);


--
-- Name: outbox_event outbox_event_pkey; Type: CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.outbox_event
    ADD CONSTRAINT outbox_event_pkey PRIMARY KEY (id);


--
-- Name: payment_allocation payment_allocation_pkey; Type: CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.payment_allocation
    ADD CONSTRAINT payment_allocation_pkey PRIMARY KEY (id);


--
-- Name: period_closing period_closing_period_id_step_key; Type: CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.period_closing
    ADD CONSTRAINT period_closing_period_id_step_key UNIQUE (period_id, step);


--
-- Name: period_closing period_closing_pkey; Type: CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.period_closing
    ADD CONSTRAINT period_closing_pkey PRIMARY KEY (id);


--
-- Name: prepaid_alloc_entry prepaid_alloc_entry_card_id_period_id_key; Type: CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.prepaid_alloc_entry
    ADD CONSTRAINT prepaid_alloc_entry_card_id_period_id_key UNIQUE (card_id, period_id);


--
-- Name: prepaid_alloc_entry prepaid_alloc_entry_pkey; Type: CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.prepaid_alloc_entry
    ADD CONSTRAINT prepaid_alloc_entry_pkey PRIMARY KEY (id);


--
-- Name: prepaid_alloc_rule prepaid_alloc_rule_pkey; Type: CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.prepaid_alloc_rule
    ADD CONSTRAINT prepaid_alloc_rule_pkey PRIMARY KEY (id);


--
-- Name: prepaid_card prepaid_card_pkey; Type: CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.prepaid_card
    ADD CONSTRAINT prepaid_card_pkey PRIMARY KEY (id);


--
-- Name: prepaid_expense prepaid_expense_code_key; Type: CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.prepaid_expense
    ADD CONSTRAINT prepaid_expense_code_key UNIQUE (code);


--
-- Name: prepaid_expense prepaid_expense_pkey; Type: CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.prepaid_expense
    ADD CONSTRAINT prepaid_expense_pkey PRIMARY KEY (id);


--
-- Name: vat_deduction vat_deduction_period_id_key; Type: CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.vat_deduction
    ADD CONSTRAINT vat_deduction_period_id_key UNIQUE (period_id);


--
-- Name: vat_deduction vat_deduction_pkey; Type: CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.vat_deduction
    ADD CONSTRAINT vat_deduction_pkey PRIMARY KEY (id);


--
-- Name: vat_invoice vat_invoice_direction_invoice_no_invoice_serial_partner_tax_key; Type: CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.vat_invoice
    ADD CONSTRAINT vat_invoice_direction_invoice_no_invoice_serial_partner_tax_key UNIQUE (direction, invoice_no, invoice_serial, partner_tax_code);


--
-- Name: vat_invoice vat_invoice_pkey; Type: CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.vat_invoice
    ADD CONSTRAINT vat_invoice_pkey PRIMARY KEY (id);


--
-- Name: voucher_line voucher_line_pkey; Type: CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.voucher_line
    ADD CONSTRAINT voucher_line_pkey PRIMARY KEY (id);


--
-- Name: voucher voucher_pkey; Type: CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.voucher
    ADD CONSTRAINT voucher_pkey PRIMARY KEY (id);


--
-- Name: voucher voucher_voucher_type_doc_no_key; Type: CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.voucher
    ADD CONSTRAINT voucher_voucher_type_doc_no_key UNIQUE (voucher_type, doc_no);


--
-- Name: aggregatedcounter aggregatedcounter_key_key; Type: CONSTRAINT; Schema: hangfire; Owner: -
--

ALTER TABLE ONLY hangfire.aggregatedcounter
    ADD CONSTRAINT aggregatedcounter_key_key UNIQUE (key);


--
-- Name: aggregatedcounter aggregatedcounter_pkey; Type: CONSTRAINT; Schema: hangfire; Owner: -
--

ALTER TABLE ONLY hangfire.aggregatedcounter
    ADD CONSTRAINT aggregatedcounter_pkey PRIMARY KEY (id);


--
-- Name: counter counter_pkey; Type: CONSTRAINT; Schema: hangfire; Owner: -
--

ALTER TABLE ONLY hangfire.counter
    ADD CONSTRAINT counter_pkey PRIMARY KEY (id);


--
-- Name: hash hash_key_field_key; Type: CONSTRAINT; Schema: hangfire; Owner: -
--

ALTER TABLE ONLY hangfire.hash
    ADD CONSTRAINT hash_key_field_key UNIQUE (key, field);


--
-- Name: hash hash_pkey; Type: CONSTRAINT; Schema: hangfire; Owner: -
--

ALTER TABLE ONLY hangfire.hash
    ADD CONSTRAINT hash_pkey PRIMARY KEY (id);


--
-- Name: job job_pkey; Type: CONSTRAINT; Schema: hangfire; Owner: -
--

ALTER TABLE ONLY hangfire.job
    ADD CONSTRAINT job_pkey PRIMARY KEY (id);


--
-- Name: jobparameter jobparameter_pkey; Type: CONSTRAINT; Schema: hangfire; Owner: -
--

ALTER TABLE ONLY hangfire.jobparameter
    ADD CONSTRAINT jobparameter_pkey PRIMARY KEY (id);


--
-- Name: jobqueue jobqueue_pkey; Type: CONSTRAINT; Schema: hangfire; Owner: -
--

ALTER TABLE ONLY hangfire.jobqueue
    ADD CONSTRAINT jobqueue_pkey PRIMARY KEY (id);


--
-- Name: list list_pkey; Type: CONSTRAINT; Schema: hangfire; Owner: -
--

ALTER TABLE ONLY hangfire.list
    ADD CONSTRAINT list_pkey PRIMARY KEY (id);


--
-- Name: lock lock_resource_key; Type: CONSTRAINT; Schema: hangfire; Owner: -
--

ALTER TABLE ONLY hangfire.lock
    ADD CONSTRAINT lock_resource_key UNIQUE (resource);

ALTER TABLE ONLY hangfire.lock REPLICA IDENTITY USING INDEX lock_resource_key;


--
-- Name: schema schema_pkey; Type: CONSTRAINT; Schema: hangfire; Owner: -
--

ALTER TABLE ONLY hangfire.schema
    ADD CONSTRAINT schema_pkey PRIMARY KEY (version);


--
-- Name: server server_pkey; Type: CONSTRAINT; Schema: hangfire; Owner: -
--

ALTER TABLE ONLY hangfire.server
    ADD CONSTRAINT server_pkey PRIMARY KEY (id);


--
-- Name: set set_key_value_key; Type: CONSTRAINT; Schema: hangfire; Owner: -
--

ALTER TABLE ONLY hangfire.set
    ADD CONSTRAINT set_key_value_key UNIQUE (key, value);


--
-- Name: set set_pkey; Type: CONSTRAINT; Schema: hangfire; Owner: -
--

ALTER TABLE ONLY hangfire.set
    ADD CONSTRAINT set_pkey PRIMARY KEY (id);


--
-- Name: state state_pkey; Type: CONSTRAINT; Schema: hangfire; Owner: -
--

ALTER TABLE ONLY hangfire.state
    ADD CONSTRAINT state_pkey PRIMARY KEY (id);


--
-- Name: delivery_plan delivery_plan_pkey; Type: CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.delivery_plan
    ADD CONSTRAINT delivery_plan_pkey PRIMARY KEY (id);


--
-- Name: gr_cost gr_cost_pkey; Type: CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.gr_cost
    ADD CONSTRAINT gr_cost_pkey PRIMARY KEY (id);


--
-- Name: lot lot_lot_no_product_id_key; Type: CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.lot
    ADD CONSTRAINT lot_lot_no_product_id_key UNIQUE (lot_no, product_id);


--
-- Name: lot lot_pkey; Type: CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.lot
    ADD CONSTRAINT lot_pkey PRIMARY KEY (id);


--
-- Name: packing_line packing_line_pkey; Type: CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.packing_line
    ADD CONSTRAINT packing_line_pkey PRIMARY KEY (id);


--
-- Name: stock_doc stock_doc_doc_no_key; Type: CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.stock_doc
    ADD CONSTRAINT stock_doc_doc_no_key UNIQUE (doc_no);


--
-- Name: stock_doc_line stock_doc_line_pkey; Type: CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.stock_doc_line
    ADD CONSTRAINT stock_doc_line_pkey PRIMARY KEY (id);


--
-- Name: stock_doc stock_doc_pkey; Type: CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.stock_doc
    ADD CONSTRAINT stock_doc_pkey PRIMARY KEY (id);


--
-- Name: stock_move stock_move_pkey; Type: CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.stock_move
    ADD CONSTRAINT stock_move_pkey PRIMARY KEY (id);


--
-- Name: stock_reconciliation_line stock_reconciliation_line_pkey; Type: CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.stock_reconciliation_line
    ADD CONSTRAINT stock_reconciliation_line_pkey PRIMARY KEY (id);


--
-- Name: stock_reconciliation stock_reconciliation_pkey; Type: CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.stock_reconciliation
    ADD CONSTRAINT stock_reconciliation_pkey PRIMARY KEY (id);


--
-- Name: bom bom_doc_no_key; Type: CONSTRAINT; Schema: mfg; Owner: -
--

ALTER TABLE ONLY mfg.bom
    ADD CONSTRAINT bom_doc_no_key UNIQUE (doc_no);


--
-- Name: bom_item bom_item_pkey; Type: CONSTRAINT; Schema: mfg; Owner: -
--

ALTER TABLE ONLY mfg.bom_item
    ADD CONSTRAINT bom_item_pkey PRIMARY KEY (id);


--
-- Name: bom_operation bom_operation_pkey; Type: CONSTRAINT; Schema: mfg; Owner: -
--

ALTER TABLE ONLY mfg.bom_operation
    ADD CONSTRAINT bom_operation_pkey PRIMARY KEY (id);


--
-- Name: bom bom_pkey; Type: CONSTRAINT; Schema: mfg; Owner: -
--

ALTER TABLE ONLY mfg.bom
    ADD CONSTRAINT bom_pkey PRIMARY KEY (id);


--
-- Name: bom_scrap bom_scrap_pkey; Type: CONSTRAINT; Schema: mfg; Owner: -
--

ALTER TABLE ONLY mfg.bom_scrap
    ADD CONSTRAINT bom_scrap_pkey PRIMARY KEY (id);


--
-- Name: job_card job_card_pkey; Type: CONSTRAINT; Schema: mfg; Owner: -
--

ALTER TABLE ONLY mfg.job_card
    ADD CONSTRAINT job_card_pkey PRIMARY KEY (id);


--
-- Name: operation operation_code_key; Type: CONSTRAINT; Schema: mfg; Owner: -
--

ALTER TABLE ONLY mfg.operation
    ADD CONSTRAINT operation_code_key UNIQUE (code);


--
-- Name: operation operation_pkey; Type: CONSTRAINT; Schema: mfg; Owner: -
--

ALTER TABLE ONLY mfg.operation
    ADD CONSTRAINT operation_pkey PRIMARY KEY (id);


--
-- Name: pp_item pp_item_pkey; Type: CONSTRAINT; Schema: mfg; Owner: -
--

ALTER TABLE ONLY mfg.pp_item
    ADD CONSTRAINT pp_item_pkey PRIMARY KEY (id);


--
-- Name: pp_material pp_material_pkey; Type: CONSTRAINT; Schema: mfg; Owner: -
--

ALTER TABLE ONLY mfg.pp_material
    ADD CONSTRAINT pp_material_pkey PRIMARY KEY (id);


--
-- Name: pp_so pp_so_pkey; Type: CONSTRAINT; Schema: mfg; Owner: -
--

ALTER TABLE ONLY mfg.pp_so
    ADD CONSTRAINT pp_so_pkey PRIMARY KEY (production_plan_id, sales_order_id);


--
-- Name: production_plan production_plan_doc_no_key; Type: CONSTRAINT; Schema: mfg; Owner: -
--

ALTER TABLE ONLY mfg.production_plan
    ADD CONSTRAINT production_plan_doc_no_key UNIQUE (doc_no);


--
-- Name: production_plan production_plan_pkey; Type: CONSTRAINT; Schema: mfg; Owner: -
--

ALTER TABLE ONLY mfg.production_plan
    ADD CONSTRAINT production_plan_pkey PRIMARY KEY (id);


--
-- Name: wo_finish_batch wo_finish_batch_pkey; Type: CONSTRAINT; Schema: mfg; Owner: -
--

ALTER TABLE ONLY mfg.wo_finish_batch
    ADD CONSTRAINT wo_finish_batch_pkey PRIMARY KEY (id);


--
-- Name: wo_item wo_item_pkey; Type: CONSTRAINT; Schema: mfg; Owner: -
--

ALTER TABLE ONLY mfg.wo_item
    ADD CONSTRAINT wo_item_pkey PRIMARY KEY (id);


--
-- Name: wo_operation wo_operation_pkey; Type: CONSTRAINT; Schema: mfg; Owner: -
--

ALTER TABLE ONLY mfg.wo_operation
    ADD CONSTRAINT wo_operation_pkey PRIMARY KEY (id);


--
-- Name: work_order work_order_doc_no_key; Type: CONSTRAINT; Schema: mfg; Owner: -
--

ALTER TABLE ONLY mfg.work_order
    ADD CONSTRAINT work_order_doc_no_key UNIQUE (doc_no);


--
-- Name: work_order work_order_pkey; Type: CONSTRAINT; Schema: mfg; Owner: -
--

ALTER TABLE ONLY mfg.work_order
    ADD CONSTRAINT work_order_pkey PRIMARY KEY (id);


--
-- Name: workstation workstation_code_key; Type: CONSTRAINT; Schema: mfg; Owner: -
--

ALTER TABLE ONLY mfg.workstation
    ADD CONSTRAINT workstation_code_key UNIQUE (code);


--
-- Name: workstation workstation_pkey; Type: CONSTRAINT; Schema: mfg; Owner: -
--

ALTER TABLE ONLY mfg.workstation
    ADD CONSTRAINT workstation_pkey PRIMARY KEY (id);


--
-- Name: landed_cost_receipt landed_cost_receipt_pkey; Type: CONSTRAINT; Schema: purchasing; Owner: -
--

ALTER TABLE ONLY purchasing.landed_cost_receipt
    ADD CONSTRAINT landed_cost_receipt_pkey PRIMARY KEY (id);


--
-- Name: landed_cost_voucher_line landed_cost_voucher_line_pkey; Type: CONSTRAINT; Schema: purchasing; Owner: -
--

ALTER TABLE ONLY purchasing.landed_cost_voucher_line
    ADD CONSTRAINT landed_cost_voucher_line_pkey PRIMARY KEY (id);


--
-- Name: landed_cost_voucher landed_cost_voucher_pkey; Type: CONSTRAINT; Schema: purchasing; Owner: -
--

ALTER TABLE ONLY purchasing.landed_cost_voucher
    ADD CONSTRAINT landed_cost_voucher_pkey PRIMARY KEY (id);


--
-- Name: outsourcing_cost outsourcing_cost_pkey; Type: CONSTRAINT; Schema: purchasing; Owner: -
--

ALTER TABLE ONLY purchasing.outsourcing_cost
    ADD CONSTRAINT outsourcing_cost_pkey PRIMARY KEY (id);


--
-- Name: po_cost po_cost_pkey; Type: CONSTRAINT; Schema: purchasing; Owner: -
--

ALTER TABLE ONLY purchasing.po_cost
    ADD CONSTRAINT po_cost_pkey PRIMARY KEY (id);


--
-- Name: po_payment_actual po_payment_actual_pkey; Type: CONSTRAINT; Schema: purchasing; Owner: -
--

ALTER TABLE ONLY purchasing.po_payment_actual
    ADD CONSTRAINT po_payment_actual_pkey PRIMARY KEY (id);


--
-- Name: po_payment_request po_payment_request_pkey; Type: CONSTRAINT; Schema: purchasing; Owner: -
--

ALTER TABLE ONLY purchasing.po_payment_request
    ADD CONSTRAINT po_payment_request_pkey PRIMARY KEY (id);


--
-- Name: purchase_order purchase_order_doc_no_key; Type: CONSTRAINT; Schema: purchasing; Owner: -
--

ALTER TABLE ONLY purchasing.purchase_order
    ADD CONSTRAINT purchase_order_doc_no_key UNIQUE (doc_no);


--
-- Name: purchase_order_line purchase_order_line_pkey; Type: CONSTRAINT; Schema: purchasing; Owner: -
--

ALTER TABLE ONLY purchasing.purchase_order_line
    ADD CONSTRAINT purchase_order_line_pkey PRIMARY KEY (id);


--
-- Name: purchase_order purchase_order_pkey; Type: CONSTRAINT; Schema: purchasing; Owner: -
--

ALTER TABLE ONLY purchasing.purchase_order
    ADD CONSTRAINT purchase_order_pkey PRIMARY KEY (id);


--
-- Name: purchase_request purchase_request_doc_no_key; Type: CONSTRAINT; Schema: purchasing; Owner: -
--

ALTER TABLE ONLY purchasing.purchase_request
    ADD CONSTRAINT purchase_request_doc_no_key UNIQUE (doc_no);


--
-- Name: purchase_request_line purchase_request_line_pkey; Type: CONSTRAINT; Schema: purchasing; Owner: -
--

ALTER TABLE ONLY purchasing.purchase_request_line
    ADD CONSTRAINT purchase_request_line_pkey PRIMARY KEY (id);


--
-- Name: purchase_request purchase_request_pkey; Type: CONSTRAINT; Schema: purchasing; Owner: -
--

ALTER TABLE ONLY purchasing.purchase_request
    ADD CONSTRAINT purchase_request_pkey PRIMARY KEY (id);


--
-- Name: rfq_line rfq_line_pkey; Type: CONSTRAINT; Schema: purchasing; Owner: -
--

ALTER TABLE ONLY purchasing.rfq_line
    ADD CONSTRAINT rfq_line_pkey PRIMARY KEY (id);


--
-- Name: rfq rfq_pkey; Type: CONSTRAINT; Schema: purchasing; Owner: -
--

ALTER TABLE ONLY purchasing.rfq
    ADD CONSTRAINT rfq_pkey PRIMARY KEY (id);


--
-- Name: rfq_supplier rfq_supplier_pkey; Type: CONSTRAINT; Schema: purchasing; Owner: -
--

ALTER TABLE ONLY purchasing.rfq_supplier
    ADD CONSTRAINT rfq_supplier_pkey PRIMARY KEY (id);


--
-- Name: supplier_quotation_line supplier_quotation_line_pkey; Type: CONSTRAINT; Schema: purchasing; Owner: -
--

ALTER TABLE ONLY purchasing.supplier_quotation_line
    ADD CONSTRAINT supplier_quotation_line_pkey PRIMARY KEY (id);


--
-- Name: supplier_quotation supplier_quotation_pkey; Type: CONSTRAINT; Schema: purchasing; Owner: -
--

ALTER TABLE ONLY purchasing.supplier_quotation
    ADD CONSTRAINT supplier_quotation_pkey PRIMARY KEY (id);


--
-- Name: supplier_return supplier_return_doc_no_key; Type: CONSTRAINT; Schema: purchasing; Owner: -
--

ALTER TABLE ONLY purchasing.supplier_return
    ADD CONSTRAINT supplier_return_doc_no_key UNIQUE (doc_no);


--
-- Name: supplier_return_line supplier_return_line_pkey; Type: CONSTRAINT; Schema: purchasing; Owner: -
--

ALTER TABLE ONLY purchasing.supplier_return_line
    ADD CONSTRAINT supplier_return_line_pkey PRIMARY KEY (id);


--
-- Name: supplier_return supplier_return_pkey; Type: CONSTRAINT; Schema: purchasing; Owner: -
--

ALTER TABLE ONLY purchasing.supplier_return
    ADD CONSTRAINT supplier_return_pkey PRIMARY KEY (id);


--
-- Name: coupon_code coupon_code_code_key; Type: CONSTRAINT; Schema: sales; Owner: -
--

ALTER TABLE ONLY sales.coupon_code
    ADD CONSTRAINT coupon_code_code_key UNIQUE (code);


--
-- Name: coupon_code coupon_code_pkey; Type: CONSTRAINT; Schema: sales; Owner: -
--

ALTER TABLE ONLY sales.coupon_code
    ADD CONSTRAINT coupon_code_pkey PRIMARY KEY (id);


--
-- Name: lost_reason lost_reason_code_key; Type: CONSTRAINT; Schema: sales; Owner: -
--

ALTER TABLE ONLY sales.lost_reason
    ADD CONSTRAINT lost_reason_code_key UNIQUE (code);


--
-- Name: lost_reason lost_reason_pkey; Type: CONSTRAINT; Schema: sales; Owner: -
--

ALTER TABLE ONLY sales.lost_reason
    ADD CONSTRAINT lost_reason_pkey PRIMARY KEY (id);


--
-- Name: opportunity opportunity_code_key; Type: CONSTRAINT; Schema: sales; Owner: -
--

ALTER TABLE ONLY sales.opportunity
    ADD CONSTRAINT opportunity_code_key UNIQUE (code);


--
-- Name: opportunity opportunity_pkey; Type: CONSTRAINT; Schema: sales; Owner: -
--

ALTER TABLE ONLY sales.opportunity
    ADD CONSTRAINT opportunity_pkey PRIMARY KEY (id);


--
-- Name: price_list price_list_code_key; Type: CONSTRAINT; Schema: sales; Owner: -
--

ALTER TABLE ONLY sales.price_list
    ADD CONSTRAINT price_list_code_key UNIQUE (code);


--
-- Name: price_list_item price_list_item_pkey; Type: CONSTRAINT; Schema: sales; Owner: -
--

ALTER TABLE ONLY sales.price_list_item
    ADD CONSTRAINT price_list_item_pkey PRIMARY KEY (id);


--
-- Name: price_list_item price_list_item_price_list_id_product_id_key; Type: CONSTRAINT; Schema: sales; Owner: -
--

ALTER TABLE ONLY sales.price_list_item
    ADD CONSTRAINT price_list_item_price_list_id_product_id_key UNIQUE (price_list_id, product_id);


--
-- Name: price_list price_list_pkey; Type: CONSTRAINT; Schema: sales; Owner: -
--

ALTER TABLE ONLY sales.price_list
    ADD CONSTRAINT price_list_pkey PRIMARY KEY (id);


--
-- Name: pricing_formula pricing_formula_pkey; Type: CONSTRAINT; Schema: sales; Owner: -
--

ALTER TABLE ONLY sales.pricing_formula
    ADD CONSTRAINT pricing_formula_pkey PRIMARY KEY (id);


--
-- Name: pricing_rule pricing_rule_pkey; Type: CONSTRAINT; Schema: sales; Owner: -
--

ALTER TABLE ONLY sales.pricing_rule
    ADD CONSTRAINT pricing_rule_pkey PRIMARY KEY (id);


--
-- Name: promotion promotion_code_key; Type: CONSTRAINT; Schema: sales; Owner: -
--

ALTER TABLE ONLY sales.promotion
    ADD CONSTRAINT promotion_code_key UNIQUE (code);


--
-- Name: promotion_discount_item promotion_discount_item_pkey; Type: CONSTRAINT; Schema: sales; Owner: -
--

ALTER TABLE ONLY sales.promotion_discount_item
    ADD CONSTRAINT promotion_discount_item_pkey PRIMARY KEY (id);


--
-- Name: promotion_gift_item promotion_gift_item_pkey; Type: CONSTRAINT; Schema: sales; Owner: -
--

ALTER TABLE ONLY sales.promotion_gift_item
    ADD CONSTRAINT promotion_gift_item_pkey PRIMARY KEY (id);


--
-- Name: promotion promotion_pkey; Type: CONSTRAINT; Schema: sales; Owner: -
--

ALTER TABLE ONLY sales.promotion
    ADD CONSTRAINT promotion_pkey PRIMARY KEY (id);


--
-- Name: promotional_scheme promotional_scheme_code_key; Type: CONSTRAINT; Schema: sales; Owner: -
--

ALTER TABLE ONLY sales.promotional_scheme
    ADD CONSTRAINT promotional_scheme_code_key UNIQUE (code);


--
-- Name: promotional_scheme promotional_scheme_pkey; Type: CONSTRAINT; Schema: sales; Owner: -
--

ALTER TABLE ONLY sales.promotional_scheme
    ADD CONSTRAINT promotional_scheme_pkey PRIMARY KEY (id);


--
-- Name: quotation_cost quotation_cost_pkey; Type: CONSTRAINT; Schema: sales; Owner: -
--

ALTER TABLE ONLY sales.quotation_cost
    ADD CONSTRAINT quotation_cost_pkey PRIMARY KEY (id);


--
-- Name: quotation quotation_doc_no_key; Type: CONSTRAINT; Schema: sales; Owner: -
--

ALTER TABLE ONLY sales.quotation
    ADD CONSTRAINT quotation_doc_no_key UNIQUE (doc_no);


--
-- Name: quotation_line quotation_line_pkey; Type: CONSTRAINT; Schema: sales; Owner: -
--

ALTER TABLE ONLY sales.quotation_line
    ADD CONSTRAINT quotation_line_pkey PRIMARY KEY (id);


--
-- Name: quotation quotation_pkey; Type: CONSTRAINT; Schema: sales; Owner: -
--

ALTER TABLE ONLY sales.quotation
    ADD CONSTRAINT quotation_pkey PRIMARY KEY (id);


--
-- Name: sales_allowance sales_allowance_doc_no_key; Type: CONSTRAINT; Schema: sales; Owner: -
--

ALTER TABLE ONLY sales.sales_allowance
    ADD CONSTRAINT sales_allowance_doc_no_key UNIQUE (doc_no);


--
-- Name: sales_allowance_line sales_allowance_line_pkey; Type: CONSTRAINT; Schema: sales; Owner: -
--

ALTER TABLE ONLY sales.sales_allowance_line
    ADD CONSTRAINT sales_allowance_line_pkey PRIMARY KEY (id);


--
-- Name: sales_allowance sales_allowance_pkey; Type: CONSTRAINT; Schema: sales; Owner: -
--

ALTER TABLE ONLY sales.sales_allowance
    ADD CONSTRAINT sales_allowance_pkey PRIMARY KEY (id);


--
-- Name: sales_order sales_order_doc_no_key; Type: CONSTRAINT; Schema: sales; Owner: -
--

ALTER TABLE ONLY sales.sales_order
    ADD CONSTRAINT sales_order_doc_no_key UNIQUE (doc_no);


--
-- Name: sales_order_line sales_order_line_pkey; Type: CONSTRAINT; Schema: sales; Owner: -
--

ALTER TABLE ONLY sales.sales_order_line
    ADD CONSTRAINT sales_order_line_pkey PRIMARY KEY (id);


--
-- Name: sales_order sales_order_pkey; Type: CONSTRAINT; Schema: sales; Owner: -
--

ALTER TABLE ONLY sales.sales_order
    ADD CONSTRAINT sales_order_pkey PRIMARY KEY (id);


--
-- Name: sales_target sales_target_employee_id_period_key; Type: CONSTRAINT; Schema: sales; Owner: -
--

ALTER TABLE ONLY sales.sales_target
    ADD CONSTRAINT sales_target_employee_id_period_key UNIQUE (employee_id, period);


--
-- Name: sales_target sales_target_pkey; Type: CONSTRAINT; Schema: sales; Owner: -
--

ALTER TABLE ONLY sales.sales_target
    ADD CONSTRAINT sales_target_pkey PRIMARY KEY (id);


--
-- Name: scheme_item scheme_item_pkey; Type: CONSTRAINT; Schema: sales; Owner: -
--

ALTER TABLE ONLY sales.scheme_item
    ADD CONSTRAINT scheme_item_pkey PRIMARY KEY (id);


--
-- Name: scheme_price_slab scheme_price_slab_pkey; Type: CONSTRAINT; Schema: sales; Owner: -
--

ALTER TABLE ONLY sales.scheme_price_slab
    ADD CONSTRAINT scheme_price_slab_pkey PRIMARY KEY (id);


--
-- Name: scheme_product_slab scheme_product_slab_pkey; Type: CONSTRAINT; Schema: sales; Owner: -
--

ALTER TABLE ONLY sales.scheme_product_slab
    ADD CONSTRAINT scheme_product_slab_pkey PRIMARY KEY (id);


--
-- Name: so_cost so_cost_pkey; Type: CONSTRAINT; Schema: sales; Owner: -
--

ALTER TABLE ONLY sales.so_cost
    ADD CONSTRAINT so_cost_pkey PRIMARY KEY (id);


--
-- Name: so_payment_actual so_payment_actual_pkey; Type: CONSTRAINT; Schema: sales; Owner: -
--

ALTER TABLE ONLY sales.so_payment_actual
    ADD CONSTRAINT so_payment_actual_pkey PRIMARY KEY (id);


--
-- Name: so_payment_request so_payment_request_pkey; Type: CONSTRAINT; Schema: sales; Owner: -
--

ALTER TABLE ONLY sales.so_payment_request
    ADD CONSTRAINT so_payment_request_pkey PRIMARY KEY (id);


--
-- Name: so_promotion so_promotion_pkey; Type: CONSTRAINT; Schema: sales; Owner: -
--

ALTER TABLE ONLY sales.so_promotion
    ADD CONSTRAINT so_promotion_pkey PRIMARY KEY (order_id, promotion_id);


--
-- Name: idx_attachment_ref; Type: INDEX; Schema: core; Owner: -
--

CREATE INDEX idx_attachment_ref ON core.attachment USING btree (ref_table, ref_id);


--
-- Name: idx_wf_log_ref; Type: INDEX; Schema: core; Owner: -
--

CREATE INDEX idx_wf_log_ref ON core.wf_transition_log USING btree (ref_table, ref_id);


--
-- Name: idx_gl_acct_period; Type: INDEX; Schema: finance; Owner: -
--

CREATE INDEX idx_gl_acct_period ON finance.gl_entry USING btree (account_id, period_id);


--
-- Name: idx_gl_object; Type: INDEX; Schema: finance; Owner: -
--

CREATE INDEX idx_gl_object ON finance.gl_entry USING btree (object_type, object_id);


--
-- Name: idx_outbox_unprocessed; Type: INDEX; Schema: finance; Owner: -
--

CREATE INDEX idx_outbox_unprocessed ON finance.outbox_event USING btree (created_at) WHERE (processed_at IS NULL);


--
-- Name: ix_hangfire_counter_expireat; Type: INDEX; Schema: hangfire; Owner: -
--

CREATE INDEX ix_hangfire_counter_expireat ON hangfire.counter USING btree (expireat);


--
-- Name: ix_hangfire_counter_key; Type: INDEX; Schema: hangfire; Owner: -
--

CREATE INDEX ix_hangfire_counter_key ON hangfire.counter USING btree (key);


--
-- Name: ix_hangfire_hash_expireat; Type: INDEX; Schema: hangfire; Owner: -
--

CREATE INDEX ix_hangfire_hash_expireat ON hangfire.hash USING btree (expireat);


--
-- Name: ix_hangfire_job_expireat; Type: INDEX; Schema: hangfire; Owner: -
--

CREATE INDEX ix_hangfire_job_expireat ON hangfire.job USING btree (expireat);


--
-- Name: ix_hangfire_job_statename; Type: INDEX; Schema: hangfire; Owner: -
--

CREATE INDEX ix_hangfire_job_statename ON hangfire.job USING btree (statename);


--
-- Name: ix_hangfire_job_statename_is_not_null; Type: INDEX; Schema: hangfire; Owner: -
--

CREATE INDEX ix_hangfire_job_statename_is_not_null ON hangfire.job USING btree (statename) INCLUDE (id) WHERE (statename IS NOT NULL);


--
-- Name: ix_hangfire_jobparameter_jobidandname; Type: INDEX; Schema: hangfire; Owner: -
--

CREATE INDEX ix_hangfire_jobparameter_jobidandname ON hangfire.jobparameter USING btree (jobid, name);


--
-- Name: ix_hangfire_jobqueue_fetchedat_queue_jobid; Type: INDEX; Schema: hangfire; Owner: -
--

CREATE INDEX ix_hangfire_jobqueue_fetchedat_queue_jobid ON hangfire.jobqueue USING btree (fetchedat NULLS FIRST, queue, jobid);


--
-- Name: ix_hangfire_jobqueue_jobidandqueue; Type: INDEX; Schema: hangfire; Owner: -
--

CREATE INDEX ix_hangfire_jobqueue_jobidandqueue ON hangfire.jobqueue USING btree (jobid, queue);


--
-- Name: ix_hangfire_jobqueue_queueandfetchedat; Type: INDEX; Schema: hangfire; Owner: -
--

CREATE INDEX ix_hangfire_jobqueue_queueandfetchedat ON hangfire.jobqueue USING btree (queue, fetchedat);


--
-- Name: ix_hangfire_list_expireat; Type: INDEX; Schema: hangfire; Owner: -
--

CREATE INDEX ix_hangfire_list_expireat ON hangfire.list USING btree (expireat);


--
-- Name: ix_hangfire_set_expireat; Type: INDEX; Schema: hangfire; Owner: -
--

CREATE INDEX ix_hangfire_set_expireat ON hangfire.set USING btree (expireat);


--
-- Name: ix_hangfire_set_key_score; Type: INDEX; Schema: hangfire; Owner: -
--

CREATE INDEX ix_hangfire_set_key_score ON hangfire.set USING btree (key, score);


--
-- Name: ix_hangfire_state_jobid; Type: INDEX; Schema: hangfire; Owner: -
--

CREATE INDEX ix_hangfire_state_jobid ON hangfire.state USING btree (jobid);


--
-- Name: idx_stock_doc_po; Type: INDEX; Schema: inventory; Owner: -
--

CREATE INDEX idx_stock_doc_po ON inventory.stock_doc USING btree (purchase_order_id);


--
-- Name: idx_stock_doc_so; Type: INDEX; Schema: inventory; Owner: -
--

CREATE INDEX idx_stock_doc_so ON inventory.stock_doc USING btree (sales_order_id);


--
-- Name: idx_stock_move_prod_wh; Type: INDEX; Schema: inventory; Owner: -
--

CREATE INDEX idx_stock_move_prod_wh ON inventory.stock_move USING btree (product_id, warehouse_id, move_date);


--
-- Name: uq_stock_balance; Type: INDEX; Schema: inventory; Owner: -
--

CREATE UNIQUE INDEX uq_stock_balance ON inventory.stock_balance USING btree (product_id, warehouse_id, COALESCE(lot_id, (0)::bigint));


--
-- Name: app_user app_user_employee_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.app_user
    ADD CONSTRAINT app_user_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES core.employee(id);


--
-- Name: approval_right approval_right_user_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.approval_right
    ADD CONSTRAINT approval_right_user_id_fkey FOREIGN KEY (user_id) REFERENCES core.app_user(id);


--
-- Name: attachment attachment_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.attachment
    ADD CONSTRAINT attachment_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES core.app_user(id);


--
-- Name: audit_log audit_log_acted_by_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.audit_log
    ADD CONSTRAINT audit_log_acted_by_fkey FOREIGN KEY (acted_by) REFERENCES core.app_user(id);


--
-- Name: data_scope data_scope_department_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.data_scope
    ADD CONSTRAINT data_scope_department_id_fkey FOREIGN KEY (department_id) REFERENCES core.department(id);


--
-- Name: data_scope data_scope_user_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.data_scope
    ADD CONSTRAINT data_scope_user_id_fkey FOREIGN KEY (user_id) REFERENCES core.app_user(id) ON DELETE CASCADE;


--
-- Name: department department_parent_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.department
    ADD CONSTRAINT department_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES core.department(id);


--
-- Name: employee employee_department_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.employee
    ADD CONSTRAINT employee_department_id_fkey FOREIGN KEY (department_id) REFERENCES core.department(id);


--
-- Name: employee employee_position_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.employee
    ADD CONSTRAINT employee_position_id_fkey FOREIGN KEY (position_id) REFERENCES core.work_position(id);


--
-- Name: exchange_rate exchange_rate_currency_code_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.exchange_rate
    ADD CONSTRAINT exchange_rate_currency_code_fkey FOREIGN KEY (currency_code) REFERENCES core.currency(code);


--
-- Name: note note_created_by_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.note
    ADD CONSTRAINT note_created_by_fkey FOREIGN KEY (created_by) REFERENCES core.app_user(id);


--
-- Name: partner_address partner_address_partner_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.partner_address
    ADD CONSTRAINT partner_address_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES core.partner(id) ON DELETE CASCADE;


--
-- Name: partner_bank_account partner_bank_account_partner_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.partner_bank_account
    ADD CONSTRAINT partner_bank_account_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES core.partner(id) ON DELETE CASCADE;


--
-- Name: partner_contact partner_contact_partner_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.partner_contact
    ADD CONSTRAINT partner_contact_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES core.partner(id) ON DELETE CASCADE;


--
-- Name: partner partner_delivery_method_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.partner
    ADD CONSTRAINT partner_delivery_method_id_fkey FOREIGN KEY (delivery_method_id) REFERENCES core.delivery_method(id);


--
-- Name: partner partner_payment_method_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.partner
    ADD CONSTRAINT partner_payment_method_id_fkey FOREIGN KEY (payment_method_id) REFERENCES core.payment_method(id);


--
-- Name: partner_sales_cost partner_sales_cost_cost_type_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.partner_sales_cost
    ADD CONSTRAINT partner_sales_cost_cost_type_id_fkey FOREIGN KEY (cost_type_id) REFERENCES core.cost_type(id);


--
-- Name: partner_sales_cost partner_sales_cost_partner_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.partner_sales_cost
    ADD CONSTRAINT partner_sales_cost_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES core.partner(id) ON DELETE CASCADE;


--
-- Name: partner_sales_cost partner_sales_cost_payee_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.partner_sales_cost
    ADD CONSTRAINT partner_sales_cost_payee_id_fkey FOREIGN KEY (payee_id) REFERENCES core.partner(id);


--
-- Name: partner partner_salesperson_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.partner
    ADD CONSTRAINT partner_salesperson_id_fkey FOREIGN KEY (salesperson_id) REFERENCES core.employee(id);


--
-- Name: payment_terms_template_line payment_terms_template_line_template_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.payment_terms_template_line
    ADD CONSTRAINT payment_terms_template_line_template_id_fkey FOREIGN KEY (template_id) REFERENCES core.payment_terms_template(id);


--
-- Name: product_bom product_bom_component_product_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.product_bom
    ADD CONSTRAINT product_bom_component_product_id_fkey FOREIGN KEY (component_product_id) REFERENCES core.product(id);


--
-- Name: product_bom product_bom_kit_product_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.product_bom
    ADD CONSTRAINT product_bom_kit_product_id_fkey FOREIGN KEY (kit_product_id) REFERENCES core.product(id);


--
-- Name: product product_group_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.product
    ADD CONSTRAINT product_group_id_fkey FOREIGN KEY (group_id) REFERENCES core.product_group(id);


--
-- Name: product_group product_group_parent_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.product_group
    ADD CONSTRAINT product_group_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES core.product_group(id);


--
-- Name: product product_uom_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.product
    ADD CONSTRAINT product_uom_id_fkey FOREIGN KEY (uom_id) REFERENCES core.uom(id);


--
-- Name: task task_assignee_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.task
    ADD CONSTRAINT task_assignee_id_fkey FOREIGN KEY (assignee_id) REFERENCES core.employee(id);


--
-- Name: tax_charge_template_line tax_charge_template_line_template_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.tax_charge_template_line
    ADD CONSTRAINT tax_charge_template_line_template_id_fkey FOREIGN KEY (template_id) REFERENCES core.tax_charge_template(id);


--
-- Name: uom_conversion uom_conversion_from_uom_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.uom_conversion
    ADD CONSTRAINT uom_conversion_from_uom_id_fkey FOREIGN KEY (from_uom_id) REFERENCES core.uom(id);


--
-- Name: uom_conversion uom_conversion_to_uom_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.uom_conversion
    ADD CONSTRAINT uom_conversion_to_uom_id_fkey FOREIGN KEY (to_uom_id) REFERENCES core.uom(id);


--
-- Name: user_group_member user_group_member_group_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.user_group_member
    ADD CONSTRAINT user_group_member_group_id_fkey FOREIGN KEY (group_id) REFERENCES core.user_group(id) ON DELETE CASCADE;


--
-- Name: user_group_member user_group_member_user_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.user_group_member
    ADD CONSTRAINT user_group_member_user_id_fkey FOREIGN KEY (user_id) REFERENCES core.app_user(id) ON DELETE CASCADE;


--
-- Name: warehouse_location warehouse_location_warehouse_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.warehouse_location
    ADD CONSTRAINT warehouse_location_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES core.warehouse(id) ON DELETE CASCADE;


--
-- Name: wf_transition_log wf_transition_log_acted_by_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.wf_transition_log
    ADD CONSTRAINT wf_transition_log_acted_by_fkey FOREIGN KEY (acted_by) REFERENCES core.app_user(id);


--
-- Name: work_position work_position_department_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.work_position
    ADD CONSTRAINT work_position_department_id_fkey FOREIGN KEY (department_id) REFERENCES core.department(id);


--
-- Name: work_position work_position_job_title_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.work_position
    ADD CONSTRAINT work_position_job_title_id_fkey FOREIGN KEY (job_title_id) REFERENCES core.job_title(id);


--
-- Name: opportunity_line opportunity_line_opportunity_id_fkey; Type: FK CONSTRAINT; Schema: crm; Owner: -
--

ALTER TABLE ONLY crm.opportunity_line
    ADD CONSTRAINT opportunity_line_opportunity_id_fkey FOREIGN KEY (opportunity_id) REFERENCES crm.opportunity(id);


--
-- Name: account account_object_category_id_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.account
    ADD CONSTRAINT account_object_category_id_fkey FOREIGN KEY (object_category_id) REFERENCES finance.object_category(id);


--
-- Name: account account_parent_id_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.account
    ADD CONSTRAINT account_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES finance.account(id);


--
-- Name: accounting_policy accounting_policy_base_currency_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.accounting_policy
    ADD CONSTRAINT accounting_policy_base_currency_fkey FOREIGN KEY (base_currency) REFERENCES core.currency(code);


--
-- Name: accounting_policy accounting_policy_first_period_id_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.accounting_policy
    ADD CONSTRAINT accounting_policy_first_period_id_fkey FOREIGN KEY (first_period_id) REFERENCES finance.fiscal_period(id);


--
-- Name: asset_alloc_rule asset_alloc_rule_account_id_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.asset_alloc_rule
    ADD CONSTRAINT asset_alloc_rule_account_id_fkey FOREIGN KEY (account_id) REFERENCES finance.account(id);


--
-- Name: asset_alloc_rule asset_alloc_rule_apply_from_period_id_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.asset_alloc_rule
    ADD CONSTRAINT asset_alloc_rule_apply_from_period_id_fkey FOREIGN KEY (apply_from_period_id) REFERENCES finance.fiscal_period(id);


--
-- Name: asset_alloc_rule asset_alloc_rule_asset_id_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.asset_alloc_rule
    ADD CONSTRAINT asset_alloc_rule_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES finance.fixed_asset(id);


--
-- Name: asset_group asset_group_cost_account_id_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.asset_group
    ADD CONSTRAINT asset_group_cost_account_id_fkey FOREIGN KEY (cost_account_id) REFERENCES finance.account(id);


--
-- Name: asset_group asset_group_dep_account_id_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.asset_group
    ADD CONSTRAINT asset_group_dep_account_id_fkey FOREIGN KEY (dep_account_id) REFERENCES finance.account(id);


--
-- Name: asset_report asset_report_asset_id_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.asset_report
    ADD CONSTRAINT asset_report_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES finance.fixed_asset(id);


--
-- Name: bank_fee bank_fee_voucher_id_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.bank_fee
    ADD CONSTRAINT bank_fee_voucher_id_fkey FOREIGN KEY (voucher_id) REFERENCES finance.voucher(id) ON DELETE CASCADE;


--
-- Name: cash_fund cash_fund_account_id_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.cash_fund
    ADD CONSTRAINT cash_fund_account_id_fkey FOREIGN KEY (account_id) REFERENCES finance.account(id);


--
-- Name: cash_fund cash_fund_currency_code_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.cash_fund
    ADD CONSTRAINT cash_fund_currency_code_fkey FOREIGN KEY (currency_code) REFERENCES core.currency(code);


--
-- Name: costing_object costing_object_period_id_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.costing_object
    ADD CONSTRAINT costing_object_period_id_fkey FOREIGN KEY (period_id) REFERENCES finance.fiscal_period(id);


--
-- Name: costing_object costing_object_process_id_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.costing_object
    ADD CONSTRAINT costing_object_process_id_fkey FOREIGN KEY (process_id) REFERENCES core.process(id);


--
-- Name: depreciation_entry depreciation_entry_asset_id_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.depreciation_entry
    ADD CONSTRAINT depreciation_entry_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES finance.fixed_asset(id);


--
-- Name: depreciation_entry depreciation_entry_period_id_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.depreciation_entry
    ADD CONSTRAINT depreciation_entry_period_id_fkey FOREIGN KEY (period_id) REFERENCES finance.fiscal_period(id);


--
-- Name: depreciation_entry depreciation_entry_voucher_id_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.depreciation_entry
    ADD CONSTRAINT depreciation_entry_voucher_id_fkey FOREIGN KEY (voucher_id) REFERENCES finance.voucher(id);


--
-- Name: fixed_asset fixed_asset_department_id_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.fixed_asset
    ADD CONSTRAINT fixed_asset_department_id_fkey FOREIGN KEY (department_id) REFERENCES core.department(id);


--
-- Name: fixed_asset fixed_asset_group_id_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.fixed_asset
    ADD CONSTRAINT fixed_asset_group_id_fkey FOREIGN KEY (group_id) REFERENCES finance.asset_group(id);


--
-- Name: lerp_voucher fk_lerp_voucher; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.lerp_voucher
    ADD CONSTRAINT fk_lerp_voucher FOREIGN KEY (voucher_id) REFERENCES finance.voucher(id);


--
-- Name: gl_entry gl_entry_account_id_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.gl_entry
    ADD CONSTRAINT gl_entry_account_id_fkey FOREIGN KEY (account_id) REFERENCES finance.account(id);


--
-- Name: gl_entry gl_entry_lot_id_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.gl_entry
    ADD CONSTRAINT gl_entry_lot_id_fkey FOREIGN KEY (lot_id) REFERENCES inventory.lot(id);


--
-- Name: gl_entry gl_entry_period_id_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.gl_entry
    ADD CONSTRAINT gl_entry_period_id_fkey FOREIGN KEY (period_id) REFERENCES finance.fiscal_period(id);


--
-- Name: gl_entry gl_entry_product_id_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.gl_entry
    ADD CONSTRAINT gl_entry_product_id_fkey FOREIGN KEY (product_id) REFERENCES core.product(id);


--
-- Name: gl_entry gl_entry_voucher_id_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.gl_entry
    ADD CONSTRAINT gl_entry_voucher_id_fkey FOREIGN KEY (voucher_id) REFERENCES finance.voucher(id);


--
-- Name: gl_entry gl_entry_warehouse_id_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.gl_entry
    ADD CONSTRAINT gl_entry_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES core.warehouse(id);


--
-- Name: lerp_voucher lerp_voucher_partner_id_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.lerp_voucher
    ADD CONSTRAINT lerp_voucher_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES core.partner(id);


--
-- Name: opening_balance opening_balance_account_id_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.opening_balance
    ADD CONSTRAINT opening_balance_account_id_fkey FOREIGN KEY (account_id) REFERENCES finance.account(id);


--
-- Name: opening_balance opening_balance_currency_code_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.opening_balance
    ADD CONSTRAINT opening_balance_currency_code_fkey FOREIGN KEY (currency_code) REFERENCES core.currency(code);


--
-- Name: opening_balance opening_balance_period_id_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.opening_balance
    ADD CONSTRAINT opening_balance_period_id_fkey FOREIGN KEY (period_id) REFERENCES finance.fiscal_period(id);


--
-- Name: opening_balance opening_balance_product_id_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.opening_balance
    ADD CONSTRAINT opening_balance_product_id_fkey FOREIGN KEY (product_id) REFERENCES core.product(id);


--
-- Name: opening_balance opening_balance_warehouse_id_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.opening_balance
    ADD CONSTRAINT opening_balance_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES core.warehouse(id);


--
-- Name: payment_allocation payment_allocation_invoice_voucher_id_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.payment_allocation
    ADD CONSTRAINT payment_allocation_invoice_voucher_id_fkey FOREIGN KEY (invoice_voucher_id) REFERENCES finance.voucher(id);


--
-- Name: payment_allocation payment_allocation_payment_voucher_id_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.payment_allocation
    ADD CONSTRAINT payment_allocation_payment_voucher_id_fkey FOREIGN KEY (payment_voucher_id) REFERENCES finance.voucher(id);


--
-- Name: period_closing period_closing_executed_by_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.period_closing
    ADD CONSTRAINT period_closing_executed_by_fkey FOREIGN KEY (executed_by) REFERENCES core.app_user(id);


--
-- Name: period_closing period_closing_period_id_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.period_closing
    ADD CONSTRAINT period_closing_period_id_fkey FOREIGN KEY (period_id) REFERENCES finance.fiscal_period(id);


--
-- Name: prepaid_alloc_entry prepaid_alloc_entry_card_id_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.prepaid_alloc_entry
    ADD CONSTRAINT prepaid_alloc_entry_card_id_fkey FOREIGN KEY (card_id) REFERENCES finance.prepaid_card(id);


--
-- Name: prepaid_alloc_entry prepaid_alloc_entry_period_id_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.prepaid_alloc_entry
    ADD CONSTRAINT prepaid_alloc_entry_period_id_fkey FOREIGN KEY (period_id) REFERENCES finance.fiscal_period(id);


--
-- Name: prepaid_alloc_entry prepaid_alloc_entry_voucher_id_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.prepaid_alloc_entry
    ADD CONSTRAINT prepaid_alloc_entry_voucher_id_fkey FOREIGN KEY (voucher_id) REFERENCES finance.voucher(id);


--
-- Name: prepaid_alloc_rule prepaid_alloc_rule_account_id_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.prepaid_alloc_rule
    ADD CONSTRAINT prepaid_alloc_rule_account_id_fkey FOREIGN KEY (account_id) REFERENCES finance.account(id);


--
-- Name: prepaid_alloc_rule prepaid_alloc_rule_card_id_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.prepaid_alloc_rule
    ADD CONSTRAINT prepaid_alloc_rule_card_id_fkey FOREIGN KEY (card_id) REFERENCES finance.prepaid_card(id) ON DELETE CASCADE;


--
-- Name: prepaid_card prepaid_card_prepaid_id_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.prepaid_card
    ADD CONSTRAINT prepaid_card_prepaid_id_fkey FOREIGN KEY (prepaid_id) REFERENCES finance.prepaid_expense(id);


--
-- Name: prepaid_expense prepaid_expense_account_id_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.prepaid_expense
    ADD CONSTRAINT prepaid_expense_account_id_fkey FOREIGN KEY (account_id) REFERENCES finance.account(id);


--
-- Name: prepaid_expense prepaid_expense_department_id_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.prepaid_expense
    ADD CONSTRAINT prepaid_expense_department_id_fkey FOREIGN KEY (department_id) REFERENCES core.department(id);


--
-- Name: vat_deduction vat_deduction_period_id_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.vat_deduction
    ADD CONSTRAINT vat_deduction_period_id_fkey FOREIGN KEY (period_id) REFERENCES finance.fiscal_period(id);


--
-- Name: vat_deduction vat_deduction_voucher_id_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.vat_deduction
    ADD CONSTRAINT vat_deduction_voucher_id_fkey FOREIGN KEY (voucher_id) REFERENCES finance.voucher(id);


--
-- Name: vat_invoice vat_invoice_declare_period_id_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.vat_invoice
    ADD CONSTRAINT vat_invoice_declare_period_id_fkey FOREIGN KEY (declare_period_id) REFERENCES finance.fiscal_period(id);


--
-- Name: vat_invoice vat_invoice_partner_id_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.vat_invoice
    ADD CONSTRAINT vat_invoice_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES core.partner(id);


--
-- Name: vat_invoice vat_invoice_voucher_id_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.vat_invoice
    ADD CONSTRAINT vat_invoice_voucher_id_fkey FOREIGN KEY (voucher_id) REFERENCES finance.voucher(id);


--
-- Name: voucher voucher_created_by_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.voucher
    ADD CONSTRAINT voucher_created_by_fkey FOREIGN KEY (created_by) REFERENCES core.app_user(id);


--
-- Name: voucher voucher_currency_code_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.voucher
    ADD CONSTRAINT voucher_currency_code_fkey FOREIGN KEY (currency_code) REFERENCES core.currency(code);


--
-- Name: voucher voucher_employee_id_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.voucher
    ADD CONSTRAINT voucher_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES core.employee(id);


--
-- Name: voucher voucher_fund_id_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.voucher
    ADD CONSTRAINT voucher_fund_id_fkey FOREIGN KEY (fund_id) REFERENCES finance.cash_fund(id);


--
-- Name: voucher voucher_lerp_voucher_id_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.voucher
    ADD CONSTRAINT voucher_lerp_voucher_id_fkey FOREIGN KEY (lerp_voucher_id) REFERENCES finance.lerp_voucher(id);


--
-- Name: voucher_line voucher_line_cr_account_id_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.voucher_line
    ADD CONSTRAINT voucher_line_cr_account_id_fkey FOREIGN KEY (cr_account_id) REFERENCES finance.account(id);


--
-- Name: voucher_line voucher_line_dr_account_id_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.voucher_line
    ADD CONSTRAINT voucher_line_dr_account_id_fkey FOREIGN KEY (dr_account_id) REFERENCES finance.account(id);


--
-- Name: voucher_line voucher_line_lot_id_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.voucher_line
    ADD CONSTRAINT voucher_line_lot_id_fkey FOREIGN KEY (lot_id) REFERENCES inventory.lot(id);


--
-- Name: voucher_line voucher_line_product_id_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.voucher_line
    ADD CONSTRAINT voucher_line_product_id_fkey FOREIGN KEY (product_id) REFERENCES core.product(id);


--
-- Name: voucher_line voucher_line_ref_voucher_id_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.voucher_line
    ADD CONSTRAINT voucher_line_ref_voucher_id_fkey FOREIGN KEY (ref_voucher_id) REFERENCES finance.voucher(id);


--
-- Name: voucher_line voucher_line_voucher_id_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.voucher_line
    ADD CONSTRAINT voucher_line_voucher_id_fkey FOREIGN KEY (voucher_id) REFERENCES finance.voucher(id) ON DELETE CASCADE;


--
-- Name: voucher_line voucher_line_warehouse_id_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.voucher_line
    ADD CONSTRAINT voucher_line_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES core.warehouse(id);


--
-- Name: voucher voucher_operation_id_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.voucher
    ADD CONSTRAINT voucher_operation_id_fkey FOREIGN KEY (operation_id) REFERENCES finance.business_operation(id);


--
-- Name: voucher voucher_partner_id_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.voucher
    ADD CONSTRAINT voucher_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES core.partner(id);


--
-- Name: voucher voucher_period_id_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.voucher
    ADD CONSTRAINT voucher_period_id_fkey FOREIGN KEY (period_id) REFERENCES finance.fiscal_period(id);


--
-- Name: voucher voucher_posted_by_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.voucher
    ADD CONSTRAINT voucher_posted_by_fkey FOREIGN KEY (posted_by) REFERENCES core.app_user(id);


--
-- Name: voucher voucher_warehouse_id_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.voucher
    ADD CONSTRAINT voucher_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES core.warehouse(id);


--
-- Name: jobparameter jobparameter_jobid_fkey; Type: FK CONSTRAINT; Schema: hangfire; Owner: -
--

ALTER TABLE ONLY hangfire.jobparameter
    ADD CONSTRAINT jobparameter_jobid_fkey FOREIGN KEY (jobid) REFERENCES hangfire.job(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: state state_jobid_fkey; Type: FK CONSTRAINT; Schema: hangfire; Owner: -
--

ALTER TABLE ONLY hangfire.state
    ADD CONSTRAINT state_jobid_fkey FOREIGN KEY (jobid) REFERENCES hangfire.job(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: delivery_plan delivery_plan_doc_id_fkey; Type: FK CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.delivery_plan
    ADD CONSTRAINT delivery_plan_doc_id_fkey FOREIGN KEY (doc_id) REFERENCES inventory.stock_doc(id) ON DELETE CASCADE;


--
-- Name: gr_cost gr_cost_approved_by_fkey; Type: FK CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.gr_cost
    ADD CONSTRAINT gr_cost_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES core.app_user(id);


--
-- Name: gr_cost gr_cost_cost_type_id_fkey; Type: FK CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.gr_cost
    ADD CONSTRAINT gr_cost_cost_type_id_fkey FOREIGN KEY (cost_type_id) REFERENCES core.cost_type(id);


--
-- Name: gr_cost gr_cost_doc_id_fkey; Type: FK CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.gr_cost
    ADD CONSTRAINT gr_cost_doc_id_fkey FOREIGN KEY (doc_id) REFERENCES inventory.stock_doc(id) ON DELETE CASCADE;


--
-- Name: gr_cost gr_cost_payee_id_fkey; Type: FK CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.gr_cost
    ADD CONSTRAINT gr_cost_payee_id_fkey FOREIGN KEY (payee_id) REFERENCES core.partner(id);


--
-- Name: gr_cost gr_cost_process_id_fkey; Type: FK CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.gr_cost
    ADD CONSTRAINT gr_cost_process_id_fkey FOREIGN KEY (process_id) REFERENCES core.process(id);


--
-- Name: lot lot_product_id_fkey; Type: FK CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.lot
    ADD CONSTRAINT lot_product_id_fkey FOREIGN KEY (product_id) REFERENCES core.product(id);


--
-- Name: packing_line packing_line_doc_id_fkey; Type: FK CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.packing_line
    ADD CONSTRAINT packing_line_doc_id_fkey FOREIGN KEY (doc_id) REFERENCES inventory.stock_doc(id) ON DELETE CASCADE;


--
-- Name: packing_line packing_line_doc_line_id_fkey; Type: FK CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.packing_line
    ADD CONSTRAINT packing_line_doc_line_id_fkey FOREIGN KEY (doc_line_id) REFERENCES inventory.stock_doc_line(id);


--
-- Name: packing_line packing_line_performer_id_fkey; Type: FK CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.packing_line
    ADD CONSTRAINT packing_line_performer_id_fkey FOREIGN KEY (performer_id) REFERENCES core.employee(id);


--
-- Name: stock_balance stock_balance_lot_id_fkey; Type: FK CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.stock_balance
    ADD CONSTRAINT stock_balance_lot_id_fkey FOREIGN KEY (lot_id) REFERENCES inventory.lot(id);


--
-- Name: stock_balance stock_balance_product_id_fkey; Type: FK CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.stock_balance
    ADD CONSTRAINT stock_balance_product_id_fkey FOREIGN KEY (product_id) REFERENCES core.product(id);


--
-- Name: stock_balance stock_balance_warehouse_id_fkey; Type: FK CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.stock_balance
    ADD CONSTRAINT stock_balance_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES core.warehouse(id);


--
-- Name: stock_doc stock_doc_completed_by_fkey; Type: FK CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.stock_doc
    ADD CONSTRAINT stock_doc_completed_by_fkey FOREIGN KEY (completed_by) REFERENCES core.app_user(id);


--
-- Name: stock_doc stock_doc_counterpart_doc_id_fkey; Type: FK CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.stock_doc
    ADD CONSTRAINT stock_doc_counterpart_doc_id_fkey FOREIGN KEY (counterpart_doc_id) REFERENCES inventory.stock_doc(id);


--
-- Name: stock_doc stock_doc_created_by_fkey; Type: FK CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.stock_doc
    ADD CONSTRAINT stock_doc_created_by_fkey FOREIGN KEY (created_by) REFERENCES core.app_user(id);


--
-- Name: stock_doc stock_doc_from_warehouse_id_fkey; Type: FK CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.stock_doc
    ADD CONSTRAINT stock_doc_from_warehouse_id_fkey FOREIGN KEY (from_warehouse_id) REFERENCES core.warehouse(id);


--
-- Name: stock_doc_line stock_doc_line_doc_id_fkey; Type: FK CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.stock_doc_line
    ADD CONSTRAINT stock_doc_line_doc_id_fkey FOREIGN KEY (doc_id) REFERENCES inventory.stock_doc(id) ON DELETE CASCADE;


--
-- Name: stock_doc_line stock_doc_line_location_id_fkey; Type: FK CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.stock_doc_line
    ADD CONSTRAINT stock_doc_line_location_id_fkey FOREIGN KEY (location_id) REFERENCES core.warehouse_location(id);


--
-- Name: stock_doc_line stock_doc_line_lot_id_fkey; Type: FK CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.stock_doc_line
    ADD CONSTRAINT stock_doc_line_lot_id_fkey FOREIGN KEY (lot_id) REFERENCES inventory.lot(id);


--
-- Name: stock_doc_line stock_doc_line_product_id_fkey; Type: FK CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.stock_doc_line
    ADD CONSTRAINT stock_doc_line_product_id_fkey FOREIGN KEY (product_id) REFERENCES core.product(id);


--
-- Name: stock_doc stock_doc_partner_id_fkey; Type: FK CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.stock_doc
    ADD CONSTRAINT stock_doc_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES core.partner(id);


--
-- Name: stock_doc stock_doc_process_id_fkey; Type: FK CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.stock_doc
    ADD CONSTRAINT stock_doc_process_id_fkey FOREIGN KEY (process_id) REFERENCES core.process(id);


--
-- Name: stock_doc stock_doc_purchase_order_id_fkey; Type: FK CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.stock_doc
    ADD CONSTRAINT stock_doc_purchase_order_id_fkey FOREIGN KEY (purchase_order_id) REFERENCES purchasing.purchase_order(id);


--
-- Name: stock_doc stock_doc_sales_order_id_fkey; Type: FK CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.stock_doc
    ADD CONSTRAINT stock_doc_sales_order_id_fkey FOREIGN KEY (sales_order_id) REFERENCES sales.sales_order(id);


--
-- Name: stock_doc stock_doc_supplier_return_id_fkey; Type: FK CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.stock_doc
    ADD CONSTRAINT stock_doc_supplier_return_id_fkey FOREIGN KEY (supplier_return_id) REFERENCES purchasing.supplier_return(id);


--
-- Name: stock_doc stock_doc_to_warehouse_id_fkey; Type: FK CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.stock_doc
    ADD CONSTRAINT stock_doc_to_warehouse_id_fkey FOREIGN KEY (to_warehouse_id) REFERENCES core.warehouse(id);


--
-- Name: stock_move stock_move_doc_id_fkey; Type: FK CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.stock_move
    ADD CONSTRAINT stock_move_doc_id_fkey FOREIGN KEY (doc_id) REFERENCES inventory.stock_doc(id);


--
-- Name: stock_move stock_move_doc_line_id_fkey; Type: FK CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.stock_move
    ADD CONSTRAINT stock_move_doc_line_id_fkey FOREIGN KEY (doc_line_id) REFERENCES inventory.stock_doc_line(id);


--
-- Name: stock_move stock_move_location_id_fkey; Type: FK CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.stock_move
    ADD CONSTRAINT stock_move_location_id_fkey FOREIGN KEY (location_id) REFERENCES core.warehouse_location(id);


--
-- Name: stock_move stock_move_lot_id_fkey; Type: FK CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.stock_move
    ADD CONSTRAINT stock_move_lot_id_fkey FOREIGN KEY (lot_id) REFERENCES inventory.lot(id);


--
-- Name: stock_move stock_move_product_id_fkey; Type: FK CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.stock_move
    ADD CONSTRAINT stock_move_product_id_fkey FOREIGN KEY (product_id) REFERENCES core.product(id);


--
-- Name: stock_move stock_move_warehouse_id_fkey; Type: FK CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.stock_move
    ADD CONSTRAINT stock_move_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES core.warehouse(id);


--
-- Name: stock_reconciliation_line stock_reconciliation_line_reconciliation_id_fkey; Type: FK CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.stock_reconciliation_line
    ADD CONSTRAINT stock_reconciliation_line_reconciliation_id_fkey FOREIGN KEY (reconciliation_id) REFERENCES inventory.stock_reconciliation(id);


--
-- Name: bom_item bom_item_bom_id_fkey; Type: FK CONSTRAINT; Schema: mfg; Owner: -
--

ALTER TABLE ONLY mfg.bom_item
    ADD CONSTRAINT bom_item_bom_id_fkey FOREIGN KEY (bom_id) REFERENCES mfg.bom(id);


--
-- Name: bom_operation bom_operation_bom_id_fkey; Type: FK CONSTRAINT; Schema: mfg; Owner: -
--

ALTER TABLE ONLY mfg.bom_operation
    ADD CONSTRAINT bom_operation_bom_id_fkey FOREIGN KEY (bom_id) REFERENCES mfg.bom(id);


--
-- Name: bom_scrap bom_scrap_bom_id_fkey; Type: FK CONSTRAINT; Schema: mfg; Owner: -
--

ALTER TABLE ONLY mfg.bom_scrap
    ADD CONSTRAINT bom_scrap_bom_id_fkey FOREIGN KEY (bom_id) REFERENCES mfg.bom(id);


--
-- Name: pp_item pp_item_production_plan_id_fkey; Type: FK CONSTRAINT; Schema: mfg; Owner: -
--

ALTER TABLE ONLY mfg.pp_item
    ADD CONSTRAINT pp_item_production_plan_id_fkey FOREIGN KEY (production_plan_id) REFERENCES mfg.production_plan(id);


--
-- Name: pp_material pp_material_production_plan_id_fkey; Type: FK CONSTRAINT; Schema: mfg; Owner: -
--

ALTER TABLE ONLY mfg.pp_material
    ADD CONSTRAINT pp_material_production_plan_id_fkey FOREIGN KEY (production_plan_id) REFERENCES mfg.production_plan(id);


--
-- Name: pp_so pp_so_production_plan_id_fkey; Type: FK CONSTRAINT; Schema: mfg; Owner: -
--

ALTER TABLE ONLY mfg.pp_so
    ADD CONSTRAINT pp_so_production_plan_id_fkey FOREIGN KEY (production_plan_id) REFERENCES mfg.production_plan(id);


--
-- Name: wo_finish_batch wo_finish_batch_work_order_id_fkey; Type: FK CONSTRAINT; Schema: mfg; Owner: -
--

ALTER TABLE ONLY mfg.wo_finish_batch
    ADD CONSTRAINT wo_finish_batch_work_order_id_fkey FOREIGN KEY (work_order_id) REFERENCES mfg.work_order(id);


--
-- Name: wo_item wo_item_work_order_id_fkey; Type: FK CONSTRAINT; Schema: mfg; Owner: -
--

ALTER TABLE ONLY mfg.wo_item
    ADD CONSTRAINT wo_item_work_order_id_fkey FOREIGN KEY (work_order_id) REFERENCES mfg.work_order(id);


--
-- Name: wo_operation wo_operation_work_order_id_fkey; Type: FK CONSTRAINT; Schema: mfg; Owner: -
--

ALTER TABLE ONLY mfg.wo_operation
    ADD CONSTRAINT wo_operation_work_order_id_fkey FOREIGN KEY (work_order_id) REFERENCES mfg.work_order(id);


--
-- Name: outsourcing_cost fk_oc_receipt; Type: FK CONSTRAINT; Schema: purchasing; Owner: -
--

ALTER TABLE ONLY purchasing.outsourcing_cost
    ADD CONSTRAINT fk_oc_receipt FOREIGN KEY (receipt_doc_id) REFERENCES inventory.stock_doc(id);


--
-- Name: po_cost fk_po_cost_receipt; Type: FK CONSTRAINT; Schema: purchasing; Owner: -
--

ALTER TABLE ONLY purchasing.po_cost
    ADD CONSTRAINT fk_po_cost_receipt FOREIGN KEY (receipt_doc_id) REFERENCES inventory.stock_doc(id);


--
-- Name: landed_cost_receipt landed_cost_receipt_voucher_id_fkey; Type: FK CONSTRAINT; Schema: purchasing; Owner: -
--

ALTER TABLE ONLY purchasing.landed_cost_receipt
    ADD CONSTRAINT landed_cost_receipt_voucher_id_fkey FOREIGN KEY (voucher_id) REFERENCES purchasing.landed_cost_voucher(id);


--
-- Name: landed_cost_voucher_line landed_cost_voucher_line_voucher_id_fkey; Type: FK CONSTRAINT; Schema: purchasing; Owner: -
--

ALTER TABLE ONLY purchasing.landed_cost_voucher_line
    ADD CONSTRAINT landed_cost_voucher_line_voucher_id_fkey FOREIGN KEY (voucher_id) REFERENCES purchasing.landed_cost_voucher(id);


--
-- Name: outsourcing_cost outsourcing_cost_collected_po_id_fkey; Type: FK CONSTRAINT; Schema: purchasing; Owner: -
--

ALTER TABLE ONLY purchasing.outsourcing_cost
    ADD CONSTRAINT outsourcing_cost_collected_po_id_fkey FOREIGN KEY (collected_po_id) REFERENCES purchasing.purchase_order(id);


--
-- Name: outsourcing_cost outsourcing_cost_cost_type_id_fkey; Type: FK CONSTRAINT; Schema: purchasing; Owner: -
--

ALTER TABLE ONLY purchasing.outsourcing_cost
    ADD CONSTRAINT outsourcing_cost_cost_type_id_fkey FOREIGN KEY (cost_type_id) REFERENCES core.cost_type(id);


--
-- Name: outsourcing_cost outsourcing_cost_currency_code_fkey; Type: FK CONSTRAINT; Schema: purchasing; Owner: -
--

ALTER TABLE ONLY purchasing.outsourcing_cost
    ADD CONSTRAINT outsourcing_cost_currency_code_fkey FOREIGN KEY (currency_code) REFERENCES core.currency(code);


--
-- Name: outsourcing_cost outsourcing_cost_payee_id_fkey; Type: FK CONSTRAINT; Schema: purchasing; Owner: -
--

ALTER TABLE ONLY purchasing.outsourcing_cost
    ADD CONSTRAINT outsourcing_cost_payee_id_fkey FOREIGN KEY (payee_id) REFERENCES core.partner(id);


--
-- Name: outsourcing_cost outsourcing_cost_payment_method_id_fkey; Type: FK CONSTRAINT; Schema: purchasing; Owner: -
--

ALTER TABLE ONLY purchasing.outsourcing_cost
    ADD CONSTRAINT outsourcing_cost_payment_method_id_fkey FOREIGN KEY (payment_method_id) REFERENCES core.payment_method(id);


--
-- Name: outsourcing_cost outsourcing_cost_process_id_fkey; Type: FK CONSTRAINT; Schema: purchasing; Owner: -
--

ALTER TABLE ONLY purchasing.outsourcing_cost
    ADD CONSTRAINT outsourcing_cost_process_id_fkey FOREIGN KEY (process_id) REFERENCES core.process(id);


--
-- Name: outsourcing_cost outsourcing_cost_product_id_fkey; Type: FK CONSTRAINT; Schema: purchasing; Owner: -
--

ALTER TABLE ONLY purchasing.outsourcing_cost
    ADD CONSTRAINT outsourcing_cost_product_id_fkey FOREIGN KEY (product_id) REFERENCES core.product(id);


--
-- Name: po_cost po_cost_approved_by_fkey; Type: FK CONSTRAINT; Schema: purchasing; Owner: -
--

ALTER TABLE ONLY purchasing.po_cost
    ADD CONSTRAINT po_cost_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES core.app_user(id);


--
-- Name: po_cost po_cost_cost_type_id_fkey; Type: FK CONSTRAINT; Schema: purchasing; Owner: -
--

ALTER TABLE ONLY purchasing.po_cost
    ADD CONSTRAINT po_cost_cost_type_id_fkey FOREIGN KEY (cost_type_id) REFERENCES core.cost_type(id);


--
-- Name: po_cost po_cost_order_id_fkey; Type: FK CONSTRAINT; Schema: purchasing; Owner: -
--

ALTER TABLE ONLY purchasing.po_cost
    ADD CONSTRAINT po_cost_order_id_fkey FOREIGN KEY (order_id) REFERENCES purchasing.purchase_order(id) ON DELETE CASCADE;


--
-- Name: po_cost po_cost_payment_method_id_fkey; Type: FK CONSTRAINT; Schema: purchasing; Owner: -
--

ALTER TABLE ONLY purchasing.po_cost
    ADD CONSTRAINT po_cost_payment_method_id_fkey FOREIGN KEY (payment_method_id) REFERENCES core.payment_method(id);


--
-- Name: po_cost po_cost_service_supplier_id_fkey; Type: FK CONSTRAINT; Schema: purchasing; Owner: -
--

ALTER TABLE ONLY purchasing.po_cost
    ADD CONSTRAINT po_cost_service_supplier_id_fkey FOREIGN KEY (service_supplier_id) REFERENCES core.partner(id);


--
-- Name: po_payment_actual po_payment_actual_method_id_fkey; Type: FK CONSTRAINT; Schema: purchasing; Owner: -
--

ALTER TABLE ONLY purchasing.po_payment_actual
    ADD CONSTRAINT po_payment_actual_method_id_fkey FOREIGN KEY (method_id) REFERENCES core.payment_method(id);


--
-- Name: po_payment_actual po_payment_actual_order_id_fkey; Type: FK CONSTRAINT; Schema: purchasing; Owner: -
--

ALTER TABLE ONLY purchasing.po_payment_actual
    ADD CONSTRAINT po_payment_actual_order_id_fkey FOREIGN KEY (order_id) REFERENCES purchasing.purchase_order(id) ON DELETE CASCADE;


--
-- Name: po_payment_request po_payment_request_approved_by_fkey; Type: FK CONSTRAINT; Schema: purchasing; Owner: -
--

ALTER TABLE ONLY purchasing.po_payment_request
    ADD CONSTRAINT po_payment_request_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES core.app_user(id);


--
-- Name: po_payment_request po_payment_request_order_id_fkey; Type: FK CONSTRAINT; Schema: purchasing; Owner: -
--

ALTER TABLE ONLY purchasing.po_payment_request
    ADD CONSTRAINT po_payment_request_order_id_fkey FOREIGN KEY (order_id) REFERENCES purchasing.purchase_order(id) ON DELETE CASCADE;


--
-- Name: purchase_order purchase_order_approver_id_fkey; Type: FK CONSTRAINT; Schema: purchasing; Owner: -
--

ALTER TABLE ONLY purchasing.purchase_order
    ADD CONSTRAINT purchase_order_approver_id_fkey FOREIGN KEY (approver_id) REFERENCES core.app_user(id);


--
-- Name: purchase_order purchase_order_delivery_method_id_fkey; Type: FK CONSTRAINT; Schema: purchasing; Owner: -
--

ALTER TABLE ONLY purchasing.purchase_order
    ADD CONSTRAINT purchase_order_delivery_method_id_fkey FOREIGN KEY (delivery_method_id) REFERENCES core.delivery_method(id);


--
-- Name: purchase_order_line purchase_order_line_order_id_fkey; Type: FK CONSTRAINT; Schema: purchasing; Owner: -
--

ALTER TABLE ONLY purchasing.purchase_order_line
    ADD CONSTRAINT purchase_order_line_order_id_fkey FOREIGN KEY (order_id) REFERENCES purchasing.purchase_order(id) ON DELETE CASCADE;


--
-- Name: purchase_order_line purchase_order_line_product_id_fkey; Type: FK CONSTRAINT; Schema: purchasing; Owner: -
--

ALTER TABLE ONLY purchasing.purchase_order_line
    ADD CONSTRAINT purchase_order_line_product_id_fkey FOREIGN KEY (product_id) REFERENCES core.product(id);


--
-- Name: purchase_order purchase_order_partner_id_fkey; Type: FK CONSTRAINT; Schema: purchasing; Owner: -
--

ALTER TABLE ONLY purchasing.purchase_order
    ADD CONSTRAINT purchase_order_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES core.partner(id);


--
-- Name: purchase_order purchase_order_payment_method_id_fkey; Type: FK CONSTRAINT; Schema: purchasing; Owner: -
--

ALTER TABLE ONLY purchasing.purchase_order
    ADD CONSTRAINT purchase_order_payment_method_id_fkey FOREIGN KEY (payment_method_id) REFERENCES core.payment_method(id);


--
-- Name: purchase_order purchase_order_request_id_fkey; Type: FK CONSTRAINT; Schema: purchasing; Owner: -
--

ALTER TABLE ONLY purchasing.purchase_order
    ADD CONSTRAINT purchase_order_request_id_fkey FOREIGN KEY (request_id) REFERENCES purchasing.purchase_request(id);


--
-- Name: purchase_request purchase_request_department_id_fkey; Type: FK CONSTRAINT; Schema: purchasing; Owner: -
--

ALTER TABLE ONLY purchasing.purchase_request
    ADD CONSTRAINT purchase_request_department_id_fkey FOREIGN KEY (department_id) REFERENCES core.department(id);


--
-- Name: purchase_request_line purchase_request_line_product_id_fkey; Type: FK CONSTRAINT; Schema: purchasing; Owner: -
--

ALTER TABLE ONLY purchasing.purchase_request_line
    ADD CONSTRAINT purchase_request_line_product_id_fkey FOREIGN KEY (product_id) REFERENCES core.product(id);


--
-- Name: purchase_request_line purchase_request_line_request_id_fkey; Type: FK CONSTRAINT; Schema: purchasing; Owner: -
--

ALTER TABLE ONLY purchasing.purchase_request_line
    ADD CONSTRAINT purchase_request_line_request_id_fkey FOREIGN KEY (request_id) REFERENCES purchasing.purchase_request(id) ON DELETE CASCADE;


--
-- Name: purchase_request purchase_request_requester_id_fkey; Type: FK CONSTRAINT; Schema: purchasing; Owner: -
--

ALTER TABLE ONLY purchasing.purchase_request
    ADD CONSTRAINT purchase_request_requester_id_fkey FOREIGN KEY (requester_id) REFERENCES core.employee(id);


--
-- Name: rfq_line rfq_line_rfq_id_fkey; Type: FK CONSTRAINT; Schema: purchasing; Owner: -
--

ALTER TABLE ONLY purchasing.rfq_line
    ADD CONSTRAINT rfq_line_rfq_id_fkey FOREIGN KEY (rfq_id) REFERENCES purchasing.rfq(id);


--
-- Name: rfq_supplier rfq_supplier_rfq_id_fkey; Type: FK CONSTRAINT; Schema: purchasing; Owner: -
--

ALTER TABLE ONLY purchasing.rfq_supplier
    ADD CONSTRAINT rfq_supplier_rfq_id_fkey FOREIGN KEY (rfq_id) REFERENCES purchasing.rfq(id);


--
-- Name: supplier_quotation_line supplier_quotation_line_quotation_id_fkey; Type: FK CONSTRAINT; Schema: purchasing; Owner: -
--

ALTER TABLE ONLY purchasing.supplier_quotation_line
    ADD CONSTRAINT supplier_quotation_line_quotation_id_fkey FOREIGN KEY (quotation_id) REFERENCES purchasing.supplier_quotation(id);


--
-- Name: supplier_return_line supplier_return_line_product_id_fkey; Type: FK CONSTRAINT; Schema: purchasing; Owner: -
--

ALTER TABLE ONLY purchasing.supplier_return_line
    ADD CONSTRAINT supplier_return_line_product_id_fkey FOREIGN KEY (product_id) REFERENCES core.product(id);


--
-- Name: supplier_return_line supplier_return_line_return_id_fkey; Type: FK CONSTRAINT; Schema: purchasing; Owner: -
--

ALTER TABLE ONLY purchasing.supplier_return_line
    ADD CONSTRAINT supplier_return_line_return_id_fkey FOREIGN KEY (return_id) REFERENCES purchasing.supplier_return(id) ON DELETE CASCADE;


--
-- Name: supplier_return supplier_return_order_id_fkey; Type: FK CONSTRAINT; Schema: purchasing; Owner: -
--

ALTER TABLE ONLY purchasing.supplier_return
    ADD CONSTRAINT supplier_return_order_id_fkey FOREIGN KEY (order_id) REFERENCES purchasing.purchase_order(id);


--
-- Name: supplier_return supplier_return_partner_id_fkey; Type: FK CONSTRAINT; Schema: purchasing; Owner: -
--

ALTER TABLE ONLY purchasing.supplier_return
    ADD CONSTRAINT supplier_return_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES core.partner(id);


--
-- Name: coupon_code coupon_code_pricing_rule_id_fkey; Type: FK CONSTRAINT; Schema: sales; Owner: -
--

ALTER TABLE ONLY sales.coupon_code
    ADD CONSTRAINT coupon_code_pricing_rule_id_fkey FOREIGN KEY (pricing_rule_id) REFERENCES sales.pricing_rule(id);


--
-- Name: opportunity opportunity_partner_id_fkey; Type: FK CONSTRAINT; Schema: sales; Owner: -
--

ALTER TABLE ONLY sales.opportunity
    ADD CONSTRAINT opportunity_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES core.partner(id);


--
-- Name: opportunity opportunity_salesperson_id_fkey; Type: FK CONSTRAINT; Schema: sales; Owner: -
--

ALTER TABLE ONLY sales.opportunity
    ADD CONSTRAINT opportunity_salesperson_id_fkey FOREIGN KEY (salesperson_id) REFERENCES core.employee(id);


--
-- Name: price_list_item price_list_item_price_list_id_fkey; Type: FK CONSTRAINT; Schema: sales; Owner: -
--

ALTER TABLE ONLY sales.price_list_item
    ADD CONSTRAINT price_list_item_price_list_id_fkey FOREIGN KEY (price_list_id) REFERENCES sales.price_list(id) ON DELETE CASCADE;


--
-- Name: price_list_item price_list_item_product_id_fkey; Type: FK CONSTRAINT; Schema: sales; Owner: -
--

ALTER TABLE ONLY sales.price_list_item
    ADD CONSTRAINT price_list_item_product_id_fkey FOREIGN KEY (product_id) REFERENCES core.product(id);


--
-- Name: pricing_formula pricing_formula_product_group_id_fkey; Type: FK CONSTRAINT; Schema: sales; Owner: -
--

ALTER TABLE ONLY sales.pricing_formula
    ADD CONSTRAINT pricing_formula_product_group_id_fkey FOREIGN KEY (product_group_id) REFERENCES core.product_group(id);


--
-- Name: pricing_formula pricing_formula_product_id_fkey; Type: FK CONSTRAINT; Schema: sales; Owner: -
--

ALTER TABLE ONLY sales.pricing_formula
    ADD CONSTRAINT pricing_formula_product_id_fkey FOREIGN KEY (product_id) REFERENCES core.product(id);


--
-- Name: pricing_rule pricing_rule_scheme_id_fkey; Type: FK CONSTRAINT; Schema: sales; Owner: -
--

ALTER TABLE ONLY sales.pricing_rule
    ADD CONSTRAINT pricing_rule_scheme_id_fkey FOREIGN KEY (scheme_id) REFERENCES sales.promotional_scheme(id) ON DELETE CASCADE;


--
-- Name: promotion_discount_item promotion_discount_item_product_id_fkey; Type: FK CONSTRAINT; Schema: sales; Owner: -
--

ALTER TABLE ONLY sales.promotion_discount_item
    ADD CONSTRAINT promotion_discount_item_product_id_fkey FOREIGN KEY (product_id) REFERENCES core.product(id);


--
-- Name: promotion_discount_item promotion_discount_item_promotion_id_fkey; Type: FK CONSTRAINT; Schema: sales; Owner: -
--

ALTER TABLE ONLY sales.promotion_discount_item
    ADD CONSTRAINT promotion_discount_item_promotion_id_fkey FOREIGN KEY (promotion_id) REFERENCES sales.promotion(id) ON DELETE CASCADE;


--
-- Name: promotion_gift_item promotion_gift_item_buy_product_id_fkey; Type: FK CONSTRAINT; Schema: sales; Owner: -
--

ALTER TABLE ONLY sales.promotion_gift_item
    ADD CONSTRAINT promotion_gift_item_buy_product_id_fkey FOREIGN KEY (buy_product_id) REFERENCES core.product(id);


--
-- Name: promotion_gift_item promotion_gift_item_gift_product_id_fkey; Type: FK CONSTRAINT; Schema: sales; Owner: -
--

ALTER TABLE ONLY sales.promotion_gift_item
    ADD CONSTRAINT promotion_gift_item_gift_product_id_fkey FOREIGN KEY (gift_product_id) REFERENCES core.product(id);


--
-- Name: promotion_gift_item promotion_gift_item_promotion_id_fkey; Type: FK CONSTRAINT; Schema: sales; Owner: -
--

ALTER TABLE ONLY sales.promotion_gift_item
    ADD CONSTRAINT promotion_gift_item_promotion_id_fkey FOREIGN KEY (promotion_id) REFERENCES sales.promotion(id) ON DELETE CASCADE;


--
-- Name: quotation quotation_approver_id_fkey; Type: FK CONSTRAINT; Schema: sales; Owner: -
--

ALTER TABLE ONLY sales.quotation
    ADD CONSTRAINT quotation_approver_id_fkey FOREIGN KEY (approver_id) REFERENCES core.app_user(id);


--
-- Name: quotation quotation_contact_id_fkey; Type: FK CONSTRAINT; Schema: sales; Owner: -
--

ALTER TABLE ONLY sales.quotation
    ADD CONSTRAINT quotation_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES core.partner_contact(id);


--
-- Name: quotation_cost quotation_cost_cost_type_id_fkey; Type: FK CONSTRAINT; Schema: sales; Owner: -
--

ALTER TABLE ONLY sales.quotation_cost
    ADD CONSTRAINT quotation_cost_cost_type_id_fkey FOREIGN KEY (cost_type_id) REFERENCES core.cost_type(id);


--
-- Name: quotation_cost quotation_cost_payee_id_fkey; Type: FK CONSTRAINT; Schema: sales; Owner: -
--

ALTER TABLE ONLY sales.quotation_cost
    ADD CONSTRAINT quotation_cost_payee_id_fkey FOREIGN KEY (payee_id) REFERENCES core.partner(id);


--
-- Name: quotation_cost quotation_cost_quotation_id_fkey; Type: FK CONSTRAINT; Schema: sales; Owner: -
--

ALTER TABLE ONLY sales.quotation_cost
    ADD CONSTRAINT quotation_cost_quotation_id_fkey FOREIGN KEY (quotation_id) REFERENCES sales.quotation(id) ON DELETE CASCADE;


--
-- Name: quotation quotation_creator_id_fkey; Type: FK CONSTRAINT; Schema: sales; Owner: -
--

ALTER TABLE ONLY sales.quotation
    ADD CONSTRAINT quotation_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES core.app_user(id);


--
-- Name: quotation quotation_delivery_addr_id_fkey; Type: FK CONSTRAINT; Schema: sales; Owner: -
--

ALTER TABLE ONLY sales.quotation
    ADD CONSTRAINT quotation_delivery_addr_id_fkey FOREIGN KEY (delivery_addr_id) REFERENCES core.partner_address(id);


--
-- Name: quotation quotation_delivery_method_id_fkey; Type: FK CONSTRAINT; Schema: sales; Owner: -
--

ALTER TABLE ONLY sales.quotation
    ADD CONSTRAINT quotation_delivery_method_id_fkey FOREIGN KEY (delivery_method_id) REFERENCES core.delivery_method(id);


--
-- Name: quotation_line quotation_line_product_id_fkey; Type: FK CONSTRAINT; Schema: sales; Owner: -
--

ALTER TABLE ONLY sales.quotation_line
    ADD CONSTRAINT quotation_line_product_id_fkey FOREIGN KEY (product_id) REFERENCES core.product(id);


--
-- Name: quotation_line quotation_line_quotation_id_fkey; Type: FK CONSTRAINT; Schema: sales; Owner: -
--

ALTER TABLE ONLY sales.quotation_line
    ADD CONSTRAINT quotation_line_quotation_id_fkey FOREIGN KEY (quotation_id) REFERENCES sales.quotation(id) ON DELETE CASCADE;


--
-- Name: quotation quotation_partner_id_fkey; Type: FK CONSTRAINT; Schema: sales; Owner: -
--

ALTER TABLE ONLY sales.quotation
    ADD CONSTRAINT quotation_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES core.partner(id);


--
-- Name: quotation quotation_payment_method_id_fkey; Type: FK CONSTRAINT; Schema: sales; Owner: -
--

ALTER TABLE ONLY sales.quotation
    ADD CONSTRAINT quotation_payment_method_id_fkey FOREIGN KEY (payment_method_id) REFERENCES core.payment_method(id);


--
-- Name: quotation quotation_requester_dept_id_fkey; Type: FK CONSTRAINT; Schema: sales; Owner: -
--

ALTER TABLE ONLY sales.quotation
    ADD CONSTRAINT quotation_requester_dept_id_fkey FOREIGN KEY (requester_dept_id) REFERENCES core.department(id);


--
-- Name: quotation quotation_requester_id_fkey; Type: FK CONSTRAINT; Schema: sales; Owner: -
--

ALTER TABLE ONLY sales.quotation
    ADD CONSTRAINT quotation_requester_id_fkey FOREIGN KEY (requester_id) REFERENCES core.employee(id);


--
-- Name: sales_allowance_line sales_allowance_line_allowance_id_fkey; Type: FK CONSTRAINT; Schema: sales; Owner: -
--

ALTER TABLE ONLY sales.sales_allowance_line
    ADD CONSTRAINT sales_allowance_line_allowance_id_fkey FOREIGN KEY (allowance_id) REFERENCES sales.sales_allowance(id) ON DELETE CASCADE;


--
-- Name: sales_allowance_line sales_allowance_line_product_id_fkey; Type: FK CONSTRAINT; Schema: sales; Owner: -
--

ALTER TABLE ONLY sales.sales_allowance_line
    ADD CONSTRAINT sales_allowance_line_product_id_fkey FOREIGN KEY (product_id) REFERENCES core.product(id);


--
-- Name: sales_allowance sales_allowance_order_id_fkey; Type: FK CONSTRAINT; Schema: sales; Owner: -
--

ALTER TABLE ONLY sales.sales_allowance
    ADD CONSTRAINT sales_allowance_order_id_fkey FOREIGN KEY (order_id) REFERENCES sales.sales_order(id);


--
-- Name: sales_order sales_order_approver_id_fkey; Type: FK CONSTRAINT; Schema: sales; Owner: -
--

ALTER TABLE ONLY sales.sales_order
    ADD CONSTRAINT sales_order_approver_id_fkey FOREIGN KEY (approver_id) REFERENCES core.app_user(id);


--
-- Name: sales_order sales_order_delivery_addr_id_fkey; Type: FK CONSTRAINT; Schema: sales; Owner: -
--

ALTER TABLE ONLY sales.sales_order
    ADD CONSTRAINT sales_order_delivery_addr_id_fkey FOREIGN KEY (delivery_addr_id) REFERENCES core.partner_address(id);


--
-- Name: sales_order sales_order_delivery_method_id_fkey; Type: FK CONSTRAINT; Schema: sales; Owner: -
--

ALTER TABLE ONLY sales.sales_order
    ADD CONSTRAINT sales_order_delivery_method_id_fkey FOREIGN KEY (delivery_method_id) REFERENCES core.delivery_method(id);


--
-- Name: sales_order_line sales_order_line_order_id_fkey; Type: FK CONSTRAINT; Schema: sales; Owner: -
--

ALTER TABLE ONLY sales.sales_order_line
    ADD CONSTRAINT sales_order_line_order_id_fkey FOREIGN KEY (order_id) REFERENCES sales.sales_order(id) ON DELETE CASCADE;


--
-- Name: sales_order_line sales_order_line_product_id_fkey; Type: FK CONSTRAINT; Schema: sales; Owner: -
--

ALTER TABLE ONLY sales.sales_order_line
    ADD CONSTRAINT sales_order_line_product_id_fkey FOREIGN KEY (product_id) REFERENCES core.product(id);


--
-- Name: sales_order sales_order_partner_id_fkey; Type: FK CONSTRAINT; Schema: sales; Owner: -
--

ALTER TABLE ONLY sales.sales_order
    ADD CONSTRAINT sales_order_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES core.partner(id);


--
-- Name: sales_order sales_order_payment_method_id_fkey; Type: FK CONSTRAINT; Schema: sales; Owner: -
--

ALTER TABLE ONLY sales.sales_order
    ADD CONSTRAINT sales_order_payment_method_id_fkey FOREIGN KEY (payment_method_id) REFERENCES core.payment_method(id);


--
-- Name: sales_order sales_order_quotation_id_fkey; Type: FK CONSTRAINT; Schema: sales; Owner: -
--

ALTER TABLE ONLY sales.sales_order
    ADD CONSTRAINT sales_order_quotation_id_fkey FOREIGN KEY (quotation_id) REFERENCES sales.quotation(id);


--
-- Name: sales_order sales_order_salesperson_id_fkey; Type: FK CONSTRAINT; Schema: sales; Owner: -
--

ALTER TABLE ONLY sales.sales_order
    ADD CONSTRAINT sales_order_salesperson_id_fkey FOREIGN KEY (salesperson_id) REFERENCES core.employee(id);


--
-- Name: sales_order sales_order_warehouse_id_fkey; Type: FK CONSTRAINT; Schema: sales; Owner: -
--

ALTER TABLE ONLY sales.sales_order
    ADD CONSTRAINT sales_order_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES core.warehouse(id);


--
-- Name: sales_target sales_target_employee_id_fkey; Type: FK CONSTRAINT; Schema: sales; Owner: -
--

ALTER TABLE ONLY sales.sales_target
    ADD CONSTRAINT sales_target_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES core.employee(id);


--
-- Name: scheme_item scheme_item_scheme_id_fkey; Type: FK CONSTRAINT; Schema: sales; Owner: -
--

ALTER TABLE ONLY sales.scheme_item
    ADD CONSTRAINT scheme_item_scheme_id_fkey FOREIGN KEY (scheme_id) REFERENCES sales.promotional_scheme(id) ON DELETE CASCADE;


--
-- Name: scheme_price_slab scheme_price_slab_scheme_id_fkey; Type: FK CONSTRAINT; Schema: sales; Owner: -
--

ALTER TABLE ONLY sales.scheme_price_slab
    ADD CONSTRAINT scheme_price_slab_scheme_id_fkey FOREIGN KEY (scheme_id) REFERENCES sales.promotional_scheme(id) ON DELETE CASCADE;


--
-- Name: scheme_product_slab scheme_product_slab_scheme_id_fkey; Type: FK CONSTRAINT; Schema: sales; Owner: -
--

ALTER TABLE ONLY sales.scheme_product_slab
    ADD CONSTRAINT scheme_product_slab_scheme_id_fkey FOREIGN KEY (scheme_id) REFERENCES sales.promotional_scheme(id) ON DELETE CASCADE;


--
-- Name: so_cost so_cost_approved_by_fkey; Type: FK CONSTRAINT; Schema: sales; Owner: -
--

ALTER TABLE ONLY sales.so_cost
    ADD CONSTRAINT so_cost_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES core.app_user(id);


--
-- Name: so_cost so_cost_cost_type_id_fkey; Type: FK CONSTRAINT; Schema: sales; Owner: -
--

ALTER TABLE ONLY sales.so_cost
    ADD CONSTRAINT so_cost_cost_type_id_fkey FOREIGN KEY (cost_type_id) REFERENCES core.cost_type(id);


--
-- Name: so_cost so_cost_order_id_fkey; Type: FK CONSTRAINT; Schema: sales; Owner: -
--

ALTER TABLE ONLY sales.so_cost
    ADD CONSTRAINT so_cost_order_id_fkey FOREIGN KEY (order_id) REFERENCES sales.sales_order(id) ON DELETE CASCADE;


--
-- Name: so_cost so_cost_payee_id_fkey; Type: FK CONSTRAINT; Schema: sales; Owner: -
--

ALTER TABLE ONLY sales.so_cost
    ADD CONSTRAINT so_cost_payee_id_fkey FOREIGN KEY (payee_id) REFERENCES core.partner(id);


--
-- Name: so_payment_actual so_payment_actual_method_id_fkey; Type: FK CONSTRAINT; Schema: sales; Owner: -
--

ALTER TABLE ONLY sales.so_payment_actual
    ADD CONSTRAINT so_payment_actual_method_id_fkey FOREIGN KEY (method_id) REFERENCES core.payment_method(id);


--
-- Name: so_payment_actual so_payment_actual_order_id_fkey; Type: FK CONSTRAINT; Schema: sales; Owner: -
--

ALTER TABLE ONLY sales.so_payment_actual
    ADD CONSTRAINT so_payment_actual_order_id_fkey FOREIGN KEY (order_id) REFERENCES sales.sales_order(id) ON DELETE CASCADE;


--
-- Name: so_payment_request so_payment_request_order_id_fkey; Type: FK CONSTRAINT; Schema: sales; Owner: -
--

ALTER TABLE ONLY sales.so_payment_request
    ADD CONSTRAINT so_payment_request_order_id_fkey FOREIGN KEY (order_id) REFERENCES sales.sales_order(id) ON DELETE CASCADE;


--
-- Name: so_promotion so_promotion_order_id_fkey; Type: FK CONSTRAINT; Schema: sales; Owner: -
--

ALTER TABLE ONLY sales.so_promotion
    ADD CONSTRAINT so_promotion_order_id_fkey FOREIGN KEY (order_id) REFERENCES sales.sales_order(id) ON DELETE CASCADE;


--
-- Name: so_promotion so_promotion_promotion_id_fkey; Type: FK CONSTRAINT; Schema: sales; Owner: -
--

ALTER TABLE ONLY sales.so_promotion
    ADD CONSTRAINT so_promotion_promotion_id_fkey FOREIGN KEY (promotion_id) REFERENCES sales.promotion(id);


--
-- PostgreSQL database dump complete
--

