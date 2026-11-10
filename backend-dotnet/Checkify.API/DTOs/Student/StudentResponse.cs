namespace Checkify.API.DTOs.Student;

public class StudentResponse
{
    public int Id { get; set; }

    public int UserId { get; set; }

    public string Name { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    public string Gender { get; set; } = string.Empty;

    public DateTime Dob { get; set; }

    public int Year { get; set; }

    public int Semester { get; set; }

    public string Section { get; set; } = string.Empty;

    public string MobileNo { get; set; } = string.Empty;

    public string DepartmentName { get; set; } = string.Empty;

    public string? Relation { get; set; }

    public string? RelationName { get; set; }

    public string? RelationMobile { get; set; }

    public string? RelationAddress { get; set; }
}

