' asmr.vbs - jalankan server tanpa jendela hitam, lalu buka aplikasinya.
' Dengan argumen "server": hanya menyalakan server (dipakai untuk autostart).
Option Explicit
Dim sh, fso, dir, url, i
Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
dir = fso.GetParentFolderName(WScript.ScriptFullName)
url = "http://127.0.0.1:3000"
sh.CurrentDirectory = dir

If Not fso.FolderExists(dir & "\.next") Then
  MsgBox "Aplikasi belum di-setup. Jalankan setup.bat dulu (cukup sekali).", 48, "ASMR Pribadi"
  WScript.Quit
End If

Function ServerUp()
  On Error Resume Next
  Dim http
  Set http = CreateObject("MSXML2.ServerXMLHTTP")
  http.setTimeouts 500, 500, 500, 500
  http.Open "GET", url, False
  http.Send
  ServerUp = (Err.Number = 0)
End Function

' Kalau server sudah jalan, perintah ini gagal diam-diam (port dipakai) dan tidak masalah.
If Not ServerUp() Then sh.Run "cmd /c npm run start", 0, False

If WScript.Arguments.Count > 0 Then WScript.Quit

For i = 1 To 40
  If ServerUp() Then Exit For
  WScript.Sleep 500
Next

On Error Resume Next
sh.Run "msedge --app=" & url, 1, False
If Err.Number <> 0 Then
  Err.Clear
  sh.Run url
End If
