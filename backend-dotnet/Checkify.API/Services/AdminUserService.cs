using Checkify.API.Data;
using Checkify.API.DTOs.Admin;
using Checkify.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Checkify.API.Services;

public class AdminUserService : IAdminUserService
{
    private readonly CheckifyDbContext _db;
    private readonly IAuditLogService _auditLog;
    private readonly ILogger<AdminUserService> _logger;

    public AdminUserService(
        CheckifyDbContext db,
        IAuditLogService auditLog,
        ILogger<AdminUserService> logger)
    {
        _db = db;
        _auditLog = auditLog;
        _logger = logger;
    }

    public async Task<AdminUserListResponse> GetUsersAsync(
        int limit = 20,
        int offset = 0,
        string? role = null,
        string? search = null,
        CancellationToken cancellationToken = default)
    {
        var clampedLimit = Math.Clamp(limit <= 0 ? 20 : limit, 1, 100);
        var clampedOffset = Math.Max(0, offset);

        var query = _db.Users
            .Include(u => u.Student).ThenInclude(s => s!.Department)
            .Include(u => u.Staff).ThenInclude(s => s!.Department)
            .AsNoTracking();

        if (!string.IsNullOrWhiteSpace(role))
        {
            var r = role.Trim().ToUpperInvariant();
            query = query.Where(u => u.Role == r);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            query = query.Where(u => u.Name.ToLower().Contains(s) || u.Email.ToLower().Contains(s));
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var items = await query
            .OrderBy(u => u.Id)
            .Skip(clampedOffset)
            .Take(clampedLimit)
            .Select(u => new AdminUserResponse
            {
                Id = u.Id,
                Name = u.Name,
                Email = u.Email,
                Role = u.Role,
                IsActive = u.IsActive,
                DepartmentId = u.Student != null ? u.Student.DepartmentId : (u.Staff != null ? u.Staff.DepartmentId : null),
                DepartmentName = u.Student != null ? u.Student.Department.Name : (u.Staff != null ? u.Staff.Department.Name : null),
                Position = u.Staff != null ? u.Staff.Position : null
            })
            .ToListAsync(cancellationToken);

        return new AdminUserListResponse
        {
            Users = items,
            TotalCount = totalCount,
            Limit = clampedLimit,
            Offset = clampedOffset
        };
    }

    public async Task<AdminUserResponse> UpdateUserRoleAsync(
        int targetUserId,
        string newRole,
        int adminUserId,
        CancellationToken cancellationToken = default)
    {
        var normalizedRole = (newRole ?? string.Empty).Trim().ToUpperInvariant();
        var validRoles = new[] { "ADMIN", "MANAGER", "HOD", "STAFF", "STUDENT" };
        if (!validRoles.Contains(normalizedRole))
        {
            throw new ArgumentException($"Invalid role '{newRole}'. Allowed roles: {string.Join(", ", validRoles)}");
        }

        var user = await _db.Users
            .Include(u => u.Student).ThenInclude(s => s!.Department)
            .Include(u => u.Staff).ThenInclude(s => s!.Department)
            .FirstOrDefaultAsync(u => u.Id == targetUserId, cancellationToken);

        if (user == null)
            throw new KeyNotFoundException($"User with ID {targetUserId} not found.");

        if (user.Role == "ADMIN" && normalizedRole != "ADMIN")
        {
            var adminCount = await _db.Users.CountAsync(u => u.Role == "ADMIN" && u.IsActive, cancellationToken);
            if (adminCount <= 1)
            {
                throw new InvalidOperationException("Cannot demote the last remaining active Administrator.");
            }
        }

        var oldRole = user.Role;
        user.Role = normalizedRole;

        // If promoting to HOD or demoting from HOD, update Staff record if applicable
        if (user.Staff != null)
        {
            if (normalizedRole == "HOD") user.Staff.Position = "HOD";
            else if (oldRole == "HOD" && normalizedRole == "STAFF") user.Staff.Position = "STAFF";
        }

        await _db.SaveChangesAsync(cancellationToken);

        await _auditLog.LogAsync(
            adminUserId,
            "ROLE_UPDATED",
            "User",
            user.Id.ToString(),
            $"User '{user.Email}' role updated from '{oldRole}' to '{normalizedRole}'.",
            null,
            cancellationToken);

        return new AdminUserResponse
        {
            Id = user.Id,
            Name = user.Name,
            Email = user.Email,
            Role = user.Role,
            IsActive = user.IsActive,
            DepartmentId = user.Student != null ? user.Student.DepartmentId : (user.Staff != null ? user.Staff.DepartmentId : null),
            DepartmentName = user.Student != null ? user.Student.Department.Name : (user.Staff != null ? user.Staff.Department.Name : null),
            Position = user.Staff != null ? user.Staff.Position : null
        };
    }

    public async Task<bool> ResetPasswordAsync(
        int targetUserId,
        string newPassword,
        int adminUserId,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(newPassword) || newPassword.Length < 8)
        {
            throw new ArgumentException("Password must be at least 8 characters long.");
        }

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == targetUserId, cancellationToken);
        if (user == null)
            throw new KeyNotFoundException($"User with ID {targetUserId} not found.");

        user.Password = BCrypt.Net.BCrypt.HashPassword(newPassword.Trim());
        await _db.SaveChangesAsync(cancellationToken);

        await _auditLog.LogAsync(
            adminUserId,
            "PASSWORD_RESET",
            "User",
            user.Id.ToString(),
            $"Administrator reset password for user '{user.Email}'.",
            null,
            cancellationToken);

        return true;
    }

    public async Task<bool> SetUserStatusAsync(
        int targetUserId,
        bool isActive,
        int adminUserId,
        CancellationToken cancellationToken = default)
    {
        if (targetUserId == adminUserId && !isActive)
        {
            throw new InvalidOperationException("Administrators cannot deactivate their own account.");
        }

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == targetUserId, cancellationToken);
        if (user == null)
            throw new KeyNotFoundException($"User with ID {targetUserId} not found.");

        if (user.Role == "ADMIN" && !isActive)
        {
            var adminCount = await _db.Users.CountAsync(u => u.Role == "ADMIN" && u.IsActive, cancellationToken);
            if (adminCount <= 1)
            {
                throw new InvalidOperationException("Cannot deactivate the last remaining active Administrator.");
            }
        }

        user.IsActive = isActive;
        await _db.SaveChangesAsync(cancellationToken);

        var action = isActive ? "USER_ACTIVATED" : "USER_DEACTIVATED";
        await _auditLog.LogAsync(
            adminUserId,
            action,
            "User",
            user.Id.ToString(),
            $"User '{user.Email}' was {(isActive ? "activated" : "deactivated")}.",
            null,
            cancellationToken);

        return true;
    }
}

