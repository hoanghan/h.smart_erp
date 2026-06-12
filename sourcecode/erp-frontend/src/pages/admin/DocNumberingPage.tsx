import { useState } from 'react'
import { App as AntApp, Button, Col, Input, InputNumber, Row, Select, Space, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { EditOutlined, PlusOutlined } from '@ant-design/icons'
import { Form } from 'antd'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../../api/client'

interface DocNumberingRow {
  id: number
  docType: string
  pattern: string
  resetBy: string
  lastSeq: number
}

const RESET_BY_OPTIONS = [
  { label: 'Hàng tháng', value: 'MONTH' },
  { label: 'Hàng năm', value: 'YEAR' },
  { label: 'Không reset', value: 'NEVER' },
]

export default function DocNumberingPage() {
  const { message } = AntApp.useApp()
  const queryClient = useQueryClient()
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingRecord, setEditingRecord] = useState<DocNumberingRow | null>(null)
  const [form] = Form.useForm()
  const [preview, setPreview] = useState('')

  const updateMutation = useMutation({
    mutationFn: async ({ id, pattern, resetBy }: { id: number; pattern: string; resetBy: string }) => {
      await apiClient.put(`/admin/doc-numbering/${id}`, { pattern, resetBy })
    },
    onSuccess: () => {
      message.success('Đã cập nhật')
      queryClient.invalidateQueries({ queryKey: ['admin-doc-numbering'] })
      setEditingId(null)
      setEditingRecord(null)
      setPreview('')
    },
    onError: (err: unknown) => {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as any).response?.data?.message ?? 'Lỗi cập nhật'
        : 'Lỗi cập nhật'
      message.error(msg)
    },
  })

  const handlePreview = async (pattern: string) => {
    try {
      const resetBy = form.getFieldValue('resetBy') ?? 'MONTH'
      const res = await apiClient.get<{ preview: string }>('/admin/doc-numbering/preview', {
        params: { pattern, resetBy },
      })
      setPreview(res.data.preview)
    } catch {
      setPreview('')
    }
  }

  const handleSave = (id: number) => {
    form.validateFields().then((values) => {
      updateMutation.mutate({ id, pattern: values.pattern, resetBy: values.resetBy })
    })
  }

  const columns: ColumnsType<DocNumberingRow> = [
    { title: 'Loại chứng từ', dataIndex: 'docType', key: 'docType', width: 200 },
    {
      title: 'Mẫu số',
      dataIndex: 'pattern',
      key: 'pattern',
      width: 250,
      render: (v, record) => {
        if (editingId === record.id) {
          return (
            <Form.Item
              name="pattern"
              style={{ margin: 0 }}
              rules={[
                { required: true, message: 'Vui lòng nhập' },
                {
                  validator: async (_, value) => {
                    if (!value || value.includes('{####}') || value.includes('{######}')) return
                    throw new Error('Phải chứa {####} hoặc {######}')
                  },
                },
              ]}
            >
              <Input onChange={(e) => handlePreview(e.target.value)} />
            </Form.Item>
          )
        }
        return <Tag color="blue">{v}</Tag>
      },
    },
    {
      title: 'Reset theo',
      dataIndex: 'resetBy',
      key: 'resetBy',
      width: 150,
      render: (v, record) => {
        if (editingId === record.id) {
          return (
            <Form.Item name="resetBy" style={{ margin: 0 }}>
              <Select options={RESET_BY_OPTIONS} />
            </Form.Item>
          )
        }
        const opt = RESET_BY_OPTIONS.find((o) => o.value === v)
        return opt?.label ?? v
      },
    },
    { title: 'Số cuối', dataIndex: 'lastSeq', key: 'lastSeq', width: 100 },
    {
      title: 'Preview',
      key: 'preview',
      width: 200,
      render: (_, record) => {
        if (editingId === record.id) {
          return preview ? <Tag color="green">{preview}</Tag> : <Tag color="default">-</Tag>
        }
        return '-'
      },
    },
    {
      title: '',
      key: 'actions',
      width: 150,
      fixed: 'right',
      render: (_, record) => {
        if (editingId === record.id) {
          return (
            <Space>
              <Button type="primary" size="small" onClick={() => handleSave(record.id)}>Lưu</Button>
              <Button size="small" onClick={() => setEditingId(null)}>Hủy</Button>
            </Space>
          )
        }
        return (
          <Space>
            <Button size="small" onClick={() => { setEditingId(record.id); form.resetFields(); setPreview('') }}>Sửa</Button>
          </Space>
        )
      },
    },
  ]

  const items = [
    { id: 1, docType: 'QUOTATION', pattern: 'QT{YYMM}{####}', resetBy: 'MONTH', lastSeq: 0 },
    { id: 2, docType: 'SALES_ORDER', pattern: 'SO{YYMM}{####}', resetBy: 'MONTH', lastSeq: 0 },
    { id: 3, docType: 'PURCHASE_ORDER', pattern: 'PO{YYMM}{####}', resetBy: 'MONTH', lastSeq: 0 },
    { id: 4, docType: 'PURCHASE_REQUEST', pattern: 'PR{YYMM}{####}', resetBy: 'MONTH', lastSeq: 0 },
    { id: 5, docType: 'STOCK_RECEIPT', pattern: 'NK{YYMM}{####}', resetBy: 'MONTH', lastSeq: 0 },
    { id: 6, docType: 'STOCK_ISSUE', pattern: 'XK{YYMM}{####}', resetBy: 'MONTH', lastSeq: 0 },
    { id: 7, docType: 'STOCK_TRANSFER', pattern: 'CK{YYMM}{####}', resetBy: 'MONTH', lastSeq: 0 },
    { id: 8, docType: 'SALES_ALLOWANCE', pattern: 'GG{YYMM}{####}', resetBy: 'MONTH', lastSeq: 0 },
    { id: 9, docType: 'SUPPLIER_RETURN', pattern: 'TH{YYMM}{####}', resetBy: 'MONTH', lastSeq: 0 },
  ]

  return (
    <div>
      <Typography.Title level={3}>Đánh số chứng từ</Typography.Title>
      <Typography.Paragraph type="secondary">
        Cấu hình mẫu đánh số tự động cho từng loại chứng từ. Token: {'{YYYY}'}, {'{YY}'}, {'{MM}'}, {'{DD}'}, {'{####}'} (số # = độ dài số).
      </Typography.Paragraph>
      <Table<DocNumberingRow>
        rowKey="id"
        dataSource={items}
        columns={columns}
        pagination={false}
        scroll={{ x: 1000 }}
      />
    </div>
  )
}