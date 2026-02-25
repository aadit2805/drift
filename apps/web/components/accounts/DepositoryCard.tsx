'use client'

import { Wallet, PiggyBank } from 'lucide-react'
import { Card } from '@/components/ui/card'
import type { DepositoryAccount } from '@/types'

interface DepositoryCardProps {
  account: DepositoryAccount
}

export function DepositoryCard({ account }: DepositoryCardProps) {
  const isChecking = account.subtype === 'checking'
  const Icon = isChecking ? Wallet : PiggyBank
  const iconColor = isChecking ? 'text-[hsl(var(--accent))]' : 'text-[var(--success)]'

  return (
    <Card className="p-4 bg-card/60 backdrop-blur-sm border-border/50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Icon className={`w-5 h-5 ${iconColor}`} />
          <div>
            <p className="font-medium text-sm">{account.name}</p>
            <p className="text-xs text-muted-foreground capitalize">{account.subtype}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-medium tabular-nums text-[var(--success)]">
            ${account.balance.toLocaleString()}
          </p>
          {account.available !== null && account.available !== account.balance && (
            <p className="text-xs text-muted-foreground">
              ${account.available.toLocaleString()} available
            </p>
          )}
        </div>
      </div>
    </Card>
  )
}
