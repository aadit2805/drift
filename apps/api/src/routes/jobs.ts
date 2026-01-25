import { Router } from 'express'
import { clusterService } from '../services/clusterService.js'
import type { SimulationRequest } from '../types/index.js'

const router = Router()

// Submit a new job
router.post('/jobs', (req, res) => {
  try {
    const request: SimulationRequest = req.body

    // Validate request
    if (!request.financialProfile) {
      return res.status(400).json({ error: 'financialProfile is required' })
    }
    if (!request.goal) {
      return res.status(400).json({ error: 'goal is required' })
    }

    const result = clusterService.submitJob(request)
    res.json(result)
  } catch (error) {
    console.error('Error submitting job:', error)
    res.status(500).json({ error: 'Failed to submit job' })
  }
})

// Get job status
router.get('/jobs/:id', (req, res) => {
  try {
    const jobId = req.params.id
    const job = clusterService.getJob(jobId)

    if (!job) {
      return res.status(404).json({ error: 'Job not found' })
    }

    // Return job status with node progress
    res.json({
      id: job.id,
      status: job.status,
      progress: job.progress,
      allocatedNodes: job.allocatedNodes,
      simulationsTotal: job.simulationsTotal,
      simulationsComplete: job.simulationsComplete,
      queuePosition: job.queuePosition,
      estimatedTimeRemaining: job.estimatedTimeRemaining,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      nodeProgress: job.nodeProgress,
      error: job.error,
      // Include results only when complete
      results: job.status === 'complete' ? job.results : undefined,
      sensitivityResults: job.status === 'complete' ? job.sensitivityResults : undefined,
    })
  } catch (error) {
    console.error('Error getting job status:', error)
    res.status(500).json({ error: 'Failed to get job status' })
  }
})

// Cancel a job
router.delete('/jobs/:id', (req, res) => {
  try {
    const jobId = req.params.id
    const cancelled = clusterService.cancelJob(jobId)

    if (cancelled) {
      res.json({ success: true, message: 'Job cancelled' })
    } else {
      res.status(400).json({ error: 'Cannot cancel job - job not found or already complete' })
    }
  } catch (error) {
    console.error('Error cancelling job:', error)
    res.status(500).json({ error: 'Failed to cancel job' })
  }
})

// Get cluster status
router.get('/cluster/status', (req, res) => {
  try {
    const status = clusterService.getClusterStatus()
    res.json(status)
  } catch (error) {
    console.error('Error getting cluster status:', error)
    res.status(500).json({ error: 'Failed to get cluster status' })
  }
})

export default router
