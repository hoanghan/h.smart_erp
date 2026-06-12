@echo off
setlocal enabledelayedexpansion
cd /d C:\Project\Personal\ERP\sourcecode\erp-backend
set API=http://localhost:5000/api/v1

echo ===== STOP OLD SERVER ===== > sales_v3_log.txt
taskkill /IM Erp.Api.exe /F >> sales_v3_log.txt 2>&1
timeout /t 2 /nobreak > nul

echo ===== BUILD ===== >> sales_v3_log.txt
dotnet build src\Erp.Api\Erp.Api.csproj >> sales_v3_log.txt 2>&1
if errorlevel 1 (
  echo ===== BUILD FAILED ===== >> sales_v3_log.txt
  type sales_v3_log.txt
  exit /b 1
)

echo ===== START API ===== >> sales_v3_log.txt
start "erp-api" cmd /c "dotnet run --project src/Erp.Api --no-build --urls http://localhost:5000 > api_v3_log.txt 2>&1"

echo --- Wait for API ready --- >> sales_v3_log.txt
set READY=
for /l %%n in (1,1,24) do (
  if not defined READY (
    curl -s -o nul -w "%%{http_code}" http://localhost:5000/health > health.txt
    set /p HCODE=<health.txt
    if "!HCODE!"=="200" (
      set READY=1
    ) else (
      timeout /t 5 /nobreak > nul
    )
  )
)

curl -s -X POST %API%/auth/login -H "Content-Type: application/json" -d "{\"username\":\"admin\",\"password\":\"admin123\"}" > login.json
for /f "delims=" %%t in ('powershell -NoProfile -Command "(Get-Content login.json | ConvertFrom-Json).accessToken"') do set TOKEN=%%t
set AUTH=Authorization: Bearer %TOKEN%

for /f "delims=" %%d in ('powershell -NoProfile -Command "Get-Date -Format yyyy-MM-dd"') do set TODAY=%%d

REM ============================================================
REM PHASE 1: MASTER DATA
REM ============================================================

echo ===== PHASE 1: MASTER DATA ===== >> sales_v3_log.txt

echo --- Create main product --- >> sales_v3_log.txt
curl -s -X POST %API%/md/products -H "%AUTH%" -H "Content-Type: application/json" -d "{\"code\":\"SPV3_%RANDOM%\",\"name\":\"San pham test v3\",\"uomId\":1}" > p.json
type p.json >> sales_v3_log.txt
echo. >> sales_v3_log.txt
for /f "delims=" %%i in ('powershell -NoProfile -Command "(Get-Content p.json | ConvertFrom-Json).id"') do set PID=%%i

echo --- Create gift product --- >> sales_v3_log.txt
curl -s -X POST %API%/md/products -H "%AUTH%" -H "Content-Type: application/json" -d "{\"code\":\"GIFTV3_%RANDOM%\",\"name\":\"Hang tang test v3\",\"uomId\":1}" > g.json
type g.json >> sales_v3_log.txt
echo. >> sales_v3_log.txt
for /f "delims=" %%i in ('powershell -NoProfile -Command "(Get-Content g.json | ConvertFrom-Json).id"') do set GID=%%i

echo --- Create customer partner --- >> sales_v3_log.txt
curl -s -X POST %API%/md/partners -H "%AUTH%" -H "Content-Type: application/json" -d "{\"code\":\"KHV3_%RANDOM%\",\"shortName\":\"KH test v3\",\"isCustomer\":true}" > kh.json
type kh.json >> sales_v3_log.txt
echo. >> sales_v3_log.txt
for /f "delims=" %%i in ('powershell -NoProfile -Command "(Get-Content kh.json | ConvertFrom-Json).id"') do set KHID=%%i

echo --- Create price list (gia goc 100000) --- >> sales_v3_log.txt
curl -s -X POST %API%/sales/price-lists -H "%AUTH%" -H "Content-Type: application/json" -d "{\"code\":\"PLV3_%RANDOM%\",\"name\":\"Bang gia v3\",\"validFrom\":\"%TODAY%\",\"items\":[{\"productId\":%PID%,\"price\":100000}]}" > pl.json
type pl.json >> sales_v3_log.txt
echo. >> sales_v3_log.txt

echo --- Create lost reason 1 --- >> sales_v3_log.txt
curl -s -X POST %API%/md/lost-reasons -H "%AUTH%" -H "Content-Type: application/json" -d "{\"code\":\"LR1_%RANDOM%\",\"name\":\"Gia cao hon doi thu\"}" > lr1.json
type lr1.json >> sales_v3_log.txt
echo. >> sales_v3_log.txt
for /f "delims=" %%i in ('powershell -NoProfile -Command "(Get-Content lr1.json | ConvertFrom-Json).id"') do set LR1=%%i

