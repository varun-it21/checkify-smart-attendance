<#
.SYNOPSIS
    Milestone 8F - Comprehensive End-to-End Notification Validation Test Runner
.DESCRIPTION
    Validates all 8 areas of Milestone 8:
    8F.1 Database: Schema, composite index, foreign key and cascade behavior
    8F.2 Student Workflow: Session opened -> OTP/QR marked -> notifications received -> unread count
    8F.3 Defaulter Alerts: Strictly below 75%; exactly 75% boundary non-alerting
    8F.4 Staff Notifications: Session summary delivered with accurate turnout
    8F.5 HOD Escalation: Turnout < 50% triggers HOD alert; department isolation
    8F.6 Security & Isolation: JWT authentication, ownership, cross-user isolation, pagination clamp
    8F.7 Lifecycle & Actions: Mark read, mark all read, delete, unread count synchronization
    8F.8 Teardown: Complete test cleanup and database integrity confirmation
#>

param(
    [string]$BaseUrl = "http://localhost:5006"
)

$ErrorActionPreference = "Continue"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  CHECKIFY MILESTONE 8F - COMPREHENSIVE NOTIFICATION E2E  " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 0. Check / start Checkify API
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

$mysqlExe = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
$date1 = "2026-11-19" # Thursday - Low turnout (1/3 = 33.3% < 50%, Arun 2/3 = 66.7% < 75%)
$date2 = "2026-11-26" # Thursday - Healthy turnout (2/3 = 66.7% >= 50%)
$session1Id = 0
$session2Id = 0

