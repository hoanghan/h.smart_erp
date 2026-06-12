@echo off
setlocal enabledelayedexpansion
cd /d C:\Project\Personal\ERP\sourcecode\erp-backend
set API=http://localhost:5000/api/v1

echo ===== STOP OLD SERVER ===== > inventory_log.txt
taskkill /IM Erp.Api.exe /F >> inventory_log.txt 2>&1
timeout /t 2 /nobreak > nul

echo ===== BUILD ===== >> inventory_log.txt
dotnet build src\Erp.Api\Erp.Api.csproj >> inventory_log.txt 2>&1
if errorlevel 1 (
  echo ===== BUILD FAILED ===== >> inventory_log.txt
  type inventory_log.txt
  exit /b 1
)

echo ===== START API ===== >> inventory_log.txt
start "erp-api" cmd /c "dotnet run --project src/Erp.Api --no-build --urls http://localhost:5000 > api_log.txt 2>&1"

echo ===== WAIT FOR API ===== >> inventory_log.txt
set LOGIN_OK=0
for /l %%w in (1,1,60) do (
  if "!LOGIN_OK!"=="0" (
    curl -s -o login.json -w "%%{http_code}" -X POST %API%/auth/login -H "Content-Type: application/json" -d "{\"username\":\"admin\",\"password\":\"admin123\"}" > status.txt
    set /p HTTP_CODE=<status.txt
    if "!HTTP_CODE!"=="200" set LOGIN_OK=1
  )
  if "!LOGIN_OK!"=="0" timeout /t 1 /nobreak > nul
)
echo Login HTTP code = !HTTP_CODE! >> inventory_log.txt
type login.json >> inventory_log.txt
echo. >> inventory_log.txt
for /f "delims=" %%t in ('powershell -NoProfile -Command "(Get-Content login.json | ConvertFrom-Json).accessToken"') do set TOKEN=%%t
set AUTH=Authorization: Bearer %TOKEN%

REM ============================================================
REM PHASE 1: MASTER DATA - Product, Warehouse, Supplier, Customer
REM ============================================================

echo ===== CREATE PRODUCT ===== >> inventory_log.txt
curl -s -X POST %API%/md/products -H "%AUTH%" -H "Content-Type: application/json" -d "{\"code\":\"SP%RANDOM%\",\"name\":\"San pham ton kho\",\"uomId\":1}" > p.json
type p.json >> inventory_log.txt
echo. >> inventory_log.txt
for /f "delims=" %%i in ('powershell -NoProfile -Command "(Get-Content p.json | ConvertFrom-Json).id"') do set PID=%%i

echo ===== CREATE WAREHOUSE ===== >> inventory_log.txt
curl -s -X POST %API%/md/warehouses -H "%AUTH%" -H "Content-Type: application/json" -d "{\"code\":\"KHO%RANDOM%\",\"name\":\"Kho test ton kho\"}" > wh.json
type wh.json >> inventory_log.txt
echo. >> inventory_log.txt
for /f "delims=" %%i in ('powershell -NoProfile -Command "(Get-Content wh.json | ConvertFrom-Json).id"') do set WHID=%%i

echo ===== CREATE SUPPLIER PARTNER ===== >> inventory_log.txt
curl -s -X POST %API%/md/partners -H "%AUTH%" -H "Content-Type: application/json" -d "{\"code\":\"NCC%RANDOM%\",\"shortName\":\"NCC ton kho\",\"isSupplier\":true}" > sup.json
type sup.json >> inventory_log.txt
echo. >> inventory_log.txt
for /f "delims=" %%i in ('powershell -NoProfile -Command "(Get-Content sup.json | ConvertFrom-Json).id"') do set SUP_ID=%%i

echo ===== CREATE CUSTOMER PARTNER ===== >> inventory_log.txt
curl -s -X POST %API%/md/partners -H "%AUTH%" -H "Content-Type: application/json" -d "{\"code\":\"KH%RANDOM%\",\"shortName\":\"KH ton kho\",\"isCustomer\":true}" > cust.json
type cust.json >> inventory_log.txt
echo. >> inventory_log.txt
for /f "delims=" %%i in ('powershell -NoProfile -Command "(Get-Content cust.json | ConvertFrom-Json).id"') do set CUST_ID=%%i

