using Checkify.API.Data;
using Checkify.API.DTOs.Analytics;
using Checkify.API.Entities;
using Checkify.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Checkify.API.Services;

public class AnalyticsService : IAnalyticsService
{
    private const string Closed = "CLOSED";
    private const string Expired = "EXPIRED";
    private static readonly string[] CountedAttendanceStatuses = ["PRESENT", "LATE", "EXCUSED"];
    private readonly CheckifyDbContext _db;

    public AnalyticsService(CheckifyDbContext db) => _db = db;

    public async Task<DashboardStatsResponse> GetDashboardStatsAsync(
        int currentUserId, string role, DateOnly? fromDate, DateOnly? toDate,
        int? departmentId, CancellationToken cancellationToken = default)
    {
        ValidateRange(fromDate, toDate);
        var scope = await ResolveDepartmentScopeAsync(currentUserId, role, departmentId, cancellationToken);
        var department = await GetDepartmentAnalyticsCoreAsync(scope, fromDate, toDate, cancellationToken);
        var today = GetIndiaToday();

        var students = _db.Students.AsNoTracking();
        var staff = _db.Staff.AsNoTracking();
        var departments = _db.Departments.AsNoTracking();
        if (scope != null)
        {
            students = students.Where(x => scope.Contains(x.DepartmentId));
            staff = staff.Where(x => scope.Contains(x.DepartmentId));
            departments = departments.Where(x => scope.Contains(x.Id));
        }

        var todaySessions = _db.AttendanceSessions.AsNoTracking()
            .Where(s => s.SessionDate == today && (s.Status == Closed || s.Status == Expired));
        if (scope != null) todaySessions = todaySessions.Where(s => scope.Contains(s.DepartmentId));

        return new DashboardStatsResponse
        {
            StudentCount = await students.CountAsync(cancellationToken),
            StaffCount = await staff.CountAsync(cancellationToken),
            DepartmentCount = await departments.CountAsync(cancellationToken),
            SessionsToday = await todaySessions.CountAsync(cancellationToken),
            TotalSessionsInRange = department.SessionsConducted,
            TotalAttendanceRecords = department.AttendanceCount,
            ExpectedAttendanceCount = department.ExpectedAttendanceCount,
            AttendancePercentage = department.AttendancePercentage,
            FromDate = fromDate,
            ToDate = toDate
        };
    }

    public async Task<DepartmentAnalyticsResponse> GetDepartmentAnalyticsAsync(
        int currentUserId, string role, DateOnly? fromDate, DateOnly? toDate,
        int? departmentId, CancellationToken cancellationToken = default)
    {
        ValidateRange(fromDate, toDate);
        var scope = await ResolveDepartmentScopeAsync(currentUserId, role, departmentId, cancellationToken);
        return await GetDepartmentAnalyticsCoreAsync(scope, fromDate, toDate, cancellationToken);
    }

    public async Task<StudentAttendanceSummaryResponse> GetStudentSummaryAsync(
        int studentId, int currentUserId, string role, DateOnly? fromDate,
        DateOnly? toDate, decimal threshold, CancellationToken cancellationToken = default)
    {
        ValidateRange(fromDate, toDate);
        ValidateThreshold(threshold);
        var student = await _db.Students.AsNoTracking()
            .Include(s => s.Department)
            .FirstOrDefaultAsync(s => s.Id == studentId, cancellationToken)
            ?? throw new KeyNotFoundException("Student not found.");

        await EnsureCanViewStudentAsync(student, currentUserId, role, cancellationToken);
        return await BuildStudentSummaryAsync(student, fromDate, toDate, threshold, cancellationToken);
    }

