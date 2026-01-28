'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'

interface ChartProps {
  percentiles: {
    p10: number
    p25: number
    p50: number
    p75: number
    p90: number
  }
  goalAmount: number
  timelineMonths: number
}

export function Chart({ percentiles, goalAmount, timelineMonths }: ChartProps) {
  const data = Array.from({ length: timelineMonths + 1 }, (_, month) => {
    const progress = month / timelineMonths
    const growthFactor = Math.pow(progress, 0.8)

    return {
      month,
      p10: Math.round(percentiles.p10 * growthFactor),
      p25: Math.round(percentiles.p25 * growthFactor),
      p50: Math.round(percentiles.p50 * growthFactor),
      p75: Math.round(percentiles.p75 * growthFactor),
      p90: Math.round(percentiles.p90 * growthFactor),
    }
  })

  const formatCurrency = (value: number) => {
    const rounded = Math.round(value)
    if (rounded < 0) return `-$${Math.abs(rounded).toLocaleString()}`
    return `$${rounded.toLocaleString()}`
  }

  const formatAxisValue = (value: number) => {
    const k = value / 1000
    if (k < 0) return `-$${Math.abs(k).toFixed(0)}k`
    return `$${k.toFixed(0)}k`
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="card p-3 text-sm">
          <p className="text-[var(--text-tertiary)] mb-2">Month {label}</p>
          <div className="space-y-1 tabular-nums">
            <p>90th: <span className="font-medium">{formatCurrency(payload[0]?.value || 0)}</span></p>
            <p>50th: <span className="font-medium">{formatCurrency(payload[2]?.value || 0)}</span></p>
            <p>10th: <span className="font-medium">{formatCurrency(payload[4]?.value || 0)}</span></p>
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="fillGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.15} />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--border-secondary)"
            vertical={false}
          />
          <XAxis
            dataKey="month"
            tickFormatter={(m) => `${m}mo`}
            stroke="var(--text-tertiary)"
            fontSize={12}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={formatAxisValue}
            stroke="var(--text-tertiary)"
            fontSize={12}
            axisLine={false}
            tickLine={false}
            width={55}
          />
          <Tooltip content={<CustomTooltip />} />

          <Area
            type="monotone"
            dataKey="p90"
            stroke="none"
            fill="var(--border-primary)"
          />
          <Area
            type="monotone"
            dataKey="p75"
            stroke="none"
            fill="var(--border-primary)"
          />
          <Area
            type="monotone"
            dataKey="p50"
            stroke="var(--accent)"
            fill="url(#fillGradient)"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="p25"
            stroke="none"
            fill="var(--border-primary)"
          />
          <Area
            type="monotone"
            dataKey="p10"
            stroke="none"
            fill="var(--border-primary)"
          />

          <ReferenceLine
            y={goalAmount}
            stroke="var(--error)"
            strokeDasharray="4 4"
            strokeWidth={1}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
