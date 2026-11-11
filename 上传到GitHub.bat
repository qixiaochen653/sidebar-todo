@echo off
rem 边栏待办 · 上传到 GitHub：把当前代码作为一个新版本推到 github.com/qixiaochen653/sidebar-todo
rem 本地的完整历史不会上传，GitHub 上每次只多一个干净的提交；GitHub 网页上的 .github 文件夹（自动打包配置）会保留
cd /d "%~dp0"
title 边栏待办 · 上传到 GitHub
where git >nul 2>nul || (echo  找不到 git。 & pause & exit /b 1)
git config user.name "qixiaochen"
git config user.email "178653759+qixiaochen653@users.noreply.github.com"
for /f "tokens=2 delims=:, " %%V in ('findstr /c:"\"version\"" package.json') do set "VER=%%~V"
git add -A
git diff --cached --quiet || git commit -q -m "%VER%"
git remote get-url origin >nul 2>nul || git remote add origin https://github.com/qixiaochen653/sidebar-todo.git
echo  正在读取 GitHub 上的版本……
git fetch -q origin main || goto fail
set "GIT_INDEX_FILE=%TEMP%\sidebar-todo-upload-index"
git read-tree HEAD || goto fail
git cat-file -e HEAD:.github 2>nul || (git cat-file -e origin/main:.github 2>nul && git read-tree --prefix=.github/ origin/main:.github)
for /f %%T in ('git write-tree') do set "TREE=%%T"
set "GIT_INDEX_FILE="
for /f %%P in ('git rev-parse "origin/main^{tree}"') do if "%%P"=="%TREE%" (echo  代码和 GitHub 上的一样，不用传。 & pause & exit /b 0)
for /f %%C in ('git commit-tree %TREE% -p origin/main -m "边栏待办 %VER%"') do set "C=%%C"
echo.
echo  正在上传……第一次会弹出 GitHub 授权窗口，点「Sign in with your browser」并授权即可。
echo.
git push origin %C%:refs/heads/main || goto fail
echo.
echo  上传完成：https://github.com/qixiaochen653/sidebar-todo
echo.
pause
exit /b 0
:fail
set "GIT_INDEX_FILE="
echo.
echo  上传失败，请把上面的内容截图发给 Claude。
pause
exit /b 1
