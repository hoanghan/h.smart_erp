@echo off
REM Test CRM Module (Task 25)
set API_URL=http://localhost:5000/api

echo.
echo ===== Test CRM Module =====
echo.

REM 1. Tạo Campaign
echo 1. Tạo Campaign...
curl -s -X POST "%API_URL%/crm/campaigns" ^
  -H "Content-Type: application/json" ^
  -d "{\"name\": \"Q4 2026\", \"campaign_type\": \"ONLINE\", \"budget\": 50000000, \"start_date\": \"2026-10-01\", \"end_date\": \"2026-12-31\", \"status\": \"SUBMITTED\"}" > tmp_crm.json
type tmp_crm.json

REM 2. Tạo Lead (đúng)
echo.
echo 2. Tạo Lead (đúng)...
curl -s -X POST "%API_URL%/crm/leads" ^
  -H "Content-Type: application/json" ^
  -d "{\"first_name\": \"Nguyen Van\", \"last_name\": \"A\", \"company_name\": \"ABC Corp\", \"email\": \"nguyena@abc.com\", \"phone\": \"0901234567\", \"lead_source_id\": 1, \"campaign_id\": 1}" >> tmp_crm.json
type tmp_crm.json

REM 3. Kiểm tra trùng email
echo.
echo 3. Kiểm tra trùng email...
curl -s -X POST "%API_URL%/crm/leads/check-duplicate" ^
  -H "Content-Type: application/json" ^
  -d "{\"email\": \"nguyena@abc.com\"}" >> tmp_crm.json
type tmp_crm.json

REM 4. Convert Lead to Opportunity
echo.
echo 4. Convert Lead to Opportunity...
for /f "tokens=2" %%a in ('type tmp_crm.json ^| findstr "\"id\""') do set LEAD_ID=%%a
curl -s -X POST "%API_URL%/crm/leads/%LEAD_ID:/~0%/convert-to-opportunity" ^
  -H "Content-Type: application/json" ^
  -d "{\"sales_stage_id\": 3, \"expected_value\": 150000000, \"expected_closing_date\": \"2026-12-15\", \"lines\": [{\"product_id\": 1, \"qty\": 5, \"estimated_rate\": 30000000}], \"currency\": \"VND\"}" >> tmp_crm.json
type tmp_crm.json

REM 5. Convert Lead to Customer
echo.
echo 5. Convert Lead to Customer...
curl -s -X POST "%API_URL%/crm/leads/%LEAD_ID:/~0%/convert-to-customer" ^
  -H "Content-Type: application/json" ^
  -d "{\"partner_type\": \"CUSTOMER\"}" >> tmp_crm.json
type tmp_crm.json

REM 6. Lấy Opportunity ID
echo.
echo 6. Get Opportunity ID...
for /f "tokens=2" %%a in ('type tmp_crm.json ^| findstr "\"opportunity_id\""') do set OPP_ID=%%a
echo Opportunity ID: %OPP_ID%

REM 7. Make Quotation từ Opportunity
echo.
echo 7. Make Quotation từ Opportunity...
curl -s -X POST "%API_URL%/crm/opportunities/%OPP_ID:/~0%/make-quotation" ^
  -H "Content-Type: application/json" ^
  -d "{\"validity_days\": 7}" >> tmp_crm.json
type tmp_crm.json

REM 8. Get Quotation ID
echo.
echo 8. Get Quotation ID...
for /f "tokens=2" %%a in ('type tmp_crm.json ^| findstr "\"quotation_id\""') do set QUOTE_ID=%%a
echo Quotation ID: %QUOTE_ID%

REM 9. Submit Quotation
echo.
echo 9. Submit Quotation...
curl -s -X POST "%API_URL%/sales/quotations/%QUOTE_ID:/~0%/submit" ^
  -H "Content-Type: application/json" >> tmp_crm.json
type tmp_crm.json

REM 10. Make Sales Order
echo.
echo 10. Make Sales Order...
curl -s -X POST "%API_URL%/sales/quotations/%QUOTE_ID:/~0%/make-sales-order" ^
  -H "Content-Type: application/json" ^
  -d "{\"delivery_date\": \"2026-12-20\"}" >> tmp_crm.json
type tmp_crm.json

REM 11. Kiểm tra Opportunity status (phải là WON)
echo.
echo 11. Check Opportunity status (should be WON)...
curl -s -X GET "%API_URL%/crm/opportunities/%OPP_ID:/~0%" >> tmp_crm.json
type tmp_crm.json

REM 12. Thêm Activity
echo.
echo 12. Thêm Activity (TODO)...
curl -s -X POST "%API_URL%/crm/activities" ^
  -H "Content-Type: application/json" ^
  -d "{\"ref_table\": \"opportunity\", \"ref_id\": %OPP_ID:/~0%, \"activity_type\": \"TODO\", \"subject\": \"Follow up customer\", \"due_date\": \"2026-12-10\", \"assignee_id\": 1}" >> tmp_crm.json
type tmp_crm.json

REM 13. Get Timeline
echo.
echo 13. Get Timeline...
curl -s -X GET "%API_URL%/crm/opportunities/%OPP_ID:/~0%/timeline" >> tmp_crm.json
type tmp_crm.json

REM 14. Funnel Report
echo.
echo 14. Funnel Report...
curl -s -X GET "%API_URL%/crm/reports/funnel?from=2026-10-01&to=2026-12-31" >> tmp_crm.json
type tmp_crm.json

REM 15. Lead Conversion Report
echo.
echo 15. Lead Conversion Report...
curl -s -X GET "%API_URL%/crm/reports/lead-conversion?from=2026-10-01&to=2026-12-31" >> tmp_crm.json
type tmp_crm.json

REM 16. Lost Reasons Report
echo.
echo 16. Lost Reasons Report...
curl -s -X GET "%API_URL%/crm/reports/lost-reasons?from=2026-10-01&to=2026-12-31" >> tmp_crm.json
type tmp_crm.json

echo.
echo ===== CRM Test Complete =====
del tmp_crm.json 2>nul