    public async Task<StudentAttendanceSummaryResponse> GetMyStudentSummaryAsync(
        int currentUserId, DateOnly? fromDate, DateOnly? toDate, decimal threshold,
        CancellationToken cancellationToken = default)
    {
        ValidateRange(fromDate, toDate);
        ValidateThreshold(threshold);
        var student = await _db.Students.AsNoTracking().Include(s => s.Department)
            .FirstOrDefaultAsync(s => s.UserId == currentUserId, cancellationToken)
            ?? throw new KeyNotFoundException("Student profile not found.");
        return await BuildStudentSummaryAsync(student, fromDate, toDate, threshold, cancellationToken);
    }

    public async Task<IReadOnlyList<StudentAttendanceSummaryResponse>> GetDefaultersAsync(
        int currentUserId, string role, DateOnly? fromDate, DateOnly? toDate,
        int? departmentId, int? year, int? semester, string? section,
        decimal threshold, CancellationToken cancellationToken = default)
    {
        ValidateRange(fromDate, toDate);
        ValidateThreshold(threshold);
        var scope = await ResolveDepartmentScopeAsync(currentUserId, role, departmentId, cancellationToken);
        var studentsQuery = _db.Students.AsNoTracking().Include(s => s.Department).AsQueryable();
        if (scope != null) studentsQuery = studentsQuery.Where(s => scope.Contains(s.DepartmentId));
        if (year.HasValue) studentsQuery = studentsQuery.Where(s => s.Year == year.Value);
        if (semester.HasValue) studentsQuery = studentsQuery.Where(s => s.Semester == semester.Value);
        if (!string.IsNullOrWhiteSpace(section))
        {
            var normalizedSection = section.Trim().ToUpper();
            studentsQuery = studentsQuery.Where(s => s.Section == normalizedSection);
        }

        var students = await studentsQuery.OrderBy(s => s.DepartmentId).ThenBy(s => s.Year)
            .ThenBy(s => s.Semester).ThenBy(s => s.Section).ThenBy(s => s.Name)
            .ToListAsync(cancellationToken);
        if (students.Count == 0) return Array.Empty<StudentAttendanceSummaryResponse>();

        // Load the selected departments' conducted sessions and attendance records in batches.
        // This avoids one database round-trip per student on large defaulter reports.
        var departmentIds = students.Select(s => s.DepartmentId).Distinct().ToList();
        var sessionsQuery = ClosedSessions().Include(s => s.ClassSession)
            .Where(s => departmentIds.Contains(s.DepartmentId));
        sessionsQuery = ApplyDateRange(sessionsQuery, fromDate, toDate);
        var sessions = await sessionsQuery.ToListAsync(cancellationToken);
        var sessionIds = sessions.Select(s => s.Id).ToList();
        var attendance = sessionIds.Count == 0 ? new List<AttendanceRecord>() :
            await _db.AttendanceRecords.AsNoTracking()
                .Where(r => sessionIds.Contains(r.AttendanceSessionId) && CountedAttendanceStatuses.Contains(r.Status))
                .ToListAsync(cancellationToken);

        var result = new List<StudentAttendanceSummaryResponse>();
        foreach (var student in students)
        {
            var cohortSessions = sessions.Where(s => s.DepartmentId == student.DepartmentId &&
                s.Year == student.Year && s.Semester == student.Semester && s.Section == student.Section).ToList();
            var summary = BuildStudentSummaryFromData(student, cohortSessions, attendance, threshold);
            if (summary.IsDefaulter) result.Add(summary);
        }
        return result;
    }

