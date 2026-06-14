import { Routes, Route, Navigate } from 'react-router-dom'
import LeadsList from './LeadsList'
import LeadDetail from './LeadDetail'
import OpportunitiesList from './OpportunitiesList'
import OpportunityDetail from './OpportunityDetail'
import CrmReportsPage from './CrmReportsPage'

export default function CrmPage() {
  return (
    <Routes>
      <Route path="leads" element={<LeadsList />} />
      <Route path="leads/:id" element={<LeadDetail />} />
      <Route path="opportunities" element={<OpportunitiesList />} />
      <Route path="opportunities/:id" element={<OpportunityDetail />} />
      <Route path="reports" element={<CrmReportsPage />} />
      <Route path="*" element={<Navigate to="/crm/leads" replace />} />
    </Routes>
  )
}