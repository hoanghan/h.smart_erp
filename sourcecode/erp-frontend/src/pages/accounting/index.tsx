import { Navigate, Route, Routes } from 'react-router-dom'
import PlaceholderPage from '../../components/PlaceholderPage'
import AccountsPage from './AccountsPage'
import PeriodsPage from './PeriodsPage'
import OpeningBalancesPage from './OpeningBalancesPage'
import LerpVouchersPage from './LerpVouchersPage'
import VouchersListPage from './VouchersListPage'
import VoucherNewPage from './VoucherNewPage'
import VoucherDetailPage from './VoucherDetailPage'

const BACKEND_TODO = 'Chưa hỗ trợ - cần backend task 07'

export default function AccountingPage() {
  return (
    <Routes>
      <Route index element={<Navigate to="accounts" replace />} />
      <Route path="accounts" element={<AccountsPage />} />
      <Route path="periods" element={<PeriodsPage />} />
      <Route path="opening-balances" element={<OpeningBalancesPage />} />
      <Route path="lerp" element={<LerpVouchersPage />} />
      <Route path="vouchers" element={<VouchersListPage />} />
      <Route path="vouchers/new" element={<VoucherNewPage />} />
      <Route path="vouchers/:id" element={<VoucherDetailPage />} />
      <Route path="assets" element={<PlaceholderPage title="Tài sản cố định" description={BACKEND_TODO} />} />
      <Route path="vat-invoices" element={<PlaceholderPage title="Hóa đơn GTGT" description={BACKEND_TODO} />} />
      <Route path="closing" element={<PlaceholderPage title="Kết chuyển cuối kỳ" description={BACKEND_TODO} />} />
    </Routes>
  )
}
