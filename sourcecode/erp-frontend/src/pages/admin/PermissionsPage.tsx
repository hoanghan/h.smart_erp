import { useCallback, useEffect, useRef, useState } from 'react'
import { App as AntApp, Button, Checkbox, Collapse, Radio, RadioChangeEvent, Select, Space, Typography } from 'antd'
import { useMutation, useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { apiClient } from '../../api/client'
import type { ApiErrorBody, PageResult } from '../../api/types'
import LookupSelect from '../../components/LookupSelect'

interface CatalogSubject {
  subjectType: string
  subjectCode: string
  label: string
}

interface PermissionCatalog {
  subjectTypes: string[]
  subjectTypeLabels: Record<string, string>
  actions: string[]
  actionLabels: Record<string, string>
  availableActions: Record<string, string[]>
  subjects: CatalogSubject[]
}

interface PermissionEntry {
  subjectType: string
  subjectCode: string
  action: string
}

function GroupSelect({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  const [options, setOptions] = useState<{ value: number; label: string }[]>([])
  const { data } = useQuery({
    queryKey: ['admin-groups-select'],
    queryFn: async () => {
      const res = await apiClient.get<PageResult<{ id: number; code: string; name: string }>>('/admin/groups', { params: { size: 100 } })
      return res.data
    },
  })
  useEffect(() => {
    if (data) {
      setOptions(data.items.map((g: { id: number; code: string; name: string }) => ({ value: g.id, label: g.code + ' - ' + g.name })))
    }
  }, [data])
  return (
    <Select
      showSearch
      allowClear
      placeholder=\"Chọn nhóm...\"
      value={value ?? undefined}
      options={options}
      onChange={(v) => onChange(v ?? null)}
      filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
      style={{ minWidth: 200 }}
    />
  )
}

export default function PermissionsPage() {
  const { message } = AntApp.useApp()
  const [granteeType, setGranteeType] = useState<'USER' | 'GROUP'>('USER')
  const [granteeId, setGranteeId] = useState<number | null>(null)
  const [permSet, setPermSet] = useState<Set<string>>(new Set())
  const [hasChanges, setHasChanges] = useState(false)
  const originalPermSetRef = useRef<Set<string>>(new Set())

  const { data: catalog } = useQuery({
    queryKey: ['permission-catalog'],
    queryFn: async () => {
      const res = await apiClient.get<PermissionCatalog>('/admin/permission-catalog')
      return res.data
    },
  })

  const { data: currentPerms, refetch: refetchPerms } = useQuery({
    queryKey: ['permissions', granteeType, granteeId],
    queryFn: async () => {
      if (!granteeId) return []
      const res = await apiClient.get<PermissionEntry[]>('/admin/permissions', {
        params: { granteeType, granteeId },
      })
      return res.data
    },
    enabled: !!granteeId,
  })

  useEffect(() => {
    if (currentPerms) {
      const s = new Set(currentPerms.map(p => p.subjectType + ':' + p.subjectCode + ':' + p.action))
      setPermSet(s)
      originalPermSetRef.current = new Set(s)
      setHasChanges(false)
    }
  }, [currentPerms])

  const togglePerm = (subjectType: string, subjectCode: string, action: string) => {
    const key = subjectType + ':' + subjectCode + ':' + action
    setPermSet(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      setHasChanges(!setsEqual(next, originalPermSetRef.current))
      return next
    })
  }

  const toggleColumn = (action: string, subjectType: string, subjects: CatalogSubject[]) => {
    setPermSet(prev => {
      const next = new Set(prev)
      const allChecked = subjects.every(s => next.has(s.subjectType + ':' + s.subjectCode + ':' + action))
      for (const s of subjects) {
        const key = s.subjectType + ':' + s.subjectCode + ':' + action
        if (allChecked) next.delete(key)
        else next.add(key)
      }
      setHasChanges(!setsEqual(next, originalPermSetRef.current))
      return next
    })
  }

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (hasChanges) e.preventDefault()
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [hasChanges])

  const showError = (err: unknown, fallback: string) => {
    const body = axios.isAxiosError<ApiErrorBody>(err) ? err.response?.data : undefined
    message.error(body?.message ?? fallback)
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!granteeId) return
      const perms: PermissionEntry[] = []
      for (const key of permSet) {
        const parts = key.split(':')
        perms.push({ subjectType: parts[0], subjectCode: parts[1], action: parts[2] })
      }
      await apiClient.put('/admin/permissions', { granteeType, granteeId, permissions: perms })
    },
    onSuccess: () => {
      message.success('Đã lưu phân quyền')
      originalPermSetRef.current = new Set(permSet)
      setHasChanges(false)
      refetchPerms()
    },
    onError: (err) => showError(err, 'Lỗi lưu phân quyền'),
  })

  const handleGranteeTypeChange = (e: RadioChangeEvent) => {
    setGranteeType(e.target.value as 'USER' | 'GROUP')
    setGranteeId(null)
    setPermSet(new Set())
    setHasChanges(false)
  }

  if (!catalog) return <Typography.Text>Đang tải...</Typography.Text>

  const subjectsByType = catalog.subjectTypes.map(st => ({
    type: st,
    label: catalog.subjectTypeLabels[st] || st,
    subjects: catalog.subjects.filter(s => s.subjectType === st),
    availableActions: catalog.availableActions[st] || catalog.actions,
  }))

  return (
    <div>
      <Typography.Title level={3}>Phân quyền</Typography.Title>

      <Space style={{ marginBottom: 16 }}>
        <Radio.Group value={granteeType} onChange={handleGranteeTypeChange}>
          <Radio value=\"USER\">Người dùng</Radio>
          <Radio value=\"GROUP\">Nhóm</Radio>
        </Radio.Group>
        {granteeType === 'USER' ? (
          <LookupSelect
            resource=\"employees\"
            labelField=\"fullName\"
            value={granteeId}
            onChange={(v: number | null) => { setGranteeId(v); setHasChanges(false) }}
            placeholder=\"Chọn nhân viên...\"
          />
        ) : (
          <GroupSelect
            value={granteeId}
            onChange={(v: number | null) => { setGranteeId(v); setHasChanges(false) }}
          />
        )}
      </Space>

      {granteeId && (
        <div>
          {hasChanges && (
            <Typography.Text type=\"warning\" style={{ display: 'block', marginBottom: 8 }}>
              Có thay đổi chưa được lưu
            </Typography.Text>
          )}
          <Button
            type=\"primary\"
            onClick={() => saveMutation.mutate()}
            loading={saveMutation.isPending}
            disabled={!hasChanges}
            style={{ marginBottom: 16 }}
          >
            Lưu phân quyền
          </Button>

          <Collapse
            defaultActiveKey={catalog.subjectTypes}
            items={subjectsByType
              .filter(g => g.subjects.length > 0)
              .map(group => ({
                key: group.type,
                label: group.label,
                children: (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ borderCollapse: 'collapse', minWidth: 600 }}>
                      <thead>
                        <tr>
                          <th style={{ border: '1px solid #d9d9d9', padding: '6px 8px', textAlign: 'left', background: '#fafafa', minWidth: 180 }}>
                            Đối tượng
                          </th>
                          {group.availableActions.map(action => (
                            <th key={action} style={{ border: '1px solid #d9d9d9', padding: '6px 8px', textAlign: 'center', background: '#fafafa' }}>
                              <div>
                                <div>{catalog.actionLabels[action] || action}</div>
                                <Checkbox
                                  checked={group.subjects.every(s => permSet.has(s.subjectType + ':' + s.subjectCode + ':' + action))}
                                  indeterminate={
                                    group.subjects.some(s => permSet.has(s.subjectType + ':' + s.subjectCode + ':' + action)) &&
                                    !group.subjects.every(s => permSet.has(s.subjectType + ':' + s.subjectCode + ':' + action))
                                  }
                                  onChange={() => toggleColumn(action, group.type, group.subjects)}
                                />
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {group.subjects.map(subj => (
                          <tr key={subj.subjectType + ':' + subj.subjectCode}>
                            <td style={{ border: '1px solid #d9d9d9', padding: '6px 8px', fontWeight: 500 }}>
                              {subj.label}
                            </td>
                            {group.availableActions.map(action => (
                              <td key={action} style={{ border: '1px solid #d9d9d9', padding: '6px 8px', textAlign: 'center' }}>
                                <Checkbox
                                  checked={permSet.has(subj.subjectType + ':' + subj.subjectCode + ':' + action)}
                                  onChange={() => togglePerm(subj.subjectType, subj.subjectCode, action)}
                                />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ),
              }))}
          />
        </div>
      )}
    </div>
  )
}

function setsEqual(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false
  for (const item of a) if (!b.has(item)) return false
  return true
}
