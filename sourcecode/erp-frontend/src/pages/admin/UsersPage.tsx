import { useState } from 'react'
import { App as AntApp, Button, Drawer, Form, Input, Popconfirm, Space, Switch, Table, Tabs, Tag, Typography, Tree } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { EditOutlined, LockOutlined, UnlockOutlined, KeyOutlined, PlusOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import dayjs from 'dayjs'
import { apiClient } from '../../api/client'
import type { ApiErrorBody, PageResult } from '../../api/types'
import DataTable from '../../components/DataTable'
import LookupSelect from '../../components/LookupSelect'

interface UserRow {
  id: number
  username: string
  employeeId: number | null
  employeeName: string | null
  isAdmin: boolean
  isActive: boolean
  createdAt: string
}

interface DepartmentNode {
  id: number
  code: string
  name: string
  parentId: number | null
  children?: DepartmentNode[]
}

interface GroupMembership {
  groupId: number
  memberIds: number[]
}

const DOC_TYPES = [
  'QUOTATION', 'SALES_ORDER', 'PURCHASE_ORDER', 'PURCHASE_REQUEST',
  'STOCK_RECEIPT', 'STOCK_ISSUE', 'STOCK_TRANSFER', 'SALES_ALLOWANCE', 'SUPPLIER_RETURN'
]

export default function UsersPage() {
  const { message } = AntApp.useApp()
  const queryClient = useQueryClient()
  const [form] = Form.useForm()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<UserRow | null>(null)
  const [activeTab, setActiveTab] = useState('info')

  // Groups
  const [selectedGroups, setSelectedGroups] = useState<number[]>([])
  const { data: groupsData } = useQuery({
    queryKey: ['admin-groups-list'],
    queryFn: async () => {
      const res = await apiClient.get<PageResult<{ id: number; code: string; name: string }>>('/admin/groups', { params: { size: 100 } })
      return res.data.items
    },
  })

  // Departments tree
  const { data: departments } = useQuery({
    queryKey: ['md-departments-tree'],
    queryFn: async () => {
      const res = await apiClient.get<DepartmentNode[]>('/md/departments', { params: { size: 500 } })
      return res.data as unknown as PageResult<DepartmentNode>
    },
    select: (data) => data.items,
  })
  const [selectedDepts, setSelectedDepts] = useState<number[]>([])

  // Approval rights
  const [selectedDocTypes, setSelectedDocTypes] = useState<string[]>([])

  const showError = (err: unknown, fallback: string) => {
    const body = axios.isAxiosError<ApiErrorBody>(err) ? err.response?.data : undefined
    message.error(body?.message ?? fallback)
  }

  const openCreate = () => {
    setEditing(null)
    form.resetFields()
    setSelectedGroups([])
    setSelectedDepts([])
    setSelectedDocTypes([])
    setOpen(true)
    setActiveTab('info')
  }

  const openEdit = async (record: UserRow) => {
    setEditing(record)
    form.setFieldsValue(record)
    setSelectedGroups([])
    setSelectedDepts([])
    setSelectedDocTypes([])
    setOpen(true)
    setActiveTab('info')

    // Load groups
    try {
      const res = await apiClient.get<PageResult<{ id: number; code: string; name: string; memberCount: number }>>('/admin/groups', { params: { size: 500 } })
      const allGroups = res.data.items
      // Find which groups this user belongs to
      const memberships = await Promise.all(
        allGroups.map(async (g) => {
          const r = await apiClient.get<number[]>(`/admin/groups/${g.id}/members`)
          return { groupId: g.id, userIds: r.data }
        })
      )
      setSelectedGroups(memberships.filter(m => m.userIds.includes(record.id)).map(m => m.groupId))
    } catch { }

    // Load data scopes
    try {
      const res = await apiClient.get<number[]>('/admin/data-scopes', { params: { userId: record.id } })
      setSelectedDepts(res.data)
    } catch { }

    // Load approval rights
    try {
      const res = await apiClient.get<string[]>('/admin/approval-rights', { params: { userId: record.id } })
      setSelectedDocTypes(res.data)
    } catch { }
  }

  const saveMutation = useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      if (editing) {
        await apiClient.put(`/admin/users/${editing.id}`, values)
        // Save groups - need to preserve other members
        const res = await apiClient.get<PageResult<{ id: number }>>('/admin/groups', { params: { size: 500 } })
        const allGroups = res.data.items
        const groupUpdates = allGroups.map(async (g) => {
          const membersRes = await apiClient.get<number[]>(`/admin/groups/${g.id}/members`)
          const currentMembers = membersRes.data
          const shouldInclude = selectedGroups.includes(g.id)
          const newMembers = shouldInclude
            ? [...new Set([...currentMembers, editing.id])]
            : currentMembers.filter(id => id !== editing.id)
          await apiClient.put(`/admin/groups/${g.id}/members`, newMembers)
        })
        await Promise.all(groupUpdates)
        // Save data scopes
        await apiClient.put('/admin/data-scopes', { userId: editing.id, departmentIds: selectedDepts })
        // Save approval rights
        await apiClient.put('/admin/approval-rights', { userId: editing.id, docTypes: selectedDocTypes })
      } else {
        await apiClient.post('/admin/users', values)
      }
    },
    onSuccess: () => {
      message.success(editing ? 'Cập nhật thành công' : 'Thêm mới thành công')
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      setOpen(false)
    },
    onError: (err) => showError(err, 'Có lỗi xảy ra'),
  })

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      await apiClient.put(`/admin/users/${id}`, { isActive })
    },
    onSuccess: () => {
      message.success('Đã cập nhật trạng thái')
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    },
    onError: (err) => showError(err, 'Lỗi cập nhật trạng thái'),
  })

  const resetPasswordMutation = useMutation({
    mutationFn: async ({ id, password }: { id: number; password: string }) => {
      await apiClient.put(`/admin/users/${id}`, { password })
    },
    onSuccess: () => message.success('Đã đặt lại mật khẩu'),
    onError: (err) => showError(err, 'Lỗi đặt lại mật khẩu'),
  })

  const handleSubmit = async () => {
    const values = await form.validateFields()
    saveMutation.mutate(values)
  }

  const buildTree = (items: DepartmentNode[]): DepartmentNode[] => {
    const map = new Map<number, DepartmentNode>()
    const roots: DepartmentNode[] = []
    for (const item of items) {
      map.set(item.id, { ...item, children: [] })
    }
    for (const item of items) {
      if (item.parentId && map.has(item.parentId)) {
        map.get(item.parentId)!.children!.push(map.get(item.id)!)
      } else {
        roots.push(map.get(item.id)!)
      }
    }
    return roots
  }

  const columns: ColumnsType<UserRow> = [
    { title: 'Tên đăng nhập', dataIndex: 'username', key: 'username' },
    { title: 'Nhân viên', dataIndex: 'employeeName', key: 'employeeName', render: (v) => v || '-' },
    { title: 'Quản trị', dataIndex: 'isAdmin', key: 'isAdmin', render: (v) => v ? <Tag color="red">Admin</Tag> : <Tag>User</Tag> },
    { title: 'Trạng thái', dataIndex: 'isActive', key: 'isActive', render: (v) => v ? <Tag color="green">Hoạt động</Tag> : <Tag color="red">Khóa</Tag> },
    { title: 'Ngày tạo', dataIndex: 'createdAt', key: 'createdAt', render: (v) => dayjs(v).format('DD/MM/YYYY HH:mm') },
    {
      title: '', key: 'actions', width: 160,
      render: (_, record) => (
        <Space>
          <Button type="text" icon={<EditOutlined />} onClick={() => openEdit(record)} />
          <Popconfirm
            title={record.isActive ? 'Khóa tài khoản này?' : 'Mở khóa tài khoản này?'}
            onConfirm={() => toggleActiveMutation.mutate({ id: record.id, isActive: !record.isActive })}
          >
            <Button type="text" icon={record.isActive ? <LockOutlined /> : <UnlockOutlined />} />
          </Popconfirm>
          <Popconfirm
            title="Đặt lại mật khẩu về '123456'?" okText="Đồng ý" cancelText="Hủy"
            onConfirm={() => resetPasswordMutation.mutate({ id: record.id, password: '123456' })}
          >
            <Button type="text" icon={<KeyOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <Typography.Title level={3}>Người dùng</Typography.Title>
      <DataTable<UserRow>
        queryKey="admin-users"
        endpoint="/admin/users"
        columns={columns}
        searchPlaceholder="Tìm kiếm user..."
        toolbarExtra={
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Thêm người dùng</Button>
        }
      />
      <Drawer
        title={editing ? 'Sửa người dùng' : 'Thêm người dùng'}
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
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={[
          {
            key: 'info',
            label: 'Thông tin',
            children: (
              <Form form={form} layout="vertical">
                <Form.Item name="username" label="Tên đăng nhập" rules={[{ required: true, message: 'Vui lòng nhập' }]}>
                  <Input />
                </Form.Item>
                {!editing && (
                  <Form.Item name="password" label="Mật khẩu" rules={[{ required: true, message: 'Vui lòng nhập' }]}>
                    <Input.Password />
                  </Form.Item>
                )}
                <Form.Item name="employeeId" label="Nhân viên">
                  <LookupSelect resource="employees" labelField="fullName" />
                </Form.Item>
                <Form.Item name="isAdmin" label="Quản trị viên" valuePropName="checked">
                  <Switch />
                </Form.Item>
                {editing && (
                  <Space style={{ marginTop: 16 }}>
                    <Popconfirm
                      title="Đặt lại mật khẩu về '123456'?"
                      onConfirm={() => resetPasswordMutation.mutate({ id: editing.id, password: '123456' })}
                    >
                      <Button icon={<KeyOutlined />}>Đặt lại mật khẩu</Button>
                    </Popconfirm>
                    <Popconfirm
                      title={editing.isActive ? 'Khóa tài khoản?' : 'Mở khóa tài khoản?'}
                      onConfirm={() => toggleActiveMutation.mutate({ id: editing.id, isActive: !editing.isActive })}
                    >
                      <Button icon={editing.isActive ? <LockOutlined /> : <UnlockOutlined />}>
                        {editing.isActive ? 'Khóa' : 'Mở khóa'}
                      </Button>
                    </Popconfirm>
                  </Space>
                )}
              </Form>
            ),
          },
          {
            key: 'groups',
            label: 'Thuộc nhóm',
            children: (
              <div>
                <Typography.Text strong>Chọn nhóm cho người dùng</Typography.Text>
                <div style={{ maxHeight: 400, overflow: 'auto', marginTop: 8 }}>
                  {(groupsData || []).map((g) => (
                    <div key={g.id} style={{ padding: '4px 0' }}>
                      <label>
                        <input
                          type="checkbox"
                          checked={selectedGroups.includes(g.id)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedGroups([...selectedGroups, g.id])
                            else setSelectedGroups(selectedGroups.filter(id => id !== g.id))
                          }}
                          style={{ marginRight: 8 }}
                        />
                        {g.name} ({g.code})
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            ),
          },
          {
            key: 'dataScope',
            label: 'Phạm vi dữ liệu',
            children: departments ? (
              <div>
                <Typography.Text strong>Phòng ban được phép truy cập</Typography.Text>
                <Tree
                  checkable
                  defaultExpandAll
                  treeData={buildTree(departments).map(n => ({
                    title: n.name,
                    key: n.id,
                    children: n.children?.map(c => ({ title: c.name, key: c.id, children: c.children?.map(ch => ({ title: ch.name, key: ch.id })) }))
                  }))}
                  checkedKeys={selectedDepts}
                  onCheck={(keys) => setSelectedDepts(keys as number[])}
                  style={{ marginTop: 8 }}
                />
              </div>
            ) : <Typography.Text>Đang tải...</Typography.Text>,
          },
          {
            key: 'approvalRights',
            label: 'Quyền phê duyệt',
            children: (
              <div>
                <Typography.Text strong>Loại chứng từ được phê duyệt</Typography.Text>
                <div style={{ maxHeight: 400, overflow: 'auto', marginTop: 8 }}>
                  {DOC_TYPES.map((dt) => (
                    <div key={dt} style={{ padding: '4px 0' }}>
                      <label>
                        <input
                          type="checkbox"
                          checked={selectedDocTypes.includes(dt)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedDocTypes([...selectedDocTypes, dt])
                            else setSelectedDocTypes(selectedDocTypes.filter(d => d !== dt))
                          }}
                          style={{ marginRight: 8 }}
                        />
                        {dt}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            ),
          },
        ]} />
      </Drawer>
    </div>
  )
}