import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { App as AntApp, Button, Col, DatePicker, Form, Input, InputNumber, Row, Select, Switch, Table, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { DeleteOutlined, PlusOutlined, SaveOutlined } from '@ant-design/icons'
import { useMutation } from '@tanstack/react-query'
import axios from 'axios'
import { apiClient } from '../../api/client'
import type { ApiErrorBody, PurchaseOrderLineIn, PurchaseOrderOut } from '../../api/types'
import LookupLabel from '../../components/LookupLabel'
import LookupSelect from '../../components/LookupSelect'
import { formatNumberVN } from '../../utils/format'
import { ORDER_FORM_LABELS } from './PurchaseOrdersList'

const ORDER_FORM_OPTIONS = Object.entries(ORDER_FORM_LABELS).map(([value, label]) => ({ value, label }))

interface LocalLine extends PurchaseOrderLineIn {
  key: number
}

export default function PurchaseOrderNewPage() {
  const navigate = useNavigate()
  const { message } = AntApp.useApp()
  const [form] = Form.useForm()
  const [lineForm] = Form.useForm()
  const [lines, setLines] = useState<LocalLine[]>([])
  const [nextKey, setNextKey] = useState(1)

  const showError = (err: unknown, fallback: string) => {
    const body = axios.isAxiosError<ApiErrorBody>(err) ? err.response?.data : undefined
    message.error(body?.message ?? fallback)
  }

  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => apiClient.post<PurchaseOrderOut>('/purchasing/orders', payload),
    onSuccess: (res) => {
      message.success(`Đã tạo đơn hàng mua ${res.data.docNo}`)
      navigate(`/purchasing/orders/${res.data.id}`)
    },
    onError: (err) => showError(err, 'Không thể tạo đơn hàng mua'),
  })

  const handleAddLine = async () => {
    const values = await lineForm.validateFields()
    setLines((prev) => [
      ...prev,
      {
        key: nextKey,
        productId: values.productId,
        quantity: values.quantity,
        unitPrice: values.unitPrice,
        vatPct: values.vatPct,
      },
    ])
    setNextKey((k) => k + 1)
    lineForm.resetFields()
  }

  const handleRemoveLine = (key: number) => {
    setLines((prev) => prev.filter((l) => l.key !== key))
  }

  const handleSave = async () => {
    const values = await form.validateFields()
    createMutation.mutate({
      ...values,
      receiveDatePlan: values.receiveDatePlan ? values.receiveDatePlan.format('YYYY-MM-DD') : null,
      lines: lines.map(({ key: _key, ...line }) => line),
    })
  }

  const columns: ColumnsType<LocalLine> = [
    {
      title: 'Sản phẩm',
      dataIndex: 'productId',
      key: 'productId',
      render: (v: number) => <LookupLabel resource="products" id={v} />,
    },
    { title: 'Số lượng', dataIndex: 'quantity', key: 'quantity', align: 'right', width: 110, render: formatNumberVN },
    { title: 'Đơn giá', dataIndex: 'unitPrice', key: 'unitPrice', align: 'right', width: 130, render: formatNumberVN },
    { title: 'VAT (%)', dataIndex: 'vatPct', key: 'vatPct', align: 'right', width: 90, render: formatNumberVN },
    {
      title: '',
      key: '__actions',
      width: 56,
      render: (_, record) => <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleRemoveLine(record.key)} />,
    },
  ]

  return (
    <div>
      <Typography.Title level={3}>Tạo đơn hàng mua</Typography.Title>

      <Form form={form} layout="vertical" initialValues={{ orderForm: 'NORMAL', vatIncluded: true }}>
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item label="Nhà cung cấp" name="partnerId" rules={[{ required: true, message: 'Vui lòng chọn nhà cung cấp' }]}>
              <LookupSelect resource="partners" labelField="shortName" placeholder="Chọn nhà cung cấp" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Hình thức" name="orderForm">
              <Select options={ORDER_FORM_OPTIONS} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Ngày nhận hàng kế hoạch" name="receiveDatePlan">
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Phương thức thanh toán" name="paymentMethodId">
              <LookupSelect resource="payment-methods" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Địa chỉ nhận hàng" name="receiveAddress">
              <Input />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Bao gồm VAT" name="vatIncluded" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item label="Ghi chú" name="note">
              <Input.TextArea rows={2} />
            </Form.Item>
          </Col>
        </Row>
      </Form>

      <Typography.Title level={5}>Hàng hóa</Typography.Title>
      <Table<LocalLine> rowKey="key" columns={columns} dataSource={lines} pagination={false} size="small" />

      <Form form={lineForm} layout="inline" style={{ marginTop: 16 }}>
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
          <Button type="dashed" icon={<PlusOutlined />} onClick={handleAddLine}>
            Thêm dòng
          </Button>
        </Form.Item>
      </Form>

      <div style={{ marginTop: 24 }}>
        <Button type="primary" icon={<SaveOutlined />} loading={createMutation.isPending} onClick={handleSave}>
          Lưu
        </Button>
      </div>
    </div>
  )
}
