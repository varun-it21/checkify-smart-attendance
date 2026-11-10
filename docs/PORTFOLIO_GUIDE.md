# Checkify Portfolio & Technical Interview Guide

This guide provides professional talking points, STAR/XYZ-method resume bullets, architectural deep-dives, and technical interview questions to present **Checkify** as an enterprise-grade full-stack project in job applications and interviews.

---

## 1. 30-Second Elevator Pitch

> *"I developed Checkify, a full-stack Smart Attendance Management System using React 19, ASP.NET Core 10 and MySQL. It supports five user roles: Admin, Manager, HOD, Staff and Student. The platform includes OTP and QR-based attendance verification, timetable management, automated leave processing, notifications and analytics. I also implemented role-based authorization, transaction-level concurrency protection and automated integration testing, with 35 out of 35 reported tests passing."*

---

## 2. STAR / XYZ Resume Bullet Points

Use these ready-to-paste bullet points tailored for Full-Stack, Backend, or Frontend engineering roles:

### Full-Stack Engineering Focus
- **Architected and developed Checkify**, an academic operations and attendance platform supporting 5 role personas (Admin, Manager, HOD, Staff, Student) with **ASP.NET Core (.NET 10)**, **React 19**, and **MySQL 8.0**, achieving a **100% test pass rate across 35 automated E2E integration test suites**.
- **Engineered dual anti-proxy attendance verification engines**, featuring 60-second cryptographic QR tokens and 6-digit OTPs (5-minute validity) protected by HMAC-SHA256 peppering, per-student attempt throttling (5 attempts / 10-minute lockout), and constant-time equality comparisons (`FixedTimeEquals`) in Serializable database transactions.
- **Automated academic leave workflows and attendance excusal**, reconciling approved multi-day absences against scheduled timetable slots to automatically transform historical absent records to excused statuses.
- **Designed institutional governance and audit tracking**, implementing dynamic threshold management, audit logging with actor traceability and restricted deletion, and fixed-window rate limiting on authentication routes.

### Backend & API Engineering Focus
- **Built asynchronous REST APIs in .NET 10 Web API**, enforcing strict Role-Based Access Control (RBAC), UTC timestamp standardization, and asynchronous Entity Framework Core 10 database operations.
- **Hardened application security** by configuring BCrypt password hashing (work factor 12), JWT Bearer authentication with 30-second clock-skew tolerance, CORS lockdown, and security response headers (X-Frame-Options: DENY, X-Content-Type-Options: nosniff).
- **Optimized relational MySQL schema with 20+ composite indexes**, replacing full-table scans with index seeks on high-cardinality timetable clash queries, active attendance session discovery, and student defaulter percentage calculations.
- **Implemented robust audit logging and event tracking**, recording state transitions, role modifications, and administrative operations with actor attribution and restricted deletion policies.

### Frontend Engineering Focus
- **Created a modern, responsive single-page application (SPA) with React 19 and Tailwind CSS**, featuring role-aware dynamic navigation, multi-viewport layout drawers, and real-time notification centers.
- **Implemented resilient HTTP communication pipelines** using Axios interceptors for automatic JWT injection and automatic session expiry handling (401 re-routing and cache clearing).
- **Constructed data-dense analytics dashboards** utilizing Recharts and Chart.js, rendering interactive attendance trends, departmental comparisons, and low-attendance defaulter alerts with instant CSV report exports.

---

## 3. Key Technical Decisions & Architecture Justifications

When asked *"Why did you make this design choice?"*, use these justifications:

### Q1: Why migrate from Spring Boot to ASP.NET Core Web API (.NET 10)?
- **Answer**: *"While the initial MVP started in Spring Boot, .NET 10 offers superior out-of-the-box minimal API performance, native async/await throughout the ASP.NET Core pipeline, first-class dependency injection, and compiled LINQ queries with EF Core 10. This dramatically reduced memory footprint and eliminated JVM startup overhead during containerization."*

### Q2: Why use both OTP and QR code verification instead of just one?
- **Answer**: *"Real academic environments have diverse physical constraints. Rotating QR codes prevent proxy attendance in lecture halls (tokens rotate every 60 seconds and are verified against SHA-256 hashes in database transactions). Meanwhile, 6-digit OTPs serve as a reliable fallback when projector screens aren't available or mobile cameras fail, backed by a 5-minute validity window and strict brute-force limits (5 failed attempts trigger a 10-minute lockout per student) to preserve security."*

