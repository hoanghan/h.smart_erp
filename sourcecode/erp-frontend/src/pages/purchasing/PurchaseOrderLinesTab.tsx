import { App as AntApp, Button, Form, InputNumber, Popconfirm, Table, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query'
import axios from 'axios'
import { apiClient } from '../../api/client'
import type { ApiErrorBody, PurchaseOrderLineIn, PurchaseOrderLineOut } from '../../api/types'
import LookupLabel from '../../components/LookupLabel'
import LookupSelect from '../../components/LookupSelect'
import { formatNumberVN } from '../../utils/format'

interface PurchaseOrderLinesTabProps {
  orderId: number
  lines: PurchaseOrderLineOut[]
  locked: boolean
  totalAmount: number | null
  totalVat: number | null
  queryKey: QueryKey
}

/** Tab "Hàng hóa" của đơn hàng mua: bảng dòng hàng (Amount do backend tính) + thêm/xóa dòng + tổng tiền/VAT. */
export default function PurchaseOrderLinesTab({ orderId, lines, locked, totalAmount, totalVat, queryKey }: PurchaseOrderLinesTabProps) {
  const { message } = AntApp.useApp()
  const queryClient = useQueryClient()
  const [form] = Form.useForm()

  const showError = (err: unknown, fallback: string) => {
    const body = axios.isAxiosError<ApiErrorBody>(err) ? err.response?.data : undefined
    message.error(body?.message ?? fallback)
  }

  const addMutation = useMutation({
    mutationFn: (line: PurchaseOrderLineIn) => apiClient.post(`/purchasing/orders/${orderId}/lines`, line),
    onSuccess: () => {
      message.success('Đã thêm dòng')
      form.resetFields()
      queryClient.invalidateQueries({ queryKey })
    },
    onError: (err) => showError(err, 'Không thể thêm dòng'),
  })

  const deleteMutation = useMutation({
    mutationFn: (lineId: number) => apiClient.delete(`/purchasing/orders/${orderId}/lines/${lineId}`),
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
      unitPrice: values.unitPrice,
      vatPct: values.vatPct,
      note: values.note,
    })
  }

  const columns: ColumnsType<PurchaseOrderLineOut> = [
    {
      title: 'Sản phẩm',
      dataIndex: 'productId',
      key: 'productId',
      render: (v: number) => <LookupLabel resource="products" id={v} />,
    },
    { title: 'Số lượng', dataIndex: 'quantity', key: 'quantity', align: 'right', width: 100, render: formatNumberVN },
    { title: 'Đơn giá', dataIndex: 'unitPrice', key: 'unitPrice', align: 'right', width: 120, render: formatNumberVN },
    { title: 'VAT (%)', dataIndex: 'vatPct', key: 'vatPct', align: 'right', width: 90, render: formatNumberVN },
    { title: 'Thành tiền', dataIndex: 'amount', key: 'amount', align: 'right', width: 130, render: formatNumberVN },
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
      <Table<PurchaseOrderLineOut> rowKey="id" columns={columns} dataSource={lines} pagination={false} size="small" />
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 32, marginTop: 12, paddingRight: 8 }}>
        <Typography.Text>
          Tổng tiền hàng: <strong>{formatNumberVN(totalAmount)}</strong>
        </Typography.Text>
        <Typography.Text>
          Tổng VAT: <strong>{formatNumberVN(totalVat)}</strong>
        </Typography.Text>
        <Typography.Text>
          Tổng cộng: <strong>{formatNumberVN((totalAmount ?? 0) + (totalVat ?? 0))}</strong>
        </Typography.Text>
      </div>
      {!locked && (
        <Form form={form} layout="inline" style={{ marginTop: 16 }}>
          <Form.Item name="productId" rules={[{ required: true, message: 'Chọn sản phẩm' }]} style={{ minWidth: 280 }}>
            <LookupSelect resource="products" placeholder="Sản phẩm" />
          </Form.Item>
          <Form.Item name="quantity" rules={[{ required: true, message: 'Nhập SL' }]} initialValue={1}>
            <InputNumber min={0} placeholder="Số lượng" style={{ width: 110 }} />
          </Form.Item>
          <Form.Item name="unitPrice" rules={[{ required: true, message: 'Nhập đơn giá' }]}>
            <InputNumber min={0} placeholder="Đơn giá" style={{ width: 140 }} />
          </Form.Item>
          <Form.Item name="vatPct" initialValue={10}>
            <InputNumber min={0} max={100} placeholder="VAT %" style={{ width: 90 }} />
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