echo --- Create lost reason 2 --- >> sales_v3_log.txt
curl -s -X POST %API%/md/lost-reasons -H "%AUTH%" -H "Content-Type: application/json" -d "{\"code\":\"LR2_%RANDOM%\",\"name\":\"Giao hang cham\"}" > lr2.json
type lr2.json >> sales_v3_log.txt
echo. >> sales_v3_log.txt
for /f "delims=" %%i in ('powershell -NoProfile -Command "(Get-Content lr2.json | ConvertFrom-Json).id"') do set LR2=%%i

REM ============================================================
REM PHASE 2: PROMOTIONAL SCHEME + PRICING RESOLVE
REM ============================================================

echo. >> sales_v3_log.txt
echo ===== PHASE 2: PROMOTIONAL SCHEME + PRICING RESOLVE ===== >> sales_v3_log.txt

echo --- Create scheme: Mua 10 giam 5%%, mua 50 giam 10%%, mua 100 tang 5 --- >> sales_v3_log.txt
curl -s -X POST %API%/sales/promotional-schemes -H "%AUTH%" -H "Content-Type: application/json" -d "{\"code\":\"SCHV3_%RANDOM%\",\"name\":\"Mua 10 giam 5%%, mua 50 giam 10%%, mua 100 tang 5\",\"applyOn\":\"ITEM\",\"items\":[{\"productId\":%PID%}],\"priceSlabs\":[{\"productId\":null,\"minQty\":10,\"maxQty\":null,\"discountPct\":5,\"rate\":null},{\"productId\":null,\"minQty\":50,\"maxQty\":null,\"discountPct\":10,\"rate\":null}],\"productSlabs\":[{\"productId\":null,\"minQty\":100,\"maxQty\":null,\"freeProductId\":%GID%,\"freeQty\":5,\"freeRate\":0}]}" > scheme.json
type scheme.json >> sales_v3_log.txt
echo. >> sales_v3_log.txt
for /f "delims=" %%i in ('powershell -NoProfile -Command "(Get-Content scheme.json | ConvertFrom-Json).id"') do set SCHEME_ID=%%i

echo --- Resolve qty=10 (expect discountPct=5, freeItems=0) --- >> sales_v3_log.txt
curl -s "%API%/sales/pricing/resolve?partnerId=%KHID%&productId=%PID%&qty=10" -H "%AUTH%" > res10.json
type res10.json >> sales_v3_log.txt
echo. >> sales_v3_log.txt
powershell -NoProfile -Command "$r = Get-Content res10.json | ConvertFrom-Json; 'qty10: rate=' + $r.rate + ' discountPct=' + $r.discountPct + ' freeItems.Count=' + $r.freeItems.Count" >> sales_v3_log.txt

echo --- Resolve qty=50 (expect discountPct=10, freeItems=0) --- >> sales_v3_log.txt
curl -s "%API%/sales/pricing/resolve?partnerId=%KHID%&productId=%PID%&qty=50" -H "%AUTH%" > res50.json
type res50.json >> sales_v3_log.txt
echo. >> sales_v3_log.txt
powershell -NoProfile -Command "$r = Get-Content res50.json | ConvertFrom-Json; 'qty50: rate=' + $r.rate + ' discountPct=' + $r.discountPct + ' freeItems.Count=' + $r.freeItems.Count" >> sales_v3_log.txt

echo --- Resolve qty=100 (expect discountPct=10, freeItems=[GID qty=5]) --- >> sales_v3_log.txt
curl -s "%API%/sales/pricing/resolve?partnerId=%KHID%&productId=%PID%&qty=100" -H "%AUTH%" > res100.json
type res100.json >> sales_v3_log.txt
echo. >> sales_v3_log.txt
powershell -NoProfile -Command "$r = Get-Content res100.json | ConvertFrom-Json; 'qty100: rate=' + $r.rate + ' discountPct=' + $r.discountPct + ' freeItems.Count=' + $r.freeItems.Count + ' free0.productId=' + $r.freeItems[0].productId + ' free0.qty=' + $r.freeItems[0].qty" >> sales_v3_log.txt

REM ============================================================
REM PHASE 3: QUOTATION DRAFT -> OPEN -> PARTIAL MAKE-SALES-ORDER -> ORDERED
REM ============================================================

