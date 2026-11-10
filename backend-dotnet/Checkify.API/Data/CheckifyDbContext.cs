using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using Checkify.API.Entities;

namespace Checkify.API.Data;

public class CheckifyDbContext : DbContext
{
    public CheckifyDbContext(DbContextOptions<CheckifyDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<Department> Departments => Set<Department>();
    public DbSet<Student> Students => Set<Student>();
    public DbSet<Staff> Staff => Set<Staff>();
    public DbSet<ClassSession> ClassSessions => Set<ClassSession>();
    public DbSet<AttendanceSession> AttendanceSessions => Set<AttendanceSession>();
    public DbSet<AttendanceRecord> AttendanceRecords => Set<AttendanceRecord>();
    public DbSet<AttendanceOtpAttempt> AttendanceOtpAttempts => Set<AttendanceOtpAttempt>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<LeaveRequest> LeaveRequests => Set<LeaveRequest>();
    public DbSet<SystemSetting> SystemSettings => Set<SystemSetting>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // ---------------------------------------------------------
        // UTC DateTime configuration
        // MySQL DATETIME does not preserve DateTimeKind.
        // All application DateTime values are stored as UTC.
        // Restore DateTimeKind.Utc whenever values are read.
        // ---------------------------------------------------------

        var utcDateTimeConverter = new ValueConverter<DateTime, DateTime>(
            value => DateTime.SpecifyKind(value, DateTimeKind.Utc),
            value => DateTime.SpecifyKind(value, DateTimeKind.Utc));

        var nullableUtcDateTimeConverter =
            new ValueConverter<DateTime?, DateTime?>(
                value => value.HasValue
                    ? DateTime.SpecifyKind(value.Value, DateTimeKind.Utc)
                    : value,
                value => value.HasValue
                    ? DateTime.SpecifyKind(value.Value, DateTimeKind.Utc)
                    : value);

        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            foreach (var property in entityType.GetProperties())
            {
                if (property.ClrType == typeof(DateTime))
                {
                    property.SetValueConverter(utcDateTimeConverter);
                }
                else if (property.ClrType == typeof(DateTime?))
                {
                    property.SetValueConverter(nullableUtcDateTimeConverter);
                }
            }
        }

