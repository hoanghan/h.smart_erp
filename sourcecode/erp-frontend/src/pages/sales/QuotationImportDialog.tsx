import { useState } from 'react'
import { App as AntApp, Button, Modal, Table, Tag, Upload, Typography } from 'antd'
import { DownloadOutlined, UploadOutlined } from '@ant-design/icons'
import type { UploadProps } from 'antd'
import * as XLSX from 'xlsx'
import { apiClient } from '../../api/client'
import type { LookupItem, PageResult, PricingResolveResult, QuotationLineIn } from '../../api/types'
import { formatNumberVN } from '../../utils/format'

interface QuotationImportDialogProps {
  open: boolean
  /** Khách hàng của báo giá — để resolve giá/CK theo bảng giá */
  partnerId?: number
  onClose: () => void
  onConfirm: (lines: QuotationLineIn[]) => void
}

interface PreviewRow {
  key: number
  rowNo: number
  code: string
  productId: number | null
  quantity: number
  rate: number | null
  discountPct: number | null
  vatPct: number | null
  resolvedRate?: number | null
  resolvedDiscount?: number | null
  error?: string
}

// Cột file mẫu — dùng mã (code) cho cột tra cứu, theo cơ chế task 18
const TEMPLATE_HEADER = ['product_code', 'quantity', 'rate', 'discount_pct', 'vat_pct']
const TEMPLATE_EXAMPLE = ['SP0001', 5, '', '', 10]

