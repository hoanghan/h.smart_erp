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
[Route("api/v1/mfg/reports")]
public class MfgReportsController(ErpDbContext db, RbacService rbac) : ControllerBase
{
    private const string Resource = "work-orders";

    private async Task<bool> Denied(string action) =>
        !await rbac.HasPermissionAsync(User, "DOCUMENT", Resource, action);

    private ObjectResult Forbidden(string action) =>
        StatusCode(403, new ApiError("WF_NO_PERMISSION", $"Thiếu quyền {action} trên DOCUMENT:{Resource}"));

    [HttpGet("production-cost")]
    public async Task<IActionResult> ProductionCost(
        [FromQuery] DateTimeOffset? from, [FromQuery] DateTimeOffset? to, [FromQuery] long? workOrderId)
    {
        if (await Denied("VIEW")) return Forbidden("VIEW");

        IQueryable<WorkOrder> query = db.WorkOrders.Where(w => w.ProducedQty > 0);
        if (from is DateTimeOffset f) query = query.Where(w => w.CreatedAt >= f);
        if (to is DateTimeOffset t) query = query.Where(w => w.CreatedAt <= t);
        if (workOrderId is long woId) query = query.Where(w => w.Id == woId);

        var wos = await query.Include(w => w.Items).Include(w => w.Operations).Include(w => w.FinishBatches)
            .OrderByDescending(w => w.Id).ToListAsync();

        var productIds = wos.Select(w => w.ProductId).Distinct().ToList();
        var products = await db.Products.Where(p => productIds.Contains(p.Id)).ToDictionaryAsync(p => p.Id, p => p.Name);

        var result = wos.Select(w =>
        {
            var standardCost = w.Items.Sum(i => i.RequiredQty * i.Rate) + w.Operations.Sum(o => o.PlannedTimeMinutes / 60 * o.HourlyRate);
            var bomCost = w.Qty != 0 ? standardCost * w.ProducedQty / w.Qty : 0;
            var actualCost = w.FinishBatches.Sum(b => b.Cost);
            var variance = actualCost - bomCost;
            var variancePercent = bomCost != 0 ? variance / bomCost * 100 : 0;
            return new ProductionCostReportDto(w.Id, w.DocNo, products.GetValueOrDefault(w.ProductId, ""),
                w.Qty, w.ProducedQty, bomCost, actualCost, variance, variancePercent);
        }).ToList();

        return Ok(result);
    }

    [HttpGet("wip-balance")]
    public async Task<IActionResult> WipBalance([FromQuery] DateTimeOffset? from, [FromQuery] DateTimeOffset? to)
    {
        if (await Denied("VIEW")) return Forbidden("VIEW");

        IQueryable<WorkOrder> query = db.WorkOrders.Where(w => w.Status == "IN_PROCESS");
        if (from is DateTimeOffset f) query = query.Where(w => w.CreatedAt >= f);
        if (to is DateTimeOffset t) query = query.Where(w => w.CreatedAt <= t);

        var wos = await query.Include(w => w.Items).OrderByDescending(w => w.Id).ToListAsync();

        var productIds = wos.Select(w => w.ProductId).Distinct().ToList();
        var products = await db.Products.Where(p => productIds.Contains(p.Id)).ToDictionaryAsync(p => p.Id, p => p.Name);

        var result = wos.Select(w => new WipBalanceReportDto(
            w.Id, w.DocNo, products.GetValueOrDefault(w.ProductId, ""),
            w.Qty - w.ProducedQty,
            w.Items.Sum(i => (i.TransferredQty - i.ConsumedQty) * i.Rate),
            w.CreatedAt
        )).ToList();

        return Ok(result);
    }
}
