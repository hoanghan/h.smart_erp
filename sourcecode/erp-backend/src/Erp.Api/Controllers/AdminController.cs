using System.Text.RegularExpressions;
using Erp.Api.Core;
using Erp.Api.Data;
using Erp.Api.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Erp.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/admin")]
public class AdminController(ErpDbContext db, RbacService rbac) : ControllerBase
{
    private async Task<bool> IsAdminOrHasPermission()
    {
        if (RbacService.IsAdmin(User)) return true;
        return await rbac.HasPermissionAsync(User, "FUNCTION", "admin", "VIEW");
    }

    private IActionResult Forbidden() =>
        StatusCode(403, new ApiError("WF_NO_PERMISSION", "Thiếu quyền truy cập"));

    // ============ USERS ============

    [HttpGet("users")]
    public async Task<IActionResult> ListUsers([FromQuery] int page = 1, [FromQuery] int size = 20, [FromQuery] string? q = null)
    {
        if (!await IsAdminOrHasPermission()) return Forbidden();
        page = Math.Max(1, page);
        size = Math.Clamp(size, 1, 100);

        var query = db.AppUsers.AsNoTracking()
            .GroupJoin(db.Employees, u => u.EmployeeId, e => e.Id, (u, e) => new { u, e })
            .SelectMany(x => x.e.DefaultIfEmpty(), (x, e) => new
            {
                x.u.Id,
                x.u.Username,
                x.u.EmployeeId,
                EmployeeName = e != null ? e.FullName : null,
                x.u.IsAdmin,
                x.u.IsActive,
                x.u.CreatedAt
            });

        if (!string.IsNullOrWhiteSpace(q))
        {
            var pattern = $"%{q.Trim()}%";
            query = query.Where(x => EF.Functions.ILike(x.Username, pattern)
                                  || EF.Functions.ILike(x.EmployeeName ?? "", pattern));
        }

        var total = await query.LongCountAsync();
        var items = await query.OrderBy(x => x.Id).Skip((page - 1) * size).Take(size).ToListAsync();
        return Ok(new PageResult<object>(items, total, page, size));
    }

    [HttpPost("users")]
    public async Task<IActionResult> CreateUser([FromBody] CreateUserRequest body)
    {
        if (!await IsAdminOrHasPermission()) return Forbidden();
        if (await db.AppUsers.AnyAsync(u => u.Username == body.Username))
            return Conflict(new ApiError("CONFLICT", "Tên đăng nhập đã tồn tại"));

        var user = new AppUser
        {
            Username = body.Username,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(body.Password),
            EmployeeId = body.EmployeeId,
            IsAdmin = body.IsAdmin,
            IsActive = true,
        };
        db.AppUsers.Add(user);
        await db.SaveChangesAsync();
        return StatusCode(201, new { user.Id, user.Username, user.EmployeeId, user.IsAdmin, user.IsActive, user.CreatedAt });
    }

    [HttpPut("users/{id:long}")]
    public async Task<IActionResult> UpdateUser(long id, [FromBody] UpdateUserRequest body)
    {
        if (!await IsAdminOrHasPermission()) return Forbidden();
        var user = await db.AppUsers.FindAsync(id);
        if (user is null) return NotFound(new ApiError("NOT_FOUND", "User không tồn tại"));

        if (body.Username != null) user.Username = body.Username;
        if (body.Password != null) user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(body.Password);
        if (body.EmployeeId.HasValue) user.EmployeeId = body.EmployeeId;
        if (body.IsAdmin.HasValue) user.IsAdmin = body.IsAdmin.Value;
        if (body.IsActive.HasValue) user.IsActive = body.IsActive.Value;

        await db.SaveChangesAsync();
        return Ok(new { user.Id, user.Username, user.EmployeeId, user.IsAdmin, user.IsActive, user.CreatedAt });
    }

    [HttpGet("users/{id:long}/permissions")]
    public async Task<IActionResult> GetUserPermissions(long id)
    {
        if (!await IsAdminOrHasPermission()) return Forbidden();
        var perms = await db.Permissions.AsNoTracking()
            .Where(p => p.GranteeType == "USER" && p.GranteeId == id)
            .ToListAsync();
        return Ok(perms);
    }

    // ============ GROUPS ============