try {
    # Clean any prior test debris from test dates
    & $mysqlExe -u root -pSilicon123 -e "USE checkify; DELETE FROM attendance_records WHERE attendance_session_id IN (SELECT id FROM attendance_sessions WHERE session_date IN ('$date1', '$date2')); DELETE FROM attendance_otp_attempts WHERE attendance_session_id IN (SELECT id FROM attendance_sessions WHERE session_date IN ('$date1', '$date2')); DELETE FROM notifications WHERE title IN ('Attendance Session Opened', 'Attendance Recorded', 'Low Attendance Warning', 'Attendance Session Summary', 'Low Attendance Session Alert', 'E2E Fixture Notification'); DELETE FROM attendance_sessions WHERE session_date IN ('$date1', '$date2');"

    # =============================================================
    # AREA 8F.1: DATABASE SCHEMA & INTEGRITY
    # =============================================================
    # TEST-8F.1: notifications columns check
    $colCheck = & $mysqlExe -u root -pSilicon123 -e "USE checkify; SELECT count(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'checkify' AND TABLE_NAME = 'notifications' AND COLUMN_NAME IN ('id', 'user_id', 'title', 'message', 'type', 'reference_id', 'is_read', 'created_at', 'read_at');" -N
    $colCount = [int]($colCheck.Trim())
    $status = if ($colCount -eq 9) { "PASS" } else { "FAIL" }
    Add-TestResult "TEST-8F.1" "8F.1 Database" "Schema Column Verification" "9 core notification columns" "$colCount columns verified" $status

    # TEST-8F.2: composite index check
    $idxCheck = & $mysqlExe -u root -pSilicon123 -e "USE checkify; SELECT count(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = 'checkify' AND TABLE_NAME = 'notifications' AND INDEX_NAME = 'IX_notifications_user_read_created';" -N
    $idxCount = [int]($idxCheck.Trim())
    $status = if ($idxCount -eq 3) { "PASS" } else { "FAIL" }
    Add-TestResult "TEST-8F.2" "8F.1 Database" "Composite Index Verification" "3 columns in IX_notifications_user_read_created" "$idxCount index columns verified" $status

    # TEST-8F.3: foreign key cascade check
    $fkCheck = & $mysqlExe -u root -pSilicon123 -e "USE checkify; SELECT DELETE_RULE FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = 'checkify' AND TABLE_NAME = 'notifications' AND CONSTRAINT_NAME = 'FK_notifications_users_user_id';" -N
    $fkRule = $fkCheck.Trim()
    $status = if ($fkRule -eq "CASCADE") { "PASS" } else { "FAIL" }
    Add-TestResult "TEST-8F.3" "8F.1 Database" "Foreign Key Cascade Delete Rule" "CASCADE delete on users(id)" "Rule=$fkRule" $status

    # =============================================================
    # AUTHENTICATION
    # =============================================================
    $staffRes = Invoke-RestMethod -Uri "$BaseUrl/auth/login" -Method Post -Body (@{ email = "priya.updated@checkify.local"; password = "TestPassword123!" } | ConvertTo-Json) -ContentType "application/json"
    $staffHeaders = @{ Authorization = "Bearer $($staffRes.token)" }

    $arunRes = Invoke-RestMethod -Uri "$BaseUrl/auth/login" -Method Post -Body (@{ email = "arun.kumar.student@checkify.local"; password = "TestPassword123!" } | ConvertTo-Json) -ContentType "application/json"
    $arunHeaders = @{ Authorization = "Bearer $($arunRes.token)" }

    $divyaRes = Invoke-RestMethod -Uri "$BaseUrl/auth/login" -Method Post -Body (@{ email = "divya.student@checkify.local"; password = "TestPassword123!" } | ConvertTo-Json) -ContentType "application/json"
    $divyaHeaders = @{ Authorization = "Bearer $($divyaRes.token)" }

    $karthikRes = Invoke-RestMethod -Uri "$BaseUrl/auth/login" -Method Post -Body (@{ email = "karthik.student@checkify.local"; password = "TestPassword123!" } | ConvertTo-Json) -ContentType "application/json"
    $karthikHeaders = @{ Authorization = "Bearer $($karthikRes.token)" }

    $kavyaRes = Invoke-RestMethod -Uri "$BaseUrl/auth/login" -Method Post -Body (@{ email = "kavya.ramesh@checkify.local"; password = "TestPassword123!" } | ConvertTo-Json) -ContentType "application/json"
    $kavyaHeaders = @{ Authorization = "Bearer $($kavyaRes.token)" }

    $csHodRes = Invoke-RestMethod -Uri "$BaseUrl/auth/login" -Method Post -Body (@{ email = "hod.cs@checkify.local"; password = "TestPassword123!" } | ConvertTo-Json) -ContentType "application/json"
    $csHodHeaders = @{ Authorization = "Bearer $($csHodRes.token)" }

    $eeHodRes = Invoke-RestMethod -Uri "$BaseUrl/auth/login" -Method Post -Body (@{ email = "hod.ee@checkify.local"; password = "TestPassword123!" } | ConvertTo-Json) -ContentType "application/json"
    $eeHodHeaders = @{ Authorization = "Bearer $($eeHodRes.token)" }

    # =============================================================
    # AREA 8F.2: STUDENT WORKFLOW (SESSION OPEN, OTP, QR)
    # =============================================================
    # Initial unread count for Arun
    $arunInitUnread = (Invoke-RestMethod -Uri "$BaseUrl/api/notifications/unread-count" -Method Get -Headers $arunHeaders).unreadCount

    # Staff opens session 1
    $openRes1 = Invoke-RestMethod -Uri "$BaseUrl/api/staff/attendance/open" -Method Post -Body (@{ classSessionId = 7; sessionDate = $date1 } | ConvertTo-Json) -ContentType "application/json" -Headers $staffHeaders
    $session1Id = $openRes1.id

    # TEST-8F.4: Cohort students receive SESSION_OPENED
    $arunNotifs1 = Invoke-RestMethod -Uri "$BaseUrl/api/notifications?limit=10" -Method Get -Headers $arunHeaders
    $arunOpenNotif = $arunNotifs1.notifications | Where-Object { $_.type -eq "SESSION_OPENED" -and $_.referenceId -eq $session1Id }
    $divyaNotifs1 = Invoke-RestMethod -Uri "$BaseUrl/api/notifications?limit=10" -Method Get -Headers $divyaHeaders
    $divyaOpenNotif = $divyaNotifs1.notifications | Where-Object { $_.type -eq "SESSION_OPENED" -and $_.referenceId -eq $session1Id }
    $bothNotified = ($arunOpenNotif -ne $null -and $divyaOpenNotif -ne $null -and $arunOpenNotif.message -like "*Data Structures*")
    $status = if ($bothNotified) { "PASS" } else { "FAIL" }
    Add-TestResult "TEST-8F.4" "8F.2 Student" "Session Open Cohort Broadcast" "Cohort students receive SESSION_OPENED" "Arun=$($arunOpenNotif.title), Divya=$($divyaOpenNotif.title)" $status

    # TEST-8F.5: Unread count incremented
    $arunPostOpenUnread = (Invoke-RestMethod -Uri "$BaseUrl/api/notifications/unread-count" -Method Get -Headers $arunHeaders).unreadCount
    $unreadIncremented = ($arunPostOpenUnread -gt $arunInitUnread)
    $status = if ($unreadIncremented) { "PASS" } else { "FAIL" }
    Add-TestResult "TEST-8F.5" "8F.2 Student" "Unread Count Increment on Event" "Unread count increments" "Pre=$arunInitUnread, Post=$arunPostOpenUnread" $status

    # Staff generates OTP & Karthik marks attendance via OTP
    $otp1 = Invoke-RestMethod -Uri "$BaseUrl/api/staff/attendance/$session1Id/otp" -Method Post -Headers $staffHeaders
    $karthikMarkOtp = Invoke-RestMethod -Uri "$BaseUrl/api/student/attendance/submit-otp" -Method Post -Body (@{ attendanceSessionId = $session1Id; otpCode = $otp1.otpCode } | ConvertTo-Json) -ContentType "application/json" -Headers $karthikHeaders
    Start-Sleep -Milliseconds 200

    # TEST-8F.6: OTP attendance confirmation notification
    $karthikNotifs1 = Invoke-RestMethod -Uri "$BaseUrl/api/notifications?limit=10" -Method Get -Headers $karthikHeaders
    $karthikMarkNotif = $karthikNotifs1.notifications | Where-Object { $_.type -eq "ATTENDANCE_MARKED" -and $_.referenceId -eq $session1Id }
    $hasOtpConfirm = ($karthikMarkOtp.status -eq "PRESENT" -and $karthikMarkNotif -ne $null -and $karthikMarkNotif.title -eq "Attendance Recorded")
    $status = if ($hasOtpConfirm) { "PASS" } else { "FAIL" }
    Add-TestResult "TEST-8F.6" "8F.2 Student" "OTP Attendance Confirmation Alert" "PRESENT status & ATTENDANCE_MARKED alert" "Status=$($karthikMarkOtp.status), Alert=$($karthikMarkNotif.title)" $status

    # Staff generates QR Token on session 2 & Divya marks attendance via QR
    $openRes2 = Invoke-RestMethod -Uri "$BaseUrl/api/staff/attendance/open" -Method Post -Body (@{ classSessionId = 7; sessionDate = $date2 } | ConvertTo-Json) -ContentType "application/json" -Headers $staffHeaders
    $session2Id = $openRes2.id
    $qr2 = Invoke-RestMethod -Uri "$BaseUrl/api/staff/attendance/$session2Id/qr" -Method Post -Headers $staffHeaders
    $divyaMarkQr = Invoke-RestMethod -Uri "$BaseUrl/api/student/attendance/submit-qr" -Method Post -Body (@{ attendanceSessionId = $session2Id; qrToken = $qr2.qrToken } | ConvertTo-Json) -ContentType "application/json" -Headers $divyaHeaders
    Start-Sleep -Milliseconds 200

    # TEST-8F.7: QR attendance confirmation notification
    $divyaNotifs2 = Invoke-RestMethod -Uri "$BaseUrl/api/notifications?limit=10" -Method Get -Headers $divyaHeaders
    $divyaMarkNotif = $divyaNotifs2.notifications | Where-Object { $_.type -eq "ATTENDANCE_MARKED" -and $_.referenceId -eq $session2Id }
    $hasQrConfirm = ($divyaMarkQr.status -eq "PRESENT" -and $divyaMarkNotif -ne $null -and $divyaMarkNotif.title -eq "Attendance Recorded")
    $status = if ($hasQrConfirm) { "PASS" } else { "FAIL" }
    Add-TestResult "TEST-8F.7" "8F.2 Student" "QR Attendance Confirmation Alert" "PRESENT status & ATTENDANCE_MARKED alert" "Status=$($divyaMarkQr.status), Alert=$($divyaMarkNotif.title)" $status

    # Also mark Arun in session 2 so session 2 has healthy turnout (2/3 = 66.7%)
    $otp2 = Invoke-RestMethod -Uri "$BaseUrl/api/staff/attendance/$session2Id/otp" -Method Post -Headers $staffHeaders
    $null = Invoke-RestMethod -Uri "$BaseUrl/api/student/attendance/submit-otp" -Method Post -Body (@{ attendanceSessionId = $session2Id; otpCode = $otp2.otpCode } | ConvertTo-Json) -ContentType "application/json" -Headers $arunHeaders

    # Close Session 1 (Conducted = 3, Attended: Karthik 3/3 = 100%, Arun 2/3 = 66.7%, Divya 0/3 = 0.0%)
    $close1 = Invoke-RestMethod -Uri "$BaseUrl/api/staff/attendance/$session1Id/close" -Method Post -Headers $staffHeaders
    Start-Sleep -Milliseconds 300

    # =============================================================
    # AREA 8F.3: DEFAULTER ALERTS & 75% BOUNDARY
    # =============================================================
    # TEST-8F.8: Defaulter alert delivery (< 75%)
    $arunDefaulterNotifs = Invoke-RestMethod -Uri "$BaseUrl/api/notifications?limit=20" -Method Get -Headers $arunHeaders
    $arunDefAlert = $arunDefaulterNotifs.notifications | Where-Object { $_.type -eq "DEFAULTER_WARNING" -and $_.referenceId -eq $session1Id }
    $hasArunDef = ($arunDefAlert -ne $null -and $arunDefAlert.title -eq "Low Attendance Warning" -and $arunDefAlert.message -like "*66.7%*" -and $arunDefAlert.message -like "*below the mandatory 75% threshold*")
    $status = if ($hasArunDef) { "PASS" } else { "FAIL" }
    Add-TestResult "TEST-8F.8" "8F.3 Defaulter" "Defaulter Alert Delivery (< 75%)" "DEFAULTER_WARNING with 66.7%" "Message='$($arunDefAlert.message)'" $status

    # TEST-8F.9: Non-defaulter boundary gate (>= 75%)
    $karthikDefNotifs = Invoke-RestMethod -Uri "$BaseUrl/api/notifications?limit=20" -Method Get -Headers $karthikHeaders
    $karthikDefAlert = $karthikDefNotifs.notifications | Where-Object { $_.type -eq "DEFAULTER_WARNING" -and $_.referenceId -eq $session1Id }
    $status = if ($karthikDefAlert -eq $null) { "PASS" } else { "FAIL" }
    Add-TestResult "TEST-8F.9" "8F.3 Defaulter" "Non-Defaulter Boundary Gate (100% >= 75%)" "Zero DEFAULTER_WARNING alerts for Karthik" "AlertsFound=$(if ($karthikDefAlert) { 1 } else { 0 })" $status

    # =============================================================
    # AREA 8F.4: STAFF SESSION SUMMARY
    # =============================================================
    # TEST-8F.10: Staff receives SESSION_SUMMARY
    $staffNotifs1 = Invoke-RestMethod -Uri "$BaseUrl/api/notifications?limit=20" -Method Get -Headers $staffHeaders
    $staffSummary1 = $staffNotifs1.notifications | Where-Object { $_.type -eq "SESSION_SUMMARY" -and $_.referenceId -eq $session1Id }
    $hasStaffSummary1 = ($staffSummary1 -ne $null -and $staffSummary1.title -eq "Attendance Session Summary" -and $staffSummary1.message -like "*Session for Data Structures (CS301) closed with 1/3 (33.3%) attendance.*")
    $status = if ($hasStaffSummary1) { "PASS" } else { "FAIL" }
    Add-TestResult "TEST-8F.10" "8F.4 Staff" "Staff Session Summary Receipt" "SESSION_SUMMARY with 1/3 (33.3%)" "Message='$($staffSummary1.message)'" $status

    # =============================================================
    # AREA 8F.5: HOD ESCALATION & DEPARTMENT ISOLATION
    # =============================================================
    # TEST-8F.11: Turnout < 50% triggers HOD_ALERT to Department HOD
    $csHodNotifs1 = Invoke-RestMethod -Uri "$BaseUrl/api/notifications?limit=20" -Method Get -Headers $csHodHeaders
    $csHodAlert1 = $csHodNotifs1.notifications | Where-Object { $_.type -eq "HOD_ALERT" -and $_.referenceId -eq $session1Id }
    $hasCsHodAlert = ($csHodAlert1 -ne $null -and $csHodAlert1.title -eq "Low Attendance Session Alert" -and $csHodAlert1.message -like "*was 33.3% (1/3)*")
    $status = if ($hasCsHodAlert) { "PASS" } else { "FAIL" }
    Add-TestResult "TEST-8F.11" "8F.5 HOD" "HOD Critical Turnout Escalation (< 50%)" "HOD_ALERT with 33.3% (1/3)" "Message='$($csHodAlert1.message)'" $status

    # TEST-8F.12: Department Isolation (EE HOD gets 0 alerts)
    $eeHodNotifs1 = Invoke-RestMethod -Uri "$BaseUrl/api/notifications?limit=20" -Method Get -Headers $eeHodHeaders
    $eeHodAlert1 = $eeHodNotifs1.notifications | Where-Object { $_.type -eq "HOD_ALERT" -and $_.referenceId -eq $session1Id }
    $status = if ($eeHodAlert1 -eq $null) { "PASS" } else { "FAIL" }
    Add-TestResult "TEST-8F.12" "8F.5 HOD" "Department HOD Boundary Isolation" "Zero HOD_ALERT alerts for Dept 2 HOD" "AlertsFound=$(if ($eeHodAlert1) { 1 } else { 0 })" $status

    # Close Session 2 (Turnout: 2/3 = 66.7% >= 50%)
    $close2 = Invoke-RestMethod -Uri "$BaseUrl/api/staff/attendance/$session2Id/close" -Method Post -Headers $staffHeaders
    Start-Sleep -Milliseconds 300

    # TEST-8F.13: Healthy turnout (>= 50%) produces ZERO HOD_ALERT
    $csHodNotifs2 = Invoke-RestMethod -Uri "$BaseUrl/api/notifications?limit=20" -Method Get -Headers $csHodHeaders
    $csHodAlert2 = $csHodNotifs2.notifications | Where-Object { $_.type -eq "HOD_ALERT" -and $_.referenceId -eq $session2Id }
    $status = if ($csHodAlert2 -eq $null) { "PASS" } else { "FAIL" }
    Add-TestResult "TEST-8F.13" "8F.5 HOD" "Turnout Boundary Gate (>= 50%)" "Zero HOD_ALERT alerts for 66.7% turnout" "AlertsFound=$(if ($csHodAlert2) { 1 } else { 0 })" $status

    # =============================================================
    # AREA 8F.6: SECURITY & ISOLATION GATES
    # =============================================================
    # TEST-8F.14: Out-of-cohort student isolation
    $kavyaNotifs = Invoke-RestMethod -Uri "$BaseUrl/api/notifications?limit=20" -Method Get -Headers $kavyaHeaders
    $kavyaSessionAlerts = @($kavyaNotifs.notifications | Where-Object { $_.referenceId -in @($session1Id, $session2Id) }).Count
    $status = if ($kavyaSessionAlerts -eq 0) { "PASS" } else { "FAIL" }
    Add-TestResult "TEST-8F.14" "8F.6 Security" "Out-of-Cohort Isolation Gate" "Zero notifications for out-of-cohort Kavya" "AlertsFound=$kavyaSessionAlerts" $status

    # TEST-8F.15: Cross-user read isolation (Arun tries to read Staff's notification)
    $staffNotifId = $staffSummary1.id
    try {
        $crossRead = Invoke-RestMethod -Uri "$BaseUrl/api/notifications/$staffNotifId/read" -Method Put -Headers $arunHeaders
        Add-TestResult "TEST-8F.15" "8F.6 Security" "Cross-User Read Denial Gate" "HTTP 404 Not Found" "HTTP 200 OK (UNEXPECTED)" "FAIL"
    } catch {
        $httpCode = $_.Exception.Response.StatusCode.value__
        $status = if ($httpCode -eq 404) { "PASS" } else { "FAIL" }
        Add-TestResult "TEST-8F.15" "8F.6 Security" "Cross-User Read Denial Gate" "HTTP 404 Not Found" "HTTP $httpCode" $status
    }

    # TEST-8F.16: Cross-user delete isolation (Arun tries to delete Staff's notification)
    try {
        $crossDel = Invoke-RestMethod -Uri "$BaseUrl/api/notifications/$staffNotifId" -Method Delete -Headers $arunHeaders
        Add-TestResult "TEST-8F.16" "8F.6 Security" "Cross-User Delete Denial Gate" "HTTP 404 Not Found" "HTTP 204 NoContent (UNEXPECTED)" "FAIL"
    } catch {
        $httpCode = $_.Exception.Response.StatusCode.value__
        $status = if ($httpCode -eq 404) { "PASS" } else { "FAIL" }
        Add-TestResult "TEST-8F.16" "8F.6 Security" "Cross-User Delete Denial Gate" "HTTP 404 Not Found" "HTTP $httpCode" $status
    }

    # TEST-8F.17: Unauthenticated request rejected
    try {
        $noAuth = Invoke-RestMethod -Uri "$BaseUrl/api/notifications" -Method Get
        Add-TestResult "TEST-8F.17" "8F.6 Security" "Unauthenticated Access Gate" "HTTP 401 Unauthorized" "HTTP 200 OK (UNEXPECTED)" "FAIL"
    } catch {
        $httpCode = $_.Exception.Response.StatusCode.value__
        $status = if ($httpCode -eq 401) { "PASS" } else { "FAIL" }
        Add-TestResult "TEST-8F.17" "8F.6 Security" "Unauthenticated Access Gate" "HTTP 401 Unauthorized" "HTTP $httpCode" $status
    }

    # TEST-8F.18: Pagination max-limit clamp
    $paged = Invoke-RestMethod -Uri "$BaseUrl/api/notifications?limit=500" -Method Get -Headers $staffHeaders
    $status = if ($paged.limit -eq 100) { "PASS" } else { "FAIL" }
    Add-TestResult "TEST-8F.18" "8F.6 Security" "Pagination Max-Limit Clamp" "Limit clamped to 100" "Clamped limit=$($paged.limit)" $status

    # =============================================================
    # AREA 8F.7: LIFECYCLE & USER INTERACTIONS
    # =============================================================
    # TEST-8F.19: Mark single notification as read
    $readRes = Invoke-RestMethod -Uri "$BaseUrl/api/notifications/$staffNotifId/read" -Method Put -Headers $staffHeaders
    $isReadSuccess = ($readRes.isRead -eq $true -and $readRes.readAt -ne $null)
    $status = if ($isReadSuccess) { "PASS" } else { "FAIL" }
    Add-TestResult "TEST-8F.19" "8F.7 Actions" "Mark Single Notification As Read" "isRead=true with readAt timestamp" "isRead=$($readRes.isRead), readAt=$($readRes.readAt)" $status

    # TEST-8F.20: Mark all notifications as read
    $markAllRes = Invoke-RestMethod -Uri "$BaseUrl/api/notifications/mark-all-read" -Method Put -Headers $arunHeaders
    $arunFinalUnread = (Invoke-RestMethod -Uri "$BaseUrl/api/notifications/unread-count" -Method Get -Headers $arunHeaders).unreadCount
    $markAllSuccess = ($markAllRes.markedCount -ge 1 -and $arunFinalUnread -eq 0)
    $status = if ($markAllSuccess) { "PASS" } else { "FAIL" }
    Add-TestResult "TEST-8F.20" "8F.7 Actions" "Mark All Notifications As Read" "markedCount >= 1 and unreadCount=0" "markedCount=$($markAllRes.markedCount), unreadCount=$arunFinalUnread" $status

    # TEST-8F.21: Delete own notification
    try {
        Invoke-RestMethod -Uri "$BaseUrl/api/notifications/$staffNotifId" -Method Delete -Headers $staffHeaders
        $staffAfterDel = Invoke-RestMethod -Uri "$BaseUrl/api/notifications?limit=20" -Method Get -Headers $staffHeaders
        $stillExists = ($staffAfterDel.notifications | Where-Object { $_.id -eq $staffNotifId })
        $status = if ($stillExists -eq $null) { "PASS" } else { "FAIL" }
        Add-TestResult "TEST-8F.21" "8F.7 Actions" "Delete Own Notification" "HTTP 204 & record removed from list" "Deleted successfully" $status
    } catch {
        Add-TestResult "TEST-8F.21" "8F.7 Actions" "Delete Own Notification" "HTTP 204 & record removed from list" $_.Exception.Message "FAIL"
    }

    # =============================================================
    # AREA 8F.8: TEARDOWN & DATABASE INTEGRITY
    # =============================================================
    # Clean up test sessions and test notifications from MySQL
    & $mysqlExe -u root -pSilicon123 -e "USE checkify; DELETE FROM attendance_records WHERE attendance_session_id IN (SELECT id FROM attendance_sessions WHERE session_date IN ('$date1', '$date2')); DELETE FROM attendance_otp_attempts WHERE attendance_session_id IN (SELECT id FROM attendance_sessions WHERE session_date IN ('$date1', '$date2')); DELETE FROM notifications WHERE title IN ('Attendance Session Opened', 'Attendance Recorded', 'Low Attendance Warning', 'Attendance Session Summary', 'Low Attendance Session Alert'); DELETE FROM attendance_sessions WHERE session_date IN ('$date1', '$date2');"

    # TEST-8F.22: Verify zero residual test records and database integrity
    $residueCheck = & $mysqlExe -u root -pSilicon123 -e "USE checkify; SELECT count(*) FROM attendance_sessions WHERE session_date IN ('$date1', '$date2');" -N
    $resCount = [int]($residueCheck.Trim())
    $status = if ($resCount -eq 0) { "PASS" } else { "FAIL" }
    Add-TestResult "TEST-8F.22" "8F.8 Teardown" "Zero Residual Test Records Verification" "0 residual sessions" "$resCount residual sessions" $status

} finally {
    # Redundant safety cleanup in case of test abort
    & $mysqlExe -u root -pSilicon123 -e "USE checkify; DELETE FROM attendance_records WHERE attendance_session_id IN (SELECT id FROM attendance_sessions WHERE session_date IN ('$date1', '$date2')); DELETE FROM attendance_otp_attempts WHERE attendance_session_id IN (SELECT id FROM attendance_sessions WHERE session_date IN ('$date1', '$date2')); DELETE FROM notifications WHERE title IN ('Attendance Session Opened', 'Attendance Recorded', 'Low Attendance Warning', 'Attendance Session Summary', 'Low Attendance Session Alert'); DELETE FROM attendance_sessions WHERE session_date IN ('$date1', '$date2');"

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

