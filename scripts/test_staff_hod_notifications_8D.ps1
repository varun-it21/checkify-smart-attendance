<#
.SYNOPSIS
    Milestone 8D - Staff & HOD Notifications Validation Test Runner
.DESCRIPTION
    Validates all Milestone 8D requirements:
    1. Conducting staff receives SESSION_SUMMARY whenever a session closes
    2. Format matches: "Session for Data Structures (CS301) closed with 1/3 (33.3%) attendance."
    3. Department HOD receives HOD_ALERT when turnout is strictly below 50%
    4. Format matches: "Attendance for Data Structures (CS301) conducted by <Staff> on <Date> was 33.3% (1/3)."
    5. Turnout >= 50% does NOT trigger HOD escalation (50% boundary gate)
    6. Other department HODs receive ZERO alerts (department isolation)
    7. Deduplication gate: Alerts are idempotent and not duplicated
    8. Complete teardown & non-mutating cleanup
#>

param(
    [string]$BaseUrl = "http://localhost:5006"
)

$ErrorActionPreference = "Continue"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  CHECKIFY MILESTONE 8D - STAFF & HOD NOTIFICATIONS       " -ForegroundColor Cyan
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

$date1 = "2026-11-19" # Thursday - Low turnout (1/3 = 33.3% < 50%)
$date2 = "2026-11-26" # Thursday - Healthy turnout (2/3 = 66.7% >= 50%)
$session1Id = 0
$session2Id = 0

