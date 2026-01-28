import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
  const num = Number(value) || 0
  const rounded = Math.round(num)
  const abs = Math.abs(rounded)

  if (abs >= 1000000) {
    const millions = abs / 1000000
    const formatted = millions >= 10 ? Math.round(millions) : millions.toFixed(1).replace(/\.0$/, '')
    return rounded < 0 ? `-$${formatted}M` : `$${formatted}M`
  }
  if (abs >= 10000) {
    const thousands = abs / 1000
    const formatted = thousands >= 100 ? Math.round(thousands) : thousands.toFixed(1).replace(/\.0$/, '')
    return rounded < 0 ? `-$${formatted}K` : `$${formatted}K`
  }

  if (rounded < 0) {
    return `-$${abs.toLocaleString()}`
  }
  return `$${rounded.toLocaleString()}`
}

export function formatCurrencyWithSign(value: number): string {
  const num = Number(value) || 0
  const rounded = Math.round(num)
  const abs = Math.abs(rounded)

  if (abs >= 1000000) {
    const millions = abs / 1000000
    const formatted = millions >= 10 ? Math.round(millions) : millions.toFixed(1).replace(/\.0$/, '')
    return rounded < 0 ? `-$${formatted}M` : `+$${formatted}M`
  }
  if (abs >= 10000) {
    const thousands = abs / 1000
    const formatted = thousands >= 100 ? Math.round(thousands) : thousands.toFixed(1).replace(/\.0$/, '')
    return rounded < 0 ? `-$${formatted}K` : `+$${formatted}K`
  }

  if (rounded < 0) {
    return `-$${abs.toLocaleString()}`
  }
  return `+$${rounded.toLocaleString()}`
}

export function formatPercentage(value: number, decimals = 0): string {
  return `${(value * 100).toFixed(decimals)}%`
}

export function formatCompactNumber(value: number): string {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(0)}k`
  }
  return `$${value}`
}

export function calculateSavingsRate(income: number, spending: number): number {
  if (income <= 0) return 0
  return Math.max(0, (income - spending) / income)
}

export function monthsToYearsAndMonths(months: number): string {
  const years = Math.floor(months / 12)
  const remainingMonths = months % 12

  if (years === 0) {
    return `${remainingMonths} month${remainingMonths !== 1 ? 's' : ''}`
  }

  if (remainingMonths === 0) {
    return `${years} year${years !== 1 ? 's' : ''}`
  }

  return `${years} year${years !== 1 ? 's' : ''}, ${remainingMonths} month${
    remainingMonths !== 1 ? 's' : ''
  }`
}
