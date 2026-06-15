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
[Route("api/v1/sales/promotional-schemes")]
public class PromotionalSchemesController(ErpDbContext db, RbacService rbac) : ControllerBase
{
    private const string Resource = "promotional-schemes";

    private static PromotionalSchemeOut ToDto(PromotionalScheme s) => new(
        s.Id, s.Code, s.Name, s.ApplyOn, s.ProductGroupId, s.PartnerId,
        s.ValidFrom, s.ValidTo, s.IsActive,
        s.Items.Select(i => new SchemeItemOut(i.Id, i.ProductId)).ToList(),
        s.PriceSlabs.Select(p => new SchemePriceSlabOut(
            p.Id, p.ProductId, p.MinQty, p.MaxQty, p.DiscountPct, p.Rate)).ToList(),
        s.ProductSlabs.Select(p => new SchemeProductSlabOut(
            p.Id, p.ProductId, p.MinQty, p.MaxQty, p.FreeProductId, p.FreeQty, p.FreeRate)).ToList());

    private async Task<bool> Denied(string action) =>
        !await rbac.HasPermissionAsync(User, "CATALOG", Resource, action);

    private ObjectResult Forbidden(string action) =>
        StatusCode(403, new ApiError("WF_NO_PERMISSION", $"Thiếu quyền {action} trên CATALOG:{Resource}"));

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] int page = 1, [FromQuery] int size = 50)
    {
        if (await Denied("VIEW")) return Forbidden("VIEW");
        var q = db.PromotionalSchemes
            .Include(x => x.Items).Include(x => x.PriceSlabs).Include(x => x.ProductSlabs)
            .AsNoTracking().AsQueryable();
        var total = await q.LongCountAsync();
        var items = await q.OrderByDescending(x => x.Id)
            .Skip((Math.Max(1, page) - 1) * size).Take(Math.Clamp(size, 1, 200)).ToListAsync();
        return Ok(new PageResult<PromotionalSchemeOut>(items.Select(ToDto).ToList(), total, page, size));
    }

    [HttpGet("{id:long}")]
    public async Task<IActionResult> Get(long id)
    {
        if (await Denied("VIEW")) return Forbidden("VIEW");
        var s = await db.PromotionalSchemes
            .Include(x => x.Items).Include(x => x.PriceSlabs).Include(x => x.ProductSlabs)
            .FirstOrDefaultAsync(x => x.Id == id);
        return s is null
            ? NotFound(new ApiError("NOT_FOUND", $"Chương trình khuyến mãi {id} không tồn tại"))
            : Ok(ToDto(s));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] PromotionalSchemeCreate body)
    {
        if (await Denied("CREATE")) return Forbidden("CREATE");
        var scheme = new PromotionalScheme
        {
            Code = body.Code,
            Name = body.Name,
            ApplyOn = body.ApplyOn,
            ProductGroupId = body.ProductGroupId,
            PartnerId = body.PartnerId,
            ValidFrom = body.ValidFrom,
            ValidTo = body.ValidTo,
            Items = (body.Items ?? new()).Select(i => new SchemeItem { ProductId = i.ProductId }).ToList(),
            PriceSlabs = (body.PriceSlabs ?? new()).Select(p => new SchemePriceSlab
            {
                ProductId = p.ProductId, MinQty = p.MinQty, MaxQty = p.MaxQty,
                DiscountPct = p.DiscountPct, Rate = p.Rate,
            }).ToList(),
            ProductSlabs = (body.ProductSlabs ?? new()).Select(p => new SchemeProductSlab
            {
                ProductId = p.ProductId, MinQty = p.MinQty, MaxQty = p.MaxQty,
                FreeProductId = p.FreeProductId, FreeQty = p.FreeQty, FreeRate = p.FreeRate,
            }).ToList(),
        };
        db.PromotionalSchemes.Add(scheme);
        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException e)
        {
            return Conflict(new ApiError("CONFLICT", $"Trùng mã hoặc vi phạm ràng buộc: {e.InnerException?.Message}"));
        }

        db.PricingRules.AddRange(PricingRuleGenerator.BuildRules(scheme));
        await db.SaveChangesAsync();
        return StatusCode(201, ToDto(scheme));
    }

    [HttpPut("{id:long}")]
    public async Task<IActionResult> Update(long id, [FromBody] PromotionalSchemeUpdate body)
    {
        if (await Denied("UPDATE")) return Forbidden("UPDATE");
        var scheme = await db.PromotionalSchemes
            .Include(x => x.Items).Include(x => x.PriceSlabs).Include(x => x.ProductSlabs)
            .FirstOrDefaultAsync(x => x.Id == id);
        if (scheme is null) return NotFound(new ApiError("NOT_FOUND", $"Chương trình khuyến mãi {id} không tồn tại"));

        if (body.Code is not null) scheme.Code = body.Code;
        if (body.Name is not null) scheme.Name = body.Name;
        if (body.ApplyOn is not null) scheme.ApplyOn = body.ApplyOn;
        if (body.ProductGroupId is not null) scheme.ProductGroupId = body.ProductGroupId;
        if (body.PartnerId is not null) scheme.PartnerId = body.PartnerId;
        if (body.ValidFrom is not null) scheme.ValidFrom = body.ValidFrom;
        if (body.ValidTo is not null) scheme.ValidTo = body.ValidTo;
        if (body.IsActive is not null) scheme.IsActive = body.IsActive.Value;

        if (body.Items is not null)
        {
            db.SchemeItems.RemoveRange(scheme.Items);
            scheme.Items = body.Items.Select(i => new SchemeItem { SchemeId = id, ProductId = i.ProductId }).ToList();
        }
        if (body.PriceSlabs is not null)
        {
            db.SchemePriceSlabs.RemoveRange(scheme.PriceSlabs);
            scheme.PriceSlabs = body.PriceSlabs.Select(p => new SchemePriceSlab
            {
                SchemeId = id, ProductId = p.ProductId, MinQty = p.MinQty, MaxQty = p.MaxQty,
                DiscountPct = p.DiscountPct, Rate = p.Rate,
            }).ToList();
        }
        if (body.ProductSlabs is not null)
        {
            db.SchemeProductSlabs.RemoveRange(scheme.ProductSlabs);
            scheme.ProductSlabs = body.ProductSlabs.Select(p => new SchemeProductSlab
            {
                SchemeId = id, ProductId = p.ProductId, MinQty = p.MinQty, MaxQty = p.MaxQty,
                FreeProductId = p.FreeProductId, FreeQty = p.FreeQty, FreeRate = p.FreeRate,
            }).ToList();
        }

        await db.SaveChangesAsync();

        // Vô hiệu rules cũ sinh từ scheme, sinh lại theo cấu hình mới
        var oldRules = await db.PricingRules.Where(r => r.SchemeId == id).ToListAsync();
        foreach (var r in oldRules) r.IsActive = false;
        db.PricingRules.AddRange(PricingRuleGenerator.BuildRules(scheme));
        await db.SaveChangesAsync();

        return Ok(ToDto(scheme));
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Delete(long id)
    {
        if (await Denied("DELETE")) return Forbidden("DELETE");
        var scheme = await db.PromotionalSchemes.FirstOrDefaultAsync(x => x.Id == id);
        if (scheme is null) return NotFound(new ApiError("NOT_FOUND", $"Chương trình khuyến mãi {id} không tồn tại"));
        scheme.IsActive = false;
        var rules = await db.PricingRules.Where(r => r.SchemeId == id).ToListAsync();
        foreach (var r in rules) r.IsActive = false;
        await db.SaveChangesAsync();
        return NoContent();
    }
}

