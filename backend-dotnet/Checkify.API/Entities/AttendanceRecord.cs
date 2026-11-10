using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Checkify.API.Entities;

[Table("attendance_records")]
public class AttendanceRecord
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

    [Column("marked_by_user_id")]
    public int? MarkedByUserId { get; set; }

    [Required]
    [Column("marked_at")]
    public DateTime MarkedAt { get; set; } = DateTime.UtcNow;

    [Required]
    [MaxLength(30)]
    [Column("method")]
    public string Method { get; set; } = string.Empty; // "OTP", "QR", "STAFF_MANUAL", "SYSTEM"

    [Required]
    [MaxLength(30)]
    [Column("status")]
    public string Status { get; set; } = string.Empty; // "PRESENT", "ABSENT", "LATE", "EXCUSED"

    [MaxLength(255)]
    [Column("remarks")]
    public string? Remarks { get; set; }

    // Navigation properties
    public AttendanceSession AttendanceSession { get; set; } = null!;
    public Student Student { get; set; } = null!;
    public User? MarkedByUser { get; set; }
}