        modelBuilder.Entity<User>(entity =>
        {
            entity.ToTable("users");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Email).IsUnique();
        });

        modelBuilder.Entity<Department>(entity =>
        {
            entity.ToTable("departments");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("department_id");
            entity.HasIndex(e => e.Name)
                .IsUnique()
                .HasDatabaseName("IX_departments_name");
        });

        // Student configuration
        modelBuilder.Entity<Student>(entity =>
        {
            entity.HasIndex(s => s.UserId)
                .IsUnique();

            entity.HasOne(s => s.User)
                .WithOne(u => u.Student)
                .HasForeignKey<Student>(s => s.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(s => s.Department)
                .WithMany(d => d.Students)
                .HasForeignKey(s => s.DepartmentId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // Staff configuration
        modelBuilder.Entity<Staff>(entity =>
        {
            entity.HasIndex(s => s.UserId)
                .IsUnique();

            entity.HasOne(s => s.User)
                .WithOne(u => u.Staff)
                .HasForeignKey<Staff>(s => s.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(s => s.Department)
                .WithMany(d => d.StaffMembers)
                .HasForeignKey(s => s.DepartmentId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // Class Session configuration
        modelBuilder.Entity<ClassSession>(entity =>
        {
            entity.ToTable("class_sessions");

            entity.HasKey(cs => cs.Id);

            entity.Property(cs => cs.StartTime)
                .HasConversion(
                    t => t.ToTimeSpan(),
                    ts => TimeOnly.FromTimeSpan(ts));

            entity.Property(cs => cs.EndTime)
                .HasConversion(
                    t => t.ToTimeSpan(),
                    ts => TimeOnly.FromTimeSpan(ts));

            // Department relationship
            entity.HasOne(cs => cs.Department)
                .WithMany()
                .HasForeignKey(cs => cs.DepartmentId)
                .OnDelete(DeleteBehavior.Restrict);

            // Assigned Staff relationship
            entity.HasOne(cs => cs.Staff)
                .WithMany()
                .HasForeignKey(cs => cs.StaffId)
                .OnDelete(DeleteBehavior.Restrict);

            // Created By User relationship
            entity.HasOne(cs => cs.CreatedByUser)
                .WithMany()
                .HasForeignKey(cs => cs.CreatedByUserId)
                .OnDelete(DeleteBehavior.Restrict);

            // Student timetable lookup
            entity.HasIndex(cs => new
            {
                cs.DepartmentId,
                cs.Year,
                cs.Section,
                cs.DayOfWeek
            })
            .HasDatabaseName("IX_class_sessions_student_timetable");

            // Staff timetable and clash lookup
            entity.HasIndex(cs => new
            {
                cs.StaffId,
                cs.DayOfWeek
            })
            .HasDatabaseName("IX_class_sessions_staff_day");
        });

        // Attendance Session configuration
        modelBuilder.Entity<AttendanceSession>(entity =>
        {
            entity.ToTable("attendance_sessions");

            entity.HasKey(e => e.Id);

            entity.Property(e => e.SessionDate)
                .HasConversion(
                    d => d.ToDateTime(TimeOnly.MinValue),
                    dt => DateOnly.FromDateTime(dt));

            // ClassSession relationship
            entity.HasOne(e => e.ClassSession)
                .WithMany()
                .HasForeignKey(e => e.ClassSessionId)
                .OnDelete(DeleteBehavior.Restrict);

            // Conducting Staff relationship
            entity.HasOne(e => e.Staff)
                .WithMany()
                .HasForeignKey(e => e.StaffId)
                .OnDelete(DeleteBehavior.Restrict);

            // Department relationship
            entity.HasOne(e => e.Department)
                .WithMany()
                .HasForeignKey(e => e.DepartmentId)
                .OnDelete(DeleteBehavior.Restrict);

            // Unique index: only ONE attendance session per scheduled class per date
            entity.HasIndex(e => new
            {
                e.ClassSessionId,
                e.SessionDate
            })
            .IsUnique()
            .HasDatabaseName("IX_attendance_sessions_class_date");

            // Staff attendance history lookup
            entity.HasIndex(e => new
            {
                e.StaffId,
                e.SessionDate
            })
            .HasDatabaseName("IX_attendance_sessions_staff_date");

            // Cohort snapshot lookup
            entity.HasIndex(e => new
            {
                e.DepartmentId,
                e.Year,
                e.Semester,
                e.Section
            })
            .HasDatabaseName("IX_attendance_sessions_cohort");
        });

        // Attendance Record configuration
        modelBuilder.Entity<AttendanceRecord>(entity =>
        {
            entity.ToTable("attendance_records");

            entity.HasKey(e => e.Id);

            // AttendanceSession relationship
            entity.HasOne(e => e.AttendanceSession)
                .WithMany(s => s.Records)
                .HasForeignKey(e => e.AttendanceSessionId)
                .OnDelete(DeleteBehavior.Restrict);

            // Student relationship
            entity.HasOne(e => e.Student)
                .WithMany()
                .HasForeignKey(e => e.StudentId)
                .OnDelete(DeleteBehavior.Restrict);

            // Marked By User relationship (nullable)
            entity.HasOne(e => e.MarkedByUser)
                .WithMany()
                .HasForeignKey(e => e.MarkedByUserId)
                .OnDelete(DeleteBehavior.Restrict);

            // Unique index: each student can have only ONE record per attendance session
            entity.HasIndex(e => new
            {
                e.AttendanceSessionId,
                e.StudentId
            })
            .IsUnique()
            .HasDatabaseName("IX_attendance_records_session_student");

            // Student attendance history lookup
            entity.HasIndex(e => new
            {
                e.StudentId,
                e.MarkedAt
            })
            .HasDatabaseName("IX_attendance_records_student_date");
        });

        // Attendance OTP Attempt configuration
        modelBuilder.Entity<AttendanceOtpAttempt>(entity =>
        {
            entity.ToTable("attendance_otp_attempts");

            entity.HasKey(e => e.Id);

            entity.HasOne(e => e.AttendanceSession)
                .WithMany()
                .HasForeignKey(e => e.AttendanceSessionId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Student)
                .WithMany()
                .HasForeignKey(e => e.StudentId)
                .OnDelete(DeleteBehavior.Restrict);

            // One attempt-tracking row per student per session
            entity.HasIndex(e => new
            {
                e.AttendanceSessionId,
                e.StudentId
            })
            .IsUnique()
            .HasDatabaseName("IX_attendance_otp_attempts_session_student");

            entity.HasIndex(e => e.StudentId)
                .HasDatabaseName("IX_attendance_otp_attempts_student");
        });

        // Notification configuration
        modelBuilder.Entity<Notification>(entity =>
        {
            entity.ToTable("notifications");

            entity.HasKey(n => n.Id);

            entity.HasOne(n => n.User)
                .WithMany()
                .HasForeignKey(n => n.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(n => new
            {
                n.UserId,
                n.IsRead,
                n.CreatedAt
            })
            .HasDatabaseName("IX_notifications_user_read_created");
        });

        // Leave Request configuration
        modelBuilder.Entity<LeaveRequest>(entity =>
        {
            entity.ToTable("leave_requests");

            entity.HasKey(e => e.Id);

            entity.Property(e => e.StartDate)
                .HasConversion(
                    d => d.ToDateTime(TimeOnly.MinValue),
                    dt => DateOnly.FromDateTime(dt));

            entity.Property(e => e.EndDate)
                .HasConversion(
                    d => d.ToDateTime(TimeOnly.MinValue),
                    dt => DateOnly.FromDateTime(dt));

            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Department)
                .WithMany()
                .HasForeignKey(e => e.DepartmentId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.ReviewerUser)
                .WithMany()
                .HasForeignKey(e => e.ReviewerUserId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(e => new
            {
                e.UserId,
                e.StartDate,
                e.EndDate
            })
            .HasDatabaseName("IX_leave_requests_user_dates");

            entity.HasIndex(e => new
            {
                e.DepartmentId,
                e.Status,
                e.CreatedAt
            })
            .HasDatabaseName("IX_leave_requests_dept_status");

            entity.HasIndex(e => new
            {
                e.Status,
                e.CreatedAt
            })
            .HasDatabaseName("IX_leave_requests_status");
        });

        // System Settings configuration
        modelBuilder.Entity<SystemSetting>(entity =>
        {
            entity.ToTable("system_settings");

            entity.HasKey(e => e.Key);

            entity.HasOne(e => e.UpdatedByUser)
                .WithMany()
                .HasForeignKey(e => e.UpdatedByUserId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(e => e.Category)
                .HasDatabaseName("IX_system_settings_category");
        });

        // Audit Logs configuration
        modelBuilder.Entity<AuditLog>(entity =>
        {
            entity.ToTable("audit_logs");

            entity.HasKey(e => e.Id);

            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(e => new
            {
                e.EntityName,
                e.Timestamp
            })
            .HasDatabaseName("IX_audit_logs_entity_timestamp");

            entity.HasIndex(e => new
            {
                e.UserId,
                e.Timestamp
            })
            .HasDatabaseName("IX_audit_logs_user_timestamp");

            entity.HasIndex(e => new
            {
                e.Action,
                e.Timestamp
            })
            .HasDatabaseName("IX_audit_logs_action_timestamp");
        });
    }
}
