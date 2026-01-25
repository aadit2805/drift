import axios from 'axios'
import type {
  FinancialProfile,
  SimulationRequest,
  SimulationResults,
  ParsedGoal,
  NessieAccount,
  NessiePurchase,
  Job,
  ClusterStatus,
  JobSubmitResponse,
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

// AI Endpoints for narrative and audio generation
export interface NarrativeRequest {
  simulationResults: SimulationResults
  financialProfile: FinancialProfile
  goal: {
    targetAmount: number
    timelineMonths: number
    goalType: string
  }
}

export interface BriefingResponse {
  narrative: string
  audioAvailable: boolean
  audio?: string // base64-encoded audio
  contentType?: string
  message?: string
}

export const generateNarrative = async (request: NarrativeRequest): Promise<{ narrative: string }> => {
  const response = await api.post('/api/ai/generate-narrative', request)
  return response.data
}

export const generateAudio = async (text: string, voice?: string): Promise<ArrayBuffer> => {
  const response = await api.post('/api/ai/generate-audio', { text, voice }, {
    responseType: 'arraybuffer'
  })
  return response.data
}

export const generateBriefing = async (
  request: NarrativeRequest & { voice?: string }
): Promise<BriefingResponse> => {
  const response = await api.post('/api/ai/generate-briefing', request)
  return response.data
}

export const getAvailableVoices = async (): Promise<{
  configured: boolean
  voices: { id: string; name: string }[]
}> => {
  const response = await api.get('/api/ai/voices')
  return response.data
}

// Transcribe audio using ElevenLabs Speech-to-Text
export const transcribeAudio = async (audioBlob: Blob): Promise<string> => {
  // Convert blob to base64
  const arrayBuffer = await audioBlob.arrayBuffer()
  const base64 = btoa(
    new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
  )

  const response = await api.post('/api/ai/transcribe', { audio: base64 })
  return response.data.transcript
}

// Voice goal conversation types
export interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface VoiceGoalResponse {
  userTranscript: string
  assistantResponse: string
  isComplete: boolean
  parsedGoal?: {
    targetAmount: number
    timelineMonths: number
    goalType: string
  }
  audio: string | null
  audioAvailable: boolean
}

export interface VoiceResultsResponse {
  userTranscript: string
  assistantResponse: string
  audio: string | null
  audioAvailable: boolean
}

export interface VoiceResultsContext {
  simulationResults: {
    successProbability: number
    medianOutcome: number
    percentiles: { p10: number; p25: number; p50: number; p75: number; p90: number }
    mean?: number
    std?: number
    worstCase?: number
    bestCase?: number
  }
  financialProfile: {
    monthlyIncome: number
    monthlySpending: number
    liquidAssets: number
    creditDebt: number
    loanDebt: number
    monthlyLoanPayments: number
    spendingByCategory: Record<string, number>
    spendingVolatility: number
  }
  goal: {
    targetAmount: number
    timelineMonths: number
    goalType: string
  }
}

// Voice goal conversation - send audio or text, get response with optional TTS
export const sendVoiceGoal = async (
  input: { audio?: Blob; text?: string },
  conversationHistory: ConversationMessage[]
): Promise<VoiceGoalResponse> => {
  let audioBase64: string | undefined

  if (input.audio) {
    const arrayBuffer = await input.audio.arrayBuffer()
    audioBase64 = btoa(
      new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
    )
  }

  const response = await api.post('/api/ai/voice-goal', {
    audio: audioBase64,
    text: input.text,
    conversationHistory,
  })

  return response.data
}

// Voice results conversation - discuss simulation results with AI
export const sendVoiceResults = async (
  input: { audio?: Blob; text?: string },
  conversationHistory: ConversationMessage[],
  context: VoiceResultsContext
): Promise<VoiceResultsResponse> => {
  let audioBase64: string | undefined

  if (input.audio) {
    const arrayBuffer = await input.audio.arrayBuffer()
    audioBase64 = btoa(
      new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
    )
  }

  const response = await api.post('/api/ai/voice-results', {
    audio: audioBase64,
    text: input.text,
    conversationHistory,
    context,
  })

  return response.data
}

// HPC Cluster Job API

// Submit a new job to the cluster
export const submitJob = async (request: SimulationRequest): Promise<JobSubmitResponse> => {
  const response = await api.post('/api/jobs', request)
  return response.data
}

// Get job status
export const getJobStatus = async (jobId: string): Promise<Job> => {
  const response = await api.get(`/api/jobs/${jobId}`)
  return response.data
}

// Cancel a job
export const cancelJob = async (jobId: string): Promise<{ success: boolean; message: string }> => {
  const response = await api.delete(`/api/jobs/${jobId}`)
  return response.data
}

// Get cluster status
export const getClusterStatus = async (): Promise<ClusterStatus> => {
  const response = await api.get('/api/cluster/status')
  return response.data
}

export default api
