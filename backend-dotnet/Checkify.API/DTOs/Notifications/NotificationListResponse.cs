namespace Checkify.API.DTOs.Notifications;

public class NotificationListResponse
{
    public IReadOnlyList<NotificationResponse> Notifications { get; set; } = Array.Empty<NotificationResponse>();
    public int TotalCount { get; set; }
    public int UnreadCount { get; set; }
    public int Limit { get; set; }
    public int Offset { get; set; }
}

