Add-Type -AssemblyName System.IO.Compression.FileSystem

$baseDir = "d:\Varun\Attendance\Smart-Attendance-Management-System"
$artifactDir = "C:\Users\Varun\.gemini\antigravity\brain\43fef9e3-d0fb-4aaf-ba65-e851d9fe2116"

# 1. Package Backend Production Release
Write-Host "Packaging Checkify Backend Production Release..." -ForegroundColor Cyan
$backendSource = Join-Path $baseDir "backend-dotnet"
$tempBackend = Join-Path $env:TEMP ("checkify_backend_prod_" + [System.Guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $tempBackend -Force | Out-Null

$excludeBackend = @('bin', 'obj', '.vs', '.vscode', '.git')
Get-ChildItem -Path $backendSource -Recurse | ForEach-Object {
    $item = $_
    $relPath = $item.FullName.Substring($backendSource.Length).TrimStart('\', '/')
    $parts = $relPath -split '[\\/]'
    foreach ($part in $parts) {
        if ($excludeBackend -contains $part) { return }
    }
    $destPath = Join-Path $tempBackend $relPath
    if ($item.PSIsContainer) {
        New-Item -ItemType Directory -Path $destPath -Force | Out-Null
    } else {
        $parent = Split-Path $destPath -Parent
        if (-not (Test-Path $parent)) { New-Item -ItemType Directory -Path $parent -Force | Out-Null }
        Copy-Item -Path $item.FullName -Destination $destPath -Force
    }
}

$backendZips = @(
    (Join-Path $baseDir "checkify-backend-production-release.zip"),
    (Join-Path $baseDir "backend-dotnet.zip"),
    (Join-Path $artifactDir "checkify-backend-production-release.zip"),
    (Join-Path $artifactDir "backend-dotnet.zip")
)
foreach ($zip in $backendZips) {
    if (Test-Path $zip) { Remove-Item -Path $zip -Force }
    [System.IO.Compression.ZipFile]::CreateFromDirectory($tempBackend, $zip, [System.IO.Compression.CompressionLevel]::Optimal, $false)
    $len = (Get-Item $zip).Length
    Write-Host "Created: $zip ($len bytes)" -ForegroundColor Green
}
Remove-Item -Path $tempBackend -Recurse -Force

# 2. Package Frontend Production Release
Write-Host "`nPackaging Checkify Frontend Production Release..." -ForegroundColor Cyan
$frontendSource = Join-Path $baseDir "frontend"
$tempFrontend = Join-Path $env:TEMP ("checkify_frontend_prod_" + [System.Guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $tempFrontend -Force | Out-Null

$excludeFrontend = @('node_modules', 'dist', '.git', '.vs', '.vscode')
Get-ChildItem -Path $frontendSource -Recurse | ForEach-Object {
    $item = $_
    $relPath = $item.FullName.Substring($frontendSource.Length).TrimStart('\', '/')
    $firstSeg = ($relPath -split '[\\/]')[0]
    if ($excludeFrontend -contains $firstSeg) { return }
    if ($item.Name -eq '.env.local') { return }

    $destPath = Join-Path $tempFrontend $relPath
    if ($item.PSIsContainer) {
        New-Item -ItemType Directory -Path $destPath -Force | Out-Null
    } else {
        $parent = Split-Path $destPath -Parent
        if (-not (Test-Path $parent)) { New-Item -ItemType Directory -Path $parent -Force | Out-Null }
        Copy-Item -Path $item.FullName -Destination $destPath -Force
    }
}

$frontendZips = @(
    (Join-Path $baseDir "checkify-frontend-production-release.zip"),
    (Join-Path $baseDir "frontend.zip"),
    (Join-Path $artifactDir "checkify-frontend-production-release.zip"),
    (Join-Path $artifactDir "frontend.zip")
)
foreach ($zip in $frontendZips) {
    if (Test-Path $zip) { Remove-Item -Path $zip -Force }
    [System.IO.Compression.ZipFile]::CreateFromDirectory($tempFrontend, $zip, [System.IO.Compression.CompressionLevel]::Optimal, $false)
    $len = (Get-Item $zip).Length
    Write-Host "Created: $zip ($len bytes)" -ForegroundColor Green
}
Remove-Item -Path $tempFrontend -Recurse -Force

# 3. Package Docker Deployment Bundle
Write-Host "`nPackaging Checkify Docker Deployment Bundle..." -ForegroundColor Cyan
$tempDocker = Join-Path $env:TEMP ("checkify_docker_prod_" + [System.Guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $tempDocker -Force | Out-Null

Copy-Item -Path (Join-Path $baseDir "docker-compose.yml") -Destination (Join-Path $tempDocker "docker-compose.yml")
Copy-Item -Path (Join-Path $baseDir "DEPLOYMENT.md") -Destination (Join-Path $tempDocker "DEPLOYMENT.md")
Copy-Item -Path (Join-Path $baseDir "frontend\nginx.conf") -Destination (Join-Path $tempDocker "nginx.conf")
Copy-Item -Path (Join-Path $baseDir "backend-dotnet\Dockerfile") -Destination (Join-Path $tempDocker "Dockerfile.backend")
Copy-Item -Path (Join-Path $baseDir "frontend\Dockerfile") -Destination (Join-Path $tempDocker "Dockerfile.frontend")

$dockerZips = @(
    (Join-Path $baseDir "checkify-docker-deployment.zip"),
    (Join-Path $artifactDir "checkify-docker-deployment.zip")
)
foreach ($zip in $dockerZips) {
    if (Test-Path $zip) { Remove-Item -Path $zip -Force }
    [System.IO.Compression.ZipFile]::CreateFromDirectory($tempDocker, $zip, [System.IO.Compression.CompressionLevel]::Optimal, $false)
    $len = (Get-Item $zip).Length
    Write-Host "Created: $zip ($len bytes)" -ForegroundColor Green
}
Remove-Item -Path $tempDocker -Recurse -Force

Write-Host "`nAll Production Release Archives generated successfully!" -ForegroundColor Green

