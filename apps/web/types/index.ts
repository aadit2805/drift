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

export interface NessieDeposit {
  _id: string
  type: string
  transaction_date: string
  status: 'pending' | 'completed' | 'cancelled'
  payee_id: string
  medium: string
  amount: number
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

export interface NessieBill {
  _id: string
  status: 'pending' | 'completed' | 'cancelled' | 'recurring'
  payee: string
  nickname: string
  creation_date: string
  payment_date: string
  recurring_date: number
  upcoming_payment_date: string
  payment_amount: number
  account_id: string
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
  geocode?: {
    lat: number
    lng: number
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
  monthlyIncome: number // Now pulled from API, kept for simulation compatibility
  age: number
  riskTolerance: 'low' | 'medium' | 'high'
}

export interface ParsedGoal {
  goalType: string
  targetAmount: number
  timelineMonths: number
  constraints: string[]
  clarifyingQuestions?: string[]
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
