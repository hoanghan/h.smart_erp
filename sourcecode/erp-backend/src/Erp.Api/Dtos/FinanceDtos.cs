using Erp.Api.Entities;

namespace Erp.Api.Dtos;

// ===== Account =====
public record AccountOut(long Id, string Code, string Name, long? ParentId, string AccountType, long? ObjectCategoryId, string BalanceDetail, string BalanceSide, bool IsActive);
public record AccountCreate(string Code, string Name, long? ParentId, string AccountType = "NORMAL", long? ObjectCategoryId = null, string BalanceDetail = "NONE", string BalanceSide = "GREATER");
public record AccountUpdate(string? Name, long? ParentId, string? AccountType, long? ObjectCategoryId, string? BalanceDetail, string? BalanceSide, bool? IsActive);

// ===== FiscalPeriod =====
public record FiscalPeriodOut(long Id, int FiscalYear, int PeriodNo, DateOnly DateFrom, DateOnly DateTo, string Status);
public record FiscalPeriodClose(string? Reason);

// ===== AccountingPolicy =====
public record AccountingPolicyOut(long Id, string BaseCurrency, string? AccountingRegime, int FiscalStartMonth, string InventoryCosting, long? FirstPeriodId);
public record AccountingPolicyUpdate(string? BaseCurrency, string? AccountingRegime, int? FiscalStartMonth, string? InventoryCosting, long? FirstPeriodId);

// ===== CashFund =====
public record CashFundOut(long Id, string Code, string Name, string FundType, long AccountId, string? BankName, string? AccountNo, string CurrencyCode);
public record CashFundCreate(string Code, string Name, string FundType, long AccountId, string? BankName = null, string? AccountNo = null, string CurrencyCode = "VND");
public record CashFundUpdate(string? Name, string? BankName, string? AccountNo);

// ===== ObjectCategory =====
public record ObjectCategoryOut(long Id, string Code, string Name, string? SourceTable);
public record ObjectCategoryCreate(string Code, string Name, string? SourceTable = null);

// ===== BusinessOperation =====
public record BusinessOperationOut(long Id, string Code, string Name, string VoucherType, string Template);
public record BusinessOperationCreate(string Code, string Name, string VoucherType, string Template);

// ===== OpeningBalance =====
public record OpeningBalanceOut(long Id, long PeriodId, long AccountId, string? ObjectType, long? ObjectId, string? CurrencyCode, long? WarehouseId, long? ProductId, decimal DebitFc, decimal CreditFc, decimal Debit, decimal Credit, decimal? Quantity);
public record OpeningBalanceCreate(long PeriodId, long AccountId, string? ObjectType, long? ObjectId, string? CurrencyCode, long? WarehouseId, long? ProductId, decimal DebitFc = 0, decimal CreditFc = 0, decimal Debit = 0, decimal Credit = 0, decimal? Quantity = null);

// ===== LerpVoucher =====
public record LerpVoucherOut(long Id, string VoucherType, string SourceTable, long SourceId, string? RefNo, long? PartnerId, decimal? Amount, string Status, long? VoucherId, DateTimeOffset CreatedAt);
public record LerpVoucherGenerateRequest(long? PeriodId, DateOnly? PostingDate);

// ===== Voucher =====
public record VoucherLineOut(long Id, long VoucherId, long? ProductId, string? Description, decimal? Quantity, decimal? UnitPrice, decimal Amount, decimal? VatPct, decimal? VatAmount, long? DrAccountId, long? CrAccountId, long? DrObjectId, string? DrObjectType, long? CrObjectId, string? CrObjectType, long? RefVoucherId);
public record VoucherOut(long Id, string VoucherType, string DocNo, DateOnly DocDate, DateOnly? PostingDate, long? PeriodId, long? OperationId, long? PartnerId, long? FundId, long? WarehouseId, string? YccType, string? InvoiceNo, string CurrencyCode, decimal ExchangeRate, decimal? TotalAmount, decimal? TotalVat, string? Description, long? LerpVoucherId, string Status, long? CreatedBy, DateTimeOffset CreatedAt, List<VoucherLineOut> Lines);

