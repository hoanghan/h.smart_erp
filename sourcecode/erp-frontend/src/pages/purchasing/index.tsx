import { Navigate, Route, Routes } from 'react-router-dom'
import PurchaseRequestsListPage from './PurchaseRequestsList'
import PurchaseRequestDetailPage from './PurchaseRequestDetail'
import PurchaseRequestNewPage from './PurchaseRequestNew'
import PurchaseOrdersListPage from './PurchaseOrdersList'
import PurchaseOrderDetailPage from './PurchaseOrderDetail'
import PurchaseOrderNewPage from './PurchaseOrderNew'
import PurchasingPaymentsListPage from './PurchasingPaymentsList'
import SupplierReturnsListPage from './SupplierReturnsList'
import SupplierReturnDetailPage from './SupplierReturnDetail'
import SupplierReturnNewPage from './SupplierReturnNew'

export default function PurchasingPage() {
  return (
    <Routes>
      <Route path="requests" element={<PurchaseRequestsListPage />} />
      <Route path="requests/new" element={<PurchaseRequestNewPage />} />
      <Route path="requests/:id" element={<PurchaseRequestDetailPage />} />
      <Route path="orders" element={<PurchaseOrdersListPage />} />
      <Route path="orders/new" element={<PurchaseOrderNewPage />} />
      <Route path="orders/:id" element={<PurchaseOrderDetailPage />} />
      <Route path="payments" element={<PurchasingPaymentsListPage />} />
      <Route path="supplier-returns" element={<SupplierReturnsListPage />} />
      <Route path="supplier-returns/new" element={<SupplierReturnNewPage />} />
      <Route path="supplier-returns/:id" element={<SupplierReturnDetailPage />} />
      <Route index element={<Navigate to="requests" replace />} />
    </Routes>
  )
}
