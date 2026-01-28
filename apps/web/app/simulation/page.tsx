'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Check, AlertCircle } from 'lucide-react'
import {
  getFinancialProfile,
  parseGoal,
  submitJob,
  getJobStatus,
  getClusterStatus,
} from '@/lib/api'
import type {
  SimulationRequest,
  FinancialProfile,
  ParsedGoal,
  Job,
  ClusterStatus,
} from '@/types'
import { MonteCarloViz, VisualizationConfig } from '@/components/MonteCarloViz'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

type Phase = 'idle' | 'loading' | 'parsing' | 'submitting' | 'running' | 'complete'

interface StepStatus {
  status: 'pending' | 'active' | 'done' | 'error'
  message?: string
}

const POLL_INTERVAL = 500 // Poll every 500ms

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
  const hasStarted = useRef(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [vizConfig, setVizConfig] = useState<VisualizationConfig | null>(null)

  // HPC Cluster state
  const [jobId, setJobId] = useState<string | null>(null)
  const [job, setJob] = useState<Job | null>(null)
  const [clusterStatus, setClusterStatus] = useState<ClusterStatus | null>(null)
  const [backendStats, setBackendStats] = useState<{
    successRate: number | undefined
    expectedValue: number | undefined
  }>({ successRate: undefined, expectedValue: undefined })

  // Completion tracking
  const [jobComplete, setJobComplete] = useState(false)
  const [visualizationComplete, setVisualizationComplete] = useState(false)
  const hasNavigated = useRef(false)

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)

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
    { label: 'Submitting to cluster', desc: 'HPC job queue' },
    { label: 'Running Monte Carlo', desc: '100,000 scenarios' },
  ]

  const updateStep = (index: number, status: StepStatus['status'], message?: string) => {
    setStepStatuses((prev) => {
      const updated = [...prev]
      updated[index] = { status, message }
      return updated
    })
  }

  // Navigate when BOTH job and visualization are complete
  useEffect(() => {
    if (jobComplete && visualizationComplete && !hasNavigated.current) {
      hasNavigated.current = true
      // Brief delay to show complete state
      setTimeout(() => {
        router.push('/results')
      }, 800)
    }
  }, [jobComplete, visualizationComplete, router])

  // Callback when visualization animation completes
  const handleVisualizationComplete = useCallback(() => {
    setVisualizationComplete(true)
  }, [])

  // Poll for cluster status
  const pollClusterStatus = useCallback(async () => {
    try {
      const status = await getClusterStatus()
      setClusterStatus(status)
    } catch (e) {
      console.warn('Failed to fetch cluster status:', e)
    }
  }, [])

  // Poll for job status
  const pollJobStatus = useCallback(async () => {
    if (!jobId) return

    try {
      const jobStatus = await getJobStatus(jobId)
      setJob(jobStatus)

      // Update progress based on job status
      if (jobStatus.status === 'queued') {
        setProgress(40 + Math.random() * 5)
      } else if (jobStatus.status === 'allocated') {
        setProgress(45 + Math.random() * 5)
      } else if (jobStatus.status === 'running') {
        // Map job progress (0-100) to our progress range (50-95)
        const mappedProgress = 50 + (jobStatus.progress / 100) * 45
        setProgress(mappedProgress)
      }

      // Check if job is complete
      if (jobStatus.status === 'complete' && jobStatus.results) {
        setProgress(100)
        setPhase('complete')
        updateStep(3, 'done')

        // Update backend stats
        setBackendStats({
          successRate: jobStatus.results.successProbability,
          expectedValue: jobStatus.results.medianOutcome,
        })

        // Store results
        const storedInputs = localStorage.getItem('userInputs')
        const userInputs = storedInputs ? JSON.parse(storedInputs) : {}

        const resultsData = {
          results: {
            successProbability: jobStatus.results.successProbability,
            medianOutcome: jobStatus.results.medianOutcome,
            percentiles: jobStatus.results.percentiles,
            goalAmount: vizConfig?.goalAmount,
            timelineMonths: vizConfig?.months,
            mean: jobStatus.results.mean,
            std: jobStatus.results.std,
            worstCase: jobStatus.results.worstCase,
            bestCase: jobStatus.results.bestCase,
            assumptions: jobStatus.results.assumptions,
          },
          sensitivity: jobStatus.sensitivityResults,
          parsedGoal: {
            targetAmount: vizConfig?.goalAmount,
            timelineMonths: vizConfig?.months,
          },
          financialProfile: {
            liquidAssets: vizConfig?.startingBalance,
            monthlyIncome: vizConfig?.monthlyIncome,
            monthlySpending: vizConfig?.monthlySpending,
          },
          userInputs,
          timestamp: Date.now(),
        }
        localStorage.setItem('simulationResults', JSON.stringify(resultsData))

        // Stop polling
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current)
          pollIntervalRef.current = null
        }

        // Mark job as complete (but don't navigate yet - wait for visualization)
        setJobComplete(true)
      }

      // Check if job failed
      if (jobStatus.status === 'failed') {
        setError(jobStatus.error || 'Job failed')
        updateStep(3, 'error')
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current)
          pollIntervalRef.current = null
        }
      }
    } catch (e) {
      console.error('Failed to poll job status:', e)
    }
  }, [jobId, vizConfig])

  // Start polling when job is submitted
  useEffect(() => {
    if (jobId && phase === 'running') {
      // Initial fetch
      pollJobStatus()
      pollClusterStatus()

      // Set up polling interval
      pollIntervalRef.current = setInterval(() => {
        pollJobStatus()
        pollClusterStatus()
      }, POLL_INTERVAL)

      return () => {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current)
          pollIntervalRef.current = null
        }
      }
    }
  }, [jobId, phase, pollJobStatus, pollClusterStatus])

  // Main simulation flow
  useEffect(() => {
    if (!isAuthenticated) return
    if (hasStarted.current) return
    hasStarted.current = true

    const runSimulationFlow = async () => {
      try {
        const storedInputs = localStorage.getItem('userInputs')
        const customerId = localStorage.getItem('customerId')
        if (!storedInputs) {
          setError('No user inputs found. Please set a goal first.')
          return
        }
        if (!customerId) {
          setError('No customer ID found. Please log in again.')
          return
        }

        const userInputs = JSON.parse(storedInputs)
        setProgress(5)
        setPhase('loading')

        // Step 1: Fetch financial data
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

        // Step 2: Parse goal
        setPhase('parsing')
        updateStep(1, 'active')
        let parsedGoal: ParsedGoal

        if (userInputs.parsedGoal) {
          parsedGoal = {
            goalType: userInputs.parsedGoal.goalType,
            targetAmount: userInputs.parsedGoal.targetAmount,
            timelineMonths: userInputs.parsedGoal.timelineMonths,
            constraints: [],
            clarifyingQuestions: null,
          }
          updateStep(1, 'done', 'From conversation')
          setProgress(35)
        } else {
          try {
            parsedGoal = await parseGoal(userInputs.goal)

            if (
              'needsClarification' in parsedGoal &&
              parsedGoal.needsClarification &&
              'clarifyingQuestions' in parsedGoal &&
              parsedGoal.clarifyingQuestions
            ) {
              setError(
                `Your goal needs clarification:\n\n${(parsedGoal.clarifyingQuestions as string[]).join('\n\n')}\n\nPlease go back and provide more specific details.`
              )
              updateStep(1, 'error', 'Needs clarification')
              return
            }

            updateStep(1, 'done')
            setProgress(35)
          } catch (err) {
            console.error('Failed to parse goal:', err)
            setError('Failed to parse your goal. Please try again.')
            updateStep(1, 'error')
            return
          }
        }

        // Set up visualization config
        const config: VisualizationConfig = {
          nPaths: 100,
          months: parsedGoal.timelineMonths || 12,
          startingBalance: financialProfile.liquidAssets - financialProfile.creditDebt,
          monthlyIncome: financialProfile.monthlyIncome,
          monthlySpending: financialProfile.monthlySpending + financialProfile.monthlyBills,
          spendingVolatility: financialProfile.spendingVolatility || 0.15,
          goalAmount: parsedGoal.targetAmount || 0,
          riskTolerance: userInputs.riskTolerance || 'medium',
        }
        setVizConfig(config)

        // Step 3: Submit job to cluster
        setPhase('submitting')
        updateStep(2, 'active')

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

        try {
          const submitResponse = await submitJob(simulationRequest)
          setJobId(submitResponse.jobId)
          updateStep(2, 'done', `Job ${submitResponse.jobId}`)
          setProgress(40)

          // Fetch initial cluster status
          await pollClusterStatus()

          // Step 4: Wait for job completion
          setPhase('running')
          updateStep(3, 'active')
        } catch (err) {
          console.error('Failed to submit job:', err)
          setError('Failed to submit job to cluster. Please try again.')
          updateStep(2, 'error')
          return
        }
      } catch (err) {
        console.error('Simulation flow error:', err)
        setError('An unexpected error occurred. Please try again.')
      }
    }

    runSimulationFlow()
  }, [isAuthenticated, pollClusterStatus])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
    }
  }, [])

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
          <header className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center justify-between px-6 py-3 max-w-3xl w-[calc(100%-2rem)] rounded-full bg-background/60 backdrop-blur-xl border border-border/50">
            <Link href="/" className="text-lg font-semibold tracking-tight">
              Drift
            </Link>
            <Link
              href="/dashboard"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Exit
            </Link>
          </header>

          <div className="pt-16"></div>

          <Card className="p-6 bg-card/60 backdrop-blur-sm border-border/50">
            <div className="flex items-center gap-3 text-[var(--error)] mb-4">
              <AlertCircle className="w-5 h-5" />
              <span className="font-medium">Simulation Error</span>
            </div>
            <p className="text-muted-foreground mb-6">{error}</p>
            <div className="flex gap-3">
              <Button variant="outline" asChild className="flex-1">
                <Link href="/goal">Start over</Link>
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

  // Node status helper
  const getNodeStatus = (nodeId: string) => {
    const node = clusterStatus?.nodes.find((n) => n.id === nodeId)
    return node?.status || 'idle'
  }

  const getNodeProgress = (nodeId: string) => {
    if (!job?.nodeProgress) return 0
    return job.nodeProgress[nodeId]?.progress || 0
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative">
      {/* Subtle depth */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,transparent_0%,hsl(var(--background))_70%)] opacity-40" />
      <div className="w-full max-w-6xl">
        {/* Header - frosted glass */}
        <header className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center justify-between px-6 py-3 max-w-3xl w-[calc(100%-2rem)] rounded-full bg-background/60 backdrop-blur-xl border border-border/50">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            Drift
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Processing</span>
            <span className="text-sm font-mono tabular-nums">{Math.round(progress)}%</span>
          </div>
        </header>

        <div className="pt-16"></div>

        {/* Main Progress Bar */}
        <div className="progress-track mb-6" style={{ height: '3px' }}>
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>

        {/* Main Content: Visualization + Cluster Nodes side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr,280px] gap-4">
          {/* Left: Monte Carlo Visualization */}
          <div>
            {vizConfig && (
              <MonteCarloViz
                config={vizConfig}
                phase={phase === 'running' ? 'simulating' : phase === 'complete' ? 'complete' : 'loading'}
                backendProgress={progress}
                backendSimCount={job?.simulationsComplete || 0}
                backendSuccessRate={backendStats.successRate}
                backendExpectedValue={backendStats.expectedValue}
                totalSimulations={100000}
                onVisualizationComplete={handleVisualizationComplete}
              />
            )}

            {/* Placeholder while loading config */}
            {!vizConfig && (
              <Card
                className="p-8 flex items-center justify-center bg-card/60 backdrop-blur-sm border-border/50"
                style={{ minHeight: '400px' }}
              >
                <div className="text-center">
                  <div className="w-8 h-8 border-2 border-muted-foreground border-t-[hsl(var(--accent))] rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-muted-foreground">Loading financial data...</p>
                </div>
              </Card>
            )}
          </div>

          {/* Right: Stacked Panels */}
          {(phase === 'running' || phase === 'complete' || phase === 'submitting') && (
            <div className="flex flex-col gap-4 h-[540px]">
              {/* Top: Cluster Nodes Panel */}
              <Card className="p-4 bg-card/60 backdrop-blur-sm border-border/50 flex-1">
                {/* Cluster Header */}
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Compute Cluster
                    </h3>
                    {jobId && (
                      <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{jobId}</p>
                    )}
                  </div>
                  <span className="text-[10px] font-medium text-[var(--success)]">
                    {clusterStatus?.offlineNodes === 0 ? 'Healthy' : 'Degraded'}
                  </span>
                </div>

                {/* Node Grid - 2x4 compact */}
                <div className="grid grid-cols-2 gap-1.5 mb-3">
                  {Array.from({ length: 8 }, (_, i) => {
                    const nodeId = `node-${String(i + 1).padStart(2, '0')}`
                    const status = getNodeStatus(nodeId)
                    const nodeProgress = getNodeProgress(nodeId)
                    const isActive = status === 'busy'

                    return (
                      <div
                        key={nodeId}
                        className={`p-2 rounded border transition-all ${
                          isActive
                            ? 'bg-[hsl(var(--accent))]/10 border-[hsl(var(--accent))]/50'
                            : 'bg-muted/20 border-border/50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-mono font-medium">
                            N-{String(i + 1).padStart(2, '0')}
                          </span>
                          {isActive ? (
                            <div className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--accent))] animate-pulse" />
                          ) : nodeProgress >= 100 ? (
                            <Check className="w-3 h-3 text-[var(--success)]" />
                          ) : (
                            <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
                          )}
                        </div>
                        <div className="h-1 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${
                              nodeProgress >= 100 ? 'bg-[var(--success)]' : 'bg-[hsl(var(--accent))]'
                            }`}
                            style={{ width: `${nodeProgress}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Job Progress Summary */}
                <div className="pt-3 border-t border-border/50">
                  <div className="flex items-center justify-between text-[10px] mb-1.5">
                    <span className="text-muted-foreground">Total Progress</span>
                    <span className="font-mono tabular-nums">
                      {job?.simulationsComplete?.toLocaleString() || 0} / 100,000
                    </span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        job?.status === 'complete' ? 'bg-[var(--success)]' : 'bg-[hsl(var(--accent))]'
                      }`}
                      style={{ width: `${job?.progress || 0}%` }}
                    />
                  </div>
                  {job?.estimatedTimeRemaining !== undefined && job.status === 'running' && (
                    <p className="text-[10px] text-muted-foreground mt-1.5 text-right">
                      ETA: {job.estimatedTimeRemaining}s
                    </p>
                  )}
                </div>
              </Card>

              {/* Bottom: Resource Utilization Panel */}
              <Card className="p-4 bg-card/60 backdrop-blur-sm border-border/50 flex-1">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                  Resource Utilization
                </h3>

                {/* CPU Utilization */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-[11px] mb-1.5">
                    <span className="text-muted-foreground">CPU</span>
                    <span className="font-mono tabular-nums font-medium">
                      {clusterStatus?.cpuUtilization || 0}%
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[hsl(var(--accent))] transition-all duration-500"
                      style={{ width: `${clusterStatus?.cpuUtilization || 0}%` }}
                    />
                  </div>
                </div>

                {/* Memory Utilization */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-[11px] mb-1.5">
                    <span className="text-muted-foreground">Memory</span>
                    <span className="font-mono tabular-nums font-medium">
                      {clusterStatus?.memoryUtilization || 0}%
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-500"
                      style={{ width: `${clusterStatus?.memoryUtilization || 0}%` }}
                    />
                  </div>
                </div>

                {/* Cluster Stats */}
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border/50">
                  <div>
                    <p className="text-[10px] text-muted-foreground">Active Nodes</p>
                    <p className="text-lg font-semibold tabular-nums">
                      {clusterStatus?.activeNodes || 0}
                      <span className="text-xs text-muted-foreground font-normal">
                        /{clusterStatus?.totalNodes || 8}
                      </span>
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Queue Depth</p>
                    <p className="text-lg font-semibold tabular-nums">
                      {clusterStatus?.queueDepth || 0}
                      <span className="text-xs text-muted-foreground font-normal"> jobs</span>
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>

        {/* Step Indicators (Secondary) */}
        <div className="step-indicators mt-4">
          {steps.map((step, i) => {
            const stepStatus = stepStatuses[i]
            return (
              <div
                key={i}
                className={`step-indicator ${
                  stepStatus.status === 'active'
                    ? 'active'
                    : stepStatus.status === 'done'
                      ? 'done'
                      : ''
                }`}
              >
                <div className="step-icon">
                  {stepStatus.status === 'done' && (
                    <Check className="w-4 h-4 text-[var(--success)]" />
                  )}
                  {stepStatus.status === 'active' && <div className="step-icon-active" />}
                  {stepStatus.status === 'pending' && <div className="step-icon-pending" />}
                  {stepStatus.status === 'error' && (
                    <AlertCircle className="w-4 h-4 text-[var(--error)]" />
                  )}
                </div>
                <span className="flex-1">{step.label}</span>
                {stepStatus.status === 'active' && step.label.includes('Monte Carlo') && job && (
                  <span className="step-counter text-[hsl(var(--accent))]">
                    {job.simulationsComplete.toLocaleString()}/100,000
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
        <p className="text-center text-xs text-muted-foreground mt-6">
          HPC cluster processing 100,000 Monte Carlo scenarios across {clusterStatus?.activeNodes || 8} compute nodes
        </p>
      </div>
    </div>
  )
}