### Q3: Why `DeleteBehavior.Restrict` instead of `Cascade` on foreign keys?
- **Answer**: *"Academic institutions require strict historical compliance. If a faculty member or student leaves the university or their account is deactivated, deleting their user record must never wipe out historical timetable sessions, attendance logs, or audit records. The only entity configured with `Cascade` is notifications, which are transient inbox items."*

### Q4: How is leave approval reconciled with attendance?
- **Answer**: *"When an HOD or Manager approves a leave request spanning `[StartDate, EndDate]`, the backend initiates an atomic transaction that queries all `attendance_records` for that student during that date window. Any records marked `ABSENT` are updated to `EXCUSED` with an audit remark linking to the approved Leave ID. This prevents students on official medical or collegiate leave from wrongly appearing on defaulter lists."*

---

## 4. Top 10 Technical Interview Questions & Model Answers

### Q1: How do you handle concurrency and prevent duplicate attendance records when hundreds of students submit at once?
> **Answer**: *"We enforce concurrency safety at both the application and database tiers:
> 1. **Database Layer**: A composite unique index `IX_attendance_records_session_student (AttendanceSessionId, StudentId)` guarantees that the database engine rejects duplicate inserts at the storage level.
> 2. **Application Layer**: In `AttendanceSessionService`, the submission workflow executes within an explicit transaction using `IsolationLevel.Serializable`. The service performs an `AnyAsync` existence check before inserting. If an identical submission occurs concurrently, the serializable isolation level detects serialization failure, rolls back the second transaction, and throws a clean `InvalidOperationException('Your attendance has already been marked.')`."*

### Q2: Why did you implement dual verification (OTP and QR code) rather than choosing just one?
> **Answer**: *"Physical academic environments present varied infrastructure challenges. Dynamic 60-second QR codes reduce proxy attendance opportunities through short-lived cryptographic tokens, preventing students from forwarding screenshots off-campus. However, when projectors are unavailable, phone cameras are damaged, or classroom lighting is poor, a 6-digit OTP serves as a reliable fallback. 
> 
> The OTP has a 5-minute validity window and is cryptographically hashed using **HMAC-SHA256 with an application pepper**. Both OTP and QR verification use `CryptographicOperations.FixedTimeEquals` for constant-time comparisons to prevent timing side-channel attacks. A per-student rate limit enforces a 10-minute lockout after 5 consecutive failed attempts."*

### Q3: What indexing strategy was implemented to optimize query performance?
> **Answer**: *"We cataloged 21 indexes targeting specific high-traffic query patterns to ensure index seeks replace full-table scans:
> - **Timetable Clash Detection**: Composite index `IX_class_sessions_staff_day (StaffId, DayOfWeek)` enables instant index seeks when checking for overlapping class time slots.
> - **Student Timetable Lookup**: `IX_class_sessions_student_timetable (DepartmentId, Year, Section, DayOfWeek)` allows single-query weekly timetable rendering.
> - **Live Session Discovery**: `IX_attendance_sessions_cohort (DepartmentId, Year, Semester, Section)` speeds up active session checks for students.
> - **Audit Trail Queries**: Composite indexes on `(EntityName, Timestamp)` and `(UserId, Timestamp)` optimize compliance and administrative queries."*

### Q4: How does automated leave-to-attendance reconciliation operate?
> **Answer**: *"When an HOD or Manager approves a student's leave application spanning `[StartDate, EndDate]`, the backend opens an atomic database transaction. It queries all `attendance_records` for that student during that date window. Any records marked `ABSENT` are automatically updated to `EXCUSED`, and the remarks field is populated with the approved Leave ID reference. This immediately updates the student's attendance percentage, preventing them from wrongly appearing on institutional defaulter lists."*

### Q5: Why migrate the backend from Spring Boot to ASP.NET Core Web API (.NET 10)?
> **Answer**: *"While our initial prototype was in Spring Boot, migrating to ASP.NET Core (.NET 10) gave us substantial architectural and operational advantages:
> - **Performance**: Native asynchronous programming (`Task`/`ValueTask`) throughout the request pipeline, zero JVM garbage collection pauses, and compiled LINQ queries with EF Core 10.
> - **Footprint**: Greatly reduced memory footprint, enabling lightweight Docker containerization.
> - **Minimal APIs & Controllers**: First-class support for clean dependency injection, middleware pipelines, and built-in rate limiting."*

