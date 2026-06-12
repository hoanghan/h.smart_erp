using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;

namespace Erp.Api.Core;

public class JwtSettings
{
    public string Secret { get; set; } = "change-me-in-production-please-32chars!";
    public int AccessTokenMinutes { get; set; } = 15;
    public int RefreshTokenDays { get; set; } = 7;
    public string Issuer { get; set; } = "erp-api";
}

public class JwtService(JwtSettings settings)
{
    private readonly SymmetricSecurityKey _key =
        new(Encoding.UTF8.GetBytes(settings.Secret));

    public string CreateAccessToken(long userId, bool isAdmin) =>
        CreateToken(userId, "access", TimeSpan.FromMinutes(settings.AccessTokenMinutes),
            new Claim("is_admin", isAdmin ? "true" : "false"));

    public string CreateRefreshToken(long userId) =>
        CreateToken(userId, "refresh", TimeSpan.FromDays(settings.RefreshTokenDays));

    private string CreateToken(long userId, string type, TimeSpan lifetime, params Claim[] extra)
    {
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, userId.ToString()),
            new("token_type", type),
        };
        claims.AddRange(extra);
        var token = new JwtSecurityToken(
            issuer: settings.Issuer,
            claims: claims,
            expires: DateTime.UtcNow.Add(lifetime),
            signingCredentials: new SigningCredentials(_key, SecurityAlgorithms.HmacSha256));
        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    /// <summary>Validate refresh token, trả về userId hoặc null.</summary>
    public long? ValidateRefreshToken(string token)
    {
        try
        {
            var principal = new JwtSecurityTokenHandler().ValidateToken(token,
                new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidIssuer = settings.Issuer,
                    ValidateAudience = false,
                    IssuerSigningKey = _key,
                    ClockSkew = TimeSpan.FromSeconds(30),
                }, out _);
            if (principal.FindFirstValue("token_type") != "refresh") return null;
            var sub = principal.FindFirstValue(JwtRegisteredClaimNames.Sub)
                      ?? principal.FindFirstValue(ClaimTypes.NameIdentifier);
            return long.TryParse(sub, out var id) ? id : null;
        }
        catch
        {
            return null;
        }
    }
}
