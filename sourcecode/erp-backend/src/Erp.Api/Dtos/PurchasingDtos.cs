namespace Erp.Api.Dtos;

// ---------- Purchase Request ----------
public record PurchaseRequestLineIn(
    long ProductId, decimal Quantity, string? Note = null);

public record PurchaseRequestLineOut(
    long Id, long ProductId, decimal Quantity, string? Note);

public record PurchaseRequestCreate(
    long? RequesterId = null, long? DepartmentId = null,
    string? Note = null, List<PurchaseRequestLineIn>? Lines = null);

public record PurchaseRequestUpdate(
    long? RequesterId, long? DepartmentId, string? Note);

public record PurchaseRequestOut(
    long Id, string DocNo, DateOnly DocDate, long? RequesterId, long? DepartmentId,
    string? Note, string Status, string? StatusReason, long? CreatorId,
    List<PurchaseRequestLineOut> Lines);

// ---------- Purchase Order ----------
public record PurchaseOrderLineIn(
    long ProductId, decimal Quantity, decimal UnitPrice, decimal? VatPct = 10,
    string? Note = null);

public record PurchaseOrderLineOut(
    long Id, long ProductId, decimal Quantity, decimal UnitPrice, decimal? VatPct,
    decimal Amount, decimal ReceivedQty, decimal BilledQty, string? Note);

public record PurchaseOrderCreate(
    long PartnerId,
    string OrderForm = "NORMAL",
    long? RequestId = null,
    long? RfqId = null,
    DateOnly? ReceiveDatePlan = null,
    long? PaymentMethodId = null,
    long? DeliveryMethodId = null,
    string? ReceiveAddress = null,
    bool VatIncluded = true,
    long? TaxTemplateId = null,
    long? PaymentTermsTemplateId = null,
    string? Note = null,
    List<PurchaseOrderLineIn>? Lines = null);

public record PurchaseOrderUpdate(
    long? PartnerId, string? OrderForm, long? RequestId, long? RfqId,
    DateOnly? ReceiveDatePlan, long? PaymentMethodId,
    long? DeliveryMethodId, string? ReceiveAddress, bool? VatIncluded,
    long? TaxTemplateId, long? PaymentTermsTemplateId, string? Note);

public record PurchaseOrderOut(
    long Id, string DocNo, DateOnly OrderDate, long? RequestId, long? RfqId, long PartnerId,
    string OrderForm, DateOnly? ReceiveDatePlan,
    long? PaymentMethodId, long? DeliveryMethodId, string? ReceiveAddress,
    bool VatIncluded, long? TaxTemplateId, long? PaymentTermsTemplateId,
    decimal? TaxTotal, decimal? GrandTotal,
    string? Note, string Status, string? StatusReason,
    long? CreatorId, long? ApproverId, DateTimeOffset? ApprovedAt,
    decimal? TotalAmount, decimal? TotalVat,
    List<PurchaseOrderLineOut> Lines);

// ---------- PO Cost ----------
public record PoCostIn(
    long CostTypeId, long? ReceiptDocId = null, long? ServiceSupplierId = null,
    decimal Amount = 0, decimal? VatPct = null,
    long? PaymentMethodId = null, string? Note = null);

public record PoCostUpdate(
    long? CostTypeId, long? ReceiptDocId, long? ServiceSupplierId,
    decimal? Amount, decimal? VatPct, long? PaymentMethodId, string? Note);

public record PoCostOut(
    long Id, long OrderId, long? ReceiptDocId, long CostTypeId, long? ServiceSupplierId,
    decimal Amount, decimal? VatPct, long? PaymentMethodId,
    string? Note, bool Approved, long? ApprovedBy, DateTimeOffset? ApprovedAt);

// ---------- PO Payment Request ----------
public record PoPaymentRequestIn(
    decimal Amount, DateOnly? DueDate = null, string? Note = null);

public record PoPaymentRequestUpdate(
    decimal? Amount, DateOnly? DueDate, string? Note);

public record PoPaymentRequestOut(
    long Id, long OrderId, decimal Amount, DateOnly? DueDate, string? Note,
    string Status, long? CreatorId, long? ApprovedBy, DateTimeOffset? ApprovedAt);

// ---------- PO Payment Actual ----------
public record PoPaymentActualIn(
    DateOnly PayDate, decimal Amount, long? MethodId = null, string? Note = null);

public record PoPaymentActualUpdate(
    DateOnly? PayDate, decimal? Amount, long? MethodId, string? Note);

public record PoPaymentActualOut(
    long Id, long OrderId, DateOnly PayDate, decimal Amount, long? MethodId, string? Note);

