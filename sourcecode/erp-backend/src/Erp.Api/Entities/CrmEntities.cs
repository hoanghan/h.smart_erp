namespace Erp.Api.Entities;
using Erp.Api.Core;

/// <summary>crm.lead_source — Nguồn lead.</summary>
public class LeadSource
{
    public long Id { get; set; }
    public string Code { get; set; } = null!;
    public string Name { get; set; } = null!;
    public bool IsActive { get; set; } = true;
}

/// <summary>crm.sales_stage — Giai đoạn opportunity (có thứ tự + %).</summary>
public class SalesStage
{
    public long Id { get; set; }
    public string Code { get; set; } = null!;
    public string Name { get; set; } = null!;
    public int OrderNo { get; set; } = 0;
    public decimal ProbabilityPct { get; set; } = 0;
    public bool IsActive { get; set; } = true;
}

/// <summary>crm.campaign — Chiến dịch marketing.</summary>
public class Campaign : IHasAudit
{
    public long Id { get; set; }
    public string DocNo { get; set; } = null!;
    public string Name { get; set; } = null!;
    public string? CampaignType { get; set; }
    public decimal Budget { get; set; }
    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }
    public string Status { get; set; } = "DRAFT";
    public string? Note { get; set; }
    public long? CreatorId { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}

/// <summary>crm.lead — Tiềm năng khách hàng.</summary>
public class Lead : IHasAudit
{
    public long Id { get; set; }
    public string DocNo { get; set; } = null!;
    public string FirstName { get; set; } = null!;
    public string? LastName { get; set; }
    public string? CompanyName { get; set; }
    public string? JobTitle { get; set; }
    public string? Phone { get; set; }
    public string? MobileNo { get; set; }
    public string? Email { get; set; }
    public long? LeadSourceId { get; set; }
    public long? CampaignId { get; set; }
    public long? TerritoryId { get; set; }
    public long? SalespersonId { get; set; }
    public string Status { get; set; } = "LEAD";   // LEAD → OPEN → REPLIED → OPPORTUNITY / LOST / DO_NOT_CONTACT
    public string? LostReason { get; set; }
    public long? PartnerId { get; set; }            // populated when convert-to-customer
    public long? OpportunityId { get; set; }        // populated when convert-to-opportunity
    public string? Note { get; set; }
    public long? CreatorId { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}

/// <summary>crm.opportunity — Cơ hội bán hàng (migrate sales.opportunity).</summary>
public class Opportunity : IHasAudit
{
    public long Id { get; set; }
    public string DocNo { get; set; } = null!;
    public long? LeadId { get; set; }
    public long? PartnerId { get; set; }
    public string OpportunityType { get; set; } = "SALES";   // SALES | MAINTENANCE
    public long? SalesStageId { get; set; }
    public decimal ProbabilityPct { get; set; } = 0;
    public DateOnly? ExpectedClosingDate { get; set; }
    public decimal ExpectedValue { get; set; } = 0;
    public string Currency { get; set; } = "VND";
    public long? SalespersonId { get; set; }
    public long? TerritoryId { get; set; }
    public string Status { get; set; } = "OPEN";    // OPEN → QUOTATION / WON / LOST / CLOSED
    public long? LostReasonId { get; set; }
    public string? Competitor { get; set; }
    public long? QuotationId { get; set; }           // latest quotation from make-quotation
    public string? Note { get; set; }
    public long? CreatorId { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public List<OpportunityLine> Lines { get; set; } = new();
}

/// <summary>crm.opportunity_line — Hàng hóa quan tâm.</summary>
public class OpportunityLine
{
    public long Id { get; set; }
    public long OpportunityId { get; set; }
    public long ProductId { get; set; }
    public decimal Qty { get; set; }
    public decimal? EstimatedRate { get; set; }
    public decimal Amount { get; set; } = 0;
    public string? Note { get; set; }
}

/// <summary>crm.activity — Hoạt động timeline (note/call/email/meeting/todo).</summary>
public class Activity
{
    public long Id { get; set; }
    public string RefTable { get; set; } = null!;
    public long RefId { get; set; }
    public string ActivityType { get; set; } = null!;   // NOTE | CALL | EMAIL | MEETING | TODO
    public string Subject { get; set; } = null!;
    public string? Description { get; set; }
    public DateOnly? DueDate { get; set; }
    public bool IsReminder { get; set; }
    public long? AssigneeId { get; set; }
    public string Status { get; set; } = "OPEN";        // OPEN | DONE
    public long? CreatorId { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? CompletedAt { get; set; }
}