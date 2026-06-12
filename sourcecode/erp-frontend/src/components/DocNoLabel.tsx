import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../api/client'

interface DocNoLabelProps {
  /** Đường dẫn API của bản ghi nguồn, vd "/purchasing/orders" -> GET {endpoint}/{id} */
  endpoint: string
  id: number | null | undefined
}

/** Hiển thị số chứng từ (docNo) của một bản ghi tham chiếu (PO, đơn hàng...), dùng trong bảng/lưới. */
export default function DocNoLabel({ endpoint, id }: DocNoLabelProps) {
  const { data } = useQuery({
    queryKey: ['doc-no', endpoint, id],
    queryFn: async () => (await apiClient.get<{ docNo: string }>(`${endpoint}/${id}`)).data,
    enabled: id !== null && id !== undefined,
    staleTime: 5 * 60 * 1000,
  })

  if (id === null || id === undefined) return null
  if (!data) return <span>...</span>

  return <span>{data.docNo}</span>
}
