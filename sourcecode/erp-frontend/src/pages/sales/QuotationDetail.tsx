import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { App as AntApp, DatePicker, Descriptions, Drawer, Input, InputNumber, Modal, Select, Spin, Table, Tag } from 'antd'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import dayjs from 'dayjs'
import { apiClient } from '../../api/client'
import type {
  ApiErrorBody, ExtendQuotationRequest, LookupItem, MakeSalesOrderLineIn, MakeSalesOrderResult,
  PageResult, QuotationOut, QuotationUpdate, SetAsLostRequest, StockBalanceOut,
} from '../../api/types'
import {
  ACTION_LABELS, DANGER_ACTIONS, PRIMARY_ACTIONS, QUOTATION_STATUS_LABELS, WF_DEFINITIONS, statusColor,
} from '../../api/workflow'
import LookupSelect from '../../components/LookupSelect'
import LookupLabel from '../../components/LookupLabel'
import {
  HeaderGrid, BottomToolbar, DocFormLayout, DocFormSidebar, DocFormAccordion, useDirtyGuard, useDocFormHotkeys,
} from '../../components/DocForm'
import type { WorkflowButton, DocFormInfoRow, DocFormSection, DocFormTimelineItem } from '../../components/DocForm'
import { formatDateVN, formatNumberVN } from '../../utils/format'
import '../../components/DocForm/DocForm.css'
import QuotationLinesTab from './QuotationLinesTab'

const ORDER_TYPE_OPTIONS = [
  { value: 'SALES', label: 'Bán hàng' },
  { value: 'MAINTENANCE', label: 'Bảo trì' },
  { value: 'SHOPPING_CART', label: 'Đặt hàng online' },
]

const EDITABLE_STATUSES = ['DRAFT']

