import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Select, Space, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import DataTable from '../../components/DataTable'
import LookupSelect from '../../components/LookupSelect'
import LookupLabel from '../../components/LookupLabel'
import type { SalesOrderOut } from '../../api/types'
import { SALES_ORDER_STATUS_LABELS, statusColor } from '../../api/workflow'
import { formatDateVN, formatNumberVN } from '../../utils/format'

const ORDER_FORM_LABELS: Record<string, string> = {
  NORMAL: 'Thông thường',
  GIFT: 'Quà tặng',
}

export default function SalesOrdersListPage() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<string | undefined>()
  const [partnerId, setPartnerId] = useState<number | null>(null)

  const columns: ColumnsType<SalesOrderOut> = [
    {
      title: 'Số đơn hàng',
      dataIndex: 'docNo',
      key: 'docNo',
      width: 160,
      render: (v: string, record) => <a onClick={() => navigate(`/sales/orders/${record.id}`)}>{v}</a>,
    },
    { title: 'Ngày', dataIndex: 'docDate', key: 'docDate', width: 110, render: formatDateVN },
    {
      title: 'Khách hàng',
      dataIndex: 'partnerId',
      key: 'partnerId',
      render: (v: number) => <LookupLabel resource="partners" id={v} labelField="shortName" />,
    },
    {
      title: 'Hình thức',
      dataIndex: 'orderForm',
      key: 'orderForm',
      width: 120,
      render: (v: string) => ORDER_FORM_LABELS[v] ?? v,
    },
    {
      title: 'Tổng tiền',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      width: 130,
      align: 'right',
      render: formatNumberVN,
    },
    {
      title: 'VAT',
      dataIndex: 'totalVat',
      key: 'totalVat',
      width: 110,
      align: 'right',
      render: formatNumberVN,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 150,
      render: (v: string) => <Tag color={statusColor(v)}>{SALES_ORDER_STATUS_LABELS[v] ?? v}</Tag>,
    },
  ]

  return (
    <div>
      <Typography.Title level={3}>Đơn hàng bán</Typography.Title>
      <DataTable<SalesOrderOut>
        queryKey="sales-orders"
        endpoint="/sales/orders"
        columns={columns}
        hideSearch
        extraParams={{ status, partnerId: partnerId ?? undefined }}
        toolbarExtra={
          <Space>
            <Select
              placeholder="Trạng thái"
              allowClear
              style={{ width: 200 }}
              value={status}
              onChange={setStatus}
              options={Object.entries(SALES_ORDER_STATUS_LABELS).map(([value, label]) => ({ value, label }))}
            />
            <div style={{ width: 240 }}>
              <LookupSelect resource="partners" labelField="shortName" placeholder="Khách hàng" value={partnerId} onChange={setPartnerId} />
            </div>
          </Space>
        }
      />
    </div>
  )
}