### Q6: How are authentication and token expiration handled across frontend and backend?
> **Answer**: *"The backend issues HMAC-SHA256 signed JWT tokens with a 60-minute statutory lifetime, 30-second clock-skew tolerance, and custom claims (`sub`, `email`, `name`, `role`, `jti`). 
> The React frontend manages the session via localStorage. An Axios request interceptor attaches `Authorization: Bearer <token>` to all outgoing calls. An Axios response interceptor intercepts HTTP 401 Unauthorized errors (excluding the login endpoint itself), purges cached session tokens, and executes `window.location.assign('/')` to redirect the user. Frontend `<ProtectedRoute>` wraps all dashboard pages, verifying session existence and role permissions before rendering components."*

### Q7: What is your approach to password hashing and data protection?
> **Answer**: *"Passwords are hashed using `BCrypt.Net-Next` with **Work Factor 12** ($2^{12} = 4,096$ iterations), providing robust defense against GPU-accelerated dictionary and rainbow table attacks.
> Secrets are strictly isolated: in local development, MySQL passwords and JWT keys are stored in .NET User Secrets and `.env.local` (both excluded via `.gitignore`). In production, secrets are passed via environment variables. The API also includes standard security headers on every response (`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection: 1; mode=block`, and `Referrer-Policy: strict-origin-when-cross-origin`)."*

### Q8: How did you design the audit logging system for institutional governance?
> **Answer**: *"Checkify includes an audit logging system with actor traceability and restricted deletion policy (`DeleteBehavior.Restrict`). Every administrative or sensitive action (`USER_LOGIN`, `USER_ROLE_UPDATED`, `PASSWORD_RESET`, `SETTING_UPDATED`, `LEAVE_REVIEWED`) records the actor ID (`UserId`), entity name, entity ID, human-readable details, client IP address, and UTC timestamp. Foreign keys are configured with `DeleteBehavior.Restrict` so historical audit logs are never orphaned or deleted if user accounts change."*

### Q9: What are the primary scaling bottlenecks, and how would you scale this system to 50,000 students?
> **Answer**: *"To scale Checkify from a single college to a university-wide system with 50,000 students:
> 1. **IP-Partitioned Rate Limiting**: Migrate from the single-instance fixed-window limiter to a distributed rate limiter backed by Redis.
> 2. **Distributed Caching**: Cache read-heavy, low-mutation data (departments, course timetables, system settings) in Redis with cache invalidation on write.
> 3. **Database Read Replicas**: Route analytics queries (`GET /api/analytics/*`) to read replicas while keeping write operations (OTP/QR submissions) on the primary MySQL node.
> 4. **Asynchronous Event Processing**: Decouple notification dispatching and leave reconciliation into an asynchronous message queue (e.g., RabbitMQ or Azure Service Bus) using the Transactional Outbox pattern."*

### Q10: How was this system verified and tested?
> **Answer**: *"We developed a comprehensive automated master regression test suite with **35/35 passing integration tests**. It validates:
> - Public health probes (`/api/health` and `/api/health/db`).
> - Authentication and role-based policy enforcement across all five user personas.
> - Administrative account operations, role changes, and password resets.
> - System settings persistence and dynamic attendance threshold calculations.
> - Audit log integrity and zero-password leak guarantees.
> Each test suite features automatic database teardown to ensure zero residual test data while strictly respecting foreign key constraints."*

---

## 5. Live Demo Walkthrough Script

Follow this sequence when demonstrating Checkify to interviewers or reviewers:

1. **Login & Role-Based Routing (`/`)**:
   - Log in as `admin@checkify.local`. Show automatic redirection to `/admin/dashboard`.
   - Highlight the dynamic sidebar showing administrative controls (User Management, Settings, Audit Logs).

2. **System Settings & Dynamic Thresholds (`/admin/settings`)**:
   - Show configurable settings (`Attendance:ThresholdPercentage: 75%`, `Attendance:OtpExpirationSeconds: 60`).
   - Demonstrate modifying the defaulter threshold to 80% and show instant persistence.

3. **Faculty Workflow – Session & Verification (`/staff/generate-otp`)**:
   - Switch to faculty view. Open attendance session for scheduled class.
   - Generate a 6-digit OTP; highlight the countdown timer (5-minute validity window) and expiration state.
   - Switch to QR view; highlight the 60-second rotating cryptographic payload.

4. **Student Experience – Marking & Timetable (`/student/mark-attendance`)**:
   - Switch to student view. Show the active class session auto-discovered.
   - Input the OTP; show immediate verification to `PRESENT`.
   - Navigate to `/student/view-timetable` to view the weekly schedule.

