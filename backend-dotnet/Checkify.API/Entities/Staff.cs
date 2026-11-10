using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Checkify.API.Entities;

[Table("staff")]
public class Staff
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
    [Column("staff_name")]
    public string StaffName { get; set; } = string.Empty;

    [Required]
    [MaxLength(20)]
    [Column("mobile_number")]
    public string MobileNumber { get; set; } = string.Empty;

    [Column("experience", TypeName = "decimal(4,1)")]
    public decimal Experience { get; set; }

    [MaxLength(150)]
    [Column("specialization")]
    public string? Specialization { get; set; }

    [Required]
    [MaxLength(20)]
    [Column("gender")]
    public string Gender { get; set; } = string.Empty;

    [MaxLength(500)]
    [Column("address")]
    public string? Address { get; set; }

    [Required]
    [Column("department_id")]
    public int DepartmentId { get; set; }

    [Required]
    [MaxLength(20)]
    [Column("position")]
    public string Position { get; set; } = string.Empty;

    // Navigation properties
    public User User { get; set; } = null!;

    public Department Department { get; set; } = null!;
}

