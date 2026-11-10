using System.ComponentModel.DataAnnotations;

namespace Checkify.API.DTOs.AttendanceSession;

public class OpenAttendanceSessionRequest
{
    [Required]
    [Range(1, int.MaxValue)]
    public int ClassSessionId { get; set; }

    // If omitted, service uses the current UTC date.
    public DateOnly? SessionDate { get; set; }
}

