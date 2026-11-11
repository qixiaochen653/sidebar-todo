# 边栏待办

Windows 贴边待办 + 便签小工具（Tauri 2）。当前版本：**0.6.0**。

下载安装包：https://github.com/qixiaochen653/sidebar-todo/releases/latest

## 0.6 新增

- **自动更新**：打开后会自动检查 GitHub 上有没有新版本，有的话面板顶部提示，点「更新」自动下载安装并重启。托盘菜单里也能手动「检查更新」。

## 发布新版本（给开发者自己看）

1. 改代码，把 `package.json`、`src-tauri/tauri.conf.json`、`src-tauri/Cargo.toml` 里的版本号一起改大（比如 0.6.0 → 0.6.1）。
2. 把代码传到 GitHub。
3. 打开 GitHub 项目的 **Actions → 发布新版本 → Run workflow**。大约 10 分钟后，Releases 里就有新安装包，大家的软件会自动提示更新。

签名私钥放在项目外面的 `updater-key` 文件夹里，**千万不要上传、不要发给别人**；GitHub 上用的是 Settings → Secrets 里的 `TAURI_SIGNING_PRIVATE_KEY`。私钥丢了以后就没法给已安装的用户推更新了，记得备份。

## 0.5.1

- 新装时从空白开始，不再带示例待办、课程和便签（安装包发给别人时不会看到任何内容）。已经在用的人数据不受影响。

## 0.5 新增

- **透明区域不挡鼠标**：面板展开时，面板和页签以外的透明地方可以直接点到下面的软件。
- **自动备份**：每天自动备份一份，保留最近 7 天（存在 `backups.json`，和 `data.json` 分开）。面板底部「数据与外观」里可以恢复到某一天。
- **导出 / 导入**：同样在「数据与外观」里。导出文件存到「下载」文件夹，导入会替换当前数据（6 秒内可撤销）。
- **重复待办**：编辑待办时选「每天 / 工作日 / 每周 / 每月」，勾掉以后自动生成下一次；取消勾选会把下一次收回。
- **面板不透明度**：「数据与外观」里调，壁纸花的时候调高一点。
- **一键打包**：双击 `一键打包.bat`，安装包会复制到 `试用版` 文件夹。
- 项目开始用 git 管理版本。

## 0.4 新增

- **便签库**：便签页签变成多张便签 + 分组，可以搜索、全选、批量移动/删除。旧的那张便签会自动变成「随手记」。
- **桌面便签**：每张便签右上角的开关打开后，会在桌面上弹出一个独立小窗口，可以拖动、改大小、置顶；位置会记住，下次启动自动弹出。
- **日历窗口**：面板顶部的日历按钮（或托盘菜单「打开日历」）打开。周视图 / 月视图，显示农历、节气和节日；拖动待办就能改日期，点日期旁的 ＋ 快速添加，点「待安排」「逾期」打开侧栏。
- 几个窗口之间的数据实时同步。

## 第一次运行前要装的东西（只装一次）

1. **Microsoft C++ 生成工具**：https://visualstudio.microsoft.com/zh-hans/visual-cpp-build-tools/
   运行安装器 → 勾选「使用 C++ 的桌面开发」→ 安装 → 装完重启电脑。
2. **Rust**：https://rustup.rs → 下载 `rustup-init.exe` → 运行后直接按回车（选默认的 1）。
3. **Node.js LTS**：https://nodejs.org → 下载 LTS 版 → 一路下一步。

装完后**新开**一个 PowerShell，输入下面两行，都能显示版本号就对了：

```
rustc --version
node -v
```

## 运行

在 PowerShell 里：

```
cd 项目所在的文件夹
npm install
npm run dev
```

- `npm install` 只需要第一次执行（或者 package.json 改了之后）。
- 第一次 `npm run dev` 要编译 5–10 分钟，之后就快了。
- 运行期间改 `src` 里的文件，窗口会自动刷新。
- 想关掉：点面板右下角「退出」，或者在 PowerShell 里按 `Ctrl + C`。

## 目录说明

| 位置 | 是什么 |
| --- | --- |
| `src/index.html` `src/styles.css` `src/main.js` | 边栏面板的界面和交互 |
| `src/shared.js` | 几个窗口共用：数据、保存、多窗口同步、开窗口 |
| `src/calendar.*` | 日历窗口 |
| `src/note.*` | 桌面便签小窗口 |
| `src/lunar.js` | 农历 / 节气 / 节日离线表（1950–2100） |
| `src-tauri/tauri.conf.json` | 窗口设置：无边框、透明、置顶、不进任务栏 |
| `src-tauri/capabilities/default.json` | 允许前端调用哪些窗口功能 |
| `src-tauri/src/*.rs` | Rust 启动代码，一般不用改 |
| `src-tauri/icons/` | 程序图标 |
