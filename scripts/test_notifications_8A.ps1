<#
.SYNOPSIS
    Milestone 8A - Notification API & Security Verification Test Runner
#>

param(
    [string]$BaseUrl = "http://localhost:5006"
)

$ErrorActionPreference = "Continue"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "    CHECKIFY MILESTONE 8A - NOTIFICATIONS VALIDATION      " -ForegroundColor Cyan
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

try {
    # 1. Authenticate Manager (user_id = 2) and Student (user_id = 3)
    $mgrRes = Invoke-RestMethod -Uri "$BaseUrl/auth/login" -Method Post -Body (@{ email = "manager@checkify.local"; password = "TestPassword123!" } | ConvertTo-Json) -ContentType "application/json"
    $mgrHeaders = @{ Authorization = "Bearer $($mgrRes.token)" }

    $stuRes = Invoke-RestMethod -Uri "$BaseUrl/auth/login" -Method Post -Body (@{ email = "arun.kumar.student@checkify.local"; password = "TestPassword123!" } | ConvertTo-Json) -ContentType "application/json"
    $stuHeaders = @{ Authorization = "Bearer $($stuRes.token)" }

    # Test 8A-1: Initial unread count (HTTP 200)
    $initialUnread = Invoke-RestMethod -Uri "$BaseUrl/api/notifications/unread-count" -Method Get -Headers $mgrHeaders
    $hasUnreadCount = ($initialUnread.unreadCount -ne $null)
    $status = if ($hasUnreadCount) { "PASS" } else { "FAIL" }
    Add-TestResult "TEST-8A.1" "GET /unread-count format" "unreadCount integer property" "unreadCount=$($initialUnread.unreadCount)" $status

    # Seed 2 test notifications directly via SQL for testing (1 for Manager user_id 2, 1 for Student user_id 3)
    & "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -pSilicon123 -e "USE checkify; INSERT INTO notifications (user_id, title, message, type, is_read, created_at) VALUES (2, 'Attendance Session Closed', 'Session for CS301 closed with 85% attendance.', 'SESSION_CLOSED', 0, UTC_TIMESTAMP()); INSERT INTO notifications (user_id, title, message, type, is_read, created_at) VALUES (3, 'Attendance Marked', 'You have been marked PRESENT for CS301.', 'ATTENDANCE_MARKED', 0, UTC_TIMESTAMP());"

    # Test 8A-2: Manager unread count incremented
    $mgrUnread = Invoke-RestMethod -Uri "$BaseUrl/api/notifications/unread-count" -Method Get -Headers $mgrHeaders
    $status = if ($mgrUnread.unreadCount -ge 1) { "PASS" } else { "FAIL" }
    Add-TestResult "TEST-8A.2" "Unread Count Increment" ">= 1 unread" "$($mgrUnread.unreadCount) unread" $status

    # Test 8A-3: Fetch Manager notifications list
    $listRes = Invoke-RestMethod -Uri "$BaseUrl/api/notifications?limit=10&offset=0" -Method Get -Headers $mgrHeaders
    $hasItems = ($listRes.notifications -ne $null -and $listRes.notifications.Count -ge 1)
    $mgrNotifId = $listRes.notifications[0].id
    $status = if ($hasItems) { "PASS" } else { "FAIL" }
    Add-TestResult "TEST-8A.3" "GET /api/notifications List" "Returns notifications array with pagination" "Received $($listRes.notifications.Count) items" $status

    # Test 8A-4: Mark Manager notification as read
    $readRes = Invoke-RestMethod -Uri "$BaseUrl/api/notifications/$mgrNotifId/read" -Method Put -Headers $mgrHeaders
    $isNowRead = ($readRes.isRead -eq $true -and $readRes.readAt -ne $null)
    $status = if ($isNowRead) { "PASS" } else { "FAIL" }
    Add-TestResult "TEST-8A.4" "PUT /{id}/read Success" "isRead=true and readAt populated" "isRead=$($readRes.isRead), readAt=$($readRes.readAt)" $status

    # Test 8A-5: Security Isolation - Student attempts to read Manager's notification (HTTP 404 Expected)
    try {
        $crossRes = Invoke-RestMethod -Uri "$BaseUrl/api/notifications/$mgrNotifId/read" -Method Put -Headers $stuHeaders
        Add-TestResult "TEST-8A.5" "Cross-User Isolation Gate" "HTTP 404 Not Found" "HTTP 200 OK (UNEXPECTED)" "FAIL"
    } catch {
        $httpCode = $_.Exception.Response.StatusCode.value__
        $status = if ($httpCode -eq 404) { "PASS" } else { "FAIL" }
        Add-TestResult "TEST-8A.5" "Cross-User Isolation Gate" "HTTP 404 Not Found" "HTTP $httpCode" $status
    }

    # Test 8A-6: Security Isolation - Student attempts to delete Manager's notification (HTTP 404 Expected)
    try {
        $crossDel = Invoke-RestMethod -Uri "$BaseUrl/api/notifications/$mgrNotifId" -Method Delete -Headers $stuHeaders
        Add-TestResult "TEST-8A.6" "Cross-User Delete Gate" "HTTP 404 Not Found" "HTTP 204 NoContent (UNEXPECTED)" "FAIL"
    } catch {
        $httpCode = $_.Exception.Response.StatusCode.value__
        $status = if ($httpCode -eq 404) { "PASS" } else { "FAIL" }
        Add-TestResult "TEST-8A.6" "Cross-User Delete Gate" "HTTP 404 Not Found" "HTTP $httpCode" $status
    }

    # Test 8A-7: Pagination Limits (Enforces max limit 100)
    $paged = Invoke-RestMethod -Uri "$BaseUrl/api/notifications?limit=250" -Method Get -Headers $mgrHeaders
    $status = if ($paged.limit -eq 100) { "PASS" } else { "FAIL" }
    Add-TestResult "TEST-8A.7" "Pagination Max-Limit Clamp" "limit clamped to 100" "Clamped limit=$($paged.limit)" $status

    # Test 8A-8: Mark All as Read
    $markAll = Invoke-RestMethod -Uri "$BaseUrl/api/notifications/mark-all-read" -Method Put -Headers $stuHeaders
    $status = if ($markAll.markedCount -ge 1) { "PASS" } else { "FAIL" }
    Add-TestResult "TEST-8A.8" "PUT /mark-all-read" "markedCount >= 1" "markedCount=$($markAll.markedCount)" $status

    # Test 8A-9: Delete own notification (HTTP 204)
    try {
        Invoke-RestMethod -Uri "$BaseUrl/api/notifications/$mgrNotifId" -Method Delete -Headers $mgrHeaders
        Add-TestResult "TEST-8A.9" "DELETE /{id} Success" "HTTP 204 NoContent" "Deleted successfully" "PASS"
    } catch {
        Add-TestResult "TEST-8A.9" "DELETE /{id} Success" "HTTP 204 NoContent" $_.Exception.Message "FAIL"
    }

    # Test 8A-10: Unauthenticated Request (HTTP 401 Expected)
    try {
        $noAuth = Invoke-RestMethod -Uri "$BaseUrl/api/notifications" -Method Get
        Add-TestResult "TEST-8A.10" "Unauthenticated Access Gate" "HTTP 401 Unauthorized" "HTTP 200 OK (UNEXPECTED)" "FAIL"
    } catch {
        $httpCode = $_.Exception.Response.StatusCode.value__
        $status = if ($httpCode -eq 401) { "PASS" } else { "FAIL" }
        Add-TestResult "TEST-8A.10" "Unauthenticated Access Gate" "HTTP 401 Unauthorized" "HTTP $httpCode" $status
    }

    # Clean up test notifications
    & "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -pSilicon123 -e "USE checkify; DELETE FROM notifications WHERE title IN ('Attendance Session Closed', 'Attendance Marked');"

} finally {
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
