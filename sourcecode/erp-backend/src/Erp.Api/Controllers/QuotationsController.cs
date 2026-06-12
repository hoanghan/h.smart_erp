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
[Route("api/v1/sales/quotations")]
public class QuotationsController(
    ErpDbContext db, RbacService rbac, WorkflowService wf, DocNumberingService numbering, PricingService pricing)
    : ControllerBase
{
    private const string Resource = "quotations";

    private static QuotationOut ToDto(Quotation q) => new(
        q.Id, q.DocNo, q.DocDate, q.PartnerId, q.OrderType,
        q.ValidTill, q.PriceListId, q.TaxTemplateId,
        q.RequestDeliveryDate, q.ValidityDays, q.DeliveryLead,
        q.RequesterId, q.CreatorId, q.ApproverId, q.ApprovedAt,
        q.PaymentMethodId, q.DeliveryMethodId, q.Competitor, q.Terms, q.Note,
        q.Status, q.StatusReason, q.LostReasonIds,
        q.Lines.Select(l => new QuotationLineOut(
            l.Id, l.ProductId, l.ProjectHouse, l.Quantity, l.VatPct,
            l.Rate, l.DiscountPct, l.Amount, l.OrderedQty, l.Note)).ToList());

    private static QuotationLineOut ToLineDto(QuotationLine l) => new(
        l.Id, l.ProductId, l.ProjectHouse, l.Quantity, l.VatPct,
        l.Rate, l.DiscountPct, l.Amount, l.OrderedQty, l.Note);

    private async Task<bool> Denied(string action) =>
        !await rbac.HasPermissionAsync(User, "DOCUMENT", Resource, action);

    private ObjectResult Forbidden(string action) =>
        StatusCode(403, new ApiError("WF_NO_PERMISSION", $"Thiếu quyền {action} trên DOCUMENT:{Resource}"));

    [HttpGet]
    public async Task<IActionResult> List(
        [FromQuery] string? status, [FromQuery] long? partnerId,
        [FromQuery] int page = 1, [FromQuery] int size = 50)
    {
        if (await Denied("VIEW")) return Forbidden("VIEW");
        var q = db.Quotations.Include(x => x.Lines).AsNoTracking().AsQueryable();
        if (!string.IsNullOrEmpty(status)) q = q.Where(x => x.Status == status);
        if (partnerId.HasValue) q = q.Where(x => x.PartnerId == partnerId);
        var total = await q.LongCountAsync();
        var items = await q.OrderByDescending(x => x.Id)
            .Skip((Math.Max(1, page) - 1) * size).Take(Math.Clamp(size, 1, 200)).ToListAsync();
        return Ok(new PageResult<QuotationOut>(items.Select(ToDto).ToList(), total, page, size));
    }

    [HttpGet("{id:long}")]
    public async Task<IActionResult> Get(long id)
    {
        if (await Denied("VIEW")) return Forbidden("VIEW");
        var q = await db.Quotations.Include(x => x.Lines).FirstOrDefaultAsync(x => x.Id == id);
        return q is null
            ? NotFound(new ApiError("NOT_FOUND", $"Báo giá {id} không tồn tại"))
            : Ok(ToDto(q));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] QuotationCreate body)
    {
        if (await Denied("CREATE")) return Forbidden("CREATE");

        await using var tx = await db.Database.BeginTransactionAsync();
        var today = DateOnly.FromDateTime(DateTime.Today);
        var q = new Quotation
        {
            DocNo = await numbering.NextAsync("QUOTATION"),
            DocDate = today,
            PartnerId = body.PartnerId,
            OrderType = body.OrderType,
            ValidTill = body.ValidTill ?? today.AddDays(body.ValidityDays ?? 2),
            PriceListId = body.PriceListId,
            TaxTemplateId = body.TaxTemplateId,
            RequestDeliveryDate = body.RequestDeliveryDate,
            ValidityDays = body.ValidityDays,
            DeliveryLead = body.DeliveryLead,
            RequesterId = body.RequesterId,
            RequesterDeptId = body.RequesterDeptId,
            ContactId = body.ContactId,
            DeliveryAddrId = body.DeliveryAddrId,
            PaymentMethodId = body.PaymentMethodId,
            DeliveryMethodId = body.DeliveryMethodId,
            BankAccount = body.BankAccount,
            AttachedService = body.AttachedService,
            Competitor = body.Competitor,
            Terms = body.Terms,
            Note = body.Note,
            CreatorId = RbacService.GetUserId(User),
        };
        foreach (var l in body.Lines ?? new())
            q.Lines.Add(await BuildLineAsync(q.PartnerId, l, today));

        db.Quotations.Add(q);
        await db.SaveChangesAsync();
        await tx.CommitAsync();
        return StatusCode(201, ToDto(q));
    }

    [HttpPut("{id:long}")]
    public async Task<IActionResult> Update(long id, [FromBody] QuotationUpdate body)
    {
        if (await Denied("UPDATE")) return Forbidden("UPDATE");
        var q = await db.Quotations.Include(x => x.Lines).FirstOrDefaultAsync(x => x.Id == id);
        if (q is null) return NotFound(new ApiError("NOT_FOUND", $"Báo giá {id} không tồn tại"));
        if (q.Status != "DRAFT")
            return Conflict(new ApiError("WF_LOCKED", $"Báo giá ở trạng thái {q.Status}, không sửa được"));
        Mapper.Apply(body, q, skipNulls: true);
        await db.SaveChangesAsync();
        return Ok(ToDto(q));
    }

    // ----- Lines -----
    [HttpPost("{id:long}/lines")]
    public async Task<IActionResult> AddLine(long id, [FromBody] QuotationLineIn body)
    {
        if (await Denied("UPDATE")) return Forbidden("UPDATE");
        var q = await db.Quotations.FirstOrDefaultAsync(x => x.Id == id);
        if (q is null) return NotFound(new ApiError("NOT_FOUND", $"Báo giá {id} không tồn tại"));
        if (q.Status != "DRAFT")
            return Conflict(new ApiError("WF_LOCKED", $"Báo giá ở trạng thái {q.Status}, không sửa được"));
        var line = await BuildLineAsync(q.PartnerId, body, DateOnly.FromDateTime(DateTime.Today));
        line.QuotationId = id;
        db.QuotationLines.Add(line);
        await db.SaveChangesAsync();
        return StatusCode(201, ToLineDto(line));
    }

    [HttpPut("{id:long}/lines/{lineId:long}")]
    public async Task<IActionResult> UpdateLine(long id, long lineId, [FromBody] QuotationLineUpdate body)
    {
        if (await Denied("UPDATE")) return Forbidden("UPDATE");
        var q = await db.Quotations.FirstOrDefaultAsync(x => x.Id == id);
        if (q is null) return NotFound(new ApiError("NOT_FOUND", $"Báo giá {id} không tồn tại"));
        if (q.Status != "DRAFT")
            return Conflict(new ApiError("WF_LOCKED", $"Báo giá ở trạng thái {q.Status}, không sửa được"));
        var line = await db.QuotationLines.FirstOrDefaultAsync(x => x.Id == lineId && x.QuotationId == id);
        if (line is null) return NotFound(new ApiError("NOT_FOUND", "Dòng không tồn tại"));
        Mapper.Apply(body, line, skipNulls: true);
        await db.SaveChangesAsync();
        return Ok(ToLineDto(line));
    }

    [HttpDelete("{id:long}/lines/{lineId:long}")]
    public async Task<IActionResult> DeleteLine(long id, long lineId)
    {
        if (await Denied("UPDATE")) return Forbidden("UPDATE");
        var q = await db.Quotations.FirstOrDefaultAsync(x => x.Id == id);
        if (q is null) return NotFound(new ApiError("NOT_FOUND", $"Báo giá {id} không tồn tại"));
        if (q.Status != "DRAFT")
            return Conflict(new ApiError("WF_LOCKED", $"Báo giá ở trạng thái {q.Status}, không sửa được"));
        var line = await db.QuotationLines.FirstOrDefaultAsync(x => x.Id == lineId && x.QuotationId == id);
        if (line is null) return NotFound(new ApiError("NOT_FOUND", "Dòng không tồn tại"));
        db.QuotationLines.Remove(line);
        await db.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>Tạo QuotationLine; nếu thiếu rate/discountPct thì tự gọi PricingService.Resolve.</summary>
    private async Task<QuotationLine> BuildLineAsync(long partnerId, QuotationLineIn l, DateOnly date)
    {
        var rate = l.Rate;
        var discountPct = l.DiscountPct;
        if (rate is null || discountPct is null)
        {
            var resolved = await pricing.ResolveAsync(partnerId, l.ProductId, l.Quantity, date);
            rate ??= resolved.Rate;
            discountPct ??= resolved.DiscountPct;
        }
        return new QuotationLine
        {
            ProductId = l.ProductId,
            Quantity = l.Quantity,
            ProjectHouse = l.ProjectHouse,
            VatPct = l.VatPct,
            Rate = rate,
            DiscountPct = discountPct,
            Note = l.Note,
        };
    }

    // ----- Workflow actions -----
    [HttpPost("{id:long}/actions/{actionName}")]
    public async Task<IActionResult> Action(long id, string actionName, [FromBody] WfActionRequest? body)
    {
        var q = await db.Quotations.Include(x => x.Lines).FirstOrDefaultAsync(x => x.Id == id);
        if (q is null) return NotFound(new ApiError("NOT_FOUND", $"Báo giá {id} không tồn tại"));

        try
        {
            q.Status = await wf.TransitionAsync(User, Resource, id, q.Status, actionName, body?.Reason);
        }
        catch (WorkflowException e)
        {
            return e.Code == "WF_NO_PERMISSION"
                ? StatusCode(403, new ApiError(e.Code, e.Message))
                : Conflict(new ApiError(e.Code, e.Message));
        }

        if (body?.Reason is not null) q.StatusReason = body.Reason;
        await db.SaveChangesAsync();
        return Ok(ToDto(q));
    }

    /// <summary>OPEN → ORDERED (toàn phần) hoặc giữ OPEN (một phần), sinh sales.sales_order + dòng tặng theo scheme.</summary>
    [HttpPost("{id:long}/actions/make-sales-order")]
    public async Task<IActionResult> MakeSalesOrder(long id, [FromBody] MakeSalesOrderRequest? body)
    {
        var q = await db.Quotations.Include(x => x.Lines).FirstOrDefaultAsync(x => x.Id == id);
        if (q is null) return NotFound(new ApiError("NOT_FOUND", $"Báo giá {id} không tồn tại"));
        if (q.Status != "OPEN")
            return Conflict(new ApiError("WF_INVALID_TRANSITION",
                $"Không thể tạo đơn hàng khi báo giá ở trạng thái {q.Status} (cho phép: OPEN)"));
        if (await Denied("UPDATE")) return Forbidden("UPDATE");

        var picks = new List<(QuotationLine Line, decimal Qty)>();
        if (body?.Lines is { Count: > 0 })
        {
            foreach (var pl in body.Lines)
            {
                var line = q.Lines.FirstOrDefault(l => l.Id == pl.LineId);
                if (line is null)
                    return BadRequest(new ApiError("VALIDATION", $"Dòng báo giá {pl.LineId} không tồn tại"));
                var remain = line.Quantity - line.OrderedQty;
                if (pl.Qty <= 0 || pl.Qty > remain)
                    return BadRequest(new ApiError("VALIDATION",
                        $"Số lượng tạo đơn ({pl.Qty}) cho dòng {pl.LineId} vượt số lượng còn lại ({remain})"));
                picks.Add((line, pl.Qty));
            }
        }
        else
        {
            foreach (var line in q.Lines)
            {
                var remain = line.Quantity - line.OrderedQty;
                if (remain > 0) picks.Add((line, remain));
            }
        }
        if (picks.Count == 0)
            return BadRequest(new ApiError("VALIDATION", "Không có dòng nào để tạo đơn hàng"));

        await using var tx = await db.Database.BeginTransactionAsync();
        var today = DateOnly.FromDateTime(DateTime.Today);
        var order = new SalesOrder
        {
            DocNo = await numbering.NextAsync("SALES_ORDER"),
            DocDate = today,
            QuotationId = q.Id,
            PartnerId = q.PartnerId,
            DeliveryDatePlan = q.RequestDeliveryDate,
            PaymentMethodId = q.PaymentMethodId,
            DeliveryMethodId = q.DeliveryMethodId,
            DeliveryAddrId = q.DeliveryAddrId,
            SalespersonId = q.RequesterId,
            Note = q.Note,
        };

        foreach (var (line, qty) in picks)
        {
            var rate = line.Rate ?? 0;
            order.Lines.Add(new SalesOrderLine
            {
                ProductId = line.ProductId,
                Quantity = qty,
                UnitPrice = Math.Round(rate * (1 - (line.DiscountPct ?? 0) / 100m), 2),
                ListPrice = rate,
                VatPct = line.VatPct,
                Note = line.Note,
            });
            line.OrderedQty += qty;

            // Hàng tặng theo scheme (product slab) tự thêm dòng is_gift=true, rate=0
            var resolved = await pricing.ResolveAsync(q.PartnerId, line.ProductId, qty, today);
            foreach (var free in resolved.FreeItems)
            {
                order.Lines.Add(new SalesOrderLine
                {
                    ProductId = free.ProductId,
                    Quantity = free.Qty,
                    UnitPrice = 0,
                    VatPct = 0,
                    IsGift = true,
                    Note = $"Hàng tặng theo CTKM (báo giá {q.DocNo})",
                });
            }
        }

        order.TotalAmount = order.Lines.Sum(l => l.Quantity * l.UnitPrice);
        order.TotalVat = order.Lines.Sum(l => l.Quantity * l.UnitPrice * (l.VatPct ?? 0) / 100m);
        db.SalesOrders.Add(order);

        var fullyOrdered = q.Lines.All(l => l.OrderedQty >= l.Quantity);
        if (fullyOrdered)
        {
            try
            {
                q.Status = await wf.TransitionAsync(User, Resource, q.Id, q.Status, "make-sales-order", null);
            }
            catch (WorkflowException e)
            {
                return e.Code == "WF_NO_PERMISSION"
                    ? StatusCode(403, new ApiError(e.Code, e.Message))
                    : Conflict(new ApiError(e.Code, e.Message));
            }
        }

        await db.SaveChangesAsync();
        await tx.CommitAsync();

        return StatusCode(201, new
        {
            quotationId = q.Id,
            quotationStatus = q.Status,
            orderId = order.Id,
            orderDocNo = order.DocNo,
        });
    }

    /// <summary>OPEN → LOST kèm lý do mất báo giá.</summary>
    [HttpPost("{id:long}/actions/set-as-lost")]
    public async Task<IActionResult> SetAsLost(long id, [FromBody] SetAsLostRequest body)
    {
        var q = await db.Quotations.Include(x => x.Lines).FirstOrDefaultAsync(x => x.Id == id);
        if (q is null) return NotFound(new ApiError("NOT_FOUND", $"Báo giá {id} không tồn tại"));
        if (body.LostReasonIds.Count == 0)
            return BadRequest(new ApiError("VALIDATION", "Cần ít nhất 1 lý do mất báo giá"));

        try
        {
            q.Status = await wf.TransitionAsync(User, Resource, id, q.Status, "set-as-lost", body.Detail);
        }
        catch (WorkflowException e)
        {
            return e.Code == "WF_NO_PERMISSION"
                ? StatusCode(403, new ApiError(e.Code, e.Message))
                : Conflict(new ApiError(e.Code, e.Message));
        }

        q.LostReasonIds = body.LostReasonIds;
        if (body.Competitor is not null) q.Competitor = body.Competitor;
        if (body.Detail is not null) q.StatusReason = body.Detail;
        await db.SaveChangesAsync();
        return Ok(ToDto(q));
    }

    /// <summary>EXPIRED → OPEN, gia hạn valid_till.</summary>
    [HttpPost("{id:long}/actions/extend")]
    public async Task<IActionResult> Extend(long id, [FromBody] ExtendQuotationRequest body)
    {
        var q = await db.Quotations.Include(x => x.Lines).FirstOrDefaultAsync(x => x.Id == id);
        if (q is null) return NotFound(new ApiError("NOT_FOUND", $"Báo giá {id} không tồn tại"));

        try
        {
            q.Status = await wf.TransitionAsync(User, Resource, id, q.Status, "extend", null);
        }
        catch (WorkflowException e)
        {
            return e.Code == "WF_NO_PERMISSION"
                ? StatusCode(403, new ApiError(e.Code, e.Message))
                : Conflict(new ApiError(e.Code, e.Message));
        }

        q.ValidTill = body.ValidTill;
        await db.SaveChangesAsync();
        return Ok(ToDto(q));
    }

    /// <summary>CANCELLED → bản sao mới DRAFT (doc_no hậu tố -N).</summary>
    [HttpPost("{id:long}/actions/amend")]
    public async Task<IActionResult> Amend(long id)
    {
        if (await Denied("CREATE")) return Forbidden("CREATE");
        var q = await db.Quotations.Include(x => x.Lines).FirstOrDefaultAsync(x => x.Id == id);
        if (q is null) return NotFound(new ApiError("NOT_FOUND", $"Báo giá {id} không tồn tại"));
        if (q.Status != "CANCELLED")
            return Conflict(new ApiError("WF_INVALID_TRANSITION",
                $"Chỉ có thể amend báo giá ở trạng thái CANCELLED (hiện tại: {q.Status})"));

        var suffix = 1;
        var newDocNo = $"{q.DocNo}-{suffix}";
        while (await db.Quotations.AnyAsync(x => x.DocNo == newDocNo))
        {
            suffix++;
            newDocNo = $"{q.DocNo}-{suffix}";
        }

        var copy = new Quotation
        {
            DocNo = newDocNo,
            DocDate = DateOnly.FromDateTime(DateTime.Today),
            PartnerId = q.PartnerId,
            OrderType = q.OrderType,
            ValidTill = q.ValidTill,
            PriceListId = q.PriceListId,
            TaxTemplateId = q.TaxTemplateId,
            RequestDeliveryDate = q.RequestDeliveryDate,
            ValidityDays = q.ValidityDays,
            DeliveryLead = q.DeliveryLead,
            RequesterId = q.RequesterId,
            RequesterDeptId = q.RequesterDeptId,
            ContactId = q.ContactId,
            DeliveryAddrId = q.DeliveryAddrId,
            PaymentMethodId = q.PaymentMethodId,
            DeliveryMethodId = q.DeliveryMethodId,
            BankAccount = q.BankAccount,
            AttachedService = q.AttachedService,
            Competitor = q.Competitor,
            Terms = q.Terms,
            Note = q.Note,
            CreatorId = RbacService.GetUserId(User),
            Status = "DRAFT",
            Lines = q.Lines.Select(l => new QuotationLine
            {
                ProductId = l.ProductId,
                Quantity = l.Quantity,
                ProjectHouse = l.ProjectHouse,
                VatPct = l.VatPct,
                Rate = l.Rate,
                DiscountPct = l.DiscountPct,
                Note = l.Note,
            }).ToList(),
        };

        db.Quotations.Add(copy);
        await db.SaveChangesAsync();
        return StatusCode(201, ToDto(copy));
    }
}
