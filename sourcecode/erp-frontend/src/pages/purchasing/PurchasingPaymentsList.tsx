import { useState } from 'react'
import { App as AntApp, Button, Popconfirm, Select, Space, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { apiClient } from '../../api/client'
import DataTable from '../../components/DataTable'
import DocNoLabel from '../../components/DocNoLabel'
import type { ApiErrorBody, PoPaymentRequestOut } from '../../api/types'
import { PO_PAYMENT_STATUS_LABELS, statusColor } from '../../api/workflow'
import { formatDateVN, formatNumberVN } from '../../utils/format'

const QUERY_KEY = 'purchasing-payments'

export default function PurchasingPaymentsListPage() {
  const { message } = AntApp.useApp()
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<string | undefined>()

  const showError = (err: unknown, fallback: string) => {
    const body = axios.isAxiosError<ApiErrorBody>(err) ? err.response?.data : undefined
    message.error(body?.message ?? fallback)
  }

  const approveMutation = useMutation({
    mutationFn: (id: number) => apiClient.post(`/purchasing/payments/${id}/actions/approve`),
    onSuccess: () => {
      message.success('Đã duyệt thanh toán')
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
    },
    onError: (err) => showError(err, 'Không thể duyệt thanh toán'),
  })

  const columns: ColumnsType<PoPaymentRequestOut> = [
    {
      title: 'Đơn mua',
      dataIndex: 'orderId',
      key: 'orderId',
      width: 140,
      render: (v: number) => <DocNoLabel endpoint="/purchasing/orders" id={v} />,
    },
    { title: 'Hạn thanh toán', dataIndex: 'dueDate', key: 'dueDate', width: 130, render: formatDateVN },
    { title: 'Số tiền', dataIndex: 'amount', key: 'amount', align: 'right', width: 140, render: formatNumberVN },
    { title: 'Ghi chú', dataIndex: 'note', key: 'note' },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 150,
      render: (v: string) => <Tag color={statusColor(v)}>{PO_PAYMENT_STATUS_LABELS[v] ?? v}</Tag>,
    },
    {
      title: '',
      key: '__actions',
      width: 100,
      render: (_, record) =>
        record.status === 'DRAFT' && (
          <Popconfirm title="Duyệt thanh toán này?" okText="Duyệt" cancelText="Hủy" onConfirm={() => approveMutation.mutate(record.id)}>
            <Button size="small" type="primary" loading={approveMutation.isPending}>
              Duyệt
            </Button>
          </Popconfirm>
        ),
    },
  ]

  return (
    <div>
      <Typography.Title level={3}>Thanh toán mua hàng</Typography.Title>
      <DataTable<PoPaymentRequestOut>
        queryKey={QUERY_KEY}
        endpoint="/purchasing/payments"
        columns={columns}
        hideSearch
        extraParams={{ status }}
        toolbarExtra={
          <Space>
            <Select
              placeholder="Trạng thái"
              allowClear
              style={{ width: 200 }}
              value={status}
              onChange={setStatus}
              options={Object.entries(PO_PAYMENT_STATUS_LABELS).map(([value, label]) => ({ value, label }))}
            />
          </Space>
        }
      />
    </div>
  )
}