const num = (v: unknown): number | null => {
  if (v === '' || v === null || v === undefined) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

export default function QuotationImportDialog({ open, partnerId, onClose, onConfirm }: QuotationImportDialogProps) {
  const { message } = AntApp.useApp()
  const [rows, setRows] = useState<PreviewRow[]>([])
  const [parsing, setParsing] = useState(false)

  const reset = () => setRows([])

  const handleClose = () => {
    reset()
    onClose()
  }

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADER, TEMPLATE_EXAMPLE])
    const guide = XLSX.utils.aoa_to_sheet([
      ['Hướng dẫn nhập hàng hóa vào báo giá'],
      [''],
      ['product_code', 'Mã sản phẩm (bắt buộc) — phải tồn tại trong danh mục'],
      ['quantity', 'Số lượng (bắt buộc, > 0)'],
      ['rate', 'Đơn giá (tùy chọn) — bỏ trống để hệ thống tự áp theo bảng giá'],
      ['discount_pct', 'Chiết khấu % (tùy chọn)'],
      ['vat_pct', 'Thuế VAT % (mặc định 10 nếu bỏ trống)'],
    ])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Data')
    XLSX.utils.book_append_sheet(wb, guide, 'HuongDan')
    XLSX.writeFile(wb, 'Mau_ImportHangHoa_BaoGia.xlsx')
  }

  const parseFile = async (file: File) => {
    setParsing(true)
    try {
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' })

      const parsed: PreviewRow[] = json.map((r, i) => {
        const code = String(r.product_code ?? r.Mã ?? r.code ?? '').trim()
        const quantity = num(r.quantity) ?? 0
        return {
          key: i,
          rowNo: i + 1,
          code,
          productId: null,
          quantity,
          rate: num(r.rate),
          discountPct: num(r.discount_pct),
          vatPct: num(r.vat_pct) ?? 10,
        }
      })

      // Map mã → product id (dùng endpoint LookupSelect), exact-match theo code
      await Promise.all(parsed.map(async (row) => {
        if (!row.code) { row.error = 'Thiếu mã sản phẩm'; return }
        if (row.quantity <= 0) { row.error = 'Số lượng phải > 0' }
        try {
          const res = await apiClient.get<PageResult<LookupItem>>('/md/products', { params: { q: row.code, size: 20 } })
          const found = res.data.items.find((it) => it.code === row.code)
          if (!found) { row.error = row.error ?? 'Mã không tồn tại'; return }
          row.productId = found.id
          // Resolve giá/CK để hiển thị preview (không bắt buộc — BE tự áp khi rate/discount null)
          if (!row.error && (row.rate === null || row.discountPct === null)) {
            try {
              const pr = await apiClient.get<PricingResolveResult>('/sales/pricing/resolve', {
                params: { partnerId: partnerId ?? undefined, productId: found.id, qty: row.quantity },
              })
              row.resolvedRate = pr.data.rate
              row.resolvedDiscount = pr.data.discountPct
            } catch { /* bỏ qua lỗi resolve — không chặn import */ }
          }
        } catch {
          row.error = row.error ?? 'Không tra cứu được mã'
        }
      }))

      setRows(parsed)
      const errCount = parsed.filter((r) => r.error).length
      message.info(`Đã đọc ${parsed.length} dòng, ${errCount} dòng lỗi`)
    } catch {
      message.error('Không đọc được file. Hãy dùng đúng file mẫu .xlsx')
    } finally {
      setParsing(false)
    }
  }

  const uploadProps: UploadProps = {
    accept: '.xlsx,.xls',
    maxCount: 1,
    showUploadList: false,
    beforeUpload: (file) => { parseFile(file as File); return false },
  }

  const validRows = rows.filter((r) => !r.error)

  const handleConfirm = () => {
    if (validRows.length === 0) {
      message.warning('Không có dòng hợp lệ để thêm')
      return
    }
    const lines: QuotationLineIn[] = validRows.map((r) => ({
      productId: r.productId as number,
      quantity: r.quantity,
      projectHouse: null,
      rate: r.rate,
      discountPct: r.discountPct,
      vatPct: r.vatPct,
      note: null,
    }))
    onConfirm(lines)
    reset()
  }

  return (
    <Modal
      title="Import hàng hóa từ Excel"
      open={open}
      onCancel={handleClose}
      onOk={handleConfirm}
      okText={`Thêm vào báo giá (${validRows.length})`}
      cancelText="Đóng"
      okButtonProps={{ disabled: validRows.length === 0 || rows.length === 0 }}
      width={820}
      confirmLoading={parsing}
    >
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <Button icon={<DownloadOutlined />} onClick={downloadTemplate}>Tải file mẫu</Button>
        <Upload {...uploadProps}>
          <Button type="primary" icon={<UploadOutlined />} loading={parsing}>Tải lên file .xlsx</Button>
        </Upload>
      </div>

      {rows.length > 0 && (
        <>
          <Typography.Text type="secondary">
            Tổng {rows.length} dòng · Hợp lệ {validRows.length} · Lỗi {rows.length - validRows.length}
          </Typography.Text>
          <Table<PreviewRow>
            style={{ marginTop: 8 }}
            size="small"
            rowKey="key"
            pagination={false}
            scroll={{ y: 320 }}
            dataSource={rows}
            onRow={(r) => ({ style: r.error ? { background: '#fff1f0' } : {} })}
            columns={[
              { title: '#', dataIndex: 'rowNo', width: 44 },
              { title: 'Mã SP', dataIndex: 'code', width: 110 },
              { title: 'Số lượng', dataIndex: 'quantity', align: 'right', width: 90, render: formatNumberVN },
              {
                title: 'Đơn giá', dataIndex: 'rate', align: 'right', width: 120,
                render: (v: number | null, r) => v != null ? formatNumberVN(v)
                  : r.resolvedRate != null ? <span style={{ color: '#888' }}>{formatNumberVN(r.resolvedRate)} (tự)</span>
                  : <i style={{ color: '#aaa' }}>tự động</i>,
              },
              {
                title: 'CK %', dataIndex: 'discountPct', align: 'right', width: 80,
                render: (v: number | null, r) => v != null ? formatNumberVN(v)
                  : r.resolvedDiscount != null ? <span style={{ color: '#888' }}>{formatNumberVN(r.resolvedDiscount)}</span> : '',
              },
              { title: 'VAT %', dataIndex: 'vatPct', align: 'right', width: 70, render: (v: number | null) => v ?? '' },
              {
                title: 'Trạng thái', key: 'status', width: 170,
                render: (_, r) => r.error
                  ? <Tag color="red">{r.error}</Tag>
                  : <Tag color="green">Hợp lệ</Tag>,
              },
            ]}
          />
        </>
      )}
    </Modal>
  )
}
