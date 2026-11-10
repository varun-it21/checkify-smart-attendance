$nodeDir = "C:\Program Files\Microsoft Visual Studio\18\Community\MSBuild\Microsoft\VisualStudio\NodeJs"
$env:Path = "$nodeDir;$env:Path"
Set-Location "d:\Varun\Attendance\Smart-Attendance-Management-System\frontend"
& "$nodeDir\npm.cmd" run build

