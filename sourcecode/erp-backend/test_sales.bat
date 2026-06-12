@echo off
setlocal enabledelayedexpansion
cd /d C:\Project\Personal\ERP\sourcecode\erp-backend
set API=http://localhost:5000/api/v1

echo ===== STOP OLD SERVER ===== > sales_log.txt
taskkill /IM Erp.Api.exe /F >> sales_log.txt 2>&1
timeout /t 2 /nobreak > nul

echo ===== BUILD ===== >> sales_log.txt
dotnet build >> sales_log.txt 2>&1
if errorlevel 1 (
  echo ===== BUILD FAILED ===== >> sales_log.txt
  type sales_log.txt
  exit /b 1
)

echo ===== START API ===== >> sales_log.txt
start "erp-api" cmd /c "dotnet run --project src/Erp.Api --no-build --urls http://localhost:5000 > api_log.txt 2>&1"
timeout /t 10 /nobreak > nul

curl -s -X POST %API%/auth/login -H "Content-Type: application/json" -d "{\"username\":\"admin\",\"password\":\"admin123\"}" > login.json
for /f "delims=" %%t in ('powershell -NoProfile -Command "(Get-Content login.json | ConvertFrom-Json).accessToken"') do set TOKEN=%%t
set AUTH=Authorization: Bearer %TOKEN%

for /f "delims=" %%d in ('powershell -NoProfile -Command "(Get-Date).ToString('yyyy-MM-dd')"') do set TODAY=%%d

REM ============================================================
REM PHASE 1: EXISTING TESTS — Quotation → Order
REM ============================================================

echo ===== CREATE PRODUCT ===== >> sales_log.txt
curl -s -X POST %API%/md/products -H "%AUTH%" -H "Content-Type: application/json" -d "{\"code\":\"BL%RANDOM%\",\"name\":\"Bu long M10\",\"uomId\":1}" > p.json
type p.json >> sales_log.txt
echo. >> sales_log.txt
for /f "delims=" %%i in ('powershell -NoProfile -Command "(Get-Content p.json | ConvertFrom-Json).id"') do set PID=%%i

echo ===== CREATE GIFT PRODUCT ===== >> sales_log.txt
curl -s -X POST %API%/md/products -H "%AUTH%" -H "Content-Type: application/json" -d "{\"code\":\"OV%RANDOM%\",\"name\":\"Oc vit M10\",\"uomId\":1}" > g.json
type g.json >> sales_log.txt
echo. >> sales_log.txt
for /f "delims=" %%i in ('powershell -NoProfile -Command "(Get-Content g.json | ConvertFrom-Json).id"') do set GID=%%i

echo ===== CREATE QUOTATION ===== >> sales_log.txt
curl -s -X POST %API%/sales/quotations -H "%AUTH%" -H "Content-Type: application/json" -d "{\"partnerId\":1,\"note\":\"BG test\",\"lines\":[{\"productId\":%PID%,\"quantity\":10,\"approvedPrice\":15000}]}" > q.json
type q.json >> sales_log.txt
echo. >> sales_log.txt
for /f "delims=" %%i in ('powershell -NoProfile -Command "(Get-Content q.json | ConvertFrom-Json).id"') do set QID=%%i

echo ===== QUOTATION REQUEST-APPROVAL ===== >> sales_log.txt
curl -s -X POST %API%/sales/quotations/%QID%/actions/request-approval -H "%AUTH%" -H "Content-Type: application/json" -d "{}" | powershell -NoProfile -Command "$j=[Console]::In.ReadToEnd()|ConvertFrom-Json; $j.docNo + ' -> ' + $j.status" >> sales_log.txt

echo ===== QUOTATION APPROVE ===== >> sales_log.txt
curl -s -X POST %API%/sales/quotations/%QID%/actions/approve -H "%AUTH%" -H "Content-Type: application/json" -d "{}" | powershell -NoProfile -Command "$j=[Console]::In.ReadToEnd()|ConvertFrom-Json; $j.docNo + ' -> ' + $j.status" >> sales_log.txt

