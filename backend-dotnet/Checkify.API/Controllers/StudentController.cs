using Checkify.API.DTOs.Student;
using Checkify.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Checkify.API.Controllers;

[ApiController]
[Route("manager")]
[Authorize(Roles = "MANAGER,ADMIN")]
public class StudentController : ControllerBase
{
    private readonly IStudentService _studentService;

    public StudentController(IStudentService studentService)
    {
        _studentService = studentService;
    }

    [HttpPost("add-student")]
    public async Task<IActionResult> AddStudent(
        [FromBody] AddStudentRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var response = await _studentService.CreateAsync(
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

    [HttpGet("get-students")]
    public async Task<IActionResult> GetStudents(
        CancellationToken cancellationToken)
    {
        var students = await _studentService.GetAllAsync(
            cancellationToken);

        return Ok(students);
    }

    [HttpGet("get-student/{id:int}")]
    public async Task<IActionResult> GetStudentById(
        int id,
        CancellationToken cancellationToken)
    {
        var student = await _studentService.GetByIdAsync(
            id,
            cancellationToken);

        if (student is null)
        {
            return NotFound(new { message = "Student not found." });
        }

        return Ok(student);
    }

    [HttpPut("update-student/{id:int}")]
    public async Task<IActionResult> UpdateStudent(
        int id,
        [FromBody] UpdateStudentRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var response = await _studentService.UpdateAsync(
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

    [HttpDelete("delete-student/{id:int}")]
    public async Task<IActionResult> DeleteStudent(
        int id,
        CancellationToken cancellationToken)
    {
        try
        {
            await _studentService.DeleteAsync(id, cancellationToken);

            return Ok(new
            {
                message = "Student deleted successfully."
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

