// Kiá»ƒu dá»¯ liá»‡u dÃ¹ng chung, khá»›p vá»›i Erp.Api.Core.PageResult / ApiError á»Ÿ backend.

export interface PageResult<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
}

export interface ApiErrorBody {
  code: string;
  message: string;
}

// ---------- Auth ----------
export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
}

export interface AuthUser {
  id: number;
  username: string;
  isAdmin: boolean;
  employeeId: number | null;
  permissions?: { subjectType: string; subjectCode: string; action: string }[];
}

// ---------- Master data: danh má»¥c Ä‘Æ¡n giáº£n ----------
export interface UomOut {
  id: number;
  code: string;
  name: string;
}

export interface PaymentMethodOut {
  id: number;
  code: string;
  name: string;
  dueDays: number;
}

export interface DeliveryMethodOut {
  id: number;
  code: string;
  name: string;
}

export interface ProductGroupOut {
  id: number;
  code: string;
  name: string;
  parentId: number | null;
}

export interface ProductOut {
  id: number;
  code: string;
  name: string;
  productType: string;
  groupId: number | null;
  uomId: number;
  isKit: boolean;
  priceWeight: number | null;
  barcode: string | null;
  spec: string | null;
  minStock: number | null;
  isActive: boolean;
}

export interface PartnerOut {
  id: number;
  code: string;
  shortName: string;
  fullName: string | null;
  taxCode: string | null;
  isCustomer: boolean;
  isSupplier: boolean;
  address: string | null;
  phone: string | null;
  email: string | null;
  paymentMethodId: number | null;
  deliveryMethodId: number | null;
  salespersonId: number | null;
  creditLimit: number | null;
  creditDays: number | null;
  isActive: boolean;
}

export interface WarehouseOut {
  id: number;
  code: string;
  name: string;
  isOutsourcing: boolean;
  isActive: boolean;
}

export interface DepartmentOut {
  id: number;
  code: string;
  name: string;
  parentId: number | null;
  isActive: boolean;
}

export interface EmployeeOut {
  id: number;
  code: string;
  fullName: string;
  departmentId: number | null;
  phone: string | null;
  email: string | null;
  isActive: boolean;
}

/** Báº£n ghi rÃºt gá»n dÃ¹ng cho LookupSelect â€” chá»‰ cáº§n code + má»™t trÆ°á»ng nhÃ£n. */
export interface LookupItem {
  id: number;
  code: string;
  name?: string;
  fullName?: string;
  shortName?: string;
}

// ---------- Sales: BÃ¡o giÃ¡ ----------
export interface QuotationLineIn {
  productId: number;
  quantity: number;
  projectHouse?: string | null;
  vatPct?: number | null;
  rate?: number | null;
  discountPct?: number | null;
  note?: string | null;
}

export interface QuotationLineOut {
  id: number;
  productId: number;
  projectHouse: string | null;
  quantity: number;
  vatPct: number | null;
  rate: number | null;
  discountPct: number | null;
  amount: number;
  orderedQty: number;
  note: string | null;
}

export interface QuotationLineUpdate {
  quantity?: number | null;
  projectHouse?: string | null;
  vatPct?: number | null;
  rate?: number | null;
  discountPct?: number | null;
  note?: string | null;
}

export interface QuotationCreate {
  partnerId: number;
  orderType?: string;
  validTill?: string | null;
  priceListId?: number | null;
  taxTemplateId?: number | null;
  requestDeliveryDate?: string | null;
  validityDays?: number | null;
  deliveryLead?: string | null;
  requesterId?: number | null;
  requesterDeptId?: number | null;
  contactId?: number | null;
  deliveryAddrId?: number | null;
  paymentMethodId?: number | null;
  deliveryMethodId?: number | null;
  bankAccount?: string | null;
  attachedService?: string | null;
  competitor?: string | null;
  terms?: string | null;
  note?: string | null;
  lines?: QuotationLineIn[];
}

export type QuotationUpdate = Omit<QuotationCreate, 'lines'>;

export interface QuotationOut {
  id: number;
  docNo: string;
  docDate: string;
  partnerId: number;
  orderType: string;
  validTill: string | null;
  priceListId: number | null;
  taxTemplateId: number | null;
  requestDeliveryDate: string | null;
  validityDays: number | null;
  deliveryLead: string | null;
  requesterId: number | null;
  creatorId: number | null;
  approverId: number | null;
  approvedAt: string | null;
  paymentMethodId: number | null;
  deliveryMethodId: number | null;
  competitor: string | null;
  terms: string | null;
  note: string | null;
  status: string;
  statusReason: string | null;
  lostReasonIds: number[] | null;
  lines: QuotationLineOut[];
}

