// TODO-BE: Các trường backend chưa có:
// - Số hợp đồng, Vùng bán hàng (select), Địa chỉ giao hàng, Dịch vụ đính kèm

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { App as AntApp, DatePicker, Drawer, Input, InputNumber, Select, Spin, Tabs, Tag } from 'antd'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import dayjs from 'dayjs'
import { apiClient } from '../../api/client'
import type { ApiErrorBody, SalesOrderOut, SalesOrderUpdate } from '../../api/types'
import { SALES_ORDER_STATUS_LABELS, WF_DEFINITIONS, statusColor, ACTION_LABELS, PRIMARY_ACTIONS, DANGER_ACTIONS } from '../../api/workflow'
import LookupSelect from '../../components/LookupSelect'
import { HeaderGrid, BottomToolbar } from '../../components/DocForm'
import type { WorkflowButton } from '../../components/DocForm'
import { formatDateVN, formatNumberVN } from '../../utils/format'
import '../../components/DocForm/DocForm.css'
import SalesOrderCostsTab from './SalesOrderCostsTab'
import SalesOrderDeductionsTab from './SalesOrderDeductionsTab'
import SalesOrderDeliveryTab from './SalesOrderDeliveryTab'
import SalesOrderLinesTab from './SalesOrderLinesTab'
import SalesOrderPaymentsTab from './SalesOrderPaymentsTab'

const ORDER_FORM_OPTIONS = [
  { value: 'NORMAL', label: 'Đơn hàng bán' },
  { value: 'GIFT', label: 'Đơn hàng tặng' },
]

const CURRENCY_OPTIONS = [
  { value: 'VND', label: 'VND' },
  { value: 'USD', label: 'USD' },
]

const EDITABLE_STATUSES = ['DRAFT', 'APPROVAL_REQUESTED']

