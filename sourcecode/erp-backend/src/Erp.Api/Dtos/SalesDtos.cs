namespace Erp.Api.Dtos;

// ---------- Quotation (ERPNext Selling) ----------
public record QuotationLineIn(
    long ProductId, decimal Quantity, string? ProjectHouse = null, decimal? VatPct = 10,
    decimal? Rate = null, decimal? DiscountPct = null, string? Note = null);

public record QuotationLineOut(
    long Id, long ProductId, string? ProjectHouse, decimal Quantity, decimal? VatPct,
    decimal? Rate, decimal? DiscountPct, decimal Amount, decimal OrderedQty, string? Note);

public record QuotationLineUpdate(
    decimal? Quantity = null, string? ProjectHouse = null, decimal? VatPct = null,
    decimal? Rate = null, decimal? DiscountPct = null, string? Note = null);

public record QuotationCreate(
    long PartnerId,
    string OrderType = "SALES",
    DateOnly? ValidTill = null,
    long? PriceListId = null,
    long? TaxTemplateId = null,
    DateOnly? RequestDeliveryDate = null,
    int? ValidityDays = 2,
    string? DeliveryLead = null,
    long? RequesterId = null,
    long? RequesterDeptId = null,
    long? ContactId = null,
    long? DeliveryAddrId = null,
    long? PaymentMethodId = null,
    long? DeliveryMethodId = null,
    string? BankAccount = null,
    string? AttachedService = null,
    string? Competitor = null,
    string? Terms = null,
    string? Note = null,
    List<QuotationLineIn>? Lines = null);

public record QuotationUpdate(
    long? PartnerId, string? OrderType, DateOnly? ValidTill, long? PriceListId, long? TaxTemplateId,
    DateOnly? RequestDeliveryDate, int? ValidityDays, string? DeliveryLead,
    long? RequesterId, long? RequesterDeptId, long? ContactId, long? DeliveryAddrId,
    long? PaymentMethodId, long? DeliveryMethodId, string? BankAccount, string? AttachedService,
    string? Competitor, string? Terms, string? Note);

public record QuotationOut(
    long Id, string DocNo, DateOnly DocDate, long PartnerId, string OrderType,
    DateOnly? ValidTill, long? PriceListId, long? TaxTemplateId,
    DateOnly? RequestDeliveryDate, int? ValidityDays, string? DeliveryLead,
    long? RequesterId, long? CreatorId, long? ApproverId, DateTimeOffset? ApprovedAt,
    long? PaymentMethodId, long? DeliveryMethodId, string? Competitor, string? Terms, string? Note,
    string Status, string? StatusReason, List<long>? LostReasonIds, List<QuotationLineOut> Lines);

// ---------- Quotation workflow actions ----------
public record MakeSalesOrderLineIn(long LineId, decimal Qty);
public record MakeSalesOrderRequest(List<MakeSalesOrderLineIn>? Lines = null);

public record SetAsLostRequest(List<long> LostReasonIds, string? Competitor = null, string? Detail = null);

public record ExtendQuotationRequest(DateOnly ValidTill);

// ---------- Lost reason ----------
public record LostReasonOut(long Id, string Code, string Name, bool IsActive);
public record LostReasonCreate(string Code, string Name);
public record LostReasonUpdate(string? Code, string? Name, bool? IsActive);

// ---------- Sales order ----------
public record SalesOrderLineIn(
    long ProductId, decimal Quantity, decimal UnitPrice, decimal? KitQty = null,
    decimal? ListPrice = null, decimal? VatPct = 10, bool IsGift = false, string? Note = null);

public record SalesOrderLineOut(
    long Id, long ProductId, decimal Quantity, decimal? KitQty, decimal UnitPrice,
    decimal? ListPrice, decimal? VatPct, decimal Amount, bool IsGift, string? Note);

public record SalesOrderCreate(
    long PartnerId,
    string OrderForm = "NORMAL",
    string? SalesChannel = null,
    string? SalesRegion = null,
    long? WarehouseId = null,
    DateOnly? DeliveryDatePlan = null,
    long? PaymentMethodId = null,
    long? DeliveryMethodId = null,
    long? DeliveryAddrId = null,
    long? SalespersonId = null,
    string? Note = null,
    List<SalesOrderLineIn>? Lines = null);

public record SalesOrderUpdate(
    long? PartnerId, string? OrderForm, string? SalesChannel, string? SalesRegion,
    long? WarehouseId, DateOnly? DeliveryDatePlan, long? PaymentMethodId,
    long? DeliveryMethodId, long? DeliveryAddrId, long? SalespersonId, string? Note);

