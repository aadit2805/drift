import { geminiService } from './geminiService.js'

interface ParsedGoal {
  goalType: string
  targetAmount: number | null
  timelineMonths: number | null
  constraints: string[]
  clarifyingQuestions: string[] | null
  needsClarification?: boolean
}

export class LLMService {
  async parseGoal(goal: string): Promise<ParsedGoal> {
    // Delegate to Gemini service for goal parsing
    return geminiService.parseGoal(goal)
  }

  async generateRecommendations(
    simulationResults: any,
    financialProfile: any,
    goal: any
  ): Promise<string[]> {
    // Delegate to Gemini service for AI-powered recommendations
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
