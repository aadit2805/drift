import type {
  AccountBase,
  Transaction,
  LiabilitiesGetResponse,
  Holding,
  Security,
  CreditCardLiability,
  StudentLoan,
  MortgageLiability,
} from 'plaid'

type Liabilities = LiabilitiesGetResponse['liabilities']

// Types for mapped accounts
export interface DepositoryAccount {
  id: string
  type: 'depository'
  subtype: string
  name: string
  balance: number
  available: number | null
}

export interface CreditAccount {
  id: string
  type: 'credit'
  name: string
  balance: number
  limit: number
  utilization: number
  apr: number
  minimumPayment: number
  lastPaymentAmount: number | null
  lastPaymentDate: string | null
}

export interface LoanAccount {
  id: string
  type: 'loan' | 'mortgage'
  subtype: string
  name: string
  balance: number
  originalAmount: number | null
  interestRate: number
  monthlyPayment: number
  originationDate: string | null
  expectedPayoffDate: string | null
}

export interface InvestmentAccount {
  id: string
  type: 'investment'
  subtype: string
  name: string
  balance: number
  holdings: {
    symbol: string | null
    name: string | null
    quantity: number
    value: number
    type: string | null
  }[]
  allocation: {
    stocks: number
    bonds: number
    cash: number
    other: number
  }
}

export type MappedAccount = DepositoryAccount | CreditAccount | LoanAccount | InvestmentAccount

export interface IncomeProfile {
  monthlyAmount: number
  frequency: 'weekly' | 'biweekly' | 'monthly' | 'irregular'
  stabilityScore: number
}

export interface SpendingProfile {
  monthlyAmount: number
  byCategory: Record<string, number>
  volatility: number
  fixedExpenses: number
  variableExpenses: number
}

export interface EnhancedFinancialProfile {
  depository: DepositoryAccount[]
  credit: CreditAccount[]
  loans: LoanAccount[]
  investments: InvestmentAccount[]
  income: IncomeProfile
  spending: SpendingProfile
  totalLiquid: number
  totalCreditDebt: number
  totalLoanDebt: number
  totalInvestments: number
  netWorth: number
}

export function mapDepositoryAccount(account: AccountBase): DepositoryAccount {
  return {
    id: account.account_id,
    type: 'depository',
    subtype: account.subtype || 'checking',
    name: account.name,
    balance: account.balances.current || 0,
    available: account.balances.available,
  }
}

export function mapCreditAccount(
  account: AccountBase,
  liabilities: Liabilities | null
): CreditAccount {
  const creditLiability = liabilities?.credit?.find(
    (c: CreditCardLiability) => c.account_id === account.account_id
  )

  const balance = account.balances.current || 0
  const limit = account.balances.limit || 0
  const utilization = limit > 0 ? balance / limit : 0

  return {
    id: account.account_id,
    type: 'credit',
    name: account.name,
    balance,
    limit,
    utilization,
    apr: creditLiability?.aprs?.[0]?.apr_percentage || 0,
    minimumPayment: creditLiability?.minimum_payment_amount || 0,
    lastPaymentAmount: creditLiability?.last_payment_amount || null,
    lastPaymentDate: creditLiability?.last_payment_date || null,
  }
}

export function mapLoanAccount(
  account: AccountBase,
  liabilities: Liabilities | null
): LoanAccount {
  const studentLoan = liabilities?.student?.find(
    (l: StudentLoan) => l.account_id === account.account_id
  )
  const mortgage = liabilities?.mortgage?.find(
    (m: MortgageLiability) => m.account_id === account.account_id
  )

  const isMortgage = account.subtype === 'mortgage' || !!mortgage

  // Get interest rate - different structure for student loans vs mortgages
  let interestRate = 0
  if (studentLoan) {
    interestRate = studentLoan.interest_rate_percentage || 0
  } else if (mortgage?.interest_rate) {
    interestRate = mortgage.interest_rate.percentage || 0
  }

  // Get origination amount
  const originalAmount = studentLoan?.origination_principal_amount ?? mortgage?.origination_principal_amount ?? null

  // Get monthly payment
  const monthlyPayment = studentLoan?.minimum_payment_amount ?? mortgage?.next_monthly_payment ?? mortgage?.last_payment_amount ?? 0

  return {
    id: account.account_id,
    type: isMortgage ? 'mortgage' : 'loan',
    subtype: account.subtype || 'personal',
    name: account.name,
    balance: account.balances.current || 0,
    originalAmount,
    interestRate,
    monthlyPayment,
    originationDate: studentLoan?.origination_date ?? mortgage?.origination_date ?? null,
    expectedPayoffDate: studentLoan?.expected_payoff_date ?? null,
  }
}

