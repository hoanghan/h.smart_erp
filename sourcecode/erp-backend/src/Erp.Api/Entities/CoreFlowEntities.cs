namespace Erp.Api.Entities;

/// <summary>core.doc_numbering — mẫu đánh số chứng từ.</summary>
public class DocNumbering
{
    public long Id { get; set; }
    public string DocType { get; set; } = null!;     // QUOTATION, SALES_ORDER, ...
    public string Pattern { get; set; } = null!;     // vd "BG{YY}{MM}-{####}"
    public long LastSeq { get; set; }
    public string ResetBy { get; set; } = "MONTH";   // NONE | MONTH | YEAR
    public string? LastPeriod { get; set; }          // kỳ gần nhất đã cấp số (vd "2606")
}

/// <summary>core.wf_transition_log — lịch sử chuyển trạng thái chứng từ.</summary>
public class WfTransitionLog
{
    public long Id { get; set; }
    public string RefTable { get; set; } = null!;
    public long RefId { get; set; }
    public string? FromStatus { get; set; }
    public string ToStatus { get; set; } = null!;
    public string? Reason { get; set; }
    public long? ActedBy { get; set; }
    public DateTimeOffset ActedAt { get; set; }
}
