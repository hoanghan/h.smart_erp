import { useEffect } from 'react'
import { App as AntApp, Button, Form, Input, InputNumber } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query'
import axios from 'axios'
import { apiClient } from '../../api/client'
import type { ApiErrorBody, QuotationLineIn, QuotationLineOut, QuotationLineUpdate } from '../../api/types'
import GridContextMenu, { type ContextMenuGroup } from '../../components/DocForm/GridContextMenu'
import EditableGrid, { type EditColumn } from '../../components/DocForm/EditableGrid'
import LookupLabel from '../../components/LookupLabel'
import LookupSelect from '../../components/LookupSelect'

interface LineRow extends QuotationLineOut {
  [key: string]: unknown
}

interface QuotationLinesTabProps {
  quotationId: number
  lines: QuotationLineOut[]
  locked: boolean
  queryKey: QueryKey
  status: string
  onExportExcel: () => void
  onWorkflowAction: (action: string, requireReason?: boolean) => void
  onShowHistory: () => void
  onShowStock: (productId: number) => void
  onMakeSalesOrder: () => void
  onSetAsLost: () => void
  onExtend: () => void
  onAmend: () => void
  onReload: () => void
  /** Mở dialog Import hàng hóa từ Excel */
  onImport?: () => void
  /**
   * Chế độ nháp (tạo mới — chưa có quotationId): không gọi API per-dòng,
   * thao tác trực tiếp trên mảng draftLines và báo lên cha qua onDraftChange.
   */
  draftMode?: boolean
  draftLines?: QuotationLineIn[]
  onDraftChange?: (lines: QuotationLineIn[]) => void
}

