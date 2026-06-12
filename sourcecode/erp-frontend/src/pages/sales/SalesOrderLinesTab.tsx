import { useEffect } from 'react'
import { App as AntApp, Button, Form, InputNumber, Popconfirm, Switch, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query'
import axios from 'axios'
import { apiClient } from '../../api/client'
import type { ApiErrorBody, SalesOrderLineIn, SalesOrderLineOut } from '../../api/types'
import LookupLabel from '../../components/LookupLabel'
import LookupSelect from '../../components/LookupSelect'
import { formatNumberVN } from '../../utils/format'

interface SalesOrderLinesTabProps {
  orderId: number
  lines: SalesOrderLineOut[]
  locked: boolean
  totalAmount: number | null
  totalVat: number | null
  queryKey: QueryKey
  onShowStock?: (productId: number) => void
}

/** Tab "Hàng hóa" của đơn hàng bán — Đơn giá bán nền đỏ nhạt khi < giá vốn/giá sàn. */
export default function SalesOrderLinesTab({ orderId, lines, locked, totalAmount, totalVat, queryKey, onShowStock }: SalesOrderLinesTabProps) {
  const { message } = AntApp.useApp()
  const queryClient = useQueryClient()
  const [form] = Form.useForm()

  const showError = (err: unknown, fallback: string) => {
    const body = axios.isAxiosError<ApiErrorBody>(err) ? err.response?.data : undefined
    message.error(body?.message ?? fallback)
  }

  const addMutation = useMutation({
    mutationFn: (line: SalesOrderLineIn) => apiClient.post(`/sales/orders/${orderId}/lines`, line),
    onSuccess: () => {
      message.success('Đã thêm dòng')
      form.resetFields()
      queryClient.invalidateQueries({ queryKey })
    },
    onError: (err) => showError(err, 'Không thể thêm dòng'),
  })

  const deleteMutation = useMutation({
    mutationFn: (lineId: number) => apiClient.delete(`/sales/orders/${orderId}/lines/${lineId}`),
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
      isGift: values.isGift ?? false,
    })
  }

  // Ctrl+I — Thêm dòng cuối
  useEffect(() => {
    if (locked) return
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && !e.altKey && e.key.toLowerCase() === 'i') {
        e.preventDefault()
        handleAdd()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [locked, handleAdd])

  // Red price warning: unitPrice < listPrice (reference price)
  const isPriceBelowRef = (record: SalesOrderLineOut) =>
    record.listPrice != null && record.unitPrice < record.listPrice

  const columns: ColumnsType<SalesOrderLineOut> = [
    {
      title: 'STT', key: 'stt', width: 40, align: 'center',
      render: (_, __, i) => i + 1,
    },
    {
      title: 'Mã hàng', dataIndex: 'productId', key: 'productId', width: 120,
      render: (v: number) => (
        <span style={{ cursor: 'pointer' }} onClick={() => onShowStock?.(v)}>
          <LookupLabel resource="products" id={v} />
        </span>
      ),
    },
    { title: 'Tên hàng', key: 'productName', width: 180, render: () => '' /* TODO-BE */ },
    { title: 'ĐVT', key: 'uom', width: 60, render: () => '' /* TODO-BE */ },
    { title: 'Số lượng', dataIndex: 'quantity', key: 'quantity', align: 'right', width: 90, render: formatNumberVN },
    { title: 'Số lượng (kg)', key: 'weight', align: 'right', width: 100, render: () => '' /* TODO-BE */ },
    {
      title: 'Đơn giá bán', dataIndex: 'unitPrice', key: 'unitPrice', align: 'right', width: 120,
      render: (v: number, record) => (
        <span style={isPriceBelowRef(record) ? { backgroundColor: '#FFCDD2', padding: '0 4px', borderRadius: 2 } : undefined}>
          {formatNumberVN(v)}
        </span>
      ),
    },
    {
      title: 'Thành tiền', dataIndex: 'amount', key: 'amount', align: 'right', width: 130, render: formatNumberVN,
    },
    { title: 'VAT (%)', dataIndex: 'vatPct', key: 'vatPct', align: 'right', width: 70, render: formatNumberVN },
    {
      title: 'Hàng KM', dataIndex: 'isGift', key: 'isGift', width: 80,
      render: (v: boolean) => (v ? <Tag color="gold">KM</Tag> : null),
    },
    { title: 'Ghi chú', dataIndex: 'note', key: 'note', width: 150 },
  ]

  if (!locked) {
    columns.push({
      title: '', key: '__actions', width: 48, fixed: 'right',
      render: (_, record) => (
        <Popconfirm title="Xóa dòng này?" okText="Xóa" cancelText="Hủy" onConfirm={() => deleteMutation.mutate(record.id)}>
          <Button type="text" danger icon={<DeleteOutlined />} loading={deleteMutation.isPending} size="small" />
        </Popconfirm>
      ),
    })
  }

  return (
    <div>
      <Table<SalesOrderLineOut>
        rowKey="id"
        columns={columns}
        dataSource={lines}
        pagination={false}
        size="small"
        bordered
        scroll={{ x: 'max-content' }}
        summary={() => (
          <Table.Summary fixed>
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={5}>
                <strong>Tổng cộng ({lines.length} dòng)</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={1} />
              <Table.Summary.Cell index={2} align="right">
                <strong>{formatNumberVN(lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0))}</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={3} align="right">
                <strong>{formatNumberVN(totalAmount)}</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={4} colSpan={4} />
            </Table.Summary.Row>
          </Table.Summary>
        )}
      />
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 32, marginTop: 8, paddingRight: 8 }}>
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
        <Form form={form} layout="inline" style={{ marginTop: 8 }}>
          <Form.Item name="productId" rules={[{ required: true, message: 'Chọn sản phẩm' }]} style={{ minWidth: 220 }}>
            <LookupSelect resource="products" placeholder="Mã hàng" />
          </Form.Item>
          <Form.Item name="quantity" rules={[{ required: true, message: 'Nhập SL' }]} initialValue={1}>
            <InputNumber min={0} placeholder="SL" style={{ width: 80 }} size="small" />
          </Form.Item>
          <Form.Item name="unitPrice" rules={[{ required: true, message: 'Nhập đơn giá' }]}>
            <InputNumber min={0} placeholder="Đơn giá" style={{ width: 120 }} size="small" />
          </Form.Item>
          <Form.Item name="vatPct" initialValue={10}>
            <InputNumber min={0} max={100} placeholder="VAT%" style={{ width: 70 }} size="small" />
          </Form.Item>
          <Form.Item name="isGift" valuePropName="checked" label="KM">
            <Switch size="small" />
          </Form.Item>
          <Form.Item>
            <Button type="dashed" icon={<PlusOutlined />} onClick={handleAdd} loading={addMutation.isPending} size="small">
              Thêm dòng
            </Button>
          </Form.Item>
        </Form>
      )}
    </div>
  )
}