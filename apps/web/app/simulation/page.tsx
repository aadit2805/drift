'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Sparkles, Database, Brain, Cpu, BarChart3, Check } from 'lucide-react'

interface SimulationStep {
  id: string
  label: string
  description: string
  icon: React.ReactNode
}

export default function SimulationPage() {
  const router = useRouter()
  const [progress, setProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState(0)
  const [simulationsComplete, setSimulationsComplete] = useState(0)
  const [workerProgress, setWorkerProgress] = useState([0, 0, 0, 0])

  const steps: SimulationStep[] = [
    {
      id: 'fetch',
      label: 'Fetching financial data',
      description: 'Pulling your transaction history from Capital One',
      icon: <Database className="w-5 h-5" />,
    },
    {
      id: 'parse',
      label: 'Analyzing your goal',
      description: 'AI is parsing your goal into simulation parameters',
      icon: <Brain className="w-5 h-5" />,
    },
    {
      id: 'simulate',
      label: 'Running Monte Carlo simulation',
      description: 'Executing 10,000 parallel scenarios',
      icon: <Cpu className="w-5 h-5" />,
    },
    {
      id: 'analyze',
      label: 'Computing statistics',
      description: 'Calculating probabilities and percentiles',
      icon: <BarChart3 className="w-5 h-5" />,
    },
  ]

  useEffect(() => {
    const stepDurations = [1500, 1200, 3500, 1000]
    let totalElapsed = 0

    stepDurations.forEach((duration, index) => {
      setTimeout(() => {
        setCurrentStep(index)
      }, totalElapsed)

      if (index === 2) {
        const simInterval = setInterval(() => {
          setSimulationsComplete((prev) => {
            const next = prev + Math.floor(Math.random() * 400) + 200
            return Math.min(next, 10000)
          })
          setWorkerProgress((prev) =>
            prev.map((p) => Math.min(p + Math.floor(Math.random() * 3) + 1, 100))
          )
        }, 80)

        setTimeout(() => {
          clearInterval(simInterval)
          setSimulationsComplete(10000)
          setWorkerProgress([100, 100, 100, 100])
        }, totalElapsed + duration)
      }

      totalElapsed += duration
    })

    setTimeout(() => {
      setCurrentStep(4)
      setTimeout(() => router.push('/results'), 600)
    }, totalElapsed)

    const progressInterval = setInterval(() => {
      setProgress((prev) => Math.min(prev + 1.2, 100))
    }, 70)

    return () => clearInterval(progressInterval)
  }, [router])

  const getStepStatus = (index: number): 'pending' | 'running' | 'complete' => {
    if (index < currentStep) return 'complete'
    if (index === currentStep) return 'running'
    return 'pending'
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="w-full max-w-2xl">
        {/* Logo */}
        <Link href="/" className="flex items-center justify-center gap-2 mb-12">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-semibold text-white">FutureCast</span>
        </Link>

        {/* Main Card */}
        <div className="glass-card rounded-2xl p-8 glow">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white mb-2">
              Simulating Your Future
            </h1>
            <p className="text-white/50">
              Running 10,000 possible financial outcomes
            </p>
          </div>

          {/* Progress Bar */}
          <div className="mb-10">
            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full progress-bar rounded-full transition-all duration-100"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between mt-3">
              <span className="text-sm text-white/40">Processing...</span>
              <span className="text-sm font-mono text-white/60">{Math.round(progress)}%</span>
            </div>
          </div>

          {/* Steps */}
          <div className="space-y-4 mb-8">
            {steps.map((step, index) => {
              const status = getStepStatus(index)
              return (
                <div
                  key={step.id}
                  className={`flex items-center gap-4 p-4 rounded-xl transition-all ${
                    status === 'running'
                      ? 'bg-indigo-500/10 border border-indigo-500/30'
                      : status === 'complete'
                      ? 'bg-green-500/5 border border-green-500/20'
                      : 'bg-white/[0.02] border border-transparent'
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      status === 'running'
                        ? 'bg-indigo-500/20 text-indigo-400'
                        : status === 'complete'
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-white/5 text-white/30'
                    }`}
                  >
                    {status === 'complete' ? (
                      <Check className="w-5 h-5" />
                    ) : status === 'running' ? (
                      <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      step.icon
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`font-medium ${
                        status === 'pending' ? 'text-white/30' : 'text-white'
                      }`}
                    >
                      {step.label}
                    </p>
                    <p className="text-sm text-white/40 truncate">{step.description}</p>
                    {step.id === 'simulate' && status === 'running' && (
                      <p className="text-sm text-indigo-400 mt-1">
                        {simulationsComplete.toLocaleString()} / 10,000 scenarios
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* HPC Workers Visualization */}
          <div className="glass-card rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-white/70">Parallel Workers</span>
              <span className="text-xs text-white/40">4 cores active</span>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {workerProgress.map((progress, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-100"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-white/40">W{i + 1}</span>
                    <span className="text-white/60 font-mono">{progress}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="mt-6 pt-6 border-t border-white/5 grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-white font-mono">
                {simulationsComplete.toLocaleString()}
              </p>
              <p className="text-xs text-white/40">Scenarios</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white font-mono">4</p>
              <p className="text-xs text-white/40">Workers</p>
            </div>
            <div>
              <p className="text-2xl font-bold gradient-text font-mono">~500ms</p>
              <p className="text-xs text-white/40">Total time</p>
            </div>
          </div>
        </div>

        <p className="text-center text-white/30 text-sm mt-6">
          Powered by NumPy vectorization + multiprocessing
        </p>
      </div>
    </div>
  )
}
