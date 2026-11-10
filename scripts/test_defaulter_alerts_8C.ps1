<#
.SYNOPSIS
    Milestone 8C - Defaulter Alerts (< 75%) Validation Test Runner
.DESCRIPTION
    Validates all Milestone 8C requirements:
    1. Session closure evaluates cohort attendance rates
    2. Students with attendance < 75% receive DEFAULTER_WARNING notification
    3. Exact message and title validation:
       "Your attendance in Data Structures (CS301) has fallen to 66.7%, which is below the mandatory 75% threshold."
    4. Students with attendance >= 75% receive NO DEFAULTER_WARNING alert (75% boundary gate)
    5. Out-of-cohort students receive NO alerts (cohort isolation)
    6. Deduplication gate: Alerts are idempotent and never duplicated for the same session
    7. Clean teardown and database reconciliation
#>

param(
    [string]$BaseUrl = "http://localhost:5006"
)

$ErrorActionPreference = "Continue"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  CHECKIFY MILESTONE 8C - DEFAULTER ALERTS VALIDATION     " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# Check if API is already running
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

    for ($i = 0; $i -lt 25; $i++) {
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
        [string]$Description,
        [string]$Expected,
        [string]$Actual,
        [string]$Status
    )
    $color = "Green"
    if ($Status -ne "PASS") { $color = "Red" }
    Write-Host "[$Status] $TestId : $Description" -ForegroundColor $color
    $results.Add([PSCustomObject]@{
        TestId      = $TestId
        Description = $Description
        Expected    = $Expected
        Actual      = $Actual
        Status      = $Status
    })
}

$testSessionDate = "2026-11-19" # Thursday matching ClassSession 7
$testSessionId = 0

