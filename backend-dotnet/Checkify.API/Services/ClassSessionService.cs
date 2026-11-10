using Checkify.API.Data;
using Checkify.API.DTOs.ClassSession;
using Checkify.API.Entities;
using Checkify.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Checkify.API.Services;

public class ClassSessionService : IClassSessionService
{
    private readonly CheckifyDbContext _context;

    public ClassSessionService(CheckifyDbContext context)
    {
        _context = context;
    }

    // ---------------------------------------------------------
    // CREATE CLASS SESSION
    // ---------------------------------------------------------

    public async Task<ClassSessionResponse> CreateAsync(
        CreateClassSessionRequest request,
        int createdByUserId,
        string createdByRole,
        CancellationToken cancellationToken = default)
    {
        var actor = await GetActorAsync(
            createdByUserId,
            createdByRole,
            cancellationToken);

        EnsureManagementPermission(actor);

        ValidateSchedule(
            request.Year,
            request.Semester,
            request.Section,
            request.DayOfWeek,
            request.StartTime,
            request.EndTime);

        await ValidateDepartmentAndStaffAsync(
            request.DepartmentId,
            request.StaffId,
            cancellationToken);

        // HOD can only create assignments in their own department.
        EnsureDepartmentAccess(actor, request.DepartmentId);

        await EnsureNoScheduleConflictAsync(
            request.DepartmentId,
            request.Year,
            request.Semester,
            request.Section,
            request.StaffId,
            request.DayOfWeek,
            request.StartTime,
            request.EndTime,
            null,
            cancellationToken);

        var classSession = new ClassSession
        {
            DepartmentId = request.DepartmentId,
            SubjectCode = request.SubjectCode.Trim(),
            SubjectName = request.SubjectName.Trim(),
            Year = request.Year,
            Semester = request.Semester,
            Section = request.Section.Trim().ToUpperInvariant(),
            StaffId = request.StaffId,
            DayOfWeek = request.DayOfWeek,
            StartTime = request.StartTime,
            EndTime = request.EndTime,
            RoomLocation = NormalizeOptionalText(request.RoomLocation),
            CreatedByUserId = createdByUserId,
            CreatedAt = DateTime.UtcNow
        };

        _context.ClassSessions.Add(classSession);

        await _context.SaveChangesAsync(cancellationToken);

        return await Project(_context.ClassSessions.AsNoTracking())
            .SingleAsync(
                cs => cs.Id == classSession.Id,
                cancellationToken);
    }

    // ---------------------------------------------------------
    // GET ALL CLASS SESSIONS
    // MANAGER: All departments
    // HOD: Own department only
    // ---------------------------------------------------------

    public async Task<IReadOnlyList<ClassSessionResponse>> GetAllAsync(
        int currentUserId,
        string currentUserRole,
        CancellationToken cancellationToken = default)
    {
        var actor = await GetActorAsync(
            currentUserId,
            currentUserRole,
            cancellationToken);

        EnsureManagementPermission(actor);

        var query = _context.ClassSessions.AsNoTracking();

        if (actor.User.Role == "HOD")
        {
            var departmentId = actor.Staff!.DepartmentId;

            query = query.Where(
                cs => cs.DepartmentId == departmentId);
        }

        return await Project(query)
            .OrderBy(cs => cs.DayOfWeek)
            .ThenBy(cs => cs.StartTime)
            .ToListAsync(cancellationToken);
    }

    // ---------------------------------------------------------
    // GET CLASS SESSION BY ID
    // ---------------------------------------------------------

    public async Task<ClassSessionResponse?> GetByIdAsync(
        int id,
        int currentUserId,
        string currentUserRole,
        CancellationToken cancellationToken = default)
    {
        var actor = await GetActorAsync(
            currentUserId,
            currentUserRole,
            cancellationToken);

        EnsureManagementPermission(actor);

        var query = _context.ClassSessions
            .AsNoTracking()
            .Where(cs => cs.Id == id);

        if (actor.User.Role == "HOD")
        {
            var departmentId = actor.Staff!.DepartmentId;

            query = query.Where(
                cs => cs.DepartmentId == departmentId);
        }

        return await Project(query)
            .SingleOrDefaultAsync(cancellationToken);
    }

