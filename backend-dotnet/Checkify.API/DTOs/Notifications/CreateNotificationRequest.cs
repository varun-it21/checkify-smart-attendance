using System.ComponentModel.DataAnnotations;

namespace Checkify.API.DTOs.Notifications;

public class CreateNotificationRequest
{
    [Required]
    public int UserId { get; set; }

    [Required]
    [MaxLength(150)]
    public string Title { get; set; } = string.Empty;

    [Required]
    [MaxLength(500)]
    public string Message { get; set; } = string.Empty;

    [MaxLength(50)]
    public string Type { get; set; } = "SYSTEM";

    public int? ReferenceId { get; set; }
}

