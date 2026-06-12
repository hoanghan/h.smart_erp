@echo off
setlocal enabledelayedexpansion
cd /d C:\Project\Personal\ERP\sourcecode\erp-backend
set API=http://localhost:5000/api/v1

echo ===== STOP OLD SERVER ===== > finance_log.txt
taskkill /IM Erp.Api.exe /F >> finance_log.txt 2>&1
timeout /t 2 /nobreak > nul

echo ===== BUILD ===== >> finance_log.txt
dotnet build src\Erp.Api\Erp.Api.csproj >> finance_log.txt 2>&1
if errorlevel 1 (
  echo ===== BUILD FAILED ===== >> finance_log.txt
  type finance_log.txt
  exit /b 1
)

echo ===== START API ===== >> finance_log.txt
start "erp-api" cmd /c "dotnet run --project src/Erp.Api --no-build --urls http://localhost:5000 > api_log.txt 2>&1"
timeout /t 10 /nobreak > nul

curl -s -X POST %API%/auth/login -H "Content-Type: application/json" -d "{\"username\":\"admin\",\"password\":\"admin123\"}" > login.json
for /f "delims=" %%t in ('powershell -NoProfile -Command "(Get-Content login.json | ConvertFrom-Json).accessToken"') do set TOKEN=%%t
set AUTH=Authorization: Bearer %TOKEN%

for /f "delims=" %%d in ('powershell -NoProfile -Command "(Get-Date).ToString('yyyy-MM-dd')"') do set TODAY=%%d

REM ============================================================
REM PHASE 1: ACCOUNTING POLICY
REM ============================================================

echo. >> finance_log.txt
echo ===== PHASE 1: ACCOUNTING POLICY ===== >> finance_log.txt

echo --- Get accounting policy --- >> finance_log.txt
curl -s %API%/finance/accounting-policy -H "%AUTH%" > policy.json
type policy.json >> finance_log.txt
echo. >> finance_log.txt

REM ============================================================
REM PHASE 2: CHART OF ACCOUNTS
REM ============================================================

echo. >> finance_log.txt
echo ===== PHASE 2: CHART OF ACCOUNTS ===== >> finance_log.txt

echo --- List accounts --- >> finance_log.txt
curl -s "%API%/finance/accounts" -H "%AUTH%" >> finance_log.txt
echo. >> finance_log.txt

echo --- Get account 111 (Tien mat) --- >> finance_log.txt
curl -s %API%/finance/accounts/1 -H "%AUTH%" > acc111.json
type acc111.json >> finance_log.txt
echo. >> finance_log.txt

REM ============================================================
REM PHASE 3: FISCAL PERIODS
REM ============================================================

echo. >> finance_log.txt
echo ===== PHASE 3: FISCAL PERIODS ===== >> finance_log.txt

echo --- List fiscal periods --- >> finance_log.txt
curl -s "%API%/finance/fiscal-periods?year=%YEAR%" -H "%AUTH%" >> finance_log.txt
echo. >> finance_log.txt

REM ============================================================
REM PHASE 4: CASH FUNDS
REM ============================================================

echo. >> finance_log.txt
echo ===== PHASE 4: CASH FUNDS ===== >> finance_log.txt

echo --- List cash funds --- >> finance_log.txt
curl -s %API%/finance/cash-funds -H "%AUTH%" >> finance_log.txt
echo. >> finance_log.txt

REM ============================================================
REM PHASE 5: BUSINESS OPERATIONS
REM ============================================================

echo. >> finance_log.txt
echo ===== PHASE 5: BUSINESS OPERATIONS ===== >> finance_log.txt

echo --- List business operations --- >> finance_log.txt
curl -s %API%/finance/business-operations -H "%AUTH%" >> finance_log.txt
echo. >> finance_log.txt

REM ============================================================
REM PHASE 6: CREATE VOUCHER (PHIEU_THU)
REM ============================================================

echo. >> finance_log.txt
echo ===== PHASE 6: CREATE VOUCHER ===== >> finance_log.txt

