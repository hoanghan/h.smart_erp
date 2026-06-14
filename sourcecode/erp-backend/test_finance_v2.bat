@echo off
setlocal enabledelayedexpansion
cd /d C:\Project\Personal\ERP\sourcecode\erp-backend
set API=http://localhost:5000/api/v1

echo ===== STOP OLD SERVER ===== > finance_v2_log.txt
taskkill /IM Erp.Api.exe /F >> finance_v2_log.txt 2>&1
timeout /t 2 /nobreak > nul

echo ===== BUILD ===== >> finance_v2_log.txt
dotnet build src\Erp.Api\Erp.Api.csproj >> finance_v2_log.txt 2>&1
if errorlevel 1 (
  echo ===== BUILD FAILED ===== >> finance_v2_log.txt
  type finance_v2_log.txt
  exit /b 1
)

echo ===== START API ===== >> finance_v2_log.txt
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

REM Reference account IDs: 111 Cash=2, 131 AR=5, 511 Revenue=27, 642 CP QLDN=38
REM Cost centers: CC=1 (group), CC-VP=2

REM ============================================================
REM PHASE 1: CUSTOMER PARTNER
REM ============================================================
echo. >> finance_v2_log.txt
echo ===== PHASE 1: CUSTOMER PARTNER ===== >> finance_v2_log.txt
curl -s -X POST %API%/md/partners -H "%AUTH%" -H "Content-Type: application/json" -d "{\"code\":\"KHFV2%RANDOM%\",\"shortName\":\"KH Finance V2\",\"isCustomer\":true}" > kh.json
type kh.json >> finance_v2_log.txt & echo. >> finance_v2_log.txt
for /f "delims=" %%i in ('powershell -NoProfile -Command "(Get-Content kh.json | ConvertFrom-Json).id"') do set KH_ID=%%i
echo KH_ID = %KH_ID% >> finance_v2_log.txt

REM ============================================================
REM PHASE 2: INVOICE 1 - HOA_DON_BAN 10,000,000 + POST
REM ============================================================
echo. >> finance_v2_log.txt
echo ===== PHASE 2: INVOICE1 10,000,000 + POST (expect outstanding=10000000, UNPAID) ===== >> finance_v2_log.txt
curl -s -X POST %API%/finance/vouchers -H "%AUTH%" -H "Content-Type: application/json" -d "{\"voucherType\":\"HOA_DON_BAN\",\"docDate\":\"%TODAY%\",\"partnerId\":%KH_ID%,\"description\":\"Hoa don ban FV2-1\",\"lines\":[{\"description\":\"Ban hang\",\"amount\":10000000,\"drAccountId\":5,\"crAccountId\":27,\"drObjectType\":\"PARTNER\",\"drObjectId\":%KH_ID%}]}" > inv1.json
type inv1.json >> finance_v2_log.txt & echo. >> finance_v2_log.txt
for /f "delims=" %%i in ('powershell -NoProfile -Command "(Get-Content inv1.json | ConvertFrom-Json).id"') do set INV1_ID=%%i
echo INV1_ID = %INV1_ID% >> finance_v2_log.txt

curl -s -X POST %API%/finance/vouchers/%INV1_ID%/post -H "%AUTH%" -H "Content-Type: application/json" -d "{}" > inv1_post.json
type inv1_post.json >> finance_v2_log.txt & echo. >> finance_v2_log.txt
for /f "delims=" %%v in ('powershell -NoProfile -Command "(Get-Content inv1_post.json | ConvertFrom-Json).outstandingAmount"') do set INV1_OUT0=%%v
for /f "delims=" %%v in ('powershell -NoProfile -Command "(Get-Content inv1_post.json | ConvertFrom-Json).paymentStatus"') do set INV1_PS0=%%v
echo INV1_OUTSTANDING_AFTER_POST = %INV1_OUT0% (expect 10000000) >> finance_v2_log.txt
echo INV1_PAYMENT_STATUS_AFTER_POST = %INV1_PS0% (expect UNPAID) >> finance_v2_log.txt

