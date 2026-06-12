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
[Route("api/v1/sales/price-lists")]
public class PriceListsController(ErpDbContext db, RbacService rbac) : ControllerBase
{
    private const string Resource = "price-lists";

    private static PriceListOut ToDto(PriceList p) => new(
        p.Id, p.Code, p.Name, p.ValidFrom, p.ValidTo, p.IsActive,
        p.Items.Select(i => new PriceListItemOut(i.Id, i.ProductId, i.Price)).ToList());

    private async Task<bool> Denied(string action) =>
        !await rbac.HasPermissionAsync(User, "CATALOG", Resource, action);

    private ObjectResult Forbidden(string action) =>
        StatusCode(403, new ApiError("WF_NO_PERMISSION", $"Thiếu quyền {action} trên CATALOG:{Resource}"));

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] int page = 1, [FromQuery] int size = 50)
    {
        if (await Denied("VIEW")) return Forbidden("VIEW");
        var q = db.PriceLists.Include(x => x.Items).AsNoTracking().AsQueryable();
        var total = await q.LongCountAsync();
        var items = await q.OrderByDescending(x => x.Id)
            .Skip((Math.Max(1, page) - 1) * size).Take(Math.Clamp(size, 1, 200)).ToListAsync();
        return Ok(new PageResult<PriceListOut>(items.Select(ToDto).ToList(), total, page, size));
    }

    [HttpGet("{id:long}")]
    public async Task<IActionResult> Get(long id)
    {
        if (await Denied("VIEW")) return Forbidden("VIEW");
        var p = await db.PriceLists.Include(x => x.Items).FirstOrDefaultAsync(x => x.Id == id);
        return p is null
            ? NotFound(new ApiError("NOT_FOUND", $"Bảng giá {id} không tồn tại"))
            : Ok(ToDto(p));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] PriceListCreate body)
    {
        if (await Denied("CREATE")) return Forbidden("CREATE");
        var p = new PriceList
        {
            Code = body.Code,
            Name = body.Name,
            ValidFrom = body.ValidFrom,
            ValidTo = body.ValidTo,
            Items = (body.Items ?? new()).Select(i => new PriceListItem
            {
                ProductId = i.ProductId, Price = i.Price,
            }).ToList(),
        };
        db.PriceLists.Add(p);
        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException e)
        {
            return Conflict(new ApiError("CONFLICT", $"Trùng mã hoặc vi phạm ràng buộc: {e.InnerException?.Message}"));
        }
        return StatusCode(201, ToDto(p));
    }

    [HttpPut("{id:long}")]
    public async Task<IActionResult> Update(long id, [FromBody] PriceListUpdate body)
    {
        if (await Denied("UPDATE")) return Forbidden("UPDATE");
        var p = await db.PriceLists.Include(x => x.Items).FirstOrDefaultAsync(x => x.Id == id);
        if (p is null) return NotFound(new ApiError("NOT_FOUND", $"Bảng giá {id} không tồn tại"));
        Mapper.Apply(body, p, skipNulls: true);
        await db.SaveChangesAsync();
        return Ok(ToDto(p));
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Delete(long id)
    {
        if (await Denied("DELETE")) return Forbidden("DELETE");
        var p = await db.PriceLists.FirstOrDefaultAsync(x => x.Id == id);
        if (p is null) return NotFound(new ApiError("NOT_FOUND", $"Bảng giá {id} không tồn tại"));
        p.IsActive = false;
        await db.SaveChangesAsync();
        return NoContent();
    }

    // ----- Items -----
    [HttpPost("{id:long}/items")]
    public async Task<IActionResult> AddItem(long id, [FromBody] PriceListItemIn body)
    {
        if (await Denied("UPDATE")) return Forbidden("UPDATE");
        var p = await db.PriceLists.FirstOrDefaultAsync(x => x.Id == id);
        if (p is null) return NotFound(new ApiError("NOT_FOUND", $"Bảng giá {id} không tồn tại"));
        var item = new PriceListItem { PriceListId = id, ProductId = body.ProductId, Price = body.Price };
        db.PriceListItems.Add(item);
        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException e)
        {
            return Conflict(new ApiError("CONFLICT", $"Trùng mặt hàng hoặc vi phạm ràng buộc: {e.InnerException?.Message}"));
        }
        return StatusCode(201, new PriceListItemOut(item.Id, item.ProductId, item.Price));
    }

    [HttpDelete("{id:long}/items/{itemId:long}")]
    public async Task<IActionResult> DeleteItem(long id, long itemId)
    {
        if (await Denied("UPDATE")) return Forbidden("UPDATE");
        var item = await db.PriceListItems.FirstOrDefaultAsync(x => x.Id == itemId && x.PriceListId == id);
        if (item is null) return NotFound(new ApiError("NOT_FOUND", "Mặt hàng không tồn tại"));
        db.PriceListItems.Remove(item);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
