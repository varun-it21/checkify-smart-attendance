using Checkify.API.Data;
using Checkify.API.DTOs.Leaves;
using Checkify.API.Entities;
using Checkify.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Checkify.API.Services;

public class LeaveService : ILeaveService
{
    private readonly CheckifyDbContext _db;
    private readonly INotificationService _notificationService;
    private readonly IAuditLogService _auditLogService;
    private readonly ILogger<LeaveService> _logger;

    public LeaveService(
        CheckifyDbContext db,
        INotificationService notificationService,
        IAuditLogService auditLogService,
        ILogger<LeaveService> logger)
    {
        _db = db;
        _notificationService = notificationService;
        _auditLogService = auditLogService;
        _logger = logger;
    }

    public async Task<LeaveResponse> ApplyLeaveAsync(
        int currentUserId,
        CreateLeaveRequest request,
        CancellationToken cancellationToken = default)
    {
        if (request == null)
            throw new ArgumentException("Leave request details cannot be null.");

        if (request.StartDate > request.EndDate)
            throw new ArgumentException("Start date cannot be after end date.");

        if (string.IsNullOrWhiteSpace(request.Reason))
            throw new ArgumentException("Reason is required.");

        // Allow one day of slack for client time zones ahead of UTC. Medical leave may be back-dated.
        var earliestAllowed = DateOnly.FromDateTime(DateTime.UtcNow).AddDays(-1);
        var requestedType = string.IsNullOrWhiteSpace(request.LeaveType) ? "CASUAL" : request.LeaveType.Trim().ToUpperInvariant();
        if (request.StartDate < earliestAllowed && requestedType != "MEDICAL")
            throw new ArgumentException("Start date cannot be in the past (only medical leave can be back-dated).");

        var leaveType = string.IsNullOrWhiteSpace(request.LeaveType)
            ? "CASUAL"
            : request.LeaveType.Trim().ToUpperInvariant();

        // 1. Resolve User and Department
        var user = await _db.Users
            .Include(u => u.Student)
            .Include(u => u.Staff)
            .FirstOrDefaultAsync(u => u.Id == currentUserId, cancellationToken);

        if (user == null)
            throw new UnauthorizedAccessException("Authenticated user not found.");

        string applicantRole;
        int departmentId;

        if (user.Student != null)
        {
            applicantRole = "STUDENT";
            departmentId = user.Student.DepartmentId;
        }
        else if (user.Staff != null)
        {
            applicantRole = user.Staff.Position.Equals("HOD", StringComparison.OrdinalIgnoreCase) ? "HOD" : "STAFF";
            departmentId = user.Staff.DepartmentId;
        }
        else if (user.Role.Equals("HOD", StringComparison.OrdinalIgnoreCase))
        {
            applicantRole = "HOD";
            var staffRecord = await _db.Staff.AsNoTracking().FirstOrDefaultAsync(s => s.UserId == currentUserId, cancellationToken);
            departmentId = staffRecord?.DepartmentId ?? 1;
        }
        else
        {
            applicantRole = user.Role.ToUpperInvariant();
            var defaultDept = await _db.Departments.OrderBy(d => d.Id).FirstOrDefaultAsync(cancellationToken);
            departmentId = defaultDept?.Id ?? 1;
        }

        if (applicantRole == "ADMIN")
            throw new InvalidOperationException("Administrators do not apply for leave through this system.");

        // Decide the reviewer role from the fixed approval chain.
        string approverRole;
        if (applicantRole == "STUDENT" || applicantRole == "STAFF")
        {
            var departmentHasHod = await _db.Staff
                .AsNoTracking()
                .AnyAsync(s => s.DepartmentId == departmentId
                    && s.UserId != currentUserId
                    && s.Position.ToUpper() == "HOD", cancellationToken);
            approverRole = departmentHasHod ? "HOD" : "MANAGER";
        }
        else if (applicantRole == "HOD")
        {
            approverRole = "MANAGER";
        }
        else
        {
            approverRole = "ADMIN"; // MANAGER
        }

        // 2. Overlap validation
        var hasOverlap = await _db.LeaveRequests
            .AsNoTracking()
            .AnyAsync(l => l.UserId == currentUserId
                && (l.Status == "PENDING" || l.Status == "APPROVED")
                && l.StartDate <= request.EndDate
                && l.EndDate >= request.StartDate,
                cancellationToken);

        if (hasOverlap)
        {
            throw new InvalidOperationException("An active or pending leave request already exists covering the specified date range.");
        }

        // 3. Create Leave Request
        var leave = new LeaveRequest
        {
            UserId = currentUserId,
            DepartmentId = departmentId,
            ApplicantRole = applicantRole,
            ApproverRole = approverRole,
            LeaveType = leaveType,
            StartDate = request.StartDate,
            EndDate = request.EndDate,
            Reason = request.Reason.Trim(),
            SupportingDocumentPath = string.IsNullOrWhiteSpace(request.SupportingDocumentPath) ? null : request.SupportingDocumentPath.Trim(),
            Status = "PENDING",
            CreatedAt = DateTime.UtcNow
        };

        _db.LeaveRequests.Add(leave);
        await _db.SaveChangesAsync(cancellationToken);

        // 4. Send notification to designated reviewer(s)
        try
        {
            List<int> reviewerIds;
            if (approverRole == "HOD")
            {
                reviewerIds = await _db.Staff
                    .AsNoTracking()
                    .Where(s => s.DepartmentId == departmentId && s.Position.ToUpper() == "HOD" && s.UserId != currentUserId)
                    .Select(s => s.UserId)
                    .ToListAsync(cancellationToken);
            }
            else
            {
                // MANAGER reviews are also visible to Admins (override); ADMIN reviews go to Admins only.
                reviewerIds = await _db.Users
                    .AsNoTracking()
                    .Where(u => u.Id != currentUserId
                        && (u.Role == "ADMIN" || (approverRole == "MANAGER" && u.Role == "MANAGER")))
                    .Select(u => u.Id)
                    .ToListAsync(cancellationToken);
            }

            if (reviewerIds.Count > 0)
            {
                await _notificationService.CreateNotificationsForUsersAsync(
                    reviewerIds,
                    "New Leave Request",
                    $"{applicantRole} {user.Name} applied for {leaveType} leave ({request.StartDate:yyyy-MM-dd} to {request.EndDate:yyyy-MM-dd}).",
                    "LEAVE_SUBMITTED",
                    leave.Id,
                    cancellationToken);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send notification for new leave request {LeaveId}", leave.Id);
        }

        var dept = await _db.Departments.FindAsync(new object[] { departmentId }, cancellationToken);
        return MapToResponse(leave, applicantName: user.Name, applicantEmail: user.Email, departmentName: dept?.Name);
    }

    public async Task<LeaveListResponse> GetMyLeavesAsync(
        int currentUserId,
        int limit = 20,
        int offset = 0,
        CancellationToken cancellationToken = default)
    {
        var clampedLimit = Math.Clamp(limit <= 0 ? 20 : limit, 1, 100);
        var clampedOffset = Math.Max(0, offset);

        var baseQuery = _db.LeaveRequests
            .AsNoTracking()
            .Where(l => l.UserId == currentUserId);

        var totalCount = await baseQuery.CountAsync(cancellationToken);
        var pendingCount = await baseQuery.CountAsync(l => l.Status == "PENDING", cancellationToken);
        var approvedCount = await baseQuery.CountAsync(l => l.Status == "APPROVED", cancellationToken);
        var rejectedCount = await baseQuery.CountAsync(l => l.Status == "REJECTED", cancellationToken);

        var items = await _db.LeaveRequests
            .Include(l => l.User)
            .Include(l => l.Department)
            .Include(l => l.ReviewerUser)
            .AsNoTracking()
            .Where(l => l.UserId == currentUserId)
            .OrderByDescending(l => l.CreatedAt)
            .Skip(clampedOffset)
            .Take(clampedLimit)
            .ToListAsync(cancellationToken);

        var responseList = items.Select(l => MapToResponse(l)).ToList();

        return new LeaveListResponse
        {
            Leaves = responseList,
            TotalCount = totalCount,
            PendingCount = pendingCount,
            ApprovedCount = approvedCount,
            RejectedCount = rejectedCount,
            Limit = clampedLimit,
            Offset = clampedOffset
        };
    }

    public async Task<LeaveResponse> GetLeaveByIdAsync(
        int leaveId,
        int currentUserId,
        string role,
        CancellationToken cancellationToken = default)
    {
        var leave = await _db.LeaveRequests
            .Include(l => l.User)
            .Include(l => l.Department)
            .Include(l => l.ReviewerUser)
            .FirstOrDefaultAsync(l => l.Id == leaveId, cancellationToken);

        if (leave == null)
        {
            throw new KeyNotFoundException("Leave request not found.");
        }

        var roleNorm = role.Trim().ToUpperInvariant();
        bool isOwner = leave.UserId == currentUserId;
        bool isManagerOrAdmin = roleNorm == "MANAGER" || roleNorm == "ADMIN";
        bool isDeptHod = false;

        if (roleNorm == "HOD")
        {
            var staff = await _db.Staff.AsNoTracking().FirstOrDefaultAsync(s => s.UserId == currentUserId, cancellationToken);
            if (staff != null && staff.DepartmentId == leave.DepartmentId)
            {
                isDeptHod = true;
            }
        }

        if (!isOwner && !isManagerOrAdmin && !isDeptHod)
        {
            throw new KeyNotFoundException("Leave request not found.");
        }

        return MapToResponse(leave);
    }

    public async Task<bool> CancelLeaveAsync(
        int leaveId,
        int currentUserId,
        CancellationToken cancellationToken = default)
    {
        var leave = await _db.LeaveRequests.FirstOrDefaultAsync(l => l.Id == leaveId, cancellationToken);
        if (leave == null || leave.UserId != currentUserId)
        {
            throw new KeyNotFoundException("Leave request not found.");
        }

        if (leave.Status != "PENDING")
        {
            throw new InvalidOperationException("Only pending leave requests can be cancelled.");
        }

        leave.Status = "CANCELLED";
        leave.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<LeaveListResponse> GetPendingLeavesAsync(
        int reviewerUserId,
        string reviewerRole,
        int limit = 20,
        int offset = 0,
        CancellationToken cancellationToken = default)
    {
        var clampedLimit = Math.Clamp(limit <= 0 ? 20 : limit, 1, 100);
        var clampedOffset = Math.Max(0, offset);

        var roleNorm = reviewerRole.Trim().ToUpperInvariant();
        IQueryable<LeaveRequest> baseQuery = _db.LeaveRequests.AsNoTracking();

        if (roleNorm == "HOD")
        {
            var staff = await _db.Staff.AsNoTracking().FirstOrDefaultAsync(s => s.UserId == reviewerUserId, cancellationToken);
            if (staff == null)
                throw new UnauthorizedAccessException("HOD profile not found.");

            baseQuery = baseQuery.Where(l => l.DepartmentId == staff.DepartmentId
                && l.Status == "PENDING"
                && l.ApproverRole == "HOD"
                && l.UserId != reviewerUserId);
        }
        else if (roleNorm == "MANAGER")
        {
            baseQuery = baseQuery.Where(l => l.Status == "PENDING"
                && l.ApproverRole == "MANAGER"
                && l.UserId != reviewerUserId);
        }
        else if (roleNorm == "ADMIN")
        {
            // Admin override: sees every pending request except their own.
            baseQuery = baseQuery.Where(l => l.Status == "PENDING" && l.UserId != reviewerUserId);
        }
        else
        {
            throw new UnauthorizedAccessException("Only HOD, Manager, or Admin can view pending leave requests.");
        }

        var totalCount = await baseQuery.CountAsync(cancellationToken);
        var items = await baseQuery
            .Include(l => l.User)
            .Include(l => l.Department)
            .Include(l => l.ReviewerUser)
            .OrderBy(l => l.CreatedAt)
            .Skip(clampedOffset)
            .Take(clampedLimit)
            .ToListAsync(cancellationToken);

        var responseList = items.Select(l => MapToResponse(l)).ToList();

        return new LeaveListResponse
        {
            Leaves = responseList,
            TotalCount = totalCount,
            PendingCount = totalCount,
            ApprovedCount = 0,
            RejectedCount = 0,
            Limit = clampedLimit,
            Offset = clampedOffset
        };
    }

    public async Task<LeaveResponse> ReviewLeaveAsync(
        int leaveId,
        int reviewerUserId,
        string reviewerRole,
        ReviewLeaveRequest request,
        CancellationToken cancellationToken = default)
    {
        if (request == null)
            throw new ArgumentException("Review request body cannot be null.");

        var normalizedStatus = (request.Status ?? string.Empty).Trim().ToUpperInvariant();
        if (normalizedStatus != "APPROVED" && normalizedStatus != "REJECTED")
        {
            throw new ArgumentException("Status must be either APPROVED or REJECTED.");
        }

        var leave = await _db.LeaveRequests
            .Include(l => l.User)
            .Include(l => l.Department)
            .FirstOrDefaultAsync(l => l.Id == leaveId, cancellationToken);

        if (leave == null)
        {
            throw new KeyNotFoundException("Leave request not found.");
        }

        if (leave.Status != "PENDING")
        {
            throw new InvalidOperationException($"Leave request has already been {leave.Status.ToLowerInvariant()}.");
        }

        if (leave.UserId == reviewerUserId)
        {
            throw new UnauthorizedAccessException("You cannot review your own leave request.");
        }

        var roleNorm = reviewerRole.Trim().ToUpperInvariant();
        if (roleNorm == "HOD")
        {
            var staff = await _db.Staff.AsNoTracking().FirstOrDefaultAsync(s => s.UserId == reviewerUserId, cancellationToken);
            if (staff == null || staff.DepartmentId != leave.DepartmentId)
            {
                throw new UnauthorizedAccessException("HOD can only review leave requests from their own department.");
            }

            if (!leave.ApproverRole.Equals("HOD", StringComparison.OrdinalIgnoreCase))
            {
                throw new UnauthorizedAccessException("This leave request must be reviewed by a " + leave.ApproverRole + ".");
            }
        }
        else if (roleNorm == "MANAGER")
        {
            if (!leave.ApproverRole.Equals("MANAGER", StringComparison.OrdinalIgnoreCase))
            {
                throw new UnauthorizedAccessException("This leave request must be reviewed by a " + leave.ApproverRole + ".");
            }
        }
        else if (roleNorm != "ADMIN")
        {
            throw new UnauthorizedAccessException("Only HOD, Manager, or Admin can review leave requests.");
        }

        var reviewer = await _db.Users.FindAsync(new object[] { reviewerUserId }, cancellationToken);

        var now = DateTime.UtcNow;
        leave.Status = normalizedStatus;
        leave.ReviewerUserId = reviewerUserId;
        leave.ReviewerRemarks = string.IsNullOrWhiteSpace(request.ReviewerRemarks) ? null : request.ReviewerRemarks.Trim();
        leave.ReviewedAt = now;
        leave.UpdatedAt = now;

        await _db.SaveChangesAsync(cancellationToken);

        // Milestone 9E: If approved for student, retroactively excuse any closed sessions in range
        if (normalizedStatus == "APPROVED" && leave.ApplicantRole.Equals("STUDENT", StringComparison.OrdinalIgnoreCase))
        {
            try
            {
                var student = await _db.Students.AsNoTracking().FirstOrDefaultAsync(s => s.UserId == leave.UserId, cancellationToken);
                if (student != null)
                {
                    var sessionsInRange = await _db.AttendanceSessions
                        .Where(s => s.DepartmentId == student.DepartmentId
                                 && s.Year == student.Year
                                 && s.Semester == student.Semester
                                 && s.Section == student.Section
                                 && s.SessionDate >= leave.StartDate
                                 && s.SessionDate <= leave.EndDate
                                 && s.Status == "CLOSED")
                        .Select(s => s.Id)
                        .ToListAsync(cancellationToken);

                    if (sessionsInRange.Count > 0)
                    {
                        var existingRecords = await _db.AttendanceRecords
                            .Where(r => r.StudentId == student.Id && sessionsInRange.Contains(r.AttendanceSessionId))
                            .ToListAsync(cancellationToken);

                        var existingSessionIds = existingRecords.Select(r => r.AttendanceSessionId).ToHashSet();

                        foreach (var rec in existingRecords.Where(r => r.Status == "ABSENT"))
                        {
                            rec.Status = "EXCUSED";
                            rec.Remarks = "Approved leave (retroactive)";
                        }

                        foreach (var sId in sessionsInRange)
                        {
                            if (!existingSessionIds.Contains(sId))
                            {
                                _db.AttendanceRecords.Add(new AttendanceRecord
                                {
                                    AttendanceSessionId = sId,
                                    StudentId = student.Id,
                                    MarkedByUserId = reviewerUserId,
                                    MarkedAt = now,
                                    Method = "SYSTEM",
                                    Status = "EXCUSED",
                                    Remarks = "Approved leave (retroactive)"
                                });
                            }
                        }

                        await _db.SaveChangesAsync(cancellationToken);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to retroactively excuse attendance for approved leave {LeaveId}", leave.Id);
            }
        }

        // Send notification to applicant
        try
        {
            var remarksPart = string.IsNullOrWhiteSpace(leave.ReviewerRemarks) ? "" : $" Remarks: {leave.ReviewerRemarks}";
            await _notificationService.CreateNotificationAsync(
                leave.UserId,
                $"Leave Request {normalizedStatus}",
                $"Your {leave.LeaveType} leave request for {leave.StartDate:yyyy-MM-dd} to {leave.EndDate:yyyy-MM-dd} has been {normalizedStatus.ToLowerInvariant()}.{remarksPart}",
                normalizedStatus == "APPROVED" ? "LEAVE_APPROVED" : "LEAVE_REJECTED",
                leave.Id,
                cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send notification for reviewed leave {LeaveId}", leave.Id);
        }

        // Record leave review in audit log
        await _auditLogService.LogAsync(
            reviewerUserId,
            "LEAVE_REVIEWED",
            "LeaveRequest",
            leave.Id.ToString(),
            $"Leave request #{leave.Id} {normalizedStatus} by user #{reviewerUserId} ({reviewerRole})",
            cancellationToken: cancellationToken);

        return MapToResponse(leave, reviewerName: reviewer?.Name);
    }

    private static LeaveResponse MapToResponse(
        LeaveRequest l,
        string? applicantName = null,
        string? applicantEmail = null,
        string? departmentName = null,
        string? reviewerName = null)
    {
        var days = l.EndDate.DayNumber - l.StartDate.DayNumber + 1;
        return new LeaveResponse
        {
            Id = l.Id,
            UserId = l.UserId,
            ApplicantName = applicantName ?? l.User?.Name ?? string.Empty,
            ApplicantEmail = applicantEmail ?? l.User?.Email ?? string.Empty,
            ApplicantRole = l.ApplicantRole,
            ApproverRole = l.ApproverRole,
            DepartmentId = l.DepartmentId,
            DepartmentName = departmentName ?? l.Department?.Name ?? string.Empty,
            LeaveType = l.LeaveType,
            StartDate = l.StartDate,
            EndDate = l.EndDate,
            DaysCount = days,
            Reason = l.Reason,
            SupportingDocumentPath = l.SupportingDocumentPath,
            Status = l.Status,
            ReviewerUserId = l.ReviewerUserId,
            ReviewerName = reviewerName ?? l.ReviewerUser?.Name,
            ReviewerRemarks = l.ReviewerRemarks,
            ReviewedAt = l.ReviewedAt,
            CreatedAt = l.CreatedAt,
            UpdatedAt = l.UpdatedAt
        };
    }
}
