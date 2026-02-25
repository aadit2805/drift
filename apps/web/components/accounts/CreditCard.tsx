'use client'

import { CreditCard as CreditCardIcon } from 'lucide-react'
import { Card } from '@/components/ui/card'
import type { CreditAccountType } from '@/types'

interface CreditCardProps {
  account: CreditAccountType
}

export function CreditCard({ account }: CreditCardProps) {
  const utilizationPercent = Math.round(account.utilization * 100)
  const utilizationColor = account.utilization > 0.7
    ? 'text-[var(--error)]'
    : account.utilization > 0.3
      ? 'text-yellow-500'
      : 'text-[var(--success)]'

  const barColor = account.utilization > 0.7
    ? 'bg-[var(--error)]'
    : account.utilization > 0.3
      ? 'bg-yellow-500'
      : 'bg-[var(--success)]'

  return (
    <Card className="p-4 bg-card/60 backdrop-blur-sm border-border/50">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <CreditCardIcon className="w-5 h-5 text-[var(--error)]" />
          <div>
            <p className="font-medium text-sm">{account.name}</p>
            <p className="text-xs text-muted-foreground">Credit Card</p>
          </div>
        </div>
        <p className="font-medium tabular-nums text-[var(--error)]">
          ${account.balance.toLocaleString()}
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Utilization</span>
          <span className={utilizationColor}>
            {utilizationPercent}% of ${account.limit.toLocaleString()}
          </span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full ${barColor} rounded-full transition-all`}
            style={{ width: `${Math.min(utilizationPercent, 100)}%` }}
          />
        </div>

        <div className="flex justify-between text-xs pt-2">
          <span className="text-muted-foreground">APR</span>
          <span className="text-[var(--error)]">{account.apr.toFixed(1)}%</span>
        </div>

        {account.minimumPayment > 0 && (
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Min Payment</span>
            <span>${account.minimumPayment.toLocaleString()}</span>
          </div>
        )}
      </div>
    </Card>
  )
}
