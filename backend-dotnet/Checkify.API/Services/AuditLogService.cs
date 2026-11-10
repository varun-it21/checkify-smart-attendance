using Checkify.API.Data;
using Checkify.API.DTOs.Admin;
using Checkify.API.Entities;
using Checkify.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Checkify.API.Services;

public class AuditLogService : IAuditLogService
{
    private readonly CheckifyDbContext _db;
    private readonly ILogger<AuditLogService> _logger;

    public AuditLogService(CheckifyDbContext db, ILogger<AuditLogService> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task LogAsync(
        int? userId,
        string action,
        string entityName,
        string? entityId,
        string details,
        string? ipAddress = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var log = new AuditLog
            {
                UserId = userId,
                Action = action.Trim().ToUpperInvariant(),
                EntityName = entityName.Trim(),
                EntityId = entityId?.Trim(),
                Details = details.Trim(),
                IpAddress = ipAddress?.Trim(),
                Timestamp = DateTime.UtcNow
            };

            _db.AuditLogs.Add(log);
            await _db.SaveChangesAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to persist audit log for Action: {Action}, Entity: {EntityName}", action, entityName);
        }
    }

    public async Task<AuditLogListResponse> GetLogsAsync(
        int limit = 50,
        int offset = 0,
        string? action = null,
        string? entityName = null,
        CancellationToken cancellationToken = default)
    {
        var clampedLimit = Math.Clamp(limit <= 0 ? 50 : limit, 1, 100);
        var clampedOffset = Math.Max(0, offset);

        var query = _db.AuditLogs.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(action))
        {
            var act = action.Trim().ToUpperInvariant();
            query = query.Where(l => l.Action == act);
        }

        if (!string.IsNullOrWhiteSpace(entityName))
        {
            var ent = entityName.Trim();
            query = query.Where(l => l.EntityName == ent);
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var items = await query
            .Include(l => l.User)
            .OrderByDescending(l => l.Timestamp)
            .Skip(clampedOffset)
            .Take(clampedLimit)
            .Select(l => new AuditLogResponse
            {
                Id = l.Id,
                UserId = l.UserId,
                UserName = l.User != null ? l.User.Name : null,
                UserEmail = l.User != null ? l.User.Email : null,
                Action = l.Action,
                EntityName = l.EntityName,
                EntityId = l.EntityId,
                Details = l.Details,
                IpAddress = l.IpAddress,
                Timestamp = l.Timestamp
            })
            .ToListAsync(cancellationToken);

        return new AuditLogListResponse
        {
            Logs = items,
            TotalCount = totalCount,
            Limit = clampedLimit,
            Offset = clampedOffset
        };
    }
}

