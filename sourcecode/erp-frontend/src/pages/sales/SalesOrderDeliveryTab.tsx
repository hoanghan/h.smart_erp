import { App as AntApp, Button, DatePicker, Form, Input, Modal, Table, Tag } from 'antd'
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

interface SalesOrderDeliveryTabProps {
  orderId: number
  status: string
  defaultWarehouseId: number | null
  soQueryKey: QueryKey
}

const STOCK_DOC_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Nháp',
  REQUESTED: 'Đã yêu cầu',
  CONFIRMED: 'Đã xác nhận',
  COMPLETED: 'Hoàn tất',
  CANCELLED: 'Đã hủy',
}

/** Tab "Giao hàng" của đơn hàng bán: danh sách phiếu xuất kho tham chiếu SO + tạo YC xuất kho mới. */
export default function SalesOrderDeliveryTab({ orderId, status, defaultWarehouseId, soQueryKey }: SalesOrderDeliveryTabProps) {
  const { message } = AntApp.useApp()
  const queryClient = useQueryClient()
  const [form] = Form.useForm()
  const [modalOpen, setModalOpen] = useState(false)

  const queryKey = ['so-deliveries', orderId]

  const { data } = useQuery({
    queryKey,
    queryFn: async () =>
      (await apiClient.get<PageResult<StockDocOut>>('/inventory/docs', { params: { docType: 'ISSUE', salesOrderId: orderId } })).data,
  })

  const showError = (err: unknown, fallback: string) => {
    const body = axios.isAxiosError<ApiErrorBody>(err) ? err.response?.data : undefined
    message.error(body?.message ?? fallback)
  }

  const createMutation = useMutation({
    mutationFn: (body: { warehouseId?: number | null; requestDate?: string | null; note?: string | null }) =>
      apiClient.post(`/sales/orders/${orderId}/actions/create-delivery-request`, body),
    onSuccess: (res) => {
      message.success(`Đã tạo phiếu xuất kho ${(res.data as StockDocOut).docNo}`)
      setModalOpen(false)
      form.resetFields()
      queryClient.invalidateQueries({ queryKey })
      queryClient.invalidateQueries({ queryKey: soQueryKey })
    },
    onError: (err) => showError(err, 'Không thể tạo phiếu xuất kho'),
  })

  const handleCreate = async () => {
    const values = await form.validateFields()
    createMutation.mutate({
      warehouseId: values.warehouseId ?? defaultWarehouseId,
      requestDate: values.requestDate ? values.requestDate.format('YYYY-MM-DD') : null,
      note: values.note,
    })
  }

  const canCreateDelivery = ['TO_DELIVER_AND_BILL', 'TO_DELIVER'].includes(status)

  const columns: ColumnsType<StockDocOut> = [
    { title: 'Số phiếu', dataIndex: 'docNo', key: 'docNo', width: 160 },
    { title: 'Loại', dataIndex: 'subType', key: 'subType', width: 120 },
    { title: 'Ngày yêu cầu', dataIndex: 'requestDate', key: 'requestDate', width: 120, render: formatDateVN },
    { title: 'Ngày thực tế', dataIndex: 'actualDate', key: 'actualDate', width: 120, render: (v: string | null) => (v ? formatDateVN(v) : '—') },
    {
      title: 'Kho xuất',
      dataIndex: 'fromWarehouseId',
      key: 'fromWarehouseId',
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
      {canCreateDelivery && (
        <Button type="dashed" icon={<PlusOutlined />} style={{ marginTop: 16 }} onClick={() => setModalOpen(true)}>
          Thêm phiếu xuất kho
        </Button>
      )}

      <Modal
        title="Tạo yêu cầu xuất kho"
        open={modalOpen}
        onOk={handleCreate}
        onCancel={() => setModalOpen(false)}
        confirmLoading={createMutation.isPending}
        okText="Tạo"
        cancelText="Đóng"
        forceRender
      >
        <Form form={form} layout="vertical" initialValues={{ warehouseId: defaultWarehouseId }}>
          <Form.Item label="Kho xuất" name="warehouseId" rules={[{ required: true, message: 'Vui lòng chọn kho xuất' }]}>
            <LookupSelect resource="warehouses" placeholder="Chọn kho xuất" />
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
