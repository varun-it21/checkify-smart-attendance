# Checkify RESTful API Specification

Comprehensive API reference for the **Checkify Smart Attendance Management System**, implemented in **ASP.NET Core Web API (.NET 10)**.

---

## 1. General Conventions & Standards

- **Base URL**: `http://localhost:5006` (or `http://<server-ip>:5006`)
- **Transport**: JSON (`application/json; charset=utf-8`)
- **Authentication**: JWT Bearer token in the HTTP Authorization header:
  ```http
  Authorization: Bearer <jwt_token>
  ```
- **Date & Time**: ISO 8601 UTC format (e.g., `2026-11-10T06:00:00Z`). Date-only fields use `YYYY-MM-DD`. Time-only fields use `HH:mm:ss`.
- **Security Headers Included in Every Response**:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `X-XSS-Protection: 1; mode=block`
  - `Referrer-Policy: strict-origin-when-cross-origin`

---

## 2. Standard HTTP Status Codes

| Code | Status | Meaning |
|---|---|---|
| `200` | OK | Request succeeded and response body contains requested resource or payload |
| `201` | Created | Resource successfully created (includes created object) |
| `204` | No Content | Action executed successfully; no content returned |
| `400` | Bad Request | Validation failure, business rule breach, or malformed JSON |
| `401` | Unauthorized | Missing, invalid, or expired JWT token |
| `403` | Forbidden | Authenticated user lacks required role or department privilege |
| `404` | Not Found | Target resource does not exist |
| `409` | Conflict | Duplicate record (e.g. existing email, duplicate attendance session) |
| `429` | Too Many Requests | Rate limit exceeded (enforced on login: 50 requests/min) |
| `500` | Internal Server Error | Unhandled server exception (caught by GlobalExceptionMiddleware) |

---

## 3. Role-Based Access Control (RBAC) Matrix

Checkify enforces 5 distinct institutional roles:
1. `ADMIN`: Full institutional governance, system settings, user deactivation, password reset, audit log access.
2. `MANAGER`: Academic administration, cross-department visibility, student/staff lifecycle management.
3. `HOD` (Head of Department): Department-scoped management, class assignments, faculty timetable, leave approvals.
4. `STAFF`: Instructor duties, timetable viewing, opening/closing attendance sessions, generating OTP/QR codes.
5. `STUDENT`: Timetable viewing, active session discovery, OTP/QR attendance submission, leave applications.

---

## 4. API Endpoints by Module

### 4.1 Module 1: Authentication

#### `POST /auth/login`
Authenticates user credentials and issues a signed JWT bearer token.
- **Access**: Public (Protected by `login-policy` rate limiter: 50 req/min).
- **Request Body**:
  ```json
  {
    "email": "staff1@checkify.local",
    "password": "Password123!"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "role": "STAFF",
    "expiresAt": "2026-11-10T07:00:00Z"
  }
  ```
- **Errors**:
  - `401 Unauthorized`: `{"message": "Invalid email or password."}` or `{"message": "Your account has been deactivated. Please contact an administrator."}`
  - `429 Too Many Requests`: Triggered if rate limit is exceeded.

---

### 4.2 Module 2: Health Probes & Diagnostics

#### `GET /api/health`
Liveness probe checking if the web server process is responsive.
- **Access**: Public.
- **Response `200 OK`**:
  ```json
  {
    "status": "Healthy",
    "timestamp": "2026-11-10T06:00:00Z"
  }
  ```

#### `GET /api/health/db`
Readiness probe verifying active MySQL database connectivity.
- **Access**: Public.
- **Response `200 OK`**:
  ```json
  {
    "database": "Connected",
    "status": "Healthy",
    "timestamp": "2026-11-10T06:00:00Z"
  }
  ```

---

### 4.3 Module 3: Policy Validation Probes

#### `GET /api/access/{role}`
Test endpoints validating policy claims (`admin`, `manager`, `hod`, `staff`, `student`).
- **Access**: Specific Role Only.
- **Response `200 OK`**:
  ```json
  {
    "message": "Access granted for ADMIN policy.",
    "role": "ADMIN"
  }
  ```

---

### 4.4 Module 4: Administrative & Institutional Management

