'use client'

import { TrendingUp, TrendingDown, Minus, Sparkles } from 'lucide-react'

interface SensitivityTableProps {
  baseProbability: number
}

interface Scenario {
  id: string
  label: string
  change: string
  newProbability: number
  impact: number
}

export function SensitivityTable({ baseProbability }: SensitivityTableProps) {
  // Mock sensitivity data - would come from API in production
  const scenarios: Scenario[] = [
    {
      id: 'income-10',
      label: 'Increase income by 10%',
      change: '+$500/mo',
      newProbability: 0.84,
      impact: 0.11,
    },
    {
      id: 'dining-20',
      label: 'Reduce dining out by 20%',
      change: '-$150/mo',
      newProbability: 0.81,
      impact: 0.08,
    },
    {
      id: 'subscriptions',
      label: 'Cancel streaming services',
      change: '-$50/mo',
      newProbability: 0.75,
      impact: 0.02,
    },
    {
      id: 'side-gig',
      label: 'Add side gig income',
      change: '+$800/mo',
      newProbability: 0.91,
      impact: 0.18,
    },
    {
      id: 'spending-10',
      label: 'Reduce all spending by 10%',
      change: '-$300/mo',
      newProbability: 0.86,
      impact: 0.13,
    },
  ]

  // Sort by impact
  const sortedScenarios = [...scenarios].sort((a, b) => b.impact - a.impact)

  return (
    <div className="overflow-hidden rounded-xl border border-white/10">
      <table className="min-w-full">
        <thead>
          <tr className="border-b border-white/10">
            <th className="px-6 py-4 text-left text-xs font-medium text-white/40 uppercase tracking-wider">
              Scenario
            </th>
            <th className="px-6 py-4 text-left text-xs font-medium text-white/40 uppercase tracking-wider">
              Change
            </th>
            <th className="px-6 py-4 text-left text-xs font-medium text-white/40 uppercase tracking-wider">
              New Probability
            </th>
            <th className="px-6 py-4 text-left text-xs font-medium text-white/40 uppercase tracking-wider">
              Impact
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {/* Current baseline */}
          <tr className="bg-indigo-500/10">
            <td className="px-6 py-4 whitespace-nowrap">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span className="text-sm font-medium text-white">Current Plan (baseline)</span>
              </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-white/40">
              -
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
              <span className="text-xl font-bold gradient-text">
                {Math.round(baseProbability * 100)}%
              </span>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-white/30">
              <Minus className="w-4 h-4" />
            </td>
          </tr>

          {/* Scenarios */}
          {sortedScenarios.map((scenario) => {
            const isPositive = scenario.impact > 0
            const impactPercent = Math.round(scenario.impact * 100)

            return (
              <tr key={scenario.id} className="hover:bg-white/[0.02] transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-white/80">
                  {scenario.label}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span
                    className={`px-2 py-1 rounded-md text-xs font-medium ${
                      scenario.change.startsWith('+')
                        ? 'bg-green-500/10 text-green-400'
                        : 'bg-orange-500/10 text-orange-400'
                    }`}
                  >
                    {scenario.change}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-xl font-semibold text-white">
                    {Math.round(scenario.newProbability * 100)}%
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium ${
                      isPositive
                        ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                        : 'bg-red-500/10 text-red-400 border border-red-500/20'
                    }`}
                  >
                    {isPositive ? (
                      <TrendingUp className="w-3.5 h-3.5" />
                    ) : (
                      <TrendingDown className="w-3.5 h-3.5" />
                    )}
                    {isPositive ? '+' : ''}
                    {impactPercent}%
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
