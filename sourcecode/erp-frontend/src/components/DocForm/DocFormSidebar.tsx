import type { ReactNode } from 'react'
import { Tag } from 'antd'
import Timeline from '../Timeline'

export interface DocFormInfoRow {
  label: string
  value: ReactNode
}

export interface DocFormTimelineItem {
  timestamp: string
  type: 'ACTIVITY' | 'STATUS_CHANGE'
  description: string
  actor: ReactNode
  metadata: { status?: string; dueDate?: string }
}

interface DocFormSidebarProps {
  statusLabel: string
  statusColor?: string
  statusReason?: string | null
  /** Người tạo/duyệt, ngày... hiển thị dạng label/value */
  infoRows?: DocFormInfoRow[]
  tags?: string[]
  /** Hoạt động/timeline (tái dùng Timeline.tsx) */
  timeline?: DocFormTimelineItem[]
}

/** Sidebar phải của DocForm: trạng thái workflow, thông tin người tạo/duyệt, tags, timeline. */
export default function DocFormSidebar({
  statusLabel, statusColor, statusReason, infoRows = [], tags, timeline,
}: DocFormSidebarProps) {
  return (
    <div className="docform-sidebar-content">
      <div className="docform-sidebar-section">
        <div className="docform-sidebar-title">Trạng thái</div>
        <Tag color={statusColor} style={{ fontSize: 13, padding: '2px 10px' }}>{statusLabel}</Tag>
        {statusReason && <div className="docform-sidebar-reason">{statusReason}</div>}
      </div>

      {infoRows.length > 0 && (
        <div className="docform-sidebar-section">
          <div className="docform-sidebar-title">Thông tin</div>
          {infoRows.map((row, i) => (
            <div key={i} className="docform-sidebar-row">
              <span className="docform-sidebar-label">{row.label}</span>
              <span className="docform-sidebar-value">{row.value}</span>
            </div>
          ))}
        </div>
      )}

      {tags && tags.length > 0 && (
        <div className="docform-sidebar-section">
          <div className="docform-sidebar-title">Tags</div>
          {tags.map((tag) => <Tag key={tag}>{tag}</Tag>)}
        </div>
      )}

      {timeline && (
        <div className="docform-sidebar-section docform-sidebar-timeline">
          <Timeline title="Hoạt động" timeline={timeline} />
        </div>
      )}
    </div>
  )
}
