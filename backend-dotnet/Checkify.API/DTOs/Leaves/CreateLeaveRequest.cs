using System.ComponentModel.DataAnnotations;

namespace Checkify.API.DTOs.Leaves;

public class CreateLeaveRequest
{
    [Required]
    [MaxLength(20)]
    public string LeaveType { get; set; } = "CASUAL"; // CASUAL, MEDICAL, ON_DUTY, OTHER

    [Required]
    public DateOnly StartDate { get; set; }

    [Required]
    public DateOnly EndDate { get; set; }

    [Required]
    [MaxLength(500)]
    public string Reason { get; set; } = string.Empty;

    [MaxLength(255)]
    public string? SupportingDocumentPath { get; set; }
}

