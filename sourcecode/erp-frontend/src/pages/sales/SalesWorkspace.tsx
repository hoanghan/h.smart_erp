import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { KPICard } from '../../components/KPICard'
import { apiClient } from '../../api/client'
import type { PageResult } from '../../api/types'

async function fetchTotal(endpoint: string, params?: Record<string, unknown>): Promise<number> {
  const res = await apiClient.get<PageResult<unknown>>(endpoint, { params: { size: 1, ...params } })
  return res.data.total
}

export default function SalesWorkspace() {
  const navigate = useNavigate()

  const quotations = useQuery({ queryKey: ['sales-ws', 'quotations'], queryFn: () => fetchTotal('/sales/quotations') })
  const orders = useQuery({ queryKey: ['sales-ws', 'orders'], queryFn: () => fetchTotal('/sales/orders') })
  const pendingOrders = useQuery({ queryKey: ['sales-ws', 'pending'], queryFn: () => fetchTotal('/sales/orders', { status: 'Pending' }) })

  return (
    <div style={{ padding: '24px', background: 'var(--bg-app)', minHeight: '100%' }}>
      <h2 style={{ marginBottom: '24px', color: 'var(--text-1)' }}>Bán hàng</h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <KPICard title="Tổng báo giá" value={quotations.data ?? 0} icon="📋" loading={quotations.isLoading} onClick={() => navigate('/sales/quotations')} />
        <KPICard title="Tổng đơn hàng" value={orders.data ?? 0} icon="🛒" loading={orders.isLoading} onClick={() => navigate('/sales/orders')} />
        <KPICard title="Đơn chờ duyệt" value={pendingOrders.data ?? 0} icon="⏳" loading={pendingOrders.isLoading} onClick={() => navigate('/sales/orders?status=Pending')} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
        <div style={{ background: 'var(--bg-surface)', padding: '20px', borderRadius: 'var(--radius)', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ marginBottom: '16px', color: 'var(--text-1)' }}>Tạo nhanh</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              { label: 'Tạo báo giá mới', path: '/sales/quotations/new' },
              { label: 'Tạo đơn hàng', path: '/sales/orders/new' },
              { label: 'Quản lý khách hàng', path: '/crm/customers' },
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
              { label: 'Tất cả đơn hàng', path: '/sales/orders' },
              { label: 'Đơn chờ duyệt', path: '/sales/orders?status=Pending' },
              { label: 'Báo cáo bán hàng', path: '/reports/sales' },
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
