@echo off
setlocal enabledelayedexpansion
cd /d C:\Project\Personal\ERP\sourcecode\erp-backend
set API=http://localhost:5000/api/v1

echo ===== STOP OLD SERVER ===== > outsourcing_log.txt
taskkill /IM Erp.Api.exe /F >> outsourcing_log.txt 2>&1
timeout /t 2 /nobreak > nul

echo ===== BUILD ===== >> outsourcing_log.txt
dotnet build src\Erp.Api\Erp.Api.csproj >> outsourcing_log.txt 2>&1
if errorlevel 1 (
  echo ===== BUILD FAILED ===== >> outsourcing_log.txt
  type outsourcing_log.txt
  exit /b 1
)

echo ===== START API ===== >> outsourcing_log.txt
start "erp-api" cmd /c "dotnet run --project src/Erp.Api --no-build --urls http://localhost:5000 > api_log.txt 2>&1"
timeout /t 10 /nobreak > nul

curl -s -X POST %API%/auth/login -H "Content-Type: application/json" -d "{\"username\":\"admin\",\"password\":\"admin123\"}" > login.json
for /f "delims=" %%t in ('powershell -NoProfile -Command "(Get-Content login.json | ConvertFrom-Json).accessToken"') do set TOKEN=%%t
set AUTH=Authorization: Bearer %TOKEN%

for /f "delims=" %%d in ('powershell -NoProfile -Command "(Get-Date).ToString('yyyy-MM-dd')"') do set TODAY=%%d

REM ============================================================
REM PHASE 1: MASTER DATA
REM ============================================================

echo ===== PHASE 1: MASTER DATA ===== >> outsourcing_log.txt

echo --- Create Product (NVL) --- >> outsourcing_log.txt
curl -s -X POST %API%/md/products -H "%AUTH%" -H "Content-Type: application/json" -d "{\"code\":\"VLP%RANDOM%\",\"name\":\"Vat lieu phu M10\",\"uomId\":1}" > p_nvl.json
type p_nvl.json >> outsourcing_log.txt
echo. >> outsourcing_log.txt
for /f "delims=" %%i in ('powershell -NoProfile -Command "(Get-Content p_nvl.json | ConvertFrom-Json).id"') do set P_NVL=%%i

echo --- Create Product (Thanh pham) --- >> outsourcing_log.txt
curl -s -X POST %API%/md/products -H "%AUTH%" -H "Content-Type: application/json" -d "{\"code\":\"TP%RANDOM%\",\"name\":\"Thanh pham GC\",\"uomId\":1}" > p_tp.json
type p_tp.json >> outsourcing_log.txt
echo. >> outsourcing_log.txt
for /f "delims=" %%i in ('powershell -NoProfile -Command "(Get-Content p_tp.json | ConvertFrom-Json).id"') do set P_TP=%%i

echo --- Create Supplier (NCC Gia cong) --- >> outsourcing_log.txt
curl -s -X POST %API%/md/partners -H "%AUTH%" -H "Content-Type: application/json" -d "{\"code\":\"GC%RANDOM%\",\"shortName\":\"NCC Gia cong A\",\"isSupplier\":true}" > sup.json
type sup.json >> outsourcing_log.txt
echo. >> outsourcing_log.txt
for /f "delims=" %%i in ('powershell -NoProfile -Command "(Get-Content sup.json | ConvertFrom-Json).id"') do set SUP_ID=%%i

echo --- Create Warehouse --- >> outsourcing_log.txt
curl -s -X POST %API%/md/warehouses -H "%AUTH%" -H "Content-Type: application/json" -d "{\"code\":\"WH_GC%RANDOM%\",\"name\":\"Kho gia cong\"}" > wh.json
type wh.json >> outsourcing_log.txt
echo. >> outsourcing_log.txt
for /f "delims=" %%i in ('powershell -NoProfile -Command "(Get-Content wh.json | ConvertFrom-Json).id"') do set WH_ID=%%i

