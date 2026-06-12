import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Select, Space, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { PlusOutlined } from '@ant-design/icons'
import DataTable from '../../components/DataTable'
import LookupLabel from '../../components/LookupLabel'
import type { PurchaseRequestOut } from '../../api/types'
import { PURCHASE_REQUEST_STATUS_LABELS, statusColor } from '../../api/workflow'
import { formatDateVN } from '../../utils/format'

export default function PurchaseRequestsListPage() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<string | undefined>()

  const columns: ColumnsType<PurchaseRequestOut> = [
    {
      title: 'Số YC',
      dataIndex: 'docNo',
      key: 'docNo',
      width: 160,
      render: (v: string, record) => <a onClick={() => navigate(`/purchasing/requests/${record.id}`)}>{v}</a>,
    },
    { title: 'Ngày', dataIndex: 'docDate', key: 'docDate', width: 110, render: formatDateVN },
    {
      title: 'Người yêu cầu',
      dataIndex: 'requesterId',
      key: 'requesterId',
      render: (v: number | null) => <LookupLabel resource="employees" id={v} labelField="fullName" />,
    },
    {
      title: 'Bộ phận',
      dataIndex: 'departmentId',
      key: 'departmentId',
      render: (v: number | null) => <LookupLabel resource="departments" id={v} />,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 150,
      render: (v: string) => <Tag color={statusColor(v)}>{PURCHASE_REQUEST_STATUS_LABELS[v] ?? v}</Tag>,
    },
  ]

  return (
    <div>
      <Typography.Title level={3}>Yêu cầu mua hàng</Typography.Title>
      <DataTable<PurchaseRequestOut>
        queryKey="purchase-requests"
        endpoint="/purchasing/requests"
        columns={columns}
        hideSearch
        extraParams={{ status }}
        toolbarExtra={
          <Space>
            <Select
              placeholder="Trạng thái"
              allowClear
              style={{ width: 200 }}
              value={status}
              onChange={setStatus}
              options={Object.entries(PURCHASE_REQUEST_STATUS_LABELS).map(([value, label]) => ({ value, label }))}
            />
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/purchasing/requests/new')}>
              Tạo mới
            </Button>
          </Space>
        }
      />
    </div>
  )
}
