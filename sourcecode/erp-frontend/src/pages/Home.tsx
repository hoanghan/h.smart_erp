import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { DashboardLayoutComponent } from '@syncfusion/ej2-react-layouts'
import { ChartComponent, SeriesCollectionDirective, SeriesDirective, Inject, ColumnSeries, Category, Legend, Tooltip } from '@syncfusion/ej2-react-charts'
import { KPICard } from '../components/KPICard'
import { apiClient } from '../api/client'
import type { PageResult } from '../api/types'

async function fetchTotal(endpoint: string): Promise<number> {
  const res = await apiClient.get<PageResult<unknown>>(endpoint, { params: { size: 1 } })
  return res.data.total
}

export default function HomePage() {
  const navigate = useNavigate()

  const quotations = useQuery({ queryKey: ['dashboard', 'quotations'], queryFn: () => fetchTotal('/sales/quotations') })
  const orders = useQuery({ queryKey: ['dashboard', 'orders'], queryFn: () => fetchTotal('/sales/orders') })
  const receipts = useQuery({ queryKey: ['dashboard', 'receipts'], queryFn: () => fetchTotal('/inventory/receipts') })

  const revenueData = [
    { month: 'T1', revenue: 45000 },
    { month: 'T2', revenue: 52000 },
    { month: 'T3', revenue: 48000 },
    { month: 'T4', revenue: 61000 },
    { month: 'T5', revenue: 55000 },
    { month: 'T6', revenue: 67000 }
  ]

  const panels = [
    { sizeX: 2, sizeY: 1, row: 0, col: 0, content: 'kpi-cards' },
    { sizeX: 2, sizeY: 1, row: 1, col: 0, content: 'revenue-chart' },
    { sizeX: 2, sizeY: 1, row: 2, col: 0, content: 'shortcuts' },
  ]

  return (
    <div style={{ padding: '24px', background: 'var(--bg-app)', minHeight: '100%' }}>
      <h2 style={{ marginBottom: '24px', color: 'var(--text-1)' }}>Smart ERP — Trang chủ</h2>

      <DashboardLayoutComponent
        columns={2}
        cellSpacing={[16, 16]}
        allowResizing={false}
        panels={panels}
      >
        <div id="kpi-cards">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
            <KPICard
              title="Báo giá"
              value={quotations.data ?? 0}
              icon="📋"
              loading={quotations.isLoading}
              onClick={() => navigate('/sales/quotations')}
            />
            <KPICard
              title="Đơn hàng bán"
              value={orders.data ?? 0}
              icon="🛒"
              loading={orders.isLoading}
              onClick={() => navigate('/sales/orders')}
            />
            <KPICard
              title="Phiếu nhập kho"
              value={receipts.data ?? 0}
              icon="📦"
              loading={receipts.isLoading}
              onClick={() => navigate('/inventory/receipts')}
            />
          </div>
        </div>

        <div id="revenue-chart">
          <div style={{ background: 'var(--bg-surface)', padding: '20px', borderRadius: 'var(--radius)', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h3 style={{ marginBottom: '16px', color: 'var(--text-1)' }}>Doanh thu 6 tháng</h3>
            <ChartComponent primaryXAxis={{ valueType: 'Category' }} tooltip={{ enable: true }}>
              <Inject services={[ColumnSeries, Category, Legend, Tooltip]} />
              <SeriesCollectionDirective>
                <SeriesDirective dataSource={revenueData} xName="month" yName="revenue" type="Column" name="Doanh thu" />
              </SeriesCollectionDirective>
            </ChartComponent>
          </div>
        </div>

        <div id="shortcuts">
          <div style={{ background: 'var(--bg-surface)', padding: '20px', borderRadius: 'var(--radius)', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h3 style={{ marginBottom: '16px', color: 'var(--text-1)' }}>Tạo nhanh</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
              {[
                { label: 'Báo giá', path: '/sales/quotations/new', icon: '📋' },
                { label: 'Đơn hàng', path: '/sales/orders/new', icon: '🛒' },
                { label: 'Phiếu nhập', path: '/inventory/receipts/new', icon: '📦' },
                { label: 'Khách hàng', path: '/crm/customers/new', icon: '👤' },
              ].map(s => (
                <button
                  key={s.path}
                  onClick={() => navigate(s.path)}
                  style={{
                    padding: '16px',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    background: 'white',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--brand-600)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)' }}
                >
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>{s.icon}</div>
                  <div style={{ fontSize: '14px', color: 'var(--text-1)' }}>{s.label}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </DashboardLayoutComponent>
    </div>
  )
}
