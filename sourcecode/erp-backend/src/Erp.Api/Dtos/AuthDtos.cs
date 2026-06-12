namespace Erp.Api.Dtos;

public record LoginRequest(string Username, string Password);

public record RefreshRequest(string RefreshToken);

public record TokenResponse(string AccessToken, string RefreshToken, string TokenType = "bearer");

public record MeResponse(long Id, string Username, bool IsAdmin, long? EmployeeId);
