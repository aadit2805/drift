'use client'

import { Home, Car, GraduationCap, Landmark } from 'lucide-react'
import { Card } from '@/components/ui/card'
import type { LoanAccountType } from '@/types'

interface LoanCardProps {
  account: LoanAccountType
}

export function LoanCard({ account }: LoanCardProps) {
  const getIcon = () => {
    if (account.type === 'mortgage' || account.subtype === 'mortgage') {
      return <Home className="w-5 h-5 text-orange-500" />
    }
    if (account.subtype === 'auto') {
      return <Car className="w-5 h-5 text-[hsl(var(--accent))]" />
    }
    if (account.subtype === 'student') {
      return <GraduationCap className="w-5 h-5 text-purple-500" />
    }
    return <Landmark className="w-5 h-5 text-[var(--error)]" />
  }

  // Calculate progress - cap between 0-100%
  // Balance can exceed original due to interest accrual
  const progressPercent = account.originalAmount && account.originalAmount > 0
    ? Math.max(0, Math.min(100, Math.round(((account.originalAmount - account.balance) / account.originalAmount) * 100)))
    : 0

  // Don't show progress if balance > original (no meaningful progress to show)
  const showProgress = account.originalAmount && account.balance <= account.originalAmount

  return (
    <Card className="p-4 bg-card/60 backdrop-blur-sm border-border/50">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          {getIcon()}
          <div>
            <p className="font-medium text-sm">{account.name}</p>
            <p className="text-xs text-muted-foreground capitalize">
              {account.subtype} {account.type}
            </p>
          </div>
        </div>
        <p className="font-medium tabular-nums text-[var(--error)]">
          ${account.balance.toLocaleString()}
        </p>
      </div>

      <div className="space-y-2">
        {showProgress && (
          <>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Paid off</span>
              <span className="text-[var(--success)]">{progressPercent}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-[var(--success)] rounded-full transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </>
        )}

        <div className="flex justify-between text-xs pt-2">
          <span className="text-muted-foreground">Interest Rate</span>
          <span>{account.interestRate.toFixed(2)}%</span>
        </div>

        {account.monthlyPayment > 0 && (
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Monthly Payment</span>
            <span>${account.monthlyPayment.toLocaleString()}</span>
          </div>
        )}

        {account.expectedPayoffDate && (
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Expected Payoff</span>
            <span>{new Date(account.expectedPayoffDate).toLocaleDateString()}</span>
          </div>
        )}
      </div>
    </Card>
  )
}
