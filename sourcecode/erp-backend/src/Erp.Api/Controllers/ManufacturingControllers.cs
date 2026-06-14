using Erp.Api.Core;
using Erp.Api.Data;
using Erp.Api.Dtos;
using Erp.Api.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Erp.Api.Controllers;

// ===================== Workstations =====================
[ApiController]
[Authorize]
[Route("api/v1/mfg/workstations")]
public class WorkstationsController(ErpDbContext db, RbacService rbac) : ControllerBase
{
    private const string Resource = "workstations";

    private async Task<bool> Denied(string action) =>
        !await rbac.HasPermissionAsync(User, "CATALOG", Resource, action);

    private ObjectResult Forbidden(string action) =>
        StatusCode(403, new ApiError("WF_NO_PERMISSION", $"Thiếu quyền {action} trên CATALOG:{Resource}"));

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] string? q, [FromQuery] int page = 1, [FromQuery] int size = 50)
    {
        if (await Denied("VIEW")) return Forbidden("VIEW");
        page = Math.Max(1, page);
        size = Math.Clamp(size, 1, 500);

        IQueryable<Workstation> query = db.Workstations;
        if (!string.IsNullOrWhiteSpace(q))
            query = query.Where(w => EF.Functions.ILike(w.Name, $"%{q}%"));

        var total = await query.LongCountAsync();
        var items = await query.OrderBy(w => w.Id)
            .Skip((page - 1) * size).Take(size).ToListAsync();

        return Ok(new PageResult<WorkstationOut>(items.Select(ToDto).ToList(), total, page, size));
    }

    [HttpGet("{id:long}")]
    public async Task<IActionResult> Get(long id)
    {
        if (await Denied("VIEW")) return Forbidden("VIEW");
        var e = await db.Workstations.FindAsync(id);
        if (e is null) return NotFound(new ApiError("NOT_FOUND", $"workstations/{id} không tồn tại"));
        return Ok(ToDto(e));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] WorkstationIn body)
    {
        if (await Denied("CREATE")) return Forbidden("CREATE");
        var e = new Workstation
        {
            Code = "WS-TMP",
            Name = body.Name,
            HourlyRate = body.HourlyCost,
            WorkingHoursPerDay = body.WorkingHoursPerDay,
            Description = body.Description,
            IsActive = body.IsActive,
        };
        db.Workstations.Add(e);
        await db.SaveChangesAsync();
        e.Code = $"WS{e.Id}";
        await db.SaveChangesAsync();
        return StatusCode(201, ToDto(e));
    }

    [HttpPut("{id:long}")]
    public async Task<IActionResult> Update(long id, [FromBody] WorkstationIn body)
    {
        if (await Denied("UPDATE")) return Forbidden("UPDATE");
        var e = await db.Workstations.FindAsync(id);
        if (e is null) return NotFound(new ApiError("NOT_FOUND", $"workstations/{id} không tồn tại"));

        e.Name = body.Name;
        e.HourlyRate = body.HourlyCost;
        e.WorkingHoursPerDay = body.WorkingHoursPerDay;
        e.Description = body.Description;
        e.IsActive = body.IsActive;
        await db.SaveChangesAsync();
        return Ok(ToDto(e));
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Delete(long id)
    {
        if (await Denied("DELETE")) return Forbidden("DELETE");
        var e = await db.Workstations.FindAsync(id);
        if (e is null) return NotFound(new ApiError("NOT_FOUND", $"workstations/{id} không tồn tại"));

        e.IsActive = false;
        await db.SaveChangesAsync();
        return NoContent();
    }

    private static WorkstationOut ToDto(Workstation e) => new(
        e.Id, e.Name, e.HourlyRate, e.WorkingHoursPerDay, e.Description, e.IsActive);
}

// ===================== Operations =====================
[ApiController]
[Authorize]
[Route("api/v1/mfg/operations")]
public class OperationsController(ErpDbContext db, RbacService rbac) : ControllerBase
{
    private const string Resource = "operations";

