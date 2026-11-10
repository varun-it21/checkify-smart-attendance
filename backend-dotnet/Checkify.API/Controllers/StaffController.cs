using Checkify.API.DTOs.Staff;
using Checkify.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Checkify.API.Controllers;

[ApiController]
[Route("manager")]
[Authorize(Roles = "MANAGER,HOD,ADMIN")]
public class StaffController : ControllerBase
{
    private readonly IStaffService _staffService;

    public StaffController(IStaffService staffService)
    {
        _staffService = staffService;
    }

    [HttpPost("add-staff")]
    [Authorize(Roles = "MANAGER,ADMIN")]
    public async Task<IActionResult> AddStaff(
        [FromBody] AddStaffRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var response = await _staffService.CreateAsync(
                request,
                cancellationToken);

            return StatusCode(
                StatusCodes.Status201Created,
                response);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { message = ex.Message });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpGet("get-staffs")]
    public async Task<IActionResult> GetStaffs(
        CancellationToken cancellationToken)
    {
        var staff = await _staffService.GetAllAsync(
            cancellationToken);

        return Ok(staff);
    }

    [HttpGet("get-staff/{id:int}")]
    public async Task<IActionResult> GetStaffById(
        int id,
        CancellationToken cancellationToken)
    {
        var staff = await _staffService.GetByIdAsync(
            id,
            cancellationToken);

        if (staff is null)
        {
            return NotFound(new { message = "Staff member not found." });
        }

        return Ok(staff);
    }

    [HttpPut("update-staff/{id:int}")]
    [Authorize(Roles = "MANAGER,ADMIN")]
    public async Task<IActionResult> UpdateStaff(
        int id,
        [FromBody] UpdateStaffRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var response = await _staffService.UpdateAsync(
                id,
                request,
                cancellationToken);

            return Ok(response);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { message = ex.Message });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpDelete("delete-staff/{id:int}")]
    [Authorize(Roles = "MANAGER,ADMIN")]
    public async Task<IActionResult> DeleteStaff(
        int id,
        CancellationToken cancellationToken)
    {
        try
        {
            await _staffService.DeleteAsync(id, cancellationToken);

            return Ok(new
            {
                message = "Staff member deleted successfully."
            });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { message = ex.Message });
        }
    }
}

