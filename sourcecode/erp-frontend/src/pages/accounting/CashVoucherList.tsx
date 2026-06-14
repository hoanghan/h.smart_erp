import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { App as AntApp, Button, DatePicker, Input, InputNumber, Modal, Select, Space, Table, Tag, Typography } from 'antd'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { apiClient } from '../../api/client'
import type { ApiErrorBody, BusinessOperationOut, VoucherOut } from '../../api/types'
import { VOUCHER_STATUS_LABELS, VOUCHER_TYPE_LABELS } from '../../api/finance'
import { statusColor } from '../../api/workflow'
import LookupSelect from '../../components/LookupSelect'
import LookupLabel from '../../components/LookupLabel'
import { formatDateVN, formatNumberVN } from '../../utils/format'
import { useBusinessOperations, useCashFunds } from './common'
import axios from 'axios'

interface CashVoucherListProps {
  /** 'PHIEU_THU' hoặc 'PHIEU_CHI' */
  voucherType: string
  title: string
}

export default function CashVoucherList({ voucherType, title }: CashVoucherListProps) {
  const navigate = useNavigate()
  const { message } = AntApp.useApp()
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedOpId, setSelectedOpId] = useState<number | null>(null)
  const [amount, setAmount] = useState<number>(0)
  const [partnerId, setPartnerId] = useState<number | null>(null)
  const [fundId, setFundId] = useState<number | null>(null)
  const [description, setDescription] = useState('')
  const [docDate, setDocDate] = useState<dayjs.Dayjs>(dayjs())
  const [page, setPage] = useState(1)

  const { data: operations } = useBusinessOperations()
  const { data: funds } = useCashFunds()

  const filteredOps = (operations ?? []).filter((o) => o.voucherType === voucherType)

  const queryKey = ['finance-vouchers', voucherType, page]
  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const res = await apiClient.get<{ items: VoucherOut[]; total: number }>('/finance/vouchers', {
        params: { voucherType, page, size: 20 },
      })
      return res.data
    },
  })

  const showError = (err: unknown, fallback: string) => {
    const body = axios.isAxiosError<ApiErrorBody>(err) ? err.response?.data : undefined
    message.error(body?.message ?? fallback)
  }

  const fromOpMutation = useMutation({
    mutationFn: () =>
      apiClient.post<VoucherOut>('/finance/vouchers/from-operation', {
        operationId: selectedOpId,
        partnerId,
        fundId,
        amount,
        description: description || undefined,
        docDate: docDate.format('YYYY-MM-DD'),
      }),
    onSuccess: (res) => {
      message.success('Đã tạo phiếu từ nghiệp vụ')
      queryClient.invalidateQueries({ queryKey: ['finance-vouchers'] })
      setModalOpen(false)
      setSelectedOpId(null)
      setAmount(0)
      setPartnerId(null)
      setFundId(null)
      setDescription('')
      navigate(`/accounting/vouchers/${res.data.id}`)
    },
    onError: (err) => showError(err, 'Không thể tạo phiếu'),
  })

  const handleCreate = () => {
    if (!selectedOpId) {
      message.warning('Vui lòng chọn nghiệp vụ')
      return
    }
    if (amount <= 0) {
      message.warning('Số tiền phải lớn hơn 0')
      return
    }
    fromOpMutation.mutate()
  }

  const columns = [
    {
      title: 'Số CT',
      dataIndex: 'docNo',
      key: 'docNo',
      width: 140,
      render: (v: string, r: VoucherOut) => (
        <a onClick={() => navigate(`/accounting/vouchers/${r.id}`)}>{v}</a>
      ),
    },
    { title: 'Ngày', dataIndex: 'docDate', key: 'docDate', width: 110, render: formatDateVN },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (s: string) => <Tag color={statusColor(s)}>{VOUCHER_STATUS_LABELS[s] ?? s}</Tag>,
    },
    {
      title: 'Đối tượng',
      dataIndex: 'partnerId',
      key: 'partnerId',
      render: (id: number | null) => (id ? <LookupLabel resource="partners" id={id} labelField="shortName" /> : '—'),
    },
    {
      title: 'Quỹ',
      dataIndex: 'fundId',
      key: 'fundId',
      render: (id: number | null) => {
        const f = funds?.find((x) => x.id === id)
        return f ? `${f.code} — ${f.name}` : '—'
      },
    },
    {
      title: 'Số tiền',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      align: 'right' as const,
      render: (v: number | null) => formatNumberVN(v),
    },
    { title: 'Diễn giải', dataIndex: 'description', key: 'description', ellipsis: true },
  ]

  return (
    <div>
      <Typography.Title level={3}>{title}</Typography.Title>

      <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
        <Typography.Text type="secondary">
          Loại phiếu: {VOUCHER_TYPE_LABELS[voucherType]}
        </Typography.Text>
        <Button type="primary" onClick={() => setModalOpen(true)}>
          + Tạo phiếu
        </Button>
      </Space>

      <Table
        rowKey="id"
        loading={isLoading}
        dataSource={data?.items ?? []}
        columns={columns}
        size="small"
        pagination={{
          current: page,
          total: data?.total ?? 0,
          pageSize: 20,
          onChange: setPage,
          showTotal: (t) => `Tổng: ${t}`,
        }}
      />

      <Modal
        title={`Tạo ${title}`}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleCreate}
        okText="Tạo phiếu"
        cancelText="Đóng"
        confirmLoading={fromOpMutation.isPending}
        width={600}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <div>
            <label style={{ display: 'block', marginBottom: 4 }}>Bước 1: Chọn nghiệp vụ</label>
            <Select
              placeholder="Chọn nghiệp vụ định khoản..."
              style={{ width: '100%' }}
              value={selectedOpId ?? undefined}
              onChange={(v) => setSelectedOpId(v)}
              options={filteredOps.map((o: BusinessOperationOut) => ({
                value: o.id,
                label: `${o.code} — ${o.name}`,
              }))}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 4 }}>Ngày chứng từ</label>
            <DatePicker
              style={{ width: '100%' }}
              value={docDate}
              onChange={(d) => d && setDocDate(d)}
              format="DD/MM/YYYY"
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 4 }}>Đối tượng</label>
            <LookupSelect
              resource="partners"
              value={partnerId}
              onChange={setPartnerId}
              placeholder="Chọn khách hàng / NCC..."
              labelField="shortName"
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 4 }}>Quỹ tiền</label>
            <Select
              placeholder="Chọn quỹ..."
              style={{ width: '100%' }}
              value={fundId ?? undefined}
              onChange={(v) => setFundId(v ?? null)}
              allowClear
              options={(funds ?? []).map((f) => ({ value: f.id, label: `${f.code} — ${f.name}` }))}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 4 }}>Số tiền</label>
            <InputNumber
              style={{ width: '100%' }}
              value={amount}
              onChange={(v) => setAmount(v ?? 0)}
              formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
              parser={(v) => Number(v!.replace(/\./g, '')) as unknown as number}
              min={0}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 4 }}>Diễn giải (tùy chọn)</label>
            <Input.TextArea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </Space>
      </Modal>
    </div>
  )
}