export default function QuotationDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { message } = AntApp.useApp()

  const queryKey = ['sales-quotation', id]

  const { data, isLoading, refetch } = useQuery({
    queryKey,
    queryFn: async () => (await apiClient.get<QuotationOut>(`/sales/quotations/${id}`)).data,
    enabled: !!id,
  })

  const [formValues, setFormValues] = useState<Record<string, unknown>>({})
  const [dirty, setDirty] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false)
  const [showStockDrawer, setShowStockDrawer] = useState(false)
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null)

  // Dialog: Tạo đơn hàng (make-sales-order, có thể một phần)
  const [mkOrderOpen, setMkOrderOpen] = useState(false)
  const [mkOrderQtys, setMkOrderQtys] = useState<Record<number, number>>({})

  // Dialog: Đánh dấu mất báo giá (set-as-lost)
  const [lostOpen, setLostOpen] = useState(false)
  const [lostReasonIds, setLostReasonIds] = useState<number[]>([])
  const [lostCompetitor, setLostCompetitor] = useState('')
  const [lostDetail, setLostDetail] = useState('')

  // Dialog: Gia hạn báo giá (extend)
  const [extendOpen, setExtendOpen] = useState(false)
  const [extendDate, setExtendDate] = useState<dayjs.Dayjs | null>(null)

  useEffect(() => {
    if (!data) return
    setFormValues({
      orderType: data.orderType,
      priceListId: data.priceListId,
      validTill: data.validTill ? dayjs(data.validTill) : null,
      validityDays: data.validityDays ?? 2,
      requestDeliveryDate: data.requestDeliveryDate ? dayjs(data.requestDeliveryDate) : null,
      deliveryLead: data.deliveryLead,
      paymentMethodId: data.paymentMethodId,
      deliveryMethodId: data.deliveryMethodId,
      partnerId: data.partnerId,
      requesterId: data.requesterId,
      competitor: data.competitor,
      terms: data.terms,
      note: data.note,
    })
    setDirty(false)
    setErrors({})
  }, [data])

  const locked = data ? !EDITABLE_STATUSES.includes(data.status) : true

  const showError = (err: unknown, fallback: string) => {
    const body = axios.isAxiosError<ApiErrorBody>(err) ? err.response?.data : undefined
    message.error(body?.message ?? fallback)
  }

  const saveMutation = useMutation({
    mutationFn: (values: QuotationUpdate) => apiClient.put<QuotationOut>(`/sales/quotations/${id}`, values),
    onSuccess: (res) => {
      message.success('Đã lưu')
      setDirty(false)
      queryClient.setQueryData(queryKey, res.data)
    },
    onError: (err) => showError(err, 'Không thể lưu'),
  })

  const handleSave = useCallback(() => {
    if (!data) return
    if (!formValues.partnerId) {
      setErrors({ partnerId: 'Vui lòng chọn khách hàng' })
      message.error('Vui lòng chọn khách hàng')
      return
    }
    const values: QuotationUpdate = {
      partnerId: (formValues.partnerId as number) ?? data.partnerId,
      orderType: (formValues.orderType as string) ?? data.orderType,
      validTill: formValues.validTill ? (formValues.validTill as dayjs.Dayjs).format('YYYY-MM-DD') : null,
      priceListId: (formValues.priceListId as number) ?? null,
      taxTemplateId: null,
      requestDeliveryDate: formValues.requestDeliveryDate
        ? (formValues.requestDeliveryDate as dayjs.Dayjs).format('YYYY-MM-DD')
        : null,
      validityDays: (formValues.validityDays as number) ?? null,
      deliveryLead: (formValues.deliveryLead as string) ?? null,
      requesterId: (formValues.requesterId as number) ?? null,
      requesterDeptId: null,
      contactId: null,
      deliveryAddrId: null,
      paymentMethodId: (formValues.paymentMethodId as number) ?? null,
      deliveryMethodId: (formValues.deliveryMethodId as number) ?? null,
      bankAccount: null,
      attachedService: null,
      competitor: (formValues.competitor as string) ?? null,
      terms: (formValues.terms as string) ?? null,
      note: (formValues.note as string) ?? null,
    }
    saveMutation.mutate(values)
  }, [data, formValues, saveMutation])

  // Workflow đơn giản: submit / cancel
  const workflowMutation = useMutation({
    mutationFn: ({ action, reason }: { action: string; reason?: string }) =>
      apiClient.post<QuotationOut>(`/sales/quotations/${data?.id}/actions/${action}`, reason !== undefined ? { reason } : {}),
    onSuccess: (res, vars) => {
      message.success(`Đã thực hiện: ${ACTION_LABELS[vars.action] ?? vars.action}`)
      queryClient.setQueryData(queryKey, res.data)
    },
    onError: (err) => showError(err, 'Có lỗi xảy ra'),
  })

  const handleWorkflowAction = useCallback((action: string, requireReason?: boolean) => {
    if (requireReason) {
      let reason = ''
      Modal.confirm({
        title: `${ACTION_LABELS[action] ?? action} — nhập lý do`,
        content: <Input.TextArea rows={3} placeholder="Lý do..." onChange={(e) => { reason = e.target.value }} />,
        onOk: () => workflowMutation.mutate({ action, reason }),
      })
    } else {
      workflowMutation.mutate({ action })
    }
  }, [workflowMutation])

  // Dialog: Tạo đơn hàng (toàn phần / một phần)
  const openMakeSalesOrder = useCallback(() => {
    if (!data) return
    const init: Record<number, number> = {}
    for (const l of data.lines) {
      const remain = l.quantity - l.orderedQty
      if (remain > 0) init[l.id] = remain
    }
    setMkOrderQtys(init)
    setMkOrderOpen(true)
  }, [data])

  const makeSalesOrderMutation = useMutation({
    mutationFn: (lines: MakeSalesOrderLineIn[]) =>
      apiClient.post<MakeSalesOrderResult>(`/sales/quotations/${data?.id}/actions/make-sales-order`, { lines }),
    onSuccess: (res) => {
      message.success(`Đã tạo đơn hàng ${res.data.orderDocNo}`)
      setMkOrderOpen(false)
      navigate(`/sales/orders/${res.data.orderId}`)
    },
    onError: (err) => showError(err, 'Không thể tạo đơn hàng'),
  })

  const handleMakeSalesOrderConfirm = () => {
    const lines: MakeSalesOrderLineIn[] = Object.entries(mkOrderQtys)
      .filter(([, qty]) => qty > 0)
      .map(([lineId, qty]) => ({ lineId: Number(lineId), qty }))
    if (lines.length === 0) {
      message.warning('Chọn ít nhất 1 dòng để tạo đơn hàng')
      return
    }
    makeSalesOrderMutation.mutate(lines)
  }

  // Dialog: Đánh dấu mất báo giá
  const { data: lostReasons } = useQuery({
    queryKey: ['lost-reasons-all'],
    queryFn: async () => (await apiClient.get<PageResult<LookupItem>>('/md/lost-reasons', { params: { size: 100 } })).data.items,
    enabled: lostOpen,
  })

  const setAsLostMutation = useMutation({
    mutationFn: (body: SetAsLostRequest) =>
      apiClient.post<QuotationOut>(`/sales/quotations/${data?.id}/actions/set-as-lost`, body),
    onSuccess: (res) => {
      message.success('Đã đánh dấu mất báo giá')
      setLostOpen(false)
      queryClient.setQueryData(queryKey, res.data)
    },
    onError: (err) => showError(err, 'Không thể đánh dấu mất báo giá'),
  })

  const handleSetAsLostConfirm = () => {
    if (lostReasonIds.length === 0) {
      message.warning('Chọn ít nhất 1 lý do mất báo giá')
      return
    }
    setAsLostMutation.mutate({ lostReasonIds, competitor: lostCompetitor || null, detail: lostDetail || null })
  }

  // Dialog: Gia hạn báo giá
  const openExtend = useCallback(() => {
    if (!data) return
    const base = data.validTill ? dayjs(data.validTill) : dayjs()
    setExtendDate(base.add(data.validityDays ?? 2, 'day'))
    setExtendOpen(true)
  }, [data])

  const extendMutation = useMutation({
    mutationFn: (body: ExtendQuotationRequest) =>
      apiClient.post<QuotationOut>(`/sales/quotations/${data?.id}/actions/extend`, body),
    onSuccess: (res) => {
      message.success('Đã gia hạn báo giá')
      setExtendOpen(false)
      queryClient.setQueryData(queryKey, res.data)
    },
    onError: (err) => showError(err, 'Không thể gia hạn'),
  })

  const handleExtendConfirm = () => {
    if (!extendDate) {
      message.warning('Chọn ngày hiệu lực mới')
      return
    }
    extendMutation.mutate({ validTill: extendDate.format('YYYY-MM-DD') })
  }

  // Tạo bản sửa đổi (amend)
  const amendMutation = useMutation({
    mutationFn: () => apiClient.post<QuotationOut>(`/sales/quotations/${data?.id}/actions/amend`, {}),
    onSuccess: (res) => {
      message.success(`Đã tạo bản sửa đổi ${res.data.docNo}`)
      navigate(`/sales/quotations/${res.data.id}`)
    },
    onError: (err) => showError(err, 'Không thể tạo bản sửa đổi'),
  })

  // Tổng tiền từ dòng hàng
  const totals = useMemo(() => {
    if (!data?.lines) return { totalAmount: 0, totalVat: 0, totalWithVat: 0 }
    const totalAmount = data.lines.reduce((sum, l) => sum + l.amount, 0)
    const totalVat = data.lines.reduce((sum, l) => sum + (l.amount * (l.vatPct ?? 0)) / 100, 0)
    return { totalAmount, totalVat, totalWithVat: totalAmount + totalVat }
  }, [data?.lines])

  // Sidebar phải: thông tin người lập/duyệt + ngày
  const sidebarInfoRows: DocFormInfoRow[] = useMemo(() => {
    if (!data) return []
    return [
      { label: 'Ngày lập', value: formatDateVN(data.docDate) },
      { label: 'Người lập', value: <LookupLabel resource="users" id={data.creatorId} labelField="fullName" /> },
      { label: 'Người duyệt', value: <LookupLabel resource="users" id={data.approverId} labelField="fullName" /> },
      { label: 'Ngày duyệt', value: formatDateVN(data.approvedAt) },
      { label: 'Hiệu lực đến', value: formatDateVN(data.validTill) },
    ]
  }, [data])

  // Sidebar phải: dòng thời gian hoạt động — suy ra từ dữ liệu báo giá (chưa có API /timeline)
  const sidebarTimeline: DocFormTimelineItem[] = useMemo(() => {
    if (!data) return []
    const items: DocFormTimelineItem[] = [
      {
        timestamp: data.docDate,
        type: 'ACTIVITY',
        description: 'Tạo báo giá',
        actor: <LookupLabel resource="users" id={data.creatorId} labelField="fullName" />,
        metadata: {},
      },
    ]
    if (data.approvedAt) {
      items.push({
        timestamp: data.approvedAt,
        type: 'STATUS_CHANGE',
        description: `Duyệt báo giá — ${QUOTATION_STATUS_LABELS[data.status] ?? data.status}`,
        actor: <LookupLabel resource="users" id={data.approverId} labelField="fullName" />,
        metadata: { status: data.status },
      })
    }
    if (data.statusReason && (data.status === 'LOST' || data.status === 'CANCELLED')) {
      items.push({
        timestamp: data.approvedAt ?? data.docDate,
        type: 'STATUS_CHANGE',
        description: `${QUOTATION_STATUS_LABELS[data.status] ?? data.status}: ${data.statusReason}`,
        actor: null,
        metadata: { status: data.status },
      })
    }
    return items.reverse()
  }, [data])

  // Thông tin tồn kho (không lọc theo kho — QuotationOut không có warehouseId)
  const { data: stockBalances } = useQuery({
    queryKey: ['stock-balance', selectedProductId],
    queryFn: async () => (await apiClient.get<StockBalanceOut[]>('/inventory/stock-balance', {
      params: { productId: selectedProductId },
    })).data,
    enabled: showStockDrawer && !!selectedProductId,
  })

  const stockSummary = useMemo(() => (stockBalances ?? []).reduce((acc, r) => ({
    qtyOnHand: acc.qtyOnHand + r.qtyOnHand,
    reservedQty: acc.reservedQty + r.reservedQty,
    orderedQty: acc.orderedQty + r.orderedQty,
    projectedQty: acc.projectedQty + r.projectedQty,
  }), { qtyOnHand: 0, reservedQty: 0, orderedQty: 0, projectedQty: 0 }), [stockBalances])

  const anyActionLoading = workflowMutation.isPending || makeSalesOrderMutation.isPending
    || setAsLostMutation.isPending || extendMutation.isPending || amendMutation.isPending

  // Nút workflow ở toolbar đáy
  const workflowButtons: WorkflowButton[] = useMemo(() => {
    if (!data) return []
    const transitions = (WF_DEFINITIONS.quotations ?? []).filter((t) => t.from.includes(data.status))
    return transitions.map((t) => {
      let onClick = () => handleWorkflowAction(t.action, t.requireReason)
      if (t.action === 'make-sales-order') onClick = openMakeSalesOrder
      else if (t.action === 'set-as-lost') onClick = () => setLostOpen(true)
      else if (t.action === 'extend') onClick = openExtend
      else if (t.action === 'amend') onClick = () => amendMutation.mutate()
      return {
        label: ACTION_LABELS[t.action] ?? t.action,
        onClick,
        type: PRIMARY_ACTIONS.has(t.action) ? 'primary' as const
          : DANGER_ACTIONS.has(t.action) ? 'danger' as const
          : 'default' as const,
        loading: anyActionLoading,
      }
    })
  }, [data, handleWorkflowAction, openMakeSalesOrder, openExtend, amendMutation, anyActionLoading])

  // Ctrl+F5: tải lại dữ liệu từ server
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'F5') {
        e.preventDefault()
        refetch()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [refetch])

  useDocFormHotkeys({ onSave: handleSave })
  const { guardAction } = useDirtyGuard(dirty)

  const setField = useCallback((key: string, value: unknown) => {
    setFormValues((prev) => ({ ...prev, [key]: value }))
    setDirty(true)
    if (key === 'partnerId' && value) {
      setErrors((prev) => {
        if (!prev.partnerId) return prev
        const { partnerId: _drop, ...rest } = prev
        return rest
      })
    }
  }, [])

  const handlePrint = useCallback(() => window.print(), [])
  const handlePrintPreview = useCallback(() => window.print(), [])

  const handleExportExcel = useCallback(() => {
    if (!data) return
    const header = ['STT', 'Mã hàng', 'Số lượng', 'Đơn giá', 'CK%', 'Thành tiền', 'VAT%', 'Đã lên đơn', 'Ghi chú']
    const rows = data.lines.map((l, i) => [
      i + 1, l.productId, l.quantity, l.rate ?? '', l.discountPct ?? '', l.amount, l.vatPct ?? '', l.orderedQty, l.note ?? '',
    ])
    const csvContent = [header, ...rows].map((r) => r.join('\t')).join('\n')
    const blob = new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `BaoGia_${data.docNo}.csv`
    link.click()
    message.success('Đã kết xuất Excel')
  }, [data, message])

  if (isLoading || !data) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
        <Spin size="large" />
      </div>
    )
  }

  const headerRows = [
    {
      cells: [
        { label: 'Số báo giá', field: <Input size="small" value={data.docNo} readOnly disabled /> },
        { label: 'Ngày lập', field: <Input size="small" value={formatDateVN(data.docDate)} readOnly disabled /> },
        {
          label: 'Loại đơn',
          field: (
            <Select size="small" options={ORDER_TYPE_OPTIONS} value={formValues.orderType as string}
              onChange={(v) => setField('orderType', v)} disabled={locked} style={{ width: '100%' }} />
          ),
        },
      ],
    },
    {
      cells: [
        {
          label: 'Khách hàng', required: true, error: errors.partnerId,
          field: <LookupSelect resource="partners" labelField="shortName" disabled={locked}
            value={formValues.partnerId as number} onChange={(v) => setField('partnerId', v)} />,
        },
        {
          label: 'Bảng giá',
          field: <LookupSelect resource="price-lists" endpoint="/sales/price-lists" disabled={locked}
            value={formValues.priceListId as number} onChange={(v) => setField('priceListId', v)} />,
        },
        {
          label: 'Người Y/C BG',
          field: <LookupSelect resource="employees" labelField="fullName" disabled={locked}
            value={formValues.requesterId as number} onChange={(v) => setField('requesterId', v)} />,
        },
      ],
    },
    {
      cells: [
        {
          label: 'Hiệu lực đến',
          field: (
            <DatePicker size="small" style={{ width: '100%' }} format="DD/MM/YYYY" disabled={locked}
              value={formValues.validTill as dayjs.Dayjs | null}
              onChange={(v) => setField('validTill', v)} />
          ),
        },
        {
          label: 'Số ngày hiệu lực',
          field: <InputNumber size="small" min={0} style={{ width: '100%' }} disabled={locked}
            value={formValues.validityDays as number} onChange={(v) => setField('validityDays', v ?? 2)} />,
        },
        {
          label: 'Ngày Y/C giao',
          field: (
            <DatePicker size="small" style={{ width: '100%' }} format="DD/MM/YYYY" disabled={locked}
              value={formValues.requestDeliveryDate as dayjs.Dayjs | null}
              onChange={(v) => setField('requestDeliveryDate', v)} />
          ),
        },
      ],
    },
    {
      cells: [
        {
          label: 'Hình thức giao hàng',
          field: <Input size="small" value={formValues.deliveryLead as string ?? ''}
            onChange={(e) => setField('deliveryLead', e.target.value)} disabled={locked} />,
        },
        {
          label: 'PT thanh toán',
          field: <LookupSelect resource="payment-methods" disabled={locked}
            value={formValues.paymentMethodId as number} onChange={(v) => setField('paymentMethodId', v)} />,
        },
        {
          label: 'PT giao hàng',
          field: <LookupSelect resource="delivery-methods" disabled={locked}
            value={formValues.deliveryMethodId as number} onChange={(v) => setField('deliveryMethodId', v)} />,
        },
      ],
    },
    {
      cells: [
        {
          label: 'Đối thủ cạnh tranh',
          field: <Input size="small" value={formValues.competitor as string ?? ''}
            onChange={(e) => setField('competitor', e.target.value)} disabled={locked} />,
        },
        { label: 'Người lập', field: <LookupLabel resource="users" id={data.creatorId} labelField="fullName" /> },
        { label: 'Người duyệt', field: <LookupLabel resource="users" id={data.approverId} labelField="fullName" /> },
      ],
    },
    {
      cells: [
        {
          label: 'Điều khoản', span: 4,
          field: <Input.TextArea rows={1} value={formValues.terms as string ?? ''}
            onChange={(e) => setField('terms', e.target.value)} disabled={locked} />,
        },
        { label: 'Ngày duyệt', field: <Input size="small" value={formatDateVN(data.approvedAt)} readOnly disabled /> },
      ],
    },
    {
      cells: [
        {
          label: 'Ghi chú', span: 6,
          field: <Input.TextArea rows={1} value={formValues.note as string ?? ''}
            onChange={(e) => setField('note', e.target.value)} disabled={locked} />,
        },
      ],
    },
    ...(data.status === 'LOST' || data.status === 'CANCELLED'
      ? [{
          cells: [
            {
              label: data.status === 'LOST' ? 'Lý do mất báo giá' : 'Lý do hủy', span: 4,
              field: data.status === 'LOST'
                ? (
                  <span>
                    {(data.lostReasonIds ?? []).map((rid, i) => (
                      <span key={rid}>{i > 0 ? ', ' : ''}<LookupLabel resource="lost-reasons" id={rid} /></span>
                    ))}
                  </span>
                )
                : <Input size="small" value={data.statusReason ?? ''} readOnly disabled />,
            },
            { label: 'Chi tiết', span: 2, field: <Input size="small" value={data.statusReason ?? ''} readOnly disabled /> },
          ],
        }]
      : []),
  ]

  const rightRows = [
    { label: 'Hiện trạng', value: <Tag color={statusColor(data.status)}>{QUOTATION_STATUS_LABELS[data.status] ?? data.status}</Tag> },
    { label: 'Tổng tiền hàng', value: <span style={{ fontSize: 12 }}>{formatNumberVN(totals.totalAmount)}</span> },
    { label: 'Tổng VAT', value: <span style={{ fontSize: 12 }}>{formatNumberVN(totals.totalVat)}</span> },
    { label: 'Tổng cộng', value: <span style={{ fontWeight: 700, fontSize: 13, color: '#cf1322' }}>{formatNumberVN(totals.totalWithVat)}</span>, bold: true },
  ]

  const accordionSections: DocFormSection[] = [
    {
      key: 'general',
      header: 'Thông tin chung',
      content: <HeaderGrid rows={headerRows} rightRows={rightRows} />,
    },
    {
      key: 'lines',
      header: 'Chi tiết hàng hóa',
      content: (
        <QuotationLinesTab
          quotationId={data.id}
          lines={data.lines}
          locked={locked}
          queryKey={queryKey}
          status={data.status}
          onExportExcel={handleExportExcel}
          onWorkflowAction={handleWorkflowAction}
          onShowHistory={() => setShowHistoryDrawer(true)}
          onShowStock={(productId: number) => { setSelectedProductId(productId); setShowStockDrawer(true) }}
          onMakeSalesOrder={openMakeSalesOrder}
          onSetAsLost={() => setLostOpen(true)}
          onExtend={openExtend}
          onAmend={() => amendMutation.mutate()}
          onReload={() => refetch()}
        />
      ),
    },
  ]

  return (
    <div style={{ padding: '0 4px' }}>
      <DocFormLayout
        actionBar={(
          <BottomToolbar
            onSave={handleSave}
            onPrint={handlePrint}
            onPrintPreview={handlePrintPreview}
            onClose={() => guardAction(() => navigate('/sales/quotations'))}
            workflowButtons={workflowButtons}
            locked={locked}
            disabled={saveMutation.isPending}
          />
        )}
        sidebar={(
          <DocFormSidebar
            statusLabel={QUOTATION_STATUS_LABELS[data.status] ?? data.status}
            statusColor={statusColor(data.status)}
            statusReason={data.statusReason}
            infoRows={sidebarInfoRows}
            timeline={sidebarTimeline}
          />
        )}
      >
        <DocFormAccordion sections={accordionSections} />
      </DocFormLayout>

      {/* Dialog: Tạo đơn hàng */}
      <Modal
        title="Tạo đơn hàng từ báo giá"
        open={mkOrderOpen}
        onCancel={() => setMkOrderOpen(false)}
        onOk={handleMakeSalesOrderConfirm}
        okText="Tạo đơn hàng"
        cancelText="Hủy"
        confirmLoading={makeSalesOrderMutation.isPending}
        width={700}
      >
        <Table
          rowKey="id"
          size="small"
          pagination={false}
          dataSource={data.lines.filter((l) => l.quantity - l.orderedQty > 0)}
          columns={[
            { title: 'Mã hàng', dataIndex: 'productId', render: (v: number) => <LookupLabel resource="products" id={v} /> },
            { title: 'Số lượng', dataIndex: 'quantity', align: 'right', render: formatNumberVN },
            { title: 'Đã lên đơn', dataIndex: 'orderedQty', align: 'right', render: formatNumberVN },
            { title: 'Còn lại', key: 'remain', align: 'right', render: (_, r) => formatNumberVN(r.quantity - r.orderedQty) },
            {
              title: 'SL tạo đơn', key: 'qty', align: 'right', width: 130,
              render: (_, r) => (
                <InputNumber
                  size="small" min={0} max={r.quantity - r.orderedQty}
                  value={mkOrderQtys[r.id] ?? 0}
                  onChange={(v) => setMkOrderQtys((prev) => ({ ...prev, [r.id]: v ?? 0 }))}
                  style={{ width: '100%' }}
                />
              ),
            },
          ]}
        />
      </Modal>

      {/* Dialog: Đánh dấu mất báo giá */}
      <Modal
        title="Đánh dấu mất báo giá"
        open={lostOpen}
        onCancel={() => setLostOpen(false)}
        onOk={handleSetAsLostConfirm}
        okText="Xác nhận"
        cancelText="Hủy"
        okButtonProps={{ danger: true }}
        confirmLoading={setAsLostMutation.isPending}
      >
        <div style={{ marginBottom: 12 }}>
          <div style={{ marginBottom: 4 }}>Lý do mất báo giá *</div>
          <Select
            mode="multiple"
            style={{ width: '100%' }}
            placeholder="Chọn lý do"
            value={lostReasonIds}
            onChange={setLostReasonIds}
            options={(lostReasons ?? []).map((r) => ({ value: r.id, label: `${r.code} — ${r.name}` }))}
          />
        </div>
        <div style={{ marginBottom: 12 }}>
          <div style={{ marginBottom: 4 }}>Đối thủ cạnh tranh</div>
          <Input value={lostCompetitor} onChange={(e) => setLostCompetitor(e.target.value)} />
        </div>
        <div>
          <div style={{ marginBottom: 4 }}>Chi tiết</div>
          <Input.TextArea rows={3} value={lostDetail} onChange={(e) => setLostDetail(e.target.value)} />
        </div>
      </Modal>

      {/* Dialog: Gia hạn báo giá */}
      <Modal
        title="Gia hạn báo giá"
        open={extendOpen}
        onCancel={() => setExtendOpen(false)}
        onOk={handleExtendConfirm}
        okText="Gia hạn"
        cancelText="Hủy"
        confirmLoading={extendMutation.isPending}
      >
        <div style={{ marginBottom: 4 }}>Hiệu lực đến (mới) *</div>
        <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" value={extendDate} onChange={setExtendDate} />
      </Modal>

      {/* Drawer Lịch sử thao tác */}
      <Drawer title="Lịch sử thao tác" open={showHistoryDrawer} onClose={() => setShowHistoryDrawer(false)} width={600}>
        <p style={{ color: '#999' }}>Chưa có dữ liệu lịch sử. Cần API endpoint.</p>
      </Drawer>

      {/* Drawer Thông tin tồn kho */}
      <Drawer title="Thông tin tồn kho" open={showStockDrawer} onClose={() => setShowStockDrawer(false)} width={400}>
        {selectedProductId && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="Sản phẩm"><LookupLabel resource="products" id={selectedProductId} /></Descriptions.Item>
            <Descriptions.Item label="Tồn kho">{formatNumberVN(stockSummary.qtyOnHand)}</Descriptions.Item>
            <Descriptions.Item label="Đã đặt trước">{formatNumberVN(stockSummary.reservedQty)}</Descriptions.Item>
            <Descriptions.Item label="Đang về">{formatNumberVN(stockSummary.orderedQty)}</Descriptions.Item>
            <Descriptions.Item label="Khả dụng dự kiến">{formatNumberVN(stockSummary.projectedQty)}</Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>
    </div>
  )
}
