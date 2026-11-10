using Checkify.API.DTOs.Admin;

namespace Checkify.API.Services.Interfaces;

public interface IAuditLogService
{
    Task LogAsync(
        int? userId,
        string action,
        string entityName,
        string? entityId,
        string details,
        string? ipAddress = null,
        CancellationToken cancellationToken = default);

    Task<AuditLogListResponse> GetLogsAsync(
        int limit = 50,
        int offset = 0,
        string? action = null,
        string? entityName = null,
        CancellationToken cancellationToken = default);
}

