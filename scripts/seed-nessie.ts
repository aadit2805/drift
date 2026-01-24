/**
 * Nessie API Data Seeder
 *
 * Creates realistic demo data for the Monte Carlo Finance application.
 * Run with: npx ts-node scripts/seed-nessie.ts
 */

const NESSIE_BASE_URL = 'http://api.nessieisreal.com'
const NESSIE_API_KEY = '4389318c54ddf318af62eda4ceed5f66' //its ok that this is public it isn't that deep 

interface ApiResponse {
  code: number
  message: string
  objectCreated?: any
}

async function apiCall(
  method: 'GET' | 'POST' | 'DELETE',
  endpoint: string,
  body?: any
): Promise<any> {
  const url = `${NESSIE_BASE_URL}${endpoint}?key=${NESSIE_API_KEY}`

  const options: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' },
  }

  if (body) {
    options.body = JSON.stringify(body)
  }

  const response = await fetch(url, options)
  return response.json()
}

// Merchant categories and names
const MERCHANTS = [
  { name: 'Whole Foods Market', category: 'Groceries' },
  { name: 'Trader Joe\'s', category: 'Groceries' },
  { name: 'Chipotle', category: 'Dining' },
  { name: 'Starbucks', category: 'Dining' },
  { name: 'Local Restaurant', category: 'Dining' },
  { name: 'Shell Gas Station', category: 'Gas' },
  { name: 'Amazon', category: 'Shopping' },
  { name: 'Target', category: 'Shopping' },
  { name: 'Netflix', category: 'Entertainment' },
  { name: 'Spotify', category: 'Entertainment' },
  { name: 'Planet Fitness', category: 'Health' },
  { name: 'CVS Pharmacy', category: 'Health' },
  { name: 'Uber', category: 'Transport' },
  { name: 'MBTA', category: 'Transport' },
]

// Spending patterns (average monthly by category)
const SPENDING_PATTERNS: Record<string, { mean: number; std: number }> = {
  Groceries: { mean: 400, std: 80 },
  Dining: { mean: 250, std: 100 },
  Gas: { mean: 150, std: 40 },
  Shopping: { mean: 200, std: 150 },
  Entertainment: { mean: 50, std: 20 },
  Health: { mean: 100, std: 50 },
  Transport: { mean: 80, std: 30 },
}

