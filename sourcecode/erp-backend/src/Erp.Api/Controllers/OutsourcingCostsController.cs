using Erp.Api.Core;
using Erp.Api.Data;
using Erp.Api.Dtos;
using Erp.Api.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Erp.Api.Controllers;

[ApiController, Route("api/v1/purchasing/outsourcing-costs"), Authorize]
public class OutsourcingCostsController(ErpDbContext db) : ControllerBase
{
    private static OutsourcingCostOut ToDto(OutsourcingCost c) => new(
        c.Id, c.ReceiptDocId, c.ProductId, c.PayeeId, c.CostTypeId,
        c.ProcessId, c.AmountFc, c.CurrencyCode, c.ExchangeRate,
        c.Amount, c.VatPct, c.PaymentMethodId, c.CollectedPoId,
        c.Approved, c.ApprovedBy, c.ApprovedAt);

    [HttpGet]
    public async Task<ActionResult<IEnumerable<OutsourcingCostOut>>> List(
        [FromQuery] long? receiptDocId = null,
        [FromQuery] bool? approved = null,
        [FromQuery] bool? collected = null,
        [FromQuery] int page = 1, [FromQuery] int size = 50)
    {
        var q = db.OutsourcingCosts.AsQueryable();
        if (receiptDocId.HasValue) q = q.Where(c => c.ReceiptDocId == receiptDocId);
        if (approved.HasValue) q = q.Where(c => c.Approved == approved);
        if (collected.HasValue)
            q = collected.Value
                ? q.Where(c => c.CollectedPoId != null)
                : q.Where(c => c.CollectedPoId == null);

        var items = await q.OrderByDescending(c => c.Id)
            .Skip((page - 1) * size).Take(size)
            .Select(c => ToDto(c))
            .ToListAsync();
        return Ok(items);
    }

    [HttpGet("{id:long}")]
    public async Task<ActionResult<OutsourcingCostOut>> Get(long id)
    {
        var c = await db.OutsourcingCosts.FindAsync(id);
        return c is null ? NotFound() : Ok(ToDto(c));
    }

    [HttpPost]
    public async Task<ActionResult<OutsourcingCostOut>> Create(OutsourcingCostCreate dto)
    {
        var c = new OutsourcingCost
        {
            ReceiptDocId = dto.ReceiptDocId,
            ProductId = dto.ProductId,
            PayeeId = dto.PayeeId,
            CostTypeId = dto.CostTypeId,
            ProcessId = dto.ProcessId,
            AmountFc = dto.AmountFc,
            CurrencyCode = dto.CurrencyCode,
            ExchangeRate = dto.ExchangeRate,
            Amount = dto.Amount,
            VatPct = dto.VatPct,
            PaymentMethodId = dto.PaymentMethodId,
        };
        db.OutsourcingCosts.Add(c);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(Get), new { id = c.Id }, ToDto(c));
    }

    [HttpPut("{id:long}")]
    public async Task<ActionResult<OutsourcingCostOut>> Update(long id, OutsourcingCostUpdate dto)
    {
        var c = await db.OutsourcingCosts.FindAsync(id);
        if (c is null) return NotFound();
        if (c.Approved) return Conflict(new { code = "COST_ALREADY_APPROVED" });

        if (dto.ProductId.HasValue) c.ProductId = dto.ProductId;
        if (dto.PayeeId.HasValue) c.PayeeId = dto.PayeeId.Value;
        if (dto.CostTypeId.HasValue) c.CostTypeId = dto.CostTypeId.Value;
        if (dto.ProcessId.HasValue) c.ProcessId = dto.ProcessId;
        if (dto.AmountFc.HasValue) c.AmountFc = dto.AmountFc.Value;
        if (dto.CurrencyCode is not null) c.CurrencyCode = dto.CurrencyCode;
        if (dto.ExchangeRate.HasValue) c.ExchangeRate = dto.ExchangeRate.Value;
        if (dto.Amount.HasValue) c.Amount = dto.Amount.Value;
        if (dto.VatPct.HasValue) c.VatPct = dto.VatPct;
        if (dto.PaymentMethodId.HasValue) c.PaymentMethodId = dto.PaymentMethodId;

        await db.SaveChangesAsync();
        return Ok(ToDto(c));
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Delete(long id)
    {
        var c = await db.OutsourcingCosts.FindAsync(id);
        if (c is null) return NotFound();
        if (c.Approved) return Conflict(new { code = "COST_ALREADY_APPROVED" });
        if (c.CollectedPoId.HasValue) return Conflict(new { code = "COST_ALREADY_COLLECTED" });

        db.OutsourcingCosts.Remove(c);
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("{id:long}/actions/approve")]
    public async Task<ActionResult<OutsourcingCostOut>> Approve(long id)
    {
        var c = await db.OutsourcingCosts.FindAsync(id);
        if (c is null) return NotFound();
        if (c.Approved) return Conflict(new { code = "ALREADY_APPROVED" });

        c.Approved = true;
        c.ApprovedBy = RbacService.GetUserId(User);
        c.ApprovedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync();
        return Ok(ToDto(c));
    }

    [HttpPost("{id:long}/actions/unapprove")]
    public async Task<ActionResult<OutsourcingCostOut>> Unapprove(long id)
    {
        var c = await db.OutsourcingCosts.FindAsync(id);
        if (c is null) return NotFound();
        if (!c.Approved) return Conflict(new { code = "NOT_APPROVED" });
        if (c.CollectedPoId.HasValue) return Conflict(new { code = "COST_ALREADY_COLLECTED" });

        c.Approved = false;
        c.ApprovedBy = null;
        c.ApprovedAt = null;
        await db.SaveChangesAsync();
        return Ok(ToDto(c));
    }
}