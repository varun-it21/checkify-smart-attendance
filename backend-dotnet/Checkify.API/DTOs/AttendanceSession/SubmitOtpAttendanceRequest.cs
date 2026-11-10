using System.ComponentModel.DataAnnotations;

namespace Checkify.API.DTOs.AttendanceSession;

public class SubmitOtpAttendanceRequest
{
    [Required]
    [Range(1, int.MaxValue)]
    public int AttendanceSessionId { get; set; }

    [Required]
    [RegularExpression(
        @"^\d{6}$",
        ErrorMessage = "OTP must be a 6-digit numeric code.")]
    public string OtpCode { get; set; } = string.Empty;
}

