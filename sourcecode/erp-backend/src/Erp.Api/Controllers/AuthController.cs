using Erp.Api.Core;
using Erp.Api.Data;
using Erp.Api.Dtos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Erp.Api.Controllers;

[ApiController]
[Route("api/v1/auth")]
public class AuthController(ErpDbContext db, JwtService jwt) : ControllerBase
{
    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<IActionResult> Login([FromBody] LoginRequest body)
    {
        var user = await db.AppUsers.FirstOrDefaultAsync(u => u.Username == body.Username);
        if (user is null || !BCrypt.Net.BCrypt.Verify(body.Password, user.PasswordHash))
            return Unauthorized(new ApiError("AUTH_FAILED", "Sai tÃªn Ä‘Äƒng nháº­p hoáº·c máº­t kháº©u"));
        if (!user.IsActive)
            return Unauthorized(new ApiError("AUTH_LOCKED", "TÃ i khoáº£n Ä‘Ã£ bá»‹ khÃ³a"));

        return Ok(new TokenResponse(
            jwt.CreateAccessToken(user.Id, user.IsAdmin),
            jwt.CreateRefreshToken(user.Id)));
    }

    [HttpPost("refresh")]
    [AllowAnonymous]
    public async Task<IActionResult> Refresh([FromBody] RefreshRequest body)
    {
        var userId = jwt.ValidateRefreshToken(body.RefreshToken);
        if (userId is null)
            return Unauthorized(new ApiError("AUTH_INVALID_REFRESH", "Refresh token khÃ´ng há»£p lá»‡"));

        var user = await db.AppUsers.FindAsync(userId.Value);
        if (user is null || !user.IsActive)
            return Unauthorized(new ApiError("AUTH_LOCKED", "TÃ i khoáº£n khÃ´ng há»£p lá»‡"));

        return Ok(new TokenResponse(
            jwt.CreateAccessToken(user.Id, user.IsAdmin),
            jwt.CreateRefreshToken(user.Id)));
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> Me()
    {
        var userId = RbacService.GetUserId(User);
        if (userId is null) return Unauthorized();
        var user = await db.AppUsers.FindAsync(userId.Value);
        if (user is null) return Unauthorized();

        List<object> permissions;
        if (user.IsAdmin)
        {
            permissions = new List<object> { new { subjectType = "*", subjectCode = "*", action = "*" } };
        }
        else
        {
            var groupIds = await db.UserGroupMembers
                .Where(g => g.UserId == userId.Value)
                .Select(g => g.GroupId)
                .ToListAsync();

            permissions = await db.Permissions
                .Where(p => (p.GranteeType == "USER" && p.GranteeId == userId.Value) ||
                            (p.GranteeType == "GROUP" && groupIds.Contains(p.GranteeId)))
                .Select(p => new { p.SubjectType, p.SubjectCode, p.Action })
                .Distinct()
                .ToListAsync<object>();
        }

        return Ok(new
        {
            id = user.Id,
            username = user.Username,
            isAdmin = user.IsAdmin,
            employeeId = user.EmployeeId,
            permissions
        });
    }
}

