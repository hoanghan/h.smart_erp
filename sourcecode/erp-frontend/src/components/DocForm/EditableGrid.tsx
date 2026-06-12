import { useCallback, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { Button, Input, InputNumber, Space, Table } from 'antd'
import type { ColumnType } from 'antd/es/table'
import { PlusOutlined, MinusOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons'
import { formatNumberVN } from '../../utils/format'

/**
 * EditableGrid — AntD Table wrapper LeanSCRM style:
 * - size="small", filter row, cell editable inline, footer tổng, navigator
 * - Banded columns (column groups) cho tab Tính giá
 * - Context menu on right-click
 */

export interface EditColumn<T = Record<string, unknown>> {
  /** Tiêu đề cột */
  title: string
  /** Data index */
  dataIndex: string
  /** Độ rộng */
  width?: number
  /** Căn lề */
  align?: 'left' | 'center' | 'right'
  /** Cột editable */
  editable?: boolean
  /** Loại editor */
  editor?: 'input' | 'number' | 'select'
  /** Select options (khi editor='select') */
  editorOptions?: { value: unknown; label: string }[]
  /** Cột lookup — hiển thị tên từ resource */
  lookupResource?: string
  /** Render custom */
  render?: (value: unknown, record: T, index: number) => ReactNode
  /** Có filter */
  filterable?: boolean
  /** Format number */
  formatNumber?: boolean
  /** Nền đỏ khi điều kiện */
  warningCheck?: (value: unknown, record: T) => boolean
  /** Nền vàng (ô bắt buộc editable) */
  required?: boolean
  /** Readonly cột */
  readonly?: boolean
}

export interface EditableGridProps<T extends Record<string, unknown>> {
  columns: EditColumn<T>[]
  data: T[]
  /** Khóa duy nhất */
  rowKey: string | ((record: T) => string | number)
  /** Có đang bị lock (không edit) */
  locked?: boolean
  /** Callback khi cell thay đổi */
  onCellChange?: (rowIndex: number, dataIndex: string, value: unknown) => void
  /** Callback thêm dòng */
  onAddRow?: () => void
  /** Callback xóa dòng */
  onDeleteRow?: (index: number) => void
  /** Callback lưu */
  onSave?: () => void
  /** Callback hủy edit */
  onCancel?: () => void
  /** Context menu renderer */
  contextMenu?: ReactNode
  /** Footer tổng — { dataIndex: tổng } */
  totals?: Record<string, number | null>
  /** Đếm dòng */
  showRowCount?: boolean
  /** Column groups (banded columns) — cho tab Tính giá */
  columnGroups?: { title: string; children: string[] }[]
  /** CSS class bổ sung */
  className?: string
  /** Style bổ sung */
  style?: CSSProperties
}

interface CellEditorProps<T> {
  column: EditColumn<T>
  record: T
  rowIndex: number
  value: unknown
  onChange: (value: unknown) => void
  onCancel: () => void
  onSave: () => void
}

function CellEditor<T extends Record<string, unknown>>({ column, value, onChange, onCancel, onSave }: CellEditorProps<T>) {
  const commonProps = {
    size: 'small' as const,
    autoFocus: true,
    onBlur: onSave,
    onPressEnter: onSave,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    },
  }

  switch (column.editor ?? 'input') {
    case 'number':
      return (
        <InputNumber
          {...commonProps}
          value={value as number | null}
          onChange={(v) => onChange(v)}
          style={{ width: '100%' }}
          formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
        />
      )
    case 'select':
      return (
        <select
          autoFocus
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onSave}
          onKeyDown={(e) => { if (e.key === 'Escape') onCancel() }}
          style={{ width: '100%', padding: '2px 4px', fontSize: 12, border: '1px solid #1677ff' }}
        >
          {column.editorOptions?.map((opt) => (
            <option key={String(opt.value)} value={String(opt.value)}>{opt.label}</option>
          ))}
        </select>
      )
    default:
      return (
        <Input
          {...commonProps}
          value={value as string}
          onChange={(e) => onChange(e.target.value)}
        />
      )
  }
}