echo --- Create Cost Type --- >> outsourcing_log.txt
curl -s -X POST %API%/md/cost-types -H "%AUTH%" -H "Content-Type: application/json" -d "{\"code\":\"GC%RANDOM%\",\"name\":\"Chi phi gia cong\",\"scope\":\"PURCHASE\"}" > ct.json
type ct.json >> outsourcing_log.txt
echo. >> outsourcing_log.txt
for /f "delims=" %%i in ('powershell -NoProfile -Command "(Get-Content ct.json | ConvertFrom-Json).id"') do set CTID=%%i

echo --- Get Processes (seeded) --- >> outsourcing_log.txt
curl -s "%API%/md/processes" -H "%AUTH%" > procs.json
type procs.json >> outsourcing_log.txt
echo. >> outsourcing_log.txt
for /f "delims=" %%i in ('powershell -NoProfile -Command "($j=Get-Content procs.json|ConvertFrom-Json)[0].id"') do set PROC_XI=%%i
for /f "delims=" %%i in ('powershell -NoProfile -Command "($j=Get-Content procs.json|ConvertFrom-Json)[1].id"') do set PROC_NHUNG=%%i
echo Process XI id = %PROC_XI%, Process NHUNG_NONG id = %PROC_NHUNG% >> outsourcing_log.txt

REM ============================================================
REM PHASE 2: PO + RECEIPT (nhap NVL)
REM ============================================================

echo. >> outsourcing_log.txt
echo ===== PHASE 2: PO + RECEIPT ===== >> outsourcing_log.txt

echo --- Create PO (NORMAL) --- >> outsourcing_log.txt
curl -s -X POST %API%/purchasing/orders -H "%AUTH%" -H "Content-Type: application/json" -d "{\"partnerId\":%SUP_ID%,\"orderForm\":\"NORMAL\",\"lines\":[{\"productId\":%P_NVL%,\"quantity\":100,\"unitPrice\":5000}]}" > po.json
type po.json >> outsourcing_log.txt
echo. >> outsourcing_log.txt
for /f "delims=" %%i in ('powershell -NoProfile -Command "(Get-Content po.json | ConvertFrom-Json).id"') do set POID=%%i

echo --- Approve PO --- >> outsourcing_log.txt
curl -s -X POST %API%/purchasing/orders/%POID%/actions/approve -H "%AUTH%" -H "Content-Type: application/json" -d "{}" > po_appr.json
for /f "delims=" %%s in ('powershell -NoProfile -Command "(Get-Content po_appr.json | ConvertFrom-Json).status"') do set PO_STATUS=%%s
echo PO status = %PO_STATUS% >> outsourcing_log.txt

echo --- Create Receipt from PO --- >> outsourcing_log.txt
curl -s -X POST %API%/purchasing/orders/%POID%/actions/create-receipt-request -H "%AUTH%" -H "Content-Type: application/json" -d "{\"warehouseId\":%WH_ID%}" > rcpt.json
type rcpt.json >> outsourcing_log.txt
echo. >> outsourcing_log.txt
for /f "delims=" %%i in ('powershell -NoProfile -Command "(Get-Content rcpt.json | ConvertFrom-Json).id"') do set RCPT_ID=%%i

echo --- Fill actual qty + Complete Receipt --- >> outsourcing_log.txt
curl -s -X POST %API%/inventory/docs/%RCPT_ID%/actions/set-actual-as-requested -H "%AUTH%" -H "Content-Type: application/json" -d "{}" >> outsourcing_log.txt
echo. >> outsourcing_log.txt
curl -s -X POST %API%/inventory/docs/%RCPT_ID%/actions/complete -H "%AUTH%" -H "Content-Type: application/json" -d "{}" > rcpt_done.json
for /f "delims=" %%s in ('powershell -NoProfile -Command "(Get-Content rcpt_done.json | ConvertFrom-Json).status"') do set RCPT_STATUS=%%s
echo Receipt status = %RCPT_STATUS% >> outsourcing_log.txt

REM ============================================================
REM PHASE 3: CREATE OUTSOURCING ISSUE (xuat SX-DV)
REM ============================================================

echo. >> outsourcing_log.txt
echo ===== PHASE 3: OUTSOURCING ISSUE ===== >> outsourcing_log.txt

