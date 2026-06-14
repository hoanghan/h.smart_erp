using Erp.Api.Data;
using Erp.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace Erp.Api.Core;

/// <summary>
/// Ghi sổ cái: từ voucher POSTED → tạo gl_entries.
/// Task 23: GL entry immutable + reversal (cancel-posting/amend), invoice outstanding, payment paid/unallocated.
/// </summary>
public class PostingService(ErpDbContext db)
{
    public class PostingException(string code, string message) : Exception(message)
    {
        public string Code { get; } = code;
    }

    private static readonly string[] InvoiceVoucherTypes = ["HOA_DON_BAN", "PHIEU_MUA_HANG"];
    private static readonly string[] PaymentTypes = ["RECEIVE", "PAY", "INTERNAL_TRANSFER"];

    public async Task PostVoucherAsync(long voucherId, long actedBy)
    {
        var v = await db.Vouchers.Include(x => x.Lines).FirstOrDefaultAsync(x => x.Id == voucherId);
        if (v is null)
            throw new PostingException("NOT_FOUND", $"Chứng từ {voucherId} không tồn tại");
        if (v.Status == "POSTED")
            throw new PostingException("ALREADY_POSTED", "Chứng từ đã ghi sổ");
        if (v.Status is "CANCELLED" or "UNLOCKED" or "CANCELLED_POSTED")
            throw new PostingException("INVALID_STATUS", $"Trạng thái {v.Status}, không ghi sổ được");

        var postingDate = v.PostingDate ?? v.DocDate;
        var period = await FindOpenPeriodAsync(postingDate);

        var policy = await db.AccountingPolicies.FindAsync(1L);
        var accountIds = v.Lines.SelectMany(l => new[] { l.DrAccountId, l.CrAccountId })
            .Where(id => id.HasValue).Select(id => id!.Value).Distinct().ToList();
        var accounts = await db.Accounts.Where(a => accountIds.Contains(a.Id))
            .ToDictionaryAsync(a => a.Id);

        // Kiểm tra cost center bắt buộc cho TK chi phí
        if (policy?.RequireCostCenter == true)
        {
            foreach (var line in v.Lines)
            {
                if (line.DrAccountId.HasValue && accounts.TryGetValue(line.DrAccountId.Value, out var drAcc)
                    && drAcc.AccountType == "EXPENSE" && line.CostCenterId is null)
                    throw new PostingException("COST_CENTER_REQUIRED", $"Dòng hạch toán Nợ TK {drAcc.Code} yêu cầu trung tâm chi phí");
                if (line.CrAccountId.HasValue && accounts.TryGetValue(line.CrAccountId.Value, out var crAcc)
                    && crAcc.AccountType == "EXPENSE" && line.CostCenterId is null)
                    throw new PostingException("COST_CENTER_REQUIRED", $"Dòng hạch toán Có TK {crAcc.Code} yêu cầu trung tâm chi phí");
            }
        }

        // Tạo gl_entry cho mỗi dòng có dr_account_id hoặc cr_account_id
        foreach (var line in v.Lines)
        {
            if (line.DrAccountId.HasValue)
            {
                var against = line.CrAccountId.HasValue && accounts.TryGetValue(line.CrAccountId.Value, out var crA) ? crA.Code : null;
                db.GlEntries.Add(new GlEntry
                {
                    VoucherId = v.Id, VoucherLineId = line.Id,
                    AccountId = line.DrAccountId.Value,
                    ObjectType = line.DrObjectType, ObjectId = line.DrObjectId,
                    PartyType = line.DrObjectType, PartyId = line.DrObjectId,
                    CurrencyCode = v.CurrencyCode, ExchangeRate = v.ExchangeRate,
                    FcAmount = line.Amount * v.ExchangeRate, Amount = line.Amount,
                    Side = "DEBIT", Description = line.Description,
                    PostingDate = postingDate, PeriodId = period.Id,
                    CostCenterId = line.CostCenterId, Against = against,
                });
            }
            if (line.CrAccountId.HasValue)
            {
                var against = line.DrAccountId.HasValue && accounts.TryGetValue(line.DrAccountId.Value, out var drA) ? drA.Code : null;
                db.GlEntries.Add(new GlEntry
                {
                    VoucherId = v.Id, VoucherLineId = line.Id,
                    AccountId = line.CrAccountId.Value,
                    ObjectType = line.CrObjectType, ObjectId = line.CrObjectId,
                    PartyType = line.CrObjectType, PartyId = line.CrObjectId,
                    CurrencyCode = v.CurrencyCode, ExchangeRate = v.ExchangeRate,
                    FcAmount = line.Amount * v.ExchangeRate, Amount = line.Amount,
                    Side = "CREDIT", Description = line.Description,
                    PostingDate = postingDate, PeriodId = period.Id,
                    CostCenterId = line.CostCenterId, Against = against,
                });
            }
        }

        v.Status = "POSTED";
        v.PostedBy = actedBy;
        v.PostedAt = DateTimeOffset.UtcNow;
        v.PeriodId = period.Id;
        v.PostingDate = postingDate;

        // Invoice outstanding (Task 23.2)
        if (InvoiceVoucherTypes.Contains(v.VoucherType))
        {
            var total = v.TotalAmount ?? v.Lines.Sum(l => l.Amount);
            v.OutstandingAmount = total;
            v.DueDate ??= postingDate;
            v.PaymentStatus = total <= 0 ? "PAID" : "UNPAID";
        }

        // Payment Entry paid/unallocated (Task 23.3)
        if (v.PaymentType is not null && PaymentTypes.Contains(v.PaymentType))
        {
            var total = v.TotalAmount ?? v.Lines.Sum(l => l.Amount);
            v.PaidAmount = total;
            v.UnallocatedAmount = total;
        }

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

    /// <summary>
    /// Task 23.1: Hủy ghi sổ kiểu ERPNext — không xóa gl_entry, sinh bộ bút toán đảo
    /// (đổi Nợ↔Có), đánh dấu is_cancelled cả 2 bộ. Voucher → CANCELLED_POSTED.
    /// </summary>
    public async Task CancelPostingAsync(long voucherId, long actedBy)
    {
        var v = await db.Vouchers.FirstOrDefaultAsync(x => x.Id == voucherId);
        if (v is null)
            throw new PostingException("NOT_FOUND", $"Chứng từ {voucherId} không tồn tại");
        if (v.Status != "POSTED")
            throw new PostingException("INVALID_STATUS", "Chỉ hủy ghi sổ cho chứng từ đã POSTED");

        var entries = await db.GlEntries.Where(e => e.VoucherId == voucherId && !e.IsCancelled).ToListAsync();
        foreach (var e in entries)
        {
            e.IsCancelled = true;
            db.GlEntries.Add(new GlEntry
            {
                VoucherId = e.VoucherId, VoucherLineId = e.VoucherLineId, AccountId = e.AccountId,
                ObjectType = e.ObjectType, ObjectId = e.ObjectId,
                PartyType = e.PartyType, PartyId = e.PartyId,
                CurrencyCode = e.CurrencyCode, ExchangeRate = e.ExchangeRate,
                FcAmount = e.FcAmount, Amount = e.Amount,
                Side = e.Side == "DEBIT" ? "CREDIT" : "DEBIT",
                Description = e.Description, Against = e.Against, CostCenterId = e.CostCenterId,
                PostingDate = e.PostingDate, PeriodId = e.PeriodId,
                IsCancelled = true,
                Remarks = $"Đảo bút toán hủy chứng từ {v.DocNo}",
            });
        }

        v.Status = "CANCELLED_POSTED";
        await db.SaveChangesAsync();
    }

    /// <summary>
    /// Task 23.1: Amend = cancel-posting (nếu đang POSTED) rồi tạo voucher mới copy nội dung,
    /// doc_no thêm hậu tố -N như ERPNext.
    /// </summary>
    public async Task<Voucher> AmendVoucherAsync(long voucherId, long actedBy)
    {
        var orig = await db.Vouchers.Include(x => x.Lines).FirstOrDefaultAsync(x => x.Id == voucherId);
        if (orig is null)
            throw new PostingException("NOT_FOUND", $"Chứng từ {voucherId} không tồn tại");

        if (orig.Status == "POSTED")
            await CancelPostingAsync(voucherId, actedBy);
        else if (orig.Status != "CANCELLED_POSTED")
            throw new PostingException("INVALID_STATUS", $"Chỉ amend chứng từ đã POSTED hoặc CANCELLED_POSTED (hiện tại: {orig.Status})");

        var rootDocNo = orig.DocNo;
        var dashIdx = rootDocNo.LastIndexOf('-');
        if (orig.AmendedFromId is not null && dashIdx > 0 && int.TryParse(rootDocNo[(dashIdx + 1)..], out _))
            rootDocNo = rootDocNo[..dashIdx];

        var suffix = 1;
        while (await db.Vouchers.AnyAsync(x => x.VoucherType == orig.VoucherType && x.DocNo == $"{rootDocNo}-{suffix}"))
            suffix++;

        var copy = new Voucher
        {
            VoucherType = orig.VoucherType, DocNo = $"{rootDocNo}-{suffix}",
            DocDate = orig.DocDate, PeriodId = null,
            OperationId = orig.OperationId, PartnerId = orig.PartnerId, EmployeeId = orig.EmployeeId,
            FundId = orig.FundId, WarehouseId = orig.WarehouseId, YccType = orig.YccType,
            InvoiceNo = orig.InvoiceNo, InvoiceSerial = orig.InvoiceSerial, InvoiceForm = orig.InvoiceForm, InvoiceDate = orig.InvoiceDate,
            CurrencyCode = orig.CurrencyCode, ExchangeRate = orig.ExchangeRate,
            TotalAmount = orig.TotalAmount, TotalVat = orig.TotalVat,
            Description = orig.Description, Status = "DRAFT",
            AmendedFromId = orig.Id, CreatedBy = actedBy,
            DueDate = orig.DueDate, PaymentType = orig.PaymentType,
            Lines = orig.Lines.Select(l => new VoucherLine
            {
                ProductId = l.ProductId, Description = l.Description,
                Quantity = l.Quantity, UnitPrice = l.UnitPrice,
                Amount = l.Amount, VatPct = l.VatPct, VatAmount = l.VatAmount,
                DrAccountId = l.DrAccountId, CrAccountId = l.CrAccountId,
                DrObjectId = l.DrObjectId, DrObjectType = l.DrObjectType,
                CrObjectId = l.CrObjectId, CrObjectType = l.CrObjectType,
                RefVoucherId = l.RefVoucherId, CostCenterId = l.CostCenterId,
            }).ToList(),
        };
        db.Vouchers.Add(copy);
        await db.SaveChangesAsync();
        return copy;
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
