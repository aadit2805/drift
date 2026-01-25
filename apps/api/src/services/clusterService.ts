import type { SimulationRequest, SimulationResults, SensitivityAnalysis } from '../types/index.js'
import { SimulationService } from './simulationService.js'

// Cluster Node Types
export interface ClusterNode {
  id: string               // "node-01" through "node-08"
  status: 'idle' | 'busy' | 'offline'
  currentJobId?: string
  cpuUtilization: number
  memoryUtilization: number
  simulationsProcessed: number
}

// Job Types
export interface Job {
  id: string
  status: 'queued' | 'allocated' | 'running' | 'complete' | 'failed'
  progress: number         // 0-100
  allocatedNodes: string[]
  simulationsTotal: number
  simulationsComplete: number
  queuePosition?: number
  estimatedTimeRemaining?: number
  createdAt: Date
  startedAt?: Date
  completedAt?: Date
  request: SimulationRequest
  results?: SimulationResults
  sensitivityResults?: SensitivityAnalysis
  nodeProgress: Record<string, { progress: number; simulations: number }>
  error?: string
}

export interface ClusterStatus {
  nodes: ClusterNode[]
  totalNodes: number
  activeNodes: number
  idleNodes: number
  offlineNodes: number
  cpuUtilization: number
  memoryUtilization: number
  queueDepth: number
  activeJobs: number
}

export interface JobSubmitResponse {
  jobId: string
  queuePosition: number
  estimatedWait: number
}

const NUM_NODES = 8
const SIMS_PER_NODE = 12500 // 100,000 / 8 nodes

class ClusterService {
  private nodes: ClusterNode[] = []
  private jobs: Map<string, Job> = new Map()
  private jobQueue: string[] = []
  private simulationService: SimulationService
  private processingInterval: NodeJS.Timeout | null = null

  constructor() {
    this.simulationService = new SimulationService()
    this.initializeNodes()
    this.startProcessingLoop()
  }

  private initializeNodes() {
    for (let i = 1; i <= NUM_NODES; i++) {
      this.nodes.push({
        id: `node-${i.toString().padStart(2, '0')}`,
        status: 'idle',
        cpuUtilization: 0,
        memoryUtilization: 0,
        simulationsProcessed: 0,
      })
    }
  }

