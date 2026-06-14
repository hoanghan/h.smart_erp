namespace Erp.Api.Core;

/// <summary>
/// Entity có cột creator_id - người tạo bản ghi.
/// </summary>
public interface IHasAudit
{
    long? CreatorId { get; set; }
}

/// <summary>
/// Entity có cột approver_id, approved_at - người duyệt và thời điểm duyệt.
/// </summary>
public interface IApprovable
{
    long? ApproverId { get; set; }
    DateTimeOffset? ApprovedAt { get; set; }
}