// ---------- Supplier Return ----------
public record SupplierReturnLineIn(
    long ProductId, decimal Quantity, decimal? UnitPrice = null, string? Note = null);

public record SupplierReturnLineOut(
    long Id, long ProductId, decimal Quantity, decimal? UnitPrice, string? Note);

public record SupplierReturnCreate(
    long? OrderId = null, long PartnerId = 0, string? Note = null,
    List<SupplierReturnLineIn>? Lines = null);

public record SupplierReturnUpdate(
    long? PartnerId, string? Note);

public record SupplierReturnOut(
    long Id, string DocNo, DateOnly DocDate, long? OrderId, long PartnerId,
    string? Note, string Status, long? CreatorId,
    List<SupplierReturnLineOut> Lines);

// ---------- Outsourcing Cost ----------
public record OutsourcingCostCreate(
    long ReceiptDocId, long? ProductId, long PayeeId, long CostTypeId,
    long? ProcessId = null, decimal AmountFc = 0, string CurrencyCode = "VND",
    decimal ExchangeRate = 1, decimal Amount = 0, decimal? VatPct = null,
    long? PaymentMethodId = null);

public record OutsourcingCostUpdate(
    long? ProductId, long? PayeeId, long? CostTypeId, long? ProcessId,
    decimal? AmountFc, string? CurrencyCode, decimal? ExchangeRate,
    decimal? Amount, decimal? VatPct, long? PaymentMethodId);

// ---------- RFQ ----------
public record RfqLineIn(long ProductId, decimal Quantity, string? Note = null);
public record RfqLineOut(long Id, long ProductId, decimal Quantity, string? Note);
public record RfqSupplierIn(long PartnerId, string? Note = null);
public record RfqSupplierOut(long Id, long PartnerId, string? Note);

public record RfqCreate(
    long? RequestId = null, string? Note = null,
    List<RfqLineIn>? Lines = null, List<RfqSupplierIn>? Suppliers = null);

public record RfqUpdate(string? Note);

public record RfqOut(
    long Id, string DocNo, DateOnly DocDate, long? RequestId,
    string Status, string? Note, long? CreatorId,
    List<RfqLineOut> Lines, List<RfqSupplierOut> Suppliers);

// ---------- Supplier Quotation ----------
public record SupplierQuotationLineIn(
    long ProductId, decimal Quantity, decimal UnitPrice, decimal? LeadTimeDays = null, string? Note = null);
public record SupplierQuotationLineOut(
    long Id, long ProductId, decimal Quantity, decimal UnitPrice, decimal? LeadTimeDays, string? Note);

public record SupplierQuotationCreate(
    long RfqId, long PartnerId, DateOnly? ValidUntil = null, int? LeadTimeDays = null,
    string? Note = null, List<SupplierQuotationLineIn>? Lines = null);

public record SupplierQuotationUpdate(
    long? PartnerId, DateOnly? ValidUntil, int? LeadTimeDays, string? Note);

public record SupplierQuotationOut(
    long Id, string DocNo, DateOnly DocDate, long RfqId, long PartnerId,
    DateOnly? ValidUntil, int? LeadTimeDays, string? Note,
    string Status, long? CreatorId,
    List<SupplierQuotationLineOut> Lines);

// ---------- Landed Cost Voucher ----------
public record LandedCostLineIn(long CostTypeId, long? ServiceSupplierId = null, decimal Amount = 0, string? Note = null);
public record LandedCostLineOut(long Id, long CostTypeId, long? ServiceSupplierId, decimal Amount, string? Note);
public record LandedCostReceiptIn(long ReceiptDocId);
public record LandedCostReceiptOut(long Id, long ReceiptDocId);

public record LandedCostCreate(
    string AllocationMethod = "QTY", string? Note = null,
    List<LandedCostLineIn>? Lines = null, List<LandedCostReceiptIn>? Receipts = null);

public record LandedCostUpdate(string? Note);

public record LandedCostOut(
    long Id, string DocNo, DateOnly DocDate, string AllocationMethod,
    string Status, string? Note, long? CreatorId,
    List<LandedCostLineOut> Lines, List<LandedCostReceiptOut> Receipts);

// ---------- Outsourcing Cost ----------
public record OutsourcingCostOut(
    long Id, long ReceiptDocId, long? ProductId, long PayeeId, long CostTypeId,
    long? ProcessId, decimal AmountFc, string CurrencyCode, decimal ExchangeRate,
    decimal Amount, decimal? VatPct, long? PaymentMethodId, long? CollectedPoId,
    bool Approved, long? ApprovedBy, DateTimeOffset? ApprovedAt);
