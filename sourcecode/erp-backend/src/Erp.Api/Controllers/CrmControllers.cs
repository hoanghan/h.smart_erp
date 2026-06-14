using Erp.Api.Core;
using Erp.Api.Data;
using Erp.Api.Dtos;
using Erp.Api.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Erp.Api.Controllers;

// ---------- CRM Master Data ----------
[Route("api/v1/md/lead-sources")]
public class LeadSourcesController(ErpDbContext db, RbacService rbac)
    : CrudControllerBase<LeadSource, LeadSourceOut, LeadSourceCreate, LeadSourceUpdate>(db, rbac)
{
    protected override string Resource => "lead-sources";
}

[Route("api/v1/md/sales-stages")]
public class SalesStagesController(ErpDbContext db, RbacService rbac)
    : CrudControllerBase<SalesStage, SalesStageOut, SalesStageCreate, SalesStageUpdate>(db, rbac)
{
    protected override string Resource => "sales-stages";
}

[Route("api/v1/md/campaigns")]
public class CampaignsController(ErpDbContext db, RbacService rbac, DocNumberingService docNum)
    : CrudControllerBase<Campaign, CampaignOut, CampaignCreate, CampaignUpdate>(db, rbac)
{
    protected override string Resource => "campaigns";

    public override async Task<IActionResult> Create([FromBody] CampaignCreate body)
    {
        if (await Denied("CREATE")) return Forbidden("CREATE");
        var docNo = await docNum.NextAsync("CAMPAIGN");
        var entity = new Campaign
        {
            DocNo = docNo,
            Name = body.Name,
            CampaignType = body.CampaignType,
            Budget = body.Budget,
            StartDate = body.StartDate,
            EndDate = body.EndDate,
            Status = "DRAFT",
        };
        db.Campaigns.Add(entity);
        await db.SaveChangesAsync();
        return StatusCode(201, ToDto(entity));
    }

    private CampaignOut ToDto(Campaign e) => new(
        e.Id, e.DocNo, e.Name, e.CampaignType ?? "", e.Budget,
        e.StartDate, e.EndDate, e.Status, null, null, e.CreatedAt);
}

