Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead("d:\Varun\Attendance\Smart-Attendance-Management-System\backend-dotnet.zip")
$entries = $zip.Entries | Select-Object -ExpandProperty FullName
Write-Host "Total entries: $($entries.Count)"
$analyticsFiles = $entries | Where-Object { $_ -like "*Analytics*" }
Write-Host "Analytics files in zip:"
$analyticsFiles
$zip.Dispose()

