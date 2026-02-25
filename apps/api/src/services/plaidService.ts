import {
  Configuration,
  PlaidApi,
  PlaidEnvironments,
  Products,
  CountryCode,
} from 'plaid'

// Lazy-load the Plaid client to ensure env vars are loaded first
let _client: PlaidApi | null = null

function getClient(): PlaidApi {
  if (!_client) {
    const configuration = new Configuration({
      basePath: PlaidEnvironments[process.env.PLAID_ENV || 'sandbox'],
      baseOptions: {
        headers: {
          'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
          'PLAID-SECRET': process.env.PLAID_SECRET,
        },
      },
    })
    _client = new PlaidApi(configuration)
  }
  return _client
}

// In-memory storage for demo - replace with DB in production
const accessTokenStore: Map<string, string> = new Map()

export function storeAccessToken(userId: string, accessToken: string): void {
  accessTokenStore.set(userId, accessToken)
}

export function getAccessToken(userId: string): string | undefined {
  return accessTokenStore.get(userId)
}

export async function createLinkToken(userId: string): Promise<string> {
  const response = await getClient().linkTokenCreate({
    user: { client_user_id: userId },
    client_name: 'Drift',
    products: [Products.Transactions],
    optional_products: [Products.Liabilities, Products.Investments],
    country_codes: [CountryCode.Us],
    language: 'en',
  })
  return response.data.link_token
}

export async function exchangePublicToken(publicToken: string): Promise<string> {
  const response = await getClient().itemPublicTokenExchange({
    public_token: publicToken,
  })
  return response.data.access_token
}

export async function getAccounts(accessToken: string) {
  const response = await getClient().accountsGet({
    access_token: accessToken,
  })
  return response.data.accounts
}

export async function getBalances(accessToken: string) {
  const response = await getClient().accountsBalanceGet({
    access_token: accessToken,
  })
  return response.data.accounts
}

export async function getTransactions(
  accessToken: string,
  startDate: string,
  endDate: string
) {
  const response = await getClient().transactionsGet({
    access_token: accessToken,
    start_date: startDate,
    end_date: endDate,
  })
  return response.data.transactions
}

export async function getLiabilities(accessToken: string) {
  try {
    const response = await getClient().liabilitiesGet({
      access_token: accessToken,
    })
    return response.data.liabilities
  } catch (error: any) {
    // Liabilities not available for all account types
    if (error?.response?.data?.error_code === 'PRODUCTS_NOT_SUPPORTED') {
      return null
    }
    throw error
  }
}

export async function getInvestments(accessToken: string) {
  try {
    const response = await getClient().investmentsHoldingsGet({
      access_token: accessToken,
    })
    return {
      holdings: response.data.holdings,
      securities: response.data.securities,
      accounts: response.data.accounts,
    }
  } catch (error: any) {
    // Investments not available for all account types
    if (error?.response?.data?.error_code === 'PRODUCTS_NOT_SUPPORTED') {
      return null
    }
    throw error
  }
}

export async function getAllAccountData(accessToken: string) {
  const today = new Date()
  const ninetyDaysAgo = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000)

  const [accounts, transactions, liabilities, investments] = await Promise.all([
    getBalances(accessToken),
    getTransactions(
      accessToken,
      ninetyDaysAgo.toISOString().split('T')[0],
      today.toISOString().split('T')[0]
    ),
    getLiabilities(accessToken),
    getInvestments(accessToken),
  ])

  return {
    accounts,
    transactions,
    liabilities,
    investments,
  }
}
