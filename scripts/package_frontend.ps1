Add-Type -AssemblyName System.IO.Compression.FileSystem

$sourceDir = "d:\Varun\Attendance\Smart-Attendance-Management-System\frontend"
$tempDir = Join-Path $env:TEMP ("checkify_frontend_pkg_" + [System.Guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

$excludeDirs = @('node_modules', 'dist', '.git', '.vs', '.vscode')

Get-ChildItem -Path $sourceDir -Recurse | ForEach-Object {
    $item = $_
    $relPath = $item.FullName.Substring($sourceDir.Length).TrimStart('\', '/')
    $firstSeg = ($relPath -split '[\\/]')[0]
    if ($excludeDirs -contains $firstSeg) {
        return
    }
    if ($item.Name -eq '.env.local') {
        return
    }

    $destPath = Join-Path $tempDir $relPath
    if ($item.PSIsContainer) {
        New-Item -ItemType Directory -Path $destPath -Force | Out-Null
    } else {
        $parent = Split-Path $destPath -Parent
        if (-not (Test-Path $parent)) {
            New-Item -ItemType Directory -Path $parent -Force | Out-Null
        }
        Copy-Item -Path $item.FullName -Destination $destPath -Force
    }
}

$destZips = @(
    "d:\Varun\Attendance\Smart-Attendance-Management-System\checkify-frontend-milestone-9H.zip",
    "d:\Varun\Attendance\Smart-Attendance-Management-System\checkify-frontend-milestone-9.zip",
    "d:\Varun\Attendance\Smart-Attendance-Management-System\frontend.zip",
    "C:\Users\Varun\.gemini\antigravity\brain\43fef9e3-d0fb-4aaf-ba65-e851d9fe2116\checkify-frontend-milestone-9H.zip",
    "C:\Users\Varun\.gemini\antigravity\brain\43fef9e3-d0fb-4aaf-ba65-e851d9fe2116\checkify-frontend-milestone-9.zip",
    "C:\Users\Varun\.gemini\antigravity\brain\43fef9e3-d0fb-4aaf-ba65-e851d9fe2116\frontend.zip"
)

foreach ($zipPath in $destZips) {
    if (Test-Path $zipPath) { Remove-Item -Path $zipPath -Force }
    [System.IO.Compression.ZipFile]::CreateFromDirectory($tempDir, $zipPath, [System.IO.Compression.CompressionLevel]::Optimal, $false)
    $len = (Get-Item $zipPath).Length
    Write-Host "Created: $zipPath ($len bytes)"
}

Remove-Item -Path $tempDir -Recurse -Force

