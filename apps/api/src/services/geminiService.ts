import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai'
import type { SimulationResults, FinancialProfile } from '../types/index.js'

interface ParsedGoal {
  goalType: string
  targetAmount: number | null
  timelineMonths: number | null
  constraints: string[]
  clarifyingQuestions: string[] | null
  needsClarification?: boolean
}

export class GeminiService {
  private _model: GenerativeModel | null = null

  // Lazy initialization - only create client when first needed
  private get model(): GenerativeModel | null {
    if (this._model === null && process.env.GEMINI_API_KEY) {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
      // Use gemini-2.0-flash (works, just has rate limits)
      this._model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
    }
    return this._model
  }

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

    // Find top spending categories (with safety check)
    const topCategories = profile.spendingByCategory
      ? Object.entries(profile.spendingByCategory)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([cat, amount]) => `${cat} (${this.formatCurrency(amount / 12)}/month)`)
          .join(', ')
      : 'Not available'

    const prompt = `You are a friendly, encouraging financial advisor creating a personalized audio briefing. Generate a 3-4 sentence narrative that sounds natural when spoken aloud.

Financial Situation:
- Goal: ${goal.goalType} - save ${goalFormatted} in ${timelineYears} years (${goal.timelineMonths} months)
- Success Probability: ${successPercent}%
- Expected Outcome (median): ${medianFormatted}
- Monthly Income: ${monthlyIncome}
- Monthly Spending: ${monthlySpending}
- Liquid Assets: ${liquidAssets}
- Top Spending Categories: ${topCategories}
- Spending Volatility: ${profile.spendingVolatility ? Math.round(profile.spendingVolatility * 100) : 0}%

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
- Spending by Category: ${JSON.stringify(profile.spendingByCategory || {})}

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

  private goalTypeToEnglish(goalType: string): string {
    const mapping: Record<string, string> = {
      'major_purchase': 'savings',
      'retirement': 'retirement',
      'emergency_fund': 'emergency fund',
      'debt_payoff': 'debt payoff',
      'travel': 'vacation',
      'education': 'education',
      'investment': 'investment',
      'custom': 'financial',
    }
    return mapping[goalType] || 'financial'
  }

  private mockNarrative(
    results: SimulationResults,
    goal: { targetAmount: number; timelineMonths: number; goalType: string }
  ): string {
    const successPercent = Math.round(results.successProbability * 100)
    const goalFormatted = this.formatCurrency(goal.targetAmount)
    const goalTypeReadable = this.goalTypeToEnglish(goal.goalType)

    if (successPercent >= 75) {
      return `Great news! With a ${successPercent}% chance of reaching your ${goalFormatted} ${goalTypeReadable} goal, you're on a solid path. Your consistent saving habits are paying off. Keep up the momentum, and consider increasing your investment contributions when possible to reach your goal even faster.`
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

// Conversation message type
interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
}

// Goal conversation response
interface GoalConversationResponse {
  response: string
  isComplete: boolean
  parsedGoal?: {
    targetAmount: number
    timelineMonths: number
    goalType: string
  }
}

export class GeminiGoalConversation {
  private _model: GenerativeModel | null = null

  // Lazy initialization - only create model when first needed
  private get model(): GenerativeModel | null {
    if (this._model === null && process.env.GEMINI_API_KEY) {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
      this._model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
    }
    return this._model
  }

