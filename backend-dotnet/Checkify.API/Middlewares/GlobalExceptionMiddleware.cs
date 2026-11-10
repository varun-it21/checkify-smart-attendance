using System.Text.Json;

namespace Checkify.API.Middlewares;

public class GlobalExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<GlobalExceptionMiddleware> _logger;

    public GlobalExceptionMiddleware(
        RequestDelegate next,
        ILogger<GlobalExceptionMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            await HandleExceptionAsync(context, ex);
        }
    }

    private async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        if (context.Response.HasStarted)
        {
            _logger.LogWarning("The response has already started, cannot handle exception.");
            return;
        }

        var (statusCode, message) = exception switch
        {
            UnauthorizedAccessException uae => (StatusCodes.Status403Forbidden, uae.Message),
            KeyNotFoundException knfe => (StatusCodes.Status404NotFound, knfe.Message),
            InvalidOperationException ioe => (StatusCodes.Status409Conflict, ioe.Message),
            ArgumentException ae => (StatusCodes.Status400BadRequest, ae.Message),
            _ => (StatusCodes.Status500InternalServerError, "An unexpected error occurred.")
        };

        if (statusCode == StatusCodes.Status500InternalServerError)
        {
            _logger.LogError(exception, "Unhandled server error occurred.");
        }
        else
        {
            _logger.LogInformation("Handled exception: HTTP {StatusCode} - {Message}", statusCode, message);
        }

        context.Response.ContentType = "application/json";
        context.Response.StatusCode = statusCode;

        var responsePayload = new { message };
        await context.Response.WriteAsync(JsonSerializer.Serialize(responsePayload));
    }
}

