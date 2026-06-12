using Erp.Api.Data;
using Erp.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace Erp.Api.Core;

/// <summary>
/// BackgroundService: định kỳ chuyển báo giá OPEN quá valid_till sang EXPIRED.
/// </summary>
public class QuotationExpiryWorker(IServiceProvider sp, ILogger<QuotationExpiryWorker> log) : BackgroundService
{
    private static readonly TimeSpan PollInterval = TimeSpan.FromMinutes(30);

    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        log.LogInformation("QuotationExpiryWorker started");
        while (!ct.IsCancellationRequested)
        {
            try { await ProcessAsync(ct); }
            catch (Exception ex) { log.LogError(ex, "QuotationExpiryWorker error"); }
            await Task.Delay(PollInterval, ct);
        }
    }

    private async Task ProcessAsync(CancellationToken ct)
    {
        using var scope = sp.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ErpDbContext>();
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var expired = await db.Quotations
            .Where(q => q.Status == "OPEN" && q.ValidTill != null && q.ValidTill < today)
            .ToListAsync(ct);

        foreach (var q in expired)
        {
            db.WfTransitionLogs.Add(new WfTransitionLog
            {
                RefTable = "quotations",
                RefId = q.Id,
                FromStatus = q.Status,
                ToStatus = "EXPIRED",
                Reason = "Hết hiệu lực báo giá (valid_till)",
            });
            q.Status = "EXPIRED";
        }

        if (expired.Count > 0)
        {
            await db.SaveChangesAsync(ct);
            log.LogInformation("Marked {Count} quotation(s) as EXPIRED", expired.Count);
        }
    }
}
