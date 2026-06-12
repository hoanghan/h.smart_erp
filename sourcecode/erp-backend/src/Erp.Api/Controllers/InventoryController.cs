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
[Route("api/v1/inventory")]
public class InventoryController(
    ErpDbContext db, RbacService rbac, WorkflowService wf, DocNumberingService numbering,
    OutboxService outbox, ValuationService valuation)
    : ControllerBase
{
    private const string Resource = "stock-docs";

    private async Task<bool> Denied(string action) =>
        !await rbac.HasPermissionAsync(User, "DOCUMENT", Resource, action);

    private ObjectResult Forbidden(string action) =>
        StatusCode(403, new ApiError("WF_NO_PERMISSION", $"Thiếu quyền {action} trên DOCUMENT:{Resource}"));

    private static readonly Dictionary<string, string> NumberingKeys = new()
    {
        ["RECEIPT"] = "STOCK_RECEIPT",
        ["ISSUE"] = "STOCK_ISSUE",
        ["TRANSFER"] = "STOCK_TRANSFER",
    };

    // ERPNext purpose mapping from (docType, subType)
    private static string? MapPurpose(string docType, string subType) => (docType, subType) switch
    {
        ("RECEIPT", "PURCHASE") => "MATERIAL_RECEIPT",
        ("RECEIPT", "CUSTOMER_RETURN") => "MATERIAL_RECEIPT",
        ("RECEIPT", "FINISHED_GOODS") => "RECEIVE_FROM_SUBCONTRACTOR",
        ("RECEIPT", "RECEIPT_OTHER") => "MATERIAL_RECEIPT",
        ("RECEIPT", "RECEIPT_CODE_ADJUST") => "MATERIAL_RECEIPT",
        ("ISSUE", "SALES") => "MATERIAL_ISSUE",
        ("ISSUE", "OUTSOURCING") => "SEND_TO_SUBCONTRACTOR",
        ("ISSUE", "SUPPLIER_RETURN") => "MATERIAL_ISSUE",
        ("ISSUE", "ISSUE_OTHER") => "MATERIAL_ISSUE",
        ("ISSUE", "ISSUE_CODE_ADJUST") => "MATERIAL_ISSUE",
        ("TRANSFER", "INTERNAL_TRANSFER") => "MATERIAL_TRANSFER",
        _ => null,
    };

    // ----- Docs -----
    [HttpGet("docs")]
    public async Task<IActionResult> ListDocs(
        [FromQuery] string? docType, [FromQuery] string? subType, [FromQuery] string? status,
        [FromQuery] long? salesOrderId, [FromQuery] long? purchaseOrderId,
        [FromQuery] int page = 1, [FromQuery] int size = 50)
    {
        if (await Denied("VIEW")) return Forbidden("VIEW");
        var q = db.StockDocs.Include(x => x.Lines).AsNoTracking().AsQueryable();
        if (!string.IsNullOrEmpty(docType)) q = q.Where(x => x.DocType == docType);
        if (!string.IsNullOrEmpty(subType)) q = q.Where(x => x.SubType == subType);
        if (!string.IsNullOrEmpty(status)) q = q.Where(x => x.Status == status);
        if (salesOrderId.HasValue) q = q.Where(x => x.SalesOrderId == salesOrderId);
        if (purchaseOrderId.HasValue) q = q.Where(x => x.PurchaseOrderId == purchaseOrderId);
        var total = await q.LongCountAsync();
        var items = await q.OrderByDescending(x => x.Id)
            .Skip((Math.Max(1, page) - 1) * size).Take(Math.Clamp(size, 1, 200)).ToListAsync();
        return Ok(new PageResult<StockDocOut>(items.Select(InventoryMapper.ToDto).ToList(), total, page, size));
    }

    [HttpGet("docs/{id:long}")]
    public async Task<IActionResult> GetDoc(long id)
    {
        if (await Denied("VIEW")) return Forbidden("VIEW");
        var d = await db.StockDocs.Include(x => x.Lines).FirstOrDefaultAsync(x => x.Id == id);
        return d is null
            ? NotFound(new ApiError("NOT_FOUND", $"Chứng từ kho {id} không tồn tại"))
            : Ok(InventoryMapper.ToDto(d));
    }

    [HttpPost("docs")]
    public async Task<IActionResult> CreateDoc([FromBody] StockDocCreate body)
    {
        if (await Denied("CREATE")) return Forbidden("CREATE");
        if (!NumberingKeys.TryGetValue(body.DocType, out var numberingKey))
            return BadRequest(new ApiError("VALIDATION", $"doc_type không hợp lệ: {body.DocType}"));

        var d = new StockDoc
        {
            DocNo = await numbering.NextAsync(numberingKey),
            DocType = body.DocType,
            SubType = body.SubType,
            Purpose = MapPurpose(body.DocType, body.SubType),
            RequestDate = body.RequestDate ?? DateOnly.FromDateTime(DateTime.Today),
            SalesOrderId = body.SalesOrderId,
            PurchaseOrderId = body.PurchaseOrderId,
            SupplierReturnId = body.SupplierReturnId,
            PartnerId = body.PartnerId,
            FromWarehouseId = body.FromWarehouseId,
            ToWarehouseId = body.ToWarehouseId,
            OrgUnit = body.OrgUnit,
            ProcessId = body.ProcessId,
            CounterpartDocId = body.CounterpartDocId,
            RefNo = body.RefNo,
            Note = body.Note,
            CreatedBy = RbacService.GetUserId(User),
            Lines = (body.Lines ?? new()).Select(l => new StockDocLine
            {
                ProductId = l.ProductId, RequestedQty = l.RequestedQty, ActualQty = l.ActualQty,
                KitQty = l.KitQty, UnitPrice = l.UnitPrice, LotId = l.LotId, ExpiryDate = l.ExpiryDate,
                LocationId = l.LocationId, Note = l.Note,
            }).ToList(),
        };
        db.StockDocs.Add(d);
        await db.SaveChangesAsync();
        return StatusCode(201, InventoryMapper.ToDto(d));
    }

    [HttpPut("docs/{id:long}")]
    public async Task<IActionResult> UpdateDoc(long id, [FromBody] StockDocUpdate body)
    {
        if (await Denied("UPDATE")) return Forbidden("UPDATE");
        var d = await db.StockDocs.Include(x => x.Lines).FirstOrDefaultAsync(x => x.Id == id);
        if (d is null) return NotFound(new ApiError("NOT_FOUND", $"Chứng từ kho {id} không tồn tại"));
        if (d.Status != "DRAFT")
            return Conflict(new ApiError("WF_LOCKED", $"Trạng thái {d.Status}, không sửa được"));
        Mapper.Apply(body, d, skipNulls: true);
        await db.SaveChangesAsync();
        return Ok(InventoryMapper.ToDto(d));
    }

    // ----- Lines -----
    [HttpPost("docs/{id:long}/lines")]
    public async Task<IActionResult> AddLine(long id, [FromBody] StockDocLineIn body)
    {
        if (await Denied("UPDATE")) return Forbidden("UPDATE");
        var d = await db.StockDocs.FirstOrDefaultAsync(x => x.Id == id);
        if (d is null) return NotFound(new ApiError("NOT_FOUND", $"Chứng từ kho {id} không tồn tại"));
        if (d.Status is "COMPLETED" or "CANCELLED")
            return Conflict(new ApiError("WF_LOCKED", $"Trạng thái {d.Status}, không sửa được"));
        var line = new StockDocLine
        {
            DocId = id, ProductId = body.ProductId, RequestedQty = body.RequestedQty, ActualQty = body.ActualQty,
            KitQty = body.KitQty, UnitPrice = body.UnitPrice, LotId = body.LotId, ExpiryDate = body.ExpiryDate,
            LocationId = body.LocationId, Note = body.Note,
        };
        db.StockDocLines.Add(line);
        await db.SaveChangesAsync();
        return StatusCode(201, InventoryMapper.ToDto(line));
    }

    [HttpPut("docs/{id:long}/lines/{lineId:long}")]
    public async Task<IActionResult> UpdateLine(long id, long lineId, [FromBody] StockDocLineUpdate body)
    {
        if (await Denied("UPDATE")) return Forbidden("UPDATE");
        var d = await db.StockDocs.FirstOrDefaultAsync(x => x.Id == id);
        if (d is null) return NotFound(new ApiError("NOT_FOUND", $"Chứng từ kho {id} không tồn tại"));
        if (d.Status is "COMPLETED" or "CANCELLED")
            return Conflict(new ApiError("WF_LOCKED", $"Trạng thái {d.Status}, không sửa được"));
        var line = await db.StockDocLines.FirstOrDefaultAsync(x => x.Id == lineId && x.DocId == id);
        if (line is null) return NotFound(new ApiError("NOT_FOUND", "Dòng không tồn tại"));
        Mapper.Apply(body, line, skipNulls: true);
        await db.SaveChangesAsync();
        return Ok(InventoryMapper.ToDto(line));
    }

    [HttpDelete("docs/{id:long}/lines/{lineId:long}")]
    public async Task<IActionResult> DeleteLine(long id, long lineId)
    {
        if (await Denied("UPDATE")) return Forbidden("UPDATE");
        var d = await db.StockDocs.FirstOrDefaultAsync(x => x.Id == id);
        if (d is null) return NotFound(new ApiError("NOT_FOUND", $"Chứng từ kho {id} không tồn tại"));
        if (d.Status is "COMPLETED" or "CANCELLED")
            return Conflict(new ApiError("WF_LOCKED", $"Trạng thái {d.Status}, không sửa được"));
        var line = await db.StockDocLines.FirstOrDefaultAsync(x => x.Id == lineId && x.DocId == id);
        if (line is null) return NotFound(new ApiError("NOT_FOUND", "Dòng không tồn tại"));
        db.StockDocLines.Remove(line);
        await db.SaveChangesAsync();
        return NoContent();
    }

    // ----- Workflow actions -----
    [HttpPost("docs/{id:long}/actions/{actionName}")]
    public async Task<IActionResult> DocAction(long id, string actionName, [FromBody] WfActionRequest? body)
    {
        var d = await db.StockDocs.Include(x => x.Lines).FirstOrDefaultAsync(x => x.Id == id);
        if (d is null) return NotFound(new ApiError("NOT_FOUND", $"Chứng từ kho {id} không tồn tại"));

        return actionName switch
        {
            "fill-from-order" => await FillFromOrder(d),
            "set-actual-as-requested" => await SetActualAsRequested(d),
            "create-outsourcing-issue" => await CreateOutsourcingIssue(d, body),
            "create-finished-receipt" => await CreateFinishedReceipt(d, body),
            "complete" => await CompleteDoc(d, body),
            _ => await GenericTransition(d, actionName, body),
        };
    }

    private async Task<IActionResult> GenericTransition(StockDoc d, string actionName, WfActionRequest? body)
    {
        try
        {
            d.Status = await wf.TransitionAsync(User, Resource, d.Id, d.Status, actionName, body?.Reason);
        }
        catch (WorkflowException e)
        {
            return e.Code == "WF_NO_PERMISSION"
                ? StatusCode(403, new ApiError(e.Code, e.Message))
                : Conflict(new ApiError(e.Code, e.Message));
        }

        if (body?.Reason is not null) d.StatusReason = body.Reason;
        await db.SaveChangesAsync();
        return Ok(InventoryMapper.ToDto(d));
    }

    /// <summary>Copy dòng từ SO/PO sang doc lines.</summary>
    private async Task<IActionResult> FillFromOrder(StockDoc d)
    {
        if (await Denied("UPDATE")) return Forbidden("UPDATE");
        if (d.Status != "DRAFT")
            return Conflict(new ApiError("WF_LOCKED", $"Trạng thái {d.Status}, không thể nạp dòng từ đơn"));

        List<StockDocLine> newLines;
        if (d.DocType == "ISSUE" && d.SalesOrderId.HasValue)
        {
            var soLines = await db.SalesOrderLines.AsNoTracking()
                .Where(l => l.OrderId == d.SalesOrderId.Value && !l.IsGift)
                .ToListAsync();
            newLines = soLines.Select(l => new StockDocLine
            {
                ProductId = l.ProductId, RequestedQty = l.Quantity, UnitPrice = l.UnitPrice,
            }).ToList();
        }
        else if (d.DocType == "RECEIPT" && d.PurchaseOrderId.HasValue)
        {
            var poLines = await db.PurchaseOrderLines.AsNoTracking()
                .Where(l => l.OrderId == d.PurchaseOrderId.Value)
                .ToListAsync();
            newLines = poLines.Select(l => new StockDocLine
            {
                ProductId = l.ProductId, RequestedQty = l.Quantity, UnitPrice = l.UnitPrice,
            }).ToList();
        }
        else
        {
            return Conflict(new ApiError("VALIDATION", "Chứng từ không có đơn hàng tham chiếu phù hợp để nạp dòng"));
        }

        db.StockDocLines.RemoveRange(d.Lines);
        d.Lines.Clear();
        foreach (var l in newLines) d.Lines.Add(l);
        await db.SaveChangesAsync();
        return Ok(InventoryMapper.ToDto(d));
    }

    /// <summary>actual_qty = requested_qty cho toàn bộ dòng.</summary>
    private async Task<IActionResult> SetActualAsRequested(StockDoc d)
    {
        if (await Denied("UPDATE")) return Forbidden("UPDATE");
        if (d.Status is not ("REQUESTED" or "CONFIRMED"))
            return Conflict(new ApiError("WF_LOCKED", $"Trạng thái {d.Status}, không thể cập nhật thực tế"));

        foreach (var l in d.Lines) l.ActualQty = l.RequestedQty;
        await db.SaveChangesAsync();
        return Ok(InventoryMapper.ToDto(d));
    }

    /// <summary>
    /// Hoàn tất chứng từ: validate actual_qty, sinh stock_move (SLE) với valuation, cập nhật stock_balance (Bin),
    /// kiểm tra tồn đủ, cập nhật reserved/ordered qty, và lan trạng thái SO/PO.
    /// </summary>
    private async Task<IActionResult> CompleteDoc(StockDoc d, WfActionRequest? body)
    {
        if (d.Lines.Any(l => l.ActualQty is null))
            return Conflict(new ApiError("STK_ACTUAL_QTY_REQUIRED", "Cần nhập số lượng thực tế cho tất cả các dòng"));

        if (d.DocType == "RECEIPT" && d.ToWarehouseId is null)
            return Conflict(new ApiError("VALIDATION", "Thiếu kho nhập (to_warehouse_id)"));
        if (d.DocType == "ISSUE" && d.FromWarehouseId is null)
            return Conflict(new ApiError("VALIDATION", "Thiếu kho xuất (from_warehouse_id)"));
        if (d.DocType == "TRANSFER" && (d.FromWarehouseId is null || d.ToWarehouseId is null))
            return Conflict(new ApiError("VALIDATION", "Thiếu kho nguồn/đích"));

        // Leaf warehouse validation
        if (d.FromWarehouseId.HasValue && await HasChildren(d.FromWarehouseId.Value))
            return Conflict(new ApiError("WH_NOT_LEAF", $"Kho xuất ID {d.FromWarehouseId} là kho cha, phải chọn kho lá"));
        if (d.ToWarehouseId.HasValue && await HasChildren(d.ToWarehouseId.Value))
            return Conflict(new ApiError("WH_NOT_LEAF", $"Kho nhập ID {d.ToWarehouseId} là kho cha, phải chọn kho lá"));

        string newStatus;
        try
        {
            newStatus = await wf.TransitionAsync(User, Resource, d.Id, d.Status, "complete", body?.Reason);
        }
        catch (WorkflowException e)
        {
            return e.Code == "WF_NO_PERMISSION"
                ? StatusCode(403, new ApiError(e.Code, e.Message))
                : Conflict(new ApiError(e.Code, e.Message));
        }

        await using var tx = await db.Database.BeginTransactionAsync();
        var today = DateOnly.FromDateTime(DateTime.Today);
        var now = DateTimeOffset.UtcNow;
        var balances = new Dictionary<(long ProductId, long WarehouseId, long? LotId), StockBalance>();

        // Kiểm tra tồn đủ trước khi ghi move (ISSUE / TRANSFER)
        if (d.DocType is "ISSUE" or "TRANSFER")
        {
            foreach (var l in d.Lines)
            {
                var qty = l.ActualQty!.Value;
                if (qty <= 0) continue;
                var balance = await GetBalance(balances, l.ProductId, d.FromWarehouseId!.Value, l.LotId);
                if (balance.QtyOnHand < qty)
                    return Conflict(new ApiError("STK_INSUFFICIENT",
                        $"Không đủ tồn kho cho sản phẩm {l.ProductId} (tồn {balance.QtyOnHand}, cần {qty})"));
            }
        }

        // Sinh SLE với valuation
        foreach (var l in d.Lines)
        {
            var qty = l.ActualQty!.Value;
            if (qty == 0) continue;

            switch (d.DocType)
            {
                case "RECEIPT":
                    await AddMoveWithValuation(balances, d, l, today, d.ToWarehouseId!.Value, qty);
                    break;
                case "ISSUE":
                    await AddMoveWithValuation(balances, d, l, today, d.FromWarehouseId!.Value, -qty);
                    break;
                case "TRANSFER":
                    // Xuất khỏi kho nguồn
                    await AddMoveWithValuation(balances, d, l, today, d.FromWarehouseId!.Value, -qty);
                    // Nhập vào kho đích (giữ nguyên valuation rate từ kho nguồn)
                    await AddMoveWithValuation(balances, d, l, today, d.ToWarehouseId!.Value, qty);
                    break;
            }
        }

        d.Status = newStatus;
        d.ActualDate = today;
        d.CompletedBy = RbacService.GetUserId(User);
        d.CompletedAt = now;
        if (body?.Reason is not null) d.StatusReason = body.Reason;
        await db.SaveChangesAsync();

        // Cập nhật reserved/ordered qty
        await UpdateReservedOrderedQty(d);
        await UpdateOrderStatuses(d);
        await db.SaveChangesAsync();

        await tx.CommitAsync();

        // Publish outbox event for finance integration
        await outbox.PublishAsync("STOCK_DOC_COMPLETED", "inventory.stock_doc", d.Id, new
        {
            d.Id, d.DocNo, d.DocType, d.Status,
            d.SalesOrderId, d.PurchaseOrderId, d.FromWarehouseId, d.ToWarehouseId,
            Lines = d.Lines.Select(l => new { l.ProductId, l.ActualQty, l.UnitPrice })
        });

        return Ok(InventoryMapper.ToDto(d));
    }

    /// <summary>
    /// Sinh StockMove (SLE) kèm valuation (Moving Average).
    /// </summary>
    private async Task AddMoveWithValuation(
        Dictionary<(long ProductId, long WarehouseId, long? LotId), StockBalance> balances,
        StockDoc d, StockDocLine l, DateOnly moveDate, long warehouseId, decimal qty)
    {
        // Tính valuation
        var incomingRate = qty > 0 ? (l.UnitPrice ?? 0) + l.LandedCost : (decimal?)null;
        var (valuationRate, stockValueDiff, qtyAfter, stockValue) =
            await valuation.CalcMovingAverage(l.ProductId, warehouseId, qty, incomingRate);

        var move = new StockMove
        {
            MoveDate = moveDate, DocId = d.Id, DocLineId = l.Id, ProductId = l.ProductId,
            WarehouseId = warehouseId, LotId = l.LotId, LocationId = l.LocationId,
            Qty = qty, UnitCost = l.UnitPrice,
            // SLE fields
            QtyAfterTransaction = qtyAfter,
            ValuationRate = valuationRate,
            StockValue = stockValue,
            StockValueDifference = stockValueDiff,
            PostingDatetime = DateTimeOffset.UtcNow,
        };
        db.StockMoves.Add(move);

        var balance = await GetBalance(balances, l.ProductId, warehouseId, l.LotId);
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

    /// <summary>Kiểm tra kho có kho con không (leaf validation).</summary>
    private async Task<bool> HasChildren(long warehouseId)
    {
        return await db.Warehouses.AnyAsync(w => w.ParentId == warehouseId);
    }

    /// <summary>
    /// Cập nhật reserved_qty (SO) / ordered_qty (PO) trên stock_balance.
    ///reserved_qty = tổng SL chưa giao của SO đang APPROVED/NOT_DELIVERED.
    /// ordered_qty = tổng SL chưa nhận của PO đang APPROVED/TO_RECEIVE*.
    /// </summary>
    private async Task UpdateReservedOrderedQty(StockDoc d)
    {
        // Ảnh hưởng khi hoàn tất xuất kho (SO) → giảm reserved_qty
        if (d.DocType == "ISSUE" && d.SalesOrderId.HasValue)
        {
            // Recalc reserved_qty cho các product đã xuất
            var soProducts = d.Lines.Select(l => l.ProductId).Distinct().ToList();
            var activeSoLines = await db.SalesOrderLines
                .Where(l => soProducts.Contains(l.ProductId) && !l.IsGift)
                .Join(db.SalesOrders.Where(s => s.Status == "APPROVED" || s.Status == "NOT_DELIVERED"),
                    l => l.OrderId, s => s.Id, (l, s) => new { l.ProductId, l.Quantity })
                .GroupBy(x => x.ProductId)
                .Select(g => new { ProductId = g.Key, TotalOrdered = g.Sum(x => x.Quantity) })
                .ToDictionaryAsync(x => x.ProductId, x => x.TotalOrdered);

            // Already issued
            var issuedByProduct = await db.StockDocs
                .Where(x => x.DocType == "ISSUE" && x.Status == "COMPLETED"
                    && x.SalesOrderId.HasValue && db.SalesOrders.Any(s => s.Id == x.SalesOrderId && (s.Status == "APPROVED" || s.Status == "NOT_DELIVERED")))
                .SelectMany(x => x.Lines)
                .GroupBy(l => l.ProductId)
                .Select(g => new { ProductId = g.Key, TotalIssued = g.Sum(l => l.ActualQty ?? 0) })
                .ToDictionaryAsync(x => x.ProductId, x => x.TotalIssued);

            foreach (var productId in soProducts)
            {
                var ordered = activeSoLines.GetValueOrDefault(productId);
                var issued = issuedByProduct.GetValueOrDefault(productId);
                var reserved = Math.Max(0, ordered - issued);

                // Update all bins for this product in the from-warehouse
                var bins = await db.StockBalances
                    .Where(b => b.ProductId == productId && b.WarehouseId == d.FromWarehouseId!.Value)
                    .ToListAsync();
                foreach (var bin in bins) bin.ReservedQty = reserved;
            }
        }

        // Ảnh hưởng khi hoàn tất nhập kho (PO) → giảm ordered_qty
        if (d.DocType == "RECEIPT" && d.PurchaseOrderId.HasValue)
        {
            var poProducts = d.Lines.Select(l => l.ProductId).Distinct().ToList();
            var activePoLines = await db.PurchaseOrderLines
                .Where(l => poProducts.Contains(l.ProductId))
                .Join(db.PurchaseOrders.Where(p => p.Status == "APPROVED" || p.Status == "NOT_RECEIVED" || p.Status == "TO_RECEIVE_AND_BILL" || p.Status == "TO_RECEIVE"),
                    l => l.OrderId, p => p.Id, (l, p) => new { l.ProductId, l.Quantity })
                .GroupBy(x => x.ProductId)
                .Select(g => new { ProductId = g.Key, TotalOrdered = g.Sum(x => x.Quantity) })
                .ToDictionaryAsync(x => x.ProductId, x => x.TotalOrdered);

            var receivedByProduct = await db.StockDocs
                .Where(x => x.DocType == "RECEIPT" && x.Status == "COMPLETED"
                    && x.PurchaseOrderId.HasValue && db.PurchaseOrders.Any(p => p.Id == x.PurchaseOrderId && (p.Status == "APPROVED" || p.Status == "NOT_RECEIVED" || p.Status == "TO_RECEIVE_AND_BILL" || p.Status == "TO_RECEIVE")))
                .SelectMany(x => x.Lines)
                .GroupBy(l => l.ProductId)
                .Select(g => new { ProductId = g.Key, TotalReceived = g.Sum(l => l.ActualQty ?? 0) })
                .ToDictionaryAsync(x => x.ProductId, x => x.TotalReceived);

            foreach (var productId in poProducts)
            {
                var ordered = activePoLines.GetValueOrDefault(productId);
                var received = receivedByProduct.GetValueOrDefault(productId);
                var stillOrdered = Math.Max(0, ordered - received);

                var bins = await db.StockBalances
                    .Where(b => b.ProductId == productId && b.WarehouseId == d.ToWarehouseId!.Value)
                    .ToListAsync();
                foreach (var bin in bins) bin.OrderedQty = stillOrdered;
            }
        }
    }

    /// <summary>Sau khi hoàn tất chứng từ: SO NOT_DELIVERED→DELIVERED khi xuất đủ, PO NOT_RECEIVED→RECEIVED khi nhập đủ.</summary>
    private async Task UpdateOrderStatuses(StockDoc d)
    {
        if (d.DocType == "ISSUE" && d.SalesOrderId.HasValue)
        {
            var so = await db.SalesOrders.Include(x => x.Lines).FirstOrDefaultAsync(x => x.Id == d.SalesOrderId.Value);
            if (so is null || so.Status != "NOT_DELIVERED") return;

            var issuedQty = await db.StockDocs
                .Where(x => x.SalesOrderId == so.Id && x.DocType == "ISSUE" && x.Status == "COMPLETED")
                .SelectMany(x => x.Lines)
                .GroupBy(l => l.ProductId)
                .Select(g => new { ProductId = g.Key, Qty = g.Sum(l => l.ActualQty ?? 0) })
                .ToListAsync();

            var fullyDelivered = so.Lines.Where(l => !l.IsGift)
                .All(l => issuedQty.FirstOrDefault(x => x.ProductId == l.ProductId)?.Qty >= l.Quantity);

            if (fullyDelivered)
            {
                db.WfTransitionLogs.Add(new WfTransitionLog
                {
                    RefTable = "sales-orders", RefId = so.Id,
                    FromStatus = so.Status, ToStatus = "DELIVERED",
                    Reason = $"Xuất kho đủ theo phiếu {d.DocNo}",
                    ActedBy = RbacService.GetUserId(User),
                });
                so.Status = "DELIVERED";
            }
        }
        else if (d.DocType == "RECEIPT" && d.PurchaseOrderId.HasValue)
        {
            var po = await db.PurchaseOrders.Include(x => x.Lines).FirstOrDefaultAsync(x => x.Id == d.PurchaseOrderId.Value);
            if (po is null) return;
            if (po.Status is not ("NOT_RECEIVED" or "TO_RECEIVE_AND_BILL" or "TO_RECEIVE")) return;

            var receivedByProduct = await db.StockDocs
                .Where(x => x.PurchaseOrderId == po.Id && x.DocType == "RECEIPT" && x.Status == "COMPLETED")
                .SelectMany(x => x.Lines)
                .GroupBy(l => l.ProductId)
                .Select(g => new { ProductId = g.Key, Qty = g.Sum(l => l.ActualQty ?? 0) })
                .ToListAsync();

            foreach (var poLine in po.Lines)
            {
                var received = receivedByProduct.FirstOrDefault(x => x.ProductId == poLine.ProductId);
                poLine.ReceivedQty = received?.Qty ?? 0;
            }

            var fullyReceived = po.Lines
                .All(l => receivedByProduct.FirstOrDefault(x => x.ProductId == l.ProductId)?.Qty >= l.Quantity);

            if (fullyReceived)
            {
                db.WfTransitionLogs.Add(new WfTransitionLog
                {
                    RefTable = "purchase-orders", RefId = po.Id,
                    FromStatus = po.Status, ToStatus = "RECEIVED",
                    Reason = $"Nhập kho đủ theo phiếu {d.DocNo}",
                    ActedBy = RbacService.GetUserId(User),
                });
                po.Status = "RECEIVED";
            }
        }
    }

    /// <summary>Tạo phiếu xuất gia công từ phiếu nhập đã hoàn tất.</summary>
    private async Task<IActionResult> CreateOutsourcingIssue(StockDoc receipt, WfActionRequest? body)
    {
        if (await Denied("CREATE")) return Forbidden("CREATE");
        if (receipt.DocType != "RECEIPT" || receipt.Status != "COMPLETED")
            return Conflict(new ApiError("VALIDATION", "Chỉ áp dụng cho phiếu nhập đã hoàn tất"));

        var req = System.Text.Json.JsonSerializer.Deserialize<CreateOutsourcingIssueRequest>(
            body?.Reason ?? "{}", new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        if (req is null || req.ProcessId == 0 || req.PartnerId == 0 || req.FromWarehouseId == 0)
            return BadRequest(new ApiError("VALIDATION", "Cần processId, partnerId, fromWarehouseId"));

        var exists = await db.StockDocs.AnyAsync(x =>
            x.CounterpartDocId == receipt.Id && x.SubType == "OUTSOURCING");
        if (exists)
            return Conflict(new ApiError("DUPLICATE", "Đã tạo phiếu xuất gia công cho phiếu nhập này"));

        var issue = new StockDoc
        {
            DocNo = await numbering.NextAsync("STOCK_ISSUE"),
            DocType = "ISSUE",
            SubType = "OUTSOURCING",
            Purpose = "SEND_TO_SUBCONTRACTOR",
            RequestDate = DateOnly.FromDateTime(DateTime.Today),
            PurchaseOrderId = receipt.PurchaseOrderId,
            PartnerId = req.PartnerId,
            FromWarehouseId = req.FromWarehouseId,
            OrgUnit = "BO_PHAN_GIA_CONG",
            ProcessId = req.ProcessId,
            CounterpartDocId = receipt.Id,
            Note = req.Note ?? $"Xuất gia công từ phiếu nhập {receipt.DocNo}",
            CreatedBy = RbacService.GetUserId(User),
            Lines = receipt.Lines.Select(l => new StockDocLine
            {
                ProductId = l.ProductId, RequestedQty = l.ActualQty ?? l.RequestedQty,
            }).ToList(),
        };
        db.StockDocs.Add(issue);
        await db.SaveChangesAsync();
        return StatusCode(201, InventoryMapper.ToDto(issue));
    }

    /// <summary>Tạo phiếu nhập thành phẩm từ phiếu xuất gia công đã hoàn tất.</summary>
    private async Task<IActionResult> CreateFinishedReceipt(StockDoc issue, WfActionRequest? body)
    {
        if (await Denied("CREATE")) return Forbidden("CREATE");
        if (issue.DocType != "ISSUE" || issue.SubType != "OUTSOURCING" || issue.Status != "COMPLETED")
            return Conflict(new ApiError("VALIDATION", "Chỉ áp dụng cho phiếu xuất gia công đã hoàn tất"));

        var req = System.Text.Json.JsonSerializer.Deserialize<CreateFinishedReceiptRequest>(
            body?.Reason ?? "{}", new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        if (req is null || req.ProcessId == 0 || req.ToWarehouseId == 0)
            return BadRequest(new ApiError("VALIDATION", "Cần processId, toWarehouseId"));

        if (req.ProcessId != issue.ProcessId)
            return Conflict(new ApiError("PROCESS_MISMATCH",
                $"Quy trình ({req.ProcessId}) không khớp phiếu xuất ({issue.ProcessId})"));

        var exists = await db.StockDocs.AnyAsync(x =>
            x.CounterpartDocId == issue.Id && x.SubType == "FINISHED_GOODS");
        if (exists)
            return Conflict(new ApiError("DUPLICATE", "Đã tạo phiếu nhập thành phẩm cho phiếu xuất này"));

        var receipt = new StockDoc
        {
            DocNo = await numbering.NextAsync("STOCK_RECEIPT"),
            DocType = "RECEIPT",
            SubType = "FINISHED_GOODS",
            Purpose = "RECEIVE_FROM_SUBCONTRACTOR",
            RequestDate = DateOnly.FromDateTime(DateTime.Today),
            PurchaseOrderId = issue.PurchaseOrderId,
            PartnerId = issue.PartnerId,
            ToWarehouseId = req.ToWarehouseId,
            OrgUnit = "BO_PHAN_GIA_CONG",
            ProcessId = req.ProcessId,
            CounterpartDocId = issue.Id,
            Note = req.Note ?? $"Nhập thành phẩm từ phiếu xuất gia công {issue.DocNo}",
            CreatedBy = RbacService.GetUserId(User),
            Lines = issue.Lines.Select(l => new StockDocLine
            {
                ProductId = l.ProductId, RequestedQty = l.ActualQty ?? l.RequestedQty,
            }).ToList(),
        };
        db.StockDocs.Add(receipt);
        await db.SaveChangesAsync();
        return StatusCode(201, InventoryMapper.ToDto(receipt));
    }

    // ----- Stock balance (Bin) -----
    [HttpGet("stock-balance")]
    public async Task<IActionResult> GetStockBalance(
        [FromQuery] long? warehouseId, [FromQuery] long? productId, [FromQuery] long? lotId)
    {
        if (await Denied("VIEW")) return Forbidden("VIEW");
        var q = db.StockBalances.AsNoTracking().AsQueryable();
        if (warehouseId.HasValue) q = q.Where(x => x.WarehouseId == warehouseId);
        if (productId.HasValue) q = q.Where(x => x.ProductId == productId);
        if (lotId.HasValue) q = q.Where(x => x.LotId == lotId);
        var items = await q.OrderBy(x => x.ProductId).ThenBy(x => x.WarehouseId).ToListAsync();
        return Ok(items.Select(b => new StockBalanceOut(
            b.Id, b.ProductId, b.WarehouseId, b.LotId,
            b.QtyOnHand, b.ReservedQty, b.OrderedQty, b.ProjectedQty, b.UpdatedAt)).ToList());
    }

    // ----- Stock moves (SLE) -----
    [HttpGet("stock-moves")]
    public async Task<IActionResult> GetStockMoves(
        [FromQuery] long? productId, [FromQuery] long? warehouseId,
        [FromQuery] DateOnly? dateFrom, [FromQuery] DateOnly? dateTo,
        [FromQuery] int page = 1, [FromQuery] int size = 50)
    {
        if (await Denied("VIEW")) return Forbidden("VIEW");
        var q = db.StockMoves.AsNoTracking().AsQueryable();
        if (productId.HasValue) q = q.Where(x => x.ProductId == productId);
        if (warehouseId.HasValue) q = q.Where(x => x.WarehouseId == warehouseId);
        if (dateFrom.HasValue) q = q.Where(x => x.MoveDate >= dateFrom);
        if (dateTo.HasValue) q = q.Where(x => x.MoveDate <= dateTo);
        var total = await q.LongCountAsync();
        var items = await q.OrderByDescending(x => x.Id)
            .Skip((Math.Max(1, page) - 1) * size).Take(Math.Clamp(size, 1, 200)).ToListAsync();

        // Get doc info for DocNo/DocType
        var docIds = items.Select(m => m.DocId).Distinct().ToList();
        var docs = await db.StockDocs.AsNoTracking()
            .Where(d => docIds.Contains(d.Id))
            .ToDictionaryAsync(d => d.Id, d => new { d.DocNo, d.DocType });

        return Ok(new PageResult<StockMoveOut>(items.Select(m => {
            docs.TryGetValue(m.DocId, out var doc);
            return new StockMoveOut(
                m.Id, m.MoveDate, m.DocId, m.DocLineId, m.ProductId, m.WarehouseId,
                m.LotId, m.LocationId, m.Qty, m.UnitCost, m.CreatedAt,
                m.QtyAfterTransaction, m.ValuationRate, m.StockValue, m.StockValueDifference,
                m.PostingDatetime,
                doc?.DocNo, doc?.DocType);
        }).ToList(), total, page, size));
    }

    // ----- Repost valuation -----
    [HttpPost("repost-valuation")]
    public async Task<IActionResult> RepostValuation(
        [FromQuery] long productId, [FromQuery] long warehouseId)
    {
        if (await Denied("UPDATE")) return Forbidden("UPDATE");
        await valuation.RepostValuation(productId, warehouseId);
        return Ok(new { message = $"Đã tính lại định giá cho sản phẩm {productId}, kho {warehouseId}" });
    }

    // ----- Stock Reconciliation -----
    [HttpGet("reconciliations")]
    public async Task<IActionResult> ListReconciliations(
        [FromQuery] string? status, [FromQuery] int page = 1, [FromQuery] int size = 50)
    {
        if (await Denied("VIEW")) return Forbidden("VIEW");
        var q = db.StockReconciliations.Include(x => x.Lines).AsNoTracking().AsQueryable();
        if (!string.IsNullOrEmpty(status)) q = q.Where(x => x.Status == status);
        var total = await q.LongCountAsync();
        var items = await q.OrderByDescending(x => x.Id)
            .Skip((Math.Max(1, page) - 1) * size).Take(Math.Clamp(size, 1, 200)).ToListAsync();
        return Ok(new PageResult<StockReconciliationOut>(
            items.Select(r => new StockReconciliationOut(
                r.Id, r.DocNo, r.WarehouseId, r.ReconciliationDate,
                r.Status, r.Note, r.CreatedBy, r.CreatedAt, r.PostedBy, r.PostedAt,
                r.Lines.Select(l => new StockReconciliationLineOut(
                    l.Id, l.ProductId, l.LotId, l.SystemQty, l.ActualQty, l.Difference)).ToList()
            )).ToList(), total, page, size));
    }

    [HttpGet("reconciliations/{id:long}")]
    public async Task<IActionResult> GetReconciliation(long id)
    {
        if (await Denied("VIEW")) return Forbidden("VIEW");
        var r = await db.StockReconciliations.Include(x => x.Lines).FirstOrDefaultAsync(x => x.Id == id);
        if (r is null) return NotFound(new ApiError("NOT_FOUND", $"Phiếu kiểm kê {id} không tồn tại"));
        return Ok(new StockReconciliationOut(
            r.Id, r.DocNo, r.WarehouseId, r.ReconciliationDate,
            r.Status, r.Note, r.CreatedBy, r.CreatedAt, r.PostedBy, r.PostedAt,
            r.Lines.Select(l => new StockReconciliationLineOut(
                l.Id, l.ProductId, l.LotId, l.SystemQty, l.ActualQty, l.Difference)).ToList()
        ));
    }

    [HttpPost("reconciliations")]
    public async Task<IActionResult> CreateReconciliation([FromBody] StockReconciliationCreate body)
    {
        if (await Denied("CREATE")) return Forbidden("CREATE");
        var r = new StockReconciliation
        {
            DocNo = await numbering.NextAsync("STOCK_RECONCILIATION"),
            WarehouseId = body.WarehouseId,
            ReconciliationDate = body.ReconciliationDate,
            Note = body.Note,
            CreatedBy = RbacService.GetUserId(User),
            Lines = (body.Lines ?? new()).Select(l => new StockReconciliationLine
            {
                ProductId = l.ProductId, LotId = l.LotId, ActualQty = l.ActualQty,
            }).ToList(),
        };
        db.StockReconciliations.Add(r);
        await db.SaveChangesAsync();
        return StatusCode(201, new StockReconciliationOut(
            r.Id, r.DocNo, r.WarehouseId, r.ReconciliationDate,
            r.Status, r.Note, r.CreatedBy, r.CreatedAt, r.PostedBy, r.PostedAt,
            r.Lines.Select(l => new StockReconciliationLineOut(
                l.Id, l.ProductId, l.LotId, l.SystemQty, l.ActualQty, l.Difference)).ToList()
        ));
    }

    /// <summary>Snapshot tồn hiện tại vào system_qty + tính difference.</summary>
    [HttpPost("reconciliations/{id:long}/snapshot")]
    public async Task<IActionResult> SnapshotReconciliation(long id)
    {
        if (await Denied("UPDATE")) return Forbidden("UPDATE");
        var r = await db.StockReconciliations.Include(x => x.Lines).FirstOrDefaultAsync(x => x.Id == id);
        if (r is null) return NotFound(new ApiError("NOT_FOUND", $"Phiếu kiểm kê {id} không tồn tại"));
        if (r.Status != "DRAFT")
            return Conflict(new ApiError("WF_LOCKED", $"Trạng thái {r.Status}, không thể snapshot"));

        foreach (var l in r.Lines)
        {
            var bal = await db.StockBalances.FirstOrDefaultAsync(b =>
                b.ProductId == l.ProductId && b.WarehouseId == r.WarehouseId && b.LotId == l.LotId);
            l.SystemQty = bal?.QtyOnHand ?? 0;
            l.Difference = l.ActualQty - l.SystemQty;
        }
        await db.SaveChangesAsync();
        return Ok(new StockReconciliationOut(
            r.Id, r.DocNo, r.WarehouseId, r.ReconciliationDate,
            r.Status, r.Note, r.CreatedBy, r.CreatedAt, r.PostedBy, r.PostedAt,
            r.Lines.Select(l => new StockReconciliationLineOut(
                l.Id, l.ProductId, l.LotId, l.SystemQty, l.ActualQty, l.Difference)).ToList()
        ));
    }

    /// <summary>Workflow actions cho reconciliation: approve, post.</summary>
    [HttpPost("reconciliations/{id:long}/actions/{actionName}")]
    public async Task<IActionResult> ReconciliationAction(long id, string actionName, [FromBody] WfActionRequest? body)
    {
        var r = await db.StockReconciliations.Include(x => x.Lines).FirstOrDefaultAsync(x => x.Id == id);
        if (r is null) return NotFound(new ApiError("NOT_FOUND", $"Phiếu kiểm kê {id} không tồn tại"));

        return actionName switch
        {
            "approve" => await ApproveReconciliation(r),
            "post" => await PostReconciliation(r),
            _ => BadRequest(new ApiError("VALIDATION", $"Hành động không hợp lệ: {actionName}")),
        };
    }

    private async Task<IActionResult> ApproveReconciliation(StockReconciliation r)
    {
        if (await Denied("UPDATE")) return Forbidden("UPDATE");
        if (r.Status != "DRAFT")
            return Conflict(new ApiError("WF_LOCKED", $"Trạng thái {r.Status}, không thể duyệt"));
        r.Status = "APPROVED";
        await db.SaveChangesAsync();
        return Ok(new StockReconciliationOut(
            r.Id, r.DocNo, r.WarehouseId, r.ReconciliationDate,
            r.Status, r.Note, r.CreatedBy, r.CreatedAt, r.PostedBy, r.PostedAt,
            r.Lines.Select(l => new StockReconciliationLineOut(
                l.Id, l.ProductId, l.LotId, l.SystemQty, l.ActualQty, l.Difference)).ToList()
        ));
    }

    /// <summary>POSTED: sinh stock_move điều chỉnh (+/- difference), cập nhật stock_balance.</summary>
    private async Task<IActionResult> PostReconciliation(StockReconciliation r)
    {
        if (await Denied("UPDATE")) return Forbidden("UPDATE");
        if (r.Status != "APPROVED")
            return Conflict(new ApiError("WF_LOCKED", $"Trạng thái {r.Status}, phải duyệt trước"));

        await using var tx = await db.Database.BeginTransactionAsync();

        var today = DateOnly.FromDateTime(DateTime.Today);
        foreach (var l in r.Lines)
        {
            if (l.Difference == 0) continue;

            // Sinh stock_move điều chỉnh
            var incomingRate = l.Difference > 0 ? (decimal?)0 : null; // điều chỉnh tăng thì dùng rate 0 (hoặc lấy rate hiện tại)
            var (valuationRate, stockValueDiff, qtyAfter, stockValue) =
                await valuation.CalcMovingAverage(l.ProductId, r.WarehouseId, l.Difference, incomingRate);

            db.StockMoves.Add(new StockMove
            {
                MoveDate = today, DocId = 0, DocLineId = 0, // reconciliation moves không gắn doc
                ProductId = l.ProductId, WarehouseId = r.WarehouseId, LotId = l.LotId,
                Qty = l.Difference, UnitCost = 0,
                QtyAfterTransaction = qtyAfter,
                ValuationRate = valuationRate,
                StockValue = stockValue,
                StockValueDifference = stockValueDiff,
                PostingDatetime = DateTimeOffset.UtcNow,
            });

            // Cập nhật stock_balance
            var bal = await db.StockBalances.FirstOrDefaultAsync(b =>
                b.ProductId == l.ProductId && b.WarehouseId == r.WarehouseId && b.LotId == l.LotId);
            if (bal is null)
            {
                bal = new StockBalance
                {
                    ProductId = l.ProductId, WarehouseId = r.WarehouseId, LotId = l.LotId,
                    QtyOnHand = l.Difference
                };
                db.StockBalances.Add(bal);
            }
            else
            {
                bal.QtyOnHand += l.Difference;
                bal.UpdatedAt = DateTimeOffset.UtcNow;
            }
        }

        r.Status = "POSTED";
        r.PostedBy = RbacService.GetUserId(User);
        r.PostedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync();
        await tx.CommitAsync();

        return Ok(new StockReconciliationOut(
            r.Id, r.DocNo, r.WarehouseId, r.ReconciliationDate,
            r.Status, r.Note, r.CreatedBy, r.CreatedAt, r.PostedBy, r.PostedAt,
            r.Lines.Select(l => new StockReconciliationLineOut(
                l.Id, l.ProductId, l.LotId, l.SystemQty, l.ActualQty, l.Difference)).ToList()
        ));
    }
}