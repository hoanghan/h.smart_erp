@echo off
setlocal enabledelayedexpansion
cd /d C:\Project\Personal\ERP\sourcecode\erp-backend
set API=http://localhost:5000/api/v1

echo ===== STOP OLD SERVER ===== > mrp_log.txt
taskkill /IM Erp.Api.exe /F >> mrp_log.txt 2>&1
timeout /t 2 /nobreak > nul

echo ===== BUILD ===== >> mrp_log.txt
dotnet build src\Erp.Api\Erp.Api.csproj >> mrp_log.txt 2>&1
if errorlevel 1 (
  echo ===== BUILD FAILED ===== >> mrp_log.txt
  type mrp_log.txt
  exit /b 1
)

echo ===== START API ===== >> mrp_log.txt
start "erp-api" cmd /c "dotnet run --project src/Erp.Api --no-build --urls http://localhost:5000 > api_log.txt 2>&1"

set READY=
for /l %%n in (1,1,24) do (
  if not defined READY (
    curl -s -o nul -w "%%{http_code}" http://localhost:5000/health > health.txt
    set /p HCODE=<health.txt
    if "!HCODE!"=="200" (set READY=1) else (timeout /t 5 /nobreak > nul)
  )
)

curl -s -X POST %API%/auth/login -H "Content-Type: application/json" -d "{\"username\":\"admin\",\"password\":\"admin123\"}" > login.json
for /f "delims=" %%t in ('powershell -NoProfile -Command "(Get-Content login.json | ConvertFrom-Json).accessToken"') do set TOKEN=%%t
set AUTH=Authorization: Bearer %TOKEN%

for /f "delims=" %%d in ('powershell -NoProfile -Command "Get-Date -Format yyyy-MM-dd"') do set TODAY=%%d

REM ============================================================
REM PHASE 1: MASTER DATA - products A/B/C/D, warehouse, partners, workstation
REM ============================================================
echo. >> mrp_log.txt
echo ===== PHASE 1: MASTER DATA ===== >> mrp_log.txt

curl -s -X POST %API%/md/products -H "%AUTH%" -H "Content-Type: application/json" -d "{\"code\":\"MRPA%RANDOM%\",\"name\":\"San pham A\",\"uomId\":1}" > pa.json
type pa.json >> mrp_log.txt & echo. >> mrp_log.txt
for /f "delims=" %%i in ('powershell -NoProfile -Command "(Get-Content pa.json | ConvertFrom-Json).id"') do set PID_A=%%i

curl -s -X POST %API%/md/products -H "%AUTH%" -H "Content-Type: application/json" -d "{\"code\":\"MRPB%RANDOM%\",\"name\":\"Ban thanh pham B\",\"uomId\":1}" > pb.json
type pb.json >> mrp_log.txt & echo. >> mrp_log.txt
for /f "delims=" %%i in ('powershell -NoProfile -Command "(Get-Content pb.json | ConvertFrom-Json).id"') do set PID_B=%%i

curl -s -X POST %API%/md/products -H "%AUTH%" -H "Content-Type: application/json" -d "{\"code\":\"MRPC%RANDOM%\",\"name\":\"NVL C\",\"uomId\":1}" > pc.json
type pc.json >> mrp_log.txt & echo. >> mrp_log.txt
for /f "delims=" %%i in ('powershell -NoProfile -Command "(Get-Content pc.json | ConvertFrom-Json).id"') do set PID_C=%%i

curl -s -X POST %API%/md/products -H "%AUTH%" -H "Content-Type: application/json" -d "{\"code\":\"MRPD%RANDOM%\",\"name\":\"NVL D\",\"uomId\":1}" > pd.json
type pd.json >> mrp_log.txt & echo. >> mrp_log.txt
for /f "delims=" %%i in ('powershell -NoProfile -Command "(Get-Content pd.json | ConvertFrom-Json).id"') do set PID_D=%%i