echo --- Create Outsourcing Issue from Receipt --- >> outsourcing_log.txt
curl -s -X POST %API%/inventory/docs/%RCPT_ID%/actions/create-outsourcing-issue -H "%AUTH%" -H "Content-Type: application/json" -d "{\"reason\":\"{\\\"processId\\\":%PROC_XI%,\\\"partnerId\\\":%SUP_ID%,\\\"fromWarehouseId\\\":%WH_ID%}\"}" > oissue.json
type oissue.json >> outsourcing_log.txt
echo. >> outsourcing_log.txt
for /f "delims=" %%i in ('powershell -NoProfile -Command "(Get-Content oissue.json | ConvertFrom-Json).id"') do set OISSUE_ID=%%i
for /f "delims=" %%s in ('powershell -NoProfile -Command "(Get-Content oissue.json | ConvertFrom-Json).subType"') do set OISSUE_SUB=%%s
for /f "delims=" %%s in ('powershell -NoProfile -Command "(Get-Content oissue.json | ConvertFrom-Json).orgUnit"') do set OISSUE_ORG=%%s
echo Issue id=%OISSUE_ID%, subType=%OISSUE_SUB%, orgUnit=%OISSUE_ORG% >> outsourcing_log.txt

echo --- Fill actual + Complete Outsourcing Issue --- >> outsourcing_log.txt
curl -s -X POST %API%/inventory/docs/%OISSUE_ID%/actions/set-actual-as-requested -H "%AUTH%" -H "Content-Type: application/json" -d "{}" >> outsourcing_log.txt
echo. >> outsourcing_log.txt
curl -s -X POST %API%/inventory/docs/%OISSUE_ID%/actions/complete -H "%AUTH%" -H "Content-Type: application/json" -d "{}" > oissue_done.json
for /f "delims=" %%s in ('powershell -NoProfile -Command "(Get-Content oissue_done.json | ConvertFrom-Json).status"') do set OISSUE_STATUS=%%s
echo Issue status = %OISSUE_STATUS% >> outsourcing_log.txt

echo --- Duplicate issue (expect 409 DUPLICATE) --- >> outsourcing_log.txt
curl -s -o nul -w "HTTP %%{http_code}" -X POST %API%/inventory/docs/%RCPT_ID%/actions/create-outsourcing-issue -H "%AUTH%" -H "Content-Type: application/json" -d "{\"reason\":\"{\\\"processId\\\":%PROC_XI%,\\\"partnerId\\\":%SUP_ID%,\\\"fromWarehouseId\\\":%WH_ID%}\"}" >> outsourcing_log.txt
echo. >> outsourcing_log.txt

REM ============================================================
REM PHASE 4: CREATE FINISHED RECEIPT (nhap SP-TP)
REM ============================================================

echo. >> outsourcing_log.txt
echo ===== PHASE 4: FINISHED RECEIPT (NHAP SP-TP) ===== >> outsourcing_log.txt

echo --- Create Finished Receipt (matching process) --- >> outsourcing_log.txt
curl -s -X POST %API%/inventory/docs/%OISSUE_ID%/actions/create-finished-receipt -H "%AUTH%" -H "Content-Type: application/json" -d "{\"reason\":\"{\\\"processId\\\":%PROC_XI%,\\\"toWarehouseId\\\":%WH_ID%}\"}" > frcpt.json
type frcpt.json >> outsourcing_log.txt
echo. >> outsourcing_log.txt
for /f "delims=" %%i in ('powershell -NoProfile -Command "(Get-Content frcpt.json | ConvertFrom-Json).id"') do set FRCPT_ID=%%i
for /f "delims=" %%s in ('powershell -NoProfile -Command "(Get-Content frcpt.json | ConvertFrom-Json).subType"') do set FRCPT_SUB=%%s
echo Finished receipt id=%FRCPT_ID%, subType=%FRCPT_SUB% >> outsourcing_log.txt

