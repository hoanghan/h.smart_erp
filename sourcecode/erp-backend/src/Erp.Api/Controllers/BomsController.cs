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
[Route("api/v1/mfg/boms")]
public class BomsController(ErpDbContext db, RbacService rbac, DocNumberingService docNum, WorkflowService wf) : ControllerBase
{
    private const string Resource = "boms";

    private async Task<bool> Denied(string action) =>
        !await rbac.HasPermissionAsync(User, "DOCUMENT", Resource, action);

    private ObjectResult Forbidden(string action) =>
        StatusCode(403, new ApiError("WF_NO_PERMISSION", $"Thiếu quyền {action} trên DOCUMENT:{Resource}"));

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] string? q, [FromQuery] int page = 1, [FromQuery] int size = 50)
    {
        if (await Denied("VIEW")) return Forbidden("VIEW");
        page = Math.Max(1, page);
        size = Math.Clamp(size, 1, 500);

        IQueryable<Bom> query = db.Boms;
        if (!string.IsNullOrWhiteSpace(q))
            query = query.Where(b => EF.Functions.ILike(b.DocNo, $"%{q}%"));

        var total = await query.LongCountAsync();
        var boms = await query.OrderByDescending(b => b.Id)
            .Skip((page - 1) * size).Take(size).ToListAsync();

        var productIds = boms.Select(b => b.ProductId).Distinct().ToList();
        var products = await db.Products.Where(p => productIds.Contains(p.Id))
            .ToDictionaryAsync(p => p.Id, p => p);

        var result = boms.Select(b =>
        {
            var p = products.GetValueOrDefault(b.ProductId);
            return new BomListItemOut(b.Id, b.DocNo, b.ProductId, p?.Name ?? "", p?.Code ?? "",
                b.Quantity, b.IsDefault, b.WithOperations, b.Status, b.CreatedAt);
        }).ToList();

        return Ok(new PageResult<BomListItemOut>(result, total, page, size));
    }

    [HttpGet("{id:long}")]
    public async Task<IActionResult> Get(long id)
    {
        if (await Denied("VIEW")) return Forbidden("VIEW");
        var bom = await db.Boms
            .Include(b => b.Items).Include(b => b.Operations).Include(b => b.Scraps)
            .FirstOrDefaultAsync(b => b.Id == id);
        if (bom is null) return NotFound(new ApiError("NOT_FOUND", $"boms/{id} không tồn tại"));
        return Ok(await ToDetailDto(bom));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] BomIn body)
    {
        if (await Denied("CREATE")) return Forbidden("CREATE");

        var bom = new Bom
        {
            DocNo = await docNum.NextAsync("BOM"),
            ProductId = body.ProductId,
            Quantity = body.Quantity > 0 ? body.Quantity : 1,
            IsDefault = body.IsDefault,
            WithOperations = body.WithOperations,
            Status = "DRAFT",
            Note = body.Note,
            CreatorId = RbacService.GetUserId(User),
        };

        await PopulateChildren(bom, body);

        db.Boms.Add(bom);
        await db.SaveChangesAsync();
        return StatusCode(201, await ToDetailDto(bom));
    }

    [HttpPut("{id:long}")]
    public async Task<IActionResult> Update(long id, [FromBody] BomIn body)
    {
        if (await Denied("UPDATE")) return Forbidden("UPDATE");
        var bom = await db.Boms
            .Include(b => b.Items).Include(b => b.Operations).Include(b => b.Scraps)
            .FirstOrDefaultAsync(b => b.Id == id);
        if (bom is null) return NotFound(new ApiError("NOT_FOUND", $"boms/{id} không tồn tại"));
        if (bom.Status != "DRAFT")
            return Conflict(new ApiError("BOM_NOT_DRAFT", "Chỉ có thể sửa BOM ở trạng thái DRAFT"));

        bom.ProductId = body.ProductId;
        bom.Quantity = body.Quantity > 0 ? body.Quantity : 1;
        bom.IsDefault = body.IsDefault;
        bom.WithOperations = body.WithOperations;
        bom.Note = body.Note;

        db.BomItems.RemoveRange(bom.Items);
        db.BomOperations.RemoveRange(bom.Operations);
        db.BomScraps.RemoveRange(bom.Scraps);
        bom.Items.Clear();
        bom.Operations.Clear();
        bom.Scraps.Clear();

        await PopulateChildren(bom, body);
        await db.SaveChangesAsync();
        return Ok(await ToDetailDto(bom));
    }

    [HttpPost("{id:long}/submit")]
    public async Task<IActionResult> Submit(long id)
    {
        var bom = await db.Boms.FindAsync(id);
        if (bom is null) return NotFound(new ApiError("NOT_FOUND", $"boms/{id} không tồn tại"));

        try
        {
            bom.Status = await wf.TransitionAsync(User, Resource, id, bom.Status, "submit", null);
        }
        catch (WorkflowException e)
        {
            return e.Code == "WF_NO_PERMISSION"
                ? StatusCode(403, new ApiError(e.Code, e.Message))
                : Conflict(new ApiError(e.Code, e.Message));
        }

        bom.SubmittedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync();
        return Ok(new { id = bom.Id, status = bom.Status });
    }

    [HttpPost("{id:long}/cancel")]
    public async Task<IActionResult> Cancel(long id)
    {
        var bom = await db.Boms.FindAsync(id);
        if (bom is null) return NotFound(new ApiError("NOT_FOUND", $"boms/{id} không tồn tại"));

        try
        {
            bom.Status = await wf.TransitionAsync(User, Resource, id, bom.Status, "cancel", null);
        }
        catch (WorkflowException e)
        {
            return e.Code == "WF_NO_PERMISSION"
                ? StatusCode(403, new ApiError(e.Code, e.Message))
                : Conflict(new ApiError(e.Code, e.Message));
        }

        await db.SaveChangesAsync();
        return Ok(new { id = bom.Id, status = bom.Status });
    }

    [HttpGet("{id:long}/explode")]
    public async Task<IActionResult> Explode(long id, [FromQuery] decimal qty = 0)
    {
        if (await Denied("VIEW")) return Forbidden("VIEW");
        var bom = await db.Boms.FindAsync(id);
        if (bom is null) return NotFound(new ApiError("NOT_FOUND", $"boms/{id} không tồn tại"));

        var explodeQty = qty > 0 ? qty : bom.Quantity;
        var materials = await BomExplodeHelper.ExplodeMaterials(db, bom, explodeQty);
        var opCost = await BomExplodeHelper.ExplodeOperationCost(db, bom, explodeQty);

        var productIds = materials.Keys.ToList();
        var products = await db.Products.Where(p => productIds.Contains(p.Id))
            .ToDictionaryAsync(p => p.Id, p => p);

        var items = materials.Select(kv =>
        {
            var p = products.GetValueOrDefault(kv.Key);
            return new ExplodeItemDto(kv.Key, p?.Code ?? "", p?.Name ?? "",
                kv.Value.Qty, kv.Value.Rate, kv.Value.Qty * kv.Value.Rate);
        }).ToList();

        var materialCost = items.Sum(i => i.Amount);
        var totalCost = materialCost + opCost;
        var unitCost = explodeQty != 0 ? totalCost / explodeQty : 0;

        return Ok(new ExplodeResultOut(items, totalCost, unitCost));
    }

    // ----- helpers -----

    private async Task PopulateChildren(Bom bom, BomIn body)
    {
        foreach (var i in body.Items ?? new())
        {
            bom.Items.Add(new BomItem
            {
                ProductId = i.ProductId,
                Qty = i.Quantity,
                Rate = i.Rate ?? await GetLastRate(i.ProductId),
                ScrapLossPct = i.ScrapLossPct,
                SubBomId = i.BomId,
            });
        }

        foreach (var o in body.Operations ?? new())
        {
            var op = await db.Operations.FindAsync(o.OperationId);
            var wsId = o.WorkstationId ?? op?.DefaultWorkstationId;
            decimal hourlyRate = 0;
            if (wsId is long w)
            {
                var ws = await db.Workstations.FindAsync(w);
                hourlyRate = ws?.HourlyRate ?? 0;
            }
            bom.Operations.Add(new BomOperation
            {
                OperationId = o.OperationId,
                WorkstationId = wsId,
                TimeMinutes = o.TimeMinutes,
                HourlyRate = hourlyRate,
            });
        }

        foreach (var s in body.Scraps ?? new())
        {
            bom.Scraps.Add(new BomScrap
            {
                ProductId = s.ProductId,
                Qty = s.Quantity,
                Rate = s.Rate ?? await GetLastRate(s.ProductId),
            });
        }
    }

    private async Task<decimal> GetLastRate(long productId)
    {
        var rate = await db.StockMoves.Where(m => m.ProductId == productId)
            .OrderByDescending(m => m.Id)
            .Select(m => m.ValuationRate)
            .FirstOrDefaultAsync();
        return rate ?? 0;
    }

    private async Task<BomDetailOut> ToDetailDto(Bom bom)
    {
        var productIds = new HashSet<long> { bom.ProductId };
        foreach (var i in bom.Items) productIds.Add(i.ProductId);
        foreach (var s in bom.Scraps) productIds.Add(s.ProductId);
        var products = await db.Products.Where(p => productIds.Contains(p.Id))
            .ToDictionaryAsync(p => p.Id, p => p);

        var subBomIds = bom.Items.Where(i => i.SubBomId != null).Select(i => i.SubBomId!.Value).Distinct().ToList();
        var subBoms = await db.Boms.Where(b => subBomIds.Contains(b.Id))
            .ToDictionaryAsync(b => b.Id, b => b.DocNo);

        var opIds = bom.Operations.Select(o => o.OperationId).Distinct().ToList();
        var ops = await db.Operations.Where(o => opIds.Contains(o.Id))
            .ToDictionaryAsync(o => o.Id, o => o.Name);

        var wsIds = bom.Operations.Where(o => o.WorkstationId != null)
            .Select(o => o.WorkstationId!.Value).Distinct().ToList();
        var wss = await db.Workstations.Where(w => wsIds.Contains(w.Id))
            .ToDictionaryAsync(w => w.Id, w => w.Name);

        var p = products.GetValueOrDefault(bom.ProductId);

        var itemDtos = bom.Items.Select(i =>
        {
            var ip = products.GetValueOrDefault(i.ProductId);
            var rate = i.Rate ?? 0;
            return new BomItemDto(i.Id, i.ProductId, ip?.Code ?? "", ip?.Name ?? "",
                i.Qty, rate, i.Qty * rate, i.SubBomId,
                i.SubBomId is long sb ? subBoms.GetValueOrDefault(sb) : null, 0, null);
        }).ToList();

        var opDtos = bom.Operations.Select(o => new BomOperationDto(
            o.Id, o.OperationId, ops.GetValueOrDefault(o.OperationId) ?? "",
            o.WorkstationId, o.WorkstationId is long wsId ? wss.GetValueOrDefault(wsId) : null,
            o.TimeMinutes, o.OperationCost)).ToList();

        var scrapDtos = bom.Scraps.Select(s =>
        {
            var sp = products.GetValueOrDefault(s.ProductId);
            var rate = s.Rate ?? 0;
            return new BomScrapDto(s.Id, s.ProductId, sp?.Name ?? "", s.Qty, rate, s.Qty * rate);
        }).ToList();

        return new BomDetailOut(bom.Id, bom.DocNo, bom.ProductId, p?.Name ?? "", p?.Code ?? "",
            bom.Quantity, bom.IsDefault, bom.WithOperations, bom.Status, itemDtos, opDtos, scrapDtos);
    }
}
