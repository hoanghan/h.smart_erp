# Task 24 — Sales thuần ERPNext: Quotation mới + Promotional Scheme (BỎ báo giá cũ)

## Bối cảnh
**Bỏ hoàn toàn** nghiệp vụ báo giá kiểu LeanSCRM (các bước Yêu cầu tính giá/Đang tính giá/Yêu cầu duyệt, tab Tính giá theo tỷ trọng, giá duyệt, loại Công trình-nhà) và chương trình KM-CK cũ (promotion/discount_item/gift_item). Thay bằng mô hình Selling của ERPNext:

```
Quotation: Draft → Open (submit) → Ordered / Lost / Expired / Cancelled
Khuyến mãi: Promotional Scheme (bậc giảm giá / tặng hàng) → sinh Pricing Rule → tự áp khi nhập dòng
Sales Order: per-line delivered/billed, reserve tồn, credit limit (giữ như spec trước)
```

## PROMPT (dán cho Claude)

```
Làm việc trong C:\Project\Personal\ERP\sourcecode\erp-backend (.NET 9, EF Core, PostgreSQL g_erp). Đây là THAY THẾ module báo giá + khuyến mãi cũ; chấp nhận breaking change API /sales/quotations và /sales/promotions (FE chưa làm phần này). Schema qua SchemaBootstrap idempotent.

== A. QUOTATION THUẦN ERPNEXT (bỏ luồng cũ) ==
1. Workflow quotations viết lại CHỈ còn:
   - submit:        DRAFT → OPEN            (APPROVE)
   - make-sales-order: OPEN → ORDERED       (UPDATE) — cho phép tạo SO một phần: body {lines:[{lineId, qty}]?}, nếu tạo hết thì ORDERED, còn dư giữ OPEN (theo dõi ordered_qty từng dòng)
   - set-as-lost:   OPEN → LOST             (UPDATE) — body {lostReasonIds:[], competitor?, detail?}
   - cancel:        DRAFT|OPEN → CANCELLED  (UPDATE, lý do)
   - amend:         CANCELLED → bản mới DRAFT (copy, doc_no hậu tố -1)
   Xóa các transition cũ (request-pricing, start-pricing, request-approval, approve, reject, mark-order-pending, mark-failed, convert-to-order). Migrate dữ liệu: APPROVED/ORDER_PENDING→OPEN, ORDERED giữ, FAILED→LOST, REJECTED/CANCELLED→CANCELLED, NEW/PRICE_REQUESTED/PRICING/APPROVAL_REQUESTED→DRAFT.
2. Schema quotation: thêm valid_till DATE, order_type TEXT DEFAULT 'SALES', price_list_id BIGINT, tax_template_id BIGINT, lost_reason_ids BIGINT[], competitor TEXT, terms TEXT; quotation_line thêm ordered_qty NUMERIC(18,4) DEFAULT 0, rate NUMERIC(18,2) (đơn giá chuẩn thay calc_price/approved_price — giữ cột cũ nhưng ngừng dùng, đánh dấu [Obsolete] trong entity), discount_pct NUMERIC(9,4), amount tính = qty*rate*(1-discount/100).
3. Bảng sales.lost_reason + CRUD /md/lost-reasons. Hangfire job: OPEN quá valid_till → EXPIRED; action extend (cập nhật valid_till, EXPIRED→OPEN).
4. Controller /sales/quotations viết lại theo DTO mới (bỏ QuoteType/QuoteForm/pricing fields); khi thêm dòng tự gọi PricingService.Resolve (mục C) điền rate + discount.

== B. PROMOTIONAL SCHEME (thay KM-CK cũ) ==
5. Bảng sales.promotional_scheme: code, name, apply_on (ITEM/ITEM_GROUP/ALL) + bảng item áp dụng, áp cho customer/customer_group/territory (nullable = tất cả), valid_from/to, is_active.
   - sales.scheme_price_slab: min_qty, max_qty, discount_pct HOẶC rate (bậc giảm giá theo số lượng).
   - sales.scheme_product_slab: min_qty, max_qty, free_product_id, free_qty, free_rate DEFAULT 0 (bậc tặng hàng: mua đủ X tặng Y).
6. Khi lưu scheme: sinh/refresh các sales.pricing_rule con (rule_source='SCHEME', scheme_id) — mỗi slab 1 rule, priority theo min_qty giảm dần. CRUD /sales/promotional-schemes (+slabs); xóa/deactivate scheme → vô hiệu rules con.
7. Migrate dữ liệu promotion cũ: discount_item → scheme price slab (min_qty 0); gift_item → product slab. Bảng promotion cũ giữ read-only (đánh dấu deprecated), API /sales/promotions cũ trả 410 GONE kèm message hướng dẫn.
8. Coupon Code (gọn): bảng sales.coupon_code (code unique, pricing_rule_id, max_use, used, valid_from/to); SO/Quotation nhận coupon_code → áp rule nếu hợp lệ (hết lượt/hết hạn → 409 COUPON_INVALID).

== C. PRICING SERVICE (một cửa) ==
9. PricingService.Resolve(partnerId, productId, qty, date, couponCode?) trả {rate, discountPct, freeItems:[{productId, qty}], appliedRules:[]}:
   thứ tự: pricing_rule khớp (priority cao nhất, lọc theo item/group/customer/territory/qty slab/hiệu lực) → price_list item → 0.
   GET /sales/pricing/resolve?... cho FE; thêm dòng Quotation/SO tự áp; free items tự thêm dòng is_gift=true rate=0 vào SO khi áp scheme product slab.

== D. SALES ORDER (giữ spec ERPNext trước) ==
10. Giữ nguyên các mục per-line delivered/billed, trạng thái TO_DELIVER_AND_BILL/TO_BILL/TO_DELIVER/COMPLETED, close/hold/resume, reserve tồn (Bin), credit limit, make-invoice như bản task 24 trước (nếu đã code thì không đổi).
Viết test_sales_v3.bat: tạo scheme "Mua 10 giảm 5%, mua 50 giảm 10%, mua 100 tặng 5" → resolve qty 10/50/100 trả đúng → quotation DRAFT thêm 2 dòng (giá tự áp) → submit OPEN → make-sales-order 1 phần (dòng 1) → quotation vẫn OPEN, ordered_qty đúng → make nốt → ORDERED; quotation khác set-as-lost với 2 lý do; coupon hết hạn 409. Build pass.
```

## Nghiệm thu
- Luồng quotation chỉ còn Draft→Open→Ordered/Lost/Expired/Cancelled; tạo SO một phần theo dòng; amend từ CANCELLED.
- Scheme bậc số lượng áp giá đúng 3 mốc (5%/10%/tặng 5); dòng quà tự thêm vào SO với giá 0.
- API promotion cũ trả 410; dữ liệu KM cũ migrate thành scheme; coupon kiểm soát lượt dùng/hạn.
