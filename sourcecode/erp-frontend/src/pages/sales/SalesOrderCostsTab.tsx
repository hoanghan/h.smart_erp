import { App as AntApp, Button, DatePicker, Form, Input, InputNumber, Popconfirm, Tag } from 'antd'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import type { Dayjs } from 'dayjs'
import { apiClient } from '../../api/client'
import type { ApiErrorBody, SoCostIn, SoCostOut, SoCostUpdate } from '../../api/types'
import { EditableGrid, GridContextMenu } from '../../components/DocForm'
import type { EditColumn, ContextMenuGroup } from '../../components/DocForm'
import LookupLabel from '../../components/LookupLabel'
import LookupSelect from '../../components/LookupSelect'
import { formatDateVN } from '../../utils/format'

interface SalesOrderCostsTabProps {
  orderId: number
  locked: boolean
}

interface CostRow extends SoCostOut {
  [key: string]: unknown
}

/** Tab "Chi phí" của đơn hàng bán — CRUD chi phí + duyệt/bỏ duyệt từng dòng. */
export default function SalesOrderCostsTab({ orderId, locked }: SalesOrderCostsTabProps) {
  const { message } = AntApp.useApp()
  const queryClient = useQueryClient()
  const [form] = Form.useForm()

  const queryKey = ['so-costs', orderId]

  const { data: costs = [] } = useQuery({
    queryKey,
    queryFn: async () => (await apiClient.get<SoCostOut[]>(`/sales/orders/${orderId}/costs`)).data,
  })

  const showError = (err: unknown, fallback: string) => {
    const body = axios.isAxiosError<ApiErrorBody>(err) ? err.response?.data : undefined
    message.error(body?.message ?? fallback)
  }

  const addMutation = useMutation({
    mutationFn: (body: SoCostIn) => apiClient.post(`/sales/orders/${orderId}/costs`, body),
    onSuccess: () => {
      message.success('Đã thêm chi phí')
      form.resetFields()
      queryClient.invalidateQueries({ queryKey })
    },
    onError: (err) => showError(err, 'Không thể thêm chi phí'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ costId, body }: { costId: number; body: SoCostUpdate }) =>
      apiClient.put(`/sales/orders/${orderId}/costs/${costId}`, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
    onError: (err) => showError(err, 'Không thể lưu chi phí'),
  })

  const deleteMutation = useMutation({
    mutationFn: (costId: number) => apiClient.delete(`/sales/orders/${orderId}/costs/${costId}`),
    onSuccess: () => {
      message.success('Đã xóa chi phí')
      queryClient.invalidateQueries({ queryKey })
    },
    onError: (err) => showError(err, 'Không thể xóa chi phí'),
  })

  const approveMutation = useMutation({
    mutationFn: ({ costId, action }: { costId: number; action: 'approve' | 'unapprove' }) =>
      apiClient.post(`/sales/orders/${orderId}/costs/${costId}/actions/${action}`),
    onSuccess: (_res, vars) => {
      message.success(vars.action === 'approve' ? 'Đã duyệt chi phí' : 'Đã bỏ duyệt chi phí')
      queryClient.invalidateQueries({ queryKey })
    },
    onError: (err) => showError(err, 'Không thể thực hiện'),
  })

  const handleAdd = async () => {
    const values = await form.validateFields()
    addMutation.mutate({
      costTypeId: values.costTypeId,
      payeeId: values.payeeId,
      ratePct: values.ratePct,
      amount: values.amount,
      vatPct: values.vatPct,
      dueDate: values.dueDate ? (values.dueDate as Dayjs).format('YYYY-MM-DD') : null,
      note: values.note,
    })
  }

  const handleCellChange = (rowIndex: number, dataIndex: string, value: unknown) => {
    const cost = costs[rowIndex]
    if (!cost) return
    if (cost.approved) {
      message.warning('Chi phí đã duyệt, hãy bỏ duyệt trước khi sửa')
      return
    }
    if (dataIndex === 'ratePct') updateMutation.mutate({ costId: cost.id, body: { ratePct: value as number | null } })
    else if (dataIndex === 'amount') updateMutation.mutate({ costId: cost.id, body: { amount: value as number | null } })
    else if (dataIndex === 'vatPct') updateMutation.mutate({ costId: cost.id, body: { vatPct: value as number | null } })
    else if (dataIndex === 'dueDate') updateMutation.mutate({ costId: cost.id, body: { dueDate: value as string | null } })
    else if (dataIndex === 'note') updateMutation.mutate({ costId: cost.id, body: { note: value as string | null } })
  }

  const totals = {
    amount: costs.reduce((s, c) => s + (c.amount ?? 0), 0),
  }

  const columns: EditColumn<CostRow>[] = [
    {
      title: 'Loại chi phí', dataIndex: 'costTypeId', width: 180, filterable: false,
      render: (v) => <LookupLabel resource="cost-types" id={v as number} />,
    },
    {
      title: 'Đối tượng chi', dataIndex: 'payeeId', width: 180, filterable: false,
      render: (v) => <LookupLabel resource="partners" id={v as number | null} labelField="shortName" />,
    },
    {
      title: 'Tỷ lệ %', dataIndex: 'ratePct', width: 90, align: 'right', filterable: false,
      editable: true, editor: 'number', formatNumber: true,
    },
    {
      title: 'Số tiền', dataIndex: 'amount', width: 120, align: 'right', filterable: false,
      editable: true, editor: 'number', required: true, formatNumber: true,
    },
    {
      title: 'VAT (%)', dataIndex: 'vatPct', width: 80, align: 'right', filterable: false,
      editable: true, editor: 'number', formatNumber: true,
    },
    {
      title: 'Hạn thanh toán', dataIndex: 'dueDate', width: 110, align: 'center', filterable: false,
      editable: true, editor: 'input',
      render: (v) => formatDateVN(v as string | null),
    },
    {
      title: 'Ghi chú', dataIndex: 'note', width: 160, filterable: false,
      editable: true, editor: 'input',
    },
    {
      title: 'Trạng thái', dataIndex: 'approved', width: 100, align: 'center', filterable: false,
      render: (v) => (v ? <Tag color="green">Đã duyệt</Tag> : <Tag>Chưa duyệt</Tag>),
    },
    {
      title: '', dataIndex: '__actions', width: 150, filterable: false,
      render: (_v, record) => (
        <div style={{ display: 'flex', gap: 4 }}>
          {record.approved ? (
            <Button size="small" onClick={() => approveMutation.mutate({ costId: record.id, action: 'unapprove' })} loading={approveMutation.isPending}>
              Bỏ duyệt
            </Button>
          ) : (
            <>
              <Button size="small" type="primary" onClick={() => approveMutation.mutate({ costId: record.id, action: 'approve' })} loading={approveMutation.isPending}>
                Duyệt
              </Button>
              <Popconfirm title="Xóa chi phí này?" okText="Xóa" cancelText="Hủy" onConfirm={() => deleteMutation.mutate(record.id)}>
                <Button size="small" danger icon={<DeleteOutlined />} loading={deleteMutation.isPending} />
              </Popconfirm>
            </>
          )}
        </div>
      ),
    },
  ]

  const contextMenuGroups: ContextMenuGroup[] = [
    {
      items: [
        { label: 'Thêm dòng cuối', shortcut: 'Ctrl+I', onClick: handleAdd, disabled: locked },
        {
          label: 'Xóa dòng cuối', onClick: () => {
            const last = costs[costs.length - 1]
            if (!last) return
            if (last.approved) { message.warning('Dòng cuối đã duyệt, hãy bỏ duyệt trước khi xóa'); return }
            deleteMutation.mutate(last.id)
          }, disabled: locked || costs.length === 0,
        },
        { label: 'Lưu', shortcut: 'Ctrl+S', onClick: () => message.success('Đã lưu') },
        { label: 'Không lưu', onClick: () => queryClient.invalidateQueries({ queryKey }) },
      ],
    },
    {
      items: [
        { label: 'Đọc lại dữ liệu', shortcut: 'Ctrl+F5', onClick: () => queryClient.invalidateQueries({ queryKey }) },
      ],
    },
  ]

  return (
    <div>
      <GridContextMenu groups={contextMenuGroups}>
        <EditableGrid<CostRow>
          columns={columns}
          data={costs as unknown as CostRow[]}
          rowKey="id"
          locked={locked}
          totals={totals}
          onCellChange={handleCellChange}
        />
      </GridContextMenu>
      {!locked && (
        <Form form={form} layout="inline" style={{ marginTop: 8, gap: 4 }}>
          <Form.Item name="costTypeId" rules={[{ required: true, message: 'Chọn loại chi phí' }]} style={{ minWidth: 200 }}>
            <LookupSelect resource="cost-types" placeholder="Loại chi phí" />
          </Form.Item>
          <Form.Item name="payeeId" style={{ minWidth: 200 }}>
            <LookupSelect resource="partners" labelField="shortName" placeholder="Đối tượng chi" />
          </Form.Item>
          <Form.Item name="ratePct">
            <InputNumber min={0} max={100} placeholder="Tỷ lệ %" style={{ width: 90 }} size="small" />
          </Form.Item>
          <Form.Item name="amount" initialValue={0}>
            <InputNumber min={0} placeholder="Số tiền" style={{ width: 120 }} size="small" />
          </Form.Item>
          <Form.Item name="vatPct" initialValue={10}>
            <InputNumber min={0} max={100} placeholder="VAT %" style={{ width: 80 }} size="small" />
          </Form.Item>
          <Form.Item name="dueDate">
            <DatePicker placeholder="Hạn TT" format="DD/MM/YYYY" style={{ width: 120 }} size="small" />
          </Form.Item>
          <Form.Item name="note">
            <Input placeholder="Ghi chú" style={{ width: 160 }} size="small" />
          </Form.Item>
          <Form.Item>
            <Button type="dashed" icon={<PlusOutlined />} onClick={handleAdd} loading={addMutation.isPending} size="small">
              Thêm chi phí
            </Button>
          </Form.Item>
        </Form>
      )}
    </div>
  )
}
