import { useEffect, useState } from 'react'
import { App as AntApp, Button, Card, Checkbox, Radio, Space, Spin, Typography } from 'antd'
import { useMutation, useQuery } from '@tanstack/react-query'
import { apiClient } from '../../api/client'
import LookupSelect from '../../components/LookupSelect'

interface Subject {
  subjectType: string
  subjectCode: string
  label: string
}

interface PermissionEntry {
  subjectType: string
  subjectCode: string
  action: string
}

interface PermissionCatalogResponse {
  subjectTypes: string[]
  subjectTypeLabels: Record<string, string>
  actions: string[]
  actionLabels: Record<string, string>
  availableActions: Record<string, string[]>
  subjects: Subject[]
}

const ALL_ACTIONS = ['VIEW', 'CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'POST', 'UNLOCK', 'IMPORT', 'EXPORT']

export default function PermissionsPage() {
  const { message } = AntApp.useApp()
  const [granteeType, setGranteeType] = useState<'USER' | 'GROUP'>('USER')
  const [granteeId, setGranteeId] = useState<number | null>(null)
  const [hasChanges, setHasChanges] = useState(false)
  const [selectedPerms, setSelectedPerms] = useState<Set<string>>(new Set())
  const [selectColumn, setSelectColumn] = useState<Record<string, boolean>>({})

  const { data: catalog, isLoading: catalogLoading } = useQuery({
    queryKey: ['admin-permission-catalog'],
    queryFn: async () => {
      const res = await apiClient.get<PermissionCatalogResponse>('/admin/permission-catalog')
      return res.data
    },
    enabled: true,
  })

  const { data: existingPerms, isLoading: permsLoading } = useQuery({
    queryKey: ['admin-permissions', granteeType, granteeId],
    queryFn: async () => {
      if (!granteeId) return []
      const res = await apiClient.get<PermissionEntry[]>('/admin/permissions', {
        params: { granteeType, granteeId },
      })
      return res.data
    },
    enabled: granteeId !== null,
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!granteeId) return
      const perms: PermissionEntry[] = []
      for (const key of selectedPerms) {
        const [subjectType, subjectCode, action] = key.split('|')
        perms.push({ subjectType, subjectCode, action })
      }
      await apiClient.put('/admin/permissions', { granteeType, granteeId, permissions: perms })
    },
    onSuccess: () => {
      message.success('Đã lưu phân quyền')
      setHasChanges(false)
    },
    onError: (err) => {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as any).response?.data?.message ?? 'Lỗi lưu'
        : 'Lỗi lưu'
      message.error(msg)
    },
  })

  const handleGranteeTypeChange = (e: any) => {
    setGranteeType(e.target.value)
    setGranteeId(null)
    setSelectedPerms(new Set())
    setHasChanges(false)
  }

  const handleTogglePerm = (subjectType: string, subjectCode: string, action: string) => {
    const key = `${subjectType}|${subjectCode}|${action}`
    const newSet = new Set(selectedPerms)
    if (newSet.has(key)) {
      newSet.delete(key)
    } else {
      newSet.add(key)
    }
    setSelectedPerms(newSet)
    setHasChanges(true)
  }

  const handleSelectAllColumn = (action: string, checked: boolean) => {
    const newSet = new Set(selectedPerms)
    const newSelectColumn = { ...selectColumn }
    if (!catalog) return
    for (const subject of catalog.subjects) {
      const key = `${subject.subjectType}|${subject.subjectCode}|${action}`
      if (checked) {
        newSet.add(key)
      } else {
        newSet.delete(key)
      }
    }
    newSelectColumn[action] = checked
    setSelectedPerms(newSet)
    setSelectColumn(newSelectColumn)
    setHasChanges(true)
  }

  const isActionAvailable = (subjectType: string, action: string) => {
    if (!catalog) return false
    return catalog.availableActions[subjectType]?.includes(action) ?? false
  }

  // Sync existing permissions when data loads
  useEffect(() => {
    if (existingPerms) {
      const keys = existingPerms.map(p => `${p.subjectType}|${p.subjectCode}|${p.action}`)
      setSelectedPerms(new Set(keys))
      setHasChanges(false)
    }
  }, [existingPerms])

  if (catalogLoading || permsLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 48 }}>
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div>
      <Typography.Title level={3}>Phân quyền</Typography.Title>
      <Card loading={catalogLoading || permsLoading} style={{ maxWidth: 600 }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Typography.Text strong>Đối tượng</Typography.Text>
            <Radio.Group value={granteeType} onChange={handleGranteeTypeChange} style={{ marginLeft: 16 }}>
              <Radio value="USER">Người dùng</Radio>
              <Radio value="GROUP">Nhóm</Radio>
            </Radio.Group>
          </div>
          {granteeType === 'USER' && (
            <div>
              <Typography.Text strong>Người dùng</Typography.Text>
              <div style={{ marginTop: 8 }}>
                <LookupSelect
                  resource="employees"
                  labelField="fullName"
                  value={granteeId}
                  onChange={(v: number | null) => { setGranteeId(v); setHasChanges(false) }}
                  placeholder="Chọn nhân viên..."
                />
              </div>
            </div>
          )}
          {granteeType === 'GROUP' && (
            <div>
              <Typography.Text strong>Nhóm</Typography.Text>
              <div style={{ marginTop: 8 }}>
                <LookupSelect
                  resource="groups"
                  labelField="name"
                  value={granteeId}
                  onChange={(v: number | null) => { setGranteeId(v); setHasChanges(false) }}
                  placeholder="Chọn nhóm..."
                />
              </div>
            </div>
          )}
          {hasChanges && (
            <Typography.Text type="warning" style={{ display: 'block', marginBottom: 8 }}>
              Có thay đổi chưa được lưu
            </Typography.Text>
          )}
          <Button
            type="primary"
            onClick={() => saveMutation.mutate()}
            loading={saveMutation.isPending}
            disabled={!granteeId || !hasChanges}
          >
            Lưu
          </Button>
        </Space>
      </Card>
      {granteeId && catalog && (
        <Card title="Ma trận phân quyền" style={{ marginTop: 16 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ border: '1px solid #d9d9d9', padding: 8, textAlign: 'left', background: '#fafafa' }}>Chủ thể</th>
                {ALL_ACTIONS.filter(action => catalog.actions.includes(action)).map(action => (
                  <th key={action} style={{ border: '1px solid #d9d9d9', padding: 8, textAlign: 'center', background: '#fafafa', width: 80 }}>
                    {catalog.actionLabels[action] ?? action}
                  </th>
                ))}
              </tr>
              <tr>
                <th style={{ border: '1px solid #d9d9d9', padding: 8 }}></th>
                {ALL_ACTIONS.filter(action => catalog.actions.includes(action)).map(action => (
                  <th key={action} style={{ border: '1px solid #d9d9d9', padding: 8, textAlign: 'center', background: '#fafafa' }}>
                    <Checkbox
                      checked={selectColumn[action] ?? false}
                      onChange={(e) => handleSelectAllColumn(action, e.target.checked)}
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {catalog.subjects.map(subject => (
                <tr key={`${subject.subjectType}-${subject.subjectCode}`}>
                  <td style={{ border: '1px solid #d9d9d9', padding: 8 }}>
                    <Typography.Text strong>{subject.label}</Typography.Text>
                    <div style={{ fontSize: 11, color: '#888' }}>{subject.subjectType} - {subject.subjectCode}</div>
                  </td>
                  {ALL_ACTIONS.filter(action => catalog.actions.includes(action)).map(action => (
                    <td key={action} style={{ border: '1px solid #d9d9d9', padding: 8, textAlign: 'center' }}>
                      {isActionAvailable(subject.subjectType, action) ? (
                        <Checkbox
                          checked={selectedPerms.has(`${subject.subjectType}|${subject.subjectCode}|${action}`)}
                          onChange={() => handleTogglePerm(subject.subjectType, subject.subjectCode, action)}
                        />
                      ) : <span style={{ color: '#ccc' }}>-</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  )
}