using Erp.Api.Core;
using Erp.Api.Data;
using Erp.Api.Dtos;
using Erp.Api.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Erp.Api.Controllers;

/// <summary>
/// Payment requests + actuals under a purchase order.
/// Routes: /api/v1/purchasing/orders/{orderId}/payment-requests, /payment-actuals
/// </summary>
[ApiController]
[Authorize]
[Route("api/v1/purchasing/orders/{orderId:long}")]
public class PurchaseOrderPaymentsController(ErpDbContext db, RbacService rbac) : ControllerBase
{
    private const string Resource = "purchase-orders";

    private async Task<bool> Denied(string action) =>
        !await rbac.HasPermissionAsync(User, "DOCUMENT", Resource, action);

    private ObjectResult Forbidden(string action) =>
        StatusCode(403, new ApiError("WF_NO_PERMISSION", $"Thiếu quyền {action} trên DOCUMENT:{Resource}"));

    private async Task<PurchaseOrder?> FindOrder(long orderId) =>
        await db.PurchaseOrders.FirstOrDefaultAsync(x => x.Id == orderId);

    // ===== Payment Requests =====

    private static PoPaymentRequestOut ToDtoReq(PoPaymentRequest r) => new(
        r.Id, r.OrderId, r.Amount, r.DueDate, r.Note,
        r.Status, r.CreatorId, r.ApprovedBy, r.ApprovedAt);

    [HttpGet("payment-requests")]
    public async Task<IActionResult> ListPaymentRequests(long orderId)
    {
        if (await Denied("VIEW")) return Forbidden("VIEW");
        if (await FindOrder(orderId) is null)
            return NotFound(new ApiError("NOT_FOUND", $"Đơn mua {orderId} không tồn tại"));
        var items = await db.PoPaymentRequests.AsNoTracking()
            .Where(x => x.OrderId == orderId).OrderBy(x => x.Id).ToListAsync();
        return Ok(items.Select(ToDtoReq).ToList());
    }

    [HttpPost("payment-requests")]
    public async Task<IActionResult> CreatePaymentRequest(long orderId, [FromBody] PoPaymentRequestIn body)
    {
        if (await Denied("UPDATE")) return Forbidden("UPDATE");
        if (await FindOrder(orderId) is null)
            return NotFound(new ApiError("NOT_FOUND", $"Đơn mua {orderId} không tồn tại"));
        var req = new PoPaymentRequest
        {
            OrderId = orderId, Amount = body.Amount, DueDate = body.DueDate,
            Note = body.Note, CreatorId = RbacService.GetUserId(User),
        };
        db.PoPaymentRequests.Add(req);
        await db.SaveChangesAsync();
        return StatusCode(201, ToDtoReq(req));
    }

    [HttpPut("payment-requests/{reqId:long}")]
    public async Task<IActionResult> UpdatePaymentRequest(long orderId, long reqId, [FromBody] PoPaymentRequestUpdate body)
    {
        if (await Denied("UPDATE")) return Forbidden("UPDATE");
        var req = await db.PoPaymentRequests.FirstOrDefaultAsync(x => x.Id == reqId && x.OrderId == orderId);
        if (req is null) return NotFound(new ApiError("NOT_FOUND", "ĐNTT không tồn tại"));
        if (req.Status != "DRAFT")
            return Conflict(new ApiError("WF_LOCKED", $"ĐNTT ở trạng thái {req.Status}, không sửa được"));
        Mapper.Apply(body, req, skipNulls: true);
        await db.SaveChangesAsync();
        return Ok(ToDtoReq(req));
    }

    [HttpDelete("payment-requests/{reqId:long}")]
    public async Task<IActionResult> DeletePaymentRequest(long orderId, long reqId)
    {
        if (await Denied("UPDATE")) return Forbidden("UPDATE");
        var req = await db.PoPaymentRequests.FirstOrDefaultAsync(x => x.Id == reqId && x.OrderId == orderId);
        if (req is null) return NotFound(new ApiError("NOT_FOUND", "ĐNTT không tồn tại"));
        if (req.Status != "DRAFT")
            return Conflict(new ApiError("WF_LOCKED", $"ĐNTT ở trạng thái {req.Status}, không xóa được"));
        db.PoPaymentRequests.Remove(req);
        await db.SaveChangesAsync();
        return NoContent();
    }

    // ===== Payment Actuals =====

    private static PoPaymentActualOut ToDtoActual(PoPaymentActual a) => new(
        a.Id, a.OrderId, a.PayDate, a.Amount, a.MethodId, a.Note);

    [HttpGet("payment-actuals")]
    public async Task<IActionResult> ListPaymentActuals(long orderId)
    {
        if (await Denied("VIEW")) return Forbidden("VIEW");
        if (await FindOrder(orderId) is null)
            return NotFound(new ApiError("NOT_FOUND", $"Đơn mua {orderId} không tồn tại"));
        var items = await db.PoPaymentActuals.AsNoTracking()
            .Where(x => x.OrderId == orderId).OrderBy(x => x.Id).ToListAsync();
        return Ok(items.Select(ToDtoActual).ToList());
    }

