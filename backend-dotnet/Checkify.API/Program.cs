using Checkify.API.Configurations;
using Checkify.API.Data;
using Checkify.API.Middlewares;
using Checkify.API.Services;
using Checkify.API.Services.Interfaces;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Threading.RateLimiting;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddOpenApi();
builder.Services.AddMemoryCache();

// MySQL configuration
var connectionString =
    builder.Configuration.GetConnectionString("DefaultConnection");

if (string.IsNullOrWhiteSpace(connectionString))
{
    // Design-time fallback placeholder
    connectionString = "Server=localhost;Port=3306;Database=checkify;Uid=root;Pwd=;";
}

builder.Services.AddDbContext<CheckifyDbContext>(options =>
{
    options.UseMySQL(connectionString);
});

// Rate limiting configuration
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddFixedWindowLimiter("login-policy", opt =>
    {
        opt.PermitLimit = 50;
        opt.Window = TimeSpan.FromMinutes(1);
        opt.QueueLimit = 0;
    });
});

// JWT configuration
var jwtSettings = builder.Configuration
    .GetSection(JwtSettings.SectionName)
    .Get<JwtSettings>()
    ?? throw new InvalidOperationException(
        "JWT configuration is missing."
    );

if (string.IsNullOrWhiteSpace(jwtSettings.Secret) ||
    string.IsNullOrWhiteSpace(jwtSettings.Issuer) ||
    string.IsNullOrWhiteSpace(jwtSettings.Audience) ||
    jwtSettings.ExpiryMinutes <= 0)
{
    throw new InvalidOperationException(
        "JWT configuration contains invalid values."
    );
}

byte[] signingKey;

try
{
    signingKey = Convert.FromBase64String(jwtSettings.Secret);
}
catch (FormatException)
{
    throw new InvalidOperationException(
        "JWT secret must be a valid Base64 string."
    );
}

if (signingKey.Length < 32)
{
    throw new InvalidOperationException(
        "JWT secret must contain at least 32 bytes."
    );
}

builder.Services.Configure<JwtSettings>(
    builder.Configuration.GetSection(JwtSettings.SectionName)
);

// Register application services
builder.Services.AddScoped<IJwtService, JwtService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IDepartmentService, DepartmentService>();
builder.Services.AddScoped<IStudentService, StudentService>();
builder.Services.AddScoped<IStaffService, StaffService>();

// Class Session and Timetable
builder.Services.AddScoped<IClassSessionService, ClassSessionService>();

// OTP Security Engine
builder.Services.AddSingleton<IOtpService, OtpService>();

// QR Security Engine
builder.Services.AddSingleton<IQrService, QrService>();

// Attendance Session Service
builder.Services.AddScoped<IAttendanceSessionService, AttendanceSessionService>();

// Reports and analytics
builder.Services.AddScoped<IAnalyticsService, AnalyticsService>();

// Notifications and Alerts
builder.Services.AddScoped<INotificationService, NotificationService>();

// Leave Management System
builder.Services.AddScoped<ILeaveService, LeaveService>();

// Admin, Institutional Settings and Audit System
builder.Services.AddScoped<ISystemSettingService, SystemSettingService>();
builder.Services.AddScoped<IAuditLogService, AuditLogService>();
builder.Services.AddScoped<IAdminUserService, AdminUserService>();

// JWT authentication
builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.MapInboundClaims = false;

        options.TokenValidationParameters =
            new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,

                IssuerSigningKey =
                    new SymmetricSecurityKey(signingKey),

                ValidateIssuer = true,
                ValidIssuer = jwtSettings.Issuer,

                ValidateAudience = true,
                ValidAudience = jwtSettings.Audience,

                ValidateLifetime = true,

                ClockSkew = TimeSpan.FromSeconds(30),

                NameClaimType = "name",
                RoleClaimType = "role"
            };
    });

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly", policy =>
        policy.RequireRole("ADMIN"));

    options.AddPolicy("ManagerOnly", policy =>
        policy.RequireRole("MANAGER"));

    options.AddPolicy("HodOnly", policy =>
        policy.RequireRole("HOD"));

    options.AddPolicy("StaffOnly", policy =>
        policy.RequireRole("STAFF"));

    options.AddPolicy("StudentOnly", policy =>
        policy.RequireRole("STUDENT"));
});

// CORS configuration
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy
            .WithOrigins(
                "http://localhost:5173",
                "http://localhost:5174",
                "http://127.0.0.1:5173",
                "http://127.0.0.1:5174")
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

var app = builder.Build();

// Security Headers Middleware
app.Use(async (context, next) =>
{
    context.Response.Headers.Append("X-Content-Type-Options", "nosniff");
    context.Response.Headers.Append("X-Frame-Options", "DENY");
    context.Response.Headers.Append("X-XSS-Protection", "1; mode=block");
    context.Response.Headers.Append("Referrer-Policy", "strict-origin-when-cross-origin");
    await next();
});

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors("AllowFrontend");

// Global Exception Handling Middleware
app.UseMiddleware<GlobalExceptionMiddleware>();

app.UseRateLimiter();

// Authentication must come before authorization
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
