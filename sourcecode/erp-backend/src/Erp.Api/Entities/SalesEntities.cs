namespace Erp.Api.Entities;
using Erp.Api.Core;

/// <summary>sales.quotation — Báo giá (ERPNext Selling: Draft → Open → Ordered/Lost/Expired/Cancelled).</summary>
public class Quotation : IHasAudit, IApprovable
{
    public long Id { get; set; }
    public string DocNo { get; set; } = null!;
    public DateOnly DocDate { get; set; }
    public long? RequesterId { get; set; }
    public long? RequesterDeptId { get; set; }
    public long? CreatorId { get; set; }
    public long? ApproverId { get; set; }
    public DateTimeOffset? ApprovedAt { get; set; }
    public long PartnerId { get; set; }
    public long? ContactId { get; set; }
    public long? DeliveryAddrId { get; set; }
    public string QuoteType { get; set; } = "NORMAL";    // NORMAL | PROJECT
    public string QuoteForm { get; set; } = "NORMAL";    // NORMAL | ESTIMATE
    public DateOnly? RequestDeliveryDate { get; set; }
    public int? ValidityDays { get; set; } = 2;
    public string? DeliveryLead { get; set; }
    public long? PaymentMethodId { get; set; }
    public long? DeliveryMethodId { get; set; }
    public string? BankAccount { get; set; }
    public string? AttachedService { get; set; }
    public string? Note { get; set; }
    public string Status { get; set; } = "DRAFT";
    public string? StatusReason { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    // ERPNext Selling
    public DateOnly? ValidTill { get; set; }
    public string OrderType { get; set; } = "SALES";
    public long? PriceListId { get; set; }
    public long? TaxTemplateId { get; set; }
    public List<long>? LostReasonIds { get; set; }
    public string? Competitor { get; set; }
    public string? Terms { get; set; }

    public List<QuotationLine> Lines { get; set; } = new();
}

/// <summary>sales.quotation_line — amount là cột GENERATED (quantity * rate * (1 - discount_pct/100)).</summary>
public class QuotationLine
{
    public long Id { get; set; }
    public long QuotationId { get; set; }
    public long ProductId { get; set; }
    public string? ProjectHouse { get; set; }
    public decimal Quantity { get; set; }
    public decimal? VatPct { get; set; } = 10;
    [Obsolete("Thay bằng Rate (PricingService.Resolve)")]
    public decimal? CalcPrice { get; set; }
    [Obsolete("Thay bằng Rate (PricingService.Resolve)")]
    public decimal? ApprovedPrice { get; set; }
    [Obsolete("Không còn dùng trong mô hình ERPNext")]
    public decimal? PriceWeight { get; set; }
    public string? Note { get; set; }

    public decimal OrderedQty { get; set; }
    public decimal? Rate { get; set; }
    public decimal? DiscountPct { get; set; }
    public decimal Amount { get; set; }   // computed bởi DB
}

/// <summary>sales.sales_order — Đơn hàng bán.</summary>
public class SalesOrder : IHasAudit, IApprovable
{
    public long Id { get; set; }
    public string DocNo { get; set; } = null!;
    public string? ContractNo { get; set; }
    public DateOnly DocDate { get; set; }
    public long? QuotationId { get; set; }
    public long PartnerId { get; set; }
    public string OrderForm { get; set; } = "NORMAL";    // NORMAL | GIFT
    public string? SalesChannel { get; set; }
    public string? SalesRegion { get; set; }
    public long? WarehouseId { get; set; }
    public DateOnly? DeliveryDatePlan { get; set; }
    public long? PaymentMethodId { get; set; }
    public long? DeliveryMethodId { get; set; }
    public long? DeliveryAddrId { get; set; }
    public long? SalespersonId { get; set; }
    public long? CreatorId { get; set; }
    public long? ApproverId { get; set; }
    public DateTimeOffset? ApprovedAt { get; set; }
    public decimal? TotalAmount { get; set; }
    public decimal? TotalVat { get; set; }
    public string? Note { get; set; }
    public string Status { get; set; } = "DRAFT";
    public DateTimeOffset CreatedAt { get; set; }