curl -s -X POST %API%/md/warehouses -H "%AUTH%" -H "Content-Type: application/json" -d "{\"code\":\"WHMRP%RANDOM%\",\"name\":\"Kho MRP test\"}" > wh.json
type wh.json >> mrp_log.txt & echo. >> mrp_log.txt
for /f "delims=" %%i in ('powershell -NoProfile -Command "(Get-Content wh.json | ConvertFrom-Json).id"') do set WH_ID=%%i

curl -s -X POST %API%/md/partners -H "%AUTH%" -H "Content-Type: application/json" -d "{\"code\":\"KHMRP%RANDOM%\",\"shortName\":\"KH MRP test\",\"isCustomer\":true}" > cust.json
type cust.json >> mrp_log.txt & echo. >> mrp_log.txt
for /f "delims=" %%i in ('powershell -NoProfile -Command "(Get-Content cust.json | ConvertFrom-Json).id"') do set CUST_ID=%%i

curl -s -X POST %API%/md/partners -H "%AUTH%" -H "Content-Type: application/json" -d "{\"code\":\"NCCMRP%RANDOM%\",\"shortName\":\"NCC MRP test\",\"isSupplier\":true}" > sup.json
type sup.json >> mrp_log.txt & echo. >> mrp_log.txt
for /f "delims=" %%i in ('powershell -NoProfile -Command "(Get-Content sup.json | ConvertFrom-Json).id"') do set SUP_ID=%%i

curl -s -X POST %API%/mfg/workstations -H "%AUTH%" -H "Content-Type: application/json" -d "{\"name\":\"Gia cong chinh\",\"hourly_cost\":150000,\"working_hours_per_day\":8}" > ws.json
type ws.json >> mrp_log.txt & echo. >> mrp_log.txt
for /f "delims=" %%i in ('powershell -NoProfile -Command "(Get-Content ws.json | ConvertFrom-Json).id"') do set WS_ID=%%i

echo. >> mrp_log.txt
echo ===== PHASE 2: OPERATIONS (seed tu core.process) ===== >> mrp_log.txt
curl -s -X GET "%API%/mfg/operations" -H "%AUTH%" > ops.json
type ops.json >> mrp_log.txt & echo. >> mrp_log.txt
for /f "delims=" %%i in ('powershell -NoProfile -Command "(Get-Content ops.json | ConvertFrom-Json).items[0].id"') do set OP_ID=%%i
echo OP_ID = %OP_ID% >> mrp_log.txt

REM ============================================================
REM PHASE 3: BOM 2 cap - A = 2xB + 1xC ; B = 3xD
REM ============================================================
echo. >> mrp_log.txt
echo ===== PHASE 3: BOM 2 cap (A = 2xB + 1xC, B = 3xD) ===== >> mrp_log.txt

curl -s -X POST %API%/mfg/boms -H "%AUTH%" -H "Content-Type: application/json" -d "{\"product_id\":%PID_B%,\"quantity\":1,\"is_default\":true,\"with_operations\":true,\"items\":[{\"product_id\":%PID_D%,\"quantity\":3,\"rate\":10000}],\"operations\":[{\"operation_id\":%OP_ID%,\"workstation_id\":%WS_ID%,\"time_minutes\":30}]}" > bomb.json
type bomb.json >> mrp_log.txt & echo. >> mrp_log.txt
for /f "delims=" %%i in ('powershell -NoProfile -Command "(Get-Content bomb.json | ConvertFrom-Json).id"') do set BOM_B_ID=%%i

curl -s -X POST %API%/mfg/boms -H "%AUTH%" -H "Content-Type: application/json" -d "{\"product_id\":%PID_A%,\"quantity\":1,\"is_default\":true,\"with_operations\":true,\"items\":[{\"product_id\":%PID_B%,\"quantity\":2,\"bom_id\":%BOM_B_ID%},{\"product_id\":%PID_C%,\"quantity\":1,\"rate\":20000}],\"operations\":[{\"operation_id\":%OP_ID%,\"workstation_id\":%WS_ID%,\"time_minutes\":45}]}" > boma.json
type boma.json >> mrp_log.txt & echo. >> mrp_log.txt
for /f "delims=" %%i in ('powershell -NoProfile -Command "(Get-Content boma.json | ConvertFrom-Json).id"') do set BOM_A_ID=%%i