// ---------- Quotation workflow actions ----------
export interface MakeSalesOrderLineIn {
  lineId: number;
  qty: number;
}

export interface MakeSalesOrderRequest {
  lines?: MakeSalesOrderLineIn[];
}

export interface MakeSalesOrderResult {
  quotationId: number;
  quotationStatus: string;
  orderId: number;
  orderDocNo: string;
}

export interface SetAsLostRequest {
  lostReasonIds: number[];
  competitor?: string | null;
  detail?: string | null;
}

export interface ExtendQuotationRequest {
  validTill: string;
}

export interface LostReasonOut {
  id: number;
  code: string;
  name: string;
  isActive: boolean;
}

export interface LostReasonCreate {
  code: string;
  name: string;
}

export interface LostReasonUpdate {
  code?: string;
  name?: string;
  isActive?: boolean;
}

/** Pháº£n há»“i cá»§a action convert-to-order: khÃ´ng pháº£i QuotationOut mÃ  lÃ  tÃ³m táº¯t Ä‘Æ¡n hÃ ng vá»«a táº¡o. */
export interface ConvertToOrderResult {
  quotationId: number;
  quotationStatus: string;
  orderId: number;
  orderDocNo: string;
}

// ---------- Sales: ÄÆ¡n hÃ ng bÃ¡n ----------
export interface SalesOrderLineIn {
  productId: number;
  quantity: number;
  unitPrice: number;
  kitQty?: number | null;
  listPrice?: number | null;
  vatPct?: number | null;
  isGift?: boolean;
  note?: string | null;
}

export interface SalesOrderLineOut {
  id: number;
  productId: number;
  quantity: number;
  kitQty: number | null;
  unitPrice: number;
  listPrice: number | null;
  vatPct: number | null;
  amount: number;
  isGift: boolean;
  note: string | null;
}

export interface SalesOrderCreate {
  partnerId: number;
  orderForm?: string;
  salesChannel?: string | null;
  salesRegion?: string | null;
  warehouseId?: number | null;
  deliveryDatePlan?: string | null;
  paymentMethodId?: number | null;
  deliveryMethodId?: number | null;
  deliveryAddrId?: number | null;
  salespersonId?: number | null;
  note?: string | null;
  lines?: SalesOrderLineIn[];
}

export type SalesOrderUpdate = Omit<SalesOrderCreate, 'lines'>;

export interface SalesOrderOut {
  id: number;
  docNo: string;
  docDate: string;
  quotationId: number | null;
  partnerId: number;
  orderForm: string;
  salesChannel: string | null;
  salesRegion: string | null;
  warehouseId: number | null;
  deliveryDatePlan: string | null;
  paymentMethodId: number | null;
  deliveryMethodId: number | null;
  salespersonId: number | null;
  approverId: number | null;
  approvedAt: string | null;
  totalAmount: number | null;
  totalVat: number | null;
  note: string | null;
  status: string;
  lines: SalesOrderLineOut[];
}

// ---------- Promotional scheme / Pricing rule / Coupon code ----------
export interface SchemeItemIn {
  productId: number;
}
export interface SchemeItemOut {
  id: number;
  productId: number;
}

export interface SchemePriceSlabIn {
  productId?: number | null;
  minQty: number;
  maxQty?: number | null;
  discountPct?: number | null;
  rate?: number | null;
}
export interface SchemePriceSlabOut {
  id: number;
  productId: number | null;
  minQty: number;
  maxQty: number | null;
  discountPct: number | null;
  rate: number | null;
}

export interface SchemeProductSlabIn {
  productId?: number | null;
  minQty: number;
  maxQty?: number | null;
  freeProductId: number;
  freeQty: number;
  freeRate?: number;
}
export interface SchemeProductSlabOut {
  id: number;
  productId: number | null;
  minQty: number;
  maxQty: number | null;
  freeProductId: number;
  freeQty: number;
  freeRate: number;
}

export interface PromotionalSchemeCreate {
  code: string;
  name: string;
  applyOn?: string;
  productGroupId?: number | null;
  partnerId?: number | null;
  validFrom?: string | null;
  validTo?: string | null;
  items?: SchemeItemIn[];
  priceSlabs?: SchemePriceSlabIn[];
  productSlabs?: SchemeProductSlabIn[];
}

