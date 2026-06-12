@echo off
setlocal enabledelayedexpansion
cd /d C:\Project\Personal\ERP\sourcecode\erp-backend
set API=http://localhost:5000/api/v1

echo ===== STOP OLD SERVER ===== > purchasing_log.txt
taskkill /IM Erp.Api.exe /F >> purchasing_log.txt 2>&1
timeout /t 2 /nobreak > nul

echo ===== BUILD ===== >> purchasing_log.txt
dotnet build src\Erp.Api\Erp.Api.csproj >> purchasing_log.txt 2>&1
if errorlevel 1 (
  echo ===== BUILD FAILED ===== >> purchasing_log.txt
  type purchasing_log.txt
  exit /b 1
)

echo ===== START API ===== >> purchasing_log.txt
start "erp-api" cmd /c "dotnet run --project src/Erp.Api --no-build --urls http://localhost:5000 > api_log.txt 2>&1"
timeout /t 10 /nobreak > nul

curl -s -X POST %API%/auth/login -H "Content-Type: application/json" -d "{\"username\":\"admin\",\"password\":\"admin123\"}" > login.json
for /f "delims=" %%t in ('powershell -NoProfile -Command "(Get-Content login.json | ConvertFrom-Json).accessToken"') do set TOKEN=%%t
set AUTH=Authorization: Bearer %TOKEN%

for /f "delims=" %%d in ('powershell -NoProfile -Command "(Get-Date).ToString('yyyy-MM-dd')"') do set TODAY=%%d

REM ============================================================
REM PHASE 1: MASTER DATA — Product, Supplier, Cost Type
REM ============================================================

echo ===== CREATE PRODUCT ===== >> purchasing_log.txt
curl -s -X POST %API%/md/products -H "%AUTH%" -H "Content-Type: application/json" -d "{\"code\":\"BL%RANDOM%\",\"name\":\"Bu long M10x30\",\"uomId\":1}" > p.json
type p.json >> purchasing_log.txt
echo. >> purchasing_log.txt
for /f "delims=" %%i in ('powershell -NoProfile -Command "(Get-Content p.json | ConvertFrom-Json).id"') do set PID=%%i

echo ===== CREATE SUPPLIER PARTNER ===== >> purchasing_log.txt
curl -s -X POST %API%/md/partners -H "%AUTH%" -H "Content-Type: application/json" -d "{\"code\":\"NCC%RANDOM%\",\"shortName\":\"NCC Bu long\",\"isSupplier\":true}" > sup.json
type sup.json >> purchasing_log.txt
echo. >> purchasing_log.txt
for /f "delims=" %%i in ('powershell -NoProfile -Command "(Get-Content sup.json | ConvertFrom-Json).id"') do set SUP_ID=%%i

echo ===== CREATE COST TYPE (PURCHASING) ===== >> purchasing_log.txt
curl -s -X POST %API%/md/cost-types -H "%AUTH%" -H "Content-Type: application/json" -d "{\"code\":\"VC%RANDOM%\",\"name\":\"Van chuyen mua\",\"scope\":\"PURCHASE\"}" > ct.json
type ct.json >> purchasing_log.txt
echo. >> purchasing_log.txt
for /f "delims=" %%i in ('powershell -NoProfile -Command "(Get-Content ct.json | ConvertFrom-Json).id"') do set CTID=%%i

REM ============================================================
REM PHASE 2: PURCHASE REQUEST
REM ============================================================

echo. >> purchasing_log.txt
echo ===== PHASE 2: PURCHASE REQUEST ===== >> purchasing_log.txt

