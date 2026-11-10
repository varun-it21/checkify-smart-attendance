<#
.SYNOPSIS
    Milestone 9A - Leave Schema & Database Verification Test Runner
#>

param(
    [string]$DbUser = "root",
    [string]$DbPass = "Silicon123",
    [string]$DbName = "checkify"
)

$ErrorActionPreference = "Continue"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "    CHECKIFY MILESTONE 9A - LEAVE SCHEMA VALIDATION       " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$mysqlExe = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
if (-not (Test-Path $mysqlExe)) {
    Write-Host "MySQL CLI executable not found at $mysqlExe" -ForegroundColor Red
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

function Run-SqlQuery {
    param([string]$Query)
    $output = & $mysqlExe -u $DbUser "-p$DbPass" -e "USE $DbName; $Query" 2>&1
    return $output
}

try {
    # Test 9A.1: Table existence
    $tables = Run-SqlQuery "SHOW TABLES LIKE 'leave_requests';"
    $tableExists = ($tables -match "leave_requests")
    $status1 = if ($tableExists) { "PASS" } else { "FAIL" }
    $actual1 = if ($tableExists) { "Found table" } else { "Missing table" }
    Add-TestResult "TEST-9A.1" "leave_requests table existence" "leave_requests exists" $actual1 $status1

    # Test 9A.2: Required columns and data types
    $cols = Run-SqlQuery "DESCRIBE leave_requests;"
    $colList = ($cols -join "`n")
    $hasRequiredCols = ($colList -match "id\s+int" -and
                        $colList -match "user_id\s+int" -and
                        $colList -match "department_id\s+int" -and
                        $colList -match "applicant_role\s+varchar\(20\)" -and
                        $colList -match "leave_type\s+varchar\(20\)" -and
                        $colList -match "start_date\s+date" -and
                        $colList -match "end_date\s+date" -and
                        $colList -match "reason\s+varchar\(500\)" -and
                        $colList -match "status\s+varchar\(20\)" -and
                        $colList -match "created_at\s+datetime\(6\)")
    $status2 = if ($hasRequiredCols) { "PASS" } else { "FAIL" }
    $actual2 = if ($hasRequiredCols) { "All columns verified" } else { "Column mismatch" }
    Add-TestResult "TEST-9A.2" "Column definitions and types" "All core columns exist with proper types" $actual2 $status2

    # Test 9A.3: Foreign keys with ON DELETE RESTRICT
    $createTable = Run-SqlQuery "SHOW CREATE TABLE leave_requests\G"
    $createTableText = ($createTable -join "`n")
    $hasFkUser = ($createTableText -match 'FK_leave_requests_users_user_id' -and $createTableText -match 'REFERENCES `users` \(`id`\)')
    $hasFkDept = ($createTableText -match 'FK_leave_requests_departments_department_id' -and $createTableText -match 'REFERENCES `departments` \(`department_id`\)')
    $hasFkReviewer = ($createTableText -match 'FK_leave_requests_users_reviewer_user_id' -and $createTableText -match 'REFERENCES `users` \(`id`\)')
    $hasRestrict = ($createTableText -match 'ON DELETE RESTRICT')
    $allFksOk = ($hasFkUser -and $hasFkDept -and $hasFkReviewer -and $hasRestrict)
    $status3 = if ($allFksOk) { "PASS" } else { "FAIL" }
    $actual3 = if ($allFksOk) { "All 3 FKs verified with RESTRICT" } else { "FK mismatch: User=$hasFkUser, Dept=$hasFkDept, Reviewer=$hasFkReviewer, Restrict=$hasRestrict" }
    Add-TestResult "TEST-9A.3" "Foreign Key constraints & RESTRICT delete rules" "User, Department, and Reviewer FKs defined with RESTRICT" $actual3 $status3

    # Test 9A.4: Composite Indexes
    $indexes = Run-SqlQuery "SHOW INDEX FROM leave_requests;"
    $indexText = ($indexes -join "`n")
    $hasUserDatesIndex = ($indexText -match "IX_leave_requests_user_dates")
    $hasDeptStatusIndex = ($indexText -match "IX_leave_requests_dept_status")
    $hasStatusIndex = ($indexText -match "IX_leave_requests_status")
    $allIndexesOk = ($hasUserDatesIndex -and $hasDeptStatusIndex -and $hasStatusIndex)
    $status4 = if ($allIndexesOk) { "PASS" } else { "FAIL" }
    $actual4 = if ($allIndexesOk) { "All composite indexes verified" } else { "Index mismatch" }
    Add-TestResult "TEST-9A.4" "Composite and Status Indexes" "Indexes on user+dates, dept+status, and status exist" $actual4 $status4

    # Test 9A.5: CRUD Integrity & Clean Zero Residue
    $insertQuery = "INSERT INTO leave_requests (user_id, department_id, applicant_role, leave_type, start_date, end_date, reason, status, created_at) VALUES (3, 1, 'STUDENT', 'CASUAL', '2026-11-10', '2026-11-12', 'Test leave request', 'PENDING', UTC_TIMESTAMP());"
    Run-SqlQuery $insertQuery | Out-Null
    
    $fetchQuery = "SELECT id, applicant_role, leave_type, status FROM leave_requests WHERE user_id = 3 AND reason = 'Test leave request';"
    $fetchResult = (Run-SqlQuery $fetchQuery -join " ")
    $insertedOk = ($fetchResult -match "STUDENT" -and $fetchResult -match "CASUAL" -and $fetchResult -match "PENDING")
    
    # Clean up test row
    $deleteQuery = "DELETE FROM leave_requests WHERE user_id = 3 AND reason = 'Test leave request';"
    Run-SqlQuery $deleteQuery | Out-Null
    
    # Confirm residue is 0
    $verifyResidue = (Run-SqlQuery "SELECT COUNT(*) as cnt FROM leave_requests WHERE reason = 'Test leave request';" -join " ")
    $zeroResidue = ($verifyResidue -match "cnt\s+0" -or $verifyResidue -match "\b0\b")
    
    $crudOk = ($insertedOk -and $zeroResidue)
    $status5 = if ($crudOk) { "PASS" } else { "FAIL" }
    $actual5 = if ($crudOk) { "CRUD cycle succeeded with zero residue" } else { "CRUD failure" }
    Add-TestResult "TEST-9A.5" "Database write, read, delete cycle & zero residue" "Insert succeeds, read matches, delete leaves 0 residue" $actual5 $status5
}
catch {
    Write-Host "Unexpected exception: $_" -ForegroundColor Red
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "SUMMARY OF RESULTS" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
$passed = ($results | Where-Object { $_.Status -eq "PASS" }).Count
$total = $results.Count
$summaryColor = if ($passed -eq $total) { "Green" } else { "Red" }
Write-Host "Total Tests: $total | Passed: $passed | Failed: $($total - $passed)" -ForegroundColor $summaryColor

if ($passed -ne $total) {
    exit 1
}
