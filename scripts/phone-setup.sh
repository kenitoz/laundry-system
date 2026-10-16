#!/usr/bin/env bash
# Runs phone-access.ps1 in an Administrator PowerShell window.
# Windows shows a "Do you want to allow this app to make changes" prompt; click Yes.
# Extra arguments are passed through, e.g.  npm run phone:setup -- -Remove
set -euo pipefail

# Copy to the Windows temp folder: an elevated PowerShell can't always read \\wsl$ paths.
win_tmp=$(cmd.exe /c 'echo %TEMP%' 2>/dev/null | tr -d '\r')
cp "$(dirname "$0")/phone-access.ps1" "$(wslpath "$win_tmp")/bubblebee-phone-access.ps1"

args="'-NoProfile','-ExecutionPolicy','Bypass','-NoExit','-File','\"$win_tmp\\bubblebee-phone-access.ps1\"'"
for a in "$@"; do args+=",'$a'"; done
powershell.exe -NoProfile -Command "Start-Process powershell -Verb RunAs -ArgumentList $args"
