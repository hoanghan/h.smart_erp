namespace Erp.Api.Entities;

/// <summary>inventory.stock_doc — Chứng từ kho hợp nhất (nhập/xuất/chuyển).</summary>
public class StockDoc
{
    public long Id { get; set; }
    public string DocNo { get; set; } = null!;
    public string DocType { get; set; } = null!;     // RECEIPT | ISSUE | TRANSFER
    public string SubType { get; set; } = null!;
    public string? Purpose { get; set; }              // ERPNext purpose (nullable for backward compat)
    public DateOnly RequestDate { get; set; }
    public DateOnly? ActualDate { get; set; }
    public long? SalesOrderId { get; set; }
    public long? PurchaseOrderId { get; set; }
    public long? SupplierReturnId { get; set; }
    public long? PartnerId { get; set; }
    public long? FromWarehouseId { get; set; }
    public long? ToWarehouseId { get; set; }
    public string? OrgUnit { get; set; }
    public long? ProcessId { get; set; }
    public long? CounterpartDocId { get; set; }
    public string? RefNo { get; set; }
    public string? Note { get; set; }
    public string Status { get; set; } = "DRAFT";
    public string? StatusReason { get; set; }
    public long? CreatedBy { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public long? CompletedBy { get; set; }
    public DateTimeOffset? CompletedAt { get; set; }

    public List<StockDocLine> Lines { get; set; } = new();
}

/// <summary>inventory.stock_doc_line</summary>
public class StockDocLine
{
    public long Id { get; set; }
    public long DocId { get; set; }
    public long ProductId { get; set; }
    public decimal RequestedQty { get; set; }
    public decimal? ActualQty { get; set; }
    public decimal? KitQty { get; set; }
    public decimal? UnitPrice { get; set; }
    public long? LotId { get; set; }
    public DateOnly? ExpiryDate { get; set; }
    public long? LocationId { get; set; }
    public decimal LandedCost { get; set; } = 0;
    public string? Note { get; set; }
}

/// <summary>inventory.lot — Mã lô.</summary>
public class Lot
{
    public long Id { get; set; }
    public string LotNo { get; set; } = null!;
    public long ProductId { get; set; }
    public DateOnly? ExpiryDate { get; set; }
}

/// <summary>inventory.stock_move — Stock Ledger Entry (SLE) — bất biến.</summary>
public class StockMove
{
    public long Id { get; set; }
    public DateOnly MoveDate { get; set; }
    public long DocId { get; set; }
    public long DocLineId { get; set; }
    public long ProductId { get; set; }
    public long WarehouseId { get; set; }
    public long? LotId { get; set; }
    public long? LocationId { get; set; }
    public decimal Qty { get; set; }                    // (+) nhập, (-) xuất

    // SLE / Valuation fields
    public decimal? QtyAfterTransaction { get; set; }   // tồn lũy kế sau giao dịch
    public decimal? ValuationRate { get; set; }          // đơn giá định giá dòng
    public decimal? StockValue { get; set; }             // giá trị tồn = qty_after × rate
    public decimal? StockValueDifference { get; set; }   // chênh lệch giá trị (+ nhập, - xuất)
    public DateTimeOffset? PostingDatetime { get; set; } // thời gian ghi sổ

    public decimal? UnitCost { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}

/// <summary>inventory.stock_balance — Bin: tồn hiện thời theo (kho, hàng, lô).</summary>
public class StockBalance
{
    public long Id { get; set; }
    public long ProductId { get; set; }
    public long WarehouseId { get; set; }
    public long? LotId { get; set; }
    public decimal QtyOnHand { get; set; }
    public decimal ReservedQty { get; set; }     // SL chưa giao (SO APPROVED/NOT_DELIVERED)
    public decimal OrderedQty { get; set; }      // SL chưa nhận (PO APPROVED/TO_RECEIVE*)
    public DateTimeOffset UpdatedAt { get; set; }

    // Computed (not stored): ProjectedQty = QtyOnHand + OrderedQty - ReservedQty
    public decimal ProjectedQty => QtyOnHand + OrderedQty - ReservedQty;
}

/// <summary>inventory.gr_cost — Chi phí nhập kho.</summary>
public class GrCost
{
    public long Id { get; set; }
    public long DocId { get; set; }
    public long CostTypeId { get; set; }
    public long? PayeeId { get; set; }
    public long? ProcessId { get; set; }
    public decimal Amount { get; set; }
    public decimal? VatPct { get; set; }
    public bool Approved { get; set; }
    public long? ApprovedBy { get; set; }
    public DateTimeOffset? ApprovedAt { get; set; }
}

/// <summary>inventory.packing_line — Đóng gói, soạn hàng.</summary>
public class PackingLine
{
    public long Id { get; set; }
    public long DocId { get; set; }
    public long? DocLineId { get; set; }
    public decimal? UnitsPerPack { get; set; }
    public decimal? PackCount { get; set; }
    public decimal? LooseUnits { get; set; }
    public long? PerformerId { get; set; }
    public bool IsDone { get; set; }
}

/// <summary>inventory.delivery_plan — Kế hoạch giao hàng theo phiếu xuất.</summary>
public class DeliveryPlan
{
    public long Id { get; set; }
    public long DocId { get; set; }
    public DateOnly? PlanDate { get; set; }
    public string? Vehicle { get; set; }
    public string? Driver { get; set; }
    public string? Note { get; set; }
}

/// <summary>inventory.stock_reconciliation — Phiếu kiểm kê.</summary>
public class StockReconciliation
{
    public long Id { get; set; }
    public string DocNo { get; set; } = null!;
    public long WarehouseId { get; set; }
    public DateOnly ReconciliationDate { get; set; }
    public string Status { get; set; } = "DRAFT";  // DRAFT → APPROVED → POSTED
    public string? Note { get; set; }
    public long? CreatedBy { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public long? PostedBy { get; set; }
    public DateTimeOffset? PostedAt { get; set; }

    public List<StockReconciliationLine> Lines { get; set; } = new();
}

/// <summary>inventory.stock_reconciliation_line</summary>
public class StockReconciliationLine
{
    public long Id { get; set; }
    public long ReconciliationId { get; set; }
    public long ProductId { get; set; }
    public long? LotId { get; set; }
    public decimal SystemQty { get; set; }        // SL hệ thống snapshot
    public decimal ActualQty { get; set; }         // SL thực đếm
    public decimal Difference { get; set; }        // chênh lệch = actual - system
}