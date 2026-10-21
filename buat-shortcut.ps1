param([switch]$Autostart)
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ws = New-Object -ComObject WScript.Shell

function Make-Link($path, $linkArgs) {
  $lnk = $ws.CreateShortcut($path)
  $lnk.TargetPath = "$env:WINDIR\System32\wscript.exe"
  $lnk.Arguments = $linkArgs
  $lnk.WorkingDirectory = $dir
  $lnk.IconLocation = "$dir\asmr.ico"
  $lnk.Save()
}

Make-Link (Join-Path ([Environment]::GetFolderPath("Desktop")) "ASMR Pribadi.lnk") "`"$dir\asmr.vbs`""
if ($Autostart) {
  Make-Link (Join-Path ([Environment]::GetFolderPath("Startup")) "ASMR Server.lnk") "`"$dir\asmr.vbs`" server"
}
