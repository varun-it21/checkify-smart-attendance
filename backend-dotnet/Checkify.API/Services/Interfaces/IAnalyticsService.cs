using Checkify.API.DTOs.Analytics;

namespace Checkify.API.Services.Interfaces;

public interface IAnalyticsService
{
    Task<DashboardStatsResponse> GetDashboardStatsAsync(int currentUserId, string role, DateOnly? fromDate, DateOnly? toDate, int? departmentId, CancellationToken cancellationToken = default);
    Task<DepartmentAnalyticsResponse> GetDepartmentAnalyticsAsync(int currentUserId, string role, DateOnly? fromDate, DateOnly? toDate, int? departmentId, CancellationToken cancellationToken = default);
    Task<StudentAttendanceSummaryResponse> GetStudentSummaryAsync(int studentId, int currentUserId, string role, DateOnly? fromDate, DateOnly? toDate, decimal threshold, CancellationToken cancellationToken = default);
    Task<StudentAttendanceSummaryResponse> GetMyStudentSummaryAsync(int currentUserId, DateOnly? fromDate, DateOnly? toDate, decimal threshold, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<StudentAttendanceSummaryResponse>> GetDefaultersAsync(int currentUserId, string role, DateOnly? fromDate, DateOnly? toDate, int? departmentId, int? year, int? semester, string? section, decimal threshold, CancellationToken cancellationToken = default);
    Task<StaffTeachingInsightsResponse> GetStaffInsightsAsync(int currentUserId, string role, DateOnly? fromDate, DateOnly? toDate, int? departmentId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<AttendanceTrendPointResponse>> GetTrendsAsync(int currentUserId, string role, DateOnly? fromDate, DateOnly? toDate, int? departmentId, string groupBy, CancellationToken cancellationToken = default);
}
