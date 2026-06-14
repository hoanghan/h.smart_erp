using System.Text.Json.Serialization;

namespace Erp.Api.Dtos;

// ===================== Workstation =====================

public record WorkstationOut(
    long Id,
    string Name,
    [property: JsonPropertyName("hourly_cost")] decimal HourlyCost,
    [property: JsonPropertyName("working_hours_per_day")] decimal WorkingHoursPerDay,
    string? Description,
    [property: JsonPropertyName("is_active")] bool IsActive
);

public record WorkstationIn(
    string Name,
    [property: JsonPropertyName("hourly_cost")] decimal HourlyCost,
    [property: JsonPropertyName("working_hours_per_day")] decimal WorkingHoursPerDay,
    string? Description,
    [property: JsonPropertyName("is_active")] bool IsActive = true
);

// ===================== Operation =====================

public record OperationOut(
    long Id,
    string Name,
    [property: JsonPropertyName("default_workstation_id")] long? DefaultWorkstationId,
    [property: JsonPropertyName("default_workstation_name")] string? DefaultWorkstationName,
    [property: JsonPropertyName("standard_time_minutes")] decimal StandardTimeMinutes,
    string? Description,
    [property: JsonPropertyName("is_active")] bool IsActive
);

public record OperationIn(
    string Name,
    [property: JsonPropertyName("default_workstation_id")] long? DefaultWorkstationId,
    [property: JsonPropertyName("standard_time_minutes")] decimal StandardTimeMinutes,
    string? Description,
    [property: JsonPropertyName("is_active")] bool IsActive = true
);

// ===================== BOM =====================

public record BomItemDto(
    long Id,
    [property: JsonPropertyName("product_id")] long ProductId,
    [property: JsonPropertyName("product_code")] string ProductCode,
    [property: JsonPropertyName("product_name")] string ProductName,
    decimal Quantity,
    decimal Rate,
    decimal Amount,
    [property: JsonPropertyName("bom_id")] long? BomId,
    [property: JsonPropertyName("bom_name")] string? BomName,
    int Level,
    [property: JsonPropertyName("parent_id")] long? ParentId
);

public record BomOperationDto(
    long Id,
    [property: JsonPropertyName("operation_id")] long OperationId,
    [property: JsonPropertyName("operation_name")] string OperationName,
    [property: JsonPropertyName("workstation_id")] long? WorkstationId,
    [property: JsonPropertyName("workstation_name")] string? WorkstationName,
    [property: JsonPropertyName("time_minutes")] decimal TimeMinutes,
    decimal Cost
);

public record BomScrapDto(
    long Id,
    [property: JsonPropertyName("product_id")] long ProductId,
    [property: JsonPropertyName("product_name")] string ProductName,
    decimal Quantity,
    decimal Rate,
    decimal Amount
);

public record BomDetailOut(
    long Id,
    [property: JsonPropertyName("doc_no")] string DocNo,
    [property: JsonPropertyName("product_id")] long ProductId,
    [property: JsonPropertyName("product_name")] string ProductName,
    [property: JsonPropertyName("product_code")] string ProductCode,
    decimal Quantity,
    [property: JsonPropertyName("is_default")] bool IsDefault,
    [property: JsonPropertyName("with_operations")] bool WithOperations,
    string Status,
    List<BomItemDto> Items,
    List<BomOperationDto> Operations,
    List<BomScrapDto> Scraps
);

public record BomListItemOut(
    long Id,
    [property: JsonPropertyName("doc_no")] string DocNo,
    [property: JsonPropertyName("product_id")] long ProductId,
    [property: JsonPropertyName("product_name")] string ProductName,
    [property: JsonPropertyName("product_code")] string ProductCode,
    decimal Quantity,
    [property: JsonPropertyName("is_default")] bool IsDefault,
    [property: JsonPropertyName("with_operations")] bool WithOperations,
    string Status,
    [property: JsonPropertyName("created_at")] DateTimeOffset CreatedAt
);

