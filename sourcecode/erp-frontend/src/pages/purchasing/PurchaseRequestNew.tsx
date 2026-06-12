import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { App as AntApp, Button, Col, Form, Input, InputNumber, Row, Table, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { DeleteOutlined, PlusOutlined, SaveOutlined } from '@ant-design/icons'
import { useMutation } from '@tanstack/react-query'
import axios from 'axios'
import { apiClient } from '../../api/client'
import type { ApiErrorBody, PurchaseRequestLineIn, PurchaseRequestOut } from '../../api/types'
import LookupLabel from '../../components/LookupLabel'
import LookupSelect from '../../components/LookupSelect'
import { formatNumberVN } from '../../utils/format'

interface LocalLine extends PurchaseRequestLineIn {
  key: number
}

export default function PurchaseRequestNewPage() {
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
    mutationFn: (payload: Record<string, unknown>) => apiClient.post<PurchaseRequestOut>('/purchasing/requests', payload),
    onSuccess: (res) => {
      message.success(`Đã tạo yêu cầu ${res.data.docNo}`)
      navigate(`/purchasing/requests/${res.data.id}`)
    },
    onError: (err) => showError(err, 'Không thể tạo yêu cầu'),
  })

  const handleAddLine = async () => {
    const values = await lineForm.validateFields()
    setLines((prev) => [
      ...prev,
      {
        key: nextKey,
        productId: values.productId,
        quantity: values.quantity,
        note: values.note,
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
    { title: 'Ghi chú', dataIndex: 'note', key: 'note' },
    {
      title: '',
      key: '__actions',
      width: 56,
      render: (_, record) => <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleRemoveLine(record.key)} />,
    },
  ]

  return (
    <div>
      <Typography.Title level={3}>Tạo yêu cầu mua hàng</Typography.Title>

      <Form form={form} layout="vertical">
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item label="Người yêu cầu" name="requesterId">
              <LookupSelect resource="employees" labelField="fullName" placeholder="Chọn người yêu cầu" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Bộ phận" name="departmentId">
              <LookupSelect resource="departments" placeholder="Chọn bộ phận" />
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
        <Form.Item name="note">
          <Input placeholder="Ghi chú" style={{ width: 200 }} />
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
