Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead("d:\Varun\Attendance\Smart-Attendance-Management-System\checkify-frontend-milestone-7D.zip")
$entries = $zip.Entries | Select-Object -ExpandProperty FullName
Write-Host "Total entries in zip: $($entries.Count)"
$hasNodeModules = $entries | Where-Object { $_ -like "*node_modules*" }
$hasDist = $entries | Where-Object { $_ -like "*dist*" }
Write-Host "Has node_modules: $($hasNodeModules -ne $null)"
Write-Host "Has dist: $($hasDist -ne $null)"
$newFiles = @('src/services/reportService.js', 'src/CSS/Reports.css', 'src/pages/ReportsDashboard.jsx', 'src/pages/DefaultersReport.jsx', 'src/pages/AttendanceTrends.jsx')
foreach ($f in $newFiles) {
    $found = $entries | Where-Object { $_ -eq $f -or $_ -eq ($f -replace '/', '\') }
    Write-Host "Contains $f : $($found -ne $null)"
}
$zip.Dispose()

