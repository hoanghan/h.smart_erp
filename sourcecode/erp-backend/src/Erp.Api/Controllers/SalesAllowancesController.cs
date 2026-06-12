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
[Route("api/v1/sales/allowances")]
public class SalesAllowancesController(
    ErpDbContext db, RbacService rbac, WorkflowService wf, DocNumberingService numbering)
    : ControllerBase
{
    private const string Resource = "sales-allowances";
    private static readonly string[] AllowedOrderStatuses = { "DELIVERED", "COMPLETED" };

    private static SalesAllowanceOut ToDto(SalesAllowance a) => new(
        a.Id, a.DocNo, a.DocDate, a.OrderId, a.AllowForm, a.Status, a.Note,
        a.Lines.Select(l => new SalesAllowanceLineOut(l.Id, l.ProductId, l.Quantity, l.ReducedPrice)).ToList());

    private async Task<bool> Denied(string action) =>
        !await rbac.HasPermissionAsync(User, "DOCUMENT", Resource, action);

    private ObjectResult Forbidden(string action) =>
        StatusCode(403, new ApiError("WF_NO_PERMISSION", $"Thiếu quyền {action} trên DOCUMENT:{Resource}"));

    [HttpGet]
    public async Task<IActionResult> List(
        [FromQuery] long? orderId, [FromQuery] string? status,
        [FromQuery] int page = 1, [FromQuery] int size = 50)
    {
        if (await Denied("VIEW")) return Forbidden("VIEW");
        var q = db.SalesAllowances.Include(x => x.Lines).AsNoTracking().AsQueryable();
        if (orderId.HasValue) q = q.Where(x => x.OrderId == orderId);
        if (!string.IsNullOrEmpty(status)) q = q.Where(x => x.Status == status);
        var total = await q.LongCountAsync();
        var items = await q.OrderByDescending(x => x.Id)
            .Skip((Math.Max(1, page) - 1) * size).Take(Math.Clamp(size, 1, 200)).ToListAsync();
        return Ok(new PageResult<SalesAllowanceOut>(items.Select(ToDto).ToList(), total, page, size));
    }

    [HttpGet("{id:long}")]
    public async Task<IActionResult> Get(long id)
    {
        if (await Denied("VIEW")) return Forbidden("VIEW");
        var a = await db.SalesAllowances.Include(x => x.Lines).FirstOrDefaultAsync(x => x.Id == id);
        return a is null
            ? NotFound(new ApiError("NOT_FOUND", $"Giảm giá hàng bán {id} không tồn tại"))
            : Ok(ToDto(a));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] SalesAllowanceCreate body)
    {
        if (await Denied("CREATE")) return Forbidden("CREATE");
        var order = await db.SalesOrders.FirstOrDefaultAsync(x => x.Id == body.OrderId);
        if (order is null) return NotFound(new ApiError("NOT_FOUND", $"Đơn hàng {body.OrderId} không tồn tại"));
        if (!AllowedOrderStatuses.Contains(order.Status))
            return Conflict(new ApiError("WF_INVALID_TRANSITION",
                $"Chỉ tạo giảm giá hàng bán từ đơn ở trạng thái DELIVERED/COMPLETED (hiện tại: {order.Status})"));

        var a = new SalesAllowance
        {
            DocNo = await numbering.NextAsync("SALES_ALLOWANCE"),
            DocDate = DateOnly.FromDateTime(DateTime.Today),
            OrderId = body.OrderId,
            AllowForm = body.AllowForm,
            Note = body.Note,
            Lines = (body.Lines ?? new()).Select(l => new SalesAllowanceLine
            {
                ProductId = l.ProductId, Quantity = l.Quantity, ReducedPrice = l.ReducedPrice,
            }).ToList(),
        };
        db.SalesAllowances.Add(a);
        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException e)
        {
            return Conflict(new ApiError("CONFLICT", $"Vi phạm ràng buộc: {e.InnerException?.Message}"));
        }
        return StatusCode(201, ToDto(a));
    }

    [HttpPut("{id:long}")]
    public async Task<IActionResult> Update(long id, [FromBody] SalesAllowanceUpdate body)
    {
        if (await Denied("UPDATE")) return Forbidden("UPDATE");
        var a = await db.SalesAllowances.Include(x => x.Lines).FirstOrDefaultAsync(x => x.Id == id);
        if (a is null) return NotFound(new ApiError("NOT_FOUND", $"Giảm giá hàng bán {id} không tồn tại"));
        if (a.Status != "DRAFT")
            return Conflict(new ApiError("WF_LOCKED", $"Phiếu ở trạng thái {a.Status}, không sửa được"));
        Mapper.Apply(body, a, skipNulls: true);
        await db.SaveChangesAsync();
        return Ok(ToDto(a));
    }

    // ----- Lines -----
    [HttpPost("{id:long}/lines")]
    public async Task<IActionResult> AddLine(long id, [FromBody] SalesAllowanceLineIn body)
    {
        if (await Denied("UPDATE")) return Forbidden("UPDATE");
        var a = await db.SalesAllowances.FirstOrDefaultAsync(x => x.Id == id);
        if (a is null) return NotFound(new ApiError("NOT_FOUND", $"Giảm giá hàng bán {id} không tồn tại"));
        if (a.Status != "DRAFT")
            return Conflict(new ApiError("WF_LOCKED", $"Phiếu ở trạng thái {a.Status}, không sửa được"));
        var line = new SalesAllowanceLine
        {
            AllowanceId = id, ProductId = body.ProductId, Quantity = body.Quantity, ReducedPrice = body.ReducedPrice,
        };
        db.SalesAllowanceLines.Add(line);
        await db.SaveChangesAsync();
        return StatusCode(201, new SalesAllowanceLineOut(line.Id, line.ProductId, line.Quantity, line.ReducedPrice));
    }

    [HttpDelete("{id:long}/lines/{lineId:long}")]
    public async Task<IActionResult> DeleteLine(long id, long lineId)
    {
        if (await Denied("UPDATE")) return Forbidden("UPDATE");
        var a = await db.SalesAllowances.FirstOrDefaultAsync(x => x.Id == id);
        if (a is null) return NotFound(new ApiError("NOT_FOUND", $"Giảm giá hàng bán {id} không tồn tại"));
        if (a.Status != "DRAFT")
            return Conflict(new ApiError("WF_LOCKED", $"Phiếu ở trạng thái {a.Status}, không sửa được"));
        var line = await db.SalesAllowanceLines.FirstOrDefaultAsync(x => x.Id == lineId && x.AllowanceId == id);
        if (line is null) return NotFound(new ApiError("NOT_FOUND", "Dòng không tồn tại"));
        db.SalesAllowanceLines.Remove(line);
        await db.SaveChangesAsync();
        return NoContent();
    }

    // ----- Workflow actions -----
    [HttpPost("{id:long}/actions/{actionName}")]
    public async Task<IActionResult> Action(long id, string actionName, [FromBody] WfActionRequest? body)
    {
        var a = await db.SalesAllowances.Include(x => x.Lines).FirstOrDefaultAsync(x => x.Id == id);
        if (a is null) return NotFound(new ApiError("NOT_FOUND", $"Giảm giá hàng bán {id} không tồn tại"));

        try
        {
            a.Status = await wf.TransitionAsync(User, Resource, id, a.Status, actionName, body?.Reason);
        }
        catch (WorkflowException e)
        {
            return e.Code == "WF_NO_PERMISSION"
                ? StatusCode(403, new ApiError(e.Code, e.Message))
                : Conflict(new ApiError(e.Code, e.Message));
        }

        await db.SaveChangesAsync();
        return Ok(ToDto(a));
    }
}
