import { Router, Request, Response } from 'express'
import {
  createLinkToken,
  exchangePublicToken,
  getAllAccountData,
  storeAccessToken,
  getAccessToken,
} from '../services/plaidService'
import { mapAllAccounts, EnhancedFinancialProfile } from '../services/accountMappers'

const router = Router()

// Create a Plaid Link token for the frontend
router.post('/create-link-token', async (req: Request, res: Response) => {
  try {
    const { userId } = req.body

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' })
    }

    const linkToken = await createLinkToken(userId)
    res.json({ linkToken })
  } catch (error: any) {
    console.error('Error creating link token:', error?.response?.data || error)
    res.status(500).json({
      error: 'Failed to create link token',
      details: error?.response?.data?.error_message || error.message,
    })
  }
})

// Exchange a public token for an access token
router.post('/exchange-token', async (req: Request, res: Response) => {
  try {
    const { publicToken, userId } = req.body

    if (!publicToken || !userId) {
      return res.status(400).json({ error: 'publicToken and userId are required' })
    }

    const accessToken = await exchangePublicToken(publicToken)

    // Store the access token (in production, encrypt and store in DB)
    storeAccessToken(userId, accessToken)

    res.json({ success: true })
  } catch (error: any) {
    console.error('Error exchanging token:', error?.response?.data || error)
    res.status(500).json({
      error: 'Failed to exchange token',
      details: error?.response?.data?.error_message || error.message,
    })
  }
})

// Get all accounts for a user
router.get('/accounts/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params
    const accessToken = getAccessToken(userId)

    if (!accessToken) {
      return res.status(404).json({ error: 'No linked account found for user' })
    }

    const data = await getAllAccountData(accessToken)
    const profile = mapAllAccounts(data)

    res.json(profile)
  } catch (error: any) {
    console.error('Error fetching accounts:', error?.response?.data || error)
    res.status(500).json({
      error: 'Failed to fetch accounts',
      details: error?.response?.data?.error_message || error.message,
    })
  }
})

// Get financial profile formatted for simulation
router.get('/financial-profile/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params
    const accessToken = getAccessToken(userId)

    if (!accessToken) {
      return res.status(404).json({ error: 'No linked account found for user' })
    }

    const data = await getAllAccountData(accessToken)
    const profile = mapAllAccounts(data)

    // Convert to simulation-compatible format
    const simulationProfile = {
      liquidAssets: profile.totalLiquid,
      creditDebt: profile.totalCreditDebt,
      loanDebt: profile.totalLoanDebt,
      monthlyLoanPayments: profile.loans.reduce((sum, l) => sum + l.monthlyPayment, 0),
      monthlyIncome: profile.income.monthlyAmount,
      monthlySpending: profile.spending.monthlyAmount,
      monthlyBills: profile.spending.fixedExpenses,
      spendingByCategory: profile.spending.byCategory,
      spendingVolatility: profile.spending.volatility,

      // Enhanced data for dynamic simulation params
      accounts: {
        depository: profile.depository,
        credit: profile.credit,
        loans: profile.loans,
        investments: profile.investments,
      },
      incomeProfile: profile.income,
      investmentAllocation: profile.investments.length > 0
        ? aggregateInvestmentAllocation(profile.investments)
        : null,
      netWorth: profile.netWorth,
    }

    res.json(simulationProfile)
  } catch (error: any) {
    console.error('Error fetching financial profile:', error?.response?.data || error)
    res.status(500).json({
      error: 'Failed to fetch financial profile',
      details: error?.response?.data?.error_message || error.message,
    })
  }
})

// Check if user has linked accounts
router.get('/status/:userId', async (req: Request, res: Response) => {
  const { userId } = req.params
  const accessToken = getAccessToken(userId)

  res.json({
    linked: !!accessToken,
  })
})

// Helper to aggregate investment allocation across all accounts
function aggregateInvestmentAllocation(
  investments: EnhancedFinancialProfile['investments']
): { stocks: number; bonds: number; cash: number; other: number } {
  if (investments.length === 0) {
    return { stocks: 0, bonds: 0, cash: 0, other: 0 }
  }

  const totalValue = investments.reduce((sum, a) => sum + a.balance, 0)

  if (totalValue === 0) {
    return { stocks: 0, bonds: 0, cash: 0, other: 0 }
  }

  const weighted = { stocks: 0, bonds: 0, cash: 0, other: 0 }

  for (const account of investments) {
    const weight = account.balance / totalValue
    weighted.stocks += account.allocation.stocks * weight
    weighted.bonds += account.allocation.bonds * weight
    weighted.cash += account.allocation.cash * weight
    weighted.other += account.allocation.other * weight
  }

  return weighted
}

export default router