export default function EditableGrid<T extends Record<string, unknown>>({
  columns,
  data,
  rowKey,
  locked = false,
  onCellChange,
  onAddRow,
  onDeleteRow,
  onSave,
  onCancel,
  contextMenu,
  totals,
  showRowCount = true,
  columnGroups,
  className = '',
  style,
}: EditableGridProps<T>) {
  // Editing state: { [rowIndex]: { [dataIndex]: originalValue } }
  const [editingCell, setEditingCell] = useState<{ row: number; col: string } | null>(null)
  const [editValue, setEditValue] = useState<unknown>(null)
  const [filters, setFilters] = useState<Record<string, string>>({})

  // Start editing a cell
  const startEdit = useCallback((rowIndex: number, dataIndex: string, currentValue: unknown) => {
    if (locked) return
    setEditingCell({ row: rowIndex, col: dataIndex })
    setEditValue(currentValue)
  }, [locked])

  const saveEdit = useCallback(() => {
    if (editingCell && onCellChange) {
      onCellChange(editingCell.row, editingCell.col, editValue)
    }
    setEditingCell(null)
    setEditValue(null)
  }, [editingCell, editValue, onCellChange])

  const cancelEdit = useCallback(() => {
    setEditingCell(null)
    setEditValue(null)
  }, [])

  // Apply filters
  const filteredData = useMemo(() => {
    const activeFilters = Object.entries(filters).filter(([, v]) => v)
    if (activeFilters.length === 0) return data
    return data.filter((row) =>
      activeFilters.every(([key, val]) => {
        const cellVal = String(row[key] ?? '').toLowerCase()
        return cellVal.includes(val.toLowerCase())
      }),
    )
  }, [data, filters])

  // Build AntD columns
  const antColumns: ColumnType<T>[] = useMemo(() => {
    const getCol = (col: EditColumn<T>): ColumnType<T> => {
      const isEditing = (ri: number) => editingCell?.row === ri && editingCell?.col === col.dataIndex

      return {
        key: col.dataIndex,
        dataIndex: col.dataIndex,
        title: (
          <div>
            <div>{col.title}</div>
            {col.filterable !== false && (
              <div
                onClick={(e) => e.stopPropagation()}
                style={{ marginTop: 2 }}
              >
                <Input
                  size="small"
                  placeholder="≡"
                  style={{ width: '100%', fontSize: 11, padding: '0 4px' }}
                  value={filters[col.dataIndex] ?? ''}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, [col.dataIndex]: e.target.value }))
                  }
                  allowClear
                />
              </div>
            )}
          </div>
        ),
        width: col.width,
        align: col.align,
        render: (value: unknown, record: T, index: number) => {
          // Find original index in unfiltered data
          const realIndex = data.indexOf(record)

          if (isEditing(realIndex)) {
            return (
              <div className="docform-cell-editing">
                <CellEditor<T>
                  column={col}
                  record={record}
                  rowIndex={realIndex}
                  value={editValue}
                  onChange={setEditValue}
                  onCancel={cancelEdit}
                  onSave={saveEdit}
                />
              </div>
            )
          }

          let displayValue: ReactNode = value as ReactNode
          if (col.formatNumber && value != null) {
            displayValue = formatNumberVN(value as number)
          }
          if (col.render) {
            displayValue = col.render(value, record, index)
          }

          const cellStyle: CSSProperties = {}
          if (col.warningCheck?.(value, record)) {
            cellStyle.backgroundColor = '#FFCDD2'
          }
          if (col.required && col.editable && !locked) {
            cellStyle.backgroundColor = '#FFF9C4'
          }

          if (col.editable && !locked && !col.readonly) {
            return (
              <div
                style={{ cursor: 'pointer', minHeight: 20, ...cellStyle }}
                onDoubleClick={() => startEdit(realIndex, col.dataIndex, value)}
                title="Nhấp đúp để sửa"
              >
                {displayValue}
              </div>
            )
          }

          return <div style={cellStyle}>{displayValue}</div>
        },
        onCell: col.editable && !locked ? () => ({ className: 'docform-editable-cell' }) : undefined,
      }
    }

    // With column groups (banded columns)
    if (columnGroups && columnGroups.length > 0) {
      const groupedCols: ColumnType<T>[] = columnGroups.map((group) => ({
        title: group.title,
        children: group.children
          .map((dataIdx) => columns.find((c) => c.dataIndex === dataIdx))
          .filter(Boolean)
          .map((col) => getCol(col!)),
      }))
      // Add columns not in any group at the beginning
      const groupedDataIndices = new Set(columnGroups.flatMap((g) => g.children))
      const ungroupedCols = columns
        .filter((c) => !groupedDataIndices.has(c.dataIndex))
        .map((col) => getCol(col))
      return [...ungroupedCols, ...groupedCols]
    }

    return columns.map((col) => getCol(col))
  }, [columns, columnGroups, editingCell, editValue, locked, filters, data, startEdit, saveEdit, cancelEdit])

  // Footer
  const renderFooter = () => {
    if (!totals && !showRowCount) return undefined
    return (
      <div style={{ display: 'flex', gap: 24 }}>
        {showRowCount && (
          <span>Tổng số dòng: <strong>{filteredData.length}</strong></span>
        )}
        {totals && Object.entries(totals).map(([key, val]) => {
          const col = columns.find((c) => c.dataIndex === key)
          return (
            <span key={key}>
              {col?.title ?? key}: <strong>{formatNumberVN(val)}</strong>
            </span>
          )
        })}
      </div>
    )
  }

  // Navigator
  const renderNavigator = () => {
    if (locked) return null
    return (
      <div className="docform-navigator">
        <Button size="small" icon={<PlusOutlined />} onClick={onAddRow} title="Thêm dòng (Ctrl+I)" />
        <Button size="small" icon={<MinusOutlined />} onClick={() => {
          if (filteredData.length > 0 && onDeleteRow) {
            onDeleteRow(data.length - 1)
          }
        }} title="Xóa dòng cuối" />
        <Button size="small" icon={<CheckOutlined />} onClick={onSave} title="Lưu (Ctrl+S)" />
        <Button size="small" icon={<CloseOutlined />} onClick={onCancel} title="Không lưu" />
      </div>
    )
  }

  return (
    <div className={`docform-editable-grid ${className}`} style={style}>
      {contextMenu}
      <Table<T>
        rowKey={rowKey}
        columns={antColumns}
        dataSource={filteredData}
        pagination={false}
        size="small"
        bordered
        footer={renderFooter}
        tableLayout="fixed"
        scroll={{ x: 'max-content' }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        {renderNavigator()}
        <Space size={4} />
      </div>
    </div>
  )
}