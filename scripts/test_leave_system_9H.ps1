<#
.SYNOPSIS
    Milestone 9H - Master Comprehensive End-to-End Leave Management System Validation
.DESCRIPTION
    Validates all 8 areas of Milestone 9:
    9H.1 Database Foundation: Schema, composite indexes, foreign keys, restrict rules
    9H.2 Student Workflow: Application, validation (400), overlap prevention (409), self-cancellation
    9H.3 Staff Workflow: Application, overlap prevention (409), cross-user privacy isolation (404)
    9H.4 Approver Hierarchy: Department scoping, role hierarchy, pending review queues
    9H.5 Decision Engine: Approval, rejection, reviewer remarks, double-review idempotency (409)
    9H.6 Notification System: Automated LEAVE_APPROVED & LEAVE_REJECTED delivery
    9H.7 Attendance Integration: Automatic EXCUSED attendance generation & defaulter threshold adjustment
    9H.8 Teardown: Zero residual records verification across MySQL tables
#>

param(
    [string]$BaseUrl = "http://localhost:5006"
)

$ErrorActionPreference = "Continue"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " CHECKIFY MILESTONE 9H - MASTER COMPREHENSIVE E2E LEAVE   " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$mysqlExe = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
if (-not (Test-Path $mysqlExe)) {
    Write-Host "MySQL CLI executable not found at $mysqlExe" -ForegroundColor Red
    exit 1
}

# 0. Check or start Checkify API
$startedApi = $false
$ready = $false
try {
    $h = Invoke-RestMethod -Uri "$BaseUrl/api/health/db" -Method Get -TimeoutSec 2 -ErrorAction Stop
    if ($h.status -eq "Connected") {
        $ready = $true
        Write-Host "Checkify API already running on $BaseUrl." -ForegroundColor Green
    }
} catch { }

if (-not $ready) {
    Write-Host "Starting Checkify API..." -ForegroundColor Yellow
    $api = Start-Process -FilePath "dotnet" -ArgumentList "run --no-build --launch-profile http" -WorkingDirectory "d:\Varun\Attendance\Smart-Attendance-Management-System\backend-dotnet\Checkify.API" -PassThru
    $startedApi = $true

    for ($i = 0; $i -lt 40; $i++) {
        Start-Sleep -Seconds 1
        try {
            $h = Invoke-RestMethod -Uri "$BaseUrl/api/health/db" -Method Get -TimeoutSec 2 -ErrorAction Stop
            if ($h.status -eq "Connected") {
                $ready = $true
                break
            }
        } catch { }
    }
}

if (-not $ready) {
    Write-Host "API failed to start on $BaseUrl." -ForegroundColor Red
    if ($api -and -not $api.HasExited) { Stop-Process -Id $api.Id -Force }
    exit 1
}

$results = [System.Collections.Generic.List[PSObject]]::new()

function Add-TestResult {
    param(
        [string]$TestId,
        [string]$Area,
        [string]$Description,
        [string]$Expected,
        [string]$Actual,
        [string]$Status
    )
    $color = "Green"
    if ($Status -ne "PASS") { $color = "Red" }
    Write-Host "[$Status] $TestId ($Area): $Description" -ForegroundColor $color
    $results.Add([PSCustomObject]@{
        TestId      = $TestId
        Area        = $Area
        Description = $Description
        Expected    = $Expected
        Actual      = $Actual
        Status      = $Status
    })
}

$createdLeaveIds = [System.Collections.Generic.List[int]]::new()
$testAttendanceDate = "2026-12-10" # Thursday (matches ClassSession 7)
$createdSessionId = 0