export type PromotionalSchemeUpdate = Partial<PromotionalSchemeCreate> & { isActive?: boolean };

export interface PromotionalSchemeOut {
  id: number;
  code: string;
  name: string;
  applyOn: string;
  productGroupId: number | null;
  partnerId: number | null;
  validFrom: string | null;
  validTo: string | null;
  isActive: boolean;
  items: SchemeItemOut[];
  priceSlabs: SchemePriceSlabOut[];
  productSlabs: SchemeProductSlabOut[];
}

export interface PricingFreeItem {
  productId: number;
  qty: number;
}

export interface PricingResolveResult {
  rate: number;
  discountPct: number;
  freeItems: PricingFreeItem[];
  appliedRules: number[];
}

export interface PricingRuleOut {
  id: number;
  schemeId: number | null;
  priority: number;
  productId: number | null;
  productGroupId: number | null;
  partnerId: number | null;
  minQty: number;
  maxQty: number | null;
  discountPct: number | null;
  rate: number | null;
  freeProductId: number | null;
  freeQty: number | null;
  freeRate: number;
  validFrom: string | null;
  validTo: string | null;
  isActive: boolean;
}

export interface CouponCodeOut {
  id: number;
  code: string;
  pricingRuleId: number;
  maxUse: number | null;
  used: number;
  validFrom: string | null;
  validTo: string | null;
  isActive: boolean;
}
export interface CouponCodeCreate {
  code: string;
  pricingRuleId: number;
  maxUse?: number | null;
  validFrom?: string | null;
  validTo?: string | null;
}
export interface CouponCodeUpdate {
  code?: string;
  maxUse?: number | null;
  validFrom?: string | null;
  validTo?: string | null;
  isActive?: boolean;
}

// ---------- Purchasing: YÃªu cáº§u mua hÃ ng ----------
export interface PurchaseRequestLineIn {
  productId: number;
  quantity: number;
  note?: string | null;
}

export interface PurchaseRequestLineOut {
  id: number;
  productId: number;
  quantity: number;
  note: string | null;
}

export interface PurchaseRequestCreate {
  requesterId?: number | null;
  departmentId?: number | null;
  note?: string | null;
  lines?: PurchaseRequestLineIn[];
}

export type PurchaseRequestUpdate = Omit<PurchaseRequestCreate, 'lines'>;

export interface PurchaseRequestOut {
  id: number;
  docNo: string;
  docDate: string;
  requesterId: number | null;
  departmentId: number | null;
  note: string | null;
  status: string;
  statusReason: string | null;
  creatorId: number | null;
  lines: PurchaseRequestLineOut[];
}

// ---------- Purchasing: ÄÆ¡n hÃ ng mua ----------
export interface PurchaseOrderLineIn {
  productId: number;
  quantity: number;
  unitPrice: number;
  vatPct?: number | null;
  note?: string | null;
}

export interface PurchaseOrderLineOut {
  id: number;
  productId: number;
  quantity: number;
  unitPrice: number;
  vatPct: number | null;
  amount: number;
  note: string | null;
}

export interface PurchaseOrderCreate {
  partnerId: number;
  orderForm?: string;
  requestId?: number | null;
  receiveDatePlan?: string | null;
  paymentMethodId?: number | null;
  deliveryMethodId?: number | null;
  receiveAddress?: string | null;
  vatIncluded?: boolean;
  note?: string | null;
  lines?: PurchaseOrderLineIn[];
}

export type PurchaseOrderUpdate = Omit<PurchaseOrderCreate, 'lines'>;

export interface PurchaseOrderOut {
  id: number;
  docNo: string;
  orderDate: string;
  requestId: number | null;
  partnerId: number;
  orderForm: string;
  receiveDatePlan: string | null;
  paymentMethodId: number | null;
  deliveryMethodId: number | null;
  receiveAddress: string | null;
  vatIncluded: boolean;
  note: string | null;
  status: string;
  statusReason: string | null;
  creatorId: number | null;
  approverId: number | null;
  approvedAt: string | null;
  totalAmount: number | null;
  totalVat: number | null;
  lines: PurchaseOrderLineOut[];
}

// ---------- Purchasing: Chi phÃ­ Ä‘Æ¡n mua ----------
export interface PoCostIn {
  costTypeId: number;
  receiptDocId?: number | null;
  serviceSupplierId?: number | null;
  amount?: number;
  vatPct?: number | null;
  paymentMethodId?: number | null;
  note?: string | null;
}

