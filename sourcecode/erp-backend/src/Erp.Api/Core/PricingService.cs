using Erp.Api.Data;
using Erp.Api.Dtos;
using Microsoft.EntityFrameworkCore;

namespace Erp.Api.Core;

public class PricingException(string code, string message) : Exception(message)
{
    public string Code { get; } = code;
}

/// <summary>
/// Một cửa tính giá: pricing_rule khớp (ưu tiên cao nhất theo min_qty) → price_list item → 0.
/// </summary>
public class PricingService(ErpDbContext db)
{
    public async Task<PricingResolveResult> ResolveAsync(
        long? partnerId, long productId, decimal qty, DateOnly date, string? couponCode = null)
    {
        var product = await db.Products.AsNoTracking().FirstOrDefaultAsync(p => p.Id == productId);
        var groupId = product?.GroupId;

        long? couponRuleId = null;
        if (!string.IsNullOrWhiteSpace(couponCode))
        {
            var coupon = await db.CouponCodes.FirstOrDefaultAsync(c => c.Code == couponCode);
            if (coupon is null || !coupon.IsActive
                || (coupon.ValidFrom is not null && coupon.ValidFrom > date)
                || (coupon.ValidTo is not null && coupon.ValidTo < date)
                || (coupon.MaxUse is not null && coupon.Used >= coupon.MaxUse))
                throw new PricingException("COUPON_INVALID", "Mã giảm giá không hợp lệ, đã hết hạn hoặc hết lượt sử dụng");
            couponRuleId = coupon.PricingRuleId;
        }

        var rules = await db.PricingRules.AsNoTracking()
            .Where(r => r.IsActive
                && (r.ProductId == null || r.ProductId == productId)
                && (r.ProductGroupId == null || r.ProductGroupId == groupId)
                && (r.PartnerId == null || r.PartnerId == partnerId)
                && r.MinQty <= qty
                && (r.MaxQty == null || qty <= r.MaxQty)
                && (r.ValidFrom == null || r.ValidFrom <= date)
                && (r.ValidTo == null || r.ValidTo >= date))
            .ToListAsync();

        if (couponRuleId.HasValue && !rules.Any(r => r.Id == couponRuleId.Value))
        {
            var couponRule = await db.PricingRules.AsNoTracking()
                .FirstOrDefaultAsync(r => r.Id == couponRuleId.Value && r.IsActive);
            if (couponRule is not null) rules.Add(couponRule);
        }

        rules = rules.OrderByDescending(r => r.Priority).ToList();

        decimal discountPct = 0;
        decimal? ruleRate = null;
        var freeItems = new List<PricingFreeItem>();
        var appliedRuleIds = new List<long>();

        var priceRule = rules.FirstOrDefault(r => r.Rate != null || r.DiscountPct != null);
        if (priceRule is not null)
        {
            ruleRate = priceRule.Rate;
            discountPct = priceRule.DiscountPct ?? 0;
            appliedRuleIds.Add(priceRule.Id);
        }

        foreach (var r in rules.Where(r => r.FreeProductId is not null))
        {
            freeItems.Add(new PricingFreeItem(r.FreeProductId!.Value, r.FreeQty ?? 0));
            appliedRuleIds.Add(r.Id);
        }

        var rate = ruleRate ?? await FindListPriceAsync(productId, date) ?? 0;
        return new PricingResolveResult(rate, discountPct, freeItems, appliedRuleIds);
    }

    /// <summary>Giá quy định từ bảng giá hiệu lực (valid_from &lt;= date &lt;= valid_to) chứa product, nếu có.</summary>
    private async Task<decimal?> FindListPriceAsync(long productId, DateOnly date) =>
        await db.PriceListItems
            .Where(i => i.ProductId == productId)
            .Join(
                db.PriceLists.Where(pl => pl.IsActive && pl.ValidFrom <= date && (pl.ValidTo == null || pl.ValidTo >= date)),
                i => i.PriceListId, pl => pl.Id, (i, _) => (decimal?)i.Price)
            .FirstOrDefaultAsync();
}