REM ============================================================
REM PHASE 3: PAYMENT 1 - PHIEU_THU 6,000,000 (RECEIVE) + ALLOCATE
REM ============================================================
echo. >> finance_v2_log.txt
echo ===== PHASE 3: PAYMENT1 6,000,000 + ALLOCATE (expect INV1 outstanding=4000000 PARTLY_PAID) ===== >> finance_v2_log.txt
curl -s -X POST %API%/finance/vouchers -H "%AUTH%" -H "Content-Type: application/json" -d "{\"voucherType\":\"PHIEU_THU\",\"docDate\":\"%TODAY%\",\"partnerId\":%KH_ID%,\"fundId\":2,\"paymentType\":\"RECEIVE\",\"description\":\"Thu tien KH lan 1\",\"lines\":[{\"description\":\"Thu tien\",\"amount\":6000000,\"drAccountId\":2,\"crAccountId\":5,\"crObjectType\":\"PARTNER\",\"crObjectId\":%KH_ID%}]}" > pay1.json
type pay1.json >> finance_v2_log.txt & echo. >> finance_v2_log.txt
for /f "delims=" %%i in ('powershell -NoProfile -Command "(Get-Content pay1.json | ConvertFrom-Json).id"') do set PAY1_ID=%%i
echo PAY1_ID = %PAY1_ID% >> finance_v2_log.txt

curl -s -X POST %API%/finance/vouchers/%PAY1_ID%/post -H "%AUTH%" -H "Content-Type: application/json" -d "{}" > pay1_post.json
type pay1_post.json >> finance_v2_log.txt & echo. >> finance_v2_log.txt
for /f "delims=" %%v in ('powershell -NoProfile -Command "(Get-Content pay1_post.json | ConvertFrom-Json).paidAmount"') do set PAY1_PAID0=%%v
for /f "delims=" %%v in ('powershell -NoProfile -Command "(Get-Content pay1_post.json | ConvertFrom-Json).unallocatedAmount"') do set PAY1_UNALLOC0=%%v
echo PAY1_PAID_AFTER_POST = %PAY1_PAID0% (expect 6000000) >> finance_v2_log.txt
echo PAY1_UNALLOCATED_AFTER_POST = %PAY1_UNALLOC0% (expect 6000000) >> finance_v2_log.txt

curl -s -X POST %API%/finance/payments/%PAY1_ID%/allocations -H "%AUTH%" -H "Content-Type: application/json" -d "{\"allocations\":[{\"invoiceVoucherId\":%INV1_ID%,\"amount\":6000000}]}" > alloc1.json
type alloc1.json >> finance_v2_log.txt & echo. >> finance_v2_log.txt

curl -s %API%/finance/vouchers/%INV1_ID% -H "%AUTH%" > inv1_after_pay1.json
for /f "delims=" %%v in ('powershell -NoProfile -Command "(Get-Content inv1_after_pay1.json | ConvertFrom-Json).outstandingAmount"') do set INV1_OUT1=%%v
for /f "delims=" %%v in ('powershell -NoProfile -Command "(Get-Content inv1_after_pay1.json | ConvertFrom-Json).paymentStatus"') do set INV1_PS1=%%v
echo INV1_OUTSTANDING_AFTER_PAY1 = %INV1_OUT1% (expect 4000000) >> finance_v2_log.txt
echo INV1_PAYMENT_STATUS_AFTER_PAY1 = %INV1_PS1% (expect PARTLY_PAID) >> finance_v2_log.txt

curl -s %API%/finance/vouchers/%PAY1_ID% -H "%AUTH%" > pay1_after_alloc.json
for /f "delims=" %%v in ('powershell -NoProfile -Command "(Get-Content pay1_after_alloc.json | ConvertFrom-Json).unallocatedAmount"') do set PAY1_UNALLOC1=%%v
echo PAY1_UNALLOCATED_AFTER_ALLOC = %PAY1_UNALLOC1% (expect 0) >> finance_v2_log.txt

