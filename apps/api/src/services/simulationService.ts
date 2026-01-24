import { spawn } from 'child_process'
import path from 'path'
import type { SimulationRequest, SimulationResults, SensitivityAnalysis } from '../types/index.js'

export class SimulationService {
  private pythonPath = 'python3'
  private simulationDir = path.resolve(process.cwd(), '../../simulation')

  async runSimulation(request: SimulationRequest): Promise<SimulationResults> {
    // Try to run Python simulation
    try {
      return await this.runPythonSimulation(request)
    } catch (error) {
      console.warn('Python simulation failed, using JS fallback:', error)
      return this.runJSSimulation(request)
    }
  }

  private async runPythonSimulation(request: SimulationRequest): Promise<SimulationResults> {
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

  // JavaScript fallback simulation (simplified)
  private runJSSimulation(request: SimulationRequest): SimulationResults {
    const {
      financialProfile,
      userInputs,
      goal,
      simulationParams = { nSimulations: 5000 },
    } = request

    const nSimulations = simulationParams.nSimulations || 5000
    const months = goal.timelineMonths

    // Calculate monthly savings potential
    const monthlySavings = userInputs.monthlyIncome - financialProfile.monthlySpending

    // Starting balance
    const startingBalance = financialProfile.liquidAssets - financialProfile.creditDebt

    // Run simulations
    const finalBalances: number[] = []

    for (let sim = 0; sim < nSimulations; sim++) {
      let balance = startingBalance

      for (let month = 0; month < months; month++) {
        // Income with variance
        const incomeVariance = 1 + (Math.random() - 0.5) * 0.1
        const monthlyIncome = userInputs.monthlyIncome * incomeVariance

        // Spending with variance
        const spendingVariance = 1 + (Math.random() - 0.5) * financialProfile.spendingVolatility * 2
        const monthlySpending = financialProfile.monthlySpending * spendingVariance

        // Random expense event (8% monthly chance)
        let unexpectedExpense = 0
        if (Math.random() < 0.08) {
          unexpectedExpense = 500 + Math.random() * 2000
        }

        // Investment returns (simplified - 7% annual / 12 months with variance)
        const monthlyReturn = balance > 0 ? balance * (0.07 / 12) * (1 + (Math.random() - 0.5)) : 0

        // Update balance
        balance += monthlyIncome - monthlySpending - unexpectedExpense + monthlyReturn
      }

      finalBalances.push(balance)
    }

    // Sort for percentile calculation
    finalBalances.sort((a, b) => a - b)

    const getPercentile = (arr: number[], p: number) =>
      arr[Math.floor(arr.length * (p / 100))]

    const successCount = finalBalances.filter((b) => b >= goal.targetAmount).length
    const successProbability = successCount / nSimulations

    const mean = finalBalances.reduce((a, b) => a + b, 0) / nSimulations
    const variance =
      finalBalances.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / nSimulations
    const std = Math.sqrt(variance)

    return {
      successProbability,
      medianOutcome: getPercentile(finalBalances, 50),
      percentiles: {
        p10: getPercentile(finalBalances, 10),
        p25: getPercentile(finalBalances, 25),
        p50: getPercentile(finalBalances, 50),
        p75: getPercentile(finalBalances, 75),
        p90: getPercentile(finalBalances, 90),
      },
      mean,
      std,
      worstCase: finalBalances[0],
      bestCase: finalBalances[finalBalances.length - 1],
    }
  }

  async runSensitivityAnalysis(request: SimulationRequest): Promise<SensitivityAnalysis> {
    // Run base simulation
    const baseResults = await this.runSimulation(request)

    // Define scenarios to test
    const scenarios = [
      { param: 'income_plus_10', modifier: (r: SimulationRequest) => {
        r.userInputs.monthlyIncome *= 1.1
        return r
      }},
      { param: 'income_minus_10', modifier: (r: SimulationRequest) => {
        r.userInputs.monthlyIncome *= 0.9
        return r
      }},
      { param: 'spending_minus_10', modifier: (r: SimulationRequest) => {
        r.financialProfile.monthlySpending *= 0.9
        return r
      }},
      { param: 'spending_plus_10', modifier: (r: SimulationRequest) => {
        r.financialProfile.monthlySpending *= 1.1
        return r
      }},
      { param: 'timeline_plus_6mo', modifier: (r: SimulationRequest) => {
        r.goal.timelineMonths += 6
        return r
      }},
    ]

    const sensitivities: Record<string, { delta: number; newProbability: number; impact: number }> = {}
    let mostImpactful = ''
    let maxImpact = 0

    for (const scenario of scenarios) {
      // Clone request
      const modifiedRequest = JSON.parse(JSON.stringify(request))
      scenario.modifier(modifiedRequest)

      const results = await this.runSimulation(modifiedRequest)
      const impact = results.successProbability - baseResults.successProbability

      sensitivities[scenario.param] = {
        delta: impact,
        newProbability: results.successProbability,
        impact: Math.abs(impact),
      }

      if (Math.abs(impact) > maxImpact) {
        maxImpact = Math.abs(impact)
        mostImpactful = scenario.param
      }
    }

    // Generate recommendations
    const recommendations: string[] = []
    if (sensitivities['spending_minus_10'].impact > 0.05) {
      recommendations.push('Reducing spending by 10% could significantly improve your odds.')
    }
    if (sensitivities['income_plus_10'].impact > 0.05) {
      recommendations.push('Increasing income (side gig, raise) would have high impact.')
    }
    if (sensitivities['timeline_plus_6mo'].impact > 0.05) {
      recommendations.push('Extending your timeline by 6 months gives more room for growth.')
    }

    return {
      baseProbability: baseResults.successProbability,
      sensitivities,
      mostImpactful,
      recommendations,
    }
  }
}