export default function SalesOrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { message, modal } = AntApp.useApp()

  const queryKey = ['sales-order', id]

  const { data, isLoading, refetch } = useQuery({
    queryKey,
    queryFn: async () => (await apiClient.get<SalesOrderOut>(`/sales/orders/${id}`)).data,
    enabled: !!id,
  })

  const [formValues, setFormValues] = useState<Record<string, unknown>>({})
  const [currency, setCurrency] = useState('VND')
  const [exchangeRate, setExchangeRate] = useState(1)
  const [contractNo, setContractNo] = useState('')
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false)
  const [showStockDrawer, setShowStockDrawer] = useState(false)
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null)

  useEffect(() => {
    if (!data) return
    setFormValues({
      orderForm: data.orderForm ?? 'NORMAL',
      docDate: data.docDate ? dayjs(data.docDate) : null,
      deliveryDatePlan: data.deliveryDatePlan ? dayjs(data.deliveryDatePlan) : null,
      partnerId: data.partnerId,
      salespersonId: data.salespersonId,
      approverId: data.approverId,
      salesChannel: data.salesChannel,
      salesRegion: data.salesRegion,
      warehouseId: data.warehouseId,
      paymentMethodId: data.paymentMethodId,
      deliveryMethodId: data.deliveryMethodId,
      note: data.note,
    })
  }, [data])

  const locked = data ? !EDITABLE_STATUSES.includes(data.status) : true

  const showError = (err: unknown, fallback: string) => {
    const body = axios.isAxiosError<ApiErrorBody>(err) ? err.response?.data : undefined
    message.error(body?.message ?? fallback)
  }

  const saveMutation = useMutation({
    mutationFn: (values: SalesOrderUpdate) => apiClient.put<SalesOrderOut>(`/sales/orders/${id}`, values),
    onSuccess: (res) => {
      message.success('Đã lưu')
      queryClient.setQueryData(queryKey, res.data)
    },
    onError: (err) => showError(err, 'Không thể lưu'),
  })

  const handleSave = useCallback(() => {
    if (!data) return
    saveMutation.mutate({
      partnerId: (formValues.partnerId as number) ?? data.partnerId,
      orderForm: (formValues.orderForm as string) ?? data.orderForm,
      salesChannel: (formValues.salesChannel as string) ?? data.salesChannel,
      salesRegion: (formValues.salesRegion as string) ?? data.salesRegion,
      warehouseId: (formValues.warehouseId as number) ?? data.warehouseId,
      paymentMethodId: (formValues.paymentMethodId as number) ?? data.paymentMethodId,
      deliveryMethodId: (formValues.deliveryMethodId as number) ?? data.deliveryMethodId,
      deliveryDatePlan: formValues.deliveryDatePlan
        ? (formValues.deliveryDatePlan as dayjs.Dayjs).format('YYYY-MM-DD')
        : null,
      salespersonId: (formValues.salespersonId as number) ?? data.salespersonId,
      note: (formValues.note as string) ?? data.note,
    })
  }, [data, formValues, saveMutation])

  const workflowMutation = useMutation({
    mutationFn: ({ action, reason }: { action: string; reason?: string }) =>
      apiClient.post(`/sales/orders/${data?.id}/actions/${action}`, reason ? { reason } : {}),
    onSuccess: (res, vars) => {
      message.success(`Đã thực hiện: ${ACTION_LABELS[vars.action] ?? vars.action}`)
      queryClient.setQueryData(queryKey, res.data)
    },
    onError: (err) => showError(err, 'Có lỗi xảy ra'),
  })

  const handleWorkflowAction = useCallback((action: string, requireReason?: boolean) => {
    if (requireReason) {
      modal.confirm({
        title: `${ACTION_LABELS[action] ?? action} — nhập lý do`,
        content: <Input.TextArea id="__wf-reason-so" rows={3} placeholder="Lý do..." />,
        onOk: () => {
          const el = document.getElementById('__wf-reason-so') as HTMLTextAreaElement
          workflowMutation.mutate({ action, reason: el?.value || '' })
        },
      })
    } else {
      workflowMutation.mutate({ action })
    }
  }, [workflowMutation, modal])

  const totals = useMemo(() => {
    if (!data?.lines) return { totalAmount: 0, totalVat: 0, totalPaid: 0, remaining: 0 }
    const totalAmount = data.totalAmount ?? data.lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0)
    const totalVat = data.totalVat ?? 0
    return { totalAmount, totalVat, totalPaid: 0, remaining: totalAmount + totalVat }
  }, [data])

  const workflowButtons: WorkflowButton[] = useMemo(() => {
    if (!data) return []
    const transitions = (WF_DEFINITIONS['sales-orders'] ?? []).filter((t) => t.from.includes(data.status))
    return transitions.map((t) => ({
      label: ACTION_LABELS[t.action] ?? t.action,
      onClick: () => handleWorkflowAction(t.action, t.requireReason),
      type: PRIMARY_ACTIONS.has(t.action) ? 'primary' as const
        : DANGER_ACTIONS.has(t.action) ? 'danger' as const
        : 'default' as const,
      loading: workflowMutation.isPending,
    }))
  }, [data, handleWorkflowAction, workflowMutation.isPending])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 's') { e.preventDefault(); handleSave() }
      if (e.ctrlKey && e.key === 'F5') { e.preventDefault(); refetch() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleSave, refetch])

  const setField = useCallback((key: string, value: unknown) => {
    setFormValues((prev) => ({ ...prev, [key]: value }))
  }, [])

  if (isLoading || !data) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Spin size="large" /></div>
  }

  const headerRows = [
    {
      cells: [
        { label: 'Số đơn hàng', field: <Input size="small" value={data.docNo} readOnly disabled /> },
        { label: 'Số hợp đồng', field: <Input size="small" value={contractNo} onChange={(e) => setContractNo(e.target.value)} disabled={locked} placeholder="TODO-BE" /> },
        {
          label: 'Hình thức',
          field: <Select size="small" options={ORDER_FORM_OPTIONS} value={formValues.orderForm as string} onChange={(v) => setField('orderForm', v)} disabled={locked} style={{ width: '100%' }} />,
        },
      ],
    },
    {
      cells: [
        { label: 'Ngày lập', field: <Input size="small" value={formatDateVN(data.docDate)} readOnly disabled /> },
        { label: 'Ngày đặt hàng', field: <Input size="small" value={formatDateVN(data.docDate)} readOnly disabled /> },
        { label: 'Ngày giao (KH)', field: <DatePicker size="small" style={{ width: '100%' }} format="DD/MM/YYYY" disabled={locked} value={formValues.deliveryDatePlan as dayjs.Dayjs | null} onChange={(v) => setField('deliveryDatePlan', v)} /> },
      ],
    },
    {
      cells: [
        { label: 'Khách hàng', required: true, span: 2, field: <LookupSelect resource="partners" labelField="shortName" disabled={locked} value={formValues.partnerId as number} onChange={(v) => setField('partnerId', v)} /> },
        { label: 'Tên KH', field: <Input size="small" readOnly disabled value={'' /* TODO-BE */} /> },
      ],
    },
    {
      cells: [
        { label: 'Vùng bán hàng', required: true, field: <Input size="small" value={formValues.salesRegion as string ?? ''} onChange={(e) => setField('salesRegion', e.target.value)} disabled={locked} /> },
        { label: 'Đ/C giao hàng', span: 4, field: <Input size="small" disabled placeholder="TODO-BE" /> },
      ],
    },
    {
      cells: [
        { label: 'Kênh bán hàng', field: <Input size="small" value={formValues.salesChannel as string ?? ''} onChange={(e) => setField('salesChannel', e.target.value)} disabled={locked} /> },
        { label: 'PT thanh toán', field: <LookupSelect resource="payment-methods" disabled={locked} value={formValues.paymentMethodId as number | null} onChange={(v) => setField('paymentMethodId', v)} /> },
        { label: 'PT giao hàng', field: <LookupSelect resource="delivery-methods" disabled={locked} value={formValues.deliveryMethodId as number | null} onChange={(v) => setField('deliveryMethodId', v)} /> },
      ],
    },
    {
      cells: [
        { label: 'Người lập', field: <Input size="small" readOnly disabled value={'' /* TODO-BE: creatorId */} /> },
        { label: 'NV bán hàng', field: <LookupSelect resource="employees" labelField="fullName" disabled={locked} value={formValues.salespersonId as number} onChange={(v) => setField('salespersonId', v)} /> },
        { label: 'Người duyệt', field: <LookupSelect resource="employees" labelField="fullName" disabled={locked} value={formValues.approverId as number} onChange={(v) => setField('approverId', v)} /> },
      ],
    },
    {
      cells: [
        { label: 'Ghi chú', span: 6, field: <Input size="small" value={formValues.note as string ?? ''} onChange={(e) => setField('note', e.target.value)} disabled={locked} /> },
      ],
    },
    {
      cells: [
        { label: 'DV đính kèm', span: 6, field: <Input size="small" disabled placeholder="TODO-BE" /> },
      ],
    },
  ]

  const rightRows = [
    { label: 'Hiện trạng', value: <Tag color={statusColor(data.status)}>{SALES_ORDER_STATUS_LABELS[data.status] ?? data.status}</Tag> },
    { label: 'Loại tiền', value: <span><Select size="small" options={CURRENCY_OPTIONS} value={currency} onChange={setCurrency} disabled={locked} style={{ width: 70 }} /> <InputNumber size="small" min={0} value={exchangeRate} onChange={(v) => setExchangeRate(v ?? 1)} disabled={locked} style={{ width: 60 }} /></span> },
    { label: 'Kho bán hàng', required: true, value: <LookupSelect resource="warehouses" disabled={locked} value={formValues.warehouseId as number | null} onChange={(v) => setField('warehouseId', v)} /> },
    { label: 'Tổng thanh toán', value: <span>{formatNumberVN(totals.totalAmount)}</span> },
    { label: 'Đã thanh toán', value: <span>{formatNumberVN(totals.totalPaid)}</span> },
    { label: 'Còn lại', value: <span style={{ fontWeight: 700, color: '#cf1322' }}>{formatNumberVN(totals.remaining)}</span>, bold: true },
  ]

  return (
    <div style={{ padding: '0 4px' }}>
      <HeaderGrid rows={headerRows} rightRows={rightRows} />
      <Tabs size="small" style={{ marginTop: 8 }} items={[
        { key: 'lines', label: 'Hàng hóa', children: (
          <SalesOrderLinesTab
            orderId={data.id}
            lines={data.lines}
            locked={locked}
            totalAmount={data.totalAmount}
            totalVat={data.totalVat}
            queryKey={queryKey}
            onShowStock={(pid: number) => { setSelectedProductId(pid); setShowStockDrawer(true) }}
          />
        )},
        { key: 'costs', label: 'Chi phí', children: <SalesOrderCostsTab orderId={data.id} locked={locked} /> },
        { key: 'deduction', label: 'Khấu trừ', children: <SalesOrderDeductionsTab orderId={data.id} locked={locked} soQueryKey={queryKey} /> },
        { key: 'payment', label: 'Thanh toán', children: <SalesOrderPaymentsTab orderId={data.id} locked={locked} /> },
        { key: 'delivery', label: 'Giao hàng', children: <SalesOrderDeliveryTab orderId={data.id} status={data.status} defaultWarehouseId={data.warehouseId} soQueryKey={queryKey} /> },
        { key: 'docs', label: 'Tài liệu', children: <OrderPlaceholderTab name="Tài liệu" /> },
        { key: 'tasks', label: 'Công việc', children: <OrderPlaceholderTab name="Công việc" /> },
      ]} />
      <BottomToolbar onSave={handleSave} onPrint={() => window.print()} onClose={() => navigate('/sales/orders')} workflowButtons={workflowButtons} locked={locked} disabled={saveMutation.isPending} />
      <Drawer title="Lịch sử thao tác" open={showHistoryDrawer} onClose={() => setShowHistoryDrawer(false)} width={600}><p style={{ color: '#999' }}>TODO-BE: Workflow log</p></Drawer>
      <Drawer title="Thông tin tồn kho" open={showStockDrawer} onClose={() => setShowStockDrawer(false)} width={500}><p>Sản phẩm ID: {selectedProductId}</p><p style={{ color: '#999' }}>TODO-BE: Stock balance</p></Drawer>
    </div>
  )
}

function OrderPlaceholderTab({ name }: { name: string }) {
  return <div style={{ padding: 16, textAlign: 'center', color: '#999' }}><p>TODO-BE: API {name}</p><p>Chưa có dữ liệu</p></div>
}