public record VoucherCreate(string VoucherType, string? DocNo, DateOnly? DocDate, DateOnly? PostingDate, long? PeriodId, long? OperationId, long? PartnerId, long? EmployeeId, long? FundId, long? WarehouseId, string? YccType, string? InvoiceNo, string? InvoiceSerial, string? InvoiceForm, DateOnly? InvoiceDate, string? CurrencyCode, decimal? ExchangeRate, string? Description, long? LerpVoucherId, List<VoucherLineCreate>? Lines);
public record VoucherLineCreate(long? ProductId, string? Description, decimal? Quantity, decimal? UnitPrice, decimal Amount = 0, decimal? VatPct = null, decimal? VatAmount = null, long? DrAccountId = null, long? CrAccountId = null, long? DrObjectId = null, string? DrObjectType = null, long? CrObjectId = null, string? CrObjectType = null, long? RefVoucherId = null);
public record VoucherUpdate(string? Description, string? Status, string? InvoiceNo, DateOnly? PostingDate);

// ===== GlEntry =====
public record GlEntryOut(long Id, long VoucherId, long? VoucherLineId, long AccountId, string? ObjectType, long? ObjectId, string? CurrencyCode, decimal? ExchangeRate, decimal FcAmount, decimal Amount, string Side, string? Description, DateOnly? PostingDate, long? PeriodId, DateTimeOffset CreatedAt);

// ===== BankFee =====
public record BankFeeOut(long Id, long TransferVoucherId, decimal Amount, long FeeAccountId, long? PaidFromFundId, string? Note);
public record BankFeeCreate(long TransferVoucherId, decimal Amount, long FeeAccountId, long? PaidFromFundId = null, string? Note = null);

// ===== Helpers =====
public static class FinanceMapper
{
    public static AccountOut ToDto(this Account a) => new(a.Id, a.Code, a.Name, a.ParentId, a.AccountType, a.ObjectCategoryId, a.BalanceDetail, a.BalanceSide, a.IsActive);
    public static FiscalPeriodOut ToDto(this FiscalPeriod p) => new(p.Id, p.FiscalYear, p.PeriodNo, p.DateFrom, p.DateTo, p.Status);
    public static AccountingPolicyOut ToDto(this AccountingPolicy p) => new(p.Id, p.BaseCurrency, p.AccountingRegime, p.FiscalStartMonth, p.InventoryCosting, p.FirstPeriodId);
    public static CashFundOut ToDto(this CashFund f) => new(f.Id, f.Code, f.Name, f.FundType, f.AccountId, f.BankName, f.AccountNo, f.CurrencyCode);
    public static ObjectCategoryOut ToDto(this ObjectCategory c) => new(c.Id, c.Code, c.Name, c.SourceTable);
    public static BusinessOperationOut ToDto(this BusinessOperation o) => new(o.Id, o.Code, o.Name, o.VoucherType, o.Template);
    public static OpeningBalanceOut ToDto(this OpeningBalance b) => new(b.Id, b.PeriodId, b.AccountId, b.ObjectType, b.ObjectId, b.CurrencyCode, b.WarehouseId, b.ProductId, b.DebitFc, b.CreditFc, b.Debit, b.Credit, b.Quantity);
    public static LerpVoucherOut ToDto(this LerpVoucher lv) => new(lv.Id, lv.VoucherType, lv.SourceTable, lv.SourceId, lv.RefNo, lv.PartnerId, lv.Amount, lv.Status, lv.VoucherId, lv.CreatedAt);
    public static VoucherLineOut ToDto(this VoucherLine l) => new(l.Id, l.VoucherId, l.ProductId, l.Description, l.Quantity, l.UnitPrice, l.Amount, l.VatPct, l.VatAmount, l.DrAccountId, l.CrAccountId, l.DrObjectId, l.DrObjectType, l.CrObjectId, l.CrObjectType, l.RefVoucherId);
    public static VoucherOut ToDto(this Voucher v) => new(v.Id, v.VoucherType, v.DocNo, v.DocDate, v.PostingDate, v.PeriodId, v.OperationId, v.PartnerId, v.FundId, v.WarehouseId, v.YccType, v.InvoiceNo, v.CurrencyCode, v.ExchangeRate, v.TotalAmount, v.TotalVat, v.Description, v.LerpVoucherId, v.Status, v.CreatedBy, v.CreatedAt, v.Lines.Select(ToDto).ToList());
    public static GlEntryOut ToDto(this GlEntry e) => new(e.Id, e.VoucherId, e.VoucherLineId, e.AccountId, e.ObjectType, e.ObjectId, e.CurrencyCode, e.ExchangeRate, e.FcAmount, e.Amount, e.Side, e.Description, e.PostingDate, e.PeriodId, e.CreatedAt);
    public static BankFeeOut ToDto(this BankFee f) => new(f.Id, f.TransferVoucherId, f.Amount, f.FeeAccountId, f.PaidFromFundId, f.Note);
}