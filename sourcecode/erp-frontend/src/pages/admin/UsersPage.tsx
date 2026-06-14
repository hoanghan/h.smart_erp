import { useState } from 'react'
import { DialogComponent } from '@syncfusion/ej2-react-popups'
import { ButtonComponent, CheckBoxComponent } from '@syncfusion/ej2-react-buttons'
import { TabComponent, TabItemDirective, TabItemsDirective } from '@syncfusion/ej2-react-navigations'
import { TextBoxComponent } from '@syncfusion/ej2-react-inputs'
import { TreeViewComponent } from '@syncfusion/ej2-react-navigations'
import { DialogUtility } from '@syncfusion/ej2-react-popups'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../../api/client'
import type { PageResult } from '../../api/types'
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
  [key: string]: any
}

const DOC_TYPES = [
  'QUOTATION', 'SALES_ORDER', 'PURCHASE_ORDER', 'PURCHASE_REQUEST',
  'STOCK_RECEIPT', 'STOCK_ISSUE', 'STOCK_TRANSFER', 'SALES_ALLOWANCE', 'SUPPLIER_RETURN'
]

export default function UsersPage() {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<UserRow | null>(null)
  const [activeTab, setActiveTab] = useState(0)

  // Form fields
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [employeeId, setEmployeeId] = useState<number | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)

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
    const body = err && typeof err === 'object' && 'response' in err 
      ? (err as any).response?.data 
      : undefined
    DialogUtility.alert({ content: body?.message ?? fallback, width: 300 })
  }

  const openCreate = () => {
    setEditing(null)
    setUsername('')
    setPassword('')
    setEmployeeId(null)
    setIsAdmin(false)
    setSelectedGroups([])
    setSelectedDepts([])
    setSelectedDocTypes([])
    setActiveTab(0)
    setOpen(true)
  }

  const openEdit = async (record: UserRow) => {
    setEditing(record)
    setUsername(record.username)
    setPassword('')
    setEmployeeId(record.employeeId)
    setIsAdmin(record.isAdmin)
    setSelectedGroups([])
    setSelectedDepts([])
    setSelectedDocTypes([])
    setActiveTab(0)
    setOpen(true)

    // Load groups
    try {
      const res = await apiClient.get<PageResult<{ id: number; code: string; name: string; memberCount: number }>>('/admin/groups', { params: { size: 500 } })
      const allGroups = res.data.items
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
    mutationFn: async () => {
      const values: Record<string, unknown> = {
        username,
        password: password || undefined,
        employeeId,
        isAdmin,
      }

      if (editing) {
        await apiClient.put(`/admin/users/${editing.id}`, values)
        // Save groups
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
      DialogUtility.alert({ content: editing ? 'Cập nhật thành công' : 'Thêm mới thành công', width: 300 })
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
      DialogUtility.alert({ content: 'Đã cập nhật trạng thái', width: 300 })
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    },
    onError: (err) => showError(err, 'Lỗi cập nhật trạng thái'),
  })

  const resetPasswordMutation = useMutation({
    mutationFn: async ({ id, password }: { id: number; password: string }) => {
      await apiClient.put(`/admin/users/${id}`, { password })
    },
    onSuccess: () => DialogUtility.alert({ content: 'Đã đặt lại mật khẩu', width: 300 }),
    onError: (err) => showError(err, 'Lỗi đặt lại mật khẩu'),
  })

  const handleSubmit = () => {
    if (!username) {
      DialogUtility.alert({ content: 'Vui lòng nhập tên đăng nhập', width: 300 })
      return
    }
    if (!editing && !password) {
      DialogUtility.alert({ content: 'Vui lòng nhập mật khẩu', width: 300 })
      return
    }
    saveMutation.mutate()
  }

  const buildTree = (items: DepartmentNode[]): DepartmentNode[] => {
    const map = new Map<number, DepartmentNode>()
    const roots: DepartmentNode[] = []
    for (const item of items) {
      map.set(item.id, { ...item, children: [] })
    }
    for (const item of items) {
      if (item.parentId && map.has(item.parentId)) {
        const node = map.get(item.parentId)!
        node.children!.push(map.get(item.id)!)
      } else {
        roots.push(map.get(item.id)!)
      }
    }
    return roots
  }

  return (
    <div>
      <h2>Người dùng</h2>
      <DataTable<UserRow>
        queryKey="admin-users"
        endpoint="/admin/users"
        columns={[
          { field: 'username', headerText: 'Tên đăng nhập', width: 150 },
          { field: 'employeeName', headerText: 'Nhân viên', width: 150, template: (data: UserRow) => data.employeeName || '-' },
          { field: 'isAdmin', headerText: 'Quản trị', width: 100, template: (data: UserRow) => data.isAdmin ? 'Admin' : 'User' },
          { field: 'isActive', headerText: 'Trạng thái', width: 100, template: (data: UserRow) => data.isActive ? 'Hoạt động' : 'Khóa' },
          { field: 'createdAt', headerText: 'Ngày tạo', width: 150, format: 'd/M/yyyy HH:mm' },
          {
            field: 'actions',
            headerText: '',
            width: 150,
            template: (data: UserRow) => (
              <div style={{ display: 'flex', gap: 8 }}>
                <ButtonComponent cssClass="e-flat e-primary" onClick={() => openEdit(data)}>Sửa</ButtonComponent>
                <ButtonComponent 
                  cssClass="e-flat"
                  onClick={() => {
                    DialogUtility.confirm({
                      title: data.isActive ? 'Khóa tài khoản?' : 'Mở khóa tài khoản?',
                      content: `Bạn có chắc chắn muốn ${data.isActive ? 'khóa' : 'mở khóa'} tài khoản này?`,
                      isModal: true,
                      position: { X: 'center', Y: 'center' },
                      okButton: { text: 'Đồng ý', click: () => toggleActiveMutation.mutate({ id: data.id, isActive: !data.isActive }) },
                      cancelButton: { text: 'Hủy' },
                    })
                  }}
                >
                  {data.isActive ? 'Khóa' : 'Mở khóa'}
                </ButtonComponent>
                <ButtonComponent 
                  cssClass="e-flat"
                  onClick={() => {
                    DialogUtility.confirm({
                      title: "Đặt lại mật khẩu?",
                      content: "Đặt lại mật khẩu về '123456'?",
                      isModal: true,
                      position: { X: 'center', Y: 'center' },
                      okButton: { text: 'Đồng ý', click: () => resetPasswordMutation.mutate({ id: data.id, password: '123456' }) },
                      cancelButton: { text: 'Hủy' },
                    })
                  }}
                >
                  Đặt lại mật khẩu
                </ButtonComponent>
              </div>
            ),
          },
        ]}
        searchPlaceholder="Tìm kiếm user..."
        toolbarExtra={
          <ButtonComponent cssClass="e-success" onClick={openCreate}>Thêm người dùng</ButtonComponent>
        }
      />

      <DialogComponent
        header={editing ? 'Sửa người dùng' : 'Thêm người dùng'}
        showCloseIcon={true}
        visible={open}
        close={() => setOpen(false)}
        width="560"
        target="#root"
        position={{ X: 'center', Y: 'center' }}
        isModal={true}
        footerTemplate={() => (
          <div style={{ textAlign: 'right' }}>
            <ButtonComponent cssClass="e-flat" onClick={() => setOpen(false)}>Hủy</ButtonComponent>
            <ButtonComponent 
              cssClass="e-flat e-primary" 
              onClick={handleSubmit} 
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? 'Đang lưu...' : 'Lưu'}
            </ButtonComponent>
          </div>
        )}
      >
        <TabComponent selectedItem={activeTab} selecting={(e) => setActiveTab(e.selectingIndex as number)}>
          <TabItemsDirective>
            <TabItemDirective header={{ text: 'Thông tin' }} />
            <TabItemDirective header={{ text: 'Thuộc nhóm' }} />
            <TabItemDirective header={{ text: 'Phạm vi dữ liệu' }} />
            <TabItemDirective header={{ text: 'Quyền phê duyệt' }} />
          </TabItemsDirective>
        </TabComponent>
        <div>
          {activeTab === 0 && (
              <div style={{ padding: 16 }}>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', marginBottom: 8 }}>Tên đăng nhập *</label>
                  <TextBoxComponent 
                    value={username} 
                    change={(e: any) => setUsername(e.value)} 
                    placeholder="Tên đăng nhập" 
                  />
                </div>
                {!editing && (
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', marginBottom: 8 }}>Mật khẩu *</label>
                    <TextBoxComponent 
                      type="password"
                      value={password} 
                      change={(e: any) => setPassword(e.value)} 
                      placeholder="Mật khẩu" 
                    />
                  </div>
                )}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', marginBottom: 8 }}>Nhân viên</label>
                  <LookupSelect resource="employees" labelField="fullName" value={employeeId} onChange={(v) => setEmployeeId(v as number | null)} />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <CheckBoxComponent 
                      checked={isAdmin} 
                      change={(e: any) => setIsAdmin(e.checked)} 
                    />
                    <span>Quản trị viên</span>
                  </label>
                </div>
                {editing && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                    <ButtonComponent 
                      cssClass="e-flat e-warning"
                      onClick={() => {
                        DialogUtility.confirm({
                          title: "Đặt lại mật khẩu?",
                          content: "Đặt lại mật khẩu về '123456'?",
                          isModal: true,
                          position: { X: 'center', Y: 'center' },
                          okButton: { text: 'Đồng ý', click: () => resetPasswordMutation.mutate({ id: editing.id, password: '123456' }) },
                          cancelButton: { text: 'Hủy' },
                        })
                      }}
                    >
                      Đặt lại mật khẩu
                    </ButtonComponent>
                    <ButtonComponent 
                      cssClass="e-flat"
                      onClick={() => {
                        DialogUtility.confirm({
                          title: editing.isActive ? 'Khóa tài khoản?' : 'Mở khóa tài khoản?',
                          content: `Bạn có chắc chắn muốn ${editing.isActive ? 'khóa' : 'mở khóa'} tài khoản này?`,
                          isModal: true,
                          position: { X: 'center', Y: 'center' },
                          okButton: { text: 'Đồng ý', click: () => toggleActiveMutation.mutate({ id: editing.id, isActive: !editing.isActive }) },
                          cancelButton: { text: 'Hủy' },
                        })
                      }}
                    >
                      {editing.isActive ? 'Khóa' : 'Mở khóa'}
                    </ButtonComponent>
                  </div>
                )}
              </div>
            )}
          {activeTab === 1 && (
              <div style={{ padding: 16 }}>
                <strong>Chọn nhóm cho người dùng</strong>
                <div style={{ maxHeight: 400, overflow: 'auto', marginTop: 8 }}>
                  {(groupsData || []).map((g) => (
                    <div key={g.id} style={{ padding: '4px 0' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input
                          type="checkbox"
                          checked={selectedGroups.includes(g.id)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedGroups([...selectedGroups, g.id])
                            else setSelectedGroups(selectedGroups.filter(id => id !== g.id))
                          }}
                        />
                        {g.name} ({g.code})
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}
          {activeTab === 2 && (
              <div style={{ padding: 16 }}>
                {departments ? (
                  <>
                    <strong>Phòng ban được phép truy cập</strong>
                    <div style={{ marginTop: 8 }}>
                      <TreeViewComponent
                        fields={{
                          dataSource: buildTree(departments),
                          id: 'id',
                          text: 'name',
                          child: 'children',
                        }}
                        checkedNodes={selectedDepts.map(String)}
                        showCheckBox={true}
                        nodeChecked={(e: any) => {
                          if (e.action === 'check') {
                            if (e.data.length === 1) {
                              setSelectedDepts([...new Set([...selectedDepts, e.data[0].id])])
                            } else {
                              setSelectedDepts([...new Set([...selectedDepts, ...e.data.map((d: DepartmentNode) => d.id)])])
                            }
                          } else {
                            setSelectedDepts(selectedDepts.filter(id => !e.data.some((d: DepartmentNode) => d.id === id)))
                          }
                        }}
                      />
                    </div>
                  </>
                ) : <div>Đang tải...</div>}
              </div>
            )}
          {activeTab === 3 && (
              <div style={{ padding: 16 }}>
                <strong>Loại chứng từ được phê duyệt</strong>
                <div style={{ maxHeight: 400, overflow: 'auto', marginTop: 8 }}>
                  {DOC_TYPES.map((dt) => (
                    <div key={dt} style={{ padding: '4px 0' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input
                          type="checkbox"
                          checked={selectedDocTypes.includes(dt)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedDocTypes([...selectedDocTypes, dt])
                            else setSelectedDocTypes(selectedDocTypes.filter(d => d !== dt))
                          }}
                        />
                        {dt}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}
        </div>
      </DialogComponent>
    </div>
  )
}