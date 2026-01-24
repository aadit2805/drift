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

interface ResultsChartProps {
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

export function ResultsChart({ percentiles, goalAmount, timelineMonths }: ResultsChartProps) {
  // Generate projection data points
  const data = Array.from({ length: timelineMonths + 1 }, (_, month) => {
    const progress = month / timelineMonths
    // Apply non-linear growth (compound effect)
    const growthFactor = Math.pow(progress, 0.8)

    return {
      month,
      p10: Math.round(percentiles.p10 * growthFactor),
      p25: Math.round(percentiles.p25 * growthFactor),
      p50: Math.round(percentiles.p50 * growthFactor),
      p75: Math.round(percentiles.p75 * growthFactor),
      p90: Math.round(percentiles.p90 * growthFactor),
      goal: goalAmount,
    }
  })

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass-card rounded-lg p-4 border border-white/10">
          <p className="text-white/50 text-sm mb-2">Month {label}</p>
          <div className="space-y-1">
            <p className="text-sm">
              <span className="text-purple-400">90th:</span>{' '}
              <span className="text-white font-medium">${payload[0]?.value?.toLocaleString()}</span>
            </p>
            <p className="text-sm">
              <span className="text-indigo-400">Median:</span>{' '}
              <span className="text-white font-medium">${payload[2]?.value?.toLocaleString()}</span>
            </p>
            <p className="text-sm">
              <span className="text-blue-400">10th:</span>{' '}
              <span className="text-white font-medium">${payload[4]?.value?.toLocaleString()}</span>
            </p>
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="gradient90" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#a78bfa" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradient75" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#818cf8" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#818cf8" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradient50" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity={0.6} />
              <stop offset="100%" stopColor="#6366f1" stopOpacity={0.1} />
            </linearGradient>
            <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#667eea" />
              <stop offset="50%" stopColor="#764ba2" />
              <stop offset="100%" stopColor="#f093fb" />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis
            dataKey="month"
            tickFormatter={(month) => `M${month}`}
            stroke="rgba(255,255,255,0.3)"
            fontSize={12}
            axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
            tickLine={{ stroke: 'rgba(255,255,255,0.1)' }}
          />
          <YAxis
            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
            stroke="rgba(255,255,255,0.3)"
            fontSize={12}
            axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
            tickLine={{ stroke: 'rgba(255,255,255,0.1)' }}
          />
          <Tooltip content={<CustomTooltip />} />

          {/* Confidence bands - outer to inner */}
          <Area
            type="monotone"
            dataKey="p90"
            stroke="none"
            fill="url(#gradient90)"
            name="90th percentile"
          />
          <Area
            type="monotone"
            dataKey="p75"
            stroke="none"
            fill="url(#gradient75)"
            name="75th percentile"
          />
          <Area
            type="monotone"
            dataKey="p50"
            stroke="url(#lineGradient)"
            fill="url(#gradient50)"
            strokeWidth={3}
            name="Median"
          />
          <Area
            type="monotone"
            dataKey="p25"
            stroke="none"
            fill="url(#gradient75)"
            name="25th percentile"
          />
          <Area
            type="monotone"
            dataKey="p10"
            stroke="none"
            fill="url(#gradient90)"
            name="10th percentile"
          />

          {/* Goal line */}
          <ReferenceLine
            y={goalAmount}
            stroke="#ec4899"
            strokeDasharray="6 4"
            strokeWidth={2}
            label={{
              value: `Goal: $${goalAmount.toLocaleString()}`,
              position: 'right',
              fill: '#ec4899',
              fontSize: 12,
              fontWeight: 500,
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
