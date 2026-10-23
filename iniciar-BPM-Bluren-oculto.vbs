' Inicia BPM Bluren en segundo plano sin mostrar la consola negra.
' Doble clic en este archivo para iniciar el motor silenciosamente.

Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)

' Ejecuta el servidor escuchando en toda la red local con ventana oculta (0)
WshShell.Run "cmd /c cd /d """ & scriptDir & """ && npm run start:host", 0, False
