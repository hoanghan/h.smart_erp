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
[Route("api/v1/finance")]
public class FinanceController(
    ErpDbContext db, RbacService rbac, DocNumberingService numbering, PostingService posting)
    : ControllerBase
{
    private async Task<bool> Denied(string action, string resource = "finance") =>
        !await rbac.HasPermissionAsync(User, "DOCUMENT", resource, action);

    private ObjectResult Forbidden(string action) =>
        StatusCode(403, new ApiError("WF_NO_PERMISSION", $"Thiếu quyền {action} trên DOCUMENT:finance"));

    // ===== Accounts =====
    [HttpGet("accounts")]
    public async Task<IActionResult> ListAccounts([FromQuery] string? accountType, [FromQuery] bool? isActive)
    {
        if (await Denied("VIEW")) return Forbidden("VIEW");
        var q = db.Accounts.AsNoTracking().AsQueryable();
        if (!string.IsNullOrEmpty(accountType)) q = q.Where(a => a.AccountType == accountType);
        if (isActive.HasValue) q = q.Where(a => a.IsActive == isActive.Value);
        var items = await q.OrderBy(a => a.Code).ToListAsync();
        return Ok(items.Select(a => a.ToDto()).ToList());
    }

    [HttpGet("accounts/{id:long}")]
    public async Task<IActionResult> GetAccount(long id)
    {
        if (await Denied("VIEW")) return Forbidden("VIEW");
        var a = await db.Accounts.FindAsync(id);
        return a is null ? NotFound(new ApiError("NOT_FOUND", $"Tài khoản {id} không tồn tại")) : Ok(a.ToDto());
    }

    [HttpPost("accounts")]
    public async Task<IActionResult> CreateAccount([FromBody] AccountCreate body)
    {
        if (await Denied("CREATE")) return Forbidden("CREATE");
        var a = new Account
        {
            Code = body.Code, Name = body.Name, ParentId = body.ParentId,
            AccountType = body.AccountType, ObjectCategoryId = body.ObjectCategoryId,
            BalanceDetail = body.BalanceDetail, BalanceSide = body.BalanceSide,
        };
        db.Accounts.Add(a);
        await db.SaveChangesAsync();
        return StatusCode(201, a.ToDto());
    }

    [HttpPut("accounts/{id:long}")]
    public async Task<IActionResult> UpdateAccount(long id, [FromBody] AccountUpdate body)
    {
        if (await Denied("UPDATE")) return Forbidden("UPDATE");
        var a = await db.Accounts.FindAsync(id);
        if (a is null) return NotFound(new ApiError("NOT_FOUND", $"Tài khoản {id} không tồn tại"));
        Mapper.Apply(body, a, skipNulls: true);
        await db.SaveChangesAsync();
        return Ok(a.ToDto());
    }

    // ===== Fiscal Periods =====
    [HttpGet("fiscal-periods")]
    public async Task<IActionResult> ListPeriods([FromQuery] int? year)
    {
        if (await Denied("VIEW")) return Forbidden("VIEW");
        var q = db.FiscalPeriods.AsNoTracking().AsQueryable();
        if (year.HasValue) q = q.Where(p => p.FiscalYear == year.Value);
        var items = await q.OrderBy(p => p.FiscalYear).ThenBy(p => p.PeriodNo).ToListAsync();
        return Ok(items.Select(p => p.ToDto()).ToList());
    }

    [HttpPost("fiscal-periods/{id:long}/close")]
    public async Task<IActionResult> ClosePeriod(long id)
    {
        if (await Denied("UPDATE")) return Forbidden("UPDATE");
        var p = await db.FiscalPeriods.FindAsync(id);
        if (p is null) return NotFound(new ApiError("NOT_FOUND", $"Kỳ kế toán {id} không tồn tại"));
        if (p.Status == "CLOSED") return Conflict(new ApiError("ALREADY_CLOSED", "Kỳ đã đóng"));
        p.Status = "CLOSED";
        await db.SaveChangesAsync();
        return Ok(p.ToDto());
    }

    [HttpPost("fiscal-periods/{id:long}/reopen")]
    public async Task<IActionResult> ReopenPeriod(long id)
    {
        if (await Denied("UPDATE")) return Forbidden("UPDATE");
        var p = await db.FiscalPeriods.FindAsync(id);
        if (p is null) return NotFound(new ApiError("NOT_FOUND", $"Kỳ kế toán {id} không tồn tại"));
        if (p.Status == "OPEN") return Conflict(new ApiError("ALREADY_OPEN", "Kỳ đã mở"));
        p.Status = "OPEN";
        await db.SaveChangesAsync();
        return Ok(p.ToDto());
    }

    /// <summary>Task 23.7: Chứng từ kết chuyển 911→421 cho kỳ — tạo và ghi sổ CT_KET_CHUYEN. Có thể hủy ghi sổ và chạy lại.</summary>
    [HttpPost("period-closing")]
    public async Task<IActionResult> RunPeriodClosing([FromBody] PeriodClosingRequest body)
    {
        if (await Denied("UPDATE")) return Forbidden("UPDATE");
        var period = await db.FiscalPeriods.FindAsync(body.PeriodId);
        if (period is null) return NotFound(new ApiError("NOT_FOUND", $"Kỳ kế toán {body.PeriodId} không tồn tại"));

        var alreadyClosed = await db.Vouchers.AnyAsync(v =>
            v.VoucherType == "CT_KET_CHUYEN" && v.PeriodId == period.Id && v.Status == "POSTED");
        if (alreadyClosed)
            return Conflict(new ApiError("ALREADY_CLOSED", "Kỳ đã có chứng từ kết chuyển đang ghi sổ — hủy ghi sổ trước khi chạy lại"));

        var accounts = await db.Accounts.AsNoTracking()
            .Where(a => a.AccountType == "REVENUE" || a.AccountType == "EXPENSE")
            .ToListAsync();
        var account911 = await db.Accounts.AsNoTracking().FirstAsync(a => a.Code == "911");
        var account421 = await db.Accounts.AsNoTracking().FirstAsync(a => a.Code == "421");

        var accountIds = accounts.Select(a => a.Id).ToList();
        var activity = await db.GlEntries.AsNoTracking()
            .Where(e => !e.IsCancelled && e.PostingDate >= period.DateFrom && e.PostingDate <= period.DateTo
                && accountIds.Contains(e.AccountId))
            .GroupBy(e => e.AccountId)
            .Select(g => new
            {
                AccountId = g.Key,
                Debit = g.Where(x => x.Side == "DEBIT").Sum(x => x.Amount),
                Credit = g.Where(x => x.Side == "CREDIT").Sum(x => x.Amount),
            })
            .ToDictionaryAsync(x => x.AccountId);

        var lines = new List<VoucherLine>();
        decimal net911 = 0;
        foreach (var a in accounts)
        {
            if (!activity.TryGetValue(a.Id, out var act)) continue;
            var raw = act.Debit - act.Credit;
            if (raw == 0) continue;
            net911 += raw;
            lines.Add(raw > 0
                ? new VoucherLine { DrAccountId = account911.Id, CrAccountId = a.Id, Amount = raw, Description = $"Kết chuyển {a.Code} - {a.Name}" }
                : new VoucherLine { DrAccountId = a.Id, CrAccountId = account911.Id, Amount = -raw, Description = $"Kết chuyển {a.Code} - {a.Name}" });
        }

        if (net911 > 0)
            lines.Add(new VoucherLine { DrAccountId = account421.Id, CrAccountId = account911.Id, Amount = net911, Description = "Kết chuyển lỗ vào 421" });
        else if (net911 < 0)
            lines.Add(new VoucherLine { DrAccountId = account911.Id, CrAccountId = account421.Id, Amount = -net911, Description = "Kết chuyển lãi vào 421" });

        if (lines.Count == 0)
            return Ok(new { message = "Không có số dư doanh thu/chi phí cần kết chuyển trong kỳ" });

        var v = new Voucher
        {
            VoucherType = "CT_KET_CHUYEN",
            DocNo = await numbering.NextAsync("CT_KET_CHUYEN", period.DateTo),
            DocDate = period.DateTo, PostingDate = period.DateTo,
            CurrencyCode = "VND", ExchangeRate = 1,
            TotalAmount = lines.Sum(l => l.Amount),
            Description = $"Kết chuyển doanh thu/chi phí kỳ {period.FiscalYear}/{period.PeriodNo:D2}",
            Status = "DRAFT", CreatedBy = RbacService.GetUserId(User),
            Lines = lines,
        };
        db.Vouchers.Add(v);
        await db.SaveChangesAsync();

        try
        {
            await posting.PostVoucherAsync(v.Id, RbacService.GetUserId(User)!.Value);
        }
        catch (PostingService.PostingException e)
        {
            return Conflict(new ApiError(e.Code, e.Message));
        }

        var result = await db.Vouchers.Include(x => x.Lines).AsNoTracking().FirstAsync(x => x.Id == v.Id);
        return StatusCode(201, result.ToDto());
    }

    // ===== Accounting Policy =====
    [HttpGet("accounting-policy")]
    public async Task<IActionResult> GetPolicy()
    {
        if (await Denied("VIEW")) return Forbidden("VIEW");
        var p = await db.AccountingPolicies.FindAsync(1L);
        return p is null ? NotFound() : Ok(p.ToDto());
    }

    [HttpPut("accounting-policy")]
    public async Task<IActionResult> UpdatePolicy([FromBody] AccountingPolicyUpdate body)
    {
        if (await Denied("UPDATE")) return Forbidden("UPDATE");
        var p = await db.AccountingPolicies.FindAsync(1L);
        if (p is null) return NotFound();
        if (body.BaseCurrency is not null) p.BaseCurrency = body.BaseCurrency;
        if (body.AccountingRegime is not null) p.AccountingRegime = body.AccountingRegime;
        if (body.FiscalStartMonth.HasValue) p.FiscalStartMonth = body.FiscalStartMonth.Value;
        if (body.InventoryCosting is not null) p.InventoryCosting = body.InventoryCosting;
        if (body.FirstPeriodId.HasValue) p.FirstPeriodId = body.FirstPeriodId;
        if (body.RequireCostCenter.HasValue) p.RequireCostCenter = body.RequireCostCenter.Value;
        if (body.PerpetualInventory.HasValue) p.PerpetualInventory = body.PerpetualInventory.Value;
        await db.SaveChangesAsync();
        return Ok(p.ToDto());
    }

    // ===== Cash Funds =====
    [HttpGet("cash-funds")]
    public async Task<IActionResult> ListCashFunds()
    {
        if (await Denied("VIEW")) return Forbidden("VIEW");
        var items = await db.CashFunds.AsNoTracking().OrderBy(f => f.Code).ToListAsync();
        return Ok(items.Select(f => f.ToDto()).ToList());
    }

    [HttpPost("cash-funds")]
    public async Task<IActionResult> CreateCashFund([FromBody] CashFundCreate body)
    {
        if (await Denied("CREATE")) return Forbidden("CREATE");
        var f = new CashFund
        {
            Code = body.Code, Name = body.Name, FundType = body.FundType,
            AccountId = body.AccountId, BankName = body.BankName,
            AccountNo = body.AccountNo, CurrencyCode = body.CurrencyCode,
        };
        db.CashFunds.Add(f);
        await db.SaveChangesAsync();
        return StatusCode(201, f.ToDto());
    }

    // ===== Object Categories =====
    [HttpGet("object-categories")]
    public async Task<IActionResult> ListObjectCategories()
    {
        if (await Denied("VIEW")) return Forbidden("VIEW");
        var items = await db.ObjectCategories.AsNoTracking().OrderBy(c => c.Code).ToListAsync();
        return Ok(items.Select(c => c.ToDto()).ToList());
    }

    [HttpPost("object-categories")]
    public async Task<IActionResult> CreateObjectCategory([FromBody] ObjectCategoryCreate body)
    {
        if (await Denied("CREATE")) return Forbidden("CREATE");
        var c = new ObjectCategory { Code = body.Code, Name = body.Name, SourceTable = body.SourceTable };
        db.ObjectCategories.Add(c);
        await db.SaveChangesAsync();
        return StatusCode(201, c.ToDto());
    }

    // ===== Business Operations =====
    [HttpGet("business-operations")]
    public async Task<IActionResult> ListBusinessOperations()
    {
        if (await Denied("VIEW")) return Forbidden("VIEW");
        var items = await db.BusinessOperations.AsNoTracking().OrderBy(o => o.Code).ToListAsync();
        return Ok(items.Select(o => o.ToDto()).ToList());
    }

    // ===== Opening Balances =====
    [HttpGet("opening-balances")]
    public async Task<IActionResult> ListOpeningBalances([FromQuery] long? periodId, [FromQuery] long? accountId)
    {
        if (await Denied("VIEW")) return Forbidden("VIEW");
        var q = db.OpeningBalances.AsNoTracking().AsQueryable();
        if (periodId.HasValue) q = q.Where(b => b.PeriodId == periodId.Value);
        if (accountId.HasValue) q = q.Where(b => b.AccountId == accountId.Value);
        var items = await q.OrderBy(b => b.AccountId).ToListAsync();
        return Ok(items.Select(b => b.ToDto()).ToList());
    }

    [HttpPost("opening-balances")]
    public async Task<IActionResult> CreateOpeningBalance([FromBody] OpeningBalanceCreate body)
    {
        if (await Denied("CREATE")) return Forbidden("CREATE");
        var b = new OpeningBalance
        {
            PeriodId = body.PeriodId, AccountId = body.AccountId,
            ObjectType = body.ObjectType, ObjectId = body.ObjectId,
            CurrencyCode = body.CurrencyCode, WarehouseId = body.WarehouseId,
            ProductId = body.ProductId, DebitFc = body.DebitFc, CreditFc = body.CreditFc,
            Debit = body.Debit, Credit = body.Credit, Quantity = body.Quantity,
        };
        db.OpeningBalances.Add(b);
        await db.SaveChangesAsync();
        return StatusCode(201, b.ToDto());
    }

    // ===== LERP Vouchers =====
    [HttpGet("lerp-vouchers")]
    public async Task<IActionResult> ListLerpVouchers(
        [FromQuery] string? status, [FromQuery] string? voucherType,
        [FromQuery] int page = 1, [FromQuery] int size = 50)
    {
        if (await Denied("VIEW")) return Forbidden("VIEW");
        var q = db.LerpVouchers.AsNoTracking().AsQueryable();
        if (!string.IsNullOrEmpty(status)) q = q.Where(lv => lv.Status == status);
        if (!string.IsNullOrEmpty(voucherType)) q = q.Where(lv => lv.VoucherType == voucherType);
        var total = await q.LongCountAsync();
        var items = await q.OrderByDescending(lv => lv.Id)
            .Skip((Math.Max(1, page) - 1) * size).Take(Math.Clamp(size, 1, 200)).ToListAsync();
        return Ok(new PageResult<LerpVoucherOut>(items.Select(lv => lv.ToDto()).ToList(), total, page, size));
    }

    [HttpGet("lerp-vouchers/{id:long}")]
    public async Task<IActionResult> GetLerpVoucher(long id)
    {
        if (await Denied("VIEW")) return Forbidden("VIEW");
        var lv = await db.LerpVouchers.FindAsync(id);
        return lv is null ? NotFound(new ApiError("NOT_FOUND", $"LERP voucher {id} không tồn tại")) : Ok(lv.ToDto());
    }

    /// <summary>Generate: PENDING → GENERATED + tạo finance.voucher nháp.</summary>
    [HttpPost("lerp-vouchers/{id:long}/generate")]
    public async Task<IActionResult> GenerateLerpVoucher(long id, [FromBody] LerpVoucherGenerateRequest? body)
    {
        if (await Denied("UPDATE")) return Forbidden("UPDATE");
        var lv = await db.LerpVouchers.FindAsync(id);
        if (lv is null) return NotFound(new ApiError("NOT_FOUND", $"LERP voucher {id} không tồn tại"));
        if (lv.Status != "PENDING")
            return Conflict(new ApiError("INVALID_STATUS", $"LERP voucher đang ở trạng thái {lv.Status}, cần PENDING"));

        var docNo = await numbering.NextAsync("FINANCE_VOUCHER");
        var docDate = DateOnly.FromDateTime(DateTime.Today);
        var v = new Voucher
        {
            VoucherType = MapLerpToVoucherType(lv.VoucherType),
            DocNo = docNo,
            DocDate = docDate,
            PostingDate = body?.PostingDate ?? docDate,
            PeriodId = body?.PeriodId,
            PartnerId = lv.PartnerId,
            CurrencyCode = "VND",
            TotalAmount = lv.Amount,
            Description = $"Từ LERP {lv.VoucherType} nguồn {lv.SourceTable}/{lv.SourceId}",
            LerpVoucherId = lv.Id,
            Status = "DRAFT",
            CreatedBy = RbacService.GetUserId(User),
        };
        db.Vouchers.Add(v);

        lv.Status = "GENERATED";
        // voucher_id will be set after SaveChanges when EF populates v.Id
        lv.VoucherId = v.Id;
        await db.SaveChangesAsync();
        return Ok(new { lerp = lv.ToDto(), voucher = v.ToDto() });
    }

    [HttpDelete("lerp-vouchers/{id:long}")]
    public async Task<IActionResult> DeleteLerpVoucher(long id)
    {
        if (await Denied("DELETE")) return Forbidden("DELETE");
        var lv = await db.LerpVouchers.FindAsync(id);
        if (lv is null) return NotFound(new ApiError("NOT_FOUND", $"LERP voucher {id} không tồn tại"));
        if (lv.Status is "GENERATED" or "POSTED")
            return Conflict(new ApiError("HAS_VOUCHER", "LERP voucher đã sinh chứng từ, không xóa được"));
        lv.Status = "DELETED";
        await db.SaveChangesAsync();
        return Ok(lv.ToDto());
    }

    // ===== Vouchers =====
    [HttpGet("vouchers")]
    public async Task<IActionResult> ListVouchers(
        [FromQuery] string? voucherType, [FromQuery] string? status,
        [FromQuery] long? partnerId, [FromQuery] DateOnly? dateFrom, [FromQuery] DateOnly? dateTo,
        [FromQuery] int page = 1, [FromQuery] int size = 50)
    {
        if (await Denied("VIEW")) return Forbidden("VIEW");
        var q = db.Vouchers.Include(v => v.Lines).AsNoTracking().AsQueryable();
        if (!string.IsNullOrEmpty(voucherType)) q = q.Where(v => v.VoucherType == voucherType);
        if (!string.IsNullOrEmpty(status)) q = q.Where(v => v.Status == status);
        if (partnerId.HasValue) q = q.Where(v => v.PartnerId == partnerId);
        if (dateFrom.HasValue) q = q.Where(v => v.DocDate >= dateFrom);
        if (dateTo.HasValue) q = q.Where(v => v.DocDate <= dateTo);
        var total = await q.LongCountAsync();
        var items = await q.OrderByDescending(v => v.Id)
            .Skip((Math.Max(1, page) - 1) * size).Take(Math.Clamp(size, 1, 200)).ToListAsync();
        return Ok(new PageResult<VoucherOut>(items.Select(v => v.ToDto()).ToList(), total, page, size));
    }

    [HttpGet("vouchers/{id:long}")]
    public async Task<IActionResult> GetVoucher(long id)
    {
        if (await Denied("VIEW")) return Forbidden("VIEW");
        var v = await db.Vouchers.Include(v => v.Lines).AsNoTracking().FirstOrDefaultAsync(v => v.Id == id);
        return v is null ? NotFound(new ApiError("NOT_FOUND", $"Chứng từ {id} không tồn tại")) : Ok(v.ToDto());
    }

    [HttpPost("vouchers")]
    public async Task<IActionResult> CreateVoucher([FromBody] VoucherCreate body)
    {
        if (await Denied("CREATE")) return Forbidden("CREATE");
        var docNo = body.DocNo ?? await numbering.NextAsync("FINANCE_VOUCHER");
        var v = new Voucher
        {
            VoucherType = body.VoucherType, DocNo = docNo,
            DocDate = body.DocDate ?? DateOnly.FromDateTime(DateTime.Today),
            PostingDate = body.PostingDate, PeriodId = body.PeriodId,
            OperationId = body.OperationId, PartnerId = body.PartnerId,
            EmployeeId = body.EmployeeId, FundId = body.FundId,
            WarehouseId = body.WarehouseId, YccType = body.YccType,
            InvoiceNo = body.InvoiceNo, InvoiceSerial = body.InvoiceSerial,
            InvoiceForm = body.InvoiceForm, InvoiceDate = body.InvoiceDate,
            CurrencyCode = body.CurrencyCode ?? "VND",
            ExchangeRate = body.ExchangeRate ?? 1,
            Description = body.Description, LerpVoucherId = body.LerpVoucherId,
            Status = "DRAFT", CreatedBy = RbacService.GetUserId(User),
            DueDate = body.DueDate, PaymentType = body.PaymentType,
            Lines = (body.Lines ?? new()).Select(l => new VoucherLine
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
        db.Vouchers.Add(v);
        await db.SaveChangesAsync();
        return StatusCode(201, v.ToDto());
    }

    [HttpPut("vouchers/{id:long}")]
    public async Task<IActionResult> UpdateVoucher(long id, [FromBody] VoucherUpdate body)
    {
        if (await Denied("UPDATE")) return Forbidden("UPDATE");
        var v = await db.Vouchers.FirstOrDefaultAsync(x => x.Id == id);
        if (v is null) return NotFound(new ApiError("NOT_FOUND", $"Chứng từ {id} không tồn tại"));
        if (v.Status is "POSTED" or "CANCELLED")
            return Conflict(new ApiError("WF_LOCKED", $"Trạng thái {v.Status}, không sửa được"));
        Mapper.Apply(body, v, skipNulls: true);
        await db.SaveChangesAsync();
        return Ok(v.ToDto());
    }

    [HttpPost("vouchers/{id:long}/post")]
    public async Task<IActionResult> PostVoucher(long id)
    {
        if (await Denied("POST")) return Forbidden("POST");
        try
        {
            await posting.PostVoucherAsync(id, RbacService.GetUserId(User).Value);
        }
        catch (PostingService.PostingException e)
        {
            return Conflict(new ApiError(e.Code, e.Message));
        }
        var v = await db.Vouchers.Include(x => x.Lines).FirstAsync(x => x.Id == id);
        return Ok(v.ToDto());
    }

    [HttpPost("vouchers/{id:long}/unpost")]
    public async Task<IActionResult> UnpostVoucher(long id)
    {
        if (await Denied("POST")) return Forbidden("POST");
        try
        {
            await posting.UnpostVoucherAsync(id, RbacService.GetUserId(User).Value);
        }
        catch (PostingService.PostingException e)
        {
            return Conflict(new ApiError(e.Code, e.Message));
        }
        return Ok(new { message = "Unposted" });
    }

    [HttpPost("vouchers/{id:long}/cancel")]
    public async Task<IActionResult> CancelVoucher(long id)
    {
        if (await Denied("UPDATE")) return Forbidden("UPDATE");
        var v = await db.Vouchers.FirstOrDefaultAsync(x => x.Id == id);
        if (v is null) return NotFound(new ApiError("NOT_FOUND", $"Chứng từ {id} không tồn tại"));
        if (v.Status is "POSTED")
            return Conflict(new ApiError("WF_LOCKED", "Chứng từ đã ghi sổ, cần bỏ ghi sổ trước"));
        v.Status = "CANCELLED";
        await db.SaveChangesAsync();
        return Ok(v.ToDto());
    }

    /// <summary>Task 23.1: Hủy ghi sổ kiểu ERPNext — sinh bộ gl_entry đảo, voucher → CANCELLED_POSTED.</summary>
    [HttpPost("vouchers/{id:long}/cancel-posting")]
    public async Task<IActionResult> CancelPosting(long id)
    {
        if (await Denied("POST")) return Forbidden("POST");
        try
        {
            await posting.CancelPostingAsync(id, RbacService.GetUserId(User).Value);
        }
        catch (PostingService.PostingException e)
        {
            return Conflict(new ApiError(e.Code, e.Message));
        }
        var v = await db.Vouchers.Include(x => x.Lines).AsNoTracking().FirstAsync(x => x.Id == id);
        return Ok(v.ToDto());
    }

    /// <summary>Task 23.1: Amend = cancel-posting (nếu POSTED) + tạo voucher mới copy, doc_no thêm hậu tố -N.</summary>
    [HttpPost("vouchers/{id:long}/amend")]
    public async Task<IActionResult> AmendVoucher(long id)
    {
        if (await Denied("UPDATE")) return Forbidden("UPDATE");
        Voucher copy;
        try
        {
            copy = await posting.AmendVoucherAsync(id, RbacService.GetUserId(User).Value);
        }
        catch (PostingService.PostingException e)
        {
            return Conflict(new ApiError(e.Code, e.Message));
        }
        var v = await db.Vouchers.Include(x => x.Lines).AsNoTracking().FirstAsync(x => x.Id == copy.Id);
        return StatusCode(201, v.ToDto());
    }

    // ===== GL Entries =====
    [HttpGet("gl-entries")]
    public async Task<IActionResult> ListGlEntries(
        [FromQuery] long? accountId, [FromQuery] long? voucherId,
        [FromQuery] DateOnly? dateFrom, [FromQuery] DateOnly? dateTo,
        [FromQuery] int page = 1, [FromQuery] int size = 50)
    {
        if (await Denied("VIEW")) return Forbidden("VIEW");
        var q = db.GlEntries.AsNoTracking().AsQueryable();
        if (accountId.HasValue) q = q.Where(e => e.AccountId == accountId);
        if (voucherId.HasValue) q = q.Where(e => e.VoucherId == voucherId);
        if (dateFrom.HasValue) q = q.Where(e => e.PostingDate >= dateFrom);
        if (dateTo.HasValue) q = q.Where(e => e.PostingDate <= dateTo);
        var total = await q.LongCountAsync();
        var items = await q.OrderByDescending(e => e.Id)
            .Skip((Math.Max(1, page) - 1) * size).Take(Math.Clamp(size, 1, 200)).ToListAsync();
        return Ok(new PageResult<GlEntryOut>(items.Select(e => e.ToDto()).ToList(), total, page, size));
    }

    // ===== Task 23: Cost Centers =====
    [HttpGet("cost-centers")]
    public async Task<IActionResult> ListCostCenters([FromQuery] bool? isActive)
    {
        if (await Denied("VIEW")) return Forbidden("VIEW");
        var q = db.CostCenters.AsNoTracking().AsQueryable();
        if (isActive.HasValue) q = q.Where(c => c.IsActive == isActive.Value);
        var items = await q.OrderBy(c => c.Code).ToListAsync();
        return Ok(items.Select(c => c.ToDto()).ToList());
    }

    [HttpPost("cost-centers")]
    public async Task<IActionResult> CreateCostCenter([FromBody] CostCenterCreate body)
    {
        if (await Denied("CREATE")) return Forbidden("CREATE");
        var c = new CostCenter { Code = body.Code, Name = body.Name, ParentId = body.ParentId, IsGroup = body.IsGroup };
        db.CostCenters.Add(c);
        await db.SaveChangesAsync();
        return StatusCode(201, c.ToDto());
    }

    [HttpPut("cost-centers/{id:long}")]
    public async Task<IActionResult> UpdateCostCenter(long id, [FromBody] CostCenterUpdate body)
    {
        if (await Denied("UPDATE")) return Forbidden("UPDATE");
        var c = await db.CostCenters.FindAsync(id);
        if (c is null) return NotFound(new ApiError("NOT_FOUND", $"Trung tâm chi phí {id} không tồn tại"));
        Mapper.Apply(body, c, skipNulls: true);
        await db.SaveChangesAsync();
        return Ok(c.ToDto());
    }

    // ===== Task 23: Payment allocation / reconciliation =====

    /// <summary>
    /// Phân bổ payment vào hóa đơn: giảm outstanding hóa đơn + unallocated của payment.
    /// Không sinh thêm gl_entry — gl_entry của voucher thanh toán gốc đã phản ánh đúng GL.
    /// </summary>
    private async Task AllocateAsync(long paymentVoucherId, long invoiceVoucherId, decimal amount)
    {
        var payment = await db.Vouchers.FirstOrDefaultAsync(v => v.Id == paymentVoucherId)
            ?? throw new PostingService.PostingException("NOT_FOUND", $"Payment voucher {paymentVoucherId} không tồn tại");
        var invoice = await db.Vouchers.FirstOrDefaultAsync(v => v.Id == invoiceVoucherId)
            ?? throw new PostingService.PostingException("NOT_FOUND", $"Hóa đơn {invoiceVoucherId} không tồn tại");
        if (payment.Status != "POSTED" || invoice.Status != "POSTED")
            throw new PostingService.PostingException("INVALID_STATUS", "Chứng từ chưa POSTED");
        if (payment.PartnerId != invoice.PartnerId)
            throw new PostingService.PostingException("PARTY_MISMATCH", "Payment và hóa đơn không cùng đối tượng");
        if (amount <= 0)
            throw new PostingService.PostingException("INVALID_AMOUNT", "Số tiền phân bổ phải > 0");
        if ((payment.UnallocatedAmount ?? 0) < amount)
            throw new PostingService.PostingException("OVER_ALLOCATION", $"Vượt số chưa phân bổ của {payment.DocNo}");
        if ((invoice.OutstandingAmount ?? 0) < amount)
            throw new PostingService.PostingException("OVER_ALLOCATION", $"Vượt outstanding của hóa đơn {invoice.DocNo}");

        payment.UnallocatedAmount -= amount;
        invoice.OutstandingAmount -= amount;
        invoice.PaymentStatus = invoice.OutstandingAmount <= 0 ? "PAID" : "PARTLY_PAID";
        db.PaymentAllocations.Add(new PaymentAllocation
        {
            PaymentVoucherId = paymentVoucherId, InvoiceVoucherId = invoiceVoucherId, AllocatedAmount = amount,
        });
    }

    /// <summary>Phân bổ Payment Entry (PHIEU_THU/PHIEU_CHI) vào 1..n hóa đơn cùng đối tượng.</summary>
    [HttpPost("payments/{id:long}/allocations")]
    public async Task<IActionResult> AllocatePayment(long id, [FromBody] PaymentAllocationRequest body)
    {
        if (await Denied("UPDATE")) return Forbidden("UPDATE");
        try
        {
            foreach (var item in body.Allocations)
                await AllocateAsync(id, item.InvoiceVoucherId, item.Amount);
            await db.SaveChangesAsync();
        }
        catch (PostingService.PostingException e)
        {
            return Conflict(new ApiError(e.Code, e.Message));
        }
        var payment = await db.Vouchers.Include(v => v.Lines).AsNoTracking().FirstAsync(v => v.Id == id);
        var allocations = await db.PaymentAllocations.AsNoTracking()
            .Where(a => a.PaymentVoucherId == id).ToListAsync();
        return Ok(new { payment = payment.ToDto(), allocations = allocations.Select(a => a.ToDto()).ToList() });
    }

    /// <summary>Hóa đơn còn outstanding của một đối tượng — cho màn Payment Entry chọn phân bổ.</summary>
    [HttpGet("payments/pending-invoices")]
    public async Task<IActionResult> PendingInvoices([FromQuery] long partyId)
    {
        if (await Denied("VIEW")) return Forbidden("VIEW");
        var items = await db.Vouchers.AsNoTracking()
            .Where(v => v.PartnerId == partyId && v.Status == "POSTED"
                && (v.VoucherType == "HOA_DON_BAN" || v.VoucherType == "PHIEU_MUA_HANG")
                && v.OutstandingAmount > 0)
            .OrderBy(v => v.DueDate ?? v.DocDate)
            .Select(v => new PendingInvoiceOut(v.Id, v.VoucherType, v.DocNo, v.DocDate, v.DueDate, v.TotalAmount, v.OutstandingAmount ?? 0, v.PaymentStatus))
            .ToListAsync();
        return Ok(items);
    }

    /// <summary>Cấn trừ tạm ứng (payment dư unallocated) vào hóa đơn — dùng lại AllocateAsync.</summary>
    [HttpPost("payment-reconciliation")]
    public async Task<IActionResult> PaymentReconciliation([FromBody] PaymentReconciliationRequest body)
    {
        if (await Denied("UPDATE")) return Forbidden("UPDATE");
        try
        {
            foreach (var item in body.Allocations)
                await AllocateAsync(item.PaymentVoucherId, item.InvoiceVoucherId, item.Amount);
            await db.SaveChangesAsync();
        }
        catch (PostingService.PostingException e)
        {
            return Conflict(new ApiError(e.Code, e.Message));
        }
        return Ok(new { message = "Reconciled" });
    }

    // ===== Bank Fees =====
    [HttpGet("bank-fees")]
    public async Task<IActionResult> ListBankFees([FromQuery] long? transferVoucherId)
    {
        if (await Denied("VIEW")) return Forbidden("VIEW");
        var q = db.BankFees.AsNoTracking().AsQueryable();
        if (transferVoucherId.HasValue) q = q.Where(f => f.TransferVoucherId == transferVoucherId);
        var items = await q.ToListAsync();
        return Ok(items.Select(f => f.ToDto()).ToList());
    }

    [HttpPost("bank-fees")]
    public async Task<IActionResult> CreateBankFee([FromBody] BankFeeCreate body)
    {
        if (await Denied("CREATE")) return Forbidden("CREATE");
        var f = new BankFee
        {
            TransferVoucherId = body.TransferVoucherId, Amount = body.Amount,
            FeeAccountId = body.FeeAccountId, PaidFromFundId = body.PaidFromFundId, Note = body.Note,
        };
        db.BankFees.Add(f);
        await db.SaveChangesAsync();
        return StatusCode(201, f.ToDto());
    }

    // ===== Outbox Events (debug) =====
    [HttpGet("outbox-events")]
    public async Task<IActionResult> ListOutboxEvents([FromQuery] bool? unprocessed, [FromQuery] int page = 1, [FromQuery] int size = 20)
    {
        var q = db.OutboxEvents.AsNoTracking().AsQueryable();
        if (unprocessed == true) q = q.Where(e => e.ProcessedAt == null);
        var total = await q.LongCountAsync();
        var items = await q.OrderByDescending(e => e.Id)
            .Skip((Math.Max(1, page) - 1) * size).Take(Math.Clamp(size, 1, 200)).ToListAsync();
        return Ok(new { total, items });
    }

    // ===== Task 23: Reports =====

    /// <summary>Sổ cái theo tài khoản: số dư đầu, phát sinh, lũy kế.</summary>
    [HttpGet("reports/general-ledger")]
    public async Task<IActionResult> GeneralLedgerReport(
        [FromQuery] long accountId, [FromQuery] long? partyId, [FromQuery] long? costCenterId,
        [FromQuery] DateOnly? from, [FromQuery] DateOnly? to)
    {
        if (await Denied("VIEW")) return Forbidden("VIEW");

        var obQuery = db.OpeningBalances.AsNoTracking().Where(b => b.AccountId == accountId);
        if (partyId.HasValue) obQuery = obQuery.Where(b => b.ObjectId == partyId);
        var opening = await obQuery.SumAsync(b => b.Debit - b.Credit);

        var glQuery = db.GlEntries.AsNoTracking().Where(e => e.AccountId == accountId && !e.IsCancelled);
        if (partyId.HasValue) glQuery = glQuery.Where(e => e.PartyId == partyId);
        if (costCenterId.HasValue) glQuery = glQuery.Where(e => e.CostCenterId == costCenterId);

        if (from.HasValue)
        {
            var before = glQuery.Where(e => e.PostingDate < from);
            opening += await before.SumAsync(e => e.Side == "DEBIT" ? e.Amount : -e.Amount);
            glQuery = glQuery.Where(e => e.PostingDate >= from);
        }
        if (to.HasValue)
            glQuery = glQuery.Where(e => e.PostingDate <= to);

        var rows = await glQuery
            .Join(db.Vouchers, e => e.VoucherId, v => v.Id, (e, v) => new { e, v })
            .OrderBy(x => x.e.PostingDate).ThenBy(x => x.e.Id)
            .Select(x => new { x.e.PostingDate, x.v.DocNo, x.v.VoucherType, x.e.Description, x.e.Side, x.e.Amount })
            .ToListAsync();

        var balance = opening;
        var entries = new List<GeneralLedgerEntryOut>();
        foreach (var r in rows)
        {
            var debit = r.Side == "DEBIT" ? r.Amount : 0;
            var credit = r.Side == "CREDIT" ? r.Amount : 0;
            balance += debit - credit;
            entries.Add(new GeneralLedgerEntryOut(r.PostingDate, r.DocNo, r.VoucherType, r.Description, debit, credit, balance));
        }

        return Ok(new GeneralLedgerReportOut(opening, entries, balance));
    }

    /// <summary>Bảng cân đối số dư: dư đầu, PS Nợ/Có, dư cuối theo tài khoản — kiểm tra cân.</summary>
    [HttpGet("reports/trial-balance")]
    public async Task<IActionResult> TrialBalanceReport([FromQuery] long periodId)
    {
        if (await Denied("VIEW")) return Forbidden("VIEW");
        var period = await db.FiscalPeriods.FindAsync(periodId);
        if (period is null) return NotFound(new ApiError("NOT_FOUND", $"Kỳ kế toán {periodId} không tồn tại"));
        var policy = await db.AccountingPolicies.FindAsync(1L);

        var accounts = await db.Accounts.AsNoTracking().Where(a => a.IsActive).OrderBy(a => a.Code).ToListAsync();

        var openingBalances = await db.OpeningBalances.AsNoTracking()
            .Where(b => b.PeriodId == policy!.FirstPeriodId)
            .GroupBy(b => b.AccountId)
            .Select(g => new { AccountId = g.Key, Debit = g.Sum(x => x.Debit), Credit = g.Sum(x => x.Credit) })
            .ToDictionaryAsync(x => x.AccountId);

        var beforeGl = await db.GlEntries.AsNoTracking()
            .Where(e => !e.IsCancelled && e.PostingDate < period.DateFrom)
            .GroupBy(e => e.AccountId)
            .Select(g => new
            {
                AccountId = g.Key,
                Debit = g.Where(x => x.Side == "DEBIT").Sum(x => x.Amount),
                Credit = g.Where(x => x.Side == "CREDIT").Sum(x => x.Amount),
            })
            .ToDictionaryAsync(x => x.AccountId);

        var periodGl = await db.GlEntries.AsNoTracking()
            .Where(e => !e.IsCancelled && e.PostingDate >= period.DateFrom && e.PostingDate <= period.DateTo)
            .GroupBy(e => e.AccountId)
            .Select(g => new
            {
                AccountId = g.Key,
                Debit = g.Where(x => x.Side == "DEBIT").Sum(x => x.Amount),
                Credit = g.Where(x => x.Side == "CREDIT").Sum(x => x.Amount),
            })
            .ToDictionaryAsync(x => x.AccountId);

        var rows = new List<TrialBalanceRowOut>();
        foreach (var a in accounts)
        {
            var ob = openingBalances.GetValueOrDefault(a.Id);
            var bg = beforeGl.GetValueOrDefault(a.Id);
            var pg = periodGl.GetValueOrDefault(a.Id);
            if (ob is null && bg is null && pg is null) continue;

            var openingNet = (ob?.Debit ?? 0) - (ob?.Credit ?? 0) + (bg?.Debit ?? 0) - (bg?.Credit ?? 0);
            var periodDebit = pg?.Debit ?? 0;
            var periodCredit = pg?.Credit ?? 0;
            var openingDebit = openingNet > 0 ? openingNet : 0;
            var openingCredit = openingNet < 0 ? -openingNet : 0;
            var closingNet = openingNet + periodDebit - periodCredit;
            var closingDebit = closingNet > 0 ? closingNet : 0;
            var closingCredit = closingNet < 0 ? -closingNet : 0;

            rows.Add(new TrialBalanceRowOut(a.Id, a.Code, a.Name, openingDebit, openingCredit, periodDebit, periodCredit, closingDebit, closingCredit));
        }
        return Ok(rows);
    }

    /// <summary>Tuổi nợ phải thu (HOA_DON_BAN còn outstanding) theo due_date.</summary>
    [HttpGet("reports/ar-aging")]
    public Task<IActionResult> ArAging([FromQuery] DateOnly? asOf, [FromQuery] string buckets = "30,60,90")
        => AgingReport("HOA_DON_BAN", asOf, buckets);

    /// <summary>Tuổi nợ phải trả (PHIEU_MUA_HANG còn outstanding) theo due_date.</summary>
    [HttpGet("reports/ap-aging")]
    public Task<IActionResult> ApAging([FromQuery] DateOnly? asOf, [FromQuery] string buckets = "30,60,90")
        => AgingReport("PHIEU_MUA_HANG", asOf, buckets);

    private async Task<IActionResult> AgingReport(string voucherType, DateOnly? asOf, string buckets)
    {
        if (await Denied("VIEW")) return Forbidden("VIEW");
        var asOfDate = asOf ?? DateOnly.FromDateTime(DateTime.Today);
        var b = buckets.Split(',').Select(int.Parse).ToArray();
        if (b.Length != 3) b = [30, 60, 90];

        var invoices = await db.Vouchers.AsNoTracking()
            .Where(v => v.VoucherType == voucherType && v.Status == "POSTED" && v.OutstandingAmount > 0 && v.PartnerId != null)
            .ToListAsync();

        var partnerIds = invoices.Select(v => v.PartnerId!.Value).Distinct().ToList();
        var partners = await db.Partners.AsNoTracking().Where(p => partnerIds.Contains(p.Id)).ToDictionaryAsync(p => p.Id);

        var rows = invoices.GroupBy(v => v.PartnerId!.Value).Select(g =>
        {
            decimal notDue = 0, bucket1 = 0, bucket2 = 0, bucket3 = 0, over = 0;
            foreach (var v in g)
            {
                var outstanding = v.OutstandingAmount ?? 0;
                var dueDate = v.DueDate ?? v.DocDate;
                var daysOverdue = asOfDate.DayNumber - dueDate.DayNumber;
                if (daysOverdue <= 0) notDue += outstanding;
                else if (daysOverdue <= b[0]) bucket1 += outstanding;
                else if (daysOverdue <= b[1]) bucket2 += outstanding;
                else if (daysOverdue <= b[2]) bucket3 += outstanding;
                else over += outstanding;
            }
            var name = partners.TryGetValue(g.Key, out var p) ? p.ShortName : "";
            return new AgingRowOut(g.Key, name, notDue + bucket1 + bucket2 + bucket3 + over, notDue, bucket1, bucket2, bucket3, over);
        }).OrderByDescending(r => r.Total).ToList();

        return Ok(rows);
    }

    /// <summary>Báo cáo tài chính theo TT200 (B01-DN, B02-DN, B03-DN) dựa trên finance.fs_mapping.</summary>
    [HttpGet("reports/financial-statement")]
    public async Task<IActionResult> FinancialStatement(
        [FromQuery] string statement, [FromQuery] DateOnly? asOf, [FromQuery] DateOnly? from, [FromQuery] DateOnly? to)
    {
        if (await Denied("VIEW")) return Forbidden("VIEW");
        statement = statement.ToUpperInvariant();
        if (statement is not ("B01" or "B02" or "B03"))
            return BadRequest(new ApiError("INVALID_STATEMENT", "Mẫu báo cáo phải là B01, B02 hoặc B03"));

        if (statement == "B01") asOf ??= DateOnly.FromDateTime(DateTime.Today);
        else if (from is null || to is null)
            return BadRequest(new ApiError("INVALID_RANGE", "Cần tham số from và to"));

        var accounts = await db.Accounts.AsNoTracking().ToListAsync();
        var mappings = await db.FsMappings.AsNoTracking()
            .Where(m => m.Statement == "B01" || m.Statement == "B02" || m.Statement == "B03")
            .ToListAsync();
        var byKey = mappings.ToDictionary(m => (m.Statement, m.ItemCode));

        var openingBalances = await db.OpeningBalances.AsNoTracking()
            .GroupBy(b => b.AccountId)
            .Select(g => new { AccountId = g.Key, Net = g.Sum(x => x.Debit - x.Credit) })
            .ToDictionaryAsync(x => x.AccountId, x => x.Net);

        var glEntries = await db.GlEntries.AsNoTracking()
            .Where(e => !e.IsCancelled)
            .Select(e => new { e.AccountId, e.PostingDate, e.Side, e.Amount })
            .ToListAsync();

        decimal BalanceAsOf(string[] prefixes, DateOnly date)
        {
            var ids = accounts.Where(a => prefixes.Any(p => a.Code.StartsWith(p))).Select(a => a.Id).ToHashSet();
            var sum = ids.Sum(id => openingBalances.GetValueOrDefault(id));
            sum += glEntries.Where(e => ids.Contains(e.AccountId) && e.PostingDate <= date)
                .Sum(e => e.Side == "DEBIT" ? e.Amount : -e.Amount);
            return sum;
        }

        decimal Activity(string[] prefixes, DateOnly from, DateOnly to)
        {
            var ids = accounts.Where(a => prefixes.Any(p => a.Code.StartsWith(p))).Select(a => a.Id).ToHashSet();
            return glEntries.Where(e => ids.Contains(e.AccountId) && e.PostingDate >= from && e.PostingDate <= to)
                .Sum(e => e.Side == "DEBIT" ? e.Amount : -e.Amount);
        }

        var memo = new Dictionary<(string, string), decimal>();
        decimal RowValue(string stmt, string itemCode)
        {
            if (memo.TryGetValue((stmt, itemCode), out var cached)) return cached;
            if (!byKey.TryGetValue((stmt, itemCode), out var m))
                throw new PostingService.PostingException("FS_MAPPING_NOT_FOUND", $"Không tìm thấy chỉ tiêu {stmt}:{itemCode}");

            decimal raw;
            if (m.AccountPrefixes is { Length: > 0 })
            {
                raw = m.IsPeriodDelta || stmt == "B02"
                    ? Activity(m.AccountPrefixes, from!.Value, to!.Value)
                    : BalanceAsOf(m.AccountPrefixes, asOf ?? to!.Value);
            }
            else if (m.FormulaItemCodes is { Length: > 0 })
            {
                raw = 0;
                for (int i = 0; i < m.FormulaItemCodes.Length; i++)
                {
                    var refCode = m.FormulaItemCodes[i];
                    var refSign = m.FormulaSigns?[i] ?? 1;
                    var (refStmt, refItem) = refCode.Contains(':')
                        ? (refCode.Split(':')[0], refCode.Split(':')[1])
                        : (stmt, refCode);
                    raw += refSign * RowValue(refStmt, refItem);
                }
            }
            else raw = 0;

            var value = m.Sign * raw;
            memo[(stmt, itemCode)] = value;
            return value;
        }

        try
        {
            var rows = mappings.Where(m => m.Statement == statement).OrderBy(m => m.DisplayOrder)
                .Select(m => new FsRowOut(m.ItemCode, m.ItemName, m.IndentLevel, RowValue(statement, m.ItemCode)))
                .ToList();
            return Ok(rows);
        }
        catch (PostingService.PostingException e)
        {
            return Conflict(new ApiError(e.Code, e.Message));
        }
    }

    private static string MapLerpToVoucherType(string lerpType) => lerpType switch
    {
        "BAN_HANG" => "HOA_DON_BAN",
        "YCT" => "PHIEU_THU",
        "YCC" => "YEU_CAU_CHI",
        "PHIEU_XUAT" => "PHIEU_XUAT_KT",
        "PHIEU_NHAP" => "PHIEU_NHAP_KT",
        "PGC" => "PHIEU_GHI_NO",
        "TRA_HANG_NCC" => "TRA_HANG_NCC",
        "HANG_TRA_LAI" => "HANG_BAN_TRA_LAI",
        "NHAP_KHO" => "PHIEU_NHAP_KT",
        "XUAT_KHO" => "PHIEU_XUAT_KT",
        "CHUYEN_KHO" => "DIEU_CHUYEN_KT",
        _ => "CT_TONG_HOP",
    };
}