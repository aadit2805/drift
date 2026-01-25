'use client'

import { Wallet, CreditCard, TrendingDown, PiggyBank } from 'lucide-react'

interface FinancialSummaryProps {
  data: {
    liquidAssets: number
    creditDebt: number
    monthlySpending: number
    monthlyIncome: number
    savingsRate: number
  }
}

export function FinancialSummary({ data }: FinancialSummaryProps) {
  const items = [
    {
      label: 'Liquid Assets',
      value: data.liquidAssets,
      icon: <Wallet className="w-5 h-5" />,
      color: 'text-[var(--success)]',
      bgColor: 'bg-[var(--success-muted)]',
    },
    {
      label: 'Credit Debt',
      value: data.creditDebt,
      icon: <CreditCard className="w-5 h-5" />,
      color: 'text-[var(--error)]',
      bgColor: 'bg-[var(--error-muted)]',
      negative: true,
    },
    {
      label: 'Monthly Spending',
      value: data.monthlySpending,
      icon: <TrendingDown className="w-5 h-5" />,
      color: 'text-[var(--warning)]',
      bgColor: 'bg-[var(--warning-muted)]',
    },
    {
      label: 'Savings Rate',
      value: data.savingsRate,
      icon: <PiggyBank className="w-5 h-5" />,
      color: 'text-[var(--accent)]',
      bgColor: 'bg-[var(--accent-muted)]',
      isPercentage: true,
    },
  ]

  return (
    <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-primary)] p-6">
      <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
        Your Financial Snapshot
      </h3>
      <p className="text-sm text-[var(--text-secondary)] mb-6">
        Data pulled from your connected accounts
      </p>

      <div className="grid grid-cols-2 gap-4">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex items-center gap-3 p-4 bg-[var(--bg-tertiary)] rounded-lg"
          >
            <div
              className={`w-10 h-10 ${item.bgColor} ${item.color} rounded-lg flex items-center justify-center`}
            >
              {item.icon}
            </div>
            <div>
              <p className="text-sm text-[var(--text-secondary)]">{item.label}</p>
              <p className={`text-lg font-bold ${item.color}`}>
                {item.negative && '-'}
                {item.isPercentage
                  ? `${item.value}%`
                  : `$${item.value.toLocaleString()}`}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Net Position */}
      <div className="mt-6 pt-6 border-t border-[var(--border-primary)]">
        <div className="flex justify-between items-center">
          <span className="text-[var(--text-secondary)]">Net Position</span>
          <span
            className={`text-xl font-bold ${
              data.liquidAssets - data.creditDebt >= 0
                ? 'text-[var(--success)]'
                : 'text-[var(--error)]'
            }`}
          >
            ${(data.liquidAssets - data.creditDebt).toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  )
}
