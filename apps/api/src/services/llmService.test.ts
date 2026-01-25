import { LLMService } from './llmService'

describe('LLMService - Goal Parsing', () => {
  let service: LLMService

  beforeEach(() => {
    service = new LLMService()
    // Force mock parsing by not setting OPENAI_API_KEY
    delete process.env.OPENAI_API_KEY
  })

  describe('Number parsing with multipliers', () => {
    test('parses "2 million" correctly', async () => {
      const result = await service.parseGoal('Save 2 million for retirement in 10 years')
      expect(result.targetAmount).toBe(2000000)
      expect(result.goalType).toBe('retirement')
      expect(result.timelineMonths).toBe(120)
    })

    test('parses "2M" correctly', async () => {
      const result = await service.parseGoal('I want to save 2M for a house down payment')
      expect(result.targetAmount).toBe(2000000)
    })

    test('parses "1.5 million" correctly', async () => {
      const result = await service.parseGoal('Need 1.5 million to retire')
      expect(result.targetAmount).toBe(1500000)
    })

    test('parses "50k" correctly', async () => {
      const result = await service.parseGoal('Save 50k for a car in 3 years')
      expect(result.targetAmount).toBe(50000)
      expect(result.timelineMonths).toBe(36)
    })

    test('parses "50 thousand" correctly', async () => {
      const result = await service.parseGoal('Save 50 thousand for emergency fund')
      expect(result.targetAmount).toBe(50000)
    })

    test('parses "$100k" correctly', async () => {
      const result = await service.parseGoal('I need $100k for a down payment')
      expect(result.targetAmount).toBe(100000)
    })

    test('parses "500K" correctly', async () => {
      const result = await service.parseGoal('Accumulate 500K in 5 years')
      expect(result.targetAmount).toBe(500000)
    })

    test('parses "3.2 million" correctly', async () => {
      const result = await service.parseGoal('Retire with 3.2 million')
      expect(result.targetAmount).toBe(3200000)
    })

    test('parses plain number "$25,000" correctly', async () => {
      const result = await service.parseGoal('Save $25,000 for vacation')
      expect(result.targetAmount).toBe(25000)
    })

    test('parses "5000" without multiplier correctly', async () => {
      const result = await service.parseGoal('Save 5000 for trip')
      expect(result.targetAmount).toBe(5000)
    })
  })

  describe('Goal type detection', () => {
    test('detects retirement goal', async () => {
      const result = await service.parseGoal('I want to retire comfortably')
      expect(result.goalType).toBe('retirement')
    })

    test('detects car purchase', async () => {
      const result = await service.parseGoal('Buy a corvette')
      expect(result.goalType).toBe('major_purchase')
      expect(result.targetAmount).toBe(50000)
    })

    test('detects emergency fund', async () => {
      const result = await service.parseGoal('Build an emergency fund')
      expect(result.goalType).toBe('emergency_fund')
    })

    test('detects travel goal', async () => {
      const result = await service.parseGoal('Save for vacation to Europe')
      expect(result.goalType).toBe('travel')
    })
  })

  describe('Timeline parsing', () => {
    test('parses "3 years" correctly', async () => {
      const result = await service.parseGoal('Save $50k in 3 years')
      expect(result.timelineMonths).toBe(36)
    })

    test('parses "24 months" correctly', async () => {
      const result = await service.parseGoal('Save $10k in 24 months')
      expect(result.timelineMonths).toBe(24)
    })

    test('parses "10 years" correctly', async () => {
      const result = await service.parseGoal('Retire in 10 years with 1 million')
      expect(result.timelineMonths).toBe(120)
    })
  })

  describe('Clarification needed', () => {
    test('flags unrealistically low amounts for major purchases', async () => {
      const result = await service.parseGoal('Buy a car for $2')
      expect(result.needsClarification).toBe(true)
      expect(result.clarifyingQuestions).toBeTruthy()
      expect(result.clarifyingQuestions?.length).toBeGreaterThan(0)
    })

    test('does not flag realistic amounts', async () => {
      const result = await service.parseGoal('Buy a car for $50k')
      expect(result.needsClarification).toBe(false)
    })

    test('flags vague custom goals', async () => {
      const result = await service.parseGoal('I want to save money')
      expect(result.needsClarification).toBe(true)
    })
  })

  describe('Edge cases', () => {
    test('handles decimal amounts with k multiplier', async () => {
      const result = await service.parseGoal('Save 12.5k')
      expect(result.targetAmount).toBe(12500)
    })

    test('handles commas in numbers', async () => {
      const result = await service.parseGoal('Save $1,234,567')
      expect(result.targetAmount).toBe(1234567)
    })

    test('handles "mil" abbreviation', async () => {
      const result = await service.parseGoal('I need 2 mil for retirement')
      expect(result.targetAmount).toBe(2000000)
    })

    test('handles lowercase "m" for million', async () => {
      const result = await service.parseGoal('Save 1.5m')
      expect(result.targetAmount).toBe(1500000)
    })
  })
})
