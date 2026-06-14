import { useState } from 'react'
import { App as AntApp, Button, Input, Select, Space, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { Form } from 'antd'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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
  { label: 'Không reset', value: 'NONE' },
]

export default function DocNumberingPage() {
  const { message } = AntApp.useApp()
  const queryClient = useQueryClient()
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form] = Form.useForm()
  const [preview, setPreview] = useState('')

  const { data: items, isLoading } = useQuery({
    queryKey: ['admin-doc-numbering'],
    queryFn: async () => {
      const res = await apiClient.get<DocNumberingRow[]>('/admin/doc-numbering')
      return res.data
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, pattern, resetBy }: { id: number; pattern: string; resetBy: string }) => {
      await apiClient.put(`/admin/doc-numbering/${id}`, { pattern, resetBy })
    },
    onSuccess: () => {
      message.success('Đã cập nhật')
      queryClient.invalidateQueries({ queryKey: ['admin-doc-numbering'] })
      setEditingId(null)
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
            <Button size="small" onClick={() => { setEditingId(record.id); form.setFieldsValue({ pattern: record.pattern, resetBy: record.resetBy }); setPreview('') }}>Sửa</Button>
          </Space>
        )
      },
    },
  ]

  return (
    <div>
      <Typography.Title level={3}>Đánh số chứng từ</Typography.Title>
      <Typography.Paragraph type="secondary">
        Cấu hình mẫu đánh số tự động cho từng loại chứng từ. Token: {'{YYYY}'}, {'{YY}'}, {'{MM}'}, {'{DD}'}, {'{####}'} (số # = độ dài số).
      </Typography.Paragraph>
      <Form form={form} component={false}>
        <Table<DocNumberingRow>
          rowKey="id"
          dataSource={items ?? []}
          loading={isLoading}
          columns={columns}
          pagination={false}
          scroll={{ x: 1000 }}
        />
      </Form>
    </div>
  )
}