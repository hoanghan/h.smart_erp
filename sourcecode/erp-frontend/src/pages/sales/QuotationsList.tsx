import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Select, Space, Tag, Typography } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import DataTable from '../../components/DataTable'
import LookupSelect from '../../components/LookupSelect'
import LookupLabel from '../../components/LookupLabel'
import type { QuotationOut } from '../../api/types'
import { QUOTATION_STATUS_LABELS, statusColor } from '../../api/workflow'
import { formatDateVN } from '../../utils/format'

const ORDER_TYPE_LABELS: Record<string, string> = {
  SALES: 'Bán hàng',
  MAINTENANCE: 'Bảo trì',
  SHOPPING_CART: 'Đặt hàng online',
}

export default function QuotationsListPage() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<string | undefined>()
  const [partnerId, setPartnerId] = useState<number | null>(null)

  const columns = [
    {
      field: 'docNo', headerText: 'Số báo giá', width: 160,
      template: (r: QuotationOut) => <a onClick={() => navigate(`/sales/quotations/${r.id}`)}>{r.docNo}</a>,
    },
    {
      field: 'docDate', headerText: 'Ngày', width: 110,
      template: (r: QuotationOut) => formatDateVN(r.docDate),
    },
    {
      field: 'partnerId', headerText: 'Khách hàng',
      template: (r: QuotationOut) => <LookupLabel resource="partners" id={r.partnerId} labelField="shortName" />,
    },
    {
      field: 'orderType', headerText: 'Loại đơn', width: 130,
      template: (r: QuotationOut) => ORDER_TYPE_LABELS[r.orderType] ?? r.orderType,
    },
    {
      field: 'validTill', headerText: 'Hiệu lực đến', width: 110,
      template: (r: QuotationOut) => formatDateVN(r.validTill),
    },
    {
      field: 'status', headerText: 'Trạng thái', width: 150,
      template: (r: QuotationOut) => <Tag color={statusColor(r.status)}>{QUOTATION_STATUS_LABELS[r.status] ?? r.status}</Tag>,
    },
  ]

  return (
    <div>
      <Typography.Title level={3}>Báo giá</Typography.Title>
      <DataTable<QuotationOut>
        queryKey="sales-quotations"
        endpoint="/sales/quotations"
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
              options={Object.entries(QUOTATION_STATUS_LABELS).map(([value, label]) => ({ value, label }))}
            />
            <div style={{ width: 240 }}>
              <LookupSelect resource="partners" labelField="shortName" placeholder="Khách hàng" value={partnerId} onChange={setPartnerId} />
            </div>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/sales/quotations/new')}>
              Tạo mới
            </Button>
          </Space>
        }
      />
    </div>
  )
}