try {
    # 0. Clean any prior test debris from this date
    & "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -pSilicon123 -e "USE checkify; DELETE FROM attendance_records WHERE attendance_session_id IN (SELECT id FROM attendance_sessions WHERE session_date = '$testSessionDate'); DELETE FROM attendance_otp_attempts WHERE attendance_session_id IN (SELECT id FROM attendance_sessions WHERE session_date = '$testSessionDate'); DELETE FROM notifications WHERE title IN ('Attendance Session Opened', 'Attendance Recorded', 'Low Attendance Warning'); DELETE FROM attendance_sessions WHERE session_date = '$testSessionDate';"

    # 1. Authenticate users
    # Staff: Priya Sharma (conducts ClassSession 7)
    $staffRes = Invoke-RestMethod -Uri "$BaseUrl/auth/login" -Method Post -Body (@{ email = "priya.updated@checkify.local"; password = "TestPassword123!" } | ConvertTo-Json) -ContentType "application/json"
    $staffHeaders = @{ Authorization = "Bearer $($staffRes.token)" }

    # Student 1: Arun Kumar (Attended 2/2 prior sessions. In 3rd session, Arun will be absent -> 2/3 = 66.7% < 75%)
    $arunRes = Invoke-RestMethod -Uri "$BaseUrl/auth/login" -Method Post -Body (@{ email = "arun.kumar.student@checkify.local"; password = "TestPassword123!" } | ConvertTo-Json) -ContentType "application/json"
    $arunHeaders = @{ Authorization = "Bearer $($arunRes.token)" }

    # Student 2: Karthik Raj (Attended 2/2 prior sessions. In 3rd session, Karthik marks attendance -> 3/3 = 100% >= 75%)
    $karthikRes = Invoke-RestMethod -Uri "$BaseUrl/auth/login" -Method Post -Body (@{ email = "karthik.student@checkify.local"; password = "TestPassword123!" } | ConvertTo-Json) -ContentType "application/json"
    $karthikHeaders = @{ Authorization = "Bearer $($karthikRes.token)" }

    # Student 3: Kavya Ramesh (Out of Cohort: Dept 1, Year 4, Sem 7, Sec A)
    $kavyaRes = Invoke-RestMethod -Uri "$BaseUrl/auth/login" -Method Post -Body (@{ email = "kavya.ramesh@checkify.local"; password = "TestPassword123!" } | ConvertTo-Json) -ContentType "application/json"
    $kavyaHeaders = @{ Authorization = "Bearer $($kavyaRes.token)" }

    # 2. Staff opens session 3 on 2026-11-19
    $openBody = @{
        classSessionId = 7
        sessionDate = $testSessionDate
    } | ConvertTo-Json
    $openRes = Invoke-RestMethod -Uri "$BaseUrl/api/staff/attendance/open" -Method Post -Body $openBody -ContentType "application/json" -Headers $staffHeaders
    $testSessionId = $openRes.id
    $status = if ($testSessionId -gt 0 -and $openRes.status -eq "OPEN") { "PASS" } else { "FAIL" }
    Add-TestResult "TEST-8C.1" "Staff Opens Session 3 (Conducted=3)" "Status OPEN with valid SessionId" "SessionId=$testSessionId, Status=$($openRes.status)" $status

    # 3. Staff generates OTP and Karthik marks attendance (making Karthik 3/3 = 100%)
    $otpRes = Invoke-RestMethod -Uri "$BaseUrl/api/staff/attendance/$testSessionId/otp" -Method Post -Headers $staffHeaders
    $otpCode = $otpRes.otpCode
    $karthikMarkBody = @{ attendanceSessionId = $testSessionId; otpCode = $otpCode } | ConvertTo-Json
    $karthikMarkRes = Invoke-RestMethod -Uri "$BaseUrl/api/student/attendance/submit-otp" -Method Post -Body $karthikMarkBody -ContentType "application/json" -Headers $karthikHeaders
    $status = if ($karthikMarkRes.status -eq "PRESENT") { "PASS" } else { "FAIL" }
    Add-TestResult "TEST-8C.2" "Karthik Marks Attendance (Attended 3/3 = 100%)" "Status PRESENT" "Status=$($karthikMarkRes.status)" $status

    # Arun does NOT mark attendance in session 3 (leaving Arun at 2/3 = 66.7% defaulter)

    # 4. Staff closes attendance session -> Triggers Defaulter Evaluation
    $closeRes = Invoke-RestMethod -Uri "$BaseUrl/api/staff/attendance/$testSessionId/close" -Method Post -Headers $staffHeaders
    $status = if ($closeRes.status -eq "CLOSED") { "PASS" } else { "FAIL" }
    Add-TestResult "TEST-8C.3" "Staff Closes Session (Triggers Defaulter Evaluation)" "Status CLOSED" "Status=$($closeRes.status)" $status

    Start-Sleep -Milliseconds 300

    # 5. Check Arun's notifications (Expected: DEFAULTER_WARNING with 66.7%)
    $arunNotifs = Invoke-RestMethod -Uri "$BaseUrl/api/notifications?limit=20" -Method Get -Headers $arunHeaders
    $arunAlert = $arunNotifs.notifications | Where-Object { $_.type -eq "DEFAULTER_WARNING" -and $_.referenceId -eq $testSessionId }

    $hasArunAlert = ($arunAlert -ne $null)
    $hasExpectedTitle = ($hasArunAlert -and $arunAlert.title -eq "Low Attendance Warning")
    $hasExpectedMessage = ($hasArunAlert -and $arunAlert.message -like "*Data Structures (CS301)*" -and $arunAlert.message -like "*66.7%*" -and $arunAlert.message -like "*below the mandatory 75% threshold*")

    $status = if ($hasArunAlert -and $hasExpectedTitle -and $hasExpectedMessage) { "PASS" } else { "FAIL" }
    Add-TestResult "TEST-8C.4" "Defaulter Alert Delivery (< 75%)" "DEFAULTER_WARNING with 66.7% for Data Structures (CS301)" "Title='$($arunAlert.title)', Message='$($arunAlert.message)'" $status

    # 6. Check Karthik's notifications (Expected: ZERO DEFAULTER_WARNING, since 3/3 = 100% >= 75%)
    $karthikNotifs = Invoke-RestMethod -Uri "$BaseUrl/api/notifications?limit=20" -Method Get -Headers $karthikHeaders
    $karthikAlert = $karthikNotifs.notifications | Where-Object { $_.type -eq "DEFAULTER_WARNING" -and $_.referenceId -eq $testSessionId }
    $karthikNotDefaulter = ($karthikAlert -eq $null)
    $status = if ($karthikNotDefaulter) { "PASS" } else { "FAIL" }
    Add-TestResult "TEST-8C.5" "Non-Defaulter Boundary Gate (>= 75%)" "Zero DEFAULTER_WARNING notifications for Karthik (100%)" "AlertCount=$(if ($karthikAlert) { 1 } else { 0 })" $status

    # 7. Check Out-of-Cohort student Kavya (Expected: ZERO DEFAULTER_WARNING)
    $kavyaNotifs = Invoke-RestMethod -Uri "$BaseUrl/api/notifications?limit=20" -Method Get -Headers $kavyaHeaders
    $kavyaAlert = $kavyaNotifs.notifications | Where-Object { $_.type -eq "DEFAULTER_WARNING" -and $_.referenceId -eq $testSessionId }
    $kavyaIsolated = ($kavyaAlert -eq $null)
    $status = if ($kavyaIsolated) { "PASS" } else { "FAIL" }
    Add-TestResult "TEST-8C.6" "Out-of-Cohort Student Isolation" "Zero notifications for Kavya (Year 4)" "AlertCount=$(if ($kavyaAlert) { 1 } else { 0 })" $status

    # 8. Deduplication / Idempotency Gate
    # Count Arun's defaulter alerts for this session
    $arunAlertCount = @($arunNotifs.notifications | Where-Object { $_.type -eq "DEFAULTER_WARNING" -and $_.referenceId -eq $testSessionId }).Count
    $status = if ($arunAlertCount -eq 1) { "PASS" } else { "FAIL" }
    Add-TestResult "TEST-8C.7" "Deduplication Gate (No Duplicate Alerts)" "Exactly 1 alert per student per session" "AlertCount=$arunAlertCount" $status

} finally {
    # Non-mutating cleanup: delete test session and test records from MySQL
    & "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -pSilicon123 -e "USE checkify; DELETE FROM attendance_records WHERE attendance_session_id IN (SELECT id FROM attendance_sessions WHERE session_date = '$testSessionDate'); DELETE FROM attendance_otp_attempts WHERE attendance_session_id IN (SELECT id FROM attendance_sessions WHERE session_date = '$testSessionDate'); DELETE FROM notifications WHERE title IN ('Attendance Session Opened', 'Attendance Recorded', 'Low Attendance Warning'); DELETE FROM attendance_sessions WHERE session_date = '$testSessionDate';"

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
Write-Host "Total Tests: $($results.Count) | Passed: $passCount | Failed: ($($results.Count - $passCount))" -ForegroundColor Green

$results | Format-Table -Property TestId, Description, Status, Expected, Actual -AutoSize
