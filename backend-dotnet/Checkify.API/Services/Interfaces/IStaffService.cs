using Checkify.API.DTOs.Staff;

namespace Checkify.API.Services.Interfaces;

public interface IStaffService
{
    Task<StaffResponse> CreateAsync(
        AddStaffRequest request,
        CancellationToken cancellationToken = default);

    Task<List<StaffResponse>> GetAllAsync(
        CancellationToken cancellationToken = default);

    Task<StaffResponse?> GetByIdAsync(
        int id,
        CancellationToken cancellationToken = default);

    Task<StaffResponse> UpdateAsync(
        int id,
        UpdateStaffRequest request,
        CancellationToken cancellationToken = default);

    Task DeleteAsync(
        int id,
        CancellationToken cancellationToken = default);
}
