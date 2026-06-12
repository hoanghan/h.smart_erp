@echo off
cd /d C:\Project\Personal\ERP\sourcecode\erp-backend
echo ===== HEALTH ===== > test_log.txt
curl -s http://localhost:5000/health >> test_log.txt 2>&1
echo. >> test_log.txt
echo ===== LOGIN ===== >> test_log.txt
curl -s -X POST http://localhost:5000/api/v1/auth/login -H "Content-Type: application/json" -d "{\"username\":\"admin\",\"password\":\"admin123\"}" > login.json 2>> test_log.txt
type login.json >> test_log.txt
echo. >> test_log.txt
for /f "delims=" %%t in ('powershell -NoProfile -Command "(Get-Content login.json | ConvertFrom-Json).accessToken"') do set TOKEN=%%t
echo ===== ME ===== >> test_log.txt
curl -s http://localhost:5000/api/v1/auth/me -H "Authorization: Bearer %TOKEN%" >> test_log.txt 2>&1
echo. >> test_log.txt
echo ===== CREATE UOM ===== >> test_log.txt
curl -s -X POST http://localhost:5000/api/v1/md/uoms -H "Authorization: Bearer %TOKEN%" -H "Content-Type: application/json" -d "{\"code\":\"CAI\",\"name\":\"Cai\"}" >> test_log.txt 2>&1
echo. >> test_log.txt
echo ===== LIST UOMS ===== >> test_log.txt
curl -s "http://localhost:5000/api/v1/md/uoms?q=CAI" -H "Authorization: Bearer %TOKEN%" >> test_log.txt 2>&1
echo. >> test_log.txt
echo ===== CREATE PARTNER ===== >> test_log.txt
curl -s -X POST http://localhost:5000/api/v1/md/partners -H "Authorization: Bearer %TOKEN%" -H "Content-Type: application/json" -d "{\"code\":\"KH001\",\"shortName\":\"Cty ABC\",\"isCustomer\":true,\"creditDays\":30}" >> test_log.txt 2>&1
echo. >> test_log.txt
echo ===== NO TOKEN (expect 401) ===== >> test_log.txt
curl -s -o nul -w "HTTP %%{http_code}" http://localhost:5000/api/v1/md/uoms >> test_log.txt 2>&1
echo. >> test_log.txt
echo ===== DONE ===== >> test_log.txt
del login.json
exit