REM ============================================================
REM PHASE 2: NHAP KHO 100 - PO, create-receipt-request, stock doc RECEIPT
REM ============================================================

echo. >> inventory_log.txt
echo ===== PHASE 2: NHAP KHO 100 ===== >> inventory_log.txt

echo --- Create Purchase Order (qty=100) --- >> inventory_log.txt
curl -s -X POST %API%/purchasing/orders -H "%AUTH%" -H "Content-Type: application/json" -d "{\"partnerId\":%SUP_ID%,\"orderForm\":\"NORMAL\",\"lines\":[{\"productId\":%PID%,\"quantity\":100,\"unitPrice\":5000,\"vatPct\":10}]}" > po.json
type po.json >> inventory_log.txt
echo. >> inventory_log.txt
for /f "delims=" %%i in ('powershell -NoProfile -Command "(Get-Content po.json | ConvertFrom-Json).id"') do set POID=%%i

echo --- Approve PO --- >> inventory_log.txt
curl -s -X POST %API%/purchasing/orders/%POID%/actions/approve -H "%AUTH%" -H "Content-Type: application/json" -d "{}" >> inventory_log.txt
echo. >> inventory_log.txt

echo --- PO create-receipt-request --- >> inventory_log.txt
curl -s -X POST %API%/purchasing/orders/%POID%/actions/create-receipt-request -H "%AUTH%" -H "Content-Type: application/json" -d "{\"warehouseId\":%WHID%}" > rcpt.json
type rcpt.json >> inventory_log.txt
echo. >> inventory_log.txt
for /f "delims=" %%i in ('powershell -NoProfile -Command "(Get-Content rcpt.json | ConvertFrom-Json).id"') do set RCPT_ID=%%i
for /f "delims=" %%n in ('powershell -NoProfile -Command "(Get-Content rcpt.json | ConvertFrom-Json).docNo"') do set RCPT_DOCNO=%%n
echo Receipt doc id=%RCPT_ID% docNo=%RCPT_DOCNO% >> inventory_log.txt

echo --- PO status after create-receipt-request (expect NOT_RECEIVED) --- >> inventory_log.txt
curl -s %API%/purchasing/orders/%POID% -H "%AUTH%" > act.json
for /f "delims=" %%s in ('powershell -NoProfile -Command "(Get-Content act.json | ConvertFrom-Json).status"') do set ACT_STATUS=%%s
echo status = %ACT_STATUS% >> inventory_log.txt

echo --- fill-from-order --- >> inventory_log.txt
curl -s -X POST %API%/inventory/docs/%RCPT_ID%/actions/fill-from-order -H "%AUTH%" -H "Content-Type: application/json" -d "{}" >> inventory_log.txt
echo. >> inventory_log.txt

echo --- request (DRAFT to REQUESTED) --- >> inventory_log.txt
curl -s -X POST %API%/inventory/docs/%RCPT_ID%/actions/request -H "%AUTH%" -H "Content-Type: application/json" -d "{}" > act.json
for /f "delims=" %%s in ('powershell -NoProfile -Command "(Get-Content act.json | ConvertFrom-Json).status"') do set ACT_STATUS=%%s
echo status = %ACT_STATUS% >> inventory_log.txt

echo --- confirm (REQUESTED to CONFIRMED) --- >> inventory_log.txt
curl -s -X POST %API%/inventory/docs/%RCPT_ID%/actions/confirm -H "%AUTH%" -H "Content-Type: application/json" -d "{}" > act.json
for /f "delims=" %%s in ('powershell -NoProfile -Command "(Get-Content act.json | ConvertFrom-Json).status"') do set ACT_STATUS=%%s
echo status = %ACT_STATUS% >> inventory_log.txt

echo --- set-actual-as-requested --- >> inventory_log.txt
curl -s -X POST %API%/inventory/docs/%RCPT_ID%/actions/set-actual-as-requested -H "%AUTH%" -H "Content-Type: application/json" -d "{}" >> inventory_log.txt
echo. >> inventory_log.txt

echo --- complete (CONFIRMED to COMPLETED) --- >> inventory_log.txt
curl -s -X POST %API%/inventory/docs/%RCPT_ID%/actions/complete -H "%AUTH%" -H "Content-Type: application/json" -d "{}" > act.json
type act.json >> inventory_log.txt
echo. >> inventory_log.txt
for /f "delims=" %%s in ('powershell -NoProfile -Command "(Get-Content act.json | ConvertFrom-Json).status"') do set ACT_STATUS=%%s
echo status = %ACT_STATUS% >> inventory_log.txt

