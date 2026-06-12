import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/auth'
import { usePermissions } from '../../utils/usePermissions'

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user)
  const { can } = usePermissions()

  if (!user) return null
  if (user.isAdmin || can('FUNCTION', 'admin', 'VIEW')) {
    return <>{children}</>
  }
  return <Navigate to="/" replace />
}