export function mapInvestmentAccount(
  account: AccountBase,
  holdings: Holding[],
  securities: Security[]
): InvestmentAccount {
  const accountHoldings = holdings.filter(
    (h) => h.account_id === account.account_id
  )

  const mappedHoldings = accountHoldings.map((h) => {
    const security = securities.find((s) => s.security_id === h.security_id)
    return {
      symbol: security?.ticker_symbol || null,
      name: security?.name || null,
      quantity: h.quantity,
      value: h.institution_value,
      type: security?.type || null,
    }
  })

  const allocation = calculateAllocation(accountHoldings, securities)

  return {
    id: account.account_id,
    type: 'investment',
    subtype: account.subtype || 'brokerage',
    name: account.name,
    balance: account.balances.current || 0,
    holdings: mappedHoldings,
    allocation,
  }
}

function calculateAllocation(
  holdings: Holding[],
  securities: Security[]
): { stocks: number; bonds: number; cash: number; other: number } {
  const total = holdings.reduce((sum, h) => sum + h.institution_value, 0)

  if (total === 0) {
    return { stocks: 0, bonds: 0, cash: 0, other: 0 }
  }

  const byType = { stocks: 0, bonds: 0, cash: 0, other: 0 }

  for (const holding of holdings) {
    const security = securities.find((s) => s.security_id === holding.security_id)
    const type = security?.type || 'other'

    const bucket =
      type === 'equity' || type === 'etf' || type === 'mutual fund'
        ? 'stocks'
        : type === 'fixed income'
          ? 'bonds'
          : type === 'cash'
            ? 'cash'
            : 'other'

    byType[bucket] += holding.institution_value
  }

  return {
    stocks: byType.stocks / total,
    bonds: byType.bonds / total,
    cash: byType.cash / total,
    other: byType.other / total,
  }
}

export function extractIncomeProfile(transactions: Transaction[]): IncomeProfile {
  // Filter for income (negative amounts in Plaid = money in)
  const deposits = transactions.filter((t) => t.amount < 0)

  if (deposits.length === 0) {
    return {
      monthlyAmount: 0,
      frequency: 'irregular',
      stabilityScore: 0,
    }
  }

  // Group by rounded amount to find recurring salary
  const amountCounts: Record<number, number> = {}
  for (const d of deposits) {
    const rounded = Math.round(Math.abs(d.amount) / 100) * 100
    amountCounts[rounded] = (amountCounts[rounded] || 0) + 1
  }

  // Find most common deposit amount (likely salary)
  const sortedAmounts = Object.entries(amountCounts).sort((a, b) => b[1] - a[1])
  const likelySalary = sortedAmounts[0] ? parseFloat(sortedAmounts[0][0]) : 0

  // Filter to likely salary deposits
  const salaryDeposits = deposits.filter(
    (d) => Math.abs(Math.abs(d.amount) - likelySalary) < likelySalary * 0.1
  )

  // Detect frequency based on average gap
  let frequency: IncomeProfile['frequency'] = 'monthly'
  if (salaryDeposits.length >= 2) {
    const dates = salaryDeposits
      .map((d) => new Date(d.date).getTime())
      .sort((a, b) => a - b)

    const gaps: number[] = []
    for (let i = 1; i < dates.length; i++) {
      gaps.push((dates[i] - dates[i - 1]) / (1000 * 60 * 60 * 24))
    }

    const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length
    frequency = avgGap < 10 ? 'weekly' : avgGap < 20 ? 'biweekly' : 'monthly'
  }

  // Calculate stability score (1 - coefficient of variation)
  const amounts = salaryDeposits.map((d) => Math.abs(d.amount))
  const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length
  const variance = amounts.reduce((sum, a) => sum + Math.pow(a - mean, 2), 0) / amounts.length
  const std = Math.sqrt(variance)
  const cv = mean > 0 ? std / mean : 1
  const stabilityScore = Math.max(0, Math.min(1, 1 - cv))

  // Estimate monthly amount
  const multiplier = frequency === 'weekly' ? 4.33 : frequency === 'biweekly' ? 2.17 : 1
  const monthlyAmount = likelySalary * multiplier

  return {
    monthlyAmount,
    frequency,
    stabilityScore,
  }
}

