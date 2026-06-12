import { Table, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { VoucherLineOut } from '../../api/types'
import LookupLabel from '../../components/LookupLabel'
import { formatNumberVN } from '../../utils/format'
import { AccountLabel } from './common'

/** Bảng dòng chứng từ (chỉ xem — backend chưa hỗ trợ sửa dòng chứng từ đã tạo). */
export default function VoucherLinesTable({ lines }: { lines: VoucherLineOut[] }) {
  const totalAmount = lines.reduce((s, l) => s + l.amount, 0)
  const totalVat = lines.reduce((s, l) => s + (l.vatAmount ?? 0), 0)

  const columns: ColumnsType<VoucherLineOut> = [
    { title: 'Diễn giải', dataIndex: 'description', key: 'description' },
    {
      title: 'Sản phẩm',
      dataIndex: 'productId',
      key: 'productId',
      render: (v: number | null) => <LookupLabel resource="products" id={v} />,
    },
    { title: 'SL', dataIndex: 'quantity', key: 'quantity', align: 'right', width: 90, render: formatNumberVN },
    { title: 'Đơn giá', dataIndex: 'unitPrice', key: 'unitPrice', align: 'right', width: 120, render: formatNumberVN },
    { title: 'Thành tiền', dataIndex: 'amount', key: 'amount', align: 'right', width: 130, render: formatNumberVN },
    { title: 'VAT %', dataIndex: 'vatPct', key: 'vatPct', align: 'right', width: 80, render: formatNumberVN },
    { title: 'Tiền VAT', dataIndex: 'vatAmount', key: 'vatAmount', align: 'right', width: 110, render: formatNumberVN },
    {
      title: 'TK Nợ',
      dataIndex: 'drAccountId',
      key: 'drAccountId',
      width: 160,
      render: (v: number | null) => <AccountLabel id={v} />,
    },
    {
      title: 'TK Có',
      dataIndex: 'crAccountId',
      key: 'crAccountId',
      width: 160,
      render: (v: number | null) => <AccountLabel id={v} />,
    },
    {
      title: 'Đối tượng Nợ',
      key: 'drObject',
      width: 130,
      render: (_, r) => (r.drObjectId ? `${r.drObjectType ?? ''} #${r.drObjectId}` : ''),
    },
    {
      title: 'Đối tượng Có',
      key: 'crObject',
      width: 130,
      render: (_, r) => (r.crObjectId ? `${r.crObjectType ?? ''} #${r.crObjectId}` : ''),
    },
  ]

  return (
    <div>
      <Table<VoucherLineOut> rowKey="id" columns={columns} dataSource={lines} pagination={false} size="small" scroll={{ x: 'max-content' }} />
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 32, marginTop: 12, paddingRight: 8 }}>
        <Typography.Text>
          Tổng tiền: <strong>{formatNumberVN(totalAmount)}</strong>
        </Typography.Text>
        <Typography.Text>
          Tổng VAT: <strong>{formatNumberVN(totalVat)}</strong>
        </Typography.Text>
      </div>
    </div>
  )
}
