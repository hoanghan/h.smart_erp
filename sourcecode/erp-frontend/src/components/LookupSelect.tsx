import { useEffect, useRef, useState } from 'react'
import { Select } from 'antd'
import type { SelectProps } from 'antd'
import { apiClient } from '../api/client'
import type { LookupItem, PageResult } from '../api/types'

interface LookupSelectProps {
  /** Tên resource danh mục, vd "uoms" -> GET /md/uoms */
  resource: string
  /** Ghi đè endpoint mặc định "/md/{resource}" (vd "/sales/price-lists") */
  endpoint?: string
  value?: number | null
  onChange?: (value: number | null) => void
  placeholder?: string
  allowClear?: boolean
  /** Trường hiển thị làm nhãn ngoài "code", mặc định "name" */
  labelField?: 'name' | 'fullName' | 'shortName'
  /** Loại bỏ một id khỏi danh sách (vd không cho chọn chính nó làm cha) */
  excludeId?: number
  disabled?: boolean
}

function labelOf(item: LookupItem, labelField: 'name' | 'fullName' | 'shortName'): string {
  const text = item[labelField] ?? item.name ?? item.fullName ?? item.shortName ?? ''
  return text ? `${item.code} — ${text}` : item.code
}

/** Select AntD tìm kiếm từ xa theo ?q=, hiển thị "code — tên". */
export default function LookupSelect({
  resource,
  endpoint,
  value,
  onChange,
  placeholder = 'Tìm kiếm...',
  allowClear = true,
  labelField = 'name',
  excludeId,
  disabled,
}: LookupSelectProps) {
  const base = endpoint ?? `/md/${resource}`
  const [options, setOptions] = useState<{ value: number; label: string }[]>([])
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Tải nhãn cho giá trị hiện có (vd khi mở form sửa) nếu chưa có trong options.
  useEffect(() => {
    if (value === null || value === undefined) return
    if (options.some((o) => o.value === value)) return
    let cancelled = false
    apiClient.get<LookupItem>(`${base}/${value}`).then((res) => {
      if (cancelled) return
      const item = res.data
      setOptions((prev) =>
        prev.some((o) => o.value === item.id)
          ? prev
          : [...prev, { value: item.id, label: labelOf(item, labelField) }],
      )
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base, value])

  const search = (q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await apiClient.get<PageResult<LookupItem>>(base, {
          params: { q: q || undefined, size: 20 },
        })
        const items = res.data.items
          .filter((item) => item.id !== excludeId)
          .map((item) => ({ value: item.id, label: labelOf(item, labelField) }))
        setOptions(items)
      } finally {
        setLoading(false)
      }
    }, 300)
  }

  useEffect(() => {
    search('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base])

  const handleChange: SelectProps['onChange'] = (val) => {
    onChange?.(val === undefined ? null : (val as number))
  }

  return (
    <Select
      showSearch
      allowClear={allowClear}
      disabled={disabled}
      placeholder={placeholder}
      filterOption={false}
      loading={loading}
      value={value ?? undefined}
      options={options}
      onSearch={search}
      onChange={handleChange}
    />
  )
}