    public List<SalesOrderLine> Lines { get; set; } = new();
}

/// <summary>sales.sales_order_line — amount là cột GENERATED (quantity * unit_price).</summary>
public class SalesOrderLine
{
    public long Id { get; set; }
    public long OrderId { get; set; }
    public long ProductId { get; set; }
    public decimal Quantity { get; set; }
    public decimal? KitQty { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal? ListPrice { get; set; }
    public decimal? VatPct { get; set; } = 10;
    public decimal Amount { get; set; }      // computed bởi DB
    public bool IsGift { get; set; }
    public string? Note { get; set; }
    public decimal DeliveredQty { get; set; } = 0;
    public decimal BilledQty { get; set; } = 0;
    public DateOnly? DeliveryDate { get; set; }
}

/// <summary>sales.price_list — Bảng giá.</summary>
public class PriceList
{
    public long Id { get; set; }
    public string Code { get; set; } = null!;
    public string Name { get; set; } = null!;
    public DateOnly ValidFrom { get; set; }
    public DateOnly? ValidTo { get; set; }
    public bool IsActive { get; set; } = true;

    public List<PriceListItem> Items { get; set; } = new();
}

/// <summary>sales.price_list_item</summary>
public class PriceListItem
{
    public long Id { get; set; }
    public long PriceListId { get; set; }
    public long ProductId { get; set; }
    public decimal Price { get; set; }
}

/// <summary>sales.promotion — Chương trình khuyến mại - chiết khấu.</summary>
public class Promotion
{
    public long Id { get; set; }
    public string Code { get; set; } = null!;
    public string Name { get; set; } = null!;
    public string? GroupName { get; set; }
    public DateOnly DateFrom { get; set; }
    public DateOnly? DateTo { get; set; }
    public string? Sponsor { get; set; }
    public decimal? DiscountPct { get; set; }
    public bool HasGift { get; set; }
    public string? Note { get; set; }

    public List<PromotionDiscountItem> DiscountItems { get; set; } = new();
    public List<PromotionGiftItem> GiftItems { get; set; } = new();
}

/// <summary>sales.promotion_discount_item — Hàng chiết khấu.</summary>
public class PromotionDiscountItem
{
    public long Id { get; set; }
    public long PromotionId { get; set; }
    public long ProductId { get; set; }
    public decimal TotalPct { get; set; }
    public decimal? CompanyPct { get; set; }
    public decimal? VendorPct { get; set; }
}

/// <summary>sales.promotion_gift_item — Hàng tặng.</summary>
public class PromotionGiftItem
{
    public long Id { get; set; }
    public long PromotionId { get; set; }
    public long BuyProductId { get; set; }
    public long GiftProductId { get; set; }
    public decimal RequiredQty { get; set; }
    public decimal TotalGiftQty { get; set; }
    public decimal? CompanyGiftQty { get; set; }
    public decimal? VendorGiftQty { get; set; }
}

/// <summary>sales.so_promotion — KM-CK áp cho đơn (composite key).</summary>
public class SoPromotion
{
    public long OrderId { get; set; }
    public long PromotionId { get; set; }
}

/// <summary>sales.lost_reason — Lý do mất báo giá (set-as-lost).</summary>
public class LostReason
{
    public long Id { get; set; }
    public string Code { get; set; } = null!;
    public string Name { get; set; } = null!;
    public bool IsActive { get; set; } = true;
}

/// <summary>sales.promotional_scheme — Chương trình khuyến mãi (thay promotion cũ), sinh ra pricing_rule.</summary>
public class PromotionalScheme
{
    public long Id { get; set; }
    public string Code { get; set; } = null!;
    public string Name { get; set; } = null!;
    public string ApplyOn { get; set; } = "ITEM";   // ITEM | ITEM_GROUP | ALL
    public long? ProductGroupId { get; set; }
    public long? PartnerId { get; set; }
    public DateOnly? ValidFrom { get; set; }
    public DateOnly? ValidTo { get; set; }
    public bool IsActive { get; set; } = true;
    public long? LegacyPromotionId { get; set; }

