using System.ComponentModel.DataAnnotations;

namespace Checkify.API.DTOs.AttendanceSession;

public class SubmitQrAttendanceRequest
{
    [Required]
    public int AttendanceSessionId { get; set; }

    [Required]
    [MaxLength(255)]
    public string QrToken { get; set; } = string.Empty;
}

