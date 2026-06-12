namespace Erp.Api.Entities;

public class Department
{
    public long Id { get; set; }
    public string Code { get; set; } = null!;
    public string Name { get; set; } = null!;
    public long? ParentId { get; set; }
    public bool IsActive { get; set; } = true;
}

public class JobTitle
{
    public long Id { get; set; }
    public string Code { get; set; } = null!;
    public string Name { get; set; } = null!;
}

public class Employee
{
    public long Id { get; set; }
    public string Code { get; set; } = null!;
    public string FullName { get; set; } = null!;
    public long? DepartmentId { get; set; }
    public long? PositionId { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public decimal? BaseSalary { get; set; }
    public string? InsuranceNo { get; set; }
    public bool IsActive { get; set; } = true;
}

public class AppUser
{
    public long Id { get; set; }
    public string Username { get; set; } = null!;
    public string PasswordHash { get; set; } = null!;
    public long? EmployeeId { get; set; }
    public bool IsAdmin { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; }
}

public class Permission
{
    public long Id { get; set; }
    public string GranteeType { get; set; } = null!;   // USER | GROUP
    public long GranteeId { get; set; }
    public string SubjectType { get; set; } = null!;   // FUNCTION|CATALOG|DOCUMENT|OPERATION|REPORT
    public string SubjectCode { get; set; } = null!;
    public string Action { get; set; } = null!;        // VIEW|CREATE|UPDATE|DELETE|APPROVE|POST|UNLOCK
}

public class UserGroupMember
{
    public long GroupId { get; set; }
    public long UserId { get; set; }
}
