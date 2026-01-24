'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Check, AlertCircle } from 'lucide-react'
import { getFinancialProfile, parseGoal, runSimulation, runSensitivityAnalysis } from '@/lib/api'
import type { SimulationRequest, SimulationResults, SensitivityAnalysis, FinancialProfile, ParsedGoal } from '@/types'

interface StepStatus {
  status: 'pending' | 'active' | 'done' | 'error'
  message?: string
}

export default function SimulationPage() {
  const router = useRouter()
  const [progress, setProgress] = useState(0)
  const [stepStatuses, setStepStatuses] = useState<StepStatus[]>([
    { status: 'pending' },
    { status: 'pending' },
    { status: 'pending' },
    { status: 'pending' },
  ])
  const [error, setError] = useState<string | null>(null)
  const [simCount, setSimCount] = useState(0)
  const hasStarted = useRef(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

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
        // Get user inputs from localStorage
        const storedInputs = localStorage.getItem('userInputs')
        if (!storedInputs) {
          setError('No user inputs found. Please complete onboarding first.')
          return
        }

        const userInputs = JSON.parse(storedInputs)
        setProgress(5)

        // Step 1: Fetch financial profile from Nessie
        updateStep(0, 'active')
        let financialProfile: FinancialProfile
        try {
          financialProfile = await getFinancialProfile()
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

        // Step 3: Run Monte Carlo simulation
        updateStep(2, 'active')
        const simInterval = setInterval(() => {
          setSimCount(prev => Math.min(prev + Math.floor(Math.random() * 400) + 200, 10000))
        }, 100)

        const simulationRequest: SimulationRequest = {
          financialProfile,
          userInputs: {
            monthlyIncome: financialProfile.monthlyIncome || 6400, // From API deposits
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
        updateStep(3, 'active')
        let sensitivityResults: SensitivityAnalysis | null = null
        try {
          sensitivityResults = await runSensitivityAnalysis(simulationRequest)
          updateStep(3, 'done')
          setProgress(100)
        } catch (err) {
          console.error('Sensitivity analysis failed:', err)
          // Continue without sensitivity - not critical
          updateStep(3, 'done', 'Skipped')
          setProgress(100)
        }

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
          },
          sensitivity: sensitivityResults,
          parsedGoal,
          financialProfile,
          timestamp: Date.now(),
        }
        localStorage.setItem('simulationResults', JSON.stringify(resultsData))

        // Navigate to results after a brief pause
        setTimeout(() => router.push('/results'), 500)
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
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="w-full max-w-lg">
        <Link href="/" className="flex items-center gap-2 mb-12 justify-center">
          <div className="w-6 h-6 bg-[var(--text-primary)] rounded" />
          <span className="font-medium">FutureCast</span>
        </Link>

        <div className="card p-6">
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-[var(--text-secondary)]">Processing</span>
              <span className="text-sm font-mono tabular-nums">{Math.round(progress)}%</span>
            </div>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
          </div>

          <div className="space-y-3">
            {steps.map((step, i) => {
              const stepStatus = stepStatuses[i]
              return (
                <div key={i} className="flex items-center gap-3 py-2">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                    stepStatus.status === 'done'
                      ? 'bg-[var(--success)] text-[var(--bg-primary)]'
                      : stepStatus.status === 'active'
                      ? 'border-2 border-[var(--accent)]'
                      : stepStatus.status === 'error'
                      ? 'bg-[var(--error)] text-[var(--bg-primary)]'
                      : 'bg-[var(--bg-tertiary)]'
                  }`}>
                    {stepStatus.status === 'done' && <Check className="w-3 h-3" />}
                    {stepStatus.status === 'active' && <div className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse" />}
                    {stepStatus.status === 'error' && <span>!</span>}
                  </div>
                  <div className="flex-1">
                    <span className={stepStatus.status === 'pending' ? 'text-[var(--text-tertiary)]' : 'text-[var(--text-primary)]'}>
                      {step.label}
                    </span>
                    {stepStatus.status === 'active' && step.label.includes('Monte Carlo') && (
                      <span className="ml-2 text-sm font-mono text-[var(--accent)]">
                        {simCount.toLocaleString()}/10,000
                      </span>
                    )}
                    {stepStatus.message && (
                      <span className="ml-2 text-xs text-[var(--text-tertiary)]">({stepStatus.message})</span>
                    )}
                  </div>
                  <span className="text-xs text-[var(--text-tertiary)]">{step.desc}</span>
                </div>
              )
            })}
          </div>

          <div className="h-px bg-[var(--border-primary)] my-6" />

          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xl font-medium tabular-nums">{simCount.toLocaleString()}</p>
              <p className="text-xs text-[var(--text-tertiary)]">scenarios</p>
            </div>
            <div>
              <p className="text-xl font-medium tabular-nums">10,000</p>
              <p className="text-xs text-[var(--text-tertiary)]">total</p>
            </div>
            <div>
              <p className="text-xl font-medium tabular-nums">{Math.round(progress)}%</p>
              <p className="text-xs text-[var(--text-tertiary)]">complete</p>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-[var(--text-tertiary)] mt-6">
          Running Monte Carlo simulation with real financial data
        </p>
      </div>
    </div>
  )
}
