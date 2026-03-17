# Logger Launcher Setup — Windows
# Run this once in PowerShell to create a Logger shortcut you can pin to your Taskbar.

param(
    [Parameter(Mandatory=$true)]
    [string]$LoggerDir
)

# Resolve to absolute path
$LoggerDir = (Resolve-Path $LoggerDir).Path

if (-not (Test-Path "$LoggerDir\CLAUDE.md")) {
    Write-Host "Error: CLAUDE.md not found in $LoggerDir" -ForegroundColor Red
    Write-Host "Make sure you're pointing at the logger folder."
    exit 1
}

# Create the launcher batch file
$LauncherDir = "$env:LOCALAPPDATA\Logger"
$LauncherBat = "$LauncherDir\Logger.bat"
$ShortcutPath = "$env:USERPROFILE\Desktop\Logger.lnk"

New-Item -ItemType Directory -Path $LauncherDir -Force | Out-Null

# Write the batch file
@"
@echo off
cd /d "$LoggerDir"
claude --dangerously-skip-permissions
"@ | Set-Content -Path $LauncherBat -Encoding ASCII

# Create desktop shortcut
$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = $LauncherBat
$Shortcut.WorkingDirectory = $LoggerDir
$Shortcut.Description = "Logger — Log Dynamics CRM engagements"
$Shortcut.Save()

Write-Host ""
Write-Host "Logger shortcut created on your Desktop!" -ForegroundColor Green
Write-Host ""
Write-Host "To pin to your Taskbar:" -ForegroundColor Cyan
Write-Host "  1. Double-click the Logger shortcut on your Desktop to test it"
Write-Host "  2. While it's running, right-click Logger in the Taskbar"
Write-Host "  3. Click 'Pin to taskbar'"
Write-Host ""