    public async Task<StaffTeachingInsightsResponse> GetStaffInsightsAsync(
        int currentUserId, string role, DateOnly? fromDate, DateOnly? toDate,
        int? departmentId, CancellationToken cancellationToken = default)
    {
        ValidateRange(fromDate, toDate);
        List<int>? scope;
        int? staffId = null;
        if (role == "STAFF")
        {
            var staff = await _db.Staff.AsNoTracking().FirstOrDefaultAsync(s => s.UserId == currentUserId, cancellationToken)
                ?? throw new KeyNotFoundException("Staff profile not found.");
            staffId = staff.Id;
            scope = [staff.DepartmentId];
            if (departmentId.HasValue && departmentId.Value != staff.DepartmentId)
                throw new UnauthorizedAccessException("You cannot view another department's analytics.");
        }
        else
        {
            scope = await ResolveDepartmentScopeAsync(currentUserId, role, departmentId, cancellationToken);
        }

        var sessionsQuery = ClosedSessions().Include(s => s.ClassSession).AsQueryable();
        if (scope != null) sessionsQuery = sessionsQuery.Where(s => scope.Contains(s.DepartmentId));
        if (staffId.HasValue) sessionsQuery = sessionsQuery.Where(s => s.StaffId == staffId.Value);
        sessionsQuery = ApplyDateRange(sessionsQuery, fromDate, toDate);
        var sessions = await sessionsQuery.ToListAsync(cancellationToken);
        var ids = sessions.Select(s => s.Id).ToList();
        var records = ids.Count == 0
            ? new List<AttendanceRecord>()
            : await _db.AttendanceRecords.AsNoTracking()
                .Where(r => ids.Contains(r.AttendanceSessionId) && CountedAttendanceStatuses.Contains(r.Status))
                .ToListAsync(cancellationToken);

        var studentCounts = await GetCohortStudentCountsAsync(sessions, cancellationToken);
        var response = new StaffTeachingInsightsResponse
        {
            StaffCount = staffId.HasValue ? 1 : sessions.Select(s => s.StaffId).Distinct().Count(),
            SessionsConducted = sessions.Count,
            ExpectedAttendanceCount = sessions.Sum(s => GetCohortCount(studentCounts, s)),
            AttendanceCount = records.Count,
            OtpAttendanceCount = records.Count(r => r.Method == "OTP"),
            QrAttendanceCount = records.Count(r => r.Method == "QR"),
            FromDate = fromDate,
            ToDate = toDate
        };
        response.AttendancePercentage = Percent(response.AttendanceCount, response.ExpectedAttendanceCount);
        response.OtpPercentage = Percent(response.OtpAttendanceCount, response.AttendanceCount);
        response.QrPercentage = Percent(response.QrAttendanceCount, response.AttendanceCount);

        response.Subjects = sessions
            .GroupBy(s => new { s.ClassSession.SubjectCode, s.ClassSession.SubjectName })
            .Select(g =>
            {
                var subjectSessions = g.ToList();
                var subjectIds = subjectSessions.Select(s => s.Id).ToHashSet();
                var subjectRecords = records.Where(r => subjectIds.Contains(r.AttendanceSessionId)).ToList();
                var expected = subjectSessions.Sum(s => GetCohortCount(studentCounts, s));
                return new StaffSubjectInsightResponse
                {
                    SubjectCode = g.Key.SubjectCode,
                    SubjectName = g.Key.SubjectName,
                    SessionsConducted = subjectSessions.Count,
                    ExpectedAttendanceCount = expected,
                    AttendanceCount = subjectRecords.Count,
                    AttendancePercentage = Percent(subjectRecords.Count, expected),
                    OtpAttendanceCount = subjectRecords.Count(r => r.Method == "OTP"),
                    QrAttendanceCount = subjectRecords.Count(r => r.Method == "QR")
                };
            })
            .OrderBy(x => x.SubjectName).ToList();
        return response;
    }

