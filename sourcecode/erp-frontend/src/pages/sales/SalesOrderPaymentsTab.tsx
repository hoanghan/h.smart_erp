import { App as AntApp, Button, DatePicker, Form, Input, InputNumber, Popconfirm, Select, Tag } from 'antd'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import type { Dayjs } from 'dayjs'
import { apiClient } from '../../api/client'
import type {
  ApiErrorBody, SoPaymentActualIn, SoPaymentActualOut, SoPaymentActualUpdate,
  SoPaymentRequestIn, SoPaymentRequestOut, SoPaymentRequestUpdate,
} from '../../api/types'
import { EditableGrid, GridContextMenu } from '../../components/DocForm'
import type { EditColumn, ContextMenuGroup } from '../../components/DocForm'
import LookupLabel from '../../components/LookupLabel'
import LookupSelect from '../../components/LookupSelect'
import { formatDateVN } from '../../utils/format'

interface SalesOrderPaymentsTabProps {
  orderId: number
  locked: boolean
}

interface ReqRow extends SoPaymentRequestOut {
  [key: string]: unknown
}
interface ActualRow extends SoPaymentActualOut {
  [key: string]: unknown
}

const STATUS_OPTIONS = [
  { value: 'PENDING', label: 'Chưa gửi' },
  { value: 'SENT_FRM', label: 'Đã gửi FRM' },
  { value: 'PAID', label: 'Đã thanh toán' },
  { value: 'CANCELLED', label: 'Đã hủy' },
]

const STATUS_TAG: Record<string, { color: string; label: string }> = {
  PENDING: { color: 'default', label: 'Chưa gửi' },
  SENT_FRM: { color: 'blue', label: 'Đã gửi FRM' },
  PAID: { color: 'green', label: 'Đã thanh toán' },
  CANCELLED: { color: 'red', label: 'Đã hủy' },
}

