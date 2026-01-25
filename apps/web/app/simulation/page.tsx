'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Check, AlertCircle } from 'lucide-react'
import { getFinancialProfile, parseGoal, runSimulation, runSensitivityAnalysis } from '@/lib/api'
import type { SimulationRequest, SimulationResults, SensitivityAnalysis, FinancialProfile, ParsedGoal } from '@/types'
import { MonteCarloVisualization, VisualizationConfig } from '@/components/MonteCarloVisualization'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

type Phase = 'idle' | 'loading' | 'parsing' | 'simulating' | 'sensitivity' | 'complete'

interface StepStatus {
  status: 'pending' | 'active' | 'done' | 'error'
  message?: string
}

interface WorkerProgress {
  id: number
  progress: number
  status: 'idle' | 'running' | 'done'
}

const NUM_WORKERS = 8
const SIMS_PER_WORKER = 100000 / NUM_WORKERS

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
  const [vizConfig, setVizConfig] = useState<VisualizationConfig | null>(null)
  const [workers, setWorkers] = useState<WorkerProgress[]>(
    Array.from({ length: NUM_WORKERS }, (_, i) => ({ id: i, progress: 0, status: 'idle' }))
  )
  const [animationComplete, setAnimationComplete] = useState(false)
  const [backendComplete, setBackendComplete] = useState(false)

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
    { label: 'Running Monte Carlo', desc: '100,000 scenarios' },
    { label: 'Analyzing sensitivity', desc: 'What-if scenarios' },
  ]

  const updateStep = (index: number, status: StepStatus['status'], message?: string) => {
    setStepStatuses(prev => {
      const updated = [...prev]
      updated[index] = { status, message }
      return updated
    })
  }

  // Track if animation has started
  const animationStarted = useRef(false)

  // Worker animation logic - starts when simulating, continues until all done
  useEffect(() => {
    // Start animation when we enter simulating phase
    if (phase === 'simulating' && !animationStarted.current) {
      animationStarted.current = true
    }

    // Don't run if we haven't started or if already complete
    if (!animationStarted.current || animationComplete) return

    const workerIntervals: NodeJS.Timeout[] = []

    workers.forEach((worker, idx) => {
      if (worker.status === 'done') return // Skip workers already done

      const interval = setInterval(() => {
        setWorkers(prev => {
          const updated = [...prev]
          const current = updated[idx]

          if (current.status === 'idle') {
            updated[idx] = { ...current, status: 'running' }
          } else if (current.status === 'running' && current.progress < 100) {
            const increment = Math.random() * 10 + 3
            const newProgress = Math.min(100, current.progress + increment)
            updated[idx] = { ...current, progress: newProgress }

            if (newProgress >= 100) {
              updated[idx] = { ...current, progress: 100, status: 'done' }
            }
          }

          return updated
        })
      }, 70 + idx * 8)

      workerIntervals.push(interval)
    })

    return () => {
      workerIntervals.forEach(clearInterval)
    }
  }, [phase, animationComplete, workers])

  // Check if all workers are done
  useEffect(() => {
    if (workers.every(w => w.status === 'done')) {
      setAnimationComplete(true)
    }
  }, [workers])

  // Navigate when both animation and backend are complete
  useEffect(() => {
    if (animationComplete && backendComplete) {
      router.push('/results')
    }
  }, [animationComplete, backendComplete, router])

  useEffect(() => {
    if (!isAuthenticated) return
    if (hasStarted.current) return
    hasStarted.current = true

    const runFullSimulation = async () => {
      try {
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

        updateStep(0, 'active')
        let financialProfile: FinancialProfile
        try {
          financialProfile = await getFinancialProfile(customerId)
          updateStep(0, 'done')
          setProgress(25)
        } catch (err) {
          console.error('Failed to fetch financial profile:', err)
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

        setPhase('parsing')
        updateStep(1, 'active')
        let parsedGoal: ParsedGoal
        try {
          parsedGoal = await parseGoal(userInputs.goal)
          
          // Check if clarification is needed
          if ('needsClarification' in parsedGoal && parsedGoal.needsClarification && 'clarifyingQuestions' in parsedGoal && parsedGoal.clarifyingQuestions) {
            setError(
              `Your goal needs clarification:\n\n${(parsedGoal.clarifyingQuestions as string[]).join('\n\n')}\n\nPlease go back and provide more specific details.`
            )
            updateStep(1, 'error', 'Needs clarification')
            return
          }
          
          updateStep(1, 'done')
          setProgress(40)
        } catch (err) {
          console.error('Failed to parse goal:', err)
          setError('Failed to parse your goal. Please try again.')
          updateStep(1, 'error')
          return
        }

        const config: VisualizationConfig = {
          nPaths: 100,
          months: parsedGoal.timelineMonths ?? 36,
          months: parsedGoal.timelineMonths || 12,
          startingBalance: financialProfile.liquidAssets - financialProfile.creditDebt,
          monthlyIncome: financialProfile.monthlyIncome,
          monthlySpending: financialProfile.monthlySpending + financialProfile.monthlyBills,
          spendingVolatility: financialProfile.spendingVolatility || 0.15,
          goalAmount: parsedGoal.targetAmount ?? 50000,
          goalAmount: parsedGoal.targetAmount || 0,
          riskTolerance: userInputs.riskTolerance || 'medium',
        }
        setVizConfig(config)

        setPhase('simulating')
        updateStep(2, 'active')

        const simInterval = setInterval(() => {
          setSimCount(prev => Math.min(prev + Math.floor(Math.random() * 400) + 200, 100000))
        }, 100)

        const simulationRequest: SimulationRequest = {
          financialProfile,
          userInputs: {
            monthlyIncome: financialProfile.monthlyIncome || 6400,
            age: parseInt(userInputs.age),
            riskTolerance: userInputs.riskTolerance,
          },
          goal: {
            targetAmount: parsedGoal.targetAmount || 0,
            timelineMonths: parsedGoal.timelineMonths || 12,
            goalType: parsedGoal.goalType,
          },
          simulationParams: {
            nSimulations: 100000,
          },
        }

        let simulationResults: SimulationResults
        try {
          simulationResults = await runSimulation(simulationRequest)
          clearInterval(simInterval)
          setSimCount(100000)
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
          userInputs,
          timestamp: Date.now(),
        }
        localStorage.setItem('simulationResults', JSON.stringify(resultsData))

        setBackendComplete(true)
      } catch (err) {
        console.error('Simulation flow error:', err)
        setError('An unexpected error occurred. Please try again.')
      }
    }

    runFullSimulation()
  }, [router, isAuthenticated])

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
          <Link href="/" className="flex items-center gap-2 mb-12 justify-center">
            <div className="w-6 h-6 bg-[hsl(var(--accent))] rounded" />
            <span className="font-medium">FutureCast</span>
          </Link>

          <Card className="p-6">
            <div className="flex items-center gap-3 text-[var(--error)] mb-4">
              <AlertCircle className="w-5 h-5" />
              <span className="font-medium">Simulation Error</span>
            </div>
            <p className="text-muted-foreground mb-6">{error}</p>
            <div className="flex gap-3">
              <Button variant="outline" asChild className="flex-1">
                <Link href="/onboarding">Start over</Link>
              </Button>
              <Button onClick={() => window.location.reload()} className="flex-1">
                Retry
              </Button>
            </div>
          </Card>
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
            <div className="w-6 h-6 bg-[hsl(var(--accent))] rounded" />
            <span className="font-medium">FutureCast</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Processing</span>
            <span className="text-sm font-mono tabular-nums">{Math.round(progress)}%</span>
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
            totalSimulations={100000}
          />
        )}

        {/* Placeholder while loading config */}
        {!vizConfig && (
          <Card className="p-8 flex items-center justify-center" style={{ minHeight: '400px' }}>
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-muted-foreground border-t-[hsl(var(--accent))] rounded-full animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Loading financial data...</p>
            </div>
          </Card>
        )}

        {/* Worker Progress Visualization */}
        {phase === 'simulating' && (
          <Card className="p-6 mt-6">
            <div className="mb-4">
              <h3 className="text-sm font-medium mb-1">Parallel Workers</h3>
              <p className="text-xs text-muted-foreground">
                {NUM_WORKERS} workers processing {SIMS_PER_WORKER.toLocaleString()} simulations each
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {workers.map((worker) => (
                <div
                  key={worker.id}
                  className={`p-3 rounded-lg border transition-all ${
                    worker.status === 'done'
                      ? 'border-[var(--success)] bg-[var(--success)]/5'
                      : worker.status === 'running'
                      ? 'border-[hsl(var(--accent))] bg-[hsl(var(--accent))]/5'
                      : 'border-border bg-muted/30'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium">Worker {worker.id + 1}</span>
                    {worker.status === 'done' && (
                      <Check className="w-3 h-3 text-[var(--success)]" />
                    )}
                    {worker.status === 'running' && (
                      <div className="w-2 h-2 rounded-full bg-[hsl(var(--accent))] animate-pulse" />
                    )}
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        worker.status === 'done'
                          ? 'bg-[var(--success)]'
                          : 'bg-[hsl(var(--accent))]'
                      }`}
                      style={{ width: `${worker.progress}%` }}
                    />
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 text-right tabular-nums">
                    {Math.round(worker.progress)}%
                  </div>
                </div>
              ))}
            </div>
          </Card>
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
                  <span className="step-counter text-[hsl(var(--accent))]">
                    {simCount.toLocaleString()}/100,000
                  </span>
                )}
                {stepStatus.message && (
                  <span className="text-xs text-muted-foreground">({stepStatus.message})</span>
                )}
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-8">
          Monte Carlo simulation computing 100,000 scenarios with your financial data
        </p>
      </div>
    </div>
  )
}
