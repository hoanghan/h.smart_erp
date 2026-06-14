using Hangfire.Dashboard;

namespace Erp.Api.Core;

/// <summary>Task 23.5: Chỉ admin (claim is_admin=true) được xem Hangfire dashboard.</summary>
public class HangfireAdminAuthorizationFilter : IDashboardAuthorizationFilter
{
    public bool Authorize(DashboardContext context)
    {
        var httpContext = context.GetHttpContext();
        return httpContext.User.Identity?.IsAuthenticated == true && RbacService.IsAdmin(httpContext.User);
    }
}
