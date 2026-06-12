import { Navigate, Route, Routes } from 'react-router-dom'
import UomsPage from './Uoms'
import PaymentMethodsPage from './PaymentMethods'
import DeliveryMethodsPage from './DeliveryMethods'
import ProductGroupsPage from './ProductGroups'
import ProductsPage from './Products'
import PartnersPage from './Partners'
import WarehousesPage from './Warehouses'
import DepartmentsPage from './Departments'
import EmployeesPage from './Employees'

export default function MasterDataPage() {
  return (
    <Routes>
      <Route path="uoms" element={<UomsPage />} />
      <Route path="payment-methods" element={<PaymentMethodsPage />} />
      <Route path="delivery-methods" element={<DeliveryMethodsPage />} />
      <Route path="product-groups" element={<ProductGroupsPage />} />
      <Route path="products" element={<ProductsPage />} />
      <Route path="partners" element={<PartnersPage />} />
      <Route path="warehouses" element={<WarehousesPage />} />
      <Route path="departments" element={<DepartmentsPage />} />
      <Route path="employees" element={<EmployeesPage />} />
      <Route index element={<Navigate to="products" replace />} />
    </Routes>
  )
}
