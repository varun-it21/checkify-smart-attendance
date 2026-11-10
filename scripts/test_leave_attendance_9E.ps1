<#
.SYNOPSIS
    Milestone 9E - Leave & Attendance Excusal Integration Validation Test Runner
.DESCRIPTION
    Validates:
    9E.1 Session closure automatically creates EXCUSED attendance record for students on approved leave
    9E.2 Excused attendance prevents false DEFAULTER_WARNING alert
    9E.3 Database teardown and zero residue
#>

param(
    [string]$BaseUrl = "http://localhost:5006"
)

$ErrorActionPreference = "Continue"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " CHECKIFY MILESTONE 9E: LEAVE & ATTENDANCE INTEGRATION    " -ForegroundColor Cyan
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

$testDate = "2026-12-03" # Thursday (matches ClassSession 7 day_of_week 4)
$createdSessionId = 0
$createdLeaveId = 0

try {
    # 1. Logins
    $staffLogin = Invoke-RestMethod -Uri "$BaseUrl/auth/login" -Method Post -Body (@{ email = "priya.updated@checkify.local"; password = "TestPassword123!" } | ConvertTo-Json) -ContentType "application/json"
    $staffHeaders = @{ Authorization = "Bearer $($staffLogin.token)" }

    $studentLogin = Invoke-RestMethod -Uri "$BaseUrl/auth/login" -Method Post -Body (@{ email = "arun.kumar.student@checkify.local"; password = "TestPassword123!" } | ConvertTo-Json) -ContentType "application/json"
    $studentHeaders = @{ Authorization = "Bearer $($studentLogin.token)" }

    $hodCsLogin = Invoke-RestMethod -Uri "$BaseUrl/auth/login" -Method Post -Body (@{ email = "hod.cs@checkify.local"; password = "TestPassword123!" } | ConvertTo-Json) -ContentType "application/json"
    $hodCsHeaders = @{ Authorization = "Bearer $($hodCsLogin.token)" }

    # 2. Student applies for leave on $testDate
    $applyBody = @{
        leaveType = "MEDICAL"
        startDate = $testDate
        endDate   = $testDate
        reason    = "Medical appointment on Thursday"
    } | ConvertTo-Json
    $leaveRes = Invoke-RestMethod -Uri "$BaseUrl/api/leaves/apply" -Method Post -Headers $studentHeaders -Body $applyBody -ContentType "application/json"
    $createdLeaveId = $leaveRes.id

    # 3. HOD approves the leave request
    $reviewBody = @{
        status = "APPROVED"
        reviewerRemarks = "Medical leave approved."
    } | ConvertTo-Json
    Invoke-RestMethod -Uri "$BaseUrl/api/leaves/$createdLeaveId/review" -Method Put -Headers $hodCsHeaders -Body $reviewBody -ContentType "application/json" | Out-Null

    # 4. Conducting staff opens an attendance session on $testDate for ClassSession 7 (Thursday class)
    $openBody = @{
        classSessionId = 7
        sessionDate    = $testDate
    } | ConvertTo-Json
    $openRes = Invoke-RestMethod -Uri "$BaseUrl/api/staff/attendance/open" -Method Post -Headers $staffHeaders -Body $openBody -ContentType "application/json"
    $createdSessionId = $openRes.id

    # 5. Staff closes the session (without student manually marking)
    $closeRes = Invoke-RestMethod -Uri "$BaseUrl/api/staff/attendance/$createdSessionId/close" -Method Post -Headers $staffHeaders

    # TEST-9E.1: Automatic EXCUSED attendance record created
    $sqlCheck = & $mysqlExe -u root -pSilicon123 -e "USE checkify; SELECT status, method, remarks FROM attendance_records WHERE attendance_session_id = $createdSessionId AND student_id = 1;"
    $sqlText = ($sqlCheck -join " ")
    $hasExcused = ($sqlText -match "EXCUSED" -and $sqlText -match "SYSTEM")
    $status = if ($hasExcused) { "PASS" } else { "FAIL" }
    Add-TestResult "TEST-9E.1" "Approved Leave Auto-Excusal on Session Closure" "Attendance record created with status=EXCUSED, method=SYSTEM" "Record: $sqlText" $status

    # TEST-9E.2: Verify no false DEFAULTER_WARNING generated for Arun Kumar
    $notifs = Invoke-RestMethod -Uri "$BaseUrl/api/notifications?limit=20" -Method Get -Headers $studentHeaders
    $hasFalseWarning = @($notifs.notifications | Where-Object { $_.type -eq "DEFAULTER_WARNING" -and $_.referenceId -eq $createdSessionId }).Count -gt 0
    $status = if (-not $hasFalseWarning) { "PASS" } else { "FAIL" }
    Add-TestResult "TEST-9E.2" "Defaulter Adjustment: No False Warning for Excused Leave" "Zero DEFAULTER_WARNING alerts for session" "Alerts found: $hasFalseWarning" $status

    # TEST-9E.3: Zero residue cleanup
    if ($createdSessionId -gt 0) {
        & $mysqlExe -u root -pSilicon123 -e "USE checkify; DELETE FROM attendance_records WHERE attendance_session_id = $createdSessionId; DELETE FROM attendance_sessions WHERE id = $createdSessionId;"
    }
    if ($createdLeaveId -gt 0) {
        & $mysqlExe -u root -pSilicon123 -e "USE checkify; DELETE FROM notifications WHERE reference_id = $createdLeaveId; DELETE FROM leave_requests WHERE id = $createdLeaveId;"
    }

    $residue = & $mysqlExe -u root -pSilicon123 -e "USE checkify; SELECT count(*) FROM attendance_sessions WHERE session_date = '$testDate';" -N
    $resCount = [int]($residue.Trim())
    $status = if ($resCount -eq 0) { "PASS" } else { "FAIL" }
    Add-TestResult "TEST-9E.3" "Zero Residual Test Records Verification" "0 residual sessions" "$resCount residual records" $status

} finally {
    if ($createdSessionId -gt 0) {
        & $mysqlExe -u root -pSilicon123 -e "USE checkify; DELETE FROM attendance_records WHERE attendance_session_id = $createdSessionId; DELETE FROM attendance_sessions WHERE id = $createdSessionId;"
    }
    if ($createdLeaveId -gt 0) {
        & $mysqlExe -u root -pSilicon123 -e "USE checkify; DELETE FROM notifications WHERE reference_id = $createdLeaveId; DELETE FROM leave_requests WHERE id = $createdLeaveId;"
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

$results | Format-Table -Property TestId, Description, Status, Expected, Actual -AutoSize

if ($failCount -ne 0) {
    exit 1
}