REM ============================================================
REM PHASE 4: PAYMENT 2 - PHIEU_THU 5,000,000 (RECEIVE), ALLOCATE 4,000,000 -> INV1 PAID
REM ============================================================
echo. >> finance_v2_log.txt
echo ===== PHASE 4: PAYMENT2 5,000,000, ALLOCATE 4,000,000 -> INV1 PAID, PAY2 du 1,000,000 ===== >> finance_v2_log.txt
curl -s -X POST %API%/finance/vouchers -H "%AUTH%" -H "Content-Type: application/json" -d "{\"voucherType\":\"PHIEU_THU\",\"docDate\":\"%TODAY%\",\"partnerId\":%KH_ID%,\"fundId\":2,\"paymentType\":\"RECEIVE\",\"description\":\"Thu tien KH lan 2\",\"lines\":[{\"description\":\"Thu tien\",\"amount\":5000000,\"drAccountId\":2,\"crAccountId\":5,\"crObjectType\":\"PARTNER\",\"crObjectId\":%KH_ID%}]}" > pay2.json
type pay2.json >> finance_v2_log.txt & echo. >> finance_v2_log.txt
for /f "delims=" %%i in ('powershell -NoProfile -Command "(Get-Content pay2.json | ConvertFrom-Json).id"') do set PAY2_ID=%%i
echo PAY2_ID = %PAY2_ID% >> finance_v2_log.txt

curl -s -X POST %API%/finance/vouchers/%PAY2_ID%/post -H "%AUTH%" -H "Content-Type: application/json" -d "{}" > pay2_post.json
type pay2_post.json >> finance_v2_log.txt & echo. >> finance_v2_log.txt

curl -s -X POST %API%/finance/payments/%PAY2_ID%/allocations -H "%AUTH%" -H "Content-Type: application/json" -d "{\"allocations\":[{\"invoiceVoucherId\":%INV1_ID%,\"amount\":4000000}]}" > alloc2.json
type alloc2.json >> finance_v2_log.txt & echo. >> finance_v2_log.txt

curl -s %API%/finance/vouchers/%INV1_ID% -H "%AUTH%" > inv1_after_pay2.json
for /f "delims=" %%v in ('powershell -NoProfile -Command "(Get-Content inv1_after_pay2.json | ConvertFrom-Json).outstandingAmount"') do set INV1_OUT2=%%v
for /f "delims=" %%v in ('powershell -NoProfile -Command "(Get-Content inv1_after_pay2.json | ConvertFrom-Json).paymentStatus"') do set INV1_PS2=%%v
echo INV1_OUTSTANDING_AFTER_PAY2 = %INV1_OUT2% (expect 0) >> finance_v2_log.txt
echo INV1_PAYMENT_STATUS_AFTER_PAY2 = %INV1_PS2% (expect PAID) >> finance_v2_log.txt

curl -s %API%/finance/vouchers/%PAY2_ID% -H "%AUTH%" > pay2_after_alloc.json
for /f "delims=" %%v in ('powershell -NoProfile -Command "(Get-Content pay2_after_alloc.json | ConvertFrom-Json).unallocatedAmount"') do set PAY2_UNALLOC1=%%v
echo PAY2_UNALLOCATED_AFTER_ALLOC = %PAY2_UNALLOC1% (expect 1000000) >> finance_v2_log.txt

REM ============================================================
REM PHASE 5: INVOICE 2 - HOA_DON_BAN 1,000,000 + POST, then PAYMENT RECONCILIATION
REM ============================================================
echo. >> finance_v2_log.txt
echo ===== PHASE 5: INVOICE2 1,000,000 + RECONCILIATION (dung 1,000,000 tu PAY2) ===== >> finance_v2_log.txt
curl -s -X POST %API%/finance/vouchers -H "%AUTH%" -H "Content-Type: application/json" -d "{\"voucherType\":\"HOA_DON_BAN\",\"docDate\":\"%TODAY%\",\"partnerId\":%KH_ID%,\"description\":\"Hoa don ban FV2-2\",\"lines\":[{\"description\":\"Ban hang\",\"amount\":1000000,\"drAccountId\":5,\"crAccountId\":27,\"drObjectType\":\"PARTNER\",\"drObjectId\":%KH_ID%}]}" > inv2.json
type inv2.json >> finance_v2_log.txt & echo. >> finance_v2_log.txt
for /f "delims=" %%i in ('powershell -NoProfile -Command "(Get-Content inv2.json | ConvertFrom-Json).id"') do set INV2_ID=%%i
for /f "delims=" %%i in ('powershell -NoProfile -Command "(Get-Content inv2.json | ConvertFrom-Json).docNo"') do set INV2_DOCNO=%%i
echo INV2_ID = %INV2_ID% (docNo=%INV2_DOCNO%) >> finance_v2_log.txt