echo. >> mrp_log.txt
echo ===== PHASE 4: EXPLODE BOM A x10 (expect D=60, C=10) ===== >> mrp_log.txt
curl -s -X GET "%API%/mfg/boms/%BOM_A_ID%/explode?qty=10" -H "%AUTH%" > explode.json
type explode.json >> mrp_log.txt & echo. >> mrp_log.txt

REM ============================================================
REM PHASE 5: Seed stock D=20, C=10 (Stock Reconciliation)
REM ============================================================
echo. >> mrp_log.txt
echo ===== PHASE 5: SEED STOCK D=20, C=10 ===== >> mrp_log.txt
curl -s -X POST %API%/inventory/reconciliations -H "%AUTH%" -H "Content-Type: application/json" -d "{\"warehouseId\":%WH_ID%,\"reconciliationDate\":\"%TODAY%\",\"lines\":[{\"productId\":%PID_D%,\"actualQty\":20},{\"productId\":%PID_C%,\"actualQty\":10}]}" > recon1.json
type recon1.json >> mrp_log.txt & echo. >> mrp_log.txt
for /f "delims=" %%i in ('powershell -NoProfile -Command "(Get-Content recon1.json | ConvertFrom-Json).id"') do set RECON1_ID=%%i

curl -s -X POST %API%/inventory/reconciliations/%RECON1_ID%/snapshot -H "%AUTH%" -H "Content-Type: application/json" -d "{}" >> mrp_log.txt & echo. >> mrp_log.txt
curl -s -X POST %API%/inventory/reconciliations/%RECON1_ID%/actions/approve -H "%AUTH%" -H "Content-Type: application/json" -d "{}" >> mrp_log.txt & echo. >> mrp_log.txt
curl -s -X POST %API%/inventory/reconciliations/%RECON1_ID%/actions/post -H "%AUTH%" -H "Content-Type: application/json" -d "{}" >> mrp_log.txt & echo. >> mrp_log.txt

REM ============================================================
REM PHASE 6: Sales Order A x 10
REM ============================================================
echo. >> mrp_log.txt
echo ===== PHASE 6: SALES ORDER A x10 ===== >> mrp_log.txt
curl -s -X POST %API%/sales/orders -H "%AUTH%" -H "Content-Type: application/json" -d "{\"partnerId\":%CUST_ID%,\"orderForm\":\"NORMAL\",\"warehouseId\":%WH_ID%,\"lines\":[{\"productId\":%PID_A%,\"quantity\":10,\"unitPrice\":500000,\"vatPct\":10}]}" > so.json
type so.json >> mrp_log.txt & echo. >> mrp_log.txt
for /f "delims=" %%i in ('powershell -NoProfile -Command "(Get-Content so.json | ConvertFrom-Json).id"') do set SO_ID=%%i

REM ============================================================
REM PHASE 7: Production Plan tu SO -> shortage D = 40
REM ============================================================
echo. >> mrp_log.txt
echo ===== PHASE 7: PRODUCTION PLAN (expect D shortage = 40) ===== >> mrp_log.txt
curl -s -X POST %API%/mfg/production-plans -H "%AUTH%" -H "Content-Type: application/json" -d "{\"so_ids\":[%SO_ID%]}" > pp.json
type pp.json >> mrp_log.txt & echo. >> mrp_log.txt
for /f "delims=" %%i in ('powershell -NoProfile -Command "(Get-Content pp.json | ConvertFrom-Json).id"') do set PP_ID=%%i
for /f "delims=" %%s in ('powershell -NoProfile -Command "$j=Get-Content pp.json | ConvertFrom-Json; ($j.materials | Where-Object {$_.product_id -eq %PID_D%}).shortage"') do set D_SHORTAGE=%%s
echo D_SHORTAGE = %D_SHORTAGE% (expect 40) >> mrp_log.txt

curl -s -X POST %API%/mfg/production-plans/%PP_ID%/submit -H "%AUTH%" -H "Content-Type: application/json" -d "{}" >> mrp_log.txt & echo. >> mrp_log.txt

