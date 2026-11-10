namespace Checkify.API.DTOs.AttendanceSession;

public class OtpResponse
{
    public int AttendanceSessionId { get; set; }

    public string OtpCode { get; set; } = string.Empty;

    public DateTime ExpiresAt { get; set; }

    public int RemainingSeconds { get; set; }
}

