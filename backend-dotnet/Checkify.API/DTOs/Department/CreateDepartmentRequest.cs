using System.ComponentModel.DataAnnotations;

namespace Checkify.API.DTOs.Department;

public class CreateDepartmentRequest
{
    [Required(ErrorMessage = "Department name is required.")]
    [MaxLength(150, ErrorMessage = "Department name cannot exceed 150 characters.")]
    public string Name { get; set; } = string.Empty;
}

