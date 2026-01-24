import { Router } from 'express'
import { SimulationService } from '../services/simulationService.js'
import { NessieService } from '../services/nessieService.js'
import type { SimulationRequest } from '../types/index.js'

const router = Router()
const simulationService = new SimulationService()
const nessieService = new NessieService()

// Get aggregated financial profile
router.get('/financial-profile', async (req, res) => {
  try {
    // Fetch all account data
    const accounts = await nessieService.getAccounts()

    // Calculate liquid assets (checking + savings)
    const liquidAssets = accounts
      .filter((a) => a.type === 'Checking' || a.type === 'Savings')
      .reduce((sum, a) => sum + a.balance, 0)

    // Calculate credit debt
    const creditDebt = accounts
      .filter((a) => a.type === 'Credit Card')
      .reduce((sum, a) => sum + a.balance, 0)

    // Fetch purchases for spending analysis
    let totalSpending = 0
    const spendingByCategory: Record<string, number> = {}

    for (const account of accounts.filter((a) => a.type === 'Checking')) {
      const purchases = await nessieService.getAccountPurchases(account._id)
      for (const purchase of purchases) {
        totalSpending += purchase.amount
        // Would need to look up merchant category here
        const category = 'General' // Simplified
        spendingByCategory[category] = (spendingByCategory[category] || 0) + purchase.amount
      }
    }

    // Fetch loans
    let loanDebt = 0
    let monthlyLoanPayments = 0

    for (const account of accounts) {
      const loans = await nessieService.getAccountLoans(account._id)
      for (const loan of loans) {
        loanDebt += loan.amount
        monthlyLoanPayments += loan.monthly_payment
      }
    }

    // Estimate monthly spending (simplified - would need date range in production)
    const monthlySpending = totalSpending / 3 // Assume 3 months of data

    res.json({
      liquidAssets,
      creditDebt,
      loanDebt,
      monthlyLoanPayments,
      monthlySpending,
      spendingByCategory,
      spendingVolatility: 0.15, // Would calculate from variance
    })
  } catch (error) {
    console.error('Error generating financial profile:', error)
    res.status(500).json({ error: 'Failed to generate financial profile' })
  }
})

// Run Monte Carlo simulation
router.post('/simulate', async (req, res) => {
  try {
    const request: SimulationRequest = req.body

    const results = await simulationService.runSimulation(request)

    res.json(results)
  } catch (error) {
    console.error('Error running simulation:', error)
    res.status(500).json({ error: 'Failed to run simulation' })
  }
})

// Run sensitivity analysis
router.post('/sensitivity', async (req, res) => {
  try {
    const request: SimulationRequest = req.body

    const sensitivity = await simulationService.runSensitivityAnalysis(request)

    res.json(sensitivity)
  } catch (error) {
    console.error('Error running sensitivity analysis:', error)
    res.status(500).json({ error: 'Failed to run sensitivity analysis' })
  }
})

export default router
