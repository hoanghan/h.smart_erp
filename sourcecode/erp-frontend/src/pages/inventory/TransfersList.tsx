import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Select, Space, Tag, Typography } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import DataTable from '../../components/DataTable'
import LookupLabel from '../../components/LookupLabel'
import type { StockDocOut } from '../../api/types'
import { STOCK_DOC_STATUS_LABELS, statusColor } from '../../api/workflow'
import { formatDateVN } from '../../utils/format'

export default function TransfersListPage() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<string | undefined>()

  const columns = [
    {
      field: 'docNo', headerText: 'Số phiếu', width: 140,
      template: (r: StockDocOut) => <a onClick={() => navigate(`/inventory/docs/${r.id}`)}>{r.docNo}</a>,
    },
    {
      field: 'fromWarehouseId', headerText: 'Kho xuất', width: 150,
      template: (r: StockDocOut) => <LookupLabel resource="warehouses" id={r.fromWarehouseId} />,
    },
    {
      field: 'toWarehouseId', headerText: 'Kho nhập', width: 150,
      template: (r: StockDocOut) => <LookupLabel resource="warehouses" id={r.toWarehouseId} />,
    },
    {
      field: 'requestDate', headerText: 'Ngày yêu cầu', width: 110,
      template: (r: StockDocOut) => formatDateVN(r.requestDate),
    },
    {
      field: 'actualDate', headerText: 'Ngày thực tế', width: 110,
      template: (r: StockDocOut) => (r.actualDate ? formatDateVN(r.actualDate) : '—'),
    },
    {
      field: 'status', headerText: 'Trạng thái', width: 130,
      template: (r: StockDocOut) => <Tag color={statusColor(r.status)}>{STOCK_DOC_STATUS_LABELS[r.status] ?? r.status}</Tag>,
    },
    { field: 'note', headerText: 'Ghi chú' },
  ]

  return (
    <div>
      <Typography.Title level={3}>Chuyển kho</Typography.Title>
      <DataTable<StockDocOut>
        queryKey="inventory-transfers"
        endpoint="/inventory/docs"
        columns={columns}
        extraParams={{ docType: 'TRANSFER', status }}
        toolbarExtra={
          <Space>
            <Select
              placeholder="Trạng thái"
              allowClear
              style={{ width: 160 }}
              value={status}
              onChange={setStatus}
              options={Object.entries(STOCK_DOC_STATUS_LABELS).map(([value, label]) => ({ value, label }))}
            />
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/inventory/docs/new?docType=TRANSFER&subType=INTERNAL_TRANSFER')}>
              Thêm phiếu chuyển kho
            </Button>
          </Space>
        }
      />
    </div>
  )
}