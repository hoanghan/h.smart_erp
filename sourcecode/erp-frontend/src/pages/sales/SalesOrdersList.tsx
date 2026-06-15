import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { App as AntdApp, Typography } from 'antd'
import { useQueryClient } from '@tanstack/react-query'
import ListView, { StatusChip, toneFromStatusColor, type ListViewBulkAction, type ListViewSavedView, type ListViewStatusOption } from '../../components/ListView'
import LookupSelect from '../../components/LookupSelect'
import LookupLabel from '../../components/LookupLabel'
import { apiClient } from '../../api/client'
import type { SalesOrderOut } from '../../api/types'
import { SALES_ORDER_STATUS_LABELS, statusColor } from '../../api/workflow'
import { formatDateVN, formatNumberVN } from '../../utils/format'

const ORDER_FORM_LABELS: Record<string, string> = {
  NORMAL: 'Thông thường',
  GIFT: 'Quà tặng',
}

const STATUS_OPTIONS: ListViewStatusOption[] = Object.entries(SALES_ORDER_STATUS_LABELS).map(([value, label]) => ({ value, label }))

const PRESET_VIEWS: ListViewSavedView[] = [
  { id: 'pending-approval', label: 'Chờ duyệt', filters: { status: 'DRAFT' } },
  { id: 'on-hold', label: 'Tạm giữ', filters: { status: 'ON_HOLD' } },
]

export default function SalesOrdersListPage() {
  const navigate = useNavigate()
  const { message } = AntdApp.useApp()
  const queryClient = useQueryClient()
  const [partnerId, setPartnerId] = useState<number | null>(null)

  const columns = [
    {
      field: 'docNo', headerText: 'Số đơn hàng', width: 160,
      template: (r: SalesOrderOut) => <a onClick={() => navigate(`/sales/orders/${r.id}`)}>{r.docNo}</a>,
    },
    {
      field: 'docDate', headerText: 'Ngày', width: 110,
      template: (r: SalesOrderOut) => formatDateVN(r.docDate),
    },
    {
      field: 'partnerId', headerText: 'Khách hàng',
      template: (r: SalesOrderOut) => <LookupLabel resource="partners" id={r.partnerId} labelField="shortName" />,
    },
    {
      field: 'orderForm', headerText: 'Hình thức', width: 120,
      template: (r: SalesOrderOut) => ORDER_FORM_LABELS[r.orderForm] ?? r.orderForm,
    },
    {
      field: 'totalAmount', headerText: 'Tổng tiền', width: 130, textAlign: 'Right',
      template: (r: SalesOrderOut) => formatNumberVN(r.totalAmount),
    },
    {
      field: 'totalVat', headerText: 'VAT', width: 110, textAlign: 'Right',
      template: (r: SalesOrderOut) => formatNumberVN(r.totalVat),
    },
    {
      field: 'status', headerText: 'Trạng thái', width: 150,
      template: (r: SalesOrderOut) => <StatusChip label={SALES_ORDER_STATUS_LABELS[r.status] ?? r.status} tone={toneFromStatusColor(statusColor(r.status))} />,
    },
  ]

  const runBulk = async (rows: SalesOrderOut[], action: string, successText: string) => {
    const results = await Promise.allSettled(rows.map((r) => apiClient.post(`/sales/orders/${r.id}/actions/${action}`)))
    const failed = results.filter((r) => r.status === 'rejected').length
    if (failed > 0) message.error(`${failed} đơn không thực hiện được, vui lòng kiểm tra lại`)
    if (failed < rows.length) message.success(successText.replace('{n}', String(rows.length - failed)))
    queryClient.invalidateQueries({ queryKey: ['sales-orders'] })
  }

  const bulkActions: ListViewBulkAction<SalesOrderOut>[] = [
    {
      key: 'approve',
      label: 'Duyệt nhiều',
      confirmMessage: 'Duyệt tất cả đơn hàng đã chọn?',
      isEnabled: (rows) => rows.length > 0 && rows.every((r) => r.status === 'DRAFT'),
      onRun: (rows) => runBulk(rows, 'approve', 'Đã duyệt {n} đơn hàng'),
    },
    {
      key: 'resume',
      label: 'Tiếp tục nhiều',
      confirmMessage: 'Bỏ tạm giữ tất cả đơn hàng đã chọn?',
      isEnabled: (rows) => rows.length > 0 && rows.every((r) => r.status === 'ON_HOLD'),
      onRun: (rows) => runBulk(rows, 'resume', 'Đã tiếp tục {n} đơn hàng'),
    },
  ]

  return (
    <div>
      <Typography.Title level={3}>Đơn hàng bán</Typography.Title>
      <ListView<SalesOrderOut>
        viewKey="sales-orders"
        queryKey="sales-orders"
        endpoint="/sales/orders"
        columns={columns}
        baseParams={{ partnerId: partnerId ?? undefined }}
        statusOptions={STATUS_OPTIONS}
        presetViews={PRESET_VIEWS}
        bulkActions={bulkActions}
        toolbarExtra={
          <div style={{ width: 240 }}>
            <LookupSelect resource="partners" labelField="shortName" placeholder="Khách hàng" value={partnerId} onChange={setPartnerId} />
          </div>
        }
      />
    </div>
  )
}
