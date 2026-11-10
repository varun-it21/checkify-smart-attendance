using Checkify.API.DTOs.Student;

namespace Checkify.API.Services.Interfaces;

public interface IStudentService
{
    Task<StudentResponse> CreateAsync(
        AddStudentRequest request,
        CancellationToken cancellationToken = default);

    Task<List<StudentResponse>> GetAllAsync(
        CancellationToken cancellationToken = default);

    Task<StudentResponse?> GetByIdAsync(
        int id,
        CancellationToken cancellationToken = default);

    Task<StudentResponse> UpdateAsync(
        int id,
        UpdateStudentRequest request,
        CancellationToken cancellationToken = default);

    Task DeleteAsync(
        int id,
        CancellationToken cancellationToken = default);
}
