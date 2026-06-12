import { App as AntApp, Button, InputNumber, Popconfirm, Table } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { DeleteOutlined } from '@ant-design/icons'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../../api/client'
import type { StockDocLineOut } from '../../api/types'
import LookupLabel from '../../components/LookupLabel'
import { formatNumberVN } from '../../utils/format'

interface StockDocLinesTabProps {
  docId: number
  lines: StockDocLineOut[]
  docType: string
  status: string
  hasRefDoc: boolean
}

const EDITABLE_STATUSES = ['DRAFT', 'REQUESTED', 'CONFIRMED']

export default function StockDocLinesTab({
  docId,
  lines,
  docType,
  status,
  hasRefDoc,
}: StockDocLinesTabProps) {
  const { message } = AntApp.useApp()
  const queryClient = useQueryClient()
  const queryKey = ['stock-doc', docId]
  const editable = EDITABLE_STATUSES.includes(status)
  const isReceipt = docType === 'RECEIPT'

  const updateLineMutation = useMutation({
    mutationFn: ({ lineId, data }: { lineId: number; data: Partial<StockDocLineOut> }) =>
      apiClient.patch(`/inventory/docs/${docId}/lines/${lineId}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
    onError: () => message.error('Không thể cập nhật dòng'),
  })

  const deleteLineMutation = useMutation({
    mutationFn: (lineId: number) => apiClient.delete(`/inventory/docs/${docId}/lines/${lineId}`),
    onSuccess: () => {
      message.success('Đã xóa dòng')
      queryClient.invalidateQueries({ queryKey })
    },
    onError: () => message.error('Không thể xóa dòng'),
  })

  // Fill from order
  const fillMutation = useMutation({
    mutationFn: () => apiClient.post(`/inventory/docs/${docId}/actions/fill-from-order`),
    onSuccess: () => {
      message.success('Đã lấy hàng từ đơn')
      queryClient.invalidateQueries({ queryKey })
    },
    onError: () => message.error('Không thể lấy hàng từ đơn'),
  })

  // Set actual = requested
  const setActualMutation = useMutation({
    mutationFn: () => apiClient.post(`/inventory/docs/${docId}/actions/set-actual-as-requested`),
    onSuccess: () => {
      message.success('Đã cập nhật SL thực tế = SL yêu cầu')
      queryClient.invalidateQueries({ queryKey })
    },
    onError: () => message.error('Không thể cập nhật'),
  })

  const columns: ColumnsType<StockDocLineOut> = [
    {
      title: 'Sản phẩm',
      dataIndex: 'productId',
      key: 'productId',
      width: 200,
      render: (v: number) => <LookupLabel resource="products" id={v} />,
    },
    {
      title: 'SL yêu cầu',
      dataIndex: 'requestedQty',
      key: 'requestedQty',
      width: 120,
      align: 'right',
      render: (v: number) => formatNumberVN(v),
    },
    {
      title: 'SL thực tế',
      dataIndex: 'actualQty',
      key: 'actualQty',
      width: 130,
      align: 'right',
      render: (v: number | null, record) => {
        if (!editable) return formatNumberVN(v ?? 0)
        return (
          <InputNumber
            min={0}
            value={v ?? 0}
            size="small"
            style={{ width: '100%' }}
            onChange={(val) => {
              if (val !== null && val !== undefined) {
                updateLineMutation.mutate({ lineId: record.id, data: { actualQty: val } })
              }
            }}
            formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
            parser={(v) => Number((v ?? '').replace(/\./g, '')) as 0}
          />
        )
      },
    },
    ...(isReceipt
      ? [
          {
            title: 'Mã lô',
            dataIndex: 'lotCode',
            key: 'lotCode',
            width: 120,
            render: (v: string | null, record: StockDocLineOut) => {
              if (!editable) return v ?? '—'
              return (
                <input
                  className="ant-input ant-input-sm"
                  style={{ width: '100%' }}
                  defaultValue={v ?? ''}
                  onBlur={(e) => {
                    const newVal = e.target.value || null
                    if (newVal !== record.lotCode) {
                      updateLineMutation.mutate({ lineId: record.id, data: { lotCode: newVal } as never })
                    }
                  }}
                />
              )
            },
          },
          {
            title: 'HSD',
            dataIndex: 'lotExpiryDate',
            key: 'lotExpiryDate',
            width: 110,
            render: (v: string | null) => v ? v.slice(0, 10).split('-').reverse().join('/') : '—',
          },
        ]
      : []),
    {
      title: 'SL bộ',
      dataIndex: 'kitQty',
      key: 'kitQty',
      width: 90,
      align: 'right',
      render: (v: number | null) => (v ? formatNumberVN(v) : '—'),
    },
    {
      title: 'Ghi chú',
      dataIndex: 'note',
      key: 'note',
      ellipsis: true,
    },
    ...(editable
      ? [
          {
            title: '',
            key: 'actions',
            width: 40,
            render: (_: unknown, record: StockDocLineOut) => (
              <Popconfirm title="Xóa dòng này?" onConfirm={() => deleteLineMutation.mutate(record.id)}>
                <Button size="small" type="text" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            ),
          },
        ]
      : []),
  ]

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {editable && hasRefDoc && (
          <Button size="small" onClick={() => fillMutation.mutate()} loading={fillMutation.isPending}>
            Lấy hàng từ đơn
          </Button>
        )}
        {editable && (
          <Button size="small" onClick={() => setActualMutation.mutate()} loading={setActualMutation.isPending}>
            Cập nhật thực tế = yêu cầu
          </Button>
        )}
      </div>
      <Table<StockDocLineOut>
        rowKey="id"
        columns={columns}
        dataSource={lines}
        pagination={false}
        size="small"
        scroll={{ x: 800 }}
      />
    </div>
  )
}