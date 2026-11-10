using Microsoft.EntityFrameworkCore;
using Checkify.API.Data;
using Checkify.API.DTOs.Department;
using Checkify.API.Services.Interfaces;

namespace Checkify.API.Services;

public class DepartmentService : IDepartmentService
{
    private readonly CheckifyDbContext _context;

    public DepartmentService(CheckifyDbContext context)
    {
        _context = context;
    }

    public async Task<List<DepartmentResponse>> GetAllAsync()
    {
        return await _context.Departments
            .AsNoTracking()
            .OrderBy(d => d.Name)
            .Select(d => new DepartmentResponse
            {
                Id = d.Id,
                Name = d.Name
            })
            .ToListAsync();
    }

    public async Task<DepartmentResponse> CreateAsync(
        CreateDepartmentRequest request)
    {
        var name = request.Name.Trim();

        var alreadyExists = await _context.Departments
            .AnyAsync(d => d.Name == name);

        if (alreadyExists)
        {
            throw new InvalidOperationException(
                "A department with this name already exists.");
        }

        var department = new Checkify.API.Entities.Department
        {
            Name = name
        };

        _context.Departments.Add(department);

        await _context.SaveChangesAsync();

        return new DepartmentResponse
        {
            Id = department.Id,
            Name = department.Name
        };
    }
}

