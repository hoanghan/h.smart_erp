import { useEffect, useMemo, useState } from 'react'
import { App as AntApp, Button, Card, Col, Form, Input, Row, Select, Space, Switch, Tree, Typography } from 'antd'
import type { DataNode } from 'antd/es/tree'
import { PlusOutlined } from '@ant-design/icons'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { apiClient } from '../../api/client'
import type { AccountCreate, AccountOut, AccountUpdate, ApiErrorBody } from '../../api/types'
import { ACCOUNT_TYPE_LABELS, BALANCE_DETAIL_LABELS, BALANCE_SIDE_LABELS } from '../../api/finance'
import { AccountTreeSelect, useAccounts, useObjectCategories } from './common'

const ACCOUNT_TYPE_OPTIONS = Object.entries(ACCOUNT_TYPE_LABELS).map(([value, label]) => ({ value, label }))
const BALANCE_DETAIL_OPTIONS = Object.entries(BALANCE_DETAIL_LABELS).map(([value, label]) => ({ value, label }))
const BALANCE_SIDE_OPTIONS = Object.entries(BALANCE_SIDE_LABELS).map(([value, label]) => ({ value, label }))

function buildTreeData(accounts: AccountOut[]): DataNode[] {
  const byParent = new Map<number | null, AccountOut[]>()
  for (const a of accounts) {
    const key = a.parentId ?? null
    if (!byParent.has(key)) byParent.set(key, [])
    byParent.get(key)!.push(a)
  }
  const build = (parentId: number | null): DataNode[] =>
    (byParent.get(parentId) ?? [])
      .sort((a, b) => a.code.localeCompare(b.code))
      .map((a) => ({
        key: String(a.id),
        title: `${a.code} — ${a.name}`,
        children: build(a.id),
      }))
  return build(null)
}

interface FormValues {
  code: string
  name: string
  parentId: number | null
  accountType: string
  objectCategoryId: number | null
  balanceDetail: string
  balanceSide: string
  isActive: boolean
}

const DEFAULT_VALUES: FormValues = {
  code: '',
  name: '',
  parentId: null,
  accountType: 'NORMAL',
  objectCategoryId: null,
  balanceDetail: 'NONE',
  balanceSide: 'GREATER',
  isActive: true,
}

