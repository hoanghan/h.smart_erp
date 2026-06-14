import { useState } from 'react'
import { App as AntApp, Button, Drawer, Form, Input, Popconfirm, Space, Typography } from 'antd'
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../../api/client'
import type { PageResult } from '../../api/types'
import Transfer from 'antd/es/transfer'
import DataTable from '../../components/DataTable'

interface GroupRow {
  id: number
  code: string
  name: string
  memberCount: number
}

export default function GroupsPage() {
  const { message } = AntApp.useApp()
  const queryClient = useQueryClient()
  const [form] = Form.useForm()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<GroupRow | null>(null)

  const { data: usersData } = useQuery({
    queryKey: ['admin-users-simple'],
    queryFn: async () => {
      const res = await apiClient.get<PageResult<{ id: number; username: string; employeeName: string | null }>>('/admin/users', { params: { size: 500 } })
      return res.data.items
    },
    enabled: open,
  })

  const [targetKeys, setTargetKeys] = useState<number[]>([])

  const showError = (err: unknown, fallback: string) => {
    const body = err && typeof err === 'object' && 'response' in err
      ? (err as any).response?.data?.message ?? fallback
      : fallback
    message.error(body)
  }

  const openCreate = () => {
    setEditing(null)
    form.resetFields()
    setTargetKeys([])
    setOpen(true)
  }

  const openEdit = async (record: GroupRow) => {
    setEditing(record)
    form.setFieldsValue(record)
    try {
      const res = await apiClient.get<number[]>(`/admin/groups/${record.id}/members`)
      setTargetKeys(res.data)
    } catch {
      setTargetKeys([])
    }
    setOpen(true)
  }

  const saveMutation = useMutation({
    mutationFn: async (values: { code: string; name: string }) => {
      if (editing) {
        await apiClient.put(`/admin/groups/${editing.id}`, values)
        await apiClient.put(`/admin/groups/${editing.id}/members`, targetKeys)
      } else {
        await apiClient.post('/admin/groups', values)
      }
    },
    onSuccess: () => {
      message.success(editing ? 'Cập nhật thành công' : 'Thêm mới thành công')
      queryClient.invalidateQueries({ queryKey: ['admin-groups'] })
      setOpen(false)
    },
    onError: (err) => showError(err, 'Có lỗi xảy ra'),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/admin/groups/${id}`)
    },
    onSuccess: () => {
      message.success('Đã xóa')
      queryClient.invalidateQueries({ queryKey: ['admin-groups'] })
    },
    onError: (err) => showError(err, 'Lỗi xóa'),
  })

  const handleSubmit = async () => {
    const values = await form.validateFields()
    saveMutation.mutate(values)
  }

  const columns = [
    { field: 'code', headerText: 'Mã', width: 120 },
    { field: 'name', headerText: 'Tên' },
    { field: 'memberCount', headerText: 'Số thành viên', width: 120 },
    {
      field: 'actions', headerText: '', width: 120,
      template: (record: GroupRow) => (
        <Space>
          <Button type="text" icon={<EditOutlined />} onClick={() => openEdit(record)} />
          <Popconfirm title="Xóa nhóm này?" onConfirm={() => deleteMutation.mutate(record.id)}>
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const dataSource = usersData?.map((u) => ({
    key: u.id,
    title: `${u.username} ${u.employeeName ? `(${u.employeeName})` : ''}`,
  })) ?? []

  return (
    <div>
      <Typography.Title level={3}>Nhóm người dùng</Typography.Title>
      <DataTable<GroupRow>
        queryKey="admin-groups"
        endpoint="/admin/groups"
        columns={columns}
        searchPlaceholder="Tìm kiếm nhóm..."
        toolbarExtra={
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Thêm nhóm</Button>
        }
      />
      <Drawer
        title={editing ? 'Sửa nhóm' : 'Thêm nhóm'}
        open={open}
        onClose={() => setOpen(false)}
        width={560}
        extra={
          <Space>
            <Button onClick={() => setOpen(false)}>Hủy</Button>
            <Button type="primary" loading={saveMutation.isPending} onClick={handleSubmit}>Lưu</Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical">
          <Form.Item name="code" label="Mã nhóm" rules={[{ required: true, message: 'Vui lòng nhập' }]}>
            <Input disabled={!!editing} />
          </Form.Item>
          <Form.Item name="name" label="Tên nhóm" rules={[{ required: true, message: 'Vui lòng nhập' }]}>
            <Input />
          </Form.Item>
          {usersData && (
            <Form.Item label="Thành viên">
              <Transfer
                dataSource={dataSource}
                targetKeys={targetKeys}
                onChange={(keys) => setTargetKeys(keys as number[])}
                render={(item) => item.title}
                titles={['Chưa chọn', 'Đã chọn']}
                style={{ marginBottom: 16 }}
              />
            </Form.Item>
          )}
        </Form>
      </Drawer>
    </div>
  )
}