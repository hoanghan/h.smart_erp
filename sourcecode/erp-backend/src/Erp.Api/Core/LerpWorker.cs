using System.Text.Json;
using Erp.Api.Data;
using Erp.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace Erp.Api.Core;

/// <summary>
/// BackgroundService: poll finance.outbox_event, tạo finance.lerp_voucher (status PENDING).
/// </summary>
public class LerpWorker(IServiceProvider sp, ILogger<LerpWorker> log) : BackgroundService
{
    private static readonly TimeSpan PollInterval = TimeSpan.FromSeconds(5);

    // Mapping event_type → lerp_voucher_type
    private static readonly Dictionary<string, string> EventTypeMap = new()
    {
        ["SO_PAYMENT_ACTUAL_CREATED"] = "BAN_HANG",
        ["SO_COST_APPROVED"] = "PHIEU_GHI_NO",
        ["PO_PAYMENT_REQUEST_APPROVED"] = "YCC",
        ["PO_COST_APPROVED"] = "PGC",
        ["STOCK_DOC_COMPLETED"] = "PHIEU_XUAT",
        ["GR_COST_APPROVED"] = "PGC",
        ["OUTSOURCING_COST_APPROVED"] = "PGC",
        ["SUPPLIER_RETURN_COMPLETED"] = "TRA_HANG_NCC",
    };

    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        log.LogInformation("LerpWorker started");
        while (!ct.IsCancellationRequested)
        {
            try { await ProcessBatchAsync(ct); }
            catch (Exception ex) { log.LogError(ex, "LerpWorker error"); }
            await Task.Delay(PollInterval, ct);
        }
    }

    private async Task ProcessBatchAsync(CancellationToken ct)
    {
        using var scope = sp.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ErpDbContext>();

        var events = await db.OutboxEvents
            .Where(e => e.ProcessedAt == null)
            .OrderBy(e => e.Id)
            .Take(50)
            .ToListAsync(ct);

        foreach (var evt in events)
        {
            await ProcessOneAsync(db, evt, ct);
        }

        if (events.Count > 0)
            await db.SaveChangesAsync(ct);
    }

    private async Task ProcessOneAsync(ErpDbContext db, OutboxEvent evt, CancellationToken ct)
    {
        if (!EventTypeMap.TryGetValue(evt.EventType, out var voucherType))
        {
            log.LogWarning("Unknown event_type {EventType}, skipping outbox {Id}", evt.EventType, evt.Id);
            evt.ProcessedAt = DateTimeOffset.UtcNow;
            return;
        }

        // Kiểm tra đã tạo lerp_voucher chưa
        var exists = await db.LerpVouchers.AnyAsync(
            lv => lv.SourceTable == evt.SourceTable && lv.SourceId == evt.SourceId && lv.VoucherType == voucherType, ct);
        if (exists)
        {
            evt.ProcessedAt = DateTimeOffset.UtcNow;
            return;
        }

        var payload = JsonDocument.Parse(evt.Payload);
        var root = payload.RootElement;

        var lv = new LerpVoucher
        {
            VoucherType = voucherType,
            SourceTable = evt.SourceTable,
            SourceId = evt.SourceId,
            RefNo = root.TryGetProperty("ref_no", out var rn) ? rn.GetString() : null,
            PartnerId = root.TryGetProperty("partner_id", out var pid) && pid.ValueKind == JsonValueKind.Number ? pid.GetInt64() : null,
            Amount = root.TryGetProperty("amount", out var amt) && amt.ValueKind == JsonValueKind.Number ? amt.GetDecimal() : null,
            Status = "PENDING",
            CreatedAt = DateTimeOffset.UtcNow,
        };

        db.LerpVouchers.Add(lv);
        evt.ProcessedAt = DateTimeOffset.UtcNow;
        log.LogInformation("Created lerp_voucher type={Type} source={Table}/{Id}", voucherType, evt.SourceTable, evt.SourceId);
    }
}