curl -s -X POST %API%/finance/vouchers/%INV2_ID%/post -H "%AUTH%" -H "Content-Type: application/json" -d "{}" > inv2_post.json
type inv2_post.json >> finance_v2_log.txt & echo. >> finance_v2_log.txt
for /f "delims=" %%v in ('powershell -NoProfile -Command "(Get-Content inv2_post.json | ConvertFrom-Json).outstandingAmount"') do set INV2_OUT0=%%v
echo INV2_OUTSTANDING_AFTER_POST = %INV2_OUT0% (expect 1000000) >> finance_v2_log.txt

echo --- pending-invoices for KH before reconciliation --- >> finance_v2_log.txt
curl -s "%API%/finance/payments/pending-invoices?partyId=%KH_ID%" -H "%AUTH%" > pending1.json
type pending1.json >> finance_v2_log.txt & echo. >> finance_v2_log.txt

curl -s -X POST %API%/finance/payment-reconciliation -H "%AUTH%" -H "Content-Type: application/json" -d "{\"partyId\":%KH_ID%,\"allocations\":[{\"paymentVoucherId\":%PAY2_ID%,\"invoiceVoucherId\":%INV2_ID%,\"amount\":1000000}]}" > recon.json
type recon.json >> finance_v2_log.txt & echo. >> finance_v2_log.txt

curl -s %API%/finance/vouchers/%INV2_ID% -H "%AUTH%" > inv2_after_recon.json
for /f "delims=" %%v in ('powershell -NoProfile -Command "(Get-Content inv2_after_recon.json | ConvertFrom-Json).outstandingAmount"') do set INV2_OUT1=%%v
for /f "delims=" %%v in ('powershell -NoProfile -Command "(Get-Content inv2_after_recon.json | ConvertFrom-Json).paymentStatus"') do set INV2_PS1=%%v
echo INV2_OUTSTANDING_AFTER_RECON = %INV2_OUT1% (expect 0) >> finance_v2_log.txt
echo INV2_PAYMENT_STATUS_AFTER_RECON = %INV2_PS1% (expect PAID) >> finance_v2_log.txt

curl -s %API%/finance/vouchers/%PAY2_ID% -H "%AUTH%" > pay2_after_recon.json
for /f "delims=" %%v in ('powershell -NoProfile -Command "(Get-Content pay2_after_recon.json | ConvertFrom-Json).unallocatedAmount"') do set PAY2_UNALLOC2=%%v
echo PAY2_UNALLOCATED_AFTER_RECON = %PAY2_UNALLOC2% (expect 0) >> finance_v2_log.txt

echo --- pending-invoices for KH after reconciliation (expect empty) --- >> finance_v2_log.txt
curl -s "%API%/finance/payments/pending-invoices?partyId=%KH_ID%" -H "%AUTH%" > pending2.json
type pending2.json >> finance_v2_log.txt & echo. >> finance_v2_log.txt

REM ============================================================
REM PHASE 6: TRIAL BALANCE (period 18 = 2026-06) BEFORE CANCEL
REM ============================================================
echo. >> finance_v2_log.txt
echo ===== PHASE 6: TRIAL BALANCE BEFORE CANCEL (period 18) ===== >> finance_v2_log.txt
curl -s "%API%/finance/reports/trial-balance?periodId=18" -H "%AUTH%" > tb1.json
type tb1.json >> finance_v2_log.txt & echo. >> finance_v2_log.txt
for /f "delims=" %%v in ('powershell -NoProfile -Command "$j=Get-Content tb1.json | ConvertFrom-Json; ($j | Measure-Object -Property closingDebit -Sum).Sum"') do set TB1_DEBIT=%%v
for /f "delims=" %%v in ('powershell -NoProfile -Command "$j=Get-Content tb1.json | ConvertFrom-Json; ($j | Measure-Object -Property closingCredit -Sum).Sum"') do set TB1_CREDIT=%%v
echo TB1_TOTAL_DEBIT = %TB1_DEBIT% >> finance_v2_log.txt
echo TB1_TOTAL_CREDIT = %TB1_CREDIT% (expect == TB1_TOTAL_DEBIT) >> finance_v2_log.txt