export type PoCostUpdate = Partial<PoCostIn>;

export interface PoCostOut {
  id: number;
  orderId: number;
  receiptDocId: number | null;
  costTypeId: number;
  serviceSupplierId: number | null;
  amount: number;
  vatPct: number | null;
  paymentMethodId: number | null;
  note: string | null;
  approved: boolean;
  approvedBy: number | null;
  approvedAt: string | null;
}

// ---------- Purchasing: Thanh toÃ¡n NCC ----------
export interface PoPaymentRequestIn {
  amount: number;
  dueDate?: string | null;
  note?: string | null;
}

export interface PoPaymentRequestOut {
  id: number;
  orderId: number;
  amount: number;
  dueDate: string | null;
  note: string | null;
  status: string;
  creatorId: number | null;
  approvedBy: number | null;
  approvedAt: string | null;
}

export interface PoPaymentActualIn {
  payDate: string;
  amount: number;
  methodId?: number | null;
  note?: string | null;
}

export interface PoPaymentActualOut {
  id: number;
  orderId: number;
  payDate: string;
  amount: number;
  methodId: number | null;
  note: string | null;
}

// ---------- Purchasing: Tráº£ hÃ ng NCC ----------
export interface SupplierReturnLineIn {
  productId: number;
  quantity: number;
  unitPrice?: number | null;
  note?: string | null;
}

export interface SupplierReturnLineOut {
  id: number;
  productId: number;
  quantity: number;
  unitPrice: number | null;
  note: string | null;
}

export interface SupplierReturnCreate {
  orderId?: number | null;
  partnerId: number;
  note?: string | null;
  lines?: SupplierReturnLineIn[];
}

export interface SupplierReturnUpdate {
  partnerId?: number | null;
  note?: string | null;
}

export interface SupplierReturnOut {
  id: number;
  docNo: string;
  docDate: string;
  orderId: number | null;
  partnerId: number;
  note: string | null;
  status: string;
  creatorId: number | null;
  lines: SupplierReturnLineOut[];
}

// ---------- Inventory: phiáº¿u kho ----------
export interface StockDocLineIn {
  productId: number;
  requestedQty: number;
  actualQty?: number | null;
  kitQty?: number | null;
  lotCode?: string | null;
  lotExpiryDate?: string | null;
  note?: string | null;
}

export interface StockDocLineOut {
  id: number;
  productId: number;
  requestedQty: number;
  actualQty: number | null;
  kitQty: number | null;
  lotId: number | null;
  lotCode: string | null;
  lotExpiryDate: string | null;
  unitPrice: number | null;
  note: string | null;
}

export interface StockDocCreate {
  docType: string;
  subType: string;
  partnerId?: number | null;
  processId?: number | null;
  fromWarehouseId?: number | null;
  toWarehouseId?: number | null;
  salesOrderId?: number | null;
  purchaseOrderId?: number | null;
  requestDate?: string | null;
  note?: string | null;
  lines?: StockDocLineIn[];
}

export type StockDocUpdate = Partial<Omit<StockDocCreate, 'docType' | 'subType' | 'lines'>>

export interface StockDocOut {
  id: number;
  docNo: string;
  docType: string;
  subType: string;
  requestDate: string;
  actualDate: string | null;
  salesOrderId: number | null;
  purchaseOrderId: number | null;
  partnerId: number | null;
  processId: number | null;
  fromWarehouseId: number | null;
  toWarehouseId: number | null;
  counterpartDocId: number | null;
  status: string;
  statusReason: string | null;
  note: string | null;
  lines: StockDocLineOut[];
}

// ---------- Inventory: Tá»“n kho ----------
export interface StockBalanceOut {
  productId: number;
  warehouseId: number;
  lotId: number | null;
  qtyOnHand: number;
  updatedAt: string;
}

// ---------- Inventory: Tháº» kho / Nháº­t kÃ½ ----------
export interface StockMoveOut {
  id: number;
  moveDate: string;
  docId: number;
  docLineId: number;
  productId: number;
  warehouseId: number;
  lotId: number | null;
  locationId: number | null;
  qty: number;
  unitCost: number | null;
  createdAt: string;
  docNo: string | null;
  docType: string | null;
}

// ---------- Inventory: LÃ´ ----------
export interface LotOut {
  id: number;
  code: string;
  productId: number;
  expiryDate: string | null;
}

