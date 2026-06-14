import { Navigate, Route, Routes } from 'react-router-dom'
import AccountsPage from './AccountsPage'
import PeriodsPage from './PeriodsPage'
import OpeningBalancesPage from './OpeningBalancesPage'
import LerpVouchersPage from './LerpVouchersPage'
import VouchersListPage from './VouchersListPage'
import VoucherNewPage from './VoucherNewPage'
import VoucherDetailPage from './VoucherDetailPage'
import OperationsPage from './OperationsPage'
import CashReceiptsPage from './CashReceiptsPage'
import CashPaymentsPage from './CashPaymentsPage'
import GeneralVouchersPage from './GeneralVouchersPage'
import AssetsPage from './AssetsPage'
import VatInvoicesPage from './VatInvoicesPage'
import ClosingPage from './ClosingPage'
import CostCentersPage from './CostCentersPage'
import PaymentAllocationPage from './PaymentAllocationPage'
import PaymentReconciliationPage from './PaymentReconciliationPage'
import FinanceReportsPage from './FinanceReportsPage'

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
      <Route path="operations" element={<OperationsPage />} />
      <Route path="cash-receipts" element={<CashReceiptsPage />} />
      <Route path="cash-payments" element={<CashPaymentsPage />} />
      <Route path="general-vouchers" element={<GeneralVouchersPage />} />
      <Route path="assets" element={<AssetsPage />} />
      <Route path="vat-invoices" element={<VatInvoicesPage />} />
      <Route path="closing" element={<ClosingPage />} />
      <Route path="cost-centers" element={<CostCentersPage />} />
      <Route path="payment-allocation" element={<PaymentAllocationPage />} />
      <Route path="payment-reconciliation" element={<PaymentReconciliationPage />} />
      <Route path="reports" element={<FinanceReportsPage />} />
    </Routes>
  )
}