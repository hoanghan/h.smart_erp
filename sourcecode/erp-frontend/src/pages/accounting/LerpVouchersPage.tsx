import { useMemo, useState } from 'react'
import { App as AntApp, Button, Popconfirm, Select, Space, Table, Tabs, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '../../api/client'
import type { ApiErrorBody, LerpVoucherOut, PageResult, VoucherOut } from '../../api/types'
import { LERP_STATUS_LABELS, LERP_TABS, LERP_VOUCHER_TYPE_LABELS } from '../../api/finance'
import { statusColor } from '../../api/workflow'
import LookupLabel from '../../components/LookupLabel'
import { formatDateVN, formatNumberVN } from '../../utils/format'

const STATUS_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái' },
  ...Object.entries(LERP_STATUS_LABELS).map(([value, label]) => ({ value, label })),
]

/** Lưới phiếu LERP (cầu nối SCRM -> kế toán): theo loại (tab) + trạng thái, phát sinh / xóa phiếu. */
export default function LerpVouchersPage() {
  const { message } = AntApp.useApp()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const [tab, setTab] = useState('ALL')
  const [status, setStatus] = useState('PENDING')

  const queryKey = ['finance-lerp-vouchers', status]
  const { data, isFetching } = useQuery({
    queryKey,
    queryFn: async () =>
      (
        await apiClient.get<PageResult<LerpVoucherOut>>('/finance/lerp-vouchers', {
          params: { status: status || undefined, size: 200 },
        })
      ).data,
  })

  const tabDef = LERP_TABS.find((t) => t.key === tab) ?? LERP_TABS[0]
  const items = useMemo(() => {
    const all = data?.items ?? []
    if (tabDef.types.length === 0) return all
    return all.filter((lv) => tabDef.types.includes(lv.voucherType))
  }, [data, tabDef])

  const showError = (err: unknown, fallback: string) => {
    const body = axios.isAxiosError<ApiErrorBody>(err) ? err.response?.data : undefined
    message.error(body?.message ?? fallback)
  }

  const generateMutation = useMutation({
    mutationFn: (id: number) => apiClient.post<{ lerp: LerpVoucherOut; voucher: VoucherOut }>(`/finance/lerp-vouchers/${id}/generate`),
    onSuccess: (res) => {
      message.success(`Đã phát sinh chứng từ ${res.data.voucher.docNo}`)
      queryClient.invalidateQueries({ queryKey: ['finance-lerp-vouchers'] })
      navigate(`/accounting/vouchers/${res.data.voucher.id}`)
    },
    onError: (err) => showError(err, 'Không thể phát sinh phiếu'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiClient.delete<LerpVoucherOut>(`/finance/lerp-vouchers/${id}`),
    onSuccess: () => {
      message.success('Đã xóa phiếu')
      queryClient.invalidateQueries({ queryKey: ['finance-lerp-vouchers'] })
    },
    onError: (err) => showError(err, 'Không thể xóa phiếu'),
  })

  const columns: ColumnsType<LerpVoucherOut> = [
    { title: 'Loại', dataIndex: 'voucherType', key: 'voucherType', width: 140, render: (v: string) => LERP_VOUCHER_TYPE_LABELS[v] ?? v },
    { title: 'Nguồn', dataIndex: 'sourceTable', key: 'sourceTable', width: 160, render: (v: string, r) => `${v} #${r.sourceId}` },
    { title: 'Số tham chiếu', dataIndex: 'refNo', key: 'refNo', width: 140 },
    {
      title: 'Đối tượng',
      dataIndex: 'partnerId',
      key: 'partnerId',
      render: (v: number | null) => <LookupLabel resource="partners" id={v} labelField="shortName" />,
    },
    { title: 'Số tiền', dataIndex: 'amount', key: 'amount', align: 'right', width: 130, render: formatNumberVN },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (v: string) => <Tag color={statusColor(v)}>{LERP_STATUS_LABELS[v] ?? v}</Tag>,
    },
    { title: 'Ngày tạo', dataIndex: 'createdAt', key: 'createdAt', width: 110, render: formatDateVN },
    {
      title: '',
      key: '__actions',
      width: 180,
      render: (_, record) => (
        <Space>
          {record.status === 'PENDING' && (
            <Button type="primary" size="small" loading={generateMutation.isPending} onClick={() => generateMutation.mutate(record.id)}>
              Phát sinh phiếu
            </Button>
          )}
          {(record.status === 'PENDING' || record.status === 'GENERATED') && (
            <Popconfirm title="Xóa phiếu LERP này?" okText="Xóa" cancelText="Hủy" onConfirm={() => deleteMutation.mutate(record.id)}>
              <Button danger size="small" loading={deleteMutation.isPending}>
                Xóa
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div>
      <Typography.Title level={3}>LERP — Cầu nối SCRM &rarr; Kế toán</Typography.Title>
      <Space style={{ marginBottom: 16 }}>
        <span>Trạng thái:</span>
        <Select value={status} onChange={setStatus} options={STATUS_OPTIONS} style={{ width: 180 }} />
      </Space>
      <Tabs activeKey={tab} onChange={setTab} items={LERP_TABS.map((t) => ({ key: t.key, label: t.label }))} />
      <Table<LerpVoucherOut> rowKey="id" columns={columns} dataSource={items} loading={isFetching} pagination={false} size="small" />
    </div>
  )
}
