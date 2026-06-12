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

export const RECEIPT_SUB_TYPE_LABELS: Record<string, string> = {
  PURCHASE: 'Mua hàng',
  CUSTOMER_RETURN: 'Trả hàng KH',
  FINISHED_GOODS: 'Nhập SP-TP',
  RECEIPT_OTHER: 'Nhập khác',
  RECEIPT_CODE_ADJUST: 'Điều chỉnh mã',
}

const SUB_TYPE_COLORS: Record<string, string> = {
  PURCHASE: 'blue',
  CUSTOMER_RETURN: 'orange',
  FINISHED_GOODS: 'green',
  RECEIPT_OTHER: 'default',
  RECEIPT_CODE_ADJUST: 'purple',
}

export default function ReceiptsListPage() {
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
      title: 'Loại nhập',
      dataIndex: 'subType',
      key: 'subType',
      width: 130,
      render: (v: string) => <Tag color={SUB_TYPE_COLORS[v] ?? 'default'}>{RECEIPT_SUB_TYPE_LABELS[v] ?? v}</Tag>,
    },
    {
      title: 'Số tham chiếu',
      key: 'refDoc',
      width: 140,
      render: (_: unknown, record: StockDocOut) => {
        if (record.purchaseOrderId) return `PO #${record.purchaseOrderId}`
        if (record.salesOrderId) return `SO #${record.salesOrderId}`
        return '—'
      },
    },
    {
      title: 'Kho nhập',
      dataIndex: 'toWarehouseId',
      key: 'toWarehouseId',
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
    { key: 'PURCHASE', label: 'Mua hàng' },
    { key: 'CUSTOMER_RETURN', label: 'Trả hàng KH' },
    { key: 'FINISHED_GOODS', label: 'Nhập SP-TP' },
    { key: 'RECEIPT_OTHER', label: 'Nhập khác' },
    { key: 'RECEIPT_CODE_ADJUST', label: 'Điều chỉnh mã' },
  ]

  return (
    <div>
      <Typography.Title level={3}>Nhập kho</Typography.Title>
      <DataTable<StockDocOut>
        queryKey="inventory-receipts"
        endpoint="/inventory/docs"
        columns={columns}
        hideSearch
        extraParams={{ docType: 'RECEIPT', status, subType }}
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
              placeholder="Loại nhập"
              allowClear
              style={{ width: 160 }}
              value={subType}
              onChange={setSubType}
              options={Object.entries(RECEIPT_SUB_TYPE_LABELS).map(([value, label]) => ({ value, label }))}
            />
            <Dropdown
              menu={{
                items: newMenuItems.map((item) => ({
                  key: item.key,
                  label: item.label,
                  onClick: () => navigate(`/inventory/docs/new?docType=RECEIPT&subType=${item.key}`),
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