namespace Checkify.API.DTOs.AttendanceSession;

public class StudentAttendanceHistoryResponse
{
    public int Id { get; set; }

    public int AttendanceSessionId { get; set; }

    public string SubjectCode { get; set; } = string.Empty;

    public string SubjectName { get; set; } = string.Empty;

    public string StaffName { get; set; } = string.Empty;

    public DateOnly SessionDate { get; set; }

    public string Status { get; set; } = string.Empty;

    public string Method { get; set; } = string.Empty;

    public DateTime MarkedAt { get; set; }
}
