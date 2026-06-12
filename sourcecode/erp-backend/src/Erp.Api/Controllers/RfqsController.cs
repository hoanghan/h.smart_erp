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
[Route("api/v1/purchasing/rfqs")]
public class RfqsController(
    ErpDbContext db, RbacService rbac, WorkflowService wf, DocNumberingService numbering)
    : ControllerBase
{
    private const string Resource = "rfqs";

    private static RfqOut ToDto(Rfq r) => new(
        r.Id, r.DocNo, r.DocDate, r.RequestId,
        r.Status, r.Note, r.CreatorId,
        r.Lines.Select(l => new RfqLineOut(l.Id, l.ProductId, l.Quantity, l.Note)).ToList(),
        r.Suppliers.Select(s => new RfqSupplierOut(s.Id, s.PartnerId, s.Note)).ToList());

    private async Task<bool> Denied(string action) =>
        !await rbac.HasPermissionAsync(User, "DOCUMENT", Resource, action);

    private ObjectResult Forbidden(string action) =>
        StatusCode(403, new ApiError("WF_NO_PERMISSION", $"Thiếu quyền {action} trên DOCUMENT:{Resource}"));

    [HttpGet]
    public async Task<IActionResult> List(
        [FromQuery] string? status, [FromQuery] int page = 1, [FromQuery] int size = 50)
    {
        if (await Denied("VIEW")) return Forbidden("VIEW");
        var q = db.Rfqs.Include(x => x.Lines).Include(x => x.Suppliers).AsNoTracking().AsQueryable();
        if (!string.IsNullOrEmpty(status)) q = q.Where(x => x.Status == status);
        var total = await q.LongCountAsync();
        var items = await q.OrderByDescending(x => x.Id)
            .Skip((Math.Max(1, page) - 1) * size).Take(Math.Clamp(size, 1, 200)).ToListAsync();
        return Ok(new PageResult<RfqOut>(items.Select(ToDto).ToList(), total, page, size));
    }

    [HttpGet("{id:long}")]
    public async Task<IActionResult> Get(long id)
    {
        if (await Denied("VIEW")) return Forbidden("VIEW");
        var r = await db.Rfqs.Include(x => x.Lines).Include(x => x.Suppliers)
            .FirstOrDefaultAsync(x => x.Id == id);
        return r is null
            ? NotFound(new ApiError("NOT_FOUND", $"RFQ {id} không tồn tại"))
            : Ok(ToDto(r));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] RfqCreate body)
    {
        if (await Denied("CREATE")) return Forbidden("CREATE");
        var r = new Rfq
        {
            DocNo = await numbering.NextAsync("RFQ"),
            DocDate = DateOnly.FromDateTime(DateTime.Today),
            RequestId = body.RequestId,
            Note = body.Note,
            CreatorId = RbacService.GetUserId(User),
            Lines = (body.Lines ?? new()).Select(l => new RfqLine
            {
                ProductId = l.ProductId, Quantity = l.Quantity, Note = l.Note,
            }).ToList(),
            Suppliers = (body.Suppliers ?? new()).Select(s => new RfqSupplier
            {
                PartnerId = s.PartnerId, Note = s.Note,
            }).ToList(),
        };
        db.Rfqs.Add(r);
        await db.SaveChangesAsync();
        return StatusCode(201, ToDto(r));
    }

    [HttpPut("{id:long}")]
    public async Task<IActionResult> Update(long id, [FromBody] RfqUpdate body)
    {
        if (await Denied("UPDATE")) return Forbidden("UPDATE");
        var r = await db.Rfqs.FirstOrDefaultAsync(x => x.Id == id);
        if (r is null) return NotFound(new ApiError("NOT_FOUND", $"RFQ {id} không tồn tại"));
        if (r.Status != "DRAFT")
            return Conflict(new ApiError("WF_LOCKED", $"Trạng thái {r.Status}, không sửa được"));
        Mapper.Apply(body, r, skipNulls: true);
        await db.SaveChangesAsync();
        return Ok(ToDto(r));
    }

    // ----- Lines -----
    [HttpPost("{id:long}/lines")]
    public async Task<IActionResult> AddLine(long id, [FromBody] RfqLineIn body)
    {
        if (await Denied("UPDATE")) return Forbidden("UPDATE");
        var r = await db.Rfqs.FirstOrDefaultAsync(x => x.Id == id);
        if (r is null) return NotFound(new ApiError("NOT_FOUND", $"RFQ {id} không tồn tại"));
        if (r.Status != "DRAFT")
            return Conflict(new ApiError("WF_LOCKED", $"Trạng thái {r.Status}, không sửa được"));
        var line = new RfqLine { RfqId = id, ProductId = body.ProductId, Quantity = body.Quantity, Note = body.Note };
        db.RfqLines.Add(line);
        await db.SaveChangesAsync();
        return StatusCode(201, new RfqLineOut(line.Id, line.ProductId, line.Quantity, line.Note));
    }

    [HttpDelete("{id:long}/lines/{lineId:long}")]
    public async Task<IActionResult> DeleteLine(long id, long lineId)
    {
        if (await Denied("UPDATE")) return Forbidden("UPDATE");
        var line = await db.RfqLines.FirstOrDefaultAsync(x => x.Id == lineId && x.RfqId == id);
        if (line is null) return NotFound(new ApiError("NOT_FOUND", "Dòng không tồn tại"));
        db.RfqLines.Remove(line);
        await db.SaveChangesAsync();
        return NoContent();
    }

    // ----- Suppliers -----
    [HttpPost("{id:long}/suppliers")]
    public async Task<IActionResult> AddSupplier(long id, [FromBody] RfqSupplierIn body)
    {
        if (await Denied("UPDATE")) return Forbidden("UPDATE");
        var r = await db.Rfqs.FirstOrDefaultAsync(x => x.Id == id);
        if (r is null) return NotFound(new ApiError("NOT_FOUND", $"RFQ {id} không tồn tại"));
        if (r.Status != "DRAFT")
            return Conflict(new ApiError("WF_LOCKED", $"Trạng thái {r.Status}, không sửa được"));
        var s = new RfqSupplier { RfqId = id, PartnerId = body.PartnerId, Note = body.Note };
        db.RfqSuppliers.Add(s);
        await db.SaveChangesAsync();
        return StatusCode(201, new RfqSupplierOut(s.Id, s.PartnerId, s.Note));
    }

    [HttpDelete("{id:long}/suppliers/{supplierId:long}")]
    public async Task<IActionResult> DeleteSupplier(long id, long supplierId)
    {
        if (await Denied("UPDATE")) return Forbidden("UPDATE");
        var s = await db.RfqSuppliers.FirstOrDefaultAsync(x => x.Id == supplierId && x.RfqId == id);
        if (s is null) return NotFound(new ApiError("NOT_FOUND", "NCC không tồn tại"));
        db.RfqSuppliers.Remove(s);
        await db.SaveChangesAsync();
        return NoContent();
    }

    // ----- Workflow actions -----
    [HttpPost("{id:long}/actions/{actionName}")]
    public async Task<IActionResult> Action(long id, string actionName, [FromBody] WfActionRequest? body)
    {
        var r = await db.Rfqs.FirstOrDefaultAsync(x => x.Id == id);
        if (r is null) return NotFound(new ApiError("NOT_FOUND", $"RFQ {id} không tồn tại"));
        try
        {
            r.Status = await wf.TransitionAsync(User, Resource, id, r.Status, actionName, body?.Reason);
        }
        catch (WorkflowException e)
        {
            return e.Code == "WF_NO_PERMISSION"
                ? StatusCode(403, new ApiError(e.Code, e.Message))
                : Conflict(new ApiError(e.Code, e.Message));
        }
        if (body?.Reason is not null) r.Note = body.Reason;
        await db.SaveChangesAsync();
        return Ok(ToDto(r));
    }
}

