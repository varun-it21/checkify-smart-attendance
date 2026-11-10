using System.Security.Claims;
using Checkify.API.DTOs.Analytics;
using Checkify.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Checkify.API.Controllers;

[ApiController]
[Route("api/analytics")]
[Authorize]
public class AnalyticsController : ControllerBase
{
    private readonly IAnalyticsService _analytics;

    public AnalyticsController(IAnalyticsService analytics) => _analytics = analytics;

    private int CurrentUserId
    {
        get
        {
            var value = User.FindFirstValue("sub") ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(value, out var id))
                throw new UnauthorizedAccessException("Invalid authenticated user.");
            return id;
        }
    }

    private string CurrentRole => User.FindFirstValue("role") ?? User.FindFirstValue(ClaimTypes.Role) ?? string.Empty;

    [HttpGet("dashboard")]
    [Authorize(Roles = "MANAGER,HOD,ADMIN")]
    public async Task<ActionResult<DashboardStatsResponse>> GetDashboard(
        [FromQuery] DateOnly? fromDate, [FromQuery] DateOnly? toDate,
        [FromQuery] int? departmentId, CancellationToken cancellationToken)
    {
        var result = await _analytics.GetDashboardStatsAsync(
            CurrentUserId, CurrentRole, fromDate, toDate, departmentId, cancellationToken);
        return Ok(result);
    }

    [HttpGet("department")]
    [Authorize(Roles = "MANAGER,HOD,ADMIN")]
    public async Task<ActionResult<DepartmentAnalyticsResponse>> GetDepartmentAnalytics(
        [FromQuery] DateOnly? fromDate, [FromQuery] DateOnly? toDate,
        [FromQuery] int? departmentId, CancellationToken cancellationToken)
    {
        var result = await _analytics.GetDepartmentAnalyticsAsync(
            CurrentUserId, CurrentRole, fromDate, toDate, departmentId, cancellationToken);
        return Ok(result);
    }

    [HttpGet("students/{studentId:int}/summary")]
    [Authorize(Roles = "MANAGER,HOD,ADMIN,STUDENT")]
    public async Task<ActionResult<StudentAttendanceSummaryResponse>> GetStudentSummary(
        int studentId, [FromQuery] DateOnly? fromDate, [FromQuery] DateOnly? toDate,
        [FromQuery] decimal threshold = 75m, CancellationToken cancellationToken = default)
    {
        var result = await _analytics.GetStudentSummaryAsync(
            studentId, CurrentUserId, CurrentRole, fromDate, toDate, threshold, cancellationToken);
        return Ok(result);
    }

    [HttpGet("student/summary")]
    [Authorize(Roles = "STUDENT")]
    public async Task<ActionResult<StudentAttendanceSummaryResponse>> GetMyStudentSummary(
        [FromQuery] DateOnly? fromDate, [FromQuery] DateOnly? toDate,
        [FromQuery] decimal threshold = 75m, CancellationToken cancellationToken = default)
    {
        var result = await _analytics.GetMyStudentSummaryAsync(
            CurrentUserId, fromDate, toDate, threshold, cancellationToken);
        return Ok(result);
    }

    [HttpGet("defaulters")]
    [Authorize(Roles = "MANAGER,HOD,ADMIN")]
    public async Task<ActionResult<IReadOnlyList<StudentAttendanceSummaryResponse>>> GetDefaulters(
        [FromQuery] DateOnly? fromDate, [FromQuery] DateOnly? toDate,
        [FromQuery] int? departmentId, [FromQuery] int? year,
        [FromQuery] int? semester, [FromQuery] string? section,
        [FromQuery] decimal threshold = 75m, CancellationToken cancellationToken = default)
    {
        var result = await _analytics.GetDefaultersAsync(
            CurrentUserId, CurrentRole, fromDate, toDate, departmentId,
            year, semester, section, threshold, cancellationToken);
        return Ok(result);
    }

    [HttpGet("staff/insights")]
    [Authorize(Roles = "STAFF,HOD,MANAGER,ADMIN")]
    public async Task<ActionResult<StaffTeachingInsightsResponse>> GetStaffInsights(
        [FromQuery] DateOnly? fromDate, [FromQuery] DateOnly? toDate,
        [FromQuery] int? departmentId, CancellationToken cancellationToken)
    {
        var result = await _analytics.GetStaffInsightsAsync(
            CurrentUserId, CurrentRole, fromDate, toDate, departmentId, cancellationToken);
        return Ok(result);
    }

    [HttpGet("trends")]
    [Authorize(Roles = "MANAGER,HOD,ADMIN")]
    public async Task<ActionResult<IReadOnlyList<AttendanceTrendPointResponse>>> GetTrends(
        [FromQuery] DateOnly? fromDate, [FromQuery] DateOnly? toDate,
        [FromQuery] int? departmentId, [FromQuery] string groupBy = "day",
        CancellationToken cancellationToken = default)
    {
        var result = await _analytics.GetTrendsAsync(
            CurrentUserId, CurrentRole, fromDate, toDate, departmentId, groupBy, cancellationToken);
        return Ok(result);
    }
}
