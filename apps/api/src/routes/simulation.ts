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
    const customerId = req.query.customerId as string
    if (!customerId) {
      return res.status(400).json({ error: 'customerId query parameter is required' })
    }

    // Fetch all account data for the customer
    const accounts = await nessieService.getAccounts(customerId)

    // Calculate liquid assets (checking + savings)
    const liquidAssets = accounts
      .filter((a: any) => a.type === 'Checking' || a.type === 'Savings')
      .reduce((sum: number, a: any) => sum + a.balance, 0)

    // Calculate credit debt
    const creditDebt = accounts
      .filter((a: any) => a.type === 'Credit Card')
      .reduce((sum: number, a: any) => sum + a.balance, 0)

    const checkingAccount = accounts.find((a: any) => a.type === 'Checking')

    // Fetch all data for checking account
    let totalPurchases = 0
    let monthlyIncome = 0
    let monthlyBills = 0
    let loanDebt = 0
    let monthlyLoanPayments = 0
    const spendingByCategory: Record<string, number> = {}

    if (checkingAccount) {
      // Get purchases
      const purchases = await nessieService.getAccountPurchases(checkingAccount._id)
      const merchants = await nessieService.getMerchants()
      const merchantMap = new Map<string, { _id: string; category?: string }>(
        merchants.map((m: any) => [m._id, m])
      )

      for (const purchase of purchases) {
        totalPurchases += purchase.amount
        const merchant = merchantMap.get(purchase.merchant_id)
        const category = merchant?.category || 'Other'
        spendingByCategory[category] = (spendingByCategory[category] || 0) + purchase.amount
      }

      console.log(`Financial profile: ${purchases.length} purchases, ${merchants.length} merchants, categories:`, Object.keys(spendingByCategory))

      // Get deposits (income)
      const deposits = await nessieService.getAccountDeposits(checkingAccount._id)
      // Look for salary/direct deposit entries
      const salaryDeposits = deposits.filter((d: any) => {
        const desc = d.description?.toLowerCase() || ''
        return desc.includes('salary') || desc.includes('direct deposit') || desc.includes('employer')
      })
      if (salaryDeposits.length > 0) {
        // Get the most common salary amount (bi-weekly) and multiply by 2 for monthly
        const salaryAmount = salaryDeposits[0].amount
        monthlyIncome = salaryAmount * 2 // Bi-weekly to monthly
      }

      // Get bills
      const bills = await nessieService.getAccountBills(checkingAccount._id)
      monthlyBills = bills
        .filter((b: any) => b.status === 'recurring')
        .reduce((sum: number, b: any) => sum + b.payment_amount, 0)

      // Get loans
      const loans = await nessieService.getAccountLoans(checkingAccount._id)
      for (const loan of loans) {
        loanDebt += loan.amount
        monthlyLoanPayments += loan.monthly_payment
      }
    }

    // Calculate monthly spending (purchases over ~12 months + recurring bills)
    const monthsOfData = 12
    const monthlyPurchases = totalPurchases / monthsOfData
    const monthlySpending = monthlyPurchases + monthlyBills + monthlyLoanPayments

    // Calculate spending volatility from category variance
    const categoryValues = Object.values(spendingByCategory)
    const avgCategory = categoryValues.reduce((a, b) => a + b, 0) / categoryValues.length || 0
    const variance = categoryValues.reduce((sum, val) => sum + Math.pow(val - avgCategory, 2), 0) / categoryValues.length || 0
    const spendingVolatility = Math.min(0.3, Math.sqrt(variance) / (avgCategory || 1) * 0.1 + 0.1)

    res.json({
      liquidAssets,
      creditDebt,
      loanDebt,
      monthlyLoanPayments,
      monthlyIncome,
      monthlyBills,
      monthlySpending: Math.round(monthlySpending),
      spendingByCategory,
      spendingVolatility: Math.round(spendingVolatility * 100) / 100,
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
