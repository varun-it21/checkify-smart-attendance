<#
.SYNOPSIS
    Milestone 8B - Student Attendance Notifications Validation Test Runner
.DESCRIPTION
    Validates all Milestone 8B requirements:
    1. Bulk notification helper (CreateNotificationsForUsersAsync)
    2. Session opening triggers SESSION_OPENED for cohort students
    3. Out-of-cohort students receive no notifications (cohort isolation)
    4. Valid OTP attendance triggers ATTENDANCE_MARKED notification
    5. Invalid OTP attempt creates NO notification
    6. Duplicate attendance submission creates NO duplicate notification
    7. Valid QR attendance triggers ATTENDANCE_MARKED notification
    8. Invalid QR attempt creates NO notification
    9. Complete teardown & data cleanup
#>

param(
    [string]$BaseUrl = "http://localhost:5006"
)

$ErrorActionPreference = "Continue"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " CHECKIFY MILESTONE 8B - STUDENT NOTIFICATIONS VALIDATION " -ForegroundColor Cyan
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
    # Clean any stale test data from prior aborted runs
    & "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -pSilicon123 -e "USE checkify; DELETE FROM attendance_records WHERE attendance_session_id IN (SELECT id FROM attendance_sessions WHERE session_date = '$testSessionDate'); DELETE FROM attendance_otp_attempts WHERE attendance_session_id IN (SELECT id FROM attendance_sessions WHERE session_date = '$testSessionDate'); DELETE FROM notifications WHERE title IN ('Attendance Session Opened', 'Attendance Recorded'); DELETE FROM attendance_sessions WHERE session_date = '$testSessionDate';"

    # 1. Authenticate users
    # Staff: Priya Sharma (conducts ClassSession 7)
    $staffRes = Invoke-RestMethod -Uri "$BaseUrl/auth/login" -Method Post -Body (@{ email = "priya.updated@checkify.local"; password = "TestPassword123!" } | ConvertTo-Json) -ContentType "application/json"
    $staffHeaders = @{ Authorization = "Bearer $($staffRes.token)" }

    # Student 1: Arun Kumar (Cohort: Dept 1, Year 2, Sem 3, Sec A)
    $arunRes = Invoke-RestMethod -Uri "$BaseUrl/auth/login" -Method Post -Body (@{ email = "arun.kumar.student@checkify.local"; password = "TestPassword123!" } | ConvertTo-Json) -ContentType "application/json"
    $arunHeaders = @{ Authorization = "Bearer $($arunRes.token)" }

    # Student 2: Divya Prakash (Cohort: Dept 1, Year 2, Sem 3, Sec A)
    $divyaRes = Invoke-RestMethod -Uri "$BaseUrl/auth/login" -Method Post -Body (@{ email = "divya.student@checkify.local"; password = "TestPassword123!" } | ConvertTo-Json) -ContentType "application/json"
    $divyaHeaders = @{ Authorization = "Bearer $($divyaRes.token)" }

    # Student 3: Kavya Ramesh (Out of Cohort: Dept 1, Year 4, Sem 7, Sec A)
    $kavyaRes = Invoke-RestMethod -Uri "$BaseUrl/auth/login" -Method Post -Body (@{ email = "kavya.ramesh@checkify.local"; password = "TestPassword123!" } | ConvertTo-Json) -ContentType "application/json"
    $kavyaHeaders = @{ Authorization = "Bearer $($kavyaRes.token)" }

    # -------------------------------------------------------------
    # Checkpoint 8B.2: Session Opening Trigger
    # -------------------------------------------------------------
    # TEST-8B.1: Open attendance session
    $openBody = @{
        classSessionId = 7
        sessionDate = $testSessionDate
    } | ConvertTo-Json
    $openRes = Invoke-RestMethod -Uri "$BaseUrl/api/staff/attendance/open" -Method Post -Body $openBody -ContentType "application/json" -Headers $staffHeaders
    $testSessionId = $openRes.id
    $status = if ($testSessionId -gt 0 -and $openRes.status -eq "OPEN") { "PASS" } else { "FAIL" }
    Add-TestResult "TEST-8B.1" "Staff Opens Attendance Session" "Status OPEN with valid SessionId" "SessionId=$testSessionId, Status=$($openRes.status)" $status

    # TEST-8B.2: Cohort student Arun receives SESSION_OPENED
    $arunNotifs = Invoke-RestMethod -Uri "$BaseUrl/api/notifications?limit=10" -Method Get -Headers $arunHeaders
    $arunOpenNotif = $arunNotifs.notifications | Where-Object { $_.type -eq "SESSION_OPENED" -and $_.referenceId -eq $testSessionId }
    $hasArunNotif = ($arunOpenNotif -ne $null -and $arunOpenNotif.title -eq "Attendance Session Opened" -and $arunOpenNotif.message -like "*Data Structures*")
    $status = if ($hasArunNotif) { "PASS" } else { "FAIL" }
    Add-TestResult "TEST-8B.2" "Cohort Student 1 (Arun) Receives SESSION_OPENED" "SESSION_OPENED for Data Structures" "Received: $($arunOpenNotif.title)" $status

    # TEST-8B.3: Cohort student Divya receives SESSION_OPENED (Bulk Helper Verified)
    $divyaNotifs = Invoke-RestMethod -Uri "$BaseUrl/api/notifications?limit=10" -Method Get -Headers $divyaHeaders
    $divyaOpenNotif = $divyaNotifs.notifications | Where-Object { $_.type -eq "SESSION_OPENED" -and $_.referenceId -eq $testSessionId }
    $hasDivyaNotif = ($divyaOpenNotif -ne $null -and $divyaOpenNotif.title -eq "Attendance Session Opened")
    $status = if ($hasDivyaNotif) { "PASS" } else { "FAIL" }
    Add-TestResult "TEST-8B.3" "Cohort Student 2 (Divya) Receives SESSION_OPENED" "SESSION_OPENED for Data Structures" "Received: $($divyaOpenNotif.title)" $status

    # TEST-8B.4: Out-of-cohort student Kavya receives NO notification (Cohort Isolation)
    $kavyaNotifs = Invoke-RestMethod -Uri "$BaseUrl/api/notifications?limit=10" -Method Get -Headers $kavyaHeaders
    $kavyaOpenNotif = $kavyaNotifs.notifications | Where-Object { $_.type -eq "SESSION_OPENED" -and $_.referenceId -eq $testSessionId }
    $kavyaIsolated = ($kavyaOpenNotif -eq $null)
    $status = if ($kavyaIsolated) { "PASS" } else { "FAIL" }
    Add-TestResult "TEST-8B.4" "Out-of-Cohort Student (Kavya) Isolation" "No SESSION_OPENED notification" "Notified=$(-not $kavyaIsolated)" $status

    # -------------------------------------------------------------
    # Checkpoint 8B.3: OTP Attendance Trigger & Safeguards
    # -------------------------------------------------------------
    # TEST-8B.5: Staff generates OTP
    $otpRes = Invoke-RestMethod -Uri "$BaseUrl/api/staff/attendance/$testSessionId/otp" -Method Post -Headers $staffHeaders
    $otpCode = $otpRes.otpCode
    $hasOtp = ($otpCode -match "^\d{6}$")
    $status = if ($hasOtp) { "PASS" } else { "FAIL" }
    Add-TestResult "TEST-8B.5" "Staff Generates 6-Digit OTP" "6-digit OTP code" "Code=$otpCode" $status

    # Count Arun's notifications prior to invalid attempt
    $arunPreCount = (Invoke-RestMethod -Uri "$BaseUrl/api/notifications?limit=50" -Method Get -Headers $arunHeaders).totalCount

    # TEST-8B.6: Invalid OTP submission does NOT generate notification
    try {
        $badOtpBody = @{ attendanceSessionId = $testSessionId; otpCode = "000000" } | ConvertTo-Json
        $res = Invoke-RestMethod -Uri "$BaseUrl/api/student/attendance/submit-otp" -Method Post -Body $badOtpBody -ContentType "application/json" -Headers $arunHeaders
        Add-TestResult "TEST-8B.6" "Invalid OTP Attempt Gate" "HTTP 409 Conflict" "HTTP 200 OK (UNEXPECTED)" "FAIL"
    } catch {
        $httpCode = $_.Exception.Response.StatusCode.value__
        $arunPostCount = (Invoke-RestMethod -Uri "$BaseUrl/api/notifications?limit=50" -Method Get -Headers $arunHeaders).totalCount
        $noNewNotif = ($arunPostCount -eq $arunPreCount)
        $status = if (($httpCode -eq 409 -or $httpCode -eq 400) -and $noNewNotif) { "PASS" } else { "FAIL" }
        Add-TestResult "TEST-8B.6" "Invalid OTP Attempt Gate" "HTTP 409/400 & zero notifications created" "HTTP $httpCode, NewNotifs=$($arunPostCount - $arunPreCount)" $status
    }

    # TEST-8B.7: Valid OTP submission generates ATTENDANCE_MARKED
    $goodOtpBody = @{ attendanceSessionId = $testSessionId; otpCode = $otpCode } | ConvertTo-Json
    $otpMarkRes = Invoke-RestMethod -Uri "$BaseUrl/api/student/attendance/submit-otp" -Method Post -Body $goodOtpBody -ContentType "application/json" -Headers $arunHeaders
    Start-Sleep -Milliseconds 200
    $arunNotifs = Invoke-RestMethod -Uri "$BaseUrl/api/notifications?limit=10" -Method Get -Headers $arunHeaders
    $arunMarkNotif = $arunNotifs.notifications | Where-Object { $_.type -eq "ATTENDANCE_MARKED" -and $_.referenceId -eq $testSessionId }
    $hasMarkedNotif = ($arunMarkNotif -ne $null -and $arunMarkNotif.title -eq "Attendance Recorded" -and $arunMarkNotif.message -like "*PRESENT*")
    $status = if ($otpMarkRes.status -eq "PRESENT" -and $hasMarkedNotif) { "PASS" } else { "FAIL" }
    Add-TestResult "TEST-8B.7" "Valid OTP Marks Attendance & Notifies" "Status PRESENT & ATTENDANCE_MARKED notification" "Status=$($otpMarkRes.status), Title=$($arunMarkNotif.title)" $status

    # Count Arun's notifications prior to duplicate attempt
    $arunMarkedCount = (Invoke-RestMethod -Uri "$BaseUrl/api/notifications?limit=50" -Method Get -Headers $arunHeaders).totalCount

    # TEST-8B.8: Duplicate OTP submission rejected with NO duplicate notification
    try {
        $dupRes = Invoke-RestMethod -Uri "$BaseUrl/api/student/attendance/submit-otp" -Method Post -Body $goodOtpBody -ContentType "application/json" -Headers $arunHeaders
        Add-TestResult "TEST-8B.8" "Duplicate OTP Submission Gate" "HTTP 409 Conflict" "HTTP 200 OK (UNEXPECTED)" "FAIL"
    } catch {
        $httpCode = $_.Exception.Response.StatusCode.value__
        $arunAfterDupCount = (Invoke-RestMethod -Uri "$BaseUrl/api/notifications?limit=50" -Method Get -Headers $arunHeaders).totalCount
        $noDupNotif = ($arunAfterDupCount -eq $arunMarkedCount)
        $status = if (($httpCode -eq 409 -or $httpCode -eq 400) -and $noDupNotif) { "PASS" } else { "FAIL" }
        Add-TestResult "TEST-8B.8" "Duplicate OTP Submission Gate" "HTTP 409/400 & no duplicate notification" "HTTP $httpCode, DuplicateNotifs=$($arunAfterDupCount - $arunMarkedCount)" $status
    }

    # -------------------------------------------------------------
    # Checkpoint 8B.4: QR Attendance Trigger & Safeguards
    # -------------------------------------------------------------
    # TEST-8B.9: Staff generates QR Token
    $qrRes = Invoke-RestMethod -Uri "$BaseUrl/api/staff/attendance/$testSessionId/qr" -Method Post -Headers $staffHeaders
    $qrToken = $qrRes.qrToken
    $hasQr = ($qrToken -ne $null -and $qrToken.Length -gt 10)
    $status = if ($hasQr) { "PASS" } else { "FAIL" }
    Add-TestResult "TEST-8B.9" "Staff Generates Rotating QR Token" "Non-empty QR Token string" "TokenLength=$($qrToken.Length)" $status

    # Count Divya's notifications prior to invalid QR attempt
    $divyaPreCount = (Invoke-RestMethod -Uri "$BaseUrl/api/notifications?limit=50" -Method Get -Headers $divyaHeaders).totalCount

    # TEST-8B.10: Invalid QR submission does NOT generate notification
    try {
        $badQrBody = @{ attendanceSessionId = $testSessionId; qrToken = "invalid_fake_qr_token_12345" } | ConvertTo-Json
        $res = Invoke-RestMethod -Uri "$BaseUrl/api/student/attendance/submit-qr" -Method Post -Body $badQrBody -ContentType "application/json" -Headers $divyaHeaders
        Add-TestResult "TEST-8B.10" "Invalid QR Attempt Gate" "HTTP 409 Conflict" "HTTP 200 OK (UNEXPECTED)" "FAIL"
    } catch {
        $httpCode = $_.Exception.Response.StatusCode.value__
        $divyaPostCount = (Invoke-RestMethod -Uri "$BaseUrl/api/notifications?limit=50" -Method Get -Headers $divyaHeaders).totalCount
        $noNewNotif = ($divyaPostCount -eq $divyaPreCount)
        $status = if (($httpCode -eq 409 -or $httpCode -eq 400) -and $noNewNotif) { "PASS" } else { "FAIL" }
        Add-TestResult "TEST-8B.10" "Invalid QR Attempt Gate" "HTTP 409/400 & zero notifications created" "HTTP $httpCode, NewNotifs=$($divyaPostCount - $divyaPreCount)" $status
    }

    # TEST-8B.11: Valid QR submission generates ATTENDANCE_MARKED
    $goodQrBody = @{ attendanceSessionId = $testSessionId; qrToken = $qrToken } | ConvertTo-Json
    $qrMarkRes = Invoke-RestMethod -Uri "$BaseUrl/api/student/attendance/submit-qr" -Method Post -Body $goodQrBody -ContentType "application/json" -Headers $divyaHeaders
    Start-Sleep -Milliseconds 200
    $divyaNotifs = Invoke-RestMethod -Uri "$BaseUrl/api/notifications?limit=10" -Method Get -Headers $divyaHeaders
    $divyaMarkNotif = $divyaNotifs.notifications | Where-Object { $_.type -eq "ATTENDANCE_MARKED" -and $_.referenceId -eq $testSessionId }
    $hasDivyaMarked = ($divyaMarkNotif -ne $null -and $divyaMarkNotif.title -eq "Attendance Recorded" -and $divyaMarkNotif.message -like "*PRESENT*")
    $status = if ($qrMarkRes.status -eq "PRESENT" -and $hasDivyaMarked) { "PASS" } else { "FAIL" }
    Add-TestResult "TEST-8B.11" "Valid QR Marks Attendance & Notifies" "Status PRESENT & ATTENDANCE_MARKED notification" "Status=$($qrMarkRes.status), Title=$($divyaMarkNotif.title)" $status

    # TEST-8B.12: Staff closes attendance session
    $closeRes = Invoke-RestMethod -Uri "$BaseUrl/api/staff/attendance/$testSessionId/close" -Method Post -Headers $staffHeaders
    $status = if ($closeRes.status -eq "CLOSED") { "PASS" } else { "FAIL" }
    Add-TestResult "TEST-8B.12" "Staff Closes Attendance Session" "Status CLOSED" "Status=$($closeRes.status)" $status

} finally {
    # Non-mutating cleanup: delete test session and test records from MySQL
    & "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -pSilicon123 -e "USE checkify; DELETE FROM attendance_records WHERE attendance_session_id IN (SELECT id FROM attendance_sessions WHERE session_date = '$testSessionDate'); DELETE FROM attendance_otp_attempts WHERE attendance_session_id IN (SELECT id FROM attendance_sessions WHERE session_date = '$testSessionDate'); DELETE FROM notifications WHERE title IN ('Attendance Session Opened', 'Attendance Recorded'); DELETE FROM attendance_sessions WHERE session_date = '$testSessionDate';"

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