try {
    # =============================================================
    # AREA 9H.1: DATABASE FOUNDATION & CONSTRAINTS
    # =============================================================
    # TEST-9H.1: Table existence
    $tblCheck = & $mysqlExe -u root -pSilicon123 -e "USE checkify; SHOW TABLES LIKE 'leave_requests';" -N
    $hasTable = ($tblCheck -match "leave_requests")
    $status = if ($hasTable) { "PASS" } else { "FAIL" }
    Add-TestResult "TEST-9H.1" "9H.1 Database" "leave_requests table existence" "leave_requests exists" "Table verified" $status

    # TEST-9H.2: Composite Indexes
    $idxCheck = & $mysqlExe -u root -pSilicon123 -e "USE checkify; SELECT count(DISTINCT INDEX_NAME) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = 'checkify' AND TABLE_NAME = 'leave_requests' AND INDEX_NAME IN ('IX_leave_requests_user_dates', 'IX_leave_requests_dept_status', 'IX_leave_requests_status');" -N
    $idxCount = [int]($idxCheck.Trim())
    $status = if ($idxCount -eq 3) { "PASS" } else { "FAIL" }
    Add-TestResult "TEST-9H.2" "9H.1 Database" "Composite Indexes Verification" "3 composite indexes exist" "$idxCount indexes verified" $status

    # TEST-9H.3: Foreign Keys RESTRICT
    $fkCheck = & $mysqlExe -u root -pSilicon123 -e "USE checkify; SELECT count(*) FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = 'checkify' AND TABLE_NAME = 'leave_requests' AND DELETE_RULE = 'RESTRICT';" -N
    $fkCount = [int]($fkCheck.Trim())
    $status = if ($fkCount -ge 3) { "PASS" } else { "FAIL" }
    Add-TestResult "TEST-9H.3" "9H.1 Database" "Foreign Key RESTRICT rules" ">= 3 FKs with ON DELETE RESTRICT" "$fkCount FKs verified" $status

    # =============================================================
    # LOGINS
    # =============================================================
    # Student: Arun Kumar (User 3, Dept 1)
    $studentLogin = Invoke-RestMethod -Uri "$BaseUrl/auth/login" -Method Post -Body (@{ email = "arun.kumar.student@checkify.local"; password = "TestPassword123!" } | ConvertTo-Json) -ContentType "application/json"
    $studentHeaders = @{ Authorization = "Bearer $($studentLogin.token)" }

    # Staff: Priya Sharma (User 4, Dept 1)
    $staffLogin = Invoke-RestMethod -Uri "$BaseUrl/auth/login" -Method Post -Body (@{ email = "priya.updated@checkify.local"; password = "TestPassword123!" } | ConvertTo-Json) -ContentType "application/json"
    $staffHeaders = @{ Authorization = "Bearer $($staffLogin.token)" }

    # HOD CS: Dept 1 HOD (User 9)
    $hodCsLogin = Invoke-RestMethod -Uri "$BaseUrl/auth/login" -Method Post -Body (@{ email = "hod.cs@checkify.local"; password = "TestPassword123!" } | ConvertTo-Json) -ContentType "application/json"
    $hodCsHeaders = @{ Authorization = "Bearer $($hodCsLogin.token)" }

    # HOD EE: Dept 2 HOD (User 10)
    $hodEeLogin = Invoke-RestMethod -Uri "$BaseUrl/auth/login" -Method Post -Body (@{ email = "hod.ee@checkify.local"; password = "TestPassword123!" } | ConvertTo-Json) -ContentType "application/json"
    $hodEeHeaders = @{ Authorization = "Bearer $($hodEeLogin.token)" }

    # Manager: (User 2)
    $mgrLogin = Invoke-RestMethod -Uri "$BaseUrl/auth/login" -Method Post -Body (@{ email = "manager@checkify.local"; password = "TestPassword123!" } | ConvertTo-Json) -ContentType "application/json"
    $mgrHeaders = @{ Authorization = "Bearer $($mgrLogin.token)" }

    # =============================================================
    # AREA 9H.2: STUDENT WORKFLOW & VALIDATION
    # =============================================================
    # TEST-9H.4: Valid student leave application
    $stuLeave = Invoke-RestMethod -Uri "$BaseUrl/api/leaves/apply" -Method Post -Headers $studentHeaders -Body (@{
        leaveType = "CASUAL"
        startDate = "2026-11-20"
        endDate   = "2026-11-22"
        reason    = "E2E Family Event"
    } | ConvertTo-Json) -ContentType "application/json"
    $createdLeaveIds.Add($stuLeave.id)
    $stuOk = ($stuLeave.id -gt 0 -and $stuLeave.daysCount -eq 3 -and $stuLeave.applicantRole -eq "STUDENT" -and $stuLeave.status -eq "PENDING")
    $status = if ($stuOk) { "PASS" } else { "FAIL" }
    Add-TestResult "TEST-9H.4" "9H.2 Student" "Student Leave Application (3 days CASUAL)" "HTTP 201, days=3, role=STUDENT, status=PENDING" "id=$($stuLeave.id), days=$($stuLeave.daysCount), status=$($stuLeave.status)" $status

    # TEST-9H.5: Date validation (Start > End)
    try {
        Invoke-RestMethod -Uri "$BaseUrl/api/leaves/apply" -Method Post -Headers $studentHeaders -Body (@{
            leaveType = "CASUAL"; startDate = "2026-11-25"; endDate = "2026-11-20"; reason = "Invalid dates"
        } | ConvertTo-Json) -ContentType "application/json"
        Add-TestResult "TEST-9H.5" "9H.2 Student" "Date Validation (Start > End)" "HTTP 400 Bad Request" "Unexpected Success" "FAIL"
    } catch {
        $status = if ($_.Exception.Response.StatusCode.value__ -eq 400) { "PASS" } else { "FAIL" }
        Add-TestResult "TEST-9H.5" "9H.2 Student" "Date Validation (Start > End)" "HTTP 400 Bad Request" "HTTP $($_.Exception.Response.StatusCode.value__)" $status
    }

    # TEST-9H.6: Overlap prevention (409)
    try {
        Invoke-RestMethod -Uri "$BaseUrl/api/leaves/apply" -Method Post -Headers $studentHeaders -Body (@{
            leaveType = "MEDICAL"; startDate = "2026-11-21"; endDate = "2026-11-24"; reason = "Overlapping leave"
        } | ConvertTo-Json) -ContentType "application/json"
        Add-TestResult "TEST-9H.6" "9H.2 Student" "Overlap Prevention Rejection" "HTTP 409 Conflict" "Unexpected Success" "FAIL"
    } catch {
        $status = if ($_.Exception.Response.StatusCode.value__ -eq 409) { "PASS" } else { "FAIL" }
        Add-TestResult "TEST-9H.6" "9H.2 Student" "Overlap Prevention Rejection" "HTTP 409 Conflict" "HTTP $($_.Exception.Response.StatusCode.value__)" $status
    }

    # TEST-9H.7: Self-cancellation of pending leave
    $tempLeave = Invoke-RestMethod -Uri "$BaseUrl/api/leaves/apply" -Method Post -Headers $studentHeaders -Body (@{
        leaveType = "CASUAL"; startDate = "2026-12-01"; endDate = "2026-12-02"; reason = "To be cancelled"
    } | ConvertTo-Json) -ContentType "application/json"
    $createdLeaveIds.Add($tempLeave.id)
    Invoke-RestMethod -Uri "$BaseUrl/api/leaves/$($tempLeave.id)/cancel" -Method Put -Headers $studentHeaders | Out-Null
    $cancelledCheck = Invoke-RestMethod -Uri "$BaseUrl/api/leaves/$($tempLeave.id)" -Method Get -Headers $studentHeaders
    $status = if ($cancelledCheck.status -eq "CANCELLED") { "PASS" } else { "FAIL" }
    Add-TestResult "TEST-9H.7" "9H.2 Student" "Self-Cancellation of Pending Leave" "Status transitions to CANCELLED" "status=$($cancelledCheck.status)" $status

    # =============================================================
    # AREA 9H.3: STAFF WORKFLOW & PRIVACY ISOLATION
    # =============================================================
    # TEST-9H.8: Valid staff leave application
    $staffLeave = Invoke-RestMethod -Uri "$BaseUrl/api/leaves/apply" -Method Post -Headers $staffHeaders -Body (@{
        leaveType = "MEDICAL"
        startDate = "2026-11-25"
        endDate   = "2026-11-26"
        reason    = "E2E Medical recovery"
    } | ConvertTo-Json) -ContentType "application/json"
    $createdLeaveIds.Add($staffLeave.id)
    $staffOk = ($staffLeave.id -gt 0 -and $staffLeave.daysCount -eq 2 -and $staffLeave.applicantRole -eq "STAFF" -and $staffLeave.status -eq "PENDING")
    $status = if ($staffOk) { "PASS" } else { "FAIL" }
    Add-TestResult "TEST-9H.8" "9H.3 Staff" "Staff Leave Application (2 days MEDICAL)" "HTTP 201, days=2, role=STAFF, status=PENDING" "id=$($staffLeave.id), days=$($staffLeave.daysCount), status=$($staffLeave.status)" $status

    # TEST-9H.9: Cross-user privacy isolation (404)
    try {
        Invoke-RestMethod -Uri "$BaseUrl/api/leaves/$($staffLeave.id)" -Method Get -Headers $studentHeaders
        Add-TestResult "TEST-9H.9" "9H.3 Staff" "Cross-user Privacy Isolation" "HTTP 404 Not Found" "Unexpected Success" "FAIL"
    } catch {
        $status = if ($_.Exception.Response.StatusCode.value__ -eq 404) { "PASS" } else { "FAIL" }
        Add-TestResult "TEST-9H.9" "9H.3 Staff" "Cross-user Privacy Isolation" "HTTP 404 Not Found" "HTTP $($_.Exception.Response.StatusCode.value__)" $status
    }

    # =============================================================
    # AREA 9H.4: APPROVER HIERARCHY & DEPARTMENT SCOPING
    # =============================================================
    # TEST-9H.10: HOD EE (Dept 2) pending queue isolation
    $hodEePending = Invoke-RestMethod -Uri "$BaseUrl/api/leaves/pending" -Method Get -Headers $hodEeHeaders
    $dept2Clean = ($hodEePending.totalCount -eq 0 -and $hodEePending.leaves.Count -eq 0)
    $status = if ($dept2Clean) { "PASS" } else { "FAIL" }
    Add-TestResult "TEST-9H.10" "9H.4 Scoping" "HOD EE (Dept 2) Pending Queue Isolation" "totalCount=0 (Zero cross-dept leakage)" "totalCount=$($hodEePending.totalCount)" $status

    # TEST-9H.11: HOD CS (Dept 1) sees Dept 1 pending leaves
    $hodCsPending = Invoke-RestMethod -Uri "$BaseUrl/api/leaves/pending" -Method Get -Headers $hodCsHeaders
    $hasCsLeaves = ($hodCsPending.totalCount -ge 2 -and
                    @($hodCsPending.leaves | Where-Object { $_.id -eq $stuLeave.id }).Count -eq 1 -and
                    @($hodCsPending.leaves | Where-Object { $_.id -eq $staffLeave.id }).Count -eq 1)
    $status = if ($hasCsLeaves) { "PASS" } else { "FAIL" }
    Add-TestResult "TEST-9H.11" "9H.4 Scoping" "HOD CS (Dept 1) Pending Queue Scoping" "Sees both Dept 1 pending leaves" "totalCount=$($hodCsPending.totalCount)" $status

    # TEST-9H.12: Manager global pending queue access
    $mgrPending = Invoke-RestMethod -Uri "$BaseUrl/api/leaves/pending" -Method Get -Headers $mgrHeaders
    $mgrOk = ($mgrPending.totalCount -ge 2)
    $status = if ($mgrOk) { "PASS" } else { "FAIL" }
    Add-TestResult "TEST-9H.12" "9H.4 Scoping" "Manager Global Pending Queue Access" "totalCount >= 2 across departments" "totalCount=$($mgrPending.totalCount)" $status

    # =============================================================
    # AREA 9H.5: DECISION ENGINE & IDEMPOTENCY
    # =============================================================
    # TEST-9H.13: HOD CS Approves Student Leave
    $approvedStu = Invoke-RestMethod -Uri "$BaseUrl/api/leaves/$($stuLeave.id)/review" -Method Put -Headers $hodCsHeaders -Body (@{
        status = "APPROVED"; reviewerRemarks = "Approved by HOD CS"
    } | ConvertTo-Json) -ContentType "application/json"
    $appOk = ($approvedStu.status -eq "APPROVED" -and $approvedStu.reviewerUserId -eq 9)
    $status = if ($appOk) { "PASS" } else { "FAIL" }
    Add-TestResult "TEST-9H.13" "9H.5 Decision" "HOD CS Approves Student Leave" "status=APPROVED, reviewer=9" "status=$($approvedStu.status), reviewer=$($approvedStu.reviewerUserId)" $status

    # TEST-9H.14: HOD CS Rejects Staff Leave
    $rejectedStaff = Invoke-RestMethod -Uri "$BaseUrl/api/leaves/$($staffLeave.id)/review" -Method Put -Headers $hodCsHeaders -Body (@{
        status = "REJECTED"; reviewerRemarks = "Exam duty scheduled"
    } | ConvertTo-Json) -ContentType "application/json"
    $rejOk = ($rejectedStaff.status -eq "REJECTED" -and $rejectedStaff.reviewerUserId -eq 9)
    $status = if ($rejOk) { "PASS" } else { "FAIL" }
    Add-TestResult "TEST-9H.14" "9H.5 Decision" "HOD CS Rejects Staff Leave" "status=REJECTED, reviewer=9" "status=$($rejectedStaff.status), reviewer=$($rejectedStaff.reviewerUserId)" $status

    # TEST-9H.15: Double-review idempotency prevention (409)
    try {
        Invoke-RestMethod -Uri "$BaseUrl/api/leaves/$($stuLeave.id)/review" -Method Put -Headers $hodCsHeaders -Body (@{
            status = "APPROVED"; reviewerRemarks = "Duplicate review attempt"
        } | ConvertTo-Json) -ContentType "application/json"
        Add-TestResult "TEST-9H.15" "9H.5 Decision" "Double Review Idempotency Prevention" "HTTP 409 Conflict" "Unexpected Success" "FAIL"
    } catch {
        $status = if ($_.Exception.Response.StatusCode.value__ -eq 409) { "PASS" } else { "FAIL" }
        Add-TestResult "TEST-9H.15" "9H.5 Decision" "Double Review Idempotency Prevention" "HTTP 409 Conflict" "HTTP $($_.Exception.Response.StatusCode.value__)" $status
    }

    # =============================================================
    # AREA 9H.6: NOTIFICATION INTEGRATION
    # =============================================================
    # TEST-9H.16: Student receives LEAVE_APPROVED notification
    $studentNotifs = Invoke-RestMethod -Uri "$BaseUrl/api/notifications?limit=20" -Method Get -Headers $studentHeaders
    $hasAppNotif = @($studentNotifs.notifications | Where-Object { $_.type -eq "LEAVE_APPROVED" -and $_.referenceId -eq $stuLeave.id }).Count -ge 1
    $status = if ($hasAppNotif) { "PASS" } else { "FAIL" }
    Add-TestResult "TEST-9H.16" "9H.6 Notifs" "Student Receives LEAVE_APPROVED Notification" "Notification type LEAVE_APPROVED" "Received=$hasAppNotif" $status

    # TEST-9H.17: Staff receives LEAVE_REJECTED notification
    $staffNotifs = Invoke-RestMethod -Uri "$BaseUrl/api/notifications?limit=20" -Method Get -Headers $staffHeaders
    $hasRejNotif = @($staffNotifs.notifications | Where-Object { $_.type -eq "LEAVE_REJECTED" -and $_.referenceId -eq $staffLeave.id }).Count -ge 1
    $status = if ($hasRejNotif) { "PASS" } else { "FAIL" }
    Add-TestResult "TEST-9H.17" "9H.6 Notifs" "Staff Receives LEAVE_REJECTED Notification" "Notification type LEAVE_REJECTED" "Received=$hasRejNotif" $status

    # =============================================================
    # AREA 9H.7: ATTENDANCE EXCUSAL & DEFAULTER ADJUSTMENT
    # =============================================================
    # Setup: Student Arun applies & gets approved for $testAttendanceDate
    $attLeave = Invoke-RestMethod -Uri "$BaseUrl/api/leaves/apply" -Method Post -Headers $studentHeaders -Body (@{
        leaveType = "MEDICAL"; startDate = $testAttendanceDate; endDate = $testAttendanceDate; reason = "Excused session day"
    } | ConvertTo-Json) -ContentType "application/json"
    $createdLeaveIds.Add($attLeave.id)
    Invoke-RestMethod -Uri "$BaseUrl/api/leaves/$($attLeave.id)/review" -Method Put -Headers $hodCsHeaders -Body (@{
        status = "APPROVED"; reviewerRemarks = "Approved medical excusal"
    } | ConvertTo-Json) -ContentType "application/json" | Out-Null

    # Staff conducts session 7 on $testAttendanceDate and closes it
    $openRes = Invoke-RestMethod -Uri "$BaseUrl/api/staff/attendance/open" -Method Post -Headers $staffHeaders -Body (@{
        classSessionId = 7; sessionDate = $testAttendanceDate
    } | ConvertTo-Json) -ContentType "application/json"
    $createdSessionId = $openRes.id

    $closeRes = Invoke-RestMethod -Uri "$BaseUrl/api/staff/attendance/$createdSessionId/close" -Method Post -Headers $staffHeaders

    # TEST-9H.18: Auto EXCUSED attendance record created
    $sqlExcused = & $mysqlExe -u root -pSilicon123 -e "USE checkify; SELECT status, method FROM attendance_records WHERE attendance_session_id = $createdSessionId AND student_id = 1;"
    $excusedText = ($sqlExcused -join " ")
    $isExcusedOk = ($excusedText -match "EXCUSED" -and $excusedText -match "SYSTEM")
    $status = if ($isExcusedOk) { "PASS" } else { "FAIL" }
    Add-TestResult "TEST-9H.18" "9H.7 Attendance" "Auto-Creation of EXCUSED Record for Approved Leave" "status=EXCUSED, method=SYSTEM" "Record: $excusedText" $status

    # TEST-9H.19: Zero false defaulter alert for excused session
    $stuNotifsAfter = Invoke-RestMethod -Uri "$BaseUrl/api/notifications?limit=20" -Method Get -Headers $studentHeaders
    $hasFalseWarning = @($stuNotifsAfter.notifications | Where-Object { $_.type -eq "DEFAULTER_WARNING" -and $_.referenceId -eq $createdSessionId }).Count -gt 0
    $status = if (-not $hasFalseWarning) { "PASS" } else { "FAIL" }
    Add-TestResult "TEST-9H.19" "9H.7 Attendance" "Defaulter Adjustment: No False Alert for Excused Student" "0 DEFAULTER_WARNING alerts for session" "False alert: $hasFalseWarning" $status

    # =============================================================
    # AREA 9H.8: TEARDOWN & DATABASE INTEGRITY
    # =============================================================
    if ($createdSessionId -gt 0) {
        & $mysqlExe -u root -pSilicon123 -e "USE checkify; DELETE FROM attendance_records WHERE attendance_session_id = $createdSessionId; DELETE FROM attendance_sessions WHERE id = $createdSessionId;"
    }
    if ($createdLeaveIds.Count -gt 0) {
        $idList = ($createdLeaveIds -join ",")
        & $mysqlExe -u root -pSilicon123 -e "USE checkify; DELETE FROM notifications WHERE reference_id IN ($idList) AND type IN ('LEAVE_SUBMITTED', 'LEAVE_APPROVED', 'LEAVE_REJECTED'); DELETE FROM leave_requests WHERE id IN ($idList);"
    }

    $residueSessions = & $mysqlExe -u root -pSilicon123 -e "USE checkify; SELECT count(*) FROM attendance_sessions WHERE session_date = '$testAttendanceDate';" -N
    $resSessCount = [int]($residueSessions.Trim())

    $residueLeaves = & $mysqlExe -u root -pSilicon123 -e "USE checkify; SELECT count(*) FROM leave_requests WHERE reason LIKE 'E2E%';" -N
    $resLeaveCount = [int]($residueLeaves.Trim())

    $zeroResidue = ($resSessCount -eq 0 -and $resLeaveCount -eq 0)
    $status = if ($zeroResidue) { "PASS" } else { "FAIL" }
    Add-TestResult "TEST-9H.20" "9H.8 Teardown" "Zero Residual Database Records Verification" "0 residual sessions and leaves" "Residual: Sessions=$resSessCount, Leaves=$resLeaveCount" $status

} finally {
    if ($createdSessionId -gt 0) {
        & $mysqlExe -u root -pSilicon123 -e "USE checkify; DELETE FROM attendance_records WHERE attendance_session_id = $createdSessionId; DELETE FROM attendance_sessions WHERE id = $createdSessionId;"
    }
    if ($createdLeaveIds.Count -gt 0) {
        $idList = ($createdLeaveIds -join ",")
        & $mysqlExe -u root -pSilicon123 -e "USE checkify; DELETE FROM notifications WHERE reference_id IN ($idList) AND type IN ('LEAVE_SUBMITTED', 'LEAVE_APPROVED', 'LEAVE_REJECTED'); DELETE FROM leave_requests WHERE id IN ($idList);"
    }

    if ($startedApi) {
        if ($api -and -not $api.HasExited) {
            Stop-Process -Id $api.Id -Force -ErrorAction SilentlyContinue
        }
        Get-Process -Name "Checkify.API" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    }
}

Write-Host "`n==========================================================" -ForegroundColor Cyan
Write-Host "                SUMMARY REPORT RESULTS                   " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
$passCount = ($results | Where-Object { $_.Status -eq "PASS" }).Count
$failCount = ($results | Where-Object { $_.Status -eq "FAIL" }).Count
$summaryColor = if ($failCount -eq 0) { "Green" } else { "Red" }
Write-Host "Total Tests: $($results.Count) | Passed: $passCount | Failed: $failCount" -ForegroundColor $summaryColor

$results | Format-Table -Property TestId, Area, Description, Status, Expected, Actual -AutoSize

if ($failCount -ne 0) {
    exit 1
}
