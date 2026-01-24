import axios from 'axios'
import type {
  FinancialProfile,
  SimulationRequest,
  SimulationResults,
  ParsedGoal,
  NessieAccount,
  NessiePurchase,
} from '@/types'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Nessie endpoints
export const nessieApi = {
  getAccounts: async (): Promise<NessieAccount[]> => {
    const response = await api.get('/api/nessie/accounts')
    return response.data
  },

  getAccountPurchases: async (accountId: string): Promise<NessiePurchase[]> => {
    const response = await api.get(`/api/nessie/accounts/${accountId}/purchases`)
    return response.data
  },

  getAccountDeposits: async (accountId: string) => {
    const response = await api.get(`/api/nessie/accounts/${accountId}/deposits`)
    return response.data
  },

  getAccountBills: async (accountId: string) => {
    const response = await api.get(`/api/nessie/accounts/${accountId}/bills`)
    return response.data
  },

  getAccountLoans: async (accountId: string) => {
    const response = await api.get(`/api/nessie/accounts/${accountId}/loans`)
    return response.data
  },

  getMerchants: async () => {
    const response = await api.get('/api/nessie/merchants')
    return response.data
  },
}

// Aggregation endpoint - requires customerId
export const getFinancialProfile = async (customerId: string): Promise<FinancialProfile> => {
  const response = await api.get('/api/financial-profile', {
    params: { customerId }
  })
  return response.data
}

// LLM endpoint
export const parseGoal = async (goal: string): Promise<ParsedGoal> => {
  const response = await api.post('/api/parse-goal', { goal })
  return response.data
}

// Simulation endpoints
export const runSimulation = async (
  request: SimulationRequest
): Promise<SimulationResults> => {
  const response = await api.post('/api/simulate', request)
  return response.data
}

export const runSensitivityAnalysis = async (request: SimulationRequest) => {
  const response = await api.post('/api/sensitivity', request)
  return response.data
}

// Validate customer ID
export const validateCustomer = async (customerId: string) => {
  const response = await api.post('/api/validate-customer', { customerId })
  return response.data
}

// Get accounts - requires customerId
export const getAccounts = async (customerId: string) => {
  const response = await api.get('/api/accounts', {
    params: { customerId }
  })
  return response.data
}

export default api
