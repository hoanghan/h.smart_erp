using Erp.Api.Entities;

namespace Erp.Api.Core;

/// <summary>
/// Tính lại status của SalesOrder (v2) dựa trên delivered_qty/billed_qty per-line.
/// </summary>
public static class SalesOrderStatusHelper
{
    private static readonly string[] Recomputable =
        ["TO_DELIVER_AND_BILL", "TO_DELIVER", "TO_BILL", "COMPLETED"];

    /// <summary>No-op nếu status hiện tại không thuộc nhóm có thể tính lại (DRAFT/ON_HOLD/CLOSED/CANCELLED).</summary>
    public static void Recompute(SalesOrder o)
    {
        if (!Recomputable.Contains(o.Status)) return;

        var fullyDelivered = o.Lines.All(l => l.DeliveredQty >= l.Quantity);
        var billable = o.Lines.Where(l => !l.IsGift).ToList();
        var fullyBilled = billable.Count == 0 || billable.All(l => l.BilledQty >= l.Quantity);

        o.Status = (fullyDelivered, fullyBilled) switch
        {
            (true, true) => "COMPLETED",
            (true, false) => "TO_BILL",
            (false, true) => "TO_DELIVER",
            _ => "TO_DELIVER_AND_BILL",
        };
    }
}