// ---------- Inventory: Chi phÃ­ nháº­p kho (gr_cost) ----------
export interface GrCostIn {
  costTypeId: number;
  serviceSupplierId?: number | null;
  amount?: number;
  vatPct?: number | null;
  paymentMethodId?: number | null;
  note?: string | null;
}

export type GrCostUpdate = Partial<GrCostIn>

export interface GrCostOut {
  id: number;
  docId: number;
  costTypeId: number;
  serviceSupplierId: number | null;
  amount: number;
  vatPct: number | null;
  paymentMethodId: number | null;
  note: string | null;
  approved: boolean;
  approvedBy: number | null;
  approvedAt: string | null;
}

// ---------- Sales order: Chi phÃ­ Ä‘Æ¡n hÃ ng ----------
export interface SoCostIn {
  costTypeId: number;
  payeeId?: number | null;
  ratePct?: number | null;
  amount?: number | null;
  vatPct?: number | null;
  dueDate?: string | null;
  note?: string | null;
}

export type SoCostUpdate = Partial<SoCostIn>;

export interface SoCostOut {
  id: number;
  orderId: number;
  costTypeId: number;
  payeeId: number | null;
  ratePct: number | null;
  amount: number | null;
  vatPct: number | null;
  dueDate: string | null;
  note: string | null;
  approved: boolean;
  approvedBy: number | null;
  approvedAt: string | null;
}

// ---------- Sales order: YÃªu cáº§u / thá»±c táº¿ thanh toÃ¡n ----------
export interface SoPaymentRequestIn {
  dueDate: string;
  amount: number;
  status?: string;
}

export type SoPaymentRequestUpdate = Partial<SoPaymentRequestIn>;

export interface SoPaymentRequestOut {
  id: number;
  orderId: number;
  dueDate: string;
  amount: number;
  autoGenerated: boolean;
  status: string;
}

export interface SoPaymentActualIn {
  payDate: string;
  amount: number;
  methodId?: number | null;
  note?: string | null;
}

export type SoPaymentActualUpdate = Partial<SoPaymentActualIn>;

export interface SoPaymentActualOut {
  id: number;
  orderId: number;
  payDate: string;
  amount: number;
  methodId: number | null;
  note: string | null;
}

// ---------- Promotion (CTKM) ----------
export interface PromotionDiscountItemOut {
  id: number;
  productId: number;
  totalPct: number;
  companyPct: number | null;
  vendorPct: number | null;
}

export interface PromotionGiftItemOut {
  id: number;
  buyProductId: number;
  giftProductId: number;
  requiredQty: number;
  totalGiftQty: number;
  companyGiftQty: number | null;
  vendorGiftQty: number | null;
}

export interface PromotionOut {
  id: number;
  code: string;
  name: string;
  groupName: string | null;
  dateFrom: string;
  dateTo: string | null;
  sponsor: string | null;
  discountPct: number | null;
  hasGift: boolean;
  note: string | null;
  discountItems: PromotionDiscountItemOut[];
  giftItems: PromotionGiftItemOut[];
}

export interface ApplyPromotionsRequest {
  promotionIds: number[];
}

// ---------- Finance: Há»‡ thá»‘ng tÃ i khoáº£n ----------
export interface AccountOut {
  id: number;
  code: string;
  name: string;
  parentId: number | null;
  accountType: string;
  objectCategoryId: number | null;
  balanceDetail: string;
  balanceSide: string;
  isActive: boolean;
}

export interface AccountCreate {
  code: string;
  name: string;
  parentId?: number | null;
  accountType?: string;
  objectCategoryId?: number | null;
  balanceDetail?: string;
  balanceSide?: string;
}

export interface AccountUpdate {
  name?: string | null;
  parentId?: number | null;
  accountType?: string | null;
  objectCategoryId?: number | null;
  balanceDetail?: string | null;
  balanceSide?: string | null;
  isActive?: boolean | null;
}

// ---------- Finance: Ká»³ káº¿ toÃ¡n ----------
export interface FiscalPeriodOut {
  id: number;
  fiscalYear: number;
  periodNo: number;
  dateFrom: string;
  dateTo: string;
  status: string;
}

// ---------- Finance: Quá»¹ tiá»n ----------
export interface CashFundOut {
  id: number;
  code: string;
  name: string;
  fundType: string;
  accountId: number;
  bankName: string | null;
  accountNo: string | null;
  currencyCode: string;
}

