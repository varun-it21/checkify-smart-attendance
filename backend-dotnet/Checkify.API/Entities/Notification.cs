using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Checkify.API.Entities;

[Table("notifications")]
public class Notification
{
    [Key]
    [Column("id")]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; set; }

    [Required]
    [Column("user_id")]
    public int UserId { get; set; }

    [Required]
    [MaxLength(150)]
    [Column("title")]
    public string Title { get; set; } = string.Empty;

    [Required]
    [MaxLength(500)]
    [Column("message")]
    public string Message { get; set; } = string.Empty;

    [Required]
    [MaxLength(50)]
    [Column("type")] // "ATTENDANCE_MARKED", "DEFAULTER_ALERT", "SESSION_OPENED", "SYSTEM"
    public string Type { get; set; } = "SYSTEM";

    [Column("reference_id")]
    public int? ReferenceId { get; set; }

    [Column("is_read")]
    public bool IsRead { get; set; } = false;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("read_at")]
    public DateTime? ReadAt { get; set; }

    // Navigation property
    public User User { get; set; } = null!;
}