    public async Task<IReadOnlyList<AttendanceTrendPointResponse>> GetTrendsAsync(
        int currentUserId, string role, DateOnly? fromDate, DateOnly? toDate,
        int? departmentId, string groupBy, CancellationToken cancellationToken = default)
    {
        ValidateRange(fromDate, toDate);
        var scope = await ResolveDepartmentScopeAsync(currentUserId, role, departmentId, cancellationToken);
        var sessionsQuery = ClosedSessions();
        if (scope != null) sessionsQuery = sessionsQuery.Where(s => scope.Contains(s.DepartmentId));
        sessionsQuery = ApplyDateRange(sessionsQuery, fromDate, toDate);
        var sessions = await sessionsQuery.Select(s => new { s.Id, s.SessionDate }).ToListAsync(cancellationToken);
        var ids = sessions.Select(s => s.Id).ToList();
        var recordCounts = ids.Count == 0
            ? new Dictionary<int, int>()
            : await _db.AttendanceRecords.AsNoTracking()
                .Where(r => ids.Contains(r.AttendanceSessionId) && CountedAttendanceStatuses.Contains(r.Status))
                .GroupBy(r => r.AttendanceSessionId)
                .Select(g => new { SessionId = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.SessionId, x => x.Count, cancellationToken);

        var weekly = string.Equals(groupBy, "week", StringComparison.OrdinalIgnoreCase);
        if (!weekly && !string.Equals(groupBy, "day", StringComparison.OrdinalIgnoreCase))
            throw new ArgumentException("groupBy must be either 'day' or 'week'.");

        return sessions.GroupBy(s => weekly ? StartOfWeek(s.SessionDate) : s.SessionDate)
            .OrderBy(g => g.Key)
            .Select(g => new AttendanceTrendPointResponse
            {
                PeriodStart = g.Key,
                SessionsConducted = g.Count(),
                AttendanceCount = g.Sum(s => recordCounts.GetValueOrDefault(s.Id))
            }).ToList();
    }

    private async Task<DepartmentAnalyticsResponse> GetDepartmentAnalyticsCoreAsync(
        List<int>? scope, DateOnly? fromDate, DateOnly? toDate, CancellationToken cancellationToken)
    {
        var studentsQuery = _db.Students.AsNoTracking();
        var staffQuery = _db.Staff.AsNoTracking();
        var departmentsQuery = _db.Departments.AsNoTracking();
        if (scope != null)
        {
            studentsQuery = studentsQuery.Where(s => scope.Contains(s.DepartmentId));
            staffQuery = staffQuery.Where(s => scope.Contains(s.DepartmentId));
            departmentsQuery = departmentsQuery.Where(d => scope.Contains(d.Id));
        }
        var students = await studentsQuery.Select(s => new { s.DepartmentId, s.Year, s.Semester, s.Section }).ToListAsync(cancellationToken);
        var studentCounts = students.GroupBy(s => (s.DepartmentId, s.Year, s.Semester, s.Section))
            .ToDictionary(g => g.Key, g => g.Count());

        var sessionsQuery = ClosedSessions().Include(s => s.Department).Include(s => s.ClassSession).AsQueryable();
        if (scope != null) sessionsQuery = sessionsQuery.Where(s => scope.Contains(s.DepartmentId));
        sessionsQuery = ApplyDateRange(sessionsQuery, fromDate, toDate);
        var sessions = await sessionsQuery.ToListAsync(cancellationToken);
        var ids = sessions.Select(s => s.Id).ToList();
        var cohortRows = sessions.GroupBy(s => new { s.DepartmentId, s.Department.Name, s.Year, s.Semester, s.Section })
            .Select(g =>
            {
                var key = (g.Key.DepartmentId, g.Key.Year, g.Key.Semester, g.Key.Section);
                var cohortStudents = studentCounts.GetValueOrDefault(key);
                var expected = g.Count() * cohortStudents;
                // Attendance rows are counted against this cohort after the aggregate query.
                return new CohortAnalyticsResponse
                {
                    DepartmentId = g.Key.DepartmentId,
                    DepartmentName = g.Key.Name,
                    Year = g.Key.Year,
                    Semester = g.Key.Semester,
                    Section = g.Key.Section,
                    StudentCount = cohortStudents,
                    SessionsConducted = g.Count(),
                    ExpectedAttendanceCount = expected,
                    AttendanceCount = 0
                };
            }).ToList();

        var recordRows = ids.Count == 0 ? new List<(int SessionId, int Count)>() :
            (await _db.AttendanceRecords.AsNoTracking()
                .Where(r => ids.Contains(r.AttendanceSessionId) && CountedAttendanceStatuses.Contains(r.Status))
                .GroupBy(r => r.AttendanceSessionId)
                .Select(g => new { SessionId = g.Key, Count = g.Count() })
                .ToListAsync(cancellationToken))
            .Select(x => (x.SessionId, x.Count)).ToList();
        var recordsBySession = recordRows.ToDictionary(x => x.SessionId, x => x.Count);
        foreach (var cohort in cohortRows)
        {
            var matchingIds = sessions.Where(s => s.DepartmentId == cohort.DepartmentId && s.Year == cohort.Year && s.Semester == cohort.Semester && s.Section == cohort.Section).Select(s => s.Id);
            cohort.AttendanceCount = matchingIds.Sum(id => recordsBySession.GetValueOrDefault(id));
            cohort.AttendancePercentage = Percent(cohort.AttendanceCount, cohort.ExpectedAttendanceCount);
        }

        var allStudents = students.Count;
        var allStaff = await staffQuery.CountAsync(cancellationToken);
        var deptList = await departmentsQuery.OrderBy(d => d.Name).Select(d => new { d.Id, d.Name }).ToListAsync(cancellationToken);
        var overallExpected = cohortRows.Sum(c => c.ExpectedAttendanceCount);
        return new DepartmentAnalyticsResponse
        {
            DepartmentId = scope?.Count == 1 ? scope[0] : null,
            DepartmentName = scope?.Count == 1
                ? deptList.FirstOrDefault(d => d.Id == scope[0])?.Name ?? "Department"
                : "All Departments",
            StudentCount = allStudents,
            StaffCount = allStaff,
            SessionsConducted = sessions.Count,
            ExpectedAttendanceCount = overallExpected,
            AttendanceCount = cohortRows.Sum(c => c.AttendanceCount),
            AttendancePercentage = Percent(cohortRows.Sum(c => c.AttendanceCount), overallExpected),
            FromDate = fromDate,
            ToDate = toDate,
            Cohorts = cohortRows.OrderBy(c => c.DepartmentName).ThenBy(c => c.Year).ThenBy(c => c.Semester).ThenBy(c => c.Section).ToList()
        };
    }

    private async Task<StudentAttendanceSummaryResponse> BuildStudentSummaryAsync(
        Student student, DateOnly? fromDate, DateOnly? toDate, decimal threshold,
        CancellationToken cancellationToken)
    {
        var sessionsQuery = ClosedSessions().Include(s => s.ClassSession)
            .Where(s => s.DepartmentId == student.DepartmentId && s.Year == student.Year &&
                        s.Semester == student.Semester && s.Section == student.Section);
        sessionsQuery = ApplyDateRange(sessionsQuery, fromDate, toDate);
        var sessions = await sessionsQuery.Select(s => new
        {
            s.Id, s.ClassSessionId,
            s.ClassSession.SubjectCode,
            s.ClassSession.SubjectName
        }).ToListAsync(cancellationToken);
        var ids = sessions.Select(s => s.Id).ToList();
        var attendedRows = ids.Count == 0 ? new List<AttendanceRecord>() : await _db.AttendanceRecords.AsNoTracking()
            .Where(r => r.StudentId == student.Id && ids.Contains(r.AttendanceSessionId) && CountedAttendanceStatuses.Contains(r.Status))
            .ToListAsync(cancellationToken);
        var attendedIds = attendedRows.Select(r => r.AttendanceSessionId).ToHashSet();
        var subjects = sessions.GroupBy(s => new { s.ClassSessionId, s.SubjectCode, s.SubjectName })
            .Select(g =>
            {
                var conducted = g.Count();
                var attended = g.Count(s => attendedIds.Contains(s.Id));
                return new SubjectAttendanceReportResponse
                {
                    ClassSessionId = g.Key.ClassSessionId,
                    SubjectCode = g.Key.SubjectCode,
                    SubjectName = g.Key.SubjectName,
                    ClassesConducted = conducted,
                    ClassesAttended = attended,
                    AttendancePercentage = Percent(attended, conducted)
                };
            }).OrderBy(s => s.SubjectName).ToList();
        var totalAttended = attendedIds.Count;
        var totalConducted = sessions.Count;
        var percentage = Percent(totalAttended, totalConducted);
        return new StudentAttendanceSummaryResponse
        {
            StudentId = student.Id,
            UserId = student.UserId,
            StudentName = student.Name,
            DepartmentId = student.DepartmentId,
            DepartmentName = student.Department.Name,
            Year = student.Year,
            Semester = student.Semester,
            Section = student.Section,
            ClassesConducted = totalConducted,
            ClassesAttended = totalAttended,
            AttendancePercentage = percentage,
            DefaulterThreshold = threshold,
            IsDefaulter = totalConducted > 0 && percentage < threshold,
            Subjects = subjects
        };
    }

    private static StudentAttendanceSummaryResponse BuildStudentSummaryFromData(
        Student student, List<AttendanceSession> sessions,
        List<AttendanceRecord> attendance, decimal threshold)
    {
        var ids = sessions.Select(s => s.Id).ToHashSet();
        var attendedRows = attendance.Where(r => r.StudentId == student.Id && ids.Contains(r.AttendanceSessionId)).ToList();
        var attendedIds = attendedRows.Select(r => r.AttendanceSessionId).ToHashSet();
        var subjects = sessions.GroupBy(s => new
            {
                s.ClassSessionId,
                s.ClassSession.SubjectCode,
                s.ClassSession.SubjectName
            })
            .Select(g =>
            {
                var attended = g.Count(s => attendedIds.Contains(s.Id));
                return new SubjectAttendanceReportResponse
                {
                    ClassSessionId = g.Key.ClassSessionId,
                    SubjectCode = g.Key.SubjectCode,
                    SubjectName = g.Key.SubjectName,
                    ClassesConducted = g.Count(),
                    ClassesAttended = attended,
                    AttendancePercentage = Percent(attended, g.Count())
                };
            }).OrderBy(s => s.SubjectName).ToList();

        var conducted = sessions.Count;
        var attendedCount = attendedIds.Count;
        var percentage = Percent(attendedCount, conducted);
        return new StudentAttendanceSummaryResponse
        {
            StudentId = student.Id,
            UserId = student.UserId,
            StudentName = student.Name,
            DepartmentId = student.DepartmentId,
            DepartmentName = student.Department.Name,
            Year = student.Year,
            Semester = student.Semester,
            Section = student.Section,
            ClassesConducted = conducted,
            ClassesAttended = attendedCount,
            AttendancePercentage = percentage,
            DefaulterThreshold = threshold,
            IsDefaulter = conducted > 0 && percentage < threshold,
            Subjects = subjects
        };
    }

    private async Task<List<int>?> ResolveDepartmentScopeAsync(
        int currentUserId, string role, int? requestedDepartmentId, CancellationToken cancellationToken)
    {
        if (role == "HOD")
        {
            var staff = await _db.Staff.AsNoTracking().FirstOrDefaultAsync(s => s.UserId == currentUserId, cancellationToken)
                ?? throw new KeyNotFoundException("HOD staff profile not found.");
            if (requestedDepartmentId.HasValue && requestedDepartmentId.Value != staff.DepartmentId)
                throw new UnauthorizedAccessException("You cannot access another department.");
            return [staff.DepartmentId];
        }
        if (role is "MANAGER" or "ADMIN")
        {
            if (requestedDepartmentId.HasValue)
            {
                var exists = await _db.Departments.AnyAsync(d => d.Id == requestedDepartmentId.Value, cancellationToken);
                if (!exists) throw new KeyNotFoundException("Department not found.");
                return [requestedDepartmentId.Value];
            }
            return null;
        }
        throw new UnauthorizedAccessException("You are not authorized to view institutional analytics.");
    }

    private async Task EnsureCanViewStudentAsync(Student student, int currentUserId, string role, CancellationToken cancellationToken)
    {
        if (role == "STUDENT")
        {
            if (student.UserId != currentUserId)
                throw new UnauthorizedAccessException("Students can only view their own attendance summary.");
            return;
        }
        if (role == "HOD")
        {
            var departmentId = await _db.Staff.AsNoTracking().Where(s => s.UserId == currentUserId)
                .Select(s => (int?)s.DepartmentId).FirstOrDefaultAsync(cancellationToken)
                ?? throw new KeyNotFoundException("HOD staff profile not found.");
            if (student.DepartmentId != departmentId)
                throw new UnauthorizedAccessException("You cannot view a student from another department.");
            return;
        }
        if (role is "MANAGER" or "ADMIN") return;
        throw new UnauthorizedAccessException("You are not authorized to view this student summary.");
    }

    private async Task<Dictionary<(int DepartmentId, int Year, int Semester, string Section), int>>
        GetCohortStudentCountsAsync(List<AttendanceSession> sessions, CancellationToken cancellationToken)
    {
        if (sessions.Count == 0) return new();
        var departments = sessions.Select(s => s.DepartmentId).Distinct().ToList();
        var students = await _db.Students.AsNoTracking()
            .Where(s => departments.Contains(s.DepartmentId))
            .Select(s => new { s.DepartmentId, s.Year, s.Semester, s.Section })
            .ToListAsync(cancellationToken);
        var counts = students.GroupBy(s => (s.DepartmentId, s.Year, s.Semester, s.Section))
            .ToDictionary(g => g.Key, g => g.Count());
        return counts;
    }

    private static int GetCohortCount(
        Dictionary<(int DepartmentId, int Year, int Semester, string Section), int> counts,
        AttendanceSession session) => counts.GetValueOrDefault((session.DepartmentId, session.Year, session.Semester, session.Section));

    private IQueryable<AttendanceSession> ClosedSessions() => _db.AttendanceSessions.AsNoTracking()
        .Where(s => s.Status == Closed || s.Status == Expired);

    private static IQueryable<AttendanceSession> ApplyDateRange(
        IQueryable<AttendanceSession> query, DateOnly? fromDate, DateOnly? toDate)
    {
        if (fromDate.HasValue) query = query.Where(s => s.SessionDate >= fromDate.Value);
        if (toDate.HasValue) query = query.Where(s => s.SessionDate <= toDate.Value);
        return query;
    }

    private static void ValidateRange(DateOnly? fromDate, DateOnly? toDate)
    {
        if (fromDate.HasValue && toDate.HasValue && fromDate.Value > toDate.Value)
            throw new ArgumentException("fromDate cannot be later than toDate.");
    }

    private static void ValidateThreshold(decimal threshold)
    {
        if (threshold <= 0 || threshold > 100)
            throw new ArgumentException("threshold must be greater than 0 and at most 100.");
    }

    private static decimal Percent(int numerator, int denominator) =>
        denominator <= 0 ? 0m : Math.Round((decimal)numerator * 100m / denominator, 2, MidpointRounding.AwayFromZero);

    private static DateOnly GetIndiaToday()
    {
        TimeZoneInfo zone;
        try { zone = TimeZoneInfo.FindSystemTimeZoneById("Asia/Kolkata"); }
        catch (TimeZoneNotFoundException) { zone = TimeZoneInfo.FindSystemTimeZoneById("India Standard Time"); }
        return DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, zone));
    }

    private static DateOnly StartOfWeek(DateOnly date)
    {
        var offset = ((int)date.DayOfWeek + 6) % 7;
        return date.AddDays(-offset);
    }
}
