using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Checkify.API.DTOs.Department;
using Checkify.API.Services.Interfaces;

namespace Checkify.API.Controllers;

[ApiController]
[Route("manager/departments")]
[Authorize(Roles = "MANAGER,HOD,ADMIN")]
public class DepartmentController : ControllerBase
{
    private readonly IDepartmentService _departmentService;

    public DepartmentController(IDepartmentService departmentService)
    {
        _departmentService = departmentService;
    }

    // GET: /manager/departments
    [HttpGet]
    public async Task<IActionResult> GetDepartments()
    {
        var departments = await _departmentService.GetAllAsync();

        return Ok(departments);
    }

    // POST: /manager/departments
    [HttpPost]
    [Authorize(Roles = "MANAGER,ADMIN")]
    public async Task<IActionResult> CreateDepartment(
        [FromBody] CreateDepartmentRequest request)
    {
        try
        {
            var department = await _departmentService.CreateAsync(request);

            return StatusCode(StatusCodes.Status201Created, department);
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new
            {
                message = ex.Message
            });
        }
    }
}

