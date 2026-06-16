using System.Security.Claims;
using Erp.Api.Data;
using Erp.Api.Entities;

namespace Erp.Api.Core;

public record WfTransition(string Action, string[] From, string To, string PermAction, bool RequireReason = false);

public class WorkflowException(string code, string message) : Exception(message)
{
    public string Code { get; } = code;
}

/// <summary>
/// Máy trạng thái chứng từ. Định nghĩa transition theo doc type,
/// kiểm tra trạng thái nguồn + quyền (DOCUMENT:resource:PermAction), ghi wf_transition_log.
/// </summary>
public class WorkflowService(ErpDbContext db, RbacService rbac)
{
    public static readonly Dictionary<string, WfTransition[]> Definitions = new()
    {
        // resource key = subject_code RBAC, đồng thời là ref_table log
        // Quotation kiểu ERPNext Selling: Draft → Open → Ordered / Lost / Expired / Cancelled
        ["quotations"] = new[]
        {
            // Luồng duyệt 2 bước (creator-approver): người tạo gửi duyệt → người duyệt Duyệt/Từ chối.
            new WfTransition("submit",           new[] { "DRAFT" }, "APPROVAL_REQUESTED", "UPDATE"),
            new WfTransition("approve",          new[] { "APPROVAL_REQUESTED" }, "OPEN", "APPROVE"),
            new WfTransition("reject",           new[] { "APPROVAL_REQUESTED" }, "DRAFT", "APPROVE", RequireReason: true),
            new WfTransition("make-sales-order", new[] { "OPEN" }, "ORDERED", "UPDATE"),
            new WfTransition("set-as-lost",      new[] { "OPEN" }, "LOST", "UPDATE"),
            new WfTransition("extend",           new[] { "EXPIRED" }, "OPEN", "UPDATE"),
            new WfTransition("cancel",           new[] { "DRAFT", "APPROVAL_REQUESTED", "OPEN" }, "CANCELLED", "UPDATE", RequireReason: true),
        },
        // SalesOrder kiểu ERPNext: Draft → To Deliver and Bill → To Deliver/To Bill → Completed,
        // trạng thái 3 cái sau được SalesOrderStatusHelper.Recompute tính lại theo delivered/billed per-line.
        ["sales-orders"] = new[]
        {
            new WfTransition("approve", new[] { "DRAFT" }, "TO_DELIVER_AND_BILL", "APPROVE"),
            new WfTransition("hold",    new[] { "TO_DELIVER_AND_BILL", "TO_DELIVER", "TO_BILL" }, "ON_HOLD", "UPDATE", RequireReason: true),
            new WfTransition("resume",  new[] { "ON_HOLD" }, "TO_DELIVER_AND_BILL", "UPDATE"),
            new WfTransition("close",   new[] { "TO_DELIVER_AND_BILL", "TO_DELIVER", "TO_BILL" }, "CLOSED", "UPDATE", RequireReason: true),
            new WfTransition("reopen",  new[] { "CLOSED" }, "TO_DELIVER_AND_BILL", "UPDATE"),
            new WfTransition("cancel",  new[] { "DRAFT", "TO_DELIVER_AND_BILL" }, "CANCELLED", "UPDATE", RequireReason: true),
        },
        ["sales-allowances"] = new[]
        {
            new WfTransition("approve", new[] { "DRAFT" }, "APPROVED", "APPROVE"),
        },
        ["purchase-orders"] = new[]
        {
            new WfTransition("approve",  new[] { "DRAFT" }, "TO_RECEIVE_AND_BILL", "APPROVE"),
            // Legacy aliases — old statuses still work for existing data
            new WfTransition("create-receipt-request", new[] { "TO_RECEIVE_AND_BILL", "TO_RECEIVE", "APPROVED", "NOT_RECEIVED" }, "NOT_RECEIVED", "UPDATE"),
            new WfTransition("complete", new[] { "APPROVED", "NOT_RECEIVED", "RECEIVED", "TO_RECEIVE_AND_BILL", "TO_BILL", "TO_RECEIVE" }, "COMPLETED", "UPDATE"),
            // New ERPNext-style actions
            new WfTransition("close",    new[] { "TO_RECEIVE_AND_BILL", "TO_BILL", "TO_RECEIVE" }, "CLOSED", "UPDATE", RequireReason: true),
            new WfTransition("reopen",   new[] { "CLOSED" }, "TO_RECEIVE_AND_BILL", "UPDATE"),
            new WfTransition("cancel",   new[] { "DRAFT", "TO_RECEIVE_AND_BILL" }, "CANCELLED", "UPDATE", RequireReason: true),
        },
        ["rfqs"] = new[]
        {
            new WfTransition("send",     new[] { "DRAFT" }, "SENT", "UPDATE"),
            new WfTransition("cancel",   new[] { "DRAFT", "SENT" }, "CANCELLED", "UPDATE", RequireReason: true),
        },
        ["supplier-quotations"] = new[]
        {
            new WfTransition("approve",  new[] { "DRAFT" }, "APPROVED", "APPROVE"),
            new WfTransition("cancel",   new[] { "DRAFT" }, "CANCELLED", "UPDATE", RequireReason: true),
        },
        ["landed-costs"] = new[]
        {
            new WfTransition("submit",   new[] { "DRAFT" }, "SUBMITTED", "APPROVE"),
            new WfTransition("cancel",   new[] { "DRAFT" }, "CANCELLED", "UPDATE", RequireReason: true),
        },
        ["po-payments"] = new[]
        {
            new WfTransition("approve", new[] { "DRAFT" }, "APPROVED", "APPROVE"),
            new WfTransition("cancel",  new[] { "DRAFT" }, "CANCELLED", "UPDATE", RequireReason: true),
        },
        ["purchase-requests"] = new[]
        {
            new WfTransition("approve", new[] { "DRAFT" }, "APPROVED", "APPROVE"),
            new WfTransition("cancel",  new[] { "DRAFT" }, "CANCELLED", "UPDATE", RequireReason: true),
        },
        ["supplier-returns"] = new[]
        {
            new WfTransition("approve", new[] { "DRAFT" }, "APPROVED", "APPROVE"),
            new WfTransition("cancel",  new[] { "DRAFT" }, "CANCELLED", "UPDATE", RequireReason: true),
        },
        ["stock-docs"] = new[]
        {
            new WfTransition("request",  new[] { "DRAFT" }, "REQUESTED", "UPDATE"),
            new WfTransition("confirm",  new[] { "REQUESTED" }, "CONFIRMED", "UPDATE"),
            new WfTransition("complete", new[] { "CONFIRMED" }, "COMPLETED", "UPDATE"),
            new WfTransition("cancel",   new[] { "DRAFT", "REQUESTED", "CONFIRMED" }, "CANCELLED", "UPDATE", RequireReason: true),
        },
        ["boms"] = new[]
        {
            new WfTransition("submit", new[] { "DRAFT" }, "SUBMITTED", "APPROVE"),
            new WfTransition("cancel", new[] { "SUBMITTED" }, "CANCELLED", "UPDATE"),
        },
        ["work-orders"] = new[]
        {
            new WfTransition("submit", new[] { "DRAFT" }, "NOT_STARTED", "APPROVE"),
            new WfTransition("start",  new[] { "NOT_STARTED" }, "IN_PROCESS", "UPDATE"),
            new WfTransition("stop",   new[] { "IN_PROCESS" }, "STOPPED", "UPDATE", RequireReason: true),
        },
        ["production-plans"] = new[]
        {
            new WfTransition("submit", new[] { "DRAFT" }, "SUBMITTED", "APPROVE"),
        },
    };

