import { GoogleGenerativeAI } from '@google/generative-ai'
import type { SimulationResults, FinancialProfile } from '../types/index.js'

interface ParsedGoal {
  goalType: string
  targetAmount: number | null
  timelineMonths: number | null
  constraints: string[]
  clarifyingQuestions: string[] | null
  needsClarification?: boolean
}

// Initialize Gemini client only if API key is present
const genAI = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null

export class GeminiService {
  private model = genAI?.getGenerativeModel({ model: 'gemini-1.5-flash' })

  async parseGoal(goal: string): Promise<ParsedGoal> {
    if (!this.model) {
      console.warn('Gemini API key not configured, using mock parsing')
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
   - IMPORTANT: Flag as unrealistic if target seems way too low for the goal type (e.g., $3 for a car)

3. timeline_months: Number of months. If vague:
   - "in a few years" → 36
   - "by retirement" → use 65 - 30 = 35 years = 420 months
   - "soon" → 12
   - "long term" → 120

4. constraints: Array of any constraints mentioned (empty array if none)

5. needsClarification: Boolean. Set to true if:
   - Target amount is unrealistically low for the goal type
   - Timeline is missing for a time-sensitive goal
   - Goal description is too vague to estimate amounts
   - Example: "Buy a car for $3" should have needsClarification: true

6. clarifyingQuestions: If needsClarification is true, provide questions. Otherwise null.
   Examples:
   - "A corvette typically costs $50,000-$100,000. Did you mean $50,000 or $100,000?"
   - "When would you like to buy this car?"

Respond in JSON only, no explanation:
{
  "goalType": "string",
  "targetAmount": number | null,
  "timelineMonths": number | null,
  "constraints": ["string"],
  "needsClarification": boolean,
  "clarifyingQuestions": ["string"] | null
}`

    try {
      const result = await this.model.generateContent(prompt)
      const response = result.response
      const text = response.text()

      // Extract JSON from the response (handle markdown code blocks)
      let jsonStr = text
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim()
      }

      const parsed = JSON.parse(jsonStr) as ParsedGoal

      // Ensure clarifying questions exist if needed
      if (parsed.needsClarification && !parsed.clarifyingQuestions) {
        parsed.clarifyingQuestions = ['Please provide more specific details about your goal amount and timeline.']
      }

      return parsed
    } catch (error) {
      console.error('Gemini parsing error:', error)
      return this.mockParseGoal(goal)
    }
  }

  async generateNarrative(
    results: SimulationResults,
    profile: FinancialProfile,
    goal: { targetAmount: number; timelineMonths: number; goalType: string }
  ): Promise<string> {
    if (!this.model) {
      return this.mockNarrative(results, goal)
    }

    const successPercent = Math.round(results.successProbability * 100)
    const medianFormatted = this.formatCurrency(results.medianOutcome)
    const goalFormatted = this.formatCurrency(goal.targetAmount)
    const timelineYears = Math.round(goal.timelineMonths / 12 * 10) / 10
    const monthlySpending = this.formatCurrency(profile.monthlySpending)
    const monthlyIncome = this.formatCurrency(profile.monthlyIncome)
    const liquidAssets = this.formatCurrency(profile.liquidAssets)

    // Find top spending categories
    const topCategories = Object.entries(profile.spendingByCategory)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([cat, amount]) => `${cat} (${this.formatCurrency(amount / 12)}/month)`)
      .join(', ')

    const prompt = `You are a friendly, encouraging financial advisor creating a personalized audio briefing. Generate a 3-4 sentence narrative that sounds natural when spoken aloud.

Financial Situation:
- Goal: ${goal.goalType} - save ${goalFormatted} in ${timelineYears} years (${goal.timelineMonths} months)
- Success Probability: ${successPercent}%
- Expected Outcome (median): ${medianFormatted}
- Monthly Income: ${monthlyIncome}
- Monthly Spending: ${monthlySpending}
- Liquid Assets: ${liquidAssets}
- Top Spending Categories: ${topCategories}
- Spending Volatility: ${Math.round(profile.spendingVolatility * 100)}%

Simulation Results:
- 10th percentile (worst likely): ${this.formatCurrency(results.percentiles.p10)}
- 90th percentile (best likely): ${this.formatCurrency(results.percentiles.p90)}
- Gap from goal: ${this.formatCurrency(results.medianOutcome - goal.targetAmount)}

Guidelines:
1. Start with an assessment of their chances (good/solid/challenging path)
2. Highlight the biggest risk or opportunity based on the data
3. Give ONE specific, actionable recommendation
4. End with encouragement or a motivating insight
5. Use conversational language - this will be read aloud
6. Avoid jargon - speak like a trusted friend who happens to be good with money
7. Reference specific numbers to make it personal
8. Keep it to 3-4 sentences total (about 30-45 seconds when spoken)

Generate ONLY the narrative text, no quotes or extra formatting:`

    try {
      const result = await this.model.generateContent(prompt)
      const response = result.response
      return response.text().trim()
    } catch (error) {
      console.error('Gemini narrative generation error:', error)
      return this.mockNarrative(results, goal)
    }
  }

  async generateRecommendations(
    results: SimulationResults,
    profile: FinancialProfile,
    goal: { targetAmount: number; timelineMonths: number; goalType: string }
  ): Promise<string[]> {
    if (!this.model) {
      return this.mockRecommendations(results, profile, goal)
    }

    const prompt = `You are a financial advisor. Based on the following data, provide 3-4 specific, actionable recommendations.

Financial Profile:
- Monthly Income: $${profile.monthlyIncome}
- Monthly Spending: $${profile.monthlySpending}
- Liquid Assets: $${profile.liquidAssets}
- Credit Debt: $${profile.creditDebt}
- Loan Debt: $${profile.loanDebt}
- Monthly Loan Payments: $${profile.monthlyLoanPayments}
- Spending by Category: ${JSON.stringify(profile.spendingByCategory)}

Goal: ${goal.goalType} - $${goal.targetAmount} in ${goal.timelineMonths} months

Simulation Results:
- Success Probability: ${Math.round(results.successProbability * 100)}%
- Median Outcome: $${results.medianOutcome}
- 10th Percentile: $${results.percentiles.p10}
- 90th Percentile: $${results.percentiles.p90}

Provide specific recommendations as a JSON array of strings. Each recommendation should:
1. Reference specific numbers from their data
2. Be actionable (not vague advice)
3. Explain the expected impact

Respond with ONLY a JSON array like: ["recommendation 1", "recommendation 2", "recommendation 3"]`

    try {
      const result = await this.model.generateContent(prompt)
      const response = result.response
      const text = response.text()

      let jsonStr = text
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim()
      }

      return JSON.parse(jsonStr) as string[]
    } catch (error) {
      console.error('Gemini recommendations error:', error)
      return this.mockRecommendations(results, profile, goal)
    }
  }

  private formatCurrency(value: number): string {
    const num = Math.round(value)
    if (num >= 1000000) {
      return `$${(num / 1000000).toFixed(1)}M`
    }
    if (num >= 1000) {
      return `$${Math.round(num / 1000)}K`
    }
    return `$${num}`
  }

  private mockParseGoal(goal: string): ParsedGoal {
    const lowerGoal = goal.toLowerCase()

    let goalType = 'custom'
    let targetAmount: number | null = null
    let timelineMonths: number | null = null
    let needsClarification = false
    let clarifyingQuestions: string[] | null = null

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
    } else if (lowerGoal.includes('car') || lowerGoal.includes('corvette')) {
      goalType = 'major_purchase'
      targetAmount = 50000
      timelineMonths = 36
    }

    const amountMatch = goal.match(/\$?([\d,]+)(?:k|K)?/)
    let extractedAmount: number | null = null
    if (amountMatch) {
      let amount = parseInt(amountMatch[1].replace(/,/g, ''))
      if (goal.toLowerCase().includes('k') && amount < 1000) {
        amount *= 1000
      }
      extractedAmount = amount
    }

    if (extractedAmount !== null && extractedAmount < 100) {
      if (goalType === 'major_purchase' || goalType === 'retirement') {
        needsClarification = true
        clarifyingQuestions = [
          `The amount $${extractedAmount} seems very low for a ${goalType}. Did you mean $${extractedAmount * 1000}?`,
          'Could you clarify the exact amount you need?'
        ]
      }
    }

    if (extractedAmount !== null) {
      targetAmount = extractedAmount
    }

    const yearMatch = goal.match(/(\d+)\s*year/)
    const monthMatch = goal.match(/(\d+)\s*month/)
    if (yearMatch) {
      timelineMonths = parseInt(yearMatch[1]) * 12
    } else if (monthMatch) {
      timelineMonths = parseInt(monthMatch[1])
    }

    if (targetAmount === null && goalType === 'custom') {
      needsClarification = true
      clarifyingQuestions = [
        'How much money do you need to save?',
        'When do you want to achieve this goal?'
      ]
    }

    return {
      goalType,
      targetAmount,
      timelineMonths,
      constraints: [],
      needsClarification,
      clarifyingQuestions,
    }
  }

  private mockNarrative(
    results: SimulationResults,
    goal: { targetAmount: number; timelineMonths: number; goalType: string }
  ): string {
    const successPercent = Math.round(results.successProbability * 100)
    const goalFormatted = this.formatCurrency(goal.targetAmount)

    if (successPercent >= 75) {
      return `Great news! With a ${successPercent}% chance of reaching your ${goalFormatted} ${goal.goalType} goal, you're on a solid path. Your consistent saving habits are paying off. Keep up the momentum, and consider increasing your investment contributions when possible to reach your goal even faster.`
    } else if (successPercent >= 50) {
      return `With a ${successPercent}% chance of reaching your ${goalFormatted} goal, you're making progress but there's room to improve. Your biggest opportunity is reducing discretionary spending - even small cuts can make a significant difference. Consider setting up automatic transfers to savings to stay on track.`
    } else {
      return `Your current path shows a ${successPercent}% chance of reaching your ${goalFormatted} goal, which means we need to make some adjustments. The good news is that small changes can have a big impact. Focus on reducing your top spending categories and consider extending your timeline if possible.`
    }
  }

  private mockRecommendations(
    results: SimulationResults,
    profile: FinancialProfile,
    goal: { targetAmount: number; timelineMonths: number; goalType: string }
  ): string[] {
    const recommendations: string[] = []

    if (results.successProbability < 0.5) {
      recommendations.push(
        'Your current path has less than 50% chance of success. Consider increasing your savings rate or extending your timeline.'
      )
    }

    if (profile.monthlySpending > profile.monthlyIncome * 0.7) {
      recommendations.push(
        "You're spending over 70% of your income. Reducing discretionary spending could significantly improve your odds."
      )
    }

    if (results.percentiles.p10 < goal.targetAmount * 0.5) {
      recommendations.push(
        'In worst-case scenarios, you may fall significantly short. Consider building an emergency fund first.'
      )
    }

    if (recommendations.length === 0) {
      recommendations.push(
        "You're on a good track! Stay consistent with your savings plan."
      )
    }

    return recommendations
  }
}

export const geminiService = new GeminiService()
