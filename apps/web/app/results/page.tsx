'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowUpRight, ArrowDownRight, AlertCircle } from 'lucide-react'
import { ResultsChart } from '@/components/ResultsChart'
import { SensitivityTable } from '@/components/SensitivityTable'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { SensitivityAnalysis, FinancialProfile, ParsedGoal, SimulationAssumptions } from '@/types'

function formatCurrency(value: number): string {
  const num = Number(value) || 0
  const rounded = Math.round(num)
  const abs = Math.abs(rounded)

  if (abs >= 1000000) {
    const millions = abs / 1000000
    const formatted = millions >= 10 ? Math.round(millions) : millions.toFixed(1).replace(/\.0$/, '')
    return rounded < 0 ? `-$${formatted}M` : `$${formatted}M`
  }
  if (abs >= 10000) {
    const thousands = abs / 1000
    const formatted = thousands >= 100 ? Math.round(thousands) : thousands.toFixed(1).replace(/\.0$/, '')
    return rounded < 0 ? `-$${formatted}K` : `$${formatted}K`
  }

  if (rounded < 0) {
    return `-$${abs.toLocaleString()}`
  }
  return `$${rounded.toLocaleString()}`
}

function formatCurrencyWithSign(value: number): string {
  const num = Number(value) || 0
  const rounded = Math.round(num)
  const abs = Math.abs(rounded)

  if (abs >= 1000000) {
    const millions = abs / 1000000
    const formatted = millions >= 10 ? Math.round(millions) : millions.toFixed(1).replace(/\.0$/, '')
    return rounded < 0 ? `-$${formatted}M` : `+$${formatted}M`
  }
  if (abs >= 10000) {
    const thousands = abs / 1000
    const formatted = thousands >= 100 ? Math.round(thousands) : thousands.toFixed(1).replace(/\.0$/, '')
    return rounded < 0 ? `-$${formatted}K` : `+$${formatted}K`
  }

  if (rounded < 0) {
    return `-$${abs.toLocaleString()}`
  }
  return `+$${rounded.toLocaleString()}`
}

interface Results {
  successProbability: number
  medianOutcome: number
  percentiles: { p10: number; p25: number; p50: number; p75: number; p90: number }
  goalAmount: number
  timelineMonths: number
  mean?: number
  std?: number
  worstCase?: number
  bestCase?: number
  assumptions?: SimulationAssumptions
}

interface StoredResults {
  results: Results
  sensitivity: SensitivityAnalysis | null
  parsedGoal: ParsedGoal
  financialProfile: FinancialProfile
  assumptions?: SimulationAssumptions
  timestamp: number
}

