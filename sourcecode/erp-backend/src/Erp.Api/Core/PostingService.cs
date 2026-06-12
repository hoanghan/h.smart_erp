using Erp.Api.Data;
using Erp.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace Erp.Api.Core;

/// <summary>
/// Ghi sổ cái: từ voucher POSTED → tạo gl_entries.
/// </summary>
public class PostingService(ErpDbContext db)
{
    public class PostingException(string code, string message) : Exception(message)
    {
        public string Code { get; } = code;
    }

    public async Task PostVoucherAsync(long voucherId, long actedBy)
    {
        var v = await db.Vouchers.Include(x => x.Lines).FirstOrDefaultAsync(x => x.Id == voucherId);
        if (v is null)
            throw new PostingException("NOT_FOUND", $"Chứng từ {voucherId} không tồn tại");
        if (v.Status == "POSTED")
            throw new PostingException("ALREADY_POSTED", "Chứng từ đã ghi sổ");
        if (v.Status is "CANCELLED" or "UNLOCKED")
            throw new PostingException("INVALID_STATUS", $"Trạng thái {v.Status}, không ghi sổ được");

        var postingDate = v.PostingDate ?? v.DocDate;
        var period = await FindOpenPeriodAsync(postingDate);

        // Tạo gl_entry cho mỗi dòng có dr_account_id hoặc cr_account_id
        foreach (var line in v.Lines)
        {
            if (line.DrAccountId.HasValue)
            {
                db.GlEntries.Add(new GlEntry
                {
                    VoucherId = v.Id, VoucherLineId = line.Id,
                    AccountId = line.DrAccountId.Value,
                    ObjectType = line.DrObjectType, ObjectId = line.DrObjectId,
                    CurrencyCode = v.CurrencyCode, ExchangeRate = v.ExchangeRate,
                    FcAmount = line.Amount * v.ExchangeRate, Amount = line.Amount,
                    Side = "DEBIT", Description = line.Description,
                    PostingDate = postingDate, PeriodId = period.Id,
                });
            }
            if (line.CrAccountId.HasValue)
            {
                db.GlEntries.Add(new GlEntry
                {
                    VoucherId = v.Id, VoucherLineId = line.Id,
                    AccountId = line.CrAccountId.Value,
                    ObjectType = line.CrObjectType, ObjectId = line.CrObjectId,
                    CurrencyCode = v.CurrencyCode, ExchangeRate = v.ExchangeRate,
                    FcAmount = line.Amount * v.ExchangeRate, Amount = line.Amount,
                    Side = "CREDIT", Description = line.Description,
                    PostingDate = postingDate, PeriodId = period.Id,
                });
            }
        }

        v.Status = "POSTED";
        v.PostedBy = actedBy;
        v.PostedAt = DateTimeOffset.UtcNow;
        v.PeriodId = period.Id;
        v.PostingDate = postingDate;
        await db.SaveChangesAsync();
    }

    public async Task UnpostVoucherAsync(long voucherId, long actedBy)
    {
        var v = await db.Vouchers.FirstOrDefaultAsync(x => x.Id == voucherId);
        if (v is null)
            throw new PostingException("NOT_FOUND", $"Chứng từ {voucherId} không tồn tại");
        if (v.Status != "POSTED")
            throw new PostingException("INVALID_STATUS", "Chỉ bỏ ghi sổ cho chứng từ đã POSTED");

        // Xóa gl_entries
        var entries = await db.GlEntries.Where(e => e.VoucherId == voucherId).ToListAsync();
        db.GlEntries.RemoveRange(entries);

        v.Status = "UNLOCKED";
        await db.SaveChangesAsync();
    }

    private async Task<FiscalPeriod> FindOpenPeriodAsync(DateOnly date)
    {
        var period = await db.FiscalPeriods
            .FirstOrDefaultAsync(p => p.Status == "OPEN" && p.DateFrom <= date && p.DateTo >= date);
        if (period is null)
            throw new PostingException("PERIOD_CLOSED", $"Không tìm thấy kỳ mở cho ngày {date:yyyy-MM-dd}");
        return period;
    }
}