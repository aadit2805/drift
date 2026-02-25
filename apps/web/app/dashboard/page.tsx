'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowRight,
  Wallet,
  CreditCard,
  PiggyBank,
  Receipt,
  TrendingUp,
  Building2,
  LogOut,
  Car,
  Home,
  Landmark,
  Calendar,
  ShoppingBag,
} from 'lucide-react'
import { getAccounts, getFinancialProfile, getPlaidAccounts } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { AccountList } from '@/components/accounts'
import type {
  NessieAccount,
  FinancialProfile,
  EnhancedFinancialProfile,
} from '@/types'

interface CustomerData {
  _id: string
  first_name: string
  last_name: string
  address: {
    street_number: string
    street_name: string
    city: string
    state: string
    zip: string
  }
}

export default function DashboardPage() {
  const router = useRouter()
  const [customer, setCustomer] = useState<CustomerData | null>(null)
  const [accounts, setAccounts] = useState<NessieAccount[]>([])
  const [profile, setProfile] = useState<FinancialProfile | null>(null)

  const [plaidProfile, setPlaidProfile] = useState<EnhancedFinancialProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [connectionType, setConnectionType] = useState<'plaid' | 'nessie' | null>(null)

  useEffect(() => {
    const customerId = localStorage.getItem('customerId')
    const plaidUserId = localStorage.getItem('plaidUserId')
    const storedConnectionType = localStorage.getItem('connectionType')
    const customerDataStr = localStorage.getItem('customerData')

    if (!customerId && !plaidUserId) {
      router.push('/login')
      return
    }

    // Determine connection type
    if (storedConnectionType === 'plaid' && plaidUserId) {
      setConnectionType('plaid')
      // Load Plaid data
      getPlaidAccounts(plaidUserId)
        .then((data) => {
          setPlaidProfile(data)
          setLoading(false)
        })
        .catch((err) => {
          console.error('Failed to load Plaid data:', err)
          setLoading(false)
        })
    } else if (customerId) {
      setConnectionType('nessie')
      if (customerDataStr) {
        setCustomer(JSON.parse(customerDataStr))
      }

      Promise.all([
        getAccounts(customerId),
        getFinancialProfile(customerId),
      ])
        .then(([accountsData, profileData]) => {
          setAccounts(accountsData)
          setProfile(profileData)
          setLoading(false)
        })
        .catch((err) => {
          console.error('Failed to load data:', err)
          setLoading(false)
        })
    } else {
      router.push('/login')
    }
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem('customerId')
    localStorage.removeItem('customerData')
    localStorage.removeItem('plaidUserId')
    localStorage.removeItem('connectionType')
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Compute unified financial metrics based on connection type
  const financialData = connectionType === 'plaid' && plaidProfile
    ? {
        netWorth: plaidProfile.netWorth,
        monthlyIncome: plaidProfile.income.monthlyAmount,
        monthlyCashFlow: plaidProfile.income.monthlyAmount - plaidProfile.spending.monthlyAmount,
        monthlySpending: plaidProfile.spending.monthlyAmount,
        variableSpending: plaidProfile.spending.variableExpenses,
        liquidAssets: plaidProfile.totalLiquid,
        creditDebt: plaidProfile.totalCreditDebt,
        loanDebt: plaidProfile.totalLoanDebt,
        totalDebt: plaidProfile.totalCreditDebt + plaidProfile.totalLoanDebt,
        monthlyBills: plaidProfile.spending.fixedExpenses,
        monthlyLoanPayments: plaidProfile.loans.reduce((sum, l) => sum + l.monthlyPayment, 0),
        spendingByCategory: plaidProfile.spending.byCategory,
        totalInvestments: plaidProfile.totalInvestments,
      }
    : profile
      ? {
          netWorth: profile.liquidAssets - profile.creditDebt - profile.loanDebt,
          monthlyIncome: profile.monthlyIncome,
          monthlyCashFlow: profile.monthlyIncome - profile.monthlySpending,
          monthlySpending: profile.monthlySpending,
          variableSpending: profile.monthlySpending - profile.monthlyBills - profile.monthlyLoanPayments,
          liquidAssets: profile.liquidAssets,
          creditDebt: profile.creditDebt,
          loanDebt: profile.loanDebt,
          totalDebt: profile.creditDebt + profile.loanDebt,
          monthlyBills: profile.monthlyBills,
          monthlyLoanPayments: profile.monthlyLoanPayments,
          spendingByCategory: Object.fromEntries(
            Object.entries(profile.spendingByCategory).map(([k, v]) => [k, Math.round(v / 12)])
          ),
          totalInvestments: 0,
        }
      : null

  const displayName = connectionType === 'plaid' ? 'User' : customer?.first_name

  return (
    <div className="min-h-screen bg-background relative">
      {/* Subtle depth - soft vignette */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,transparent_0%,hsl(var(--background))_70%)] opacity-40" />
      {/* Header - frosted glass */}
      <header className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center justify-between px-6 py-3 max-w-3xl w-[calc(100%-2rem)] rounded-full bg-background/60 backdrop-blur-xl border border-border/50">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            Drift
          </Link>
          <span className="text-muted-foreground/50">/</span>
          <span className="text-sm text-muted-foreground">Dashboard</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground hidden sm:inline">
            {connectionType === 'plaid' ? 'Plaid User' : `${customer?.first_name} ${customer?.last_name}`}
          </span>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4" />
            Sign out
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 pt-24 pb-8">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-2xl font-medium mb-2">
            Welcome back{displayName ? `, ${displayName}` : ''}
          </h1>
          <p className="text-muted-foreground">
            {connectionType === 'plaid'
              ? 'Here\'s your complete financial overview from your linked accounts.'
              : 'Here\'s your complete financial overview from Capital One.'}
          </p>
        </div>

        {/* Overview Cards */}
        {financialData && (
          <div className="grid md:grid-cols-3 gap-4 mb-8">
            <Card className="p-5 bg-card/60 backdrop-blur-sm border-border/50">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm">Net Worth</span>
              </div>
              <p className={`text-3xl font-medium tabular-nums ${financialData.netWorth >= 0 ? 'text-[var(--success)]' : 'text-[var(--error)]'}`}>
                ${financialData.netWorth.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Assets minus all debts</p>
            </Card>
            <Card className="p-5 bg-card/60 backdrop-blur-sm border-border/50">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Wallet className="w-4 h-4" />
                <span className="text-sm">Monthly Income</span>
              </div>
              <p className="text-3xl font-medium tabular-nums">
                ${financialData.monthlyIncome.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Salary + deposits</p>
            </Card>
            <Card className="p-5 bg-card/60 backdrop-blur-sm border-border/50">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <PiggyBank className="w-4 h-4" />
                <span className="text-sm">Monthly Cash Flow</span>
              </div>
              <p className={`text-3xl font-medium tabular-nums ${financialData.monthlyCashFlow >= 0 ? 'text-[var(--success)]' : 'text-[var(--error)]'}`}>
                {financialData.monthlyCashFlow >= 0 ? '+' : ''}${financialData.monthlyCashFlow.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Income minus expenses</p>
            </Card>
          </div>
        )}

        {/* Plaid Accounts Section */}
        {connectionType === 'plaid' && plaidProfile && (
          <div className="mb-8">
            <Card className="p-6 bg-card/60 backdrop-blur-sm border-border/50">
              <h2 className="font-medium mb-4 flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Linked Accounts
              </h2>
              <AccountList profile={plaidProfile} />
            </Card>
          </div>
        )}

        {/* Nessie Accounts Section */}
        {connectionType === 'nessie' && financialData && (
          <div className="grid lg:grid-cols-2 gap-6 mb-8">
            {/* Accounts */}
            <Card className="p-6 bg-card/60 backdrop-blur-sm border-border/50">
              <h2 className="font-medium mb-4 flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Accounts
              </h2>
              <div className="space-y-3">
                {accounts.filter(a => a.type !== 'Credit Card').map((account) => (
                  <div
                    key={account._id}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {account.type === 'Checking' && <Wallet className="w-5 h-5 text-[hsl(var(--accent))]" />}
                      {account.type === 'Savings' && <PiggyBank className="w-5 h-5 text-[var(--success)]" />}
                      <div>
                        <p className="font-medium text-sm">{account.nickname}</p>
                        <p className="text-xs text-muted-foreground">{account.type}</p>
                      </div>
                    </div>
                    <p className="font-medium tabular-nums">
                      ${account.balance.toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-border flex justify-between">
                <span className="text-sm text-muted-foreground">Total Liquid Assets</span>
                <span className="font-medium text-[var(--success)]">${financialData.liquidAssets.toLocaleString()}</span>
              </div>
            </Card>

            {/* Monthly Expenses Breakdown */}
            <Card className="p-6 bg-card/60 backdrop-blur-sm border-border/50">
              <h2 className="font-medium mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Monthly Expenses
              </h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <Home className="w-5 h-5 text-orange-500" />
                    <div>
                      <p className="font-medium text-sm">Fixed Bills</p>
                      <p className="text-xs text-muted-foreground">Rent, utilities, subscriptions</p>
                    </div>
                  </div>
                  <p className="font-medium tabular-nums">${financialData.monthlyBills.toLocaleString()}</p>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <Landmark className="w-5 h-5 text-[var(--error)]" />
                    <div>
                      <p className="font-medium text-sm">Loan Payments</p>
                      <p className="text-xs text-muted-foreground">Auto, student, personal</p>
                    </div>
                  </div>
                  <p className="font-medium tabular-nums">${financialData.monthlyLoanPayments.toLocaleString()}</p>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <ShoppingBag className="w-5 h-5 text-[hsl(var(--accent))]" />
                    <div>
                      <p className="font-medium text-sm">Variable Spending</p>
                      <p className="text-xs text-muted-foreground">Groceries, dining, shopping</p>
                    </div>
                  </div>
                  <p className="font-medium tabular-nums">${financialData.variableSpending.toLocaleString()}</p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-border flex justify-between">
                <span className="text-sm text-muted-foreground">Total Monthly Expenses</span>
                <span className="font-medium">${financialData.monthlySpending.toLocaleString()}</span>
              </div>
            </Card>
          </div>
        )}

        {/* Monthly Expenses for Plaid */}
        {connectionType === 'plaid' && financialData && (
          <div className="grid lg:grid-cols-2 gap-6 mb-8">
            <Card className="p-6 bg-card/60 backdrop-blur-sm border-border/50">
              <h2 className="font-medium mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Monthly Expenses
              </h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <Home className="w-5 h-5 text-orange-500" />
                    <div>
                      <p className="font-medium text-sm">Fixed Bills</p>
                      <p className="text-xs text-muted-foreground">Rent, utilities, subscriptions</p>
                    </div>
                  </div>
                  <p className="font-medium tabular-nums">${Math.round(financialData.monthlyBills).toLocaleString()}</p>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <Landmark className="w-5 h-5 text-[var(--error)]" />
                    <div>
                      <p className="font-medium text-sm">Loan Payments</p>
                      <p className="text-xs text-muted-foreground">Auto, student, mortgage</p>
                    </div>
                  </div>
                  <p className="font-medium tabular-nums">${Math.round(financialData.monthlyLoanPayments).toLocaleString()}</p>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <ShoppingBag className="w-5 h-5 text-[hsl(var(--accent))]" />
                    <div>
                      <p className="font-medium text-sm">Variable Spending</p>
                      <p className="text-xs text-muted-foreground">Groceries, dining, shopping</p>
                    </div>
                  </div>
                  <p className="font-medium tabular-nums">${Math.round(financialData.variableSpending).toLocaleString()}</p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-border flex justify-between">
                <span className="text-sm text-muted-foreground">Total Monthly Expenses</span>
                <span className="font-medium">${Math.round(financialData.monthlySpending).toLocaleString()}</span>
              </div>
            </Card>

            {/* Summary Stats */}
            <Card className="p-6 bg-card/60 backdrop-blur-sm border-border/50">
              <h2 className="font-medium mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Summary
              </h2>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Liquid Assets</span>
                  <span className="font-medium text-[var(--success)]">${Math.round(financialData.liquidAssets).toLocaleString()}</span>
                </div>
                {financialData.totalInvestments > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Investments</span>
                    <span className="font-medium text-[var(--success)]">${Math.round(financialData.totalInvestments).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Credit Card Debt</span>
                  <span className="font-medium text-[var(--error)]">${Math.round(financialData.creditDebt).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Loan Debt</span>
                  <span className="font-medium text-[var(--error)]">${Math.round(financialData.loanDebt).toLocaleString()}</span>
                </div>
                <div className="pt-4 border-t border-border flex justify-between">
                  <span className="text-sm text-muted-foreground">Total Debt</span>
                  <span className="font-medium text-[var(--error)]">${Math.round(financialData.totalDebt).toLocaleString()}</span>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Spending by Category and Debt - only for Nessie */}
        {connectionType === 'nessie' && financialData && (
          <div className="grid lg:grid-cols-2 gap-6 mb-8">
            {/* Spending by Category */}
            <Card className="p-6 bg-card/60 backdrop-blur-sm border-border/50">
              <h2 className="font-medium mb-1 flex items-center gap-2">
                <Receipt className="w-5 h-5" />
                Spending by Category
              </h2>
              <p className="text-xs text-muted-foreground mb-4">Monthly averages based on 12-month history</p>
              <div className="space-y-3">
                {Object.entries(financialData.spendingByCategory)
                  .sort(([, a], [, b]) => b - a)
                  .map(([category, amount]) => {
                    const total = Object.values(financialData.spendingByCategory).reduce((a, b) => a + b, 0)
                    const percentage = total > 0 ? ((amount / total) * 100).toFixed(0) : 0
                    return (
                      <div key={category}>
                        <div className="flex justify-between text-sm mb-1">
                          <span>{category}</span>
                          <span className="tabular-nums">${amount.toLocaleString()}/mo</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[hsl(var(--accent))] rounded-full"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
              </div>
            </Card>

            {/* Long-Term Debt */}
            <Card className="p-6 bg-card/60 backdrop-blur-sm border-border/50">
              <h2 className="font-medium mb-1 flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Long-Term Debt
              </h2>
              <p className="text-xs text-muted-foreground mb-4">Outstanding balances</p>
              <div className="space-y-3">
                {accounts.filter(a => a.type === 'Credit Card').map((account) => (
                  <div
                    key={account._id}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <CreditCard className="w-5 h-5 text-[var(--error)]" />
                      <div>
                        <p className="font-medium text-sm">{account.nickname}</p>
                        <p className="text-xs text-muted-foreground">Credit Card</p>
                      </div>
                    </div>
                    <p className="font-medium tabular-nums text-[var(--error)]">
                      ${account.balance.toLocaleString()}
                    </p>
                  </div>
                ))}
                {financialData.loanDebt > 0 && (
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-3">
                      <Car className="w-5 h-5 text-[hsl(var(--accent))]" />
                      <div>
                        <p className="font-medium text-sm">Auto Loan</p>
                        <p className="text-xs text-muted-foreground">${financialData.monthlyLoanPayments}/mo payment</p>
                      </div>
                    </div>
                    <p className="font-medium tabular-nums text-[var(--error)]">
                      ${financialData.loanDebt.toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
              <div className="mt-4 pt-4 border-t border-border flex justify-between">
                <span className="text-sm text-muted-foreground">Total Debt</span>
                <span className="font-medium text-[var(--error)]">${financialData.totalDebt.toLocaleString()}</span>
              </div>
            </Card>
          </div>
        )}

        {/* Spending by Category - for Plaid */}
        {connectionType === 'plaid' && financialData && Object.keys(financialData.spendingByCategory).length > 0 && (
          <div className="mb-8">
            <Card className="p-6 bg-card/60 backdrop-blur-sm border-border/50">
              <h2 className="font-medium mb-1 flex items-center gap-2">
                <Receipt className="w-5 h-5" />
                Spending by Category
              </h2>
              <p className="text-xs text-muted-foreground mb-4">Based on 90 days of transaction history</p>
              <div className="grid md:grid-cols-2 gap-x-8 gap-y-3">
                {Object.entries(financialData.spendingByCategory)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 10)
                  .map(([category, amount]) => {
                    const total = Object.values(financialData.spendingByCategory).reduce((a, b) => a + b, 0)
                    const percentage = total > 0 ? ((amount / total) * 100).toFixed(0) : 0
                    const monthlyAmount = Math.round(amount / 3) // 90 days = ~3 months
                    return (
                      <div key={category}>
                        <div className="flex justify-between text-sm mb-1">
                          <span>{category}</span>
                          <span className="tabular-nums">${monthlyAmount.toLocaleString()}/mo</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[hsl(var(--accent))] rounded-full"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
              </div>
            </Card>
          </div>
        )}

        {/* CTA */}
        <Card className="p-6 bg-card/70 backdrop-blur-sm border-border/50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-medium mb-2">Ready to plan your future?</h2>
              <p className="text-muted-foreground">
                Run a Monte Carlo simulation to see the probability of reaching your financial goals.
              </p>
            </div>
            <Button asChild>
              <Link href="/goal">
                Start Simulation
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        </Card>
      </main>
    </div>
  )
}
