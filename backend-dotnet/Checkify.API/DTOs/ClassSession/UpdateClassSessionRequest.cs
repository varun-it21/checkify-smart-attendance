using System.ComponentModel.DataAnnotations;

namespace Checkify.API.DTOs.ClassSession;

public class UpdateClassSessionRequest
{
    [Required]
    [Range(1, int.MaxValue)]
    public int DepartmentId { get; set; }

    [Required]
    [MaxLength(50)]
    public string SubjectCode { get; set; } = string.Empty;

    [Required]
    [MaxLength(150)]
    public string SubjectName { get; set; } = string.Empty;

    [Range(1, 4)]
    public int Year { get; set; }

    [Range(1, 8)]
    public int Semester { get; set; }

    [Required]
    [MaxLength(20)]
    public string Section { get; set; } = string.Empty;

    [Range(1, 6)]
    public DayOfWeek DayOfWeek { get; set; }

    [Required]
    [Range(1, int.MaxValue)]
    public int StaffId { get; set; }

    public TimeOnly StartTime { get; set; }

    public TimeOnly EndTime { get; set; }

    [MaxLength(100)]
    public string? RoomLocation { get; set; }
}