// ---------- Lead ----------
[Route("api/v1/crm/leads")]
public class LeadsController(ErpDbContext db, RbacService rbac, DocNumberingService docNum, WorkflowService wf)
    : CrudControllerBase<Lead, LeadOut, LeadCreate, LeadUpdate>(db, rbac)
{
    protected override string Resource => "leads";
    protected override string[] SearchFields => new[] { "DocNo", "FirstName", "LastName", "CompanyName", "Email", "Phone" };

    // Check duplicate leads/partners
    [HttpPost("check-duplicate")]
    public async Task<IActionResult> CheckDuplicate([FromBody] LeadDuplicateCheck body)
    {
        if (!await rbac.HasPermissionAsync(User, "DOCUMENT", Resource, "VIEW"))
            return StatusCode(403, new ApiError("WF_NO_PERMISSION", $"Thiếu quyền VIEW trên DOCUMENT:{Resource}"));

        var duplicatesLeads = await db.Leads.AsNoTracking()
            .Where(l => l.Email == body.Email || l.Phone == body.Phone || l.MobileNo == body.Phone)
            .OrderBy(l => l.Id)
            .ToListAsync();

        var duplicatesPartners = await db.Partners.AsNoTracking()
            .Where(p => p.Phone == body.Phone)
            .OrderBy(p => p.Id)
            .ToListAsync();

        var result = new LeadDuplicateResult(
            HasDuplicates: duplicatesLeads.Any() || duplicatesPartners.Any(),
            DuplicateLeads: duplicatesLeads.Select(l => new LeadOut(
                l.Id, l.DocNo, l.FirstName, l.LastName ?? "", l.CompanyName ?? "",
                l.JobTitle, l.Email, l.Phone, null, null, l.Status,
                l.LeadSourceId, null, l.CampaignId, null, l.TerritoryId, null,
                l.SalespersonId, null, l.PartnerId, null, l.Note, l.CreatedAt)).ToList(),
            DuplicatePartners: duplicatesPartners.Select(p => new PartnerOut(
                p.Id, p.Code, p.ShortName, p.FullName, p.TaxCode, p.IsCustomer, p.IsSupplier,
                p.Address, p.Phone, p.Email, null, null, null, null, null, p.IsActive)).ToList()
        );

        return Ok(result);
    }

    public override async Task<IActionResult> Create([FromBody] LeadCreate body)
    {
        if (await Denied("CREATE")) return Forbidden("CREATE");

        // Check duplicates if not force create
        if (!body.ForceCreate)
        {
            var exists = await db.Leads.AnyAsync(l => l.Email == body.Email || l.Phone == body.Phone)
                || await db.Partners.AnyAsync(p => p.Phone == body.Phone);
            if (exists)
            {
                return BadRequest(new ApiError("DUPLICATE_EXISTS", "Lead trùng email/phone với lead hoặc partner hiện có. Sử dụng force=true để tạo vẫn."));
            }
        }

        var docNo = await docNum.NextAsync("LEAD");
        var entity = new Lead
        {
            DocNo = docNo,
            FirstName = body.FirstName,
            LastName = body.LastName,
            CompanyName = body.CompanyName,
            JobTitle = body.JobTitle,
            Email = body.Email,
            Phone = body.Phone,
            LeadSourceId = body.LeadSourceId,
            CampaignId = body.CampaignId,
            TerritoryId = body.TerritoryId,
            SalespersonId = body.SalespersonId,
            Status = "LEAD",
            Note = body.Remarks,
        };
        db.Leads.Add(entity);
        await db.SaveChangesAsync();
        return StatusCode(201, ToDto(entity));
    }

    // Convert lead to opportunity
    [HttpPost("{id:long}/convert-to-opportunity")]
    public async Task<IActionResult> ConvertToOpportunity(long id, [FromBody] ConvertToOpportunityRequest body)
    {
        if (!await rbac.HasPermissionAsync(User, "DOCUMENT", Resource, "UPDATE"))
            return StatusCode(403, new ApiError("WF_NO_PERMISSION", $"Thiếu quyền UPDATE trên DOCUMENT:{Resource}"));

        var lead = await db.Leads.FindAsync(id);
        if (lead == null) return NotFound(new ApiError("NOT_FOUND", $"Lead {id} không tồn tại"));

        if (lead.Status == "OPPORTUNITY")
            return BadRequest(new ApiError("ALREADY_CONVERTED", "Lead đã được convert sang opportunity"));

        var salesStage = await db.SalesStages.FindAsync(body.SalesStageId);
        var oppDocNo = await docNum.NextAsync("OPP");
        var opportunity = new Opportunity
        {
            DocNo = oppDocNo,
            LeadId = id,
            PartnerId = lead.PartnerId,
            OpportunityType = "SALES",
            SalesStageId = body.SalesStageId,
            ProbabilityPct = salesStage?.ProbabilityPct ?? 0,
            ExpectedValue = body.ExpectedValue,
            ExpectedClosingDate = body.ExpectedClosingDate,
            Currency = body.Currency,
            SalespersonId = lead.SalespersonId,
            Status = "OPEN",
            Lines = body.Lines?.Select(l => new OpportunityLine
            {
                ProductId = l.ProductId,
                Qty = l.Qty,
                EstimatedRate = l.EstimatedRate,
                Amount = l.Qty * l.EstimatedRate,
            }).ToList() ?? new(),
        };

        db.Opportunities.Add(opportunity);
        lead.Status = "OPPORTUNITY";
        lead.OpportunityId = opportunity.Id;
        await db.SaveChangesAsync();

        return Ok(new ConvertToOpportunityResponse(opportunity.Id));
    }

    // Convert lead to customer
    [HttpPost("{id:long}/convert-to-customer")]
    public async Task<IActionResult> ConvertToCustomer(long id, [FromBody] ConvertToCustomerRequest body)
    {
        if (!await rbac.HasPermissionAsync(User, "DOCUMENT", Resource, "UPDATE"))
            return StatusCode(403, new ApiError("WF_NO_PERMISSION", $"Thiếu quyền UPDATE trên DOCUMENT:{Resource}"));

        var lead = await db.Leads.FindAsync(id);
        if (lead == null) return NotFound(new ApiError("NOT_FOUND", $"Lead {id} không tồn tại"));

        if (lead.PartnerId.HasValue)
            return BadRequest(new ApiError("ALREADY_CUSTOMER", "Lead đã liên kết với partner"));

        // Generate partner code
        var partnerCode = "CUST-" + DateTime.Now.ToString("yyMMddHHmm");

        var partner = new Partner
        {
            Code = partnerCode,
            ShortName = lead.FirstName + " " + (lead.LastName ?? ""),
            FullName = lead.FirstName + " " + (lead.LastName ?? ""),
            TaxCode = body.TaxCode,
            Phone = lead.Phone,
            Email = lead.Email,
            IsCustomer = body.PartnerType == "CUSTOMER",
            IsSupplier = body.PartnerType == "SUPPLIER",
            IsActive = true,
        };

        db.Partners.Add(partner);
        await db.SaveChangesAsync();
        lead.PartnerId = partner.Id;
        await db.SaveChangesAsync();

        return Ok(new ConvertToCustomerResponse(partner.Id));
    }

    public override async Task<IActionResult> Update(long id, [FromBody] LeadUpdate body)
    {
        if (await Denied("UPDATE")) return Forbidden("UPDATE");
        var entity = await db.Leads.FindAsync(id);
        if (entity == null) return NotFound(new ApiError("NOT_FOUND", $"Lead {id} không tồn tại"));

        entity.FirstName = body.FirstName;
        entity.LastName = body.LastName;
        entity.CompanyName = body.CompanyName;
        entity.JobTitle = body.JobTitle;
        entity.Email = body.Email;
        entity.Phone = body.Phone;
        entity.LeadSourceId = body.LeadSourceId;
        entity.CampaignId = body.CampaignId;
        entity.TerritoryId = body.TerritoryId;
        entity.SalespersonId = body.SalespersonId;
        entity.Status = body.Status;
        entity.Note = body.Remarks;

        await db.SaveChangesAsync();
        return Ok(ToDto(entity));
    }

    private LeadOut ToDto(Lead e) => new(
        e.Id, e.DocNo, e.FirstName, e.LastName ?? "", e.CompanyName ?? "",
        e.JobTitle, e.Email, e.Phone, null, null, e.Status,
        e.LeadSourceId, null, e.CampaignId, null, e.TerritoryId, null,
        e.SalespersonId, null, e.PartnerId, null, e.Note, e.CreatedAt);
}

