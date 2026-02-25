'use client'

import { DepositoryCard } from './DepositoryCard'
import { CreditCard } from './CreditCard'
import { LoanCard } from './LoanCard'
import { InvestmentCard } from './InvestmentCard'
import type { EnhancedFinancialProfile } from '@/types'

interface AccountListProps {
  profile: EnhancedFinancialProfile
}

export function AccountList({ profile }: AccountListProps) {
  const hasDepository = profile.depository.length > 0
  const hasCredit = profile.credit.length > 0
  const hasLoans = profile.loans.length > 0
  const hasInvestments = profile.investments.length > 0

  if (!hasDepository && !hasCredit && !hasLoans && !hasInvestments) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No accounts found. Connect a bank account to get started.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Depository accounts */}
      {hasDepository && (
        <div>
          <h3 className="text-xs uppercase text-muted-foreground mb-3 tracking-wider">
            Cash Accounts
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {profile.depository.map((account) => (
              <DepositoryCard key={account.id} account={account} />
            ))}
          </div>
        </div>
      )}

      {/* Credit cards */}
      {hasCredit && (
        <div>
          <h3 className="text-xs uppercase text-muted-foreground mb-3 tracking-wider">
            Credit Cards
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {profile.credit.map((account) => (
              <CreditCard key={account.id} account={account} />
            ))}
          </div>
        </div>
      )}

      {/* Loans */}
      {hasLoans && (
        <div>
          <h3 className="text-xs uppercase text-muted-foreground mb-3 tracking-wider">
            Loans
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {profile.loans.map((account) => (
              <LoanCard key={account.id} account={account} />
            ))}
          </div>
        </div>
      )}

      {/* Investments */}
      {hasInvestments && (
        <div>
          <h3 className="text-xs uppercase text-muted-foreground mb-3 tracking-wider">
            Investments
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {profile.investments.map((account) => (
              <InvestmentCard key={account.id} account={account} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
