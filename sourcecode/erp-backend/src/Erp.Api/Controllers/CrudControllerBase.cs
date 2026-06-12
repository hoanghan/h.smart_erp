using Erp.Api.Core;
using Erp.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Erp.Api.Controllers;

/// <summary>
/// CRUD chuẩn cho danh mục: list (phân trang + tìm kiếm), get, create, update, delete.
/// RBAC: subject_type=CATALOG, subject_code=Resource. Soft-delete nếu entity có IsActive.
/// </summary>
[ApiController]
[Authorize]
public abstract class CrudControllerBase<TEntity, TOut, TCreate, TUpdate>(
    ErpDbContext db, RbacService rbac) : ControllerBase
    where TEntity : class, new()
{
    protected readonly ErpDbContext Db = db;

    /// <summary>subject_code dùng kiểm tra quyền, vd "uoms".</summary>
    protected abstract string Resource { get; }

    /// <summary>Các cột tìm kiếm ILIKE theo ?q=</summary>
    protected virtual string[] SearchFields => new[] { "Code", "Name" };

    protected async Task<bool> Denied(string action) =>
        !await rbac.HasPermissionAsync(User, "CATALOG", Resource, action);

    protected ObjectResult Forbidden(string action) =>
        StatusCode(403, new ApiError("WF_NO_PERMISSION",
            $"Thiếu quyền {action} trên CATALOG:{Resource}"));

    [HttpGet]
    public virtual async Task<IActionResult> List(
        [FromQuery] string? q, [FromQuery] int page = 1, [FromQuery] int size = 50)
    {
        if (await Denied("VIEW")) return Forbidden("VIEW");
        page = Math.Max(1, page);
        size = Math.Clamp(size, 1, 500);

        IQueryable<TEntity> query = Db.Set<TEntity>();
        if (!string.IsNullOrWhiteSpace(q))
            query = ApplySearch(query, q.Trim());

        var total = await query.LongCountAsync();
        var items = await query
            .OrderBy(e => EF.Property<long>(e, "Id"))
            .Skip((page - 1) * size).Take(size)
            .ToListAsync();

        return Ok(new PageResult<TOut>(
            items.Select(Mapper.ToDto<TOut>).ToList(), total, page, size));
    }

    [HttpGet("{id:long}")]
    public virtual async Task<IActionResult> Get(long id)
    {
        if (await Denied("VIEW")) return Forbidden("VIEW");
        var entity = await Db.Set<TEntity>().FindAsync(id);
        if (entity is null) return NotFound(new ApiError("NOT_FOUND", $"{Resource}/{id} không tồn tại"));
        return Ok(Mapper.ToDto<TOut>(entity));
    }

    [HttpPost]
    public virtual async Task<IActionResult> Create([FromBody] TCreate body)
    {
        if (await Denied("CREATE")) return Forbidden("CREATE");
        var entity = new TEntity();
        Mapper.Apply(body!, entity, skipNulls: false);
        Db.Set<TEntity>().Add(entity);
        try
        {
            await Db.SaveChangesAsync();
        }
        catch (DbUpdateException e)
        {
            return Conflict(new ApiError("CONFLICT", $"Trùng mã hoặc vi phạm ràng buộc: {e.InnerException?.Message}"));
        }
        return StatusCode(201, Mapper.ToDto<TOut>(entity));
    }

    [HttpPut("{id:long}")]
    public virtual async Task<IActionResult> Update(long id, [FromBody] TUpdate body)
    {
        if (await Denied("UPDATE")) return Forbidden("UPDATE");
        var entity = await Db.Set<TEntity>().FindAsync(id);
        if (entity is null) return NotFound(new ApiError("NOT_FOUND", $"{Resource}/{id} không tồn tại"));
        Mapper.Apply(body!, entity, skipNulls: true);
        try
        {
            await Db.SaveChangesAsync();
        }
        catch (DbUpdateException e)
        {
            return Conflict(new ApiError("CONFLICT", $"Vi phạm ràng buộc: {e.InnerException?.Message}"));
        }
        return Ok(Mapper.ToDto<TOut>(entity));
    }

    [HttpDelete("{id:long}")]
    public virtual async Task<IActionResult> Delete(long id)
    {
        if (await Denied("DELETE")) return Forbidden("DELETE");
        var entity = await Db.Set<TEntity>().FindAsync(id);
        if (entity is null) return NotFound(new ApiError("NOT_FOUND", $"{Resource}/{id} không tồn tại"));

        var isActiveProp = typeof(TEntity).GetProperty("IsActive");
        if (isActiveProp is not null)
        {
            isActiveProp.SetValue(entity, false);   // soft-delete
            await Db.SaveChangesAsync();
        }
        else
        {
            Db.Set<TEntity>().Remove(entity);
            try
            {
                await Db.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                return Conflict(new ApiError("IN_USE", "Đang được tham chiếu, không thể xóa"));
            }
        }
        return NoContent();
    }

    private IQueryable<TEntity> ApplySearch(IQueryable<TEntity> query, string q)
    {
        // Ghép biểu thức: field1 ILIKE %q% OR field2 ILIKE %q% ...
        var pattern = $"%{q}%";
        var param = System.Linq.Expressions.Expression.Parameter(typeof(TEntity), "e");
        System.Linq.Expressions.Expression? body = null;
        var ilike = typeof(NpgsqlDbFunctionsExtensions).GetMethod(
            nameof(NpgsqlDbFunctionsExtensions.ILike),
            new[] { typeof(DbFunctions), typeof(string), typeof(string) })!;

        foreach (var field in SearchFields)
        {
            var prop = typeof(TEntity).GetProperty(field);
            if (prop is null || prop.PropertyType != typeof(string)) continue;
            var call = System.Linq.Expressions.Expression.Call(
                ilike,
                System.Linq.Expressions.Expression.Constant(EF.Functions),
                System.Linq.Expressions.Expression.Property(param, prop),
                System.Linq.Expressions.Expression.Constant(pattern));
            body = body is null ? call : System.Linq.Expressions.Expression.OrElse(body, call);
        }

        if (body is null) return query;
        var lambda = System.Linq.Expressions.Expression
            .Lambda<Func<TEntity, bool>>(body, param);
        return query.Where(lambda);
    }
}