echo. >> sales_v3_log.txt
echo ===== PHASE 3: QUOTATION -> OPEN -> MAKE-SALES-ORDER ===== >> sales_v3_log.txt

echo --- Create quotation (2 lines, gia/chiet khau tu dong ap theo scheme) --- >> sales_v3_log.txt
curl -s -X POST %API%/sales/quotations -H "%AUTH%" -H "Content-Type: application/json" -d "{\"partnerId\":%KHID%,\"lines\":[{\"productId\":%PID%,\"quantity\":10},{\"productId\":%PID%,\"quantity\":100}]}" > q.json
type q.json >> sales_v3_log.txt
echo. >> sales_v3_log.txt
for /f "delims=" %%i in ('powershell -NoProfile -Command "(Get-Content q.json | ConvertFrom-Json).id"') do set QID=%%i
for /f "delims=" %%i in ('powershell -NoProfile -Command "(Get-Content q.json | ConvertFrom-Json).lines[0].id"') do set LINE1_ID=%%i
for /f "delims=" %%i in ('powershell -NoProfile -Command "(Get-Content q.json | ConvertFrom-Json).lines[1].id"') do set LINE2_ID=%%i

echo --- Verify auto-priced lines (line1 discountPct=5, line2 discountPct=10) --- >> sales_v3_log.txt
powershell -NoProfile -Command "$q = Get-Content q.json | ConvertFrom-Json; 'line1: rate=' + $q.lines[0].rate + ' discountPct=' + $q.lines[0].discountPct + ' / line2: rate=' + $q.lines[1].rate + ' discountPct=' + $q.lines[1].discountPct" >> sales_v3_log.txt

echo --- Submit DRAFT -> OPEN --- >> sales_v3_log.txt
curl -s -X POST %API%/sales/quotations/%QID%/actions/submit -H "%AUTH%" -H "Content-Type: application/json" -d "{}" | powershell -NoProfile -Command "$j=[Console]::In.ReadToEnd()|ConvertFrom-Json; $j.docNo + ' -> ' + $j.status" >> sales_v3_log.txt

echo --- Make-sales-order PARTIAL (line1 qty=10) --- >> sales_v3_log.txt
curl -s -X POST %API%/sales/quotations/%QID%/actions/make-sales-order -H "%AUTH%" -H "Content-Type: application/json" -d "{\"lines\":[{\"lineId\":%LINE1_ID%,\"qty\":10}]}" > mso1.json
type mso1.json >> sales_v3_log.txt
echo. >> sales_v3_log.txt
for /f "delims=" %%i in ('powershell -NoProfile -Command "(Get-Content mso1.json | ConvertFrom-Json).orderId"') do set OID1=%%i
for /f "delims=" %%v in ('powershell -NoProfile -Command "(Get-Content mso1.json | ConvertFrom-Json).quotationStatus"') do set QSTATUS1=%%v
echo quotationStatus after partial make-sales-order = %QSTATUS1% (expect OPEN) >> sales_v3_log.txt

echo --- Verify quotation van OPEN, line1.orderedQty=10, line2.orderedQty=0 --- >> sales_v3_log.txt
curl -s %API%/sales/quotations/%QID% -H "%AUTH%" > qafter1.json
type qafter1.json >> sales_v3_log.txt
echo. >> sales_v3_log.txt
powershell -NoProfile -Command "$q = Get-Content qafter1.json | ConvertFrom-Json; 'status=' + $q.status + ' line1.orderedQty=' + $q.lines[0].orderedQty + ' line2.orderedQty=' + $q.lines[1].orderedQty" >> sales_v3_log.txt

echo --- Verify order1 line (gia ban = 100000 * (1-5%%) = 95000, khong co hang tang) --- >> sales_v3_log.txt
curl -s %API%/sales/orders/%OID1% -H "%AUTH%" > order1.json
type order1.json >> sales_v3_log.txt
echo. >> sales_v3_log.txt
powershell -NoProfile -Command "$o = Get-Content order1.json | ConvertFrom-Json; 'order1: lineCount=' + $o.lines.Count + ' productId=' + $o.lines[0].productId + ' qty=' + $o.lines[0].quantity + ' unitPrice=' + $o.lines[0].unitPrice" >> sales_v3_log.txt

