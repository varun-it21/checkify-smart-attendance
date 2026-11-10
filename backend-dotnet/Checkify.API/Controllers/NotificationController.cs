using System.Security.Claims;
using Checkify.API.DTOs.Notifications;
using Checkify.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Checkify.API.Controllers;

[ApiController]
[Route("api/notifications")]
[Authorize]
public class NotificationController : ControllerBase
{
    private readonly INotificationService _notificationService;

    public NotificationController(INotificationService notificationService)
    {
        _notificationService = notificationService;
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

    [HttpGet]
    public async Task<ActionResult<NotificationListResponse>> GetNotifications(
        [FromQuery] bool unreadOnly = false,
        [FromQuery] int limit = 20,
        [FromQuery] int offset = 0,
        CancellationToken cancellationToken = default)
    {
        var result = await _notificationService.GetNotificationsAsync(
            CurrentUserId, unreadOnly, limit, offset, cancellationToken);
        return Ok(result);
    }

    [HttpGet("unread-count")]
    public async Task<ActionResult<object>> GetUnreadCount(CancellationToken cancellationToken = default)
    {
        var count = await _notificationService.GetUnreadCountAsync(CurrentUserId, cancellationToken);
        return Ok(new { unreadCount = count });
    }

    [HttpPut("{id:int}/read")]
    public async Task<ActionResult<NotificationResponse>> MarkAsRead(
        int id, CancellationToken cancellationToken = default)
    {
        var result = await _notificationService.MarkAsReadAsync(id, CurrentUserId, cancellationToken);
        return Ok(result);
    }

    [HttpPut("mark-all-read")]
    public async Task<ActionResult<object>> MarkAllAsRead(CancellationToken cancellationToken = default)
    {
        var updated = await _notificationService.MarkAllAsReadAsync(CurrentUserId, cancellationToken);
        return Ok(new { markedCount = updated });
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteNotification(
        int id, CancellationToken cancellationToken = default)
    {
        await _notificationService.DeleteNotificationAsync(id, CurrentUserId, cancellationToken);
        return NoContent();
    }
}

