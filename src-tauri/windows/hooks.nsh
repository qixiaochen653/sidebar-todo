; Sidebar Todo - NSIS installer hooks
; Before uninstalling, copy the user's data (data.json, backups.json) to
; Documents\SidebarTodo-Backup, so nothing is lost even if
; "delete application data" is ticked in the uninstaller.
!macro NSIS_HOOK_PREUNINSTALL
  IfFileExists "$APPDATA\com.haovu.sidebartodo\data.json" 0 sidebar_todo_no_data
    CreateDirectory "$DOCUMENTS\SidebarTodo-Backup"
    CopyFiles /SILENT "$APPDATA\com.haovu.sidebartodo\*.json" "$DOCUMENTS\SidebarTodo-Backup"
  sidebar_todo_no_data:
!macroend