[ApiController]
[Authorize]
[Route("api/v1/sales/coupon-codes")]
public class CouponCodesController(ErpDbContext db, RbacService rbac)
    : CrudControllerBase<CouponCode, CouponCodeOut, CouponCodeCreate, CouponCodeUpdate>(db, rbac)
{
    protected override string Resource => "coupon-codes";
    protected override string[] SearchFields => new[] { "Code" };
}

[ApiController]
[Authorize]
[Route("api/v1/sales/pricing")]
public class PricingController(ErpDbContext db, RbacService rbac, PricingService pricing) : ControllerBase
{
    private const string Resource = "quotations";

    [HttpGet("resolve")]
    public async Task<IActionResult> Resolve(
        [FromQuery] long? partnerId, [FromQuery] long productId, [FromQuery] decimal qty,
        [FromQuery] DateOnly? date, [FromQuery] string? couponCode)
    {
        if (!await rbac.HasPermissionAsync(User, "DOCUMENT", Resource, "VIEW"))
            return StatusCode(403, new ApiError("WF_NO_PERMISSION", $"Thiếu quyền VIEW trên DOCUMENT:{Resource}"));

        try
        {
            var result = await pricing.ResolveAsync(
                partnerId, productId, qty, date ?? DateOnly.FromDateTime(DateTime.Today), couponCode);
            return Ok(result);
        }
        catch (PricingException e)
        {
            return Conflict(new ApiError(e.Code, e.Message));
        }
    }

