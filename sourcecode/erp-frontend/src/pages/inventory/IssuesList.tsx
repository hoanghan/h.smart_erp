import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Dropdown, Select, Space, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { PlusOutlined } from '@ant-design/icons'
import DataTable from '../../components/DataTable'
import LookupLabel from '../../components/LookupLabel'
import type { StockDocOut } from '../../api/types'
import { STOCK_DOC_STATUS_LABELS, statusColor } from '../../api/workflow'
import { formatDateVN } from '../../utils/format'

export const ISSUE_SUB_TYPE_LABELS: Record<string, string> = {
  SALES: 'Bán hàng',
  OUTSOURCING: 'Xuất SX-DV',
  SUPPLIER_RETURN: 'Trả hàng NCC',
  ISSUE_OTHER: 'Xuất khác',
  ISSUE_CODE_ADJUST: 'Điều chỉnh mã',
}

const SUB_TYPE_COLORS: Record<string, string> = {
  SALES: 'blue',
  OUTSOURCING: 'green',
  SUPPLIER_RETURN: 'orange',
  ISSUE_OTHER: 'default',
  ISSUE_CODE_ADJUST: 'purple',
}

export default function IssuesListPage() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<string | undefined>()
  const [subType, setSubType] = useState<string | undefined>()

  const columns: ColumnsType<StockDocOut> = [
    {
      title: 'Số phiếu',
      dataIndex: 'docNo',
      key: 'docNo',
      width: 140,
      render: (v: string, record) => <a onClick={() => navigate(`/inventory/docs/${record.id}`)}>{v}</a>,
    },
    {
      title: 'Loại xuất',
      dataIndex: 'subType',
      key: 'subType',
      width: 130,
      render: (v: string) => <Tag color={SUB_TYPE_COLORS[v] ?? 'default'}>{ISSUE_SUB_TYPE_LABELS[v] ?? v}</Tag>,
    },
    {
      title: 'Số tham chiếu',
      key: 'refDoc',
      width: 140,
      render: (_: unknown, record: StockDocOut) => {
        if (record.salesOrderId) return `SO #${record.salesOrderId}`
        if (record.purchaseOrderId) return `PO #${record.purchaseOrderId}`
        return '—'
      },
    },
    {
      title: 'Kho xuất',
      dataIndex: 'fromWarehouseId',
      key: 'fromWarehouseId',
      width: 150,
      render: (v: number | null) => <LookupLabel resource="warehouses" id={v} />,
    },
    {
      title: 'Đối tượng',
      dataIndex: 'partnerId',
      key: 'partnerId',
      width: 160,
      render: (v: number | null) => v ? <LookupLabel resource="partners" id={v} labelField="shortName" /> : '—',
    },
    {
      title: 'Ngày yêu cầu',
      dataIndex: 'requestDate',
      key: 'requestDate',
      width: 110,
      render: formatDateVN,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (v: string) => <Tag color={statusColor(v)}>{STOCK_DOC_STATUS_LABELS[v] ?? v}</Tag>,
    },
  ]

  const newMenuItems = [
    { key: 'SALES', label: 'Bán hàng' },
    { key: 'OUTSOURCING', label: 'Xuất SX-DV' },
    { key: 'SUPPLIER_RETURN', label: 'Trả hàng NCC' },
    { key: 'ISSUE_OTHER', label: 'Xuất khác' },
    { key: 'ISSUE_CODE_ADJUST', label: 'Điều chỉnh mã' },
  ]

  return (
    <div>
      <Typography.Title level={3}>Xuất kho</Typography.Title>
      <DataTable<StockDocOut>
        queryKey="inventory-issues"
        endpoint="/inventory/docs"
        columns={columns}
        hideSearch
        extraParams={{ docType: 'ISSUE', status, subType }}
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
            <Select
              placeholder="Loại xuất"
              allowClear
              style={{ width: 160 }}
              value={subType}
              onChange={setSubType}
              options={Object.entries(ISSUE_SUB_TYPE_LABELS).map(([value, label]) => ({ value, label }))}
            />
            <Dropdown
              menu={{
                items: newMenuItems.map((item) => ({
                  key: item.key,
                  label: item.label,
                  onClick: () => navigate(`/inventory/docs/new?docType=ISSUE&subType=${item.key}`),
                })),
              }}
            >
              <Button type="primary" icon={<PlusOutlined />}>
                Thêm <PlusOutlined />
              </Button>
            </Dropdown>
          </Space>
        }
      />
    </div>
  )
}