    // ---------------------------------------------------------
    // UPDATE CLASS SESSION
    // ---------------------------------------------------------

    public async Task<ClassSessionResponse> UpdateAsync(
        int id,
        UpdateClassSessionRequest request,
        int currentUserId,
        string currentUserRole,
        CancellationToken cancellationToken = default)
    {
        var actor = await GetActorAsync(
            currentUserId,
            currentUserRole,
            cancellationToken);

        EnsureManagementPermission(actor);

        var classSession = await _context.ClassSessions
            .SingleOrDefaultAsync(
                cs => cs.Id == id,
                cancellationToken);

        if (classSession is null)
        {
            throw new KeyNotFoundException(
                "Class session was not found.");
        }

        // Prevent HOD from modifying another department's assignment.
        EnsureDepartmentAccess(actor, classSession.DepartmentId);
        EnsureDepartmentAccess(actor, request.DepartmentId);

        ValidateSchedule(
            request.Year,
            request.Semester,
            request.Section,
            request.DayOfWeek,
            request.StartTime,
            request.EndTime);

        await ValidateDepartmentAndStaffAsync(
            request.DepartmentId,
            request.StaffId,
            cancellationToken);

        // Exclude the current session from conflict detection.
        await EnsureNoScheduleConflictAsync(
            request.DepartmentId,
            request.Year,
            request.Semester,
            request.Section,
            request.StaffId,
            request.DayOfWeek,
            request.StartTime,
            request.EndTime,
            id,
            cancellationToken);

        classSession.DepartmentId = request.DepartmentId;
        classSession.SubjectCode = request.SubjectCode.Trim();
        classSession.SubjectName = request.SubjectName.Trim();
        classSession.Year = request.Year;
        classSession.Semester = request.Semester;
        classSession.Section = request.Section.Trim().ToUpperInvariant();
        classSession.StaffId = request.StaffId;
        classSession.DayOfWeek = request.DayOfWeek;
        classSession.StartTime = request.StartTime;
        classSession.EndTime = request.EndTime;
        classSession.RoomLocation =
            NormalizeOptionalText(request.RoomLocation);

        // CreatedByUserId and CreatedAt remain unchanged.

        await _context.SaveChangesAsync(cancellationToken);

        return await Project(_context.ClassSessions.AsNoTracking())
            .SingleAsync(
                cs => cs.Id == id,
                cancellationToken);
    }

    // ---------------------------------------------------------
    // DELETE CLASS SESSION
    // ---------------------------------------------------------

    public async Task<bool> DeleteAsync(
        int id,
        int currentUserId,
        string currentUserRole,
        CancellationToken cancellationToken = default)
    {
        var actor = await GetActorAsync(
            currentUserId,
            currentUserRole,
            cancellationToken);

        EnsureManagementPermission(actor);

        var classSession = await _context.ClassSessions
            .SingleOrDefaultAsync(
                cs => cs.Id == id,
                cancellationToken);

        if (classSession is null)
        {
            return false;
        }

        EnsureDepartmentAccess(actor, classSession.DepartmentId);

        _context.ClassSessions.Remove(classSession);

        await _context.SaveChangesAsync(cancellationToken);

        return true;
    }

    // ---------------------------------------------------------
    // GET STUDENT TIMETABLE
    // Matches department, year, semester and section.
    // ---------------------------------------------------------

    public async Task<IReadOnlyList<ClassSessionResponse>>
        GetStudentTimetableAsync(
            int studentUserId,
            CancellationToken cancellationToken = default)
    {
        var user = await _context.Users
            .AsNoTracking()
            .SingleOrDefaultAsync(
                u => u.Id == studentUserId,
                cancellationToken);

        if (user is null || user.Role != "STUDENT")
        {
            throw new UnauthorizedAccessException(
                "A valid student account is required.");
        }

        var student = await _context.Students
            .AsNoTracking()
            .SingleOrDefaultAsync(
                s => s.UserId == studentUserId,
                cancellationToken);

        if (student is null)
        {
            throw new KeyNotFoundException(
                "Student profile was not found.");
        }

        var section = student.Section.Trim().ToUpperInvariant();

        var query = _context.ClassSessions
            .AsNoTracking()
            .Where(cs =>
                cs.DepartmentId == student.DepartmentId &&
                cs.Year == student.Year &&
                cs.Semester == student.Semester &&
                cs.Section == section);

        return await Project(query)
            .OrderBy(cs => cs.DayOfWeek)
            .ThenBy(cs => cs.StartTime)
            .ToListAsync(cancellationToken);
    }

