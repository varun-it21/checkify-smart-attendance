using BCrypt.Net;
using Checkify.API.Data;
using Checkify.API.DTOs.Student;
using Checkify.API.Entities;
using Checkify.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Checkify.API.Services;

public class StudentService : IStudentService
{
    private readonly CheckifyDbContext _context;

    public StudentService(CheckifyDbContext context)
    {
        _context = context;
    }

    public async Task<StudentResponse> CreateAsync(
        AddStudentRequest request,
        CancellationToken cancellationToken = default)
    {
        // 1. Validate date of birth
        if (request.Dob.Date > DateTime.UtcNow.Date)
        {
            throw new ArgumentException(
                "Date of birth cannot be in the future.");
        }

        ValidateAcademicDetails(
            request.Year,
            request.Semester,
            request.Section);

        // 2. Normalize input
        var email = request.Email.Trim().ToLowerInvariant();
        var departmentName = request.DepartmentName.Trim();

        // 3. Check duplicate email
        var emailExists = await _context.Users
            .AsNoTracking()
            .AnyAsync(u => u.Email == email, cancellationToken);

        if (emailExists)
        {
            throw new InvalidOperationException(
                "A user with this email already exists.");
        }

        // 4. Find department
        var department = await _context.Departments
            .FirstOrDefaultAsync(
                d => d.Name == departmentName,
                cancellationToken);

        if (department is null)
        {
            throw new KeyNotFoundException(
                "The specified department was not found.");
        }

        // 5. Hash initial password
        var passwordHash = BCrypt.Net.BCrypt.HashPassword(
            request.InitialPassword,
            workFactor: 12);

        // 6. Create User
        var user = new User
        {
            Name = request.Name.Trim(),
            Email = email,
            Password = passwordHash,
            Role = "STUDENT"
        };

        // 7. Create Student profile
        var student = new Student
        {
            Name = request.Name.Trim(),
            Gender = request.Gender.Trim(),
            Dob = request.Dob.Date,
            Year = request.Year,
            Semester = request.Semester,
            Section = request.Section.Trim().ToUpperInvariant(),
            MobileNo = request.MobileNo.Trim(),

            Relation = NormalizeOptional(request.Relation),
            RelationName = NormalizeOptional(request.RelationName),
            RelationMobileNo = NormalizeOptional(request.RelationMobile),
            RelationAddress = NormalizeOptional(request.RelationAddress),

            DepartmentId = department.Id,
            User = user
        };

        // 8. Save both records atomically
        await using var transaction =
            await _context.Database.BeginTransactionAsync(
                cancellationToken);

        try
        {
            _context.Users.Add(user);
            _context.Students.Add(student);

            await _context.SaveChangesAsync(cancellationToken);

            await transaction.CommitAsync(cancellationToken);
        }
        catch (DbUpdateException ex)
        {
            await transaction.RollbackAsync(cancellationToken);

            // Handle a possible concurrent duplicate-email request.
            var duplicateEmail = await _context.Users
                .AsNoTracking()
                .AnyAsync(u => u.Email == email, cancellationToken);

            if (duplicateEmail)
            {
                throw new InvalidOperationException(
                    "A user with this email already exists.", ex);
            }

            throw;
        }

        // 9. Return safe response
        return new StudentResponse
        {
            Id = student.Id,
            UserId = user.Id,
            Name = student.Name,
            Email = user.Email,
            Gender = student.Gender,
            Dob = student.Dob,
            Year = student.Year,
            Semester = student.Semester,
            Section = student.Section,
            MobileNo = student.MobileNo,
            DepartmentName = department.Name,
            Relation = student.Relation,
            RelationName = student.RelationName,
            RelationMobile = student.RelationMobileNo,
            RelationAddress = student.RelationAddress
        };
    }

    public async Task<List<StudentResponse>> GetAllAsync(
        CancellationToken cancellationToken = default)
    {
        return await _context.Students
            .AsNoTracking()
            .OrderBy(s => s.Name)
            .Select(s => new StudentResponse
            {
                Id = s.Id,
                UserId = s.UserId,
                Name = s.Name,
                Email = s.User.Email,
                Gender = s.Gender,
                Dob = s.Dob,
                Year = s.Year,
                Semester = s.Semester,
                Section = s.Section,
                MobileNo = s.MobileNo,
                DepartmentName = s.Department.Name,
                Relation = s.Relation,
                RelationName = s.RelationName,
                RelationMobile = s.RelationMobileNo,
                RelationAddress = s.RelationAddress
            })
            .ToListAsync(cancellationToken);
    }