    public List<SchemeItem> Items { get; set; } = new();
    public List<SchemePriceSlab> PriceSlabs { get; set; } = new();
    public List<SchemeProductSlab> ProductSlabs { get; set; } = new();
}

/// <summary>sales.scheme_item — Hàng áp dụng scheme (khi apply_on = ITEM).</summary>
public class SchemeItem
{
    public long Id { get; set; }
    public long SchemeId { get; set; }
    public long ProductId { get; set; }
}

/// <summary>sales.scheme_price_slab — Bậc giảm giá theo số lượng.</summary>
public class SchemePriceSlab
{
    public long Id { get; set; }
    public long SchemeId { get; set; }
    public long? ProductId { get; set; }
    public decimal MinQty { get; set; }
    public decimal? MaxQty { get; set; }
    public decimal? DiscountPct { get; set; }
    public decimal? Rate { get; set; }
}

/// <summary>sales.scheme_product_slab — Bậc tặng hàng (mua đủ X tặng Y).</summary>
public class SchemeProductSlab
{
    public long Id { get; set; }
    public long SchemeId { get; set; }
    public long? ProductId { get; set; }
    public decimal MinQty { get; set; }
    public decimal? MaxQty { get; set; }
    public long FreeProductId { get; set; }
    public decimal FreeQty { get; set; }
    public decimal FreeRate { get; set; }
}

/// <summary>sales.pricing_rule — Quy tắc giá sinh từ promotional_scheme (hoặc nhập tay), dùng bởi PricingService.</summary>
public class PricingRule
{
    public long Id { get; set; }
    public string RuleSource { get; set; } = "SCHEME";
    public long? SchemeId { get; set; }
    public int Priority { get; set; }
    public long? ProductId { get; set; }
    public long? ProductGroupId { get; set; }
    public long? PartnerId { get; set; }
    public decimal MinQty { get; set; }
    public decimal? MaxQty { get; set; }
    public decimal? DiscountPct { get; set; }
    public decimal? Rate { get; set; }
    public long? FreeProductId { get; set; }
    public decimal? FreeQty { get; set; }
    public decimal FreeRate { get; set; }
    public DateOnly? ValidFrom { get; set; }
    public DateOnly? ValidTo { get; set; }
    public bool IsActive { get; set; } = true;
}

/// <summary>sales.coupon_code — Mã giảm giá gắn với 1 pricing_rule, kiểm soát lượt dùng/hạn.</summary>
public class CouponCode
{
    public long Id { get; set; }
    public string Code { get; set; } = null!;
    public long PricingRuleId { get; set; }
    public int? MaxUse { get; set; }
    public int Used { get; set; }
    public DateOnly? ValidFrom { get; set; }
    public DateOnly? ValidTo { get; set; }
    public bool IsActive { get; set; } = true;
}

/// <summary>sales.so_payment_request — Yêu cầu thanh toán.</summary>
public class SoPaymentRequest
{
    public long Id { get; set; }
    public long OrderId { get; set; }
    public DateOnly DueDate { get; set; }
    public decimal Amount { get; set; }
    public bool AutoGenerated { get; set; }
    public string Status { get; set; } = "PENDING";   // PENDING | SENT_FRM | PAID | CANCELLED
}

/// <summary>sales.so_payment_actual — Thực tế thanh toán.</summary>
public class SoPaymentActual
{
    public long Id { get; set; }
    public long OrderId { get; set; }
    public DateOnly PayDate { get; set; }
    public decimal Amount { get; set; }
    public long? MethodId { get; set; }
    public string? Note { get; set; }
}

/// <summary>sales.so_cost — Chi phí theo đơn hàng (duyệt → PGC).</summary>
public class SoCost
{
    public long Id { get; set; }
    public long OrderId { get; set; }
    public long CostTypeId { get; set; }
    public long? PayeeId { get; set; }
    public decimal? RatePct { get; set; }
    public decimal? Amount { get; set; }
    public decimal? VatPct { get; set; }
    public DateOnly? DueDate { get; set; }
    public string? Note { get; set; }
    public bool Approved { get; set; }
    public long? ApprovedBy { get; set; }
    public DateTimeOffset? ApprovedAt { get; set; }
}

/// <summary>sales.sales_allowance — Giảm giá hàng bán.</summary>
public class SalesAllowance : IHasAudit, IApprovable
{
    public long Id { get; set; }
    public string DocNo { get; set; } = null!;
    public DateOnly DocDate { get; set; }
    public long OrderId { get; set; }
    public string AllowForm { get; set; } = null!;   // CREDIT_NOTE | CASH_REFUND
    public string Status { get; set; } = "DRAFT";    // DRAFT | APPROVED | POSTED | CANCELLED
    public string? Note { get; set; }
    public long? CreatorId { get; set; }
    public long? ApproverId { get; set; }
    public DateTimeOffset? ApprovedAt { get; set; }

    public List<SalesAllowanceLine> Lines { get; set; } = new();
}

/// <summary>sales.sales_allowance_line</summary>
public class SalesAllowanceLine
{
    public long Id { get; set; }
    public long AllowanceId { get; set; }
    public long ProductId { get; set; }
    public decimal Quantity { get; set; }
    public decimal ReducedPrice { get; set; }
}
