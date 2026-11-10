using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Checkify.API.Entities;

[Table("attendance_otp_attempts")]
public class AttendanceOtpAttempt
{
    [Key]
    [Column("id")]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; set; }

    [Required]
    [Column("attendance_session_id")]
    public int AttendanceSessionId { get; set; }

    [Required]
    [Column("student_id")]
    public int StudentId { get; set; }

    [Required]
    [Column("failed_attempt_count")]
    public int FailedAttemptCount { get; set; }

    [Column("locked_until")]
    public DateTime? LockedUntil { get; set; }

    [Required]
    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public AttendanceSession AttendanceSession { get; set; } = null!;

    public Student Student { get; set; } = null!;
}