public record SalesOrderOut(
    long Id, string DocNo, DateOnly DocDate, long? QuotationId, long PartnerId,
    string OrderForm, string? SalesChannel, string? SalesRegion, long? WarehouseId,
    DateOnly? DeliveryDatePlan, long? PaymentMethodId, long? DeliveryMethodId,
    long? SalespersonId, long? ApproverId, DateTimeOffset? ApprovedAt,
    decimal? TotalAmount, decimal? TotalVat, string? Note, string Status,
    List<SalesOrderLineOut> Lines);

// ---------- Workflow ----------
public record WfActionRequest(string? Reason = null);

public record ConvertToOrderRequest(
    string? SalesRegion = null, long? WarehouseId = null, string? SalesChannel = null);

// ---------- Price list ----------
public record PriceListItemIn(long ProductId, decimal Price);
public record PriceListItemOut(long Id, long ProductId, decimal Price);

public record PriceListCreate(
    string Code, string Name, DateOnly ValidFrom, DateOnly? ValidTo = null,
    List<PriceListItemIn>? Items = null);

public record PriceListUpdate(
    string? Code, string? Name, DateOnly? ValidFrom, DateOnly? ValidTo, bool? IsActive);

public record PriceListOut(
    long Id, string Code, string Name, DateOnly ValidFrom, DateOnly? ValidTo, bool IsActive,
    List<PriceListItemOut> Items);

// ---------- Promotion ----------
public record PromotionDiscountItemIn(
    long ProductId, decimal TotalPct, decimal? CompanyPct = null, decimal? VendorPct = null);
public record PromotionDiscountItemOut(
    long Id, long ProductId, decimal TotalPct, decimal? CompanyPct, decimal? VendorPct);

public record PromotionGiftItemIn(
    long BuyProductId, long GiftProductId, decimal RequiredQty, decimal TotalGiftQty,
    decimal? CompanyGiftQty = null, decimal? VendorGiftQty = null);
public record PromotionGiftItemOut(
    long Id, long BuyProductId, long GiftProductId, decimal RequiredQty, decimal TotalGiftQty,
    decimal? CompanyGiftQty, decimal? VendorGiftQty);

public record PromotionCreate(
    string Code, string Name, DateOnly DateFrom, DateOnly? DateTo = null,
    string? GroupName = null, string? Sponsor = null, decimal? DiscountPct = null,
    bool HasGift = false, string? Note = null,
    List<PromotionDiscountItemIn>? DiscountItems = null,
    List<PromotionGiftItemIn>? GiftItems = null);

public record PromotionUpdate(
    string? Code, string? Name, string? GroupName, DateOnly? DateFrom, DateOnly? DateTo,
    string? Sponsor, decimal? DiscountPct, bool? HasGift, string? Note);

public record PromotionOut(
    long Id, string Code, string Name, string? GroupName, DateOnly DateFrom, DateOnly? DateTo,
    string? Sponsor, decimal? DiscountPct, bool HasGift, string? Note,
    List<PromotionDiscountItemOut> DiscountItems, List<PromotionGiftItemOut> GiftItems);

// ---------- Apply promotions to order ----------
public record ApplyPromotionsRequest(List<long> PromotionIds);

// ---------- Sales allowance (giảm giá hàng bán) ----------
public record SalesAllowanceLineIn(long ProductId, decimal Quantity, decimal ReducedPrice);
public record SalesAllowanceLineOut(long Id, long ProductId, decimal Quantity, decimal ReducedPrice);

public record SalesAllowanceCreate(
    long OrderId, string AllowForm, string? Note = null,
    List<SalesAllowanceLineIn>? Lines = null);

public record SalesAllowanceUpdate(string? AllowForm, string? Note);

public record SalesAllowanceOut(
    long Id, string DocNo, DateOnly DocDate, long OrderId, string AllowForm, string Status,
    string? Note, List<SalesAllowanceLineOut> Lines);

// ---------- So cost (chi phí đơn hàng) ----------
public record SoCostIn(
    long CostTypeId, long? PayeeId = null, decimal? RatePct = null, decimal? Amount = null,
    decimal? VatPct = null, DateOnly? DueDate = null, string? Note = null);

public record SoCostUpdate(
    long? CostTypeId, long? PayeeId, decimal? RatePct, decimal? Amount,
    decimal? VatPct, DateOnly? DueDate, string? Note);

