import { Router } from 'express'
import { SimulationService } from '../services/simulationService.js'
import { NessieService } from '../services/nessieService.js'
import { getAllAccountData, getAccessToken } from '../services/plaidService.js'
import { mapAllAccounts, EnhancedFinancialProfile } from '../services/accountMappers.js'
import type { SimulationRequest, NessieAccount, NessieMerchant, NessieLoan } from '../types/index.js'

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
      .filter((a: NessieAccount) => a.type === 'Checking' || a.type === 'Savings')
      .reduce((sum: number, a: NessieAccount) => sum + a.balance, 0)

    // Calculate credit debt
    const creditDebt = accounts
      .filter((a: NessieAccount) => a.type === 'Credit Card')
      .reduce((sum: number, a: NessieAccount) => sum + a.balance, 0)

    const checkingAccount = accounts.find((a: NessieAccount) => a.type === 'Checking')

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
      const merchantMap = new Map<string, NessieMerchant>(
        merchants.map((m: NessieMerchant) => [m._id, m])
      )

      for (const purchase of purchases) {
        totalPurchases += purchase.amount
        const merchant = merchantMap.get(purchase.merchant_id)
        const category = merchant?.category || 'Other'
        spendingByCategory[category] = (spendingByCategory[category] || 0) + purchase.amount
      }

      // Get deposits (income)
      const deposits = await nessieService.getAccountDeposits(checkingAccount._id)
      // Look for salary/direct deposit entries
      const salaryDeposits = deposits.filter((d: { amount: number; description?: string }) => {
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
        .filter((b: { status: string; payment_amount: number }) => b.status === 'recurring')
        .reduce((sum: number, b: { payment_amount: number }) => sum + b.payment_amount, 0)

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
    let spendingVolatility = 0.15 // default
    if (categoryValues.length > 0) {
      const avgCategory = categoryValues.reduce((a, b) => a + b, 0) / categoryValues.length
      const variance = categoryValues.reduce((sum, val) => sum + Math.pow(val - avgCategory, 2), 0) / categoryValues.length
      spendingVolatility = Math.min(0.3, Math.sqrt(variance) / (avgCategory || 1) * 0.1 + 0.1)
    }

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

// Run Monte Carlo simulation with Plaid-derived enhanced parameters
router.post('/simulate-enhanced', async (req, res) => {
  try {
    const { plaidUserId, userInputs, goal, simulationParams } = req.body

    if (!plaidUserId) {
      return res.status(400).json({ error: 'plaidUserId is required' })
    }

    const accessToken = getAccessToken(plaidUserId)
    if (!accessToken) {
      return res.status(404).json({ error: 'No linked Plaid account found' })
    }

    // Fetch all Plaid data
    const data = await getAllAccountData(accessToken)
    const profile = mapAllAccounts(data)

    // Build simulation request with enhanced profile
    const { request, enhancedParams } = buildEnhancedSimulationRequest(
      profile,
      userInputs,
      goal,
      simulationParams
    )

    // Run simulation with the standard request
    // The enhanced params are logged for transparency but currently
    // the Python engine uses the standard params. A future enhancement
    // would pass enhancedParams to a modified Python engine.
    const results = await simulationService.runSimulation(request)

    // Add source information and enhanced params to response
    const enhancedResults = {
      ...results,
      assumptions: {
        ...results.assumptions,
        dataSource: 'plaid',
        accountsIncluded: {
          depository: profile.depository.length,
          credit: profile.credit.length,
          loans: profile.loans.length,
          investments: profile.investments.length,
        },
        derivedParams: {
          annualReturnMean: enhancedParams.annualReturnMean,
          annualReturnStd: enhancedParams.annualReturnStd,
          incomeVolatility: enhancedParams.incomeVolatility,
          expenseVolatility: enhancedParams.expenseVolatility,
          creditCardsModeled: enhancedParams.creditCards?.length || 0,
          loansModeled: enhancedParams.loans?.length || 0,
        },
      },
    }

    res.json(enhancedResults)
  } catch (error) {
    console.error('Error running enhanced simulation:', error)
    res.status(500).json({
      error: 'Failed to run enhanced simulation',
      details: error instanceof Error ? error.message : String(error),
    })
  }
})

/**
 * Enhanced simulation parameters (extends base params with account-aware fields)
 */
interface EnhancedSimulationParams {
  nSimulations?: number
  useAccountAwareSimulation?: boolean
  annualReturnMean?: number
  annualReturnStd?: number
  incomeVolatility?: number
  expenseVolatility?: number
  creditCards?: Array<{
    id: string
    balance: number
    apr: number
    minimumPayment: number
  }>
  loans?: Array<{
    id: string
    balance: number
    interestRate: number
    monthlyPayment: number
  }>
}

/**
 * Build a simulation request from Plaid EnhancedFinancialProfile
 */
function buildEnhancedSimulationRequest(
  profile: EnhancedFinancialProfile,
  userInputs: { age: number; riskTolerance: 'low' | 'medium' | 'high' },
  goal: { targetAmount: number; timelineMonths: number; goalType: string },
  customParams?: Partial<{
    nSimulations: number
  }>
): { request: SimulationRequest; enhancedParams: EnhancedSimulationParams } {
  const monthlyIncome = profile.income?.monthlyAmount || 0
  const monthlySpending = profile.spending?.monthlyAmount || 0
  const monthlyBills = profile.spending?.fixedExpenses || 0
  const monthlyLoanPayments = profile.loans.reduce((sum, l) => sum + l.monthlyPayment, 0)

  // Enhanced simulation parameters (passed separately to Python)
  const enhancedParams: EnhancedSimulationParams = {
    nSimulations: customParams?.nSimulations || 100000,
    useAccountAwareSimulation: true,

    // Derived from actual investment allocation
    annualReturnMean: calculateExpectedReturn(profile),
    annualReturnStd: calculateExpectedVolatility(profile),

    // Derived from income stability
    incomeVolatility: profile.income
      ? Math.max(0.02, Math.min(0.15, (1 - profile.income.stabilityScore) * 0.15))
      : 0.05,

    // Derived from spending patterns
    expenseVolatility: profile.spending?.volatility || 0.15,

    // Credit cards for per-card interest modeling
    creditCards: profile.credit
      .filter(c => c.balance > 0)
      .map(c => ({
        id: c.id,
        balance: c.balance,
        apr: c.apr,
        minimumPayment: c.minimumPayment,
      })),

    // Loans for amortization modeling
    loans: profile.loans
      .filter(l => l.balance > 0)
      .map(l => ({
        id: l.id,
        balance: l.balance,
        interestRate: l.interestRate,
        monthlyPayment: l.monthlyPayment,
      })),
  }

  // Standard simulation request (backwards compatible)
  const request: SimulationRequest = {
    financialProfile: {
      liquidAssets: profile.totalLiquid,
      creditDebt: profile.totalCreditDebt,
      loanDebt: profile.totalLoanDebt,
      monthlyLoanPayments,
      monthlyIncome,
      monthlyBills,
      monthlySpending,
      spendingByCategory: profile.spending?.byCategory || {},
      spendingVolatility: profile.spending?.volatility || 0.15,
    },
    userInputs: {
      monthlyIncome,
      age: userInputs.age,
      riskTolerance: userInputs.riskTolerance,
    },
    goal: {
      targetAmount: goal.targetAmount,
      timelineMonths: goal.timelineMonths,
      goalType: goal.goalType,
    },
    simulationParams: {
      nSimulations: customParams?.nSimulations || 100000,
    },
  }

  return { request, enhancedParams }
}

/**
 * Calculate expected return from actual investment allocation
 */
function calculateExpectedReturn(profile: EnhancedFinancialProfile): number {
  if (profile.investments.length === 0) {
    return 0.07 // Default moderate return
  }

  const totalValue = profile.investments.reduce((sum, a) => sum + a.balance, 0)
  if (totalValue === 0) return 0.07

  // Aggregate allocation
  let stocks = 0, bonds = 0, cash = 0, other = 0
  for (const account of profile.investments) {
    const weight = account.balance / totalValue
    stocks += account.allocation.stocks * weight
    bonds += account.allocation.bonds * weight
    cash += account.allocation.cash * weight
    other += account.allocation.other * weight
  }

  // Historical averages
  const expectedReturn = stocks * 0.10 + bonds * 0.04 + cash * 0.02 + other * 0.06
  return Math.max(0.02, Math.min(0.15, expectedReturn))
}

/**
 * Calculate expected volatility from actual investment allocation
 */
function calculateExpectedVolatility(profile: EnhancedFinancialProfile): number {
  if (profile.investments.length === 0) {
    return 0.15 // Default moderate volatility
  }

  const totalValue = profile.investments.reduce((sum, a) => sum + a.balance, 0)
  if (totalValue === 0) return 0.15

  // Aggregate allocation
  let stocks = 0, bonds = 0, cash = 0, other = 0
  for (const account of profile.investments) {
    const weight = account.balance / totalValue
    stocks += account.allocation.stocks * weight
    bonds += account.allocation.bonds * weight
    cash += account.allocation.cash * weight
    other += account.allocation.other * weight
  }

  // Historical volatilities
  const expectedVol = stocks * 0.18 + bonds * 0.06 + cash * 0.01 + other * 0.12
  return Math.max(0.05, Math.min(0.25, expectedVol))
}

export default router