// ---------- Opportunity ----------
[Route("api/v1/crm/opportunities")]
public class OpportunitiesController(ErpDbContext db, RbacService rbac, DocNumberingService docNum, WorkflowService wf)
    : CrudControllerBase<Opportunity, OpportunityOut, OpportunityCreate, OpportunityUpdate>(db, rbac)
{
    protected override string Resource => "opportunities";
    protected override string[] SearchFields => new[] { "DocNo" };

    public override async Task<IActionResult> Create([FromBody] OpportunityCreate body)
    {
        if (await Denied("CREATE")) return Forbidden("CREATE");

        var docNo = await docNum.NextAsync("OPP");
        var entity = new Opportunity
        {
            DocNo = docNo,
            LeadId = body.LeadId,
            PartnerId = body.PartnerId,
            OpportunityType = body.OpportunityType,
            SalesStageId = body.SalesStageId,
            ProbabilityPct = (int)body.ProbabilityPct,
            ExpectedValue = body.ExpectedValue,
            ExpectedClosingDate = body.ExpectedClosingDate,
            Currency = body.Currency,
            SalespersonId = body.SalespersonId,
            Status = "OPEN",
            Lines = body.Lines?.Select(l => new OpportunityLine
            {
                ProductId = l.ProductId,
                Qty = l.Qty,
                EstimatedRate = l.EstimatedRate,
                Amount = l.Qty * l.EstimatedRate,
            }).ToList() ?? new(),
        };
        db.Opportunities.Add(entity);
        await db.SaveChangesAsync();
        return StatusCode(201, await ToDtoAsync(entity));
    }

    public override async Task<IActionResult> Get(long id)
    {
        if (await Denied("VIEW")) return Forbidden("VIEW");
        var entity = await db.Opportunities
            .Include(o => o.Lines)
            .AsNoTracking()
            .FirstOrDefaultAsync(o => o.Id == id);
        if (entity == null) return NotFound(new ApiError("NOT_FOUND", $"Opportunity {id} không tồn tại"));
        return Ok(await ToDtoAsync(entity));
    }

    public override async Task<IActionResult> Update(long id, [FromBody] OpportunityUpdate body)
    {
        if (await Denied("UPDATE")) return Forbidden("UPDATE");
        var entity = await db.Opportunities
            .Include(o => o.Lines)
            .FirstOrDefaultAsync(o => o.Id == id);
        if (entity == null) return NotFound(new ApiError("NOT_FOUND", $"Opportunity {id} không tồn tại"));

        entity.PartnerId = body.PartnerId;
        entity.OpportunityType = body.OpportunityType;
        entity.SalesStageId = body.SalesStageId;
        entity.ProbabilityPct = (int)body.ProbabilityPct;
        entity.ExpectedValue = body.ExpectedValue;
        entity.ExpectedClosingDate = body.ExpectedClosingDate;
        entity.Status = body.Status;
        entity.LostReasonId = body.LostReasonId;
        entity.Competitor = body.CompetitorInfo;

        // Update lines
        entity.Lines.Clear();
        if (body.Lines != null)
        {
            foreach (var line in body.Lines)
            {
                entity.Lines.Add(new OpportunityLine
                {
                    ProductId = line.ProductId,
                    Qty = line.Qty,
                    EstimatedRate = line.EstimatedRate,
                    Amount = line.Qty * line.EstimatedRate,
                });
            }
        }

        await db.SaveChangesAsync();
        return Ok(await ToDtoAsync(entity));
    }

    // Make quotation from opportunity
    [HttpPost("{id:long}/make-quotation")]
    public async Task<IActionResult> MakeQuotation(long id, [FromBody] MakeQuotationRequest body)
    {
        if (!await rbac.HasPermissionAsync(User, "DOCUMENT", Resource, "UPDATE"))
            return StatusCode(403, new ApiError("WF_NO_PERMISSION", $"Thiếu quyền UPDATE trên DOCUMENT:{Resource}"));

        var opportunity = await db.Opportunities
            .Include(o => o.Lines)
            .FirstOrDefaultAsync(o => o.Id == id);
        if (opportunity == null) return NotFound(new ApiError("NOT_FOUND", $"Opportunity {id} không tồn tại"));

        if (!opportunity.PartnerId.HasValue)
            return BadRequest(new ApiError("NO_PARTNER", "Opportunity chưa có khách hàng"));

        var quoteDocNo = await docNum.NextAsync("QUOTATION");
        var quotation = new Quotation
        {
            DocNo = quoteDocNo,
            DocDate = DateOnly.FromDateTime(DateTime.Today),
            PartnerId = opportunity.PartnerId.Value,
            Status = "DRAFT",
            Lines = opportunity.Lines.Select(l => new QuotationLine
            {
                ProductId = l.ProductId,
                Quantity = l.Qty,
                Rate = l.EstimatedRate ?? 0,
                DiscountPct = 0,
            }).ToList(),
        };

        db.Quotations.Add(quotation);
        opportunity.Status = "QUOTATION";
        opportunity.QuotationId = quotation.Id;
        await db.SaveChangesAsync();

        return Ok(new MakeQuotationResponse(quotation.Id, quotation.DocNo));
    }

    private async Task<OpportunityOut> ToDtoAsync(Opportunity e)
    {
        var lead = e.LeadId.HasValue ? await db.Leads.FindAsync(e.LeadId.Value) : null;
        var leadName = lead != null ? lead.FirstName + " " + (lead.LastName ?? "") : null;
        var partner = e.PartnerId.HasValue ? await db.Partners.FindAsync(e.PartnerId.Value) : null;
        var partnerName = partner?.ShortName;
        var stage = e.SalesStageId.HasValue ? await db.SalesStages.FindAsync(e.SalesStageId.Value) : null;
        var stageName = stage?.Name;
        var lostReason = e.LostReasonId.HasValue ? await db.LostReasons.FindAsync(e.LostReasonId.Value) : null;
        var lostReasonName = lostReason?.Name;
        var salesperson = e.SalespersonId.HasValue ? await db.Employees.FindAsync(e.SalespersonId.Value) : null;
        var salespersonName = salesperson?.FullName;
        var quotation = e.QuotationId.HasValue ? await db.Quotations.FindAsync(e.QuotationId.Value) : null;

        return new OpportunityOut(
            e.Id, e.DocNo, e.LeadId, leadName, e.PartnerId, partnerName,
            e.OpportunityType, e.SalesStageId, stageName, (int)e.ProbabilityPct,
            e.ExpectedValue, e.ExpectedClosingDate ?? DateOnly.MinValue, e.Currency, e.Status,
            e.QuotationId, quotation?.DocNo, e.LostReasonId, lostReasonName,
            e.Competitor, e.SalespersonId, salespersonName, null, null, e.CreatedAt);
    }
}