public record SoCostOut(
    long Id, long OrderId, long CostTypeId, long? PayeeId, decimal? RatePct, decimal? Amount,
    decimal? VatPct, DateOnly? DueDate, string? Note, bool Approved, long? ApprovedBy,
    DateTimeOffset? ApprovedAt);

// ---------- So payment request / actual ----------
public record SoPaymentRequestIn(DateOnly DueDate, decimal Amount, string Status = "PENDING");
public record SoPaymentRequestUpdate(DateOnly? DueDate, decimal? Amount, string? Status);
public record SoPaymentRequestOut(
    long Id, long OrderId, DateOnly DueDate, decimal Amount, bool AutoGenerated, string Status);

public record SoPaymentActualIn(DateOnly PayDate, decimal Amount, long? MethodId = null, string? Note = null);
public record SoPaymentActualUpdate(DateOnly? PayDate, decimal? Amount, long? MethodId, string? Note);
public record SoPaymentActualOut(
    long Id, long OrderId, DateOnly PayDate, decimal Amount, long? MethodId, string? Note);

// ---------- Promotional scheme (thay promotion/discount/gift cũ) ----------
public record SchemeItemIn(long ProductId);
public record SchemeItemOut(long Id, long ProductId);

public record SchemePriceSlabIn(
    long? ProductId, decimal MinQty, decimal? MaxQty = null,
    decimal? DiscountPct = null, decimal? Rate = null);
public record SchemePriceSlabOut(
    long Id, long? ProductId, decimal MinQty, decimal? MaxQty, decimal? DiscountPct, decimal? Rate);

public record SchemeProductSlabIn(
    long? ProductId, decimal MinQty, decimal? MaxQty,
    long FreeProductId, decimal FreeQty, decimal FreeRate = 0);
public record SchemeProductSlabOut(
    long Id, long? ProductId, decimal MinQty, decimal? MaxQty,
    long FreeProductId, decimal FreeQty, decimal FreeRate);

public record PromotionalSchemeCreate(
    string Code, string Name, string ApplyOn = "ITEM",
    long? ProductGroupId = null, long? PartnerId = null,
    DateOnly? ValidFrom = null, DateOnly? ValidTo = null,
    List<SchemeItemIn>? Items = null,
    List<SchemePriceSlabIn>? PriceSlabs = null,
    List<SchemeProductSlabIn>? ProductSlabs = null);

public record PromotionalSchemeUpdate(
    string? Code = null, string? Name = null, string? ApplyOn = null,
    long? ProductGroupId = null, long? PartnerId = null,
    DateOnly? ValidFrom = null, DateOnly? ValidTo = null, bool? IsActive = null,
    List<SchemeItemIn>? Items = null,
    List<SchemePriceSlabIn>? PriceSlabs = null,
    List<SchemeProductSlabIn>? ProductSlabs = null);

public record PromotionalSchemeOut(
    long Id, string Code, string Name, string ApplyOn, long? ProductGroupId, long? PartnerId,
    DateOnly? ValidFrom, DateOnly? ValidTo, bool IsActive,
    List<SchemeItemOut> Items, List<SchemePriceSlabOut> PriceSlabs, List<SchemeProductSlabOut> ProductSlabs);

// ---------- Pricing service ----------
public record PricingFreeItem(long ProductId, decimal Qty);
public record PricingResolveResult(decimal Rate, decimal DiscountPct, List<PricingFreeItem> FreeItems, List<long> AppliedRules);

public record PricingRuleOut(
    long Id, long? SchemeId, int Priority, long? ProductId, long? ProductGroupId, long? PartnerId,
    decimal MinQty, decimal? MaxQty, decimal? DiscountPct, decimal? Rate,
    long? FreeProductId, decimal? FreeQty, decimal FreeRate,
    DateOnly? ValidFrom, DateOnly? ValidTo, bool IsActive);

// ---------- Coupon code ----------
public record CouponCodeOut(
    long Id, string Code, long PricingRuleId, int? MaxUse, int Used,
    DateOnly? ValidFrom, DateOnly? ValidTo, bool IsActive);

public record CouponCodeCreate(
    string Code, long PricingRuleId, int? MaxUse = null,
    DateOnly? ValidFrom = null, DateOnly? ValidTo = null);

public record CouponCodeUpdate(string? Code, int? MaxUse, DateOnly? ValidFrom, DateOnly? ValidTo, bool? IsActive);
