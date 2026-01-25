import { Router } from 'express'
import { LLMService } from '../services/llmService.js'

const router = Router()
const llmService = new LLMService()

// Parse a natural language goal
router.post('/parse-goal', async (req, res) => {
  try {
    const { goal } = req.body

    if (!goal || typeof goal !== 'string') {
      return res.status(400).json({ error: 'Goal is required' })
    }

    const parsedGoal = await llmService.parseGoal(goal)

    // If clarification is needed, return 200 with a flag indicating user needs to provide more info
    res.json({
      ...parsedGoal,
      needsClarification: parsedGoal.needsClarification || false
    })
  } catch (error) {
    console.error('Error parsing goal:', error)
    res.status(500).json({ error: 'Failed to parse goal' })
  }
})

// Generate recommendations based on simulation results
router.post('/recommendations', async (req, res) => {
  try {
    const { simulationResults, financialProfile, goal } = req.body

    const recommendations = await llmService.generateRecommendations(
      simulationResults,
      financialProfile,
      goal
    )

    res.json({ recommendations })
  } catch (error) {
    console.error('Error generating recommendations:', error)
    res.status(500).json({ error: 'Failed to generate recommendations' })
  }
})

export default router
