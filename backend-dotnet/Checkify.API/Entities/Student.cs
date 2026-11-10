using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Checkify.API.Entities;

[Table("students")]
public class Student
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
    [Column("name")]
    public string Name { get; set; } = string.Empty;

    [Required]
    [MaxLength(20)]
    [Column("gender")]
    public string Gender { get; set; } = string.Empty;

    [Column("dob", TypeName = "date")]
    public DateTime Dob { get; set; }

    [Required]
    [Column("year")]
    public int Year { get; set; }

    [Required]
    [Range(1, 8)]
    [Column("semester")]
    public int Semester { get; set; }

    [Required]
    [MaxLength(20)]
    [Column("section")]
    public string Section { get; set; } = string.Empty;

    [Required]
    [MaxLength(20)]
    [Column("mobile_no")]
    public string MobileNo { get; set; } = string.Empty;

    [MaxLength(50)]
    [Column("relation")]
    public string? Relation { get; set; }

    [MaxLength(150)]
    [Column("relation_name")]
    public string? RelationName { get; set; }

    [MaxLength(20)]
    [Column("relation_mobile_no")]
    public string? RelationMobileNo { get; set; }

    [MaxLength(500)]
    [Column("relation_address")]
    public string? RelationAddress { get; set; }

    [Required]
    [Column("department_id")]
    public int DepartmentId { get; set; }

    // Navigation properties
    public User User { get; set; } = null!;

    public Department Department { get; set; } = null!;
}

