# Lets phones on the same Wi-Fi/LAN open the dev app running inside WSL.
# Windows 10 has no WSL "mirrored" networking, so this forwards the PC's port
# into WSL and opens it in Windows Firewall for the local subnet only.
#
# Run as Administrator (npm run phone:setup does this for you).
# Re-run after restarting Windows or WSL: the WSL IP address changes.
# Undo everything with:  phone-access.ps1 -Remove
param([int]$Port = 5180, [switch]$Remove)

$rule = "Bubblebee dev ($Port)"
netsh interface portproxy delete v4tov4 listenport=$Port listenaddress=0.0.0.0 2>&1 | Out-Null

if ($Remove) {
  Remove-NetFirewallRule -DisplayName $rule -ErrorAction SilentlyContinue
  Write-Host "Phone access on port $Port removed."
  return
}

$wslIp = ((wsl.exe hostname -I) -join ' ').Trim().Split(' ')[0]
if (-not $wslIp) { Write-Error 'Could not read the WSL IP address. Is WSL running?'; return }

netsh interface portproxy add v4tov4 listenport=$Port listenaddress=0.0.0.0 connectport=$Port connectaddress=$wslIp | Out-Null
if (-not (Get-NetFirewallRule -DisplayName $rule -ErrorAction SilentlyContinue)) {
  New-NetFirewallRule -DisplayName $rule -Direction Inbound -Protocol TCP -LocalPort $Port -RemoteAddress LocalSubnet -Action Allow | Out-Null
}

$lan = Get-NetIPAddress -AddressFamily IPv4 |
  Where-Object { $_.InterfaceAlias -notmatch 'vEthernet|Loopback' -and $_.IPAddress -notlike '169.254.*' } |
  Select-Object -ExpandProperty IPAddress
Write-Host "Forwarding port $Port to WSL ($wslIp)."
Write-Host "Start the app in WSL with:  npm run dev:phone"
foreach ($ip in $lan) { Write-Host "Then open on your phone:  http://${ip}:$Port" }
