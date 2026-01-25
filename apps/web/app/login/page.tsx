'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, AlertCircle, Loader2, ChevronRight } from 'lucide-react'
import { validateCustomer } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'

const DEMO_ACCOUNTS = [
  {
    id: '6975325e95150878eafe8c79',
    name: 'Alex Morgan',
    estimated_monthly_salary: 6400,
    estimated_monthly_expenses: 4846,
    estimated_debt: 20350,
    net_worth: 200,
  },
  {
    id: '697541cf95150878eafea4ff',
    name: 'Jordan Smith',
    estimated_monthly_salary: 3668,
    estimated_monthly_expenses: 3800,
    estimated_debt: 28200,
    net_worth: -21000,
  },
  {
    id: '69754eb095150878eafeb524',
    name: 'Taylor Chen',
    estimated_monthly_salary: 8334,
    estimated_monthly_expenses: 7078,
    estimated_debt: 850,
    net_worth: 84650,
  },
]

export default function LoginPage() {
  const router = useRouter()
  const [customerId, setCustomerId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [showDemoAccounts, setShowDemoAccounts] = useState(false)

  useEffect(() => {
    const existingCustomerId = localStorage.getItem('customerId')
    if (existingCustomerId) {
      router.push('/dashboard')
    } else {
      setCheckingAuth(false)
    }
  }, [router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const data = await validateCustomer(customerId.trim())

      if (!data.valid) {
        setError(data.error || 'Invalid Customer ID. Please check and try again.')
        setLoading(false)
        return
      }

      localStorage.setItem('customerId', customerId.trim())
      localStorage.setItem('customerData', JSON.stringify(data.customer))
      router.push('/dashboard')
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Connection error. Please try again.'
      setError(errorMessage)
      setLoading(false)
    }
  }

  const handleDemoLogin = async (demoId: string) => {
    setError(null)
    setLoading(true)
    setShowDemoAccounts(false)

    try {
      const data = await validateCustomer(demoId)

      if (!data.valid) {
        setError(data.error || 'Failed to load demo account. Please try again.')
        setLoading(false)
        return
      }

      localStorage.setItem('customerId', demoId)
      localStorage.setItem('customerData', JSON.stringify(data.customer))
      router.push('/dashboard')
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Connection error. Please try again.'
      setError(errorMessage)
      setLoading(false)
    }
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex relative">
      {/* Subtle depth */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,transparent_0%,hsl(var(--background))_70%)] opacity-40" />
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-card/40 backdrop-blur-sm items-center justify-center p-12 border-r border-border/30">
        <div className="max-w-md">
          <div className="mb-8">
            <span className="text-lg font-semibold tracking-tight">Drift</span>
          </div>
          <h1 className="text-4xl font-medium mb-4">
            See your financial future with clarity
          </h1>
          <p className="text-muted-foreground text-lg">
            Connect your Capital One account and run Monte Carlo simulations to understand the probability of reaching your financial goals.
          </p>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8">
            <span className="text-lg font-semibold tracking-tight">Drift</span>
          </div>

          <h2 className="text-2xl font-medium mb-2">Sign in</h2>
          <p className="text-muted-foreground mb-8">
            Enter your Capital One Customer ID to access your account.
          </p>

          <form onSubmit={handleLogin}>
            <div className="mb-4">
              <label htmlFor="customerId" className="block text-sm font-medium mb-2">
                Customer ID
              </label>
              <Input
                id="customerId"
                type="text"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                placeholder="e.g., 697541cf95150878eafea4ff"
                className="font-mono text-sm"
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground mt-2">
                Your 24-character Nessie Customer ID
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-[var(--error)] text-sm mb-4 p-3 bg-[var(--error-muted)] rounded-lg">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button
              type="submit"
              disabled={!customerId.trim() || loading}
              className="w-full mb-4"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  Connect Account
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>

            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border/30" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="px-2 bg-background text-muted-foreground">Or</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={() => setShowDemoAccounts(!showDemoAccounts)}
              disabled={loading}
              className="w-full mb-4"
            >
              Use a demo account
            </Button>

            {showDemoAccounts && (
              <div className="space-y-3 mb-6 p-4 bg-card/50 rounded-lg border border-border/30">
                {DEMO_ACCOUNTS.map((account) => (
                  <button
                    key={account.id}
                    onClick={() => handleDemoLogin(account.id)}
                    disabled={loading}
                    className="w-full text-left p-3 rounded-lg hover:bg-muted/50 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed border border-border/20 hover:border-border/50"
                  >
                    <div className="flex items-center justify-between mb-2 group">
                      <span className="text-sm font-medium">{account.name}</span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-xs text-muted-foreground">
                      <div>
                        <div className="text-muted-foreground/70">Salary</div>
                        <div className="font-semibold text-foreground">
                          ${account.estimated_monthly_salary.toLocaleString('en-US', {
                            maximumFractionDigits: 0,
                          })}
                          /mo
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground/70">Expenses</div>
                        <div className="font-semibold text-foreground">
                          ${account.estimated_monthly_expenses.toLocaleString('en-US', {
                            maximumFractionDigits: 0,
                          })}
                          /mo
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground/70">Debt</div>
                        <div className="font-semibold text-foreground">
                          ${account.estimated_debt.toLocaleString('en-US', {
                            maximumFractionDigits: 0,
                          })}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground/70">Net Worth</div>
                        <div className="font-semibold text-foreground">
                          ${account.net_worth.toLocaleString('en-US', {
                            maximumFractionDigits: 0,
                          })}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

                      </form>

          <p className="text-xs text-muted-foreground text-center mt-8">
            This app uses the Capital One Nessie API for demo purposes.
            <br />
            No real banking data is accessed.
          </p>

          <div className="mt-8 pt-6 border-t border-border">
            <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-150">
              ← Back to home
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
