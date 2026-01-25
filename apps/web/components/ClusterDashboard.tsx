'use client'

import { Card } from '@/components/ui/card'
import type { ClusterStatus, ClusterNode } from '@/types'

interface ClusterDashboardProps {
  status: ClusterStatus | null
  activeJobId?: string
}

function NodeCard({ node, isAllocated }: { node: ClusterNode; isAllocated: boolean }) {
  const getStatusColor = () => {
    if (node.status === 'offline') return 'bg-muted border-muted-foreground/20'
    if (node.status === 'busy') return 'bg-[hsl(var(--accent))]/10 border-[hsl(var(--accent))]'
    return 'bg-muted/30 border-border'
  }

  const getStatusText = () => {
    if (node.status === 'offline') return 'OFFLINE'
    if (node.status === 'busy') return 'BUSY'
    return 'IDLE'
  }

  const getStatusTextColor = () => {
    if (node.status === 'offline') return 'text-muted-foreground'
    if (node.status === 'busy') return 'text-[hsl(var(--accent))]'
    return 'text-[var(--success)]'
  }

  return (
    <div
      className={`p-3 rounded-lg border transition-all ${getStatusColor()} ${
        isAllocated ? 'ring-2 ring-[hsl(var(--accent))]/50' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-mono font-medium">
          {node.id.toUpperCase().replace('NODE-', 'N-')}
        </span>
        <span className={`text-[10px] font-medium ${getStatusTextColor()}`}>
          {getStatusText()}
        </span>
      </div>
      {node.status === 'busy' && (
        <div className="h-1 bg-muted rounded-full overflow-hidden mt-1">
          <div
            className="h-full bg-[hsl(var(--accent))] transition-all duration-300"
            style={{ width: `${Math.round(node.cpuUtilization)}%` }}
          />
        </div>
      )}
    </div>
  )
}

function UtilizationBar({
  label,
  value,
  color = 'accent',
}: {
  label: string
  value: number
  color?: 'accent' | 'success'
}) {
  const barColor = color === 'success' ? 'bg-[var(--success)]' : 'bg-[hsl(var(--accent))]'

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono tabular-nums">{value}%</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full ${barColor} transition-all duration-500`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  )
}

export function ClusterDashboard({ status, activeJobId }: ClusterDashboardProps) {
  if (!status) {
    return (
      <Card className="p-6 bg-card/60 backdrop-blur-sm border-border/50">
        <div className="flex items-center justify-center h-32">
          <div className="w-6 h-6 border-2 border-muted-foreground border-t-[hsl(var(--accent))] rounded-full animate-spin" />
        </div>
      </Card>
    )
  }

  const healthStatus = status.offlineNodes === 0 ? 'Healthy' : 'Degraded'
  const healthColor = status.offlineNodes === 0 ? 'text-[var(--success)]' : 'text-[var(--warning)]'

  return (
    <Card className="p-6 bg-card/60 backdrop-blur-sm border-border/50">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-medium">Drift Compute Cluster</h3>
          <p className="text-xs text-muted-foreground">
            {status.totalNodes} nodes • {status.activeNodes} active
          </p>
        </div>
        <div className="text-right">
          <span className={`text-xs font-medium ${healthColor}`}>
            {healthStatus}
          </span>
        </div>
      </div>

      {/* Node Grid */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {status.nodes.map((node) => (
          <NodeCard
            key={node.id}
            node={node}
            isAllocated={node.currentJobId === activeJobId}
          />
        ))}
      </div>

      {/* Utilization Meters */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <UtilizationBar label="CPU" value={status.cpuUtilization} />
        <UtilizationBar label="Memory" value={status.memoryUtilization} />
      </div>

      {/* Queue Status */}
      <div className="flex justify-between text-xs pt-3 border-t border-border/50">
        <div>
          <span className="text-muted-foreground">Queue: </span>
          <span className="font-medium">{status.queueDepth} jobs</span>
        </div>
        <div>
          <span className="text-muted-foreground">Active: </span>
          <span className="font-medium">{status.activeJobs} job{status.activeJobs !== 1 ? 's' : ''}</span>
        </div>
      </div>
    </Card>
  )
}
