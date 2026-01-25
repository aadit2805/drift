'use client'

import { ArrowUpRight, ArrowDownRight, ArrowRight } from 'lucide-react'
import type { SensitivityAnalysis } from '@/types'

interface SensitivityTableProps {
  baseProbability: number
  sensitivityData?: SensitivityAnalysis | null
  recommendations?: string[]
  customScenarios?: ScenarioRow[]
}

interface ScenarioRow {
  label: string
  change: string
  newProb: number
  impact: number
}

export function SensitivityTable({ baseProbability, sensitivityData, recommendations, customScenarios }: SensitivityTableProps) {
  // Convert API sensitivity data to display format
  const apiScenarios: ScenarioRow[] = sensitivityData?.sensitivities
    ? Object.entries(sensitivityData.sensitivities)
        .filter(([param]) => !param.startsWith('income_'))
        .map(([param, data]) => {
          const labelMap: Record<string, string> = {
            'spending_minus_10': 'Reduce total spending by 10%',
            'spending_plus_10': 'Increase total spending by 10%',
            'timeline_plus_6mo': 'Extend timeline by 6 months',
          }

          const changeMap: Record<string, string> = {
            'spending_minus_10': '-10% total spending',
            'spending_plus_10': '+10% total spending',
            'timeline_plus_6mo': '+6 months',
          }

          return {
            label: labelMap[param] || param.replace(/_/g, ' '),
            change: changeMap[param] || `${data.delta > 0 ? '+' : ''}${Math.round(data.delta * 100)}%`,
            newProb: data.newProbability,
            impact: data.impact,
          }
        })
    : []

  const combinedScenarios = [...(customScenarios || []), ...apiScenarios]
    .sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact))
    .slice(0, 5)

  const topActions = combinedScenarios.slice(0, 2)
  if (combinedScenarios.length === 0) {
    return (
      <div className="text-center py-8 text-[var(--text-tertiary)]">
        <p>Sensitivity analysis not available for this simulation.</p>
        <p className="text-sm mt-2">Run a new simulation to generate what-if scenarios.</p>
      </div>
    )
  }

  return (
    <table className="table">
      <thead>
        <tr>
          <th>Scenario</th>
          <th>Change</th>
          <th>Probability</th>
          <th>Impact</th>
        </tr>
      </thead>
      <tbody>
        <tr className="bg-[var(--bg-tertiary)]">
          <td className="font-medium">Current plan</td>
          <td className="text-[var(--text-tertiary)]">-</td>
          <td className="font-medium tabular-nums">{Math.round(baseProbability * 100)}%</td>
          <td className="text-[var(--text-tertiary)]">-</td>
        </tr>
        {combinedScenarios.map((s) => {
          const impactRounded = Math.round(s.impact * 100)
          const isPositive = impactRounded > 0
          const isNegative = impactRounded < 0
          const isNeutral = impactRounded === 0

          // Determine badge style and icon
          let badgeClass = 'badge-success'
          let Icon = ArrowUpRight
          if (isNegative) {
            badgeClass = 'badge-error'
            Icon = ArrowDownRight
          } else if (isNeutral) {
            badgeClass = 'badge-warning'
            Icon = ArrowRight
          }

          return (
            <tr key={s.label}>
              <td className="text-[var(--text-secondary)]">{s.label}</td>
              <td>
                <span className={isPositive ? 'text-[var(--success)]' : isNegative ? 'text-[var(--error)]' : 'text-[var(--warning)]'}>
                  {s.change}
                </span>
              </td>
              <td className="font-medium tabular-nums">{Math.round(s.newProb * 100)}%</td>
              <td>
                <span className={`badge ${badgeClass}`}>
                  <Icon className="w-3 h-3" />
                  {isPositive ? '+' : ''}{impactRounded}%
                </span>
              </td>
            </tr>
          )
        })}
      </tbody>
      {topActions.length > 0 && (
        <tfoot>
          <tr>
            <td colSpan={4} className="pt-4">
              <p className="text-sm font-medium mb-3">Highest-impact moves</p>
              <div className="grid md:grid-cols-2 gap-3">
                {topActions.map((action, i) => {
                  const impactRounded = Math.round(action.impact * 100)
                  const isPositive = impactRounded > 0
                  const isNegative = impactRounded < 0
                  const isNeutral = impactRounded === 0

                  let badgeClass = 'badge-success'
                  let Icon = ArrowUpRight
                  if (isNegative) {
                    badgeClass = 'badge-error'
                    Icon = ArrowDownRight
                  } else if (isNeutral) {
                    badgeClass = 'badge-warning'
                    Icon = ArrowRight
                  }

                  return (
                    <div key={i} className="p-3 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-tertiary)]">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{action.label}</span>
                        <span className={`badge ${badgeClass}`}>
                          <Icon className="w-3 h-3" />
                          {isPositive ? '+' : ''}{impactRounded}%
                        </span>
                      </div>
                      <p className="text-xs text-[var(--text-secondary)]">{action.change}</p>
                    </div>
                  )
                })}
              </div>
            </td>
          </tr>
        </tfoot>
      )}
    </table>
  )
}
