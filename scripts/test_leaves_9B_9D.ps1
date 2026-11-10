<#
.SYNOPSIS
    Milestones 9B - 9D - Comprehensive Leave Management Validation Test Runner
.DESCRIPTION
    Validates:
    9B: Student leave application, date validation, overlap prevention
    9C: Staff leave application, applicant roles, cross-user privacy
    9D: Approver review queue, department isolation, approval/rejection, cancellation
    9F: Notification triggers for leave submission, approval, and rejection
    Teardown: Zero residual database records
#>

param(
    [string]$BaseUrl = "http://localhost:5006"
)

$ErrorActionPreference = "Continue"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " CHECKIFY MILESTONES 9B-9D: LEAVE MANAGEMENT VALIDATION   " -ForegroundColor Cyan
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
    $api = Start-Process -FilePath "dotnet" -ArgumentList "run --launch-profile http" -WorkingDirectory "d:\Varun\Attendance\Smart-Attendance-Management-System\backend-dotnet\Checkify.API" -PassThru
    $startedApi = $true

    for ($i = 0; $i -lt 30; $i++) {
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
        [string]$Phase,
        [string]$Description,
        [string]$Expected,
        [string]$Actual,
        [string]$Status
    )
    $color = "Green"
    if ($Status -ne "PASS") { $color = "Red" }
    Write-Host "[$Status] $TestId ($Phase) : $Description" -ForegroundColor $color
    $results.Add([PSCustomObject]@{
        TestId      = $TestId
        Phase       = $Phase
        Description = $Description
        Expected    = $Expected
        Actual      = $Actual
        Status      = $Status
    })
}

$createdLeaveIds = [System.Collections.Generic.List[int]]::new()

