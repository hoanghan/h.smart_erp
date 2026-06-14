import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Select, Space, Tag, Typography } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import DataTable from '../../components/DataTable'
import DocNoLabel from '../../components/DocNoLabel'
import LookupLabel from '../../components/LookupLabel'
import type { SupplierReturnOut } from '../../api/types'
import { SUPPLIER_RETURN_STATUS_LABELS, statusColor } from '../../api/workflow'
import { formatDateVN } from '../../utils/format'

export default function SupplierReturnsListPage() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<string | undefined>()

  const columns = [
    {
      field: 'docNo', headerText: 'Số trả hàng', width: 160,
      template: (r: SupplierReturnOut) => <a onClick={() => navigate(`/purchasing/supplier-returns/${r.id}`)}>{r.docNo}</a>,
    },
    {
      field: 'docDate', headerText: 'Ngày', width: 110,
      template: (r: SupplierReturnOut) => formatDateVN(r.docDate),
    },
    {
      field: 'orderId', headerText: 'PO nguồn', width: 140,
      template: (r: SupplierReturnOut) => <DocNoLabel endpoint="/purchasing/orders" id={r.orderId} />,
    },
    {
      field: 'partnerId', headerText: 'Nhà cung cấp',
      template: (r: SupplierReturnOut) => <LookupLabel resource="partners" id={r.partnerId} labelField="shortName" />,
    },
    {
      field: 'status', headerText: 'Trạng thái', width: 150,
      template: (r: SupplierReturnOut) => <Tag color={statusColor(r.status)}>{SUPPLIER_RETURN_STATUS_LABELS[r.status] ?? r.status}</Tag>,
    },
  ]

  return (
    <div>
      <Typography.Title level={3}>Trả hàng NCC</Typography.Title>
      <DataTable<SupplierReturnOut>
        queryKey="supplier-returns"
        endpoint="/purchasing/supplier-returns"
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
              options={Object.entries(SUPPLIER_RETURN_STATUS_LABELS).map(([value, label]) => ({ value, label }))}
            />
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/purchasing/supplier-returns/new')}>
              Tạo mới
            </Button>
          </Space>
        }
      />
    </div>
  )
}