    // ---------------------------------------------------------
    // GET STAFF / HOD TIMETABLE
    // The parameter is the authenticated User ID, not Staff ID.
    // ---------------------------------------------------------

    public async Task<IReadOnlyList<ClassSessionResponse>>
        GetStaffTimetableAsync(
            int staffUserId,
            CancellationToken cancellationToken = default)
    {
        var user = await _context.Users
            .AsNoTracking()
            .SingleOrDefaultAsync(
                u => u.Id == staffUserId,
                cancellationToken);

        if (user is null ||
            (user.Role != "STAFF" && user.Role != "HOD"))
        {
            throw new UnauthorizedAccessException(
                "A valid staff or HOD account is required.");
        }

        var staff = await _context.Staff
            .AsNoTracking()
            .SingleOrDefaultAsync(
                s => s.UserId == staffUserId,
                cancellationToken);

        if (staff is null)
        {
            throw new KeyNotFoundException(
                "Staff profile was not found.");
        }

        var query = _context.ClassSessions
            .AsNoTracking()
            .Where(cs => cs.StaffId == staff.Id);

        return await Project(query)
            .OrderBy(cs => cs.DayOfWeek)
            .ThenBy(cs => cs.StartTime)
            .ToListAsync(cancellationToken);
    }

    // =========================================================
    // PRIVATE VALIDATION AND HELPER METHODS
    // =========================================================

    private async Task<ActorContext> GetActorAsync(
        int userId,
        string suppliedRole,
        CancellationToken cancellationToken)
    {
        var user = await _context.Users
            .AsNoTracking()
            .SingleOrDefaultAsync(
                u => u.Id == userId,
                cancellationToken);

        if (user is null)
        {
            throw new UnauthorizedAccessException(
                "Authenticated user was not found.");
        }

        // Do not trust a role passed from the controller alone.
        if (!string.Equals(
                user.Role,
                suppliedRole,
                StringComparison.OrdinalIgnoreCase))
        {
            throw new UnauthorizedAccessException(
                "User role validation failed.");
        }

        Staff? staff = null;

        if (user.Role == "HOD")
        {
            staff = await _context.Staff
                .AsNoTracking()
                .SingleOrDefaultAsync(
                    s => s.UserId == userId,
                    cancellationToken);

            if (staff is null || staff.Position != "HOD")
            {
                throw new UnauthorizedAccessException(
                    "A valid HOD staff profile is required.");
            }
        }

        return new ActorContext(user, staff);
    }

    private static void EnsureManagementPermission(
        ActorContext actor)
    {
        if (actor.User.Role != "MANAGER" &&
            actor.User.Role != "HOD" &&
            actor.User.Role != "ADMIN")
        {
            throw new UnauthorizedAccessException(
                "Only MANAGER, HOD, and ADMIN accounts can manage class sessions.");
        }
    }

    private static void EnsureDepartmentAccess(
        ActorContext actor,
        int departmentId)
    {
        if (actor.User.Role == "HOD" &&
            actor.Staff!.DepartmentId != departmentId)
        {
            throw new UnauthorizedAccessException(
                "HOD can manage class sessions only in their own department.");
        }
    }

    private static void ValidateSchedule(
        int year,
        int semester,
        string section,
        DayOfWeek dayOfWeek,
        TimeOnly startTime,
        TimeOnly endTime)
    {
        if (year is < 1 or > 4)
        {
            throw new ArgumentException(
                "Year must be between 1 and 4.");
        }

        var firstSemester = (2 * year) - 1;
        var secondSemester = 2 * year;

        if (semester != firstSemester &&
            semester != secondSemester)
        {
            throw new ArgumentException(
                $"Semester {semester} is not valid for Year {year}.");
        }

        if (string.IsNullOrWhiteSpace(section))
        {
            throw new ArgumentException(
                "Section is required.");
        }

        if ((int)dayOfWeek < 1 || (int)dayOfWeek > 6)
        {
            throw new ArgumentException(
                "Class sessions are allowed only from Monday to Saturday.");
        }

        if (startTime >= endTime)
        {
            throw new ArgumentException(
                "Start time must be earlier than end time.");
        }
    }

