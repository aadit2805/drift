'use client'

import { Check, Clock, AlertCircle, Server } from 'lucide-react'
import { Card } from '@/components/ui/card'
import type { Job, NodeProgress } from '@/types'

interface JobProgressMonitorProps {
  job: Job | null
}

function NodeProgressBar({
  nodeId,
  progress,
  simulations,
  simsPerNode,
}: {
  nodeId: string
  progress: NodeProgress
  simulations: number
  simsPerNode: number
}) {
  const isComplete = progress.progress >= 100
  const displayName = nodeId.replace('node-', 'Node-')

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <Server className="w-3 h-3 text-muted-foreground" />
          <span className="font-medium">{displayName}</span>
        </div>
        <span className="text-muted-foreground tabular-nums">
          {progress.simulations.toLocaleString()}/{simsPerNode.toLocaleString()}
        </span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${
            isComplete ? 'bg-[var(--success)]' : 'bg-[hsl(var(--accent))]'
          }`}
          style={{ width: `${progress.progress}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{isComplete ? 'Complete' : 'Processing...'}</span>
        <span className="tabular-nums">{Math.round(progress.progress)}%</span>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: Job['status'] }) {
  const getStatusConfig = () => {
    switch (status) {
      case 'queued':
        return { label: 'QUEUED', color: 'text-muted-foreground', bg: 'bg-muted' }
      case 'allocated':
        return { label: 'ALLOCATING', color: 'text-[hsl(var(--accent))]', bg: 'bg-[hsl(var(--accent))]/10' }
      case 'running':
        return { label: 'RUNNING', color: 'text-[hsl(var(--accent))]', bg: 'bg-[hsl(var(--accent))]/10' }
      case 'complete':
        return { label: 'COMPLETE', color: 'text-[var(--success)]', bg: 'bg-[var(--success)]/10' }
      case 'failed':
        return { label: 'FAILED', color: 'text-[var(--error)]', bg: 'bg-[var(--error)]/10' }
    }
  }

  const config = getStatusConfig()

  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${config.color} ${config.bg}`}>
      {config.label}
    </span>
  )
}

export function JobProgressMonitor({ job }: JobProgressMonitorProps) {
  if (!job) {
    return (
      <Card className="p-6 bg-card/60 backdrop-blur-sm border-border/50">
        <div className="flex items-center justify-center h-32">
          <div className="text-muted-foreground text-sm">No active job</div>
        </div>
      </Card>
    )
  }

  const simsPerNode = Math.ceil(job.simulationsTotal / (job.allocatedNodes.length || 8))
  const nodeEntries = Object.entries(job.nodeProgress)

  return (
    <Card className="p-6 bg-card/60 backdrop-blur-sm border-border/50">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium">Job Progress</h3>
            <StatusBadge status={job.status} />
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 font-mono">{job.id}</p>
        </div>
        <div className="text-right">
          {job.status === 'queued' && job.queuePosition && (
            <p className="text-xs text-muted-foreground">
              Queue position: #{job.queuePosition}
            </p>
          )}
          {job.estimatedTimeRemaining !== undefined && job.status === 'running' && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>ETA: {job.estimatedTimeRemaining}s</span>
            </div>
          )}
        </div>
      </div>

      {/* Allocated Nodes Summary */}
      {job.allocatedNodes.length > 0 && (
        <div className="mb-4 p-3 rounded-lg bg-muted/30 border border-border/50">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Nodes Allocated</span>
            <span className="font-medium">
              {job.allocatedNodes.length} of 8
            </span>
          </div>
        </div>
      )}

      {/* Node Progress Bars */}
      {nodeEntries.length > 0 && (
        <div className="space-y-4 mb-4">
          {nodeEntries.map(([nodeId, progress]) => (
            <NodeProgressBar
              key={nodeId}
              nodeId={nodeId}
              progress={progress}
              simulations={progress.simulations}
              simsPerNode={simsPerNode}
            />
          ))}
        </div>
      )}

      {/* Queued State */}
      {job.status === 'queued' && (
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-muted-foreground border-t-[hsl(var(--accent))] rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm">Waiting for available nodes...</p>
          </div>
        </div>
      )}

      {/* Allocating State */}
      {job.status === 'allocated' && (
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-[hsl(var(--accent))] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm">Allocating compute nodes...</p>
          </div>
        </div>
      )}

      {/* Total Progress */}
      <div className="pt-4 border-t border-border/50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">Total Progress</span>
          <span className="text-xs font-medium tabular-nums">
            {job.simulationsComplete.toLocaleString()} / {job.simulationsTotal.toLocaleString()} simulations
          </span>
        </div>
        <div className="h-3 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              job.status === 'complete' ? 'bg-[var(--success)]' : 'bg-[hsl(var(--accent))]'
            }`}
            style={{ width: `${job.progress}%` }}
          />
        </div>
        <div className="flex justify-between mt-1 text-xs text-muted-foreground">
          <span>
            {job.status === 'complete' && <Check className="w-3 h-3 inline mr-1 text-[var(--success)]" />}
            {job.status === 'failed' && <AlertCircle className="w-3 h-3 inline mr-1 text-[var(--error)]" />}
            {job.progress}% complete
          </span>
          {job.status === 'running' && (
            <span className="animate-pulse">Processing...</span>
          )}
        </div>
      </div>

      {/* Error State */}
      {job.error && (
        <div className="mt-4 p-3 rounded-lg bg-[var(--error)]/10 border border-[var(--error)]/20">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-[var(--error)] mt-0.5 flex-shrink-0" />
            <p className="text-xs text-[var(--error)]">{job.error}</p>
          </div>
        </div>
      )}
    </Card>
  )
}
