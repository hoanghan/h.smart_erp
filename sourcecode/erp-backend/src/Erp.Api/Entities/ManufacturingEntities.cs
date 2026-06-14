namespace Erp.Api.Entities;
using Erp.Api.Core;

/// <summary>mfg.workstation — Trạm làm việc.</summary>
public class Workstation
{
    public long Id { get; set; }
    public string Code { get; set; } = null!;
    public string Name { get; set; } = null!;
    public decimal HourlyRate { get; set; } = 0;
    public decimal WorkingHoursPerDay { get; set; } = 8;
    public string? Description { get; set; }
    public bool IsActive { get; set; } = true;
}

/// <summary>mfg.operation — Công đoạn sản xuất.</summary>
public class Operation
{
    public long Id { get; set; }
    public string Code { get; set; } = null!;
    public string Name { get; set; } = null!;
    public long? DefaultWorkstationId { get; set; }
    public decimal StandardTimeMinutes { get; set; } = 0;
    public string? Description { get; set; }
    public bool IsActive { get; set; } = true;
}

/// <summary>mfg.bom — BOM sản xuất (khác product_bom bán hàng).</summary>
public class Bom : IHasAudit
{
    public long Id { get; set; }
    public string DocNo { get; set; } = null!;
    public long ProductId { get; set; }
    public decimal Quantity { get; set; } = 1;
    public bool IsActive { get; set; } = true;
    public bool IsDefault { get; set; } = true;
    public bool WithOperations { get; set; }
    public string Status { get; set; } = "DRAFT";  // DRAFT → SUBMITTED → CANCELLED
    public string? Note { get; set; }
    public long? CreatorId { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? SubmittedAt { get; set; }

    public List<BomItem> Items { get; set; } = new();
    public List<BomOperation> Operations { get; set; } = new();
    public List<BomScrap> Scraps { get; set; } = new();
}

/// <summary>mfg.bom_item — Nguyên vật liệu trong BOM.</summary>
public class BomItem
{
    public long Id { get; set; }
    public long BomId { get; set; }
    public long ProductId { get; set; }
    public decimal Qty { get; set; }
    public decimal? Rate { get; set; }
    public decimal ScrapLossPct { get; set; } = 0;
    public long? SubBomId { get; set; }      // BOM con → đa cấp
}

/// <summary>mfg.bom_scrap — Phế phẩm trong BOM.</summary>
public class BomScrap
{
    public long Id { get; set; }
    public long BomId { get; set; }
    public long ProductId { get; set; }
    public decimal Qty { get; set; }
    public decimal? Rate { get; set; }
}

/// <summary>mfg.bom_operation — Công đoạn trong BOM.</summary>
public class BomOperation
{
    public long Id { get; set; }
    public long BomId { get; set; }
    public long OperationId { get; set; }
    public long? WorkstationId { get; set; }
    public decimal TimeMinutes { get; set; }
    public decimal HourlyRate { get; set; }
    public decimal OperationCost => TimeMinutes / 60 * HourlyRate;
}

/// <summary>mfg.work_order — Lệnh sản xuất.</summary>
public class WorkOrder : IHasAudit
{
    public long Id { get; set; }
    public string DocNo { get; set; } = null!;
    public long ProductId { get; set; }
    public long BomId { get; set; }
    public long? ProductionPlanId { get; set; }
    public decimal Qty { get; set; }
    public decimal ProducedQty { get; set; } = 0;
    public long? SourceWarehouseId { get; set; }
    public long WipWarehouseId { get; set; }
    public long FgWarehouseId { get; set; }
    public DateOnly? PlannedStartDate { get; set; }
    public DateOnly? PlannedEndDate { get; set; }
    public string Status { get; set; } = "DRAFT";  // DRAFT → NOT_STARTED → IN_PROCESS → COMPLETED / STOPPED
    public string? StopReason { get; set; }
    public long? StockDocTransferId { get; set; }
    public string? Note { get; set; }
    public long? CreatorId { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? StartedAt { get; set; }
    public DateTimeOffset? CompletedAt { get; set; }

    public List<WorkOrderItem> Items { get; set; } = new();
    public List<WorkOrderOperation> Operations { get; set; } = new();
    public List<WoFinishBatch> FinishBatches { get; set; } = new();
}

/// <summary>mfg.wo_item — NVL theo lệnh sản xuất.</summary>
public class WorkOrderItem
{
    public long Id { get; set; }
    public long WorkOrderId { get; set; }
    public long ProductId { get; set; }
    public decimal RequiredQty { get; set; }
    public decimal Rate { get; set; }
    public decimal TransferredQty { get; set; } = 0;
    public decimal ConsumedQty { get; set; } = 0;
}

/// <summary>mfg.wo_operation — Công đoạn theo lệnh sản xuất.</summary>
public class WorkOrderOperation
{
    public long Id { get; set; }
    public long WorkOrderId { get; set; }
    public long OperationId { get; set; }
    public long? WorkstationId { get; set; }
    public decimal PlannedTimeMinutes { get; set; }
    public decimal HourlyRate { get; set; } = 0;
    public string Status { get; set; } = "PENDING";  // PENDING | IN_PROGRESS | COMPLETED
}

/// <summary>mfg.wo_finish_batch — Đợt hoàn thành sản xuất của lệnh sản xuất.</summary>
public class WoFinishBatch
{
    public long Id { get; set; }
    public long WorkOrderId { get; set; }
    public decimal Qty { get; set; }
    public decimal Cost { get; set; }
    public long StockDocId { get; set; }
    public DateTimeOffset CompletedAt { get; set; }
}

/// <summary>mfg.job_card — Thẻ công việc.</summary>
public class JobCard
{
    public long Id { get; set; }
    public long WorkOrderId { get; set; }
    public long WoOperationId { get; set; }
    public long OperationId { get; set; }
    public long? WorkstationId { get; set; }
    public decimal TimeLogMinutes { get; set; } = 0;
    public decimal CompletedQty { get; set; } = 0;
    public string Status { get; set; } = "OPEN";     // OPEN | WIP | COMPLETED
    public string? Note { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? StartedAt { get; set; }
    public DateTimeOffset? CompletedAt { get; set; }
}

/// <summary>mfg.production_plan — Kế hoạch sản xuất / MRP.</summary>
public class ProductionPlan : IHasAudit
{
    public long Id { get; set; }
    public string DocNo { get; set; } = null!;
    public DateOnly PlanDate { get; set; }
    public string Status { get; set; } = "DRAFT";  // DRAFT → SUBMITTED → COMPLETED / CANCELLED
    public string? Note { get; set; }
    public long? CreatorId { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? SubmittedAt { get; set; }

    public List<PpSo> SalesOrders { get; set; } = new();
    public List<PpItem> Items { get; set; } = new();
}

/// <summary>mfg.pp_so — SO gom vào kế hoạch.</summary>
public class PpSo
{
    public long ProductionPlanId { get; set; }
    public long SalesOrderId { get; set; }
}

/// <summary>mfg.pp_item — Thành phẩm cần sản xuất.</summary>
public class PpItem
{
    public long Id { get; set; }
    public long ProductionPlanId { get; set; }
    public long ProductId { get; set; }
    public decimal PlannedQty { get; set; }
}

/// <summary>mfg.pp_material — Nhu cầu NVL sau explode BOM.</summary>
public class PpMaterial
{
    public long Id { get; set; }
    public long ProductionPlanId { get; set; }
    public long ProductId { get; set; }
    public decimal RequiredQty { get; set; }
    public decimal OnHand { get; set; }
    public decimal Ordered { get; set; }
    public decimal Reserved { get; set; }
    public decimal ProjectedQty { get; set; }
    public decimal ShortageQty { get; set; }
    public decimal? Rate { get; set; }
    public long? SuggestedSupplierId { get; set; }
    public bool IsManufacturable { get; set; }
}