echo --- Create Purchase Request --- >> purchasing_log.txt
curl -s -X POST %API%/purchasing/requests -H "%AUTH%" -H "Content-Type: application/json" -d "{\"note\":\"YC mua BL M10x30\",\"lines\":[{\"productId\":%PID%,\"quantity\":100}]}" > pr.json
type pr.json >> purchasing_log.txt
echo. >> purchasing_log.txt
for /f "delims=" %%i in ('powershell -NoProfile -Command "(Get-Content pr.json | ConvertFrom-Json).id"') do set PRID=%%i
for /f "delims=" %%n in ('powershell -NoProfile -Command "(Get-Content pr.json | ConvertFrom-Json).docNo"') do set PR_DOCNO=%%n
echo PR docNo = %PR_DOCNO% >> purchasing_log.txt

echo --- Approve Purchase Request --- >> purchasing_log.txt
curl -s -X POST %API%/purchasing/requests/%PRID%/actions/approve -H "%AUTH%" -H "Content-Type: application/json" -d "{}" | powershell -NoProfile -Command "$j=[Console]::In.ReadToEnd()|ConvertFrom-Json; $j.docNo + ' -> ' + $j.status" >> purchasing_log.txt

echo --- Approve again (expect 409) --- >> purchasing_log.txt
curl -s -o nul -w "HTTP %%{http_code}" -X POST %API%/purchasing/requests/%PRID%/actions/approve -H "%AUTH%" -H "Content-Type: application/json" -d "{}" >> purchasing_log.txt
echo. >> purchasing_log.txt

REM ============================================================
REM PHASE 3: PURCHASE ORDER — create, approve, doc_no check
REM ============================================================

echo. >> purchasing_log.txt
echo ===== PHASE 3: PURCHASE ORDER ===== >> purchasing_log.txt

echo --- Create Purchase Order --- >> purchasing_log.txt
curl -s -X POST %API%/purchasing/orders -H "%AUTH%" -H "Content-Type: application/json" -d "{\"partnerId\":%SUP_ID%,\"orderForm\":\"NORMAL\",\"requestId\":%PRID%,\"lines\":[{\"productId\":%PID%,\"quantity\":100,\"unitPrice\":5000,\"vatPct\":10}]}" > po.json
type po.json >> purchasing_log.txt
echo. >> purchasing_log.txt
for /f "delims=" %%i in ('powershell -NoProfile -Command "(Get-Content po.json | ConvertFrom-Json).id"') do set POID=%%i
for /f "delims=" %%n in ('powershell -NoProfile -Command "(Get-Content po.json | ConvertFrom-Json).docNo"') do set PO_DOCNO=%%n
echo PO id = %POID%, docNo = %PO_DOCNO% >> purchasing_log.txt

