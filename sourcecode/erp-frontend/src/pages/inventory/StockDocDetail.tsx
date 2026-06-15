import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { App as AntApp, Button, Card, Descriptions, Form, Input, Modal, Spin, Tabs, Tag, Typography } from 'antd'
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
import type { WorkflowButton } from '../../components/DocForm/BottomToolbar'
import BottomToolbar from '../../components/DocForm/BottomToolbar'
import LookupLabel from '../../components/LookupLabel'
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

  // --- Query doc ---
  const { data: doc, isLoading } = useQuery({
    queryKey,
    queryFn: async () => (await apiClient.get<StockDocOut>(`/inventory/docs/${docId}`)).data,
    enabled: !isNaN(docId),
  })

  // --- Save header ---
  const saveMutation = useMutation({
    mutationFn: (body: StockDocUpdate) => apiClient.patch(`/inventory/docs/${docId}`, body),
    onSuccess: () => {
      message.success('Đã lưu')
      queryClient.invalidateQueries({ queryKey })
    },
    onError: (err: unknown) => {
      const body = axios.isAxiosError<ApiErrorBody>(err) ? err.response?.data : undefined
      message.error(body?.message ?? 'Không thể lưu')
    },
  })

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

  if (isLoading) return <Spin style={{ display: 'block', margin: '80px auto' }} />
  if (!doc) return <Typography.Text type="danger">Không tìm thấy phiếu kho</Typography.Text>

  const locked = doc.status === 'COMPLETED' || doc.status === 'CANCELLED'
  const editable = !locked
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

  // --- Header update helpers ---
  const updateHeader = (field: string, value: number | string | null) => {
    saveMutation.mutate({ [field]: value })
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

  return (
    <div className="docform-container">
      {/* Header */}
      <Card size="small" style={{ marginBottom: 12 }}>
        <Descriptions column={3} size="small">
          <Descriptions.Item label="Số phiếu">{doc.docNo}</Descriptions.Item>
          <Descriptions.Item label="Loại phiếu">
            <Tag>{DOC_TYPE_LABELS[doc.docType] ?? doc.docType} — {ALL_SUB_TYPE_LABELS[doc.subType] ?? doc.subType}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Trạng thái">
            <Tag color={statusColor(doc.status)}>{STOCK_DOC_STATUS_LABELS[doc.status] ?? doc.status}</Tag>
          </Descriptions.Item>

          {(isIssue || isTransfer) && (
            <Descriptions.Item label="Kho xuất">
              {editable ? (
                <LookupSelect
                  resource="warehouses"
                  value={doc.fromWarehouseId}
                  onChange={(v) => updateHeader('fromWarehouseId', v)}
                  placeholder="Chọn kho xuất"
                  disabled={locked}
                />
              ) : (
                <LookupLabel resource="warehouses" id={doc.fromWarehouseId} />
              )}
            </Descriptions.Item>
          )}
          {(isReceipt || isTransfer) && (
            <Descriptions.Item label="Kho nhập">
              {editable ? (
                <LookupSelect
                  resource="warehouses"
                  value={doc.toWarehouseId}
                  onChange={(v) => updateHeader('toWarehouseId', v)}
                  placeholder="Chọn kho nhập"
                  disabled={locked}
                />
              ) : (
                <LookupLabel resource="warehouses" id={doc.toWarehouseId} />
              )}
            </Descriptions.Item>
          )}
          {!isTransfer && (
            <Descriptions.Item label="Đối tượng">
              {editable ? (
                <LookupSelect
                  resource="partners"
                  labelField="shortName"
                  value={doc.partnerId}
                  onChange={(v) => updateHeader('partnerId', v)}
                  placeholder="Chọn đối tác"
                />
              ) : doc.partnerId ? (
                <LookupLabel resource="partners" id={doc.partnerId} labelField="shortName" />
              ) : (
                '—'
              )}
            </Descriptions.Item>
          )}
          {doc.purchaseOrderId && (
            <Descriptions.Item label="Đơn mua">{`PO #${doc.purchaseOrderId}`}</Descriptions.Item>
          )}
          {doc.salesOrderId && (
            <Descriptions.Item label="Đơn bán">{`SO #${doc.salesOrderId}`}</Descriptions.Item>
          )}
          {showProcess && (
            <Descriptions.Item label="Quy trình">
              {editable ? (
                <LookupSelect
                  resource="processes"
                  value={doc.processId}
                  onChange={(v) => updateHeader('processId', v)}
                  placeholder="Chọn quy trình"
                />
              ) : doc.processId ? (
                <LookupLabel resource="processes" id={doc.processId} />
              ) : (
                '—'
              )}
            </Descriptions.Item>
          )}
          <Descriptions.Item label="Ngày yêu cầu">{formatDateVN(doc.requestDate)}</Descriptions.Item>
          <Descriptions.Item label="Ngày thực tế">{doc.actualDate ? formatDateVN(doc.actualDate) : '—'}</Descriptions.Item>
          <Descriptions.Item label="Ghi chú">
            {editable ? (
              <Input
                size="small"
                defaultValue={doc.note ?? ''}
                onBlur={(e) => {
                  if (e.target.value !== (doc.note ?? '')) {
                    saveMutation.mutate({ note: e.target.value || null })
                  }
                }}
              />
            ) : (
              doc.note ?? '—'
            )}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* Special action buttons */}
      {doc.status === 'COMPLETED' && doc.docType === 'RECEIPT' && doc.subType === 'PURCHASE' && (
        <Button type="dashed" style={{ marginBottom: 12 }} onClick={() => setOutsourcingModalOpen(true)}>
          YC Xuất cho SX-DV
        </Button>
      )}
      {doc.status === 'COMPLETED' && doc.docType === 'ISSUE' && doc.subType === 'OUTSOURCING' && (
        <Button type="dashed" style={{ marginBottom: 12 }} onClick={() => createFinishedReceiptMutation.mutate()} loading={createFinishedReceiptMutation.isPending}>
          YC Nhập SP-TP
        </Button>
      )}

      {/* Tabs */}
      <Tabs items={tabItems} />

      {/* Bottom toolbar */}
      <BottomToolbar
        onClose={() => navigate(-1)}
        workflowButtons={workflowButtons}
        locked={locked}
        disabled={false}
      />

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