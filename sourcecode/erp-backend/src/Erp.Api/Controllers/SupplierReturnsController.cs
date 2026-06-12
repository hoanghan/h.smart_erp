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
[Route("api/v1/purchasing/supplier-returns")]
public class SupplierReturnsController(
    ErpDbContext db, RbacService rbac, WorkflowService wf, DocNumberingService numbering)
    : ControllerBase
{
    private const string Resource = "supplier-returns";

    private static SupplierReturnOut ToDto(SupplierReturn r) => new(
        r.Id, r.DocNo, r.DocDate, r.OrderId, r.PartnerId,
        r.Note, r.Status, r.CreatorId,
        r.Lines.Select(l => new SupplierReturnLineOut(
            l.Id, l.ProductId, l.Quantity, l.UnitPrice, l.Note)).ToList());

    private async Task<bool> Denied(string action) =>
        !await rbac.HasPermissionAsync(User, "DOCUMENT", Resource, action);

    private ObjectResult Forbidden(string action) =>
        StatusCode(403, new ApiError("WF_NO_PERMISSION", $"Thiếu quyền {action} trên DOCUMENT:{Resource}"));

    [HttpGet]
    public async Task<IActionResult> List(
        [FromQuery] string? status, [FromQuery] int page = 1, [FromQuery] int size = 50)
    {
        if (await Denied("VIEW")) return Forbidden("VIEW");
        var q = db.SupplierReturns.Include(x => x.Lines).AsNoTracking().AsQueryable();
        if (!string.IsNullOrEmpty(status)) q = q.Where(x => x.Status == status);
        var total = await q.LongCountAsync();
        var items = await q.OrderByDescending(x => x.Id)
            .Skip((Math.Max(1, page) - 1) * size).Take(Math.Clamp(size, 1, 200)).ToListAsync();
        return Ok(new PageResult<SupplierReturnOut>(items.Select(ToDto).ToList(), total, page, size));
    }

    [HttpGet("{id:long}")]
    public async Task<IActionResult> Get(long id)
    {
        if (await Denied("VIEW")) return Forbidden("VIEW");
        var r = await db.SupplierReturns.Include(x => x.Lines).FirstOrDefaultAsync(x => x.Id == id);
        return r is null
            ? NotFound(new ApiError("NOT_FOUND", $"Phiếu trả hàng NCC {id} không tồn tại"))
            : Ok(ToDto(r));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] SupplierReturnCreate body)
    {
        if (await Denied("CREATE")) return Forbidden("CREATE");

        await using var tx = await db.Database.BeginTransactionAsync();
        var r = new SupplierReturn
        {
            DocNo = await numbering.NextAsync("SUPPLIER_RETURN"),
            DocDate = DateOnly.FromDateTime(DateTime.Today),
            OrderId = body.OrderId,
            PartnerId = body.PartnerId,
            Note = body.Note,
            CreatorId = RbacService.GetUserId(User),
            Lines = (body.Lines ?? new()).Select(l => new SupplierReturnLine
            {
                ProductId = l.ProductId, Quantity = l.Quantity,
                UnitPrice = l.UnitPrice, Note = l.Note,
            }).ToList(),
        };
        db.SupplierReturns.Add(r);
        await db.SaveChangesAsync();
        await tx.CommitAsync();
        return StatusCode(201, ToDto(r));
    }

    [HttpPut("{id:long}")]
    public async Task<IActionResult> Update(long id, [FromBody] SupplierReturnUpdate body)
    {
        if (await Denied("UPDATE")) return Forbidden("UPDATE");
        var r = await db.SupplierReturns.Include(x => x.Lines).FirstOrDefaultAsync(x => x.Id == id);
        if (r is null) return NotFound(new ApiError("NOT_FOUND", $"Phiếu trả hàng NCC {id} không tồn tại"));
        if (r.Status != "DRAFT")
            return Conflict(new ApiError("WF_LOCKED", $"Trạng thái {r.Status}, không sửa được"));
        Mapper.Apply(body, r, skipNulls: true);
        await db.SaveChangesAsync();
        return Ok(ToDto(r));
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Delete(long id)
    {
        if (await Denied("DELETE")) return Forbidden("DELETE");
        var r = await db.SupplierReturns.Include(x => x.Lines).FirstOrDefaultAsync(x => x.Id == id);
        if (r is null) return NotFound(new ApiError("NOT_FOUND", $"Phiếu trả hàng NCC {id} không tồn tại"));
        if (r.Status != "DRAFT")
            return Conflict(new ApiError("WF_LOCKED", $"Trạng thái {r.Status}, không xóa được"));
        db.SupplierReturns.Remove(r);
        await db.SaveChangesAsync();
        return NoContent();
    }

    // ----- Lines -----
    [HttpPost("{id:long}/lines")]
    public async Task<IActionResult> AddLine(long id, [FromBody] SupplierReturnLineIn body)
    {
        if (await Denied("UPDATE")) return Forbidden("UPDATE");
        var r = await db.SupplierReturns.FirstOrDefaultAsync(x => x.Id == id);
        if (r is null) return NotFound(new ApiError("NOT_FOUND", $"Phiếu trả hàng NCC {id} không tồn tại"));
        if (r.Status != "DRAFT")
            return Conflict(new ApiError("WF_LOCKED", $"Trạng thái {r.Status}, không sửa được"));
        var line = new SupplierReturnLine
        {
            ReturnId = id, ProductId = body.ProductId,
            Quantity = body.Quantity, UnitPrice = body.UnitPrice, Note = body.Note,
        };
        db.SupplierReturnLines.Add(line);
        await db.SaveChangesAsync();
        return StatusCode(201, new SupplierReturnLineOut(
            line.Id, line.ProductId, line.Quantity, line.UnitPrice, line.Note));
    }

    [HttpDelete("{id:long}/lines/{lineId:long}")]
    public async Task<IActionResult> DeleteLine(long id, long lineId)
    {
        if (await Denied("UPDATE")) return Forbidden("UPDATE");
        var line = await db.SupplierReturnLines
            .FirstOrDefaultAsync(x => x.Id == lineId && x.ReturnId == id);
        if (line is null) return NotFound(new ApiError("NOT_FOUND", "Dòng không tồn tại"));
        db.SupplierReturnLines.Remove(line);
        await db.SaveChangesAsync();
        return NoContent();
    }

    // ----- Workflow actions -----
    [HttpPost("{id:long}/actions/{actionName}")]
    public async Task<IActionResult> Action(long id, string actionName, [FromBody] WfActionRequest? body)
    {
        var r = await db.SupplierReturns.Include(x => x.Lines).FirstOrDefaultAsync(x => x.Id == id);
        if (r is null) return NotFound(new ApiError("NOT_FOUND", $"Phiếu trả hàng NCC {id} không tồn tại"));

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

        await db.SaveChangesAsync();
        return Ok(ToDto(r));
    }
}