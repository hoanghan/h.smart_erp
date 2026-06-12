// Nhãn & nhóm hằng số dùng cho module Kế toán — khớp với CHECK constraint ở data_model.sql
// và FinanceDtos.cs ở backend.

export const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  ASSET: 'Tài sản',
  LIABILITY: 'Nợ phải trả',
  EQUITY: 'Vốn chủ sở hữu',
  REVENUE: 'Doanh thu',
  EXPENSE: 'Chi phí',
  OFF_BALANCE: 'Ngoài bảng',
  NORMAL: 'Thông thường',
}

export const BALANCE_DETAIL_LABELS: Record<string, string> = {
  NONE: 'Không',
  OBJECT: 'Theo đối tượng',
  OBJECT_FX: 'Theo đối tượng + ngoại tệ',
  OBJECT_QTY: 'Theo đối tượng + số lượng',
}

export const BALANCE_SIDE_LABELS: Record<string, string> = {
  NONE: 'Không',
  DEBIT: 'Dư Nợ',
  CREDIT: 'Dư Có',
  GREATER: 'Dư Nợ/Có lớn hơn',
  BOTH: 'Cả hai bên',
}

export const FISCAL_PERIOD_STATUS_LABELS: Record<string, string> = {
  OPEN: 'Đang mở',
  CLOSED: 'Đã khóa',
}

export const LERP_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Chờ xử lý',
  GENERATED: 'Đã phát sinh',
  POSTED: 'Đã ghi sổ',
  DELETED: 'Đã xóa',
}

export const LERP_VOUCHER_TYPE_LABELS: Record<string, string> = {
  YCT: 'Yêu cầu thu',
  YCC: 'Yêu cầu chi',
  BAN_HANG: 'Bán hàng',
  HANG_TRA_LAI: 'Hàng bán trả lại',
  PHIEU_XUAT: 'Phiếu xuất',
  MUA_HANG: 'Mua hàng',
  PHIEU_NHAP: 'Phiếu nhập',
  TRA_HANG_NCC: 'Trả hàng NCC',
  XUAT_KHO: 'Xuất kho',
  NHAP_KHO: 'Nhập kho',
  CHUYEN_KHO: 'Chuyển kho',
  PGC: 'PGC',
}

/** Nhóm tab cho màn LERP — mỗi tab gom 1+ voucher_type của lerp_voucher. */
export const LERP_TABS: { key: string; label: string; types: string[] }[] = [
  { key: 'ALL', label: 'Tất cả', types: [] },
  { key: 'YCC', label: 'YCC', types: ['YCC'] },
  { key: 'YCT', label: 'YCT', types: ['YCT'] },
  { key: 'XUAT', label: 'Phiếu xuất', types: ['PHIEU_XUAT', 'XUAT_KHO'] },
  { key: 'NHAP', label: 'Phiếu nhập', types: ['PHIEU_NHAP', 'NHAP_KHO'] },
  { key: 'TRA_HANG', label: 'Trả hàng', types: ['TRA_HANG_NCC', 'HANG_TRA_LAI'] },
  { key: 'CHUYEN_KHO', label: 'Chuyển kho', types: ['CHUYEN_KHO'] },
  { key: 'PGC', label: 'PGC', types: ['PGC'] },
]

export const VOUCHER_TYPE_LABELS: Record<string, string> = {
  PHIEU_THU: 'Phiếu thu',
  PHIEU_CHI: 'Phiếu chi',
  CHUYEN_TIEN: 'Chuyển tiền',
  YEU_CAU_CHI: 'Yêu cầu chi',
  YEU_CAU_THU: 'Yêu cầu thu',
  HOA_DON_BAN: 'Hóa đơn bán',
  HANG_BAN_TRA_LAI: 'Hàng bán trả lại',
  PHIEU_GHI_NO: 'Phiếu ghi nợ',
  PHIEU_MUA_HANG: 'Phiếu mua hàng',
  TRA_HANG_NCC: 'Trả hàng NCC',
  PHIEU_GHI_CO: 'Phiếu ghi có',
  PHIEU_XUAT_KT: 'Phiếu xuất kế toán',
  PHIEU_NHAP_KT: 'Phiếu nhập kế toán',
  DIEU_CHUYEN_KT: 'Điều chuyển kế toán',
  CT_GIAM_GIA: 'CT giảm giá',
  CT_KHAU_HAO: 'CT khấu hao',
  CT_PHAN_BO: 'CT phân bổ',
  CT_KET_CHUYEN: 'CT kết chuyển',
  CT_TONG_HOP: 'CT tổng hợp',
}

export const VOUCHER_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Nháp',
  APPROVED: 'Đã duyệt',
  POSTED: 'Đã ghi sổ',
  UNLOCKED: 'Đã mở khóa',
  CANCELLED: 'Đã hủy',
}

export const GL_SIDE_LABELS: Record<string, string> = {
  DEBIT: 'Nợ',
  CREDIT: 'Có',
  D: 'Nợ',
  C: 'Có',
}

/** GlEntry.side có thể là "DEBIT"/"CREDIT" (entity) hoặc "D"/"C" (CHECK constraint DB). */
export function isDebitSide(side: string): boolean {
  return side === 'DEBIT' || side === 'D'
}
