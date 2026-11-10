namespace Checkify.API.DTOs.ClassSession;

public class ClassSessionResponse
{
    public int Id { get; set; }

    public int DepartmentId { get; set; }

    public string DepartmentName { get; set; } = string.Empty;

    public string SubjectCode { get; set; } = string.Empty;

    public string SubjectName { get; set; } = string.Empty;

    public int Year { get; set; }

    public int Semester { get; set; }

    public string Section { get; set; } = string.Empty;

    public int StaffId { get; set; }

    public string StaffName { get; set; } = string.Empty;

    public DayOfWeek DayOfWeek { get; set; }

    public TimeOnly StartTime { get; set; }

    public TimeOnly EndTime { get; set; }

    public string? RoomLocation { get; set; }

    public int CreatedByUserId { get; set; }

    public DateTime CreatedAt { get; set; }
}

