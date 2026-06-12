using Erp.Api.Entities;

namespace Erp.Api.Core;

/// <summary>
/// Sinh sales.pricing_rule từ một sales.promotional_scheme: mỗi scheme_price_slab /
/// scheme_product_slab sinh 1 pricing_rule, áp cho từng product trong scheme.Items
/// (hoặc product_id riêng của slab nếu có, hoặc product_group_id của scheme nếu không có item nào).
/// </summary>
public static class PricingRuleGenerator
{
    public static List<PricingRule> BuildRules(PromotionalScheme scheme)
    {
        var rules = new List<PricingRule>();
        var itemProductIds = scheme.Items.Select(i => i.ProductId).Cast<long?>().ToList();

        foreach (var slab in scheme.PriceSlabs)
        {
            foreach (var productId in TargetProductIds(scheme, slab.ProductId, itemProductIds))
            {
                rules.Add(new PricingRule
                {
                    RuleSource = "SCHEME",
                    SchemeId = scheme.Id,
                    Priority = (int)slab.MinQty,
                    ProductId = productId,
                    ProductGroupId = productId is null ? scheme.ProductGroupId : null,
                    PartnerId = scheme.PartnerId,
                    MinQty = slab.MinQty,
                    MaxQty = slab.MaxQty,
                    DiscountPct = slab.DiscountPct,
                    Rate = slab.Rate,
                    FreeRate = 0,
                    ValidFrom = scheme.ValidFrom,
                    ValidTo = scheme.ValidTo,
                    IsActive = scheme.IsActive,
                });
            }
        }

        foreach (var slab in scheme.ProductSlabs)
        {
            foreach (var productId in TargetProductIds(scheme, slab.ProductId, itemProductIds))
            {
                rules.Add(new PricingRule
                {
                    RuleSource = "SCHEME",
                    SchemeId = scheme.Id,
                    Priority = (int)slab.MinQty,
                    ProductId = productId,
                    ProductGroupId = productId is null ? scheme.ProductGroupId : null,
                    PartnerId = scheme.PartnerId,
                    MinQty = slab.MinQty,
                    MaxQty = slab.MaxQty,
                    FreeProductId = slab.FreeProductId,
                    FreeQty = slab.FreeQty,
                    FreeRate = slab.FreeRate,
                    ValidFrom = scheme.ValidFrom,
                    ValidTo = scheme.ValidTo,
                    IsActive = scheme.IsActive,
                });
            }
        }

        return rules;
    }

    private static IEnumerable<long?> TargetProductIds(
        PromotionalScheme scheme, long? slabProductId, List<long?> itemProductIds)
    {
        if (slabProductId.HasValue) return new[] { slabProductId };
        if (itemProductIds.Count > 0) return itemProductIds;
        return new long?[] { null };
    }
}