echo --- Process mismatch test (expect 409 PROCESS_MISMATCH) --- >> outsourcing_log.txt
curl -s -o pmismatch.json -w "HTTP %%{http_code}" -X POST %API%/inventory/docs/%OISSUE_ID%/actions/create-finished-receipt -H "%AUTH%" -H "Content-Type: application/json" -d "{\"reason\":\"{\\\"processId\\\":%PROC_NHUNG%,\\\"toWarehouseId\\\":%WH_ID%}\"}" >> outsourcing_log.txt
echo. >> outsourcing_log.txt
for /f "delims=" %%c in ('powershell -NoProfile -Command "(Get-Content pmismatch.json | ConvertFrom-Json).code"') do set PM_CODE=%%c
echo Process mismatch error code = %PM_CODE% >> outsourcing_log.txt

echo --- Fill actual + Complete Finished Receipt --- >> outsourcing_log.txt
curl -s -X POST %API%/inventory/docs/%FRCPT_ID%/actions/set-actual-as-requested -H "%AUTH%" -H "Content-Type: application/json" -d "{}" >> outsourcing_log.txt
echo. >> outsourcing_log.txt
curl -s -X POST %API%/inventory/docs/%FRCPT_ID%/actions/complete -H "%AUTH%" -H "Content-Type: application/json" -d "{}" > frcpt_done.json
for /f "delims=" %%s in ('powershell -NoProfile -Command "(Get-Content frcpt_done.json | ConvertFrom-Json).status"') do set FRCPT_STATUS=%%s
echo Finished receipt status = %FRCPT_STATUS% >> outsourcing_log.txt

REM ============================================================
REM PHASE 5: OUTSOURCING COST CRUD + APPROVE
REM ============================================================

echo. >> outsourcing_log.txt
echo ===== PHASE 5: OUTSOURCING COST ===== >> outsourcing_log.txt

echo --- Create outsourcing cost --- >> outsourcing_log.txt
curl -s -X POST %API%/purchasing/outsourcing-costs -H "%AUTH%" -H "Content-Type: application/json" -d "{\"receiptDocId\":%FRCPT_ID%,\"productId\":%P_TP%,\"payeeId\":%SUP_ID%,\"costTypeId\":%CTID%,\"processId\":%PROC_XI%,\"amount\":500000,\"vatPct\":10,\"currencyCode\":\"VND\",\"exchangeRate\":1}" > ocost.json
type ocost.json >> outsourcing_log.txt
echo. >> outsourcing_log.txt
for /f "delims=" %%i in ('powershell -NoProfile -Command "(Get-Content ocost.json | ConvertFrom-Json).id"') do set OCOST_ID=%%i

echo --- List outsourcing costs by receipt --- >> outsourcing_log.txt
curl -s "%API%/purchasing/outsourcing-costs?receiptDocId=%FRCPT_ID%" -H "%AUTH%" >> outsourcing_log.txt
echo. >> outsourcing_log.txt

echo --- Update outsourcing cost --- >> outsourcing_log.txt
curl -s -X PUT %API%/purchasing/outsourcing-costs/%OCOST_ID% -H "%AUTH%" -H "Content-Type: application/json" -d "{\"amount\":550000}" >> outsourcing_log.txt
echo. >> outsourcing_log.txt

echo --- Approve outsourcing cost --- >> outsourcing_log.txt
curl -s -X POST %API%/purchasing/outsourcing-costs/%OCOST_ID%/actions/approve -H "%AUTH%" -H "Content-Type: application/json" -d "{}" > ocost_appr.json
for /f "delims=" %%v in ('powershell -NoProfile -Command "(Get-Content ocost_appr.json | ConvertFrom-Json).approved"') do set OCOST_APPR=%%v
echo Cost approved = %OCOST_APPR% >> outsourcing_log.txt

echo --- Approve again (expect 409) --- >> outsourcing_log.txt
curl -s -o nul -w "HTTP %%{http_code}" -X POST %API%/purchasing/outsourcing-costs/%OCOST_ID%/actions/approve -H "%AUTH%" -H "Content-Type: application/json" -d "{}" >> outsourcing_log.txt
echo. >> outsourcing_log.txt

echo --- Unapprove --- >> outsourcing_log.txt
curl -s -X POST %API%/purchasing/outsourcing-costs/%OCOST_ID%/actions/unapprove -H "%AUTH%" -H "Content-Type: application/json" -d "{}" > ocost_unappr.json
for /f "delims=" %%v in ('powershell -NoProfile -Command "(Get-Content ocost_unappr.json | ConvertFrom-Json).approved"') do set OCOST_UNAPPR=%%v
echo Cost approved after unapprove = %OCOST_UNAPPR% >> outsourcing_log.txt