REM ============================================================
REM PHASE 8: Generate Material Requests -> PR mua D shortage = 40
REM ============================================================
echo. >> mrp_log.txt
echo ===== PHASE 8: GENERATE MATERIAL REQUESTS ===== >> mrp_log.txt
curl -s -X POST %API%/mfg/production-plans/%PP_ID%/generate-material-requests -H "%AUTH%" -H "Content-Type: application/json" -d "{}" > genmr.json
type genmr.json >> mrp_log.txt & echo. >> mrp_log.txt

REM ============================================================
REM PHASE 9: Top up stock D 20 -> 60 (+40) de du NVL cho WO
REM ============================================================
echo. >> mrp_log.txt
echo ===== PHASE 9: TOP UP STOCK D -> 60 ===== >> mrp_log.txt
curl -s -X POST %API%/inventory/reconciliations -H "%AUTH%" -H "Content-Type: application/json" -d "{\"warehouseId\":%WH_ID%,\"reconciliationDate\":\"%TODAY%\",\"lines\":[{\"productId\":%PID_D%,\"actualQty\":60}]}" > recon2.json
type recon2.json >> mrp_log.txt & echo. >> mrp_log.txt
for /f "delims=" %%i in ('powershell -NoProfile -Command "(Get-Content recon2.json | ConvertFrom-Json).id"') do set RECON2_ID=%%i

curl -s -X POST %API%/inventory/reconciliations/%RECON2_ID%/snapshot -H "%AUTH%" -H "Content-Type: application/json" -d "{}" >> mrp_log.txt & echo. >> mrp_log.txt
curl -s -X POST %API%/inventory/reconciliations/%RECON2_ID%/actions/approve -H "%AUTH%" -H "Content-Type: application/json" -d "{}" >> mrp_log.txt & echo. >> mrp_log.txt
curl -s -X POST %API%/inventory/reconciliations/%RECON2_ID%/actions/post -H "%AUTH%" -H "Content-Type: application/json" -d "{}" >> mrp_log.txt & echo. >> mrp_log.txt

REM ============================================================
REM PHASE 10: Generate Work Orders tu Production Plan
REM ============================================================
echo. >> mrp_log.txt
echo ===== PHASE 10: GENERATE WORK ORDERS ===== >> mrp_log.txt
curl -s -X POST %API%/mfg/production-plans/%PP_ID%/generate-work-orders -H "%AUTH%" -H "Content-Type: application/json" -d "{}" > genwo.json
type genwo.json >> mrp_log.txt & echo. >> mrp_log.txt
for /f "delims=" %%i in ('powershell -NoProfile -Command "(Get-Content genwo.json | ConvertFrom-Json).generated_work_orders[0].work_order_id"') do set WO_ID=%%i
echo WO_ID = %WO_ID% >> mrp_log.txt

REM ============================================================
REM PHASE 11: Submit + Start Work Order (chuyen NVL -> WIP)
REM ============================================================
echo. >> mrp_log.txt
echo ===== PHASE 11: SUBMIT + START WORK ORDER ===== >> mrp_log.txt
curl -s -X POST %API%/mfg/work-orders/%WO_ID%/submit -H "%AUTH%" -H "Content-Type: application/json" -d "{}" >> mrp_log.txt & echo. >> mrp_log.txt
curl -s -X POST %API%/mfg/work-orders/%WO_ID%/start -H "%AUTH%" -H "Content-Type: application/json" -d "{}" > start.json
type start.json >> mrp_log.txt & echo. >> mrp_log.txt

REM ============================================================
REM PHASE 12: Finish 6 A (gia von = NVL + cong doan)
REM ============================================================
echo. >> mrp_log.txt
echo ===== PHASE 12: FINISH 6 A ===== >> mrp_log.txt
curl -s -X POST %API%/mfg/work-orders/%WO_ID%/finish -H "%AUTH%" -H "Content-Type: application/json" -d "{\"qty\":6}" > finish1.json
type finish1.json >> mrp_log.txt & echo. >> mrp_log.txt

