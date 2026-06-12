import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { Spin } from 'antd'
import AdminGuard from './AdminGuard'

const UsersPage = lazy(() => import('./UsersPage'))
const GroupsPage = lazy(() => import('./GroupsPage'))
const PermissionsPage = lazy(() => import('./PermissionsPage'))
const DocNumberingPage = lazy(() => import('./DocNumberingPage'))
const CompanyInfoPage = lazy(() => import('./CompanyInfoPage'))
const AuditLogPage = lazy(() => import('./AuditLogPage'))

const fallback = (
  <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
    <Spin size="large" />
  </div>
)

export default function AdminPage() {
  return (
    <AdminGuard>
      <Suspense fallback={fallback}>
        <Routes>
          <Route index element={<Navigate to="/admin/users" replace />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="groups" element={<GroupsPage />} />
          <Route path="permissions" element={<PermissionsPage />} />
          <Route path="doc-numbering" element={<DocNumberingPage />} />
          <Route path="company-info" element={<CompanyInfoPage />} />
          <Route path="audit-log" element={<AuditLogPage />} />
        </Routes>
      </Suspense>
    </AdminGuard>
  )
}