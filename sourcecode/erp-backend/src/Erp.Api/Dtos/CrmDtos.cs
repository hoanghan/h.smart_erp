using System.ComponentModel.DataAnnotations;

namespace Erp.Api.Dtos;

// ---------- Lead Source ----------
public record LeadSourceOut(long Id, string Code, string Name, bool IsActive);
public record LeadSourceCreate([Required] string Code, [Required] string Name, bool IsActive = true);
public record LeadSourceUpdate([Required] string Code, [Required] string Name, bool IsActive);

// ---------- Sales Stage ----------
public record SalesStageOut(long Id, string Code, string Name, int OrderNo, decimal ProbabilityPct, bool IsActive);
public record SalesStageCreate([Required] string Code, [Required] string Name, int OrderNo, decimal ProbabilityPct, bool IsActive = true);
public record SalesStageUpdate([Required] string Code, [Required] string Name, int OrderNo, decimal ProbabilityPct, bool IsActive);

// ---------- Campaign ----------
public record CampaignOut(long Id, string DocNo, string Name, string CampaignType, decimal Budget,
    DateOnly StartDate, DateOnly EndDate, string Status, long? TerritoryId, string TerritoryName, DateTimeOffset CreatedAt);
public record CampaignCreate([Required] string Name, [Required] string CampaignType, decimal Budget, 
    DateOnly StartDate, DateOnly EndDate, long? TerritoryId);
public record CampaignUpdate([Required] string Name, [Required] string CampaignType, decimal Budget, 
    DateOnly StartDate, DateOnly EndDate, long? TerritoryId, [Required] string Status);

// ---------- Lead ----------
public record LeadOut(long Id, string DocNo, string FirstName, string LastName, string CompanyName, 
    string JobTitle, string Email, string Phone, string Address, string City, string Status, 
    long? LeadSourceId, string LeadSourceName, long? CampaignId, string CampaignName, 
    long? TerritoryId, string TerritoryName, long? SalespersonId, string SalespersonName, 
    long? PartnerId, string PartnerName, string Remarks, DateTimeOffset CreatedAt);
public record LeadCreate([Required] string FirstName, [Required] string LastName, string CompanyName, 
    string JobTitle, [Required] string Email, [Required] string Phone, string Address, string City, 
    long? LeadSourceId, long? CampaignId, long? TerritoryId, long? SalespersonId, string Remarks, 
    bool ForceCreate = false);
public record LeadUpdate([Required] string FirstName, [Required] string LastName, string CompanyName, 
    string JobTitle, [Required] string Email, [Required] string Phone, string Address, string City, 
    long? LeadSourceId, long? CampaignId, long? TerritoryId, long? SalespersonId, [Required] string Status, 
    string Remarks);
public record LeadDuplicateCheck(string Email, string Phone);
public record LeadDuplicateResult(bool HasDuplicates, List<LeadOut> DuplicateLeads, List<PartnerOut> DuplicatePartners);
public record ConvertToOpportunityRequest([Required] long SalesStageId, decimal ExpectedValue, 
    DateOnly ExpectedClosingDate, [Required] string Currency, List<OpportunityLineCreate> Lines);
public record ConvertToCustomerRequest([Required] string PartnerType, string? TaxCode);
public record ConvertToOpportunityResponse(long OpportunityId);
public record ConvertToCustomerResponse(long PartnerId);

// ---------- Opportunity ----------
public record OpportunityOut(long Id, string DocNo, long? LeadId, string LeadName, long? PartnerId, 
    string PartnerName, string OpportunityType, long? SalesStageId, string SalesStageName, 
    int ProbabilityPct, decimal ExpectedValue, DateOnly ExpectedClosingDate, string Currency, 
    string Status, long? QuotationId, string QuotationNo, long? LostReasonId, string LostReasonName, 
    string CompetitorInfo, long? SalespersonId, string SalespersonName, long? CampaignId, 
    string CampaignName, DateTimeOffset CreatedAt);
public record OpportunityCreate(long? LeadId, long? PartnerId, [Required] string OpportunityType, 
    long? SalesStageId, int ProbabilityPct, decimal ExpectedValue, DateOnly ExpectedClosingDate, 
    [Required] string Currency, long? SalespersonId, long? CampaignId, List<OpportunityLineCreate> Lines);
public record OpportunityUpdate(long? PartnerId, [Required] string OpportunityType, long? SalesStageId, 
    int ProbabilityPct, decimal ExpectedValue, DateOnly ExpectedClosingDate, [Required] string Status, 
    long? LostReasonId, string CompetitorInfo, List<OpportunityLineCreate> Lines);
public record OpportunityLineOut(long Id, long ProductId, string ProductCode, string ProductName, 
    decimal Qty, decimal EstimatedRate, decimal Amount);
public record OpportunityLineCreate([Required] long ProductId, decimal Qty, decimal EstimatedRate);
public record MakeQuotationRequest(int ValidityDays = 7);
public record MakeQuotationResponse(long QuotationId, string QuotationNo);

// ---------- Activity ----------
public record ActivityOut(long Id, string RefTable, long RefId, string ActivityType, string Subject, 
    string Description, DateOnly? DueDate, bool HasReminder, long? AssigneeId, string AssigneeName, 
    string Status, DateTimeOffset CreatedAt, DateTimeOffset? UpdatedAt);
public record ActivityCreate([Required] string RefTable, [Required] long RefId, [Required] string ActivityType, 
    string Subject, string Description, DateOnly? DueDate, bool HasReminder, long? AssigneeId);
public record ActivityUpdate([Required] string ActivityType, string Subject, string Description, 
    DateOnly? DueDate, bool HasReminder, long? AssigneeId, [Required] string Status);
public record TimelineItem(DateTime Timestamp, string Type, string Description, string? ActorName, object? Data);

// ---------- CRM Reports ----------
public record FunnelReportItem(string StageName, int Count, decimal TotalValue);
public record FunnelReport(DateOnly From, DateOnly To, List<FunnelReportItem> Items);
public record LeadConversionItem(string Source, int Leads, int Opportunities, int Quotations, int Orders);
public record LeadConversionReport(DateOnly From, DateOnly To, List<LeadConversionItem> BySource, List<LeadConversionItem> ByCampaign);
public record LostReasonItem(string Reason, int Count);
public record LostReasonsReport(DateOnly From, DateOnly To, List<LostReasonItem> Items);