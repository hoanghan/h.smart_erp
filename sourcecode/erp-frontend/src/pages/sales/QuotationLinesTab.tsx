import { useEffect } from 'react'
import { App as AntApp, Button, Form, InputNumber, Popconfirm, Table } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query'
import axios from 'axios'
import { apiClient } from '../../api/client'
import type { ApiErrorBody, QuotationLineIn, QuotationLineOut } from '../../api/types'
import GridContextMenu, { type ContextMenuGroup } from '../../components/DocForm/GridContextMenu'
import LookupLabel from '../../components/LookupLabel'
import LookupSelect from '../../components/LookupSelect'
import { formatNumberVN } from '../../utils/format'

interface QuotationLinesTabProps {
  quotationId: number
  lines: QuotationLineOut[]
  locked: boolean
  queryKey: QueryKey
  quoteType: string
  onExportExcel: () => void
  onWorkflowAction: (action: string, requireReason?: boolean) => void
  onShowHistory: () => void
  onShowStock: (productId: number) => void
  onConvertToOrder: () => void
  onReload: () => void
  status: string
}

/** Tab "Hàng hóa" của báo giá: bảng dòng hàng + context menu đầy đủ. */
export default function QuotationLinesTab({
  quotationId, lines, locked, queryKey, quoteType,
  onExportExcel, onWorkflowAction, onShowHistory, onShowStock,
  onConvertToOrder, onReload, status,
}: QuotationLinesTabProps) {
  const { message } = AntApp.useApp()
  const queryClient = useQueryClient()
  const [form] = Form.useForm()

  const showError = (err: unknown, fallback: string) => {
    const body = axios.isAxiosError<ApiErrorBody>(err) ? err.response?.data : undefined
    message.error(body?.message ?? fallback)
  }

  const addMutation = useMutation({
    mutationFn: (line: QuotationLineIn) => apiClient.post(`/sales/quotations/${quotationId}/lines`, line),
    onSuccess: () => {
      message.success('Đã thêm dòng')
      form.resetFields()
      queryClient.invalidateQueries({ queryKey })
    },
    onError: (err) => showError(err, 'Không thể thêm dòng'),
  })

  const deleteMutation = useMutation({
    mutationFn: (lineId: number) => apiClient.delete(`/sales/quotations/${quotationId}/lines/${lineId}`),
    onSuccess: () => {
      message.success('Đã xóa dòng')
      queryClient.invalidateQueries({ queryKey })
    },
    onError: (err) => showError(err, 'Không thể xóa dòng'),
  })

  const handleAdd = async () => {
    const values = await form.validateFields()
    addMutation.mutate({
      productId: values.productId,
      quantity: values.quantity,
      approvedPrice: values.approvedPrice,
      vatPct: values.vatPct,
      projectHouse: quoteType === 'PROJECT_HOUSE' ? values.projectHouse : null,
    })
  }

  // Ctrl+I — Thêm dòng cuối
  useEffect(() => {
    if (locked) return
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && !e.altKey && e.key.toLowerCase() === 'i') {
        e.preventDefault()
        handleAdd()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [locked, handleAdd])

  // Totals
  const totals = {
    quantity: lines.reduce((s, l) => s + l.quantity, 0),
    weight: lines.reduce((s, l) => s + (l.priceWeight ?? 0), 0),
    amount: lines.reduce((s, l) => s + (l.approvedPrice ?? l.calcPrice ?? 0) * l.quantity, 0),
  }

  const showProjectCol = quoteType === 'PROJECT_HOUSE'

  const columns: ColumnsType<QuotationLineOut> = [
    { title: 'STT', key: 'stt', width: 40, align: 'center', render: (_, __, i) => i + 1 },
    {
      title: 'Mã hàng', dataIndex: 'productId', key: 'productId', width: 120,
      render: (v: number) => <LookupLabel resource="products" id={v} />,
    },
    { title: 'Tên hàng hóa', key: 'productName', width: 180, render: () => '' /* TODO-BE: product name */ },
    { title: 'Quy cách', key: 'spec', width: 100, render: () => '' /* TODO-BE */ },
    ...(showProjectCol ? [{ title: 'Dự án - Nhà', dataIndex: 'projectHouse', key: 'projectHouse', width: 120 }] : []),
    { title: 'ĐVT', key: 'uom', width: 60, render: () => '' /* TODO-BE: product uom */ },
    { title: 'Số lượng', dataIndex: 'quantity', key: 'quantity', align: 'right', width: 90, render: formatNumberVN },
    { title: 'Trọng lượng', dataIndex: 'priceWeight', key: 'priceWeight', align: 'right', width: 90, render: (v: number | null) => v ? formatNumberVN(v) : '' /* TODO-BE */ },
    { title: 'Đơn giá (REF)', dataIndex: 'calcPrice', key: 'calcPrice', align: 'right', width: 110, render: formatNumberVN },
    { title: 'Giá duyệt', dataIndex: 'approvedPrice', key: 'approvedPrice', align: 'right', width: 110, render: formatNumberVN },
    {
      title: 'Thành tiền', key: 'amount', align: 'right', width: 120,
      render: (_, r) => formatNumberVN((r.approvedPrice ?? r.calcPrice ?? 0) * r.quantity),
    },
    { title: 'VAT (%)', dataIndex: 'vatPct', key: 'vatPct', align: 'right', width: 70, render: formatNumberVN },
    { title: 'Ghi chú', dataIndex: 'note', key: 'note', width: 150 },
  ]

  if (!locked) {
    columns.push({
      title: '', key: '__actions', width: 48, fixed: 'right',
      render: (_, record) => (
        <Popconfirm title="Xóa dòng này?" okText="Xóa" cancelText="Hủy" onConfirm={() => deleteMutation.mutate(record.id)}>
          <Button type="text" danger icon={<DeleteOutlined />} loading={deleteMutation.isPending} size="small" />
        </Popconfirm>
      ),
    })
  }

  // Context menu groups — đúng thứ tự gốc LeanSCRM
  const canEdit = ['NEW', 'PRICE_REQUESTED', 'PRICING'].includes(status)
  const canApprove = status === 'APPROVAL_REQUESTED'
  const canConvert = ['APPROVED', 'ORDER_PENDING'].includes(status)
  const canUpdate = ['APPROVED', 'ORDER_PENDING'].includes(status)

  const contextMenuGroups: ContextMenuGroup[] = [
    {
      items: [
        { label: 'Thêm', shortcut: 'Ctrl+Alt+I', onClick: handleAdd, disabled: locked },
        { label: 'Thêm dòng cuối', shortcut: 'Ctrl+I', onClick: handleAdd, disabled: locked },
        {
          label: 'Xóa', onClick: () => {
            if (lines.length > 0) deleteMutation.mutate(lines[lines.length - 1].id)
          }, disabled: locked,
        },
        { label: 'Lưu', shortcut: 'Ctrl+S', onClick: () => queryClient.invalidateQueries({ queryKey }), disabled: locked },
        { label: 'Không lưu', onClick: onReload, disabled: locked },
      ],
    },
    {
      items: [
        { label: 'Import báo giá từ Excel', onClick: () => message.info('TODO: Import'), disabled: !canEdit },
        { label: 'Kết xuất Excel', onClick: onExportExcel },
      ],
    },
    {
      items: [
        { label: 'Duyệt báo giá', onClick: () => onWorkflowAction('approve'), disabled: !canApprove },
        { label: 'Hủy duyệt', onClick: () => message.info('TODO-BE: Unapprove'), disabled: true },
        { label: 'Từ chối báo giá', onClick: () => onWorkflowAction('reject', true), disabled: !canApprove, danger: true },
        { label: 'Hủy báo giá', onClick: () => onWorkflowAction('cancel', true), disabled: locked, danger: true },
        { label: 'Cập nhật báo giá ▸ Chờ xác nhận đơn', onClick: () => onWorkflowAction('mark-order-pending'), disabled: !canUpdate },
        { label: 'Cập nhật báo giá ▸ Không thành công', onClick: () => onWorkflowAction('mark-failed', true), disabled: !canUpdate, danger: true },
      ],
    },
    {
      items: [
        { label: 'Đọc lại dữ liệu', shortcut: 'Ctrl+F5', onClick: onReload },
        { label: 'Lịch sử thao tác', onClick: onShowHistory },
      ],
    },
    {
      items: [
        { label: 'Chuyển thành đơn hàng', onClick: onConvertToOrder, disabled: !canConvert },
      ],
    },
    {
      items: [
        { label: 'Thông tin hàng hóa', onClick: () => message.info('TODO-BE: Product info'), disabled: lines.length === 0 },
        { label: 'Thông tin tồn kho', onClick: () => { if (lines.length > 0) onShowStock(lines[0].productId) }, disabled: lines.length === 0 },
      ],
    },
  ]

  return (
    <GridContextMenu groups={contextMenuGroups}>
      <div>
        <Table<QuotationLineOut>
          rowKey="id"
          columns={columns}
          dataSource={lines}
          pagination={false}
          size="small"
          bordered
          scroll={{ x: 'max-content' }}
          summary={() => (
            <Table.Summary fixed>
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={showProjectCol ? 6 : 5}>
                  <strong>Tổng cộng ({lines.length} dòng)</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={1} align="right">
                  <strong>{formatNumberVN(totals.quantity)}</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={2} align="right">
                  {formatNumberVN(totals.weight)}
                </Table.Summary.Cell>
                <Table.Summary.Cell index={3} colSpan={2} />
                <Table.Summary.Cell index={4} align="right">
                  <strong>{formatNumberVN(totals.amount)}</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={5} colSpan={2} />
              </Table.Summary.Row>
            </Table.Summary>
          )}
        />
        {!locked && (
          <Form form={form} layout="inline" style={{ marginTop: 8, gap: 4 }}>
            <Form.Item name="productId" rules={[{ required: true, message: 'Chọn sản phẩm' }]} style={{ minWidth: 220 }}>
              <LookupSelect resource="products" placeholder="Mã hàng" />
            </Form.Item>
            {showProjectCol && (
              <Form.Item name="projectHouse">
                <input placeholder="Dự án - Nhà" style={{ width: 120, fontSize: 12 }} />
              </Form.Item>
            )}
            <Form.Item name="quantity" rules={[{ required: true, message: 'Nhập SL' }]} initialValue={1}>
              <InputNumber min={0} placeholder="SL" style={{ width: 80 }} size="small" />
            </Form.Item>
            <Form.Item name="approvedPrice">
              <InputNumber min={0} placeholder="Giá duyệt" style={{ width: 110 }} size="small" />
            </Form.Item>
            <Form.Item name="vatPct" initialValue={10}>
              <InputNumber min={0} max={100} placeholder="VAT%" style={{ width: 70 }} size="small" />
            </Form.Item>
            <Form.Item>
              <Button type="dashed" icon={<PlusOutlined />} onClick={handleAdd} loading={addMutation.isPending} size="small">
                Thêm dòng
              </Button>
            </Form.Item>
          </Form>
        )}
      </div>
    </GridContextMenu>
  )
}