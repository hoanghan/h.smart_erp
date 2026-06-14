import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Select, Space, Tag, Typography } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import DataTable from '../../components/DataTable'
import LookupLabel from '../../components/LookupLabel'
import type { PurchaseRequestOut } from '../../api/types'
import { PURCHASE_REQUEST_STATUS_LABELS, statusColor } from '../../api/workflow'
import { formatDateVN } from '../../utils/format'

export default function PurchaseRequestsListPage() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<string | undefined>()

  const columns = [
    {
      field: 'docNo', headerText: 'Số YC', width: 160,
      template: (r: PurchaseRequestOut) => <a onClick={() => navigate(`/purchasing/requests/${r.id}`)}>{r.docNo}</a>,
    },
    {
      field: 'docDate', headerText: 'Ngày', width: 110,
      template: (r: PurchaseRequestOut) => formatDateVN(r.docDate),
    },
    {
      field: 'requesterId', headerText: 'Người yêu cầu',
      template: (r: PurchaseRequestOut) => <LookupLabel resource="employees" id={r.requesterId} labelField="fullName" />,
    },
    {
      field: 'departmentId', headerText: 'Bộ phận',
      template: (r: PurchaseRequestOut) => <LookupLabel resource="departments" id={r.departmentId} />,
    },
    {
      field: 'status', headerText: 'Trạng thái', width: 150,
      template: (r: PurchaseRequestOut) => <Tag color={statusColor(r.status)}>{PURCHASE_REQUEST_STATUS_LABELS[r.status] ?? r.status}</Tag>,
    },
  ]

  return (
    <div>
      <Typography.Title level={3}>Yêu cầu mua hàng</Typography.Title>
      <DataTable<PurchaseRequestOut>
        queryKey="purchase-requests"
        endpoint="/purchasing/requests"
        columns={columns}
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
