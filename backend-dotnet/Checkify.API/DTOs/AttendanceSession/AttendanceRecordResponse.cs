namespace Checkify.API.DTOs.AttendanceSession;

public class AttendanceRecordResponse
{
    public int Id { get; set; }

    public int AttendanceSessionId { get; set; }

    public int StudentId { get; set; }

    public string StudentName { get; set; } = string.Empty;

    public string Status { get; set; } = string.Empty;

    public string Method { get; set; } = string.Empty;

    public DateTime MarkedAt { get; set; }
}