    private async Task<bool> Denied(string action) =>
        !await rbac.HasPermissionAsync(User, "CATALOG", Resource, action);

    private ObjectResult Forbidden(string action) =>
        StatusCode(403, new ApiError("WF_NO_PERMISSION", $"Thiếu quyền {action} trên CATALOG:{Resource}"));

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] string? q, [FromQuery] int page = 1, [FromQuery] int size = 50)
    {
        if (await Denied("VIEW")) return Forbidden("VIEW");
        page = Math.Max(1, page);
        size = Math.Clamp(size, 1, 500);

        IQueryable<Operation> query = db.Operations;
        if (!string.IsNullOrWhiteSpace(q))
            query = query.Where(o => EF.Functions.ILike(o.Name, $"%{q}%"));

        var total = await query.LongCountAsync();
        var items = await query.OrderBy(o => o.Id)
            .Skip((page - 1) * size).Take(size).ToListAsync();

        var wsIds = items.Where(o => o.DefaultWorkstationId != null)
            .Select(o => o.DefaultWorkstationId!.Value).Distinct().ToList();
        var wsNames = await db.Workstations.Where(w => wsIds.Contains(w.Id))
            .ToDictionaryAsync(w => w.Id, w => w.Name);

        return Ok(new PageResult<OperationOut>(
            items.Select(o => ToDto(o, o.DefaultWorkstationId is long wsId ? wsNames.GetValueOrDefault(wsId) : null)).ToList(),
            total, page, size));
    }

    [HttpGet("{id:long}")]
    public async Task<IActionResult> Get(long id)
    {
        if (await Denied("VIEW")) return Forbidden("VIEW");
        var e = await db.Operations.FindAsync(id);
        if (e is null) return NotFound(new ApiError("NOT_FOUND", $"operations/{id} không tồn tại"));
        return Ok(ToDto(e, await GetWorkstationName(e.DefaultWorkstationId)));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] OperationIn body)
    {
        if (await Denied("CREATE")) return Forbidden("CREATE");
        var e = new Operation
        {
            Code = "OP-TMP",
            Name = body.Name,
            DefaultWorkstationId = body.DefaultWorkstationId,
            StandardTimeMinutes = body.StandardTimeMinutes,
            Description = body.Description,
            IsActive = body.IsActive,
        };
        db.Operations.Add(e);
        await db.SaveChangesAsync();
        e.Code = $"OP{e.Id}";
        await db.SaveChangesAsync();
        return StatusCode(201, ToDto(e, await GetWorkstationName(e.DefaultWorkstationId)));
    }

    [HttpPut("{id:long}")]
    public async Task<IActionResult> Update(long id, [FromBody] OperationIn body)
    {
        if (await Denied("UPDATE")) return Forbidden("UPDATE");
        var e = await db.Operations.FindAsync(id);
        if (e is null) return NotFound(new ApiError("NOT_FOUND", $"operations/{id} không tồn tại"));

        e.Name = body.Name;
        e.DefaultWorkstationId = body.DefaultWorkstationId;
        e.StandardTimeMinutes = body.StandardTimeMinutes;
        e.Description = body.Description;
        e.IsActive = body.IsActive;
        await db.SaveChangesAsync();
        return Ok(ToDto(e, await GetWorkstationName(e.DefaultWorkstationId)));
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Delete(long id)
    {
        if (await Denied("DELETE")) return Forbidden("DELETE");
        var e = await db.Operations.FindAsync(id);
        if (e is null) return NotFound(new ApiError("NOT_FOUND", $"operations/{id} không tồn tại"));

        e.IsActive = false;
        await db.SaveChangesAsync();
        return NoContent();
    }

    private async Task<string?> GetWorkstationName(long? workstationId) =>
        workstationId is null ? null : (await db.Workstations.FindAsync(workstationId.Value))?.Name;

    private static OperationOut ToDto(Operation e, string? workstationName) => new(
        e.Id, e.Name, e.DefaultWorkstationId, workstationName, e.StandardTimeMinutes, e.Description, e.IsActive);
}