echo ===== APPROVE LAN 2 (expect 409) ===== >> sales_log.txt
curl -s -o nul -w "HTTP %%{http_code}" -X POST %API%/sales/quotations/%QID%/actions/approve -H "%AUTH%" -H "Content-Type: application/json" -d "{}" >> sales_log.txt
echo. >> sales_log.txt

echo ===== CANCEL KHONG LY DO (expect 409) ===== >> sales_log.txt
curl -s -o nul -w "HTTP %%{http_code}" -X POST %API%/sales/quotations/%QID%/actions/cancel -H "%AUTH%" -H "Content-Type: application/json" -d "{}" >> sales_log.txt
echo. >> sales_log.txt

echo ===== CONVERT TO ORDER ===== >> sales_log.txt
curl -s -X POST %API%/sales/quotations/%QID%/actions/convert-to-order -H "%AUTH%" -H "Content-Type: application/json" -d "{}" > co.json
type co.json >> sales_log.txt
echo. >> sales_log.txt
for /f "delims=" %%i in ('powershell -NoProfile -Command "(Get-Content co.json | ConvertFrom-Json).orderId"') do set OID=%%i

echo ===== ORDER REQUEST-APPROVAL + APPROVE ===== >> sales_log.txt
curl -s -X POST %API%/sales/orders/%OID%/actions/request-approval -H "%AUTH%" -H "Content-Type: application/json" -d "{}" | powershell -NoProfile -Command "$j=[Console]::In.ReadToEnd()|ConvertFrom-Json; $j.docNo + ' -> ' + $j.status" >> sales_log.txt
curl -s -X POST %API%/sales/orders/%OID%/actions/approve -H "%AUTH%" -H "Content-Type: application/json" -d "{}" | powershell -NoProfile -Command "$j=[Console]::In.ReadToEnd()|ConvertFrom-Json; $j.docNo + ' -> ' + $j.status + ' / total=' + $j.totalAmount" >> sales_log.txt

echo ===== GET ORDER (lines + amount computed) ===== >> sales_log.txt
curl -s %API%/sales/orders/%OID% -H "%AUTH%" >> sales_log.txt
echo. >> sales_log.txt

REM ============================================================
REM PHASE 2: BANG GIA — Price List auto-apply
REM ============================================================

echo. >> sales_log.txt
echo ===== PHASE 2: PRICE LIST AUTO-APPLY ===== >> sales_log.txt

echo --- Create Price List --- >> sales_log.txt
curl -s -X POST %API%/sales/price-lists -H "%AUTH%" -H "Content-Type: application/json" -d "{\"code\":\"PL-%RANDOM%\",\"name\":\"Bang gia test\",\"validFrom\":\"%TODAY%\",\"items\":[{\"productId\":%PID%,\"price\":12500}]}" > pl.json
type pl.json >> sales_log.txt
echo. >> sales_log.txt
for /f "delims=" %%i in ('powershell -NoProfile -Command "(Get-Content pl.json | ConvertFrom-Json).id"') do set PLID=%%i

echo --- Create order with listPrice auto-fill from price list --- >> sales_log.txt
curl -s -X POST %API%/sales/orders -H "%AUTH%" -H "Content-Type: application/json" -d "{\"partnerId\":1,\"lines\":[{\"productId\":%PID%,\"quantity\":5,\"unitPrice\":12000}]}" > o2.json
type o2.json >> sales_log.txt
echo. >> sales_log.txt
for /f "delims=" %%i in ('powershell -NoProfile -Command "(Get-Content o2.json | ConvertFrom-Json).id"') do set OID2=%%i

echo --- Verify listPrice was auto-filled (expect 12500) --- >> sales_log.txt
for /f "delims=" %%v in ('powershell -NoProfile -Command "(Get-Content o2.json | ConvertFrom-Json).lines[0].listPrice"') do set LIST_PRICE=%%v
echo listPrice = %LIST_PRICE% >> sales_log.txt

