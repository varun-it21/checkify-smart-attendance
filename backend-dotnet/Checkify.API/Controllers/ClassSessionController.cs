using System.Security.Claims;
using Checkify.API.DTOs.ClassSession;
using Checkify.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Checkify.API.Controllers;

[ApiController]
public class ClassSessionController : ControllerBase
{
    private readonly IClassSessionService _classSessionService;

    public ClassSessionController(
        IClassSessionService classSessionService)
    {
        _classSessionService = classSessionService;
    }

    // ---------------------------------------------------------
    // JWT CLAIM EXTRACTION
    // ---------------------------------------------------------

    private bool TryGetCurrentUser(
        out int userId,
        out string role)
    {
        userId = 0;
        role = string.Empty;

        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)
                          ?? User.FindFirst("sub");

        var roleClaim = User.FindFirst("role")
                        ?? User.FindFirst(ClaimTypes.Role);

        if (userIdClaim is null ||
            !int.TryParse(userIdClaim.Value, out userId) ||
            userId <= 0 ||
            roleClaim is null)
        {
            return false;
        }

        role = roleClaim.Value;
        return true;
    }

    // ---------------------------------------------------------
    // MANAGEMENT ENDPOINTS
    // MANAGER: All departments
    // HOD: Own department only
    // ---------------------------------------------------------

    [HttpPost("hod/assign-staff")]
    [Authorize(Roles = "MANAGER,HOD,ADMIN")]
    public async Task<IActionResult> Create(
        [FromBody] CreateClassSessionRequest request,
        CancellationToken cancellationToken)
    {
        if (!TryGetCurrentUser(out var userId, out var role))
            return Unauthorized();

        try
        {
            var result = await _classSessionService.CreateAsync(
                request,
                userId,
                role,
                cancellationToken);

            return StatusCode(
                StatusCodes.Status201Created,
                result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
        catch (Exception ex)
        {
            return StatusCode(
                StatusCodes.Status500InternalServerError,
                new { message = ex.Message });
        }
    }

    [HttpGet("hod/assigned-classes")]
    [Authorize(Roles = "MANAGER,HOD,ADMIN")]
    public async Task<IActionResult> GetAll(
        CancellationToken cancellationToken)
    {
        if (!TryGetCurrentUser(out var userId, out var role))
            return Unauthorized();

        try
        {
            var result = await _classSessionService.GetAllAsync(
                userId,
                role,
                cancellationToken);

            return Ok(result);
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }

    [HttpGet("hod/assigned-classes/{id:int}")]
    [Authorize(Roles = "MANAGER,HOD,ADMIN")]
    public async Task<IActionResult> GetById(
        int id,
        CancellationToken cancellationToken)
    {
        if (!TryGetCurrentUser(out var userId, out var role))
            return Unauthorized();

        try
        {
            var result = await _classSessionService.GetByIdAsync(
                id,
                userId,
                role,
                cancellationToken);

            if (result is null)
                return NotFound(new { message = "Class session not found." });

            return Ok(result);
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }

    [HttpPut("hod/update-assignment/{id:int}")]
    [Authorize(Roles = "MANAGER,HOD,ADMIN")]
    public async Task<IActionResult> Update(
        int id,
        [FromBody] UpdateClassSessionRequest request,
        CancellationToken cancellationToken)
    {
        if (!TryGetCurrentUser(out var userId, out var role))
            return Unauthorized();

        try
        {
            var result = await _classSessionService.UpdateAsync(
                id,
                request,
                userId,
                role,
                cancellationToken);

            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }

    [HttpDelete("hod/delete-assignment/{id:int}")]
    [Authorize(Roles = "MANAGER,HOD,ADMIN")]
    public async Task<IActionResult> Delete(
        int id,
        CancellationToken cancellationToken)
    {
        if (!TryGetCurrentUser(out var userId, out var role))
            return Unauthorized();

        try
        {
            var deleted = await _classSessionService.DeleteAsync(
                id,
                userId,
                role,
                cancellationToken);

            if (!deleted)
                return NotFound(new { message = "Class session not found." });

            return Ok(new { message = "Class session deleted successfully." });
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }

    // ---------------------------------------------------------
    // STUDENT TIMETABLE
    // ---------------------------------------------------------

    [HttpGet("student/timetable")]
    [Authorize(Roles = "STUDENT")]
    public async Task<IActionResult> GetStudentTimetable(
        CancellationToken cancellationToken)
    {
        if (!TryGetCurrentUser(out var userId, out _))
            return Unauthorized();

        try
        {
            var result =
                await _classSessionService.GetStudentTimetableAsync(
                    userId,
                    cancellationToken);

            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }

    // ---------------------------------------------------------
    // STAFF / HOD TIMETABLE
    // ---------------------------------------------------------

    [HttpGet("staff/timetable")]
    [Authorize(Roles = "STAFF,HOD")]
    public async Task<IActionResult> GetStaffTimetable(
        CancellationToken cancellationToken)
    {
        if (!TryGetCurrentUser(out var userId, out _))
            return Unauthorized();

        try
        {
            var result =
                await _classSessionService.GetStaffTimetableAsync(
                    userId,
                    cancellationToken);

            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }
}

