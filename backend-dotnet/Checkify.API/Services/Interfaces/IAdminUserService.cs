using Checkify.API.DTOs.Admin;

namespace Checkify.API.Services.Interfaces;

public interface IAdminUserService
{
    Task<AdminUserListResponse> GetUsersAsync(
        int limit = 20,
        int offset = 0,
        string? role = null,
        string? search = null,
        CancellationToken cancellationToken = default);

    Task<AdminUserResponse> UpdateUserRoleAsync(
        int targetUserId,
        string newRole,
        int adminUserId,
        CancellationToken cancellationToken = default);

    Task<bool> ResetPasswordAsync(
        int targetUserId,
        string newPassword,
        int adminUserId,
        CancellationToken cancellationToken = default);

    Task<bool> SetUserStatusAsync(
        int targetUserId,
        bool isActive,
        int adminUserId,
        CancellationToken cancellationToken = default);
}

