@echo off
setlocal enabledelayedexpansion

for /f "tokens=1-3 delims=/" %%a in ('date /t') do (
    set DAY=%%a
    set MONTH=%%b
    set YEAR=%%c
)

set YEAR=!YEAR:~-2!
set TODAY=!DAY!!MONTH!!YEAR!

if exist commit_info.txt (
    set /p LAST_COMMIT=<commit_info.txt
) else (
    set LAST_COMMIT=00000000
)

set LAST_DATE=!LAST_COMMIT:~0,6!
set /a LAST_NUM=!LAST_COMMIT:~6!

if "!TODAY!"=="!LAST_DATE!" (
    set /a NEW_NUM=!LAST_NUM!+1
) else (
    set /a NEW_NUM=1
)

if !NEW_NUM! LSS 10 (
    set NEW_NUM=0!NEW_NUM!
)

set COMMIT_ID=!TODAY!!NEW_NUM!

echo !COMMIT_ID! > commit_info.txt

git add .
git commit -m "!COMMIT_ID!"
git push

echo.
#e
pause
