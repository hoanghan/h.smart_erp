@echo off
cd /d C:\Project\Personal\ERP\sourcecode\erp-backend
echo ===== DOTNET SDKS ===== > build_log.txt
dotnet --list-sdks >> build_log.txt 2>&1
echo ===== RESTORE + BUILD ===== >> build_log.txt
dotnet build >> build_log.txt 2>&1
echo ===== EXITCODE=%ERRORLEVEL% ===== >> build_log.txt
exit
