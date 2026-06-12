import { useEffect, useMemo, useState } from 'react'
import { App as AntApp, Button, Popconfirm, Select, Space, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { apiClient } from '../../api/client'
import type { ApiErrorBody, FiscalPeriodOut } from '../../api/types'
import { FISCAL_PERIOD_STATUS_LABELS } from '../../api/finance'
import { statusColor } from '../../api/workflow'
import { formatDateVN } from '../../utils/format'

/** Bảng 12 kỳ kế toán theo năm tài chính, mở/khóa sổ. */
export default function PeriodsPage() {
  const { message } = AntApp.useApp()
  const queryClient = useQueryClient()
  const [year, setYear] = useState<number | null>(null)

  const { data: allPeriods } = useQuery({
    queryKey: ['finance-fiscal-periods', 'all'],
    queryFn: async () => (await apiClient.get<FiscalPeriodOut[]>('/finance/fiscal-periods')).data,
  })

  const years = useMemo(
    () => Array.from(new Set((allPeriods ?? []).map((p) => p.fiscalYear))).sort((a, b) => b - a),
    [allPeriods],
  )

  useEffect(() => {
    if (year === null && years.length > 0) setYear(years[0])
  }, [year, years])

  const periods = useMemo(
    () => (allPeriods ?? []).filter((p) => p.fiscalYear === year).sort((a, b) => a.periodNo - b.periodNo),
    [allPeriods, year],
  )

  const showError = (err: unknown, fallback: string) => {
    const body = axios.isAxiosError<ApiErrorBody>(err) ? err.response?.data : undefined
    message.error(body?.message ?? fallback)
  }

  const closeMutation = useMutation({
    mutationFn: (id: number) => apiClient.post<FiscalPeriodOut>(`/finance/fiscal-periods/${id}/close`),
    onSuccess: () => {
      message.success('Đã khóa sổ kỳ')
      queryClient.invalidateQueries({ queryKey: ['finance-fiscal-periods'] })
    },
    onError: (err) => showError(err, 'Không thể khóa sổ'),
  })

  const reopenMutation = useMutation({
    mutationFn: (id: number) => apiClient.post<FiscalPeriodOut>(`/finance/fiscal-periods/${id}/reopen`),
    onSuccess: () => {
      message.success('Đã mở sổ kỳ')
      queryClient.invalidateQueries({ queryKey: ['finance-fiscal-periods'] })
    },
    onError: (err) => showError(err, 'Không thể mở sổ'),
  })

  const columns: ColumnsType<FiscalPeriodOut> = [
    { title: 'Kỳ', dataIndex: 'periodNo', key: 'periodNo', width: 80, render: (v: number) => `Kỳ ${v}` },
    { title: 'Từ ngày', dataIndex: 'dateFrom', key: 'dateFrom', width: 120, render: formatDateVN },
    { title: 'Đến ngày', dataIndex: 'dateTo', key: 'dateTo', width: 120, render: formatDateVN },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (v: string) => <Tag color={statusColor(v)}>{FISCAL_PERIOD_STATUS_LABELS[v] ?? v}</Tag>,
    },
    {
      title: '',
      key: '__actions',
      width: 140,
      render: (_, record) =>
        record.status === 'OPEN' ? (
          <Popconfirm
            title="Khóa sổ kỳ này?"
            description="Không thể ghi sổ chứng từ mới vào kỳ đã khóa."
            okText="Khóa sổ"
            cancelText="Hủy"
            onConfirm={() => closeMutation.mutate(record.id)}
          >
            <Button danger loading={closeMutation.isPending}>
              Khóa sổ
            </Button>
          </Popconfirm>
        ) : (
          <Popconfirm
            title="Mở sổ kỳ này?"
            okText="Mở sổ"
            cancelText="Hủy"
            onConfirm={() => reopenMutation.mutate(record.id)}
          >
            <Button loading={reopenMutation.isPending}>Mở sổ</Button>
          </Popconfirm>
        ),
    },
  ]

  return (
    <div>
      <Typography.Title level={3}>Kỳ kế toán</Typography.Title>
      <Space style={{ marginBottom: 16 }}>
        <span>Năm tài chính:</span>
        <Select value={year ?? undefined} onChange={setYear} options={years.map((y) => ({ value: y, label: y }))} style={{ width: 120 }} />
      </Space>
      <Table<FiscalPeriodOut> rowKey="id" columns={columns} dataSource={periods} pagination={false} size="small" />
    </div>
  )
}
