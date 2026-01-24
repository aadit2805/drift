import axios from 'axios'

const NESSIE_BASE_URL = process.env.NESSIE_BASE_URL || 'http://api.nessieisreal.com'
const NESSIE_API_KEY = process.env.NESSIE_API_KEY || '4389318c54ddf318af62eda4ceed5f66'

export class NessieService {
  private client = axios.create({
    baseURL: NESSIE_BASE_URL,
    params: {
      key: NESSIE_API_KEY,
    },
  })

  // Accounts
  async getAccounts() {
    const response = await this.client.get('/accounts')
    return response.data
  }

  async getAccount(id: string) {
    const response = await this.client.get(`/accounts/${id}`)
    return response.data
  }

  async getCustomerAccounts(customerId: string) {
    const response = await this.client.get(`/customers/${customerId}/accounts`)
    return response.data
  }

  // Purchases
  async getAccountPurchases(accountId: string) {
    const response = await this.client.get(`/accounts/${accountId}/purchases`)
    return response.data
  }

  // Deposits
  async getAccountDeposits(accountId: string) {
    const response = await this.client.get(`/accounts/${accountId}/deposits`)
    return response.data
  }

  // Bills
  async getAccountBills(accountId: string) {
    const response = await this.client.get(`/accounts/${accountId}/bills`)
    return response.data
  }

  // Loans
  async getAccountLoans(accountId: string) {
    const response = await this.client.get(`/accounts/${accountId}/loans`)
    return response.data
  }

  // Transfers
  async getAccountTransfers(accountId: string) {
    const response = await this.client.get(`/accounts/${accountId}/transfers`)
    return response.data
  }

  // Withdrawals
  async getAccountWithdrawals(accountId: string) {
    const response = await this.client.get(`/accounts/${accountId}/withdrawals`)
    return response.data
  }

  // Merchants
  async getMerchants() {
    const response = await this.client.get('/merchants')
    return response.data
  }

  async getMerchant(id: string) {
    const response = await this.client.get(`/merchants/${id}`)
    return response.data
  }

  // Customers
  async getCustomers() {
    const response = await this.client.get('/customers')
    return response.data
  }

  async getCustomer(id: string) {
    const response = await this.client.get(`/customers/${id}`)
    return response.data
  }

  // Create operations (for seeding demo data)
  async createCustomer(data: {
    first_name: string
    last_name: string
    address: {
      street_number: string
      street_name: string
      city: string
      state: string
      zip: string
    }
  }) {
    const response = await this.client.post('/customers', data)
    return response.data
  }

  async createAccount(
    customerId: string,
    data: {
      type: 'Checking' | 'Savings' | 'Credit Card'
      nickname: string
      rewards: number
      balance: number
    }
  ) {
    const response = await this.client.post(`/customers/${customerId}/accounts`, data)
    return response.data
  }

  async createMerchant(data: {
    name: string
    category: string
    address: {
      street_number: string
      street_name: string
      city: string
      state: string
      zip: string
    }
  }) {
    const response = await this.client.post('/merchants', data)
    return response.data
  }

  async createPurchase(
    accountId: string,
    data: {
      merchant_id: string
      medium: 'balance' | 'rewards'
      purchase_date: string
      amount: number
      description?: string
    }
  ) {
    const response = await this.client.post(`/accounts/${accountId}/purchases`, data)
    return response.data
  }

  async createDeposit(
    accountId: string,
    data: {
      medium: 'balance' | 'rewards'
      transaction_date: string
      amount: number
      description?: string
    }
  ) {
    const response = await this.client.post(`/accounts/${accountId}/deposits`, data)
    return response.data
  }

  async createBill(
    accountId: string,
    data: {
      status: 'pending' | 'recurring' | 'completed' | 'cancelled'
      payee: string
      nickname?: string
      payment_date: string
      recurring_date?: number
      payment_amount: number
    }
  ) {
    const response = await this.client.post(`/accounts/${accountId}/bills`, data)
    return response.data
  }

  async createLoan(
    accountId: string,
    data: {
      type: 'home' | 'auto' | 'small business'
      status: 'pending' | 'approved' | 'declined'
      credit_score: number
      monthly_payment: number
      amount: number
      description?: string
    }
  ) {
    const response = await this.client.post(`/accounts/${accountId}/loans`, data)
    return response.data
  }
}
