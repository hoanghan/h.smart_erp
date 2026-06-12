import { useNavigate, useSearchParams } from 'react-router-dom'
import { App as AntApp, Button, DatePicker, Form, Input, Select } from 'antd'
import { useMutation } from '@tanstack/react-query'
import axios from 'axios'
import dayjs from 'dayjs'
import { apiClient } from '../../api/client'
import type { ApiErrorBody, StockDocOut, StockDocCreate } from '../../api/types'
import LookupSelect from '../../components/LookupSelect'
import { RECEIPT_SUB_TYPE_LABELS } from './ReceiptsList'
import { ISSUE_SUB_TYPE_LABELS } from './IssuesList'

const DOC_TYPE_LABELS: Record<string, string> = {
  RECEIPT: 'Nhập kho',
  ISSUE: 'Xuất kho',
  TRANSFER: 'Chuyển kho',
}

export default function StockDocNewPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { message } = AntApp.useApp()
  const [form] = Form.useForm()

  const docType = searchParams.get('docType') ?? 'RECEIPT'
  const subType = searchParams.get('subType') ?? 'PURCHASE'

  const isReceipt = docType === 'RECEIPT'
  const isIssue = docType === 'ISSUE'
  const isTransfer = docType === 'TRANSFER'
  const showProcess = ['OUTSOURCING', 'FINISHED_GOODS'].includes(subType)
  const showPartner = !isTransfer
  const showFromWarehouse = isIssue || isTransfer
  const showToWarehouse = isReceipt || isTransfer

  const subTypeOptions = isReceipt
    ? Object.entries(RECEIPT_SUB_TYPE_LABELS).map(([value, label]) => ({ value, label }))
    : isIssue
      ? Object.entries(ISSUE_SUB_TYPE_LABELS).map(([value, label]) => ({ value, label }))
      : [{ value: 'INTERNAL_TRANSFER', label: 'Chuyển kho nội bộ' }]

  const createMutation = useMutation({
    mutationFn: (values: StockDocCreate) => apiClient.post<StockDocOut>('/inventory/docs', values),
    onSuccess: (res) => {
      message.success('Đã tạo phiếu kho')
      navigate(`/inventory/docs/${res.data.id}`, { replace: true })
    },
    onError: (err: unknown) => {
      const body = axios.isAxiosError<ApiErrorBody>(err) ? err.response?.data : undefined
      message.error(body?.message ?? 'Không thể tạo phiếu kho')
    },
  })

  const handleCreate = async () => {
    const values = await form.validateFields()
    createMutation.mutate({
      docType,
      subType,
      partnerId: values.partnerId ?? null,
      processId: values.processId ?? null,
      fromWarehouseId: values.fromWarehouseId ?? null,
      toWarehouseId: values.toWarehouseId ?? null,
      requestDate: values.requestDate ? values.requestDate.format('YYYY-MM-DD') : null,
      note: values.note ?? null,
    })
  }

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: 24 }}>
      <h2>Tạo phiếu {DOC_TYPE_LABELS[docType] ?? docType}</h2>
      <Form
        form={form}
        layout="vertical"
        initialValues={{ subType, requestDate: dayjs() }}
      >
        <Form.Item label="Loại" name="subType">
          <Select options={subTypeOptions} disabled />
        </Form.Item>

        {showPartner && (
          <Form.Item label="Đối tượng" name="partnerId">
            <LookupSelect resource="partners" labelField="shortName" placeholder="Chọn đối tác" />
          </Form.Item>
        )}

        {showProcess && (
          <Form.Item label="Quy trình gia công" name="processId" rules={[{ required: true, message: 'Chọn quy trình' }]}>
            <LookupSelect resource="processes" placeholder="Chọn quy trình" />
          </Form.Item>
        )}

        {showFromWarehouse && (
          <Form.Item label="Kho xuất" name="fromWarehouseId" rules={[{ required: true, message: 'Chọn kho xuất' }]}>
            <LookupSelect resource="warehouses" placeholder="Chọn kho xuất" />
          </Form.Item>
        )}

        {showToWarehouse && (
          <Form.Item label="Kho nhập" name="toWarehouseId" rules={[{ required: true, message: 'Chọn kho nhập' }]}>
            <LookupSelect resource="warehouses" placeholder="Chọn kho nhập" />
          </Form.Item>
        )}

        <Form.Item label="Ngày yêu cầu" name="requestDate">
          <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
        </Form.Item>

        <Form.Item label="Ghi chú" name="note">
          <Input.TextArea rows={3} />
        </Form.Item>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button onClick={() => navigate(-1)}>Hủy</Button>
          <Button type="primary" onClick={handleCreate} loading={createMutation.isPending}>
            Tạo phiếu
          </Button>
        </div>
      </Form>
    </div>
  )
}