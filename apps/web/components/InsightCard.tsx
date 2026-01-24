import { ReactNode } from 'react'

interface InsightCardProps {
  icon: ReactNode
  title: string
  value: string
  description: string
  variant: 'default' | 'success' | 'warning' | 'danger'
  gradient?: string
}

export function InsightCard({
  icon,
  title,
  value,
  description,
  variant = 'default',
  gradient = 'from-indigo-500 to-purple-500',
}: InsightCardProps) {
  const variantStyles = {
    default: {
      border: 'border-white/10',
      valueColor: 'text-white',
    },
    success: {
      border: 'border-green-500/20',
      valueColor: 'gradient-text-success',
    },
    warning: {
      border: 'border-yellow-500/20',
      valueColor: 'text-yellow-400',
    },
    danger: {
      border: 'border-red-500/20',
      valueColor: 'text-red-400',
    },
  }

  const styles = variantStyles[variant]

  return (
    <div className={`glass-card-hover rounded-2xl p-6 ${styles.border}`}>
      <div className="flex items-start gap-4">
        <div
          className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0 text-white`}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white/50 mb-1">{title}</p>
          <p className={`text-2xl font-bold ${styles.valueColor} mb-2`}>{value}</p>
          <p className="text-sm text-white/40 leading-relaxed">{description}</p>
        </div>
      </div>
    </div>
  )
}