echo --- Create partner for voucher --- >> finance_log.txt
curl -s -X POST %API%/md/partners -H "%AUTH%" -H "Content-Type: application/json" -d "{\"code\":\"KH%RANDOM%\",\"shortName\":\"Khach hang test\",\"isCustomer\":true}" > kh.json
for /f "delims=" %%i in ('powershell -NoProfile -Command "(Get-Content kh.json | ConvertFrom-Json).id"') do set KH_ID=%%i
echo KH_ID = %KH_ID% >> finance_log.txt

echo --- Create voucher (PHIEU_THU) --- >> finance_log.txt
curl -s -X POST %API%/finance/vouchers -H "%AUTH%" -H "Content-Type: application/json" -d "{\"voucherType\":\"PHIEU_THU\",\"docNo\":\"PT-TEST-001\",\"docDate\":\"%TODAY%\",\"partnerId\":%KH_ID%,\"fundId\":1,\"description\":\"Thu tien test\",\"lines\":[{\"description\":\"Thu tien KH\",\"amount\":1000000,\"drAccountId\":1,\"crAccountId\":2}]}" > vch.json
type vch.json >> finance_log.txt
echo. >> finance_log.txt
for /f "delims=" %%i in ('powershell -NoProfile -Command "(Get-Content vch.json | ConvertFrom-Json).id"') do set VCH_ID=%%i
echo VCH_ID = %VCH_ID% >> finance_log.txt

REM ============================================================
REM PHASE 7: POST VOUCHER
REM ============================================================

echo. >> finance_log.txt
echo ===== PHASE 7: POST VOUCHER ===== >> finance_log.txt

echo --- Post voucher --- >> finance_log.txt
curl -s -X POST %API%/finance/vouchers/%VCH_ID%/post -H "%AUTH%" -H "Content-Type: application/json" -d "{}" > vch_post.json
type vch_post.json >> finance_log.txt
echo. >> finance_log.txt
for /f "delims=" %%s in ('powershell -NoProfile -Command "(Get-Content vch_post.json | ConvertFrom-Json).status"') do set VCH_STATUS=%%s
echo VCH status after post = %VCH_STATUS% >> finance_log.txt

echo --- Post again (expect 409) --- >> finance_log.txt
curl -s -o nul -w "HTTP %%{http_code}" -X POST %API%/finance/vouchers/%VCH_ID%/post -H "%AUTH%" -H "Content-Type: application/json" -d "{}" >> finance_log.txt
echo. >> finance_log.txt

REM ============================================================
REM PHASE 8: GL ENTRIES
REM ============================================================

echo. >> finance_log.txt
echo ===== PHASE 8: GL ENTRIES ===== >> finance_log.txt

echo --- List GL entries for voucher --- >> finance_log.txt
curl -s "%API%/finance/gl-entries?voucherId=%VCH_ID%" -H "%AUTH%" >> finance_log.txt
echo. >> finance_log.txt

echo --- List outbox events --- >> finance_log.txt
curl -s "%API%/finance/outbox-events?unprocessed=true" -H "%AUTH%" >> finance_log.txt
echo. >> finance_log.txt

REM ============================================================
REM PHASE 9: LIST VOUCHERS
REM ============================================================

echo. >> finance_log.txt
echo ===== PHASE 9: LIST VOUCHERS ===== >> finance_log.txt

echo --- List vouchers --- >> finance_log.txt
curl -s "%API%/finance/vouchers?page=1&size=10" -H "%AUTH%" >> finance_log.txt
echo. >> finance_log.txt

REM ============================================================
REM SUMMARY
REM ============================================================

echo. >> finance_log.txt
echo ===== ALL TESTS COMPLETED ===== >> finance_log.txt
echo ===== Endpoints tested: ===== >> finance_log.txt
echo   GET /finance/accounting-policy >> finance_log.txt
echo   GET /finance/accounts, GET /{id} >> finance_log.txt
echo   GET /finance/fiscal-periods >> finance_log.txt
echo   GET /finance/cash-funds >> finance_log.txt
echo   GET /finance/business-operations >> finance_log.txt
echo   POST /finance/vouchers, POST /{id}/post >> finance_log.txt
echo   GET /finance/gl-entries >> finance_log.txt
echo   GET /finance/outbox-events >> finance_log.txt
echo   GET /finance/vouchers >> finance_log.txt

type finance_log.txt
echo.
echo ===== DONE - check finance_log.txt for results =====

del login.json policy.json acc111.json kh.json vch.json vch_post.json 2>nul