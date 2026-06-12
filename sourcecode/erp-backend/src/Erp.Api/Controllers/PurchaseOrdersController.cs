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
[Route("api/v1/purchasing/orders")]
public class PurchaseOrdersController(
    ErpDbContext db, RbacService rbac, WorkflowService wf, DocNumberingService numbering)
    : ControllerBase
{
    private const string Resource = "purchase-orders";

    private static PurchaseOrderOut ToDto(PurchaseOrder o) => new(
        o.Id, o.DocNo, o.OrderDate, o.RequestId, o.RfqId, o.PartnerId,
        o.OrderForm, o.ReceiveDatePlan,
        o.PaymentMethodId, o.DeliveryMethodId, o.ReceiveAddress,
        o.VatIncluded, o.TaxTemplateId, o.PaymentTermsTemplateId,
        o.TaxTotal, o.GrandTotal,
        o.Note, o.Status, o.StatusReason,
        o.CreatorId, o.ApproverId, o.ApprovedAt,
        o.TotalAmount, o.TotalVat,
        o.Lines.Select(l => new PurchaseOrderLineOut(
            l.Id, l.ProductId, l.Quantity, l.UnitPrice, l.VatPct,
            l.Amount, l.ReceivedQty, l.BilledQty, l.Note)).ToList());

    private async Task<bool> Denied(string action) =>
        !await rbac.HasPermissionAsync(User, "DOCUMENT", Resource, action);

    private ObjectResult Forbidden(string action) =>
        StatusCode(403, new ApiError("WF_NO_PERMISSION", $"Thiếu quyền {action} trên DOCUMENT:{Resource}"));

    [HttpGet]
    public async Task<IActionResult> List(
        [FromQuery] string? status, [FromQuery] long? partnerId,
        [FromQuery] int page = 1, [FromQuery] int size = 50)
    {
        if (await Denied("VIEW")) return Forbidden("VIEW");
        var q = db.PurchaseOrders.Include(x => x.Lines).AsNoTracking().AsQueryable();
        if (!string.IsNullOrEmpty(status)) q = q.Where(x => x.Status == status);
        if (partnerId.HasValue) q = q.Where(x => x.PartnerId == partnerId);
        var total = await q.LongCountAsync();
        var items = await q.OrderByDescending(x => x.Id)
            .Skip((Math.Max(1, page) - 1) * size).Take(Math.Clamp(size, 1, 200)).ToListAsync();
        return Ok(new PageResult<PurchaseOrderOut>(items.Select(ToDto).ToList(), total, page, size));
    }

    [HttpGet("{id:long}")]
    public async Task<IActionResult> Get(long id)
    {
        if (await Denied("VIEW")) return Forbidden("VIEW");
        var o = await db.PurchaseOrders.Include(x => x.Lines).FirstOrDefaultAsync(x => x.Id == id);
        return o is null
            ? NotFound(new ApiError("NOT_FOUND", $"Đơn mua {id} không tồn tại"))
            : Ok(ToDto(o));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] PurchaseOrderCreate body)
    {
        if (await Denied("CREATE")) return Forbidden("CREATE");

        await using var tx = await db.Database.BeginTransactionAsync();
        var o = new PurchaseOrder
        {
            DocNo = await numbering.NextAsync("PURCHASE_ORDER"),
            OrderDate = DateOnly.FromDateTime(DateTime.Today),
            PartnerId = body.PartnerId,
            OrderForm = body.OrderForm,
            RequestId = body.RequestId,
            RfqId = body.RfqId,
            ReceiveDatePlan = body.ReceiveDatePlan,
            PaymentMethodId = body.PaymentMethodId,
            DeliveryMethodId = body.DeliveryMethodId,
            ReceiveAddress = body.ReceiveAddress,
            VatIncluded = body.VatIncluded,
            TaxTemplateId = body.TaxTemplateId,
            PaymentTermsTemplateId = body.PaymentTermsTemplateId,
            Note = body.Note,
            CreatorId = RbacService.GetUserId(User),
            Lines = (body.Lines ?? new()).Select(l => new PurchaseOrderLine
            {
                ProductId = l.ProductId, Quantity = l.Quantity,
                UnitPrice = l.UnitPrice, VatPct = l.VatPct, Note = l.Note,
            }).ToList(),
        };
        o.TotalAmount = o.Lines.Sum(l => l.Quantity * l.UnitPrice);
        o.TotalVat = o.Lines.Sum(l => l.Quantity * l.UnitPrice * (l.VatPct ?? 0) / 100m);

        db.PurchaseOrders.Add(o);
        await db.SaveChangesAsync();
        await tx.CommitAsync();
        return StatusCode(201, ToDto(o));
    }

    [HttpPut("{id:long}")]
    public async Task<IActionResult> Update(long id, [FromBody] PurchaseOrderUpdate body)
    {
        if (await Denied("UPDATE")) return Forbidden("UPDATE");
        var o = await db.PurchaseOrders.Include(x => x.Lines).FirstOrDefaultAsync(x => x.Id == id);
        if (o is null) return NotFound(new ApiError("NOT_FOUND", $"Đơn mua {id} không tồn tại"));
        if (o.Status != "DRAFT")
            return Conflict(new ApiError("WF_LOCKED", $"Trạng thái {o.Status}, không sửa được"));
        Mapper.Apply(body, o, skipNulls: true);
        await db.SaveChangesAsync();
        return Ok(ToDto(o));
    }

    // ----- Lines -----
    [HttpPost("{id:long}/lines")]
    public async Task<IActionResult> AddLine(long id, [FromBody] PurchaseOrderLineIn body)
    {
        if (await Denied("UPDATE")) return Forbidden("UPDATE");
        var o = await db.PurchaseOrders.FirstOrDefaultAsync(x => x.Id == id);
        if (o is null) return NotFound(new ApiError("NOT_FOUND", $"Đơn mua {id} không tồn tại"));
        if (o.Status != "DRAFT")
            return Conflict(new ApiError("WF_LOCKED", $"Trạng thái {o.Status}, không sửa được"));
        var line = new PurchaseOrderLine
        {
            OrderId = id, ProductId = body.ProductId, Quantity = body.Quantity,
            UnitPrice = body.UnitPrice, VatPct = body.VatPct, Note = body.Note,
        };
        db.PurchaseOrderLines.Add(line);
        await db.SaveChangesAsync();
        return StatusCode(201, new PurchaseOrderLineOut(
            line.Id, line.ProductId, line.Quantity, line.UnitPrice, line.VatPct,
            line.Amount, line.ReceivedQty, line.BilledQty, line.Note));
    }

    [HttpDelete("{id:long}/lines/{lineId:long}")]
    public async Task<IActionResult> DeleteLine(long id, long lineId)
    {
        if (await Denied("UPDATE")) return Forbidden("UPDATE");
        var line = await db.PurchaseOrderLines
            .FirstOrDefaultAsync(x => x.Id == lineId && x.OrderId == id);
        if (line is null) return NotFound(new ApiError("NOT_FOUND", "Dòng không tồn tại"));
        db.PurchaseOrderLines.Remove(line);
        await db.SaveChangesAsync();
        return NoContent();
    }

    // ----- Inventory: tạo phiếu nhập kho từ đơn mua -----
    [HttpPost("{id:long}/actions/create-receipt-request")]
    public async Task<IActionResult> CreateReceiptRequest(long id, [FromBody] CreateStockDocRequest? body)
    {
        var o = await db.PurchaseOrders.Include(x => x.Lines).FirstOrDefaultAsync(x => x.Id == id);
        if (o is null) return NotFound(new ApiError("NOT_FOUND", $"Đơn mua {id} không tồn tại"));
        if (body?.WarehouseId is null)
            return BadRequest(new ApiError("VALIDATION", "Thiếu kho nhập (warehouseId)"));

        string newStatus;
        try
        {
            newStatus = await wf.TransitionAsync(User, Resource, id, o.Status, "create-receipt-request", null);
        }
        catch (WorkflowException e)
        {
            return e.Code == "WF_NO_PERMISSION"
                ? StatusCode(403, new ApiError(e.Code, e.Message))
                : Conflict(new ApiError(e.Code, e.Message));
        }

        await using var tx = await db.Database.BeginTransactionAsync();
        var doc = new StockDoc
        {
            DocNo = await numbering.NextAsync("STOCK_RECEIPT"),
            DocType = "RECEIPT",
            SubType = "PURCHASE",
            RequestDate = body.RequestDate ?? DateOnly.FromDateTime(DateTime.Today),
            PurchaseOrderId = o.Id,
            PartnerId = o.PartnerId,
            ToWarehouseId = body.WarehouseId,
            Note = body.Note,
            CreatedBy = RbacService.GetUserId(User),
        };
        db.StockDocs.Add(doc);
        o.Status = newStatus;
        await db.SaveChangesAsync();
        await tx.CommitAsync();
        return StatusCode(201, InventoryMapper.ToDto(doc));
    }

    // ----- Collect service costs (outsourcing → PO SERVICE) -----
    [HttpPost("{id:long}/collect-service-costs")]
    public async Task<IActionResult> CollectServiceCosts(long id)
    {
        if (await Denied("UPDATE")) return Forbidden("UPDATE");
        var po = await db.PurchaseOrders.Include(x => x.Lines).FirstOrDefaultAsync(x => x.Id == id);
        if (po is null) return NotFound(new ApiError("NOT_FOUND", $"Đơn mua {id} không tồn tại"));
        if (po.OrderForm != "SERVICE")
            return Conflict(new ApiError("VALIDATION", "Chỉ áp dụng cho đơn mua hình thức SERVICE"));

        // Gom outsourcing_cost đã approve, chưa collected, cùng NCC
        var costs = await db.OutsourcingCosts
            .Where(c => c.Approved && c.CollectedPoId == null && c.PayeeId == po.PartnerId)
            .OrderBy(c => c.Id)
            .ToListAsync();

        if (costs.Count == 0)
            return Ok(new { message = "Không có chi phí nào để tập hợp", collected = 0 });

        await using var tx = await db.Database.BeginTransactionAsync();

        foreach (var c in costs)
        {
            var line = new PurchaseOrderLine
            {
                OrderId = po.Id,
                ProductId = c.ProductId ?? 0,
                Quantity = 1,
                UnitPrice = c.Amount,
                VatPct = c.VatPct ?? 0,
                Note = $"Outsourcing cost #{c.Id}",
            };
            db.PurchaseOrderLines.Add(line);
            c.CollectedPoId = po.Id;
        }

        // Recalculate totals
        po.TotalAmount = po.Lines.Sum(l => l.Quantity * l.UnitPrice);
        po.TotalVat = po.Lines.Sum(l => l.Quantity * l.UnitPrice * (l.VatPct ?? 0) / 100m);

        await db.SaveChangesAsync();
        await tx.CommitAsync();

        return Ok(new { message = $"Đã tập hợp {costs.Count} chi phí", collected = costs.Count });
    }

    // ----- Workflow actions -----
    [HttpPost("{id:long}/actions/{actionName}")]
    public async Task<IActionResult> Action(long id, string actionName, [FromBody] WfActionRequest? body)
    {
        var o = await db.PurchaseOrders.Include(x => x.Lines).FirstOrDefaultAsync(x => x.Id == id);
        if (o is null) return NotFound(new ApiError("NOT_FOUND", $"Đơn mua {id} không tồn tại"));

        try
        {
            o.Status = await wf.TransitionAsync(User, Resource, id, o.Status, actionName, body?.Reason);
        }
        catch (WorkflowException e)
        {
            return e.Code == "WF_NO_PERMISSION"
                ? StatusCode(403, new ApiError(e.Code, e.Message))
                : Conflict(new ApiError(e.Code, e.Message));
        }

        if (o.Status == "APPROVED")
        {
            o.ApproverId = RbacService.GetUserId(User);
            o.ApprovedAt = DateTimeOffset.UtcNow;
        }
        if (body?.Reason is not null) o.StatusReason = body.Reason;
        await db.SaveChangesAsync();
        return Ok(ToDto(o));
    }
}