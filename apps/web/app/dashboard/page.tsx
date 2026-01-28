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
import { getAccounts, getFinancialProfile } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

interface Account {
  _id: string
  type: 'Checking' | 'Savings' | 'Credit Card'
  nickname: string
  balance: number
  rewards?: number
}

interface FinancialProfile {
  liquidAssets: number
  creditDebt: number
  loanDebt: number
  monthlyLoanPayments: number
  monthlyIncome: number
  monthlyBills: number
  monthlySpending: number
  spendingByCategory: Record<string, number>
  spendingVolatility: number
}

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
  const [accounts, setAccounts] = useState<Account[]>([])
  const [profile, setProfile] = useState<FinancialProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const customerId = localStorage.getItem('customerId')
    const customerDataStr = localStorage.getItem('customerData')

    if (!customerId) {
      router.push('/login')
      return
    }

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
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem('customerId')
    localStorage.removeItem('customerData')
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const netWorth = profile
    ? profile.liquidAssets - profile.creditDebt - profile.loanDebt
    : 0

  const monthlyCashFlow = profile
    ? profile.monthlyIncome - profile.monthlySpending
    : 0

  const variableSpending = profile
    ? profile.monthlySpending - profile.monthlyBills - profile.monthlyLoanPayments
    : 0

  const monthlySpendingByCategory = profile?.spendingByCategory
    ? Object.fromEntries(
        Object.entries(profile.spendingByCategory).map(([k, v]) => [k, Math.round(v / 12)])
      )
    : {}

  const totalDebt = profile
    ? profile.creditDebt + profile.loanDebt
    : 0

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
            {customer?.first_name} {customer?.last_name}
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
            Welcome back, {customer?.first_name}
          </h1>
          <p className="text-muted-foreground">
            Here's your complete financial overview from Capital One.
          </p>
        </div>

        {/* Overview Cards */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <Card className="p-5 bg-card/60 backdrop-blur-sm border-border/50">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm">Net Worth</span>
            </div>
            <p className={`text-3xl font-medium tabular-nums ${netWorth >= 0 ? 'text-[var(--success)]' : 'text-[var(--error)]'}`}>
              ${netWorth.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Assets minus all debts</p>
          </Card>
          <Card className="p-5 bg-card/60 backdrop-blur-sm border-border/50">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Wallet className="w-4 h-4" />
              <span className="text-sm">Monthly Income</span>
            </div>
            <p className="text-3xl font-medium tabular-nums">
              ${profile?.monthlyIncome.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Salary + deposits</p>
          </Card>
          <Card className="p-5 bg-card/60 backdrop-blur-sm border-border/50">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <PiggyBank className="w-4 h-4" />
              <span className="text-sm">Monthly Cash Flow</span>
            </div>
            <p className={`text-3xl font-medium tabular-nums ${monthlyCashFlow >= 0 ? 'text-[var(--success)]' : 'text-[var(--error)]'}`}>
              {monthlyCashFlow >= 0 ? '+' : ''}${monthlyCashFlow.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Income minus expenses</p>
          </Card>
        </div>

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
              <span className="font-medium text-[var(--success)]">${profile?.liquidAssets.toLocaleString()}</span>
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
                <p className="font-medium tabular-nums">${profile?.monthlyBills.toLocaleString()}</p>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <Landmark className="w-5 h-5 text-[var(--error)]" />
                  <div>
                    <p className="font-medium text-sm">Loan Payments</p>
                    <p className="text-xs text-muted-foreground">Auto, student, personal</p>
                  </div>
                </div>
                <p className="font-medium tabular-nums">${profile?.monthlyLoanPayments.toLocaleString()}</p>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <ShoppingBag className="w-5 h-5 text-[hsl(var(--accent))]" />
                  <div>
                    <p className="font-medium text-sm">Variable Spending</p>
                    <p className="text-xs text-muted-foreground">Groceries, dining, shopping</p>
                  </div>
                </div>
                <p className="font-medium tabular-nums">${variableSpending.toLocaleString()}</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-border flex justify-between">
              <span className="text-sm text-muted-foreground">Total Monthly Expenses</span>
              <span className="font-medium">${profile?.monthlySpending.toLocaleString()}</span>
            </div>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          {/* Spending by Category */}
          <Card className="p-6 bg-card/60 backdrop-blur-sm border-border/50">
            <h2 className="font-medium mb-1 flex items-center gap-2">
              <Receipt className="w-5 h-5" />
              Spending by Category
            </h2>
            <p className="text-xs text-muted-foreground mb-4">Monthly averages based on 12-month history</p>
            <div className="space-y-3">
              {Object.entries(monthlySpendingByCategory)
                .sort(([, a], [, b]) => b - a)
                .map(([category, amount]) => {
                  const total = Object.values(monthlySpendingByCategory).reduce((a, b) => a + b, 0)
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
              {profile && profile.loanDebt > 0 && (
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <Car className="w-5 h-5 text-[hsl(var(--accent))]" />
                    <div>
                      <p className="font-medium text-sm">Auto Loan</p>
                      <p className="text-xs text-muted-foreground">${profile.monthlyLoanPayments}/mo payment</p>
                    </div>
                  </div>
                  <p className="font-medium tabular-nums text-[var(--error)]">
                    ${profile.loanDebt.toLocaleString()}
                  </p>
                </div>
              )}
            </div>
            <div className="mt-4 pt-4 border-t border-border flex justify-between">
              <span className="text-sm text-muted-foreground">Total Debt</span>
              <span className="font-medium text-[var(--error)]">${totalDebt.toLocaleString()}</span>
            </div>
          </Card>
        </div>

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
