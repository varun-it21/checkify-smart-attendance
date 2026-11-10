using Checkify.API.Data;
using Checkify.API.DTOs.Auth;
using Checkify.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Checkify.API.Services;

public class AuthService : IAuthService
{
    private readonly CheckifyDbContext _context;
    private readonly IJwtService _jwtService;
    private readonly IAuditLogService _auditLogService;

    public AuthService(
        CheckifyDbContext context,
        IJwtService jwtService,
        IAuditLogService auditLogService)
    {
        _context = context;
        _jwtService = jwtService;
        _auditLogService = auditLogService;
    }

    public async Task<LoginResponse?> LoginAsync(
        LoginRequest request,
        CancellationToken cancellationToken = default)
    {
        var email = request.Email.Trim();

        var user = await _context.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(
                u => u.Email == email,
                cancellationToken
            );

        if (user == null)
        {
            return null;
        }

        bool isPasswordValid;

        try
        {
            isPasswordValid = BCrypt.Net.BCrypt.Verify(
                request.Password,
                user.Password
            );
        }
        catch (BCrypt.Net.SaltParseException)
        {
            // Treat an invalid stored BCrypt hash as a failed login.
            return null;
        }

        if (!isPasswordValid)
        {
            return null;
        }

        if (!user.IsActive)
        {
            throw new UnauthorizedAccessException("Your account has been deactivated. Please contact an administrator.");
        }

        var (token, expiresAt) = _jwtService.GenerateToken(user);

        // Record successful login in audit log asynchronously
        await _auditLogService.LogAsync(
            user.Id,
            "USER_LOGIN",
            "User",
            user.Id.ToString(),
            $"User logged in with role {user.Role}",
            cancellationToken: cancellationToken);

        return new LoginResponse
        {
            Token = token,
            Role = user.Role.Trim().ToUpperInvariant(),
            ExpiresAt = expiresAt
        };
    }
}
