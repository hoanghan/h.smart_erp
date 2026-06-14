import { useState } from 'react'
import { Button, Select, Space, Tag, Typography } from 'antd'
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

  const columns = [
    {
      field: 'voucherType', headerText: 'Loại chứng từ', width: 160,
      template: (r: VoucherOut) => VOUCHER_TYPE_LABELS[r.voucherType] ?? r.voucherType,
    },
    {
      field: 'docNo', headerText: 'Số chứng từ', width: 160,
      template: (r: VoucherOut) => <Link to={`/accounting/vouchers/${r.id}`}>{r.docNo}</Link>,
    },
    { field: 'docDate', headerText: 'Ngày', width: 110, template: (r: VoucherOut) => formatDateVN(r.docDate) },
    {
      field: 'partnerId', headerText: 'Đối tượng',
      template: (r: VoucherOut) => <LookupLabel resource="partners" id={r.partnerId} labelField="shortName" />,
    },
    {
      field: 'totalAmount', headerText: 'Tổng tiền', width: 130, textAlign: 'Right',
      template: (r: VoucherOut) => formatNumberVN(r.totalAmount),
    },
    {
      field: 'status', headerText: 'Trạng thái', width: 130,
      template: (r: VoucherOut) => <Tag color={statusColor(r.status)}>{VOUCHER_STATUS_LABELS[r.status] ?? r.status}</Tag>,
    },
  ]

  return (
    <div>
      <Typography.Title level={3}>Chứng từ kế toán</Typography.Title>
      <DataTable<VoucherOut>
        queryKey="finance-vouchers"
        endpoint="/finance/vouchers"
        columns={columns}
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