echo --- List price lists --- >> sales_log.txt
curl -s "%API%/sales/price-lists?page=1&size=5" -H "%AUTH%" | powershell -NoProfile -Command "$j=[Console]::In.ReadToEnd()|ConvertFrom-Json; 'total=' + $j.total" >> sales_log.txt

echo --- Add item to price list --- >> sales_log.txt
curl -s -X POST %API%/sales/price-lists/%PLID%/items -H "%AUTH%" -H "Content-Type: application/json" -d "{\"productId\":%GID%,\"price\":5000}" >> sales_log.txt
echo. >> sales_log.txt

REM ============================================================
REM PHASE 3: KHUYEN MAI — Promotion + apply to order
REM ============================================================

echo. >> sales_log.txt
echo ===== PHASE 3: PROMOTION - CK + GIFTS ===== >> sales_log.txt

echo --- Create Promotion with discount + gift --- >> sales_log.txt
curl -s -X POST %API%/sales/promotions -H "%AUTH%" -H "Content-Type: application/json" -d "{\"code\":\"KM-%RANDOM%\",\"name\":\"CK 10%% + Qua tang\",\"dateFrom\":\"%TODAY%\",\"discountPct\":10,\"hasGift\":true,\"discountItems\":[{\"productId\":%PID%,\"totalPct\":10,\"companyPct\":5,\"vendorPct\":5}],\"giftItems\":[{\"buyProductId\":%PID%,\"giftProductId\":%GID%,\"requiredQty\":10,\"totalGiftQty\":2}]}" > promo.json
type promo.json >> sales_log.txt
echo. >> sales_log.txt
for /f "delims=" %%i in ('powershell -NoProfile -Command "(Get-Content promo.json | ConvertFrom-Json).id"') do set PROMO_ID=%%i

echo --- Add discount item to existing promotion --- >> sales_log.txt
curl -s -X POST %API%/sales/promotions/%PROMO_ID%/discount-items -H "%AUTH%" -H "Content-Type: application/json" -d "{\"productId\":%GID%,\"totalPct\":5}" >> sales_log.txt
echo. >> sales_log.txt

echo --- Apply promotion to order %OID2% --- >> sales_log.txt
curl -s -X PUT %API%/sales/orders/%OID2%/promotions -H "%AUTH%" -H "Content-Type: application/json" -d "{\"promotionIds\":[%PROMO_ID%]}" > o2promo.json
type o2promo.json >> sales_log.txt
echo. >> sales_log.txt

echo --- Verify gift line added (isGift=true, unitPrice=0) --- >> sales_log.txt
powershell -NoProfile -Command "$o = Get-Content o2promo.json | ConvertFrom-Json; $gift = $o.lines | Where-Object { $_.isGift -eq $true }; if ($gift) { 'GIFT OK: productId=' + $gift.productId + ' qty=' + $gift.quantity + ' price=' + $gift.unitPrice } else { 'GIFT NOT FOUND' }" >> sales_log.txt

echo --- Verify discount applied (unitPrice reduced) --- >> sales_log.txt
powershell -NoProfile -Command "$o = Get-Content o2promo.json | ConvertFrom-Json; $main = $o.lines | Where-Object { $_.isGift -eq $false -and $_.productId -eq %PID% }; if ($main) { 'DISCOUNT OK: unitPrice=' + $main.unitPrice + ' (was 12000, expected 10800)' } else { 'DISCOUNT LINE NOT FOUND' }" >> sales_log.txt

echo --- List promotions --- >> sales_log.txt
curl -s "%API%/sales/promotions?page=1&size=5" -H "%AUTH%" | powershell -NoProfile -Command "$j=[Console]::In.ReadToEnd()|ConvertFrom-Json; 'total=' + $j.total" >> sales_log.txt

REM ============================================================
REM PHASE 4: CHI PHI — Order Costs (CRUD + approve/unapprove)
REM ============================================================

echo. >> sales_log.txt
echo ===== PHASE 4: ORDER COSTS CRUD + APPROVE ===== >> sales_log.txt

