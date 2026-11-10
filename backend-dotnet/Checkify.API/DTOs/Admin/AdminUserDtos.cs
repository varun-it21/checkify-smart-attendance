using System.ComponentModel.DataAnnotations;

namespace Checkify.API.DTOs.Admin;

public class AdminUserResponse
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public int? DepartmentId { get; set; }
    public string? DepartmentName { get; set; }
    public string? Position { get; set; }
}

public class AdminUserListResponse
{
    public IReadOnlyList<AdminUserResponse> Users { get; set; } = Array.Empty<AdminUserResponse>();
    public int TotalCount { get; set; }
    public int Limit { get; set; }
    public int Offset { get; set; }
}

public class UpdateUserRoleRequest
{
    [Required]
    [MaxLength(50)]
    public string Role { get; set; } = string.Empty;
}

public class AdminResetPasswordRequest
{
    [Required]
    [MinLength(8, ErrorMessage = "Password must be at least 8 characters long.")]
    public string NewPassword { get; set; } = string.Empty;
}

public class UpdateUserStatusRequest
{
    public bool IsActive { get; set; }
}

