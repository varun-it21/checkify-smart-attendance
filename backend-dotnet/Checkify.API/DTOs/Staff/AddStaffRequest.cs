using System.ComponentModel.DataAnnotations;

namespace Checkify.API.DTOs.Staff;

public class AddStaffRequest
{
    [Required]
    [StringLength(150, MinimumLength = 2)]
    public string StaffName { get; set; } = string.Empty;

    [Required]
    [EmailAddress]
    [MaxLength(255)]
    public string Email { get; set; } = string.Empty;

    [Required]
    [RegularExpression(@"^\+?[0-9]{7,15}$",
        ErrorMessage = "Enter a valid mobile number.")]
    public string MobileNumber { get; set; } = string.Empty;

    [Range(typeof(decimal), "0", "999.9")]
    public decimal Experience { get; set; }

    [MaxLength(150)]
    public string? Specialization { get; set; }

    [Required]
    [MaxLength(20)]
    public string Gender { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? Address { get; set; }

    [Required]
    [MaxLength(150)]
    public string Department { get; set; } = string.Empty;

    [Required]
    [MinLength(12)]
    [MaxLength(128)]
    public string InitialPassword { get; set; } = string.Empty;

    [Required]
    [RegularExpression("^(STAFF|HOD)$",
        ErrorMessage = "Position must be STAFF or HOD.")]
    public string Position { get; set; } = string.Empty;
}

