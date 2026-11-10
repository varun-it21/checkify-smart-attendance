using System.ComponentModel.DataAnnotations;

namespace Checkify.API.DTOs.Student;

public class UpdateStudentRequest
{
    [Required]
    [StringLength(150, MinimumLength = 2)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [EmailAddress]
    [MaxLength(255)]
    public string Email { get; set; } = string.Empty;

    [Required]
    [MaxLength(20)]
    public string Gender { get; set; } = string.Empty;

    [Required]
    public DateTime Dob { get; set; }

    [Range(1, 4)]
    public int Year { get; set; }

    [Range(1, 8)]
    public int Semester { get; set; }

    [Required]
    [MaxLength(20)]
    public string Section { get; set; } = string.Empty;

    [Required]
    [RegularExpression(@"^\+?[0-9]{7,15}$",
        ErrorMessage = "Enter a valid mobile number.")]
    public string MobileNo { get; set; } = string.Empty;

    [Required]
    [MaxLength(150)]
    public string DepartmentName { get; set; } = string.Empty;

    [MaxLength(50)]
    public string? Relation { get; set; }

    [MaxLength(150)]
    public string? RelationName { get; set; }

    [RegularExpression(@"^\+?[0-9]{7,15}$",
        ErrorMessage = "Enter a valid relation mobile number.")]
    public string? RelationMobile { get; set; }

    [MaxLength(500)]
    public string? RelationAddress { get; set; }
}