REM ============================================================
REM PHASE 7: CANCEL-POSTING INV2 -> check GL dao but toan
REM ============================================================
echo. >> finance_v2_log.txt
echo ===== PHASE 7: CANCEL-POSTING INV2 ===== >> finance_v2_log.txt
curl -s -X POST %API%/finance/vouchers/%INV2_ID%/cancel-posting -H "%AUTH%" -H "Content-Type: application/json" -d "{}" > inv2_cancel.json
type inv2_cancel.json >> finance_v2_log.txt & echo. >> finance_v2_log.txt
for /f "delims=" %%v in ('powershell -NoProfile -Command "(Get-Content inv2_cancel.json | ConvertFrom-Json).status"') do set INV2_STATUS_AFTER_CANCEL=%%v
echo INV2_STATUS_AFTER_CANCEL = %INV2_STATUS_AFTER_CANCEL% (expect CANCELLED_POSTED) >> finance_v2_log.txt

curl -s "%API%/finance/gl-entries?voucherId=%INV2_ID%&size=20" -H "%AUTH%" > inv2_gl.json
type inv2_gl.json >> finance_v2_log.txt & echo. >> finance_v2_log.txt
for /f "delims=" %%v in ('powershell -NoProfile -Command "(Get-Content inv2_gl.json | ConvertFrom-Json).total"') do set INV2_GL_TOTAL=%%v
for /f "delims=" %%v in ('powershell -NoProfile -Command "$j=Get-Content inv2_gl.json | ConvertFrom-Json; ($j.items | Where-Object {$_.isCancelled -eq $true}).Count"') do set INV2_GL_CANCELLED=%%v
echo INV2_GL_ENTRIES_TOTAL = %INV2_GL_TOTAL% (expect 4) >> finance_v2_log.txt
echo INV2_GL_ENTRIES_CANCELLED = %INV2_GL_CANCELLED% (expect 4) >> finance_v2_log.txt

REM ============================================================
REM PHASE 8: TRIAL BALANCE AFTER CANCEL -> still balances
REM ============================================================
echo. >> finance_v2_log.txt
echo ===== PHASE 8: TRIAL BALANCE AFTER CANCEL (period 18) ===== >> finance_v2_log.txt
curl -s "%API%/finance/reports/trial-balance?periodId=18" -H "%AUTH%" > tb2.json
type tb2.json >> finance_v2_log.txt & echo. >> finance_v2_log.txt
for /f "delims=" %%v in ('powershell -NoProfile -Command "$j=Get-Content tb2.json | ConvertFrom-Json; ($j | Measure-Object -Property closingDebit -Sum).Sum"') do set TB2_DEBIT=%%v
for /f "delims=" %%v in ('powershell -NoProfile -Command "$j=Get-Content tb2.json | ConvertFrom-Json; ($j | Measure-Object -Property closingCredit -Sum).Sum"') do set TB2_CREDIT=%%v
echo TB2_TOTAL_DEBIT = %TB2_DEBIT% >> finance_v2_log.txt
echo TB2_TOTAL_CREDIT = %TB2_CREDIT% (expect == TB2_TOTAL_DEBIT) >> finance_v2_log.txt

