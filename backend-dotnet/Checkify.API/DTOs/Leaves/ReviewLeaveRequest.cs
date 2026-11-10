using System.ComponentModel.DataAnnotations;

namespace Checkify.API.DTOs.Leaves;

public class ReviewLeaveRequest
{
    [Required]
    [MaxLength(20)]
    public string Status { get; set; } = "APPROVED"; // APPROVED, REJECTED

    [MaxLength(500)]
    public string? ReviewerRemarks { get; set; }
}