REM ============================================================
REM PHASE 13: Finish 4 A -> WO COMPLETED
REM ============================================================
echo. >> mrp_log.txt
echo ===== PHASE 13: FINISH 4 A -> COMPLETED ===== >> mrp_log.txt
curl -s -X POST %API%/mfg/work-orders/%WO_ID%/finish -H "%AUTH%" -H "Content-Type: application/json" -d "{\"qty\":4}" > finish2.json
type finish2.json >> mrp_log.txt & echo. >> mrp_log.txt

REM ============================================================
REM PHASE 14: Check WO status COMPLETED + ton kho A = 10
REM ============================================================
echo. >> mrp_log.txt
echo ===== PHASE 14: CHECK WO COMPLETED + STOCK A=10 ===== >> mrp_log.txt
curl -s -X GET "%API%/mfg/work-orders/%WO_ID%" -H "%AUTH%" > wo.json
type wo.json >> mrp_log.txt & echo. >> mrp_log.txt
for /f "delims=" %%s in ('powershell -NoProfile -Command "(Get-Content wo.json | ConvertFrom-Json).status"') do set WO_STATUS=%%s
echo WO_STATUS = %WO_STATUS% (expect COMPLETED) >> mrp_log.txt

curl -s -X GET "%API%/inventory/stock-balance?productId=%PID_A%&warehouseId=%WH_ID%" -H "%AUTH%" > balA.json
type balA.json >> mrp_log.txt & echo. >> mrp_log.txt
for /f "delims=" %%q in ('powershell -NoProfile -Command "(Get-Content balA.json | ConvertFrom-Json)[0].qtyOnHand"') do set A_QTY=%%q
echo A_QTY_ON_HAND = %A_QTY% (expect 10) >> mrp_log.txt

REM ============================================================
REM PHASE 15: Manufacturing reports
REM ============================================================
echo. >> mrp_log.txt
echo ===== PHASE 15: MANUFACTURING REPORTS ===== >> mrp_log.txt
curl -s -X GET "%API%/mfg/reports/production-cost?workOrderId=%WO_ID%" -H "%AUTH%" > repcost.json
type repcost.json >> mrp_log.txt & echo. >> mrp_log.txt

curl -s -X GET "%API%/mfg/reports/wip-balance" -H "%AUTH%" > repwip.json
type repwip.json >> mrp_log.txt & echo. >> mrp_log.txt

REM ============================================================
REM PHASE 16: Consolidate PR -> PO (gan NCC cho NVL D shortage)
REM ============================================================
echo. >> mrp_log.txt
echo ===== PHASE 16: CONSOLIDATE TO PO ===== >> mrp_log.txt
curl -s -X POST %API%/mfg/production-plans/%PP_ID%/consolidate-to-po -H "%AUTH%" -H "Content-Type: application/json" -d "{\"supplierAssignments\":{\"%PID_D%\":%SUP_ID%}}" > consolpo.json
type consolpo.json >> mrp_log.txt & echo. >> mrp_log.txt

REM ============================================================
REM SUMMARY
REM ============================================================
echo. >> mrp_log.txt
echo ===== SUMMARY ===== >> mrp_log.txt
echo PID_A=%PID_A% PID_B=%PID_B% PID_C=%PID_C% PID_D=%PID_D% WH_ID=%WH_ID% >> mrp_log.txt
echo BOM_A_ID=%BOM_A_ID% BOM_B_ID=%BOM_B_ID% PP_ID=%PP_ID% WO_ID=%WO_ID% >> mrp_log.txt
echo D_SHORTAGE=%D_SHORTAGE% (expect 40) >> mrp_log.txt
echo WO_STATUS=%WO_STATUS% (expect COMPLETED) >> mrp_log.txt
echo A_QTY_ON_HAND=%A_QTY% (expect 10) >> mrp_log.txt

del *.json 2>nul
del health.txt 2>nul

echo. >> mrp_log.txt
echo ===== MRP TEST COMPLETE ===== >> mrp_log.txt
type mrp_log.txt
