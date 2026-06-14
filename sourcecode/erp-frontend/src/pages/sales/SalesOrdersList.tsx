import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Select, Space, Tag, Typography } from 'antd'
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

  const columns = [
    {
      field: 'docNo', headerText: 'Số đơn hàng', width: 160,
      template: (r: SalesOrderOut) => <a onClick={() => navigate(`/sales/orders/${r.id}`)}>{r.docNo}</a>,
    },
    {
      field: 'docDate', headerText: 'Ngày', width: 110,
      template: (r: SalesOrderOut) => formatDateVN(r.docDate),
    },
    {
      field: 'partnerId', headerText: 'Khách hàng',
      template: (r: SalesOrderOut) => <LookupLabel resource="partners" id={r.partnerId} labelField="shortName" />,
    },
    {
      field: 'orderForm', headerText: 'Hình thức', width: 120,
      template: (r: SalesOrderOut) => ORDER_FORM_LABELS[r.orderForm] ?? r.orderForm,
    },
    {
      field: 'totalAmount', headerText: 'Tổng tiền', width: 130, textAlign: 'Right',
      template: (r: SalesOrderOut) => formatNumberVN(r.totalAmount),
    },
    {
      field: 'totalVat', headerText: 'VAT', width: 110, textAlign: 'Right',
      template: (r: SalesOrderOut) => formatNumberVN(r.totalVat),
    },
    {
      field: 'status', headerText: 'Trạng thái', width: 150,
      template: (r: SalesOrderOut) => <Tag color={statusColor(r.status)}>{SALES_ORDER_STATUS_LABELS[r.status] ?? r.status}</Tag>,
    },
  ]

  return (
    <div>
      <Typography.Title level={3}>Đơn hàng bán</Typography.Title>
      <DataTable<SalesOrderOut>
        queryKey="sales-orders"
        endpoint="/sales/orders"
        columns={columns}
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
