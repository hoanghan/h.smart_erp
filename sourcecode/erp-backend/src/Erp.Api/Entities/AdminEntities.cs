namespace Erp.Api.Entities;

/// <summary>core.user_group — nhóm người dùng.</summary>
public class UserGroup
{
    public long Id { get; set; }
    public string Code { get; set; } = null!;
    public string Name { get; set; } = null!;
}

/// <summary>core.data_scope — phạm vi dữ liệu (user ↔ department).</summary>
public class DataScope
{
    public long Id { get; set; }
    public long UserId { get; set; }
    public long DepartmentId { get; set; }
}

/// <summary>core.approval_right — quyền phê duyệt theo loại chứng từ.</summary>
public class ApprovalRight
{
    public long Id { get; set; }
    public long UserId { get; set; }
    public string DocType { get; set; } = null!;
}

/// <summary>core.company_info — thông tin doanh nghiệp.</summary>
public class CompanyInfo
{
    public long Id { get; set; }
    public string? CompanyName { get; set; }
    public string? TaxCode { get; set; }
    public string? Address { get; set; }
    public string? Representative { get; set; }
    public string? ChiefAccountant { get; set; }
    public string? Treasurer { get; set; }
    public string? LogoBase64 { get; set; }
}

/// <summary>core.audit_log — nhật ký hệ thống.</summary>
public class AuditLog
{
    public long Id { get; set; }
    public long? UserId { get; set; }
    public string? Username { get; set; }
    public string Action { get; set; } = null!;
    public string? RefTable { get; set; }
    public long? RefId { get; set; }
    public string? Detail { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}
