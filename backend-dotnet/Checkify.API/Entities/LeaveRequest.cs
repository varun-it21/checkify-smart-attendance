using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Checkify.API.Entities;

[Table("leave_requests")]
public class LeaveRequest
{
    [Key]
    [Column("id")]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; set; }

    [Required]
    [Column("user_id")]
    public int UserId { get; set; }

    [Required]
    [Column("department_id")]
    public int DepartmentId { get; set; }

    [Required]
    [MaxLength(20)]
    [Column("applicant_role")]
    public string ApplicantRole { get; set; } = "STUDENT"; // STUDENT, STAFF, HOD

    // Role that must review this request, decided server-side when it is created:
    // STUDENT/STAFF -> HOD (MANAGER if the department has no HOD), HOD -> MANAGER, MANAGER -> ADMIN.
    // ADMIN can always review any request as an override.
    [Required]
    [MaxLength(20)]
    [Column("approver_role")]
    public string ApproverRole { get; set; } = "HOD";

    [Required]
    [MaxLength(20)]
    [Column("leave_type")]
    public string LeaveType { get; set; } = "CASUAL"; // CASUAL, MEDICAL, ON_DUTY, OTHER

    [Required]
    [Column("start_date", TypeName = "date")]
    public DateOnly StartDate { get; set; }

    [Required]
    [Column("end_date", TypeName = "date")]
    public DateOnly EndDate { get; set; }

    [Required]
    [MaxLength(500)]
    [Column("reason")]
    public string Reason { get; set; } = string.Empty;

    [MaxLength(255)]
    [Column("supporting_document_path")]
    public string? SupportingDocumentPath { get; set; }

    [Required]
    [MaxLength(20)]
    [Column("status")]
    public string Status { get; set; } = "PENDING"; // PENDING, APPROVED, REJECTED, CANCELLED

    [Column("reviewer_user_id")]
    public int? ReviewerUserId { get; set; }

    [MaxLength(500)]
    [Column("reviewer_remarks")]
    public string? ReviewerRemarks { get; set; }

    [Column("reviewed_at")]
    public DateTime? ReviewedAt { get; set; }

    [Required]
    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime? UpdatedAt { get; set; }

    // Navigation properties
    public User User { get; set; } = null!;
    public Department Department { get; set; } = null!;
    public User? ReviewerUser { get; set; }
}

