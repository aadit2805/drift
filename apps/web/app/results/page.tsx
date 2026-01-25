'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowUpRight, ArrowDownRight, AlertCircle } from 'lucide-react'
import { ResultsChart } from '@/components/ResultsChart'
import { SensitivityTable } from '@/components/SensitivityTable'
import { WhatIfScenarios } from '@/components/WhatIfScenarios'
import type { SensitivityAnalysis, FinancialProfile, ParsedGoal, SimulationAssumptions, Assumptions, UserInputs } from '@/types'

// Hardcoded assumptions - these are constant for all simulations
const HARDCODED_ASSUMPTIONS: Assumptions = {
  annualReturnMean: 0.05,
  annualReturnStd: 0.12,
  inflationRate: 0.025,
  inflationVolatility: 0.01,
  annualRaiseMean: 0.04,
  annualRaiseFrequency: 'annual',
  promotionProbabilitySemiAnnual: 0.1,
  promotionRaiseMean: 0.07,
  emergencyProbabilityMonthly: 0.05,
  emergencyAmountRange: '$500–$2,000',
  incomeVolatility: 0.05,
  expenseVolatility: 0.08,
}

// Format currency with proper negative handling
function formatCurrency(value: number): string {
  // Ensure it's a valid number and round it
  const num = Number(value) || 0
  const rounded = Math.round(num)
  const abs = Math.abs(rounded)

  // For large numbers, use compact notation
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

// Format currency with +/- sign
function formatCurrencyWithSign(value: number): string {
  // Ensure it's a valid number and round it
  const num = Number(value) || 0
  const rounded = Math.round(num)
  const abs = Math.abs(rounded)

  // For large numbers, use compact notation
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

  // Auth check
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

      // Check if results are stale (older than 1 hour)
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

  // Show loading spinner while checking auth
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[var(--text-tertiary)] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="w-full max-w-lg">
          <div className="card p-6">
            <div className="flex items-center gap-3 text-[var(--error)] mb-4">
              <AlertCircle className="w-5 h-5" />
              <span className="font-medium">No Results Found</span>
            </div>
            <p className="text-[var(--text-secondary)] mb-6">{error}</p>
            <Link href="/onboarding" className="btn btn-primary w-full justify-center">
              Start a simulation
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (!results) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[var(--text-tertiary)] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const delta = results.medianOutcome - results.goalAmount
  const deltaPositive = delta >= 0

  const formatCurrency = (value: number) => `$${Math.round(value).toLocaleString()}`

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
        label: `Reduce ${name}`,
        change: `${Math.round(suggestedCut * 100)}% ($${Math.round(cutAmount)}/mo from $${Math.round(monthlyAmount)}/mo)`,
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
      <header className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-primary)]">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-6 h-6 bg-[var(--text-primary)] rounded" />
            <span className="font-medium">FutureCast</span>
          </Link>
          <span className="text-[var(--text-tertiary)]">/</span>
          <span className="text-[var(--text-secondary)]">Results</span>
        </div>
        <Link href="/onboarding" className="btn btn-secondary text-sm">
          <ArrowLeft className="w-4 h-4" />
          New simulation
        </Link>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {goalNeedsClarification && (
          <div className="card p-4 mb-6 bg-[var(--warning-bg,#FFF8E1)] border border-[var(--warning,#F59E0B)]">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-[var(--warning,#F59E0B)] mt-0.5" />
              <div>
                <p className="font-medium">Goal needs more detail</p>
                <p className="text-sm text-[var(--text-secondary)]">We had to make assumptions because the goal was vague. Add a specific dollar target and timeline for better accuracy.</p>
              </div>
            </div>
          </div>
        )}

        {/* Summary */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="card p-5">
            <p className="text-sm text-[var(--text-tertiary)] mb-1">Success probability</p>
            <p className="text-4xl font-medium tabular-nums">{Math.round(results.successProbability * 100)}%</p>
            <p className="text-xs text-[var(--text-tertiary)] mt-1">of reaching goal</p>
          </div>
          <div className="card p-5">
            <p className="text-sm text-[var(--text-tertiary)] mb-1">Expected outcome</p>
            <p className="text-4xl font-medium tabular-nums">{formatCurrency(results.medianOutcome)}</p>
            <p className="text-xs text-[var(--text-tertiary)] mt-1">50th percentile</p>
          </div>
          <div className="card p-5">
            <p className="text-sm text-[var(--text-tertiary)] mb-1">Goal</p>
            <p className="text-4xl font-medium tabular-nums">{formatCurrency(results.goalAmount)}</p>
            <p className="text-xs text-[var(--text-tertiary)] mt-1">in {results.timelineMonths} months</p>
          </div>
          <div className="card p-5">
            <p className="text-sm text-[var(--text-tertiary)] mb-1">Gap</p>
            <p className={`text-4xl font-medium tabular-nums ${deltaPositive ? 'text-[var(--success)]' : 'text-[var(--error)]'}`}>
              {formatCurrencyWithSign(delta)}
            </p>
            <p className="text-xs text-[var(--text-tertiary)] mt-1">median vs goal</p>
          </div>
        </div>


        {/* Distribution */}
        <div className="card p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-medium">Outcome distribution</h2>
              <p className="text-sm text-[var(--text-tertiary)]">Based on {nSimulations.toLocaleString()} simulations</p>
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
                    <td className="text-[var(--text-secondary)]">{row.label}</td>
                    <td className="font-medium tabular-nums">{formatCurrency(row.value)}</td>
                    <td>
                      <span className={`badge ${positive ? 'badge-success' : 'badge-error'}`}>
                        {positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {formatCurrencyWithSign(diff)}
                      </span>
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
        </div>

        {/* Sensitivity */}
        <div className="card p-6 mb-8">
          <div className="mb-6">
            <h2 className="font-medium">What-if analysis</h2>
            <p className="text-sm text-[var(--text-tertiary)]">How changes affect your probability</p>
          </div>
          <SensitivityTable
            baseProbability={results.successProbability}
            sensitivityData={sensitivity}
            recommendations={recommendations}
            customScenarios={categoryScenarios}
          />
        </div>

        {/* Alternative Strategies - What-If Scenarios */}
        {financialProfile && userInputs && (
          <WhatIfScenarios
            currentSuccessProbability={results.successProbability}
            goalAmount={results.goalAmount}
            medianOutcome={results.medianOutcome}
            timelineMonths={results.timelineMonths}
            financialProfile={financialProfile}
            userInputs={userInputs}
          />
        )}

        {/* Financial Profile & Simulation Assumptions - Combined Dashboard */}
        <div className="card p-6 mb-8">
          <div className="mb-6">
            <h2 className="font-medium">Your Financial Profile &amp; Model Assumptions</h2>
            <p className="text-sm text-[var(--text-tertiary)]">How we interpreted your data and what we assume about the future</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-6">
            {/* Key Metrics */}
            <div className="p-4 rounded-lg border border-[var(--border-primary)]">
              <p className="text-xs text-[var(--text-tertiary)] mb-2">Monthly Income</p>
              <p className="text-2xl font-medium tabular-nums">{formatCurrency(effectiveIncome)}</p>
              <p className="text-xs text-[var(--text-tertiary)] mt-1">per month</p>
            </div>
            <div className="p-4 rounded-lg border border-[var(--border-primary)]">
              <p className="text-xs text-[var(--text-tertiary)] mb-2">Monthly Spending</p>
              <p className="text-2xl font-medium tabular-nums">
                {financialProfile ? formatCurrency(financialProfile.monthlySpending || 0) : 'N/A'}
              </p>
              {financialProfile?.spendingVolatility !== undefined && (
                <p className="text-xs text-[var(--text-tertiary)] mt-1">±{Math.round(financialProfile.spendingVolatility * 100)}% volatility</p>
              )}
            </div>
            <div className="p-4 rounded-lg border border-[var(--border-primary)]">
              <p className="text-xs text-[var(--text-tertiary)] mb-2">Net Monthly</p>
              <p className="text-2xl font-medium tabular-nums">
                {formatCurrency(effectiveIncome - (financialProfile?.monthlySpending || 0))}
              </p>
              <p className="text-xs text-[var(--text-tertiary)] mt-1">savings rate</p>
            </div>
          </div>

          <div className="border-t border-[var(--border-primary)] pt-6">
            <h3 className="text-sm font-medium mb-4">Economic &amp; Career Assumptions</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg border-l-4 border-l-gray-400 bg-[var(--surface-secondary)]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-[var(--text-tertiary)] mb-1">Inflation Rate</p>
                    <p className="text-2xl font-medium tabular-nums">2.5%</p>
                    <p className="text-xs text-[var(--text-tertiary)] mt-1">±1% volatility</p>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-lg border-l-4 border-l-green-500 bg-[var(--surface-secondary)]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-[var(--text-tertiary)] mb-1">Annual Raises</p>
                    <p className="text-2xl font-medium tabular-nums">4%</p>
                    <p className="text-xs text-[var(--text-tertiary)] mt-1">Average yearly</p>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-lg border-l-4 border-l-blue-500 bg-[var(--surface-secondary)]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-[var(--text-tertiary)] mb-1">Investment Returns</p>
                    <p className="text-2xl font-medium tabular-nums">5%</p>
                    <p className="text-xs text-[var(--text-tertiary)] mt-1">±12% volatility</p>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-lg border-l-4 border-l-purple-500 bg-[var(--surface-secondary)]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-[var(--text-tertiary)] mb-1">Promotion Chance</p>
                    <p className="text-2xl font-medium tabular-nums">10%</p>
                    <p className="text-xs text-[var(--text-tertiary)] mt-1">Every 6 months (+7% raise)</p>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-lg border-l-4 border-l-orange-500 bg-[var(--surface-secondary)]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-[var(--text-tertiary)] mb-1">Emergency Risk</p>
                    <p className="text-2xl font-medium tabular-nums">5%</p>
                    <p className="text-xs text-[var(--text-tertiary)] mt-1">Per month (~0.6/year)</p>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-lg border-l-4 border-l-red-500 bg-[var(--surface-secondary)]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-[var(--text-tertiary)] mb-1">Emergency Size</p>
                    <p className="text-xl font-medium">$500–$2K</p>
                    <p className="text-xs text-[var(--text-tertiary)] mt-1">When it happens</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-[var(--text-tertiary)] mt-8">
          Results are estimates based on Monte Carlo simulation with {nSimulations.toLocaleString()} scenarios. Past performance does not guarantee future results.
        </p>
      </div>
    </div>
  )
}
