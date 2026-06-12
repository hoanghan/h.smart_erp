import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Select, Space, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
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

  const columns: ColumnsType<SupplierReturnOut> = [
    {
      title: 'Số trả hàng',
      dataIndex: 'docNo',
      key: 'docNo',
      width: 160,
      render: (v: string, record) => <a onClick={() => navigate(`/purchasing/supplier-returns/${record.id}`)}>{v}</a>,
    },
    { title: 'Ngày', dataIndex: 'docDate', key: 'docDate', width: 110, render: formatDateVN },
    {
      title: 'PO nguồn',
      dataIndex: 'orderId',
      key: 'orderId',
      width: 140,
      render: (v: number | null) => <DocNoLabel endpoint="/purchasing/orders" id={v} />,
    },
    {
      title: 'Nhà cung cấp',
      dataIndex: 'partnerId',
      key: 'partnerId',
      render: (v: number) => <LookupLabel resource="partners" id={v} labelField="shortName" />,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 150,
      render: (v: string) => <Tag color={statusColor(v)}>{SUPPLIER_RETURN_STATUS_LABELS[v] ?? v}</Tag>,
    },
  ]

  return (
    <div>
      <Typography.Title level={3}>Trả hàng NCC</Typography.Title>
      <DataTable<SupplierReturnOut>
        queryKey="supplier-returns"
        endpoint="/purchasing/supplier-returns"
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
