import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Select, Space, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { PlusOutlined } from '@ant-design/icons'
import DataTable from '../../components/DataTable'
import LookupLabel from '../../components/LookupLabel'
import type { StockDocOut } from '../../api/types'
import { STOCK_DOC_STATUS_LABELS, statusColor } from '../../api/workflow'
import { formatDateVN } from '../../utils/format'

export default function TransfersListPage() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<string | undefined>()

  const columns: ColumnsType<StockDocOut> = [
    {
      title: 'Số phiếu',
      dataIndex: 'docNo',
      key: 'docNo',
      width: 140,
      render: (v: string, record) => <a onClick={() => navigate(`/inventory/docs/${record.id}`)}>{v}</a>,
    },
    {
      title: 'Kho xuất',
      dataIndex: 'fromWarehouseId',
      key: 'fromWarehouseId',
      width: 150,
      render: (v: number | null) => <LookupLabel resource="warehouses" id={v} />,
    },
    {
      title: 'Kho nhập',
      dataIndex: 'toWarehouseId',
      key: 'toWarehouseId',
      width: 150,
      render: (v: number | null) => <LookupLabel resource="warehouses" id={v} />,
    },
    {
      title: 'Ngày yêu cầu',
      dataIndex: 'requestDate',
      key: 'requestDate',
      width: 110,
      render: formatDateVN,
    },
    {
      title: 'Ngày thực tế',
      dataIndex: 'actualDate',
      key: 'actualDate',
      width: 110,
      render: (v: string | null) => (v ? formatDateVN(v) : '—'),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (v: string) => <Tag color={statusColor(v)}>{STOCK_DOC_STATUS_LABELS[v] ?? v}</Tag>,
    },
    {
      title: 'Ghi chú',
      dataIndex: 'note',
      key: 'note',
      ellipsis: true,
    },
  ]

  return (
    <div>
      <Typography.Title level={3}>Chuyển kho</Typography.Title>
      <DataTable<StockDocOut>
        queryKey="inventory-transfers"
        endpoint="/inventory/docs"
        columns={columns}
        hideSearch
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