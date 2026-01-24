'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, TrendingUp, AlertTriangle, Lightbulb, RefreshCw, Sparkles, Target, Zap } from 'lucide-react'
import { ResultsChart } from '@/components/ResultsChart'
import { SensitivityTable } from '@/components/SensitivityTable'
import { InsightCard } from '@/components/InsightCard'

interface SimulationResults {
  successProbability: number
  medianOutcome: number
  percentiles: {
    p10: number
    p25: number
    p50: number
    p75: number
    p90: number
  }
  goalAmount: number
  timelineMonths: number
}

export default function ResultsPage() {
  const [results, setResults] = useState<SimulationResults | null>(null)

  useEffect(() => {
    // In production, this would come from the API
    // For now, generate mock results
    const mockResults: SimulationResults = {
      successProbability: 0.73,
      medianOutcome: 48200,
      percentiles: {
        p10: 31000,
        p25: 39500,
        p50: 48200,
        p75: 57800,
        p90: 68500,
      },
      goalAmount: 50000,
      timelineMonths: 36,
    }
    setResults(mockResults)
  }, [])

  if (!results) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const probabilityGradient =
    results.successProbability >= 0.8
      ? 'gradient-text-success'
      : results.successProbability >= 0.6
      ? 'gradient-text'
      : 'text-red-400'

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link
            href="/"
            className="flex items-center gap-2 text-white/50 hover:text-white transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-semibold text-white">FutureCast</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/onboarding"
              className="flex items-center gap-2 text-white/50 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              New Simulation
            </Link>
            <button className="flex items-center gap-2 px-4 py-2 glass-card rounded-lg text-indigo-400 hover:text-indigo-300 transition-colors">
              <RefreshCw className="w-4 h-4" />
              Re-run
            </button>
          </div>
        </div>

        {/* Main Result Card */}
        <div className="glass-card rounded-2xl p-8 mb-8 glow">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card mb-6">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-sm text-white/70">Based on 10,000 simulations</span>
            </div>
            <h1 className="text-7xl font-bold mb-4">
              <span className={probabilityGradient}>
                {Math.round(results.successProbability * 100)}%
              </span>
            </h1>
            <p className="text-xl text-white/60">
              probability of reaching your{' '}
              <span className="font-semibold text-white">${results.goalAmount.toLocaleString()}</span> goal
              in <span className="font-semibold text-white">{results.timelineMonths} months</span>
            </p>
          </div>

          {/* Percentile Breakdown */}
          <div className="grid grid-cols-5 gap-4 mb-10">
            {Object.entries(results.percentiles).map(([key, value], index) => {
              const labels = ['Pessimistic', '25th %ile', 'Median', '75th %ile', 'Optimistic']
              const isMedian = key === 'p50'
              return (
                <div
                  key={key}
                  className={`text-center p-5 rounded-xl transition-all ${
                    isMedian
                      ? 'glass-card border-indigo-500/30'
                      : 'bg-white/[0.02] border border-white/5'
                  }`}
                >
                  <p className="text-xs text-white/40 uppercase tracking-wider mb-2">{labels[index]}</p>
                  <p className={`text-2xl font-bold ${isMedian ? 'gradient-text' : 'text-white'}`}>
                    ${(value / 1000).toFixed(1)}k
                  </p>
                  <p className="text-xs text-white/30 mt-1">{key.toUpperCase()}</p>
                </div>
              )
            })}
          </div>

          {/* Chart */}
          <div className="glass-card rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-white">Projection Over Time</h3>
                <p className="text-sm text-white/40">Confidence bands show outcome distribution</p>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500" />
                  <span className="text-white/50">Median</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-indigo-500/30" />
                  <span className="text-white/50">Confidence</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-0.5 bg-pink-500 rounded" style={{ backgroundImage: 'repeating-linear-gradient(90deg, #ec4899, #ec4899 4px, transparent 4px, transparent 8px)' }} />
                  <span className="text-white/50">Goal</span>
                </div>
              </div>
            </div>
            <ResultsChart
              percentiles={results.percentiles}
              goalAmount={results.goalAmount}
              timelineMonths={results.timelineMonths}
            />
          </div>
        </div>

        {/* Insights Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <InsightCard
            icon={<Target className="w-6 h-6" />}
            title="Most Likely Outcome"
            value={`$${results.medianOutcome.toLocaleString()}`}
            description={`Your median outcome is ${
              results.medianOutcome >= results.goalAmount ? 'above' : 'below'
            } your goal by $${Math.abs(
              results.medianOutcome - results.goalAmount
            ).toLocaleString()}`}
            variant={results.medianOutcome >= results.goalAmount ? 'success' : 'warning'}
            gradient="from-indigo-500 to-purple-500"
          />

          <InsightCard
            icon={<AlertTriangle className="w-6 h-6" />}
            title="Worst Case (10th %ile)"
            value={`$${results.percentiles.p10.toLocaleString()}`}
            description="In 10% of scenarios, you may end up with this amount or less"
            variant="warning"
            gradient="from-orange-500 to-red-500"
          />

          <InsightCard
            icon={<Zap className="w-6 h-6" />}
            title="Best Case (90th %ile)"
            value={`$${results.percentiles.p90.toLocaleString()}`}
            description="In 10% of scenarios, you could exceed this amount"
            variant="success"
            gradient="from-green-500 to-emerald-500"
          />
        </div>

        {/* Sensitivity Analysis */}
        <div className="glass-card rounded-2xl p-8 glow">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">
                What-If Analysis
              </h2>
              <p className="text-white/50">
                See how changes to your financial behavior affect your success probability
              </p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
              <TrendingUp className="w-4 h-4 text-indigo-400" />
              <span className="text-sm text-indigo-400">Sensitivity</span>
            </div>
          </div>
          <SensitivityTable baseProbability={results.successProbability} />
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-white/30 text-sm">
            Results are estimates based on Monte Carlo simulation with 10,000 scenarios.
            Past performance does not guarantee future results.
          </p>
        </div>
      </div>
    </div>
  )
}
