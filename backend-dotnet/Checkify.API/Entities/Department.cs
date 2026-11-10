using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Checkify.API.Entities;

[Table("departments")]
public class Department
{
    [Key]
    [Column("department_id")]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; set; }

    [Required]
    [MaxLength(150)]
    [Column("name")]
    public string Name { get; set; } = string.Empty;

    // Navigation properties
    public ICollection<Student> Students { get; set; } = new List<Student>();

    public ICollection<Staff> StaffMembers { get; set; } = new List<Staff>();
}

