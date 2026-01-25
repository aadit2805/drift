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
import type { SensitivityAnalysis, FinancialProfile, ParsedGoal, SimulationAssumptions, UserInputs, Assumptions } from '@/types'

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
  assumptions?: Assumptions
}

interface StoredResults {
  results: Results
  sensitivity: SensitivityAnalysis | null
  parsedGoal: ParsedGoal
  financialProfile: FinancialProfile
  userInputs?: UserInputs
  assumptions?: Assumptions
  timestamp: number
}

export default function ResultsPage() {
  const router = useRouter()
  const [results, setResults] = useState<Results | null>(null)
  const [sensitivity, setSensitivity] = useState<SensitivityAnalysis | null>(null)
  const [parsedGoal, setParsedGoal] = useState<ParsedGoal | null>(null)
  const [financialProfile, setFinancialProfile] = useState<FinancialProfile | null>(null)
  const [userInputs, setUserInputs] = useState<UserInputs | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [nSimulations, setNSimulations] = useState(100000)
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
      setUserInputs(data.userInputs || null)
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
    if (results.successProbability >= 0.75) return [] // Already likely to succeed

    // Calculate how much additional savings is needed
    const shortfall = results.goalAmount - results.medianOutcome
    if (shortfall <= 0) return []

    const monthlyGap = shortfall / (results.timelineMonths || 1)

    const nonEssentialKeywords = ['dining', 'restaurant', 'food & drink', 'entertainment', 'shopping', 'travel', 'subscription', 'coffee', 'bar', 'alcohol']
    
    // Convert annual spending to monthly
    const monthlySpending = Object.fromEntries(
      Object.entries(financialProfile.spendingByCategory).map(([k, v]) => [k, v / 12])
    )
    
    const candidates = Object.entries(monthlySpending)
      .filter(([name]) => nonEssentialKeywords.some(k => name.toLowerCase().includes(k)))
      .sort((a, b) => b[1] - a[1])

    if (candidates.length === 0) return []

    const recommendations: string[] = []
    let remainingGap = monthlyGap

    // Strategy 1: Find single largest category that could cover the gap
    const largestCategory = candidates[0]
    if (largestCategory) {
      const [name, monthlyAmount] = largestCategory
      const cutRate = Math.min(0.5, remainingGap / monthlyAmount) // Max 50% cut
      if (cutRate >= 0.05) { // At least 5%
        const monthlyCut = monthlyAmount * cutRate
        const totalCut = monthlyCut * (results.timelineMonths || 1)
        recommendations.push(`Reduce ${name} by ${Math.round(cutRate * 100)}% (save $${Math.round(monthlyCut)}/mo) to free ${formatCurrency(totalCut)} over ${results.timelineMonths} months.`)
        remainingGap -= monthlyCut
      }
    }

    // Strategy 2: Small cuts across multiple categories
    if (remainingGap > 0 && candidates.length >= 3) {
      const topThree = candidates.slice(0, 3)
      const perCategoryCut = remainingGap / topThree.length
      const smallCuts = topThree.map(([name, amount]) => {
        const cutRate = Math.min(0.25, perCategoryCut / amount)
        const monthlyCut = amount * cutRate
        return { name, cutRate, monthlyCut, amount }
      }).filter(c => c.cutRate >= 0.05)

      if (smallCuts.length > 0) {
        const totalSavings = smallCuts.reduce((sum, c) => sum + c.monthlyCut, 0)
        const categories = smallCuts.map(c => `${c.name} (${Math.round(c.cutRate * 100)}%, $${Math.round(c.monthlyCut)}/mo)`).join(', ')
        recommendations.push(`Alternatively, make small cuts across: ${categories} for a total of $${Math.round(totalSavings)}/mo.`)
      }
    }

    return recommendations
  }

  const recommendations = [...buildCategoryRecommendations(), ...(sensitivity?.recommendations || [])]

  const spendingSensitivity = sensitivity?.sensitivities?.spending_minus_10

  const buildCategoryScenarios = () => {
    if (!financialProfile || !financialProfile.spendingByCategory) return [] as { label: string; change: string; newProb: number; impact: number }[]

    const nonEssentialKeywords = ['dining', 'restaurant', 'food & drink', 'entertainment', 'shopping', 'travel', 'subscription', 'coffee', 'bar', 'alcohol']
    
    // Convert annual spending to monthly
    const monthlySpending = Object.fromEntries(
      Object.entries(financialProfile.spendingByCategory).map(([k, v]) => [k, v / 12])
    )
    
    const candidates = Object.entries(monthlySpending)
      .filter(([name]) => nonEssentialKeywords.some(k => name.toLowerCase().includes(k)))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)

    const totalMonthlySpend = Math.max(financialProfile.monthlySpending || 0, 1)
    const baseProb = results.successProbability

    return candidates.map(([name, monthlyAmount]) => {
      // Dynamic cut rate based on category size and gap
      const shortfall = Math.max(0, results.goalAmount - results.medianOutcome)
      const monthlyGap = shortfall / (results.timelineMonths || 1)
      const suggestedCut = Math.min(0.5, Math.max(0.1, monthlyGap / monthlyAmount))

      const cutAmount = monthlyAmount * suggestedCut
      const overallCutFraction = cutAmount / totalMonthlySpend
      const estimatedImpact = spendingSensitivity ? spendingSensitivity.impact * (overallCutFraction / 0.10) : 0.05
      const newProb = Math.min(1, Math.max(0, baseProb + estimatedImpact))

      return {
        label: `Cut ${name}`,
        change: `${Math.round(suggestedCut * 100)}% (~${formatCurrencyLocal(cutAmount)}/mo from $${Math.round(monthlyAmount)}/mo)`,
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

          <div className="grid md:grid-cols-3 gap-6 mb-6">
            {/* Key Metrics */}
            <div className="p-4 rounded-lg border border-[var(--border-primary)]">
              <p className="text-xs text-muted-foreground mb-2">Monthly Income</p>
              <p className="text-2xl font-medium tabular-nums">{formatCurrencyLocal(effectiveIncome)}</p>
              <p className="text-xs text-muted-foreground mt-1">per month</p>
            </div>
            <div className="p-4 rounded-lg border border-[var(--border-primary)]">
              <p className="text-xs text-muted-foreground mb-2">Monthly Spending</p>
              <p className="text-2xl font-medium tabular-nums">
                {financialProfile ? formatCurrencyLocal(financialProfile.monthlySpending || 0) : 'N/A'}
              </p>
              {financialProfile?.spendingVolatility !== undefined && (
                <>
                  <p className="text-xs text-muted-foreground mt-1">Volatility {Math.round(financialProfile.spendingVolatility * 100)}%</p>
                  <p className="text-xs text-[var(--text-tertiary)] mt-1">±{Math.round(financialProfile.spendingVolatility * 100)}% volatility</p>
                </>
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
