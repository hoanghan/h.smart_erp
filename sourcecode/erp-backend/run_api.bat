@echo off
cd /d C:\Project\Personal\ERP\sourcecode\erp-backend
echo ===== SEED ADMIN ===== > api_log.txt
dotnet run --project src/Erp.Api -- seed-admin admin admin123 >> api_log.txt 2>&1
echo ===== RUN API (http://localhost:5000) ===== >> api_log.txt
dotnet run --project src/Erp.Api --urls http://localhost:5000 >> api_log.txt 2>&1