REM ============================================================
REM PHASE 9: AMEND INV2 (CANCELLED_POSTED -> new DRAFT copy, docNo + "-1")
REM ============================================================
echo. >> finance_v2_log.txt
echo ===== PHASE 9: AMEND INV2 ===== >> finance_v2_log.txt
curl -s -X POST %API%/finance/vouchers/%INV2_ID%/amend -H "%AUTH%" -H "Content-Type: application/json" -d "{}" > inv2_amend.json
type inv2_amend.json >> finance_v2_log.txt & echo. >> finance_v2_log.txt
for /f "delims=" %%v in ('powershell -NoProfile -Command "(Get-Content inv2_amend.json | ConvertFrom-Json).docNo"') do set INV2_AMEND_DOCNO=%%v
for /f "delims=" %%v in ('powershell -NoProfile -Command "(Get-Content inv2_amend.json | ConvertFrom-Json).status"') do set INV2_AMEND_STATUS=%%v
for /f "delims=" %%v in ('powershell -NoProfile -Command "(Get-Content inv2_amend.json | ConvertFrom-Json).amendedFromId"') do set INV2_AMEND_FROM=%%v
echo INV2_AMEND_DOCNO = %INV2_AMEND_DOCNO% (expect %INV2_DOCNO%-1) >> finance_v2_log.txt
echo INV2_AMEND_STATUS = %INV2_AMEND_STATUS% (expect DRAFT) >> finance_v2_log.txt
echo INV2_AMEND_FROM = %INV2_AMEND_FROM% (expect %INV2_ID%) >> finance_v2_log.txt

REM ============================================================
REM PHASE 10: COST CENTER REQUIRED ON EXPENSE ACCOUNTS
REM ============================================================
echo. >> finance_v2_log.txt
echo ===== PHASE 10: COST CENTER REQUIRED VALIDATION ===== >> finance_v2_log.txt
curl -s -X PUT %API%/finance/accounting-policy -H "%AUTH%" -H "Content-Type: application/json" -d "{\"requireCostCenter\":true}" > policy_on.json
type policy_on.json >> finance_v2_log.txt & echo. >> finance_v2_log.txt

echo --- voucher CP QLDN khong co cost center (expect 409 COST_CENTER_REQUIRED) --- >> finance_v2_log.txt
curl -s -X POST %API%/finance/vouchers -H "%AUTH%" -H "Content-Type: application/json" -d "{\"voucherType\":\"CT_TONG_HOP\",\"docDate\":\"%TODAY%\",\"description\":\"CP QLDN khong CC\",\"lines\":[{\"description\":\"Chi phi QLDN\",\"amount\":500000,\"drAccountId\":38,\"crAccountId\":2}]}" > cc_neg.json
for /f "delims=" %%i in ('powershell -NoProfile -Command "(Get-Content cc_neg.json | ConvertFrom-Json).id"') do set CCNEG_ID=%%i
curl -s -o cc_neg_post.json -w "HTTP_%%{http_code}" -X POST %API%/finance/vouchers/%CCNEG_ID%/post -H "%AUTH%" -H "Content-Type: application/json" -d "{}" > cc_neg_status.txt
set /p CCNEG_HTTP=<cc_neg_status.txt
type cc_neg_post.json >> finance_v2_log.txt & echo. >> finance_v2_log.txt
echo CCNEG_POST_HTTP = %CCNEG_HTTP% (expect HTTP_409) >> finance_v2_log.txt

echo --- voucher CP QLDN co cost center CC-VP (expect POSTED) --- >> finance_v2_log.txt
curl -s -X POST %API%/finance/vouchers -H "%AUTH%" -H "Content-Type: application/json" -d "{\"voucherType\":\"CT_TONG_HOP\",\"docDate\":\"%TODAY%\",\"description\":\"CP QLDN co CC\",\"lines\":[{\"description\":\"Chi phi QLDN\",\"amount\":500000,\"drAccountId\":38,\"crAccountId\":2,\"costCenterId\":2}]}" > cc_pos.json
for /f "delims=" %%i in ('powershell -NoProfile -Command "(Get-Content cc_pos.json | ConvertFrom-Json).id"') do set CCPOS_ID=%%i
curl -s -X POST %API%/finance/vouchers/%CCPOS_ID%/post -H "%AUTH%" -H "Content-Type: application/json" -d "{}" > cc_pos_post.json
type cc_pos_post.json >> finance_v2_log.txt & echo. >> finance_v2_log.txt
for /f "delims=" %%v in ('powershell -NoProfile -Command "(Get-Content cc_pos_post.json | ConvertFrom-Json).status"') do set CCPOS_STATUS=%%v
echo CCPOS_STATUS = %CCPOS_STATUS% (expect POSTED) >> finance_v2_log.txt