echo --- Create Cost Type --- >> sales_log.txt
curl -s -X POST %API%/md/cost-types -H "%AUTH%" -H "Content-Type: application/json" -d "{\"code\":\"VC%RANDOM%\",\"name\":\"Van chuyen test\",\"scope\":\"SALES\"}" > ct.json
type ct.json >> sales_log.txt
echo. >> sales_log.txt
for /f "delims=" %%i in ('powershell -NoProfile -Command "(Get-Content ct.json | ConvertFrom-Json).id"') do set CTID=%%i

echo --- Create cost on order %OID2% --- >> sales_log.txt
curl -s -X POST %API%/sales/orders/%OID2%/costs -H "%AUTH%" -H "Content-Type: application/json" -d "{\"costTypeId\":%CTID%,\"ratePct\":2,\"vatPct\":10}" > cost.json
type cost.json >> sales_log.txt
echo. >> sales_log.txt
for /f "delims=" %%i in ('powershell -NoProfile -Command "(Get-Content cost.json | ConvertFrom-Json).id"') do set COST_ID=%%i

echo --- List costs --- >> sales_log.txt
curl -s %API%/sales/orders/%OID2%/costs -H "%AUTH%" >> sales_log.txt
echo. >> sales_log.txt

echo --- Approve cost --- >> sales_log.txt
curl -s -X POST %API%/sales/orders/%OID2%/costs/%COST_ID%/actions/approve -H "%AUTH%" -H "Content-Type: application/json" -d "{}" > cost_appr.json
type cost_appr.json >> sales_log.txt
echo. >> sales_log.txt
for /f "delims=" %%v in ('powershell -NoProfile -Command "(Get-Content cost_appr.json | ConvertFrom-Json).approved"') do set COST_APPROVED=%%v
echo cost.approved = %COST_APPROVED% >> sales_log.txt

echo --- Approve again (expect 409) --- >> sales_log.txt
curl -s -o nul -w "HTTP %%{http_code}" -X POST %API%/sales/orders/%OID2%/costs/%COST_ID%/actions/approve -H "%AUTH%" -H "Content-Type: application/json" -d "{}" >> sales_log.txt
echo. >> sales_log.txt

echo --- Unapprove cost --- >> sales_log.txt
curl -s -X POST %API%/sales/orders/%OID2%/costs/%COST_ID%/actions/unapprove -H "%AUTH%" -H "Content-Type: application/json" -d "{}" > cost_unappr.json
for /f "delims=" %%v in ('powershell -NoProfile -Command "(Get-Content cost_unappr.json | ConvertFrom-Json).approved"') do set COST_UNAPPROVED=%%v
echo cost.approved after unapprove = %COST_UNAPPROVED% >> sales_log.txt

echo --- Update cost --- >> sales_log.txt
curl -s -X PUT %API%/sales/orders/%OID2%/costs/%COST_ID% -H "%AUTH%" -H "Content-Type: application/json" -d "{\"ratePct\":3,\"note\":\"Updated\"}" >> sales_log.txt
echo. >> sales_log.txt

REM ============================================================
REM PHASE 5: PARTNER SALES COST + PAYMENT REQUEST AUTO-GENERATE
REM ============================================================

echo. >> sales_log.txt
echo ===== PHASE 5: PARTNER SALES COST + PAYMENT AUTO-GENERATE ===== >> sales_log.txt

echo --- Create Payment Method with due_days=30 --- >> sales_log.txt
curl -s -X POST %API%/md/payment-methods -H "%AUTH%" -H "Content-Type: application/json" -d "{\"code\":\"CK30_%RANDOM%\",\"name\":\"Chuyen khoan 30 ngay\",\"dueDays\":30}" > pm.json
type pm.json >> sales_log.txt
echo. >> sales_log.txt
for /f "delims=" %%i in ('powershell -NoProfile -Command "(Get-Content pm.json | ConvertFrom-Json).id"') do set PMID=%%i

