namespace Erp.Api.Dtos;

// ---------- Stock doc line ----------
public record StockDocLineIn(
    long ProductId, decimal RequestedQty, decimal? ActualQty = null, decimal? KitQty = null,
    decimal? UnitPrice = null, long? LotId = null, DateOnly? ExpiryDate = null,
    long? LocationId = null, string? Note = null);

public record StockDocLineUpdate(
    long? ProductId, decimal? RequestedQty, decimal? ActualQty, decimal? KitQty,
    decimal? UnitPrice, long? LotId, DateOnly? ExpiryDate, long? LocationId, string? Note);

public record StockDocLineOut(
    long Id, long ProductId, decimal RequestedQty, decimal? ActualQty, decimal? KitQty,
    decimal? UnitPrice, long? LotId, DateOnly? ExpiryDate, long? LocationId, string? Note);

// ---------- Stock doc ----------
public record StockDocCreate(
    string DocType, string SubType,
    DateOnly? RequestDate = null,
    long? SalesOrderId = null, long? PurchaseOrderId = null, long? SupplierReturnId = null,
    long? PartnerId = null, long? FromWarehouseId = null, long? ToWarehouseId = null,
    string? OrgUnit = null, long? ProcessId = null, long? CounterpartDocId = null,
    string? RefNo = null, string? Note = null,
    List<StockDocLineIn>? Lines = null);

public record StockDocUpdate(
    DateOnly? RequestDate, long? PartnerId, long? FromWarehouseId, long? ToWarehouseId,
    string? OrgUnit, long? ProcessId, long? CounterpartDocId, string? RefNo, string? Note);

public record StockDocOut(
    long Id, string DocNo, string DocType, string SubType, string? Purpose, DateOnly RequestDate, DateOnly? ActualDate,
    long? SalesOrderId, long? PurchaseOrderId, long? SupplierReturnId, long? PartnerId,
    long? FromWarehouseId, long? ToWarehouseId, string? OrgUnit, long? ProcessId,
    long? CounterpartDocId, string? RefNo, string? Note, string Status, string? StatusReason,
    long? CreatedBy, DateTimeOffset CreatedAt, long? CompletedBy, DateTimeOffset? CompletedAt,
    List<StockDocLineOut> Lines);

// ---------- Stock balance / Bin ----------
public record StockBalanceOut(
    long Id, long ProductId, long WarehouseId, long? LotId,
    decimal QtyOnHand, decimal ReservedQty, decimal OrderedQty, decimal ProjectedQty,
    DateTimeOffset UpdatedAt);

// ---------- Stock move / SLE ----------
public record StockMoveOut(
    long Id, DateOnly MoveDate, long DocId, long DocLineId, long ProductId, long WarehouseId,
    long? LotId, long? LocationId, decimal Qty, decimal? UnitCost, DateTimeOffset CreatedAt,
    decimal? QtyAfterTransaction, decimal? ValuationRate, decimal? StockValue, decimal? StockValueDifference,
    DateTimeOffset? PostingDatetime,
    string? DocNo = null, string? DocType = null);

// ---------- Tạo YC nhập/xuất từ đơn hàng ----------
public record CreateStockDocRequest(
    long? WarehouseId = null, DateOnly? RequestDate = null, string? Note = null);

// ---------- Gia công: Xuất SX-DV / Nhập SP-TP ----------
public record CreateOutsourcingIssueRequest(
    long ProcessId, long PartnerId, long FromWarehouseId, string? Note = null);

public record CreateFinishedReceiptRequest(
    long ProcessId, long ToWarehouseId, string? Note = null);

// ---------- Stock Reconciliation ----------
public record StockReconciliationCreate(
    long WarehouseId, DateOnly ReconciliationDate, string? Note = null,
    List<StockReconciliationLineIn>? Lines = null);

public record StockReconciliationLineIn(
    long ProductId, long? LotId = null, decimal ActualQty = 0);

public record StockReconciliationLineOut(
    long Id, long ProductId, long? LotId, decimal SystemQty, decimal ActualQty, decimal Difference);

public record StockReconciliationOut(
    long Id, string DocNo, long WarehouseId, DateOnly ReconciliationDate,
    string Status, string? Note, long? CreatedBy, DateTimeOffset CreatedAt,
    long? PostedBy, DateTimeOffset? PostedAt,
    List<StockReconciliationLineOut> Lines);

// ---------- Warehouse tree ----------
public record WarehouseTreeOut(
    long Id, string Code, string Name, long? ParentId, bool IsOutsourcing, bool IsActive);