#### `GET /api/admin/settings`
Retrieves all institutional settings (attendance thresholds, OTP expiry, QR expiry).
- **Access**: `ADMIN`, `MANAGER`.
- **Response `200 OK`**:
  ```json
  [
    {
      "key": "Attendance:ThresholdPercentage",
      "value": "75",
      "category": "ATTENDANCE",
      "description": "Minimum required attendance percentage for students",
      "updatedAt": "2026-11-10T05:30:00Z"
    },
    {
      "key": "Attendance:OtpExpirationSeconds",
      "value": "60",
      "category": "SECURITY",
      "description": "OTP valid window in seconds",
      "updatedAt": "2026-11-10T05:30:00Z"
    }
  ]
  ```

#### `PUT /api/admin/settings`
Updates one or more institutional system configuration values.
- **Access**: `ADMIN`.
- **Request Body**:
  ```json
  [
    {
      "key": "Attendance:ThresholdPercentage",
      "value": "80"
    }
  ]
  ```
- **Response `200 OK`**: Returns updated settings array.

#### `GET /api/admin/audit-logs`
Paginated query of the immutable audit trail.
- **Access**: `ADMIN`.
- **Query Parameters**:
  - `pageNumber` (int, default: 1)
  - `pageSize` (int, default: 20, max: 100)
  - `action` (optional string, e.g. `USER_LOGIN`)
  - `entityName` (optional string, e.g. `User`)
- **Response `200 OK`**:
  ```json
  {
    "items": [
      {
        "id": 101,
        "userId": 1,
        "action": "SETTING_UPDATED",
        "entityName": "SystemSetting",
        "entityId": "Attendance:ThresholdPercentage",
        "details": "Changed value to 80",
        "ipAddress": "127.0.0.1",
        "timestamp": "2026-11-10T05:35:00Z"
      }
    ],
    "totalCount": 101,
    "pageNumber": 1,
    "pageSize": 20
  }
  ```

#### `GET /api/admin/users`
Lists user accounts with role and status filtering.
- **Access**: `ADMIN`.
- **Query Parameters**: `pageNumber`, `pageSize`, `role`, `search`, `isActive`.
- **Response `200 OK`**: Paginated user profiles.

#### `PUT /api/admin/users/{id}/role`
Updates a user's system role.
- **Access**: `ADMIN`.
- **Request Body**: `{"role": "HOD"}`
- **Response `200 OK`**: `{"message": "User role updated successfully."}`

#### `PUT /api/admin/users/{id}/reset-password`
Forces an administrative password reset for a target user.
- **Access**: `ADMIN`.
- **Request Body**: `{"newPassword": "NewSecurePassword123!"}`
- **Response `200 OK`**: `{"message": "Password reset successfully."}`

#### `PUT /api/admin/users/{id}/status`
Activates or deactivates an institutional account.
- **Access**: `ADMIN`.
- **Request Body**: `{"isActive": false}`
- **Response `200 OK`**: `{"message": "User status updated successfully."}`

---

### 4.5 Module 5: Department Management

#### `GET /manager/departments`
Lists all academic departments.
- **Access**: `MANAGER`, `HOD`, `ADMIN`.
- **Response `200 OK`**:
  ```json
  [
    {
      "id": 1,
      "name": "Computer Science and Engineering"
    }
  ]
  ```

#### `POST /manager/departments`
Creates a new department.
- **Access**: `MANAGER`, `ADMIN`.
- **Request Body**: `{"name": "Electronics & Communication"}`
- **Response `201 Created`**: Returns created department entity.

---

### 4.6 Module 6: Student Management

#### `POST /manager/add-student`
Registers a new student profile and provisions login credentials.
- **Access**: `MANAGER`, `ADMIN`.
- **Request Body**:
  ```json
  {
    "name": "Jane Doe",
    "email": "jane.doe@college.edu",
    "initialPassword": "Password123!",
    "gender": "Female",
    "dob": "2004-05-15",
    "year": 2,
    "semester": 4,
    "section": "A",
    "mobileNo": "9876543210",
    "departmentId": 1,
    "relation": "Father",
    "relationName": "John Doe",
    "relationMobileNo": "9876543211",
    "relationAddress": "123 Campus Lane"
  }
  ```
- **Response `201 Created`**: Returns created student profile.

#### `GET /manager/get-students`
Retrieves all registered students.
- **Access**: `MANAGER`, `ADMIN`.

#### `GET /manager/get-student/{id}`
Retrieves a specific student by ID.
- **Access**: `MANAGER`, `ADMIN`.

#### `PUT /manager/update-student/{id}`
Updates a student profile.
- **Access**: `MANAGER`, `ADMIN`.

