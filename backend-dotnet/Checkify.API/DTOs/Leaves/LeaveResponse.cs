namespace Checkify.API.DTOs.Leaves;

public class LeaveResponse
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public string ApplicantName { get; set; } = string.Empty;
    public string ApplicantEmail { get; set; } = string.Empty;
    public string ApplicantRole { get; set; } = string.Empty;
    public string ApproverRole { get; set; } = string.Empty;
    public int DepartmentId { get; set; }
    public string DepartmentName { get; set; } = string.Empty;
    public string LeaveType { get; set; } = string.Empty;
    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }
    public int DaysCount { get; set; }
    public string Reason { get; set; } = string.Empty;
    public string? SupportingDocumentPath { get; set; }
    public string Status { get; set; } = string.Empty;
    public int? ReviewerUserId { get; set; }
    public string? ReviewerName { get; set; }
    public string? ReviewerRemarks { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