echo --- Re-approve for collection test --- >> outsourcing_log.txt
curl -s -X POST %API%/purchasing/outsourcing-costs/%OCOST_ID%/actions/approve -H "%AUTH%" -H "Content-Type: application/json" -d "{}" >> outsourcing_log.txt
echo. >> outsourcing_log.txt

REM ============================================================
REM PHASE 6: COLLECT SERVICE COSTS INTO PO SERVICE
REM ============================================================

echo. >> outsourcing_log.txt
echo ===== PHASE 6: COLLECT SERVICE COSTS ===== >> outsourcing_log.txt

echo --- Create PO SERVICE (same partner) --- >> outsourcing_log.txt
curl -s -X POST %API%/purchasing/orders -H "%AUTH%" -H "Content-Type: application/json" -d "{\"partnerId\":%SUP_ID%,\"orderForm\":\"SERVICE\",\"note\":\"DH dich vu gia cong\"}" > po_svc.json
type po_svc.json >> outsourcing_log.txt
echo. >> outsourcing_log.txt
for /f "delims=" %%i in ('powershell -NoProfile -Command "(Get-Content po_svc.json | ConvertFrom-Json).id"') do set PO_SVC_ID=%%i

echo --- Collect service costs --- >> outsourcing_log.txt
curl -s -X POST %API%/purchasing/orders/%PO_SVC_ID%/collect-service-costs -H "%AUTH%" -H "Content-Type: application/json" -d "{}" > collect.json
type collect.json >> outsourcing_log.txt
echo. >> outsourcing_log.txt

echo --- Verify cost is now collected --- >> outsourcing_log.txt
curl -s %API%/purchasing/outsourcing-costs/%OCOST_ID% -H "%AUTH%" > ocost_final.json
for /f "delims=" %%v in ('powershell -NoProfile -Command "(Get-Content ocost_final.json | ConvertFrom-Json).collectedPoId"') do set COLLECTED_PO=%%v
echo Cost collectedPoId = %COLLECTED_PO% >> outsourcing_log.txt

echo --- Collect again (expect 0 collected) --- >> outsourcing_log.txt
curl -s -X POST %API%/purchasing/orders/%PO_SVC_ID%/collect-service-costs -H "%AUTH%" -H "Content-Type: application/json" -d "{}" >> outsourcing_log.txt
echo. >> outsourcing_log.txt

echo --- Verify PO SERVICE has lines --- >> outsourcing_log.txt
curl -s %API%/purchasing/orders/%PO_SVC_ID% -H "%AUTH%" > po_svc_final.json
type po_svc_final.json >> outsourcing_log.txt
echo. >> outsourcing_log.txt

REM ============================================================
REM SUMMARY
REM ============================================================

echo. >> outsourcing_log.txt
echo ===== ALL TESTS COMPLETED ===== >> outsourcing_log.txt
echo   Phase 1: Master data (products, supplier, warehouse, cost type, processes) >> outsourcing_log.txt
echo   Phase 2: PO -^> Receipt -^> Complete >> outsourcing_log.txt
echo   Phase 3: Receipt -^> Outsourcing Issue (OUTSOURCING) -^> Complete >> outsourcing_log.txt
echo   Phase 4: Issue -^> Finished Receipt (FINISHED_GOODS) -^> Complete + PROCESS_MISMATCH test >> outsourcing_log.txt
echo   Phase 5: Outsourcing Cost CRUD + Approve/Unapprove >> outsourcing_log.txt
echo   Phase 6: Collect service costs into PO SERVICE >> outsourcing_log.txt

type outsourcing_log.txt
echo.
echo ===== DONE — check outsourcing_log.txt for results =====

del login.json p_nvl.json p_tp.json sup.json wh.json ct.json procs.json po.json po_appr.json rcpt.json rcpt_done.json oissue.json oissue_done.json frcpt.json frcpt_done.json pmismatch.json ocost.json ocost_appr.json ocost_unappr.json ocost_final.json po_svc.json po_svc_final.json collect.json 2>nul