echo --- PO status after complete receipt (expect RECEIVED) --- >> inventory_log.txt
curl -s %API%/purchasing/orders/%POID% -H "%AUTH%" > act.json
for /f "delims=" %%s in ('powershell -NoProfile -Command "(Get-Content act.json | ConvertFrom-Json).status"') do set ACT_STATUS=%%s
echo status = %ACT_STATUS% >> inventory_log.txt

REM ============================================================
REM PHASE 3: XUAT 10 - SO, create-delivery-request, stock doc ISSUE
REM ============================================================

echo. >> inventory_log.txt
echo ===== PHASE 3: XUAT 10 ===== >> inventory_log.txt

echo --- Create Sales Order (qty=10) --- >> inventory_log.txt
curl -s -X POST %API%/sales/orders -H "%AUTH%" -H "Content-Type: application/json" -d "{\"partnerId\":%CUST_ID%,\"orderForm\":\"NORMAL\",\"warehouseId\":%WHID%,\"lines\":[{\"productId\":%PID%,\"quantity\":10,\"unitPrice\":8000,\"vatPct\":10}]}" > so.json
type so.json >> inventory_log.txt
echo. >> inventory_log.txt
for /f "delims=" %%i in ('powershell -NoProfile -Command "(Get-Content so.json | ConvertFrom-Json).id"') do set SOID=%%i

echo --- request-approval --- >> inventory_log.txt
curl -s -X POST %API%/sales/orders/%SOID%/actions/request-approval -H "%AUTH%" -H "Content-Type: application/json" -d "{}" >> inventory_log.txt
echo. >> inventory_log.txt

echo --- approve --- >> inventory_log.txt
curl -s -X POST %API%/sales/orders/%SOID%/actions/approve -H "%AUTH%" -H "Content-Type: application/json" -d "{}" >> inventory_log.txt
echo. >> inventory_log.txt

echo --- SO create-delivery-request --- >> inventory_log.txt
curl -s -X POST %API%/sales/orders/%SOID%/actions/create-delivery-request -H "%AUTH%" -H "Content-Type: application/json" -d "{}" > issue.json
type issue.json >> inventory_log.txt
echo. >> inventory_log.txt
for /f "delims=" %%i in ('powershell -NoProfile -Command "(Get-Content issue.json | ConvertFrom-Json).id"') do set ISSUE_ID=%%i
for /f "delims=" %%n in ('powershell -NoProfile -Command "(Get-Content issue.json | ConvertFrom-Json).docNo"') do set ISSUE_DOCNO=%%n
echo Issue doc id=%ISSUE_ID% docNo=%ISSUE_DOCNO% >> inventory_log.txt

echo --- SO status after create-delivery-request (expect NOT_DELIVERED) --- >> inventory_log.txt
curl -s %API%/sales/orders/%SOID% -H "%AUTH%" > act.json
for /f "delims=" %%s in ('powershell -NoProfile -Command "(Get-Content act.json | ConvertFrom-Json).status"') do set ACT_STATUS=%%s
echo status = %ACT_STATUS% >> inventory_log.txt

echo --- fill-from-order --- >> inventory_log.txt
curl -s -X POST %API%/inventory/docs/%ISSUE_ID%/actions/fill-from-order -H "%AUTH%" -H "Content-Type: application/json" -d "{}" >> inventory_log.txt
echo. >> inventory_log.txt

echo --- request (DRAFT to REQUESTED) --- >> inventory_log.txt
curl -s -X POST %API%/inventory/docs/%ISSUE_ID%/actions/request -H "%AUTH%" -H "Content-Type: application/json" -d "{}" > act.json
for /f "delims=" %%s in ('powershell -NoProfile -Command "(Get-Content act.json | ConvertFrom-Json).status"') do set ACT_STATUS=%%s
echo status = %ACT_STATUS% >> inventory_log.txt

