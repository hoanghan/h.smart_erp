import { useMemo, useState } from 'react'
import { App as AntApp, Button, Form, InputNumber, Select, Space, Table, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { apiClient } from '../../api/client'
import type { AccountOut, ApiErrorBody, OpeningBalanceCreate, OpeningBalanceOut } from '../../api/types'
import { formatDateVN, formatNumberVN } from '../../utils/format'
import { useFiscalPeriods, useObjectCategories } from './common'

interface AccountRow extends AccountOut {
  header: OpeningBalanceOut | null
  objectBalances: OpeningBalanceOut[]
  sumDebit: number
  sumCredit: number
}

/** Form thêm số dư đầu kỳ theo đối tượng cho một tài khoản (objectType/objectId tự do — backend không ràng buộc FK). */
function ObjectBalanceForm({ periodId, accountId, objectType, onDone }: { periodId: number; accountId: number; objectType: string | null; onDone: () => void }) {
  const { message } = AntApp.useApp()
  const [form] = Form.useForm()

  const showError = (err: unknown, fallback: string) => {
    const body = axios.isAxiosError<ApiErrorBody>(err) ? err.response?.data : undefined
    message.error(body?.message ?? fallback)
  }

  const createMutation = useMutation({
    mutationFn: (body: OpeningBalanceCreate) => apiClient.post<OpeningBalanceOut>('/finance/opening-balances', body),
    onSuccess: () => {
      message.success('Đã thêm số dư theo đối tượng')
      form.resetFields()
      onDone()
    },
    onError: (err) => showError(err, 'Không thể thêm số dư'),
  })

  const handleAdd = async () => {
    const values = await form.validateFields()
    createMutation.mutate({
      periodId,
      accountId,
      objectType,
      objectId: values.objectId,
      debit: values.debit ?? 0,
      credit: values.credit ?? 0,
    })
  }

  return (
    <Form form={form} layout="inline" style={{ marginTop: 8 }}>
      <Form.Item name="objectId" rules={[{ required: true, message: 'Nhập mã đối tượng' }]}>
        <InputNumber min={1} placeholder={`Mã đối tượng${objectType ? ` (${objectType})` : ''}`} style={{ width: 220 }} />
      </Form.Item>
      <Form.Item name="debit" initialValue={0}>
        <InputNumber min={0} placeholder="Nợ" style={{ width: 140 }} />
      </Form.Item>
      <Form.Item name="credit" initialValue={0}>
        <InputNumber min={0} placeholder="Có" style={{ width: 140 }} />
      </Form.Item>
      <Form.Item>
        <Button onClick={handleAdd} loading={createMutation.isPending}>
          Thêm
        </Button>
      </Form.Item>
    </Form>
  )
}

/** Nhập số dư đầu kỳ theo tài khoản (và theo đối tượng với TK chi tiết). */
export default function OpeningBalancesPage() {
  const { message } = AntApp.useApp()
  const queryClient = useQueryClient()
  const [periodId, setPeriodId] = useState<number | null>(null)
  const [edits, setEdits] = useState<Record<number, { debit: number; credit: number }>>({})

  const { data: periods } = useFiscalPeriods()
  const { data: accounts } = useQuery({
    queryKey: ['finance-accounts'],
    queryFn: async () => (await apiClient.get<AccountOut[]>('/finance/accounts')).data,
    staleTime: 60 * 1000,
  })
  const { data: objectCategories } = useObjectCategories()

  const sortedPeriods = useMemo(
    () => [...(periods ?? [])].sort((a, b) => (a.fiscalYear - b.fiscalYear) || (a.periodNo - b.periodNo)),
    [periods],
  )

  const balancesQuery = useQuery({
    queryKey: ['finance-opening-balances', periodId],
    queryFn: async () => (await apiClient.get<OpeningBalanceOut[]>('/finance/opening-balances', { params: { periodId } })).data,
    enabled: periodId !== null,
  })

  const showError = (err: unknown, fallback: string) => {
    const body = axios.isAxiosError<ApiErrorBody>(err) ? err.response?.data : undefined
    message.error(body?.message ?? fallback)
  }

  const createMutation = useMutation({
    mutationFn: (body: OpeningBalanceCreate) => apiClient.post<OpeningBalanceOut>('/finance/opening-balances', body),
    onSuccess: () => {
      message.success('Đã lưu số dư')
      queryClient.invalidateQueries({ queryKey: ['finance-opening-balances', periodId] })
    },
    onError: (err) => showError(err, 'Không thể lưu số dư'),
  })

  // Chỉ hiển thị tài khoản chi tiết (không có tiểu khoản) — số dư đầu kỳ nhập ở mức chi tiết nhất.
  const leafAccounts = useMemo(() => {
    const list = accounts ?? []
    const parentIds = new Set(list.map((a) => a.parentId).filter((x): x is number => x !== null))
    return list.filter((a) => !parentIds.has(a.id) && a.isActive).sort((a, b) => a.code.localeCompare(b.code))
  }, [accounts])

  const rows: AccountRow[] = useMemo(() => {
    const balances = balancesQuery.data ?? []
    return leafAccounts.map((a) => {
      const accBalances = balances.filter((b) => b.accountId === a.id)
      const header = accBalances.find((b) => b.objectId === null) ?? null
      const objectBalances = accBalances.filter((b) => b.objectId !== null)
      return {
        ...a,
        header,
        objectBalances,
        sumDebit: accBalances.reduce((s, b) => s + b.debit, 0),
        sumCredit: accBalances.reduce((s, b) => s + b.credit, 0),
      }
    })
  }, [leafAccounts, balancesQuery.data])

  const totalDebit = rows.reduce((s, r) => s + r.sumDebit, 0)
  const totalCredit = rows.reduce((s, r) => s + r.sumCredit, 0)

  const handleSaveHeader = (accountId: number) => {
    const edit = edits[accountId] ?? { debit: 0, credit: 0 }
    if (periodId === null) return
    createMutation.mutate({ periodId, accountId, objectType: null, objectId: null, debit: edit.debit, credit: edit.credit })
  }

  const columns: ColumnsType<AccountRow> = [
    { title: 'Tài khoản', key: 'account', render: (_, r) => `${r.code} — ${r.name}` },
    {
      title: 'Nợ',
      key: 'debit',
      align: 'right',
      width: 180,
      render: (_, r) => {
        if (r.header) return formatNumberVN(r.header.debit)
        if (r.objectCategoryId) return formatNumberVN(r.sumDebit)
        return (
          <InputNumber
            min={0}
            style={{ width: '100%' }}
            value={edits[r.id]?.debit ?? 0}
            onChange={(v) => setEdits((prev) => ({ ...prev, [r.id]: { debit: v ?? 0, credit: prev[r.id]?.credit ?? 0 } }))}
          />
        )
      },
    },
    {
      title: 'Có',
      key: 'credit',
      align: 'right',
      width: 180,
      render: (_, r) => {
        if (r.header) return formatNumberVN(r.header.credit)
        if (r.objectCategoryId) return formatNumberVN(r.sumCredit)
        return (
          <InputNumber
            min={0}
            style={{ width: '100%' }}
            value={edits[r.id]?.credit ?? 0}
            onChange={(v) => setEdits((prev) => ({ ...prev, [r.id]: { debit: prev[r.id]?.debit ?? 0, credit: v ?? 0 } }))}
          />
        )
      },
    },
    {
      title: '',
      key: '__actions',
      width: 100,
      render: (_, r) =>
        !r.header && !r.objectCategoryId ? (
          <Button size="small" onClick={() => handleSaveHeader(r.id)} loading={createMutation.isPending}>
            Lưu
          </Button>
        ) : null,
    },
  ]

  return (
    <div>
      <Typography.Title level={3}>Số dư đầu kỳ</Typography.Title>
      <Space style={{ marginBottom: 16 }}>
        <span>Kỳ kế toán:</span>
        <Select
          value={periodId ?? undefined}
          onChange={setPeriodId}
          placeholder="Chọn kỳ"
          style={{ width: 280 }}
          options={sortedPeriods.map((p) => ({
            value: p.id,
            label: `Năm ${p.fiscalYear} — Kỳ ${p.periodNo} (${formatDateVN(p.dateFrom)} - ${formatDateVN(p.dateTo)})`,
          }))}
        />
      </Space>
      <Table<AccountRow>
        rowKey="id"
        columns={columns}
        dataSource={rows}
        loading={balancesQuery.isFetching}
        size="small"
        pagination={{ pageSize: 50, showTotal: (t) => `${t} tài khoản` }}
        expandable={{
          rowExpandable: (r) => !!r.objectCategoryId,
          expandedRowRender: (r) => {
            const category = objectCategories?.find((c) => c.id === r.objectCategoryId)
            return (
              <div>
                <Table
                  rowKey="id"
                  size="small"
                  pagination={false}
                  dataSource={r.objectBalances}
                  columns={[
                    { title: 'Loại đối tượng', dataIndex: 'objectType', key: 'objectType' },
                    { title: 'Mã đối tượng', dataIndex: 'objectId', key: 'objectId' },
                    { title: 'Nợ', dataIndex: 'debit', key: 'debit', align: 'right', render: formatNumberVN },
                    { title: 'Có', dataIndex: 'credit', key: 'credit', align: 'right', render: formatNumberVN },
                  ]}
                />
                {periodId !== null && (
                  <ObjectBalanceForm
                    periodId={periodId}
                    accountId={r.id}
                    objectType={category?.sourceTable ?? category?.code ?? null}
                    onDone={() => queryClient.invalidateQueries({ queryKey: ['finance-opening-balances', periodId] })}
                  />
                )}
              </div>
            )
          },
        }}
        summary={() => (
          <Table.Summary fixed>
            <Table.Summary.Row>
              <Table.Summary.Cell index={0}>
                <strong>Tổng cộng</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={1} align="right">
                <strong>{formatNumberVN(totalDebit)}</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={2} align="right">
                <strong>{formatNumberVN(totalCredit)}</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={3} />
            </Table.Summary.Row>
          </Table.Summary>
        )}
      />
    </div>
  )
}
