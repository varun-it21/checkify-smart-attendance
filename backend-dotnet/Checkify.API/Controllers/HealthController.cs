using Checkify.API.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Checkify.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class HealthController : ControllerBase
{
    private readonly CheckifyDbContext _context;
    private readonly ILogger<HealthController> _logger;

    public HealthController(CheckifyDbContext context, ILogger<HealthController> logger)
    {
        _context = context;
        _logger = logger;
    }

    [HttpGet]
    public IActionResult GetStatus()
    {
        return Ok(new
        {
            status = "Healthy",
            framework = ".NET 10",
            service = "Checkify.API",
            timestamp = DateTime.UtcNow
        });
    }

    [HttpGet("db")]
    public async Task<IActionResult> CheckDatabase()
    {
        try
        {
            var canConnect = await _context.Database.CanConnectAsync();
            if (!canConnect)
            {
                return StatusCode(503, new { status = "Error", message = "Cannot connect to MySQL database." });
            }

            var departmentCount = await _context.Departments.AsNoTracking().CountAsync();
            var userCount = await _context.Users.AsNoTracking().CountAsync();

            return Ok(new
            {
                status = "Connected",
                canConnect,
                database = "checkify",
                counts = new
                {
                    departments = departmentCount,
                    users = userCount
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to connect to MySQL database");
            return StatusCode(500, new
            {
                status = "Database Connection Failed",
                error = ex.Message
            });
        }
    }
}
