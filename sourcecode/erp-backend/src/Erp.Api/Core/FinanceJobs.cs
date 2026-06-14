using Erp.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace Erp.Api.Core;

/// <summary>Task 23.5: Job định kỳ Hangfire cho phân hệ Tài chính.</summary>
public class FinanceJobs(ErpDbContext db)
{
    /// <summary>Đánh dấu OVERDUE cho hóa đơn còn nợ đã quá hạn thanh toán. Chạy daily.</summary>
    public async Task MarkOverdueInvoicesAsync()
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var overdue = await db.Vouchers
            .Where(v => (v.PaymentStatus == "UNPAID" || v.PaymentStatus == "PARTLY_PAID")
                && v.DueDate != null && v.DueDate < today
                && v.OutstandingAmount > 0)
            .ToListAsync();
        foreach (var v in overdue)
            v.PaymentStatus = "OVERDUE";
        await db.SaveChangesAsync();
    }
}
