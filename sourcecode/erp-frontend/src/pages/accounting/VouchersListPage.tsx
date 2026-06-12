import { useState } from 'react'
import { Button, Select, Space, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { PlusOutlined } from '@ant-design/icons'
import { Link, useNavigate } from 'react-router-dom'
import type { VoucherOut } from '../../api/types'
import { VOUCHER_STATUS_LABELS, VOUCHER_TYPE_LABELS } from '../../api/finance'
import { statusColor } from '../../api/workflow'
import DataTable from '../../components/DataTable'
import LookupLabel from '../../components/LookupLabel'
import { formatDateVN, formatNumberVN } from '../../utils/format'
import { useFiscalPeriods } from './common'

const VOUCHER_TYPE_OPTIONS = [
  { value: '', label: 'Tất cả loại' },
  ...Object.entries(VOUCHER_TYPE_LABELS).map(([value, label]) => ({ value, label })),
]

const STATUS_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái' },
  ...Object.entries(VOUCHER_STATUS_LABELS).map(([value, label]) => ({ value, label })),
]

/** Danh sách chứng từ kế toán — lọc theo loại / kỳ / trạng thái. */
export default function VouchersListPage() {
  const navigate = useNavigate()
  const [voucherType, setVoucherType] = useState('')
  const [periodId, setPeriodId] = useState<number | ''>('')
  const [status, setStatus] = useState('')

  const { data: periods } = useFiscalPeriods()
  const periodOptions = [
    { value: '', label: 'Tất cả kỳ' },
    ...[...(periods ?? [])]
      .sort((a, b) => a.fiscalYear - b.fiscalYear || a.periodNo - b.periodNo)
      .map((p) => ({ value: p.id, label: `Năm ${p.fiscalYear} — Kỳ ${p.periodNo}` })),
  ]

  const columns: ColumnsType<VoucherOut> = [
    { title: 'Loại chứng từ', dataIndex: 'voucherType', key: 'voucherType', width: 160, render: (v: string) => VOUCHER_TYPE_LABELS[v] ?? v },
    {
      title: 'Số chứng từ',
      dataIndex: 'docNo',
      key: 'docNo',
      width: 160,
      render: (v: string, r) => <Link to={`/accounting/vouchers/${r.id}`}>{v}</Link>,
    },
    { title: 'Ngày', dataIndex: 'docDate', key: 'docDate', width: 110, render: formatDateVN },
    {
      title: 'Đối tượng',
      dataIndex: 'partnerId',
      key: 'partnerId',
      render: (v: number | null) => <LookupLabel resource="partners" id={v} labelField="shortName" />,
    },
    { title: 'Tổng tiền', dataIndex: 'totalAmount', key: 'totalAmount', align: 'right', width: 130, render: formatNumberVN },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (v: string) => <Tag color={statusColor(v)}>{VOUCHER_STATUS_LABELS[v] ?? v}</Tag>,
    },
  ]

  return (
    <div>
      <Typography.Title level={3}>Chứng từ kế toán</Typography.Title>
      <DataTable<VoucherOut>
        queryKey="finance-vouchers"
        endpoint="/finance/vouchers"
        columns={columns}
        hideSearch
        extraParams={{
          voucherType: voucherType || undefined,
          periodId: periodId || undefined,
          status: status || undefined,
        }}
        toolbarExtra={
          <Space>
            <Select value={voucherType} onChange={setVoucherType} options={VOUCHER_TYPE_OPTIONS} style={{ width: 200 }} />
            <Select value={periodId} onChange={setPeriodId} options={periodOptions} style={{ width: 160 }} />
            <Select value={status} onChange={setStatus} options={STATUS_OPTIONS} style={{ width: 160 }} />
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('new')}>
              Tạo mới
            </Button>
          </Space>
        }
      />
    </div>
  )
}
