import OpenAI from 'openai'

// Only initialize OpenAI client if API key is present
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null

interface ParsedGoal {
  goalType: string
  targetAmount: number | null
  timelineMonths: number | null
  constraints: string[]
  clarifyingQuestions: string[] | null
}

export class LLMService {
  async parseGoal(goal: string): Promise<ParsedGoal> {
    // If no API key or client, use mock parsing
    if (!openai) {
      return this.mockParseGoal(goal)
    }

    const prompt = `You are a financial goal parser. Given a user's natural language financial goal, extract structured parameters.

User's goal: "${goal}"

Extract the following (use null if not determinable):

1. goal_type: One of:
   - "retirement" (retiring, stop working, financial independence)
   - "major_purchase" (house, car, boat, etc.)
   - "emergency_fund" (rainy day, safety net, 6 months expenses)
   - "debt_payoff" (pay off loans, become debt free)
   - "travel" (vacation, trip, sabbatical)
   - "education" (college, degree, certification)
   - "investment" (grow wealth, portfolio target)
   - "custom" (anything else)

2. target_amount: Number in USD. If vague:
   - "comfortable retirement" → 1000000
   - "house down payment" → 60000
   - "emergency fund" → 15000 (estimate)
   - "pay off debt" → null (will be filled from data)

3. timeline_months: Number of months. If vague:
   - "in a few years" → 36
   - "by retirement" → use 65 - 30 = 35 years = 420 months
   - "soon" → 12
   - "long term" → 120

4. constraints: Array of any constraints mentioned (empty array if none)

5. clarifying_questions: If the goal is too vague, return questions to ask (null if clear enough)

Respond in JSON only, no explanation:
{
  "goalType": "string",
  "targetAmount": number | null,
  "timelineMonths": number | null,
  "constraints": ["string"],
  "clarifyingQuestions": ["string"] | null
}`

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      })

      const content = response.choices[0].message.content
      if (!content) {
        throw new Error('No response from LLM')
      }

      return JSON.parse(content) as ParsedGoal
    } catch (error) {
      console.error('LLM parsing error:', error)
      // Fall back to mock parsing
      return this.mockParseGoal(goal)
    }
  }

  private mockParseGoal(goal: string): ParsedGoal {
    const lowerGoal = goal.toLowerCase()

    // Simple keyword-based parsing
    let goalType = 'custom'
    let targetAmount: number | null = null
    let timelineMonths: number | null = null

    // Detect goal type
    if (lowerGoal.includes('retire')) {
      goalType = 'retirement'
      targetAmount = 1000000
      timelineMonths = 360
    } else if (lowerGoal.includes('house') || lowerGoal.includes('down payment')) {
      goalType = 'major_purchase'
      targetAmount = 60000
      timelineMonths = 36
    } else if (lowerGoal.includes('emergency') || lowerGoal.includes('rainy day')) {
      goalType = 'emergency_fund'
      targetAmount = 15000
      timelineMonths = 12
    } else if (lowerGoal.includes('debt') || lowerGoal.includes('loan') || lowerGoal.includes('pay off')) {
      goalType = 'debt_payoff'
      targetAmount = 25000
      timelineMonths = 60
    } else if (lowerGoal.includes('vacation') || lowerGoal.includes('travel') || lowerGoal.includes('trip')) {
      goalType = 'travel'
      targetAmount = 5000
      timelineMonths = 12
    }

    // Try to extract specific amounts
    const amountMatch = goal.match(/\$?([\d,]+)(?:k|K)?/)
    if (amountMatch) {
      let amount = parseInt(amountMatch[1].replace(/,/g, ''))
      if (goal.toLowerCase().includes('k') && amount < 1000) {
        amount *= 1000
      }
      targetAmount = amount
    }

    // Try to extract timeline
    const yearMatch = goal.match(/(\d+)\s*year/)
    const monthMatch = goal.match(/(\d+)\s*month/)
    if (yearMatch) {
      timelineMonths = parseInt(yearMatch[1]) * 12
    } else if (monthMatch) {
      timelineMonths = parseInt(monthMatch[1])
    }

    return {
      goalType,
      targetAmount,
      timelineMonths,
      constraints: [],
      clarifyingQuestions: null,
    }
  }

  async generateRecommendations(
    simulationResults: any,
    financialProfile: any,
    goal: any
  ): Promise<string[]> {
    // Mock recommendations for now
    const recommendations: string[] = []

    if (simulationResults.successProbability < 0.5) {
      recommendations.push(
        'Your current path has less than 50% chance of success. Consider increasing your savings rate or extending your timeline.'
      )
    }

    if (financialProfile.monthlySpending > financialProfile.monthlyIncome * 0.7) {
      recommendations.push(
        'You\'re spending over 70% of your income. Reducing discretionary spending could significantly improve your odds.'
      )
    }

    if (simulationResults.percentiles.p10 < goal.targetAmount * 0.5) {
      recommendations.push(
        'In worst-case scenarios, you may fall significantly short. Consider building an emergency fund first.'
      )
    }

    if (recommendations.length === 0) {
      recommendations.push(
        'You\'re on a good track! Stay consistent with your savings plan.'
      )
    }

    return recommendations
  }
}
