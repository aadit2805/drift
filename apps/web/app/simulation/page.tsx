'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Check, AlertCircle } from 'lucide-react'
import { getFinancialProfile, parseGoal, runSimulation, runSensitivityAnalysis } from '@/lib/api'
import type { SimulationRequest, SimulationResults, SensitivityAnalysis, FinancialProfile, ParsedGoal } from '@/types'
import { MonteCarloVisualization, VisualizationConfig } from '@/components/MonteCarloVisualization'

type Phase = 'idle' | 'loading' | 'parsing' | 'simulating' | 'sensitivity' | 'complete'

interface StepStatus {
  status: 'pending' | 'active' | 'done' | 'error'
  message?: string
}

export default function SimulationPage() {
  const router = useRouter()
  const [progress, setProgress] = useState(0)
  const [phase, setPhase] = useState<Phase>('idle')
  const [stepStatuses, setStepStatuses] = useState<StepStatus[]>([
    { status: 'pending' },
    { status: 'pending' },
    { status: 'pending' },
    { status: 'pending' },
  ])
  const [error, setError] = useState<string | null>(null)
  const [simCount, setSimCount] = useState(0)
  const [backendStats, setBackendStats] = useState<{
    successRate: number | undefined
    expectedValue: number | undefined
  }>({ successRate: undefined, expectedValue: undefined })
  const hasStarted = useRef(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const vizStartTimeRef = useRef<number | null>(null)

  // Visualization config - will be populated when we have financial data
  const [vizConfig, setVizConfig] = useState<VisualizationConfig | null>(null)

  // Minimum visualization duration (10s for particle animation)
  const MIN_VIZ_DURATION = 10000

  // Auth check
  useEffect(() => {
    const customerId = localStorage.getItem('customerId')
    if (!customerId) {
      router.push('/login')
    } else {
      setIsAuthenticated(true)
    }
  }, [router])

  const steps = [
    { label: 'Fetching financial data', desc: 'Nessie API' },
    { label: 'Parsing goal', desc: 'LLM extraction' },
    { label: 'Running Monte Carlo', desc: '10,000 scenarios' },
    { label: 'Analyzing sensitivity', desc: 'What-if scenarios' },
  ]

  const updateStep = (index: number, status: StepStatus['status'], message?: string) => {
    setStepStatuses(prev => {
      const updated = [...prev]
      updated[index] = { status, message }
      return updated
    })
  }

  useEffect(() => {
    if (!isAuthenticated) return
    if (hasStarted.current) return
    hasStarted.current = true

    const runFullSimulation = async () => {
      try {
        // Get user inputs and customer ID from localStorage
        const storedInputs = localStorage.getItem('userInputs')
        const customerId = localStorage.getItem('customerId')
        if (!storedInputs) {
          setError('No user inputs found. Please complete onboarding first.')
          return
        }
        if (!customerId) {
          setError('No customer ID found. Please log in again.')
          return
        }

        const userInputs = JSON.parse(storedInputs)
        setProgress(5)
        setPhase('loading')

        // Step 1: Fetch financial profile from Nessie
        updateStep(0, 'active')
        let financialProfile: FinancialProfile
        try {
          financialProfile = await getFinancialProfile(customerId)
          updateStep(0, 'done')
          setProgress(25)
        } catch (err) {
          console.error('Failed to fetch financial profile:', err)
          // Use fallback values if Nessie API fails
          financialProfile = {
            liquidAssets: 5000,
            creditDebt: 2000,
            loanDebt: 0,
            monthlyLoanPayments: 0,
            monthlyIncome: 6400,
            monthlySpending: 4500,
            monthlyBills: 500,
            spendingByCategory: {},
            spendingVolatility: 0.15,
          }
          updateStep(0, 'done', 'Using estimates')
          setProgress(25)
        }

        // Step 2: Parse the goal using LLM
        setPhase('parsing')
        updateStep(1, 'active')
        let parsedGoal: ParsedGoal
        try {
          parsedGoal = await parseGoal(userInputs.goal)
          updateStep(1, 'done')
          setProgress(40)
        } catch (err) {
          console.error('Failed to parse goal:', err)
          setError('Failed to parse your goal. Please try again.')
          updateStep(1, 'error')
          return
        }

        // Set up visualization config now that we have financial data and goal
        const config: VisualizationConfig = {
          nPaths: 100,
          months: parsedGoal.timelineMonths,
          startingBalance: financialProfile.liquidAssets - financialProfile.creditDebt,
          monthlyIncome: financialProfile.monthlyIncome,
          monthlySpending: financialProfile.monthlySpending + financialProfile.monthlyBills,
          spendingVolatility: financialProfile.spendingVolatility || 0.15,
          goalAmount: parsedGoal.targetAmount,
          riskTolerance: userInputs.riskTolerance || 'medium',
        }
        setVizConfig(config)

        // Step 3: Run Monte Carlo simulation
        setPhase('simulating')
        updateStep(2, 'active')

        // Track when visualization starts for minimum duration
        vizStartTimeRef.current = performance.now()

        // Simulation counter that syncs with visualization
        const simInterval = setInterval(() => {
          setSimCount(prev => Math.min(prev + Math.floor(Math.random() * 400) + 200, 10000))
        }, 100)

        const simulationRequest: SimulationRequest = {
          financialProfile,
          userInputs: {
            monthlyIncome: financialProfile.monthlyIncome || 6400,
            age: parseInt(userInputs.age),
            riskTolerance: userInputs.riskTolerance,
          },
          goal: {
            targetAmount: parsedGoal.targetAmount,
            timelineMonths: parsedGoal.timelineMonths,
            goalType: parsedGoal.goalType,
          },
          simulationParams: {
            nSimulations: 10000,
          },
        }

        let simulationResults: SimulationResults
        try {
          simulationResults = await runSimulation(simulationRequest)
          clearInterval(simInterval)
          setSimCount(10000)
          // Update backend stats for visualization
          // successProbability is already a decimal (0-1), not a percentage
          setBackendStats({
            successRate: simulationResults.successProbability,
            expectedValue: simulationResults.medianOutcome,
          })
          updateStep(2, 'done')
          setProgress(75)
        } catch (err) {
          clearInterval(simInterval)
          console.error('Simulation failed:', err)
          setError('Simulation failed. Please try again.')
          updateStep(2, 'error')
          return
        }

        // Step 4: Run sensitivity analysis
        setPhase('sensitivity')
        updateStep(3, 'active')
        let sensitivityResults: SensitivityAnalysis | null = null
        try {
          sensitivityResults = await runSensitivityAnalysis(simulationRequest)
          updateStep(3, 'done')
          setProgress(100)
        } catch (err) {
          console.error('Sensitivity analysis failed:', err)
          updateStep(3, 'done', 'Skipped')
          setProgress(100)
        }

        setPhase('complete')

        // Store results in localStorage
        const resultsData = {
          results: {
            successProbability: simulationResults.successProbability,
            medianOutcome: simulationResults.medianOutcome,
            percentiles: simulationResults.percentiles,
            goalAmount: parsedGoal.targetAmount,
            timelineMonths: parsedGoal.timelineMonths,
            mean: simulationResults.mean,
            std: simulationResults.std,
            worstCase: simulationResults.worstCase,
            bestCase: simulationResults.bestCase,
            assumptions: simulationResults.assumptions,
          },
          sensitivity: sensitivityResults,
          parsedGoal,
          financialProfile,
          timestamp: Date.now(),
        }
        localStorage.setItem('simulationResults', JSON.stringify(resultsData))

        // Navigate to results after particle animation completes
        // Ensure minimum visualization duration for the full particle animation
        const vizElapsed = vizStartTimeRef.current ? performance.now() - vizStartTimeRef.current : 0
        const remainingTime = Math.max(0, MIN_VIZ_DURATION - vizElapsed) + 1500

        setTimeout(() => router.push('/results'), remainingTime)
      } catch (err) {
        console.error('Simulation flow error:', err)
        setError('An unexpected error occurred. Please try again.')
      }
    }

    runFullSimulation()
  }, [router, isAuthenticated])

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
          <Link href="/" className="flex items-center gap-2 mb-12 justify-center">
            <div className="w-6 h-6 bg-[var(--text-primary)] rounded" />
            <span className="font-medium">FutureCast</span>
          </Link>

          <div className="card p-6">
            <div className="flex items-center gap-3 text-[var(--error)] mb-4">
              <AlertCircle className="w-5 h-5" />
              <span className="font-medium">Simulation Error</span>
            </div>
            <p className="text-[var(--text-secondary)] mb-6">{error}</p>
            <div className="flex gap-3">
              <Link href="/onboarding" className="btn btn-secondary flex-1 justify-center">
                Start over
              </Link>
              <button
                onClick={() => window.location.reload()}
                className="btn btn-primary flex-1 justify-center"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-6 h-6 bg-[var(--text-primary)] rounded" />
            <span className="font-medium">FutureCast</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-sm text-[var(--text-secondary)]">Processing</span>
            <span className="text-sm font-mono tabular-nums text-[var(--text-primary)]">{Math.round(progress)}%</span>
          </div>
        </div>

        {/* Main Progress Bar */}
        <div className="progress-track mb-8" style={{ height: '3px' }}>
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>

        {/* Monte Carlo Visualization (Hero) */}
        {vizConfig && (
          <MonteCarloVisualization
            config={vizConfig}
            phase={phase}
            backendProgress={progress}
            backendSimCount={simCount}
            backendSuccessRate={backendStats.successRate}
            backendExpectedValue={backendStats.expectedValue}
            totalSimulations={10000}
          />
        )}

        {/* Placeholder while loading config */}
        {!vizConfig && (
          <div className="card p-8 flex items-center justify-center" style={{ minHeight: '400px' }}>
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-[var(--text-tertiary)] border-t-[var(--accent)] rounded-full animate-spin mx-auto mb-4" />
              <p className="text-[var(--text-secondary)]">Loading financial data...</p>
            </div>
          </div>
        )}

        {/* Step Indicators (Secondary) */}
        <div className="step-indicators mt-6">
          {steps.map((step, i) => {
            const stepStatus = stepStatuses[i]
            return (
              <div
                key={i}
                className={`step-indicator ${
                  stepStatus.status === 'active' ? 'active' :
                  stepStatus.status === 'done' ? 'done' : ''
                }`}
              >
                <div className="step-icon">
                  {stepStatus.status === 'done' && (
                    <Check className="w-4 h-4 text-[var(--success)]" />
                  )}
                  {stepStatus.status === 'active' && (
                    <div className="step-icon-active" />
                  )}
                  {stepStatus.status === 'pending' && (
                    <div className="step-icon-pending" />
                  )}
                  {stepStatus.status === 'error' && (
                    <AlertCircle className="w-4 h-4 text-[var(--error)]" />
                  )}
                </div>
                <span className="flex-1">{step.label}</span>
                {stepStatus.status === 'active' && step.label.includes('Monte Carlo') && (
                  <span className="step-counter text-[var(--accent)]">
                    {simCount.toLocaleString()}/10,000
                  </span>
                )}
                {stepStatus.message && (
                  <span className="text-xs text-[var(--text-tertiary)]">({stepStatus.message})</span>
                )}
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-[var(--text-tertiary)] mt-8">
          Monte Carlo simulation computing 10,000 scenarios with your financial data
        </p>
      </div>
    </div>
  )
}