echo --- Create Supplier Partner (payee for cost) --- >> sales_log.txt
curl -s -X POST %API%/md/partners -H "%AUTH%" -H "Content-Type: application/json" -d "{\"code\":\"NCC%RANDOM%\",\"shortName\":\"NCC test\",\"isSupplier\":true}" > sup.json
type sup.json >> sales_log.txt
echo. >> sales_log.txt
for /f "delims=" %%i in ('powershell -NoProfile -Command "(Get-Content sup.json | ConvertFrom-Json).id"') do set SUP_ID=%%i

echo --- Create Customer Partner with payment method --- >> sales_log.txt
curl -s -X POST %API%/md/partners -H "%AUTH%" -H "Content-Type: application/json" -d "{\"code\":\"KH%RANDOM%\",\"shortName\":\"KH test auto-cost\",\"isCustomer\":true,\"paymentMethodId\":%PMID%}" > kh.json
type kh.json >> sales_log.txt
echo. >> sales_log.txt
for /f "delims=" %%i in ('powershell -NoProfile -Command "(Get-Content kh.json | ConvertFrom-Json).id"') do set KH_ID=%%i

echo --- Create Partner Sales Cost (hoa mac dinh cho KH) --- >> sales_log.txt
curl -s -X POST %API%/md/partners/%KH_ID%/sales-costs -H "%AUTH%" -H "Content-Type: application/json" -d "{\"costTypeId\":%CTID%,\"payeeId\":%SUP_ID%,\"ratePct\":5,\"vatPct\":10}" > psc.json
type psc.json >> sales_log.txt
echo. >> sales_log.txt

echo --- Create order for KH (should auto-copy costs) --- >> sales_log.txt
curl -s -X POST %API%/sales/orders -H "%AUTH%" -H "Content-Type: application/json" -d "{\"partnerId\":%KH_ID%,\"paymentMethodId\":%PMID%,\"lines\":[{\"productId\":%PID%,\"quantity\":20,\"unitPrice\":10000}]}" > o3.json
type o3.json >> sales_log.txt
echo. >> sales_log.txt
for /f "delims=" %%i in ('powershell -NoProfile -Command "(Get-Content o3.json | ConvertFrom-Json).id"') do set OID3=%%i

echo --- Verify auto-copied costs --- >> sales_log.txt
curl -s %API%/sales/orders/%OID3%/costs -H "%AUTH%" > o3_costs.json
type o3_costs.json >> sales_log.txt
echo. >> sales_log.txt
for /f "delims=" %%c in ('powershell -NoProfile -Command "(Get-Content o3_costs.json | ConvertFrom-Json).Count"') do set COST_COUNT=%%c
echo auto-copied cost count = %COST_COUNT% >> sales_log.txt

echo --- Approve order (should auto-generate payment request) --- >> sales_log.txt
curl -s -X POST %API%/sales/orders/%OID3%/actions/request-approval -H "%AUTH%" -H "Content-Type: application/json" -d "{}" | powershell -NoProfile -Command "$j=[Console]::In.ReadToEnd()|ConvertFrom-Json; $j.docNo + ' -> ' + $j.status" >> sales_log.txt
curl -s -X POST %API%/sales/orders/%OID3%/actions/approve -H "%AUTH%" -H "Content-Type: application/json" -d "{}" > o3_appr.json
type o3_appr.json >> sales_log.txt
echo. >> sales_log.txt

echo --- Verify auto-generated payment request --- >> sales_log.txt
curl -s %API%/sales/orders/%OID3%/payment-requests -H "%AUTH%" > o3_pr.json
type o3_pr.json >> sales_log.txt
echo. >> sales_log.txt
powershell -NoProfile -Command "$pr = Get-Content o3_pr.json | ConvertFrom-Json; if ($pr.Count -gt 0) { 'PAYMENT REQUEST OK: dueDate=' + $pr[0].dueDate + ' amount=' + $pr[0].amount + ' autoGenerated=' + $pr[0].autoGenerated } else { 'NO PAYMENT REQUEST FOUND' }" >> sales_log.txt

