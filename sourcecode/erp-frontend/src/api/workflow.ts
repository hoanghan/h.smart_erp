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
    { action: 'submit', from: ['DRAFT'], to: 'OPEN' },
    { action: 'make-sales-order', from: ['OPEN'], to: 'ORDERED' },
    { action: 'set-as-lost', from: ['OPEN'], to: 'LOST' },
    { action: 'extend', from: ['EXPIRED'], to: 'OPEN' },
    { action: 'cancel', from: ['DRAFT', 'OPEN'], to: 'CANCELLED', requireReason: true },
    { action: 'amend', from: ['CANCELLED'], to: 'DRAFT' },
  ],
  'sales-orders': [
    { action: 'approve', from: ['DRAFT'], to: 'TO_DELIVER_AND_BILL' },
    { action: 'hold', from: ['TO_DELIVER_AND_BILL', 'TO_DELIVER', 'TO_BILL'], to: 'ON_HOLD', requireReason: true },
    { action: 'resume', from: ['ON_HOLD'], to: 'TO_DELIVER_AND_BILL' },
    { action: 'close', from: ['TO_DELIVER_AND_BILL', 'TO_DELIVER', 'TO_BILL'], to: 'CLOSED', requireReason: true },
    { action: 'reopen', from: ['CLOSED'], to: 'TO_DELIVER_AND_BILL' },
    { action: 'cancel', from: ['DRAFT', 'TO_DELIVER_AND_BILL'], to: 'CANCELLED', requireReason: true },
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
  'request-approval': 'Yêu cầu duyệt',
  approve: 'Duyệt',
  cancel: 'Hủy',
  complete: 'Hoàn tất',
  reprocess: 'Xử lý lại đơn hàng',
  request: 'Yêu cầu',
  confirm: 'Xác nhận',
  submit: 'Gửi báo giá',
  'make-sales-order': 'Tạo đơn hàng',
  'set-as-lost': 'Đánh dấu mất báo giá',
  extend: 'Gia hạn',
  amend: 'Tạo bản sửa đổi',
  hold: 'Tạm giữ',
  resume: 'Tiếp tục',
  close: 'Đóng đơn',
  reopen: 'Mở lại đơn',
  'make-invoice': 'Xuất hóa đơn',
}

/** Hành động chính (nút primary, màu nhấn). */
export const PRIMARY_ACTIONS = new Set(['approve', 'complete', 'request-approval', 'request', 'confirm', 'submit', 'make-sales-order', 'extend', 'amend', 'resume', 'reopen'])
/** Hành động nguy hiểm (nút đỏ). */
export const DANGER_ACTIONS = new Set(['cancel', 'set-as-lost', 'hold', 'close'])

export const QUOTATION_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Nháp',
  OPEN: 'Đang chào giá',
  ORDERED: 'Đã lên đơn',
  LOST: 'Mất báo giá',
  EXPIRED: 'Hết hiệu lực',
  CANCELLED: 'Đã hủy',
}

export const SALES_ORDER_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Nháp',
  TO_DELIVER_AND_BILL: 'Chờ giao & xuất HĐ',
  TO_DELIVER: 'Chờ giao hàng',
  TO_BILL: 'Chờ xuất hóa đơn',
  COMPLETED: 'Hoàn tất',
  ON_HOLD: 'Tạm giữ',
  CLOSED: 'Đã đóng',
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
  DRAFT: 'default',
  OPEN: 'blue',
  LOST: 'red',
  EXPIRED: 'orange',
  APPROVAL_REQUESTED: 'blue',
  APPROVED: 'green',
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
  TO_DELIVER_AND_BILL: 'blue',
  TO_DELIVER: 'orange',
  TO_BILL: 'gold',
  ON_HOLD: 'orange',
  CLOSED: 'default',
}

/** Màu Tag theo nhóm trạng thái: xám (nháp), xanh dương (chờ duyệt), xanh lá (đã duyệt), đỏ (hủy/từ chối/thất bại). */
export function statusColor(status: string): string {
  return STATUS_COLORS[status] ?? 'default'
}
