using Checkify.API.DTOs.ClassSession;

namespace Checkify.API.Services.Interfaces;

public interface IClassSessionService
{
    // Create a timetable assignment.
    // MANAGER can assign across departments.
    // HOD can assign only within their own department.
    Task<ClassSessionResponse> CreateAsync(
        CreateClassSessionRequest request,
        int createdByUserId,
        string createdByRole,
        CancellationToken cancellationToken = default);

    // Retrieve assignments visible to the current user.
    Task<IReadOnlyList<ClassSessionResponse>> GetAllAsync(
        int currentUserId,
        string currentUserRole,
        CancellationToken cancellationToken = default);

    // Retrieve one assignment, subject to the user's department permissions.
    Task<ClassSessionResponse?> GetByIdAsync(
        int id,
        int currentUserId,
        string currentUserRole,
        CancellationToken cancellationToken = default);

    // Update an existing assignment, subject to the user's department permissions.
    Task<ClassSessionResponse> UpdateAsync(
        int id,
        UpdateClassSessionRequest request,
        int currentUserId,
        string currentUserRole,
        CancellationToken cancellationToken = default);

    // Delete an existing assignment, subject to the user's department permissions.
    Task<bool> DeleteAsync(
        int id,
        int currentUserId,
        string currentUserRole,
        CancellationToken cancellationToken = default);

    // Retrieve the timetable matching a student's department, year,
    // semester and section.
    Task<IReadOnlyList<ClassSessionResponse>> GetStudentTimetableAsync(
        int studentUserId,
        CancellationToken cancellationToken = default);

    // Retrieve the timetable belonging to a staff/HOD profile.
    Task<IReadOnlyList<ClassSessionResponse>> GetStaffTimetableAsync(
        int staffUserId,
        CancellationToken cancellationToken = default);
}