/** Tab "Thanh toán" của đơn hàng bán — Yêu cầu thanh toán + Thực tế thanh toán. */
export default function SalesOrderPaymentsTab({ orderId, locked }: SalesOrderPaymentsTabProps) {
  const { message } = AntApp.useApp()
  const queryClient = useQueryClient()
  const [reqForm] = Form.useForm()
  const [actualForm] = Form.useForm()

  const showError = (err: unknown, fallback: string) => {
    const body = axios.isAxiosError<ApiErrorBody>(err) ? err.response?.data : undefined
    message.error(body?.message ?? fallback)
  }

  // ----- Payment requests -----
  const reqQueryKey = ['so-payment-requests', orderId]
  const { data: requests = [] } = useQuery({
    queryKey: reqQueryKey,
    queryFn: async () => (await apiClient.get<SoPaymentRequestOut[]>(`/sales/orders/${orderId}/payment-requests`)).data,
  })

  const addReqMutation = useMutation({
    mutationFn: (body: SoPaymentRequestIn) => apiClient.post(`/sales/orders/${orderId}/payment-requests`, body),
    onSuccess: () => {
      message.success('Đã thêm yêu cầu thanh toán')
      reqForm.resetFields()
      queryClient.invalidateQueries({ queryKey: reqQueryKey })
    },
    onError: (err) => showError(err, 'Không thể thêm yêu cầu thanh toán'),
  })

  const updateReqMutation = useMutation({
    mutationFn: ({ reqId, body }: { reqId: number; body: SoPaymentRequestUpdate }) =>
      apiClient.put(`/sales/orders/${orderId}/payment-requests/${reqId}`, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: reqQueryKey }),
    onError: (err) => showError(err, 'Không thể lưu yêu cầu thanh toán'),
  })

  const deleteReqMutation = useMutation({
    mutationFn: (reqId: number) => apiClient.delete(`/sales/orders/${orderId}/payment-requests/${reqId}`),
    onSuccess: () => {
      message.success('Đã xóa yêu cầu thanh toán')
      queryClient.invalidateQueries({ queryKey: reqQueryKey })
    },
    onError: (err) => showError(err, 'Không thể xóa yêu cầu thanh toán'),
  })

  const handleAddReq = async () => {
    const values = await reqForm.validateFields()
    addReqMutation.mutate({
      dueDate: (values.dueDate as Dayjs).format('YYYY-MM-DD'),
      amount: values.amount,
      status: values.status ?? 'PENDING',
    })
  }

  const handleReqCellChange = (rowIndex: number, dataIndex: string, value: unknown) => {
    const req = requests[rowIndex]
    if (!req) return
    if (dataIndex === 'dueDate') updateReqMutation.mutate({ reqId: req.id, body: { dueDate: (value as string | null) ?? undefined } })
    else if (dataIndex === 'amount') updateReqMutation.mutate({ reqId: req.id, body: { amount: (value as number | null) ?? undefined } })
    else if (dataIndex === 'status') updateReqMutation.mutate({ reqId: req.id, body: { status: (value as string | null) ?? undefined } })
  }

  const reqColumns: EditColumn<ReqRow>[] = [
    {
      title: 'Hạn thanh toán', dataIndex: 'dueDate', width: 120, align: 'center', filterable: false,
      editable: true, editor: 'input', required: true,
      render: (v) => formatDateVN(v as string | null),
    },
    {
      title: 'Số tiền', dataIndex: 'amount', width: 140, align: 'right', filterable: false,
      editable: true, editor: 'number', required: true, formatNumber: true,
    },
    {
      title: 'Trạng thái', dataIndex: 'status', width: 140, align: 'center', filterable: false,
      editable: true, editor: 'select', editorOptions: STATUS_OPTIONS,
      render: (v) => {
        const s = STATUS_TAG[v as string] ?? { color: 'default', label: v as string }
        return <Tag color={s.color}>{s.label}</Tag>
      },
    },
    {
      title: 'Tự động', dataIndex: 'autoGenerated', width: 90, align: 'center', filterable: false,
      render: (v) => (v ? <Tag>Tự động</Tag> : null),
    },
    {
      title: '', dataIndex: '__actions', width: 56, filterable: false,
      render: (_v, record) => (
        <Popconfirm title="Xóa yêu cầu này?" okText="Xóa" cancelText="Hủy" onConfirm={() => deleteReqMutation.mutate(record.id)}>
          <Button size="small" danger icon={<DeleteOutlined />} loading={deleteReqMutation.isPending} />
        </Popconfirm>
      ),
    },
  ]

  const reqContextMenuGroups: ContextMenuGroup[] = [
    {
      items: [
        { label: 'Thêm dòng cuối', shortcut: 'Ctrl+I', onClick: handleAddReq, disabled: locked },
        {
          label: 'Xóa dòng cuối', onClick: () => {
            const last = requests[requests.length - 1]
            if (last) deleteReqMutation.mutate(last.id)
          }, disabled: locked || requests.length === 0,
        },
        { label: 'Lưu', shortcut: 'Ctrl+S', onClick: () => message.success('Đã lưu') },
        { label: 'Không lưu', onClick: () => queryClient.invalidateQueries({ queryKey: reqQueryKey }) },
      ],
    },
  ]

  // ----- Payment actuals -----
  const actualQueryKey = ['so-payment-actuals', orderId]
  const { data: actuals = [] } = useQuery({
    queryKey: actualQueryKey,
    queryFn: async () => (await apiClient.get<SoPaymentActualOut[]>(`/sales/orders/${orderId}/payment-actuals`)).data,
  })

  const addActualMutation = useMutation({
    mutationFn: (body: SoPaymentActualIn) => apiClient.post(`/sales/orders/${orderId}/payment-actuals`, body),
    onSuccess: () => {
      message.success('Đã thêm thực tế thanh toán')
      actualForm.resetFields()
      queryClient.invalidateQueries({ queryKey: actualQueryKey })
    },
    onError: (err) => showError(err, 'Không thể thêm thực tế thanh toán'),
  })

  const updateActualMutation = useMutation({
    mutationFn: ({ actualId, body }: { actualId: number; body: SoPaymentActualUpdate }) =>
      apiClient.put(`/sales/orders/${orderId}/payment-actuals/${actualId}`, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: actualQueryKey }),
    onError: (err) => showError(err, 'Không thể lưu thực tế thanh toán'),
  })

  const deleteActualMutation = useMutation({
    mutationFn: (actualId: number) => apiClient.delete(`/sales/orders/${orderId}/payment-actuals/${actualId}`),
    onSuccess: () => {
      message.success('Đã xóa thực tế thanh toán')
      queryClient.invalidateQueries({ queryKey: actualQueryKey })
    },
    onError: (err) => showError(err, 'Không thể xóa thực tế thanh toán'),
  })

  const handleAddActual = async () => {
    const values = await actualForm.validateFields()
    addActualMutation.mutate({
      payDate: (values.payDate as Dayjs).format('YYYY-MM-DD'),
      amount: values.amount,
      methodId: values.methodId ?? null,
      note: values.note ?? null,
    })
  }

  const handleActualCellChange = (rowIndex: number, dataIndex: string, value: unknown) => {
    const actual = actuals[rowIndex]
    if (!actual) return
    if (dataIndex === 'payDate') updateActualMutation.mutate({ actualId: actual.id, body: { payDate: (value as string | null) ?? undefined } })
    else if (dataIndex === 'amount') updateActualMutation.mutate({ actualId: actual.id, body: { amount: (value as number | null) ?? undefined } })
    else if (dataIndex === 'note') updateActualMutation.mutate({ actualId: actual.id, body: { note: value as string | null } })
  }

  const actualColumns: EditColumn<ActualRow>[] = [
    {
      title: 'Ngày thanh toán', dataIndex: 'payDate', width: 120, align: 'center', filterable: false,
      editable: true, editor: 'input', required: true,
      render: (v) => formatDateVN(v as string | null),
    },
    {
      title: 'Số tiền', dataIndex: 'amount', width: 140, align: 'right', filterable: false,
      editable: true, editor: 'number', required: true, formatNumber: true,
    },
    {
      title: 'PTTT', dataIndex: 'methodId', width: 160, filterable: false,
      render: (v) => <LookupLabel resource="payment-methods" id={v as number | null} />,
    },
    {
      title: 'Ghi chú', dataIndex: 'note', width: 200, filterable: false,
      editable: true, editor: 'input',
    },
    {
      title: '', dataIndex: '__actions', width: 56, filterable: false,
      render: (_v, record) => (
        <Popconfirm title="Xóa dòng này?" okText="Xóa" cancelText="Hủy" onConfirm={() => deleteActualMutation.mutate(record.id)}>
          <Button size="small" danger icon={<DeleteOutlined />} loading={deleteActualMutation.isPending} />
        </Popconfirm>
      ),
    },
  ]

  const actualContextMenuGroups: ContextMenuGroup[] = [
    {
      items: [
        { label: 'Thêm dòng cuối', shortcut: 'Ctrl+I', onClick: handleAddActual, disabled: locked },
        {
          label: 'Xóa dòng cuối', onClick: () => {
            const last = actuals[actuals.length - 1]
            if (last) deleteActualMutation.mutate(last.id)
          }, disabled: locked || actuals.length === 0,
        },
        { label: 'Lưu', shortcut: 'Ctrl+S', onClick: () => message.success('Đã lưu') },
        { label: 'Không lưu', onClick: () => queryClient.invalidateQueries({ queryKey: actualQueryKey }) },
      ],
    },
  ]

  const reqTotals = { amount: requests.reduce((s, r) => s + (r.amount ?? 0), 0) }
  const actualTotals = { amount: actuals.reduce((s, a) => s + (a.amount ?? 0), 0) }

  return (
    <div>
      <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Yêu cầu thanh toán</p>
      <GridContextMenu groups={reqContextMenuGroups}>
        <EditableGrid<ReqRow>
          columns={reqColumns}
          data={requests as unknown as ReqRow[]}
          rowKey="id"
          locked={locked}
          totals={reqTotals}
          onCellChange={handleReqCellChange}
        />
      </GridContextMenu>
      {!locked && (
        <Form form={reqForm} layout="inline" style={{ marginTop: 8, gap: 4 }}>
          <Form.Item name="dueDate" rules={[{ required: true, message: 'Chọn hạn thanh toán' }]}>
            <DatePicker placeholder="Hạn thanh toán" format="DD/MM/YYYY" style={{ width: 130 }} size="small" />
          </Form.Item>
          <Form.Item name="amount" rules={[{ required: true, message: 'Nhập số tiền' }]}>
            <InputNumber min={0} placeholder="Số tiền" style={{ width: 140 }} size="small" />
          </Form.Item>
          <Form.Item name="status" initialValue="PENDING">
            <Select size="small" options={STATUS_OPTIONS} style={{ width: 130 }} />
          </Form.Item>
          <Form.Item>
            <Button type="dashed" icon={<PlusOutlined />} onClick={handleAddReq} loading={addReqMutation.isPending} size="small">
              Thêm yêu cầu
            </Button>
          </Form.Item>
        </Form>
      )}

      <p style={{ fontSize: 12, fontWeight: 600, margin: '16px 0 8px' }}>Thực tế thanh toán</p>
      <GridContextMenu groups={actualContextMenuGroups}>
        <EditableGrid<ActualRow>
          columns={actualColumns}
          data={actuals as unknown as ActualRow[]}
          rowKey="id"
          locked={locked}
          totals={actualTotals}
          onCellChange={handleActualCellChange}
        />
      </GridContextMenu>
      {!locked && (
        <Form form={actualForm} layout="inline" style={{ marginTop: 8, gap: 4 }}>
          <Form.Item name="payDate" rules={[{ required: true, message: 'Chọn ngày thanh toán' }]}>
            <DatePicker placeholder="Ngày thanh toán" format="DD/MM/YYYY" style={{ width: 130 }} size="small" />
          </Form.Item>
          <Form.Item name="amount" rules={[{ required: true, message: 'Nhập số tiền' }]}>
            <InputNumber min={0} placeholder="Số tiền" style={{ width: 140 }} size="small" />
          </Form.Item>
          <Form.Item name="methodId" style={{ minWidth: 180 }}>
            <LookupSelect resource="payment-methods" placeholder="PTTT" />
          </Form.Item>
          <Form.Item name="note">
            <Input placeholder="Ghi chú" style={{ width: 180 }} size="small" />
          </Form.Item>
          <Form.Item>
            <Button type="dashed" icon={<PlusOutlined />} onClick={handleAddActual} loading={addActualMutation.isPending} size="small">
              Thêm thực tế TT
            </Button>
          </Form.Item>
        </Form>
      )}
    </div>
  )
}