  private generateJobId(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
    let id = 'j-'
    for (let i = 0; i < 6; i++) {
      id += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return id
  }

  // Submit a new job to the queue
  submitJob(request: SimulationRequest): JobSubmitResponse {
    const jobId = this.generateJobId()
    const totalSimulations = request.simulationParams?.nSimulations || 100000

    const job: Job = {
      id: jobId,
      status: 'queued',
      progress: 0,
      allocatedNodes: [],
      simulationsTotal: totalSimulations,
      simulationsComplete: 0,
      queuePosition: this.jobQueue.length + 1,
      createdAt: new Date(),
      request,
      nodeProgress: {},
    }

    this.jobs.set(jobId, job)
    this.jobQueue.push(jobId)

    // Estimate wait time based on queue depth
    const estimatedWait = this.jobQueue.length * 2 // ~2 seconds per job

    return {
      jobId,
      queuePosition: this.jobQueue.length,
      estimatedWait,
    }
  }

  // Get job status
  getJob(jobId: string): Job | undefined {
    return this.jobs.get(jobId)
  }

  // Cancel a job
  cancelJob(jobId: string): boolean {
    const job = this.jobs.get(jobId)
    if (!job) return false

    if (job.status === 'queued') {
      // Remove from queue
      const queueIndex = this.jobQueue.indexOf(jobId)
      if (queueIndex > -1) {
        this.jobQueue.splice(queueIndex, 1)
      }
      job.status = 'failed'
      job.error = 'Cancelled by user'
      return true
    }

    if (job.status === 'allocated' || job.status === 'running') {
      // Release allocated nodes
      for (const nodeId of job.allocatedNodes) {
        const node = this.nodes.find(n => n.id === nodeId)
        if (node) {
          node.status = 'idle'
          node.currentJobId = undefined
          node.cpuUtilization = 0
          node.memoryUtilization = 0
        }
      }
      job.status = 'failed'
      job.error = 'Cancelled by user'
      return true
    }

    return false
  }

  // Get cluster status
  getClusterStatus(): ClusterStatus {
    const activeNodes = this.nodes.filter(n => n.status === 'busy').length
    const idleNodes = this.nodes.filter(n => n.status === 'idle').length
    const offlineNodes = this.nodes.filter(n => n.status === 'offline').length

    const avgCpu = this.nodes.reduce((sum, n) => sum + n.cpuUtilization, 0) / NUM_NODES
    const avgMem = this.nodes.reduce((sum, n) => sum + n.memoryUtilization, 0) / NUM_NODES

    const allJobs = Array.from(this.jobs.values())
    const activeJobsCount = allJobs.filter(
      j => j.status === 'running' || j.status === 'allocated'
    ).length

    return {
      nodes: this.nodes,
      totalNodes: NUM_NODES,
      activeNodes,
      idleNodes,
      offlineNodes,
      cpuUtilization: Math.round(avgCpu),
      memoryUtilization: Math.round(avgMem),
      queueDepth: this.jobQueue.length,
      activeJobs: activeJobsCount,
    }
  }

  // Background processing loop
  private startProcessingLoop() {
    this.processingInterval = setInterval(() => {
      this.processQueue()
      this.updateRunningJobs()
    }, 200) // Update every 200ms for smoother progress
  }

  private processQueue() {
    if (this.jobQueue.length === 0) return

    // Find idle nodes
    const idleNodes = this.nodes.filter(n => n.status === 'idle')
    if (idleNodes.length === 0) return

    // Get next job from queue
    const jobId = this.jobQueue[0]
    const job = this.jobs.get(jobId)
    if (!job) {
      this.jobQueue.shift()
      return
    }

    // Check if we have enough nodes (use all available, min 1)
    const nodesToAllocate = Math.min(idleNodes.length, NUM_NODES)
    if (nodesToAllocate < 1) return

    // Allocate nodes
    const allocatedNodes = idleNodes.slice(0, nodesToAllocate)
    job.allocatedNodes = allocatedNodes.map(n => n.id)
    job.status = 'allocated'
    job.startedAt = new Date()

    // Initialize node progress
    for (const node of allocatedNodes) {
      node.status = 'busy'
      node.currentJobId = jobId
      node.cpuUtilization = 15 + Math.random() * 10 // Starting load
      node.memoryUtilization = 20 + Math.random() * 10
      job.nodeProgress[node.id] = { progress: 0, simulations: 0 }
    }

    // Remove from queue
    this.jobQueue.shift()

    // Update queue positions for remaining jobs
    this.jobQueue.forEach((queuedJobId, index) => {
      const queuedJob = this.jobs.get(queuedJobId)
      if (queuedJob) {
        queuedJob.queuePosition = index + 1
      }
    })

    // Start actual simulation in background
    this.runSimulation(jobId)
  }

  private async runSimulation(jobId: string) {
    const job = this.jobs.get(jobId)
    if (!job) return

    job.status = 'running'

    try {
      // Run the actual simulation
      const results = await this.simulationService.runSimulation(job.request)

      // Run sensitivity analysis
      let sensitivityResults: SensitivityAnalysis | undefined
      try {
        sensitivityResults = await this.simulationService.runSensitivityAnalysis(job.request)
      } catch (e) {
        console.warn('Sensitivity analysis failed:', e)
      }

      // Store results
      job.results = results
      job.sensitivityResults = sensitivityResults

      // Mark as complete after progress animation finishes
      // The progress is handled by updateRunningJobs
    } catch (error) {
      job.status = 'failed'
      job.error = error instanceof Error ? error.message : 'Simulation failed'
      this.releaseNodes(job)
    }
  }

  private updateRunningJobs() {
    const jobs = Array.from(this.jobs.values())
    for (const job of jobs) {
      if (job.status !== 'running' && job.status !== 'allocated') continue

      // Update progress for each allocated node
      const simsPerNode = Math.ceil(job.simulationsTotal / job.allocatedNodes.length)
      let totalComplete = 0
      let allNodesComplete = true

      for (const nodeId of job.allocatedNodes) {
        const nodeProgress = job.nodeProgress[nodeId]
        if (!nodeProgress) continue

        const node = this.nodes.find(n => n.id === nodeId)

        if (nodeProgress.progress < 100) {
          // Increment progress (variable speed to look realistic)
          const increment = 2 + Math.random() * 4
          nodeProgress.progress = Math.min(100, nodeProgress.progress + increment)
          nodeProgress.simulations = Math.floor((nodeProgress.progress / 100) * simsPerNode)

          // Update node utilization
          if (node) {
            node.cpuUtilization = 60 + Math.random() * 35
            node.memoryUtilization = 45 + Math.random() * 30
          }

          allNodesComplete = false
        } else {
          nodeProgress.simulations = simsPerNode
          if (node) {
            node.simulationsProcessed += simsPerNode
          }
        }

        totalComplete += nodeProgress.simulations
      }

      job.simulationsComplete = Math.min(totalComplete, job.simulationsTotal)
      job.progress = Math.round((job.simulationsComplete / job.simulationsTotal) * 100)

      // Calculate ETA
      if (job.startedAt && job.progress > 0 && job.progress < 100) {
        const elapsed = Date.now() - job.startedAt.getTime()
        const totalEstimated = (elapsed / job.progress) * 100
        job.estimatedTimeRemaining = Math.max(0, Math.round((totalEstimated - elapsed) / 1000))
      }

      // Check if complete
      if (allNodesComplete && job.results) {
        job.status = 'complete'
        job.completedAt = new Date()
        job.progress = 100
        job.simulationsComplete = job.simulationsTotal
        this.releaseNodes(job)
      }
    }
  }

  private releaseNodes(job: Job) {
    for (const nodeId of job.allocatedNodes) {
      const node = this.nodes.find(n => n.id === nodeId)
      if (node) {
        node.status = 'idle'
        node.currentJobId = undefined
        node.cpuUtilization = 0
        node.memoryUtilization = 0
      }
    }
  }

  // Cleanup on shutdown
  shutdown() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval)
    }
  }
}

// Singleton instance
export const clusterService = new ClusterService()
