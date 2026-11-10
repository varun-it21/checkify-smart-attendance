using System.Data;
using Checkify.API.Data;
using Checkify.API.DTOs.AttendanceSession;
using Checkify.API.Entities;
using Checkify.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Checkify.API.Services;

public class AttendanceSessionService : IAttendanceSessionService
{
    private const string OpenStatus = "OPEN";
    private const string ClosedStatus = "CLOSED";
    private const string PresentStatus = "PRESENT";
    private const string OtpMethod = "OTP";
    private const string QrMethod = "QR";

    private const int OtpValidityMinutes = 5;
    private const int QrValiditySeconds = 60;
    private const int MaxFailedAttempts = 5;
    private const int LockoutMinutes = 10;

    private readonly CheckifyDbContext _db;
    private readonly IOtpService _otpService;
    private readonly IQrService _qrService;
    private readonly INotificationService _notificationService;
    private readonly ISystemSettingService _settingsService;
    private readonly ILogger<AttendanceSessionService> _logger;

    public AttendanceSessionService(
        CheckifyDbContext db,
        IOtpService otpService,
        IQrService qrService,
        INotificationService notificationService,
        ISystemSettingService settingsService,
        ILogger<AttendanceSessionService> logger)
    {
        _db = db;
        _otpService = otpService;
        _qrService = qrService;
        _notificationService = notificationService;
        _settingsService = settingsService;
        _logger = logger;
    }

    // ---------------------------------------------------------
    // OPEN ATTENDANCE SESSION
    // ---------------------------------------------------------