#### `DELETE /manager/delete-student/{id}`
Deletes student record and associated user credentials.
- **Access**: `MANAGER`, `ADMIN`.
- **Response `200 OK`**: `{"message": "Student deleted successfully."}`

---

### 4.7 Module 7: Faculty & Staff Management

#### `POST /manager/add-staff`
Creates a staff profile, sets role (`STAFF` or `HOD`), and initializes login account.
- **Access**: `MANAGER`, `ADMIN`.
- **Request Body**:
  ```json
  {
    "staffName": "Dr. Alan Turing",
    "email": "turing@college.edu",
    "initialPassword": "Password123!",
    "mobileNumber": "9876543220",
    "experience": 8.5,
    "specialization": "Algorithms",
    "gender": "Male",
    "address": "45 Science Block",
    "departmentId": 1,
    "position": "Assistant Professor"
  }
  ```
- **Response `201 Created`**: Created staff profile.

#### `GET /manager/get-staffs`
Retrieves staff members.
- **Access**: `MANAGER`, `HOD`, `ADMIN`.

#### `GET /manager/get-staff/{id}`
Retrieves specific staff member by ID.
- **Access**: `MANAGER`, `HOD`, `ADMIN`.

#### `PUT /manager/update-staff/{id}`
Updates faculty profile.
- **Access**: `MANAGER`, `ADMIN`.

#### `DELETE /manager/delete-staff/{id}`
Deletes staff record and user credentials.
- **Access**: `MANAGER`, `ADMIN`.

---

### 4.8 Module 8: Timetable & Class Sessions

#### `POST /hod/assign-staff`
Schedules a recurring class slot and assigns faculty.
- **Access**: `MANAGER`, `HOD`, `ADMIN`.
- **Request Body**:
  ```json
  {
    "departmentId": 1,
    "subjectCode": "CS301",
    "subjectName": "Data Structures",
    "year": 2,
    "semester": 4,
    "section": "A",
    "staffId": 12,
    "dayOfWeek": 1,
    "startTime": "09:00:00",
    "endTime": "10:00:00",
    "roomLocation": "Hall B-101"
  }
  ```
- **Response `201 Created`**: Created class session.
- **Errors**: `400 Bad Request` if staff schedule clashes on that day/time.

#### `GET /hod/assigned-classes`
Retrieves scheduled classes with optional filters (`departmentId`, `year`, `section`, `dayOfWeek`).
- **Access**: `MANAGER`, `HOD`, `ADMIN`.

#### `GET /student/timetable`
Returns current student's weekly timetable based on their department, year, semester, section.
- **Access**: `STUDENT`.

#### `GET /staff/timetable`
Returns scheduled classes assigned to the requesting faculty member.
- **Access**: `STAFF`, `HOD`.

---

### 4.9 Module 9: Attendance Session & Verification Engine

#### `POST /api/staff/attendance/open` (also `/staff/attendance/open`)
Opens a live attendance session for a class slot.
- **Access**: `STAFF`, `HOD`.
- **Request Body**:
  ```json
  {
    "classSessionId": 5,
    "sessionDate": "2026-11-10"
  }
  ```
- **Response `201 Created`**: Returns attendance session object.
- **Errors**: `409 Conflict` if session already opened for this class on this date.

#### `POST /api/staff/attendance/{id}/close` (also `/staff/attendance/{id}/close`)
Closes an open attendance session and records absentees.
- **Access**: `STAFF`, `HOD`.

#### `POST /api/staff/attendance/{id}/otp`
Generates a time-limited 6-digit numeric OTP.
- **Access**: `STAFF`, `HOD`.
- **Response `200 OK`**:
  ```json
  {
    "sessionId": 10,
    "otp": "481923",
    "expiresAt": "2026-11-10T06:05:00Z",
    "expiresInSeconds": 60
  }
  ```

#### `POST /api/staff/attendance/{id}/qr`
Generates a cryptographically signed, rotating QR code token payload.
- **Access**: `STAFF`, `HOD`.
- **Response `200 OK`**:
  ```json
  {
    "sessionId": 10,
    "qrToken": "eyJhbGciOiJIUzI1NiIsIn...",
    "expiresAt": "2026-11-10T06:01:15Z",
    "expiresInSeconds": 15
  }
  ```

#### `GET /api/staff/attendance/active`
Retrieves currently open attendance session for the faculty member.
- **Access**: `STAFF`, `HOD`.

