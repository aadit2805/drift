// Nessie API Types
export interface NessieAccount {
  _id: string
  type: 'Credit Card' | 'Savings' | 'Checking'
  nickname: string
  rewards: number
  balance: number
  account_number?: string
  customer_id: string
}

export interface NessiePurchase {
  _id: string
  type: string
  merchant_id: string
  payer_id: string
  purchase_date: string
  amount: number
  status: 'pending' | 'completed' | 'cancelled'
  medium: string
  description?: string
}

export interface NessieLoan {
  _id: string
  type: 'home' | 'auto' | 'personal'
  creation_date: string
  status: string
  credit_score: number
  monthly_payment: number
  amount: number
  description?: string
}

export interface NessieMerchant {
  _id: string
  name: string
  category: string
  address: {
    street_number: string
    street_name: string
    city: string
    state: string
    zip: string
  }
}

// Application Types
export interface FinancialProfile {
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

export interface UserInputs {
  monthlyIncome: number
  age: number
  riskTolerance: 'low' | 'medium' | 'high'
}

export interface SimulationRequest {
  financialProfile: FinancialProfile
  userInputs: UserInputs
  goal: {
    targetAmount: number
    timelineMonths: number
    goalType: string
  }
  simulationParams?: {
    nSimulations?: number
  }
}

export interface SimulationResults {
  successProbability: number
  medianOutcome: number
  percentiles: {
    p10: number
    p25: number
    p50: number
    p75: number
    p90: number
  }
  mean: number
  std: number
  worstCase: number
  bestCase: number
}

export interface SensitivityAnalysis {
  baseProbability: number
  sensitivities: {
    [param: string]: {
      delta: number
      newProbability: number
      impact: number
    }
  }
  mostImpactful: string
  recommendations: string[]
}
