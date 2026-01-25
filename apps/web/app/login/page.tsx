'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, AlertCircle, Loader2 } from 'lucide-react'
import { validateCustomer } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'

export default function LoginPage() {
  const router = useRouter()
  const [customerId, setCustomerId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)

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

  const useDemoAccount = () => {
    setCustomerId('697541cf95150878eafea4ff')
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-card items-center justify-center p-12">
        <div className="max-w-md">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-foreground rounded-lg" />
            <span className="text-2xl font-semibold">FutureCast</span>
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
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-6 h-6 bg-foreground rounded" />
            <span className="font-medium">FutureCast</span>
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

            <Button
              type="button"
              variant="outline"
              onClick={useDemoAccount}
              disabled={loading}
              className="w-full"
            >
              Use Demo Account
            </Button>
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
