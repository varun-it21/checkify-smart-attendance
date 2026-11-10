using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Checkify.API.Entities;

[Table("class_sessions")]
public class ClassSession
{
    [Key]
    [Column("id")]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; set; }

    [Required]
    [Column("department_id")]
    public int DepartmentId { get; set; }

    [Required]
    [MaxLength(50)]
    [Column("subject_code")]
    public string SubjectCode { get; set; } = string.Empty;

    [Required]
    [MaxLength(150)]
    [Column("subject_name")]
    public string SubjectName { get; set; } = string.Empty;

    [Required]
    [Column("year")]
    public int Year { get; set; }

    [Required]
    [Column("semester")]
    public int Semester { get; set; }

    [Required]
    [MaxLength(20)]
    [Column("section")]
    public string Section { get; set; } = string.Empty;

    [Required]
    [Column("staff_id")]
    public int StaffId { get; set; }

    [Required]
    [Column("day_of_week")]
    public DayOfWeek DayOfWeek { get; set; }

    [Required]
    [Column("start_time", TypeName = "time")]
    public TimeOnly StartTime { get; set; }

    [Required]
    [Column("end_time", TypeName = "time")]
    public TimeOnly EndTime { get; set; }

    [MaxLength(100)]
    [Column("room_location")]
    public string? RoomLocation { get; set; }

    [Required]
    [Column("created_by_user_id")]
    public int CreatedByUserId { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public Department Department { get; set; } = null!;

    public Staff Staff { get; set; } = null!;

    public User CreatedByUser { get; set; } = null!;
}

