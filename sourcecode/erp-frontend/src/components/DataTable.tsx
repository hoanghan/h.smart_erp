import { useEffect, useState } from 'react'
import { Input, Table } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../api/client'
import type { PageResult } from '../api/types'

interface DataTableProps<T> {
  /** Khóa cache cho TanStack Query — nên duy nhất theo resource */
  queryKey: string
  /** Đường dẫn API trả về PageResult<T>, vd "/md/products" */
  endpoint: string
  columns: ColumnsType<T>
  rowKey?: string
  /** Tham số lọc cố định gửi kèm mỗi request, vd { status: 'DRAFT' } */
  extraParams?: Record<string, string | number | boolean | undefined>
  searchPlaceholder?: string
  pageSize?: number
  /** Nội dung hiển thị bên phải ô tìm kiếm, vd nút "Thêm mới" */
  toolbarExtra?: React.ReactNode
  /** Ẩn ô tìm kiếm — dùng khi API không hỗ trợ ?q= (chỉ lọc theo extraParams) */
  hideSearch?: boolean
}

/** Bảng dữ liệu dùng chung: phân trang + tìm kiếm phía server theo PageResult{items,total,page,size}. */
export default function DataTable<T extends object>({
  queryKey,
  endpoint,
  columns,
  rowKey = 'id',
  extraParams,
  searchPlaceholder = 'Tìm kiếm...',
  pageSize = 20,
  toolbarExtra,
  hideSearch = false,
}: DataTableProps<T>) {
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(pageSize)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch])

  const { data, isFetching } = useQuery({
    queryKey: [queryKey, page, size, debouncedSearch, extraParams],
    queryFn: async () => {
      const params: Record<string, unknown> = { page, size, ...extraParams }
      if (debouncedSearch) params.q = debouncedSearch
      const res = await apiClient.get<PageResult<T>>(endpoint, { params })
      return res.data
    },
    placeholderData: (prev) => prev,
  })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, gap: 16 }}>
        {hideSearch ? (
          <div />
        ) : (
          <Input.Search
            allowClear
            placeholder={searchPlaceholder}
            style={{ maxWidth: 320 }}
            onChange={(e) => setSearch(e.target.value)}
          />
        )}
        {toolbarExtra}
      </div>
      <Table<T>
        rowKey={rowKey}
        columns={columns}
        dataSource={data?.items ?? []}
        loading={isFetching}
        pagination={{
          current: data?.page ?? page,
          pageSize: data?.size ?? size,
          total: data?.total ?? 0,
          showSizeChanger: true,
          showTotal: (total) => `${total} bản ghi`,
          onChange: (p, s) => {
            setPage(p)
            setSize(s)
          },
        }}
      />
    </div>
  )
}