    private async Task ValidateDepartmentAndStaffAsync(
        int departmentId,
        int staffId,
        CancellationToken cancellationToken)
    {
        var departmentExists = await _context.Departments
            .AnyAsync(
                d => d.Id == departmentId,
                cancellationToken);

        if (!departmentExists)
        {
            throw new KeyNotFoundException(
                "Selected department was not found.");
        }

        var staff = await _context.Staff
            .AsNoTracking()
            .SingleOrDefaultAsync(
                s => s.Id == staffId,
                cancellationToken);

        if (staff is null)
        {
            throw new KeyNotFoundException(
                "Selected staff member was not found.");
        }

        if (staff.Position != "STAFF" &&
            staff.Position != "HOD")
        {
            throw new ArgumentException(
                "Assigned person must have STAFF or HOD position.");
        }

        if (staff.DepartmentId != departmentId)
        {
            throw new ArgumentException(
                "Assigned staff member must belong to the selected department.");
        }
    }

    private async Task EnsureNoScheduleConflictAsync(
        int departmentId,
        int year,
        int semester,
        string section,
        int staffId,
        DayOfWeek dayOfWeek,
        TimeOnly startTime,
        TimeOnly endTime,
        int? excludedSessionId,
        CancellationToken cancellationToken)
    {
        var normalizedSection = section.Trim().ToUpperInvariant();

        // STAFF CONFLICT:
        // One staff member cannot teach two classes at overlapping times.
        var staffConflict = await _context.ClassSessions
            .AnyAsync(cs =>
                cs.StaffId == staffId &&
                cs.DayOfWeek == dayOfWeek &&
                (!excludedSessionId.HasValue ||
                 cs.Id != excludedSessionId.Value) &&
                startTime < cs.EndTime &&
                endTime > cs.StartTime,
                cancellationToken);

        if (staffConflict)
        {
            throw new InvalidOperationException(
                "Schedule conflict: this staff member already has a class during the selected time.");
        }

        // STUDENT SECTION CONFLICT:
        // A cohort cannot attend two classes at overlapping times.
        var sectionConflict = await _context.ClassSessions
            .AnyAsync(cs =>
                cs.DepartmentId == departmentId &&
                cs.Year == year &&
                cs.Semester == semester &&
                cs.Section == normalizedSection &&
                cs.DayOfWeek == dayOfWeek &&
                (!excludedSessionId.HasValue ||
                 cs.Id != excludedSessionId.Value) &&
                startTime < cs.EndTime &&
                endTime > cs.StartTime,
                cancellationToken);

        if (sectionConflict)
        {
            throw new InvalidOperationException(
                "Schedule conflict: this student section already has a class during the selected time.");
        }
    }

    private static string? NormalizeOptionalText(string? value)
    {
        return string.IsNullOrWhiteSpace(value)
            ? null
            : value.Trim();
    }

    // Shared response projection.
    // EF Core translates this projection into SQL.
    private static IQueryable<ClassSessionResponse> Project(
        IQueryable<ClassSession> query)
    {
        return query.Select(cs => new ClassSessionResponse
        {
            Id = cs.Id,
            DepartmentId = cs.DepartmentId,
            DepartmentName = cs.Department.Name,
            SubjectCode = cs.SubjectCode,
            SubjectName = cs.SubjectName,
            Year = cs.Year,
            Semester = cs.Semester,
            Section = cs.Section,
            StaffId = cs.StaffId,
            StaffName = cs.Staff.StaffName,
            DayOfWeek = cs.DayOfWeek,
            StartTime = cs.StartTime,
            EndTime = cs.EndTime,
            RoomLocation = cs.RoomLocation,
            CreatedByUserId = cs.CreatedByUserId,
            CreatedAt = cs.CreatedAt
        });
    }

    private sealed record ActorContext(
        User User,
        Staff? Staff);
}

