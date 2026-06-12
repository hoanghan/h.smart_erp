import type { ReactNode } from 'react'

/**
 * HeaderGrid — Form 2 khối LeanSCRM style:
 * - Khối trái: grid 3 cột (label right-aligned ~110px, input auto), lặp theo rows
 * - Khối phải: cố định ~280px, hiện status + tổng tiền
 */

export interface HeaderRow {
  /** Mỗi phần tử = {label, field, span?}. Grid 6 cột: [L F L F L F] */
  cells: HeaderCell[]
}

export interface HeaderCell {
  label?: string
  /** Nội dung field (Input, Select...) */
  field: ReactNode
  /** span: 2=label+field mặc định, 4=label+field span 4 cột, 6=full row */
  span?: number
  /** true = ô bắt buộc (nền vàng) */
  required?: boolean
}

export interface RightRow {
  label: string
  value: ReactNode
  bold?: boolean
  /** true = ô bắt buộc (nền vàng) */
  required?: boolean
}

interface HeaderGridProps {
  rows: HeaderRow[]
  rightRows: RightRow[]
  /** Nội dung phụ ở khối phải (vd Checkbox) */
  rightExtra?: ReactNode
}

export default function HeaderGrid({ rows, rightRows, rightExtra }: HeaderGridProps) {
  return (
    <div className="docform-header">
      {/* Khối trái — 3 cột label/input */}
      <div className="docform-header-left">
        {rows.map((row, ri) => (
          <div key={ri} className="docform-grid-row">
            {row.cells.map((cell, ci) => {
              const span = cell.span ?? 2
              return (
                <div
                  key={ci}
                  className={`docform-span-${span} ${cell.required ? 'docform-field-required' : ''}`}
                  style={{ display: 'contents' }}
                >
                  {cell.label && (
                    <div className="docform-label" title={cell.label}>
                      {cell.label}:
                    </div>
                  )}
                  <div className={`docform-field`} style={{ gridColumn: cell.label ? undefined : `span ${span - 1}` }}>
                    {cell.field}
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {/* Khối phải — status + tổng */}
      <div className="docform-header-right">
        {rightRows.map((row, ri) => (
          <div key={ri} className={`docform-right-row ${row.required ? 'docform-field-required' : ''}`}>
            <span className="docform-right-label">{row.label}:</span>
            <span className={row.bold ? 'docform-right-value-bold' : 'docform-right-value'}>
              {row.value}
            </span>
          </div>
        ))}
        {rightExtra}
      </div>
    </div>
  )
}