public record ExplodeItemDto(
    [property: JsonPropertyName("product_id")] long ProductId,
    [property: JsonPropertyName("product_code")] string ProductCode,
    [property: JsonPropertyName("product_name")] string ProductName,
    decimal Quantity,
    decimal Rate,
    decimal Amount
);

public record ExplodeResultOut(
    List<ExplodeItemDto> Items,
    [property: JsonPropertyName("total_cost")] decimal TotalCost,
    [property: JsonPropertyName("unit_cost")] decimal UnitCost
);

public record BomItemIn(
    [property: JsonPropertyName("product_id")] long ProductId,
    decimal Quantity,
    decimal? Rate,
    [property: JsonPropertyName("scrap_loss_pct")] decimal ScrapLossPct,
    [property: JsonPropertyName("bom_id")] long? BomId
);

public record BomOperationIn(
    [property: JsonPropertyName("operation_id")] long OperationId,
    [property: JsonPropertyName("workstation_id")] long? WorkstationId,
    [property: JsonPropertyName("time_minutes")] decimal TimeMinutes
);

public record BomScrapIn(
    [property: JsonPropertyName("product_id")] long ProductId,
    decimal Quantity,
    decimal? Rate
);

public record BomIn(
    [property: JsonPropertyName("product_id")] long ProductId,
    [property: JsonPropertyName("product_code")] string? ProductCode,
    decimal Quantity,
    [property: JsonPropertyName("is_default")] bool IsDefault,
    [property: JsonPropertyName("with_operations")] bool WithOperations,
    string? Note,
    List<BomItemIn>? Items,
    List<BomOperationIn>? Operations,
    List<BomScrapIn>? Scraps
);

// ===================== Work Order =====================

public record WorkOrderItemDto(
    [property: JsonPropertyName("product_id")] long ProductId,
    [property: JsonPropertyName("product_code")] string ProductCode,
    [property: JsonPropertyName("product_name")] string ProductName,
    decimal Quantity,
    [property: JsonPropertyName("transferred_qty")] decimal TransferredQty,
    decimal Rate,
    decimal Amount
);

public record WorkOrderOperationDto(
    long Id,
    [property: JsonPropertyName("operation_name")] string OperationName,
    [property: JsonPropertyName("workstation_name")] string? WorkstationName,
    [property: JsonPropertyName("total_minutes")] decimal TotalMinutes,
    [property: JsonPropertyName("completed_qty")] decimal CompletedQty,
    [property: JsonPropertyName("actual_cost")] decimal ActualCost
);

public record FinishBatchDto(
    long Id,
    decimal Qty,
    [property: JsonPropertyName("completed_at")] DateTimeOffset CompletedAt,
    decimal Cost
);

public record WoStockDocDto(
    long Id,
    [property: JsonPropertyName("doc_no")] string DocNo,
    string? Purpose,
    [property: JsonPropertyName("created_at")] DateTimeOffset CreatedAt
);

public record WorkOrderDetailOut(
    long Id,
    [property: JsonPropertyName("doc_no")] string DocNo,
    [property: JsonPropertyName("product_id")] long ProductId,
    [property: JsonPropertyName("product_name")] string ProductName,
    [property: JsonPropertyName("product_code")] string ProductCode,
    [property: JsonPropertyName("bom_id")] long BomId,
    [property: JsonPropertyName("bom_no")] string BomNo,
    decimal Qty,
    [property: JsonPropertyName("produced_qty")] decimal ProducedQty,
    decimal Progress,
    [property: JsonPropertyName("wip_warehouse_id")] long WipWarehouseId,
    [property: JsonPropertyName("wip_warehouse_name")] string WipWarehouseName,
    [property: JsonPropertyName("fg_warehouse_id")] long FgWarehouseId,
    [property: JsonPropertyName("fg_warehouse_name")] string FgWarehouseName,
    [property: JsonPropertyName("planned_start_date")] DateOnly? PlannedStartDate,
    [property: JsonPropertyName("planned_end_date")] DateOnly? PlannedEndDate,
    string Status,
    List<WorkOrderItemDto> Items,
    List<WorkOrderOperationDto> Operations,
    [property: JsonPropertyName("finish_batches")] List<FinishBatchDto> FinishBatches,
    [property: JsonPropertyName("stock_docs")] List<WoStockDocDto> StockDocs
);

