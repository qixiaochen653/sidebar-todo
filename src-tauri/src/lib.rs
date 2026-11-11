// Rust 这边只负责“注册插件”，具体功能都在 src/main.js 里用 JS 调用。
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // 只允许开一个：再次双击程序时，不会出现第二个边栏
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(w) = app.get_webview_window("main") {
                let _ = w.show();
            }
        }))
        // 把数据存成 AppData 里的 JSON 文件
        .plugin(tauri_plugin_store::Builder::default().build())
        // 全局快捷键（Alt+Shift+D 呼出面板）
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        // Windows 系统通知
        .plugin(tauri_plugin_notification::init())
        // 开机自启
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        // 自动更新：从 GitHub Releases 检查新版本（签名校验，防止冒充）
        .plugin(tauri_plugin_updater::Builder::new().build())
        // 更新装好后重启程序
        .plugin(tauri_plugin_process::init())
        .run(tauri::generate_context!())
        .expect("启动边栏待办时出错");
}
