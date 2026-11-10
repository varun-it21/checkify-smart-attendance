using Checkify.API.Data;
using Checkify.API.DTOs.Notifications;
using Checkify.API.Entities;
using Checkify.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Checkify.API.Services;

public class NotificationService : INotificationService
{
    private readonly CheckifyDbContext _db;

    public NotificationService(CheckifyDbContext db)
    {
        _db = db;
    }

    public async Task<NotificationListResponse> GetNotificationsAsync(
        int userId, bool unreadOnly, int limit, int offset, CancellationToken cancellationToken = default)
    {
        var clampedLimit = Math.Clamp(limit <= 0 ? 20 : limit, 1, 100);
        var clampedOffset = Math.Max(0, offset);

        var query = _db.Notifications.AsNoTracking().Where(n => n.UserId == userId);

        var unreadCount = await _db.Notifications.AsNoTracking()
            .Where(n => n.UserId == userId && !n.IsRead)
            .CountAsync(cancellationToken);

        if (unreadOnly)
        {
            query = query.Where(n => !n.IsRead);
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var items = await query
            .OrderByDescending(n => n.CreatedAt)
            .Skip(clampedOffset)
            .Take(clampedLimit)
            .Select(n => new NotificationResponse
            {
                Id = n.Id,
                UserId = n.UserId,
                Title = n.Title,
                Message = n.Message,
                Type = n.Type,
                ReferenceId = n.ReferenceId,
                IsRead = n.IsRead,
                CreatedAt = n.CreatedAt,
                ReadAt = n.ReadAt
            })
            .ToListAsync(cancellationToken);

        return new NotificationListResponse
        {
            Notifications = items,
            TotalCount = totalCount,
            UnreadCount = unreadCount,
            Limit = clampedLimit,
            Offset = clampedOffset
        };
    }

    public async Task<int> GetUnreadCountAsync(int userId, CancellationToken cancellationToken = default)
    {
        return await _db.Notifications.AsNoTracking()
            .Where(n => n.UserId == userId && !n.IsRead)
            .CountAsync(cancellationToken);
    }

    public async Task<NotificationResponse> MarkAsReadAsync(
        int notificationId, int userId, CancellationToken cancellationToken = default)
    {
        var notification = await _db.Notifications
            .FirstOrDefaultAsync(n => n.Id == notificationId, cancellationToken);

        if (notification == null || notification.UserId != userId)
        {
            throw new KeyNotFoundException("Notification not found.");
        }

        if (!notification.IsRead)
        {
            notification.IsRead = true;
            notification.ReadAt = DateTime.UtcNow;
            await _db.SaveChangesAsync(cancellationToken);
        }

        return MapToResponse(notification);
    }

    public async Task<int> MarkAllAsReadAsync(int userId, CancellationToken cancellationToken = default)
    {
        var unread = await _db.Notifications
            .Where(n => n.UserId == userId && !n.IsRead)
            .ToListAsync(cancellationToken);

        if (unread.Count == 0) return 0;

        var now = DateTime.UtcNow;
        foreach (var n in unread)
        {
            n.IsRead = true;
            n.ReadAt = now;
        }

        await _db.SaveChangesAsync(cancellationToken);
        return unread.Count;
    }

    public async Task<bool> DeleteNotificationAsync(
        int notificationId, int userId, CancellationToken cancellationToken = default)
    {
        var notification = await _db.Notifications
            .FirstOrDefaultAsync(n => n.Id == notificationId, cancellationToken);

        if (notification == null || notification.UserId != userId)
        {
            throw new KeyNotFoundException("Notification not found.");
        }

        _db.Notifications.Remove(notification);
        await _db.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<NotificationResponse> CreateNotificationAsync(
        int userId, string title, string message, string type = "SYSTEM", int? referenceId = null, CancellationToken cancellationToken = default)
    {
        var notification = new Notification
        {
            UserId = userId,
            Title = title,
            Message = message,
            Type = string.IsNullOrWhiteSpace(type) ? "SYSTEM" : type,
            ReferenceId = referenceId,
            IsRead = false,
            CreatedAt = DateTime.UtcNow,
            ReadAt = null
        };

        _db.Notifications.Add(notification);
        await _db.SaveChangesAsync(cancellationToken);

        return MapToResponse(notification);
    }

    public async Task CreateNotificationsForUsersAsync(
        IEnumerable<int> userIds, string title, string message, string type = "SYSTEM", int? referenceId = null, CancellationToken cancellationToken = default)
    {
        var distinctUserIds = userIds.Distinct().ToList();
        if (distinctUserIds.Count == 0) return;

        var now = DateTime.UtcNow;
        var notifType = string.IsNullOrWhiteSpace(type) ? "SYSTEM" : type;

        var notifications = distinctUserIds.Select(uid => new Notification
        {
            UserId = uid,
            Title = title,
            Message = message,
            Type = notifType,
            ReferenceId = referenceId,
            IsRead = false,
            CreatedAt = now,
            ReadAt = null
        }).ToList();

        _db.Notifications.AddRange(notifications);
        await _db.SaveChangesAsync(cancellationToken);
    }

    private static NotificationResponse MapToResponse(Notification n)
    {
        return new NotificationResponse
        {
            Id = n.Id,
            UserId = n.UserId,
            Title = n.Title,
            Message = n.Message,
            Type = n.Type,
            ReferenceId = n.ReferenceId,
            IsRead = n.IsRead,
            CreatedAt = n.CreatedAt,
            ReadAt = n.ReadAt
        };
    }
}

