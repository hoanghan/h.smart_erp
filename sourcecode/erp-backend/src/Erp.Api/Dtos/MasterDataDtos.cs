namespace Erp.Api.Dtos;

// ---------- UOM ----------
public record UomOut(long Id, string Code, string Name);
public record UomCreate(string Code, string Name);
public record UomUpdate(string? Code, string? Name);

// ---------- Payment / Delivery method ----------
public record PaymentMethodOut(long Id, string Code, string Name, int DueDays);
public record PaymentMethodCreate(string Code, string Name, int DueDays = 0);
public record PaymentMethodUpdate(string? Code, string? Name, int? DueDays);

public record DeliveryMethodOut(long Id, string Code, string Name);
public record DeliveryMethodCreate(string Code, string Name);
public record DeliveryMethodUpdate(string? Code, string? Name);

// ---------- Product group / Product ----------
public record ProductGroupOut(long Id, string Code, string Name, long? ParentId);
public record ProductGroupCreate(string Code, string Name, long? ParentId);
public record ProductGroupUpdate(string? Code, string? Name, long? ParentId);

public record ProductOut(
    long Id, string Code, string Name, string ProductType, long? GroupId, long UomId,
    bool IsKit, decimal? PriceWeight, string? Barcode, string? Spec, decimal? MinStock, bool IsActive);

public record ProductCreate(
    string Code, string Name, long UomId, string ProductType = "GOODS", long? GroupId = null,
    bool IsKit = false, decimal? PriceWeight = null, string? Barcode = null,
    string? QrCode = null, string? Spec = null, decimal? MinStock = null);

public record ProductUpdate(
    string? Code, string? Name, long? UomId, string? ProductType, long? GroupId,
    bool? IsKit, decimal? PriceWeight, string? Barcode, string? QrCode,
    string? Spec, decimal? MinStock, bool? IsActive);

// ---------- Partner ----------
public record PartnerOut(
    long Id, string Code, string ShortName, string? FullName, string? TaxCode,
    bool IsCustomer, bool IsSupplier, string? Address, string? Phone, string? Email,
    long? PaymentMethodId, long? DeliveryMethodId, long? SalespersonId,
    decimal? CreditLimit, int? CreditDays, bool IsActive);

public record PartnerCreate(
    string Code, string ShortName, string? FullName = null, string? TaxCode = null,
    bool IsCustomer = false, bool IsSupplier = false, string? CustomerGroup = null,
    string? Source = null, string? Ranking = null, string? Country = null,
    string? Province = null, string? District = null, string? Address = null,
    string? Phone = null, string? Hotline = null, string? Fax = null,
    string? Email = null, string? Website = null, long? PaymentMethodId = null,
    long? DeliveryMethodId = null, long? SalespersonId = null,
    decimal? CreditLimit = null, int? CreditDays = null);

public record PartnerUpdate(
    string? Code, string? ShortName, string? FullName, string? TaxCode,
    bool? IsCustomer, bool? IsSupplier, string? CustomerGroup, string? Source,
    string? Ranking, string? Country, string? Province, string? District,
    string? Address, string? Phone, string? Hotline, string? Fax, string? Email,
    string? Website, long? PaymentMethodId, long? DeliveryMethodId,
    long? SalespersonId, decimal? CreditLimit, int? CreditDays, bool? IsActive);

// ---------- Warehouse ----------
public record WarehouseOut(long Id, string Code, string Name, bool IsOutsourcing, bool IsActive);
public record WarehouseCreate(string Code, string Name, bool IsOutsourcing = false);
public record WarehouseUpdate(string? Code, string? Name, bool? IsOutsourcing, bool? IsActive);

// ---------- Cost type ----------
public record CostTypeOut(long Id, string Code, string Name, string Scope, string? AccountCode);
public record CostTypeCreate(string Code, string Name, string Scope = "SALES", string? AccountCode = null);
public record CostTypeUpdate(string? Code, string? Name, string? Scope, string? AccountCode);

// ---------- Partner sales cost ----------
public record PartnerSalesCostIn(long CostTypeId, long PayeeId, decimal? RatePct = null, decimal? VatPct = null);
public record PartnerSalesCostOut(long Id, long PartnerId, long CostTypeId, long PayeeId, decimal? RatePct, decimal? VatPct);

// ---------- Department / Employee ----------
public record DepartmentOut(long Id, string Code, string Name, long? ParentId, bool IsActive);
public record DepartmentCreate(string Code, string Name, long? ParentId);
public record DepartmentUpdate(string? Code, string? Name, long? ParentId, bool? IsActive);

public record EmployeeOut(
    long Id, string Code, string FullName, long? DepartmentId,
    string? Phone, string? Email, bool IsActive);
public record EmployeeCreate(
    string Code, string FullName, long? DepartmentId = null,
    string? Phone = null, string? Email = null);
public record EmployeeUpdate(
    string? Code, string? FullName, long? DepartmentId,
    string? Phone, string? Email, bool? IsActive);

// ---------- User lookup (cho creatorId/approverId — AppUser.Id, không phải Employee.Id) ----------
public record UserLookupOut(long Id, string Code, string Name);

// ---------- Payment Terms Template ----------
public record PaymentTermsTemplateLineOut(long Id, decimal Pct, int DaysAfter, string? Note);
public record PaymentTermsTemplateOut(
    long Id, string Code, string Name, bool IsActive,
    List<PaymentTermsTemplateLineOut> Lines);
public record PaymentTermsTemplateCreate(
    string Code, string Name, List<PaymentTermsTemplateLineIn>? Lines = null);
public record PaymentTermsTemplateLineIn(decimal Pct, int DaysAfter, string? Note = null);
public record PaymentTermsTemplateUpdate(string? Code, string? Name, bool? IsActive);

// ---------- Tax Charge Template ----------
public record TaxChargeTemplateLineOut(
    long Id, string ChargeType, decimal? RatePct, decimal? FixedAmount, string? AccountCode, string? Note);
public record TaxChargeTemplateOut(
    long Id, string Code, string Name, bool IsActive,
    List<TaxChargeTemplateLineOut> Lines);
public record TaxChargeTemplateCreate(
    string Code, string Name, List<TaxChargeTemplateLineIn>? Lines = null);
public record TaxChargeTemplateLineIn(
    string ChargeType = "ON_NET_TOTAL", decimal? RatePct = null,
    decimal? FixedAmount = null, string? AccountCode = null, string? Note = null);
public record TaxChargeTemplateUpdate(string? Code, string? Name, bool? IsActive);
