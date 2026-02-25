import { geminiService } from './geminiService.js'
import type { SimulationResults, FinancialProfile } from '../types/index.js'

interface ParsedGoal {
  goalType: string
  targetAmount: number | null
  timelineMonths: number | null
  constraints: string[]
  clarifyingQuestions: string[] | null
  needsClarification?: boolean
}

interface GoalInput {
  targetAmount: number
  timelineMonths: number
  goalType: string
}

export class LLMService {
  async parseGoal(goal: string): Promise<ParsedGoal> {
    return geminiService.parseGoal(goal)
  }

  async generateRecommendations(
    simulationResults: SimulationResults,
    financialProfile: FinancialProfile,
    goal: GoalInput
  ): Promise<string[]> {
    return geminiService.generateRecommendations(
      simulationResults,
      financialProfile,
      {
        targetAmount: goal.targetAmount,
        timelineMonths: goal.timelineMonths,
        goalType: goal.goalType,
      }
    )
  }
}