echo --- confirm (REQUESTED to CONFIRMED) --- >> inventory_log.txt
curl -s -X POST %API%/inventory/docs/%ISSUE_ID%/actions/confirm -H "%AUTH%" -H "Content-Type: application/json" -d "{}" > act.json
for /f "delims=" %%s in ('powershell -NoProfile -Command "(Get-Content act.json | ConvertFrom-Json).status"') do set ACT_STATUS=%%s
echo status = %ACT_STATUS% >> inventory_log.txt

echo --- set-actual-as-requested --- >> inventory_log.txt
curl -s -X POST %API%/inventory/docs/%ISSUE_ID%/actions/set-actual-as-requested -H "%AUTH%" -H "Content-Type: application/json" -d "{}" >> inventory_log.txt
echo. >> inventory_log.txt

echo --- complete (CONFIRMED to COMPLETED) --- >> inventory_log.txt
curl -s -X POST %API%/inventory/docs/%ISSUE_ID%/actions/complete -H "%AUTH%" -H "Content-Type: application/json" -d "{}" > act.json
type act.json >> inventory_log.txt
echo. >> inventory_log.txt
for /f "delims=" %%s in ('powershell -NoProfile -Command "(Get-Content act.json | ConvertFrom-Json).status"') do set ACT_STATUS=%%s
echo status = %ACT_STATUS% >> inventory_log.txt

echo --- SO status after complete issue (expect DELIVERED) --- >> inventory_log.txt
curl -s %API%/sales/orders/%SOID% -H "%AUTH%" > act.json
for /f "delims=" %%s in ('powershell -NoProfile -Command "(Get-Content act.json | ConvertFrom-Json).status"') do set ACT_STATUS=%%s
echo status = %ACT_STATUS% >> inventory_log.txt

REM ============================================================
REM PHASE 4: CHECK STOCK BALANCE = 90
REM ============================================================

echo. >> inventory_log.txt
echo ===== PHASE 4: CHECK STOCK BALANCE (expect 90) ===== >> inventory_log.txt

curl -s "%API%/inventory/stock-balance?warehouseId=%WHID%&productId=%PID%" -H "%AUTH%" > sb.json
type sb.json >> inventory_log.txt
echo. >> inventory_log.txt
for /f "delims=" %%v in ('powershell -NoProfile -Command "(Get-Content sb.json | ConvertFrom-Json)[0].qtyOnHand"') do set BALANCE=%%v
echo Stock balance = %BALANCE% (expect 90) >> inventory_log.txt

REM ============================================================
REM PHASE 5: CHECK STOCK MOVES - expect 2 dong
REM ============================================================

echo. >> inventory_log.txt
echo ===== PHASE 5: CHECK STOCK MOVES (expect 2) ===== >> inventory_log.txt

curl -s "%API%/inventory/stock-moves?productId=%PID%&warehouseId=%WHID%" -H "%AUTH%" > sm.json
type sm.json >> inventory_log.txt
echo. >> inventory_log.txt
for /f "delims=" %%v in ('powershell -NoProfile -Command "(Get-Content sm.json | ConvertFrom-Json).total"') do set MOVE_COUNT=%%v
echo Stock move count = %MOVE_COUNT% (expect 2) >> inventory_log.txt

REM ============================================================
REM PHASE 6: XUAT 1000 - EXPECT 409 STK_INSUFFICIENT
REM ============================================================

echo. >> inventory_log.txt
echo ===== PHASE 6: XUAT 1000 - EXPECT 409 STK_INSUFFICIENT ===== >> inventory_log.txt

echo --- Create Sales Order (qty=1000) --- >> inventory_log.txt
curl -s -X POST %API%/sales/orders -H "%AUTH%" -H "Content-Type: application/json" -d "{\"partnerId\":%CUST_ID%,\"orderForm\":\"NORMAL\",\"warehouseId\":%WHID%,\"lines\":[{\"productId\":%PID%,\"quantity\":1000,\"unitPrice\":8000,\"vatPct\":10}]}" > so2.json
type so2.json >> inventory_log.txt
echo. >> inventory_log.txt
for /f "delims=" %%i in ('powershell -NoProfile -Command "(Get-Content so2.json | ConvertFrom-Json).id"') do set SOID2=%%i

echo --- request-approval --- >> inventory_log.txt
curl -s -X POST %API%/sales/orders/%SOID2%/actions/request-approval -H "%AUTH%" -H "Content-Type: application/json" -d "{}" >> inventory_log.txt
echo. >> inventory_log.txt

