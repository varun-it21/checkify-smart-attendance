using Checkify.API.DTOs.AttendanceSession;

namespace Checkify.API.Services.Interfaces;

public interface IAttendanceSessionService
{
    Task<AttendanceSessionResponse> OpenSessionAsync(
        OpenAttendanceSessionRequest request,
        int currentUserId,
        string currentUserRole,
        CancellationToken cancellationToken = default);

    Task<AttendanceSessionResponse> CloseSessionAsync(
        int sessionId,
        int currentUserId,
        string currentUserRole,
        CancellationToken cancellationToken = default);

    Task<AttendanceSessionResponse?> GetByIdAsync(
        int sessionId,
        int currentUserId,
        string currentUserRole,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<AttendanceSessionResponse>>
        GetActiveSessionsForStaffAsync(
            int currentUserId,
            CancellationToken cancellationToken = default);

    Task<IReadOnlyList<AttendanceSessionResponse>>
        GetActiveSessionsForStudentAsync(
            int currentUserId,
            CancellationToken cancellationToken = default);

    Task<IReadOnlyList<AttendanceRecordResponse>>
        GetSessionRecordsAsync(
            int sessionId,
            int currentUserId,
            string currentUserRole,
            CancellationToken cancellationToken = default);

    Task<OtpResponse> GenerateOtpAsync(
        int sessionId,
        int currentUserId,
        CancellationToken cancellationToken = default);

    Task<AttendanceRecordResponse> SubmitOtpAttendanceAsync(
        SubmitOtpAttendanceRequest request,
        int currentUserId,
        CancellationToken cancellationToken = default);

    Task<QrResponse> GenerateQrAsync(
        int sessionId,
        int currentUserId,
        CancellationToken cancellationToken = default);

    Task<AttendanceRecordResponse> SubmitQrAttendanceAsync(
        SubmitQrAttendanceRequest request,
        int currentUserId,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<AttendanceSessionResponse>>
        GetStaffSessionHistoryAsync(
            int currentUserId,
            CancellationToken cancellationToken = default);

    Task<IReadOnlyList<StudentAttendanceHistoryResponse>>
        GetStudentAttendanceHistoryAsync(
            int currentUserId,
            CancellationToken cancellationToken = default);
}

