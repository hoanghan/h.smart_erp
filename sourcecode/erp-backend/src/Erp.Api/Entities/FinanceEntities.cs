namespace Erp.Api.Entities;

// ============================================================
// Finance — Kế toán (schema: finance)
// ============================================================

/// <summary>finance.object_category — Danh mục đối tượng quản lý.</summary>
public class ObjectCategory
{
    public long Id { get; set; }
    public string Code { get; set; } = null!;
    public string Name { get; set; } = null!;
    public string? SourceTable { get; set; }
}

/// <summary>finance.account — Hệ thống tài khoản.</summary>
public class Account
{
    public long Id { get; set; }
    public string Code { get; set; } = null!;
    public string Name { get; set; } = null!;
    public long? ParentId { get; set; }
    public string AccountType { get; set; } = "NORMAL";
    public long? ObjectCategoryId { get; set; }
    public string BalanceDetail { get; set; } = "NONE";
    public string BalanceSide { get; set; } = "GREATER";
    public bool IsActive { get; set; } = true;
}

/// <summary>finance.fiscal_period — Kỳ kế toán.</summary>
public class FiscalPeriod
{
    public long Id { get; set; }
    public int FiscalYear { get; set; }
    public int PeriodNo { get; set; }
    public DateOnly DateFrom { get; set; }
    public DateOnly DateTo { get; set; }
    public string Status { get; set; } = "OPEN";
}

/// <summary>finance.accounting_policy — Chính sách kế toán.</summary>
public class AccountingPolicy
{
    public long Id { get; set; } = 1;
    public string BaseCurrency { get; set; } = "VND";
    public string? AccountingRegime { get; set; }
    public int FiscalStartMonth { get; set; } = 1;
    public string InventoryCosting { get; set; } = "AVG";
    public long? FirstPeriodId { get; set; }
}

/// <summary>finance.opening_balance — Số dư đầu kỳ.</summary>
public class OpeningBalance
{
    public long Id { get; set; }
    public long PeriodId { get; set; }
    public long AccountId { get; set; }
    public string? ObjectType { get; set; }
    public long? ObjectId { get; set; }
    public string? CurrencyCode { get; set; }
    public long? WarehouseId { get; set; }
    public long? ProductId { get; set; }
    public decimal DebitFc { get; set; }
    public decimal CreditFc { get; set; }
    public decimal Debit { get; set; }
    public decimal Credit { get; set; }
    public decimal? Quantity { get; set; }
}

/// <summary>finance.business_operation — Danh mục Nghiệp vụ (mẫu định khoản).</summary>
public class BusinessOperation
{
    public long Id { get; set; }
    public string Code { get; set; } = null!;
    public string Name { get; set; } = null!;
    public string VoucherType { get; set; } = null!;
    public string Template { get; set; } = null!;
}

/// <summary>finance.cash_fund — Quỹ tiền mặt/ngân hàng.</summary>
public class CashFund
{
    public long Id { get; set; }
    public string Code { get; set; } = null!;
    public string Name { get; set; } = null!;
    public string FundType { get; set; } = "CASH";
    public long AccountId { get; set; }
    public string? BankName { get; set; }
    public string? AccountNo { get; set; }
    public string CurrencyCode { get; set; } = "VND";
}

/// <summary>finance.outbox_event — Transactional outbox.</summary>
public class OutboxEvent
{
    public long Id { get; set; }
    public string EventType { get; set; } = null!;
    public string SourceTable { get; set; } = null!;
    public long SourceId { get; set; }
    public string Payload { get; set; } = null!;
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? ProcessedAt { get; set; }
}

/// <summary>finance.lerp_voucher — Phiếu LERP (cầu nối SCRM → FACM).</summary>
public class LerpVoucher
{
    public long Id { get; set; }
    public string VoucherType { get; set; } = null!;
    public string SourceTable { get; set; } = null!;
    public long SourceId { get; set; }
    public string? RefNo { get; set; }
    public long? PartnerId { get; set; }
    public decimal? Amount { get; set; }
    public string Status { get; set; } = "PENDING";
    public long? VoucherId { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}

/// <summary>finance.voucher — Chứng từ kế toán hợp nhất.</summary>
public class Voucher
{
    public long Id { get; set; }
    public string VoucherType { get; set; } = null!;
    public string DocNo { get; set; } = null!;
    public DateOnly DocDate { get; set; }
    public DateOnly? PostingDate { get; set; }
    public long? PeriodId { get; set; }
    public long? OperationId { get; set; }
    public long? PartnerId { get; set; }
    public long? EmployeeId { get; set; }
    public long? FundId { get; set; }
    public long? WarehouseId { get; set; }
    public string? YccType { get; set; }
    public string? InvoiceNo { get; set; }
    public string? InvoiceSerial { get; set; }
    public string? InvoiceForm { get; set; }
    public DateOnly? InvoiceDate { get; set; }
    public string CurrencyCode { get; set; } = "VND";
    public decimal ExchangeRate { get; set; } = 1;
    public decimal? TotalAmount { get; set; }
    public decimal? TotalVat { get; set; }
    public string? Description { get; set; }
    public long? LerpVoucherId { get; set; }
    public string Status { get; set; } = "DRAFT";
    public long? PostedBy { get; set; }
    public DateTimeOffset? PostedAt { get; set; }
    public long? CreatedBy { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public List<VoucherLine> Lines { get; set; } = new();
}

/// <summary>finance.voucher_line — Dòng chứng từ kế toán.</summary>
public class VoucherLine
{
    public long Id { get; set; }
    public long VoucherId { get; set; }
    public long? ProductId { get; set; }
    public string? Description { get; set; }
    public decimal? Quantity { get; set; }
    public decimal? UnitPrice { get; set; }
    public decimal Amount { get; set; }
    public decimal? VatPct { get; set; }
    public decimal? VatAmount { get; set; }
    public long? DrAccountId { get; set; }
    public long? CrAccountId { get; set; }
    public long? DrObjectId { get; set; }
    public string? DrObjectType { get; set; }
    public long? CrObjectId { get; set; }
    public string? CrObjectType { get; set; }
    public long? RefVoucherId { get; set; }
}

/// <summary>finance.gl_entry — Sổ cái (immutable khi POSTED).</summary>
public class GlEntry
{
    public long Id { get; set; }
    public long VoucherId { get; set; }
    public long? VoucherLineId { get; set; }
    public long AccountId { get; set; }
    public string? ObjectType { get; set; }
    public long? ObjectId { get; set; }
    public string? CurrencyCode { get; set; }
    public decimal? ExchangeRate { get; set; }
    public decimal FcAmount { get; set; }
    public decimal Amount { get; set; }
    public string Side { get; set; } = null!; // DEBIT or CREDIT
    public string? Description { get; set; }
    public DateOnly? PostingDate { get; set; }
    public long? PeriodId { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}

/// <summary>finance.bank_fee — Phí ngân hàng.</summary>
public class BankFee
{
    public long Id { get; set; }
    public long TransferVoucherId { get; set; }
    public decimal Amount { get; set; }
    public long FeeAccountId { get; set; }
    public long? PaidFromFundId { get; set; }
    public string? Note { get; set; }
}