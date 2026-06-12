import { useCallback, useState, type ReactNode } from 'react'
import { Dropdown } from 'antd'
import type { MenuProps } from 'antd'

/**
 * GridContextMenu — Context menu (chuột phải) trên lưới, LeanSCRM style.
 * Items disable theo trạng thái + quyền, có phím tắt hiển thị.
 */

export interface ContextMenuItem {
  /** Nhãn hiển thị */
  label: string
  /** Phím tắt hiển thị (không xử lý, chỉ hiện) */
  shortcut?: string
  /** Click handler */
  onClick?: () => void
  /** Disabled */
  disabled?: boolean
  /** Danger style */
  danger?: boolean
}

export interface ContextMenuGroup {
  /** Nhãn submenu */
  label?: string
  /** Các item */
  items: ContextMenuItem[]
}

interface GridContextMenuProps {
  /** Danh sách nhóm items, phân cách bằng divider */
  groups: ContextMenuGroup[]
  /** Nội dung bao bọc (table/div) */
  children: ReactNode
}

export default function GridContextMenu({ groups, children }: GridContextMenuProps) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 })

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setPos({ x: e.clientX, y: e.clientY })
    setOpen(true)
  }, [])

  const menuItems: MenuProps['items'] = groups.flatMap((group, gi) => {
    const items: NonNullable<MenuProps['items']> = group.items.map((item, ii) => {
      if (group.label && ii === 0 && gi > 0) {
        // Submenu support: nếu group có label → tạo submenu
      }
      return {
        key: `${gi}-${ii}`,
        label: item.shortcut ? `${item.label} (${item.shortcut})` : item.label,
        onClick: () => {
          setOpen(false)
          item.onClick?.()
        },
        disabled: item.disabled,
        danger: item.danger,
      }
    })

    // Thêm divider giữa các group (trừ group đầu)
    if (gi > 0) {
      return [{ type: 'divider' as const, key: `div-${gi}` }, ...items]
    }
    return items
  })

  return (
    <Dropdown
      menu={{ items: menuItems }}
      trigger={['contextMenu']}
      open={open}
      onOpenChange={setOpen}
      // Force position at cursor
      overlayStyle={{ position: 'fixed', left: pos.x, top: pos.y, zIndex: 1050 }}
    >
      <div onContextMenu={handleContextMenu}>
        {children}
      </div>
    </Dropdown>
  )
}