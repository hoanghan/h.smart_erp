import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Select, Space, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { PlusOutlined } from '@ant-design/icons'
import DataTable from '../../components/DataTable'
import LookupSelect from '../../components/LookupSelect'
import LookupLabel from '../../components/LookupLabel'
import type { QuotationOut } from '../../api/types'
import { QUOTATION_STATUS_LABELS, statusColor } from '../../api/workflow'
import { formatDateVN } from '../../utils/format'

const QUOTE_TYPE_LABELS: Record<string, string> = {
  NORMAL: 'Thông thường',
  PROJECT: 'Dự án',
}

export default function QuotationsListPage() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<string | undefined>()
  const [partnerId, setPartnerId] = useState<number | null>(null)

  const columns: ColumnsType<QuotationOut> = [
    {
      title: 'Số báo giá',
      dataIndex: 'docNo',
      key: 'docNo',
      width: 160,
      render: (v: string, record) => <a onClick={() => navigate(`/sales/quotations/${record.id}`)}>{v}</a>,
    },
    { title: 'Ngày', dataIndex: 'docDate', key: 'docDate', width: 110, render: formatDateVN },
    {
      title: 'Khách hàng',
      dataIndex: 'partnerId',
      key: 'partnerId',
      render: (v: number) => <LookupLabel resource="partners" id={v} labelField="shortName" />,
    },
    {
      title: 'Loại BG',
      dataIndex: 'quoteType',
      key: 'quoteType',
      width: 130,
      render: (v: string) => QUOTE_TYPE_LABELS[v] ?? v,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 170,
      render: (v: string) => <Tag color={statusColor(v)}>{QUOTATION_STATUS_LABELS[v] ?? v}</Tag>,
    },
  ]

  return (
    <div>
      <Typography.Title level={3}>Báo giá</Typography.Title>
      <DataTable<QuotationOut>
        queryKey="sales-quotations"
        endpoint="/sales/quotations"
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
