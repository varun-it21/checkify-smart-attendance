namespace Checkify.API.DTOs.AttendanceSession;

public class QrResponse
{
    public int AttendanceSessionId { get; set; }

    public string QrToken { get; set; } = string.Empty;

    public DateTime ExpiresAt { get; set; }

    public int RemainingSeconds { get; set; }
}