echo --- Make-sales-order PHAN CON LAI (line2 qty=100) --- >> sales_v3_log.txt
curl -s -X POST %API%/sales/quotations/%QID%/actions/make-sales-order -H "%AUTH%" -H "Content-Type: application/json" -d "{\"lines\":[{\"lineId\":%LINE2_ID%,\"qty\":100}]}" > mso2.json
type mso2.json >> sales_v3_log.txt
echo. >> sales_v3_log.txt
for /f "delims=" %%i in ('powershell -NoProfile -Command "(Get-Content mso2.json | ConvertFrom-Json).orderId"') do set OID2=%%i
for /f "delims=" %%v in ('powershell -NoProfile -Command "(Get-Content mso2.json | ConvertFrom-Json).quotationStatus"') do set QSTATUS2=%%v
echo quotationStatus after full make-sales-order = %QSTATUS2% (expect ORDERED) >> sales_v3_log.txt

echo --- Verify order2: dong chinh gia 90000 + dong hang tang (isGift=true, productId=GID, qty=5, unitPrice=0) --- >> sales_v3_log.txt
curl -s %API%/sales/orders/%OID2% -H "%AUTH%" > order2.json
type order2.json >> sales_v3_log.txt
echo. >> sales_v3_log.txt
powershell -NoProfile -Command "$o = Get-Content order2.json | ConvertFrom-Json; $main = $o.lines | Where-Object { $_.isGift -eq $false }; 'order2 main: productId=' + $main.productId + ' qty=' + $main.quantity + ' unitPrice=' + $main.unitPrice + ' lineCount=' + $o.lines.Count" >> sales_v3_log.txt
powershell -NoProfile -Command "$o = Get-Content order2.json | ConvertFrom-Json; $gift = $o.lines | Where-Object { $_.isGift -eq $true }; if ($gift) { 'GIFT OK: productId=' + $gift.productId + ' qty=' + $gift.quantity + ' price=' + $gift.unitPrice } else { 'GIFT NOT FOUND' }" >> sales_v3_log.txt

REM ============================================================
REM PHASE 4: SET-AS-LOST
REM ============================================================

echo. >> sales_v3_log.txt
echo ===== PHASE 4: SET-AS-LOST ===== >> sales_v3_log.txt

echo --- Create quotation 2 --- >> sales_v3_log.txt
curl -s -X POST %API%/sales/quotations -H "%AUTH%" -H "Content-Type: application/json" -d "{\"partnerId\":%KHID%,\"lines\":[{\"productId\":%PID%,\"quantity\":1}]}" > q2.json
type q2.json >> sales_v3_log.txt
echo. >> sales_v3_log.txt
for /f "delims=" %%i in ('powershell -NoProfile -Command "(Get-Content q2.json | ConvertFrom-Json).id"') do set QID2=%%i

echo --- Submit quotation 2 DRAFT -> OPEN --- >> sales_v3_log.txt
curl -s -X POST %API%/sales/quotations/%QID2%/actions/submit -H "%AUTH%" -H "Content-Type: application/json" -d "{}" | powershell -NoProfile -Command "$j=[Console]::In.ReadToEnd()|ConvertFrom-Json; $j.docNo + ' -> ' + $j.status" >> sales_v3_log.txt

echo --- Set-as-lost voi 2 ly do --- >> sales_v3_log.txt
curl -s -X POST %API%/sales/quotations/%QID2%/actions/set-as-lost -H "%AUTH%" -H "Content-Type: application/json" -d "{\"lostReasonIds\":[%LR1%,%LR2%],\"competitor\":\"Doi thu ABC\",\"detail\":\"Gia cao hon doi thu\"}" > lost.json
type lost.json >> sales_v3_log.txt
echo. >> sales_v3_log.txt
powershell -NoProfile -Command "$q = Get-Content lost.json | ConvertFrom-Json; 'status=' + $q.status + ' lostReasonIds=' + ($q.lostReasonIds -join ',') + ' competitor=' + $q.competitor" >> sales_v3_log.txt

REM ============================================================
REM PHASE 5: COUPON CODE HET HAN -> 409
REM ============================================================

echo. >> sales_v3_log.txt
echo ===== PHASE 5: COUPON HET HAN -> 409 ===== >> sales_v3_log.txt

echo --- Lay pricing rule cua scheme --- >> sales_v3_log.txt
curl -s "%API%/sales/pricing/rules?schemeId=%SCHEME_ID%" -H "%AUTH%" > rules.json
type rules.json >> sales_v3_log.txt
echo. >> sales_v3_log.txt
for /f "delims=" %%i in ('powershell -NoProfile -Command "(Get-Content rules.json | ConvertFrom-Json)[0].id"') do set RULE_ID=%%i