// ---------- Activity ----------
[Route("api/v1/crm/activities")]
public class ActivitiesController(ErpDbContext db, RbacService rbac)
    : CrudControllerBase<Activity, ActivityOut, ActivityCreate, ActivityUpdate>(db, rbac)
{
    protected override string Resource => "activities";

    public override async Task<IActionResult> Create([FromBody] ActivityCreate body)
    {
        if (await Denied("CREATE")) return Forbidden("CREATE");

        var entity = new Activity
        {
            RefTable = body.RefTable,
            RefId = body.RefId,
            ActivityType = body.ActivityType,
            Subject = body.Subject,
            Description = body.Description,
            DueDate = body.DueDate,
            IsReminder = body.HasReminder,
            AssigneeId = body.AssigneeId,
            Status = "OPEN",
        };
        db.Activities.Add(entity);
        await db.SaveChangesAsync();
        return StatusCode(201, ToDto(entity));
    }

    public override async Task<IActionResult> Update(long id, [FromBody] ActivityUpdate body)
    {
        if (await Denied("UPDATE")) return Forbidden("UPDATE");
        var entity = await db.Activities.FindAsync(id);
        if (entity == null) return NotFound(new ApiError("NOT_FOUND", $"Activity {id} không tồn tại"));

        entity.ActivityType = body.ActivityType;
        entity.Subject = body.Subject;
        entity.Description = body.Description;
        entity.DueDate = body.DueDate;
        entity.IsReminder = body.HasReminder;
        entity.AssigneeId = body.AssigneeId;
        entity.Status = body.Status;
        if (body.Status == "DONE")
            entity.CompletedAt = DateTimeOffset.UtcNow;

        await db.SaveChangesAsync();
        return Ok(ToDto(entity));
    }

    private ActivityOut ToDto(Activity e) => new(
        e.Id, e.RefTable, e.RefId, e.ActivityType, e.Subject,
        e.Description, e.DueDate, e.IsReminder, e.AssigneeId, null,
        e.Status, e.CreatedAt, e.CompletedAt);
}

