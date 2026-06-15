import { useEffect, useState } from 'react'
import { App as AntApp, Button, DatePicker, Form, InputNumber, Modal, Popconfirm, Progress, Switch, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { DeleteOutlined, FileTextOutlined, PlusOutlined } from '@ant-design/icons'
import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query'
import axios from 'axios'
import dayjs from 'dayjs'
import { apiClient } from '../../api/client'
import type { ApiErrorBody, MakeInvoiceLineIn, MakeInvoiceRequest, SalesOrderLineIn, SalesOrderLineOut, SalesOrderLineUpdate } from '../../api/types'
import LookupLabel from '../../components/LookupLabel'
import LookupSelect from '../../components/LookupSelect'
import { formatNumberVN } from '../../utils/format'

const INVOICEABLE_STATUSES = ['TO_DELIVER_AND_BILL', 'TO_DELIVER', 'TO_BILL']

interface SalesOrderLinesTabProps {
  orderId: number
  lines: SalesOrderLineOut[]
  locked: boolean
  status: string
  totalAmount: number | null
  totalVat: number | null
  queryKey: QueryKey
  onShowStock?: (productId: number) => void
}

/** Tab "Hàng hóa" của đơn hàng bán — Đơn giá bán nền đỏ nhạt khi < giá vốn/giá sàn. */
export default function SalesOrderLinesTab({ orderId, lines, locked, status, totalAmount, totalVat, queryKey, onShowStock }: SalesOrderLinesTabProps) {
  const { message } = AntApp.useApp()
  const queryClient = useQueryClient()
  const [form] = Form.useForm()
  const [makeInvoiceOpen, setMakeInvoiceOpen] = useState(false)
  const [invoiceQtys, setInvoiceQtys] = useState<Record<number, number>>({})

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

  const updateLineMutation = useMutation({
    mutationFn: ({ lineId, body }: { lineId: number; body: SalesOrderLineUpdate }) =>
      apiClient.put(`/sales/orders/${orderId}/lines/${lineId}`, body),
    onSuccess: () => {
      message.success('Đã lưu ngày giao')
      queryClient.invalidateQueries({ queryKey })
    },
    onError: (err) => showError(err, 'Không thể lưu ngày giao'),
  })

  const makeInvoiceMutation = useMutation({
    mutationFn: (body: MakeInvoiceRequest) => apiClient.post(`/sales/orders/${orderId}/actions/make-invoice`, body),
    onSuccess: () => {
      message.success('Đã xuất hóa đơn')
      queryClient.invalidateQueries({ queryKey })
      setMakeInvoiceOpen(false)
    },
    onError: (err) => showError(err, 'Không thể xuất hóa đơn'),
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

  const invoiceableLines = lines.filter((l) => l.deliveredQty - l.billedQty > 0)
  const canMakeInvoice = INVOICEABLE_STATUSES.includes(status) && invoiceableLines.length > 0

  const handleOpenMakeInvoice = () => {
    const init: Record<number, number> = {}
    for (const l of invoiceableLines) init[l.id] = l.deliveredQty - l.billedQty
    setInvoiceQtys(init)
    setMakeInvoiceOpen(true)
  }

  const handleMakeInvoice = () => {
    const invoiceLines: MakeInvoiceLineIn[] = invoiceableLines
      .map((l) => ({ lineId: l.id, qty: invoiceQtys[l.id] ?? 0 }))
      .filter((l) => l.qty > 0)
    if (invoiceLines.length === 0) return
    makeInvoiceMutation.mutate({ lines: invoiceLines })
  }

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
    {
      title: 'Đã giao', key: 'deliveredQty', align: 'center', width: 110,
      render: (_, record) => (
        <Progress percent={record.quantity > 0 ? Math.round((record.deliveredQty / record.quantity) * 100) : 0} size="small" />
      ),
    },
    {
      title: 'Đã hóa đơn', key: 'billedQty', align: 'center', width: 110,
      render: (_, record) => (
        <Progress percent={record.quantity > 0 ? Math.round((record.billedQty / record.quantity) * 100) : 0} size="small" />
      ),
    },
    {
      title: 'Ngày giao', dataIndex: 'deliveryDate', key: 'deliveryDate', width: 130,
      render: (v: string | null, record) => (
        <DatePicker
          size="small"
          style={{ width: '100%' }}
          format="DD/MM/YYYY"
          value={v ? dayjs(v) : null}
          onChange={(d) => updateLineMutation.mutate({ lineId: record.id, body: { deliveryDate: d ? d.format('YYYY-MM-DD') : null } })}
        />
      ),
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
      {canMakeInvoice && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
          <Button type="primary" icon={<FileTextOutlined />} onClick={handleOpenMakeInvoice}>
            Xuất hóa đơn
          </Button>
        </div>
      )}
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

      <Modal
        title="Xuất hóa đơn"
        open={makeInvoiceOpen}
        onCancel={() => setMakeInvoiceOpen(false)}
        onOk={handleMakeInvoice}
        okText="Xuất hóa đơn"
        cancelText="Hủy"
        confirmLoading={makeInvoiceMutation.isPending}
        width={600}
      >
        <Table<SalesOrderLineOut>
          rowKey="id"
          size="small"
          pagination={false}
          bordered
          dataSource={invoiceableLines}
          columns={[
            {
              title: 'Mã hàng', dataIndex: 'productId', key: 'productId',
              render: (v: number) => <LookupLabel resource="products" id={v} />,
            },
            {
              title: 'Còn lại', key: 'remaining', align: 'right', width: 100,
              render: (_, r) => formatNumberVN(r.deliveredQty - r.billedQty),
            },
            {
              title: 'SL xuất HĐ', key: 'qty', align: 'right', width: 130,
              render: (_, r) => (
                <InputNumber
                  size="small"
                  min={0}
                  max={r.deliveredQty - r.billedQty}
                  value={invoiceQtys[r.id] ?? 0}
                  onChange={(v) => setInvoiceQtys((prev) => ({ ...prev, [r.id]: v ?? 0 }))}
                  style={{ width: '100%' }}
                />
              ),
            },
          ]}
        />
      </Modal>
    </div>
  )
}