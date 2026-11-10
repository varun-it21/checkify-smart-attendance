using BCrypt.Net;
using Checkify.API.Data;
using Checkify.API.DTOs.Staff;
using Checkify.API.Entities;
using Checkify.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Checkify.API.Services;

public class StaffService : IStaffService
{
    private readonly CheckifyDbContext _context;

    public StaffService(CheckifyDbContext context)
    {
        _context = context;
    }

    public async Task<StaffResponse> CreateAsync(
        AddStaffRequest request,
        CancellationToken cancellationToken = default)
    {
        // 1. Normalize input
        var email = request.Email.Trim().ToLowerInvariant();
        var departmentName = request.Department.Trim();
        var position = request.Position.Trim().ToUpperInvariant();

        // 2. Validate position
        if (position != "STAFF" && position != "HOD")
        {
            throw new ArgumentException(
                "Position must be STAFF or HOD.");
        }

        // 3. Validate experience precision (database supports 1 decimal)
        if (request.Experience != decimal.Round(request.Experience, 1))
        {
            throw new ArgumentException(
                "Experience can have at most one decimal place.");
        }

        // 4. Check duplicate email
        var emailExists = await _context.Users
            .AsNoTracking()
            .AnyAsync(u => u.Email == email, cancellationToken);

        if (emailExists)
        {
            throw new InvalidOperationException(
                "A user with this email already exists.");
        }

        // 5. Find department
        var department = await _context.Departments
            .FirstOrDefaultAsync(
                d => d.Name == departmentName,
                cancellationToken);

        if (department is null)
        {
            throw new KeyNotFoundException(
                "The specified department was not found.");
        }

        // 6. Hash initial password
        var passwordHash = BCrypt.Net.BCrypt.HashPassword(
            request.InitialPassword,
            workFactor: 12);

        // 7. Create User with matching role
        var user = new User
        {
            Name = request.StaffName.Trim(),
            Email = email,
            Password = passwordHash,
            Role = position
        };

        // 8. Create Staff profile
        var staff = new Staff
        {
            StaffName = request.StaffName.Trim(),
            MobileNumber = request.MobileNumber.Trim(),
            Experience = request.Experience,
            Specialization = NormalizeOptional(request.Specialization),
            Gender = request.Gender.Trim(),
            Address = NormalizeOptional(request.Address),
            DepartmentId = department.Id,
            Position = position,
            User = user
        };

        // 9. Save atomically
        await using var transaction =
            await _context.Database.BeginTransactionAsync(
                cancellationToken);

        try
        {
            _context.Users.Add(user);
            _context.Staff.Add(staff);

            await _context.SaveChangesAsync(cancellationToken);

            await transaction.CommitAsync(cancellationToken);
        }
        catch (DbUpdateException ex)
        {
            await transaction.RollbackAsync(cancellationToken);

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

        // 10. Return safe response
        return new StaffResponse
        {
            Id = staff.Id,
            UserId = user.Id,
            StaffName = staff.StaffName,
            Email = user.Email,
            MobileNumber = staff.MobileNumber,
            Experience = staff.Experience,
            Specialization = staff.Specialization,
            Gender = staff.Gender,
            Address = staff.Address,
            DepartmentName = department.Name,
            Position = staff.Position
        };
    }

    public async Task<List<StaffResponse>> GetAllAsync(
        CancellationToken cancellationToken = default)
    {
        return await _context.Staff
            .AsNoTracking()
            .OrderBy(s => s.StaffName)
            .Select(s => new StaffResponse
            {
                Id = s.Id,
                UserId = s.UserId,
                StaffName = s.StaffName,
                Email = s.User.Email,
                MobileNumber = s.MobileNumber,
                Experience = s.Experience,
                Specialization = s.Specialization,
                Gender = s.Gender,
                Address = s.Address,
                DepartmentName = s.Department.Name,
                Position = s.Position
            })
            .ToListAsync(cancellationToken);
    }

    public async Task<StaffResponse?> GetByIdAsync(
        int id,
        CancellationToken cancellationToken = default)
    {
        return await _context.Staff
            .AsNoTracking()
            .Where(s => s.Id == id)
            .Select(s => new StaffResponse
            {
                Id = s.Id,
                UserId = s.UserId,
                StaffName = s.StaffName,
                Email = s.User.Email,
                MobileNumber = s.MobileNumber,
                Experience = s.Experience,
                Specialization = s.Specialization,
                Gender = s.Gender,
                Address = s.Address,
                DepartmentName = s.Department.Name,
                Position = s.Position
            })
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<StaffResponse> UpdateAsync(
        int id,
        UpdateStaffRequest request,
        CancellationToken cancellationToken = default)
    {
        var staff = await _context.Staff
            .Include(s => s.User)
            .FirstOrDefaultAsync(s => s.Id == id, cancellationToken);

        if (staff is null)
        {
            throw new KeyNotFoundException("Staff member not found.");
        }

        var email = request.Email.Trim().ToLowerInvariant();
        var departmentName = request.Department.Trim();

        if (request.Experience != decimal.Round(request.Experience, 1))
        {
            throw new ArgumentException(
                "Experience can have at most one decimal place.");
        }

        var emailExists = await _context.Users
            .AsNoTracking()
            .AnyAsync(
                u => u.Email == email && u.Id != staff.UserId,
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
        staff.User.Name = request.StaffName.Trim();
        staff.User.Email = email;

        // Update Staff profile
        staff.StaffName = request.StaffName.Trim();
        staff.MobileNumber = request.MobileNumber.Trim();
        staff.Experience = request.Experience;
        staff.Specialization = NormalizeOptional(request.Specialization);
        staff.Gender = request.Gender.Trim();
        staff.Address = NormalizeOptional(request.Address);
        staff.DepartmentId = department.Id;

        await _context.SaveChangesAsync(cancellationToken);

        return new StaffResponse
        {
            Id = staff.Id,
            UserId = staff.UserId,
            StaffName = staff.StaffName,
            Email = staff.User.Email,
            MobileNumber = staff.MobileNumber,
            Experience = staff.Experience,
            Specialization = staff.Specialization,
            Gender = staff.Gender,
            Address = staff.Address,
            DepartmentName = department.Name,
            Position = staff.Position
        };
    }

    public async Task DeleteAsync(
        int id,
        CancellationToken cancellationToken = default)
    {
        var staff = await _context.Staff
            .Include(s => s.User)
            .FirstOrDefaultAsync(s => s.Id == id, cancellationToken);

        if (staff is null)
        {
            throw new KeyNotFoundException("Staff member not found.");
        }

        // Prevent deleting an account linked to another profile.
        var hasStudentProfile = await _context.Students
            .AnyAsync(
                s => s.UserId == staff.UserId,
                cancellationToken);

        if (hasStudentProfile)
        {
            throw new InvalidOperationException(
                "Cannot delete this account because it is linked to a student profile.");
        }

        await using var transaction =
            await _context.Database.BeginTransactionAsync(
                cancellationToken);

        try
        {
            _context.Staff.Remove(staff);
            _context.Users.Remove(staff.User);

            await _context.SaveChangesAsync(cancellationToken);

            await transaction.CommitAsync(cancellationToken);
        }
        catch (DbUpdateException)
        {
            await transaction.RollbackAsync(cancellationToken);
            throw new InvalidOperationException(
                "This staff member cannot be deleted because they already have history in the system " +
                "(sign-ins, leave requests or attendance records) that must be preserved. " +
                "Deactivate the account instead (Admin > User Management).");
        }
        catch
        {
            await transaction.RollbackAsync(cancellationToken);
            throw;
        }
    }

    private static string? NormalizeOptional(string? value)
    {
        return string.IsNullOrWhiteSpace(value)
            ? null
            : value.Trim();
    }
}

