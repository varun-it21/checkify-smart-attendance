using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Checkify.API.Entities;

[Table("system_settings")]
public class SystemSetting
{
    [Key]
    [MaxLength(100)]
    [Column("setting_key")]
    public string Key { get; set; } = string.Empty;

    [Required]
    [MaxLength(1000)]
    [Column("setting_value")]
    public string Value { get; set; } = string.Empty;

    [Required]
    [MaxLength(50)]
    [Column("category")]
    public string Category { get; set; } = "GENERAL"; // GENERAL, ACADEMIC, ATTENDANCE, SECURITY

    [MaxLength(255)]
    [Column("description")]
    public string? Description { get; set; }

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_by_user_id")]
    public int? UpdatedByUserId { get; set; }

    // Navigation property
    public User? UpdatedByUser { get; set; }
}

