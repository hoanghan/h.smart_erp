import { ButtonComponent } from '@syncfusion/ej2-react-buttons'

interface EmptyStateProps {
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
}

export function EmptyState({ title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div style={{ textAlign: 'center', padding: '64px 24px' }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
      <h3 style={{ color: 'var(--text-1)', marginBottom: '8px' }}>{title}</h3>
      {description && <p style={{ color: 'var(--text-2)', marginBottom: '24px' }}>{description}</p>}
      {actionLabel && onAction && (
        <ButtonComponent isPrimary onClick={onAction}>
          {actionLabel}
        </ButtonComponent>
      )}
    </div>
  )
}
