import { useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Modal } from 'antd'

const CONFIRM_TITLE = 'Rời khỏi trang?'
const CONFIRM_CONTENT = 'Dữ liệu chưa lưu sẽ bị mất nếu rời khỏi trang. Bạn có chắc muốn tiếp tục?'

/**
 * Dirty-state guard cho DocForm:
 * - Cảnh báo trình duyệt (beforeunload) khi đóng/tải lại tab lúc form chưa lưu.
 * - Chặn click vào liên kết điều hướng nội bộ (Sidebar/Breadcrumb...), hỏi xác nhận trước khi rời trang.
 * - `guardAction` để bọc các hành động "Đóng"/quay lại trong chính trang.
 */
export function useDirtyGuard(isDirty: boolean) {
  const navigate = useNavigate()

  useEffect(() => {
    if (!isDirty) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  useEffect(() => {
    if (!isDirty) return
    const handler = (e: MouseEvent) => {
      const link = (e.target as HTMLElement)?.closest('a[href]') as HTMLAnchorElement | null
      if (!link || link.target === '_blank') return
      const url = new URL(link.href, window.location.href)
      if (url.origin !== window.location.origin) return
      if (url.pathname === window.location.pathname) return
      e.preventDefault()
      e.stopPropagation()
      Modal.confirm({
        title: CONFIRM_TITLE,
        content: CONFIRM_CONTENT,
        okText: 'Rời khỏi',
        cancelText: 'Ở lại',
        onOk: () => navigate(url.pathname + url.search + url.hash),
      })
    }
    document.addEventListener('click', handler, true)
    return () => document.removeEventListener('click', handler, true)
  }, [isDirty, navigate])

  const guardAction = useCallback((action: () => void) => {
    if (!isDirty) {
      action()
      return
    }
    Modal.confirm({
      title: CONFIRM_TITLE,
      content: CONFIRM_CONTENT,
      okText: 'Rời khỏi',
      cancelText: 'Ở lại',
      onOk: action,
    })
  }, [isDirty])

  return { guardAction }
}
