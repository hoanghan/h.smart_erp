namespace Erp.Api.Entities;
using Erp.Api.Core;

/// <summary>purchasing.purchase_request — Yêu cầu mua hàng nội bộ.</summary>
public class PurchaseRequest : IHasAudit, IApprovable
{
    public long Id { get; set; }
    public string DocNo { get; set; } = null!;
    public DateOnly DocDate { get; set; }
    public long? RequesterId { get; set; }
    public long? DepartmentId { get; set; }
    public long? ProductionPlanId { get; set; }
    public string Status { get; set; } = "DRAFT";
    public string? StatusReason { get; set; }     // added column
    public string RequestType { get; set; } = "PURCHASE"; // PURCHASE/TRANSFER/ISSUE
    public DateOnly? RequiredBy { get; set; }
    public string? Note { get; set; }
    public long? CreatorId { get; set; }          // added column
    public long? ApproverId { get; set; }
    public DateTimeOffset? ApprovedAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public List<PurchaseRequestLine> Lines { get; set; } = new();
}

/// <summary>purchasing.purchase_request_line</summary>
public class PurchaseRequestLine
{
    public long Id { get; set; }
    public long RequestId { get; set; }
    public long ProductId { get; set; }
    public decimal Quantity { get; set; }
    public string? Note { get; set; }
}

/// <summary>purchasing.purchase_order — Đơn hàng mua.</summary>
public class PurchaseOrder : IHasAudit, IApprovable
{
    public long Id { get; set; }
    public string DocNo { get; set; } = null!;
    public DateOnly OrderDate { get; set; }
    public long? RequestId { get; set; }
    public long? RfqId { get; set; }
    public long PartnerId { get; set; }
    public string OrderForm { get; set; } = "NORMAL";
    public DateOnly? ReceiveDatePlan { get; set; }
    public long? PaymentMethodId { get; set; }
    public long? DeliveryMethodId { get; set; }
    public string? ReceiveAddress { get; set; }
    public bool VatIncluded { get; set; } = true;
    public long? TaxTemplateId { get; set; }
    public long? PaymentTermsTemplateId { get; set; }
    public decimal? TaxTotal { get; set; }
    public decimal? GrandTotal { get; set; }
    public string? Note { get; set; }
    public string Status { get; set; } = "DRAFT";
    public string? StatusReason { get; set; }
    public long? CreatorId { get; set; }
    public long? ApproverId { get; set; }
    public DateTimeOffset? ApprovedAt { get; set; }
    public decimal? TotalAmount { get; set; }
    public decimal? TotalVat { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public List<PurchaseOrderLine> Lines { get; set; } = new();
}

/// <summary>purchasing.purchase_order_line</summary>
public class PurchaseOrderLine
{
    public long Id { get; set; }
    public long OrderId { get; set; }
    public long ProductId { get; set; }
    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal? VatPct { get; set; } = 10;
    public decimal Amount { get; set; }
    public decimal ReceivedQty { get; set; } = 0;
    public decimal BilledQty { get; set; } = 0;
    public string? Note { get; set; }
}

/// <summary>purchasing.po_cost — Chi phí đơn mua (duyệt → PGC).</summary>
public class PoCost
{
    public long Id { get; set; }
    public long OrderId { get; set; }
    public long? ReceiptDocId { get; set; }
    public long CostTypeId { get; set; }
    public long? ServiceSupplierId { get; set; }
    public decimal Amount { get; set; }
    public decimal? VatPct { get; set; }
    public long? PaymentMethodId { get; set; }
    public string? Note { get; set; }              // added column
    public bool Approved { get; set; }
    public long? ApprovedBy { get; set; }
    public DateTimeOffset? ApprovedAt { get; set; }
}

/// <summary>purchasing.po_payment_request — Đề nghị thanh toán.</summary>
public class PoPaymentRequest
{
    public long Id { get; set; }
    public long OrderId { get; set; }
    public decimal Amount { get; set; }
    public DateOnly? DueDate { get; set; }
    public string? Note { get; set; }
    public string Status { get; set; } = "DRAFT";
    public long? CreatorId { get; set; }           // added column
    public long? ApprovedBy { get; set; }
    public DateTimeOffset? ApprovedAt { get; set; }
}

/// <summary>purchasing.po_payment_actual — Thực tế thanh toán.</summary>
public class PoPaymentActual
{
    public long Id { get; set; }
    public long OrderId { get; set; }
    public DateOnly PayDate { get; set; }
    public decimal Amount { get; set; }
    public long? MethodId { get; set; }
    public string? Note { get; set; }
}

/// <summary>purchasing.supplier_return — Trả hàng NCC.</summary>
public class SupplierReturn
{
    public long Id { get; set; }
    public string DocNo { get; set; } = null!;
    public DateOnly DocDate { get; set; }
    public long? OrderId { get; set; }
    public long PartnerId { get; set; }
    public string? Note { get; set; }
    public string Status { get; set; } = "DRAFT";
    public long? CreatorId { get; set; }           // added column

