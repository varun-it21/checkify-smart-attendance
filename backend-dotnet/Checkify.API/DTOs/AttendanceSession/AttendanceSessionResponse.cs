namespace Checkify.API.DTOs.AttendanceSession;

public class AttendanceSessionResponse
{
    public int Id { get; set; }

    public int ClassSessionId { get; set; }

    public string SubjectCode { get; set; } = string.Empty;

    public string SubjectName { get; set; } = string.Empty;

    public int StaffId { get; set; }

    public string StaffName { get; set; } = string.Empty;

    public int DepartmentId { get; set; }

    public string DepartmentName { get; set; } = string.Empty;

    public int Year { get; set; }

    public int Semester { get; set; }

    public string Section { get; set; } = string.Empty;

    public DateOnly SessionDate { get; set; }

    public string Status { get; set; } = string.Empty;

    public DateTime StartedAt { get; set; }

    public DateTime? ClosedAt { get; set; }

    public DateTime CreatedAt { get; set; }

    public bool OtpActive { get; set; }

    public DateTime? OtpExpiresAt { get; set; }

    public bool QrActive { get; set; }

    public DateTime? QrExpiresAt { get; set; }

    public int PresentCount { get; set; }

    public int TotalRecordCount { get; set; }
}

