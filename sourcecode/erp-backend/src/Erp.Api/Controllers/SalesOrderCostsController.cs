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
[Route("api/v1/sales/orders/{orderId:long}/costs")]
public class SalesOrderCostsController(ErpDbContext db, RbacService rbac) : ControllerBase
{
    private const string Resource = "sales-orders";

    private static SoCostOut ToDto(SoCost c) => new(
        c.Id, c.OrderId, c.CostTypeId, c.PayeeId, c.RatePct, c.Amount, c.VatPct, c.DueDate,
        c.Note, c.Approved, c.ApprovedBy, c.ApprovedAt);

    private async Task<bool> Denied(string action) =>
        !await rbac.HasPermissionAsync(User, "DOCUMENT", Resource, action);

    private ObjectResult Forbidden(string action) =>
        StatusCode(403, new ApiError("WF_NO_PERMISSION", $"Thiếu quyền {action} trên DOCUMENT:{Resource}"));

    private async Task<SalesOrder?> FindOrder(long orderId) =>
        await db.SalesOrders.FirstOrDefaultAsync(x => x.Id == orderId);

    [HttpGet]
    public async Task<IActionResult> List(long orderId)
    {
        if (await Denied("VIEW")) return Forbidden("VIEW");
        if (await FindOrder(orderId) is null)
            return NotFound(new ApiError("NOT_FOUND", $"Đơn hàng {orderId} không tồn tại"));
        var items = await db.SoCosts.AsNoTracking().Where(x => x.OrderId == orderId)
            .OrderBy(x => x.Id).ToListAsync();
        return Ok(items.Select(ToDto).ToList());
    }

    [HttpPost]
    public async Task<IActionResult> Create(long orderId, [FromBody] SoCostIn body)
    {
        if (await Denied("UPDATE")) return Forbidden("UPDATE");
        if (await FindOrder(orderId) is null)
            return NotFound(new ApiError("NOT_FOUND", $"Đơn hàng {orderId} không tồn tại"));
        var cost = new SoCost
        {
            OrderId = orderId, CostTypeId = body.CostTypeId, PayeeId = body.PayeeId,
            RatePct = body.RatePct, Amount = body.Amount, VatPct = body.VatPct,
            DueDate = body.DueDate, Note = body.Note,
        };
        db.SoCosts.Add(cost);
        await db.SaveChangesAsync();
        return StatusCode(201, ToDto(cost));
    }

    [HttpPut("{costId:long}")]
    public async Task<IActionResult> Update(long orderId, long costId, [FromBody] SoCostUpdate body)
    {
        if (await Denied("UPDATE")) return Forbidden("UPDATE");
        var cost = await db.SoCosts.FirstOrDefaultAsync(x => x.Id == costId && x.OrderId == orderId);
        if (cost is null) return NotFound(new ApiError("NOT_FOUND", "Chi phí không tồn tại"));
        if (cost.Approved)
            return Conflict(new ApiError("WF_LOCKED", "Chi phí đã duyệt, không sửa được — hãy bỏ duyệt trước"));
        Mapper.Apply(body, cost, skipNulls: true);
        await db.SaveChangesAsync();
        return Ok(ToDto(cost));
    }

    [HttpDelete("{costId:long}")]
    public async Task<IActionResult> Delete(long orderId, long costId)
    {
        if (await Denied("UPDATE")) return Forbidden("UPDATE");
        var cost = await db.SoCosts.FirstOrDefaultAsync(x => x.Id == costId && x.OrderId == orderId);
        if (cost is null) return NotFound(new ApiError("NOT_FOUND", "Chi phí không tồn tại"));
        if (cost.Approved)
            return Conflict(new ApiError("WF_LOCKED", "Chi phí đã duyệt, không xóa được — hãy bỏ duyệt trước"));
        db.SoCosts.Remove(cost);
        await db.SaveChangesAsync();
        return NoContent();
    }

    // ----- Actions -----
    [HttpPost("{costId:long}/actions/approve")]
    public async Task<IActionResult> Approve(long orderId, long costId)
    {
        if (await Denied("APPROVE")) return Forbidden("APPROVE");
        var cost = await db.SoCosts.FirstOrDefaultAsync(x => x.Id == costId && x.OrderId == orderId);
        if (cost is null) return NotFound(new ApiError("NOT_FOUND", "Chi phí không tồn tại"));
        if (cost.Approved)
            return Conflict(new ApiError("WF_INVALID_TRANSITION", "Chi phí đã được duyệt"));
        cost.Approved = true;
        cost.ApprovedBy = RbacService.GetUserId(User);
        cost.ApprovedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync();
        return Ok(ToDto(cost));
    }

    [HttpPost("{costId:long}/actions/unapprove")]
    public async Task<IActionResult> Unapprove(long orderId, long costId)
    {
        if (await Denied("APPROVE")) return Forbidden("APPROVE");
        var cost = await db.SoCosts.FirstOrDefaultAsync(x => x.Id == costId && x.OrderId == orderId);
        if (cost is null) return NotFound(new ApiError("NOT_FOUND", "Chi phí không tồn tại"));
        if (!cost.Approved)
            return Conflict(new ApiError("WF_INVALID_TRANSITION", "Chi phí chưa được duyệt"));
        cost.Approved = false;
        cost.ApprovedBy = null;
        cost.ApprovedAt = null;
        await db.SaveChangesAsync();
        return Ok(ToDto(cost));
    }
}
