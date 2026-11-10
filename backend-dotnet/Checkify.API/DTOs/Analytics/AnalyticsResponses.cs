namespace Checkify.API.DTOs.Analytics;

public class DashboardStatsResponse
{
    public int StudentCount { get; set; }
    public int StaffCount { get; set; }
    public int DepartmentCount { get; set; }
    public int SessionsToday { get; set; }
    public int TotalSessionsInRange { get; set; }
    public int TotalAttendanceRecords { get; set; }
    public int ExpectedAttendanceCount { get; set; }
    public decimal AttendancePercentage { get; set; }
    public DateOnly? FromDate { get; set; }
    public DateOnly? ToDate { get; set; }
}

public class SubjectAttendanceReportResponse
{
    public int ClassSessionId { get; set; }
    public string SubjectCode { get; set; } = string.Empty;
    public string SubjectName { get; set; } = string.Empty;
    public int ClassesConducted { get; set; }
    public int ClassesAttended { get; set; }
    public decimal AttendancePercentage { get; set; }
}

public class StudentAttendanceSummaryResponse
{
    public int StudentId { get; set; }
    public int UserId { get; set; }
    public string StudentName { get; set; } = string.Empty;
    public string DepartmentName { get; set; } = string.Empty;
    public int DepartmentId { get; set; }
    public int Year { get; set; }
    public int Semester { get; set; }
    public string Section { get; set; } = string.Empty;
    public int ClassesConducted { get; set; }
    public int ClassesAttended { get; set; }
    public decimal AttendancePercentage { get; set; }
    public decimal DefaulterThreshold { get; set; } = 75m;
    public bool IsDefaulter { get; set; }
    public List<SubjectAttendanceReportResponse> Subjects { get; set; } = new();
}

public class DepartmentAnalyticsResponse
{
    public int? DepartmentId { get; set; }
    public string DepartmentName { get; set; } = string.Empty;
    public int StudentCount { get; set; }
    public int StaffCount { get; set; }
    public int SessionsConducted { get; set; }
    public int ExpectedAttendanceCount { get; set; }
    public int AttendanceCount { get; set; }
    public decimal AttendancePercentage { get; set; }
    public DateOnly? FromDate { get; set; }
    public DateOnly? ToDate { get; set; }
    public List<CohortAnalyticsResponse> Cohorts { get; set; } = new();
}

public class CohortAnalyticsResponse
{
    public int DepartmentId { get; set; }
    public string DepartmentName { get; set; } = string.Empty;
    public int Year { get; set; }
    public int Semester { get; set; }
    public string Section { get; set; } = string.Empty;
    public int StudentCount { get; set; }
    public int SessionsConducted { get; set; }
    public int ExpectedAttendanceCount { get; set; }
    public int AttendanceCount { get; set; }
    public decimal AttendancePercentage { get; set; }
}

public class StaffTeachingInsightsResponse
{
    public int StaffCount { get; set; }
    public int SessionsConducted { get; set; }
    public int ExpectedAttendanceCount { get; set; }
    public int AttendanceCount { get; set; }
    public decimal AttendancePercentage { get; set; }
    public int OtpAttendanceCount { get; set; }
    public int QrAttendanceCount { get; set; }
    public decimal OtpPercentage { get; set; }
    public decimal QrPercentage { get; set; }
    public DateOnly? FromDate { get; set; }
    public DateOnly? ToDate { get; set; }
    public List<StaffSubjectInsightResponse> Subjects { get; set; } = new();
}

public class StaffSubjectInsightResponse
{
    public string SubjectCode { get; set; } = string.Empty;
    public string SubjectName { get; set; } = string.Empty;
    public int SessionsConducted { get; set; }
    public int ExpectedAttendanceCount { get; set; }
    public int AttendanceCount { get; set; }
    public decimal AttendancePercentage { get; set; }
    public int OtpAttendanceCount { get; set; }
    public int QrAttendanceCount { get; set; }
}

public class AttendanceTrendPointResponse
{
    public DateOnly PeriodStart { get; set; }
    public int SessionsConducted { get; set; }
    public int AttendanceCount { get; set; }
}
