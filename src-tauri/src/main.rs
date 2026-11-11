// 发布版不弹黑色命令行窗口
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    sidebar_todo_lib::run()
}
