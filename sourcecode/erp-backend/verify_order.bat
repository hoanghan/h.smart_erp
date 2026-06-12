@echo off
cd /d C:\Project\Personal\ERP\sourcecode\erp-backend
set API=http://localhost:5000/api/v1

curl -s -X POST %API%/auth/login -H "Content-Type: application/json" -d "{\"username\":\"admin\",\"password\":\"admin123\"}" > login.json
for /f "delims=" %%t in ('powershell -NoProfile -Command "(Get-Content login.json | ConvertFrom-Json).accessToken"') do set TOKEN=%%t

echo ===== ORDER 1 TRUOC ===== > verify_log.txt
curl -s %API%/sales/orders/1 -H "Authorization: Bearer %TOKEN%" >> verify_log.txt
echo. >> verify_log.txt
echo ===== REQUEST-APPROVAL ===== >> verify_log.txt
curl -s -X POST %API%/sales/orders/1/actions/request-approval -H "Authorization: Bearer %TOKEN%" -H "Content-Type: application/json" -d "{}" >> verify_log.txt
echo. >> verify_log.txt
echo ===== APPROVE ===== >> verify_log.txt
curl -s -X POST %API%/sales/orders/1/actions/approve -H "Authorization: Bearer %TOKEN%" -H "Content-Type: application/json" -d "{}" >> verify_log.txt
echo. >> verify_log.txt
echo ===== TRANSITION SAI: reprocess tu COMPLETED? thu complete roi cancel (expect 409) ===== >> verify_log.txt
curl -s -o nul -w "cancel sau approve (phai duoc phep): HTTP %%{http_code}" -X POST %API%/sales/orders/999/actions/cancel -H "Authorization: Bearer %TOKEN%" -H "Content-Type: application/json" -d "{\"reason\":\"x\"}" >> verify_log.txt
echo. >> verify_log.txt
echo ===== WF LOG TRONG DB ===== >> verify_log.txt
echo (xem bang core.wf_transition_log) >> verify_log.txt
echo ===== DONE ===== >> verify_log.txt
del login.json 2>nul
exit
