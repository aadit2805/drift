'use client'

import { ArrowUpRight, ArrowDownRight } from 'lucide-react'
import type { SensitivityAnalysis } from '@/types'

interface SensitivityTableProps {
  baseProbability: number
  sensitivityData?: SensitivityAnalysis | null
}

interface ScenarioRow {
  label: string
  change: string
  newProb: number
  impact: number
}

export function SensitivityTable({ baseProbability, sensitivityData }: SensitivityTableProps) {
  // Convert API sensitivity data to display format
  const scenarios: ScenarioRow[] = sensitivityData?.sensitivities
    ? Object.entries(sensitivityData.sensitivities).map(([param, data]) => {
        // Format the parameter name for display
        const labelMap: Record<string, string> = {
          'income_plus_10': 'Increase income by 10%',
          'income_minus_10': 'Decrease income by 10%',
          'spending_minus_10': 'Reduce spending by 10%',
          'spending_plus_10': 'Increase spending by 10%',
          'timeline_plus_6mo': 'Extend timeline by 6 months',
        }

        const changeMap: Record<string, string> = {
          'income_plus_10': '+10% income',
          'income_minus_10': '-10% income',
          'spending_minus_10': '-10% spending',
          'spending_plus_10': '+10% spending',
          'timeline_plus_6mo': '+6 months',
        }

        return {
          label: labelMap[param] || param.replace(/_/g, ' '),
          change: changeMap[param] || `${data.delta > 0 ? '+' : ''}${Math.round(data.delta * 100)}%`,
          newProb: data.newProbability,
          impact: data.impact,
        }
      })
      // Sort by impact (highest first)
      .sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact))
      // Take top 5
      .slice(0, 5)
    : []

  // If no API data, show a message
  if (scenarios.length === 0) {
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
        {scenarios.map((s) => {
          const impactPositive = s.impact > 0
          return (
            <tr key={s.label}>
              <td className="text-[var(--text-secondary)]">{s.label}</td>
              <td>
                <span className={s.impact > 0 ? 'text-[var(--success)]' : 'text-[var(--warning)]'}>
                  {s.change}
                </span>
              </td>
              <td className="font-medium tabular-nums">{Math.round(s.newProb * 100)}%</td>
              <td>
                <span className={`badge ${impactPositive ? 'badge-success' : 'badge-error'}`}>
                  {impactPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {impactPositive ? '+' : ''}{Math.round(s.impact * 100)}%
                </span>
              </td>
            </tr>
          )
        })}
      </tbody>
      {sensitivityData?.recommendations && sensitivityData.recommendations.length > 0 && (
        <tfoot>
          <tr>
            <td colSpan={4} className="pt-4">
              <p className="text-sm font-medium mb-2">Recommendations</p>
              <ul className="text-sm text-[var(--text-secondary)] space-y-1">
                {sensitivityData.recommendations.map((rec, i) => (
                  <li key={i}>• {rec}</li>
                ))}
              </ul>
            </td>
          </tr>
        </tfoot>
      )}
    </table>
  )
}
