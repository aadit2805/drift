import { Router } from 'express'
import { WhatIfService } from '../services/whatIfService.js'
import type { SimulationRequest } from '../types/index.js'

const router = Router()
const whatIfService = new WhatIfService()

router.post('/scenarios', async (req, res) => {
  try {
    const { request, currentSuccessProbability, gap } = req.body

    if (!request || typeof currentSuccessProbability !== 'number' || typeof gap !== 'number') {
      return res.status(400).json({
        error: 'Missing required parameters: request, currentSuccessProbability, gap'
      })
    }

    const scenarios = await whatIfService.generateScenarios(
      request as SimulationRequest,
      currentSuccessProbability,
      gap
    )

    res.json(scenarios)
  } catch (error) {
    console.error('Error generating what-if scenarios:', error)
    res.status(500).json({ error: 'Failed to generate scenarios' })
  }
})

export default router
