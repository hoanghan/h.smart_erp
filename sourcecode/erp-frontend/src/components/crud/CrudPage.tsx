import { useState } from 'react'
import { App as AntApp, Button, Drawer, Form, Input, InputNumber, Popconfirm, Select, Space, Switch, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { apiClient } from '../../api/client'
import type { ApiErrorBody } from '../../api/types'
import DataTable from '../DataTable'
import LookupSelect from '../LookupSelect'
import type { CrudFormField, CrudPageConfig } from './types'

function renderField(field: CrudFormField, editingId: number | undefined) {
  switch (field.type) {
    case 'number':
      return <InputNumber style={{ width: '100%' }} min={field.min} precision={field.precision} />
    case 'switch':
      return <Switch />
    case 'select':
      return <Select options={field.options} allowClear />
    case 'lookup':
      return (
        <LookupSelect
          resource={field.lookupResource!}
          labelField={field.lookupLabelField}
          excludeId={field.excludeSelf ? editingId : undefined}
        />
      )
    case 'textarea':
      return <Input.TextArea rows={2} />
    default:
      return <Input />
  }
}

/** Trang danh mục CRUD chuẩn: bảng phân trang/tìm kiếm + Drawer thêm/sửa + xóa (Popconfirm). */
export default function CrudPage<TOut extends { id: number }>({
  resource,
  title,
  columns,
  formFields,
  searchPlaceholder,
  initialValues,
}: CrudPageConfig<TOut>) {
  const endpoint = `/md/${resource}`
  const queryKey = `md-${resource}`
  const queryClient = useQueryClient()
  const { message } = AntApp.useApp()
  const [form] = Form.useForm()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<TOut | null>(null)

  const visibleFields = formFields.filter((field) => !field.editOnly || editing)

  const openCreate = () => {
    setEditing(null)
    form.resetFields()
    if (initialValues) form.setFieldsValue(initialValues)
    setOpen(true)
  }

  const openEdit = (record: TOut) => {
    setEditing(record)
    form.resetFields()
    form.setFieldsValue(record)
    setOpen(true)
  }

  const showError = (err: unknown, fallback: string) => {
    const body = axios.isAxiosError<ApiErrorBody>(err) ? err.response?.data : undefined
    message.error(body?.message ?? fallback)
  }

  const saveMutation = useMutation({
    mutationFn: (values: Record<string, unknown>) =>
      editing ? apiClient.put(`${endpoint}/${editing.id}`, values) : apiClient.post(endpoint, values),
    onSuccess: () => {
      message.success(editing ? 'Cập nhật thành công' : 'Thêm mới thành công')
      queryClient.invalidateQueries({ queryKey: [queryKey] })
      setOpen(false)
    },
    onError: (err) => showError(err, 'Có lỗi xảy ra, vui lòng thử lại'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiClient.delete(`${endpoint}/${id}`),
    onSuccess: () => {
      message.success('Đã xóa')
      queryClient.invalidateQueries({ queryKey: [queryKey] })
    },
    onError: (err) => showError(err, 'Không thể xóa'),
  })

  const handleSubmit = async () => {
    const values = await form.validateFields()
    saveMutation.mutate(values)
  }

  const tableColumns: ColumnsType<TOut> = [
    ...columns,
    {
      title: '',
      key: '__actions',
      width: 96,
      render: (_, record) => (
        <Space>
          <Button type="text" icon={<EditOutlined />} onClick={() => openEdit(record)} />
          <Popconfirm
            title="Xóa bản ghi này?"
            okText="Xóa"
            cancelText="Hủy"
            onConfirm={() => deleteMutation.mutate(record.id)}
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <Typography.Title level={3}>{title}</Typography.Title>
      <DataTable<TOut>
        queryKey={queryKey}
        endpoint={endpoint}
        columns={tableColumns}
        searchPlaceholder={searchPlaceholder}
        toolbarExtra={
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Thêm mới
          </Button>
        }
      />
      <Drawer
        title={editing ? `Sửa ${title}` : `Thêm ${title}`}
        open={open}
        onClose={() => setOpen(false)}
        width={420}
        extra={
          <Space>
            <Button onClick={() => setOpen(false)}>Hủy</Button>
            <Button type="primary" loading={saveMutation.isPending} onClick={handleSubmit}>
              Lưu
            </Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical">
          {visibleFields.map((field) => (
            <Form.Item
              key={field.name}
              name={field.name}
              label={field.label}
              valuePropName={field.type === 'switch' ? 'checked' : 'value'}
              rules={
                field.required
                  ? [{ required: true, message: `Vui lòng nhập ${field.label}` }, ...(field.rules ?? [])]
                  : field.rules
              }
            >
              {renderField(field, editing?.id)}
            </Form.Item>
          ))}
        </Form>
      </Drawer>
    </div>
  )
}
