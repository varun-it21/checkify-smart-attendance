using System.Security.Claims;
using Checkify.API.DTOs.Admin;
using Checkify.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Checkify.API.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize(Roles = "ADMIN,MANAGER")]
public class AdminController : ControllerBase
{
    private readonly ISystemSettingService _settingService;
    private readonly IAuditLogService _auditLogService;
    private readonly IAdminUserService _userService;

    public AdminController(
        ISystemSettingService settingService,
        IAuditLogService auditLogService,
        IAdminUserService userService)
    {
        _settingService = settingService;
        _auditLogService = auditLogService;
        _userService = userService;
    }

    private int CurrentUserId
    {
        get
        {
            var value = User.FindFirstValue("sub") ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(value, out var id))
                throw new UnauthorizedAccessException("Invalid authenticated user.");
            return id;
        }
    }

    // =========================================================
    // SYSTEM SETTINGS
    // =========================================================

    [HttpGet("settings")]
    [Authorize(Roles = "ADMIN,MANAGER")]
    public async Task<ActionResult<IReadOnlyList<SystemSettingResponse>>> GetSettings(
        CancellationToken cancellationToken = default)
    {
        var settings = await _settingService.GetAllSettingsAsync(cancellationToken);
        return Ok(settings);
    }

    [HttpPut("settings")]
    [Authorize(Roles = "ADMIN")]
    public async Task<ActionResult<SystemSettingResponse>> UpdateSetting(
        [FromBody] UpdateSystemSettingRequest request,
        CancellationToken cancellationToken = default)
    {
        if (request == null || string.IsNullOrWhiteSpace(request.Key))
            return BadRequest(new { message = "Key cannot be empty." });

        var updated = await _settingService.UpdateSettingAsync(
            request.Key,
            request.Value ?? string.Empty,
            CurrentUserId,
            cancellationToken);

        var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
        await _auditLogService.LogAsync(
            CurrentUserId,
            "SETTING_UPDATED",
            "SystemSetting",
            updated.Key,
            $"Setting '{updated.Key}' changed to '{updated.Value}'",
            ip,
            cancellationToken);

        return Ok(updated);
    }

    // =========================================================
    // AUDIT LOGS
    // =========================================================

    [HttpGet("audit-logs")]
    [Authorize(Roles = "ADMIN")]
    public async Task<ActionResult<AuditLogListResponse>> GetAuditLogs(
        [FromQuery] int limit = 50,
        [FromQuery] int offset = 0,
        [FromQuery] string? action = null,
        [FromQuery] string? entityName = null,
        CancellationToken cancellationToken = default)
    {
        var logs = await _auditLogService.GetLogsAsync(
            limit,
            offset,
            action,
            entityName,
            cancellationToken);

        return Ok(logs);
    }

    // =========================================================
    // USER MANAGEMENT
    // =========================================================

    [HttpGet("users")]
    [Authorize(Roles = "ADMIN")]
    public async Task<ActionResult<AdminUserListResponse>> GetUsers(
        [FromQuery] int limit = 20,
        [FromQuery] int offset = 0,
        [FromQuery] string? role = null,
        [FromQuery] string? search = null,
        CancellationToken cancellationToken = default)
    {
        var users = await _userService.GetUsersAsync(
            limit,
            offset,
            role,
            search,
            cancellationToken);

        return Ok(users);
    }

    [HttpPut("users/{id:int}/role")]
    [Authorize(Roles = "ADMIN")]
    public async Task<ActionResult<AdminUserResponse>> UpdateUserRole(
        int id,
        [FromBody] UpdateUserRoleRequest request,
        CancellationToken cancellationToken = default)
    {
        if (request == null || string.IsNullOrWhiteSpace(request.Role))
            return BadRequest(new { message = "Role cannot be empty." });

        var result = await _userService.UpdateUserRoleAsync(
            id,
            request.Role,
            CurrentUserId,
            cancellationToken);

        return Ok(result);
    }

    [HttpPut("users/{id:int}/reset-password")]
    [Authorize(Roles = "ADMIN")]
    public async Task<IActionResult> ResetUserPassword(
        int id,
        [FromBody] AdminResetPasswordRequest request,
        CancellationToken cancellationToken = default)
    {
        if (request == null || string.IsNullOrWhiteSpace(request.NewPassword))
            return BadRequest(new { message = "New password cannot be empty." });

        await _userService.ResetPasswordAsync(
            id,
            request.NewPassword,
            CurrentUserId,
            cancellationToken);

        return Ok(new { message = "User password successfully reset." });
    }

    [HttpPut("users/{id:int}/status")]
    [Authorize(Roles = "ADMIN")]
    public async Task<IActionResult> UpdateUserStatus(
        int id,
        [FromBody] UpdateUserStatusRequest request,
        CancellationToken cancellationToken = default)
    {
        if (request == null)
            return BadRequest(new { message = "Status payload cannot be null." });

        await _userService.SetUserStatusAsync(
            id,
            request.IsActive,
            CurrentUserId,
            cancellationToken);

        return Ok(new
        {
            message = request.IsActive ? "User account activated successfully." : "User account deactivated successfully.",
            isActive = request.IsActive
        });
    }
}
