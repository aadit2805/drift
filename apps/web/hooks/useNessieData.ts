'use client'

import { useQuery } from '@tanstack/react-query'
import { nessieApi, getFinancialProfile, getAccounts } from '@/lib/api'

export function useAccounts(customerId: string | null) {
  return useQuery({
    queryKey: ['accounts', customerId],
    queryFn: () => getAccounts(customerId!),
    enabled: !!customerId,
  })
}

export function useAccountPurchases(accountId: string) {
  return useQuery({
    queryKey: ['purchases', accountId],
    queryFn: () => nessieApi.getAccountPurchases(accountId),
    enabled: !!accountId,
  })
}

export function useAccountDeposits(accountId: string) {
  return useQuery({
    queryKey: ['deposits', accountId],
    queryFn: () => nessieApi.getAccountDeposits(accountId),
    enabled: !!accountId,
  })
}

export function useAccountLoans(accountId: string) {
  return useQuery({
    queryKey: ['loans', accountId],
    queryFn: () => nessieApi.getAccountLoans(accountId),
    enabled: !!accountId,
  })
}

export function useMerchants() {
  return useQuery({
    queryKey: ['merchants'],
    queryFn: nessieApi.getMerchants,
  })
}

export function useFinancialProfile(customerId: string | null) {
  return useQuery({
    queryKey: ['financialProfile', customerId],
    queryFn: () => getFinancialProfile(customerId!),
    enabled: !!customerId,
  })
}
