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
    public bool RequireCostCenter { get; set; }
    public bool PerpetualInventory { get; set; } = true;
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

    // ===== Task 23: ERPNext upgrade =====
    /// <summary>Số tiền còn phải thu/trả (hóa đơn HOA_DON_BAN/PHIEU_MUA_HANG).</summary>
    public decimal? OutstandingAmount { get; set; }
    public DateOnly? DueDate { get; set; }
    /// <summary>UNPAID / PARTLY_PAID / PAID / OVERDUE / RETURN.</summary>
    public string? PaymentStatus { get; set; }
    /// <summary>RECEIVE / PAY / INTERNAL_TRANSFER (cho PHIEU_THU/PHIEU_CHI).</summary>
    public string? PaymentType { get; set; }
    public decimal? PaidAmount { get; set; }
    public decimal? UnallocatedAmount { get; set; }
    /// <summary>Voucher gốc khi amend (cancel rồi tạo bản copy doc_no -1).</summary>
    public long? AmendedFromId { get; set; }

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
    /// <summary>Task 23: trung tâm chi phí (bắt buộc cho TK 642... nếu accounting_policy.require_cost_center).</summary>
    public long? CostCenterId { get; set; }
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

    // ===== Task 23: ERPNext upgrade =====
    /// <summary>Bút toán đảo (cancel-posting) — cả bộ gốc và bộ đảo đều set true.</summary>
    public bool IsCancelled { get; set; }
    public string? Remarks { get; set; }
    public long? CostCenterId { get; set; }
    /// <summary>Tóm tắt TK đối ứng (vd "111" khi định khoản Nợ 632 / Có 111).</summary>
    public string? Against { get; set; }
    public string? PartyType { get; set; }
    public long? PartyId { get; set; }
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

// ============================================================
// Task 23: Finance ERPNext upgrade
// ============================================================

/// <summary>finance.cost_center — Cây trung tâm chi phí.</summary>
public class CostCenter
{
    public long Id { get; set; }
    public string Code { get; set; } = null!;
    public string Name { get; set; } = null!;
    public long? ParentId { get; set; }
    public bool IsGroup { get; set; }
    public bool IsActive { get; set; } = true;
}

/// <summary>finance.payment_allocation — Phân bổ Payment Entry vào hóa đơn.</summary>
public class PaymentAllocation
{
    public long Id { get; set; }
    public long PaymentVoucherId { get; set; }
    public long InvoiceVoucherId { get; set; }
    public decimal AllocatedAmount { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}

/// <summary>finance.fs_mapping — Mapping chỉ tiêu báo cáo tài chính (B01/B02/B03) ↔ tài khoản, theo TT200.</summary>
public class FsMapping
{
    public long Id { get; set; }
    public string Statement { get; set; } = null!; // B01 / B02 / B03
    public string ItemCode { get; set; } = null!;
    public string ItemName { get; set; } = null!;
    public int DisplayOrder { get; set; }
    public int IndentLevel { get; set; }
    public string[]? AccountPrefixes { get; set; }
    /// <summary>Tham chiếu chỉ tiêu khác, dạng "CODE" (cùng statement) hoặc "STMT:CODE" (statement khác).</summary>
    public string[]? FormulaItemCodes { get; set; }
    public int[]? FormulaSigns { get; set; }
    public int Sign { get; set; } = 1;
    /// <summary>True nếu giá trị là biến động kỳ (end - start) thay vì số dư tại thời điểm/lũy kế kỳ.</summary>
    public bool IsPeriodDelta { get; set; }
}