export function extractSpendingProfile(transactions: Transaction[]): SpendingProfile {
  // Filter for expenses (positive amounts in Plaid = money out)
  const expenses = transactions.filter((t) => t.amount > 0)

  if (expenses.length === 0) {
    return {
      monthlyAmount: 0,
      byCategory: {},
      volatility: 0.15,
      fixedExpenses: 0,
      variableExpenses: 0,
    }
  }

  // Group by category
  const byCategory: Record<string, number> = {}
  for (const e of expenses) {
    const category = e.category?.[0] || 'Other'
    byCategory[category] = (byCategory[category] || 0) + e.amount
  }

  // Total spending
  const totalSpending = expenses.reduce((sum, e) => sum + e.amount, 0)

  // Estimate months of data
  const dates = expenses.map((e) => new Date(e.date).getTime())
  const dateRange = (Math.max(...dates) - Math.min(...dates)) / (1000 * 60 * 60 * 24 * 30)
  const monthsOfData = Math.max(dateRange, 1)

  const monthlyAmount = totalSpending / monthsOfData

  // Calculate volatility from daily spending variance
  const dailySpending: Record<string, number> = {}
  for (const e of expenses) {
    dailySpending[e.date] = (dailySpending[e.date] || 0) + e.amount
  }

  const dailyAmounts = Object.values(dailySpending)
  const dailyMean = dailyAmounts.reduce((a, b) => a + b, 0) / dailyAmounts.length
  const dailyVariance =
    dailyAmounts.reduce((sum, a) => sum + Math.pow(a - dailyMean, 2), 0) / dailyAmounts.length
  const dailyStd = Math.sqrt(dailyVariance)
  const volatility = dailyMean > 0 ? Math.min(0.4, Math.max(0.05, dailyStd / dailyMean)) : 0.15

  // Identify recurring transactions (likely fixed expenses)
  const merchantCounts: Record<string, { count: number; total: number }> = {}
  for (const e of expenses) {
    const key = e.merchant_name || e.name
    if (!merchantCounts[key]) {
      merchantCounts[key] = { count: 0, total: 0 }
    }
    merchantCounts[key].count++
    merchantCounts[key].total += e.amount
  }

  const fixedExpenses = Object.values(merchantCounts)
    .filter((m) => m.count >= 2) // Recurring if appears 2+ times in 90 days
    .reduce((sum, m) => sum + m.total / monthsOfData, 0)

  const variableExpenses = monthlyAmount - fixedExpenses

  return {
    monthlyAmount,
    byCategory,
    volatility,
    fixedExpenses,
    variableExpenses,
  }
}

export function mapAllAccounts(data: {
  accounts: AccountBase[]
  transactions: Transaction[]
  liabilities: Liabilities | null
  investments: {
    holdings: Holding[]
    securities: Security[]
    accounts: AccountBase[]
  } | null
}): EnhancedFinancialProfile {
  const depository: DepositoryAccount[] = []
  const credit: CreditAccount[] = []
  const loans: LoanAccount[] = []
  const investments: InvestmentAccount[] = []

  for (const account of data.accounts) {
    switch (account.type) {
      case 'depository':
        depository.push(mapDepositoryAccount(account))
        break
      case 'credit':
        credit.push(mapCreditAccount(account, data.liabilities))
        break
      case 'loan':
        loans.push(mapLoanAccount(account, data.liabilities))
        break
      case 'investment':
      case 'brokerage':
        if (data.investments) {
          investments.push(
            mapInvestmentAccount(
              account,
              data.investments.holdings,
              data.investments.securities
            )
          )
        }
        break
    }
  }

  const income = extractIncomeProfile(data.transactions)
  const spending = extractSpendingProfile(data.transactions)

  const totalLiquid = depository.reduce((sum, a) => sum + a.balance, 0)
  const totalCreditDebt = credit.reduce((sum, a) => sum + a.balance, 0)
  const totalLoanDebt = loans.reduce((sum, a) => sum + a.balance, 0)
  const totalInvestments = investments.reduce((sum, a) => sum + a.balance, 0)
  const netWorth = totalLiquid + totalInvestments - totalCreditDebt - totalLoanDebt

  return {
    depository,
    credit,
    loans,
    investments,
    income,
    spending,
    totalLiquid,
    totalCreditDebt,
    totalLoanDebt,
    totalInvestments,
    netWorth,
  }
}