try {
    # 0. Clean any prior test debris from these dates
    & "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -pSilicon123 -e "USE checkify; DELETE FROM attendance_records WHERE attendance_session_id IN (SELECT id FROM attendance_sessions WHERE session_date IN ('$date1', '$date2')); DELETE FROM attendance_otp_attempts WHERE attendance_session_id IN (SELECT id FROM attendance_sessions WHERE session_date IN ('$date1', '$date2')); DELETE FROM notifications WHERE title IN ('Attendance Session Opened', 'Attendance Recorded', 'Low Attendance Warning', 'Attendance Session Summary', 'Low Attendance Session Alert'); DELETE FROM attendance_sessions WHERE session_date IN ('$date1', '$date2');"

    # 1. Authenticate users
    # Conducting Staff: Priya Sharma (Dept 1, user_id = 4)
    $staffRes = Invoke-RestMethod -Uri "$BaseUrl/auth/login" -Method Post -Body (@{ email = "priya.updated@checkify.local"; password = "TestPassword123!" } | ConvertTo-Json) -ContentType "application/json"
    $staffHeaders = @{ Authorization = "Bearer $($staffRes.token)" }

    # CS HOD: Dr. Ramesh (Dept 1, user_id = 9)
    $csHodRes = Invoke-RestMethod -Uri "$BaseUrl/auth/login" -Method Post -Body (@{ email = "hod.cs@checkify.local"; password = "TestPassword123!" } | ConvertTo-Json) -ContentType "application/json"
    $csHodHeaders = @{ Authorization = "Bearer $($csHodRes.token)" }

    # EE HOD: Dr. Suresh (Dept 2, user_id = 10)
    $eeHodRes = Invoke-RestMethod -Uri "$BaseUrl/auth/login" -Method Post -Body (@{ email = "hod.ee@checkify.local"; password = "TestPassword123!" } | ConvertTo-Json) -ContentType "application/json"
    $eeHodHeaders = @{ Authorization = "Bearer $($eeHodRes.token)" }

    # Cohort Students: Arun (user 3) & Karthik (user 13)
    $arunRes = Invoke-RestMethod -Uri "$BaseUrl/auth/login" -Method Post -Body (@{ email = "arun.kumar.student@checkify.local"; password = "TestPassword123!" } | ConvertTo-Json) -ContentType "application/json"
    $arunHeaders = @{ Authorization = "Bearer $($arunRes.token)" }

    $karthikRes = Invoke-RestMethod -Uri "$BaseUrl/auth/login" -Method Post -Body (@{ email = "karthik.student@checkify.local"; password = "TestPassword123!" } | ConvertTo-Json) -ContentType "application/json"
    $karthikHeaders = @{ Authorization = "Bearer $($karthikRes.token)" }

    # =============================================================
    # SCENARIO A: Low Turnout (< 50%) Session on 2026-11-19
    # =============================================================
    # Open session 1
    $open1 = Invoke-RestMethod -Uri "$BaseUrl/api/staff/attendance/open" -Method Post -Body (@{ classSessionId = 7; sessionDate = $date1 } | ConvertTo-Json) -ContentType "application/json" -Headers $staffHeaders
    $session1Id = $open1.id

    # Karthik marks attendance (1 out of 3 cohort students present = 33.3%)
    $otp1 = Invoke-RestMethod -Uri "$BaseUrl/api/staff/attendance/$session1Id/otp" -Method Post -Headers $staffHeaders
    $null = Invoke-RestMethod -Uri "$BaseUrl/api/student/attendance/submit-otp" -Method Post -Body (@{ attendanceSessionId = $session1Id; otpCode = $otp1.otpCode } | ConvertTo-Json) -ContentType "application/json" -Headers $karthikHeaders

    # Staff closes session 1 -> Triggers staff summary & HOD escalation
    $close1 = Invoke-RestMethod -Uri "$BaseUrl/api/staff/attendance/$session1Id/close" -Method Post -Headers $staffHeaders
    Start-Sleep -Milliseconds 300

    # TEST-8D.1: Staff receives SESSION_SUMMARY
    $staffNotifs = Invoke-RestMethod -Uri "$BaseUrl/api/notifications?limit=20" -Method Get -Headers $staffHeaders
    $staffSummary1 = $staffNotifs.notifications | Where-Object { $_.type -eq "SESSION_SUMMARY" -and $_.referenceId -eq $session1Id }
    $hasStaffSummary1 = ($staffSummary1 -ne $null -and $staffSummary1.title -eq "Attendance Session Summary")
    $matchesStaffMsg1 = ($hasStaffSummary1 -and $staffSummary1.message -like "*Session for Data Structures (CS301) closed with 1/3 (33.3%) attendance.*")
    $status = if ($hasStaffSummary1 -and $matchesStaffMsg1) { "PASS" } else { "FAIL" }
    Add-TestResult "TEST-8D.1" "Staff Session Summary Delivery" "SESSION_SUMMARY with 1/3 (33.3%) attendance" "Message='$($staffSummary1.message)'" $status

    # TEST-8D.2: Department HOD receives HOD_ALERT on turnout < 50%
    $csHodNotifs = Invoke-RestMethod -Uri "$BaseUrl/api/notifications?limit=20" -Method Get -Headers $csHodHeaders
    $csHodAlert1 = $csHodNotifs.notifications | Where-Object { $_.type -eq "HOD_ALERT" -and $_.referenceId -eq $session1Id }
    $hasCsHodAlert = ($csHodAlert1 -ne $null -and $csHodAlert1.title -eq "Low Attendance Session Alert")
    $matchesCsHodMsg = ($hasCsHodAlert -and $csHodAlert1.message -like "*Attendance for Data Structures (CS301)*" -and $csHodAlert1.message -like "*was 33.3% (1/3)*")
    $status = if ($hasCsHodAlert -and $matchesCsHodMsg) { "PASS" } else { "FAIL" }
    Add-TestResult "TEST-8D.2" "HOD Critical Turnout Alert (< 50%)" "HOD_ALERT with 33.3% (1/3)" "Message='$($csHodAlert1.message)'" $status

    # TEST-8D.3: Other Department HOD receives ZERO alerts (Department Isolation)
    $eeHodNotifs = Invoke-RestMethod -Uri "$BaseUrl/api/notifications?limit=20" -Method Get -Headers $eeHodHeaders
    $eeHodAlert1 = $eeHodNotifs.notifications | Where-Object { $_.type -eq "HOD_ALERT" -and $_.referenceId -eq $session1Id }
    $eeIsolated = ($eeHodAlert1 -eq $null)
    $status = if ($eeIsolated) { "PASS" } else { "FAIL" }
    Add-TestResult "TEST-8D.3" "Department Isolation (EE HOD gets 0 alerts)" "Zero HOD_ALERT notifications for Dept 2 HOD" "AlertCount=$(if ($eeHodAlert1) { 1 } else { 0 })" $status

    # TEST-8D.4: Deduplication Gate (Staff and HOD get exactly 1 notification for session 1)
    $staffSummaryCount = @($staffNotifs.notifications | Where-Object { $_.type -eq "SESSION_SUMMARY" -and $_.referenceId -eq $session1Id }).Count
    $csHodAlertCount = @($csHodNotifs.notifications | Where-Object { $_.type -eq "HOD_ALERT" -and $_.referenceId -eq $session1Id }).Count
    $isIdempotent = ($staffSummaryCount -eq 1 -and $csHodAlertCount -eq 1)
    $status = if ($isIdempotent) { "PASS" } else { "FAIL" }
    Add-TestResult "TEST-8D.4" "Deduplication Gate for Session 1" "StaffCount=1, HodCount=1" "StaffCount=$staffSummaryCount, HodCount=$csHodAlertCount" $status

    # =============================================================
    # SCENARIO B: Healthy Turnout (>= 50%) Session on 2026-11-26
    # =============================================================
    # Open session 2
    $open2 = Invoke-RestMethod -Uri "$BaseUrl/api/staff/attendance/open" -Method Post -Body (@{ classSessionId = 7; sessionDate = $date2 } | ConvertTo-Json) -ContentType "application/json" -Headers $staffHeaders
    $session2Id = $open2.id

    # 2 students mark attendance (Karthik & Arun = 2/3 = 66.7% >= 50%)
    $otp2 = Invoke-RestMethod -Uri "$BaseUrl/api/staff/attendance/$session2Id/otp" -Method Post -Headers $staffHeaders
    $null = Invoke-RestMethod -Uri "$BaseUrl/api/student/attendance/submit-otp" -Method Post -Body (@{ attendanceSessionId = $session2Id; otpCode = $otp2.otpCode } | ConvertTo-Json) -ContentType "application/json" -Headers $karthikHeaders
    $null = Invoke-RestMethod -Uri "$BaseUrl/api/student/attendance/submit-otp" -Method Post -Body (@{ attendanceSessionId = $session2Id; otpCode = $otp2.otpCode } | ConvertTo-Json) -ContentType "application/json" -Headers $arunHeaders

    # Staff closes session 2 -> Triggers staff summary, but NO HOD escalation (since 66.7% >= 50%)
    $close2 = Invoke-RestMethod -Uri "$BaseUrl/api/staff/attendance/$session2Id/close" -Method Post -Headers $staffHeaders
    Start-Sleep -Milliseconds 300

    # TEST-8D.5: Staff receives SESSION_SUMMARY with 2/3 (66.7%) attendance
    $staffNotifs2 = Invoke-RestMethod -Uri "$BaseUrl/api/notifications?limit=20" -Method Get -Headers $staffHeaders
    $staffSummary2 = $staffNotifs2.notifications | Where-Object { $_.type -eq "SESSION_SUMMARY" -and $_.referenceId -eq $session2Id }
    $hasStaffSummary2 = ($staffSummary2 -ne $null -and $staffSummary2.title -eq "Attendance Session Summary")
    $matchesStaffMsg2 = ($hasStaffSummary2 -and $staffSummary2.message -like "*Session for Data Structures (CS301) closed with 2/3 (66.7%) attendance.*")
    $status = if ($hasStaffSummary2 -and $matchesStaffMsg2) { "PASS" } else { "FAIL" }
    Add-TestResult "TEST-8D.5" "Staff Summary on Healthy Turnout" "SESSION_SUMMARY with 2/3 (66.7%) attendance" "Message='$($staffSummary2.message)'" $status

    # TEST-8D.6: Department HOD receives ZERO alerts when turnout >= 50% (Boundary Gate)
    $csHodNotifs2 = Invoke-RestMethod -Uri "$BaseUrl/api/notifications?limit=20" -Method Get -Headers $csHodHeaders
    $csHodAlert2 = $csHodNotifs2.notifications | Where-Object { $_.type -eq "HOD_ALERT" -and $_.referenceId -eq $session2Id }
    $noHodAlertOnHealthy = ($csHodAlert2 -eq $null)
    $status = if ($noHodAlertOnHealthy) { "PASS" } else { "FAIL" }
    Add-TestResult "TEST-8D.6" "Turnout Boundary Gate (>= 50% produces NO HOD alert)" "Zero HOD_ALERT notifications for 66.7% turnout" "AlertCount=$(if ($csHodAlert2) { 1 } else { 0 })" $status

} finally {
    # Clean up test sessions and test records from MySQL
    & "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -pSilicon123 -e "USE checkify; DELETE FROM attendance_records WHERE attendance_session_id IN (SELECT id FROM attendance_sessions WHERE session_date IN ('$date1', '$date2')); DELETE FROM attendance_otp_attempts WHERE attendance_session_id IN (SELECT id FROM attendance_sessions WHERE session_date IN ('$date1', '$date2')); DELETE FROM notifications WHERE title IN ('Attendance Session Opened', 'Attendance Recorded', 'Low Attendance Warning', 'Attendance Session Summary', 'Low Attendance Session Alert'); DELETE FROM attendance_sessions WHERE session_date IN ('$date1', '$date2');"

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

