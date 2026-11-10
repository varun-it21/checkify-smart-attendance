namespace Checkify.API.DTOs.Admin;

public class AuditLogResponse
{
    public int Id { get; set; }
    public int? UserId { get; set; }
    public string? UserName { get; set; }
    public string? UserEmail { get; set; }
    public string Action { get; set; } = string.Empty;
    public string EntityName { get; set; } = string.Empty;
    public string? EntityId { get; set; }
    public string Details { get; set; } = string.Empty;
    public string? IpAddress { get; set; }
    public DateTime Timestamp { get; set; }
}

public class AuditLogListResponse
{
    public IReadOnlyList<AuditLogResponse> Logs { get; set; } = Array.Empty<AuditLogResponse>();
    public int TotalCount { get; set; }
    public int Limit { get; set; }
    public int Offset { get; set; }
}

