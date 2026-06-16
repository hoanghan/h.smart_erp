import { ReactNode } from 'react'

interface KPICardProps {
  title: string
  value: string | number
  icon?: ReactNode
  trend?: { value: number; label: string }
  onClick?: () => void
  loading?: boolean
}

export function KPICard({ title, value, icon, trend, onClick, loading }: KPICardProps) {
  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--bg-surface)',
        borderRadius: 'var(--radius)',
        padding: '20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.2s',
      }}
      onMouseEnter={(e) => onClick && (e.currentTarget.style.transform = 'translateY(-2px)')}
      onMouseLeave={(e) => onClick && (e.currentTarget.style.transform = 'translateY(0)')}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div style={{ color: 'var(--text-2)', fontSize: '14px', marginBottom: '8px' }}>{title}</div>
          {loading ? (
            <div
              style={{
                height: '32px',
                width: '60%',
                background: '#f0f0f0',
                borderRadius: 'var(--radius)',
                animation: 'shimmer 1.5s infinite',
              }}
            />
          ) : (
            <div style={{ fontSize: '32px', fontWeight: 600, color: 'var(--text-1)' }}>{value}</div>
          )}
          {trend && !loading && (
            <div
              style={{
                fontSize: '12px',
                color: trend.value >= 0 ? 'var(--ok)' : 'var(--danger)',
                marginTop: '8px',
              }}
            >
              {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
            </div>
          )}
        </div>
        {icon && <div style={{ fontSize: '32px', opacity: 0.3 }}>{icon}</div>}
      </div>
    </div>
  )
}
