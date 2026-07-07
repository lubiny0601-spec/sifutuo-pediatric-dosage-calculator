@echo off
chcp 65001 > nul
echo ==================================================
echo   Antigravity .gemini 缓存与配置目录迁移工具
echo ==================================================
echo.
echo [警告] 请在运行此脚本前，务必完全关闭所有 Antigravity 窗口、IDE 及命令行会话！
echo.
pause

set "SRC=C:\Users\杨鲁斌\.gemini"
set "DST=D:\.gemini"

if not exist "%SRC%" (
    echo [错误] 找不到源目录: %SRC%
    pause
    exit /b
)

if exist "%DST%" (
    echo [提示] 目标目录 %DST% 已存在。
    echo 如果您之前已经迁移过，请确认是否要覆盖。
    pause
)

echo [1/3] 正在复制并移动文件到 D 盘 (使用 robocopy)...
robocopy "%SRC%" "%DST%" /E /MOVE /COPYALL /R:3 /W:5

echo [2/3] 正在删除可能残留的源目录以准备创建软链接...
if exist "%SRC%" rd /s /q "%SRC%"

echo [3/3] 正在创建目录联接 (Directory Junction)...
mklink /J "%SRC%" "%DST%"

if %ERRORLEVEL% equ 0 (
    echo.
    echo ==================================================
    echo   迁移成功！
    echo   C:\Users\杨鲁斌\.gemini 已成功链接到 D:\.gemini
    echo   所有缓存、配置和插件现在都物理存放在 D 盘。
    echo ==================================================
) else (
    echo.
    echo [错误] 创建软链接失败，请确保以管理员身份运行此脚本！
)
echo.
pause
