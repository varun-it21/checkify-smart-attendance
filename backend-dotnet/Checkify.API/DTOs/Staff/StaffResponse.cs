namespace Checkify.API.DTOs.Staff;

public class StaffResponse
{
    public int Id { get; set; }

    public int UserId { get; set; }

    public string StaffName { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    public string MobileNumber { get; set; } = string.Empty;

    public decimal Experience { get; set; }

    public string? Specialization { get; set; }

    public string Gender { get; set; } = string.Empty;

    public string? Address { get; set; }

    public string DepartmentName { get; set; } = string.Empty;

    public string Position { get; set; } = string.Empty;
}

