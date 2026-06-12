import { Alert, Drawer, Table } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../../api/client'
import type { GlEntryOut, PageResult } from '../../api/types'
import { isDebitSide } from '../../api/finance'
import { formatNumberVN } from '../../utils/format'
import { AccountLabel } from './common'

interface GlEntriesDrawerProps {
  voucherId: number
  open: boolean
  onClose: () => void
}

/** Drawer "C/từ": bảng bút toán sổ cái 2 cột Nợ/Có của một chứng từ + kiểm tra cân đối. */
export default function GlEntriesDrawer({ voucherId, open, onClose }: GlEntriesDrawerProps) {
  const { data, isFetching } = useQuery({
    queryKey: ['finance-gl-entries', voucherId],
    queryFn: async () => (await apiClient.get<PageResult<GlEntryOut>>('/finance/gl-entries', { params: { voucherId, size: 200 } })).data,
    enabled: open,
  })

  const items = data?.items ?? []
  const totalDebit = items.filter((e) => isDebitSide(e.side)).reduce((s, e) => s + e.amount, 0)
  const totalCredit = items.filter((e) => !isDebitSide(e.side)).reduce((s, e) => s + e.amount, 0)
  const balanced = Math.abs(totalDebit - totalCredit) < 0.005

  const columns: ColumnsType<GlEntryOut> = [
    { title: 'Tài khoản', key: 'accountId', render: (_, r) => <AccountLabel id={r.accountId} /> },
    {
      title: 'Đối tượng',
      key: 'object',
      width: 140,
      render: (_, r) => (r.objectId ? `${r.objectType ?? ''} #${r.objectId}` : ''),
    },
    {
      title: 'Nợ',
      key: 'debit',
      align: 'right',
      width: 140,
      render: (_, r) => (isDebitSide(r.side) ? formatNumberVN(r.amount) : ''),
    },
    {
      title: 'Có',
      key: 'credit',
      align: 'right',
      width: 140,
      render: (_, r) => (!isDebitSide(r.side) ? formatNumberVN(r.amount) : ''),
    },
    { title: 'Diễn giải', dataIndex: 'description', key: 'description' },
  ]

  return (
    <Drawer title="Bút toán sổ cái (C/từ)" open={open} onClose={onClose} width={760}>
      <Table<GlEntryOut>
        rowKey="id"
        columns={columns}
        dataSource={items}
        loading={isFetching}
        pagination={false}
        size="small"
        summary={() => (
          <Table.Summary fixed>
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={2}>
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
      <Alert
        style={{ marginTop: 16 }}
        type={balanced ? 'success' : 'error'}
        message={balanced ? 'Cân đối: Tổng Nợ = Tổng Có' : `Lệch: Tổng Nợ (${formatNumberVN(totalDebit)}) ≠ Tổng Có (${formatNumberVN(totalCredit)})`}
        showIcon
      />
    </Drawer>
  )
}
