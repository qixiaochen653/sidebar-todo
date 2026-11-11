@echo off
rem 边栏待办 · 一键打包：双击运行，打好的安装包会复制到「试用版」文件夹
cd /d "%~dp0"
title 边栏待办 · 正在打包
echo.
echo  正在打包边栏待办，第一次大约要 5-10 分钟，请不要关掉这个窗口……
echo.
where npm >nul 2>nul || (echo  找不到 npm，请先安装 Node.js（见 README）。 & pause & exit /b 1)
where cargo >nul 2>nul || (echo  找不到 cargo，请先安装 Rust（见 README）。 & pause & exit /b 1)
call npm install
rem 更新包需要签名：私钥放在项目外面的 updater-key 文件夹，不会上传到 GitHub
if exist "%~dp0..\updater-key\sidebar-todo.key" (
  set "TAURI_SIGNING_PRIVATE_KEY=%~dp0..\updater-key\sidebar-todo.key"
  set "TAURI_SIGNING_PRIVATE_KEY_PASSWORD="
) else (
  echo  没找到 updater-key\sidebar-todo.key，打包会失败。请问 Claude。
)
call npm run build
if errorlevel 1 (
  echo.
  echo  打包失败了。请把上面的红字或最后几行截图发给 Claude。
  pause
  exit /b 1
)
for /f "tokens=2 delims=:, " %%V in ('findstr /c:"\"version\"" package.json') do set "VER=%%~V"
set "OUT=%~dp0..\试用版"
if not exist "%OUT%" mkdir "%OUT%"
for %%F in ("src-tauri\target\release\bundle\nsis\*_%VER%_x64-setup.exe") do (
  copy /y "%%F" "%OUT%\边栏待办-安装程序-%VER%.exe" >nul
)
echo.
echo  打包完成！安装包已放到：试用版\边栏待办-安装程序-%VER%.exe
echo  安装新版本之前，先在托盘里点「退出」关掉正在运行的旧版本。
echo.
explorer "%OUT%"
pause
