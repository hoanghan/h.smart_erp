import { useState } from 'react'
import { Input, Select, Space, Table, Tag, Typography } from 'antd'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../../api/client'
import type { BusinessOperationOut } from '../../api/types'
import { VOUCHER_TYPE_LABELS } from '../../api/finance'

interface OpTemplateLine {
  drAccountCode?: string
  crAccountCode?: string
  amountExpr?: string
  drObjectRequired?: boolean
  crObjectRequired?: boolean
  description?: string
}

const VOUCHER_TYPES = Object.keys(VOUCHER_TYPE_LABELS).map((k) => ({
  value: k,
  label: VOUCHER_TYPE_LABELS[k],
}))

/** Trang danh sách Nghiệp vụ (read-only — backend hiện chỉ có GET). */
export default function OperationsPage() {
  const [filterType, setFilterType] = useState<string>('')
  const [search, setSearch] = useState('')

  const queryKey = ['finance-business-operations']
  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const res = await apiClient.get<BusinessOperationOut[]>('/finance/business-operations')
      return res.data
    },
  })

  const filtered = (data ?? [])
    .filter((o) => (filterType ? o.voucherType === filterType : true))
    .filter((o) =>
      search ? `${o.code} ${o.name}`.toLowerCase().includes(search.toLowerCase()) : true,
    )

  const columns = [
    { title: 'Mã', dataIndex: 'code', key: 'code', width: 100 },
    { title: 'Tên nghiệp vụ', dataIndex: 'name', key: 'name' },
    {
      title: 'Loại phiếu',
      dataIndex: 'voucherType',
      key: 'voucherType',
      width: 160,
      render: (t: string) => <Tag>{VOUCHER_TYPE_LABELS[t] ?? t}</Tag>,
    },
    {
      title: 'Số dòng mẫu',
      key: 'lineCount',
      width: 110,
      render: (_: unknown, r: BusinessOperationOut) =>
        Array.isArray(r.template) ? (r.template as OpTemplateLine[]).length : 0,
    },
  ]

  return (
    <div>
      <Typography.Title level={3}>Nghiệp vụ định khoản</Typography.Title>
      <Typography.Text type="secondary">
        Mẫu định khoản tự động cho phiếu thu / chi / tổng hợp. Danh sách tham chiếu khi tạo phiếu.
      </Typography.Text>

      <Space style={{ marginTop: 16, marginBottom: 16, width: '100%' }}>
        <Select
          placeholder="Lọc theo loại phiếu"
          allowClear
          style={{ width: 250 }}
          options={VOUCHER_TYPES}
          value={filterType || undefined}
          onChange={(v) => setFilterType(v ?? '')}
        />
        <Input.Search
          placeholder="Tìm theo mã / tên..."
          allowClear
          style={{ width: 300 }}
          onSearch={setSearch}
        />
      </Space>

      <Table
        rowKey="id"
        loading={isLoading}
        dataSource={filtered}
        columns={columns}
        pagination={{ pageSize: 20, showTotal: (t) => `Tổng: ${t}` }}
        size="small"
        expandable={{
          expandedRowRender: (r) => {
            const tpl = (r.template as OpTemplateLine[]) ?? []
            if (!tpl.length)
              return <Typography.Text type="secondary">Không có mẫu</Typography.Text>
            return (
              <Table
                rowKey={(_, i) => String(i)}
                dataSource={tpl}
                pagination={false}
                size="small"
                columns={[
                  { title: 'TK Nợ', dataIndex: 'drAccountCode', width: 100 },
                  { title: 'TK Có', dataIndex: 'crAccountCode', width: 100 },
                  { title: 'Biểu thức', dataIndex: 'amountExpr', width: 120 },
                  { title: 'Diễn giải', dataIndex: 'description' },
                ]}
              />
            )
          },
        }}
      />
    </div>
  )
}