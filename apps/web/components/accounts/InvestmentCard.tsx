'use client'

import { TrendingUp, Briefcase, PiggyBank } from 'lucide-react'
import { Card } from '@/components/ui/card'
import type { InvestmentAccountType } from '@/types'

interface InvestmentCardProps {
  account: InvestmentAccountType
}

export function InvestmentCard({ account }: InvestmentCardProps) {
  const getIcon = () => {
    if (account.subtype === '401k' || account.subtype === 'ira') {
      return <PiggyBank className="w-5 h-5 text-[var(--success)]" />
    }
    if (account.subtype === 'brokerage') {
      return <Briefcase className="w-5 h-5 text-[hsl(var(--accent))]" />
    }
    return <TrendingUp className="w-5 h-5 text-[var(--success)]" />
  }

  const allocationData = [
    { name: 'Stocks', value: account.allocation.stocks, color: '#22c55e' },
    { name: 'Bonds', value: account.allocation.bonds, color: '#3b82f6' },
    { name: 'Cash', value: account.allocation.cash, color: '#a855f7' },
    { name: 'Other', value: account.allocation.other, color: '#6b7280' },
  ].filter(d => d.value > 0)

  return (
    <Card className="p-4 bg-card/60 backdrop-blur-sm border-border/50">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          {getIcon()}
          <div>
            <p className="font-medium text-sm">{account.name}</p>
            <p className="text-xs text-muted-foreground capitalize">{account.subtype}</p>
          </div>
        </div>
        <p className="font-medium tabular-nums text-[var(--success)]">
          ${account.balance.toLocaleString()}
        </p>
      </div>

      {/* Allocation breakdown */}
      {allocationData.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Allocation</p>
          <div className="h-2 bg-muted rounded-full overflow-hidden flex">
            {allocationData.map((item, idx) => (
              <div
                key={item.name}
                className="h-full transition-all"
                style={{
                  width: `${item.value * 100}%`,
                  backgroundColor: item.color,
                  borderRadius: idx === 0 ? '9999px 0 0 9999px' : idx === allocationData.length - 1 ? '0 9999px 9999px 0' : '0',
                }}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {allocationData.map((item) => (
              <div key={item.name} className="flex items-center gap-1 text-xs">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-muted-foreground">{item.name}</span>
                <span>{Math.round(item.value * 100)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top holdings */}
      {account.holdings.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border/50">
          <p className="text-xs text-muted-foreground mb-2">Top Holdings</p>
          <div className="space-y-1">
            {account.holdings.slice(0, 3).map((holding, idx) => (
              <div key={idx} className="flex justify-between text-xs">
                <span className="truncate flex-1">
                  {holding.symbol || holding.name || 'Unknown'}
                </span>
                <span className="tabular-nums ml-2">
                  ${holding.value.toLocaleString()}
                </span>
              </div>
            ))}
            {account.holdings.length > 3 && (
              <p className="text-xs text-muted-foreground">
                +{account.holdings.length - 3} more
              </p>
            )}
          </div>
        </div>
      )}
    </Card>
  )
}
