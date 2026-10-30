# Creates a Desktop Shortcut for Stremio Mihon Mod
$desktopDir = [Environment]::GetFolderPath("Desktop")
$shortcutPath = Join-Path $desktopDir "Stremio (Mihon Mod).lnk"

$projectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$targetExe = Join-Path $projectDir "StremioMihon.exe"

$wshShell = New-Object -ComObject WScript.Shell
$shortcut = $wshShell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $targetExe
$shortcut.WorkingDirectory = $projectDir
$shortcut.IconLocation = "$targetExe,0"
$shortcut.Description = "Stremio with Tachiyomi / Mihon Categories, Genre Filtering & In-Library Search Mod"
$shortcut.Save()

Write-Host "Created Desktop Shortcut at: $shortcutPath"
