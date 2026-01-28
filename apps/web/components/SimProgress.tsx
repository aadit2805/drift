'use client'

import { useEffect, useState } from 'react'
import { Cpu } from 'lucide-react'

interface SimProgressProps {
  totalSimulations: number
  isRunning: boolean
  onComplete?: () => void
}

export function SimProgress({
  totalSimulations,
  isRunning,
  onComplete,
}: SimProgressProps) {
  const [completed, setCompleted] = useState(0)
  const [workers] = useState(4) // Simulated parallel workers

  useEffect(() => {
    if (!isRunning) {
      setCompleted(0)
      return
    }

    const interval = setInterval(() => {
      setCompleted((prev) => {
        const increment = Math.floor(Math.random() * 300) + 200
        const next = prev + increment

        if (next >= totalSimulations) {
          clearInterval(interval)
          onComplete?.()
          return totalSimulations
        }

        return next
      })
    }, 50)

    return () => clearInterval(interval)
  }, [isRunning, totalSimulations, onComplete])

  const progress = (completed / totalSimulations) * 100
  const simulationsPerWorker = Math.floor(completed / workers)

  return (
    <div className="bg-slate-900 rounded-xl p-6 text-white">
      <div className="flex items-center gap-3 mb-4">
        <Cpu className="w-6 h-6 text-blue-400" />
        <h3 className="text-lg font-semibold">Monte Carlo Engine</h3>
      </div>

      {/* Progress bar */}
      <div className="h-3 bg-slate-700 rounded-full overflow-hidden mb-4">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-100"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Stats */}
      <div className="flex justify-between text-sm mb-6">
        <span className="text-slate-400">
          {completed.toLocaleString()} / {totalSimulations.toLocaleString()} scenarios
        </span>
        <span className="text-blue-400 font-mono">{progress.toFixed(1)}%</span>
      </div>

      {/* Worker visualization */}
      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: workers }).map((_, i) => (
          <div key={i} className="bg-slate-800 rounded-lg p-3">
            <p className="text-xs text-slate-500 mb-1">Worker {i + 1}</p>
            <p className="text-sm font-mono text-green-400">
              {isRunning && completed < totalSimulations ? (
                <span className="animate-pulse">
                  {simulationsPerWorker.toLocaleString()}
                </span>
              ) : (
                simulationsPerWorker.toLocaleString()
              )}
            </p>
          </div>
        ))}
      </div>

      {completed === totalSimulations && (
        <div className="mt-4 text-center text-green-400 font-medium">
          Simulation complete!
        </div>
      )}
    </div>
  )
}
