import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { App as AntdApp, Button, Dropdown, Select, Tag, Typography } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { useQueryClient } from '@tanstack/react-query'
import ListView, { StatusChip, toneFromStatusColor, type ListViewBulkAction, type ListViewSavedView, type ListViewStatusOption } from '../../components/ListView'
import LookupLabel from '../../components/LookupLabel'
import { apiClient } from '../../api/client'
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

const STATUS_OPTIONS: ListViewStatusOption[] = Object.entries(STOCK_DOC_STATUS_LABELS).map(([value, label]) => ({ value, label }))

const PRESET_VIEWS: ListViewSavedView[] = [
  { id: 'draft', label: 'Nháp', filters: { status: 'DRAFT' } },
  { id: 'requested', label: 'Chờ xác nhận', filters: { status: 'REQUESTED' } },
]

export default function ReceiptsListPage() {
  const navigate = useNavigate()
  const { message } = AntdApp.useApp()
  const queryClient = useQueryClient()
  const [subType, setSubType] = useState<string | undefined>()

  const columns = [
    {
      field: 'docNo', headerText: 'Số phiếu', width: 140,
      template: (r: StockDocOut) => <a onClick={() => navigate(`/inventory/docs/${r.id}`)}>{r.docNo}</a>,
    },
    {
      field: 'subType', headerText: 'Loại nhập', width: 130,
      template: (r: StockDocOut) => <Tag color={SUB_TYPE_COLORS[r.subType] ?? 'default'}>{RECEIPT_SUB_TYPE_LABELS[r.subType] ?? r.subType}</Tag>,
    },
    {
      field: 'refDoc', headerText: 'Số tham chiếu', width: 140,
      template: (r: StockDocOut) => {
        if (r.purchaseOrderId) return `PO #${r.purchaseOrderId}`
        if (r.salesOrderId) return `SO #${r.salesOrderId}`
        return '—'
      },
    },
    {
      field: 'toWarehouseId', headerText: 'Kho nhập', width: 150,
      template: (r: StockDocOut) => <LookupLabel resource="warehouses" id={r.toWarehouseId} />,
    },
    {
      field: 'partnerId', headerText: 'Đối tượng', width: 160,
      template: (r: StockDocOut) => r.partnerId ? <LookupLabel resource="partners" id={r.partnerId} labelField="shortName" /> : '—',
    },
    {
      field: 'requestDate', headerText: 'Ngày yêu cầu', width: 110,
      template: (r: StockDocOut) => formatDateVN(r.requestDate),
    },
    {
      field: 'status', headerText: 'Trạng thái', width: 130,
      template: (r: StockDocOut) => <StatusChip label={STOCK_DOC_STATUS_LABELS[r.status] ?? r.status} tone={toneFromStatusColor(statusColor(r.status))} />,
    },
  ]

  const newMenuItems = [
    { key: 'PURCHASE', label: 'Mua hàng' },
    { key: 'CUSTOMER_RETURN', label: 'Trả hàng KH' },
    { key: 'FINISHED_GOODS', label: 'Nhập SP-TP' },
    { key: 'RECEIPT_OTHER', label: 'Nhập khác' },
    { key: 'RECEIPT_CODE_ADJUST', label: 'Điều chỉnh mã' },
  ]

  const runBulk = async (rows: StockDocOut[], action: string, successText: string) => {
    const results = await Promise.allSettled(rows.map((r) => apiClient.post(`/inventory/docs/${r.id}/actions/${action}`)))
    const failed = results.filter((r) => r.status === 'rejected').length
    if (failed > 0) message.error(`${failed} phiếu không thực hiện được, vui lòng kiểm tra lại`)
    if (failed < rows.length) message.success(successText.replace('{n}', String(rows.length - failed)))
    queryClient.invalidateQueries({ queryKey: ['inventory-receipts'] })
  }

  const bulkActions: ListViewBulkAction<StockDocOut>[] = [
    {
      key: 'request',
      label: 'Yêu cầu nhiều',
      confirmMessage: 'Gửi yêu cầu cho tất cả phiếu đã chọn?',
      isEnabled: (rows) => rows.length > 0 && rows.every((r) => r.status === 'DRAFT'),
      onRun: (rows) => runBulk(rows, 'request', 'Đã gửi yêu cầu {n} phiếu'),
    },
    {
      key: 'confirm',
      label: 'Xác nhận nhiều',
      confirmMessage: 'Xác nhận tất cả phiếu đã chọn?',
      isEnabled: (rows) => rows.length > 0 && rows.every((r) => r.status === 'REQUESTED'),
      onRun: (rows) => runBulk(rows, 'confirm', 'Đã xác nhận {n} phiếu'),
    },
  ]

  return (
    <div>
      <Typography.Title level={3}>Nhập kho</Typography.Title>
      <ListView<StockDocOut>
        viewKey="inventory-receipts"
        queryKey="inventory-receipts"
        endpoint="/inventory/docs"
        columns={columns}
        baseParams={{ docType: 'RECEIPT', subType }}
        statusOptions={STATUS_OPTIONS}
        presetViews={PRESET_VIEWS}
        bulkActions={bulkActions}
        toolbarExtra={
          <>
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
          </>
        }
      />
    </div>
  )
}
