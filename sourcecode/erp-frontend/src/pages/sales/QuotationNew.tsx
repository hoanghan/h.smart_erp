import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { App as AntApp, Button, Col, DatePicker, Form, Input, InputNumber, Row, Select, Table, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { DeleteOutlined, PlusOutlined, SaveOutlined } from '@ant-design/icons'
import { useMutation } from '@tanstack/react-query'
import axios from 'axios'
import { apiClient } from '../../api/client'
import type { ApiErrorBody, QuotationLineIn, QuotationOut } from '../../api/types'
import LookupLabel from '../../components/LookupLabel'
import LookupSelect from '../../components/LookupSelect'
import { formatNumberVN } from '../../utils/format'

const ORDER_TYPE_OPTIONS = [
  { value: 'SALES', label: 'Bán hàng' },
  { value: 'MAINTENANCE', label: 'Bảo trì' },
  { value: 'SHOPPING_CART', label: 'Đặt hàng online' },
]

interface LocalLine extends QuotationLineIn {
  key: number
}

export default function QuotationNewPage() {
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
    mutationFn: (payload: Record<string, unknown>) => apiClient.post<QuotationOut>('/sales/quotations', payload),
    onSuccess: (res) => {
      message.success(`Đã tạo báo giá ${res.data.docNo}`)
      navigate(`/sales/quotations/${res.data.id}`)
    },
    onError: (err) => showError(err, 'Không thể tạo báo giá'),
  })

  const handleAddLine = async () => {
    const values = await lineForm.validateFields()
    setLines((prev) => [
      ...prev,
      {
        key: nextKey,
        productId: values.productId,
        quantity: values.quantity,
        rate: values.rate ?? null,
        discountPct: values.discountPct ?? null,
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
      validTill: values.validTill ? values.validTill.format('YYYY-MM-DD') : null,
      requestDeliveryDate: values.requestDeliveryDate ? values.requestDeliveryDate.format('YYYY-MM-DD') : null,
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
    { title: 'Số lượng', dataIndex: 'quantity', key: 'quantity', align: 'right', width: 100, render: formatNumberVN },
    { title: 'Đơn giá', dataIndex: 'rate', key: 'rate', align: 'right', width: 120, render: (v) => (v == null ? <i style={{ color: '#999' }}>tự động</i> : formatNumberVN(v)) },
    { title: 'CK (%)', dataIndex: 'discountPct', key: 'discountPct', align: 'right', width: 80, render: (v) => (v == null ? '' : formatNumberVN(v)) },
    { title: 'VAT (%)', dataIndex: 'vatPct', key: 'vatPct', align: 'right', width: 80, render: formatNumberVN },
    {
      title: '',
      key: '__actions',
      width: 56,
      render: (_, record) => <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleRemoveLine(record.key)} />,
    },
  ]

  return (
    <div>
      <Typography.Title level={3}>Tạo báo giá mới</Typography.Title>

      <Form form={form} layout="vertical" initialValues={{ orderType: 'SALES', validityDays: 2 }}>
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item label="Khách hàng" name="partnerId" rules={[{ required: true, message: 'Vui lòng chọn khách hàng' }]}>
              <LookupSelect resource="partners" labelField="shortName" placeholder="Chọn khách hàng" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Loại đơn" name="orderType">
              <Select options={ORDER_TYPE_OPTIONS} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Bảng giá" name="priceListId">
              <LookupSelect resource="price-lists" endpoint="/sales/price-lists" placeholder="Chọn bảng giá" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Hiệu lực đến" name="validTill">
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Số ngày hiệu lực" name="validityDays">
              <InputNumber style={{ width: '100%' }} min={0} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Ngày giao hàng yêu cầu" name="requestDeliveryDate">
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Hình thức giao hàng" name="deliveryLead">
              <Input />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Phương thức thanh toán" name="paymentMethodId">
              <LookupSelect resource="payment-methods" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Phương thức giao hàng" name="deliveryMethodId">
              <LookupSelect resource="delivery-methods" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Đối thủ cạnh tranh" name="competitor">
              <Input />
            </Form.Item>
          </Col>
          <Col span={16}>
            <Form.Item label="Điều khoản" name="terms">
              <Input.TextArea rows={2} />
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
          <InputNumber min={0} placeholder="Số lượng" style={{ width: 100 }} />
        </Form.Item>
        <Form.Item name="rate">
          <InputNumber min={0} placeholder="Đơn giá (tự động)" style={{ width: 150 }} />
        </Form.Item>
        <Form.Item name="discountPct">
          <InputNumber min={0} max={100} placeholder="CK %" style={{ width: 90 }} />
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