try {
    # 1. Logins
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

    # TEST-9B.1: Student Leave Application (2026-11-20 to 2026-11-22, 3 days)
    $studentLeaveBody = @{
        leaveType = "CASUAL"
        startDate = "2026-11-20"
        endDate   = "2026-11-22"
        reason    = "Family event out of town"
    } | ConvertTo-Json

    $studentLeave = $null
    try {
        $studentLeave = Invoke-RestMethod -Uri "$BaseUrl/api/leaves/apply" -Method Post -Headers $studentHeaders -Body $studentLeaveBody -ContentType "application/json"
        $createdLeaveIds.Add($studentLeave.id)
        $isOk = ($studentLeave.id -gt 0 -and $studentLeave.daysCount -eq 3 -and $studentLeave.applicantRole -eq "STUDENT" -and $studentLeave.status -eq "PENDING")
        $status = if ($isOk) { "PASS" } else { "FAIL" }
        Add-TestResult "TEST-9B.1" "9B" "Student Leave Application (3 days CASUAL)" "HTTP 201, daysCount=3, role=STUDENT, status=PENDING" "id=$($studentLeave.id), days=$($studentLeave.daysCount), role=$($studentLeave.applicantRole), status=$($studentLeave.status)" $status
    } catch {
        Add-TestResult "TEST-9B.1" "9B" "Student Leave Application" "HTTP 201" $_.Exception.Message "FAIL"
    }

    # TEST-9B.2: Date Validation (StartDate > EndDate)
    $invalidDatesBody = @{
        leaveType = "CASUAL"
        startDate = "2026-11-25"
        endDate   = "2026-11-20"
        reason    = "Invalid date range test"
    } | ConvertTo-Json

    try {
        Invoke-RestMethod -Uri "$BaseUrl/api/leaves/apply" -Method Post -Headers $studentHeaders -Body $invalidDatesBody -ContentType "application/json"
        Add-TestResult "TEST-9B.2" "9B" "Date Validation (Start > End)" "HTTP 400 Bad Request" "Unexpected Success" "FAIL"
    } catch {
        $status = if ($_.Exception.Response.StatusCode.value__ -eq 400) { "PASS" } else { "FAIL" }
        Add-TestResult "TEST-9B.2" "9B" "Date Validation (Start > End)" "HTTP 400 Bad Request" "HTTP $($_.Exception.Response.StatusCode.value__)" $status
    }

    # TEST-9B.3: Overlap Prevention (2026-11-21 to 2026-11-24 overlaps with 2026-11-20..22)
    $overlapBody = @{
        leaveType = "MEDICAL"
        startDate = "2026-11-21"
        endDate   = "2026-11-24"
        reason    = "Overlapping leave test"
    } | ConvertTo-Json

    try {
        Invoke-RestMethod -Uri "$BaseUrl/api/leaves/apply" -Method Post -Headers $studentHeaders -Body $overlapBody -ContentType "application/json"
        Add-TestResult "TEST-9B.3" "9B" "Overlap Prevention Rejection" "HTTP 409 Conflict" "Unexpected Success" "FAIL"
    } catch {
        $status = if ($_.Exception.Response.StatusCode.value__ -eq 409) { "PASS" } else { "FAIL" }
        Add-TestResult "TEST-9B.3" "9B" "Overlap Prevention Rejection" "HTTP 409 Conflict" "HTTP $($_.Exception.Response.StatusCode.value__)" $status
    }

    # TEST-9C.1: Staff Leave Application (2026-11-25 to 2026-11-26, 2 days MEDICAL)
    $staffLeaveBody = @{
        leaveType = "MEDICAL"
        startDate = "2026-11-25"
        endDate   = "2026-11-26"
        reason    = "Medical appointment and recovery"
    } | ConvertTo-Json

    $staffLeave = $null
    try {
        $staffLeave = Invoke-RestMethod -Uri "$BaseUrl/api/leaves/apply" -Method Post -Headers $staffHeaders -Body $staffLeaveBody -ContentType "application/json"
        $createdLeaveIds.Add($staffLeave.id)
        $isOk = ($staffLeave.id -gt 0 -and $staffLeave.daysCount -eq 2 -and $staffLeave.applicantRole -eq "STAFF" -and $staffLeave.status -eq "PENDING")
        $status = if ($isOk) { "PASS" } else { "FAIL" }
        Add-TestResult "TEST-9C.1" "9C" "Staff Leave Application (2 days MEDICAL)" "HTTP 201, daysCount=2, role=STAFF, status=PENDING" "id=$($staffLeave.id), days=$($staffLeave.daysCount), role=$($staffLeave.applicantRole), status=$($staffLeave.status)" $status
    } catch {
        Add-TestResult "TEST-9C.1" "9C" "Staff Leave Application" "HTTP 201" $_.Exception.Message "FAIL"
    }

    # TEST-9C.2: Staff Overlap Rejection
    $staffOverlapBody = @{
        leaveType = "CASUAL"
        startDate = "2026-11-24"
        endDate   = "2026-11-25"
        reason    = "Staff overlap test"
    } | ConvertTo-Json

    try {
        Invoke-RestMethod -Uri "$BaseUrl/api/leaves/apply" -Method Post -Headers $staffHeaders -Body $staffOverlapBody -ContentType "application/json"
        Add-TestResult "TEST-9C.2" "9C" "Staff Overlap Prevention Rejection" "HTTP 409 Conflict" "Unexpected Success" "FAIL"
    } catch {
        $status = if ($_.Exception.Response.StatusCode.value__ -eq 409) { "PASS" } else { "FAIL" }
        Add-TestResult "TEST-9C.2" "9C" "Staff Overlap Prevention Rejection" "HTTP 409 Conflict" "HTTP $($_.Exception.Response.StatusCode.value__)" $status
    }

    # TEST-9C.3: Get My Leaves List
    $myLeaves = Invoke-RestMethod -Uri "$BaseUrl/api/leaves/my?limit=10&offset=0" -Method Get -Headers $studentHeaders
    $hasMyLeaves = ($myLeaves.totalCount -ge 1 -and $myLeaves.pendingCount -ge 1 -and $myLeaves.leaves.Count -ge 1)
    $status = if ($hasMyLeaves) { "PASS" } else { "FAIL" }
    Add-TestResult "TEST-9C.3" "9C" "GET /api/leaves/my Pagination & Stats" "totalCount >= 1, pendingCount >= 1" "totalCount=$($myLeaves.totalCount), pending=$($myLeaves.pendingCount), items=$($myLeaves.leaves.Count)" $status

    # TEST-9C.4: Cross-user Privacy Isolation
    try {
        Invoke-RestMethod -Uri "$BaseUrl/api/leaves/$($staffLeave.id)" -Method Get -Headers $studentHeaders
        Add-TestResult "TEST-9C.4" "9C" "Cross-user Privacy Isolation" "HTTP 404 Not Found" "Unexpected Success" "FAIL"
    } catch {
        $status = if ($_.Exception.Response.StatusCode.value__ -eq 404) { "PASS" } else { "FAIL" }
        Add-TestResult "TEST-9C.4" "9C" "Cross-user Privacy Isolation" "HTTP 404 Not Found" "HTTP $($_.Exception.Response.StatusCode.value__)" $status
    }

    # TEST-9D.1: Department Scoping in Pending Queue: HOD EE (Dept 2) should see 0 leaves
    $hodEePending = Invoke-RestMethod -Uri "$BaseUrl/api/leaves/pending" -Method Get -Headers $hodEeHeaders
    $dept2Clean = ($hodEePending.totalCount -eq 0 -and $hodEePending.leaves.Count -eq 0)
    $status = if ($dept2Clean) { "PASS" } else { "FAIL" }
    Add-TestResult "TEST-9D.1" "9D" "Department Scoping: HOD EE (Dept 2) Pending Queue" "totalCount=0 (Zero cross-dept leakage)" "totalCount=$($hodEePending.totalCount), items=$($hodEePending.leaves.Count)" $status

    # TEST-9D.2: Department Scoping: HOD CS (Dept 1) sees Dept 1 pending leaves
    $hodCsPending = Invoke-RestMethod -Uri "$BaseUrl/api/leaves/pending" -Method Get -Headers $hodCsHeaders
    $hasStudentAndStaff = ($hodCsPending.totalCount -ge 2 -and
                           @($hodCsPending.leaves | Where-Object { $_.id -eq $studentLeave.id }).Count -eq 1 -and
                           @($hodCsPending.leaves | Where-Object { $_.id -eq $staffLeave.id }).Count -eq 1)
    $status = if ($hasStudentAndStaff) { "PASS" } else { "FAIL" }
    Add-TestResult "TEST-9D.2" "9D" "Department Scoping: HOD CS (Dept 1) Pending Queue" "Sees both Dept 1 pending leaves" "totalCount=$($hodCsPending.totalCount)" $status

    # TEST-9D.3: HOD CS Approves Student Leave
    $reviewStudentBody = @{
        status = "APPROVED"
        reviewerRemarks = "Approved. Keep up with class notes."
    } | ConvertTo-Json

    $approvedStudentLeave = Invoke-RestMethod -Uri "$BaseUrl/api/leaves/$($studentLeave.id)/review" -Method Put -Headers $hodCsHeaders -Body $reviewStudentBody -ContentType "application/json"
    $approveOk = ($approvedStudentLeave.status -eq "APPROVED" -and $approvedStudentLeave.reviewerUserId -eq 9 -and $approvedStudentLeave.reviewerRemarks -match "Keep up")
    $status = if ($approveOk) { "PASS" } else { "FAIL" }
    Add-TestResult "TEST-9D.3" "9D" "HOD CS Approves Student Leave" "status=APPROVED, reviewer=9, remarks saved" "status=$($approvedStudentLeave.status), reviewer=$($approvedStudentLeave.reviewerUserId)" $status

    # TEST-9D.4: HOD CS Rejects Staff Leave
    $reviewStaffBody = @{
        status = "REJECTED"
        reviewerRemarks = "Exam duty scheduled on those dates."
    } | ConvertTo-Json

    $rejectedStaffLeave = Invoke-RestMethod -Uri "$BaseUrl/api/leaves/$($staffLeave.id)/review" -Method Put -Headers $hodCsHeaders -Body $reviewStaffBody -ContentType "application/json"
    $rejectOk = ($rejectedStaffLeave.status -eq "REJECTED" -and $rejectedStaffLeave.reviewerUserId -eq 9 -and $rejectedStaffLeave.reviewerRemarks -match "Exam duty")
    $status = if ($rejectOk) { "PASS" } else { "FAIL" }
    Add-TestResult "TEST-9D.4" "9D" "HOD CS Rejects Staff Leave" "status=REJECTED, reviewer=9, remarks saved" "status=$($rejectedStaffLeave.status), reviewer=$($rejectedStaffLeave.reviewerUserId)" $status

    # TEST-9D.5: Idempotency / Double Review Rejection
    try {
        Invoke-RestMethod -Uri "$BaseUrl/api/leaves/$($studentLeave.id)/review" -Method Put -Headers $hodCsHeaders -Body $reviewStudentBody -ContentType "application/json"
        Add-TestResult "TEST-9D.5" "9D" "Double Review Idempotency Prevention" "HTTP 409 Conflict" "Unexpected Success" "FAIL"
    } catch {
        $status = if ($_.Exception.Response.StatusCode.value__ -eq 409) { "PASS" } else { "FAIL" }
        Add-TestResult "TEST-9D.5" "9D" "Double Review Idempotency Prevention" "HTTP 409 Conflict" "HTTP $($_.Exception.Response.StatusCode.value__)" $status
    }

    # TEST-9D.6: Student Self-Cancellation of Pending Leave
    $tempLeaveBody = @{
        leaveType = "CASUAL"
        startDate = "2026-12-01"
        endDate   = "2026-12-02"
        reason    = "Temporary plan that will be cancelled"
    } | ConvertTo-Json

    $tempLeave = Invoke-RestMethod -Uri "$BaseUrl/api/leaves/apply" -Method Post -Headers $studentHeaders -Body $tempLeaveBody -ContentType "application/json"
    $createdLeaveIds.Add($tempLeave.id)

    $cancelRes = Invoke-RestMethod -Uri "$BaseUrl/api/leaves/$($tempLeave.id)/cancel" -Method Put -Headers $studentHeaders
    $cancelledLeave = Invoke-RestMethod -Uri "$BaseUrl/api/leaves/$($tempLeave.id)" -Method Get -Headers $studentHeaders
    $cancelOk = ($cancelledLeave.status -eq "CANCELLED")
    $status = if ($cancelOk) { "PASS" } else { "FAIL" }
    Add-TestResult "TEST-9D.6" "9D" "Student Self-Cancellation of Pending Leave" "Status transitions to CANCELLED" "status=$($cancelledLeave.status)" $status

    # TEST-9F.1: Student Received LEAVE_APPROVED Notification
    $studentNotifs = Invoke-RestMethod -Uri "$BaseUrl/api/notifications?limit=20" -Method Get -Headers $studentHeaders
    $hasApprovedNotif = @($studentNotifs.notifications | Where-Object { $_.type -eq "LEAVE_APPROVED" -and $_.referenceId -eq $studentLeave.id }).Count -ge 1
    $status = if ($hasApprovedNotif) { "PASS" } else { "FAIL" }
    Add-TestResult "TEST-9F.1" "9F" "Student Receives LEAVE_APPROVED Notification" "Notification type LEAVE_APPROVED for leave id" "Received=$hasApprovedNotif" $status

    # TEST-9F.2: Staff Received LEAVE_REJECTED Notification
    $staffNotifs = Invoke-RestMethod -Uri "$BaseUrl/api/notifications?limit=20" -Method Get -Headers $staffHeaders
    $hasRejectedNotif = @($staffNotifs.notifications | Where-Object { $_.type -eq "LEAVE_REJECTED" -and $_.referenceId -eq $staffLeave.id }).Count -ge 1
    $status = if ($hasRejectedNotif) { "PASS" } else { "FAIL" }
    Add-TestResult "TEST-9F.2" "9F" "Staff Receives LEAVE_REJECTED Notification" "Notification type LEAVE_REJECTED for leave id" "Received=$hasRejectedNotif" $status

    # =============================================================
    # TEARDOWN: Database cleanup and zero residue
    # =============================================================
    if ($createdLeaveIds.Count -gt 0) {
        $idList = ($createdLeaveIds -join ",")
        & $mysqlExe -u root -pSilicon123 -e "USE checkify; DELETE FROM notifications WHERE reference_id IN ($idList) AND type IN ('LEAVE_SUBMITTED', 'LEAVE_APPROVED', 'LEAVE_REJECTED'); DELETE FROM leave_requests WHERE id IN ($idList);"
    }

    $residueCheck = & $mysqlExe -u root -pSilicon123 -e "USE checkify; SELECT count(*) FROM leave_requests WHERE reason IN ('Family event out of town', 'Medical appointment and recovery', 'Temporary plan that will be cancelled');" -N
    $resCount = [int]($residueCheck.Trim())
    $status = if ($resCount -eq 0) { "PASS" } else { "FAIL" }
    Add-TestResult "TEST-9D.7" "9D" "Zero Residual Database Records Verification" "0 residual leave requests" "$resCount residual records" $status

} finally {
    # Redundant cleanup safety
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

$results | Format-Table -Property TestId, Phase, Description, Status, Expected, Actual -AutoSize

if ($failCount -ne 0) {
    exit 1
}

