using System.Text;
using Erp.Api.Core;
using Erp.Api.Data;
using Hangfire;
using Hangfire.PostgreSql;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

// ---------- Cấu hình ----------
var jwtSettings = builder.Configuration.GetSection("Jwt").Get<JwtSettings>() ?? new JwtSettings();
var connString = builder.Configuration.GetConnectionString("ErpDb")
    ?? "Host=localhost;Port=5432;Database=g_erp;Username=postgres;Password=postgres";

// ---------- Services ----------
builder.Services.AddDbContext<ErpDbContext>(o =>
    o.UseNpgsql(connString).UseSnakeCaseNamingConvention());
builder.Services.AddHttpContextAccessor();

builder.Services.AddSingleton(jwtSettings);
builder.Services.AddSingleton<JwtService>();
builder.Services.AddScoped<RbacService>();
builder.Services.AddScoped<DocNumberingService>();
builder.Services.AddScoped<ValuationService>();
builder.Services.AddScoped<WorkflowService>();
builder.Services.AddScoped<OutboxService>();
builder.Services.AddScoped<PostingService>();
builder.Services.AddScoped<PricingService>();
builder.Services.AddScoped<FinanceJobs>();
builder.Services.AddHostedService<LerpWorker>();
builder.Services.AddHostedService<QuotationExpiryWorker>();

builder.Services.AddControllers();

// ---------- Hangfire (Task 23.5) ----------
builder.Services.AddHangfire(cfg => cfg
    .SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
    .UseSimpleAssemblyNameTypeSerializer()
    .UseRecommendedSerializerSettings()
    .UsePostgreSqlStorage(connString));
builder.Services.AddHangfireServer();

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(o =>
    {
        o.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwtSettings.Issuer,
            ValidateAudience = false,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings.Secret)),
            ClockSkew = TimeSpan.FromSeconds(30),
        };
        // Chỉ chấp nhận access token cho API
        o.Events = new JwtBearerEvents
        {
            // Cho phép Hangfire dashboard (truy cập từ browser) truyền token qua query string
            OnMessageReceived = ctx =>
            {
                if (ctx.HttpContext.Request.Path.StartsWithSegments("/hangfire")
                    && ctx.Request.Query.TryGetValue("access_token", out var qsToken))
                    ctx.Token = qsToken;
                return Task.CompletedTask;
            },
            OnTokenValidated = ctx =>
            {
                if (ctx.Principal?.FindFirst("token_type")?.Value != "access")
                    ctx.Fail("Wrong token type");
                return Task.CompletedTask;
            },
        };
    });
builder.Services.AddAuthorization();

var corsOrigins = (builder.Configuration["Cors:Origins"] ?? "*")
    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
builder.Services.AddCors(o => o.AddDefaultPolicy(p =>
{
    if (corsOrigins is ["*"]) p.AllowAnyOrigin();
    else p.WithOrigins(corsOrigins).AllowCredentials();
    p.AllowAnyHeader().AllowAnyMethod();
}));

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(o =>
{
    o.SwaggerDoc("v1", new OpenApiInfo { Title = "ERP API", Version = "v1" });
    o.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
    });
    o.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" },
            },
            Array.Empty<string>()
        },
    });
});

var app = builder.Build();

// ---------- Schema bootstrap (idempotent) ----------
{
    using var scope = app.Services.CreateScope();
    await SchemaBootstrap.RunAsync(scope.ServiceProvider.GetRequiredService<ErpDbContext>());
}

// ---------- Seed admin: dotnet run -- seed-admin [user] [pass] ----------
if (args.Length > 0 && args[0] == "seed-admin")
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<ErpDbContext>();
    var username = args.Length > 1 ? args[1] : "admin";
    var password = args.Length > 2 ? args[2] : "admin123";
    if (await db.AppUsers.AnyAsync(u => u.Username == username))
    {
        Console.WriteLine($"User '{username}' đã tồn tại.");
    }
    else
    {
        db.AppUsers.Add(new Erp.Api.Entities.AppUser
        {
            Username = username,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
            IsAdmin = true,
        });
        await db.SaveChangesAsync();
        Console.WriteLine($"Đã tạo admin '{username}'.");
    }
    return;
}

// ---------- Pipeline ----------
app.UseSwagger(o => o.RouteTemplate = "api/{documentName}/openapi.json");
app.UseSwaggerUI(o =>
{
    o.SwaggerEndpoint("/api/v1/openapi.json", "ERP API v1");
    o.RoutePrefix = "api/v1/docs";
});

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

app.UseHangfireDashboard("/hangfire", new DashboardOptions
{
    Authorization = [new HangfireAdminAuthorizationFilter()],
});
RecurringJob.AddOrUpdate<FinanceJobs>(
    "finance-mark-overdue-invoices", j => j.MarkOverdueInvoicesAsync(), Cron.Daily);

app.MapControllers();
app.MapGet("/health", () => Results.Ok(new { status = "ok" }));

app.Run();