    [HttpPost("payment-actuals")]
    public async Task<IActionResult> CreatePaymentActual(long orderId, [FromBody] PoPaymentActualIn body)
    {
        if (await Denied("UPDATE")) return Forbidden("UPDATE");
        if (await FindOrder(orderId) is null)
            return NotFound(new ApiError("NOT_FOUND", $"Đơn mua {orderId} không tồn tại"));
        var actual = new PoPaymentActual
        {
            OrderId = orderId, PayDate = body.PayDate, Amount = body.Amount,
            MethodId = body.MethodId, Note = body.Note,
        };
        db.PoPaymentActuals.Add(actual);
        await db.SaveChangesAsync();
        return StatusCode(201, ToDtoActual(actual));
    }

    [HttpPut("payment-actuals/{actualId:long}")]
    public async Task<IActionResult> UpdatePaymentActual(long orderId, long actualId, [FromBody] PoPaymentActualUpdate body)
    {
        if (await Denied("UPDATE")) return Forbidden("UPDATE");
        var actual = await db.PoPaymentActuals.FirstOrDefaultAsync(x => x.Id == actualId && x.OrderId == orderId);
        if (actual is null) return NotFound(new ApiError("NOT_FOUND", "Thanh toán thực tế không tồn tại"));
        Mapper.Apply(body, actual, skipNulls: true);
        await db.SaveChangesAsync();
        return Ok(ToDtoActual(actual));
    }

    [HttpDelete("payment-actuals/{actualId:long}")]
    public async Task<IActionResult> DeletePaymentActual(long orderId, long actualId)
    {
        if (await Denied("UPDATE")) return Forbidden("UPDATE");
        var actual = await db.PoPaymentActuals.FirstOrDefaultAsync(x => x.Id == actualId && x.OrderId == orderId);
        if (actual is null) return NotFound(new ApiError("NOT_FOUND", "Thanh toán thực tế không tồn tại"));
        db.PoPaymentActuals.Remove(actual);
        await db.SaveChangesAsync();
        return NoContent();
    }
}

/// <summary>
/// Top-level payments screen: list all ĐNTT + approve action.
/// Route: /api/v1/purchasing/payments
/// </summary>
[ApiController]
[Authorize]
[Route("api/v1/purchasing/payments")]
public class PurchasingPaymentsController(ErpDbContext db, RbacService rbac, WorkflowService wf) : ControllerBase
{
    private const string Resource = "po-payments";

    private static PoPaymentRequestOut ToDto(PoPaymentRequest r) => new(
        r.Id, r.OrderId, r.Amount, r.DueDate, r.Note,
        r.Status, r.CreatorId, r.ApprovedBy, r.ApprovedAt);

    private async Task<bool> Denied(string action) =>
        !await rbac.HasPermissionAsync(User, "DOCUMENT", Resource, action);

    private ObjectResult Forbidden(string action) =>
        StatusCode(403, new ApiError("WF_NO_PERMISSION", $"Thiếu quyền {action} trên DOCUMENT:{Resource}"));

    [HttpGet]
    public async Task<IActionResult> List(
        [FromQuery] string? status, [FromQuery] int page = 1, [FromQuery] int size = 50)
    {
        if (await Denied("VIEW")) return Forbidden("VIEW");
        var q = db.PoPaymentRequests.AsNoTracking().AsQueryable();
        if (!string.IsNullOrEmpty(status)) q = q.Where(x => x.Status == status);
        var total = await q.LongCountAsync();
        var items = await q.OrderByDescending(x => x.Id)
            .Skip((Math.Max(1, page) - 1) * size).Take(Math.Clamp(size, 1, 200)).ToListAsync();
        return Ok(new PageResult<PoPaymentRequestOut>(items.Select(ToDto).ToList(), total, page, size));
    }

    [HttpPost("{id:long}/actions/{actionName}")]
    public async Task<IActionResult> Action(long id, string actionName, [FromBody] WfActionRequest? body)
    {
        var req = await db.PoPaymentRequests.FirstOrDefaultAsync(x => x.Id == id);
        if (req is null) return NotFound(new ApiError("NOT_FOUND", $"ĐNTT {id} không tồn tại"));

        try
        {
            req.Status = await wf.TransitionAsync(User, Resource, id, req.Status, actionName, body?.Reason);
        }
        catch (WorkflowException e)
        {
            return e.Code == "WF_NO_PERMISSION"
                ? StatusCode(403, new ApiError(e.Code, e.Message))
                : Conflict(new ApiError(e.Code, e.Message));
        }

        if (req.Status == "APPROVED")
        {
            req.ApprovedBy = RbacService.GetUserId(User);
            req.ApprovedAt = DateTimeOffset.UtcNow;
        }
        await db.SaveChangesAsync();
        return Ok(ToDto(req));
    }
}