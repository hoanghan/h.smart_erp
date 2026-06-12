import { App as AntApp, Button, Form, Input, InputNumber, Popconfirm, Table, Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { apiClient } from '../../api/client'
import type { ApiErrorBody, PoCostIn, PoCostOut } from '../../api/types'
import DocNoLabel from '../../components/DocNoLabel'
import LookupLabel from '../../components/LookupLabel'
import LookupSelect from '../../components/LookupSelect'
import { formatNumberVN } from '../../utils/format'

interface PurchaseOrderCostsTabProps {
  orderId: number
}

/** Tab "Chi phí" của đơn hàng mua: po_cost CRUD + duyệt từng dòng (lỗi COST_NO_RECEIPT_REF hiện rõ message). */
export default function PurchaseOrderCostsTab({ orderId }: PurchaseOrderCostsTabProps) {
  const { message } = AntApp.useApp()
  const queryClient = useQueryClient()
  const [form] = Form.useForm()

  const queryKey = ['po-costs', orderId]

  const { data: costs = [] } = useQuery({
    queryKey,
    queryFn: async () => (await apiClient.get<PoCostOut[]>(`/purchasing/orders/${orderId}/costs`)).data,
  })

  const showError = (err: unknown, fallback: string) => {
    const body = axios.isAxiosError<ApiErrorBody>(err) ? err.response?.data : undefined
    message.error(body?.message ?? fallback)
  }

  const addMutation = useMutation({
    mutationFn: (cost: PoCostIn) => apiClient.post(`/purchasing/orders/${orderId}/costs`, cost),
    onSuccess: () => {
      message.success('Đã thêm chi phí')
      form.resetFields()
      queryClient.invalidateQueries({ queryKey })
    },
    onError: (err) => showError(err, 'Không thể thêm chi phí'),
  })

  const deleteMutation = useMutation({
    mutationFn: (costId: number) => apiClient.delete(`/purchasing/orders/${orderId}/costs/${costId}`),
    onSuccess: () => {
      message.success('Đã xóa chi phí')
      queryClient.invalidateQueries({ queryKey })
    },
    onError: (err) => showError(err, 'Không thể xóa chi phí'),
  })

  const approveMutation = useMutation({
    mutationFn: ({ costId, action }: { costId: number; action: 'approve' | 'unapprove' }) =>
      apiClient.post(`/purchasing/orders/${orderId}/costs/${costId}/actions/${action}`),
    onSuccess: (_res, vars) => {
      message.success(vars.action === 'approve' ? 'Đã duyệt chi phí' : 'Đã bỏ duyệt chi phí')
      queryClient.invalidateQueries({ queryKey })
    },
    onError: (err) => showError(err, 'Không thể thực hiện'),
  })

  const handleAdd = async () => {
    const values = await form.validateFields()
    addMutation.mutate({
      costTypeId: values.costTypeId,
      serviceSupplierId: values.serviceSupplierId,
      receiptDocId: values.receiptDocId,
      amount: values.amount,
      vatPct: values.vatPct,
      paymentMethodId: values.paymentMethodId,
      note: values.note,
    })
  }

  const columns: ColumnsType<PoCostOut> = [
    {
      title: 'Loại chi phí',
      dataIndex: 'costTypeId',
      key: 'costTypeId',
      render: (v: number) => <LookupLabel resource="cost-types" id={v} />,
    },
    {
      title: 'NCC dịch vụ',
      dataIndex: 'serviceSupplierId',
      key: 'serviceSupplierId',
      render: (v: number | null) => <LookupLabel resource="partners" id={v} labelField="shortName" />,
    },
    { title: 'Mức phí', dataIndex: 'amount', key: 'amount', align: 'right', width: 120, render: formatNumberVN },
    { title: 'VAT (%)', dataIndex: 'vatPct', key: 'vatPct', align: 'right', width: 90, render: formatNumberVN },
    {
      title: 'PTTT',
      dataIndex: 'paymentMethodId',
      key: 'paymentMethodId',
      render: (v: number | null) => <LookupLabel resource="payment-methods" id={v} />,
    },
    {
      title: 'Số phiếu nhập',
      dataIndex: 'receiptDocId',
      key: 'receiptDocId',
      render: (v: number | null) => <DocNoLabel endpoint="/inventory/docs" id={v} />,
    },
    { title: 'Ghi chú', dataIndex: 'note', key: 'note' },
    {
      title: 'Trạng thái',
      dataIndex: 'approved',
      key: 'approved',
      width: 110,
      render: (v: boolean) => (v ? <Tag color="green">Đã duyệt</Tag> : <Tag>Chưa duyệt</Tag>),
    },
    {
      title: '',
      key: '__actions',
      width: 180,
      render: (_, record) =>
        record.approved ? (
          <Button
            size="small"
            loading={approveMutation.isPending}
            onClick={() => approveMutation.mutate({ costId: record.id, action: 'unapprove' })}
          >
            Bỏ duyệt
          </Button>
        ) : (
          <Button
            size="small"
            type="primary"
            loading={approveMutation.isPending}
            onClick={() => approveMutation.mutate({ costId: record.id, action: 'approve' })}
          >
            Duyệt
          </Button>
        ),
    },
    {
      title: '',
      key: '__delete',
      width: 56,
      render: (_, record) =>
        !record.approved && (
          <Popconfirm title="Xóa chi phí này?" okText="Xóa" cancelText="Hủy" onConfirm={() => deleteMutation.mutate(record.id)}>
            <Button type="text" danger icon={<DeleteOutlined />} loading={deleteMutation.isPending} />
          </Popconfirm>
        ),
    },
  ]

  return (
    <div>
      <Table<PoCostOut> rowKey="id" columns={columns} dataSource={costs} pagination={false} size="small" />
      <Form form={form} layout="inline" style={{ marginTop: 16 }}>
        <Form.Item name="costTypeId" rules={[{ required: true, message: 'Chọn loại chi phí' }]} style={{ minWidth: 220 }}>
          <LookupSelect resource="cost-types" placeholder="Loại chi phí" />
        </Form.Item>
        <Form.Item name="serviceSupplierId" style={{ minWidth: 220 }}>
          <LookupSelect resource="partners" labelField="shortName" placeholder="NCC dịch vụ" />
        </Form.Item>
        <Form.Item name="amount" initialValue={0}>
          <InputNumber min={0} placeholder="Mức phí" style={{ width: 130 }} />
        </Form.Item>
        <Form.Item name="vatPct" initialValue={10}>
          <InputNumber min={0} max={100} placeholder="VAT %" style={{ width: 90 }} />
        </Form.Item>
        <Form.Item name="paymentMethodId" style={{ minWidth: 180 }}>
          <LookupSelect resource="payment-methods" placeholder="PTTT" />
        </Form.Item>
        <Form.Item name="receiptDocId">
          <InputNumber min={0} placeholder="ID phiếu nhập" style={{ width: 130 }} />
        </Form.Item>
        <Form.Item name="note">
          <Input placeholder="Ghi chú" style={{ width: 160 }} />
        </Form.Item>
        <Form.Item>
          <Button type="dashed" icon={<PlusOutlined />} onClick={handleAdd} loading={addMutation.isPending}>
            Thêm chi phí
          </Button>
        </Form.Item>
      </Form>
    </div>
  )
}