function randomNormal(mean: number, std: number): number {
  const u1 = Math.random()
  const u2 = Math.random()
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
  return Math.max(0, Math.round(z * std + mean))
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

async function seedData() {
  console.log('🚀 Starting Nessie data seeding...\n')

  // 1. Create customer
  console.log('Creating customer...')
  const customerResponse = await apiCall('POST', '/customers', {
    first_name: 'Demo',
    last_name: 'User',
    address: {
      street_number: '123',
      street_name: 'Main Street',
      city: 'Boston',
      state: 'MA',
      zip: '02101',
    },
  })

  if (!customerResponse.objectCreated) {
    console.error('Failed to create customer:', customerResponse)
    return
  }

  const customerId = customerResponse.objectCreated._id
  console.log(`✅ Customer created: ${customerId}\n`)

  // 2. Create accounts
  console.log('Creating accounts...')

  const checkingResponse = await apiCall('POST', `/customers/${customerId}/accounts`, {
    type: 'Checking',
    nickname: 'Primary Checking',
    rewards: 0,
    balance: 5500,
  })
  const checkingId = checkingResponse.objectCreated._id
  console.log(`✅ Checking account: ${checkingId}`)

  const savingsResponse = await apiCall('POST', `/customers/${customerId}/accounts`, {
    type: 'Savings',
    nickname: 'Emergency Fund',
    rewards: 0,
    balance: 8000,
  })
  const savingsId = savingsResponse.objectCreated._id
  console.log(`✅ Savings account: ${savingsId}`)

  const creditResponse = await apiCall('POST', `/customers/${customerId}/accounts`, {
    type: 'Credit Card',
    nickname: 'Rewards Card',
    rewards: 2500,
    balance: 1200,
  })
  const creditId = creditResponse.objectCreated._id
  console.log(`✅ Credit card: ${creditId}\n`)

  // 3. Create merchants
  console.log('Creating merchants...')
  const merchantIds: Record<string, string> = {}

  for (const merchant of MERCHANTS) {
    const response = await apiCall('POST', '/merchants', {
      name: merchant.name,
      category: merchant.category,
      address: {
        street_number: String(Math.floor(Math.random() * 999) + 1),
        street_name: 'Commerce Street',
        city: 'Boston',
        state: 'MA',
        zip: '02101',
      },
    })

    if (response.objectCreated) {
      merchantIds[merchant.name] = response.objectCreated._id
      console.log(`✅ Merchant: ${merchant.name} (${merchant.category})`)
    }
  }
  console.log()

  // 4. Create 6 months of transaction history
  console.log('Creating transactions (6 months)...')

  const today = new Date()
  let transactionCount = 0

  for (let monthOffset = 5; monthOffset >= 0; monthOffset--) {
    const monthStart = new Date(today.getFullYear(), today.getMonth() - monthOffset, 1)

    // Create deposit (salary) at beginning of month
    await apiCall('POST', `/accounts/${checkingId}/deposits`, {
      medium: 'balance',
      transaction_date: formatDate(monthStart),
      amount: 5000,
      description: 'Monthly Salary',
    })
    transactionCount++

    // Create purchases throughout the month
    for (const merchant of MERCHANTS) {
      const pattern = SPENDING_PATTERNS[merchant.category]
      if (!pattern) continue

      // Calculate monthly spend for this category
      const monthlySpend = randomNormal(pattern.mean, pattern.std)

      // Split into 2-4 transactions
      const numTransactions = Math.floor(Math.random() * 3) + 2
      const amounts = Array.from({ length: numTransactions }, () => Math.random())
      const total = amounts.reduce((a, b) => a + b, 0)
      const normalizedAmounts = amounts.map((a) => Math.round((a / total) * monthlySpend))

      for (let i = 0; i < numTransactions; i++) {
        if (normalizedAmounts[i] < 5) continue

        const day = Math.floor(Math.random() * 28) + 1
        const transactionDate = new Date(monthStart.getFullYear(), monthStart.getMonth(), day)

        await apiCall('POST', `/accounts/${checkingId}/purchases`, {
          merchant_id: merchantIds[merchant.name],
          medium: 'balance',
          purchase_date: formatDate(transactionDate),
          amount: normalizedAmounts[i],
          description: `Purchase at ${merchant.name}`,
        })
        transactionCount++
      }
    }

    // Transfer to savings
    const savingsTransfer = randomNormal(500, 100)
    await apiCall('POST', `/accounts/${checkingId}/transfers`, {
      medium: 'balance',
      payee_id: savingsId,
      amount: savingsTransfer,
      transaction_date: formatDate(new Date(monthStart.getFullYear(), monthStart.getMonth(), 15)),
      description: 'Monthly savings transfer',
    })
    transactionCount++

    console.log(`  Month ${6 - monthOffset}/6 complete`)
  }

  console.log(`\n✅ Created ${transactionCount} transactions\n`)

  // 5. Create recurring bills
  console.log('Creating bills...')

  const bills = [
    { payee: 'Rent', amount: 1800, day: 1 },
    { payee: 'Electric Company', amount: 85, day: 15 },
    { payee: 'Internet Provider', amount: 70, day: 10 },
    { payee: 'Phone Bill', amount: 45, day: 20 },
  ]

  for (const bill of bills) {
    await apiCall('POST', `/accounts/${checkingId}/bills`, {
      status: 'recurring',
      payee: bill.payee,
      nickname: bill.payee,
      payment_date: formatDate(new Date(today.getFullYear(), today.getMonth(), bill.day)),
      recurring_date: bill.day,
      payment_amount: bill.amount,
    })
    console.log(`✅ Bill: ${bill.payee} ($${bill.amount}/mo)`)
  }
  console.log()

  // 6. Create a loan
  console.log('Creating loan...')
  await apiCall('POST', `/accounts/${checkingId}/loans`, {
    type: 'auto',
    status: 'approved',
    credit_score: 720,
    monthly_payment: 350,
    amount: 15000,
    description: 'Auto loan - 2022 Honda Civic',
  })
  console.log('✅ Auto loan created\n')

  // Summary
  console.log('=' .repeat(50))
  console.log('🎉 Seeding complete!')
  console.log('=' .repeat(50))
  console.log(`
Summary:
- Customer ID: ${customerId}
- Checking Account: ${checkingId} ($5,500)
- Savings Account: ${savingsId} ($8,000)
- Credit Card: ${creditId} ($1,200 balance)
- Merchants: ${Object.keys(merchantIds).length}
- Transactions: ${transactionCount}
- Bills: ${bills.length}
- Loans: 1

Use these IDs for testing the API.
`)
}

// Run seeder
seedData().catch(console.error)
