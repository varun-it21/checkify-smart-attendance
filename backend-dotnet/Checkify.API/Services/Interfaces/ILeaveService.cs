using Checkify.API.DTOs.Leaves;

namespace Checkify.API.Services.Interfaces;

public interface ILeaveService
{
    Task<LeaveResponse> ApplyLeaveAsync(
        int currentUserId,
        CreateLeaveRequest request,
        CancellationToken cancellationToken = default);

    Task<LeaveListResponse> GetMyLeavesAsync(
        int currentUserId,
        int limit = 20,
        int offset = 0,
        CancellationToken cancellationToken = default);

    Task<LeaveResponse> GetLeaveByIdAsync(
        int leaveId,
        int currentUserId,
        string role,
        CancellationToken cancellationToken = default);

    Task<bool> CancelLeaveAsync(
        int leaveId,
        int currentUserId,
        CancellationToken cancellationToken = default);

    Task<LeaveListResponse> GetPendingLeavesAsync(
        int reviewerUserId,
        string reviewerRole,
        int limit = 20,
        int offset = 0,
        CancellationToken cancellationToken = default);

    Task<LeaveResponse> ReviewLeaveAsync(
        int leaveId,
        int reviewerUserId,
        string reviewerRole,
        ReviewLeaveRequest request,
        CancellationToken cancellationToken = default);
}

