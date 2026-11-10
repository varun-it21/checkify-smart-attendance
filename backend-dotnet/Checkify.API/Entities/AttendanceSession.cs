using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Checkify.API.Entities;

[Table("attendance_sessions")]
public class AttendanceSession
{
    [Key]
    [Column("id")]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; set; }

    [Required]
    [Column("class_session_id")]
    public int ClassSessionId { get; set; }

    [Required]
    [Column("staff_id")]
    public int StaffId { get; set; }

    // Historical cohort snapshot
    [Required]
    [Column("department_id")]
    public int DepartmentId { get; set; }

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
    [Column("session_date", TypeName = "date")]
    public DateOnly SessionDate { get; set; }

    [Required]
    [MaxLength(20)]
    [Column("status")]
    public string Status { get; set; } = "OPEN"; // OPEN, CLOSED, EXPIRED, CANCELLED

    [Required]
    [Column("started_at")]
    public DateTime StartedAt { get; set; } = DateTime.UtcNow;

    [Column("closed_at")]
    public DateTime? ClosedAt { get; set; }

    // OTP Security (HMAC / salted hash, attempt limits, lock)
    [MaxLength(255)]
    [Column("otp_hash")]
    public string? OtpHash { get; set; }

    [Column("otp_expires_at")]
    public DateTime? OtpExpiresAt { get; set; }

    [Column("otp_attempt_count")]
    public int OtpAttemptCount { get; set; } = 0;

    [Column("otp_locked_until")]
    public DateTime? OtpLockedUntil { get; set; }

    // QR Token Security (SHA-256 hash of high-entropy rotating token)
    [MaxLength(255)]
    [Column("qr_token_hash")]
    public string? QrTokenHash { get; set; }

    [Column("qr_expires_at")]
    public DateTime? QrExpiresAt { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public ClassSession ClassSession { get; set; } = null!;
    public Staff Staff { get; set; } = null!;
    public Department Department { get; set; } = null!;
    public ICollection<AttendanceRecord> Records { get; set; } = new List<AttendanceRecord>();
}