    public async Task<AttendanceSessionResponse> OpenSessionAsync(
        OpenAttendanceSessionRequest request,
        int currentUserId,
        string currentUserRole,
        CancellationToken cancellationToken = default)
    {
        EnsureStaffRole(currentUserRole);

        var staff = await _db.Staff
            .FirstOrDefaultAsync(
                s => s.UserId == currentUserId,
                cancellationToken);

        if (staff == null)
            throw new InvalidOperationException(
                "Staff profile not found.");

        var classSession = await _db.ClassSessions
            .FirstOrDefaultAsync(
                cs => cs.Id == request.ClassSessionId,
                cancellationToken);

        if (classSession == null)
            throw new InvalidOperationException(
                "Assigned class was not found.");

        if (classSession.StaffId != staff.Id)
            throw new UnauthorizedAccessException(
                "You are not assigned to conduct this class.");

        var sessionDate = request.SessionDate
            ?? DateOnly.FromDateTime(DateTime.UtcNow);

        if (sessionDate.DayOfWeek != classSession.DayOfWeek)
            throw new InvalidOperationException(
                "The selected date does not match the scheduled class day.");

        var alreadyExists = await _db.AttendanceSessions
            .AnyAsync(
                s => s.ClassSessionId == classSession.Id
                  && s.SessionDate == sessionDate,
                cancellationToken);

        if (alreadyExists)
            throw new InvalidOperationException(
                "An attendance session already exists for this class and date.");

        var now = DateTime.UtcNow;

        var attendanceSession = new AttendanceSession
        {
            ClassSessionId = classSession.Id,
            StaffId = staff.Id,
            DepartmentId = classSession.DepartmentId,
            Year = classSession.Year,
            Semester = classSession.Semester,
            Section = classSession.Section,
            SessionDate = sessionDate,
            Status = OpenStatus,
            StartedAt = now,
            CreatedAt = now
        };

        _db.AttendanceSessions.Add(attendanceSession);

        await _db.SaveChangesAsync(cancellationToken);

        // Notify enrolled students in this cohort
        try
        {
            var studentUserIds = await _db.Students
                .AsNoTracking()
                .Where(s => s.DepartmentId == attendanceSession.DepartmentId
                         && s.Year == attendanceSession.Year
                         && s.Semester == attendanceSession.Semester
                         && s.Section == attendanceSession.Section)
                .Select(s => s.UserId)
                .ToListAsync(cancellationToken);

            if (studentUserIds.Count > 0)
            {
                await _notificationService.CreateNotificationsForUsersAsync(
                    studentUserIds,
                    title: "Attendance Session Opened",
                    message: $"Attendance session is now open for {classSession.SubjectName} ({classSession.SubjectCode}). Please submit your OTP or scan the QR code.",
                    type: "SESSION_OPENED",
                    referenceId: attendanceSession.Id,
                    cancellationToken);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send SESSION_OPENED notifications for session {SessionId}", attendanceSession.Id);
        }

        return await GetResponseAsync(
            attendanceSession.Id,
            cancellationToken);
    }

    // ---------------------------------------------------------
    // CLOSE ATTENDANCE SESSION
    // ---------------------------------------------------------

    public async Task<AttendanceSessionResponse> CloseSessionAsync(
        int sessionId,
        int currentUserId,
        string currentUserRole,
        CancellationToken cancellationToken = default)
    {
        var session = await _db.AttendanceSessions
            .Include(s => s.ClassSession)
            .FirstOrDefaultAsync(
                s => s.Id == sessionId,
                cancellationToken);

        if (session == null)
            throw new KeyNotFoundException(
                "Attendance session not found.");

        await EnsureConductingStaffAsync(
            session, currentUserId, currentUserRole,
            cancellationToken);

        if (session.Status != OpenStatus)
            throw new InvalidOperationException(
                "Only an open attendance session can be closed.");

        session.Status = ClosedStatus;
        session.ClosedAt = DateTime.UtcNow;

        // Invalidate OTP and QR credentials.
        session.OtpHash = null;
        session.OtpExpiresAt = null;
        session.OtpAttemptCount = 0;
        session.OtpLockedUntil = null;

        session.QrTokenHash = null;
        session.QrExpiresAt = null;

        await _db.SaveChangesAsync(cancellationToken);

        // Milestone 9E: Automatically record EXCUSED for students on approved leave
        await ProcessApprovedLeaveExcusalsAsync(session, cancellationToken);

        // Milestone 8C: Trigger Defaulter Alerts for enrolled cohort students
        await ProcessDefaulterAlertsAsync(session, cancellationToken);

        // Milestone 8D: Staff session summary & HOD critical turnout alert
        await ProcessStaffAndHodNotificationsAsync(session, cancellationToken);

        return await GetResponseAsync(session.Id, cancellationToken);
    }

    // ---------------------------------------------------------
    // GET SESSION BY ID
    // ---------------------------------------------------------

    public async Task<AttendanceSessionResponse?> GetByIdAsync(
        int sessionId,
        int currentUserId,
        string currentUserRole,
        CancellationToken cancellationToken = default)
    {
        var session = await _db.AttendanceSessions
            .AsNoTracking()
            .FirstOrDefaultAsync(
                s => s.Id == sessionId,
                cancellationToken);

        if (session == null)
            return null;

        await EnsureCanViewSessionAsync(
            session,
            currentUserId,
            currentUserRole,
            cancellationToken);

        return await GetResponseAsync(sessionId, cancellationToken);
    }

    // ---------------------------------------------------------
    // ACTIVE SESSIONS FOR STAFF
    // ---------------------------------------------------------

    public async Task<IReadOnlyList<AttendanceSessionResponse>>
        GetActiveSessionsForStaffAsync(
            int currentUserId,
            CancellationToken cancellationToken = default)
    {
        var staff = await _db.Staff
            .AsNoTracking()
            .FirstOrDefaultAsync(
                s => s.UserId == currentUserId,
                cancellationToken);

        if (staff == null)
            throw new UnauthorizedAccessException(
                "Staff profile not found.");

        var ids = await _db.AttendanceSessions
            .AsNoTracking()
            .Where(s =>
                s.StaffId == staff.Id &&
                s.Status == OpenStatus)
            .OrderByDescending(s => s.StartedAt)
            .Select(s => s.Id)
            .ToListAsync(cancellationToken);

        return await GetResponsesAsync(ids, cancellationToken);
    }

    // ---------------------------------------------------------
    // ACTIVE SESSIONS FOR STUDENT
    // ---------------------------------------------------------

    public async Task<IReadOnlyList<AttendanceSessionResponse>>
        GetActiveSessionsForStudentAsync(
            int currentUserId,
            CancellationToken cancellationToken = default)
    {
        var student = await _db.Students
            .AsNoTracking()
            .FirstOrDefaultAsync(
                s => s.UserId == currentUserId,
                cancellationToken);

        if (student == null)
            throw new UnauthorizedAccessException(
                "Student profile not found.");

        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var ids = await _db.AttendanceSessions
            .AsNoTracking()
            .Where(s =>
                s.Status == OpenStatus &&
                s.SessionDate == today &&
                s.DepartmentId == student.DepartmentId &&
                s.Year == student.Year &&
                s.Semester == student.Semester &&
                s.Section == student.Section)
            .OrderByDescending(s => s.StartedAt)
            .Select(s => s.Id)
            .ToListAsync(cancellationToken);

        return await GetResponsesAsync(ids, cancellationToken);
    }

    // ---------------------------------------------------------
    // SESSION HISTORY FOR STAFF
    // ---------------------------------------------------------

    public async Task<IReadOnlyList<AttendanceSessionResponse>>
        GetStaffSessionHistoryAsync(
            int currentUserId,
            CancellationToken cancellationToken = default)
    {
        var staff = await _db.Staff
            .AsNoTracking()
            .FirstOrDefaultAsync(
                s => s.UserId == currentUserId,
                cancellationToken);

        if (staff == null)
            throw new UnauthorizedAccessException(
                "Staff profile not found.");

        var ids = await _db.AttendanceSessions
            .AsNoTracking()
            .Where(s => s.StaffId == staff.Id)
            .OrderByDescending(s => s.SessionDate)
            .ThenByDescending(s => s.StartedAt)
            .Select(s => s.Id)
            .ToListAsync(cancellationToken);

        return await GetResponsesAsync(ids, cancellationToken);
    }

    // ---------------------------------------------------------
    // ATTENDANCE HISTORY FOR STUDENT
    // ---------------------------------------------------------

    public async Task<IReadOnlyList<StudentAttendanceHistoryResponse>>
        GetStudentAttendanceHistoryAsync(
            int currentUserId,
            CancellationToken cancellationToken = default)
    {
        var student = await _db.Students
            .AsNoTracking()
            .FirstOrDefaultAsync(
                s => s.UserId == currentUserId,
                cancellationToken);

        if (student == null)
            throw new UnauthorizedAccessException(
                "Student profile not found.");

        return await _db.AttendanceRecords
            .AsNoTracking()
            .Where(r => r.StudentId == student.Id)
            .OrderByDescending(r => r.MarkedAt)
            .Select(r => new StudentAttendanceHistoryResponse
            {
                Id = r.Id,
                AttendanceSessionId = r.AttendanceSessionId,
                SubjectCode = r.AttendanceSession.ClassSession.SubjectCode,
                SubjectName = r.AttendanceSession.ClassSession.SubjectName,
                StaffName = r.AttendanceSession.Staff.StaffName,
                SessionDate = r.AttendanceSession.SessionDate,
                Status = r.Status,
                Method = r.Method,
                MarkedAt = r.MarkedAt
            })
            .ToListAsync(cancellationToken);
    }

    // ---------------------------------------------------------
    // GET SESSION ATTENDANCE RECORDS
    // ---------------------------------------------------------

    public async Task<IReadOnlyList<AttendanceRecordResponse>>
        GetSessionRecordsAsync(
            int sessionId,
            int currentUserId,
            string currentUserRole,
            CancellationToken cancellationToken = default)
    {
        var session = await _db.AttendanceSessions
            .AsNoTracking()
            .FirstOrDefaultAsync(
                s => s.Id == sessionId,
                cancellationToken);

        if (session == null)
            throw new KeyNotFoundException(
                "Attendance session not found.");

        await EnsureCanViewRecordsAsync(
            session,
            currentUserId,
            currentUserRole,
            cancellationToken);

        return await _db.AttendanceRecords
            .AsNoTracking()
            .Where(r => r.AttendanceSessionId == sessionId)
            .OrderBy(r => r.Student.Name)
            .Select(r => new AttendanceRecordResponse
            {
                Id = r.Id,
                AttendanceSessionId = r.AttendanceSessionId,
                StudentId = r.StudentId,
                StudentName = r.Student.Name,
                Status = r.Status,
                Method = r.Method,
                MarkedAt = r.MarkedAt
            })
            .ToListAsync(cancellationToken);
    }

    // ---------------------------------------------------------
    // GENERATE OTP
    // ---------------------------------------------------------

    public async Task<OtpResponse> GenerateOtpAsync(
        int sessionId,
        int currentUserId,
        CancellationToken cancellationToken = default)
    {
        var session = await _db.AttendanceSessions
            .Include(s => s.ClassSession)
            .FirstOrDefaultAsync(
                s => s.Id == sessionId,
                cancellationToken);

        if (session == null)
            throw new KeyNotFoundException(
                "Attendance session not found.");

        await EnsureConductingStaffAsync(
            session, currentUserId, "STAFF", cancellationToken);

        if (session.Status != OpenStatus)
            throw new InvalidOperationException(
                "OTP can only be generated for an open session.");

        var code = _otpService.GenerateCode();
        var expiresAt = DateTime.UtcNow.AddMinutes(OtpValidityMinutes);

        session.OtpHash = _otpService.HashCode(code);
        session.OtpExpiresAt = expiresAt;

        // Legacy session-wide attempt fields are not used.
        // Attempts are tracked independently in AttendanceOtpAttempts.

        await _db.SaveChangesAsync(cancellationToken);

        return new OtpResponse
        {
            AttendanceSessionId = session.Id,
            OtpCode = code,
            ExpiresAt = expiresAt,
            RemainingSeconds = OtpValidityMinutes * 60
        };
    }

    // ---------------------------------------------------------
    // SUBMIT OTP ATTENDANCE
    // ---------------------------------------------------------

    public async Task<AttendanceRecordResponse> SubmitOtpAttendanceAsync(
        SubmitOtpAttendanceRequest request,
        int currentUserId,
        CancellationToken cancellationToken = default)
    {
        // Serializable transaction protects the attempt counter and
        // attendance submission from concurrent requests.
        await using var transaction =
            await _db.Database.BeginTransactionAsync(
                IsolationLevel.Serializable,
                cancellationToken);

        var student = await _db.Students
            .FirstOrDefaultAsync(
                s => s.UserId == currentUserId,
                cancellationToken);

        if (student == null)
            throw new UnauthorizedAccessException(
                "Student profile not found.");

        var session = await _db.AttendanceSessions
            .Include(s => s.ClassSession)
            .FirstOrDefaultAsync(
                s => s.Id == request.AttendanceSessionId,
                cancellationToken);

        if (session == null)
            throw new KeyNotFoundException(
                "Attendance session not found.");

        if (session.Status != OpenStatus)
            throw new InvalidOperationException(
                "This attendance session is not open.");

        if (session.DepartmentId != student.DepartmentId ||
            session.Year != student.Year ||
            session.Semester != student.Semester ||
            !string.Equals(
                session.Section,
                student.Section,
                StringComparison.OrdinalIgnoreCase))
        {
            throw new UnauthorizedAccessException(
                "You are not part of this attendance session.");
        }

        var now = DateTime.UtcNow;

        if (string.IsNullOrWhiteSpace(session.OtpHash) ||
            !session.OtpExpiresAt.HasValue ||
            session.OtpExpiresAt.Value <= now)
        {
            throw new InvalidOperationException(
                "The OTP is missing or has expired.");
        }

        var existingRecord = await _db.AttendanceRecords
            .AnyAsync(
                r => r.AttendanceSessionId == session.Id &&
                     r.StudentId == student.Id,
                cancellationToken);

        if (existingRecord)
            throw new InvalidOperationException(
                "Your attendance has already been marked.");

        var attempt = await _db.AttendanceOtpAttempts
            .FirstOrDefaultAsync(
                a => a.AttendanceSessionId == session.Id &&
                     a.StudentId == student.Id,
                cancellationToken);

        if (attempt?.LockedUntil.HasValue == true &&
            attempt.LockedUntil.Value > now)
        {
            throw new InvalidOperationException(
                $"OTP attempts are locked until {attempt.LockedUntil.Value:O}.");
        }

        // Expired lockout: reset this student's counter.
        if (attempt?.LockedUntil.HasValue == true &&
            attempt.LockedUntil.Value <= now)
        {
            attempt.FailedAttemptCount = 0;
            attempt.LockedUntil = null;
            attempt.UpdatedAt = now;
        }

        if (!_otpService.VerifyCode(
                request.OtpCode,
                session.OtpHash))
        {
            if (attempt == null)
            {
                attempt = new AttendanceOtpAttempt
                {
                    AttendanceSessionId = session.Id,
                    StudentId = student.Id,
                    FailedAttemptCount = 0,
                    UpdatedAt = now
                };

                _db.AttendanceOtpAttempts.Add(attempt);
            }

            attempt.FailedAttemptCount++;
            attempt.UpdatedAt = now;

            if (attempt.FailedAttemptCount >= MaxFailedAttempts)
            {
                attempt.LockedUntil =
                    now.AddMinutes(LockoutMinutes);
            }

            var remainingAttempts = Math.Max(
                0,
                MaxFailedAttempts - attempt.FailedAttemptCount);

            await _db.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);

            if (remainingAttempts == 0)
            {
                throw new InvalidOperationException(
                    $"Too many incorrect OTP attempts. Try again after {LockoutMinutes} minutes.");
            }

            throw new InvalidOperationException(
                $"Incorrect OTP. {remainingAttempts} attempt(s) remaining.");
        }

        var attendanceRecord = new AttendanceRecord
        {
            AttendanceSessionId = session.Id,
            StudentId = student.Id,
            MarkedByUserId = null,
            MarkedAt = now,
            Method = OtpMethod,
            Status = PresentStatus
        };

        _db.AttendanceRecords.Add(attendanceRecord);

        // Successful verification clears this student's failure history.
        if (attempt != null)
        {
            attempt.FailedAttemptCount = 0;
            attempt.LockedUntil = null;
            attempt.UpdatedAt = now;
        }

        await _db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        try
        {
            var subjectName = session.ClassSession?.SubjectName ?? "Class";
            var subjectCode = session.ClassSession?.SubjectCode ?? "";
            var codeDisplay = string.IsNullOrWhiteSpace(subjectCode) ? "" : $" ({subjectCode})";

            await _notificationService.CreateNotificationAsync(
                student.UserId,
                title: "Attendance Recorded",
                message: $"You have been marked PRESENT for {subjectName}{codeDisplay} on {session.SessionDate:yyyy-MM-dd}.",
                type: "ATTENDANCE_MARKED",
                referenceId: session.Id,
                cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send ATTENDANCE_MARKED notification to student user {UserId} for session {SessionId}", student.UserId, session.Id);
        }

        return new AttendanceRecordResponse
        {
            Id = attendanceRecord.Id,
            AttendanceSessionId = attendanceRecord.AttendanceSessionId,
            StudentId = student.Id,
            StudentName = student.Name,
            Status = attendanceRecord.Status,
            Method = attendanceRecord.Method,
            MarkedAt = attendanceRecord.MarkedAt
        };
    }

    // ---------------------------------------------------------
    // GENERATE QR
    // ---------------------------------------------------------

    public async Task<QrResponse> GenerateQrAsync(
        int sessionId,
        int currentUserId,
        CancellationToken cancellationToken = default)
    {
        var session = await _db.AttendanceSessions
            .Include(s => s.ClassSession)
            .FirstOrDefaultAsync(
                s => s.Id == sessionId,
                cancellationToken);

        if (session == null)
            throw new KeyNotFoundException(
                "Attendance session not found.");

        await EnsureConductingStaffAsync(
            session, currentUserId, "STAFF", cancellationToken);

        if (session.Status != OpenStatus)
            throw new InvalidOperationException(
                "QR code can only be generated for an open session.");

        var token = _qrService.GenerateToken();
        var expiresAt = DateTime.UtcNow.AddSeconds(QrValiditySeconds);

        session.QrTokenHash = _qrService.HashToken(token);
        session.QrExpiresAt = expiresAt;

        await _db.SaveChangesAsync(cancellationToken);

        return new QrResponse
        {
            AttendanceSessionId = session.Id,
            QrToken = token,
            ExpiresAt = expiresAt,
            RemainingSeconds = QrValiditySeconds
        };
    }

    // ---------------------------------------------------------
    // SUBMIT QR ATTENDANCE
    // ---------------------------------------------------------

    public async Task<AttendanceRecordResponse> SubmitQrAttendanceAsync(
        SubmitQrAttendanceRequest request,
        int currentUserId,
        CancellationToken cancellationToken = default)
    {
        await using var transaction =
            await _db.Database.BeginTransactionAsync(
                IsolationLevel.Serializable,
                cancellationToken);

        var student = await _db.Students
            .FirstOrDefaultAsync(
                s => s.UserId == currentUserId,
                cancellationToken);

        if (student == null)
            throw new UnauthorizedAccessException(
                "Student profile not found.");

        var session = await _db.AttendanceSessions
            .Include(s => s.ClassSession)
            .FirstOrDefaultAsync(
                s => s.Id == request.AttendanceSessionId,
                cancellationToken);

        if (session == null)
            throw new KeyNotFoundException(
                "Attendance session not found.");

        if (session.Status != OpenStatus)
            throw new InvalidOperationException(
                "This attendance session is not open.");

        if (session.DepartmentId != student.DepartmentId ||
            session.Year != student.Year ||
            session.Semester != student.Semester ||
            !string.Equals(
                session.Section,
                student.Section,
                StringComparison.OrdinalIgnoreCase))
        {
            throw new UnauthorizedAccessException(
                "You are not part of this attendance session.");
        }

        var now = DateTime.UtcNow;

        if (string.IsNullOrWhiteSpace(session.QrTokenHash) ||
            !session.QrExpiresAt.HasValue ||
            session.QrExpiresAt.Value <= now)
        {
            throw new InvalidOperationException(
                "The QR code is missing or has expired.");
        }

        var existingRecord = await _db.AttendanceRecords
            .AnyAsync(
                r => r.AttendanceSessionId == session.Id &&
                     r.StudentId == student.Id,
                cancellationToken);

        if (existingRecord)
            throw new InvalidOperationException(
                "Your attendance has already been marked.");

        if (!_qrService.VerifyToken(
                request.QrToken,
                session.QrTokenHash))
        {
            throw new InvalidOperationException(
                "Invalid QR code.");
        }

        var attendanceRecord = new AttendanceRecord
        {
            AttendanceSessionId = session.Id,
            StudentId = student.Id,
            MarkedByUserId = null,
            MarkedAt = now,
            Method = QrMethod,
            Status = PresentStatus
        };

        _db.AttendanceRecords.Add(attendanceRecord);

        await _db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        try
        {
            var subjectName = session.ClassSession?.SubjectName ?? "Class";
            var subjectCode = session.ClassSession?.SubjectCode ?? "";
            var codeDisplay = string.IsNullOrWhiteSpace(subjectCode) ? "" : $" ({subjectCode})";

            await _notificationService.CreateNotificationAsync(
                student.UserId,
                title: "Attendance Recorded",
                message: $"You have been marked PRESENT for {subjectName}{codeDisplay} on {session.SessionDate:yyyy-MM-dd}.",
                type: "ATTENDANCE_MARKED",
                referenceId: session.Id,
                cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send ATTENDANCE_MARKED notification to student user {UserId} for session {SessionId}", student.UserId, session.Id);
        }

        return new AttendanceRecordResponse
        {
            Id = attendanceRecord.Id,
            AttendanceSessionId = attendanceRecord.AttendanceSessionId,
            StudentId = student.Id,
            StudentName = student.Name,
            Status = attendanceRecord.Status,
            Method = attendanceRecord.Method,
            MarkedAt = attendanceRecord.MarkedAt
        };
    }

    // =========================================================
    // PRIVATE HELPERS
    // =========================================================

    private static void EnsureStaffRole(string role)
    {
        if (role != "STAFF" && role != "HOD")
            throw new UnauthorizedAccessException(
                "Only staff members can manage attendance sessions.");
    }

    private async Task EnsureConductingStaffAsync(
        AttendanceSession session,
        int currentUserId,
        string role,
        CancellationToken cancellationToken)
    {
        EnsureStaffRole(role);

        var staff = await _db.Staff
            .AsNoTracking()
            .FirstOrDefaultAsync(
                s => s.UserId == currentUserId,
                cancellationToken);

        if (staff == null || staff.Id != session.StaffId)
            throw new UnauthorizedAccessException(
                "You are not authorized to manage this attendance session.");
    }

    private async Task EnsureCanViewSessionAsync(
        AttendanceSession session,
        int currentUserId,
        string role,
        CancellationToken cancellationToken)
    {
        if (role == "MANAGER" || role == "ADMIN")
            return;

        if (role == "STAFF" || role == "HOD")
        {
            var staff = await _db.Staff
                .AsNoTracking()
                .FirstOrDefaultAsync(
                    s => s.UserId == currentUserId,
                    cancellationToken);

            if (staff == null)
                throw new UnauthorizedAccessException(
                    "Staff profile not found.");

            if (role == "STAFF" && staff.Id != session.StaffId)
                throw new UnauthorizedAccessException(
                    "You cannot access another staff member's session.");

            if (role == "HOD" &&
                staff.DepartmentId != session.DepartmentId)
                throw new UnauthorizedAccessException(
                    "You cannot access sessions outside your department.");

            return;
        }

        if (role == "STUDENT")
        {
            var student = await _db.Students
                .AsNoTracking()
                .FirstOrDefaultAsync(
                    s => s.UserId == currentUserId,
                    cancellationToken);

            if (student == null ||
                student.DepartmentId != session.DepartmentId ||
                student.Year != session.Year ||
                student.Semester != session.Semester ||
                !string.Equals(
                    student.Section,
                    session.Section,
                    StringComparison.OrdinalIgnoreCase))
            {
                throw new UnauthorizedAccessException(
                    "You cannot access this attendance session.");
            }

            return;
        }

        throw new UnauthorizedAccessException(
            "You are not authorized to view this session.");
    }

    private async Task EnsureCanViewRecordsAsync(
        AttendanceSession session,
        int currentUserId,
        string role,
        CancellationToken cancellationToken)
    {
        if (role == "MANAGER" || role == "ADMIN")
            return;

        if (role == "STAFF" || role == "HOD")
        {
            await EnsureCanViewSessionAsync(
                session,
                currentUserId,
                role,
                cancellationToken);

            return;
        }

        throw new UnauthorizedAccessException(
            "Only authorized staff can view session attendance records.");
    }

    private async Task<AttendanceSessionResponse> GetResponseAsync(
        int sessionId,
        CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;

        var response = await _db.AttendanceSessions
            .AsNoTracking()
            .Where(s => s.Id == sessionId)
            .Select(s => new AttendanceSessionResponse
            {
                Id = s.Id,
                ClassSessionId = s.ClassSessionId,
                SubjectCode = s.ClassSession.SubjectCode,
                SubjectName = s.ClassSession.SubjectName,
                StaffId = s.StaffId,
                StaffName = s.Staff.StaffName,
                DepartmentId = s.DepartmentId,
                DepartmentName = s.Department.Name,
                Year = s.Year,
                Semester = s.Semester,
                Section = s.Section,
                SessionDate = s.SessionDate,
                Status = s.Status,
                StartedAt = s.StartedAt,
                ClosedAt = s.ClosedAt,
                CreatedAt = s.CreatedAt,
                OtpActive =
                    s.Status == OpenStatus &&
                    s.OtpHash != null &&
                    s.OtpExpiresAt.HasValue &&
                    s.OtpExpiresAt.Value > now,
                OtpExpiresAt = s.OtpExpiresAt,
                QrActive =
                    s.Status == OpenStatus &&
                    s.QrTokenHash != null &&
                    s.QrExpiresAt.HasValue &&
                    s.QrExpiresAt.Value > now,
                QrExpiresAt = s.QrExpiresAt,
                PresentCount = s.Records.Count(
                    r => r.Status == PresentStatus),
                TotalRecordCount = s.Records.Count()
            })
            .FirstOrDefaultAsync(cancellationToken);

        return response ?? throw new KeyNotFoundException(
            "Attendance session not found.");
    }

    private async Task<IReadOnlyList<AttendanceSessionResponse>>
        GetResponsesAsync(
            IReadOnlyList<int> ids,
            CancellationToken cancellationToken)
    {
        if (ids.Count == 0)
            return Array.Empty<AttendanceSessionResponse>();

        var now = DateTime.UtcNow;

        return await _db.AttendanceSessions
            .AsNoTracking()
            .Where(s => ids.Contains(s.Id))
            .OrderByDescending(s => s.StartedAt)
            .Select(s => new AttendanceSessionResponse
            {
                Id = s.Id,
                ClassSessionId = s.ClassSessionId,
                SubjectCode = s.ClassSession.SubjectCode,
                SubjectName = s.ClassSession.SubjectName,
                StaffId = s.StaffId,
                StaffName = s.Staff.StaffName,
                DepartmentId = s.DepartmentId,
                DepartmentName = s.Department.Name,
                Year = s.Year,
                Semester = s.Semester,
                Section = s.Section,
                SessionDate = s.SessionDate,
                Status = s.Status,
                StartedAt = s.StartedAt,
                ClosedAt = s.ClosedAt,
                CreatedAt = s.CreatedAt,
                OtpActive =
                    s.Status == OpenStatus &&
                    s.OtpHash != null &&
                    s.OtpExpiresAt.HasValue &&
                    s.OtpExpiresAt.Value > now,
                OtpExpiresAt = s.OtpExpiresAt,
                QrActive =
                    s.Status == OpenStatus &&
                    s.QrTokenHash != null &&
                    s.QrExpiresAt.HasValue &&
                    s.QrExpiresAt.Value > now,
                QrExpiresAt = s.QrExpiresAt,
                PresentCount = s.Records.Count(
                    r => r.Status == PresentStatus),
                TotalRecordCount = s.Records.Count()
            })
            .ToListAsync(cancellationToken);
    }

    private async Task ProcessDefaulterAlertsAsync(
        AttendanceSession session,
        CancellationToken cancellationToken)
    {
        try
        {
            // 1. Get all closed sessions for this class session
            var closedSessions = await _db.AttendanceSessions
                .AsNoTracking()
                .Where(s => s.ClassSessionId == session.ClassSessionId && s.Status == ClosedStatus)
                .Select(s => s.Id)
                .ToListAsync(cancellationToken);

            var conductedCount = closedSessions.Count;
            if (conductedCount == 0) return;

            // 2. Query all cohort students
            var cohortStudents = await _db.Students
                .AsNoTracking()
                .Where(s => s.DepartmentId == session.DepartmentId
                         && s.Year == session.Year
                         && s.Semester == session.Semester
                         && s.Section == session.Section)
                .Select(s => new { s.Id, s.UserId, s.Name })
                .ToListAsync(cancellationToken);

            if (cohortStudents.Count == 0) return;

            // 3. Query attendance records for all closed sessions
            var closedSessionSet = closedSessions.ToHashSet();
            var studentIds = cohortStudents.Select(s => s.Id).ToList();

            var attendedSessionIdsByStudent = (await _db.AttendanceRecords
                .AsNoTracking()
                .Where(r => studentIds.Contains(r.StudentId)
                         && closedSessionSet.Contains(r.AttendanceSessionId)
                         && (r.Status == "PRESENT" || r.Status == "LATE" || r.Status == "EXCUSED"))
                .Select(r => new { r.StudentId, r.AttendanceSessionId })
                .ToListAsync(cancellationToken))
                .GroupBy(r => r.StudentId)
                .ToDictionary(g => g.Key, g => g.Select(x => x.AttendanceSessionId).Distinct().Count());

            // 4. Query existing alerts for this session to guarantee idempotency
            var existingAlertUserIds = (await _db.Notifications
                .AsNoTracking()
                .Where(n => n.Type == "DEFAULTER_WARNING" && n.ReferenceId == session.Id)
                .Select(n => n.UserId)
                .ToListAsync(cancellationToken))
                .ToHashSet();

            var subjectName = session.ClassSession?.SubjectName ?? "Class";
            var subjectCode = session.ClassSession?.SubjectCode ?? "";
            var subjectDisplay = string.IsNullOrWhiteSpace(subjectCode) ? subjectName : $"{subjectName} ({subjectCode})";

            var minThreshold = await _settingsService.GetSettingDecimalAsync("MIN_ATTENDANCE_PERCENTAGE", 75.0m, cancellationToken);
            var defaulterNotifications = new List<Notification>();
            var now = DateTime.UtcNow;

            foreach (var student in cohortStudents)
            {
                if (existingAlertUserIds.Contains(student.UserId))
                    continue;

                var attendedCount = attendedSessionIdsByStudent.TryGetValue(student.Id, out var count) ? count : 0;
                var percentage = Math.Round((decimal)attendedCount * 100m / conductedCount, 1, MidpointRounding.AwayFromZero);

                if (percentage < minThreshold)
                {
                    defaulterNotifications.Add(new Notification
                    {
                        UserId = student.UserId,
                        Title = "Low Attendance Warning",
                        Message = $"Your attendance in {subjectDisplay} has fallen to {percentage:F1}%, which is below the mandatory {minThreshold:F1}% threshold.",
                        Type = "DEFAULTER_WARNING",
                        ReferenceId = session.Id,
                        IsRead = false,
                        CreatedAt = now,
                        ReadAt = null
                    });
                }
            }

            if (defaulterNotifications.Count > 0)
            {
                _db.Notifications.AddRange(defaulterNotifications);
                await _db.SaveChangesAsync(cancellationToken);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to evaluate and send defaulter alerts for session {SessionId}", session.Id);
        }
    }

    private async Task ProcessStaffAndHodNotificationsAsync(
        AttendanceSession session,
        CancellationToken cancellationToken)
    {
        try
        {
            // 1. Resolve conducting staff
            var staff = await _db.Staff
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.Id == session.StaffId, cancellationToken);

            if (staff == null)
            {
                _logger.LogWarning("Conducting staff {StaffId} not found for session {SessionId}", session.StaffId, session.Id);
                return;
            }

            // 2. Count actual enrolled cohort size
            var cohortCount = await _db.Students
                .AsNoTracking()
                .Where(s => s.DepartmentId == session.DepartmentId
                         && s.Year == session.Year
                         && s.Semester == session.Semester
                         && s.Section == session.Section)
                .CountAsync(cancellationToken);

            // 3. Count attended students (PRESENT or LATE)
            var attendedCount = await _db.AttendanceRecords
                .AsNoTracking()
                .Where(r => r.AttendanceSessionId == session.Id
                         && (r.Status == PresentStatus || r.Status == "LATE" || r.Status == "EXCUSED"))
                .CountAsync(cancellationToken);

            var attendanceRate = cohortCount <= 0
                ? 0m
                : Math.Round((decimal)attendedCount * 100m / cohortCount, 1, MidpointRounding.AwayFromZero);

            var subjectName = session.ClassSession?.SubjectName ?? "Class";
            var subjectCode = session.ClassSession?.SubjectCode ?? "";
            var subjectDisplay = string.IsNullOrWhiteSpace(subjectCode) ? subjectName : $"{subjectName} ({subjectCode})";
            var now = DateTime.UtcNow;

            var notifications = new List<Notification>();

            // 4. Staff notification: SESSION_SUMMARY
            var staffSummaryExists = await _db.Notifications
                .AsNoTracking()
                .AnyAsync(n => n.Type == "SESSION_SUMMARY" && n.ReferenceId == session.Id && n.UserId == staff.UserId, cancellationToken);

            if (!staffSummaryExists)
            {
                notifications.Add(new Notification
                {
                    UserId = staff.UserId,
                    Title = "Attendance Session Summary",
                    Message = $"Session for {subjectDisplay} closed with {attendedCount}/{cohortCount} ({attendanceRate:F1}%) attendance.",
                    Type = "SESSION_SUMMARY",
                    ReferenceId = session.Id,
                    IsRead = false,
                    CreatedAt = now,
                    ReadAt = null
                });
            }

            // 5. HOD notification: HOD_ALERT if turnout is strictly < critical turnout threshold
            var criticalTurnout = await _settingsService.GetSettingDecimalAsync("CRITICAL_TURNOUT_PERCENTAGE", 50.0m, cancellationToken);
            if (cohortCount > 0 && attendanceRate < criticalTurnout)
            {
                var hod = await _db.Staff
                    .AsNoTracking()
                    .Include(s => s.User)
                    .FirstOrDefaultAsync(
                        s => s.DepartmentId == session.DepartmentId
                          && (s.Position == "HOD" || s.User.Role == "HOD"),
                        cancellationToken);

                if (hod != null)
                {
                    var hodAlertExists = await _db.Notifications
                        .AsNoTracking()
                        .AnyAsync(n => n.Type == "HOD_ALERT" && n.ReferenceId == session.Id && n.UserId == hod.UserId, cancellationToken);

                    if (!hodAlertExists)
                    {
                        notifications.Add(new Notification
                        {
                            UserId = hod.UserId,
                            Title = "Low Attendance Session Alert",
                            Message = $"Attendance for {subjectDisplay} conducted by {staff.StaffName} on {session.SessionDate:yyyy-MM-dd} was {attendanceRate:F1}% ({attendedCount}/{cohortCount}).",
                            Type = "HOD_ALERT",
                            ReferenceId = session.Id,
                            IsRead = false,
                            CreatedAt = now,
                            ReadAt = null
                        });
                    }
                }
            }

            if (notifications.Count > 0)
            {
                _db.Notifications.AddRange(notifications);
                await _db.SaveChangesAsync(cancellationToken);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to process staff/HOD notifications for session {SessionId}", session.Id);
        }
    }

    private async Task ProcessApprovedLeaveExcusalsAsync(
        AttendanceSession session,
        CancellationToken cancellationToken)
    {
        try
        {
            var cohortStudents = await _db.Students
                .AsNoTracking()
                .Where(s => s.DepartmentId == session.DepartmentId
                         && s.Year == session.Year
                         && s.Semester == session.Semester
                         && s.Section == session.Section)
                .Select(s => new { s.Id, s.UserId })
                .ToListAsync(cancellationToken);

            if (cohortStudents.Count == 0) return;

            var studentUserIds = cohortStudents.Select(s => s.UserId).ToList();

            var approvedLeaveUserIds = (await _db.LeaveRequests
                .AsNoTracking()
                .Where(l => studentUserIds.Contains(l.UserId)
                         && l.Status == "APPROVED"
                         && l.StartDate <= session.SessionDate
                         && l.EndDate >= session.SessionDate)
                .Select(l => l.UserId)
                .ToListAsync(cancellationToken))
                .ToHashSet();

            if (approvedLeaveUserIds.Count == 0) return;

            var existingRecordStudentIds = (await _db.AttendanceRecords
                .AsNoTracking()
                .Where(r => r.AttendanceSessionId == session.Id)
                .Select(r => r.StudentId)
                .ToListAsync(cancellationToken))
                .ToHashSet();

            var excusedRecords = new List<AttendanceRecord>();
            var now = DateTime.UtcNow;

            foreach (var student in cohortStudents)
            {
                if (approvedLeaveUserIds.Contains(student.UserId) && !existingRecordStudentIds.Contains(student.Id))
                {
                    excusedRecords.Add(new AttendanceRecord
                    {
                        AttendanceSessionId = session.Id,
                        StudentId = student.Id,
                        MarkedByUserId = null,
                        MarkedAt = now,
                        Method = "SYSTEM",
                        Status = "EXCUSED",
                        Remarks = "Approved leave"
                    });
                }
            }

            if (excusedRecords.Count > 0)
            {
                _db.AttendanceRecords.AddRange(excusedRecords);
                await _db.SaveChangesAsync(cancellationToken);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to process approved leave excusals for session {SessionId}", session.Id);
        }
    }
}

