import { App as AntApp, Button, DatePicker, Form, Input, InputNumber, Popconfirm, Space, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { apiClient } from '../../api/client'
import type { ApiErrorBody, PoPaymentActualIn, PoPaymentActualOut, PoPaymentRequestIn, PoPaymentRequestOut } from '../../api/types'
import { PO_PAYMENT_STATUS_LABELS, statusColor } from '../../api/workflow'
import LookupLabel from '../../components/LookupLabel'
import LookupSelect from '../../components/LookupSelect'
import { formatDateVN, formatNumberVN } from '../../utils/format'

interface PurchaseOrderPaymentsTabProps {
  orderId: number
}

/** Tab "Thanh toán" của đơn hàng mua: Đề nghị thanh toán (ĐNTT, duyệt) + Thực tế thanh toán. */
export default function PurchaseOrderPaymentsTab({ orderId }: PurchaseOrderPaymentsTabProps) {
  const { message } = AntApp.useApp()
  const queryClient = useQueryClient()
  const [reqForm] = Form.useForm()
  const [actualForm] = Form.useForm()

  const reqQueryKey = ['po-payment-requests', orderId]
  const actualQueryKey = ['po-payment-actuals', orderId]

  const { data: requests = [] } = useQuery({
    queryKey: reqQueryKey,
    queryFn: async () => (await apiClient.get<PoPaymentRequestOut[]>(`/purchasing/orders/${orderId}/payment-requests`)).data,
  })

  const { data: actuals = [] } = useQuery({
    queryKey: actualQueryKey,
    queryFn: async () => (await apiClient.get<PoPaymentActualOut[]>(`/purchasing/orders/${orderId}/payment-actuals`)).data,
  })

  const showError = (err: unknown, fallback: string) => {
    const body = axios.isAxiosError<ApiErrorBody>(err) ? err.response?.data : undefined
    message.error(body?.message ?? fallback)
  }

  const addRequestMutation = useMutation({
    mutationFn: (req: PoPaymentRequestIn) => apiClient.post(`/purchasing/orders/${orderId}/payment-requests`, req),
    onSuccess: () => {
      message.success('Đã thêm đề nghị thanh toán')
      reqForm.resetFields()
      queryClient.invalidateQueries({ queryKey: reqQueryKey })
    },
    onError: (err) => showError(err, 'Không thể thêm đề nghị thanh toán'),
  })

  const deleteRequestMutation = useMutation({
    mutationFn: (reqId: number) => apiClient.delete(`/purchasing/orders/${orderId}/payment-requests/${reqId}`),
    onSuccess: () => {
      message.success('Đã xóa')
      queryClient.invalidateQueries({ queryKey: reqQueryKey })
    },
    onError: (err) => showError(err, 'Không thể xóa'),
  })

  const approveRequestMutation = useMutation({
    mutationFn: (reqId: number) => apiClient.post(`/purchasing/payments/${reqId}/actions/approve`),
    onSuccess: () => {
      message.success('Đã duyệt đề nghị thanh toán')
      queryClient.invalidateQueries({ queryKey: reqQueryKey })
    },
    onError: (err) => showError(err, 'Không thể duyệt'),
  })

  const addActualMutation = useMutation({
    mutationFn: (actual: PoPaymentActualIn) => apiClient.post(`/purchasing/orders/${orderId}/payment-actuals`, actual),
    onSuccess: () => {
      message.success('Đã thêm thực tế thanh toán')
      actualForm.resetFields()
      queryClient.invalidateQueries({ queryKey: actualQueryKey })
    },
    onError: (err) => showError(err, 'Không thể thêm'),
  })

  const deleteActualMutation = useMutation({
    mutationFn: (actualId: number) => apiClient.delete(`/purchasing/orders/${orderId}/payment-actuals/${actualId}`),
    onSuccess: () => {
      message.success('Đã xóa')
      queryClient.invalidateQueries({ queryKey: actualQueryKey })
    },
    onError: (err) => showError(err, 'Không thể xóa'),
  })

  const handleAddRequest = async () => {
    const values = await reqForm.validateFields()
    addRequestMutation.mutate({
      amount: values.amount,
      dueDate: values.dueDate ? values.dueDate.format('YYYY-MM-DD') : null,
      note: values.note,
    })
  }

  const handleAddActual = async () => {
    const values = await actualForm.validateFields()
    addActualMutation.mutate({
      payDate: values.payDate.format('YYYY-MM-DD'),
      amount: values.amount,
      methodId: values.methodId,
      note: values.note,
    })
  }

  const requestColumns: ColumnsType<PoPaymentRequestOut> = [
    { title: 'Hạn thanh toán', dataIndex: 'dueDate', key: 'dueDate', width: 130, render: formatDateVN },
    { title: 'Số tiền', dataIndex: 'amount', key: 'amount', align: 'right', width: 140, render: formatNumberVN },
    { title: 'Ghi chú', dataIndex: 'note', key: 'note' },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (v: string) => <Tag color={statusColor(v)}>{PO_PAYMENT_STATUS_LABELS[v] ?? v}</Tag>,
    },
    {
      title: '',
      key: '__actions',
      width: 160,
      render: (_, record) =>
        record.status === 'DRAFT' && (
          <Space.Compact>
            <Button size="small" type="primary" loading={approveRequestMutation.isPending} onClick={() => approveRequestMutation.mutate(record.id)}>
              Duyệt
            </Button>
            <Popconfirm title="Xóa đề nghị này?" okText="Xóa" cancelText="Hủy" onConfirm={() => deleteRequestMutation.mutate(record.id)}>
              <Button size="small" danger icon={<DeleteOutlined />} loading={deleteRequestMutation.isPending} />
            </Popconfirm>
          </Space.Compact>
        ),
    },
  ]

  const actualColumns: ColumnsType<PoPaymentActualOut> = [
    { title: 'Ngày thanh toán', dataIndex: 'payDate', key: 'payDate', width: 130, render: formatDateVN },
    { title: 'Số tiền', dataIndex: 'amount', key: 'amount', align: 'right', width: 140, render: formatNumberVN },
    {
      title: 'Phương thức',
      dataIndex: 'methodId',
      key: 'methodId',
      render: (v: number | null) => <LookupLabel resource="payment-methods" id={v} />,
    },
    { title: 'Ghi chú', dataIndex: 'note', key: 'note' },
    {
      title: '',
      key: '__actions',
      width: 56,
      render: (_, record) => (
        <Popconfirm title="Xóa bản ghi này?" okText="Xóa" cancelText="Hủy" onConfirm={() => deleteActualMutation.mutate(record.id)}>
          <Button type="text" danger icon={<DeleteOutlined />} loading={deleteActualMutation.isPending} />
        </Popconfirm>
      ),
    },
  ]

  return (
    <div>
      <Typography.Title level={5}>Đề nghị thanh toán</Typography.Title>
      <Table<PoPaymentRequestOut> rowKey="id" columns={requestColumns} dataSource={requests} pagination={false} size="small" />
      <Form form={reqForm} layout="inline" style={{ marginTop: 16 }}>
        <Form.Item name="dueDate" rules={[{ required: true, message: 'Chọn hạn thanh toán' }]}>
          <DatePicker placeholder="Hạn thanh toán" format="DD/MM/YYYY" style={{ width: 150 }} />
        </Form.Item>
        <Form.Item name="amount" rules={[{ required: true, message: 'Nhập số tiền' }]}>
          <InputNumber min={0} placeholder="Số tiền" style={{ width: 160 }} />
        </Form.Item>
        <Form.Item name="note">
          <Input placeholder="Ghi chú" style={{ width: 200 }} />
        </Form.Item>
        <Form.Item>
          <Button type="dashed" icon={<PlusOutlined />} onClick={handleAddRequest} loading={addRequestMutation.isPending}>
            Thêm đợt
          </Button>
        </Form.Item>
      </Form>

      <Typography.Title level={5} style={{ marginTop: 32 }}>Thực tế thanh toán</Typography.Title>
      <Table<PoPaymentActualOut> rowKey="id" columns={actualColumns} dataSource={actuals} pagination={false} size="small" />
      <Form form={actualForm} layout="inline" style={{ marginTop: 16 }}>
        <Form.Item name="payDate" rules={[{ required: true, message: 'Chọn ngày thanh toán' }]}>
          <DatePicker placeholder="Ngày thanh toán" format="DD/MM/YYYY" style={{ width: 150 }} />
        </Form.Item>
        <Form.Item name="amount" rules={[{ required: true, message: 'Nhập số tiền' }]}>
          <InputNumber min={0} placeholder="Số tiền" style={{ width: 160 }} />
        </Form.Item>
        <Form.Item name="methodId" style={{ minWidth: 180 }}>
          <LookupSelect resource="payment-methods" placeholder="Phương thức" />
        </Form.Item>
        <Form.Item name="note">
          <Input placeholder="Ghi chú" style={{ width: 200 }} />
        </Form.Item>
        <Form.Item>
          <Button type="dashed" icon={<PlusOutlined />} onClick={handleAddActual} loading={addActualMutation.isPending}>
            Thêm
          </Button>
        </Form.Item>
      </Form>
    </div>
  )
}
