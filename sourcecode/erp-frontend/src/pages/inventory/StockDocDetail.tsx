import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { App as AntApp, Button, Form, Input, Modal, Spin, Tabs, Tag, Typography } from 'antd'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { apiClient } from '../../api/client'
import type { ApiErrorBody, StockDocOut, StockDocUpdate } from '../../api/types'
import {
  WF_DEFINITIONS,
  ACTION_LABELS,
  PRIMARY_ACTIONS,
  DANGER_ACTIONS,
  STOCK_DOC_STATUS_LABELS,
  statusColor,
} from '../../api/workflow'
import {
  HeaderGrid, BottomToolbar, DocFormLayout, DocFormSidebar, DocFormAccordion, useDirtyGuard, useDocFormHotkeys,
} from '../../components/DocForm'
import type {
  WorkflowButton, HeaderRow, HeaderCell, RightRow, DocFormInfoRow, DocFormSection, DocFormTimelineItem,
} from '../../components/DocForm'
import '../../components/DocForm/DocForm.css'
import LookupSelect from '../../components/LookupSelect'
import StockDocLinesTab from './StockDocLinesTab'
import StockDocCostsTab from './StockDocCostsTab'
import { RECEIPT_SUB_TYPE_LABELS } from './ReceiptsList'
import { ISSUE_SUB_TYPE_LABELS } from './IssuesList'
import { formatDateVN } from '../../utils/format'

const DOC_TYPE_LABELS: Record<string, string> = {
  RECEIPT: 'Nhập kho',
  ISSUE: 'Xuất kho',
  TRANSFER: 'Chuyển kho',
}

const ALL_SUB_TYPE_LABELS: Record<string, string> = {
  ...RECEIPT_SUB_TYPE_LABELS,
  ...ISSUE_SUB_TYPE_LABELS,
  INTERNAL_TRANSFER: 'Chuyển kho nội bộ',
}

