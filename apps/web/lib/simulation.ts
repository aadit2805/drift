/**
 * Client-side Monte Carlo simulation for visualization purposes.
 * This generates approximate paths for visual effect while the real
 * Python backend computes accurate results.
 */

export interface SimulationPath {
  id: number
  values: number[] // Balance at each month
  finalValue: number
  meetsGoal: boolean
}

export interface RunningStatistics {
  successCount: number
  totalRuns: number
  successRate: number
  outcomes: number[]
  mean: number
  p10: number
  p25: number
  p50: number
  p75: number
  p90: number
}

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

// Box-Muller transform for normal distribution
function randomNormal(mean: number = 0, std: number = 1): number {
  const u1 = Math.random()
  const u2 = Math.random()
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
  return mean + std * z
}

// Get market return parameters based on risk tolerance
function getMarketParams(riskTolerance: 'low' | 'medium' | 'high') {
  switch (riskTolerance) {
    case 'low':
      return { annualReturn: 0.04, annualVolatility: 0.08 }
    case 'medium':
      return { annualReturn: 0.07, annualVolatility: 0.15 }
    case 'high':
      return { annualReturn: 0.10, annualVolatility: 0.22 }
  }
}

/**
 * Generate a single simulation path
 */
export function generatePath(
  config: VisualizationConfig,
  pathId: number
): SimulationPath {
  const { annualReturn, annualVolatility } = getMarketParams(config.riskTolerance)
  const monthlyReturn = annualReturn / 12
  const monthlyVolatility = annualVolatility / Math.sqrt(12)

  const values: number[] = [config.startingBalance]
  let balance = config.startingBalance

  for (let month = 1; month <= config.months; month++) {
    // Monthly savings (income - spending with volatility)
    const spendingShock = randomNormal(0, config.spendingVolatility * config.monthlySpending)
    const actualSpending = Math.max(0, config.monthlySpending + spendingShock)
    const monthlySavings = config.monthlyIncome - actualSpending

    // Investment returns on existing balance
    const returnShock = randomNormal(monthlyReturn, monthlyVolatility)
    const investmentGain = balance * returnShock

    // Update balance
    balance = balance + monthlySavings + investmentGain

    // Floor at zero (can't have negative balance in this simple model)
    balance = Math.max(0, balance)

    values.push(balance)
  }

  return {
    id: pathId,
    values,
    finalValue: balance,
    meetsGoal: balance >= config.goalAmount,
  }
}

/**
 * Compute running statistics from a set of paths
 */
export function computeStatistics(paths: SimulationPath[]): RunningStatistics {
  if (paths.length === 0) {
    return {
      successCount: 0,
      totalRuns: 0,
      successRate: 0,
      outcomes: [],
      mean: 0,
      p10: 0,
      p25: 0,
      p50: 0,
      p75: 0,
      p90: 0,
    }
  }

  const outcomes = paths.map((p) => p.finalValue)
  const successCount = paths.filter((p) => p.meetsGoal).length
  const sorted = [...outcomes].sort((a, b) => a - b)

  const percentile = (p: number) => {
    const idx = Math.floor((p / 100) * sorted.length)
    return sorted[Math.min(idx, sorted.length - 1)]
  }

  return {
    successCount,
    totalRuns: paths.length,
    successRate: successCount / paths.length,
    outcomes,
    mean: outcomes.reduce((a, b) => a + b, 0) / outcomes.length,
    p10: percentile(10),
    p25: percentile(25),
    p50: percentile(50),
    p75: percentile(75),
    p90: percentile(90),
  }
}

/**
 * Build histogram buckets from outcomes
 */
export function buildHistogram(
  outcomes: number[],
  bucketCount: number = 20
): { min: number; max: number; value: number }[] {
  if (outcomes.length === 0) return []

  const min = Math.min(...outcomes)
  const max = Math.max(...outcomes)
  const range = max - min || 1
  const bucketSize = range / bucketCount

  const buckets = new Array(bucketCount).fill(0).map((_, i) => ({
    min: min + i * bucketSize,
    max: min + (i + 1) * bucketSize,
    value: 0,
  }))

  for (const outcome of outcomes) {
    const bucketIdx = Math.min(
      Math.floor((outcome - min) / bucketSize),
      bucketCount - 1
    )
    buckets[bucketIdx].value++
  }

  return buckets
}

/**
 * Simulation controller that yields paths incrementally
 */
export class SimulationController {
  private config: VisualizationConfig
  private paths: SimulationPath[] = []
  private isRunning = false
  private animationFrame: number | null = null
  private pathsPerFrame = 3
  private targetPaths: number
  private onUpdate: (paths: SimulationPath[], stats: RunningStatistics) => void
  private onComplete: () => void

  constructor(
    config: VisualizationConfig,
    onUpdate: (paths: SimulationPath[], stats: RunningStatistics) => void,
    onComplete: () => void
  ) {
    this.config = config
    this.targetPaths = config.nPaths
    this.onUpdate = onUpdate
    this.onComplete = onComplete
  }

  start() {
    if (this.isRunning) return
    this.isRunning = true
    this.paths = []
    this.tick()
  }

  stop() {
    this.isRunning = false
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame)
      this.animationFrame = null
    }
  }

  private tick = () => {
    if (!this.isRunning) return

    // Generate a batch of paths
    for (let i = 0; i < this.pathsPerFrame && this.paths.length < this.targetPaths; i++) {
      const path = generatePath(this.config, this.paths.length)
      this.paths.push(path)
    }

    // Compute stats and notify
    const stats = computeStatistics(this.paths)
    this.onUpdate(this.paths, stats)

    // Continue or complete
    if (this.paths.length < this.targetPaths) {
      this.animationFrame = requestAnimationFrame(this.tick)
    } else {
      this.isRunning = false
      this.onComplete()
    }
  }

  getPaths(): SimulationPath[] {
    return this.paths
  }

  getStats(): RunningStatistics {
    return computeStatistics(this.paths)
  }
}
