'use client'

import { useEffect, useRef, useState } from 'react'
import { formatCurrency, formatCompactNumber } from '@/lib/utils'

// ============================================
// Types
// ============================================

export interface VisualizationConfig {
  nPaths: number
  months: number
  startingBalance: number
  monthlyIncome: number
  monthlySpending: number
  spendingVolatility: number
  goalAmount: number
  riskTolerance: 'low' | 'medium' | 'high'
}

interface Particle {
  id: number
  x: number
  y: number
  targetY: number
  vx: number
  vy: number
  radius: number
  opacity: number
  isSuccess: boolean  // Determined by backend success rate, not client simulation
}

interface MonteCarloVisualizationProps {
  config: VisualizationConfig
  phase: 'idle' | 'loading' | 'parsing' | 'simulating' | 'sensitivity' | 'complete'
  backendProgress?: number
  backendSimCount?: number
  backendSuccessRate?: number     // 0-1 from backend
  backendExpectedValue?: number
  totalSimulations?: number
  onVisualizationComplete?: () => void
}

// ============================================
// Constants
// ============================================

const COLORS = {
  background: '#0a0a0a',
  goalLine: '#3b82f6',
  particleNeutral: 'rgba(255, 255, 255, 0.4)',
  particleSuccess: '#22c55e',
  particleFailure: '#ef4444',
  glowSuccess: 'rgba(34, 197, 94, 0.6)',
  glowFailure: 'rgba(239, 68, 68, 0.4)',
  textDim: '#666666',
}

const PARTICLE_COUNT = 150
const ANIMATION_DURATION = 10000 // 10 seconds total

// ============================================
// Main Component
// ============================================

