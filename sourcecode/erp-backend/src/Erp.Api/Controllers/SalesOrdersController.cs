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
[Route("api/v1/sales/orders")]
public class SalesOrdersController(
    ErpDbContext db, RbacService rbac, WorkflowService wf, DocNumberingService numbering, PricingService pricing)
    : ControllerBase
{
    private const string Resource = "sales-orders";

    private static SalesOrderOut ToDto(SalesOrder o) => new(
        o.Id, o.DocNo, o.DocDate, o.QuotationId, o.PartnerId, o.OrderForm,
        o.SalesChannel, o.SalesRegion, o.WarehouseId, o.DeliveryDatePlan,
        o.PaymentMethodId, o.DeliveryMethodId,
        o.SalespersonId, o.ApproverId, o.ApprovedAt, o.TotalAmount, o.TotalVat,
        o.Note, o.Status,
        o.Lines.Select(l => new SalesOrderLineOut(
            l.Id, l.ProductId, l.Quantity, l.KitQty, l.UnitPrice, l.ListPrice,
            l.VatPct, l.Amount, l.IsGift, l.Note)).ToList());

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
        var q = db.SalesOrders.Include(x => x.Lines).AsNoTracking().AsQueryable();
        if (!string.IsNullOrEmpty(status)) q = q.Where(x => x.Status == status);
        if (partnerId.HasValue) q = q.Where(x => x.PartnerId == partnerId);
        var total = await q.LongCountAsync();
        var items = await q.OrderByDescending(x => x.Id)
            .Skip((Math.Max(1, page) - 1) * size).Take(Math.Clamp(size, 1, 200)).ToListAsync();
        return Ok(new PageResult<SalesOrderOut>(items.Select(ToDto).ToList(), total, page, size));
    }

    [HttpGet("{id:long}")]
    public async Task<IActionResult> Get(long id)
    {
        if (await Denied("VIEW")) return Forbidden("VIEW");
        var o = await db.SalesOrders.Include(x => x.Lines).FirstOrDefaultAsync(x => x.Id == id);
        return o is null
            ? NotFound(new ApiError("NOT_FOUND", $"Đơn hàng {id} không tồn tại"))
            : Ok(ToDto(o));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] SalesOrderCreate body)
    {
        if (await Denied("CREATE")) return Forbidden("CREATE");
        await using var tx = await db.Database.BeginTransactionAsync();
        var today = DateOnly.FromDateTime(DateTime.Today);
        var lines = new List<SalesOrderLine>();
        foreach (var l in body.Lines ?? new())
        {
            lines.Add(new SalesOrderLine
            {
                ProductId = l.ProductId, Quantity = l.Quantity, UnitPrice = l.UnitPrice,
                KitQty = l.KitQty, ListPrice = l.ListPrice ?? await FindListPriceAsync(l.ProductId, today),
                VatPct = l.VatPct, IsGift = l.IsGift, Note = l.Note,
            });
            if (!l.IsGift)
                await AddFreeItemLinesAsync(lines, body.PartnerId, l.ProductId, l.Quantity, today);
        }
        var o = new SalesOrder
        {
            DocNo = await numbering.NextAsync("SALES_ORDER"),
            DocDate = today,
            PartnerId = body.PartnerId,
            OrderForm = body.OrderForm,
            SalesChannel = body.SalesChannel,
            SalesRegion = body.SalesRegion,
            WarehouseId = body.WarehouseId,
            DeliveryDatePlan = body.DeliveryDatePlan,
            PaymentMethodId = body.PaymentMethodId,
            DeliveryMethodId = body.DeliveryMethodId,
            DeliveryAddrId = body.DeliveryAddrId,
            SalespersonId = body.SalespersonId,
            Note = body.Note,
            Lines = lines,
        };
        o.TotalAmount = o.Lines.Sum(l => l.Quantity * l.UnitPrice);
        o.TotalVat = o.Lines.Sum(l => l.Quantity * l.UnitPrice * (l.VatPct ?? 0) / 100m);
        db.SalesOrders.Add(o);
        await db.SaveChangesAsync();

        // Copy chi phí bán hàng mặc định theo khách hàng (core.partner_sales_cost)
        var partnerCosts = await db.PartnerSalesCosts.AsNoTracking()
            .Where(c => c.PartnerId == o.PartnerId).ToListAsync();
        if (partnerCosts.Count > 0)
        {
            db.SoCosts.AddRange(partnerCosts.Select(c => new SoCost
            {
                OrderId = o.Id, CostTypeId = c.CostTypeId, PayeeId = c.PayeeId,
                RatePct = c.RatePct, VatPct = c.VatPct,
            }));
            await db.SaveChangesAsync();
        }

        await tx.CommitAsync();
        return StatusCode(201, ToDto(o));
    }

    [HttpPut("{id:long}")]
    public async Task<IActionResult> Update(long id, [FromBody] SalesOrderUpdate body)
    {
        if (await Denied("UPDATE")) return Forbidden("UPDATE");
        var o = await db.SalesOrders.Include(x => x.Lines).FirstOrDefaultAsync(x => x.Id == id);
        if (o is null) return NotFound(new ApiError("NOT_FOUND", $"Đơn hàng {id} không tồn tại"));
        if (o.Status is not ("DRAFT" or "APPROVAL_REQUESTED"))
            return Conflict(new ApiError("WF_LOCKED",
                $"Đơn ở trạng thái {o.Status} — cần 'Xử lý lại đơn hàng' trước khi sửa"));
        Mapper.Apply(body, o, skipNulls: true);
        await db.SaveChangesAsync();
        return Ok(ToDto(o));
    }

    // ----- Lines -----
    [HttpPost("{id:long}/lines")]
    public async Task<IActionResult> AddLine(long id, [FromBody] SalesOrderLineIn body)
    {
        if (await Denied("UPDATE")) return Forbidden("UPDATE");
        var o = await db.SalesOrders.FirstOrDefaultAsync(x => x.Id == id);
        if (o is null) return NotFound(new ApiError("NOT_FOUND", $"Đơn hàng {id} không tồn tại"));
        if (o.Status is not ("DRAFT" or "APPROVAL_REQUESTED"))
            return Conflict(new ApiError("WF_LOCKED", $"Đơn ở trạng thái {o.Status}, không sửa được"));
        var today = DateOnly.FromDateTime(DateTime.Today);
        var listPrice = body.ListPrice ?? await FindListPriceAsync(body.ProductId, today);
        var line = new SalesOrderLine
        {
            OrderId = id, ProductId = body.ProductId, Quantity = body.Quantity,
            UnitPrice = body.UnitPrice, KitQty = body.KitQty, ListPrice = listPrice,
            VatPct = body.VatPct, IsGift = body.IsGift, Note = body.Note,
        };
        db.SalesOrderLines.Add(line);

        if (!body.IsGift)
        {
            var freeLines = new List<SalesOrderLine>();
            await AddFreeItemLinesAsync(freeLines, o.PartnerId, body.ProductId, body.Quantity, today);
            foreach (var fl in freeLines)
            {
                fl.OrderId = id;
                db.SalesOrderLines.Add(fl);
            }
        }

        await db.SaveChangesAsync();
        await RecalcTotals(o);
        return StatusCode(201, new SalesOrderLineOut(
            line.Id, line.ProductId, line.Quantity, line.KitQty, line.UnitPrice,
            line.ListPrice, line.VatPct, line.Amount, line.IsGift, line.Note));
    }

    [HttpDelete("{id:long}/lines/{lineId:long}")]
    public async Task<IActionResult> DeleteLine(long id, long lineId)
    {
        if (await Denied("UPDATE")) return Forbidden("UPDATE");
        var o = await db.SalesOrders.FirstOrDefaultAsync(x => x.Id == id);
        if (o is null) return NotFound(new ApiError("NOT_FOUND", $"Đơn hàng {id} không tồn tại"));
        var line = await db.SalesOrderLines.FirstOrDefaultAsync(x => x.Id == lineId && x.OrderId == id);
        if (line is null) return NotFound(new ApiError("NOT_FOUND", "Dòng không tồn tại"));
        db.SalesOrderLines.Remove(line);
        await db.SaveChangesAsync();
        await RecalcTotals(o);
        return NoContent();
    }

    private async Task RecalcTotals(SalesOrder o)
    {
        var lines = await db.SalesOrderLines.Where(l => l.OrderId == o.Id).ToListAsync();
        o.TotalAmount = lines.Sum(l => l.Quantity * l.UnitPrice);
        o.TotalVat = lines.Sum(l => l.Quantity * l.UnitPrice * (l.VatPct ?? 0) / 100m);
        await db.SaveChangesAsync();
    }

    /// <summary>Hàng tặng theo Promotional Scheme (product slab) → thêm dòng is_gift=true, đơn giá 0.</summary>
    private async Task AddFreeItemLinesAsync(List<SalesOrderLine> lines, long partnerId, long productId, decimal qty, DateOnly date)
    {
        var resolved = await pricing.ResolveAsync(partnerId, productId, qty, date);
        foreach (var free in resolved.FreeItems)
        {
            lines.Add(new SalesOrderLine
            {
                ProductId = free.ProductId, Quantity = free.Qty, UnitPrice = 0, VatPct = 0,
                IsGift = true, Note = "Hàng tặng theo CTKM",
            });
        }
    }

    /// <summary>Giá quy định từ bảng giá hiệu lực (valid_from &lt;= date &lt;= valid_to) chứa product, nếu có.</summary>
    private async Task<decimal?> FindListPriceAsync(long productId, DateOnly date) =>
        await db.PriceListItems
            .Where(i => i.ProductId == productId)
            .Join(
                db.PriceLists.Where(pl => pl.IsActive && pl.ValidFrom <= date && (pl.ValidTo == null || pl.ValidTo >= date)),
                i => i.PriceListId, pl => pl.Id, (i, _) => (decimal?)i.Price)
            .FirstOrDefaultAsync();

    // ----- Khuyến mại - chiết khấu -----
    [HttpGet("{id:long}/promotions")]
    public async Task<IActionResult> GetPromotions(long id)
    {
        if (await Denied("VIEW")) return Forbidden("VIEW");
        if (await db.SalesOrders.AnyAsync(x => x.Id == id) is false)
            return NotFound(new ApiError("NOT_FOUND", $"Đơn hàng {id} không tồn tại"));

        var promoIds = await db.SoPromotions.Where(x => x.OrderId == id)
            .Select(x => x.PromotionId).ToListAsync();
        var promotions = await db.Promotions
            .Include(x => x.DiscountItems).Include(x => x.GiftItems)
            .Where(x => promoIds.Contains(x.Id)).ToListAsync();
        return Ok(promotions.Select(p => new PromotionOut(
            p.Id, p.Code, p.Name, p.GroupName, p.DateFrom, p.DateTo, p.Sponsor, p.DiscountPct,
            p.HasGift, p.Note,
            p.DiscountItems.Select(i => new PromotionDiscountItemOut(
                i.Id, i.ProductId, i.TotalPct, i.CompanyPct, i.VendorPct)).ToList(),
            p.GiftItems.Select(i => new PromotionGiftItemOut(
                i.Id, i.BuyProductId, i.GiftProductId, i.RequiredQty, i.TotalGiftQty,
                i.CompanyGiftQty, i.VendorGiftQty)).ToList())).ToList());
    }

    [HttpPut("{id:long}/promotions")]
    public async Task<IActionResult> ApplyPromotions(long id, [FromBody] ApplyPromotionsRequest body)
    {
        if (await Denied("UPDATE")) return Forbidden("UPDATE");
        var o = await db.SalesOrders.Include(x => x.Lines).FirstOrDefaultAsync(x => x.Id == id);
        if (o is null) return NotFound(new ApiError("NOT_FOUND", $"Đơn hàng {id} không tồn tại"));

        var existingIds = await db.SoPromotions.Where(x => x.OrderId == id)
            .Select(x => x.PromotionId).ToListAsync();
        var newIds = body.PromotionIds.Except(existingIds).ToList();
        if (newIds.Count == 0) return Ok(ToDto(o));

        var promotions = await db.Promotions
            .Include(x => x.DiscountItems).Include(x => x.GiftItems)
            .Where(x => newIds.Contains(x.Id)).ToListAsync();

        foreach (var promo in promotions)
        {
            db.SoPromotions.Add(new SoPromotion { OrderId = id, PromotionId = promo.Id });

            // Hàng chiết khấu: giảm % đơn giá theo total_pct
            foreach (var di in promo.DiscountItems)
            {
                foreach (var line in o.Lines.Where(l => l.ProductId == di.ProductId))
                    line.UnitPrice = Math.Round(line.UnitPrice * (1 - di.TotalPct / 100m), 2);
            }

            // Hàng tặng: thêm dòng is_gift=true, đơn giá 0, SL theo tỷ lệ required_qty/total_gift_qty
            foreach (var gi in promo.GiftItems)
            {
                var boughtQty = o.Lines.Where(l => l.ProductId == gi.BuyProductId).Sum(l => l.Quantity);
                if (boughtQty <= 0 || gi.RequiredQty <= 0) continue;
                o.Lines.Add(new SalesOrderLine
                {
                    OrderId = id, ProductId = gi.GiftProductId,
                    Quantity = boughtQty / gi.RequiredQty * gi.TotalGiftQty,
                    UnitPrice = 0, IsGift = true,
                    Note = $"Quà tặng KM {promo.Code}",
                });
            }
        }

        await db.SaveChangesAsync();
        await RecalcTotals(o);
        return Ok(ToDto(o));
    }

    // ----- Inventory: tạo phiếu xuất kho từ đơn hàng -----
    [HttpPost("{id:long}/actions/create-delivery-request")]
    public async Task<IActionResult> CreateDeliveryRequest(long id, [FromBody] CreateStockDocRequest? body)
    {
        var o = await db.SalesOrders.Include(x => x.Lines).FirstOrDefaultAsync(x => x.Id == id);
        if (o is null) return NotFound(new ApiError("NOT_FOUND", $"Đơn hàng {id} không tồn tại"));

        var warehouseId = body?.WarehouseId ?? o.WarehouseId;
        if (warehouseId is null)
            return BadRequest(new ApiError("VALIDATION", "Thiếu kho xuất (warehouseId)"));

        string newStatus;
        try
        {
            newStatus = await wf.TransitionAsync(User, Resource, id, o.Status, "create-delivery-request", null);
        }
        catch (WorkflowException e)
        {
            return e.Code == "WF_NO_PERMISSION"
                ? StatusCode(403, new ApiError(e.Code, e.Message))
                : Conflict(new ApiError(e.Code, e.Message));
        }

        await using var tx = await db.Database.BeginTransactionAsync();
        var doc = new StockDoc
        {
            DocNo = await numbering.NextAsync("STOCK_ISSUE"),
            DocType = "ISSUE",
            SubType = "SALES",
            RequestDate = body?.RequestDate ?? DateOnly.FromDateTime(DateTime.Today),
            SalesOrderId = o.Id,
            PartnerId = o.PartnerId,
            FromWarehouseId = warehouseId,
            Note = body?.Note,
            CreatedBy = RbacService.GetUserId(User),
        };
        db.StockDocs.Add(doc);
        o.Status = newStatus;
        await db.SaveChangesAsync();
        await tx.CommitAsync();
        return StatusCode(201, InventoryMapper.ToDto(doc));
    }

    // ----- Workflow actions -----
    [HttpPost("{id:long}/actions/{actionName}")]
    public async Task<IActionResult> Action(long id, string actionName, [FromBody] WfActionRequest? body)
    {
        var o = await db.SalesOrders.Include(x => x.Lines).FirstOrDefaultAsync(x => x.Id == id);
        if (o is null) return NotFound(new ApiError("NOT_FOUND", $"Đơn hàng {id} không tồn tại"));

        try
        {
            o.Status = await wf.TransitionAsync(User, Resource, id, o.Status, actionName, body?.Reason);
        }
        catch (WorkflowException e)
        {
            return e.Code == "WF_NO_PERMISSION"
                ? StatusCode(403, new ApiError(e.Code, e.Message))
                : Conflict(new ApiError(e.Code, e.Message));
        }

        if (o.Status == "APPROVED")
        {
            o.ApproverId = RbacService.GetUserId(User);
            o.ApprovedAt = DateTimeOffset.UtcNow;

            // PTTT có due_days > 0 → tự sinh 1 YC thanh toán hạn = doc_date + due_days
            if (o.PaymentMethodId.HasValue)
            {
                var method = await db.PaymentMethods.FindAsync(o.PaymentMethodId.Value);
                if (method is not null && method.DueDays > 0)
                {
                    db.SoPaymentRequests.Add(new SoPaymentRequest
                    {
                        OrderId = o.Id,
                        DueDate = o.DocDate.AddDays(method.DueDays),
                        Amount = (o.TotalAmount ?? 0) + (o.TotalVat ?? 0),
                        AutoGenerated = true,
                        Status = "PENDING",
                    });
                }
            }
        }

        // Hủy đơn tạo từ báo giá → báo giá chuyển Không thành công (theo tài liệu nghiệp vụ)
        if (o.Status == "CANCELLED" && o.QuotationId.HasValue)
        {
            var q = await db.Quotations.FindAsync(o.QuotationId.Value);
            if (q is not null && q.Status == "ORDERED")
            {
                db.WfTransitionLogs.Add(new WfTransitionLog
                {
                    RefTable = "quotations", RefId = q.Id,
                    FromStatus = q.Status, ToStatus = "FAILED",
                    Reason = $"Đơn hàng {o.DocNo} bị hủy",
                    ActedBy = RbacService.GetUserId(User),
                });
                q.Status = "FAILED";
                q.StatusReason = $"Đơn hàng {o.DocNo} bị hủy";
            }
        }

        await db.SaveChangesAsync();
        return Ok(ToDto(o));
    }
}
