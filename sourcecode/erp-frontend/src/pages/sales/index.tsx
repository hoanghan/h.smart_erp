import { Navigate, Route, Routes } from 'react-router-dom'
import SalesWorkspace from './SalesWorkspace'
import QuotationsListPage from './QuotationsList'
import QuotationDetailPage from './QuotationDetail'
import QuotationNewPage from './QuotationNew'
import SalesOrdersListPage from './SalesOrdersList'
import SalesOrderDetailPage from './SalesOrderDetail'
import PromotionalSchemesListPage from './PromotionalSchemesList'
import PromotionalSchemeDetailPage from './PromotionalSchemeDetail'
import PricingRulesPage from './PricingRulesPage'
import CouponsPage from './CouponsPage'
import PriceCheckPage from './PriceCheckPage'

export default function SalesPage() {
  return (
    <Routes>
      <Route index element={<SalesWorkspace />} />
      <Route path="quotations" element={<QuotationsListPage />} />
      <Route path="quotations/new" element={<QuotationNewPage />} />
      <Route path="quotations/:id" element={<QuotationDetailPage />} />
      <Route path="orders" element={<SalesOrdersListPage />} />
      <Route path="orders/:id" element={<SalesOrderDetailPage />} />
      <Route path="promotional-schemes" element={<PromotionalSchemesListPage />} />
      <Route path="promotional-schemes/:id" element={<PromotionalSchemeDetailPage />} />
      <Route path="pricing-rules" element={<PricingRulesPage />} />
      <Route path="coupons" element={<CouponsPage />} />
      <Route path="price-check" element={<PriceCheckPage />} />
    </Routes>
  )
}
