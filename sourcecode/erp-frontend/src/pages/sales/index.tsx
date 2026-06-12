import { Navigate, Route, Routes } from 'react-router-dom'
import QuotationsListPage from './QuotationsList'
import QuotationDetailPage from './QuotationDetail'
import QuotationNewPage from './QuotationNew'
import SalesOrdersListPage from './SalesOrdersList'
import SalesOrderDetailPage from './SalesOrderDetail'

export default function SalesPage() {
  return (
    <Routes>
      <Route path="quotations" element={<QuotationsListPage />} />
      <Route path="quotations/new" element={<QuotationNewPage />} />
      <Route path="quotations/:id" element={<QuotationDetailPage />} />
      <Route path="orders" element={<SalesOrdersListPage />} />
      <Route path="orders/:id" element={<SalesOrderDetailPage />} />
      <Route index element={<Navigate to="quotations" replace />} />
    </Routes>
  )
}
