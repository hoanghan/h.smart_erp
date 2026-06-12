import { useState } from 'react'
import { App as AntApp, Button, Drawer, Form, Input, Popconfirm, Space, Transfer, Typography } from 'antd'
import { ColumnsType } from 'antd/es/table'
import { EditOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { apiClient } from '../../api/client'
import type { ApiErrorBody, PageResult } from '../../api/types'
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
  const [groupMembers, setGroupMembers] = useState<number[]>([])

  const { data: allUsers } = useQuery({
    queryKey: ['admin-all-users'],
    queryFn: async () => {
      const res = await apiClient.get<PageResult<{ id: number; username: string }>>('/admin/users', { params: { size: 500 } })
      return res.data.items
    },
  })

  const openCreate = () => {
    setEditing(null)
    form.resetFields()
    setGroupMembers([])
    setOpen(true)
  }

  const openEdit = async (record: GroupRow) => {
    setEditing(record)
    form.setFieldsValue(record)
    try {
      const res = await apiClient.get<number[]>('/admin/groups/' + record.id + '/members')
      setGroupMembers(res.data)
    } catch {
      setGroupMembers([])
    }
    setOpen(true)
  }

  const showError = (err: unknown, fallback: string) => {
    const body = axios.isAxiosError<ApiErrorBody>(err) ? err.response?.data : undefined
    message.error(body?.message ?? fallback)
  }

  const saveMutation = useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      if (editing) {
        await apiClient.put('/admin/groups/' + editing.id, values)
        await apiClient.put('/admin/groups/' + editing.id + '/members', groupMembers)
      } else {
        const res = await apiClient.post('/admin/groups', values)
        const newGroupId = (res.data as { id: number }).id
        await apiClient.put('/admin/groups/' + newGroupId + '/members', groupMembers)
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
    mutationFn: (id: number) => apiClient.delete('/admin/groups/' + id),
    onSuccess: () => {
      message.success('Đã xóa nhóm')
      queryClient.invalidateQueries({ queryKey: ['admin-groups'] })
    },
    onError: (err) => showError(err, 'Không thể xóa'),
  })

  const handleSubmit = async () => {
    const values = await form.validateFields()
    saveMutation.mutate(values)
  }

  const columns: ColumnsType<GroupRow> = [
    { title: 'Mã nhóm', dataIndex: 'code', key: 'code' },
    { title: 'Tên nhóm', dataIndex: 'name', key: 'name' },
    { title: 'Số thành viên', dataIndex: 'memberCount', key: 'memberCount' },
    {
      title: '', key: 'actions', width: 96,
      render: (_, record) => (
        <Space>
          <Button type=\"text\" icon={<EditOutlined />} onClick={() => openEdit(record)} />
          <Popconfirm title=\"Xóa nhóm này?\" onConfirm={() => deleteMutation.mutate(record.id)}>
            <Button type=\"text\" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <Typography.Title level={3}>Nhóm người dùng</Typography.Title>
      <DataTable<GroupRow>
        queryKey=\"admin-groups\"
        endpoint=\"/admin/groups\"
        columns={columns}
        searchPlaceholder=\"Tìm kiếm nhóm...\"
        toolbarExtra={
          <Button type=\"primary\" icon={<PlusOutlined />} onClick={openCreate}>Thêm nhóm</Button>
        }
      />
      <Drawer
        title={editing ? 'Sửa nhóm: ' + editing.name : 'Thêm nhóm'}
        open={open}
        onClose={() => setOpen(false)}
        width={520}
        extra={
          <Space>
            <Button onClick={() => setOpen(false)}>Hủy</Button>
            <Button type=\"primary\" loading={saveMutation.isPending} onClick={handleSubmit}>Lưu</Button>
          </Space>
        }
      >
        <Form form={form} layout=\"vertical\">
          <Form.Item name=\"code\" label=\"Mã nhóm\" rules={[{ required: true, message: 'Vui lòng nhập' }]}>
            <Input disabled={!!editing} />
          </Form.Item>
          <Form.Item name=\"name\" label=\"Tên nhóm\" rules={[{ required: true, message: 'Vui lòng nhập' }]}>
            <Input />
          </Form.Item>
        </Form>
        <Typography.Text strong>Thành viên</Typography.Text>
        <div style={{ marginTop: 8 }}>
          <Transfer
            dataSource={allUsers?.map((u) => ({ key: u.id, title: u.username })) || []}
            targetKeys={groupMembers}
            onChange={(keys) => setGroupMembers(keys as number[])}
            render={(item) => item.title}
            listStyle={{ width: 200, height: 300 }}
            titles={['Người dùng', 'Thành viên']}
          />
        </div>
      </Drawer>
    </div>
  )
}
