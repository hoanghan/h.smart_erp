import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { Spin } from 'antd'
import AppLayout from './layout/AppLayout'
import RequireAuth from './layout/RequireAuth'
import LoginPage from './pages/Login'

const HomePage = lazy(() => import('./pages/Home'))
const SalesPage = lazy(() => import('./pages/sales'))
const PurchasingPage = lazy(() => import('./pages/purchasing'))
const InventoryPage = lazy(() => import('./pages/inventory'))
const AccountingPage = lazy(() => import('./pages/accounting'))
const MasterDataPage = lazy(() => import('./pages/masterdata'))
const AdminPage = lazy(() => import('./pages/admin'))

const fallback = (
  <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
    <Spin size="large" />
  </div>
)

function withSuspense(element: React.ReactNode) {
  return <Suspense fallback={fallback}>{element}</Suspense>
}

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route index element={withSuspense(<HomePage />)} />
          <Route path="sales/*" element={withSuspense(<SalesPage />)} />
          <Route path="purchasing/*" element={withSuspense(<PurchasingPage />)} />
          <Route path="inventory/*" element={withSuspense(<InventoryPage />)} />
          <Route path="accounting/*" element={withSuspense(<AccountingPage />)} />
          <Route path="master-data/*" element={withSuspense(<MasterDataPage />)} />
          <Route path="admin/*" element={withSuspense(<AdminPage />)} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Route>
    </Routes>
  )
}
