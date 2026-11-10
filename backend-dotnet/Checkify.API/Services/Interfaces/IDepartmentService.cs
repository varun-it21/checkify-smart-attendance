using Checkify.API.DTOs.Department;

namespace Checkify.API.Services.Interfaces;

public interface IDepartmentService
{
    Task<List<DepartmentResponse>> GetAllAsync();

    Task<DepartmentResponse> CreateAsync(CreateDepartmentRequest request);
}

