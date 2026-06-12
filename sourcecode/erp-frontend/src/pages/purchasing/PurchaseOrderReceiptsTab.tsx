import { App as AntApp, Button, DatePicker, Form, Input, Table, Tag, Modal } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { PlusOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query'
import axios from 'axios'
import { useState } from 'react'
import { apiClient } from '../../api/client'
import type { ApiErrorBody, PageResult, StockDocOut } from '../../api/types'
import { statusColor } from '../../api/workflow'
import LookupLabel from '../../components/LookupLabel'
import LookupSelect from '../../components/LookupSelect'
import { formatDateVN } from '../../utils/format'

interface PurchaseOrderReceiptsTabProps {
  orderId: number
  status: string
  poQueryKey: QueryKey
}

const STOCK_DOC_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Nháp',
  REQUESTED: 'Đã yêu cầu',
  CONFIRMED: 'Đã xác nhận',
  COMPLETED: 'Hoàn tất',
  CANCELLED: 'Đã hủy',
}

/** Tab "Nhận hàng" của đơn hàng mua: danh sách phiếu nhập kho tham chiếu PO + tạo YC nhập kho mới. */
export default function PurchaseOrderReceiptsTab({ orderId, status, poQueryKey }: PurchaseOrderReceiptsTabProps) {
  const { message } = AntApp.useApp()
  const queryClient = useQueryClient()
  const [form] = Form.useForm()
  const [modalOpen, setModalOpen] = useState(false)

  const queryKey = ['po-receipts', orderId]

  const { data } = useQuery({
    queryKey,
    queryFn: async () =>
      (await apiClient.get<PageResult<StockDocOut>>('/inventory/docs', { params: { docType: 'RECEIPT', purchaseOrderId: orderId } })).data,
  })

  const showError = (err: unknown, fallback: string) => {
    const body = axios.isAxiosError<ApiErrorBody>(err) ? err.response?.data : undefined
    message.error(body?.message ?? fallback)
  }

  const createMutation = useMutation({
    mutationFn: (body: { warehouseId: number; requestDate?: string | null; note?: string | null }) =>
      apiClient.post(`/purchasing/orders/${orderId}/actions/create-receipt-request`, body),
    onSuccess: (res) => {
      message.success(`Đã tạo phiếu nhập kho ${(res.data as StockDocOut).docNo}`)
      setModalOpen(false)
      form.resetFields()
      queryClient.invalidateQueries({ queryKey })
      queryClient.invalidateQueries({ queryKey: poQueryKey })
    },
    onError: (err) => showError(err, 'Không thể tạo phiếu nhập kho'),
  })

  const handleCreate = async () => {
    const values = await form.validateFields()
    createMutation.mutate({
      warehouseId: values.warehouseId,
      requestDate: values.requestDate ? values.requestDate.format('YYYY-MM-DD') : null,
      note: values.note,
    })
  }

  const canCreateReceipt = ['APPROVED', 'NOT_RECEIVED'].includes(status)

  const columns: ColumnsType<StockDocOut> = [
    { title: 'Số phiếu', dataIndex: 'docNo', key: 'docNo', width: 160 },
    { title: 'Loại', dataIndex: 'subType', key: 'subType', width: 120 },
    { title: 'Ngày yêu cầu', dataIndex: 'requestDate', key: 'requestDate', width: 120, render: formatDateVN },
    { title: 'Ngày thực tế', dataIndex: 'actualDate', key: 'actualDate', width: 120, render: (v: string | null) => (v ? formatDateVN(v) : '—') },
    {
      title: 'Kho nhận',
      dataIndex: 'toWarehouseId',
      key: 'toWarehouseId',
      render: (v: number | null) => <LookupLabel resource="warehouses" id={v} />,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (v: string) => <Tag color={statusColor(v)}>{STOCK_DOC_STATUS_LABELS[v] ?? v}</Tag>,
    },
  ]

  return (
    <div>
      <Table<StockDocOut> rowKey="id" columns={columns} dataSource={data?.items ?? []} pagination={false} size="small" />
      {canCreateReceipt && (
        <Button type="dashed" icon={<PlusOutlined />} style={{ marginTop: 16 }} onClick={() => setModalOpen(true)}>
          Thêm phiếu nhập kho
        </Button>
      )}

      <Modal
        title="Tạo yêu cầu nhập kho"
        open={modalOpen}
        onOk={handleCreate}
        onCancel={() => setModalOpen(false)}
        confirmLoading={createMutation.isPending}
        okText="Tạo"
        cancelText="Đóng"
        forceRender
      >
        <Form form={form} layout="vertical">
          <Form.Item label="Kho nhận" name="warehouseId" rules={[{ required: true, message: 'Vui lòng chọn kho nhận' }]}>
            <LookupSelect resource="warehouses" placeholder="Chọn kho nhận" />
          </Form.Item>
          <Form.Item label="Ngày yêu cầu" name="requestDate">
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item label="Ghi chú" name="note">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