    public async Task<StudentResponse?> GetByIdAsync(
        int id,
        CancellationToken cancellationToken = default)
    {
        return await _context.Students
            .AsNoTracking()
            .Where(s => s.Id == id)
            .Select(s => new StudentResponse
            {
                Id = s.Id,
                UserId = s.UserId,
                Name = s.Name,
                Email = s.User.Email,
                Gender = s.Gender,
                Dob = s.Dob,
                Year = s.Year,
                Semester = s.Semester,
                Section = s.Section,
                MobileNo = s.MobileNo,
                DepartmentName = s.Department.Name,
                Relation = s.Relation,
                RelationName = s.RelationName,
                RelationMobile = s.RelationMobileNo,
                RelationAddress = s.RelationAddress
            })
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<StudentResponse> UpdateAsync(
        int id,
        UpdateStudentRequest request,
        CancellationToken cancellationToken = default)
    {
        var student = await _context.Students
            .Include(s => s.User)
            .FirstOrDefaultAsync(s => s.Id == id, cancellationToken);

        if (student is null)
        {
            throw new KeyNotFoundException("Student not found.");
        }

        if (request.Dob.Date > DateTime.UtcNow.Date)
        {
            throw new ArgumentException(
                "Date of birth cannot be in the future.");
        }

        ValidateAcademicDetails(
            request.Year,
            request.Semester,
            request.Section);

        var email = request.Email.Trim().ToLowerInvariant();
        var departmentName = request.DepartmentName.Trim();

        var emailExists = await _context.Users
            .AsNoTracking()
            .AnyAsync(
                u => u.Email == email && u.Id != student.UserId,
                cancellationToken);

        if (emailExists)
        {
            throw new InvalidOperationException(
                "A user with this email already exists.");
        }

        var department = await _context.Departments
            .FirstOrDefaultAsync(
                d => d.Name == departmentName,
                cancellationToken);

        if (department is null)
        {
            throw new KeyNotFoundException(
                "The specified department was not found.");
        }

        // Update linked User
        student.User.Name = request.Name.Trim();
        student.User.Email = email;

        // Update Student profile
        student.Name = request.Name.Trim();
        student.Gender = request.Gender.Trim();
        student.Dob = request.Dob.Date;
        student.Year = request.Year;
        student.Semester = request.Semester;
        student.Section = request.Section.Trim().ToUpperInvariant();
        student.MobileNo = request.MobileNo.Trim();
        student.DepartmentId = department.Id;
        student.Relation = NormalizeOptional(request.Relation);
        student.RelationName = NormalizeOptional(request.RelationName);
        student.RelationMobileNo = NormalizeOptional(request.RelationMobile);
        student.RelationAddress = NormalizeOptional(request.RelationAddress);

        await _context.SaveChangesAsync(cancellationToken);

        return new StudentResponse
        {
            Id = student.Id,
            UserId = student.UserId,
            Name = student.Name,
            Email = student.User.Email,
            Gender = student.Gender,
            Dob = student.Dob,
            Year = student.Year,
            Semester = student.Semester,
            Section = student.Section,
            MobileNo = student.MobileNo,
            DepartmentName = department.Name,
            Relation = student.Relation,
            RelationName = student.RelationName,
            RelationMobile = student.RelationMobileNo,
            RelationAddress = student.RelationAddress
        };
    }

    public async Task DeleteAsync(
        int id,
        CancellationToken cancellationToken = default)
    {
        var student = await _context.Students
            .Include(s => s.User)
            .FirstOrDefaultAsync(s => s.Id == id, cancellationToken);

        if (student is null)
        {
            throw new KeyNotFoundException("Student not found.");
        }

        // Prevent deleting an account linked to another profile.
        var hasStaffProfile = await _context.Staff
            .AnyAsync(
                s => s.UserId == student.UserId,
                cancellationToken);

        if (hasStaffProfile)
        {
            throw new InvalidOperationException(
                "Cannot delete this account because it is linked to a staff profile.");
        }

        await using var transaction =
            await _context.Database.BeginTransactionAsync(
                cancellationToken);

        try
        {
            _context.Students.Remove(student);
            _context.Users.Remove(student.User);

            await _context.SaveChangesAsync(cancellationToken);

            await transaction.CommitAsync(cancellationToken);
        }
        catch
        {
            await transaction.RollbackAsync(cancellationToken);
            throw;
        }
    }

    private static void ValidateAcademicDetails(
        int year,
        int semester,
        string section)
    {
        if (year < 1 || year > 4)
            throw new ArgumentException(
                "Academic year must be between 1 and 4.");

        int expectedFirstSemester = (year * 2) - 1;

        if (semester != expectedFirstSemester &&
            semester != expectedFirstSemester + 1)
        {
            throw new ArgumentException(
                $"Year {year} must have semester " +
                $"{expectedFirstSemester} or {expectedFirstSemester + 1}.");
        }

        if (string.IsNullOrWhiteSpace(section))
            throw new ArgumentException("Section is required.");
    }

    private static string? NormalizeOptional(string? value)
    {
        return string.IsNullOrWhiteSpace(value)
            ? null
            : value.Trim();
    }
}

