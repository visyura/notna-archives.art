@echo off

REM Get today's date in DDMMYY format (e.g., 121225 for Dec 12, 2025)
for /f "tokens=1-3 delims=/" %%a in ('date /t') do (
    set TODAY=%%a%%b%%c
)

REM Read the last commit info
if exist commit_info.txt (
    set /p LAST_COMMIT=<commit_info.txt
) else (
    set LAST_COMMIT=00000000
)

REM Extract date and number from last commit
set LAST_DATE=%LAST_COMMIT:~0,6%
set /a LAST_NUM=%LAST_COMMIT:~6%

REM Check if today is same as last commit date
if "%TODAY%"=="%LAST_DATE%" (
    set /a NEW_NUM=%LAST_NUM%+1
) else (
    set NEW_NUM=01
)

REM Pad number with zero if needed (01, 02, etc)
if %NEW_NUM% LSS 10 (
    set NEW_NUM=0%NEW_NUM%
)

REM Create commit ID
set COMMIT_ID=%TODAY%%NEW_NUM%

REM Save for next time
echo %COMMIT_ID% > commit_info.txt

REM Commit and push
git add .
git commit -m "update %COMMIT_ID%"
git push

echo.
echo Committed and pushed as update %COMMIT_ID%
echo.
pause
