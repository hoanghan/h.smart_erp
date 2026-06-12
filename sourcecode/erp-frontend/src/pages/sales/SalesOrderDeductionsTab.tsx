import { useMemo, useState } from 'react'
import { App as AntApp, Button, Table, Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query'
import axios from 'axios'
import { apiClient } from '../../api/client'
import type { ApiErrorBody, ApplyPromotionsRequest, PageResult, PromotionOut } from '../../api/types'
import { formatDateVN, formatNumberVN } from '../../utils/format'

interface SalesOrderDeductionsTabProps {
  orderId: number
  locked: boolean
  soQueryKey: QueryKey
}

/** Tab "Khấu trừ" của đơn hàng bán — chọn áp dụng chương trình khuyến mại/chiết khấu (CTKM). */
export default function SalesOrderDeductionsTab({ orderId, locked, soQueryKey }: SalesOrderDeductionsTabProps) {
  const { message } = AntApp.useApp()
  const queryClient = useQueryClient()
  const [selected, setSelected] = useState<number[]>([])

  const appliedQueryKey = ['so-promotions', orderId]
  const { data: applied = [] } = useQuery({
    queryKey: appliedQueryKey,
    queryFn: async () => (await apiClient.get<PromotionOut[]>(`/sales/orders/${orderId}/promotions`)).data,
  })

  const { data: available } = useQuery({
    queryKey: ['promotions'],
    queryFn: async () => (await apiClient.get<PageResult<PromotionOut>>('/sales/promotions', { params: { size: 200 } })).data,
  })

  const showError = (err: unknown, fallback: string) => {
    const body = axios.isAxiosError<ApiErrorBody>(err) ? err.response?.data : undefined
    message.error(body?.message ?? fallback)
  }

  const applyMutation = useMutation({
    mutationFn: (body: ApplyPromotionsRequest) => apiClient.put(`/sales/orders/${orderId}/promotions`, body),
    onSuccess: () => {
      message.success('Đã áp dụng CTKM/chiết khấu')
      setSelected([])
      queryClient.invalidateQueries({ queryKey: appliedQueryKey })
      queryClient.invalidateQueries({ queryKey: soQueryKey })
    },
    onError: (err) => showError(err, 'Không thể áp dụng CTKM/chiết khấu'),
  })

  const appliedIds = useMemo(() => new Set(applied.map((p) => p.id)), [applied])

  const columns: ColumnsType<PromotionOut> = [
    { title: 'Mã CTKM', dataIndex: 'code', key: 'code', width: 120 },
    { title: 'Tên chương trình', dataIndex: 'name', key: 'name', width: 220 },
    { title: 'Nhóm', dataIndex: 'groupName', key: 'groupName', width: 120, render: (v: string | null) => v ?? '' },
    {
      title: 'Hiệu lực', key: 'period', width: 180,
      render: (_, r) => `${formatDateVN(r.dateFrom)} - ${r.dateTo ? formatDateVN(r.dateTo) : '∞'}`,
    },
    { title: 'Đơn vị hỗ trợ', dataIndex: 'sponsor', key: 'sponsor', width: 140, render: (v: string | null) => v ?? '' },
    { title: '% Chiết khấu', dataIndex: 'discountPct', key: 'discountPct', align: 'right', width: 100, render: (v: number | null) => (v != null ? formatNumberVN(v) : '') },
    {
      title: 'Hàng tặng', dataIndex: 'hasGift', key: 'hasGift', align: 'center', width: 90,
      render: (v: boolean) => (v ? <Tag color="gold">Có</Tag> : null),
    },
    { title: 'Ghi chú', dataIndex: 'note', key: 'note', render: (v: string | null) => v ?? '' },
    {
      title: 'Trạng thái', key: 'applied', width: 110, align: 'center',
      render: (_, r) => (appliedIds.has(r.id) ? <Tag color="green">Đã áp dụng</Tag> : <Tag>Chưa áp dụng</Tag>),
    },
  ]

  return (
    <div>
      <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Chương trình khuyến mại / chiết khấu</p>
      <Table<PromotionOut>
        rowKey="id"
        columns={columns}
        dataSource={available?.items ?? []}
        pagination={false}
        size="small"
        bordered
        scroll={{ x: 'max-content' }}
        rowSelection={locked ? undefined : {
          selectedRowKeys: [...appliedIds, ...selected],
          getCheckboxProps: (record) => ({ disabled: appliedIds.has(record.id) }),
          onChange: (keys) => setSelected(keys.map(Number).filter((id) => !appliedIds.has(id))),
        }}
      />
      {!locked && (
        <Button
          type="primary"
          style={{ marginTop: 8 }}
          disabled={selected.length === 0}
          loading={applyMutation.isPending}
          onClick={() => applyMutation.mutate({ promotionIds: selected })}
        >
          Áp dụng CTKM/chiết khấu đã chọn
        </Button>
      )}
    </div>
  )
}