export default function StockDocDetailPage() {
  const { id } = useParams<{ id: string }>()
  const docId = Number(id)
  const navigate = useNavigate()
  const { message } = AntApp.useApp()
  const queryClient = useQueryClient()
  const queryKey = ['stock-doc', docId]

  const [cancelReason, setCancelReason] = useState('')
  const [cancelModalOpen, setCancelModalOpen] = useState(false)
  const [outsourcingModalOpen, setOutsourcingModalOpen] = useState(false)
  const [outsourcingForm] = Form.useForm()

  const [formValues, setFormValues] = useState<Record<string, unknown>>({})
  const [dirty, setDirty] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // --- Query doc ---
  const { data: doc, isLoading } = useQuery({
    queryKey,
    queryFn: async () => (await apiClient.get<StockDocOut>(`/inventory/docs/${docId}`)).data,
    enabled: !isNaN(docId),
  })

  useEffect(() => {
    if (!doc) return
    setFormValues({
      partnerId: doc.partnerId,
      processId: doc.processId,
      fromWarehouseId: doc.fromWarehouseId,
      toWarehouseId: doc.toWarehouseId,
      note: doc.note,
    })
    setDirty(false)
    setErrors({})
  }, [doc])

  // --- Save header ---
  const saveMutation = useMutation({
    mutationFn: (body: StockDocUpdate) => apiClient.put(`/inventory/docs/${docId}`, body),
    onSuccess: () => {
      message.success('Đã lưu')
      setDirty(false)
      queryClient.invalidateQueries({ queryKey })
    },
    onError: (err: unknown) => {
      const body = axios.isAxiosError<ApiErrorBody>(err) ? err.response?.data : undefined
      message.error(body?.message ?? 'Không thể lưu')
    },
  })

  const handleSave = useCallback(() => {
    if (!doc) return
    if (doc.docType === 'RECEIPT' && !formValues.toWarehouseId) {
      setErrors({ toWarehouseId: 'Vui lòng chọn kho nhập' })
      message.error('Vui lòng chọn kho nhập')
      return
    }
    const body: StockDocUpdate = {
      partnerId: (formValues.partnerId as number) ?? null,
      processId: (formValues.processId as number) ?? null,
      fromWarehouseId: (formValues.fromWarehouseId as number) ?? null,
      toWarehouseId: (formValues.toWarehouseId as number) ?? null,
      note: (formValues.note as string) ?? null,
    }
    saveMutation.mutate(body)
  }, [doc, formValues, saveMutation, message])

  const setField = useCallback((key: string, value: unknown) => {
    setFormValues((prev) => ({ ...prev, [key]: value }))
    setDirty(true)
    if (key === 'toWarehouseId' && value) {
      setErrors((prev) => {
        if (!prev.toWarehouseId) return prev
        const { toWarehouseId: _drop, ...rest } = prev
        return rest
      })
    }
  }, [])

  // --- Workflow actions ---
  const workflowMutation = useMutation({
    mutationFn: ({ action, reason }: { action: string; reason?: string }) =>
      apiClient.post(`/inventory/docs/${docId}/actions/${action}`, reason ? { reason } : undefined),
    onSuccess: () => {
      message.success('Đã cập nhật trạng thái')
      queryClient.invalidateQueries({ queryKey })
    },
    onError: (err: unknown) => {
      const body = axios.isAxiosError<ApiErrorBody>(err) ? err.response?.data : undefined
      message.error(body?.message ?? 'Không thể cập nhật trạng thái')
    },
  })

  // --- Create outsourcing issue (from PURCHASE RECEIPT COMPLETED) ---
  const createOutsourcingIssueMutation = useMutation({
    mutationFn: (values: { processId: number; supplierId: number }) =>
      apiClient.post(`/inventory/docs/${docId}/actions/create-outsourcing-issue`, values),
    onSuccess: (res) => {
      message.success('Đã tạo phiếu xuất SX-DV')
      setOutsourcingModalOpen(false)
      const newDoc = res.data as StockDocOut
      navigate(`/inventory/docs/${newDoc.id}`)
    },
    onError: (err: unknown) => {
      const body = axios.isAxiosError<ApiErrorBody>(err) ? err.response?.data : undefined
      message.error(body?.message ?? 'Không thể tạo phiếu xuất SX-DV')
    },
  })

  // --- Create finished receipt (from OUTSOURCING ISSUE COMPLETED) ---
  const createFinishedReceiptMutation = useMutation({
    mutationFn: () => apiClient.post(`/inventory/docs/${docId}/actions/create-finished-receipt`),
    onSuccess: (res) => {
      message.success('Đã tạo phiếu nhập SP-TP')
      const newDoc = res.data as StockDocOut
      navigate(`/inventory/docs/${newDoc.id}`)
    },
    onError: (err: unknown) => {
      const body = axios.isAxiosError<ApiErrorBody>(err) ? err.response?.data : undefined
      message.error(body?.message ?? 'Không thể tạo phiếu nhập SP-TP')
    },
  })

  // Sidebar phải: ngày yêu cầu/thực tế
  const sidebarInfoRows: DocFormInfoRow[] = useMemo(() => {
    if (!doc) return []
    return [
      { label: 'Ngày yêu cầu', value: formatDateVN(doc.requestDate) },
      { label: 'Ngày thực tế', value: doc.actualDate ? formatDateVN(doc.actualDate) : '—' },
    ]
  }, [doc])

  // Sidebar phải: dòng thời gian hoạt động — suy ra từ dữ liệu phiếu (chưa có API /timeline)
  const sidebarTimeline: DocFormTimelineItem[] = useMemo(() => {
    if (!doc) return []
    const items: DocFormTimelineItem[] = [
      {
        timestamp: doc.requestDate,
        type: 'ACTIVITY',
        description: `Tạo phiếu ${DOC_TYPE_LABELS[doc.docType] ?? doc.docType}`,
        actor: null,
        metadata: {},
      },
    ]
    if (doc.actualDate) {
      items.push({
        timestamp: doc.actualDate,
        type: 'STATUS_CHANGE',
        description: STOCK_DOC_STATUS_LABELS[doc.status] ?? doc.status,
        actor: null,
        metadata: { status: doc.status },
      })
    }
    if (doc.statusReason && doc.status === 'CANCELLED') {
      items.push({
        timestamp: doc.actualDate ?? doc.requestDate,
        type: 'STATUS_CHANGE',
        description: `Hủy phiếu: ${doc.statusReason}`,
        actor: null,
        metadata: { status: doc.status },
      })
    }
    return items.reverse()
  }, [doc])

  useDocFormHotkeys({ onSave: handleSave })
  const { guardAction } = useDirtyGuard(dirty)

  if (isLoading) return <Spin style={{ display: 'block', margin: '80px auto' }} />
  if (!doc) return <Typography.Text type="danger">Không tìm thấy phiếu kho</Typography.Text>

  const locked = doc.status === 'COMPLETED' || doc.status === 'CANCELLED'
  const isReceipt = doc.docType === 'RECEIPT'
  const isIssue = doc.docType === 'ISSUE'
  const isTransfer = doc.docType === 'TRANSFER'
  const showProcess = ['OUTSOURCING', 'FINISHED_GOODS'].includes(doc.subType)
  const hasRefDoc = !!(doc.purchaseOrderId || doc.salesOrderId)

  // --- Build workflow buttons ---
  const transitions = WF_DEFINITIONS['stock-docs']?.filter((t) => t.from.includes(doc.status)) ?? []
  const workflowButtons: WorkflowButton[] = transitions.map((t) => ({
    label: ACTION_LABELS[t.action] ?? t.action,
    onClick: () => {
      if (t.requireReason) {
        setCancelReason('')
        setCancelModalOpen(true)
      } else {
        workflowMutation.mutate({ action: t.action })
      }
    },
    type: DANGER_ACTIONS.has(t.action) ? 'danger' as const : PRIMARY_ACTIONS.has(t.action) ? 'primary' as const : 'default' as const,
    loading: workflowMutation.isPending,
  }))

  // --- Outsourcing issue modal submit ---
  const handleOutsourcingSubmit = async () => {
    const values = await outsourcingForm.validateFields()
    createOutsourcingIssueMutation.mutate({
      processId: values.processId,
      supplierId: values.supplierId,
    })
  }

  // --- Tabs ---
  const tabItems = [
    {
      key: 'lines',
      label: 'Chi tiết hàng hóa',
      children: (
        <StockDocLinesTab
          docId={docId}
          lines={doc.lines ?? []}
          docType={doc.docType}
          status={doc.status}
          hasRefDoc={hasRefDoc}
        />
      ),
    },
    ...(isReceipt
      ? [
          {
            key: 'costs',
            label: 'Chi phí nhập kho',
            children: <StockDocCostsTab docId={docId} status={doc.status} />,
          },
        ]
      : []),
  ]

  // --- Header grid ---
  const headerCells: HeaderCell[] = [
    { label: 'Số phiếu', field: <Input size="small" value={doc.docNo} readOnly disabled /> },
    {
      label: 'Loại phiếu',
      field: <Tag>{DOC_TYPE_LABELS[doc.docType] ?? doc.docType} — {ALL_SUB_TYPE_LABELS[doc.subType] ?? doc.subType}</Tag>,
    },
    { label: 'Ngày yêu cầu', field: <Input size="small" value={formatDateVN(doc.requestDate)} readOnly disabled /> },
  ]
  if (isIssue || isTransfer) {
    headerCells.push({
      label: 'Kho xuất',
      field: <LookupSelect resource="warehouses" value={formValues.fromWarehouseId as number}
        onChange={(v) => setField('fromWarehouseId', v)} placeholder="Chọn kho xuất" disabled={locked} />,
    })
  }
  if (isReceipt || isTransfer) {
    headerCells.push({
      label: 'Kho nhập', required: isReceipt, error: errors.toWarehouseId,
      field: <LookupSelect resource="warehouses" value={formValues.toWarehouseId as number}
        onChange={(v) => setField('toWarehouseId', v)} placeholder="Chọn kho nhập" disabled={locked} />,
    })
  }
  if (!isTransfer) {
    headerCells.push({
      label: 'Đối tượng',
      field: <LookupSelect resource="partners" labelField="shortName" value={formValues.partnerId as number}
        onChange={(v) => setField('partnerId', v)} placeholder="Chọn đối tác" disabled={locked} />,
    })
  }
  if (doc.purchaseOrderId) {
    headerCells.push({ label: 'Đơn mua', field: <Input size="small" value={`PO #${doc.purchaseOrderId}`} readOnly disabled /> })
  }
  if (doc.salesOrderId) {
    headerCells.push({ label: 'Đơn bán', field: <Input size="small" value={`SO #${doc.salesOrderId}`} readOnly disabled /> })
  }
  if (showProcess) {
    headerCells.push({
      label: 'Quy trình',
      field: <LookupSelect resource="processes" value={formValues.processId as number}
        onChange={(v) => setField('processId', v)} placeholder="Chọn quy trình" disabled={locked} />,
    })
  }
  if (doc.actualDate) {
    headerCells.push({ label: 'Ngày thực tế', field: <Input size="small" value={formatDateVN(doc.actualDate)} readOnly disabled /> })
  }

  const headerRows: HeaderRow[] = []
  for (let i = 0; i < headerCells.length; i += 3) {
    headerRows.push({ cells: headerCells.slice(i, i + 3) })
  }
  headerRows.push({
    cells: [
      {
        label: 'Ghi chú', span: 6,
        field: <Input.TextArea rows={1} value={formValues.note as string ?? ''}
          onChange={(e) => setField('note', e.target.value)} disabled={locked} />,
      },
    ],
  })

  const rightRows: RightRow[] = [
    { label: 'Hiện trạng', value: <Tag color={statusColor(doc.status)}>{STOCK_DOC_STATUS_LABELS[doc.status] ?? doc.status}</Tag> },
  ]

  const accordionSections: DocFormSection[] = [
    {
      key: 'general',
      header: 'Thông tin chung',
      content: (
        <>
          <HeaderGrid rows={headerRows} rightRows={rightRows} />
          {doc.status === 'COMPLETED' && doc.docType === 'RECEIPT' && doc.subType === 'PURCHASE' && (
            <Button type="dashed" style={{ marginTop: 8 }} onClick={() => setOutsourcingModalOpen(true)}>
              YC Xuất cho SX-DV
            </Button>
          )}
          {doc.status === 'COMPLETED' && doc.docType === 'ISSUE' && doc.subType === 'OUTSOURCING' && (
            <Button type="dashed" style={{ marginTop: 8 }} onClick={() => createFinishedReceiptMutation.mutate()} loading={createFinishedReceiptMutation.isPending}>
              YC Nhập SP-TP
            </Button>
          )}
        </>
      ),
    },
    {
      key: 'detail',
      header: 'Chi tiết',
      content: <Tabs items={tabItems} />,
    },
  ]

  return (
    <div style={{ padding: '0 4px' }}>
      <DocFormLayout
        actionBar={(
          <BottomToolbar
            onSave={handleSave}
            onClose={() => guardAction(() => navigate(-1))}
            workflowButtons={workflowButtons}
            locked={locked}
            disabled={saveMutation.isPending}
          />
        )}
        sidebar={(
          <DocFormSidebar
            statusLabel={STOCK_DOC_STATUS_LABELS[doc.status] ?? doc.status}
            statusColor={statusColor(doc.status)}
            statusReason={doc.statusReason}
            infoRows={sidebarInfoRows}
            timeline={sidebarTimeline}
          />
        )}
      >
        <DocFormAccordion sections={accordionSections} />
      </DocFormLayout>

      {/* Cancel modal */}
      <Modal
        title="Hủy phiếu"
        open={cancelModalOpen}
        onOk={() => {
          workflowMutation.mutate({ action: 'cancel', reason: cancelReason })
          setCancelModalOpen(false)
        }}
        onCancel={() => setCancelModalOpen(false)}
        okText="Hủy phiếu"
        okButtonProps={{ danger: true }}
        cancelText="Đóng"
      >
        <Input.TextArea
          rows={3}
          placeholder="Lý do hủy"
          value={cancelReason}
          onChange={(e) => setCancelReason(e.target.value)}
        />
      </Modal>

      {/* Outsourcing issue modal */}
      <Modal
        title="Tạo yêu cầu xuất cho SX-DV"
        open={outsourcingModalOpen}
        onOk={handleOutsourcingSubmit}
        onCancel={() => setOutsourcingModalOpen(false)}
        confirmLoading={createOutsourcingIssueMutation.isPending}
        okText="Tạo phiếu xuất"
        cancelText="Đóng"
        forceRender
      >
        <Form form={outsourcingForm} layout="vertical">
          <Form.Item label="Quy trình gia công" name="processId" rules={[{ required: true, message: 'Chọn quy trình' }]}>
            <LookupSelect resource="processes" placeholder="Chọn quy trình" />
          </Form.Item>
          <Form.Item label="NCC gia công" name="supplierId" rules={[{ required: true, message: 'Chọn NCC gia công' }]}>
            <LookupSelect resource="partners" labelField="shortName" placeholder="Chọn NCC gia công" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
