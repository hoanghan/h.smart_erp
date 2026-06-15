interface SkeletonProps {
  rows?: number
  height?: string
}

export function GridSkeleton({ rows = 5, height = '48px' }: SkeletonProps) {
  return (
    <div style={{ padding: '16px' }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          style={{
            height,
            background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s infinite',
            marginBottom: '8px',
            borderRadius: 'var(--radius)',
          }}
        />
      ))}
    </div>
  )
}

export function FormSkeleton() {
  return (
    <div style={{ padding: '24px' }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} style={{ marginBottom: '16px' }}>
          <div
            style={{
              height: '20px',
              width: '30%',
              background: '#f0f0f0',
              marginBottom: '8px',
              borderRadius: 'var(--radius)',
            }}
          />
          <div
            style={{
              height: '40px',
              background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
              backgroundSize: '200% 100%',
              animation: 'shimmer 1.5s infinite',
              borderRadius: 'var(--radius)',
            }}
          />
        </div>
      ))}
    </div>
  )
}
