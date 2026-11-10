using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Checkify.API.Controllers;

[ApiController]
[Route("api/access")]
public class AccessController : ControllerBase
{
    [HttpGet("admin")]
    [Authorize(Policy = "AdminOnly")]
    public IActionResult AdminAccess()
    {
        return Ok(new
        {
            message = "ADMIN access granted."
        });
    }

    [HttpGet("manager")]
    [Authorize(Policy = "ManagerOnly")]
    public IActionResult ManagerAccess()
    {
        return Ok(new
        {
            message = "MANAGER access granted."
        });
    }

    [HttpGet("hod")]
    [Authorize(Policy = "HodOnly")]
    public IActionResult HodAccess()
    {
        return Ok(new
        {
            message = "HOD access granted."
        });
    }

    [HttpGet("staff")]
    [Authorize(Policy = "StaffOnly")]
    public IActionResult StaffAccess()
    {
        return Ok(new
        {
            message = "STAFF access granted."
        });
    }

    [HttpGet("student")]
    [Authorize(Policy = "StudentOnly")]
    public IActionResult StudentAccess()
    {
        return Ok(new
        {
            message = "STUDENT access granted."
        });
    }
}

