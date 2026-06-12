import { App as AntApp, Button, Form, Input, InputNumber, Popconfirm, Table } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query'
import axios from 'axios'
import { apiClient } from '../../api/client'
import type { ApiErrorBody, PurchaseRequestLineIn, PurchaseRequestLineOut } from '../../api/types'
import LookupLabel from '../../components/LookupLabel'
import LookupSelect from '../../components/LookupSelect'
import { formatNumberVN } from '../../utils/format'

interface PurchaseRequestLinesTabProps {
  requestId: number
  lines: PurchaseRequestLineOut[]
  locked: boolean
  queryKey: QueryKey
}

/** Tab dòng hàng của yêu cầu mua hàng: bảng dòng + thêm dòng mới (sản phẩm, SL, ghi chú) + xóa dòng. */
export default function PurchaseRequestLinesTab({ requestId, lines, locked, queryKey }: PurchaseRequestLinesTabProps) {
  const { message } = AntApp.useApp()
  const queryClient = useQueryClient()
  const [form] = Form.useForm()

  const showError = (err: unknown, fallback: string) => {
    const body = axios.isAxiosError<ApiErrorBody>(err) ? err.response?.data : undefined
    message.error(body?.message ?? fallback)
  }

  const addMutation = useMutation({
    mutationFn: (line: PurchaseRequestLineIn) => apiClient.post(`/purchasing/requests/${requestId}/lines`, line),
    onSuccess: () => {
      message.success('Đã thêm dòng')
      form.resetFields()
      queryClient.invalidateQueries({ queryKey })
    },
    onError: (err) => showError(err, 'Không thể thêm dòng'),
  })

  const deleteMutation = useMutation({
    mutationFn: (lineId: number) => apiClient.delete(`/purchasing/requests/${requestId}/lines/${lineId}`),
    onSuccess: () => {
      message.success('Đã xóa dòng')
      queryClient.invalidateQueries({ queryKey })
    },
    onError: (err) => showError(err, 'Không thể xóa dòng'),
  })

  const handleAdd = async () => {
    const values = await form.validateFields()
    addMutation.mutate({
      productId: values.productId,
      quantity: values.quantity,
      note: values.note,
    })
  }

  const columns: ColumnsType<PurchaseRequestLineOut> = [
    {
      title: 'Sản phẩm',
      dataIndex: 'productId',
      key: 'productId',
      render: (v: number) => <LookupLabel resource="products" id={v} />,
    },
    { title: 'Số lượng', dataIndex: 'quantity', key: 'quantity', align: 'right', width: 110, render: formatNumberVN },
    { title: 'Ghi chú', dataIndex: 'note', key: 'note' },
  ]

  if (!locked) {
    columns.push({
      title: '',
      key: '__actions',
      width: 56,
      render: (_, record) => (
        <Popconfirm title="Xóa dòng này?" okText="Xóa" cancelText="Hủy" onConfirm={() => deleteMutation.mutate(record.id)}>
          <Button type="text" danger icon={<DeleteOutlined />} loading={deleteMutation.isPending} />
        </Popconfirm>
      ),
    })
  }

  return (
    <div>
      <Table<PurchaseRequestLineOut> rowKey="id" columns={columns} dataSource={lines} pagination={false} size="small" />
      {!locked && (
        <Form form={form} layout="inline" style={{ marginTop: 16 }}>
          <Form.Item name="productId" rules={[{ required: true, message: 'Chọn sản phẩm' }]} style={{ minWidth: 280 }}>
            <LookupSelect resource="products" placeholder="Sản phẩm" />
          </Form.Item>
          <Form.Item name="quantity" rules={[{ required: true, message: 'Nhập SL' }]} initialValue={1}>
            <InputNumber min={0} placeholder="Số lượng" style={{ width: 110 }} />
          </Form.Item>
          <Form.Item name="note">
            <Input placeholder="Ghi chú" style={{ width: 200 }} />
          </Form.Item>
          <Form.Item>
            <Button type="dashed" icon={<PlusOutlined />} onClick={handleAdd} loading={addMutation.isPending}>
              Thêm dòng
            </Button>
          </Form.Item>
        </Form>
      )}
    </div>
  )
}
