-- Drop old check constraints that may conflict
ALTER TABLE sales.quotation DROP CONSTRAINT IF EXISTS quotation_status_check;
ALTER TABLE sales.quotation ADD CONSTRAINT quotation_status_check
  CHECK (status IN ('DRAFT','OPEN','ORDERED','LOST','EXPIRED','CANCELLED','NEW','PRICE_REQUESTED','PRICING','APPROVAL_REQUESTED','APPROVED','ORDER_PENDING','FAILED','REJECTED'));
