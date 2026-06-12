namespace Erp.Api.Entities;

public class Uom
{
    public long Id { get; set; }
    public string Code { get; set; } = null!;
    public string Name { get; set; } = null!;
}

public class Currency
{
    public string Code { get; set; } = null!;
    public string Name { get; set; } = null!;
}

public class PaymentMethod
{
    public long Id { get; set; }
    public string Code { get; set; } = null!;
    public string Name { get; set; } = null!;
    public int DueDays { get; set; }
}

public class DeliveryMethod
{
    public long Id { get; set; }
    public string Code { get; set; } = null!;
    public string Name { get; set; } = null!;
}

public class ProductGroup
{
    public long Id { get; set; }
    public string Code { get; set; } = null!;
    public string Name { get; set; } = null!;
    public long? ParentId { get; set; }
}

public class Product
{
    public long Id { get; set; }
    public string Code { get; set; } = null!;
    public string Name { get; set; } = null!;
    public string ProductType { get; set; } = "GOODS";
    public long? GroupId { get; set; }
    public long UomId { get; set; }
    public bool IsKit { get; set; }
    public decimal? PriceWeight { get; set; }
    public string? Barcode { get; set; }
    public string? QrCode { get; set; }
    public string? Spec { get; set; }
    public decimal? MinStock { get; set; }
    public bool IsActive { get; set; } = true;
}

public class Partner
{
    public long Id { get; set; }
    public string Code { get; set; } = null!;
    public string? TaxCode { get; set; }
    public string ShortName { get; set; } = null!;
    public string? FullName { get; set; }
    public bool IsCustomer { get; set; }
    public bool IsSupplier { get; set; }
    public string? CustomerGroup { get; set; }
    public string? Source { get; set; }
    public string? Ranking { get; set; }
    public string? Country { get; set; }
    public string? Province { get; set; }
    public string? District { get; set; }
    public string? Address { get; set; }
    public string? Phone { get; set; }
    public string? Hotline { get; set; }
    public string? Fax { get; set; }
    public string? Email { get; set; }
    public string? Website { get; set; }
    public long? PaymentMethodId { get; set; }
    public long? DeliveryMethodId { get; set; }
    public long? SalespersonId { get; set; }
    public decimal? CreditLimit { get; set; }
    public int? CreditDays { get; set; }
    public bool IsActive { get; set; } = true;
}

public class Warehouse
{
    public long Id { get; set; }
    public string Code { get; set; } = null!;
    public string Name { get; set; } = null!;
    public long? ParentId { get; set; }
    public bool IsOutsourcing { get; set; }
    public bool IsActive { get; set; } = true;
}

/// <summary>core.process — quy trình gia công (XI, NHUNG_NONG, TARO_TAN).</summary>
public class Process
{
    public long Id { get; set; }
    public string Code { get; set; } = null!;
    public string Name { get; set; } = null!;
}

/// <summary>core.cost_type — loại chi phí (vận chuyển, hoa hồng, gia công...).</summary>
public class CostType
{
    public long Id { get; set; }
    public string Code { get; set; } = null!;
    public string Name { get; set; } = null!;
    public string Scope { get; set; } = "SALES";   // SALES | PURCHASE | RECEIPT | OUTSOURCING
    public string? AccountCode { get; set; }
}

/// <summary>core.partner_sales_cost — chi phí bán hàng mặc định theo khách hàng.</summary>
public class PartnerSalesCost
{
    public long Id { get; set; }
    public long PartnerId { get; set; }
    public long CostTypeId { get; set; }
    public long PayeeId { get; set; }
    public decimal? RatePct { get; set; }
    public decimal? VatPct { get; set; }
}

/// <summary>core.payment_terms_template — mẫu điều khoản thanh toán.</summary>
public class PaymentTermsTemplate
{
    public long Id { get; set; }
    public string Code { get; set; } = null!;
    public string Name { get; set; } = null!;
    public bool IsActive { get; set; } = true;

    public List<PaymentTermsTemplateLine> Lines { get; set; } = new();
}

/// <summary>core.payment_terms_template_line</summary>
public class PaymentTermsTemplateLine
{
    public long Id { get; set; }
    public long TemplateId { get; set; }
    public decimal Pct { get; set; }
    public int DaysAfter { get; set; }
    public string? Note { get; set; }
}

/// <summary>core.tax_charge_template — mẫu thuế/phụ phí.</summary>
public class TaxChargeTemplate
{
    public long Id { get; set; }
    public string Code { get; set; } = null!;
    public string Name { get; set; } = null!;
    public bool IsActive { get; set; } = true;

    public List<TaxChargeTemplateLine> Lines { get; set; } = new();
}

/// <summary>core.tax_charge_template_line</summary>
public class TaxChargeTemplateLine
{
    public long Id { get; set; }
    public long TemplateId { get; set; }
    public string ChargeType { get; set; } = "ON_NET_TOTAL"; // ON_NET_TOTAL / ACTUAL
    public decimal? RatePct { get; set; }
    public decimal? FixedAmount { get; set; }
    public string? AccountCode { get; set; }
    public string? Note { get; set; }
}