REM ============================================================
REM PHASE 6: GIAM GIA HANG BAN — Sales Allowance
REM ============================================================

echo. >> sales_log.txt
echo ===== PHASE 6: SALES ALLOWANCE ===== >> sales_log.txt

echo --- Complete order %OID3% for allowance test --- >> sales_log.txt
curl -s -X POST %API%/sales/orders/%OID3%/actions/complete -H "%AUTH%" -H "Content-Type: application/json" -d "{}" | powershell -NoProfile -Command "$j=[Console]::In.ReadToEnd()|ConvertFrom-Json; $j.docNo + ' -> ' + $j.status" >> sales_log.txt

echo --- Create Sales Allowance (CREDIT_NOTE) --- >> sales_log.txt
curl -s -X POST %API%/sales/allowances -H "%AUTH%" -H "Content-Type: application/json" -d "{\"orderId\":%OID3%,\"allowForm\":\"CREDIT_NOTE\",\"note\":\"Giam gia test\",\"lines\":[{\"productId\":%PID%,\"quantity\":2,\"reducedPrice\":9000}]}" > sa.json
type sa.json >> sales_log.txt
echo. >> sales_log.txt
for /f "delims=" %%i in ('powershell -NoProfile -Command "(Get-Content sa.json | ConvertFrom-Json).id"') do set SA_ID=%%i

echo --- Create allowance from DRAFT order (expect 409) --- >> sales_log.txt
curl -s -o nul -w "HTTP %%{http_code}" -X POST %API%/sales/allowances -H "%AUTH%" -H "Content-Type: application/json" -d "{\"orderId\":%OID2%,\"allowForm\":\"CREDIT_NOTE\",\"lines\":[{\"productId\":%PID%,\"quantity\":1,\"reducedPrice\":5000}]}" >> sales_log.txt
echo. >> sales_log.txt

echo --- List allowances --- >> sales_log.txt
curl -s "%API%/sales/allowances?orderId=%OID3%" -H "%AUTH%" >> sales_log.txt
echo. >> sales_log.txt

echo --- Add line to allowance --- >> sales_log.txt
curl -s -X POST %API%/sales/allowances/%SA_ID%/lines -H "%AUTH%" -H "Content-Type: application/json" -d "{\"productId\":%GID%,\"quantity\":1,\"reducedPrice\":4500}" >> sales_log.txt
echo. >> sales_log.txt

echo --- Approve allowance --- >> sales_log.txt
curl -s -X POST %API%/sales/allowances/%SA_ID%/actions/approve -H "%AUTH%" -H "Content-Type: application/json" -d "{}" > sa_appr.json
type sa_appr.json >> sales_log.txt
echo. >> sales_log.txt
for /f "delims=" %%v in ('powershell -NoProfile -Command "(Get-Content sa_appr.json | ConvertFrom-Json).status"') do set SA_STATUS=%%v
echo allowance.status after approve = %SA_STATUS% >> sales_log.txt

echo --- Approve again (expect 409) --- >> sales_log.txt
curl -s -o nul -w "HTTP %%{http_code}" -X POST %API%/sales/allowances/%SA_ID%/actions/approve -H "%AUTH%" -H "Content-Type: application/json" -d "{}" >> sales_log.txt
echo. >> sales_log.txt

echo --- Create CASH_REFUND allowance --- >> sales_log.txt
curl -s -X POST %API%/sales/allowances -H "%AUTH%" -H "Content-Type: application/json" -d "{\"orderId\":%OID3%,\"allowForm\":\"CASH_REFUND\",\"lines\":[{\"productId\":%PID%,\"quantity\":1,\"reducedPrice\":8000}]}" > sa2.json
for /f "delims=" %%i in ('powershell -NoProfile -Command "(Get-Content sa2.json | ConvertFrom-Json).id"') do set SA2_ID=%%i
echo CASH_REFUND allowance id = %SA2_ID% >> sales_log.txt

REM ============================================================
REM PHASE 7: PAYMENT ACTUALS
REM ============================================================

