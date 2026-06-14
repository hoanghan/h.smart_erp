import { Routes, Route, Navigate } from 'react-router-dom'
import WorkstationsList from './WorkstationsList'
import OperationsList from './OperationsList'
import BomsList from './BomsList'
import BomDetail from './BomDetail'
import WorkOrdersList from './WorkOrdersList'
import WorkOrderDetail from './WorkOrderDetail'
import ProductionPlansList from './ProductionPlansList'
import ProductionPlanDetail from './ProductionPlanDetail'
import MfgReportsPage from './MfgReportsPage'

export default function MfgPage() {
  return (
    <Routes>
      <Route path="workstations" element={<WorkstationsList />} />
      <Route path="workstations/:id" element={<WorkstationsList />} />
      <Route path="operations" element={<OperationsList />} />
      <Route path="operations/:id" element={<OperationsList />} />
      <Route path="boms" element={<BomsList />} />
      <Route path="boms/:id" element={<BomDetail />} />
      <Route path="work-orders" element={<WorkOrdersList />} />
      <Route path="work-orders/:id" element={<WorkOrderDetail />} />
      <Route path="production-plans" element={<ProductionPlansList />} />
      <Route path="production-plans/:id" element={<ProductionPlanDetail />} />
      <Route path="reports" element={<MfgReportsPage />} />
      <Route path="*" element={<Navigate to="/mfg/boms" replace />} />
    </Routes>
  )
}