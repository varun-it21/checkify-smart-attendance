using System.Security.Claims;
using Checkify.API.DTOs.Leaves;
using Checkify.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Checkify.API.Controllers;

[ApiController]
[Route("api/leaves")]
[Authorize]
public class LeaveController : ControllerBase
{
    private readonly ILeaveService _leaveService;

    public LeaveController(ILeaveService leaveService)
    {
        _leaveService = leaveService;
    }

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

    private string CurrentUserRole
    {
        get
        {
            var role = User.FindFirstValue(ClaimTypes.Role) ?? User.FindFirstValue("role");
            return role?.Trim().ToUpperInvariant() ?? string.Empty;
        }
    }

    [HttpPost("apply")]
    public async Task<ActionResult<LeaveResponse>> ApplyLeave(
        [FromBody] CreateLeaveRequest request,
        CancellationToken cancellationToken = default)
    {
        var result = await _leaveService.ApplyLeaveAsync(CurrentUserId, request, cancellationToken);
        return CreatedAtAction(nameof(GetLeaveById), new { id = result.Id }, result);
    }

    [HttpGet("my")]
    public async Task<ActionResult<LeaveListResponse>> GetMyLeaves(
        [FromQuery] int limit = 20,
        [FromQuery] int offset = 0,
        CancellationToken cancellationToken = default)
    {
        var result = await _leaveService.GetMyLeavesAsync(CurrentUserId, limit, offset, cancellationToken);
        return Ok(result);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<LeaveResponse>> GetLeaveById(
        int id,
        CancellationToken cancellationToken = default)
    {
        var result = await _leaveService.GetLeaveByIdAsync(id, CurrentUserId, CurrentUserRole, cancellationToken);
        return Ok(result);
    }

    [HttpPut("{id:int}/cancel")]
    public async Task<ActionResult<object>> CancelLeave(
        int id,
        CancellationToken cancellationToken = default)
    {
        await _leaveService.CancelLeaveAsync(id, CurrentUserId, cancellationToken);
        return Ok(new { message = "Leave request cancelled successfully." });
    }

    [HttpGet("pending")]
    [Authorize(Roles = "HOD,MANAGER,ADMIN")]
    public async Task<ActionResult<LeaveListResponse>> GetPendingLeaves(
        [FromQuery] int limit = 20,
        [FromQuery] int offset = 0,
        CancellationToken cancellationToken = default)
    {
        var result = await _leaveService.GetPendingLeavesAsync(CurrentUserId, CurrentUserRole, limit, offset, cancellationToken);
        return Ok(result);
    }

    [HttpPut("{id:int}/review")]
    [Authorize(Roles = "HOD,MANAGER,ADMIN")]
    public async Task<ActionResult<LeaveResponse>> ReviewLeave(
        int id,
        [FromBody] ReviewLeaveRequest request,
        CancellationToken cancellationToken = default)
    {
        var result = await _leaveService.ReviewLeaveAsync(id, CurrentUserId, CurrentUserRole, request, cancellationToken);
        return Ok(result);
    }
}

