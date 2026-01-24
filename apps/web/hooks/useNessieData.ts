'use client'

import { useQuery } from '@tanstack/react-query'
import { nessieApi, getFinancialProfile } from '@/lib/api'

export function useAccounts() {
  return useQuery({
    queryKey: ['accounts'],
    queryFn: nessieApi.getAccounts,
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

export function useFinancialProfile() {
  return useQuery({
    queryKey: ['financialProfile'],
    queryFn: getFinancialProfile,
  })
}
