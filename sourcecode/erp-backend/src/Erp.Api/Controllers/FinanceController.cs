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
            Lines = (body.Lines ?? new()).Select(l => new VoucherLine
            {
                ProductId = l.ProductId, Description = l.Description,
                Quantity = l.Quantity, UnitPrice = l.UnitPrice,
                Amount = l.Amount, VatPct = l.VatPct, VatAmount = l.VatAmount,
                DrAccountId = l.DrAccountId, CrAccountId = l.CrAccountId,
                DrObjectId = l.DrObjectId, DrObjectType = l.DrObjectType,
                CrObjectId = l.CrObjectId, CrObjectType = l.CrObjectType,
                RefVoucherId = l.RefVoucherId,
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