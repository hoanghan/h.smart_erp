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
[Route("api/v1/mfg/production-plans")]
public class ProductionPlansController(ErpDbContext db, RbacService rbac, DocNumberingService docNum, WorkflowService wf)
    : ControllerBase
{
    private const string Resource = "production-plans";

    private async Task<bool> Denied(string action) =>
        !await rbac.HasPermissionAsync(User, "DOCUMENT", Resource, action);

    private ObjectResult Forbidden(string action) =>
        StatusCode(403, new ApiError("WF_NO_PERMISSION", $"Thiếu quyền {action} trên DOCUMENT:{Resource}"));

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] string? status, [FromQuery] int page = 1, [FromQuery] int size = 50)
    {
        if (await Denied("VIEW")) return Forbidden("VIEW");
        page = Math.Max(1, page);
        size = Math.Clamp(size, 1, 500);

        IQueryable<ProductionPlan> query = db.ProductionPlans;
        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(p => p.Status == status);

        var total = await query.LongCountAsync();
        var plans = await query.OrderByDescending(p => p.Id)
            .Skip((page - 1) * size).Take(size).ToListAsync();

        var planIds = plans.Select(p => p.Id).ToList();
        var productCounts = await db.PpItems.Where(i => planIds.Contains(i.ProductionPlanId))
            .GroupBy(i => i.ProductionPlanId)
            .Select(g => new { g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.Key, x => x.Count);

        var materialStats = await db.PpMaterials.Where(m => planIds.Contains(m.ProductionPlanId))
            .GroupBy(m => m.ProductionPlanId)
            .Select(g => new { g.Key, Total = g.Count(), Shortage = g.Count(x => x.ShortageQty > 0) })
            .ToDictionaryAsync(x => x.Key, x => x);

        var result = plans.Select(p =>
        {
            var ms = materialStats.GetValueOrDefault(p.Id);
            return new ProductionPlanListItemOut(p.Id, p.DocNo, p.Status, p.CreatedAt,
                productCounts.GetValueOrDefault(p.Id), ms?.Total ?? 0, ms?.Shortage ?? 0);
        }).ToList();

        return Ok(new PageResult<ProductionPlanListItemOut>(result, total, page, size));
    }

    [HttpGet("{id:long}")]
    public async Task<IActionResult> Get(long id)
    {
        if (await Denied("VIEW")) return Forbidden("VIEW");
        var pp = await db.ProductionPlans.Include(p => p.Items).Include(p => p.SalesOrders)
            .FirstOrDefaultAsync(p => p.Id == id);
        if (pp is null) return NotFound(new ApiError("NOT_FOUND", $"production-plans/{id} không tồn tại"));
        return Ok(await ToDetailDto(pp));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] ProductionPlanIn body)
    {
        if (await Denied("CREATE")) return Forbidden("CREATE");

        var pp = new ProductionPlan
        {
            DocNo = await docNum.NextAsync("PRODUCTION_PLAN"),
            PlanDate = DateOnly.FromDateTime(DateTime.Today),
            Status = "DRAFT",
            CreatorId = RbacService.GetUserId(User),
        };

        var demand = new Dictionary<long, decimal>();

        var soIds = body.SoIds ?? new();
        if (soIds.Count > 0)
        {
            var sos = await db.SalesOrders.Include(s => s.Lines).Where(s => soIds.Contains(s.Id)).ToListAsync();
            foreach (var so in sos)
            {
                pp.SalesOrders.Add(new PpSo { SalesOrderId = so.Id });
                foreach (var line in so.Lines)
                    demand[line.ProductId] = demand.GetValueOrDefault(line.ProductId) + line.Quantity;
            }
        }

        foreach (var m in body.ManualDemand ?? new())
            demand[m.ProductId] = demand.GetValueOrDefault(m.ProductId) + m.Qty;

        foreach (var (productId, qty) in demand)
            pp.Items.Add(new PpItem { ProductId = productId, PlannedQty = qty });

        // Explode default BOM của từng thành phẩm -> dồn nhu cầu NVL lá
        var materials = new Dictionary<long, (decimal Qty, decimal? Rate)>();
        foreach (var item in pp.Items)
        {
            var bom = await db.Boms.FirstOrDefaultAsync(b => b.ProductId == item.ProductId && b.IsDefault);
            if (bom is null) continue;

            var exploded = await BomExplodeHelper.ExplodeMaterials(db, bom, item.PlannedQty);
            foreach (var (productId, m) in exploded)
            {
                var existingQty = materials.TryGetValue(productId, out var existing) ? existing.Qty : 0m;
                materials[productId] = (existingQty + m.Qty, m.Rate);
            }
        }

        db.ProductionPlans.Add(pp);
        await db.SaveChangesAsync();

        foreach (var (productId, m) in materials)
        {
            var balances = await db.StockBalances.Where(b => b.ProductId == productId).ToListAsync();
            var onHand = balances.Sum(b => b.QtyOnHand);
            var ordered = balances.Sum(b => b.OrderedQty);
            var reserved = balances.Sum(b => b.ReservedQty);
            var projected = onHand + ordered - reserved;
            var shortage = Math.Max(0, m.Qty - projected);
            var isManufacturable = await db.Boms.AnyAsync(b => b.ProductId == productId && b.IsDefault);

            db.PpMaterials.Add(new PpMaterial
            {
                ProductionPlanId = pp.Id,
                ProductId = productId,
                RequiredQty = m.Qty,
                OnHand = onHand,
                Ordered = ordered,
                Reserved = reserved,
                ProjectedQty = projected,
                ShortageQty = shortage,
                Rate = m.Rate,
                SuggestedSupplierId = await GetSuggestedSupplierId(productId),
                IsManufacturable = isManufacturable,
            });
        }

        await db.SaveChangesAsync();
        return StatusCode(201, await ToDetailDto(pp));
    }

    [HttpPost("{id:long}/submit")]
    public async Task<IActionResult> Submit(long id)
    {
        var pp = await db.ProductionPlans.FindAsync(id);
        if (pp is null) return NotFound(new ApiError("NOT_FOUND", $"production-plans/{id} không tồn tại"));

        try
        {
            pp.Status = await wf.TransitionAsync(User, Resource, id, pp.Status, "submit", null);
        }
        catch (WorkflowException e)
        {
            return e.Code == "WF_NO_PERMISSION"
                ? StatusCode(403, new ApiError(e.Code, e.Message))
                : Conflict(new ApiError(e.Code, e.Message));
        }

        pp.SubmittedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync();
        return Ok(new { id = pp.Id, status = pp.Status });
    }

    [HttpPost("{id:long}/generate-work-orders")]
    public async Task<IActionResult> GenerateWorkOrders(long id)
    {
        if (await Denied("UPDATE")) return Forbidden("UPDATE");
        var pp = await db.ProductionPlans.Include(p => p.Items).Include(p => p.SalesOrders)
            .FirstOrDefaultAsync(p => p.Id == id);
        if (pp is null) return NotFound(new ApiError("NOT_FOUND", $"production-plans/{id} không tồn tại"));

        var warehouseId = await ResolveDefaultWarehouseId(pp);
        if (warehouseId is null)
            return Conflict(new ApiError("MFG_NO_WAREHOUSE", "Chưa có kho nào trong hệ thống để tạo lệnh sản xuất"));

        foreach (var item in pp.Items)
        {
            if (await db.WorkOrders.AnyAsync(w => w.ProductionPlanId == id && w.ProductId == item.ProductId))
                continue;

            var bom = await db.Boms.Include(b => b.Operations).FirstOrDefaultAsync(b => b.ProductId == item.ProductId && b.IsDefault);
            if (bom is null) continue;

            var wo = new WorkOrder
            {
                DocNo = await docNum.NextAsync("WORK_ORDER"),
                ProductId = item.ProductId,
                BomId = bom.Id,
                ProductionPlanId = id,
                Qty = item.PlannedQty,
                SourceWarehouseId = warehouseId,
                WipWarehouseId = warehouseId.Value,
                FgWarehouseId = warehouseId.Value,
                Status = "DRAFT",
                CreatorId = RbacService.GetUserId(User),
            };
            await BomExplodeHelper.PopulateWoItemsAndOps(db, wo, bom, item.PlannedQty);
            db.WorkOrders.Add(wo);
        }

        await db.SaveChangesAsync();
        return Ok(await ToDetailDto(pp));
    }

    [HttpPost("{id:long}/generate-material-requests")]
    public async Task<IActionResult> GenerateMaterialRequests(long id)
    {
        if (await Denied("UPDATE")) return Forbidden("UPDATE");
        var pp = await db.ProductionPlans.Include(p => p.Items).Include(p => p.SalesOrders)
            .FirstOrDefaultAsync(p => p.Id == id);
        if (pp is null) return NotFound(new ApiError("NOT_FOUND", $"production-plans/{id} không tồn tại"));

        if (!await db.PurchaseRequests.AnyAsync(r => r.ProductionPlanId == id))
        {
            var shortages = await db.PpMaterials.Where(m => m.ProductionPlanId == id && m.ShortageQty > 0).ToListAsync();
            if (shortages.Count > 0)
            {
                db.PurchaseRequests.Add(new PurchaseRequest
                {
                    DocNo = await docNum.NextAsync("PURCHASE_REQUEST"),
                    DocDate = DateOnly.FromDateTime(DateTime.Today),
                    ProductionPlanId = id,
                    RequestType = "PURCHASE",
                    Status = "DRAFT",
                    CreatorId = RbacService.GetUserId(User),
                    Lines = shortages.Select(m => new PurchaseRequestLine { ProductId = m.ProductId, Quantity = m.ShortageQty }).ToList(),
                });
                await db.SaveChangesAsync();
            }
        }

        return Ok(await ToDetailDto(pp));
    }

    [HttpPost("{id:long}/consolidate-to-po")]
    public async Task<IActionResult> ConsolidateToPo(long id, [FromBody] ConsolidateToPoIn body)
    {
        if (await Denied("UPDATE")) return Forbidden("UPDATE");
        var pp = await db.ProductionPlans.FindAsync(id);
        if (pp is null) return NotFound(new ApiError("NOT_FOUND", $"production-plans/{id} không tồn tại"));

        var assignments = body.SupplierAssignments ?? new();
        var prs = await db.PurchaseRequests.Include(r => r.Lines).Where(r => r.ProductionPlanId == id).ToListAsync();
        var materials = await db.PpMaterials.Where(m => m.ProductionPlanId == id).ToDictionaryAsync(m => m.ProductId);

        var groups = new Dictionary<long, List<PurchaseOrderLine>>();
        foreach (var line in prs.SelectMany(r => r.Lines))
        {
            if (!assignments.TryGetValue(line.ProductId, out var supplierId)) continue;
            var rate = materials.TryGetValue(line.ProductId, out var mat) ? (mat.Rate ?? 0) : 0;
            if (!groups.TryGetValue(supplierId, out var lines))
                groups[supplierId] = lines = new();
            lines.Add(new PurchaseOrderLine { ProductId = line.ProductId, Quantity = line.Quantity, UnitPrice = rate, VatPct = 10 });
        }

        var requestId = prs.FirstOrDefault()?.Id;
        var pos = new List<PurchaseOrder>();
        foreach (var (supplierId, lines) in groups)
        {
            var po = new PurchaseOrder
            {
                DocNo = await docNum.NextAsync("PURCHASE_ORDER"),
                OrderDate = DateOnly.FromDateTime(DateTime.Today),
                PartnerId = supplierId,
                RequestId = requestId,
                Status = "DRAFT",
                CreatorId = RbacService.GetUserId(User),
                Lines = lines,
            };
            db.PurchaseOrders.Add(po);
            pos.Add(po);
        }
        await db.SaveChangesAsync();

        var productIds = pos.SelectMany(p => p.Lines).Select(l => l.ProductId).Distinct().ToList();
        var products = await db.Products.Where(p => productIds.Contains(p.Id)).ToDictionaryAsync(p => p.Id, p => p.Name);
        var partnerIds = pos.Select(p => p.PartnerId).Distinct().ToList();
        var partners = await db.Partners.Where(p => partnerIds.Contains(p.Id)).ToDictionaryAsync(p => p.Id, p => p.ShortName);

        var dtos = pos.Select(po => new PpConsolidatedPoDto(
            po.PartnerId, partners.GetValueOrDefault(po.PartnerId, ""),
            po.Lines.Sum(l => l.Quantity * l.UnitPrice),
            po.Lines.Select(l => new PpConsolidatedPoItemDto(
                l.ProductId, products.GetValueOrDefault(l.ProductId, ""), l.Quantity, l.UnitPrice, l.Quantity * l.UnitPrice)).ToList()
        )).ToList();

        return Ok(new ConsolidateToPoOut(dtos));
    }

    // ----- helpers -----

    private async Task<long?> GetSuggestedSupplierId(long productId)
    {
        var line = await db.PurchaseOrderLines.Where(l => l.ProductId == productId)
            .OrderByDescending(l => l.Id).FirstOrDefaultAsync();
        if (line is null) return null;
        var order = await db.PurchaseOrders.FindAsync(line.OrderId);
        return order?.PartnerId;
    }

    /// <summary>
    /// Lệnh sản xuất sinh từ Production Plan dùng 1 kho duy nhất cho nguồn/WIP/thành phẩm:
    /// ưu tiên kho giao hàng của SO đầu tiên trong kế hoạch, fallback kho có id nhỏ nhất.
    /// </summary>
    private async Task<long?> ResolveDefaultWarehouseId(ProductionPlan pp)
    {
        var soIds = pp.SalesOrders.Select(s => s.SalesOrderId).ToList();
        if (soIds.Count > 0)
        {
            var whId = await db.SalesOrders.Where(s => soIds.Contains(s.Id) && s.WarehouseId != null)
                .Select(s => s.WarehouseId).FirstOrDefaultAsync();
            if (whId is long w) return w;
        }

        var first = await db.Warehouses.OrderBy(w => w.Id).Select(w => (long?)w.Id).FirstOrDefaultAsync();
        return first;
    }

    private async Task<ProductionPlanDetailOut> ToDetailDto(ProductionPlan pp)
    {
        var soIds = pp.SalesOrders.Select(s => s.SalesOrderId).ToList();
        var sos = await db.SalesOrders.Where(s => soIds.Contains(s.Id)).ToListAsync();

        var materials = await db.PpMaterials.Where(m => m.ProductionPlanId == pp.Id).ToListAsync();

        var productIds = new HashSet<long>();
        foreach (var i in pp.Items) productIds.Add(i.ProductId);
        foreach (var m in materials) productIds.Add(m.ProductId);
        var products = await db.Products.Where(p => productIds.Contains(p.Id)).ToDictionaryAsync(p => p.Id, p => p);

        var boms = await db.Boms.Where(b => productIds.Contains(b.ProductId) && b.IsDefault)
            .ToDictionaryAsync(b => b.ProductId, b => b.DocNo);

        var soLines = soIds.Count > 0
            ? await db.SalesOrderLines.Where(l => soIds.Contains(l.OrderId)).ToListAsync()
            : new List<SalesOrderLine>();
        var fromSoIds = soLines.GroupBy(l => l.ProductId)
            .ToDictionary(g => g.Key, g => g.Select(l => l.OrderId).Distinct().ToList());

        var partnerIds = sos.Select(s => s.PartnerId)
            .Concat(materials.Where(m => m.SuggestedSupplierId != null).Select(m => m.SuggestedSupplierId!.Value))
            .Distinct().ToList();
        var partners = await db.Partners.Where(p => partnerIds.Contains(p.Id)).ToDictionaryAsync(p => p.Id, p => p.ShortName);

        var soDtos = sos.Select(s => new PpSalesOrderDto(
            s.Id, s.DocNo, partners.GetValueOrDefault(s.PartnerId, ""), s.DeliveryDatePlan, s.Status)).ToList();

        var productDtos = pp.Items.Select(i =>
        {
            var p = products.GetValueOrDefault(i.ProductId);
            return new PpProductDto(i.ProductId, p?.Code ?? "", p?.Name ?? "",
                boms.GetValueOrDefault(i.ProductId), i.PlannedQty, fromSoIds.GetValueOrDefault(i.ProductId, new()));
        }).ToList();

        var materialDtos = materials.Select(m =>
        {
            var p = products.GetValueOrDefault(m.ProductId);
            return new PpMaterialDto(m.ProductId, p?.Code ?? "", p?.Name ?? "",
                m.RequiredQty, m.OnHand, m.Ordered, m.Reserved, m.ProjectedQty, m.ShortageQty, m.ShortageQty > 0,
                m.SuggestedSupplierId, m.SuggestedSupplierId is long sid ? partners.GetValueOrDefault(sid) : null);
        }).ToList();

        var wos = await db.WorkOrders.Where(w => w.ProductionPlanId == pp.Id).ToListAsync();
        var woProducts = await db.Products.Where(p => wos.Select(w => w.ProductId).Contains(p.Id))
            .ToDictionaryAsync(p => p.Id, p => p.Name);
        var generatedWos = wos.Select(w => new PpGeneratedWoDto(w.Id, w.DocNo, woProducts.GetValueOrDefault(w.ProductId, ""), w.Qty)).ToList();

        var prs = await db.PurchaseRequests.Include(r => r.Lines).Where(r => r.ProductionPlanId == pp.Id).ToListAsync();
        var mrProductIds = prs.SelectMany(r => r.Lines).Select(l => l.ProductId).Distinct().ToList();
        var mrProducts = await db.Products.Where(p => mrProductIds.Contains(p.Id)).ToDictionaryAsync(p => p.Id, p => p.Name);
        var supplierByProduct = materials.ToDictionary(m => m.ProductId, m => m.SuggestedSupplierId);
        var generatedMrs = prs.SelectMany(r => r.Lines.Select(l => new PpGeneratedMrDto(
            r.Id, r.DocNo, mrProducts.GetValueOrDefault(l.ProductId, ""), l.Quantity,
            supplierByProduct.TryGetValue(l.ProductId, out var sid2) && sid2 is long sidv ? partners.GetValueOrDefault(sidv) : null
        ))).ToList();

        var prIds = prs.Select(r => r.Id).ToList();
        var pos = await db.PurchaseOrders.Include(o => o.Lines)
            .Where(o => o.RequestId != null && prIds.Contains(o.RequestId.Value)).ToListAsync();
        var poProductIds = pos.SelectMany(o => o.Lines).Select(l => l.ProductId).Distinct().ToList();
        var poProducts = await db.Products.Where(p => poProductIds.Contains(p.Id)).ToDictionaryAsync(p => p.Id, p => p.Name);
        var consolidatedPos = pos.Select(o => new PpConsolidatedPoDto(
            o.PartnerId, partners.GetValueOrDefault(o.PartnerId, ""),
            o.Lines.Sum(l => l.Quantity * l.UnitPrice),
            o.Lines.Select(l => new PpConsolidatedPoItemDto(
                l.ProductId, poProducts.GetValueOrDefault(l.ProductId, ""), l.Quantity, l.UnitPrice, l.Quantity * l.UnitPrice)).ToList()
        )).ToList();

        return new ProductionPlanDetailOut(pp.Id, pp.DocNo, pp.Status, soDtos, productDtos, materialDtos,
            generatedWos.Count > 0 ? generatedWos : null,
            generatedMrs.Count > 0 ? generatedMrs : null,
            consolidatedPos.Count > 0 ? consolidatedPos : null);
    }
}