[ApiController]
[Authorize]
[Route("api/v1/purchasing/supplier-quotations")]
public class SupplierQuotationsController(
    ErpDbContext db, RbacService rbac, WorkflowService wf, DocNumberingService numbering)
    : ControllerBase
{
    private const string Resource = "supplier-quotations";

    private static SupplierQuotationOut ToDto(SupplierQuotation q) => new(
        q.Id, q.DocNo, q.DocDate, q.RfqId, q.PartnerId,
        q.ValidUntil, q.LeadTimeDays, q.Note, q.Status, q.CreatorId,
        q.Lines.Select(l => new SupplierQuotationLineOut(
            l.Id, l.ProductId, l.Quantity, l.UnitPrice, l.LeadTimeDays, l.Note)).ToList());

    private async Task<bool> Denied(string action) =>
        !await rbac.HasPermissionAsync(User, "DOCUMENT", Resource, action);

    private ObjectResult Forbidden(string action) =>
        StatusCode(403, new ApiError("WF_NO_PERMISSION", $"Thiếu quyền {action} trên DOCUMENT:{Resource}"));

    [HttpGet]
    public async Task<IActionResult> List(
        [FromQuery] string? status, [FromQuery] long? rfqId,
        [FromQuery] int page = 1, [FromQuery] int size = 50)
    {
        if (await Denied("VIEW")) return Forbidden("VIEW");
        var q = db.SupplierQuotations.Include(x => x.Lines).AsNoTracking().AsQueryable();
        if (!string.IsNullOrEmpty(status)) q = q.Where(x => x.Status == status);
        if (rfqId.HasValue) q = q.Where(x => x.RfqId == rfqId);
        var total = await q.LongCountAsync();
        var items = await q.OrderByDescending(x => x.Id)
            .Skip((Math.Max(1, page) - 1) * size).Take(Math.Clamp(size, 1, 200)).ToListAsync();
        return Ok(new PageResult<SupplierQuotationOut>(items.Select(ToDto).ToList(), total, page, size));
    }

    [HttpGet("{id:long}")]
    public async Task<IActionResult> Get(long id)
    {
        if (await Denied("VIEW")) return Forbidden("VIEW");
        var q = await db.SupplierQuotations.Include(x => x.Lines).FirstOrDefaultAsync(x => x.Id == id);
        return q is null
            ? NotFound(new ApiError("NOT_FOUND", $"Báo giá NCC {id} không tồn tại"))
            : Ok(ToDto(q));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] SupplierQuotationCreate body)
    {
        if (await Denied("CREATE")) return Forbidden("CREATE");
        var q = new SupplierQuotation
        {
            DocNo = await numbering.NextAsync("SUPPLIER_QUOTATION"),
            DocDate = DateOnly.FromDateTime(DateTime.Today),
            RfqId = body.RfqId,
            PartnerId = body.PartnerId,
            ValidUntil = body.ValidUntil,
            LeadTimeDays = body.LeadTimeDays,
            Note = body.Note,
            CreatorId = RbacService.GetUserId(User),
            Lines = (body.Lines ?? new()).Select(l => new SupplierQuotationLine
            {
                ProductId = l.ProductId, Quantity = l.Quantity,
                UnitPrice = l.UnitPrice, LeadTimeDays = l.LeadTimeDays, Note = l.Note,
            }).ToList(),
        };
        db.SupplierQuotations.Add(q);
        await db.SaveChangesAsync();
        return StatusCode(201, ToDto(q));
    }

    [HttpPut("{id:long}")]
    public async Task<IActionResult> Update(long id, [FromBody] SupplierQuotationUpdate body)
    {
        if (await Denied("UPDATE")) return Forbidden("UPDATE");
        var q = await db.SupplierQuotations.FirstOrDefaultAsync(x => x.Id == id);
        if (q is null) return NotFound(new ApiError("NOT_FOUND", $"Báo giá NCC {id} không tồn tại"));
        if (q.Status != "DRAFT")
            return Conflict(new ApiError("WF_LOCKED", $"Trạng thái {q.Status}, không sửa được"));
        Mapper.Apply(body, q, skipNulls: true);
        await db.SaveChangesAsync();
        return Ok(ToDto(q));
    }

    // ----- Workflow actions -----
    [HttpPost("{id:long}/actions/{actionName}")]
    public async Task<IActionResult> Action(long id, string actionName, [FromBody] WfActionRequest? body)
    {
        var q = await db.SupplierQuotations.Include(x => x.Lines).FirstOrDefaultAsync(x => x.Id == id);
        if (q is null) return NotFound(new ApiError("NOT_FOUND", $"Báo giá NCC {id} không tồn tại"));
        try
        {
            q.Status = await wf.TransitionAsync(User, Resource, id, q.Status, actionName, body?.Reason);
        }
        catch (WorkflowException e)
        {
            return e.Code == "WF_NO_PERMISSION"
                ? StatusCode(403, new ApiError(e.Code, e.Message))
                : Conflict(new ApiError(e.Code, e.Message));
        }
        if (body?.Reason is not null) q.Note = body.Reason;
        await db.SaveChangesAsync();
        return Ok(ToDto(q));
    }

    // ----- Convert to PO -----
    [HttpPost("{id:long}/actions/convert-to-po")]
    public async Task<IActionResult> ConvertToPo(long id)
    {
        if (await Denied("CREATE")) return Forbidden("CREATE");
        // Also check PO permission
        if (!await rbac.HasPermissionAsync(User, "DOCUMENT", "purchase-orders", "CREATE"))
            return StatusCode(403, new ApiError("WF_NO_PERMISSION", "Thiếu quyền CREATE trên DOCUMENT:purchase-orders"));

        var sq = await db.SupplierQuotations.Include(x => x.Lines).FirstOrDefaultAsync(x => x.Id == id);
        if (sq is null) return NotFound(new ApiError("NOT_FOUND", $"Báo giá NCC {id} không tồn tại"));

        await using var tx = await db.Database.BeginTransactionAsync();
        var po = new PurchaseOrder
        {
            DocNo = await numbering.NextAsync("PURCHASE_ORDER"),
            OrderDate = DateOnly.FromDateTime(DateTime.Today),
            PartnerId = sq.PartnerId,
            Note = $"Từ báo giá NCC #{sq.DocNo}",
            CreatorId = RbacService.GetUserId(User),
            Lines = sq.Lines.Select(l => new PurchaseOrderLine
            {
                ProductId = l.ProductId, Quantity = l.Quantity,
                UnitPrice = l.UnitPrice, VatPct = 10,
            }).ToList(),
        };
        po.TotalAmount = po.Lines.Sum(l => l.Quantity * l.UnitPrice);
        po.TotalVat = po.Lines.Sum(l => l.Quantity * l.UnitPrice * (l.VatPct ?? 0) / 100m);
        db.PurchaseOrders.Add(po);
        await db.SaveChangesAsync();
        await tx.CommitAsync();

        var result = new PurchaseOrderOut(
            po.Id, po.DocNo, po.OrderDate, po.RequestId, po.RfqId, po.PartnerId,
            po.OrderForm, po.ReceiveDatePlan,
            po.PaymentMethodId, po.DeliveryMethodId, po.ReceiveAddress,
            po.VatIncluded, po.TaxTemplateId, po.PaymentTermsTemplateId,
            po.TaxTotal, po.GrandTotal,
            po.Note, po.Status, po.StatusReason,
            po.CreatorId, po.ApproverId, po.ApprovedAt,
            po.TotalAmount, po.TotalVat,
            po.Lines.Select(l => new PurchaseOrderLineOut(
                l.Id, l.ProductId, l.Quantity, l.UnitPrice, l.VatPct,
                l.Amount, l.ReceivedQty, l.BilledQty, l.Note)).ToList());
        return StatusCode(201, result);
    }
}