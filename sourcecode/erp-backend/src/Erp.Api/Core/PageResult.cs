namespace Erp.Api.Core;

public record PageResult<T>(IReadOnlyList<T> Items, long Total, int Page, int Size);

public record ApiError(string Code, string Message);
