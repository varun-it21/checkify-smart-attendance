# Checkify – Milestone 7A Analytics API

All routes require a valid JWT. Dates use ISO format (`YYYY-MM-DD`). If `fromDate` and/or `toDate` are omitted, the report is not restricted by that side of the date range.

## Endpoints

| Method | Endpoint | Roles | Purpose |
|---|---|---|---|
| GET | `/api/analytics/dashboard` | MANAGER, HOD, ADMIN | Live student/staff/department counters, today's conducted sessions, attendance rate |
| GET | `/api/analytics/department` | MANAGER, HOD, ADMIN | Department totals and Year/Semester/Section cohort breakdown |
| GET | `/api/analytics/students/{studentId}/summary` | MANAGER, HOD, ADMIN, STUDENT | Student overall and subject-wise attendance (students can only request their own ID) |
| GET | `/api/analytics/student/summary` | STUDENT | Current student's own summary; no student ID required |
| GET | `/api/analytics/defaulters` | MANAGER, HOD, ADMIN | Students below the configured threshold (default 75%) |
| GET | `/api/analytics/staff/insights` | STAFF, HOD, MANAGER, ADMIN | Staff/department teaching and OTP-vs-QR metrics |
| GET | `/api/analytics/trends` | MANAGER, HOD, ADMIN | Daily or weekly conducted-session and attendance volume |

### Query parameters

- `fromDate`, `toDate`: inclusive date range.
- `departmentId`: optional department filter. HOD is always restricted to their own department.
- `threshold`: student summary/defaulter threshold, default `75`, valid range `(0, 100]`.
- `year`, `semester`, `section`: optional defaulter cohort filters.
- `groupBy`: `day` (default) or `week` for trends.

## Calculation rules

1. A conducted session is an attendance session with status `CLOSED` or `EXPIRED`. `OPEN` and `CANCELLED` sessions are excluded.
2. `PRESENT` and `LATE` records count as attended. A student without a record for a conducted session is counted as not attended.
3. Expected attendance is the number of currently enrolled students in the session's department/year/semester/section multiplied by the number of conducted sessions for that cohort.
4. Student attendance percentage is `attended conducted sessions / conducted eligible sessions * 100`.
5. A student is a defaulter only when at least one conducted session exists and their percentage is strictly below the threshold. A student with no conducted sessions is not flagged.
6. Division by zero returns `0%`.
7. OTP and QR adoption percentages are each calculated as a share of counted attendance records. Other methods, if present, remain outside those two categories.
8. `SessionsToday` uses the `Asia/Kolkata` calendar date while stored timestamps remain UTC.

## Authorization boundaries

- MANAGER/ADMIN can view institution-wide analytics or request a specific department.
- HOD is scoped to the department on their staff profile; requesting another department returns `403`.
- STAFF can view only their own teaching insights.
- STUDENT can view only their own student summary.
