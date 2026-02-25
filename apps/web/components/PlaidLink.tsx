'use client'

import { useState, useEffect, useCallback } from 'react'
import { usePlaidLink } from 'react-plaid-link'
import { createPlaidLinkToken, exchangePlaidToken } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Loader2, Building2 } from 'lucide-react'

interface PlaidLinkProps {
  userId: string
  onSuccess: () => void
  onError?: (error: string) => void
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg'
  className?: string
}

export function PlaidLink({
  userId,
  onSuccess,
  onError,
  variant = 'default',
  size = 'default',
  className,
}: PlaidLinkProps) {
  const [linkToken, setLinkToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [tokenLoading, setTokenLoading] = useState(true)

  useEffect(() => {
    const fetchLinkToken = async () => {
      try {
        const { linkToken } = await createPlaidLinkToken(userId)
        setLinkToken(linkToken)
      } catch (error: any) {
        console.error('Failed to create link token:', error)
        onError?.('Failed to initialize bank connection')
      } finally {
        setTokenLoading(false)
      }
    }

    fetchLinkToken()
  }, [userId, onError])

  const handleSuccess = useCallback(
    async (publicToken: string) => {
      setLoading(true)
      try {
        await exchangePlaidToken(publicToken, userId)
        onSuccess()
      } catch (error: any) {
        console.error('Failed to exchange token:', error)
        onError?.('Failed to connect bank account')
      } finally {
        setLoading(false)
      }
    },
    [userId, onSuccess, onError]
  )

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: (publicToken) => handleSuccess(publicToken),
    onExit: (error) => {
      if (error) {
        console.error('Plaid Link error:', error)
        onError?.('Bank connection was cancelled')
      }
    },
  })

  const isDisabled = !ready || loading || tokenLoading

  return (
    <Button
      onClick={() => open()}
      disabled={isDisabled}
      variant={variant}
      size={size}
      className={className}
    >
      {loading || tokenLoading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          {loading ? 'Connecting...' : 'Initializing...'}
        </>
      ) : (
        <>
          <Building2 className="w-4 h-4" />
          Connect Bank Account
        </>
      )}
    </Button>
  )
}
