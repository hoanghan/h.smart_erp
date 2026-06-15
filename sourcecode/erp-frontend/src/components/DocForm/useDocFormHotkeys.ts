import { useEffect } from 'react'

interface DocFormHotkeysOptions {
  /** Ctrl+S / Cmd+S */
  onSave?: () => void
  enabled?: boolean
}

/** Phím tắt chuẩn cho DocForm: Ctrl+S lưu. (Esc đóng dialog dùng hành vi mặc định của antd Modal/Drawer). */
export function useDocFormHotkeys({ onSave, enabled = true }: DocFormHotkeysOptions) {
  useEffect(() => {
    if (!enabled) return
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        onSave?.()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onSave, enabled])
}
