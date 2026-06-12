import { useAuthStore } from '../stores/auth'

export interface PermissionEntry {
  subjectType: string
  subjectCode: string
  action: string
}

export function usePermissions() {
  const user = useAuthStore((s) => s.user)

  const can = (subjectType: string, subjectCode: string, action: string): boolean => {
    if (!user) return false
    if (user.isAdmin) return true
    if (!user.permissions || user.permissions.length === 0) return false

    // Check for wildcard permission
    if (user.permissions.some((p: PermissionEntry) =>
      p.subjectType === '*' && p.subjectCode === '*' && p.action === '*'
    )) return true

    return user.permissions.some((p: PermissionEntry) =>
      p.subjectType === subjectType &&
      p.subjectCode === subjectCode &&
      p.action === action
    )
  }

  const canView = can
  const canCreate = (subjectType: string, subjectCode: string) => can(subjectType, subjectCode, 'CREATE')
  const canUpdate = (subjectType: string, subjectCode: string) => can(subjectType, subjectCode, 'UPDATE')
  const canDelete = (subjectType: string, subjectCode: string) => can(subjectType, subjectCode, 'DELETE')

  return { can, canView, canCreate, canUpdate, canDelete, isAdmin: user?.isAdmin ?? false }
}
