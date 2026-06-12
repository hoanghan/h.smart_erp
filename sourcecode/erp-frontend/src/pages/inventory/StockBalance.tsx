import { useState } from 'react'
import { Table, Space, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../../api/client'
import type { StockBalanceOut, ProductOut, PageResult } from '../../api/types'
import LookupSelect from '../../components/LookupSelect'
import LookupLabel from '../../components/LookupLabel'
import { formatNumberVN } from '../../utils/format'

type BalanceRow = StockBalanceOut & { _key: string }

export default function StockBalancePage() {
  const [warehouseId, setWarehouseId] = useState<number | null>(null)
  const [productId, setProductId] = useState<number | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['stock-balance', warehouseId, productId],
    queryFn: async () => {
      const params: Record<string, unknown> = {}
      if (warehouseId) params.warehouseId = warehouseId
      if (productId) params.productId = productId
      const res = await apiClient.get<StockBalanceOut[]>('/inventory/stock-balance', { params })
      // Add composite key for table rowKey
      return res.data.map(b => ({ ...b, _key: `${b.productId}-${b.warehouseId}-${b.lotId ?? 'x'}` }))
    },
  })

  // Fetch products to get min_stock for warning
  const { data: products } = useQuery({
    queryKey: ['products-min-stock'],
    queryFn: async () => {
      const res = await apiClient.get<PageResult<ProductOut>>('/md/products', { params: { size: 1000 } })
      return res.data.items
    },
  })

  const productMap = new Map(products?.map((p) => [p.id, p]))

  const columns: ColumnsType<BalanceRow> = [
    {
      title: 'Kho',
      dataIndex: 'warehouseId',
      key: 'warehouseId',
      width: 160,
      render: (v: number) => <LookupLabel resource="warehouses" id={v} />,
    },
    {
      title: 'Sản phẩm',
      dataIndex: 'productId',
      key: 'productId',
      width: 200,
      render: (v: number) => <LookupLabel resource="products" id={v} />,
    },
    {
      title: 'Lô',
      dataIndex: 'lotId',
      key: 'lotId',
      width: 120,
      render: (v: number | null) => v ? <LookupLabel resource="lots" id={v} /> : '—',
    },
    {
      title: 'SL tồn',
      dataIndex: 'qtyOnHand',
      key: 'qtyOnHand',
      width: 120,
      align: 'right',
      render: (v: number, record) => {
        const product = productMap.get(record.productId)
        const isLow = product?.minStock != null && v < product.minStock
        return (
          <span style={isLow ? { color: '#ff4d4f', fontWeight: 600 } : undefined}>
            {formatNumberVN(v)}
          </span>
        )
      },
    },
    {
      title: 'Tồn tối thiểu',
      key: 'minStock',
      width: 120,
      align: 'right',
      render: (_: unknown, record: BalanceRow) => {
        const product = productMap.get(record.productId)
        return product?.minStock != null ? formatNumberVN(product.minStock) : '—'
      },
    },
  ]

  const balances = data ?? []

  return (
    <div>
      <Typography.Title level={3}>Tồn kho</Typography.Title>
      <Space style={{ marginBottom: 16 }}>
        <span>Kho:</span>
        <LookupSelect
          resource="warehouses"
          value={warehouseId}
          onChange={setWarehouseId}
          placeholder="Tất cả kho"
        />
        <span>Sản phẩm:</span>
        <LookupSelect
          resource="products"
          value={productId}
          onChange={setProductId}
          placeholder="Tất cả sản phẩm"
        />
      </Space>
      <Table<BalanceRow>
        rowKey="_key"
        columns={columns}
        dataSource={balances}
        loading={isLoading}
        pagination={{ pageSize: 50, showTotal: (total) => `${total} bản ghi` }}
        size="small"
        scroll={{ x: 720 }}
      />
    </div>
  )
}