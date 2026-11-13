# 边栏待办 · 给 Claude Code 的说明

Windows 贴边待办 + 便签（Tauri 2，前端纯 JS，withGlobalTauri）。当前代码版本见 package.json；线上版本看 GitHub Releases。

## 常用命令
- `npm test`：一句话识别测试 + 界面测试（界面测试需先 `npm install --no-save playwright && npx playwright install chromium`）
- `npm run dev` / `npm run build`：Tauri 开发 / 打包（Windows）
- 本地签名打包：双击 `一键打包.bat`（私钥在 `..\updater-key\sidebar-todo.key`）

## 结构
- `src/shared.js` 数据层（存储合并、迁移 upgrade、重复规则、开始→截止范围 fixSpan 等），所有窗口共用
- `src/main.js` 边栏；`src/calendar.js` 日历；`src/note.*` 桌面便签；`src/quickadd.js` 一句话识别
- `tests/` 测试；`scripts/release-notes.cjs` 从 README 取当前版本说明
- `.github/workflows/release.yml`：先 test 再 release（tauri-action@v0）

## 约定
- 改版本号要同时改：package.json、src-tauri/tauri.conf.json、src-tauri/Cargo.toml、Cargo.lock 里 sidebar-todo 那一项；README 加 `## 版本号` 一节（第一句要能单独看懂，会显示在更新提示里）
- 发布：推到 GitHub 后在 Actions 里运行「发布新版本」；test 不过就不发布，不要去掉 `needs: test`
- 绝不提交私钥（*.key、updater-key/）；提交作者 qixiaochen，邮箱用 GitHub noreply；仓库里不放个人数据
- 多窗口共用 data.json，Rust 端会把字段按字母排序，比较对象要用 shared.js 里的 `J`（按排好序的字段比较）
- 一句话识别加新说法：先在 tests/quickadd.test.cjs 加例子，再改 quickadd.js
- .bat 文件是 GBK 编码
