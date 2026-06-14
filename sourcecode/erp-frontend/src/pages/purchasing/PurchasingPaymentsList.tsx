import { useState } from 'react'
import { App as AntApp, Button, Popconfirm, Select, Space, Tag, Typography } from 'antd'
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

  const columns = [
    {
      field: 'orderId', headerText: 'Đơn mua', width: 140,
      template: (r: PoPaymentRequestOut) => <DocNoLabel endpoint="/purchasing/orders" id={r.orderId} />,
    },
    {
      field: 'dueDate', headerText: 'Hạn thanh toán', width: 130,
      template: (r: PoPaymentRequestOut) => formatDateVN(r.dueDate),
    },
    {
      field: 'amount', headerText: 'Số tiền', width: 140, textAlign: 'Right',
      template: (r: PoPaymentRequestOut) => formatNumberVN(r.amount),
    },
    { field: 'note', headerText: 'Ghi chú' },
    {
      field: 'status', headerText: 'Trạng thái', width: 150,
      template: (r: PoPaymentRequestOut) => <Tag color={statusColor(r.status)}>{PO_PAYMENT_STATUS_LABELS[r.status] ?? r.status}</Tag>,
    },
    {
      field: '__actions', headerText: '', width: 100,
      template: (r: PoPaymentRequestOut) =>
        r.status === 'DRAFT' && (
          <Popconfirm title="Duyệt thanh toán này?" okText="Duyệt" cancelText="Hủy" onConfirm={() => approveMutation.mutate(r.id)}>
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
