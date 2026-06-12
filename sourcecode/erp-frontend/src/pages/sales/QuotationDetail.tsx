// TODO-BE: Các trường backend chưa có (hiển thị readonly/disabled):
// - contactId (Người liên hệ), contactPhone, contactEmail
// - deliveryAddress (Đ/C giao hàng), bankAccount (TK thanh toán)
// - attachedService (DV đính kèm), deliveryLead (Giao hàng từ...đến)
// - spec (Quy cách), weight (Trọng lượng) trên line
// - Giá vốn, chi phí NVL/CP gia công trên tab Tính giá
// - Workflow transition log

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { App as AntApp, Checkbox, DatePicker, Drawer, Input, InputNumber, Select, Spin, Tabs, Tag } from 'antd'
import { useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query'
import axios from 'axios'
import dayjs from 'dayjs'
import { apiClient } from '../../api/client'
import type { ApiErrorBody, ConvertToOrderResult, QuotationLineOut, QuotationLineUpdate, QuotationOut, QuotationUpdate } from '../../api/types'
import { QUOTATION_STATUS_LABELS } from '../../api/workflow'
import { WF_DEFINITIONS } from '../../api/workflow'
import { statusColor } from '../../api/workflow'
import { ACTION_LABELS, PRIMARY_ACTIONS, DANGER_ACTIONS } from '../../api/workflow'
import LookupSelect from '../../components/LookupSelect'
import LookupLabel from '../../components/LookupLabel'
import { HeaderGrid, BottomToolbar, EditableGrid, GridContextMenu } from '../../components/DocForm'
import type { WorkflowButton, EditColumn, ContextMenuGroup } from '../../components/DocForm'
import { formatDateVN, formatNumberVN } from '../../utils/format'
import '../../components/DocForm/DocForm.css'
import QuotationLinesTab from './QuotationLinesTab'

const QUOTE_TYPE_OPTIONS = [
  { value: 'NORMAL', label: 'Thông thường' },
  { value: 'PROJECT_HOUSE', label: 'Công trình - nhà' },
]

const QUOTE_FORM_OPTIONS = [
  { value: 'NORMAL', label: 'Hàng thông thường' },
  { value: 'ESTIMATE', label: 'Báo giá dự toán' },
]

const CURRENCY_OPTIONS = [
  { value: 'VND', label: 'VND' },
  { value: 'USD', label: 'USD' },
]

const EDITABLE_STATUSES = ['NEW', 'PRICE_REQUESTED', 'PRICING']

export default function QuotationDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { message, modal } = AntApp.useApp()

  const queryKey = ['sales-quotation', id]

  const { data, isLoading, refetch } = useQuery({
    queryKey,
    queryFn: async () => (await apiClient.get<QuotationOut>(`/sales/quotations/${id}`)).data,
    enabled: !!id,
  })

  // Local state cho các field chưa có trong QuotationUpdate
  const [currency, setCurrency] = useState('VND')
  const [exchangeRate, setExchangeRate] = useState(1)
  const [printBySet, setPrintBySet] = useState(false)
  const [deliveryFrom, setDeliveryFrom] = useState(3)
  const [deliveryTo, setDeliveryTo] = useState(5)
  const [contactPhone] = useState('')
  const [contactEmail] = useState('')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [bankAccount, setBankAccount] = useState<string | null>(null)
  const [deliveryLead] = useState('')
  const [attachedService, setAttachedService] = useState('')
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false)
  const [showStockDrawer, setShowStockDrawer] = useState(false)
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null)

  // Form values state (thay AntD Form để kiểm soát tốt hơn)
  const [formValues, setFormValues] = useState<Record<string, unknown>>({})

  useEffect(() => {
    if (!data) return
    setFormValues({
      quoteType: data.quoteType,
      quoteForm: data.quoteForm,
      requesterDeptId: data.requesterId,
      requestDeliveryDate: data.requestDeliveryDate ? dayjs(data.requestDeliveryDate) : null,
      validityDays: data.validityDays ?? 2,
      deliveryLead: data.deliveryLead,
      paymentMethodId: data.paymentMethodId,
      deliveryMethodId: data.deliveryMethodId,
      partnerId: data.partnerId,
      note: data.note,
      requesterId: data.requesterId,
      approverId: data.approverId,
    })
    setValidityDays(data.validityDays ?? 2)
  }, [data])

  const locked = data ? !EDITABLE_STATUSES.includes(data.status) : true

  const [validityDays, setValidityDays] = useState(2)

  const showError = (err: unknown, fallback: string) => {
    const body = axios.isAxiosError<ApiErrorBody>(err) ? err.response?.data : undefined
    message.error(body?.message ?? fallback)
  }

  const saveMutation = useMutation({
    mutationFn: (values: QuotationUpdate) => apiClient.put<QuotationOut>(`/sales/quotations/${id}`, values),
    onSuccess: (res) => {
      message.success('Đã lưu')
      queryClient.setQueryData(queryKey, res.data)
    },
    onError: (err) => showError(err, 'Không thể lưu'),
  })

  const handleSave = useCallback(() => {
    if (!data) return
    const values: QuotationUpdate = {
      partnerId: (formValues.partnerId as number) ?? data.partnerId,
      quoteType: (formValues.quoteType as string) ?? data.quoteType,
      quoteForm: (formValues.quoteForm as string) ?? data.quoteForm,
      requestDeliveryDate: formValues.requestDeliveryDate
        ? (formValues.requestDeliveryDate as dayjs.Dayjs).format('YYYY-MM-DD')
        : null,
      validityDays: validityDays,
      deliveryLead: deliveryLead,
      requesterId: (formValues.requesterId as number) ?? data.requesterId,
      requesterDeptId: (formValues.requesterDeptId as number) ?? null,
      contactId: null, // TODO-BE
      deliveryAddrId: null, // TODO-BE
      paymentMethodId: (formValues.paymentMethodId as number) ?? data.paymentMethodId,
      deliveryMethodId: (formValues.deliveryMethodId as number) ?? data.deliveryMethodId,
      bankAccount: bankAccount,
      attachedService: attachedService,
      note: (formValues.note as string) ?? data.note,
    }
    saveMutation.mutate(values)
  }, [data, formValues, validityDays, deliveryLead, bankAccount, attachedService, saveMutation])

  // Workflow actions
  const workflowMutation = useMutation({
    mutationFn: ({ action, reason }: { action: string; reason?: string }) =>
      apiClient.post(`/sales/quotations/${data?.id}/actions/${action}`, reason ? { reason } : {}),
    onSuccess: (res, vars) => {
      const action = vars.action
      if (action === 'convert-to-order') {
        const result = res.data as ConvertToOrderResult
        message.success(`Đã chuyển sang đơn hàng ${result.orderDocNo}`)
        navigate(`/sales/orders/${result.orderId}`)
        return
      }
      message.success(`Đã thực hiện: ${ACTION_LABELS[action] ?? action}`)
      queryClient.setQueryData(queryKey, res.data)
    },
    onError: (err) => showError(err, 'Có lỗi xảy ra'),
  })

  const handleWorkflowAction = useCallback((action: string, requireReason?: boolean) => {
    if (requireReason) {
      modal.confirm({
        title: `${ACTION_LABELS[action] ?? action} — nhập lý do`,
        content: (
          <Input.TextArea id="__wf-reason" rows={3} placeholder="Lý do..." />
        ),
        onOk: () => {
          const el = document.getElementById('__wf-reason') as HTMLTextAreaElement
          workflowMutation.mutate({ action, reason: el?.value || '' })
        },
      })
    } else {
      workflowMutation.mutate({ action })
    }
  }, [workflowMutation, modal])

  // Compute totals from lines
  const totals = useMemo(() => {
    if (!data?.lines) return { totalAmount: 0, totalVat: 0, totalWithVat: 0 }
    const lines = data.lines
    const totalAmount = lines.reduce((sum, l) => sum + (l.approvedPrice ?? l.calcPrice ?? 0) * l.quantity, 0)
    const totalVat = lines.reduce((sum, l) => {
      const lineAmount = (l.approvedPrice ?? l.calcPrice ?? 0) * l.quantity
      return sum + lineAmount * (l.vatPct ?? 0) / 100
    }, 0)
    return { totalAmount, totalVat, totalWithVat: totalAmount + totalVat }
  }, [data?.lines])

  // Workflow buttons for toolbar
  const workflowButtons: WorkflowButton[] = useMemo(() => {
    if (!data) return []
    const transitions = (WF_DEFINITIONS.quotations ?? []).filter((t) => t.from.includes(data.status))
    return transitions.map((t) => ({
      label: ACTION_LABELS[t.action] ?? t.action,
      onClick: () => handleWorkflowAction(t.action, t.requireReason),
      type: PRIMARY_ACTIONS.has(t.action) ? 'primary' as const
        : DANGER_ACTIONS.has(t.action) ? 'danger' as const
        : 'default' as const,
      loading: workflowMutation.isPending,
    }))
  }, [data, handleWorkflowAction, workflowMutation.isPending])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
      if (e.ctrlKey && e.key === 'F5') {
        e.preventDefault()
        refetch()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleSave, refetch])

  // Handle field change helper
  const setField = useCallback((key: string, value: unknown) => {
    setFormValues((prev) => ({ ...prev, [key]: value }))
  }, [])

  // Print
  const handlePrint = useCallback(() => {
    window.print()
  }, [])

  const handlePrintPreview = useCallback(() => {
    window.print()
  }, [])

  // Export Excel (client-side)
  const handleExportExcel = useCallback(() => {
    if (!data) return
    const header = ['STT', 'Mã hàng', 'Tên hàng hóa', 'ĐVT', 'Số lượng', 'Đơn giá', 'Thành tiền', 'VAT%', 'Ghi chú']
    const rows = data.lines.map((l, i) => [
      i + 1, l.productId, '', '', l.quantity,
      l.approvedPrice ?? l.calcPrice ?? '',
      (l.approvedPrice ?? l.calcPrice ?? 0) * l.quantity,
      l.vatPct ?? '', l.note ?? '',
    ])
    const csvContent = [header, ...rows].map((r) => r.join('\t')).join('\n')
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
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

  // Header rows definition
  const headerRows = [
    // Row 1: Số YCBG, Loại BG, Ngày lập, Người lập | Hiện trạng
    {
      cells: [
        { label: 'Số YCBG', field: <Input size="small" value={data.docNo} readOnly disabled /> },
        {
          label: 'Loại báo giá',
          field: (
            <Select size="small" options={QUOTE_TYPE_OPTIONS} value={formValues.quoteType as string}
              onChange={(v) => setField('quoteType', v)} disabled={locked} style={{ width: '100%' }} />
          ),
        },
        { label: 'Ngày lập', field: <Input size="small" value={formatDateVN(data.docDate)} readOnly disabled /> },
        // TODO-BE: Người lập (từ creatorId → lookup Employee)
        { label: 'Người lập', field: <Input size="small" value={data.creatorId ?? ''} readOnly disabled /> },
      ],
    },
    // Row 2: Bộ phận Y/C, Người Y/C, SĐT, Email
    {
      cells: [
        {
          label: 'Bộ phận Y/C', required: true,
          field: <LookupSelect resource="departments" disabled={locked}
            value={formValues.requesterDeptId as number} onChange={(v) => setField('requesterDeptId', v)} />,
        },
        {
          label: 'Người Y/C BG',
          field: <LookupSelect resource="employees" labelField="fullName" disabled={locked}
            value={formValues.requesterId as number} onChange={(v) => setField('requesterId', v)} />,
        },
        { label: 'Số ĐT', field: <Input size="small" value={contactPhone} readOnly disabled /> },
        { label: 'Email', field: <Input size="small" value={contactEmail} readOnly disabled /> },
      ],
    },
    // Row 3: Người duyệt, Ngày duyệt, Ngày Y/C giao
    {
      cells: [
        {
          label: 'Người duyệt',
          field: <LookupSelect resource="employees" labelField="fullName" disabled={locked}
            value={formValues.approverId as number} onChange={(v) => setField('approverId', v)} />,
        },
        { label: 'Ngày duyệt', field: <Input size="small" value={formatDateVN(data.approvedAt)} readOnly disabled /> },
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
    // Row 4: Khách hàng, Người liên hệ, SĐT
    {
      cells: [
        {
          label: 'Khách hàng', span: 2, required: true,
          field: (
            <LookupSelect resource="partners" labelField="shortName" disabled={locked}
              value={formValues.partnerId as number}
              onChange={(v) => {
                setField('partnerId', v)
                // TODO-BE: auto-fill contactPhone, contactEmail from partner
              }} />
          ),
        },
        // TODO-BE: Người liên hệ (Select theo KH + nút "…" thêm nhanh)
        { label: 'Người liên hệ', field: <Input size="small" disabled placeholder="TODO-BE" /> },
        { label: 'Số ĐT', field: <Input size="small" value={contactPhone} readOnly disabled /> },
      ],
    },
    // Row 5: Đ/C giao hàng, Email
    {
      cells: [
        // TODO-BE: Đ/C giao hàng (Select địa chỉ KH + nút "…")
        { label: 'Đ/C giao hàng', span: 4, field: <Input size="small" value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} disabled={locked} placeholder="TODO-BE" /> },
        { label: 'Email', field: <Input size="small" value={contactEmail} readOnly disabled /> },
      ],
    },
    // Row 6: Hình thức, PT thanh toán, PT giao hàng
    {
      cells: [
        {
          label: 'Hình thức',
          field: (
            <Select size="small" options={QUOTE_FORM_OPTIONS} value={formValues.quoteForm as string}
              onChange={(v) => setField('quoteForm', v)} disabled={locked} style={{ width: '100%' }} />
          ),
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
    // Row 7: TK thanh toán, DV đính kèm
    {
      cells: [
        // TODO-BE: TK thanh toán (Select TK ngân hàng cty)
        { label: 'TK thanh toán', span: 2, field: <Input size="small" value={bankAccount ?? ''} onChange={(e) => setBankAccount(e.target.value)} disabled={locked} placeholder="TODO-BE" /> },
        { label: 'DV đính kèm', span: 2, field: <Input size="small" value={attachedService} onChange={(e) => setAttachedService(e.target.value)} disabled={locked} /> },
      ],
    },
    // Row 8: Ghi chú
    {
      cells: [
        { label: 'Ghi chú', span: 6, field: <Input size="small" value={formValues.note as string ?? ''} onChange={(e) => setField('note', e.target.value)} disabled={locked} /> },
      ],
    },
  ]

  const rightRows = [
    { label: 'Hiện trạng', value: <Tag color={statusColor(data.status)}>{QUOTATION_STATUS_LABELS[data.status] ?? data.status}</Tag> },
    { label: '', value: <Checkbox checked={printBySet} onChange={(e) => setPrintBySet(e.target.checked)} disabled={locked}>Mẫu in theo bộ</Checkbox> },
    { label: 'Thời hạn BG', value: <InputNumber size="small" min={0} value={validityDays} onChange={(v) => setValidityDays(v ?? 2)} disabled={locked} style={{ width: 80 }} /> },
    { label: 'Giao hàng từ', value: <span><InputNumber size="small" min={0} value={deliveryFrom} onChange={(v) => setDeliveryFrom(v ?? 0)} disabled={locked} style={{ width: 60 }} /> đến <InputNumber size="small" min={0} value={deliveryTo} onChange={(v) => setDeliveryTo(v ?? 0)} disabled={locked} style={{ width: 60 }} /></span> },
    { label: 'Loại tiền', value: <span><Select size="small" options={CURRENCY_OPTIONS} value={currency} onChange={setCurrency} disabled={locked} style={{ width: 70 }} /> <InputNumber size="small" min={0} value={exchangeRate} onChange={(v) => setExchangeRate(v ?? 1)} disabled={locked} style={{ width: 60 }} /></span> },
    { label: 'Tổng tiền hàng', value: <span style={{ fontSize: 12 }}>{formatNumberVN(totals.totalAmount)}</span> },
    { label: 'VAT 10%', value: <span style={{ fontSize: 12 }}>{formatNumberVN(totals.totalVat)}</span> },
    { label: 'Tổng cộng', value: <span style={{ fontWeight: 700, fontSize: 13, color: '#cf1322' }}>{formatNumberVN(totals.totalWithVat)}</span>, bold: true },
  ]

  return (
    <div style={{ padding: '0 4px' }}>
      <HeaderGrid rows={headerRows} rightRows={rightRows} />

      <Tabs
        size="small"
        style={{ marginTop: 8 }}
        items={[
          {
            key: 'lines',
            label: 'Hàng hóa',
            children: (
              <QuotationLinesTab
                quotationId={data.id}
                lines={data.lines}
                locked={locked}
                queryKey={queryKey}
                quoteType={data.quoteType}
                onExportExcel={handleExportExcel}
                onWorkflowAction={handleWorkflowAction}
                onShowHistory={() => setShowHistoryDrawer(true)}
                onShowStock={(productId: number) => { setSelectedProductId(productId); setShowStockDrawer(true) }}
                onConvertToOrder={() => handleWorkflowAction('convert-to-order')}
                onReload={() => refetch()}
                status={data.status}
              />
            ),
          },
          {
            key: 'costs',
            label: 'Chi phí',
            children: <QuotationCostTab quotationId={data.id} locked={locked} />,
          },
          {
            key: 'pricing',
            label: 'Tính giá',
            children: <QuotationPricingTab quotationId={data.id} lines={data.lines} locked={locked} queryKey={queryKey} />,
          },
          {
            key: 'docs',
            label: 'Tài liệu',
            children: <QuotationDocTab quotationId={data.id} />,
          },
          {
            key: 'tasks',
            label: 'Công việc',
            children: <QuotationTaskTab quotationId={data.id} />,
          },
        ]}
      />

      <BottomToolbar
        onSave={handleSave}
        onPrint={handlePrint}
        onPrintPreview={handlePrintPreview}
        onClose={() => navigate('/sales/quotations')}
        workflowButtons={workflowButtons}
        locked={locked}
        disabled={saveMutation.isPending}
      />

      {/* Drawer Lịch sử thao tác */}
      <Drawer title="Lịch sử thao tác" open={showHistoryDrawer} onClose={() => setShowHistoryDrawer(false)} width={600}>
        {/* TODO-BE: GET /sales/quotations/{id}/workflow-log */}
        <p style={{ color: '#999' }}>Chưa có dữ liệu lịch sử. Cần API endpoint.</p>
      </Drawer>

      {/* Drawer Thông tin tồn kho */}
      <Drawer title="Thông tin tồn kho" open={showStockDrawer} onClose={() => setShowStockDrawer(false)} width={500}>
        <p>Sản phẩm ID: {selectedProductId}</p>
        {/* TODO-BE: GET /inventory/stock-balance?productId={selectedProductId} */}
        <p style={{ color: '#999' }}>Cần API endpoint tồn kho.</p>
      </Drawer>
    </div>
  )
}

// ========== Placeholder sub-tabs ==========

function QuotationCostTab(_props: { quotationId: number; locked: boolean }) {
  // TODO-BE: GET /sales/quotations/{id}/costs
  return (
    <div>
      <p style={{ color: '#999', fontSize: 12 }}>TODO-BE: API chi phí báo giá</p>
      <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#fafafa' }}>
            <th style={{ border: '1px solid #f0f0f0', padding: 4 }}>Loại chi phí</th>
            <th style={{ border: '1px solid #f0f0f0', padding: 4 }}>Đối tượng NCC</th>
            <th style={{ border: '1px solid #f0f0f0', padding: 4 }}>Tỷ lệ %</th>
            <th style={{ border: '1px solid #f0f0f0', padding: 4 }}>Mức phí</th>
            <th style={{ border: '1px solid #f0f0f0', padding: 4 }}>VAT %</th>
            <th style={{ border: '1px solid #f0f0f0', padding: 4 }}>Ghi chú</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td colSpan={6} style={{ border: '1px solid #f0f0f0', padding: 16, textAlign: 'center', color: '#999' }}>
              Chưa có chi phí
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

// PricingRow — QuotationLineOut + index signature để dùng với EditableGrid generic.
interface PricingRow extends QuotationLineOut {
  [key: string]: unknown
}

/** Tab "Tính giá" — lưới banded (2 tầng) + Giá duyệt/Giá duyệt(Kg) editable, persist qua PUT line. */
function QuotationPricingTab({ quotationId, lines, locked, queryKey }: {
  quotationId: number; lines: QuotationLineOut[]; locked: boolean; queryKey: QueryKey
}) {
  const { message } = AntApp.useApp()
  const queryClient = useQueryClient()

  const showError = (err: unknown, fallback: string) => {
    const body = axios.isAxiosError<ApiErrorBody>(err) ? err.response?.data : undefined
    message.error(body?.message ?? fallback)
  }

  const updateLineMutation = useMutation({
    mutationFn: ({ lineId, body }: { lineId: number; body: QuotationLineUpdate }) =>
      apiClient.put<QuotationLineOut>(`/sales/quotations/${quotationId}/lines/${lineId}`, body),
    onSuccess: (res, vars) => {
      queryClient.setQueryData<QuotationOut>(queryKey, (old) =>
        old ? { ...old, lines: old.lines.map((l) => (l.id === vars.lineId ? res.data : l)) } : old)
      message.success('Đã lưu giá duyệt')
    },
    onError: (err) => showError(err, 'Không thể lưu giá duyệt'),
  })

  const handleCellChange = (rowIndex: number, dataIndex: string, value: unknown) => {
    const line = lines[rowIndex]
    if (!line) return
    const v = value as number | null
    if (dataIndex === 'approvedPrice') {
      updateLineMutation.mutate({ lineId: line.id, body: { approvedPrice: v } })
    } else if (dataIndex === 'priceWeight') {
      updateLineMutation.mutate({ lineId: line.id, body: { priceWeight: v } })
    }
  }

  const handleExportExcel = () => {
    const header = ['Hàng hóa', 'ĐVT', 'Giá vốn', 'CP gia công/cái', 'CP mạ', 'Tổng GV/cái', 'Tổng giá vốn', 'Tỷ lệ %', 'Giá đề xuất', 'Giá tham khảo', 'Giá duyệt', 'Giá duyệt (Kg)', 'Giá trị duyệt']
    const rows = lines.map((l) => [
      l.productId, '', '', '', '', '', '', '', '', l.calcPrice ?? '', l.approvedPrice ?? '', l.priceWeight ?? '',
      (l.approvedPrice ?? 0) * l.quantity,
    ])
    const csvContent = [header, ...rows].map((r) => r.join('\t')).join('\n')
    const blob = new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `TinhGia_${quotationId}.csv`
    link.click()
    message.success('Đã kết xuất Excel')
  }

  const columns: EditColumn<PricingRow>[] = [
    {
      title: 'Hàng hóa', dataIndex: 'productId', width: 160,
      render: (v) => <LookupLabel resource="products" id={v as number} />,
    },
    { title: 'ĐVT', dataIndex: 'uom', width: 60, align: 'center', filterable: false, render: () => '-' },
    { title: 'Giá vốn', dataIndex: 'costPrice', width: 100, align: 'right', filterable: false, render: () => '-' },
    { title: 'CP gia công/cái', dataIndex: 'laborCost', width: 110, align: 'right', filterable: false, render: () => '-' },
    { title: 'CP mạ', dataIndex: 'platingCost', width: 90, align: 'right', filterable: false, render: () => '-' },
    { title: 'Tổng GV/cái', dataIndex: 'totalCostPerUnit', width: 110, align: 'right', filterable: false, render: () => '-' },
    { title: 'Tổng giá vốn', dataIndex: 'totalCost', width: 110, align: 'right', filterable: false, render: () => '-' },
    { title: 'Tỷ lệ %', dataIndex: 'costRatio', width: 80, align: 'right', filterable: false, render: () => '-' },
    { title: 'Giá đề xuất', dataIndex: 'suggestedPrice', width: 110, align: 'right', filterable: false, render: () => '-' },
    { title: 'Giá tham khảo', dataIndex: 'calcPrice', width: 110, align: 'right', filterable: false, formatNumber: true },
    {
      title: 'Giá duyệt', dataIndex: 'approvedPrice', width: 110, align: 'right', filterable: false,
      editable: true, editor: 'number', required: true, formatNumber: true,
    },
    {
      title: 'Giá duyệt (Kg)', dataIndex: 'priceWeight', width: 110, align: 'right', filterable: false,
      editable: true, editor: 'number', formatNumber: true,
    },
    {
      title: 'Giá trị duyệt', dataIndex: 'approvedValue', width: 130, align: 'right', filterable: false,
      render: (_v, record) => formatNumberVN((record.approvedPrice ?? 0) * record.quantity),
    },
  ]

  const columnGroups = [
    { title: 'Nguyên vật liệu', children: ['uom', 'costPrice'] },
    { title: 'Chi phí', children: ['laborCost', 'platingCost'] },
    { title: 'Tính giá', children: ['totalCostPerUnit', 'totalCost', 'costRatio', 'suggestedPrice', 'calcPrice', 'approvedPrice', 'priceWeight', 'approvedValue'] },
  ]

  const contextMenuGroups: ContextMenuGroup[] = [
    {
      items: [
        { label: 'Tính giá - Toàn bộ', onClick: () => message.info('TODO-BE: Tính giá toàn bộ'), disabled: locked },
        { label: 'Tính giá - Theo mã', onClick: () => message.info('TODO-BE: Tính giá theo mã'), disabled: locked },
        { label: 'Cập nhật tỷ trọng', onClick: () => message.info('TODO-BE: Cập nhật tỷ trọng'), disabled: locked },
        { label: 'Copy', onClick: () => message.info('TODO: Copy') },
      ],
    },
    {
      items: [
        { label: 'Lưu', shortcut: 'Ctrl+S', onClick: () => message.success('Đã lưu') },
        { label: 'Không lưu', onClick: () => queryClient.invalidateQueries({ queryKey }) },
      ],
    },
    {
      items: [
        { label: 'Kết xuất Excel', onClick: handleExportExcel },
      ],
    },
    {
      items: [
        { label: 'Thiết lập công thức tính', onClick: () => message.info('TODO-BE: Thiết lập công thức tính') },
        { label: 'Thiết lập NVL', onClick: () => message.info('TODO-BE: Thiết lập NVL') },
      ],
    },
    {
      items: [
        { label: 'Thông tin hàng hóa', onClick: () => message.info('TODO-BE: Thông tin hàng hóa'), disabled: lines.length === 0 },
        { label: 'Thông tin tồn kho', onClick: () => message.info('TODO-BE: Thông tin tồn kho'), disabled: lines.length === 0 },
        { label: 'Thông tin tồn kho NVL', onClick: () => message.info('TODO-BE: Thông tin tồn kho NVL'), disabled: lines.length === 0 },
      ],
    },
  ]

  return (
    <div className="docform-banded-header">
      <GridContextMenu groups={contextMenuGroups}>
        <EditableGrid<PricingRow>
          columns={columns}
          data={lines as unknown as PricingRow[]}
          rowKey="id"
          locked={locked}
          columnGroups={columnGroups}
          onCellChange={handleCellChange}
        />
      </GridContextMenu>
    </div>
  )
}

function QuotationDocTab(_props: { quotationId: number }) {
  // TODO-BE: API upload/list tài liệu đính kèm
  return (
    <div style={{ padding: 16, textAlign: 'center', color: '#999' }}>
      <p>TODO-BE: API tài liệu đính kèm</p>
      <p>Chưa có tài liệu</p>
    </div>
  )
}

function QuotationTaskTab(_props: { quotationId: number }) {
  // TODO-BE: API công việc liên quan
  return (
    <div style={{ padding: 16, textAlign: 'center', color: '#999' }}>
      <p>TODO-BE: API công việc</p>
      <p>Chưa có công việc</p>
    </div>
  )
}