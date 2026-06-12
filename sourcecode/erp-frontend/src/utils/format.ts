const numberFormatter = new Intl.NumberFormat('vi-VN')

/** Định dạng số/tiền theo kiểu vi-VN (phân tách hàng nghìn bằng dấu chấm). */
export function formatNumberVN(value: number | null | undefined): string {
  if (value === null || value === undefined) return ''
  return numberFormatter.format(value)
}

/** Định dạng ngày kiểu vi-VN (dd/mm/yyyy) từ chuỗi ISO/DateOnly "yyyy-MM-dd". */
export function formatDateVN(value: string | null | undefined): string {
  if (!value) return ''
  const [y, m, d] = value.slice(0, 10).split('-')
  if (!y || !m || !d) return value
  return `${d}/${m}/${y}`
}
