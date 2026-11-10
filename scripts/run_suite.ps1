# Start API process
$apiProcess = Start-Process -FilePath "dotnet" -ArgumentList "run --launch-profile http" -WorkingDirectory "d:\Varun\Attendance\Smart-Attendance-Management-System\backend-dotnet\Checkify.API" -PassThru

try {
    # Wait for API to become ready
    $ready = $false
    for ($i = 0; $i -lt 25; $i++) {
        Start-Sleep -Seconds 1
        try {
            $h = Invoke-RestMethod -Uri "http://localhost:5006/api/health/db" -Method Get -TimeoutSec 2 -ErrorAction Stop
            if ($h.status -eq "Connected") {
                $ready = $true
                break
            }
        } catch { }
    }

    if (-not $ready) {
        Write-Host "API failed to become ready at http://localhost:5006."
        exit 1
    }

    # Run the test runner
    & powershell -ExecutionPolicy Bypass -File "d:\Varun\Attendance\Smart-Attendance-Management-System\scripts\test_milestone_7E.ps1"
} finally {
    if ($apiProcess -and -not $apiProcess.HasExited) {
        Stop-Process -Id $apiProcess.Id -Force -ErrorAction SilentlyContinue
    }
}