  async processUserInput(
    userMessage: string,
    conversationHistory: ConversationMessage[]
  ): Promise<GoalConversationResponse> {
    if (!this.model) {
      console.warn('Gemini API key not configured for goal conversation')
      return {
        response: "I'd love to help you set your financial goal. What are you saving for?",
        isComplete: false,
      }
    }

    console.log('Processing goal conversation:', { userMessage, historyLength: conversationHistory.length })

    const systemPrompt = `You are Drift, a friendly financial goal assistant. Your job is to help users define their financial goals through natural conversation.

RULES:
1. Be conversational and warm - like a smart friend who's good with money
2. Keep responses SHORT (1-2 sentences max)
3. Ask ONE clarifying question at a time if needed
4. Extract: goal type, target amount, timeline

WHEN YOU HAVE ALL THREE (amount, timeline, goal type):
- Confirm what you understood
- End your response with [GOAL_COMPLETE] on its own line
- Include a JSON block with the parsed goal:
\`\`\`json
{"targetAmount": NUMBER, "timelineMonths": NUMBER, "goalType": "STRING"}
\`\`\`

Goal types: retirement, major_purchase, emergency_fund, debt_payoff, travel, education, investment, custom

EXAMPLES:
User: "I want to save for a house"
You: "Nice! How much are you thinking for the down payment?"

User: "Like 50 thousand"
You: "Got it, $50K for a house down payment. What's your timeline - when are you hoping to buy?"

User: "Maybe 3 years"
You: "Perfect - $50,000 for a house down payment in 3 years. Let's see what your odds look like!
[GOAL_COMPLETE]
\`\`\`json
{"targetAmount": 50000, "timelineMonths": 36, "goalType": "major_purchase"}
\`\`\`"

Remember: Be concise! This will be spoken aloud.`

    // Build conversation context
    const conversationContext = conversationHistory
      .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n')

    const fullPrompt = `${systemPrompt}

CONVERSATION SO FAR:
${conversationContext}

User: ${userMessage}

Your response (remember: 1-2 sentences, conversational):`

    try {
      const result = await this.model.generateContent(fullPrompt)
      const responseText = result.response.text().trim()

      console.log('Gemini goal response:', responseText.substring(0, 200))

      // Check if goal is complete
      const isComplete = responseText.includes('[GOAL_COMPLETE]')

      // Extract parsed goal if complete
      let parsedGoal: GoalConversationResponse['parsedGoal'] = undefined
      if (isComplete) {
        const jsonMatch = responseText.match(/```json\s*([\s\S]*?)```/)
        if (jsonMatch) {
          try {
            parsedGoal = JSON.parse(jsonMatch[1].trim())
          } catch (e) {
            console.error('Failed to parse goal JSON:', e)
          }
        }
      }

      // Clean up response text (remove markers and JSON)
      let cleanResponse = responseText
        .replace('[GOAL_COMPLETE]', '')
        .replace(/```json[\s\S]*?```/g, '')
        .trim()

      return {
        response: cleanResponse,
        isComplete,
        parsedGoal,
      }
    } catch (error) {
      console.error('Gemini conversation error:', error)
      return {
        response: "I didn't quite catch that. What financial goal are you working towards?",
        isComplete: false,
      }
    }
  }
}

// Results conversation class for discussing simulation results
export class GeminiResultsConversation {
  private _model: GenerativeModel | null = null

  private get model(): GenerativeModel | null {
    if (this._model === null && process.env.GEMINI_API_KEY) {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
      this._model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
    }
    return this._model
  }

