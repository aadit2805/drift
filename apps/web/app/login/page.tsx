'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, AlertCircle, Loader2, ChevronRight, Building2 } from 'lucide-react'
import { validateCustomer, getPlaidStatus } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { PlaidLink } from '@/components/PlaidLink'

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
  const [connectionType, setConnectionType] = useState<'plaid' | 'demo'>('plaid')
  const [plaidUserId] = useState(() => `user-${Date.now()}`)

  useEffect(() => {
    const existingCustomerId = localStorage.getItem('customerId')
    const existingPlaidUserId = localStorage.getItem('plaidUserId')
    if (existingCustomerId || existingPlaidUserId) {
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
      localStorage.setItem('connectionType', 'nessie')
      router.push('/dashboard')
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Connection error. Please try again.'
      setError(errorMessage)
      setLoading(false)
    }
  }

  const handlePlaidSuccess = () => {
    localStorage.setItem('plaidUserId', plaidUserId)
    localStorage.setItem('connectionType', 'plaid')
    router.push('/dashboard')
  }

  const handlePlaidError = (errorMsg: string) => {
    setError(errorMsg)
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
          <p className="text-muted-foreground mb-6">
            Connect your bank account to get started.
          </p>

          {/* Connection type tabs */}
          <div className="flex gap-2 mb-6 p-1 bg-muted rounded-lg">
            <button
              type="button"
              onClick={() => setConnectionType('plaid')}
              className={`flex-1 py-2 px-4 text-sm rounded-md transition-colors ${
                connectionType === 'plaid'
                  ? 'bg-background shadow-sm font-medium'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Connect Bank
            </button>
            <button
              type="button"
              onClick={() => setConnectionType('demo')}
              className={`flex-1 py-2 px-4 text-sm rounded-md transition-colors ${
                connectionType === 'demo'
                  ? 'bg-background shadow-sm font-medium'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Demo Mode
            </button>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-[var(--error)] text-sm mb-4 p-3 bg-[var(--error-muted)] rounded-lg">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {connectionType === 'plaid' ? (
            <div className="space-y-4">
              <div className="p-4 bg-card/50 rounded-lg border border-border/30">
                <div className="flex items-center gap-3 mb-3">
                  <Building2 className="w-5 h-5 text-[hsl(var(--accent))]" />
                  <span className="font-medium">Secure Bank Connection</span>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Connect your bank accounts securely with Plaid. Your credentials are never shared with us.
                </p>
                <PlaidLink
                  userId={plaidUserId}
                  onSuccess={handlePlaidSuccess}
                  onError={handlePlaidError}
                  className="w-full"
                />
              </div>

              <p className="text-xs text-muted-foreground text-center">
                In sandbox mode, use credentials: user_good / pass_good
              </p>
            </div>
          ) : (
            <div className="space-y-4">
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
              </form>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border/30" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="px-2 bg-background text-muted-foreground">Or choose a demo</span>
                </div>
              </div>

              <div className="space-y-3 p-4 bg-card/50 rounded-lg border border-border/30">
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
            </div>
          )}

          <p className="text-xs text-muted-foreground text-center mt-8">
            {connectionType === 'plaid'
              ? 'Connect real bank accounts via Plaid or try demo mode.'
              : 'Demo mode uses the Capital One Nessie API sandbox.'}
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
