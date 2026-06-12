import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DatePicker, Space, Table, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../../api/client'
import type { StockMoveOut, PageResult } from '../../api/types'
import LookupSelect from '../../components/LookupSelect'
import LookupLabel from '../../components/LookupLabel'
import { formatNumberVN } from '../../utils/format'
import { formatDateVN } from '../../utils/format'

const { RangePicker } = DatePicker

interface StockMoveRow extends StockMoveOut {
  qtyIn: number | null
  qtyOut: number | null
  runningBalance: number
}

export default function StockMovesPage() {
  const navigate = useNavigate()
  const [productId, setProductId] = useState<number | null>(null)
  const [warehouseId, setWarehouseId] = useState<number | null>(null)
  const [dateRange, setDateRange] = useState<[string, string] | null>(null)

  const shouldFetch = productId != null

  const { data: rawMoves, isLoading } = useQuery({
    queryKey: ['stock-moves', productId, warehouseId, dateRange],
    queryFn: async () => {
      const params: Record<string, unknown> = { productId: productId! }
      if (warehouseId) params.warehouseId = warehouseId
      if (dateRange) {
        params.dateFrom = dateRange[0]
        params.dateTo = dateRange[1]
      }
      const res = await apiClient.get<PageResult<StockMoveOut>>('/inventory/stock-moves', { params })
      return res.data.items
    },
    enabled: shouldFetch,
  })

  // Compute running balance (client-side cumulative sum sorted by date)
  const moves: StockMoveRow[] = useMemo(() => {
    if (!rawMoves) return []
    const sorted = [...rawMoves].sort((a, b) => {
      const dateCompare = (a.moveDate ?? '').localeCompare(b.moveDate ?? '')
      if (dateCompare !== 0) return dateCompare
      return a.id - b.id
    })
    let balance = 0
    return sorted.map((m) => {
      balance += m.qty
      return {
        ...m,
        qtyIn: m.qty > 0 ? m.qty : null,
        qtyOut: m.qty < 0 ? Math.abs(m.qty) : null,
        runningBalance: balance,
      }
    })
  }, [rawMoves])

  const columns: ColumnsType<StockMoveRow> = [
    {
      title: 'Ngày',
      dataIndex: 'moveDate',
      key: 'moveDate',
      width: 110,
      render: formatDateVN,
    },
    {
      title: 'Số phiếu',
      dataIndex: 'docNo',
      key: 'docNo',
      width: 140,
      render: (v: string | null, record) => (
        <a onClick={() => navigate(`/inventory/docs/${record.docId}`)}>{v ?? record.docId}</a>
      ),
    },
    {
      title: 'Loại',
      dataIndex: 'docType',
      key: 'docType',
      width: 100,
      render: (v: string | null) => {
        if (v === 'RECEIPT') return 'Nhập'
        if (v === 'ISSUE') return 'Xuất'
        if (v === 'TRANSFER') return 'Chuyển'
        return v ?? '—'
      },
    },
    {
      title: 'Kho',
      dataIndex: 'warehouseId',
      key: 'warehouseId',
      width: 150,
      render: (v: number) => <LookupLabel resource="warehouses" id={v} />,
    },
    {
      title: 'Lô',
      dataIndex: 'lotId',
      key: 'lotId',
      width: 100,
      render: (v: number | null) => v ? <LookupLabel resource="lots" id={v} /> : '—',
    },
    {
      title: 'SL nhập',
      dataIndex: 'qtyIn',
      key: 'qtyIn',
      width: 100,
      align: 'right',
      render: (v: number | null) => v != null ? (
        <span style={{ color: '#52c41a' }}>{formatNumberVN(v)}</span>
      ) : '—',
    },
    {
      title: 'SL xuất',
      dataIndex: 'qtyOut',
      key: 'qtyOut',
      width: 100,
      align: 'right',
      render: (v: number | null) => v != null ? (
        <span style={{ color: '#ff4d4f' }}>{formatNumberVN(v)}</span>
      ) : '—',
    },
    {
      title: 'Tồn lũy kế',
      dataIndex: 'runningBalance',
      key: 'runningBalance',
      width: 110,
      align: 'right',
      render: (v: number) => <strong>{formatNumberVN(v)}</strong>,
    },
  ]

  return (
    <div>
      <Typography.Title level={3}>Thẻ kho</Typography.Title>
      <Space style={{ marginBottom: 16 }} wrap>
        <span>Sản phẩm:</span>
        <LookupSelect
          resource="products"
          value={productId}
          onChange={setProductId}
          placeholder="Chọn sản phẩm"
        />
        <span>Kho:</span>
        <LookupSelect
          resource="warehouses"
          value={warehouseId}
          onChange={setWarehouseId}
          placeholder="Tất cả kho"
        />
        <span>Khoảng ngày:</span>
        <RangePicker
          format="DD/MM/YYYY"
          onChange={(_, dateStrings) => {
            if (dateStrings[0] && dateStrings[1]) {
              setDateRange([dateStrings[0], dateStrings[1]])
            } else {
              setDateRange(null)
            }
          }}
        />
      </Space>
      {!shouldFetch && (
        <Typography.Text type="secondary">Vui lòng chọn sản phẩm để xem thẻ kho.</Typography.Text>
      )}
      {shouldFetch && (
        <Table<StockMoveRow>
          rowKey="id"
          columns={columns}
          dataSource={moves}
          loading={isLoading}
          pagination={{ pageSize: 50, showTotal: (total) => `${total} bản ghi` }}
          size="small"
          scroll={{ x: 900 }}
        />
      )}
    </div>
  )
}