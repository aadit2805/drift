'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { FinancialProfile, UserInputs } from '@/types'

interface WhatIfScenario {
  name: string
  description: string
  savingsPerMonth: number
  projectedSuccessProbability: number
  implementationTips: string[]
}

interface WhatIfScenariosProps {
  currentSuccessProbability: number
  goalAmount: number
  medianOutcome: number
  timelineMonths: number
  financialProfile: FinancialProfile
  userInputs: UserInputs
}

export function WhatIfScenarios({
  currentSuccessProbability,
  goalAmount,
  medianOutcome,
  timelineMonths,
  financialProfile,
  userInputs,
}: WhatIfScenariosProps) {
  const [scenarios, setScenarios] = useState<WhatIfScenario[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchScenarios = async () => {
      try {
        setIsLoading(true)
        const shortfall = Math.max(0, goalAmount - medianOutcome)
        
        if (shortfall <= 0) {
          setScenarios([])
          setIsLoading(false)
          return
        }

        const response = await fetch('http://localhost:3001/api/whatif/scenarios', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            request: {
              financialProfile,
              userInputs,
              goal: {
                targetAmount: goalAmount,
                timelineMonths,
              },
            },
            currentSuccessProbability,
            gap: shortfall,
          }),
        })


       if (!response.ok) {
         console.error('API Response not OK:', response.status, response.statusText)
          throw new Error('Failed to fetch what-if scenarios')
        }

        const data = await response.json()
        setScenarios(data)
      } catch (err) {
        console.error('Error fetching what-if scenarios:', err)
        setError('Could not generate alternative scenarios')
      } finally {
        setIsLoading(false)
      }
    }

    fetchScenarios()
  }, [goalAmount, medianOutcome, timelineMonths, financialProfile, userInputs, currentSuccessProbability])

  if (isLoading) {
    return (
      <div className="card p-6 mb-8">
        <div className="mb-4">
          <h2 className="font-medium">Alternative Strategies</h2>
          <p className="text-sm text-[var(--text-tertiary)]">Analyzing different approaches...</p>
        </div>
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-[var(--text-tertiary)] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  if (error || scenarios.length === 0) {
    return null
  }

  return (
    <div className="card p-6 mb-8">
      <div className="mb-6">
        <h2 className="font-medium">Alternative Strategies</h2>
        <p className="text-sm text-[var(--text-tertiary)]">Ways to improve your success probability</p>
      </div>

      <div className="space-y-4">
        {scenarios.map((scenario, idx) => {
          const improvement = scenario.projectedSuccessProbability - currentSuccessProbability
          const improvementPercent = Math.round(improvement * 1000) / 10
          const isIncomeScenario = /increase income/i.test(scenario.name)
          const isSpendIncrease = /increase spending/i.test(scenario.name) || scenario.savingsPerMonth < 0
          const isNegativeMove = isSpendIncrease || improvement < 0

          return (
            <div key={idx} className="border border-[var(--border-primary)] rounded-lg p-4 hover:bg-[var(--surface-secondary)]">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-medium text-[var(--text-primary)]">{scenario.name}</h3>
                  <p className="text-sm text-[var(--text-secondary)] mt-1">{scenario.description}</p>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-[var(--text-secondary)]">
                    {Math.round(currentSuccessProbability * 100)}% → {Math.round(scenario.projectedSuccessProbability * 100)}%
                  </div>
                  {improvement !== 0 && (
                    <div className={`flex items-center gap-1 text-sm font-medium mt-1 ${isNegativeMove ? 'text-red-600' : 'text-green-600'}`}>
                      {isNegativeMove ? <TrendingDown className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
                      {isNegativeMove ? '-' : '+'}{Math.abs(improvementPercent)}%
                    </div>
                  )}
                </div>
              </div>

              <div className="mb-3 p-3 bg-[var(--surface-secondary)] rounded">
                <p className="text-sm">
                  <span className="text-[var(--text-tertiary)]">{isIncomeScenario ? 'Monthly increase needed: ' : isSpendIncrease ? 'Monthly spending increase: ' : 'Monthly savings: '}</span>
                  <span className={`font-medium ${isNegativeMove ? 'text-red-600' : 'text-green-600'}`}>{formatCurrency(Math.abs(scenario.savingsPerMonth))}</span>
                </p>
              </div>

              {scenario.implementationTips.length > 0 && (
                <div>
                  <p className="text-xs text-[var(--text-tertiary)] mb-2">How to implement:</p>
                  <ul className="text-sm text-[var(--text-secondary)] space-y-1">
                    {scenario.implementationTips.map((tip, tipIdx) => (
                      <li key={tipIdx} className="flex gap-2">
                        <span className="text-[var(--text-tertiary)]">•</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