// ---------- Finance: Danh má»¥c Ä‘á»‘i tÆ°á»£ng ----------
export interface ObjectCategoryOut {
  id: number;
  code: string;
  name: string;
  sourceTable: string | null;
}

// ---------- Finance: Nghiá»‡p vá»¥ ----------
export interface BusinessOperationOut {
  id: number;
  code: string;
  name: string;
  voucherType: string;
  template: unknown;
}

// ---------- Finance: Sá»‘ dÆ° Ä‘áº§u ká»³ ----------
export interface OpeningBalanceOut {
  id: number;
  periodId: number;
  accountId: number;
  objectType: string | null;
  objectId: number | null;
  currencyCode: string | null;
  warehouseId: number | null;
  productId: number | null;
  debitFc: number;
  creditFc: number;
  debit: number;
  credit: number;
  quantity: number | null;
}

export interface OpeningBalanceCreate {
  periodId: number;
  accountId: number;
  objectType?: string | null;
  objectId?: number | null;
  currencyCode?: string | null;
  warehouseId?: number | null;
  productId?: number | null;
  debitFc?: number;
  creditFc?: number;
  debit?: number;
  credit?: number;
  quantity?: number | null;
}

// ---------- Finance: LERP (cáº§u ná»‘i SCRM -> káº¿ toÃ¡n) ----------
export interface LerpVoucherOut {
  id: number;
  voucherType: string;
  sourceTable: string;
  sourceId: number;
  refNo: string | null;
  partnerId: number | null;
  amount: number | null;
  status: string;
  voucherId: number | null;
  createdAt: string;
}

// ---------- Finance: Chá»©ng tá»« káº¿ toÃ¡n ----------
export interface VoucherLineOut {
  id: number;
  voucherId: number;
  productId: number | null;
  description: string | null;
  quantity: number | null;
  unitPrice: number | null;
  amount: number;
  vatPct: number | null;
  vatAmount: number | null;
  drAccountId: number | null;
  crAccountId: number | null;
  drObjectId: number | null;
  drObjectType: string | null;
  crObjectId: number | null;
  crObjectType: string | null;
  refVoucherId: number | null;
}

export interface VoucherLineCreate {
  productId?: number | null;
  description?: string | null;
  quantity?: number | null;
  unitPrice?: number | null;
  amount?: number;
  vatPct?: number | null;
  vatAmount?: number | null;
  drAccountId?: number | null;
  crAccountId?: number | null;
  drObjectId?: number | null;
  drObjectType?: string | null;
  crObjectId?: number | null;
  crObjectType?: string | null;
  refVoucherId?: number | null;
}

export interface VoucherOut {
  id: number;
  voucherType: string;
  docNo: string;
  docDate: string;
  postingDate: string | null;
  periodId: number | null;
  operationId: number | null;
  partnerId: number | null;
  fundId: number | null;
  warehouseId: number | null;
  yccType: string | null;
  invoiceNo: string | null;
  currencyCode: string;
  exchangeRate: number;
  totalAmount: number | null;
  totalVat: number | null;
  description: string | null;
  lerpVoucherId: number | null;
  status: string;
  createdBy: number | null;
  createdAt: string;
  lines: VoucherLineOut[];
}

export interface VoucherCreate {
  voucherType: string;
  docNo?: string | null;
  docDate?: string | null;
  postingDate?: string | null;
  periodId?: number | null;
  operationId?: number | null;
  partnerId?: number | null;
  employeeId?: number | null;
  fundId?: number | null;
  warehouseId?: number | null;
  yccType?: string | null;
  invoiceNo?: string | null;
  invoiceSerial?: string | null;
  invoiceForm?: string | null;
  invoiceDate?: string | null;
  currencyCode?: string | null;
  exchangeRate?: number | null;
  description?: string | null;
  lerpVoucherId?: number | null;
  lines?: VoucherLineCreate[];
}

export interface VoucherUpdate {
  description?: string | null;
  status?: string | null;
  invoiceNo?: string | null;
  postingDate?: string | null;
}

// ---------- Finance: Sá»• cÃ¡i ----------
export interface GlEntryOut {
  id: number;
  voucherId: number;
  voucherLineId: number | null;
  accountId: number;
  objectType: string | null;
  objectId: number | null;
  currencyCode: string | null;
  exchangeRate: number | null;
  fcAmount: number;
  amount: number;
  side: string;
  description: string | null;
  postingDate: string | null;
  periodId: number | null;
  createdAt: string;
}