    public List<SupplierReturnLine> Lines { get; set; } = new();
}

/// <summary>purchasing.supplier_return_line</summary>
public class SupplierReturnLine
{
    public long Id { get; set; }
    public long ReturnId { get; set; }
    public long ProductId { get; set; }
    public decimal Quantity { get; set; }
    public decimal? UnitPrice { get; set; }
    public string? Note { get; set; }              // added column
}

/// <summary>purchasing.rfq — Yêu cầu báo giá (Request for Quotation).</summary>
public class Rfq
{
    public long Id { get; set; }
    public string DocNo { get; set; } = null!;
    public DateOnly DocDate { get; set; }
    public long? RequestId { get; set; }
    public string Status { get; set; } = "DRAFT";
    public string? Note { get; set; }
    public long? CreatorId { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public List<RfqLine> Lines { get; set; } = new();
    public List<RfqSupplier> Suppliers { get; set; } = new();
}

/// <summary>purchasing.rfq_line</summary>
public class RfqLine
{
    public long Id { get; set; }
    public long RfqId { get; set; }
    public long ProductId { get; set; }
    public decimal Quantity { get; set; }
    public string? Note { get; set; }
}

/// <summary>purchasing.rfq_supplier — NCC nhận RFQ.</summary>
public class RfqSupplier
{
    public long Id { get; set; }
    public long RfqId { get; set; }
    public long PartnerId { get; set; }
    public string? Note { get; set; }
}

/// <summary>purchasing.supplier_quotation — Báo giá từ NCC.</summary>
public class SupplierQuotation
{
    public long Id { get; set; }
    public string DocNo { get; set; } = null!;
    public DateOnly DocDate { get; set; }
    public long RfqId { get; set; }
    public long PartnerId { get; set; }
    public DateOnly? ValidUntil { get; set; }
    public int? LeadTimeDays { get; set; }
    public string? Note { get; set; }
    public string Status { get; set; } = "DRAFT";
    public long? CreatorId { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public List<SupplierQuotationLine> Lines { get; set; } = new();
}

/// <summary>purchasing.supplier_quotation_line</summary>
public class SupplierQuotationLine
{
    public long Id { get; set; }
    public long QuotationId { get; set; }
    public long ProductId { get; set; }
    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal? LeadTimeDays { get; set; }
    public string? Note { get; set; }
}

/// <summary>purchasing.landed_cost_voucher — Phân bổ chi phí vào giá vốn.</summary>
public class LandedCostVoucher
{
    public long Id { get; set; }
    public string DocNo { get; set; } = null!;
    public DateOnly DocDate { get; set; }
    public string AllocationMethod { get; set; } = "QTY"; // QTY or AMOUNT
    public string Status { get; set; } = "DRAFT";
    public string? Note { get; set; }
    public long? CreatorId { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public List<LandedCostVoucherLine> Lines { get; set; } = new();
    public List<LandedCostReceipt> Receipts { get; set; } = new();
}

/// <summary>purchasing.landed_cost_voucher_line — Chi phí phân bổ.</summary>
public class LandedCostVoucherLine
{
    public long Id { get; set; }
    public long VoucherId { get; set; }
    public long CostTypeId { get; set; }
    public long? ServiceSupplierId { get; set; }
    public decimal Amount { get; set; }
    public string? Note { get; set; }
}

/// <summary>purchasing.landed_cost_receipt — Phiếu nhập được phân bổ.</summary>
public class LandedCostReceipt
{
    public long Id { get; set; }
    public long VoucherId { get; set; }
    public long ReceiptDocId { get; set; }
}

/// <summary>purchasing.outsourcing_cost — Chi phí gia công theo mã hàng (gắn phiếu nhập SP-TP).</summary>
public class OutsourcingCost
{
    public long Id { get; set; }
    public long ReceiptDocId { get; set; }
    public long? ProductId { get; set; }
    public long PayeeId { get; set; }
    public long CostTypeId { get; set; }
    public long? ProcessId { get; set; }
    public decimal AmountFc { get; set; }
    public string CurrencyCode { get; set; } = "VND";
    public decimal ExchangeRate { get; set; } = 1;
    public decimal Amount { get; set; }
    public decimal? VatPct { get; set; }
    public long? PaymentMethodId { get; set; }
    public long? CollectedPoId { get; set; }
    public bool Approved { get; set; }
    public long? ApprovedBy { get; set; }
    public DateTimeOffset? ApprovedAt { get; set; }
}