// Timeline endpoint
[Route("api/v1/crm/{ref}/{id:long}/timeline")]
public class TimelineController(ErpDbContext db, RbacService rbac)
    : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetTimeline(string @ref, long id)
    {
        // Get activities
        var activities = await db.Activities
            .AsNoTracking()
            .Where(a => a.RefTable == @ref && a.RefId == id)
            .OrderByDescending(a => a.CreatedAt)
            .ToListAsync();

        // Get workflow logs
        var logs = await db.WfTransitionLogs
            .AsNoTracking()
            .Where(l => l.RefTable == @ref && l.RefId == id)
            .OrderByDescending(l => l.ActedAt)
            .ToListAsync();

        var timeline = new List<TimelineItem>();

        foreach (var act in activities)
        {
            var assignee = act.AssigneeId.HasValue ? await db.Employees.FindAsync(act.AssigneeId.Value) : null;
            timeline.Add(new TimelineItem(
                act.CreatedAt.LocalDateTime,
                "ACTIVITY",
                $"{act.ActivityType}: {act.Subject}",
                assignee?.FullName,
                new { act.Status, act.DueDate }
            ));
        }

        foreach (var log in logs)
        {
            timeline.Add(new TimelineItem(
                log.ActedAt.LocalDateTime,
                "STATUS_CHANGE",
                $"{log.FromStatus} → {log.ToStatus}",
                log.ActedBy?.ToString(),
                new { log.Reason }
            ));
        }

        return Ok(timeline.OrderByDescending(t => t.Timestamp).ToList());
    }
}