    /// <summary>
    /// Thực hiện transition: validate + check quyền + log. Trả về trạng thái mới.
    /// Caller chịu trách nhiệm SaveChanges (log được Add vào context).
    /// </summary>
    public async Task<string> TransitionAsync(
        ClaimsPrincipal user, string resource, long refId, string currentStatus,
        string action, string? reason)
    {
        if (!Definitions.TryGetValue(resource, out var transitions))
            throw new WorkflowException("WF_UNKNOWN_RESOURCE", $"Không có workflow cho '{resource}'");

        var t = transitions.FirstOrDefault(x => x.Action == action)
            ?? throw new WorkflowException("WF_UNKNOWN_ACTION", $"Action '{action}' không hợp lệ với {resource}");

        if (!t.From.Contains(currentStatus))
            throw new WorkflowException("WF_INVALID_TRANSITION",
                $"Không thể '{action}' khi trạng thái là {currentStatus} (cho phép: {string.Join(", ", t.From)})");

        if (t.RequireReason && string.IsNullOrWhiteSpace(reason))
            throw new WorkflowException("WF_REASON_REQUIRED", $"Action '{action}' bắt buộc nhập lý do");

        if (!await rbac.HasPermissionAsync(user, "DOCUMENT", resource, t.PermAction))
            throw new WorkflowException("WF_NO_PERMISSION",
                $"Thiếu quyền {t.PermAction} trên DOCUMENT:{resource}");

        db.WfTransitionLogs.Add(new WfTransitionLog
        {
            RefTable = resource,
            RefId = refId,
            FromStatus = currentStatus,
            ToStatus = t.To,
            Reason = reason,
            ActedBy = RbacService.GetUserId(user),
        });

        return t.To;
    }
}