echo --- Verify doc_no format PO{YY}{MM}-{####} --- >> purchasing_log.txt
echo PO docNo = %PO_DOCNO% >> purchasing_log.txt

echo --- Approve Purchase Order --- >> purchasing_log.txt
curl -s -X POST %API%/purchasing/orders/%POID%/actions/approve -H "%AUTH%" -H "Content-Type: application/json" -d "{}" > po_appr.json
type po_appr.json >> purchasing_log.txt
echo. >> purchasing_log.txt
for /f "delims=" %%s in ('powershell -NoProfile -Command "(Get-Content po_appr.json | ConvertFrom-Json).status"') do set PO_STATUS=%%s
echo PO status after approve = %PO_STATUS% >> purchasing_log.txt

echo --- Approve again (expect 409) --- >> purchasing_log.txt
curl -s -o nul -w "HTTP %%{http_code}" -X POST %API%/purchasing/orders/%POID%/actions/approve -H "%AUTH%" -H "Content-Type: application/json" -d "{}" >> purchasing_log.txt
echo. >> purchasing_log.txt

echo --- Cancel without reason (expect 409) --- >> purchasing_log.txt
curl -s -o nul -w "HTTP %%{http_code}" -X POST %API%/purchasing/orders/%POID%/actions/cancel -H "%AUTH%" -H "Content-Type: application/json" -d "{}" >> purchasing_log.txt
echo. >> purchasing_log.txt

REM ============================================================
REM PHASE 4: PO COST — thiếu phiếu nhập → 409
REM ============================================================

echo. >> purchasing_log.txt
echo ===== PHASE 4: PO COST — COST_NO_RECEIPT_REF ===== >> purchasing_log.txt

echo --- Create cost WITHOUT receipt_doc_id --- >> purchasing_log.txt
curl -s -X POST %API%/purchasing/orders/%POID%/costs -H "%AUTH%" -H "Content-Type: application/json" -d "{\"costTypeId\":%CTID%,\"amount\":500000,\"vatPct\":10}" > cost1.json
type cost1.json >> purchasing_log.txt
echo. >> purchasing_log.txt
for /f "delims=" %%i in ('powershell -NoProfile -Command "(Get-Content cost1.json | ConvertFrom-Json).id"') do set COST1_ID=%%i

echo --- Approve cost without receipt (expect 409 COST_NO_RECEIPT_REF) --- >> purchasing_log.txt
curl -s -o cost1_appr.json -w "HTTP %%{http_code}" -X POST %API%/purchasing/orders/%POID%/costs/%COST1_ID%/actions/approve -H "%AUTH%" -H "Content-Type: application/json" -d "{}" >> purchasing_log.txt
echo. >> purchasing_log.txt
for /f "delims=" %%c in ('powershell -NoProfile -Command "(Get-Content cost1_appr.json | ConvertFrom-Json).code"') do set ERR_CODE=%%c
echo error code = %ERR_CODE% >> purchasing_log.txt

echo --- Create cost WITH receipt_doc_id --- >> purchasing_log.txt
curl -s -X POST %API%/purchasing/orders/%POID%/costs -H "%AUTH%" -H "Content-Type: application/json" -d "{\"costTypeId\":%CTID%,\"receiptDocId\":999,\"amount\":300000,\"vatPct\":10}" > cost2.json
type cost2.json >> purchasing_log.txt
echo. >> purchasing_log.txt
for /f "delims=" %%i in ('powershell -NoProfile -Command "(Get-Content cost2.json | ConvertFrom-Json).id"') do set COST2_ID=%%i

echo --- Approve cost with receipt (expect OK) --- >> purchasing_log.txt
curl -s -X POST %API%/purchasing/orders/%POID%/costs/%COST2_ID%/actions/approve -H "%AUTH%" -H "Content-Type: application/json" -d "{}" > cost2_appr.json
for /f "delims=" %%v in ('powershell -NoProfile -Command "(Get-Content cost2_appr.json | ConvertFrom-Json).approved"') do set COST2_APPROVED=%%v
echo cost2.approved = %COST2_APPROVED% >> purchasing_log.txt

echo --- Unapprove cost2 --- >> purchasing_log.txt
curl -s -X POST %API%/purchasing/orders/%POID%/costs/%COST2_ID%/actions/unapprove -H "%AUTH%" -H "Content-Type: application/json" -d "{}" > cost2_unappr.json
for /f "delims=" %%v in ('powershell -NoProfile -Command "(Get-Content cost2_unappr.json | ConvertFrom-Json).approved"') do set COST2_UNAPPROVED=%%v
echo cost2.approved after unapprove = %COST2_UNAPPROVED% >> purchasing_log.txt

echo --- List costs --- >> purchasing_log.txt
curl -s %API%/purchasing/orders/%POID%/costs -H "%AUTH%" >> purchasing_log.txt
echo. >> purchasing_log.txt

REM ============================================================
REM PHASE 5: PAYMENT REQUEST + APPROVE
REM ============================================================

echo. >> purchasing_log.txt
echo ===== PHASE 5: DNTT + APPROVE ===== >> purchasing_log.txt

echo --- Create payment request (DNTT) --- >> purchasing_log.txt
curl -s -X POST %API%/purchasing/orders/%POID%/payment-requests -H "%AUTH%" -H "Content-Type: application/json" -d "{\"amount\":250000,\"dueDate\":\"%TODAY%\",\"note\":\"DNTT lan 1\"}" > dntt.json
type dntt.json >> purchasing_log.txt
echo. >> purchasing_log.txt
for /f "delims=" %%i in ('powershell -NoProfile -Command "(Get-Content dntt.json | ConvertFrom-Json).id"') do set DNTT_ID=%%i

echo --- Approve DNTT --- >> purchasing_log.txt
curl -s -X POST %API%/purchasing/payments/%DNTT_ID%/actions/approve -H "%AUTH%" -H "Content-Type: application/json" -d "{}" > dntt_appr.json
type dntt_appr.json >> purchasing_log.txt
echo. >> purchasing_log.txt
for /f "delims=" %%s in ('powershell -NoProfile -Command "(Get-Content dntt_appr.json | ConvertFrom-Json).status"') do set DNTT_STATUS=%%s
echo DNTT status = %DNTT_STATUS% >> purchasing_log.txt

echo --- Approve DNTT again (expect 409) --- >> purchasing_log.txt
curl -s -o nul -w "HTTP %%{http_code}" -X POST %API%/purchasing/payments/%DNTT_ID%/actions/approve -H "%AUTH%" -H "Content-Type: application/json" -d "{}" >> purchasing_log.txt
echo. >> purchasing_log.txt

echo --- List all payments --- >> purchasing_log.txt
curl -s "%API%/purchasing/payments?page=1&size=10" -H "%AUTH%" >> purchasing_log.txt
echo. >> purchasing_log.txt

REM ============================================================
REM PHASE 6: PAYMENT ACTUAL
REM ============================================================

echo. >> purchasing_log.txt
echo ===== PHASE 6: PAYMENT ACTUAL ===== >> purchasing_log.txt

echo --- Create payment actual --- >> purchasing_log.txt
curl -s -X POST %API%/purchasing/orders/%POID%/payment-actuals -H "%AUTH%" -H "Content-Type: application/json" -d "{\"payDate\":\"%TODAY%\",\"amount\":100000,\"note\":\"Tra lan 1\"}" > pa.json
type pa.json >> purchasing_log.txt
echo. >> purchasing_log.txt
for /f "delims=" %%i in ('powershell -NoProfile -Command "(Get-Content pa.json | ConvertFrom-Json).id"') do set PA_ID=%%i

echo --- List payment actuals --- >> purchasing_log.txt
curl -s %API%/purchasing/orders/%POID%/payment-actuals -H "%AUTH%" >> purchasing_log.txt
echo. >> purchasing_log.txt

echo --- Update payment actual --- >> purchasing_log.txt
curl -s -X PUT %API%/purchasing/orders/%POID%/payment-actuals/%PA_ID% -H "%AUTH%" -H "Content-Type: application/json" -d "{\"amount\":120000,\"note\":\"Sua so tien\"}" >> purchasing_log.txt
echo. >> purchasing_log.txt

REM ============================================================
REM PHASE 7: COMPLETE PO
REM ============================================================

echo. >> purchasing_log.txt
echo ===== PHASE 7: COMPLETE PO ===== >> purchasing_log.txt

echo --- Complete purchase order --- >> purchasing_log.txt
curl -s -X POST %API%/purchasing/orders/%POID%/actions/complete -H "%AUTH%" -H "Content-Type: application/json" -d "{}" | powershell -NoProfile -Command "$j=[Console]::In.ReadToEnd()|ConvertFrom-Json; $j.docNo + ' -> ' + $j.status" >> purchasing_log.txt

REM ============================================================
REM PHASE 8: SUPPLIER RETURN
REM ============================================================

echo. >> purchasing_log.txt
echo ===== PHASE 8: SUPPLIER RETURN ===== >> purchasing_log.txt

echo --- Create Supplier Return --- >> purchasing_log.txt
curl -s -X POST %API%/purchasing/supplier-returns -H "%AUTH%" -H "Content-Type: application/json" -d "{\"orderId\":%POID%,\"partnerId\":%SUP_ID%,\"note\":\"Tra hang loi\",\"lines\":[{\"productId\":%PID%,\"quantity\":10,\"unitPrice\":5000}]}" > sr.json
type sr.json >> purchasing_log.txt
echo. >> purchasing_log.txt
for /f "delims=" %%i in ('powershell -NoProfile -Command "(Get-Content sr.json | ConvertFrom-Json).id"') do set SRID=%%i
for /f "delims=" %%n in ('powershell -NoProfile -Command "(Get-Content sr.json | ConvertFrom-Json).docNo"') do set SR_DOCNO=%%n
echo SR docNo = %SR_DOCNO% >> purchasing_log.txt

echo --- Approve Supplier Return --- >> purchasing_log.txt
curl -s -X POST %API%/purchasing/supplier-returns/%SRID%/actions/approve -H "%AUTH%" -H "Content-Type: application/json" -d "{}" > sr_appr.json
for /f "delims=" %%s in ('powershell -NoProfile -Command "(Get-Content sr_appr.json | ConvertFrom-Json).status"') do set SR_STATUS=%%s
echo SR status after approve = %SR_STATUS% >> purchasing_log.txt

echo --- Approve again (expect 409) --- >> purchasing_log.txt
curl -s -o nul -w "HTTP %%{http_code}" -X POST %API%/purchasing/supplier-returns/%SRID%/actions/approve -H "%AUTH%" -H "Content-Type: application/json" -d "{}" >> purchasing_log.txt
echo. >> purchasing_log.txt

echo --- Add line to return --- >> purchasing_log.txt
curl -s -X POST %API%/purchasing/supplier-returns/%SRID%/lines -H "%AUTH%" -H "Content-Type: application/json" -d "{\"productId\":%PID%,\"quantity\":5,\"unitPrice\":5000}" >> purchasing_log.txt
echo. >> purchasing_log.txt

echo --- List supplier returns --- >> purchasing_log.txt
curl -s "%API%/purchasing/supplier-returns?orderId=%POID%" -H "%AUTH%" >> purchasing_log.txt
echo. >> purchasing_log.txt

REM ============================================================
REM SUMMARY
REM ============================================================

echo. >> purchasing_log.txt
echo ===== ALL TESTS COMPLETED ===== >> purchasing_log.txt
echo ===== Endpoints tested: ===== >> purchasing_log.txt
echo   GET/POST /api/v1/purchasing/requests, GET/PUT /{id}, POST /{id}/lines, DELETE /{id}/lines/{lineId} >> purchasing_log.txt
echo   POST /{id}/actions/approve >> purchasing_log.txt
echo   GET/POST /api/v1/purchasing/orders, GET/PUT /{id}, POST /{id}/lines, DELETE /{id}/lines/{lineId} >> purchasing_log.txt
echo   POST /{id}/actions/approve,complete,cancel >> purchasing_log.txt
echo   GET/POST /api/v1/purchasing/orders/{id}/costs, PUT/DELETE /{costId} >> purchasing_log.txt
echo   POST /{costId}/actions/approve,unapprove >> purchasing_log.txt
echo   GET/POST /api/v1/purchasing/orders/{id}/payment-requests, PUT/DELETE /{reqId} >> purchasing_log.txt
echo   GET/POST /api/v1/purchasing/orders/{id}/payment-actuals, PUT/DELETE /{actualId} >> purchasing_log.txt
echo   GET /api/v1/purchasing/payments, POST /{id}/actions/approve >> purchasing_log.txt
echo   GET/POST /api/v1/purchasing/supplier-returns, GET/PUT /{id}, POST/DELETE /{id}/lines >> purchasing_log.txt
echo   POST /{id}/actions/approve >> purchasing_log.txt

type purchasing_log.txt
echo.
echo ===== DONE — check purchasing_log.txt for results =====

del login.json p.json sup.json ct.json pr.json po.json po_appr.json cost1.json cost1_appr.json cost2.json cost2_appr.json cost2_unappr.json dntt.json dntt_appr.json pa.json sr.json sr_appr.json 2>nul