  async processUserInput(
    userMessage: string,
    conversationHistory: ConversationMessage[],
    context: {
      simulationResults: SimulationResults
      financialProfile: FinancialProfile
      goal: { targetAmount: number; timelineMonths: number; goalType: string }
    }
  ): Promise<{ response: string }> {
    if (!this.model) {
      console.warn('Gemini API key not configured for results conversation')
      return {
        response: "I'd be happy to discuss your results, but I'm not fully configured right now.",
      }
    }

    const { simulationResults, financialProfile, goal } = context
    const successPercent = Math.round(simulationResults.successProbability * 100)

    // Format all spending categories with monthly amounts
    const categoryEntries = financialProfile.spendingByCategory
      ? Object.entries(financialProfile.spendingByCategory).sort((a, b) => b[1] - a[1])
      : []
    const allCategories = categoryEntries.length > 0
      ? categoryEntries
          .map(([cat, amount]) => `  - ${cat}: $${Math.round(amount / 12)}/mo ($${Math.round(amount)}/yr)`)
          .join('\n')
      : 'No category data available - purchases may not be linked to merchants with categories'

    const monthlySavings = (financialProfile.monthlyIncome || 0) - (financialProfile.monthlySpending || 0)
    const totalDebt = (financialProfile.creditDebt || 0) + (financialProfile.loanDebt || 0)

    const systemPrompt = `You are Drift, a friendly financial advisor chatbot. The user has just completed a Monte Carlo simulation of their financial goal and wants to discuss the results with you.

SIMULATION RESULTS:
- Goal: ${goal.goalType} - save $${goal.targetAmount.toLocaleString()} in ${goal.timelineMonths} months (${Math.round(goal.timelineMonths / 12 * 10) / 10} years)
- Success Probability: ${successPercent}%
- Expected Outcome (median): $${Math.round(simulationResults.medianOutcome).toLocaleString()}
- 10th percentile (worst likely): $${Math.round(simulationResults.percentiles.p10).toLocaleString()}
- 25th percentile: $${Math.round(simulationResults.percentiles.p25).toLocaleString()}
- 75th percentile: $${Math.round(simulationResults.percentiles.p75).toLocaleString()}
- 90th percentile (best likely): $${Math.round(simulationResults.percentiles.p90).toLocaleString()}
- Gap from goal: $${Math.round(simulationResults.medianOutcome - goal.targetAmount).toLocaleString()}

FINANCIAL PROFILE:
- Monthly Income: $${(financialProfile.monthlyIncome || 0).toLocaleString()}
- Monthly Spending: $${(financialProfile.monthlySpending || 0).toLocaleString()}
- Monthly Savings (income - spending): $${monthlySavings.toLocaleString()}
- Savings Rate: ${financialProfile.monthlyIncome ? Math.round((monthlySavings / financialProfile.monthlyIncome) * 100) : 0}%
- Liquid Assets: $${(financialProfile.liquidAssets || 0).toLocaleString()}
- Total Debt: $${totalDebt.toLocaleString()} (Credit: $${(financialProfile.creditDebt || 0).toLocaleString()}, Loans: $${(financialProfile.loanDebt || 0).toLocaleString()})
- Monthly Loan Payments: $${(financialProfile.monthlyLoanPayments || 0).toLocaleString()}
- Spending Volatility: ${financialProfile.spendingVolatility ? Math.round(financialProfile.spendingVolatility * 100) : 0}%

SPENDING BY CATEGORY (all categories, sorted by amount):
${allCategories}

WHAT YOU CAN HELP WITH:
- Explain what specific spending categories are costing them
- Suggest which categories to cut and by how much to improve success odds
- Calculate how much they'd save by reducing a specific category
- Explain the simulation results in plain terms
- Discuss trade-offs between timeline and savings rate

RULES:
1. Be conversational, warm, and encouraging - like a smart friend who's good with money
2. Keep responses SHORT (2-4 sentences max) - this will be spoken aloud
3. Reference SPECIFIC numbers from their data - mention exact category names and dollar amounts
4. If they ask about improving odds, calculate specific savings from cutting categories
5. Don't be preachy or condescending
6. If asked about something outside their financial data, politely redirect to what you know`

    const conversationContext = conversationHistory
      .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n')

    const fullPrompt = `${systemPrompt}

CONVERSATION SO FAR:
${conversationContext}

User: ${userMessage}

Your response (2-4 sentences, conversational, reference their specific data):`

    try {
      const result = await this.model.generateContent(fullPrompt)
      const responseText = result.response.text().trim()

      return { response: responseText }
    } catch (error) {
      console.error('Gemini results conversation error:', error)
      return {
        response: "I had trouble processing that. Could you rephrase your question about your results?",
      }
    }
  }
}

export const geminiService = new GeminiService()
export const geminiGoalConversation = new GeminiGoalConversation()
export const geminiResultsConversation = new GeminiResultsConversation()
