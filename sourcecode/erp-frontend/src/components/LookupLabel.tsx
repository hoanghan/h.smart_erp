import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../api/client'
import type { LookupItem } from '../api/types'

interface LookupLabelProps {
  /** Tên resource danh mục, vd "products" -> GET /md/products/{id} */
  resource: string
  id: number | null | undefined
  /** Trường hiển thị làm nhãn ngoài "code", mặc định "name" */
  labelField?: 'name' | 'fullName' | 'shortName'
}

/** Hiển thị "code — tên" cho một id danh mục, dùng trong bảng/lưới (cache theo TanStack Query). */
export default function LookupLabel({ resource, id, labelField = 'name' }: LookupLabelProps) {
  const { data } = useQuery({
    queryKey: ['lookup', resource, id],
    queryFn: async () => (await apiClient.get<LookupItem>(`/md/${resource}/${id}`)).data,
    enabled: id !== null && id !== undefined,
    staleTime: 5 * 60 * 1000,
  })

  if (id === null || id === undefined) return null
  if (!data) return <span>...</span>

  const text = data[labelField] ?? data.name ?? data.fullName ?? data.shortName ?? ''
  return <span>{text ? `${data.code} — ${text}` : data.code}</span>
}