5. **Leave Processing & Excusal Workflow (`/student/leave-apply` & `/hod/leave-approve`)**:
   - Submit medical leave request for the student.
   - Log in as HOD/Manager. Navigate to `/hod/leave-approve` to view pending requests.
   - Approve the leave. Show the automatic notification dispatched to the student and verify the attendance record transitioning from `ABSENT` to `EXCUSED`.

6. **Analytics & Institutional Defaulters (`/manager/reports` & `/manager/defaulters`)**:
   - Open Reports Dashboard. Showcase attendance rate metrics, department breakdown charts, and trends.
   - Filter Defaulters List based on the 75% / 80% threshold and demonstrate the one-click CSV export.

7. **Audit & Compliance (`/admin/audit-logs`)**:
   - Return to Admin view. Show the immutable audit trail displaying exact timestamps, user attribution, action tags, and IP addresses for all operations performed in the walkthrough.

---

## 6. Security Architecture & Threat Model Deep Dive

Be prepared to discuss these two critical production security aspects in system design interviews:

### 6.1 Defense-in-Depth Secrets Management
*Why regex scanning in source code is only the first line of defense:*
- **Development vs Production Isolation**: In local development, sensitive credentials (MySQL connection string, JWT signing secret, initial admin password) are kept outside the repository using .NET `user-secrets` stored in the developer profile (`%APPDATA%\Microsoft\UserSecrets\`) and frontend `.env.local`. Both are strictly ignored by `.gitignore`.
- **Production Secret Injection**: In production, secrets must never reside in static files (`appsettings.json` or `.env`). Instead, they are passed as runtime environment variables (`ConnectionStrings__DefaultConnection`, `Jwt__Secret`) or fetched from cloud secret providers (Azure Key Vault, AWS Secrets Manager, HashiCorp Vault).
- **Git History Auditing**: Prior to publishing, repositories should undergo deep history scanning using tools such as `gitleaks` or `trufflehog` to guarantee past commits or orphaned merge branches never contained test credentials.
- **Key Rotation & Token Lifecycle**: JWT authentication in Checkify uses stateless 60-minute tokens signed with HMAC-SHA256, with account deactivation checks (`IsActive`) validated upon authentication. For enterprise deployments requiring instantaneous mid-session token revocation, an active distributed revocation blacklist (e.g. Redis cache keyed by `jti`) or refresh-token rotation can be layered onto the stateless pipeline.

### 6.2 Rate Limiting & Academic Traffic Threat Modeling
*Evaluating the 50 req/min login policy against university usage:*
- **The Challenge of Global Limiting**: Checkify currently implements a fixed-window rate limiter of 50 requests/minute on `POST /auth/login`. In a real university with thousands of students arriving simultaneously for 9:00 AM lectures, a global limiter could produce false positives, denying legitimate logins during campus rush hours.
- **The Ideal Production Architecture**: In enterprise deployments, the policy should be **IP-partitioned** using ASP.NET Core's `RateLimitPartition.GetFixedWindowLimiter(httpContext.Connection.RemoteIpAddress, ...)`.
  - Allow **5–10 requests per minute per unique client IP** to mitigate credential-stuffing and targeted brute-force attacks.
  - Employ reverse-proxy IP resolution (`X-Forwarded-For` with `KnownProxies` configuration) to differentiate individual students behind campus Wi-Fi NAT gateways.
  - Apply progressive delays or CAPTCHA challenges upon consecutive failed attempts on an individual username.

---

## 7. Role Dashboard Screenshot Capture Checklist

Capture clean, high-resolution screenshots of each role's interface to embed in portfolio presentations or GitHub README:

1. **Admin Dashboard (`/admin/dashboard` & `/admin/users`)**:
   - *Visual cues*: System health indicators, user management table with role badges, audit logs stream.
2. **Manager Dashboard (`/manager/dashboard` & `/manager/reports`)**:
   - *Visual cues*: Institutional attendance gauge, department comparison bar charts, defaulter export button.
3. **HOD Dashboard (`/hod/dashboard` & `/hod/assign-staff`)**:
   - *Visual cues*: Department class timetable grid, faculty assignment form with clash-detection badge, pending leave review cards.
4. **Staff / Faculty View (`/staff/generate-otp` & `/staff/view-attendance`)**:
   - *Visual cues*: Active session timer, rotating QR code canvas, numeric OTP display with expiration countdown.
5. **Student View (`/student/mark-attendance` & `/student/view-timetable`)**:
   - *Visual cues*: Discovered active class banner, OTP submission box, weekly timetable schedule, personal attendance percentage dial.