// ---------- CRM Reports ----------
[Route("api/v1/crm/reports")]
public class CrmReportsController(ErpDbContext db, RbacService rbac)
    : ControllerBase
{
    [HttpGet("funnel")]
    public async Task<IActionResult> Funnel([FromQuery] DateOnly? from, [FromQuery] DateOnly? to)
    {
        var query = db.Opportunities.AsNoTracking();
        if (from.HasValue) query = query.Where(o => o.CreatedAt >= from.Value.ToDateTime(TimeOnly.MinValue));
        if (to.HasValue) query = query.Where(o => o.CreatedAt <= to.Value.ToDateTime(TimeOnly.MaxValue));

        var items = await query
            .GroupBy(o => o.SalesStageId)
            .Select(g => new { StageId = g.Key, Count = g.Count(), TotalValue = g.Sum(o => o.ExpectedValue) })
            .ToListAsync();

        var result = new List<FunnelReportItem>();
        foreach (var item in items)
        {
            var stage = await db.SalesStages.FindAsync(item.StageId);
            result.Add(new FunnelReportItem(stage?.Name ?? "Unknown", item.Count, item.TotalValue));
        }

        return Ok(new FunnelReport(from ?? DateOnly.MinValue, to ?? DateOnly.MaxValue, result));
    }

    [HttpGet("lead-conversion")]
    public async Task<IActionResult> LeadConversion([FromQuery] DateOnly? from, [FromQuery] DateOnly? to)
    {
        // Simplified - just return structure
        var bySource = new List<LeadConversionItem>();
        var byCampaign = new List<LeadConversionItem>();
        return Ok(new LeadConversionReport(from ?? DateOnly.MinValue, to ?? DateOnly.MaxValue, bySource, byCampaign));
    }

    [HttpGet("lost-reasons")]
    public async Task<IActionResult> LostReasons([FromQuery] DateOnly? from, [FromQuery] DateOnly? to)
    {
        var query = db.Opportunities.AsNoTracking()
            .Where(o => o.Status == "LOST");
        if (from.HasValue) query = query.Where(o => o.CreatedAt >= from.Value.ToDateTime(TimeOnly.MinValue));
        if (to.HasValue) query = query.Where(o => o.CreatedAt <= to.Value.ToDateTime(TimeOnly.MaxValue));

        var items = await query
            .GroupBy(o => o.LostReasonId)
            .Select(g => new { ReasonId = g.Key, Count = g.Count() })
            .ToListAsync();

        var result = new List<LostReasonItem>();
        foreach (var item in items)
        {
            var reason = await db.LostReasons.FindAsync(item.ReasonId);
            result.Add(new LostReasonItem(reason?.Name ?? "Unknown", item.Count));
        }

        return Ok(new LostReasonsReport(from ?? DateOnly.MinValue, to ?? DateOnly.MaxValue, result));
    }
}