    [HttpGet("groups")]
    public async Task<IActionResult> ListGroups([FromQuery] int page = 1, [FromQuery] int size = 20, [FromQuery] string? q = null)
    {
        if (!await IsAdminOrHasPermission()) return Forbidden();
        page = Math.Max(1, page);
        size = Math.Clamp(size, 1, 100);
        var query = db.UserGroups.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(q))
            query = query.Where(g => EF.Functions.ILike(g.Name, $"%{q.Trim()}%")
                                  || EF.Functions.ILike(g.Code, $"%{q.Trim()}%"));
        var total = await query.LongCountAsync();
        var items = await query.OrderBy(g => g.Id).Skip((page - 1) * size).Take(size).Select(g => new
        {
            g.Id,
            g.Code,
            g.Name,
            MemberCount = db.UserGroupMembers.Count(m => m.GroupId == g.Id)
        }).ToListAsync();
        return Ok(new PageResult<object>(items, total, page, size));
    }

    [HttpPost("groups")]
    public async Task<IActionResult> CreateGroup([FromBody] CreateGroupRequest body)
    {
        if (!await IsAdminOrHasPermission()) return Forbidden();
        if (await db.UserGroups.AnyAsync(g => g.Code == body.Code))
            return Conflict(new ApiError("CONFLICT", "Mã nhóm đã tồn tại"));
        var group = new UserGroup { Code = body.Code, Name = body.Name };
        db.UserGroups.Add(group);
        await db.SaveChangesAsync();
        return StatusCode(201, new { group.Id, group.Code, group.Name });
    }

    [HttpPut("groups/{id:long}")]
    public async Task<IActionResult> UpdateGroup(long id, [FromBody] UpdateGroupRequest body)
    {
        if (!await IsAdminOrHasPermission()) return Forbidden();
        var group = await db.UserGroups.FindAsync(id);
        if (group is null) return NotFound(new ApiError("NOT_FOUND", "Nhóm không tồn tại"));
        if (body.Name != null) group.Name = body.Name;
        await db.SaveChangesAsync();
        return Ok(new { group.Id, group.Code, group.Name });
    }

    [HttpDelete("groups/{id:long}")]
    public async Task<IActionResult> DeleteGroup(long id)
    {
        if (!await IsAdminOrHasPermission()) return Forbidden();
        var group = await db.UserGroups.FindAsync(id);
        if (group is null) return NotFound(new ApiError("NOT_FOUND", "Nhóm không tồn tại"));
        db.UserGroups.Remove(group);
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("groups/{id:long}/members")]
    public async Task<IActionResult> GetGroupMembers(long id)
    {
        if (!await IsAdminOrHasPermission()) return Forbidden();
        var members = await db.UserGroupMembers.AsNoTracking()
            .Where(m => m.GroupId == id)
            .Select(m => m.UserId)
            .ToListAsync();
        return Ok(members);
    }

    [HttpPut("groups/{id:long}/members")]
    public async Task<IActionResult> UpdateGroupMembers(long id, [FromBody] List<long> userIds)
    {
        if (!await IsAdminOrHasPermission()) return Forbidden();
        var existing = await db.UserGroupMembers.Where(m => m.GroupId == id).ToListAsync();
        db.UserGroupMembers.RemoveRange(existing);
        db.UserGroupMembers.AddRange(userIds.Select(uid => new UserGroupMember { GroupId = id, UserId = uid }));
        await db.SaveChangesAsync();
        return Ok(new { updated = userIds.Count });
    }

    // ============ PERMISSIONS ============

    [HttpGet("permission-catalog")]
    public IActionResult GetPermissionCatalog()
    {
        var availableActions = new Dictionary<string, string[]>
        {
            ["FUNCTION"] = new[] { "VIEW", "CREATE", "UPDATE", "DELETE" },
            ["CATALOG"] = new[] { "VIEW", "CREATE", "UPDATE", "DELETE", "IMPORT", "EXPORT" },
            ["DOCUMENT"] = new[] { "VIEW", "CREATE", "UPDATE", "DELETE", "APPROVE", "POST", "UNLOCK", "IMPORT", "EXPORT", "BYPASS_CREDIT_LIMIT" },
            ["OPERATION"] = new[] { "VIEW", "CREATE", "UPDATE", "DELETE", "APPROVE", "POST" },
            ["REPORT"] = new[] { "VIEW", "EXPORT" },
        };

        var subjects = new List<object>();

        // FUNCTION: admin
        subjects.Add(new { subjectType = "FUNCTION", subjectCode = "admin", label = "Quản trị" });

        // CATALOG: all CRUD resources
        var catalogResources = new[] {
            ("uoms", "Đơn vị tính"),
            ("payment-methods", "Phương thức thanh toán"),
            ("delivery-methods", "Phương thức giao hàng"),
            ("product-groups", "Nhóm hàng"),
            ("products", "Sản phẩm"),
            ("partners", "Đối tác"),
            ("warehouses", "Kho"),
            ("departments", "Phòng ban"),
            ("employees", "Nhân viên"),
            ("cost-types", "Loại chi phí"),
            ("payment-terms-templates", "Mẫu điều khoản TT"),
            ("tax-charge-templates", "Mẫu thuế/phụ phí"),
        };
        foreach (var (code, label) in catalogResources)
            subjects.Add(new { subjectType = "CATALOG", subjectCode = code, label });

        // DOCUMENT: workflow definitions keys
        var docResources = new Dictionary<string, string>
        {
            ["quotations"] = "Báo giá",
            ["sales-orders"] = "Đơn hàng bán",
            ["purchase-requests"] = "Yêu cầu mua hàng",
            ["purchase-orders"] = "Đơn hàng mua",
            ["po-payments"] = "Thanh toán mua hàng",
            ["supplier-returns"] = "Trả hàng NCC",
            ["rfqs"] = "Yêu cầu báo giá",
            ["supplier-quotations"] = "Báo giá NCC",
            ["landed-costs"] = "Chi phí nhập khẩu",
            ["stock-docs"] = "Phiếu kho",
            ["sales-allowances"] = "Giảm giá bán hàng",
        };
        foreach (var (code, label) in docResources)
            subjects.Add(new { subjectType = "DOCUMENT", subjectCode = code, label });

        // Add doc_numbering types as document subjects
        var docTypes = new[] { "QUOTATION", "SALES_ORDER", "PURCHASE_ORDER", "PURCHASE_REQUEST",
            "STOCK_RECEIPT", "STOCK_ISSUE", "STOCK_TRANSFER", "SALES_ALLOWANCE", "SUPPLIER_RETURN" };
        foreach (var dt in docTypes)
            subjects.Add(new { subjectType = "DOCUMENT", subjectCode = dt, label = $"Chứng từ {dt}" });

        return Ok(new
        {
            subjectTypes = new[] { "FUNCTION", "CATALOG", "DOCUMENT", "OPERATION", "REPORT" },
            subjectTypeLabels = new Dictionary<string, string>
            {
                ["FUNCTION"] = "Chức năng",
                ["CATALOG"] = "Danh mục",
                ["DOCUMENT"] = "Chứng từ",
                ["OPERATION"] = "Nghiệp vụ",
                ["REPORT"] = "Báo cáo",
            },
            actions = new[] { "VIEW", "CREATE", "UPDATE", "DELETE", "APPROVE", "POST", "UNLOCK", "IMPORT", "EXPORT", "BYPASS_CREDIT_LIMIT" },
            actionLabels = new Dictionary<string, string>
            {
                ["VIEW"] = "Xem", ["CREATE"] = "Thêm", ["UPDATE"] = "Sửa", ["DELETE"] = "Xóa",
                ["APPROVE"] = "Duyệt", ["POST"] = "Ghi sổ", ["UNLOCK"] = "Mở khóa",
                ["IMPORT"] = "Nhập", ["EXPORT"] = "Xuất", ["BYPASS_CREDIT_LIMIT"] = "Duyệt vượt hạn mức",
            },
            availableActions,
            subjects,
        });
    }

    [HttpGet("permissions")]
    public async Task<IActionResult> GetPermissions([FromQuery] string granteeType, [FromQuery] long granteeId)
    {
        if (!await IsAdminOrHasPermission()) return Forbidden();
        var perms = await db.Permissions.AsNoTracking()
            .Where(p => p.GranteeType == granteeType && p.GranteeId == granteeId)
            .Select(p => new { p.SubjectType, p.SubjectCode, p.Action })
            .ToListAsync();
        return Ok(perms);
    }

    [HttpPut("permissions")]
    public async Task<IActionResult> SetPermissions([FromBody] SetPermissionsRequest body)
    {
        if (!await IsAdminOrHasPermission()) return Forbidden();
        using var tx = await db.Database.BeginTransactionAsync();
        var existing = await db.Permissions
            .Where(p => p.GranteeType == body.GranteeType && p.GranteeId == body.GranteeId)
            .ToListAsync();
        db.Permissions.RemoveRange(existing);
        if (body.Permissions != null)
        {
            foreach (var p in body.Permissions)
            {
                db.Permissions.Add(new Permission
                {
                    GranteeType = body.GranteeType,
                    GranteeId = body.GranteeId,
                    SubjectType = p.SubjectType,
                    SubjectCode = p.SubjectCode,
                    Action = p.Action,
                });
            }
        }
        await db.SaveChangesAsync();
        await tx.CommitAsync();
        return Ok(new { updated = body.Permissions?.Count ?? 0 });
    }

    // ============ DATA SCOPES ============

    [HttpGet("data-scopes")]
    public async Task<IActionResult> GetDataScopes([FromQuery] long userId)
    {
        if (!await IsAdminOrHasPermission()) return Forbidden();
        var deptIds = await db.DataScopes.AsNoTracking()
            .Where(d => d.UserId == userId)
            .Select(d => d.DepartmentId)
            .ToListAsync();
        return Ok(deptIds);
    }

    [HttpPut("data-scopes")]
    public async Task<IActionResult> SetDataScopes([FromBody] SetDataScopesRequest body)
    {
        if (!await IsAdminOrHasPermission()) return Forbidden();
        var existing = await db.DataScopes.Where(d => d.UserId == body.UserId).ToListAsync();
        db.DataScopes.RemoveRange(existing);
        if (body.DepartmentIds != null)
        {
            foreach (var deptId in body.DepartmentIds)
                db.DataScopes.Add(new DataScope { UserId = body.UserId, DepartmentId = deptId });
        }
        await db.SaveChangesAsync();
        return Ok(new { updated = body.DepartmentIds?.Count ?? 0 });
    }

    // ============ APPROVAL RIGHTS ============

    [HttpGet("approval-rights")]
    public async Task<IActionResult> GetApprovalRights([FromQuery] long userId)
    {
        if (!await IsAdminOrHasPermission()) return Forbidden();
        var docTypes = await db.ApprovalRights.AsNoTracking()
            .Where(a => a.UserId == userId)
            .Select(a => a.DocType)
            .ToListAsync();
        return Ok(docTypes);
    }

    [HttpPut("approval-rights")]
    public async Task<IActionResult> SetApprovalRights([FromBody] SetApprovalRightsRequest body)
    {
        if (!await IsAdminOrHasPermission()) return Forbidden();
        var existing = await db.ApprovalRights.Where(a => a.UserId == body.UserId).ToListAsync();
        db.ApprovalRights.RemoveRange(existing);
        if (body.DocTypes != null)
        {
            foreach (var dt in body.DocTypes)
                db.ApprovalRights.Add(new ApprovalRight { UserId = body.UserId, DocType = dt });
        }
        await db.SaveChangesAsync();
        return Ok(new { updated = body.DocTypes?.Count ?? 0 });
    }

    // ============ DOC NUMBERING ============

    [HttpGet("doc-numbering")]
    public async Task<IActionResult> GetDocNumbering()
    {
        if (!await IsAdminOrHasPermission()) return Forbidden();
        var items = await db.DocNumberings.AsNoTracking().OrderBy(d => d.DocType).ToListAsync();
        return Ok(items);
    }

    [HttpPut("doc-numbering/{id:long}")]
    public async Task<IActionResult> UpdateDocNumbering(long id, [FromBody] UpdateDocNumberingRequest body)
    {
        if (!await IsAdminOrHasPermission()) return Forbidden();
        var row = await db.DocNumberings.FindAsync(id);
        if (row is null) return NotFound(new ApiError("NOT_FOUND", "Không tìm thấy"));
        if (body.Pattern != null)
        {
            if (!body.Pattern.Contains("{####}") && !body.Pattern.Contains("{######}"))
                return BadRequest(new ApiError("INVALID_PATTERN", "Pattern phải chứa token {####} hoặc {######}"));
            row.Pattern = body.Pattern;
        }
        if (body.ResetBy != null) row.ResetBy = body.ResetBy;
        await db.SaveChangesAsync();
        return Ok(row);
    }

    [HttpGet("doc-numbering/preview")]
    public IActionResult PreviewDocNumber([FromQuery] string pattern, [FromQuery] string resetBy = "MONTH")
    {
        var d = DateOnly.FromDateTime(DateTime.Today);
        var period = resetBy switch
        {
            "MONTH" => d.ToString("yyMM"),
            "YEAR" => d.ToString("yyyy"),
            _ => "",
        };
        var seq = 1L;
        var result = pattern
            .Replace("{YYYY}", d.ToString("yyyy"))
            .Replace("{YY}", d.ToString("yy"))
            .Replace("{MM}", d.ToString("MM"))
            .Replace("{DD}", d.ToString("dd"));
        var start = result.IndexOf('{');
        while (start >= 0)
        {
            var end = result.IndexOf('}', start);
            if (end < 0) break;
            var token = result[(start + 1)..end];
            if (token.Length > 0 && token.All(c => c == '#'))
                result = result[..start] + seq.ToString().PadLeft(token.Length, '0') + result[(end + 1)..];
            start = result.IndexOf('{', start + 1);
        }
        return Ok(new { preview = result });
    }

    // ============ COMPANY INFO ============

    [HttpGet("company-info")]
    public async Task<IActionResult> GetCompanyInfo()
    {
        var info = await db.CompanyInfos.AsNoTracking().FirstOrDefaultAsync();
        if (info is null) return Ok(new { });
        return Ok(info);
    }

    [HttpPut("company-info")]
    public async Task<IActionResult> UpdateCompanyInfo([FromBody] CompanyInfo body)
    {
        if (!await IsAdminOrHasPermission()) return Forbidden();
        var info = await db.CompanyInfos.FirstOrDefaultAsync();
        if (info is null)
        {
            info = new CompanyInfo();
            db.CompanyInfos.Add(info);
        }
        if (body.CompanyName != null) info.CompanyName = body.CompanyName;
        if (body.TaxCode != null) info.TaxCode = body.TaxCode;
        if (body.Address != null) info.Address = body.Address;
        if (body.Representative != null) info.Representative = body.Representative;
        if (body.ChiefAccountant != null) info.ChiefAccountant = body.ChiefAccountant;
        if (body.Treasurer != null) info.Treasurer = body.Treasurer;
        if (body.LogoBase64 != null) info.LogoBase64 = body.LogoBase64;
        await db.SaveChangesAsync();
        return Ok(info);
    }

    // ============ AUDIT LOG ============

    [HttpGet("audit-log")]
    public async Task<IActionResult> GetAuditLog([FromQuery] int page = 1, [FromQuery] int size = 20,
        [FromQuery] long? userId = null, [FromQuery] string? refTable = null,
        [FromQuery] string? dateFrom = null, [FromQuery] string? dateTo = null)
    {
        if (!await IsAdminOrHasPermission()) return Forbidden();
        page = Math.Max(1, page);
        size = Math.Clamp(size, 1, 100);
        var query = db.AuditLogs.AsNoTracking().AsQueryable();
        if (userId.HasValue) query = query.Where(a => a.UserId == userId);
        if (!string.IsNullOrWhiteSpace(refTable)) query = query.Where(a => a.RefTable == refTable);
        if (DateTimeOffset.TryParse(dateFrom, out var from)) query = query.Where(a => a.CreatedAt >= from);
        if (DateTimeOffset.TryParse(dateTo, out var to)) query = query.Where(a => a.CreatedAt <= to);
        var total = await query.LongCountAsync();
        var items = await query.OrderByDescending(a => a.CreatedAt).Skip((page - 1) * size).Take(size).ToListAsync();
        return Ok(new PageResult<object>(items, total, page, size));
    }

    // ============ WF TRANSITION LOG ============

    [HttpGet("wf-log")]
    public async Task<IActionResult> GetWfLog([FromQuery] string refTable, [FromQuery] long refId,
        [FromQuery] int page = 1, [FromQuery] int size = 50)
    {
        if (!await IsAdminOrHasPermission()) return Forbidden();
        page = Math.Max(1, page);
        size = Math.Clamp(size, 1, 100);
        var query = db.WfTransitionLogs.AsNoTracking()
            .Where(w => w.RefTable == refTable && w.RefId == refId);
        var total = await query.LongCountAsync();
        var items = await query.OrderByDescending(w => w.ActedAt).Skip((page - 1) * size).Take(size).ToListAsync();
        return Ok(new PageResult<object>(items, total, page, size));
    }
}

// ============ DTOs ============

public record CreateUserRequest(string Username, string Password, long? EmployeeId, bool IsAdmin = false);
public record UpdateUserRequest(string? Username = null, string? Password = null, long? EmployeeId = null, bool? IsAdmin = null, bool? IsActive = null);
public record CreateGroupRequest(string Code, string Name);
public record UpdateGroupRequest(string? Name = null);
public record SetPermissionsRequest(string GranteeType, long GranteeId, List<PermissionEntry>? Permissions);
public record PermissionEntry(string SubjectType, string SubjectCode, string Action);
public record SetDataScopesRequest(long UserId, List<long>? DepartmentIds);
public record SetApprovalRightsRequest(long UserId, List<string>? DocTypes);
public record UpdateDocNumberingRequest(string? Pattern = null, string? ResetBy = null);

