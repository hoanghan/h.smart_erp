// Định nghĩa luồng trạng thái — khớp với Erp.Api.Core.WorkflowService.Definitions ở backend.
// Dùng để WorkflowBar biết hành động nào khả dụng theo trạng thái hiện tại.

export interface WfTransition {
  action: string;
  from: string[];
  to: string;
  requireReason?: boolean;
}

export const WF_DEFINITIONS: Record<string, WfTransition[]> = {
  quotations: [
    { action: 'request-pricing', from: ['NEW'], to: 'PRICE_REQUESTED' },
    { action: 'start-pricing', from: ['PRICE_REQUESTED'], to: 'PRICING' },
    { action: 'request-approval', from: ['NEW', 'PRICE_REQUESTED', 'PRICING'], to: 'APPROVAL_REQUESTED' },
    { action: 'approve', from: ['APPROVAL_REQUESTED'], to: 'APPROVED' },
    { action: 'reject', from: ['PRICE_REQUESTED', 'PRICING', 'APPROVAL_REQUESTED'], to: 'REJECTED', requireReason: true },
    { action: 'mark-order-pending', from: ['APPROVED'], to: 'ORDER_PENDING' },
    { action: 'convert-to-order', from: ['APPROVED', 'ORDER_PENDING'], to: 'ORDERED' },
    { action: 'mark-failed', from: ['APPROVED', 'ORDER_PENDING'], to: 'FAILED', requireReason: true },
    { action: 'cancel', from: ['NEW', 'PRICE_REQUESTED', 'PRICING', 'APPROVAL_REQUESTED', 'APPROVED', 'ORDER_PENDING'], to: 'CANCELLED', requireReason: true },
  ],
  'sales-orders': [
    { action: 'request-approval', from: ['DRAFT'], to: 'APPROVAL_REQUESTED' },
    { action: 'approve', from: ['APPROVAL_REQUESTED'], to: 'APPROVED' },
    { action: 'complete', from: ['APPROVED', 'NOT_DELIVERED', 'DELIVERED'], to: 'COMPLETED' },
    { action: 'reprocess', from: ['APPROVED', 'NOT_DELIVERED'], to: 'DRAFT' },
    { action: 'cancel', from: ['DRAFT', 'APPROVAL_REQUESTED', 'APPROVED'], to: 'CANCELLED', requireReason: true },
  ],
  'purchase-requests': [
    { action: 'approve', from: ['DRAFT'], to: 'APPROVED' },
    { action: 'cancel', from: ['DRAFT'], to: 'CANCELLED', requireReason: true },
  ],
  // Lưu ý: "create-receipt-request" KHÔNG khai báo ở đây — endpoint của nó yêu cầu body
  // CreateStockDocRequest (warehouseId) nên được xử lý bằng nút riêng ở tab "Nhận hàng".
  'purchase-orders': [
    { action: 'approve', from: ['DRAFT'], to: 'APPROVED' },
    { action: 'complete', from: ['APPROVED', 'NOT_RECEIVED', 'RECEIVED'], to: 'COMPLETED' },
    { action: 'cancel', from: ['DRAFT', 'APPROVED'], to: 'CANCELLED', requireReason: true },
  ],
  'po-payments': [
    { action: 'approve', from: ['DRAFT'], to: 'APPROVED' },
    { action: 'cancel', from: ['DRAFT'], to: 'CANCELLED', requireReason: true },
  ],
  'supplier-returns': [
    { action: 'approve', from: ['DRAFT'], to: 'APPROVED' },
    { action: 'cancel', from: ['DRAFT'], to: 'CANCELLED', requireReason: true },
  ],
  'stock-docs': [
    { action: 'request', from: ['DRAFT'], to: 'REQUESTED' },
    { action: 'confirm', from: ['REQUESTED'], to: 'CONFIRMED' },
    { action: 'complete', from: ['CONFIRMED'], to: 'COMPLETED' },
    { action: 'cancel', from: ['DRAFT', 'REQUESTED', 'CONFIRMED'], to: 'CANCELLED', requireReason: true },
  ],
}

