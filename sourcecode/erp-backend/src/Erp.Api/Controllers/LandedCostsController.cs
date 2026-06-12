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
[Route("api/v1/purchasing/landed-costs")]
public class LandedCostsController(
    ErpDbContext db, RbacService rbac, WorkflowService wf, DocNumberingService numbering)
    : ControllerBase
{
    private const string Resource = "landed-costs";

    private static LandedCostOut ToDto(LandedCostVoucher v) => new(
        v.Id, v.DocNo, v.DocDate, v.AllocationMethod,
        v.Status, v.Note, v.CreatorId,
        v.Lines.Select(l => new LandedCostLineOut(l.Id, l.CostTypeId, l.ServiceSupplierId, l.Amount, l.Note)).ToList(),
        v.Receipts.Select(r => new LandedCostReceiptOut(r.Id, r.ReceiptDocId)).ToList());

    private async Task<bool> Denied(string action) =>
        !await rbac.HasPermissionAsync(User, "DOCUMENT", Resource, action);

    private ObjectResult Forbidden(string action) =>
        StatusCode(403, new ApiError("WF_NO_PERMISSION", $"Thiếu quyền {action} trên DOCUMENT:{Resource}"));

    [HttpGet]
    public async Task<IActionResult> List(
        [FromQuery] string? status, [FromQuery] int page = 1, [FromQuery] int size = 50)
    {
        if (await Denied("VIEW")) return Forbidden("VIEW");
        var q = db.LandedCostVouchers.Include(x => x.Lines).Include(x => x.Receipts)
            .AsNoTracking().AsQueryable();
        if (!string.IsNullOrEmpty(status)) q = q.Where(x => x.Status == status);
        var total = await q.LongCountAsync();
        var items = await q.OrderByDescending(x => x.Id)
            .Skip((Math.Max(1, page) - 1) * size).Take(Math.Clamp(size, 1, 200)).ToListAsync();
        return Ok(new PageResult<LandedCostOut>(items.Select(ToDto).ToList(), total, page, size));
    }

    [HttpGet("{id:long}")]
    public async Task<IActionResult> Get(long id)
    {
        if (await Denied("VIEW")) return Forbidden("VIEW");
        var v = await db.LandedCostVouchers.Include(x => x.Lines).Include(x => x.Receipts)
            .FirstOrDefaultAsync(x => x.Id == id);
        return v is null
            ? NotFound(new ApiError("NOT_FOUND", $"Phiếu phân bổ chi phí {id} không tồn tại"))
            : Ok(ToDto(v));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] LandedCostCreate body)
    {
        if (await Denied("CREATE")) return Forbidden("CREATE");
        var v = new LandedCostVoucher
        {
            DocNo = await numbering.NextAsync("LANDED_COST"),
            DocDate = DateOnly.FromDateTime(DateTime.Today),
            AllocationMethod = body.AllocationMethod,
            Note = body.Note,
            CreatorId = RbacService.GetUserId(User),
            Lines = (body.Lines ?? new()).Select(l => new LandedCostVoucherLine
            {
                CostTypeId = l.CostTypeId, ServiceSupplierId = l.ServiceSupplierId,
                Amount = l.Amount, Note = l.Note,
            }).ToList(),
            Receipts = (body.Receipts ?? new()).Select(r => new LandedCostReceipt
            {
                ReceiptDocId = r.ReceiptDocId,
            }).ToList(),
        };
        db.LandedCostVouchers.Add(v);
        await db.SaveChangesAsync();
        return StatusCode(201, ToDto(v));
    }

    [HttpPut("{id:long}")]
    public async Task<IActionResult> Update(long id, [FromBody] LandedCostUpdate body)
    {
        if (await Denied("UPDATE")) return Forbidden("UPDATE");
        var v = await db.LandedCostVouchers.FirstOrDefaultAsync(x => x.Id == id);
        if (v is null) return NotFound(new ApiError("NOT_FOUND", $"Phiếu phân bổ chi phí {id} không tồn tại"));
        if (v.Status != "DRAFT")
            return Conflict(new ApiError("WF_LOCKED", $"Trạng thái {v.Status}, không sửa được"));
        Mapper.Apply(body, v, skipNulls: true);
        await db.SaveChangesAsync();
        return Ok(ToDto(v));
    }

    // ----- Lines -----
    [HttpPost("{id:long}/lines")]
    public async Task<IActionResult> AddLine(long id, [FromBody] LandedCostLineIn body)
    {
        if (await Denied("UPDATE")) return Forbidden("UPDATE");
        var v = await db.LandedCostVouchers.FirstOrDefaultAsync(x => x.Id == id);
        if (v is null) return NotFound(new ApiError("NOT_FOUND", $"Phiếu {id} không tồn tại"));
        if (v.Status != "DRAFT")
            return Conflict(new ApiError("WF_LOCKED", $"Trạng thái {v.Status}, không sửa được"));
        var line = new LandedCostVoucherLine
        {
            VoucherId = id, CostTypeId = body.CostTypeId,
            ServiceSupplierId = body.ServiceSupplierId, Amount = body.Amount, Note = body.Note,
        };
        db.LandedCostVoucherLines.Add(line);
        await db.SaveChangesAsync();
        return StatusCode(201, new LandedCostLineOut(line.Id, line.CostTypeId, line.ServiceSupplierId, line.Amount, line.Note));
    }

    [HttpDelete("{id:long}/lines/{lineId:long}")]
    public async Task<IActionResult> DeleteLine(long id, long lineId)
    {
        if (await Denied("UPDATE")) return Forbidden("UPDATE");
        var line = await db.LandedCostVoucherLines.FirstOrDefaultAsync(x => x.Id == lineId && x.VoucherId == id);
        if (line is null) return NotFound(new ApiError("NOT_FOUND", "Dòng không tồn tại"));
        db.LandedCostVoucherLines.Remove(line);
        await db.SaveChangesAsync();
        return NoContent();
    }

    // ----- Receipts -----
    [HttpPost("{id:long}/receipts")]
    public async Task<IActionResult> AddReceipt(long id, [FromBody] LandedCostReceiptIn body)
    {
        if (await Denied("UPDATE")) return Forbidden("UPDATE");
        var v = await db.LandedCostVouchers.FirstOrDefaultAsync(x => x.Id == id);
        if (v is null) return NotFound(new ApiError("NOT_FOUND", $"Phiếu {id} không tồn tại"));
        if (v.Status != "DRAFT")
            return Conflict(new ApiError("WF_LOCKED", $"Trạng thái {v.Status}, không sửa được"));
        var r = new LandedCostReceipt { VoucherId = id, ReceiptDocId = body.ReceiptDocId };
        db.LandedCostReceipts.Add(r);
        await db.SaveChangesAsync();
        return StatusCode(201, new LandedCostReceiptOut(r.Id, r.ReceiptDocId));
    }

    [HttpDelete("{id:long}/receipts/{receiptId:long}")]
    public async Task<IActionResult> DeleteReceipt(long id, long receiptId)
    {
        if (await Denied("UPDATE")) return Forbidden("UPDATE");
        var r = await db.LandedCostReceipts.FirstOrDefaultAsync(x => x.Id == receiptId && x.VoucherId == id);
        if (r is null) return NotFound(new ApiError("NOT_FOUND", "Phiếu nhập không tồn tại"));
        db.LandedCostReceipts.Remove(r);
        await db.SaveChangesAsync();
        return NoContent();
    }

    // ----- Workflow actions -----
    [HttpPost("{id:long}/actions/{actionName}")]
    public async Task<IActionResult> Action(long id, string actionName, [FromBody] WfActionRequest? body)
    {
        var v = await db.LandedCostVouchers
            .Include(x => x.Lines).Include(x => x.Receipts)
            .FirstOrDefaultAsync(x => x.Id == id);
        if (v is null) return NotFound(new ApiError("NOT_FOUND", $"Phiếu phân bổ chi phí {id} không tồn tại"));
        try
        {
            v.Status = await wf.TransitionAsync(User, Resource, id, v.Status, actionName, body?.Reason);
        }
        catch (WorkflowException e)
        {
            return e.Code == "WF_NO_PERMISSION"
                ? StatusCode(403, new ApiError(e.Code, e.Message))
                : Conflict(new ApiError(e.Code, e.Message));
        }

        // On submit: allocate landed cost to stock_doc_line
        if (v.Status == "SUBMITTED")
        {
            await AllocateLandedCost(v);
        }

        if (body?.Reason is not null) v.Note = body.Reason;
        await db.SaveChangesAsync();
        return Ok(ToDto(v));
    }

    /// <summary>
    /// Phân bổ chi phí theo phương pháp (QTY hoặc AMOUNT) vào stock_doc_line.landed_cost.
    /// </summary>
    private async Task AllocateLandedCost(LandedCostVoucher v)
    {
        var totalCost = v.Lines.Sum(l => l.Amount);
        if (totalCost == 0) return;

        // Get all receipt doc lines
        var receiptDocIds = v.Receipts.Select(r => r.ReceiptDocId).ToList();
        var docLines = await db.StockDocLines
            .Where(l => receiptDocIds.Contains(l.DocId))
            .ToListAsync();

        if (docLines.Count == 0) return;

        decimal totalBase;
        if (v.AllocationMethod == "QTY")
        {
            totalBase = docLines.Sum(l => l.ActualQty ?? l.RequestedQty);
            if (totalBase == 0) return;
            foreach (var line in docLines)
            {
                var qty = line.ActualQty ?? line.RequestedQty;
                line.LandedCost += totalCost * (qty / totalBase);
            }
        }
        else // AMOUNT
        {
            totalBase = docLines.Sum(l => (l.ActualQty ?? l.RequestedQty) * (l.UnitPrice ?? 0));
            if (totalBase == 0) return;
            foreach (var line in docLines)
            {
                var amt = (line.ActualQty ?? line.RequestedQty) * (line.UnitPrice ?? 0);
                line.LandedCost += totalCost * (amt / totalBase);
            }
        }
    }
}