public record WorkOrderListItemOut(
    long Id,
    [property: JsonPropertyName("doc_no")] string DocNo,
    [property: JsonPropertyName("product_id")] long ProductId,
    [property: JsonPropertyName("product_name")] string ProductName,
    [property: JsonPropertyName("product_code")] string ProductCode,
    [property: JsonPropertyName("bom_id")] long BomId,
    [property: JsonPropertyName("bom_no")] string BomNo,
    decimal Qty,
    [property: JsonPropertyName("produced_qty")] decimal ProducedQty,
    decimal Progress,
    [property: JsonPropertyName("wip_warehouse_name")] string WipWarehouseName,
    [property: JsonPropertyName("fg_warehouse_name")] string FgWarehouseName,
    [property: JsonPropertyName("planned_start_date")] DateOnly? PlannedStartDate,
    [property: JsonPropertyName("planned_end_date")] DateOnly? PlannedEndDate,
    string Status
);

public record WorkOrderIn(
    [property: JsonPropertyName("product_id")] long ProductId,
    [property: JsonPropertyName("bom_id")] long BomId,
    decimal Qty,
    [property: JsonPropertyName("source_warehouse_id")] long? SourceWarehouseId,
    [property: JsonPropertyName("wip_warehouse_id")] long? WipWarehouseId,
    [property: JsonPropertyName("fg_warehouse_id")] long? FgWarehouseId,
    [property: JsonPropertyName("planned_start_date")] string? PlannedStartDate,
    [property: JsonPropertyName("planned_end_date")] string? PlannedEndDate,
    string? Note
);

public record WorkOrderFinishIn(decimal Qty);

public record WorkOrderStopIn(string Reason);

public record JobCardIn(
    [property: JsonPropertyName("from_time")] string FromTime,
    [property: JsonPropertyName("to_time")] string ToTime,
    [property: JsonPropertyName("completed_qty")] decimal CompletedQty
);

public record StartResultOut(
    [property: JsonPropertyName("stock_doc_id")] long StockDocId,
    [property: JsonPropertyName("stock_doc_no")] string StockDocNo
);

// ===================== Production Plan =====================

public record PpSalesOrderDto(
    long Id,
    [property: JsonPropertyName("doc_no")] string DocNo,
    [property: JsonPropertyName("customer_name")] string CustomerName,
    [property: JsonPropertyName("delivery_date")] DateOnly? DeliveryDate,
    string Status
);

public record PpProductDto(
    [property: JsonPropertyName("product_id")] long ProductId,
    [property: JsonPropertyName("product_code")] string ProductCode,
    [property: JsonPropertyName("product_name")] string ProductName,
    [property: JsonPropertyName("bom_no")] string? BomNo,
    [property: JsonPropertyName("required_qty")] decimal RequiredQty,
    [property: JsonPropertyName("from_so_ids")] List<long> FromSoIds
);

public record PpMaterialDto(
    [property: JsonPropertyName("product_id")] long ProductId,
    [property: JsonPropertyName("product_code")] string ProductCode,
    [property: JsonPropertyName("product_name")] string ProductName,
    [property: JsonPropertyName("required_qty")] decimal RequiredQty,
    [property: JsonPropertyName("on_hand")] decimal OnHand,
    decimal Ordered,
    decimal Reserved,
    [property: JsonPropertyName("projected_qty")] decimal ProjectedQty,
    decimal Shortage,
    [property: JsonPropertyName("is_shortage")] bool IsShortage,
    [property: JsonPropertyName("suggested_supplier_id")] long? SuggestedSupplierId,
    [property: JsonPropertyName("suggested_supplier_name")] string? SuggestedSupplierName
);