export const ACTION_LABELS: Record<string, string> = {
  'request-pricing': 'Yêu cầu tính giá',
  'start-pricing': 'Bắt đầu định giá',
  'request-approval': 'Yêu cầu duyệt',
  approve: 'Duyệt',
  reject: 'Từ chối',
  'mark-order-pending': 'Chờ lên đơn',
  'convert-to-order': 'Chuyển đơn hàng',
  'mark-failed': 'Đánh dấu thất bại',
  cancel: 'Hủy',
  complete: 'Hoàn tất',
  reprocess: 'Xử lý lại đơn hàng',
  request: 'Yêu cầu',
  confirm: 'Xác nhận',
}

/** Hành động chính (nút primary, màu nhấn). */
export const PRIMARY_ACTIONS = new Set(['approve', 'convert-to-order', 'complete', 'request-approval', 'request-pricing', 'start-pricing', 'mark-order-pending', 'request', 'confirm'])
/** Hành động nguy hiểm (nút đỏ). */
export const DANGER_ACTIONS = new Set(['cancel', 'reject', 'mark-failed'])

export const QUOTATION_STATUS_LABELS: Record<string, string> = {
  NEW: 'Mới',
  PRICE_REQUESTED: 'Đã yêu cầu báo giá',
  PRICING: 'Đang định giá',
  APPROVAL_REQUESTED: 'Chờ duyệt',
  APPROVED: 'Đã duyệt',
  ORDER_PENDING: 'Chờ lên đơn',
  ORDERED: 'Đã lên đơn',
  FAILED: 'Thất bại',
  CANCELLED: 'Đã hủy',
  REJECTED: 'Từ chối',
}

export const SALES_ORDER_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Nháp',
  APPROVAL_REQUESTED: 'Chờ duyệt',
  APPROVED: 'Đã duyệt',
  NOT_DELIVERED: 'Chưa giao hàng',
  DELIVERED: 'Đã giao hàng',
  COMPLETED: 'Hoàn tất',
  CANCELLED: 'Đã hủy',
}

export const PURCHASE_REQUEST_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Nháp',
  APPROVED: 'Đã duyệt',
  CANCELLED: 'Đã hủy',
}

export const PURCHASE_ORDER_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Nháp',
  APPROVED: 'Đã duyệt',
  NOT_RECEIVED: 'Chưa nhận hàng',
  RECEIVED: 'Đã nhận hàng',
  COMPLETED: 'Hoàn tất',
  CANCELLED: 'Đã hủy',
}

export const PO_PAYMENT_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Nháp',
  APPROVED: 'Đã duyệt',
  SENT_FRM: 'Đã chuyển FRM',
  CANCELLED: 'Đã hủy',
}

export const SUPPLIER_RETURN_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Nháp',
  APPROVED: 'Đã duyệt',
  CANCELLED: 'Đã hủy',
}

export const STOCK_DOC_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Nháp',
  REQUESTED: 'Đã yêu cầu',
  CONFIRMED: 'Đã xác nhận',
  COMPLETED: 'Hoàn tất',
  CANCELLED: 'Đã hủy',
}

const STATUS_COLORS: Record<string, string> = {
  NEW: 'default',
  DRAFT: 'default',
  PRICE_REQUESTED: 'default',
  PRICING: 'default',
  APPROVAL_REQUESTED: 'blue',
  APPROVED: 'green',
  ORDER_PENDING: 'green',
  ORDERED: 'green',
  NOT_RECEIVED: 'orange',
  RECEIVED: 'blue',
  NOT_DELIVERED: 'green',
  DELIVERED: 'green',
  SENT_FRM: 'blue',
  REQUESTED: 'blue',
  CONFIRMED: 'orange',
  COMPLETED: 'green',
  CANCELLED: 'red',
  REJECTED: 'red',
  FAILED: 'red',
}

/** Màu Tag theo nhóm trạng thái: xám (nháp), xanh dương (chờ duyệt), xanh lá (đã duyệt), đỏ (hủy/từ chối/thất bại). */
export function statusColor(status: string): string {
  return STATUS_COLORS[status] ?? 'default'
}
