import { ReactNode } from 'react'

interface InsightCardProps {
  icon: ReactNode
  title: string
  value: string
  description: string
  variant: 'default' | 'success' | 'warning' | 'danger'
}

export function InsightCard({
  icon,
  title,
  value,
  description,
  variant = 'default',
}: InsightCardProps) {
  const valueColors = {
    default: '',
    success: 'text-[var(--success)]',
    warning: 'text-[var(--warning)]',
    danger: 'text-[var(--error)]',
  }

  return (
    <div className="card p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className="text-[var(--text-tertiary)]">{icon}</div>
        <span className="text-sm text-[var(--text-secondary)]">{title}</span>
      </div>
      <p className={`text-2xl font-medium tabular-nums mb-1 ${valueColors[variant]}`}>
        {value}
      </p>
      <p className="text-sm text-[var(--text-tertiary)]">{description}</p>
    </div>
  )
}