public record PpGeneratedWoDto(
    [property: JsonPropertyName("work_order_id")] long WorkOrderId,
    [property: JsonPropertyName("doc_no")] string DocNo,
    [property: JsonPropertyName("product_name")] string ProductName,
    decimal Qty
);

public record PpGeneratedMrDto(
    [property: JsonPropertyName("request_id")] long RequestId,
    [property: JsonPropertyName("doc_no")] string DocNo,
    [property: JsonPropertyName("product_name")] string ProductName,
    decimal Qty,
    [property: JsonPropertyName("supplier_name")] string? SupplierName
);

public record PpConsolidatedPoItemDto(
    [property: JsonPropertyName("product_id")] long ProductId,
    [property: JsonPropertyName("product_name")] string ProductName,
    decimal Qty,
    decimal Rate,
    decimal Amount
);

public record PpConsolidatedPoDto(
    [property: JsonPropertyName("supplier_id")] long SupplierId,
    [property: JsonPropertyName("supplier_name")] string SupplierName,
    [property: JsonPropertyName("total_amount")] decimal TotalAmount,
    List<PpConsolidatedPoItemDto> Items
);

public record ProductionPlanDetailOut(
    long Id,
    [property: JsonPropertyName("doc_no")] string DocNo,
    string Status,
    [property: JsonPropertyName("sales_orders")] List<PpSalesOrderDto> SalesOrders,
    List<PpProductDto> Products,
    List<PpMaterialDto> Materials,
    [property: JsonPropertyName("generated_work_orders")] List<PpGeneratedWoDto>? GeneratedWorkOrders,
    [property: JsonPropertyName("generated_material_requests")] List<PpGeneratedMrDto>? GeneratedMaterialRequests,
    [property: JsonPropertyName("consolidated_pos")] List<PpConsolidatedPoDto>? ConsolidatedPos
);

public record ProductionPlanListItemOut(
    long Id,
    [property: JsonPropertyName("doc_no")] string DocNo,
    string Status,
    [property: JsonPropertyName("created_at")] DateTimeOffset CreatedAt,
    [property: JsonPropertyName("total_products")] int TotalProducts,
    [property: JsonPropertyName("total_materials")] int TotalMaterials,
    [property: JsonPropertyName("shortage_materials")] int ShortageMaterials
);

public record ManualDemandIn(
    [property: JsonPropertyName("product_id")] long ProductId,
    decimal Qty
);

public record ProductionPlanIn(
    [property: JsonPropertyName("so_ids")] List<long>? SoIds,
    [property: JsonPropertyName("manual_demand")] List<ManualDemandIn>? ManualDemand
);

public record ConsolidateToPoIn(
    [property: JsonPropertyName("supplierAssignments")] Dictionary<long, long>? SupplierAssignments
);

public record ConsolidateToPoOut(
    [property: JsonPropertyName("consolidated_pos")] List<PpConsolidatedPoDto> ConsolidatedPos
);

// ===================== Reports =====================

public record ProductionCostReportDto(
    [property: JsonPropertyName("work_order_id")] long WorkOrderId,
    [property: JsonPropertyName("doc_no")] string DocNo,
    [property: JsonPropertyName("product_name")] string ProductName,
    [property: JsonPropertyName("bom_qty")] decimal BomQty,
    [property: JsonPropertyName("produced_qty")] decimal ProducedQty,
    [property: JsonPropertyName("bom_cost")] decimal BomCost,
    [property: JsonPropertyName("actual_cost")] decimal ActualCost,
    decimal Variance,
    [property: JsonPropertyName("variance_percent")] decimal VariancePercent
);

public record WipBalanceReportDto(
    [property: JsonPropertyName("work_order_id")] long WorkOrderId,
    [property: JsonPropertyName("doc_no")] string DocNo,
    [property: JsonPropertyName("product_name")] string ProductName,
    [property: JsonPropertyName("wip_balance")] decimal WipBalance,
    [property: JsonPropertyName("wip_cost")] decimal WipCost,
    [property: JsonPropertyName("created_at")] DateTimeOffset CreatedAt
);
