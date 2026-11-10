using System.Security.Claims;
using Checkify.API.DTOs.AttendanceSession;
using Checkify.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Checkify.API.Controllers;

[ApiController]
[Route("api")]
[Route("")]
public class AttendanceSessionController : ControllerBase
{
    private readonly IAttendanceSessionService _attendanceService;

    public AttendanceSessionController(
        IAttendanceSessionService attendanceService)
    {
        _attendanceService = attendanceService;
    }

    private int CurrentUserId
    {
        get
        {
            var userId = User.FindFirstValue("sub")
                         ?? User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (!int.TryParse(userId, out var id))
                throw new UnauthorizedAccessException(
                    "Invalid authenticated user.");

            return id;
        }
    }

    private string CurrentUserRole =>
        User.FindFirstValue("role")
        ?? User.FindFirstValue(ClaimTypes.Role)
        ?? string.Empty;

    // ---------------------------------------------------------
    // STAFF: OPEN ATTENDANCE
    // POST /api/staff/attendance/open
    // ---------------------------------------------------------

    [HttpPost("staff/attendance/open")]
    [Authorize(Roles = "STAFF,HOD")]
    public async Task<IActionResult> OpenSession(
        [FromBody] OpenAttendanceSessionRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _attendanceService.OpenSessionAsync(
            request,
            CurrentUserId,
            CurrentUserRole,
            cancellationToken);

        return StatusCode(StatusCodes.Status201Created, result);
    }

    // ---------------------------------------------------------
    // STAFF: CLOSE ATTENDANCE
    // POST /api/staff/attendance/{id}/close
    // ---------------------------------------------------------

    [HttpPost("staff/attendance/{id:int}/close")]
    [Authorize(Roles = "STAFF,HOD")]
    public async Task<IActionResult> CloseSession(
        int id,
        CancellationToken cancellationToken)
    {
        var result = await _attendanceService.CloseSessionAsync(
            id,
            CurrentUserId,
            CurrentUserRole,
            cancellationToken);

        return Ok(result);
    }

    // ---------------------------------------------------------
    // STAFF: GENERATE OTP
    // POST /api/staff/attendance/{id}/otp
    // ---------------------------------------------------------

    [HttpPost("staff/attendance/{id:int}/otp")]
    [Authorize(Roles = "STAFF,HOD")]
    public async Task<IActionResult> GenerateOtp(
        int id,
        CancellationToken cancellationToken)
    {
        var result = await _attendanceService.GenerateOtpAsync(
            id,
            CurrentUserId,
            cancellationToken);

        return Ok(result);
    }

    // ---------------------------------------------------------
    // STAFF: GENERATE QR
    // POST /api/staff/attendance/{id}/qr
    // ---------------------------------------------------------

    [HttpPost("staff/attendance/{id:int}/qr")]
    [Authorize(Roles = "STAFF,HOD")]
    public async Task<IActionResult> GenerateQr(
        int id,
        CancellationToken cancellationToken)
    {
        var result = await _attendanceService.GenerateQrAsync(
            id,
            CurrentUserId,
            cancellationToken);

        return Ok(result);
    }

    // ---------------------------------------------------------
    // STAFF: GET ACTIVE SESSIONS
    // GET /api/staff/attendance/active
    // ---------------------------------------------------------

    [HttpGet("staff/attendance/active")]
    [Authorize(Roles = "STAFF,HOD")]
    public async Task<IActionResult> GetActiveSessionsForStaff(
        CancellationToken cancellationToken)
    {
        var result =
            await _attendanceService.GetActiveSessionsForStaffAsync(
                CurrentUserId,
                cancellationToken);

        return Ok(result);
    }

    // ---------------------------------------------------------
    // STAFF: GET ALL SESSION HISTORY
    // GET /api/staff/attendance/history
    // ---------------------------------------------------------

