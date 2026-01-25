import { spawn } from 'child_process'
import path from 'path'
import type { SimulationRequest, SimulationResults } from '../types/index.js'

export interface WhatIfScenario {
  name: string
  description: string
  savingsPerMonth: number
  projectedSuccessProbability: number
  implementationTips: string[]
}

interface SpendingCategory {
  [key: string]: number
}

export class WhatIfService {
  private simulationDir = path.resolve(process.cwd(), '../../simulation')
  private pythonPath = path.join(this.simulationDir, 'venv', 'Scripts', 'python.exe')

  async generateScenarios(
    baseRequest: SimulationRequest,
    currentSuccessProbability: number,
    gap: number
  ): Promise<WhatIfScenario[]> {
    const scenarios: WhatIfScenario[] = []

    if (gap <= 0) return scenarios

    const spending = baseRequest.financialProfile.spendingByCategory
    const monthlySpending = Object.fromEntries(
      Object.entries(spending).map(([k, v]) => [k, v / 12])
    )

    const categories = Object.entries(monthlySpending).sort((a, b) => b[1] - a[1])
    const nonEssential = categories.filter(([name]) => {
      const lower = name.toLowerCase()
      return ['dining', 'restaurant', 'entertainment', 'shopping', 'travel', 'subscription', 'coffee', 'bar', 'alcohol'].some(k => lower.includes(k))
    })

    // Scenario 1: Cut largest discretionary category
    if (nonEssential.length > 0) {
      const [name, amount] = nonEssential[0]
      const cutPercent = Math.min(0.5, gap / amount)
      const savingsPerMonth = amount * cutPercent

      if (cutPercent >= 0.05) {
        const newSpending = { ...spending }
        newSpending[name] = (amount * (1 - cutPercent)) * 12

        const modifiedRequest = JSON.parse(JSON.stringify(baseRequest))
        modifiedRequest.financialProfile.spendingByCategory = newSpending
        modifiedRequest.financialProfile.monthlySpending = 
          baseRequest.financialProfile.monthlySpending - savingsPerMonth

        try {
          const results = await this.runSimulation(modifiedRequest)
          scenarios.push({
            name: `Reduce ${name}`,
            description: `Cut ${name} by ${Math.round(cutPercent * 100)}% (save $${Math.round(savingsPerMonth)}/mo from $${Math.round(amount)}/mo)`,
            savingsPerMonth,
            projectedSuccessProbability: results.successProbability,
            implementationTips: this.getTips(name),
          })
        } catch (e) {
          console.error('Failed to run scenario:', e)
        }
      }
    }

    // Scenario 2: Balanced cuts across top 3 discretionary
    if (nonEssential.length >= 3) {
      const top3 = nonEssential.slice(0, 3)
      const cutPerCategory = gap / top3.length
      const totalSavingsPerMonth = gap

      const newSpending = { ...spending }
      top3.forEach(([name, amount]) => {
        const cutPercent = Math.min(0.3, cutPerCategory / amount)
        newSpending[name] = (amount * (1 - cutPercent)) * 12
      })

      const modifiedRequest = JSON.parse(JSON.stringify(baseRequest))
      modifiedRequest.financialProfile.spendingByCategory = newSpending
      modifiedRequest.financialProfile.monthlySpending = 
        baseRequest.financialProfile.monthlySpending - totalSavingsPerMonth

      try {
        const results = await this.runSimulation(modifiedRequest)
        const categoryNames = top3.map(([name]) => name).join(', ')
        scenarios.push({
          name: `Balance cuts across categories`,
          description: `Reduce ${categoryNames} to save $${Math.round(totalSavingsPerMonth)}/mo total`,
          savingsPerMonth: totalSavingsPerMonth,
          projectedSuccessProbability: results.successProbability,
          implementationTips: [
            'Identify your most flexible categories',
            'Set specific spending limits',
            'Track weekly spending',
            'Build in occasional treats to stay motivated'
          ],
        })
      } catch (e) {
        console.error('Failed to run scenario:', e)
      }
    }

    // Scenario 3: Increase income
    const incomeIncrease = gap / 10  // Conservative estimate
    const modifiedRequest = JSON.parse(JSON.stringify(baseRequest))
    modifiedRequest.userInputs.monthlyIncome += incomeIncrease

    try {
      const results = await this.runSimulation(modifiedRequest)
      scenarios.push({
        name: `Increase income`,
        description: `Earn $${Math.round(incomeIncrease)}/mo more (${((incomeIncrease / baseRequest.userInputs.monthlyIncome) * 100).toFixed(1)}% raise or side income)`,
        savingsPerMonth: incomeIncrease,
        projectedSuccessProbability: results.successProbability,
        implementationTips: [
          'Ask for a raise or promotion',
          'Develop side hustle (5-10 hrs/week)',
          'Freelance in your skill area',
          'Negotiate better salary at next job',
        ],
      })
    } catch (e) {
      console.error('Failed to run scenario:', e)
    }

    return scenarios
  }

  private async runSimulation(request: SimulationRequest): Promise<SimulationResults> {
    return new Promise((resolve, reject) => {
      const process = spawn(this.pythonPath, [
        path.join(this.simulationDir, 'main.py'),
        '--mode', 'simulate',
        '--input', JSON.stringify(request),
      ])

      let stdout = ''
      let stderr = ''

      process.stdout.on('data', (data) => {
        stdout += data.toString()
      })

      process.stderr.on('data', (data) => {
        stderr += data.toString()
      })

      process.on('close', (code) => {
        if (code === 0) {
          try {
            const results = JSON.parse(stdout)
            resolve(results)
          } catch (e) {
            reject(new Error(`Failed to parse simulation results: ${stdout}`))
          }
        } else {
          reject(new Error(`Python simulation failed: ${stderr}`))
        }
      })

      process.on('error', (err) => {
        reject(err)
      })
    })
  }

  private getTips(category: string): string[] {
    const lower = category.toLowerCase()
    
    if (lower.includes('dining') || lower.includes('restaurant') || lower.includes('food')) {
      return [
        'Cook at home 4-5 times per week',
        'Pack lunch for work instead of buying',
        'Meal prep on Sundays for the week',
        'Use grocery delivery instead of restaurants',
      ]
    }
    
    if (lower.includes('entertainment') || lower.includes('shopping')) {
      return [
        'Unsubscribe from unused streaming services',
        'Cancel unnecessary subscriptions',
        'Set a weekly shopping budget',
        'Use 30-day rule for non-essentials',
      ]
    }
    
    if (lower.includes('travel')) {
      return [
        'Plan trips during off-season',
        'Use rewards points and miles',
        'Travel locally more often',
        'Split accommodations with friends',
      ]
    }
    
    return [
      'Track spending in this category weekly',
      'Set a specific budget limit',
      'Find alternatives or substitutes',
      'Gradually reduce over time',
    ]
  }
}