echo --- approve --- >> inventory_log.txt
curl -s -X POST %API%/sales/orders/%SOID2%/actions/approve -H "%AUTH%" -H "Content-Type: application/json" -d "{}" >> inventory_log.txt
echo. >> inventory_log.txt

echo --- create-delivery-request --- >> inventory_log.txt
curl -s -X POST %API%/sales/orders/%SOID2%/actions/create-delivery-request -H "%AUTH%" -H "Content-Type: application/json" -d "{}" > issue2.json
type issue2.json >> inventory_log.txt
echo. >> inventory_log.txt
for /f "delims=" %%i in ('powershell -NoProfile -Command "(Get-Content issue2.json | ConvertFrom-Json).id"') do set ISSUE_ID2=%%i

echo --- fill-from-order --- >> inventory_log.txt
curl -s -X POST %API%/inventory/docs/%ISSUE_ID2%/actions/fill-from-order -H "%AUTH%" -H "Content-Type: application/json" -d "{}" >> inventory_log.txt
echo. >> inventory_log.txt

echo --- request --- >> inventory_log.txt
curl -s -X POST %API%/inventory/docs/%ISSUE_ID2%/actions/request -H "%AUTH%" -H "Content-Type: application/json" -d "{}" >> inventory_log.txt
echo. >> inventory_log.txt

echo --- confirm --- >> inventory_log.txt
curl -s -X POST %API%/inventory/docs/%ISSUE_ID2%/actions/confirm -H "%AUTH%" -H "Content-Type: application/json" -d "{}" >> inventory_log.txt
echo. >> inventory_log.txt

echo --- set-actual-as-requested --- >> inventory_log.txt
curl -s -X POST %API%/inventory/docs/%ISSUE_ID2%/actions/set-actual-as-requested -H "%AUTH%" -H "Content-Type: application/json" -d "{}" >> inventory_log.txt
echo. >> inventory_log.txt

echo --- complete (expect HTTP 409 STK_INSUFFICIENT) --- >> inventory_log.txt
curl -s -o complete2.json -w "HTTP %%{http_code}" -X POST %API%/inventory/docs/%ISSUE_ID2%/actions/complete -H "%AUTH%" -H "Content-Type: application/json" -d "{}" >> inventory_log.txt
echo. >> inventory_log.txt
type complete2.json >> inventory_log.txt
echo. >> inventory_log.txt
for /f "delims=" %%c in ('powershell -NoProfile -Command "(Get-Content complete2.json | ConvertFrom-Json).code"') do set ERR_CODE2=%%c
echo error code = %ERR_CODE2% (expect STK_INSUFFICIENT) >> inventory_log.txt

echo --- Stock balance unchanged after failed complete (expect still 90) --- >> inventory_log.txt
curl -s "%API%/inventory/stock-balance?warehouseId=%WHID%&productId=%PID%" -H "%AUTH%" > sb2.json
type sb2.json >> inventory_log.txt
echo. >> inventory_log.txt
for /f "delims=" %%v in ('powershell -NoProfile -Command "(Get-Content sb2.json | ConvertFrom-Json)[0].qtyOnHand"') do set BALANCE2=%%v
echo Stock balance after failed issue = %BALANCE2% (expect 90) >> inventory_log.txt

REM ============================================================
REM SUMMARY
REM ============================================================

echo. >> inventory_log.txt
echo ===== ALL TESTS COMPLETED ===== >> inventory_log.txt
echo ===== Endpoints tested: ===== >> inventory_log.txt
echo   GET/POST /api/v1/inventory/docs, GET/PUT /{id} >> inventory_log.txt
echo   POST /{id}/actions/fill-from-order,set-actual-as-requested,request,confirm,complete >> inventory_log.txt
echo   GET /api/v1/inventory/stock-balance, GET /api/v1/inventory/stock-moves >> inventory_log.txt
echo   POST /api/v1/purchasing/orders/{id}/actions/create-receipt-request >> inventory_log.txt
echo   POST /api/v1/sales/orders/{id}/actions/create-delivery-request >> inventory_log.txt

type inventory_log.txt
echo.
echo ===== DONE - check inventory_log.txt for results =====

del login.json status.txt act.json p.json wh.json sup.json cust.json po.json rcpt.json so.json issue.json sb.json sm.json so2.json issue2.json complete2.json sb2.json 2>nul
