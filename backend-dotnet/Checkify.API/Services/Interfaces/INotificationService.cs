using Checkify.API.DTOs.Notifications;

namespace Checkify.API.Services.Interfaces;

public interface INotificationService
{
    Task<NotificationListResponse> GetNotificationsAsync(
        int userId, bool unreadOnly, int limit, int offset, CancellationToken cancellationToken = default);

    Task<int> GetUnreadCountAsync(
        int userId, CancellationToken cancellationToken = default);

    Task<NotificationResponse> MarkAsReadAsync(
        int notificationId, int userId, CancellationToken cancellationToken = default);

    Task<int> MarkAllAsReadAsync(
        int userId, CancellationToken cancellationToken = default);

    Task<bool> DeleteNotificationAsync(
        int notificationId, int userId, CancellationToken cancellationToken = default);

    Task<NotificationResponse> CreateNotificationAsync(
        int userId, string title, string message, string type = "SYSTEM", int? referenceId = null, CancellationToken cancellationToken = default);

    Task CreateNotificationsForUsersAsync(
        IEnumerable<int> userIds, string title, string message, string type = "SYSTEM", int? referenceId = null, CancellationToken cancellationToken = default);
}

