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
  GraduationCap,
  Home,
  Landmark,
  Calendar,
  ShoppingBag,
} from 'lucide-react'
import { getAccounts, getFinancialProfile } from '@/lib/api'

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

    // Fetch accounts and financial profile for this customer
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
        <div className="w-6 h-6 border-2 border-[var(--text-tertiary)] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const netWorth = profile
    ? profile.liquidAssets - profile.creditDebt - profile.loanDebt
    : 0

  const monthlyCashFlow = profile
    ? profile.monthlyIncome - profile.monthlySpending
    : 0

  // Calculate variable spending (total spending minus fixed costs)
  const variableSpending = profile
    ? profile.monthlySpending - profile.monthlyBills - profile.monthlyLoanPayments
    : 0

  // Calculate monthly averages for spending categories
  const monthlySpendingByCategory = profile?.spendingByCategory
    ? Object.fromEntries(
        Object.entries(profile.spendingByCategory).map(([k, v]) => [k, Math.round(v / 12)])
      )
    : {}

  const totalDebt = profile
    ? profile.creditDebt + profile.loanDebt
    : 0

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* Header */}
      <header className="border-b border-[var(--border-primary)] px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-6 h-6 bg-[var(--accent)] rounded" />
              <span className="font-medium">FutureCast</span>
            </Link>
            <span className="text-[var(--text-tertiary)]">/</span>
            <span className="text-[var(--text-secondary)]">Dashboard</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-[var(--text-secondary)]">
              {customer?.first_name} {customer?.last_name}
            </span>
            <button
              onClick={handleLogout}
              className="btn btn-secondary text-sm"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-2xl font-medium mb-2">
            Welcome back, {customer?.first_name}
          </h1>
          <p className="text-[var(--text-secondary)]">
            Here's your complete financial overview from Capital One.
          </p>
        </div>

        {/* Overview Cards */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <div className="card p-5">
            <div className="flex items-center gap-2 text-[var(--text-tertiary)] mb-2">
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm">Net Worth</span>
            </div>
            <p className={`text-3xl font-medium tabular-nums ${netWorth >= 0 ? 'text-[var(--success)]' : 'text-[var(--error)]'}`}>
              ${netWorth.toLocaleString()}
            </p>
            <p className="text-xs text-[var(--text-tertiary)] mt-1">Assets minus all debts</p>
          </div>
          <div className="card p-5">
            <div className="flex items-center gap-2 text-[var(--text-tertiary)] mb-2">
              <Wallet className="w-4 h-4" />
              <span className="text-sm">Monthly Income</span>
            </div>
            <p className="text-3xl font-medium tabular-nums">
              ${profile?.monthlyIncome.toLocaleString()}
            </p>
            <p className="text-xs text-[var(--text-tertiary)] mt-1">Salary + deposits</p>
          </div>
          <div className="card p-5">
            <div className="flex items-center gap-2 text-[var(--text-tertiary)] mb-2">
              <PiggyBank className="w-4 h-4" />
              <span className="text-sm">Monthly Cash Flow</span>
            </div>
            <p className={`text-3xl font-medium tabular-nums ${monthlyCashFlow >= 0 ? 'text-[var(--success)]' : 'text-[var(--error)]'}`}>
              {monthlyCashFlow >= 0 ? '+' : ''}${monthlyCashFlow.toLocaleString()}
            </p>
            <p className="text-xs text-[var(--text-tertiary)] mt-1">Income minus expenses</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          {/* Accounts */}
          <div className="card p-6">
            <h2 className="font-medium mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Accounts
            </h2>
            <div className="space-y-3">
              {accounts.filter(a => a.type !== 'Credit Card').map((account) => (
                <div
                  key={account._id}
                  className="flex items-center justify-between p-3 bg-[var(--bg-secondary)] rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {account.type === 'Checking' && <Wallet className="w-5 h-5 text-blue-500" />}
                    {account.type === 'Savings' && <PiggyBank className="w-5 h-5 text-green-500" />}
                    <div>
                      <p className="font-medium text-sm">{account.nickname}</p>
                      <p className="text-xs text-[var(--text-tertiary)]">{account.type}</p>
                    </div>
                  </div>
                  <p className="font-medium tabular-nums">
                    ${account.balance.toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-[var(--border-primary)] flex justify-between">
              <span className="text-sm text-[var(--text-secondary)]">Total Liquid Assets</span>
              <span className="font-medium text-[var(--success)]">${profile?.liquidAssets.toLocaleString()}</span>
            </div>
          </div>

          {/* Monthly Expenses Breakdown */}
          <div className="card p-6">
            <h2 className="font-medium mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Monthly Expenses
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-[var(--bg-secondary)] rounded-lg">
                <div className="flex items-center gap-3">
                  <Home className="w-5 h-5 text-orange-500" />
                  <div>
                    <p className="font-medium text-sm">Fixed Bills</p>
                    <p className="text-xs text-[var(--text-tertiary)]">Rent, utilities, subscriptions</p>
                  </div>
                </div>
                <p className="font-medium tabular-nums">${profile?.monthlyBills.toLocaleString()}</p>
              </div>
              <div className="flex items-center justify-between p-3 bg-[var(--bg-secondary)] rounded-lg">
                <div className="flex items-center gap-3">
                  <Landmark className="w-5 h-5 text-red-500" />
                  <div>
                    <p className="font-medium text-sm">Loan Payments</p>
                    <p className="text-xs text-[var(--text-tertiary)]">Auto, student, personal</p>
                  </div>
                </div>
                <p className="font-medium tabular-nums">${profile?.monthlyLoanPayments.toLocaleString()}</p>
              </div>
              <div className="flex items-center justify-between p-3 bg-[var(--bg-secondary)] rounded-lg">
                <div className="flex items-center gap-3">
                  <ShoppingBag className="w-5 h-5 text-[var(--accent)]" />
                  <div>
                    <p className="font-medium text-sm">Variable Spending</p>
                    <p className="text-xs text-[var(--text-tertiary)]">Groceries, dining, shopping</p>
                  </div>
                </div>
                <p className="font-medium tabular-nums">${variableSpending.toLocaleString()}</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-[var(--border-primary)] flex justify-between">
              <span className="text-sm text-[var(--text-secondary)]">Total Monthly Expenses</span>
              <span className="font-medium">${profile?.monthlySpending.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          {/* Spending by Category (Monthly Averages) */}
          <div className="card p-6">
            <h2 className="font-medium mb-1 flex items-center gap-2">
              <Receipt className="w-5 h-5" />
              Spending by Category
            </h2>
            <p className="text-xs text-[var(--text-tertiary)] mb-4">Monthly averages based on 12-month history</p>
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
                      <div className="h-2 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[var(--accent)] rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>

          {/* Long-Term Debt */}
          <div className="card p-6">
            <h2 className="font-medium mb-1 flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Long-Term Debt
            </h2>
            <p className="text-xs text-[var(--text-tertiary)] mb-4">Outstanding balances</p>
            <div className="space-y-3">
              {accounts.filter(a => a.type === 'Credit Card').map((account) => (
                <div
                  key={account._id}
                  className="flex items-center justify-between p-3 bg-[var(--bg-secondary)] rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <CreditCard className="w-5 h-5 text-[var(--error)]" />
                    <div>
                      <p className="font-medium text-sm">{account.nickname}</p>
                      <p className="text-xs text-[var(--text-tertiary)]">Credit Card</p>
                    </div>
                  </div>
                  <p className="font-medium tabular-nums text-[var(--error)]">
                    ${account.balance.toLocaleString()}
                  </p>
                </div>
              ))}
              {profile && profile.loanDebt > 0 && (
                <div className="flex items-center justify-between p-3 bg-[var(--bg-secondary)] rounded-lg">
                  <div className="flex items-center gap-3">
                    <Car className="w-5 h-5 text-blue-500" />
                    <div>
                      <p className="font-medium text-sm">Auto Loan</p>
                      <p className="text-xs text-[var(--text-tertiary)]">${profile.monthlyLoanPayments}/mo payment</p>
                    </div>
                  </div>
                  <p className="font-medium tabular-nums text-[var(--error)]">
                    ${profile.loanDebt.toLocaleString()}
                  </p>
                </div>
              )}
            </div>
            <div className="mt-4 pt-4 border-t border-[var(--border-primary)] flex justify-between">
              <span className="text-sm text-[var(--text-secondary)]">Total Debt</span>
              <span className="font-medium text-[var(--error)]">${totalDebt.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="card p-6 bg-gradient-to-r from-[var(--bg-secondary)] to-[var(--bg-tertiary)]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-medium mb-2">Ready to plan your future?</h2>
              <p className="text-[var(--text-secondary)]">
                Run a Monte Carlo simulation to see the probability of reaching your financial goals.
              </p>
            </div>
            <Link href="/onboarding" className="btn btn-primary">
              Start Simulation
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
