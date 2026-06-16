import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { KPICard } from '../../components/KPICard'
import { apiClient } from '../../api/client'
import type { PageResult } from '../../api/types'

async function fetchTotal(endpoint: string): Promise<number> {
  const res = await apiClient.get<PageResult<unknown>>(endpoint, { params: { size: 1 } })
  return res.data.total
}

export default function InventoryWorkspace() {
  const navigate = useNavigate()

  const receipts = useQuery({ queryKey: ['inv-ws', 'receipts'], queryFn: () => fetchTotal('/inventory/receipts') })
  const issues = useQuery({ queryKey: ['inv-ws', 'issues'], queryFn: () => fetchTotal('/inventory/issues') })

  return (
    <div style={{ padding: '24px', background: 'var(--bg-app)', minHeight: '100%' }}>
      <h2 style={{ marginBottom: '24px', color: 'var(--text-1)' }}>Kho hàng</h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <KPICard title="Phiếu nhập kho" value={receipts.data ?? 0} icon="📦" loading={receipts.isLoading} onClick={() => navigate('/inventory/receipts')} />
        <KPICard title="Phiếu xuất kho" value={issues.data ?? 0} icon="📤" loading={issues.isLoading} onClick={() => navigate('/inventory/issues')} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
        <div style={{ background: 'var(--bg-surface)', padding: '20px', borderRadius: 'var(--radius)', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ marginBottom: '16px', color: 'var(--text-1)' }}>Tạo nhanh</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              { label: 'Tạo phiếu nhập kho', path: '/inventory/receipts/new' },
              { label: 'Tạo phiếu xuất kho', path: '/inventory/issues/new' },
              { label: 'Quản lý vật tư', path: '/masterdata/items' },
            ].map(s => (
              <button
                key={s.path}
                onClick={() => navigate(s.path)}
                style={{
                  padding: '12px',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  background: 'white',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ background: 'var(--bg-surface)', padding: '20px', borderRadius: 'var(--radius)', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ marginBottom: '16px', color: 'var(--text-1)' }}>Xem nhanh</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              { label: 'Tất cả phiếu nhập', path: '/inventory/receipts' },
              { label: 'Tất cả phiếu xuất', path: '/inventory/issues' },
              { label: 'Báo cáo tồn kho', path: '/reports/inventory' },
            ].map(s => (
              <button
                key={s.path}
                onClick={() => navigate(s.path)}
                style={{
                  padding: '12px',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  background: 'white',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
