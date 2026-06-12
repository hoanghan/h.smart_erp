using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Erp.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace Erp.Api.Core;

/// <summary>
/// Kiểm tra RBAC theo bảng core.permission: quyền gán trực tiếp cho USER
/// hoặc qua GROUP (core.user_group_member). Admin bypass.
/// </summary>
public class RbacService(ErpDbContext db)
{
    public static long? GetUserId(ClaimsPrincipal user)
    {
        var sub = user.FindFirstValue(JwtRegisteredClaimNames.Sub)
                  ?? user.FindFirstValue(ClaimTypes.NameIdentifier);
        return long.TryParse(sub, out var id) ? id : null;
    }

    public static bool IsAdmin(ClaimsPrincipal user) =>
        user.FindFirstValue("is_admin") == "true";

    public async Task<bool> HasPermissionAsync(
        ClaimsPrincipal user, string subjectType, string subjectCode, string action)
    {
        if (IsAdmin(user)) return true;
        var userId = GetUserId(user);
        if (userId is null) return false;

        var groupIds = await db.UserGroupMembers
            .Where(g => g.UserId == userId)
            .Select(g => g.GroupId)
            .ToListAsync();

        return await db.Permissions.AnyAsync(p =>
            p.SubjectType == subjectType &&
            p.SubjectCode == subjectCode &&
            p.Action == action &&
            ((p.GranteeType == "USER" && p.GranteeId == userId) ||
             (p.GranteeType == "GROUP" && groupIds.Contains(p.GranteeId))));
    }
}