export function MonteCarloVisualization({
  config,
  phase,
  backendSimCount = 0,
  backendSuccessRate,
  backendExpectedValue,
  totalSimulations = 100000,
}: MonteCarloVisualizationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number | null>(null)
  const startTimeRef = useRef<number>(0)
  const particlesRef = useRef<Particle[]>([])
  const initializedRef = useRef(false)

  const [animationProgress, setAnimationProgress] = useState(0) // 0-1

  // Check if we have real backend stats
  const hasBackendStats = backendSuccessRate !== undefined

  // Initialize particles once when simulation starts
  useEffect(() => {
    if (phase === 'simulating' && !initializedRef.current) {
      initializedRef.current = true
      startTimeRef.current = performance.now()

      // Create particles with random success/failure based on rough estimate
      // These will be re-colored when backend stats arrive
      const particles: Particle[] = []
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        particles.push({
          id: i,
          x: Math.random() * 100, // Will be scaled to canvas width
          y: Math.random() * 100, // Will be scaled to canvas height
          targetY: 30 + Math.random() * 40, // Random target in middle area initially
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          radius: 2 + Math.random() * 2,
          opacity: 0,
          isSuccess: Math.random() > 0.5, // Random initially
        })
      }
      particlesRef.current = particles
    }

    // Reset when going back to idle
    if (phase === 'idle' || phase === 'loading') {
      initializedRef.current = false
      particlesRef.current = []
      setAnimationProgress(0)
    }
  }, [phase])

  // Update particle success/failure when backend stats arrive
  useEffect(() => {
    if (hasBackendStats && particlesRef.current.length > 0) {
      const successCount = Math.round(PARTICLE_COUNT * backendSuccessRate)
      particlesRef.current.forEach((particle, i) => {
        particle.isSuccess = i < successCount
        // Update target Y based on success/failure
        if (particle.isSuccess) {
          particle.targetY = 15 + Math.random() * 30 // Upper half (above goal)
        } else {
          particle.targetY = 55 + Math.random() * 30 // Lower half (below goal)
        }
      })
      // Shuffle to distribute success/failure randomly across visual positions
      particlesRef.current.sort(() => Math.random() - 0.5)
    }
  }, [hasBackendStats, backendSuccessRate])

  // Main animation loop
  useEffect(() => {
    if (phase !== 'simulating' && phase !== 'sensitivity' && phase !== 'complete') {
      return
    }

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const animate = () => {
      const now = performance.now()
      const elapsed = now - startTimeRef.current
      const progress = Math.min(elapsed / ANIMATION_DURATION, 1)
      setAnimationProgress(progress)

      // Get canvas dimensions
      const dpr = window.devicePixelRatio || 1
      const rect = canvas.getBoundingClientRect()

      if (rect.width === 0 || rect.height === 0) {
        animationRef.current = requestAnimationFrame(animate)
        return
      }

      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      ctx.scale(dpr, dpr)

      const width = rect.width
      const height = rect.height
      const goalY = height * 0.5

      // Clear canvas
      ctx.fillStyle = COLORS.background
      ctx.fillRect(0, 0, width, height)

      // Draw subtle grid
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)'
      ctx.lineWidth = 1
      for (let i = 1; i < 8; i++) {
        const y = (i / 8) * height
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(width, y)
        ctx.stroke()
      }
      for (let i = 1; i < 12; i++) {
        const x = (i / 12) * width
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, height)
        ctx.stroke()
      }

      // Draw goal line
      ctx.strokeStyle = COLORS.goalLine
      ctx.lineWidth = 1.5
      ctx.setLineDash([8, 6])
      ctx.beginPath()
      ctx.moveTo(40, goalY)
      ctx.lineTo(width - 20, goalY)
      ctx.stroke()
      ctx.setLineDash([])

      // Goal label
      ctx.fillStyle = COLORS.goalLine
      ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText(`${formatCompactNumber(config.goalAmount)} Goal`, width - 100, goalY - 8)

      // Animation phases
      const spawnPhase = Math.min(progress / 0.3, 1)      // 0-30%: spawn
      const driftPhase = Math.min(Math.max((progress - 0.3) / 0.4, 0), 1) // 30-70%: drift
      const settlePhase = Math.min(Math.max((progress - 0.7) / 0.3, 0), 1) // 70-100%: settle

      // Update and draw particles
      const particles = particlesRef.current
      const visibleCount = Math.floor(spawnPhase * PARTICLE_COUNT)

      for (let i = 0; i < visibleCount; i++) {
        const particle = particles[i]
        if (!particle) continue

        // Fade in
        particle.opacity = Math.min(particle.opacity + 0.1, 1)

        // Convert percentage positions to canvas coordinates
        const targetX = (particle.x / 100) * width
        const targetYPos = (particle.targetY / 100) * height

        // Current position (lerp toward target based on settle phase)
        let currentX = targetX + particle.vx * (1 - settlePhase) * 50
        let currentY: number

        if (settlePhase < 1) {
          // During drift/settle: move from random position toward target
          const randomY = (particle.y / 100) * height
          currentY = randomY + (targetYPos - randomY) * settlePhase
          // Add some Brownian motion during drift
          if (driftPhase > 0 && settlePhase < 0.5) {
            currentX += (Math.random() - 0.5) * 3
            currentY += (Math.random() - 0.5) * 3
          }
        } else {
          // Settled: gentle bobbing
          currentY = targetYPos + Math.sin(now * 0.002 + particle.id) * 2
        }

        // Determine color based on phase and success
        let color: string
        let glowColor: string | null = null

        if (settlePhase < 0.3) {
          // Still spawning/drifting: neutral white
          color = COLORS.particleNeutral
        } else {
          // Settling/settled: show success/failure colors
          if (particle.isSuccess) {
            color = `rgba(34, 197, 94, ${particle.opacity})`
            glowColor = COLORS.glowSuccess
          } else {
            color = `rgba(239, 68, 68, ${particle.opacity * 0.7})`
            glowColor = COLORS.glowFailure
          }
        }

        // Draw particle
        ctx.beginPath()
        if (glowColor && settlePhase > 0.5) {
          ctx.shadowBlur = 8 * settlePhase
          ctx.shadowColor = glowColor
        } else {
          ctx.shadowBlur = 0
        }
        ctx.fillStyle = color
        ctx.arc(currentX, currentY, particle.radius, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0
      }

      // Y-axis labels
      ctx.fillStyle = COLORS.textDim
      ctx.font = '10px -apple-system, BlinkMacSystemFont, sans-serif'
      ctx.textAlign = 'right'
      ctx.fillText(formatCompactNumber(config.goalAmount * 2), 35, 20)
      ctx.fillText(formatCompactNumber(config.goalAmount), 35, goalY + 4)
      ctx.fillText('$0', 35, height - 10)

      // Continue animation
      animationRef.current = requestAnimationFrame(animate)
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [phase, config.goalAmount])

  // Get phase label
  const getPhaseLabel = () => {
    if (animationProgress < 0.3) return 'Generating scenarios...'
    if (animationProgress < 0.7) return 'Computing outcomes...'
    if (animationProgress < 1) return 'Analyzing convergence...'
    return 'Simulation complete'
  }

  return (
    <div className="monte-carlo-viz">
      {/* Particle Canvas */}
      <div className="viz-section particle-section">
        <div className="viz-header">
          <span className="viz-label">Monte Carlo Simulation</span>
          <span className="viz-sublabel phase-indicator">
            {phase === 'simulating' || phase === 'sensitivity' || phase === 'complete'
              ? getPhaseLabel()
              : 'Waiting...'}
          </span>
        </div>
        <div className="canvas-container particle-canvas-container">
          <canvas
            ref={canvasRef}
            className="particle-canvas"
            style={{ width: '100%', height: '400px' }}
          />
        </div>
      </div>

      {/* Stats Row */}
      <div className="viz-bottom-row">
        {/* Simulation Counter */}
        <div className="viz-section counter-section">
          <div className="viz-header">
            <span className="viz-label">Simulations</span>
          </div>
          <div className="counter-display">
            <span className="counter-value tabular-nums">
              {backendSimCount.toLocaleString()}
            </span>
            <span className="counter-target">/ {totalSimulations.toLocaleString()}</span>
          </div>
          <div className="counter-bar-track">
            <div
              className="counter-bar-fill"
              style={{ width: `${(backendSimCount / totalSimulations) * 100}%` }}
            />
          </div>
        </div>

        {/* Success Rate */}
        <div className="viz-section stats-section">
          <div className="viz-header">
            <span className="viz-label">Success Rate</span>
          </div>
          <div className="stats-display">
            {hasBackendStats ? (
              <>
                <span className={`stats-percentage ${
                  (backendSuccessRate * 100) >= 68 ? 'stats-high' :
                  (backendSuccessRate * 100) >= 34 ? 'stats-medium' : 'stats-low'
                }`}>
                  {Math.round(backendSuccessRate * 100)}%
                </span>
                <span className="stats-expected">
                  Expected: {formatCurrency(Math.round(backendExpectedValue ?? 0))}
                </span>
              </>
            ) : (
              <>
                <span className="stats-percentage stats-pending">—</span>
                <span className="stats-expected">Calculating...</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default MonteCarloVisualization
