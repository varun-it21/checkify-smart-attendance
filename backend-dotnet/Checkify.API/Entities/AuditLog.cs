using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Checkify.API.Entities;

[Table("audit_logs")]
public class AuditLog
{
    [Key]
    [Column("id")]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; set; }

    [Column("user_id")]
    public int? UserId { get; set; }

    [Required]
    [MaxLength(100)]
    [Column("action")]
    public string Action { get; set; } = string.Empty; // USER_LOGIN, ROLE_UPDATED, PASSWORD_RESET, SETTING_UPDATED, LEAVE_REVIEWED, etc.

    [Required]
    [MaxLength(100)]
    [Column("entity_name")]
    public string EntityName { get; set; } = string.Empty; // User, SystemSetting, LeaveRequest, AttendanceSession, etc.

    [MaxLength(100)]
    [Column("entity_id")]
    public string? EntityId { get; set; }

    [Required]
    [MaxLength(2000)]
    [Column("details")]
    public string Details { get; set; } = string.Empty;

    [MaxLength(50)]
    [Column("ip_address")]
    public string? IpAddress { get; set; }

    [Required]
    [Column("timestamp")]
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;

    // Navigation property
    public User? User { get; set; }
}