echo. >> sales_log.txt
echo ===== PHASE 7: PAYMENT ACTUALS ===== >> sales_log.txt

echo --- Create payment actual --- >> sales_log.txt
curl -s -X POST %API%/sales/orders/%OID3%/payment-actuals -H "%AUTH%" -H "Content-Type: application/json" -d "{\"payDate\":\"%TODAY%\",\"amount\":50000,\"methodId\":%PMID%,\"note\":\"Tra lan 1\"}" > pa.json
type pa.json >> sales_log.txt
echo. >> sales_log.txt
for /f "delims=" %%i in ('powershell -NoProfile -Command "(Get-Content pa.json | ConvertFrom-Json).id"') do set PA_ID=%%i

echo --- List payment actuals --- >> sales_log.txt
curl -s %API%/sales/orders/%OID3%/payment-actuals -H "%AUTH%" >> sales_log.txt
echo. >> sales_log.txt

echo --- Update payment actual --- >> sales_log.txt
curl -s -X PUT %API%/sales/orders/%OID3%/payment-actuals/%PA_ID% -H "%AUTH%" -H "Content-Type: application/json" -d "{\"amount\":60000,\"note\":\"Sua so tien\"}" >> sales_log.txt
echo. >> sales_log.txt

echo --- Manual payment request --- >> sales_log.txt
curl -s -X POST %API%/sales/orders/%OID3%/payment-requests -H "%AUTH%" -H "Content-Type: application/json" -d "{\"dueDate\":\"%TODAY%\",\"amount\":100000,\"status\":\"PENDING\"}" > pr_manual.json
for /f "delims=" %%i in ('powershell -NoProfile -Command "(Get-Content pr_manual.json | ConvertFrom-Json).id"') do set PR_MANUAL_ID=%%i
echo manual payment request id = %PR_MANUAL_ID% >> sales_log.txt

echo --- Delete manual payment request --- >> sales_log.txt
curl -s -o nul -w "HTTP %%{http_code}" -X DELETE %API%/sales/orders/%OID3%/payment-requests/%PR_MANUAL_ID% -H "%AUTH%" >> sales_log.txt
echo. >> sales_log.txt

REM ============================================================
REM SUMMARY
REM ============================================================

echo. >> sales_log.txt
echo ===== ALL TESTS COMPLETED ===== >> sales_log.txt
echo ===== New endpoints tested: ===== >> sales_log.txt
echo   GET/POST /api/v1/sales/price-lists, GET/PUT/DELETE /{id}, POST/DELETE /{id}/items >> sales_log.txt
echo   GET/POST /api/v1/sales/promotions, GET/PUT/DELETE /{id}, POST/DELETE /{id}/discount-items, /{id}/gift-items >> sales_log.txt
echo   PUT /api/v1/sales/orders/{id}/promotions >> sales_log.txt
echo   GET/POST /api/v1/sales/orders/{id}/costs, PUT/DELETE /{costId}, POST /{costId}/actions/approve,unapprove >> sales_log.txt
echo   GET/POST /api/v1/sales/orders/{id}/payment-requests, PUT/DELETE /{reqId} >> sales_log.txt
echo   GET/POST /api/v1/sales/orders/{id}/payment-actuals, PUT/DELETE /{actualId} >> sales_log.txt
echo   GET/POST /api/v1/sales/allowances, GET/PUT /{id}, POST/DELETE /{id}/lines, POST /{id}/actions/approve >> sales_log.txt
echo   GET/POST /api/v1/md/partners/{id}/sales-costs >> sales_log.txt

type sales_log.txt
echo.
echo ===== DONE — check sales_log.txt for results =====

del login.json p.json g.json q.json co.json pl.json o2.json o2promo.json promo.json ct.json cost.json cost_appr.json cost_unappr.json pm.json sup.json kh.json psc.json o3.json o3_costs.json o3_appr.json o3_pr.json sa.json sa_appr.json sa2.json pa.json pr_manual.json 2>nul