    /// <summary>Liệt kê pricing_rule (lọc theo scheme) — dùng để tra cứu rule khi tạo coupon code.</summary>
    [HttpGet("rules")]
    public async Task<IActionResult> Rules([FromQuery] long? schemeId)
    {
        if (!await rbac.HasPermissionAsync(User, "DOCUMENT", Resource, "VIEW"))
            return StatusCode(403, new ApiError("WF_NO_PERMISSION", $"Thiếu quyền VIEW trên DOCUMENT:{Resource}"));

        var q = db.PricingRules.AsNoTracking().Where(r => r.IsActive).AsQueryable();
        if (schemeId.HasValue) q = q.Where(r => r.SchemeId == schemeId);
        var rules = await q.OrderBy(r => r.Id).ToListAsync();
        return Ok(rules.Select(r => new PricingRuleOut(
            r.Id, r.RuleSource, r.SchemeId, r.Priority, r.ProductId, r.ProductGroupId, r.PartnerId,
            r.MinQty, r.MaxQty, r.DiscountPct, r.Rate, r.FreeProductId, r.FreeQty, r.FreeRate,
            r.ValidFrom, r.ValidTo, r.IsActive)).ToList());
    }

    /// <summary>Thêm rule giá thủ công (không gắn scheme) — dùng cho chiết khấu riêng theo KH/sản phẩm.</summary>
    [HttpPost("rules")]
    public async Task<IActionResult> CreateRule([FromBody] PricingRuleCreate body)
    {
        if (!await rbac.HasPermissionAsync(User, "DOCUMENT", Resource, "CREATE"))
            return StatusCode(403, new ApiError("WF_NO_PERMISSION", $"Thiếu quyền CREATE trên DOCUMENT:{Resource}"));

        var rule = new PricingRule
        {
            RuleSource = "MANUAL",
            Priority = body.Priority,
            ProductId = body.ProductId,
            ProductGroupId = body.ProductGroupId,
            PartnerId = body.PartnerId,
            MinQty = body.MinQty,
            MaxQty = body.MaxQty,
            DiscountPct = body.DiscountPct,
            Rate = body.Rate,
            FreeProductId = body.FreeProductId,
            FreeQty = body.FreeQty,
            FreeRate = body.FreeRate,
            ValidFrom = body.ValidFrom,
            ValidTo = body.ValidTo,
            IsActive = true,
        };
        db.PricingRules.Add(rule);
        await db.SaveChangesAsync();
        return StatusCode(201, new PricingRuleOut(
            rule.Id, rule.RuleSource, rule.SchemeId, rule.Priority, rule.ProductId, rule.ProductGroupId, rule.PartnerId,
            rule.MinQty, rule.MaxQty, rule.DiscountPct, rule.Rate, rule.FreeProductId, rule.FreeQty, rule.FreeRate,
            rule.ValidFrom, rule.ValidTo, rule.IsActive));
    }
}