curl -s -X PUT %API%/finance/accounting-policy -H "%AUTH%" -H "Content-Type: application/json" -d "{\"requireCostCenter\":false}" > policy_off.json
type policy_off.json >> finance_v2_log.txt & echo. >> finance_v2_log.txt

REM ============================================================
REM PHASE 11: COST CENTER CRUD
REM ============================================================
echo. >> finance_v2_log.txt
echo ===== PHASE 11: COST CENTER CRUD ===== >> finance_v2_log.txt
curl -s -X POST %API%/finance/cost-centers -H "%AUTH%" -H "Content-Type: application/json" -d "{\"code\":\"CCV2%RANDOM%\",\"name\":\"Kinh doanh V2 Test\",\"parentId\":1,\"isGroup\":false}" > cc_new.json
type cc_new.json >> finance_v2_log.txt & echo. >> finance_v2_log.txt
for /f "delims=" %%i in ('powershell -NoProfile -Command "(Get-Content cc_new.json | ConvertFrom-Json).id"') do set CCNEW_ID=%%i

curl -s -X PUT %API%/finance/cost-centers/%CCNEW_ID% -H "%AUTH%" -H "Content-Type: application/json" -d "{\"name\":\"Kinh doanh V2 Test (updated)\"}" > cc_upd.json
type cc_upd.json >> finance_v2_log.txt & echo. >> finance_v2_log.txt
for /f "delims=" %%v in ('powershell -NoProfile -Command "(Get-Content cc_upd.json | ConvertFrom-Json).name"') do set CCNEW_NAME=%%v
echo CCNEW_NAME_AFTER_UPDATE = %CCNEW_NAME% (expect "Kinh doanh V2 Test (updated)") >> finance_v2_log.txt

REM ============================================================
REM PHASE 12: REPORTS SMOKE TESTS
REM ============================================================
echo. >> finance_v2_log.txt
echo ===== PHASE 12: REPORTS SMOKE TESTS ===== >> finance_v2_log.txt

echo --- general-ledger account 5 (AR) --- >> finance_v2_log.txt
curl -s -o gl_report.json -w "HTTP_%%{http_code}" "%API%/finance/reports/general-ledger?accountId=5&from=2026-01-01&to=%TODAY%" -H "%AUTH%" > gl_report_status.txt
set /p GL_REPORT_HTTP=<gl_report_status.txt
type gl_report.json >> finance_v2_log.txt & echo. >> finance_v2_log.txt
echo GL_REPORT_HTTP = %GL_REPORT_HTTP% (expect HTTP_200) >> finance_v2_log.txt

echo --- ar-aging --- >> finance_v2_log.txt
curl -s -o ar_aging.json -w "HTTP_%%{http_code}" "%API%/finance/reports/ar-aging" -H "%AUTH%" > ar_aging_status.txt
set /p AR_AGING_HTTP=<ar_aging_status.txt
type ar_aging.json >> finance_v2_log.txt & echo. >> finance_v2_log.txt
echo AR_AGING_HTTP = %AR_AGING_HTTP% (expect HTTP_200) >> finance_v2_log.txt

echo --- ap-aging --- >> finance_v2_log.txt
curl -s -o ap_aging.json -w "HTTP_%%{http_code}" "%API%/finance/reports/ap-aging" -H "%AUTH%" > ap_aging_status.txt
set /p AP_AGING_HTTP=<ap_aging_status.txt
type ap_aging.json >> finance_v2_log.txt & echo. >> finance_v2_log.txt
echo AP_AGING_HTTP = %AP_AGING_HTTP% (expect HTTP_200) >> finance_v2_log.txt

