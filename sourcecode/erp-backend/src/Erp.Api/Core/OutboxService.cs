using System.Text.Json;
using Erp.Api.Data;
using Erp.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace Erp.Api.Core;

/// <summary>
/// Ghi event vào outbox (finance.outbox_event) để LerpWorker xử lý sau.
/// </summary>
public class OutboxService(ErpDbContext db)
{
    public async Task PublishAsync(string eventType, string sourceTable, long sourceId, object payload)
    {
        db.OutboxEvents.Add(new OutboxEvent
        {
            EventType = eventType,
            SourceTable = sourceTable,
            SourceId = sourceId,
            Payload = JsonSerializer.Serialize(payload),
            CreatedAt = DateTimeOffset.UtcNow,
        });
        await db.SaveChangesAsync();
    }

    public async Task<bool> HasAccountingDocAsync(string sourceTable, long sourceId)
    {
        return await db.LerpVouchers.AnyAsync(lv =>
            lv.SourceTable == sourceTable && lv.SourceId == sourceId &&
            lv.Status != "DELETED");
    }
}