/**
 * Calculate standard deviation of an array of numbers
 */
export function calculateStdDev(arr: number[]): number {
  const n = arr.length
  if (n === 0) return 0

  const mean = arr.reduce((a, b) => a + b, 0) / n
  const variance = arr.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n
  return Math.sqrt(variance)
}

/**
 * Get percentile value from sorted array
 */
export function getPercentile(sortedArr: number[], percentile: number): number {
  const index = Math.floor(sortedArr.length * (percentile / 100))
  return sortedArr[Math.min(index, sortedArr.length - 1)]
}

/**
 * Generate date string in YYYY-MM-DD format
 */
export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

/**
 * Add months to a date
 */
export function addMonths(date: Date, months: number): Date {
  const newDate = new Date(date)
  newDate.setMonth(newDate.getMonth() + months)
  return newDate
}

/**
 * Generate random number with normal distribution
 */
export function randomNormal(mean: number, stdDev: number): number {
  // Box-Muller transform
  const u1 = Math.random()
  const u2 = Math.random()
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2)
  return z0 * stdDev + mean
}

/**
 * Clamp a number between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}
