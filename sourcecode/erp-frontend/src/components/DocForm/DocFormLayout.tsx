import type { ReactNode } from 'react'

interface DocFormLayoutProps {
  /** Thanh hành động dính trên cùng (Lưu/In/Đóng/Workflow...) */
  actionBar: ReactNode
  /** Sidebar phải: trạng thái, người tạo/duyệt, ngày, tags, timeline */
  sidebar: ReactNode
  /** Thân form: HeaderGrid + các section/tab */
  children: ReactNode
}

/** Bố cục 3 vùng cho DocForm: action bar dính trên cùng | thân | sidebar phải. */
export default function DocFormLayout({ actionBar, sidebar, children }: DocFormLayoutProps) {
  return (
    <div className="docform-layout">
      <div className="docform-actionbar">{actionBar}</div>
      <div className="docform-body">
        <div className="docform-main">{children}</div>
        <div className="docform-sidebar">{sidebar}</div>
      </div>
    </div>
  )
}
