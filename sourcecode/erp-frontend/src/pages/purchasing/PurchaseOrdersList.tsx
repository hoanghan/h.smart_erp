import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Select, Space, Tag, Typography } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import DataTable from '../../components/DataTable'
import LookupSelect from '../../components/LookupSelect'
import LookupLabel from '../../components/LookupLabel'
import type { PurchaseOrderOut } from '../../api/types'
import { PURCHASE_ORDER_STATUS_LABELS, statusColor } from '../../api/workflow'
import { formatDateVN, formatNumberVN } from '../../utils/format'

export const ORDER_FORM_LABELS: Record<string, string> = {
  NORMAL: 'Thông thường',
  SERVICE: 'Dịch vụ',
  OUTSOURCING: 'Gia công',
}

export default function PurchaseOrdersListPage() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<string | undefined>()
  const [partnerId, setPartnerId] = useState<number | null>(null)

  const columns = [
    {
      field: 'docNo', headerText: 'Số PO', width: 160,
      template: (r: PurchaseOrderOut) => <a onClick={() => navigate(`/purchasing/orders/${r.id}`)}>{r.docNo}</a>,
    },
    {
      field: 'orderDate', headerText: 'Ngày đặt', width: 110,
      template: (r: PurchaseOrderOut) => formatDateVN(r.orderDate),
    },
    {
      field: 'partnerId', headerText: 'Nhà cung cấp',
      template: (r: PurchaseOrderOut) => <LookupLabel resource="partners" id={r.partnerId} labelField="shortName" />,
    },
    {
      field: 'orderForm', headerText: 'Hình thức', width: 120,
      template: (r: PurchaseOrderOut) => ORDER_FORM_LABELS[r.orderForm] ?? r.orderForm,
    },
    {
      field: 'totalAmount', headerText: 'Tổng tiền', width: 130, textAlign: 'Right',
      template: (r: PurchaseOrderOut) => formatNumberVN(r.totalAmount),
    },
    {
      field: 'totalVat', headerText: 'VAT', width: 110, textAlign: 'Right',
      template: (r: PurchaseOrderOut) => formatNumberVN(r.totalVat),
    },
    {
      field: 'status', headerText: 'Trạng thái', width: 150,
      template: (r: PurchaseOrderOut) => <Tag color={statusColor(r.status)}>{PURCHASE_ORDER_STATUS_LABELS[r.status] ?? r.status}</Tag>,
    },
  ]

  return (
    <div>
      <Typography.Title level={3}>Đơn hàng mua</Typography.Title>
      <DataTable<PurchaseOrderOut>
        queryKey="purchase-orders"
        endpoint="/purchasing/orders"
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
              options={Object.entries(PURCHASE_ORDER_STATUS_LABELS).map(([value, label]) => ({ value, label }))}
            />
            <div style={{ width: 240 }}>
              <LookupSelect resource="partners" labelField="shortName" placeholder="Nhà cung cấp" value={partnerId} onChange={setPartnerId} />
            </div>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/purchasing/orders/new')}>
              Tạo mới
            </Button>
          </Space>
        }
      />
    </div>
  )
}