export default function ResultsPage() {
  const router = useRouter()
  const [results, setResults] = useState<Results | null>(null)
  const [sensitivity, setSensitivity] = useState<SensitivityAnalysis | null>(null)
  const [parsedGoal, setParsedGoal] = useState<ParsedGoal | null>(null)
  const [financialProfile, setFinancialProfile] = useState<FinancialProfile | null>(null)
  const [assumptions, setAssumptions] = useState<SimulationAssumptions | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  const [nSimulations, setNSimulations] = useState(10000)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    const customerId = localStorage.getItem('customerId')
    if (!customerId) {
      router.push('/login')
      return
    }
    setIsAuthenticated(true)
  }, [router])

  useEffect(() => {
    if (!isAuthenticated) return
    const storedData = localStorage.getItem('simulationResults')

    if (!storedData) {
      setError('No simulation results found. Please run a simulation first.')
      return
    }

    try {
      const data: StoredResults = JSON.parse(storedData)

      const oneHour = 60 * 60 * 1000
      if (Date.now() - data.timestamp > oneHour) {
        console.warn('Simulation results are older than 1 hour')
      }

      setResults(data.results)
      setSensitivity(data.sensitivity)
      setParsedGoal(data.parsedGoal)
      setFinancialProfile(data.financialProfile)
      setAssumptions(data.results?.assumptions || data.assumptions)
    } catch (err) {
      console.error('Failed to parse stored results:', err)
      setError('Failed to load simulation results. Please run a new simulation.')
    }
  }, [isAuthenticated])

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="w-full max-w-lg">
          <Card className="p-6">
            <div className="flex items-center gap-3 text-[var(--error)] mb-4">
              <AlertCircle className="w-5 h-5" />
              <span className="font-medium">No Results Found</span>
            </div>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Button asChild className="w-full">
              <Link href="/onboarding">Start a simulation</Link>
            </Button>
          </Card>
        </div>
      </div>
    )
  }

  if (!results) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const delta = results.medianOutcome - results.goalAmount
  const deltaPositive = delta >= 0

  const formatCurrencyLocal = (value: number) => `$${Math.round(value).toLocaleString()}`

  const buildCategoryRecommendations = () => {
    if (!financialProfile || !financialProfile.spendingByCategory) return [] as string[]

    const nonEssentialKeywords = ['dining', 'restaurant', 'food & drink', 'entertainment', 'shopping', 'travel', 'subscription', 'coffee', 'bar', 'alcohol']
    const candidates = Object.entries(financialProfile.spendingByCategory)
      .filter(([name]) => nonEssentialKeywords.some(k => name.toLowerCase().includes(k)))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)

    if (candidates.length === 0) return []

    return candidates.map(([name, amount]) => {
      const cutRate = 0.15
      const monthlyCut = amount * cutRate
      const totalCut = monthlyCut * (results.timelineMonths || 1)
      return `Trim ${name} by ${Math.round(cutRate * 100)}% (~${formatCurrencyLocal(monthlyCut)}/mo) to free ${formatCurrencyLocal(totalCut)} over your timeline.`
    })
  }

  const recommendations = [...buildCategoryRecommendations(), ...(sensitivity?.recommendations || [])]

  const spendingSensitivity = sensitivity?.sensitivities?.spending_minus_10

  const buildCategoryScenarios = () => {
    if (!financialProfile || !financialProfile.spendingByCategory) return [] as { label: string; change: string; newProb: number; impact: number }[]

    const nonEssentialKeywords = ['dining', 'restaurant', 'food & drink', 'entertainment', 'shopping', 'travel', 'subscription', 'coffee', 'bar', 'alcohol']
    const candidates = Object.entries(financialProfile.spendingByCategory)
      .filter(([name]) => nonEssentialKeywords.some(k => name.toLowerCase().includes(k)))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)

    const totalSpend = Math.max(financialProfile.monthlySpending || 0, 1)
    const baseProb = results.successProbability

    return candidates.map(([name, amount]) => {
      const cutRate = 0.15
      const overallCutFraction = (amount * cutRate) / totalSpend
      const estimatedImpact = spendingSensitivity ? spendingSensitivity.impact * (overallCutFraction / 0.10) : 0
      const newProb = Math.min(1, Math.max(0, baseProb + estimatedImpact))
      return {
        label: `Cut ${name}`,
        change: `${Math.round(cutRate * 100)}% in ${name} (~${formatCurrencyLocal(amount * cutRate)}/mo)`,
        newProb,
        impact: estimatedImpact,
      }
    })
  }

  const categoryScenarios = buildCategoryScenarios()

  const goalNeedsClarification = parsedGoal?.clarifyingQuestions && parsedGoal.clarifyingQuestions.length > 0

  const effectiveIncome = financialProfile?.monthlyIncome || 0

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-6 h-6 bg-[hsl(var(--accent))] rounded" />
            <span className="font-medium">FutureCast</span>
          </Link>
          <span className="text-muted-foreground">/</span>
          <span className="text-muted-foreground">Results</span>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/onboarding">
            <ArrowLeft className="w-4 h-4" />
            New simulation
          </Link>
        </Button>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {goalNeedsClarification && (
          <Card className="p-4 mb-6 bg-[var(--warning-muted)] border-[var(--warning)]">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-[var(--warning)] mt-0.5" />
              <div>
                <p className="font-medium">Goal needs more detail</p>
                <p className="text-sm text-muted-foreground">We had to make assumptions because the goal was vague. Add a specific dollar target and timeline for better accuracy.</p>
              </div>
            </div>
          </Card>
        )}

        {/* Summary */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="p-5">
            <p className="text-sm text-muted-foreground mb-1">Success probability</p>
            <p className="text-4xl font-medium tabular-nums">{Math.round(results.successProbability * 100)}%</p>
            <p className="text-xs text-muted-foreground mt-1">of reaching goal</p>
          </Card>
          <Card className="p-5">
            <p className="text-sm text-muted-foreground mb-1">Expected outcome</p>
            <p className="text-4xl font-medium tabular-nums">{formatCurrency(results.medianOutcome)}</p>
            <p className="text-xs text-muted-foreground mt-1">50th percentile</p>
          </Card>
          <Card className="p-5">
            <p className="text-sm text-muted-foreground mb-1">Goal</p>
            <p className="text-4xl font-medium tabular-nums">{formatCurrency(results.goalAmount)}</p>
            <p className="text-xs text-muted-foreground mt-1">in {results.timelineMonths} months</p>
          </Card>
          <Card className="p-5">
            <p className="text-sm text-muted-foreground mb-1">Gap</p>
            <p className={`text-4xl font-medium tabular-nums ${deltaPositive ? 'text-[var(--success)]' : 'text-[var(--error)]'}`}>
              {formatCurrencyWithSign(delta)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">median vs goal</p>
          </Card>
        </div>

        {/* Distribution */}
        <Card className="p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-medium">Outcome distribution</h2>
              <p className="text-sm text-muted-foreground">Based on {nSimulations.toLocaleString()} simulations</p>
            </div>
          </div>

          <table className="table mb-6">
            <thead>
              <tr>
                <th>Percentile</th>
                <th>Outcome</th>
                <th>vs Goal</th>
              </tr>
            </thead>
            <tbody>
              {[
                { label: '10th (pessimistic)', value: results.percentiles.p10 },
                { label: '25th', value: results.percentiles.p25 },
                { label: '50th (expected)', value: results.percentiles.p50 },
                { label: '75th', value: results.percentiles.p75 },
                { label: '90th (optimistic)', value: results.percentiles.p90 },
              ].map((row) => {
                const diff = row.value - results.goalAmount
                const positive = diff >= 0
                return (
                  <tr key={row.label}>
                    <td className="text-muted-foreground">{row.label}</td>
                    <td className="font-medium tabular-nums">{formatCurrency(row.value)}</td>
                    <td>
                      <Badge variant={positive ? 'success' : 'error'}>
                        {positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {formatCurrencyWithSign(diff)}
                      </Badge>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          <ResultsChart
            percentiles={results.percentiles}
            goalAmount={results.goalAmount}
            timelineMonths={results.timelineMonths}
          />
        </Card>

        {/* Sensitivity */}
        <Card className="p-6 mb-8">
          <div className="mb-6">
            <h2 className="font-medium">What-if analysis</h2>
            <p className="text-sm text-muted-foreground">How changes affect your probability</p>
          </div>
          <SensitivityTable
            baseProbability={results.successProbability}
            sensitivityData={sensitivity}
            recommendations={recommendations}
            customScenarios={categoryScenarios}
          />
        </Card>

        {/* Assumptions */}
        <Card className="p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-medium">Assumptions</h2>
              <p className="text-sm text-muted-foreground">How we interpreted your data and goal</p>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Monthly income (from Nessie)</p>
              <p className="font-medium">{formatCurrencyLocal(effectiveIncome)}/mo</p>
              {assumptions?.salaryDetails?.notes && assumptions.salaryDetails.notes.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1">{assumptions.salaryDetails.notes[0]}</p>
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Spending baseline</p>
              <p className="font-medium">{financialProfile ? `${formatCurrencyLocal(financialProfile.monthlySpending || 0)}/mo` : 'Not available'}</p>
              {financialProfile?.spendingVolatility !== undefined && (
                <p className="text-xs text-muted-foreground mt-1">Volatility {Math.round(financialProfile.spendingVolatility * 100)}%</p>
              )}
            </div>
          </div>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-8">
          Results are estimates based on Monte Carlo simulation with {nSimulations.toLocaleString()} scenarios. Past performance does not guarantee future results.
        </p>
      </div>
    </div>
  )
}
