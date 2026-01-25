'use client'

import type { Assumptions } from '@/types'

interface AssumptionsDisplayProps {
  assumptions?: Assumptions
}

export function AssumptionsDisplay({ assumptions }: AssumptionsDisplayProps) {
  if (!assumptions) {
    return null
  }

  return (
    <div className="card p-6 bg-slate-50">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">Simulation Assumptions</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Investment Returns */}
        <div>
          <h4 className="text-sm font-semibold text-slate-700 mb-3">Investment Returns</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">Annual Return (mean):</span>
              <span className="font-medium">{(assumptions.annualReturnMean * 100).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Volatility (std):</span>
              <span className="font-medium">{(assumptions.annualReturnStd * 100).toFixed(1)}%</span>
            </div>
          </div>
        </div>

        {/* Inflation */}
        <div>
          <h4 className="text-sm font-semibold text-slate-700 mb-3">Inflation</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">Expected Rate:</span>
              <span className="font-medium">{(assumptions.inflationRate * 100).toFixed(2)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Volatility:</span>
              <span className="font-medium">±{(assumptions.inflationVolatility * 100).toFixed(2)}%</span>
            </div>
          </div>
        </div>

        {/* Income Growth */}
        <div>
          <h4 className="text-sm font-semibold text-slate-700 mb-3">Income Growth</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">Annual Raise:</span>
              <span className="font-medium">{(assumptions.annualRaiseMean * 100).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Frequency:</span>
              <span className="font-medium">{assumptions.annualRaiseFrequency}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Promotion (every 6 months):</span>
              <span className="font-medium">{(assumptions.promotionProbabilitySemiAnnual * 100).toFixed(0)}% chance</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Promotion Raise:</span>
              <span className="font-medium">{(assumptions.promotionRaiseMean * 100).toFixed(1)}%</span>
            </div>
          </div>
        </div>

        {/* Income & Expense Volatility */}
        <div>
          <h4 className="text-sm font-semibold text-slate-700 mb-3">Income & Spending</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">Income Volatility:</span>
              <span className="font-medium">±{(assumptions.incomeVolatility * 100).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Spending Volatility:</span>
              <span className="font-medium">±{(assumptions.expenseVolatility * 100).toFixed(1)}%</span>
            </div>
          </div>
        </div>

        {/* Shock Expenses */}
        <div className="md:col-span-2">
          <h4 className="text-sm font-semibold text-slate-700 mb-3">Emergency Expenses (Shock Events)</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">Probability per month:</span>
              <span className="font-medium">{(assumptions.emergencyProbabilityMonthly * 100).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Amount range:</span>
              <span className="font-medium">{assumptions.emergencyAmountRange}</span>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Average 1 emergency event per {(1 / assumptions.emergencyProbabilityMonthly / 12).toFixed(0)} years
            </p>
          </div>
        </div>
      </div>

      <p className="text-xs text-slate-500 mt-4 pt-4 border-t border-slate-200">
        These assumptions are used to generate 100,000 Monte Carlo scenarios to estimate your probability of success.
      </p>
    </div>
  )
}