    [HttpGet("staff/attendance/history")]
    [Authorize(Roles = "STAFF,HOD")]
    public async Task<IActionResult> GetStaffSessionHistory(
        CancellationToken cancellationToken)
    {
        var result =
            await _attendanceService.GetStaffSessionHistoryAsync(
                CurrentUserId,
                cancellationToken);

        return Ok(result);
    }

    // ---------------------------------------------------------
    // COMMON: GET SESSION BY ID
    // GET /api/staff/attendance/{id}
    // ---------------------------------------------------------

    [HttpGet("staff/attendance/{id:int}")]
    [Authorize(Roles = "STAFF,HOD,MANAGER,ADMIN,STUDENT")]
    public async Task<IActionResult> GetSession(
        int id,
        CancellationToken cancellationToken)
    {
        var result = await _attendanceService.GetByIdAsync(
            id,
            CurrentUserId,
            CurrentUserRole,
            cancellationToken);

        if (result == null)
            return NotFound(new
            {
                message = "Attendance session not found."
            });

        return Ok(result);
    }

    // ---------------------------------------------------------
    // STAFF: GET SESSION RECORDS
    // GET /api/staff/attendance/{id}/records
    // ---------------------------------------------------------

    [HttpGet("staff/attendance/{id:int}/records")]
    [Authorize(Roles = "STAFF,HOD,MANAGER,ADMIN")]
    public async Task<IActionResult> GetSessionRecords(
        int id,
        CancellationToken cancellationToken)
    {
        var result = await _attendanceService.GetSessionRecordsAsync(
            id,
            CurrentUserId,
            CurrentUserRole,
            cancellationToken);

        return Ok(result);
    }

    // ---------------------------------------------------------
    // STUDENT: GET ACTIVE SESSIONS
    // GET /api/student/attendance/active
    // ---------------------------------------------------------

    [HttpGet("student/attendance/active")]
    [Authorize(Roles = "STUDENT")]
    public async Task<IActionResult> GetActiveSessionsForStudent(
        CancellationToken cancellationToken)
    {
        var result =
            await _attendanceService.GetActiveSessionsForStudentAsync(
                CurrentUserId,
                cancellationToken);

        return Ok(result);
    }

    // ---------------------------------------------------------
    // STUDENT: GET ATTENDANCE HISTORY
    // GET /api/student/attendance/history
    // ---------------------------------------------------------

    [HttpGet("student/attendance/history")]
    [Authorize(Roles = "STUDENT")]
    public async Task<IActionResult> GetStudentAttendanceHistory(
        CancellationToken cancellationToken)
    {
        var result =
            await _attendanceService.GetStudentAttendanceHistoryAsync(
                CurrentUserId,
                cancellationToken);

        return Ok(result);
    }

    // ---------------------------------------------------------
    // STUDENT: SUBMIT OTP
    // POST /api/student/attendance/submit-otp
    // ---------------------------------------------------------

    [HttpPost("student/attendance/submit-otp")]
    [Authorize(Roles = "STUDENT")]
    public async Task<IActionResult> SubmitOtpAttendance(
        [FromBody] SubmitOtpAttendanceRequest request,
        CancellationToken cancellationToken)
    {
        var result =
            await _attendanceService.SubmitOtpAttendanceAsync(
                request,
                CurrentUserId,
                cancellationToken);

        return StatusCode(StatusCodes.Status201Created, result);
    }

    // ---------------------------------------------------------
    // STUDENT: SUBMIT QR
    // POST /api/student/attendance/submit-qr
    // ---------------------------------------------------------

    [HttpPost("student/attendance/submit-qr")]
    [Authorize(Roles = "STUDENT")]
    public async Task<IActionResult> SubmitQrAttendance(
        [FromBody] SubmitQrAttendanceRequest request,
        CancellationToken cancellationToken)
    {
        var result =
            await _attendanceService.SubmitQrAttendanceAsync(
                request,
                CurrentUserId,
                cancellationToken);

        return StatusCode(StatusCodes.Status201Created, result);
    }
}