echo --- financial-statement B01 --- >> finance_v2_log.txt
curl -s -o fs_b01.json -w "HTTP_%%{http_code}" "%API%/finance/reports/financial-statement?statement=B01&asOf=%TODAY%" -H "%AUTH%" > fs_b01_status.txt
set /p FS_B01_HTTP=<fs_b01_status.txt
type fs_b01.json >> finance_v2_log.txt & echo. >> finance_v2_log.txt
echo FS_B01_HTTP = %FS_B01_HTTP% (expect HTTP_200) >> finance_v2_log.txt

echo --- financial-statement B02 --- >> finance_v2_log.txt
curl -s -o fs_b02.json -w "HTTP_%%{http_code}" "%API%/finance/reports/financial-statement?statement=B02&from=2026-06-01&to=%TODAY%" -H "%AUTH%" > fs_b02_status.txt
set /p FS_B02_HTTP=<fs_b02_status.txt
type fs_b02.json >> finance_v2_log.txt & echo. >> finance_v2_log.txt
echo FS_B02_HTTP = %FS_B02_HTTP% (expect HTTP_200) >> finance_v2_log.txt

echo --- period-closing (period 24 = Dec 2026, no activity expected) --- >> finance_v2_log.txt
curl -s -X POST %API%/finance/period-closing -H "%AUTH%" -H "Content-Type: application/json" -d "{\"periodId\":24}" > pc.json
type pc.json >> finance_v2_log.txt & echo. >> finance_v2_log.txt

REM ============================================================
REM SUMMARY
REM ============================================================
echo. >> finance_v2_log.txt
echo ===== SUMMARY ===== >> finance_v2_log.txt
echo KH_ID=%KH_ID% INV1_ID=%INV1_ID% PAY1_ID=%PAY1_ID% PAY2_ID=%PAY2_ID% INV2_ID=%INV2_ID% >> finance_v2_log.txt
echo INV1: outstanding 10000000 -^> 4000000 -^> 0, status UNPAID -^> PARTLY_PAID -^> PAID >> finance_v2_log.txt
echo   actual: %INV1_OUT0% / %INV1_OUT1% / %INV1_OUT2%  ::  %INV1_PS0% / %INV1_PS1% / %INV1_PS2% >> finance_v2_log.txt
echo PAY2 unallocated 5000000 -^> 1000000 (after alloc INV1) -^> 0 (after reconciliation INV2) >> finance_v2_log.txt
echo   actual: %PAY2_UNALLOC1% / %PAY2_UNALLOC2% >> finance_v2_log.txt
echo INV2: outstanding 1000000 -^> 0 PAID, then cancel-posting -^> %INV2_STATUS_AFTER_CANCEL% >> finance_v2_log.txt
echo   GL entries for INV2: total=%INV2_GL_TOTAL% cancelled=%INV2_GL_CANCELLED% (expect 4/4) >> finance_v2_log.txt
echo Trial balance: TB1 D=%TB1_DEBIT% C=%TB1_CREDIT% ; TB2 D=%TB2_DEBIT% C=%TB2_CREDIT% (both should balance) >> finance_v2_log.txt
echo Amend INV2: docNo=%INV2_AMEND_DOCNO% status=%INV2_AMEND_STATUS% amendedFromId=%INV2_AMEND_FROM% >> finance_v2_log.txt
echo Cost center required: neg post HTTP=%CCNEG_HTTP% (expect 409), pos post status=%CCPOS_STATUS% (expect POSTED) >> finance_v2_log.txt
echo Cost center CRUD: new name after update = %CCNEW_NAME% >> finance_v2_log.txt
echo Reports HTTP: GL=%GL_REPORT_HTTP% AR=%AR_AGING_HTTP% AP=%AP_AGING_HTTP% B01=%FS_B01_HTTP% B02=%FS_B02_HTTP% >> finance_v2_log.txt

del *.json 2>nul
del health.txt cc_neg_status.txt gl_report_status.txt ar_aging_status.txt ap_aging_status.txt fs_b01_status.txt fs_b02_status.txt 2>nul

echo. >> finance_v2_log.txt
echo ===== FINANCE V2 TEST COMPLETE ===== >> finance_v2_log.txt
type finance_v2_log.txt