echo --- Tao coupon da het han (validTo nam 2020) --- >> sales_v3_log.txt
curl -s -X POST %API%/sales/coupon-codes -H "%AUTH%" -H "Content-Type: application/json" -d "{\"code\":\"EXPV3_%RANDOM%\",\"pricingRuleId\":%RULE_ID%,\"validFrom\":\"2020-01-01\",\"validTo\":\"2020-01-02\"}" > coupon.json
type coupon.json >> sales_v3_log.txt
echo. >> sales_v3_log.txt
for /f "delims=" %%c in ('powershell -NoProfile -Command "(Get-Content coupon.json | ConvertFrom-Json).code"') do set COUPON_CODE=%%c

echo --- Resolve voi coupon het han (expect HTTP 409 COUPON_INVALID) --- >> sales_v3_log.txt
curl -s -o coupon_err.json -w "HTTP %%{http_code}\n" "%API%/sales/pricing/resolve?productId=%PID%&qty=10&couponCode=%COUPON_CODE%" -H "%AUTH%" >> sales_v3_log.txt
type coupon_err.json >> sales_v3_log.txt
echo. >> sales_v3_log.txt

REM ============================================================
REM PHASE 6: CANCEL + AMEND
REM ============================================================

echo. >> sales_v3_log.txt
echo ===== PHASE 6: CANCEL + AMEND ===== >> sales_v3_log.txt

echo --- Create quotation 3 --- >> sales_v3_log.txt
curl -s -X POST %API%/sales/quotations -H "%AUTH%" -H "Content-Type: application/json" -d "{\"partnerId\":%KHID%,\"lines\":[{\"productId\":%PID%,\"quantity\":1}]}" > q3.json
type q3.json >> sales_v3_log.txt
echo. >> sales_v3_log.txt
for /f "delims=" %%i in ('powershell -NoProfile -Command "(Get-Content q3.json | ConvertFrom-Json).id"') do set QID3=%%i
for /f "delims=" %%i in ('powershell -NoProfile -Command "(Get-Content q3.json | ConvertFrom-Json).docNo"') do set QDOCNO3=%%i

echo --- Cancel khong ly do (expect HTTP 409, RequireReason) --- >> sales_v3_log.txt
curl -s -o nul -w "HTTP %%{http_code}" -X POST %API%/sales/quotations/%QID3%/actions/cancel -H "%AUTH%" -H "Content-Type: application/json" -d "{}" >> sales_v3_log.txt
echo. >> sales_v3_log.txt

echo --- Cancel co ly do -> CANCELLED --- >> sales_v3_log.txt
curl -s -X POST %API%/sales/quotations/%QID3%/actions/cancel -H "%AUTH%" -H "Content-Type: application/json" -d "{\"reason\":\"Khach doi y\"}" | powershell -NoProfile -Command "$j=[Console]::In.ReadToEnd()|ConvertFrom-Json; $j.docNo + ' -> ' + $j.status" >> sales_v3_log.txt

echo --- Amend CANCELLED -> ban sao DRAFT moi (doc_no hau to -1) --- >> sales_v3_log.txt
curl -s -X POST %API%/sales/quotations/%QID3%/actions/amend -H "%AUTH%" -H "Content-Type: application/json" -d "{}" > amend.json
type amend.json >> sales_v3_log.txt
echo. >> sales_v3_log.txt
powershell -NoProfile -Command "$a = Get-Content amend.json | ConvertFrom-Json; 'original=%QDOCNO3%  amended docNo=' + $a.docNo + ' status=' + $a.status" >> sales_v3_log.txt

REM ============================================================
REM SUMMARY
REM ============================================================

echo. >> sales_v3_log.txt
echo ===== ALL TESTS COMPLETED ===== >> sales_v3_log.txt
echo ===== New endpoints tested: ===== >> sales_v3_log.txt
echo   GET/POST /api/v1/sales/promotional-schemes ; GET /api/v1/sales/pricing/resolve ; GET /api/v1/sales/pricing/rules >> sales_v3_log.txt
echo   GET/POST /api/v1/md/lost-reasons >> sales_v3_log.txt
echo   POST /api/v1/sales/quotations/{id}/actions/submit,make-sales-order,set-as-lost,cancel,amend >> sales_v3_log.txt
echo   POST /api/v1/sales/coupon-codes >> sales_v3_log.txt

type sales_v3_log.txt
echo.
echo ===== DONE — check sales_v3_log.txt for results =====

del login.json p.json g.json kh.json pl.json lr1.json lr2.json scheme.json res10.json res50.json res100.json q.json mso1.json qafter1.json order1.json mso2.json order2.json q2.json lost.json rules.json coupon.json coupon_err.json q3.json amend.json 2>nul
