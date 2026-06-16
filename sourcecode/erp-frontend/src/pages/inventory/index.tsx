import { Route, Routes } from 'react-router-dom'
import InventoryWorkspace from './InventoryWorkspace'
import ReceiptsListPage from './ReceiptsList'
import IssuesListPage from './IssuesList'
import TransfersListPage from './TransfersList'
import StockDocDetailPage from './StockDocDetail'
import StockDocNewPage from './StockDocNew'
import StockBalancePage from './StockBalance'
import StockMovesPage from './StockMoves'

export default function InventoryPage() {
  return (
    <Routes>
      <Route index element={<InventoryWorkspace />} />
      <Route path="receipts" element={<ReceiptsListPage />} />
      <Route path="issues" element={<IssuesListPage />} />
      <Route path="transfers" element={<TransfersListPage />} />
      <Route path="docs/new" element={<StockDocNewPage />} />
      <Route path="docs/:id" element={<StockDocDetailPage />} />
      <Route path="stock" element={<StockBalancePage />} />
      <Route path="moves" element={<StockMovesPage />} />
    </Routes>
  )
}