/** Tab "Hàng hóa" của báo giá: bảng dòng hàng (sửa nhanh rate/discountPct/qty) + context menu workflow. */
export default function QuotationLinesTab({
  quotationId, lines, locked, queryKey, status,
  onExportExcel, onWorkflowAction, onShowHistory, onShowStock,
  onMakeSalesOrder, onSetAsLost, onExtend, onAmend, onReload,
  onImport, draftMode = false, draftLines = [], onDraftChange,
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

  const updateMutation = useMutation({
    mutationFn: ({ lineId, body }: { lineId: number; body: QuotationLineUpdate }) =>
      apiClient.put(`/sales/quotations/${quotationId}/lines/${lineId}`, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
    onError: (err) => showError(err, 'Không thể lưu dòng'),
  })

  const handleAdd = async () => {
    const values = await form.validateFields()
    const line: QuotationLineIn = {
      productId: values.productId,
      quantity: values.quantity,
      projectHouse: values.projectHouse || null,
      rate: values.rate ?? null,
      discountPct: values.discountPct ?? null,
      vatPct: values.vatPct,
      note: values.note || null,
    }
    if (draftMode) {
      onDraftChange?.([...draftLines, line])
      form.resetFields()
    } else {
      addMutation.mutate(line)
    }
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

  const handleCellChange = (rowIndex: number, dataIndex: string, value: unknown) => {
    if (draftMode) {
      const next = draftLines.map((l, i) => (i === rowIndex ? { ...l, [dataIndex]: value } : l))
      onDraftChange?.(next)
      return
    }
    const line = lines[rowIndex]
    if (!line) return
    const body: QuotationLineUpdate = { [dataIndex]: value } as QuotationLineUpdate
    updateMutation.mutate({ lineId: line.id, body })
  }

  const handleDeleteLast = () => {
    if (draftMode) {
      if (draftLines.length > 0) onDraftChange?.(draftLines.slice(0, -1))
      return
    }
    if (lines.length > 0) deleteMutation.mutate(lines[lines.length - 1].id)
  }

  // Dòng hiển thị: ở chế độ nháp, dựng từ draftLines (tính amount tạm, chưa có id/orderedQty từ server).
  const displayRows: LineRow[] = draftMode
    ? draftLines.map((l, i) => {
        const rate = l.rate ?? 0
        const disc = l.discountPct ?? 0
        return {
          id: i,
          productId: l.productId,
          projectHouse: l.projectHouse ?? null,
          quantity: l.quantity,
          vatPct: l.vatPct ?? null,
          rate: l.rate ?? null,
          discountPct: l.discountPct ?? null,
          amount: l.quantity * rate * (1 - disc / 100),
          orderedQty: 0,
          note: l.note ?? null,
        } as LineRow
      })
    : (lines as unknown as LineRow[])

  const totals = {
    quantity: displayRows.reduce((s, l) => s + (l.quantity as number), 0),
    amount: displayRows.reduce((s, l) => s + (l.amount as number), 0),
    orderedQty: displayRows.reduce((s, l) => s + (l.orderedQty as number), 0),
  }

  const columns: EditColumn<LineRow>[] = [
    {
      title: 'Mã hàng', dataIndex: 'productId', width: 160, filterable: false,
      render: (v) => <LookupLabel resource="products" id={v as number} />,
    },
    { title: 'Dự án - Nhà', dataIndex: 'projectHouse', width: 130, editable: true, editor: 'input', filterable: false },
    { title: 'Số lượng', dataIndex: 'quantity', width: 90, align: 'right', editable: true, editor: 'number', formatNumber: true, filterable: false },
    { title: 'Đơn giá', dataIndex: 'rate', width: 110, align: 'right', editable: true, editor: 'number', formatNumber: true, filterable: false },
    { title: 'CK (%)', dataIndex: 'discountPct', width: 80, align: 'right', editable: true, editor: 'number', formatNumber: true, filterable: false },
    { title: 'VAT (%)', dataIndex: 'vatPct', width: 80, align: 'right', editable: true, editor: 'number', formatNumber: true, filterable: false },
    { title: 'Thành tiền', dataIndex: 'amount', width: 130, align: 'right', formatNumber: true, filterable: false, readonly: true },
    { title: 'Đã lên đơn', dataIndex: 'orderedQty', width: 100, align: 'right', formatNumber: true, filterable: false, readonly: true },
    { title: 'Ghi chú', dataIndex: 'note', width: 160, editable: true, editor: 'input', filterable: false },
  ]

  const canMakeSalesOrder = status === 'OPEN'
  const canSetAsLost = status === 'OPEN'
  const canExtend = status === 'EXPIRED'
  const canAmend = status === 'CANCELLED'
  const canSubmit = status === 'DRAFT'
  const canCancel = status === 'DRAFT' || status === 'OPEN'

  const contextMenuGroups: ContextMenuGroup[] = [
    {
      items: [
        { label: 'Thêm', shortcut: 'Ctrl+Alt+I', onClick: handleAdd, disabled: locked },
        { label: 'Thêm dòng cuối', shortcut: 'Ctrl+I', onClick: handleAdd, disabled: locked },
        { label: 'Xóa', onClick: handleDeleteLast, disabled: locked },
        ...(draftMode ? [] : [
          { label: 'Đọc lại dữ liệu', shortcut: 'Ctrl+F5', onClick: onReload },
          { label: 'Lịch sử thao tác', onClick: onShowHistory },
        ]),
      ],
    },
    {
      items: [
        { label: 'Import hàng hóa', onClick: () => onImport?.(), disabled: locked || !onImport },
        ...(draftMode ? [] : [{ label: 'Kết xuất Excel', onClick: onExportExcel }]),
      ],
    },
    // Nhóm hành động workflow chỉ áp dụng khi đã lưu (có quotationId)
    ...(draftMode ? [] : [{
      items: [
        { label: 'Gửi duyệt', onClick: () => onWorkflowAction('submit'), disabled: !canSubmit },
        { label: 'Tạo đơn hàng', onClick: onMakeSalesOrder, disabled: !canMakeSalesOrder },
        { label: 'Đánh dấu mất báo giá', onClick: onSetAsLost, disabled: !canSetAsLost, danger: true },
        { label: 'Gia hạn báo giá', onClick: onExtend, disabled: !canExtend },
        { label: 'Hủy báo giá', onClick: () => onWorkflowAction('cancel', true), disabled: !canCancel, danger: true },
        { label: 'Tạo bản sửa đổi', onClick: onAmend, disabled: !canAmend },
      ],
    }, {
      items: [
        { label: 'Thông tin tồn kho', onClick: () => { if (lines.length > 0) onShowStock(lines[0].productId) }, disabled: lines.length === 0 },
      ],
    }]),
  ]

  return (
    <GridContextMenu groups={contextMenuGroups}>
      <div>
        <EditableGrid<LineRow>
          columns={columns}
          data={displayRows}
          rowKey="id"
          locked={locked}
          onCellChange={handleCellChange}
          totals={{ quantity: totals.quantity, amount: totals.amount, orderedQty: totals.orderedQty }}
        />
        {!locked && (
          <Form form={form} layout="inline" style={{ marginTop: 8, gap: 4 }}>
            <Form.Item name="productId" rules={[{ required: true, message: 'Chọn sản phẩm' }]} style={{ minWidth: 220 }}>
              <LookupSelect resource="products" placeholder="Mã hàng" />
            </Form.Item>
            <Form.Item name="projectHouse">
              <Input placeholder="Dự án - Nhà" style={{ width: 120 }} size="small" />
            </Form.Item>
            <Form.Item name="quantity" rules={[{ required: true, message: 'Nhập SL' }]} initialValue={1}>
              <InputNumber min={0} placeholder="SL" style={{ width: 80 }} size="small" />
            </Form.Item>
            <Form.Item name="rate">
              <InputNumber min={0} placeholder="Đơn giá (tự động)" style={{ width: 130 }} size="small" />
            </Form.Item>
            <Form.Item name="discountPct">
              <InputNumber min={0} max={100} placeholder="CK%" style={{ width: 70 }} size="small" />
            </Form.Item>
            <Form.Item name="vatPct" initialValue={10}>
              <InputNumber min={0} max={100} placeholder="VAT%" style={{ width: 70 }} size="small" />
            </Form.Item>
            <Form.Item name="note">
              <Input placeholder="Ghi chú" style={{ width: 140 }} size="small" />
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
