import { App as AntApp, Button, Form, Input, InputNumber, Modal, Popconfirm, Table, Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { DeleteOutlined, EditOutlined, CheckOutlined, PlusOutlined } from '@ant-design/icons'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { apiClient } from '../../api/client'
import type { ApiErrorBody, GrCostOut, GrCostIn } from '../../api/types'
import LookupLabel from '../../components/LookupLabel'
import LookupSelect from '../../components/LookupSelect'
import { formatNumberVN } from '../../utils/format'

interface StockDocCostsTabProps {
  docId: number
  status: string
}

export default function StockDocCostsTab({ docId, status }: StockDocCostsTabProps) {
  const { message } = AntApp.useApp()
  const queryClient = useQueryClient()
  const queryKey = ['stock-doc-costs', docId]
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form] = Form.useForm()
  const editable = status !== 'COMPLETED' && status !== 'CANCELLED'

  const { data } = useQuery({
    queryKey,
    queryFn: async () => (await apiClient.get<GrCostOut[]>(`/inventory/docs/${docId}/gr-costs`)).data,
  })

  const costs = data ?? []

  const createMutation = useMutation({
    mutationFn: (body: GrCostIn) => apiClient.post(`/inventory/docs/${docId}/gr-costs`, body),
    onSuccess: () => {
      message.success('Đã thêm chi phí')
      setModalOpen(false)
      form.resetFields()
      queryClient.invalidateQueries({ queryKey })
    },
    onError: (err: unknown) => {
      const body = axios.isAxiosError<ApiErrorBody>(err) ? err.response?.data : undefined
      message.error(body?.message ?? 'Không thể thêm chi phí')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<GrCostIn> }) =>
      apiClient.patch(`/inventory/docs/${docId}/gr-costs/${id}`, data),
    onSuccess: () => {
      message.success('Đã cập nhật chi phí')
      setModalOpen(false)
      setEditingId(null)
      form.resetFields()
      queryClient.invalidateQueries({ queryKey })
    },
    onError: () => message.error('Không thể cập nhật chi phí'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiClient.delete(`/inventory/docs/${docId}/gr-costs/${id}`),
    onSuccess: () => {
      message.success('Đã xóa chi phí')
      queryClient.invalidateQueries({ queryKey })
    },
    onError: () => message.error('Không thể xóa chi phí'),
  })

  const approveMutation = useMutation({
    mutationFn: (id: number) => apiClient.post(`/inventory/docs/${docId}/gr-costs/${id}/actions/approve`),
    onSuccess: () => {
      message.success('Đã duyệt chi phí')
      queryClient.invalidateQueries({ queryKey })
    },
    onError: () => message.error('Không thể duyệt chi phí'),
  })

  const openEdit = (cost: GrCostOut) => {
    setEditingId(cost.id)
    form.setFieldsValue({
      costTypeId: cost.costTypeId,
      serviceSupplierId: cost.serviceSupplierId,
      amount: cost.amount,
      vatPct: cost.vatPct,
      paymentMethodId: cost.paymentMethodId,
      note: cost.note,
    })
    setModalOpen(true)
  }

  const openCreate = () => {
    setEditingId(null)
    form.resetFields()
    setModalOpen(true)
  }

  const handleSubmit = async () => {
    const values = await form.validateFields()
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: values })
    } else {
      createMutation.mutate(values)
    }
  }

  const columns: ColumnsType<GrCostOut> = [
    {
      title: 'Loại chi phí',
      dataIndex: 'costTypeId',
      key: 'costTypeId',
      width: 160,
      render: (v: number) => <LookupLabel resource="cost-types" id={v} />,
    },
    {
      title: 'NCC dịch vụ',
      dataIndex: 'serviceSupplierId',
      key: 'serviceSupplierId',
      width: 160,
      render: (v: number | null) => v ? <LookupLabel resource="partners" id={v} labelField="shortName" /> : '—',
    },
    {
      title: 'Số tiền',
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      align: 'right',
      render: (v: number) => formatNumberVN(v),
    },
    {
      title: 'VAT %',
      dataIndex: 'vatPct',
      key: 'vatPct',
      width: 80,
      align: 'right',
      render: (v: number | null) => (v != null ? `${v}%` : '—'),
    },
    {
      title: 'PT thanh toán',
      dataIndex: 'paymentMethodId',
      key: 'paymentMethodId',
      width: 140,
      render: (v: number | null) => v ? <LookupLabel resource="payment-methods" id={v} /> : '—',
    },
    {
      title: 'Ghi chú',
      dataIndex: 'note',
      key: 'note',
      ellipsis: true,
    },
    {
      title: 'Duyệt',
      dataIndex: 'approved',
      key: 'approved',
      width: 80,
      render: (v: boolean) => v ? <Tag color="green">Đã duyệt</Tag> : <Tag>Chưa</Tag>,
    },
    ...(editable
      ? [
          {
            title: '',
            key: 'actions',
            width: 120,
            render: (_: unknown, record: GrCostOut) => (
              <div style={{ display: 'flex', gap: 4 }}>
                <Button size="small" type="text" icon={<EditOutlined />} onClick={() => openEdit(record)} />
                {!record.approved && (
                  <Button size="small" type="text" icon={<CheckOutlined />} onClick={() => approveMutation.mutate(record.id)} title="Duyệt" />
                )}
                <Popconfirm title="Xóa chi phí này?" onConfirm={() => deleteMutation.mutate(record.id)}>
                  <Button size="small" type="text" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              </div>
            ),
          },
        ]
      : []),
  ]

  return (
    <div>
      {editable && (
        <Button type="dashed" icon={<PlusOutlined />} style={{ marginBottom: 12 }} onClick={openCreate}>
          Thêm chi phí
        </Button>
      )}
      <Table<GrCostOut>
        rowKey="id"
        columns={columns}
        dataSource={costs}
        pagination={false}
        size="small"
      />
      <Modal
        title={editingId ? 'Sửa chi phí' : 'Thêm chi phí'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => { setModalOpen(false); setEditingId(null); form.resetFields() }}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        okText={editingId ? 'Cập nhật' : 'Thêm'}
        cancelText="Đóng"
        forceRender
      >
        <Form form={form} layout="vertical">
          <Form.Item label="Loại chi phí" name="costTypeId" rules={[{ required: true, message: 'Chọn loại chi phí' }]}>
            <LookupSelect resource="cost-types" placeholder="Chọn loại chi phí" />
          </Form.Item>
          <Form.Item label="NCC dịch vụ" name="serviceSupplierId">
            <LookupSelect resource="partners" labelField="shortName" placeholder="Chọn NCC dịch vụ" />
          </Form.Item>
          <Form.Item label="Số tiền" name="amount" rules={[{ required: true, message: 'Nhập số tiền' }]}>
            <InputNumber style={{ width: '100%' }} min={0} formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')} parser={(v) => Number((v ?? '').replace(/\./g, '')) as 0} />
          </Form.Item>
          <Form.Item label="VAT %" name="vatPct">
            <InputNumber style={{ width: '100%' }} min={0} max={100} />
          </Form.Item>
          <Form.Item label="PT thanh toán" name="paymentMethodId">
            <LookupSelect resource="payment-methods" placeholder="Chọn phương thức" />
          </Form.Item>
          <Form.Item label="Ghi chú" name="note">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}