#### `GET /api/student/attendance/active`
Discovers live open attendance sessions matching the student's cohort.
- **Access**: `STUDENT`.

#### `POST /api/student/attendance/submit-otp`
Submits OTP code for verification.
- **Access**: `STUDENT`.
- **Request Body**:
  ```json
  {
    "sessionId": 10,
    "otp": "481923"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "status": "PRESENT",
    "method": "OTP",
    "message": "Attendance marked successfully."
  }
  ```
- **Errors**:
  - `400 Bad Request`: Invalid OTP or expired OTP.
  - `429 Too Many Requests`: Account locked after 3 consecutive failed attempts.

#### `POST /api/student/attendance/submit-qr`
Submits dynamic QR token for verification.
- **Access**: `STUDENT`.
- **Request Body**:
  ```json
  {
    "sessionId": 10,
    "qrToken": "eyJhbGciOiJIUzI1NiIsIn..."
  }
  ```
- **Response `200 OK`**: Attendance confirmed as `PRESENT` via `QR`.

---

### 4.10 Module 10: Leave Management & Attendance Excusal

#### `POST /api/leaves/apply`
Submits formal absence request.
- **Access**: Authenticated (`STUDENT`, `STAFF`, `HOD`).
- **Request Body**:
  ```json
  {
    "leaveType": "MEDICAL",
    "startDate": "2026-11-11",
    "endDate": "2026-11-12",
    "reason": "Viral fever recovery"
  }
  ```
- **Response `201 Created`**: Created leave request.

#### `GET /api/leaves/my`
Retrieves logged-in user's leave application history.
- **Access**: Authenticated.

#### `GET /api/leaves/pending`
Returns pending leave applications within the user's department scope.
- **Access**: `HOD`, `MANAGER`, `ADMIN`.

#### `PUT /api/leaves/{id}/review`
Reviews leave request. When status is `APPROVED`, automatically updates existing `ABSENT` attendance records within the date range to `EXCUSED`.
- **Access**: `HOD`, `MANAGER`, `ADMIN`.
- **Request Body**:
  ```json
  {
    "status": "APPROVED",
    "remarks": "Approved with medical certificate verified."
  }
  ```
- **Response `200 OK`**: Updated leave request with excusal summary.

---

### 4.11 Module 11: Notification Center

#### `GET /api/notifications`
Retrieves notification inbox for the authenticated user.
- **Access**: Authenticated.
- **Response `200 OK`**: List of notifications.

#### `GET /api/notifications/unread-count`
Returns the count of unread notifications for badge rendering.
- **Access**: Authenticated.
- **Response `200 OK`**: `{"unreadCount": 3}`

#### `PUT /api/notifications/{id}/read`
Marks single notification as read.
- **Access**: Authenticated.

#### `PUT /api/notifications/mark-all-read`
Marks all notifications as read for current user.
- **Access**: Authenticated.

#### `DELETE /api/notifications/{id}`
Deletes a notification from user inbox.
- **Access**: Authenticated.

---

### 4.12 Module 12: Analytics & Institutional Reporting

#### `GET /api/analytics/dashboard`
High-level summary of total students, overall attendance rate, and daily class counts.
- **Access**: `MANAGER`, `HOD`, `ADMIN`.

#### `GET /api/analytics/department`
Department-by-department attendance percentage comparison.
- **Access**: `MANAGER`, `HOD`, `ADMIN`.

#### `GET /api/analytics/student/summary`
Current student's personal attendance metrics across all enrolled subjects.
- **Access**: `STUDENT`.

#### `GET /api/analytics/students/{studentId}/summary`
Individual student attendance breakdown.
- **Access**: `MANAGER`, `HOD`, `ADMIN`, `STUDENT`.

#### `GET /api/analytics/defaulters`
List of students whose attendance percentage falls below the institutional threshold (dynamically read from `SystemSettings`).
- **Access**: `MANAGER`, `HOD`, `ADMIN`.
- **Query Parameters**: `departmentId` (optional).

#### `GET /api/analytics/staff/insights`
Faculty performance metrics and class-level attendance averages.
- **Access**: `STAFF`, `HOD`, `MANAGER`, `ADMIN`.

#### `GET /api/analytics/trends`
Multi-day attendance trends (7-day and 30-day rolling averages).
- **Access**: `MANAGER`, `HOD`, `ADMIN`.

