'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowUpRight, ArrowDownRight, AlertCircle } from 'lucide-react'
import { ResultsChart } from '@/components/ResultsChart'
import { SensitivityTable } from '@/components/SensitivityTable'
import type { SensitivityAnalysis } from '@/types'

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
}

interface StoredResults {
  results: Results
  sensitivity: SensitivityAnalysis | null
  parsedGoal: {
    goalType: string
    targetAmount: number
    timelineMonths: number
  }
  financialProfile: {
    liquidAssets: number
    monthlySpending: number
  }
  timestamp: number
}

export default function ResultsPage() {
  const router = useRouter()
  const [results, setResults] = useState<Results | null>(null)
  const [sensitivity, setSensitivity] = useState<SensitivityAnalysis | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [nSimulations, setNSimulations] = useState(10000)
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
        <div className="card p-6">
          <div className="mb-6">
            <h2 className="font-medium">What-if analysis</h2>
            <p className="text-sm text-[var(--text-tertiary)]">How changes affect your probability</p>
          </div>
          <SensitivityTable
            baseProbability={results.successProbability}
            sensitivityData={sensitivity}
          />
        </div>

        <p className="text-center text-xs text-[var(--text-tertiary)] mt-8">
          Results are estimates based on Monte Carlo simulation with {nSimulations.toLocaleString()} scenarios. Past performance does not guarantee future results.
        </p>
      </div>
    </div>
  )
}