/** Cây tài khoản kế toán (trái) + panel sửa thuộc tính (phải). Thêm cùng cấp / thêm tiểu khoản tạo tài khoản mới (chưa lưu). */
export default function AccountsPage() {
  const { message } = AntApp.useApp()
  const queryClient = useQueryClient()
  const [form] = Form.useForm<FormValues>()

  const { data: accounts, isLoading } = useAccounts()
  const { data: objectCategories } = useObjectCategories()

  const [selectedId, setSelectedId] = useState<number | null>(null)
  // Khi != null: đang tạo mới tài khoản con/cùng cấp với cha = giá trị này (null = gốc).
  const [draftParentId, setDraftParentId] = useState<number | null | undefined>(undefined)

  const treeData = useMemo(() => buildTreeData(accounts ?? []), [accounts])
  const selected = accounts?.find((a) => a.id === selectedId) ?? null
  const isNew = draftParentId !== undefined

  useEffect(() => {
    if (isNew) {
      form.setFieldsValue({ ...DEFAULT_VALUES, parentId: draftParentId ?? null })
    } else if (selected) {
      form.setFieldsValue({
        code: selected.code,
        name: selected.name,
        parentId: selected.parentId,
        accountType: selected.accountType,
        objectCategoryId: selected.objectCategoryId,
        balanceDetail: selected.balanceDetail,
        balanceSide: selected.balanceSide,
        isActive: selected.isActive,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, isNew, draftParentId])

  const showError = (err: unknown, fallback: string) => {
    const body = axios.isAxiosError<ApiErrorBody>(err) ? err.response?.data : undefined
    message.error(body?.message ?? fallback)
  }

  const createMutation = useMutation({
    mutationFn: (body: AccountCreate) => apiClient.post<AccountOut>('/finance/accounts', body),
    onSuccess: (res) => {
      message.success(`Đã tạo tài khoản ${res.data.code}`)
      queryClient.invalidateQueries({ queryKey: ['finance-accounts'] })
      setDraftParentId(undefined)
      setSelectedId(res.data.id)
    },
    onError: (err) => showError(err, 'Không thể tạo tài khoản'),
  })

  const updateMutation = useMutation({
    mutationFn: (body: AccountUpdate) => apiClient.put<AccountOut>(`/finance/accounts/${selectedId}`, body),
    onSuccess: () => {
      message.success('Đã lưu')
      queryClient.invalidateQueries({ queryKey: ['finance-accounts'] })
    },
    onError: (err) => showError(err, 'Không thể lưu'),
  })

  const handleSave = async () => {
    const values = await form.validateFields()
    if (isNew) {
      createMutation.mutate({
        code: values.code,
        name: values.name,
        parentId: values.parentId,
        accountType: values.accountType,
        objectCategoryId: values.objectCategoryId,
        balanceDetail: values.balanceDetail,
        balanceSide: values.balanceSide,
      })
    } else {
      updateMutation.mutate({
        name: values.name,
        parentId: values.parentId,
        accountType: values.accountType,
        objectCategoryId: values.objectCategoryId,
        balanceDetail: values.balanceDetail,
        balanceSide: values.balanceSide,
        isActive: values.isActive,
      })
    }
  }

  const handleAddSibling = () => {
    setDraftParentId(selected?.parentId ?? null)
  }

  const handleAddChild = () => {
    if (!selected) return
    setDraftParentId(selected.id)
  }

  const handleCancelNew = () => {
    setDraftParentId(undefined)
  }

  const saving = createMutation.isPending || updateMutation.isPending

  return (
    <div>
      <Typography.Title level={3}>Hệ thống tài khoản</Typography.Title>
      <Row gutter={16}>
        <Col span={10}>
          <Card title="Cây tài khoản" loading={isLoading} style={{ height: '100%' }}>
            <Space style={{ marginBottom: 12 }}>
              <Button icon={<PlusOutlined />} onClick={handleAddSibling}>
                Thêm cùng cấp
              </Button>
              <Button icon={<PlusOutlined />} onClick={handleAddChild} disabled={!selected}>
                Thêm tiểu khoản
              </Button>
            </Space>
            <Tree
              treeData={treeData}
              defaultExpandAll
              selectedKeys={selectedId !== null ? [String(selectedId)] : []}
              onSelect={(keys) => {
                if (keys.length === 0) return
                setDraftParentId(undefined)
                setSelectedId(Number(keys[0]))
              }}
            />
          </Card>
        </Col>
        <Col span={14}>
          <Card title={isNew ? 'Tài khoản mới' : selected ? `Tài khoản ${selected.code}` : 'Chọn một tài khoản'}>
            {(isNew || selected) && (
              <Form form={form} layout="vertical" initialValues={DEFAULT_VALUES}>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item label="Mã tài khoản" name="code" rules={[{ required: true, message: 'Nhập mã tài khoản' }]}>
                      <Input disabled={!isNew} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="Tên tài khoản" name="name" rules={[{ required: true, message: 'Nhập tên tài khoản' }]}>
                      <Input />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="Tài khoản cha" name="parentId">
                      <AccountTreeSelect placeholder="Không có (TK gốc)" excludeId={isNew ? undefined : selectedId ?? undefined} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="Loại tài khoản" name="accountType">
                      <Select options={ACCOUNT_TYPE_OPTIONS} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="Chi tiết theo đối tượng" name="objectCategoryId">
                      <Select
                        allowClear
                        placeholder="Không chi tiết"
                        options={(objectCategories ?? []).map((c) => ({ value: c.id, label: `${c.code} — ${c.name}` }))}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="Loại số dư" name="balanceDetail">
                      <Select options={BALANCE_DETAIL_OPTIONS} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="Bên số dư" name="balanceSide">
                      <Select options={BALANCE_SIDE_OPTIONS} />
                    </Form.Item>
                  </Col>
                  {!isNew && (
                    <Col span={12}>
                      <Form.Item label="Đang sử dụng" name="isActive" valuePropName="checked">
                        <Switch />
                      </Form.Item>
                    </Col>
                  )}
                </Row>
                <Space>
                  <Button type="primary" onClick={handleSave} loading={saving}>
                    Lưu
                  </Button>
                  {isNew && <Button onClick={handleCancelNew}>Hủy</Button>}
                </Space>
              </Form>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  )
}
