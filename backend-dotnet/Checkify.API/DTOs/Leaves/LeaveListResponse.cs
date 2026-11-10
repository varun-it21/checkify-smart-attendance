namespace Checkify.API.DTOs.Leaves;

public class LeaveListResponse
{
    public IReadOnlyList<LeaveResponse> Leaves { get; set; } = Array.Empty<LeaveResponse>();
    public int TotalCount { get; set; }
    public int PendingCount { get; set; }
    public int ApprovedCount { get; set; }
    public int RejectedCount { get; set; }
    public int Limit { get; set; }
    public int Offset { get; set; }
}

