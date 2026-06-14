using Erp.Api.Core;
using Erp.Api.Data;
using Erp.Api.Dtos;
using Erp.Api.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Erp.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/mfg/work-orders")]
public class WorkOrdersController(
    ErpDbContext db, RbacService rbac, DocNumberingService docNum, WorkflowService wf, ValuationService valuation)
    : ControllerBase
{
    private const string Resource = "work-orders";

    private async Task<bool> Denied(string action) =>
        !await rbac.HasPermissionAsync(User, "DOCUMENT", Resource, action);

    private ObjectResult Forbidden(string action) =>
        StatusCode(403, new ApiError("WF_NO_PERMISSION", $"Thiếu quyền {action} trên DOCUMENT:{Resource}"));

    [HttpGet]
    public async Task<IActionResult> List(
        [FromQuery] string? status, [FromQuery] int page = 1, [FromQuery] int size = 50)
    {
        if (await Denied("VIEW")) return Forbidden("VIEW");
        page = Math.Max(1, page);
        size = Math.Clamp(size, 1, 500);

        IQueryable<WorkOrder> query = db.WorkOrders;
        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(w => w.Status == status);

        var total = await query.LongCountAsync();
        var wos = await query.OrderByDescending(w => w.Id)
            .Skip((page - 1) * size).Take(size).ToListAsync();

        var productIds = wos.Select(w => w.ProductId).Distinct().ToList();
        var products = await db.Products.Where(p => productIds.Contains(p.Id))
            .ToDictionaryAsync(p => p.Id, p => p);

        var bomIds = wos.Select(w => w.BomId).Distinct().ToList();
        var boms = await db.Boms.Where(b => bomIds.Contains(b.Id))
            .ToDictionaryAsync(b => b.Id, b => b.DocNo);

        var whIds = wos.SelectMany(w => new[] { w.WipWarehouseId, w.FgWarehouseId }).Distinct().ToList();
        var warehouses = await db.Warehouses.Where(x => whIds.Contains(x.Id))
            .ToDictionaryAsync(x => x.Id, x => x.Name);

        var result = wos.Select(w =>
        {
            var p = products.GetValueOrDefault(w.ProductId);
            var progress = w.Qty != 0 ? Math.Round(w.ProducedQty / w.Qty * 100, 2) : 0;
            return new WorkOrderListItemOut(w.Id, w.DocNo, w.ProductId, p?.Name ?? "", p?.Code ?? "",
                w.BomId, boms.GetValueOrDefault(w.BomId) ?? "", w.Qty, w.ProducedQty, progress,
                warehouses.GetValueOrDefault(w.WipWarehouseId) ?? "", warehouses.GetValueOrDefault(w.FgWarehouseId) ?? "",
                w.PlannedStartDate, w.PlannedEndDate, w.Status);
        }).ToList();

        return Ok(new PageResult<WorkOrderListItemOut>(result, total, page, size));
    }

    [HttpGet("{id:long}")]
    public async Task<IActionResult> Get(long id)
    {
        if (await Denied("VIEW")) return Forbidden("VIEW");
        var wo = await db.WorkOrders
            .Include(x => x.Items).Include(x => x.Operations).Include(x => x.FinishBatches)
            .FirstOrDefaultAsync(x => x.Id == id);
        if (wo is null) return NotFound(new ApiError("NOT_FOUND", $"work-orders/{id} không tồn tại"));
        return Ok(await ToDetailDto(wo));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] WorkOrderIn body)
    {
        if (await Denied("CREATE")) return Forbidden("CREATE");

        var bom = await db.Boms.Include(b => b.Operations).FirstOrDefaultAsync(b => b.Id == body.BomId);
        if (bom is null) return BadRequest(new ApiError("VALIDATION", $"BOM {body.BomId} không tồn tại"));

        if (body.WipWarehouseId is not long wipId || wipId <= 0)
            return BadRequest(new ApiError("VALIDATION", "Thiếu kho WIP (wip_warehouse_id)"));
        if (body.FgWarehouseId is not long fgId || fgId <= 0)
            return BadRequest(new ApiError("VALIDATION", "Thiếu kho thành phẩm (fg_warehouse_id)"));

        var qty = body.Qty > 0 ? body.Qty : 1;

        var wo = new WorkOrder
        {
            DocNo = await docNum.NextAsync("WORK_ORDER"),
            ProductId = body.ProductId,
            BomId = body.BomId,
            Qty = qty,
            SourceWarehouseId = body.SourceWarehouseId,
            WipWarehouseId = wipId,
            FgWarehouseId = fgId,
            PlannedStartDate = ParseDate(body.PlannedStartDate),
            PlannedEndDate = ParseDate(body.PlannedEndDate),
            Status = "DRAFT",
            Note = body.Note,
            CreatorId = RbacService.GetUserId(User),
        };

        await BomExplodeHelper.PopulateWoItemsAndOps(db, wo, bom, qty);

        db.WorkOrders.Add(wo);
        await db.SaveChangesAsync();
        return StatusCode(201, await ToDetailDto(wo));
    }

    [HttpPut("{id:long}")]
    public async Task<IActionResult> Update(long id, [FromBody] WorkOrderIn body)
    {
        if (await Denied("UPDATE")) return Forbidden("UPDATE");
        var wo = await db.WorkOrders
            .Include(x => x.Items).Include(x => x.Operations).Include(x => x.FinishBatches)
            .FirstOrDefaultAsync(x => x.Id == id);
        if (wo is null) return NotFound(new ApiError("NOT_FOUND", $"work-orders/{id} không tồn tại"));
        if (wo.Status != "DRAFT")
            return Conflict(new ApiError("WO_NOT_DRAFT", "Chỉ có thể sửa lệnh sản xuất ở trạng thái DRAFT"));

        var bom = await db.Boms.Include(b => b.Operations).FirstOrDefaultAsync(b => b.Id == body.BomId);
        if (bom is null) return BadRequest(new ApiError("VALIDATION", $"BOM {body.BomId} không tồn tại"));

        if (body.WipWarehouseId is not long wipId || wipId <= 0)
            return BadRequest(new ApiError("VALIDATION", "Thiếu kho WIP (wip_warehouse_id)"));
        if (body.FgWarehouseId is not long fgId || fgId <= 0)
            return BadRequest(new ApiError("VALIDATION", "Thiếu kho thành phẩm (fg_warehouse_id)"));

        var qty = body.Qty > 0 ? body.Qty : 1;

        wo.ProductId = body.ProductId;
        wo.BomId = body.BomId;
        wo.Qty = qty;
        wo.SourceWarehouseId = body.SourceWarehouseId;
        wo.WipWarehouseId = wipId;
        wo.FgWarehouseId = fgId;
        wo.PlannedStartDate = ParseDate(body.PlannedStartDate);
        wo.PlannedEndDate = ParseDate(body.PlannedEndDate);
        wo.Note = body.Note;

        db.WorkOrderItems.RemoveRange(wo.Items);
        db.WorkOrderOperations.RemoveRange(wo.Operations);
        wo.Items.Clear();
        wo.Operations.Clear();

        await BomExplodeHelper.PopulateWoItemsAndOps(db, wo, bom, qty);
        await db.SaveChangesAsync();
        return Ok(await ToDetailDto(wo));
    }

    [HttpPost("{id:long}/submit")]
    public async Task<IActionResult> Submit(long id)
    {
        var wo = await db.WorkOrders.Include(x => x.Operations).FirstOrDefaultAsync(x => x.Id == id);
        if (wo is null) return NotFound(new ApiError("NOT_FOUND", $"work-orders/{id} không tồn tại"));

        try
        {
            wo.Status = await wf.TransitionAsync(User, Resource, id, wo.Status, "submit", null);
        }
        catch (WorkflowException e)
        {
            return e.Code == "WF_NO_PERMISSION"
                ? StatusCode(403, new ApiError(e.Code, e.Message))
                : Conflict(new ApiError(e.Code, e.Message));
        }

        foreach (var op in wo.Operations)
        {
            db.JobCards.Add(new JobCard
            {
                WorkOrderId = wo.Id,
                WoOperationId = op.Id,
                OperationId = op.OperationId,
                WorkstationId = op.WorkstationId,
                Status = "OPEN",
            });
        }

        await db.SaveChangesAsync();
        return Ok(new { id = wo.Id, status = wo.Status });
    }

    [HttpPost("{id:long}/start")]
    public async Task<IActionResult> Start(long id)
    {
        var wo = await db.WorkOrders.Include(x => x.Items).FirstOrDefaultAsync(x => x.Id == id);
        if (wo is null) return NotFound(new ApiError("NOT_FOUND", $"work-orders/{id} không tồn tại"));

        if (wo.SourceWarehouseId is not long sourceWhId)
            return Conflict(new ApiError("WO_NO_SOURCE_WAREHOUSE", "Thiếu kho nguồn (source_warehouse_id) để chuyển NVL vào WIP"));

        try
        {
            wo.Status = await wf.TransitionAsync(User, Resource, id, wo.Status, "start", null);
        }
        catch (WorkflowException e)
        {
            return e.Code == "WF_NO_PERMISSION"
                ? StatusCode(403, new ApiError(e.Code, e.Message))
                : Conflict(new ApiError(e.Code, e.Message));
        }

        var today = DateOnly.FromDateTime(DateTime.Today);
        var now = DateTimeOffset.UtcNow;
        var balances = new Dictionary<(long ProductId, long WarehouseId, long? LotId), StockBalance>();

        foreach (var item in wo.Items)
        {
            if (item.RequiredQty <= 0) continue;
            var balance = await GetBalance(balances, item.ProductId, sourceWhId, null);
            if (balance.QtyOnHand < item.RequiredQty)
                return Conflict(new ApiError("STK_INSUFFICIENT",
                    $"Không đủ tồn kho NVL cho sản phẩm {item.ProductId} (tồn {balance.QtyOnHand}, cần {item.RequiredQty})"));
        }

        var stockDoc = new StockDoc
        {
            DocNo = await docNum.NextAsync("MATERIAL_TRANSFER"),
            DocType = "TRANSFER",
            SubType = "INTERNAL_TRANSFER",
            Purpose = "MATERIAL_TRANSFER_FOR_MANUFACTURE",
            RequestDate = today,
            ActualDate = today,
            FromWarehouseId = sourceWhId,
            ToWarehouseId = wo.WipWarehouseId,
            Status = "COMPLETED",
            CreatedBy = RbacService.GetUserId(User),
            CompletedBy = RbacService.GetUserId(User),
            CompletedAt = now,
            Note = $"Chuyển NVL vào WIP cho lệnh sản xuất {wo.DocNo}",
        };

        foreach (var item in wo.Items)
        {
            stockDoc.Lines.Add(new StockDocLine
            {
                ProductId = item.ProductId,
                RequestedQty = item.RequiredQty,
                ActualQty = item.RequiredQty,
                UnitPrice = item.Rate,
            });
        }

        db.StockDocs.Add(stockDoc);
        await db.SaveChangesAsync();

        for (var i = 0; i < wo.Items.Count; i++)
        {
            var item = wo.Items[i];
            var line = stockDoc.Lines[i];
            var qty = line.ActualQty!.Value;
            if (qty <= 0) continue;
            await AddMove(balances, stockDoc, line, today, sourceWhId, -qty, null);
            await AddMove(balances, stockDoc, line, today, wo.WipWarehouseId, qty, line.UnitPrice);
            item.TransferredQty = qty;
        }

        wo.StockDocTransferId = stockDoc.Id;
        wo.StartedAt = now;
        await db.SaveChangesAsync();

        return Ok(new StartResultOut(stockDoc.Id, stockDoc.DocNo));
    }

    [HttpPost("{id:long}/finish")]
    public async Task<IActionResult> Finish(long id, [FromBody] WorkOrderFinishIn body)
    {
        if (await Denied("UPDATE")) return Forbidden("UPDATE");
        var wo = await db.WorkOrders
            .Include(x => x.Items).Include(x => x.Operations).Include(x => x.FinishBatches)
            .FirstOrDefaultAsync(x => x.Id == id);
        if (wo is null) return NotFound(new ApiError("NOT_FOUND", $"work-orders/{id} không tồn tại"));
        if (wo.Status != "IN_PROCESS")
            return Conflict(new ApiError("WO_NOT_IN_PROCESS", "Lệnh sản xuất phải ở trạng thái IN_PROCESS để hoàn thành"));

        var batchQty = body.Qty;
        if (batchQty <= 0)
            return BadRequest(new ApiError("VALIDATION", "Số lượng hoàn thành phải > 0"));

        var remaining = wo.Qty - wo.ProducedQty;
        if (batchQty > remaining)
            return Conflict(new ApiError("WO_OVER_PRODUCE",
                $"Số lượng hoàn thành ({batchQty}) vượt số lượng còn lại ({remaining})"));

        var materialCostPerUnit = wo.Qty != 0 ? wo.Items.Sum(i => i.RequiredQty * i.Rate) / wo.Qty : 0;
        var opCostPerUnit = wo.Qty != 0 ? wo.Operations.Sum(o => o.PlannedTimeMinutes / 60 * o.HourlyRate) / wo.Qty : 0;
        var batchCost = batchQty * (materialCostPerUnit + opCostPerUnit);
        var fgRate = batchQty != 0 ? batchCost / batchQty : 0;
        var ratio = wo.Qty != 0 ? batchQty / wo.Qty : 0;

        var today = DateOnly.FromDateTime(DateTime.Today);
        var now = DateTimeOffset.UtcNow;
        var balances = new Dictionary<(long ProductId, long WarehouseId, long? LotId), StockBalance>();

        var stockDoc = new StockDoc
        {
            DocNo = await docNum.NextAsync("MANUFACTURE"),
            DocType = "TRANSFER",
            SubType = "MANUFACTURE",
            Purpose = "MANUFACTURE",
            RequestDate = today,
            ActualDate = today,
            FromWarehouseId = wo.WipWarehouseId,
            ToWarehouseId = wo.FgWarehouseId,
            Status = "COMPLETED",
            CreatedBy = RbacService.GetUserId(User),
            CompletedBy = RbacService.GetUserId(User),
            CompletedAt = now,
            Note = $"Hoàn thành đợt sản xuất {wo.DocNo} - SL {batchQty}",
        };

        foreach (var item in wo.Items)
        {
            var consumeQty = item.RequiredQty * ratio;
            stockDoc.Lines.Add(new StockDocLine
            {
                ProductId = item.ProductId,
                RequestedQty = consumeQty,
                ActualQty = consumeQty,
                UnitPrice = item.Rate,
            });
        }

        var fgLine = new StockDocLine
        {
            ProductId = wo.ProductId,
            RequestedQty = batchQty,
            ActualQty = batchQty,
            UnitPrice = fgRate,
        };
        stockDoc.Lines.Add(fgLine);

        db.StockDocs.Add(stockDoc);
        await db.SaveChangesAsync();

        for (var i = 0; i < wo.Items.Count; i++)
        {
            var item = wo.Items[i];
            var line = stockDoc.Lines[i];
            var qty = line.ActualQty!.Value;
            if (qty <= 0) continue;
            await AddMove(balances, stockDoc, line, today, wo.WipWarehouseId, -qty, null);
            item.ConsumedQty += qty;
        }
        await AddMove(balances, stockDoc, fgLine, today, wo.FgWarehouseId, batchQty, fgRate);

        wo.ProducedQty += batchQty;
        wo.FinishBatches.Add(new WoFinishBatch
        {
            WorkOrderId = wo.Id,
            Qty = batchQty,
            Cost = batchCost,
            StockDocId = stockDoc.Id,
            CompletedAt = now,
        });

        if (wo.ProducedQty >= wo.Qty)
        {
            wo.Status = "COMPLETED";
            wo.CompletedAt = now;
        }

        await db.SaveChangesAsync();
        return Ok(await ToDetailDto(wo));
    }

    [HttpPost("{id:long}/stop")]
    public async Task<IActionResult> Stop(long id, [FromBody] WorkOrderStopIn body)
    {
        var wo = await db.WorkOrders.FindAsync(id);
        if (wo is null) return NotFound(new ApiError("NOT_FOUND", $"work-orders/{id} không tồn tại"));

        try
        {
            wo.Status = await wf.TransitionAsync(User, Resource, id, wo.Status, "stop", body.Reason);
        }
        catch (WorkflowException e)
        {
            return e.Code == "WF_NO_PERMISSION"
                ? StatusCode(403, new ApiError(e.Code, e.Message))
                : Conflict(new ApiError(e.Code, e.Message));
        }

        wo.StopReason = body.Reason;
        await db.SaveChangesAsync();
        return Ok(new { id = wo.Id, status = wo.Status });
    }

    [HttpPost("{id:long}/operations/{woOperationId:long}/job-card")]
    public async Task<IActionResult> JobCardAction(long id, long woOperationId, [FromBody] JobCardIn body)
    {
        if (await Denied("UPDATE")) return Forbidden("UPDATE");
        var wo = await db.WorkOrders
            .Include(x => x.Items).Include(x => x.Operations).Include(x => x.FinishBatches)
            .FirstOrDefaultAsync(x => x.Id == id);
        if (wo is null) return NotFound(new ApiError("NOT_FOUND", $"work-orders/{id} không tồn tại"));

        var woOp = wo.Operations.FirstOrDefault(o => o.Id == woOperationId);
        if (woOp is null) return NotFound(new ApiError("NOT_FOUND", $"wo-operation/{woOperationId} không tồn tại"));

        if (!DateTime.TryParse(body.FromTime, out var from) || !DateTime.TryParse(body.ToTime, out var to))
            return BadRequest(new ApiError("VALIDATION", "from_time/to_time không hợp lệ"));
        if (to <= from)
            return BadRequest(new ApiError("VALIDATION", "to_time phải sau from_time"));

        var minutes = (decimal)(to - from).TotalMinutes;

        var jobCard = await db.JobCards.FirstOrDefaultAsync(j => j.WorkOrderId == id && j.WoOperationId == woOperationId);
        if (jobCard is null)
        {
            jobCard = new JobCard
            {
                WorkOrderId = id,
                WoOperationId = woOperationId,
                OperationId = woOp.OperationId,
                WorkstationId = woOp.WorkstationId,
            };
            db.JobCards.Add(jobCard);
        }

        jobCard.TimeLogMinutes += minutes;
        jobCard.CompletedQty += body.CompletedQty;
        jobCard.StartedAt ??= from;

        if (jobCard.CompletedQty >= wo.Qty)
        {
            jobCard.Status = "COMPLETED";
            jobCard.CompletedAt = DateTimeOffset.UtcNow;
            woOp.Status = "COMPLETED";
        }
        else
        {
            jobCard.Status = "WIP";
            woOp.Status = "IN_PROGRESS";
        }

        await db.SaveChangesAsync();
        return Ok(await ToDetailDto(wo));
    }

    // ----- helpers -----

    private static DateOnly? ParseDate(string? s) =>
        !string.IsNullOrWhiteSpace(s) && DateOnly.TryParse(s, out var d) ? d : null;

    private async Task AddMove(
        Dictionary<(long ProductId, long WarehouseId, long? LotId), StockBalance> balances,
        StockDoc d, StockDocLine l, DateOnly moveDate, long warehouseId, decimal qty, decimal? incomingRate)
    {
        var (valuationRate, stockValueDiff, qtyAfter, stockValue) =
            await valuation.CalcMovingAverage(l.ProductId, warehouseId, qty, incomingRate);

        db.StockMoves.Add(new StockMove
        {
            MoveDate = moveDate, DocId = d.Id, DocLineId = l.Id, ProductId = l.ProductId,
            WarehouseId = warehouseId, Qty = qty, UnitCost = l.UnitPrice,
            QtyAfterTransaction = qtyAfter, ValuationRate = valuationRate,
            StockValue = stockValue, StockValueDifference = stockValueDiff,
            PostingDatetime = DateTimeOffset.UtcNow,
        });

        var balance = await GetBalance(balances, l.ProductId, warehouseId, null);
        balance.QtyOnHand += qty;
        balance.UpdatedAt = DateTimeOffset.UtcNow;
    }

    private async Task<StockBalance> GetBalance(
        Dictionary<(long ProductId, long WarehouseId, long? LotId), StockBalance> cache,
        long productId, long warehouseId, long? lotId)
    {
        var key = (productId, warehouseId, lotId);
        if (cache.TryGetValue(key, out var balance)) return balance;

        balance = await db.StockBalances.FirstOrDefaultAsync(x =>
            x.ProductId == productId && x.WarehouseId == warehouseId && x.LotId == lotId);
        if (balance is null)
        {
            balance = new StockBalance { ProductId = productId, WarehouseId = warehouseId, LotId = lotId, QtyOnHand = 0 };
            db.StockBalances.Add(balance);
        }
        cache[key] = balance;
        return balance;
    }

    private async Task<WorkOrderDetailOut> ToDetailDto(WorkOrder wo)
    {
        var productIds = new HashSet<long> { wo.ProductId };
        foreach (var i in wo.Items) productIds.Add(i.ProductId);
        var products = await db.Products.Where(p => productIds.Contains(p.Id))
            .ToDictionaryAsync(p => p.Id, p => p);

        var bom = await db.Boms.FindAsync(wo.BomId);

        var whIds = new[] { wo.WipWarehouseId, wo.FgWarehouseId };
        var warehouses = await db.Warehouses.Where(w => whIds.Contains(w.Id))
            .ToDictionaryAsync(w => w.Id, w => w.Name);

        var opIds = wo.Operations.Select(o => o.OperationId).Distinct().ToList();
        var ops = await db.Operations.Where(o => opIds.Contains(o.Id))
            .ToDictionaryAsync(o => o.Id, o => o.Name);

        var wsIds = wo.Operations.Where(o => o.WorkstationId != null)
            .Select(o => o.WorkstationId!.Value).Distinct().ToList();
        var wss = await db.Workstations.Where(w => wsIds.Contains(w.Id))
            .ToDictionaryAsync(w => w.Id, w => w.Name);

        var woOpIds = wo.Operations.Select(o => o.Id).ToList();
        var jobCards = await db.JobCards.Where(j => woOpIds.Contains(j.WoOperationId)).ToListAsync();

        var p = products.GetValueOrDefault(wo.ProductId);
        var progress = wo.Qty != 0 ? Math.Round(wo.ProducedQty / wo.Qty * 100, 2) : 0;

        var itemDtos = wo.Items.Select(i =>
        {
            var ip = products.GetValueOrDefault(i.ProductId);
            return new WorkOrderItemDto(i.ProductId, ip?.Code ?? "", ip?.Name ?? "",
                i.RequiredQty, i.TransferredQty, i.Rate, i.RequiredQty * i.Rate);
        }).ToList();

        var opDtos = wo.Operations.Select(o =>
        {
            var totalMinutes = jobCards.Where(j => j.WoOperationId == o.Id).Sum(j => j.TimeLogMinutes);
            var completedQty = jobCards.Where(j => j.WoOperationId == o.Id).Sum(j => j.CompletedQty);
            return new WorkOrderOperationDto(o.Id, ops.GetValueOrDefault(o.OperationId) ?? "",
                o.WorkstationId is long wsId ? wss.GetValueOrDefault(wsId) : null,
                totalMinutes, completedQty, totalMinutes / 60 * o.HourlyRate);
        }).ToList();

        var finishDtos = wo.FinishBatches.Select(f => new FinishBatchDto(f.Id, f.Qty, f.CompletedAt, f.Cost)).ToList();

        var stockDocIds = new List<long>();
        if (wo.StockDocTransferId is long t) stockDocIds.Add(t);
        stockDocIds.AddRange(wo.FinishBatches.Select(f => f.StockDocId));
        var stockDocs = await db.StockDocs.Where(d => stockDocIds.Contains(d.Id))
            .Select(d => new WoStockDocDto(d.Id, d.DocNo, d.Purpose, d.CreatedAt)).ToListAsync();

        return new WorkOrderDetailOut(wo.Id, wo.DocNo, wo.ProductId, p?.Name ?? "", p?.Code ?? "",
            wo.BomId, bom?.DocNo ?? "", wo.Qty, wo.ProducedQty, progress,
            wo.WipWarehouseId, warehouses.GetValueOrDefault(wo.WipWarehouseId) ?? "",
            wo.FgWarehouseId, warehouses.GetValueOrDefault(wo.FgWarehouseId) ?? "",
            wo.PlannedStartDate, wo.PlannedEndDate, wo.Status,
            itemDtos, opDtos, finishDtos, stockDocs);
    }
}
