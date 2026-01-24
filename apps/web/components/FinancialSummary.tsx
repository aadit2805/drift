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
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      label: 'Credit Debt',
      value: data.creditDebt,
      icon: <CreditCard className="w-5 h-5" />,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      negative: true,
    },
    {
      label: 'Monthly Spending',
      value: data.monthlySpending,
      icon: <TrendingDown className="w-5 h-5" />,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
    {
      label: 'Savings Rate',
      value: data.savingsRate,
      icon: <PiggyBank className="w-5 h-5" />,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      isPercentage: true,
    },
  ]

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">
        Your Financial Snapshot
      </h3>
      <p className="text-sm text-slate-500 mb-6">
        Data pulled from your connected accounts
      </p>

      <div className="grid grid-cols-2 gap-4">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg"
          >
            <div
              className={`w-10 h-10 ${item.bgColor} ${item.color} rounded-lg flex items-center justify-center`}
            >
              {item.icon}
            </div>
            <div>
              <p className="text-sm text-slate-500">{item.label}</p>
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
      <div className="mt-6 pt-6 border-t border-slate-200">
        <div className="flex justify-between items-center">
          <span className="text-slate-600">Net Position</span>
          <span
            className={`text-xl font-bold ${
              data.liquidAssets - data.creditDebt >= 0
                ? 'text-green-600'
                : 'text-red-600'
            }`}
          >
            ${(data.liquidAssets - data.creditDebt).toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  )
}
