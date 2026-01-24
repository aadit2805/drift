/**
 * Nessie API Data Seeder
 *
 * Creates a comprehensive demo user with realistic financial data.
 * Simulates 12 months of banking history for a working professional.
 *
 * Run with: npm run seed
 */

const NESSIE_BASE_URL = 'http://api.nessieisreal.com'
const NESSIE_API_KEY = '4389318c54ddf318af62eda4ceed5f66'

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

// Comprehensive merchant list with realistic categories
const MERCHANTS = [
  // Groceries
  { name: 'Whole Foods Market', category: 'Groceries' },
  { name: 'Trader Joe\'s', category: 'Groceries' },
  { name: 'Stop & Shop', category: 'Groceries' },
  { name: 'Costco', category: 'Groceries' },

  // Dining & Food
  { name: 'Chipotle', category: 'Dining' },
  { name: 'Starbucks', category: 'Dining' },
  { name: 'Sweetgreen', category: 'Dining' },
  { name: 'Local Restaurant', category: 'Dining' },
  { name: 'DoorDash', category: 'Dining' },
  { name: 'Uber Eats', category: 'Dining' },

  // Transportation
  { name: 'Shell Gas Station', category: 'Gas' },
  { name: 'Exxon', category: 'Gas' },
  { name: 'Uber', category: 'Transport' },
  { name: 'Lyft', category: 'Transport' },
  { name: 'MBTA', category: 'Transport' },

  // Shopping
  { name: 'Amazon', category: 'Shopping' },
  { name: 'Target', category: 'Shopping' },
  { name: 'Walmart', category: 'Shopping' },
  { name: 'Best Buy', category: 'Shopping' },
  { name: 'Home Depot', category: 'Shopping' },
  { name: 'TJ Maxx', category: 'Shopping' },

  // Entertainment & Subscriptions
  { name: 'Netflix', category: 'Entertainment' },
  { name: 'Spotify', category: 'Entertainment' },
  { name: 'HBO Max', category: 'Entertainment' },
  { name: 'AMC Theatres', category: 'Entertainment' },
  { name: 'Ticketmaster', category: 'Entertainment' },

  // Health & Fitness
  { name: 'Planet Fitness', category: 'Health' },
  { name: 'CVS Pharmacy', category: 'Health' },
  { name: 'Walgreens', category: 'Health' },

  // Travel
  { name: 'Delta Airlines', category: 'Travel' },
  { name: 'Airbnb', category: 'Travel' },
  { name: 'Marriott Hotels', category: 'Travel' },

  // Personal Care
  { name: 'Supercuts', category: 'Personal' },
  { name: 'Dry Cleaner', category: 'Personal' },
]

// Realistic monthly spending patterns
const SPENDING_PATTERNS: Record<string, { mean: number; std: number; frequency: number }> = {
  Groceries: { mean: 500, std: 100, frequency: 8 },      // Weekly shopping
  Dining: { mean: 350, std: 120, frequency: 12 },        // Multiple times per week
  Gas: { mean: 180, std: 40, frequency: 4 },             // Weekly fill-up
  Transport: { mean: 100, std: 50, frequency: 6 },       // Occasional rideshare
  Shopping: { mean: 250, std: 200, frequency: 4 },       // Variable
  Entertainment: { mean: 80, std: 40, frequency: 3 },    // Subscriptions + outings
  Health: { mean: 120, std: 60, frequency: 2 },          // Gym + pharmacy
  Travel: { mean: 150, std: 300, frequency: 0.5 },       // Occasional trips
  Personal: { mean: 60, std: 30, frequency: 1 },         // Monthly
}

// Seasonal spending multipliers (index 0 = January)
const SEASONAL_MULTIPLIERS = [
  0.9,  // Jan - post-holiday recovery
  0.85, // Feb
  0.95, // Mar
  1.0,  // Apr
  1.0,  // May
  1.1,  // Jun - summer activities
  1.15, // Jul - vacation season
  1.1,  // Aug - back to school
  0.95, // Sep
  1.0,  // Oct
  1.2,  // Nov - Black Friday
  1.4,  // Dec - Holiday shopping
]

function randomNormal(mean: number, std: number): number {
  const u1 = Math.random()
  const u2 = Math.random()
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
  return Math.max(0, Math.round(z * std + mean))
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

function randomDay(month: Date, excludeWeekends = false): Date {
  let day: number
  let date: Date
  do {
    day = Math.floor(Math.random() * 28) + 1
    date = new Date(month.getFullYear(), month.getMonth(), day)
  } while (excludeWeekends && (date.getDay() === 0 || date.getDay() === 6))
  return date
}

async function seedData() {
  console.log('🚀 Starting comprehensive Nessie data seeding...\n')
  console.log('This will create a realistic 12-month financial history.\n')

  // 1. Create customer
  console.log('📋 Creating customer profile...')
  const customerResponse = await apiCall('POST', '/customers', {
    first_name: 'Alex',
    last_name: 'Morgan',
    address: {
      street_number: '245',
      street_name: 'Commonwealth Avenue',
      city: 'Boston',
      state: 'MA',
      zip: '02116',
    },
  })

  if (!customerResponse.objectCreated) {
    console.error('Failed to create customer:', customerResponse)
    return
  }

  const customerId = customerResponse.objectCreated._id
  console.log(`✅ Customer created: ${customerId}`)
  console.log('   Name: Alex Morgan')
  console.log('   Location: Boston, MA\n')

  // 2. Create accounts
  console.log('🏦 Creating bank accounts...')

  // Primary Checking
  const checkingResponse = await apiCall('POST', `/customers/${customerId}/accounts`, {
    type: 'Checking',
    nickname: 'Primary Checking',
    rewards: 0,
    balance: 4850,
  })
  const checkingId = checkingResponse.objectCreated._id
  console.log(`✅ Checking Account: $4,850`)

  // High-Yield Savings
  const savingsResponse = await apiCall('POST', `/customers/${customerId}/accounts`, {
    type: 'Savings',
    nickname: 'Emergency Fund',
    rewards: 0,
    balance: 12500,
  })
  const savingsId = savingsResponse.objectCreated._id
  console.log(`✅ Savings Account: $12,500`)

  // Vacation Fund
  const vacationResponse = await apiCall('POST', `/customers/${customerId}/accounts`, {
    type: 'Savings',
    nickname: 'Vacation Fund',
    rewards: 0,
    balance: 3200,
  })
  const vacationId = vacationResponse.objectCreated._id
  console.log(`✅ Vacation Fund: $3,200`)

  // Credit Card
  const creditResponse = await apiCall('POST', `/customers/${customerId}/accounts`, {
    type: 'Credit Card',
    nickname: 'Cash Back Rewards',
    rewards: 15000, // $150 in rewards points
    balance: 1850,
  })
  const creditId = creditResponse.objectCreated._id
  console.log(`✅ Credit Card: $1,850 balance (15,000 reward points)\n`)

  // 3. Create merchants
  console.log('🏪 Creating merchants...')
  const merchantIds: Record<string, string> = {}
  const merchantCategories: Record<string, string> = {}

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
      merchantCategories[merchant.name] = merchant.category
    }
  }
  console.log(`✅ Created ${Object.keys(merchantIds).length} merchants\n`)

  // 4. Create 12 months of transaction history
  console.log('💳 Creating 12 months of transactions...')

  const today = new Date()
  let totalTransactions = 0
  let totalDeposits = 0
  let totalPurchases = 0

  for (let monthOffset = 11; monthOffset >= 0; monthOffset--) {
    const monthStart = new Date(today.getFullYear(), today.getMonth() - monthOffset, 1)
    const monthIndex = monthStart.getMonth()
    const seasonalMultiplier = SEASONAL_MULTIPLIERS[monthIndex]

    // === INCOME ===

    // Primary salary (1st and 15th - bi-weekly)
    const baseSalary = 3200
    for (const payDay of [1, 15]) {
      await apiCall('POST', `/accounts/${checkingId}/deposits`, {
        medium: 'balance',
        transaction_date: formatDate(new Date(monthStart.getFullYear(), monthStart.getMonth(), payDay)),
        amount: baseSalary,
        description: 'Direct Deposit - Employer',
      })
      totalDeposits += baseSalary
      totalTransactions++
    }

    // Occasional side income (freelance - ~30% of months)
    if (Math.random() < 0.3) {
      const sideIncome = randomNormal(500, 200)
      await apiCall('POST', `/accounts/${checkingId}/deposits`, {
        medium: 'balance',
        transaction_date: formatDate(randomDay(monthStart)),
        amount: sideIncome,
        description: 'Freelance Payment - Consulting',
      })
      totalDeposits += sideIncome
      totalTransactions++
    }

    // Venmo/Zelle receipts (splitting bills with friends)
    if (Math.random() < 0.5) {
      const p2pAmount = randomNormal(75, 30)
      await apiCall('POST', `/accounts/${checkingId}/deposits`, {
        medium: 'balance',
        transaction_date: formatDate(randomDay(monthStart)),
        amount: p2pAmount,
        description: 'Venmo Transfer - Bill Split',
      })
      totalDeposits += p2pAmount
      totalTransactions++
    }

    // === SPENDING ===

    // Create purchases by merchant
    for (const [merchantName, merchantId] of Object.entries(merchantIds)) {
      const category = merchantCategories[merchantName]
      const pattern = SPENDING_PATTERNS[category]
      if (!pattern) continue

      // Determine number of transactions this month for this merchant
      const numTransactions = Math.round(
        (pattern.frequency / MERCHANTS.filter(m => m.category === category).length) *
        (0.5 + Math.random())
      )

      for (let i = 0; i < numTransactions; i++) {
        const baseAmount = randomNormal(pattern.mean / pattern.frequency, pattern.std / pattern.frequency)
        const amount = Math.round(baseAmount * seasonalMultiplier)

        if (amount < 3) continue

        const transactionDate = randomDay(monthStart)

        await apiCall('POST', `/accounts/${checkingId}/purchases`, {
          merchant_id: merchantId,
          medium: 'balance',
          purchase_date: formatDate(transactionDate),
          amount,
          description: `Purchase at ${merchantName}`,
        })
        totalPurchases += amount
        totalTransactions++
      }
    }

    // === TRANSFERS ===

    // Monthly savings transfer (around the 5th)
    const savingsTransfer = randomNormal(600, 100)
    await apiCall('POST', `/accounts/${checkingId}/transfers`, {
      medium: 'balance',
      payee_id: savingsId,
      amount: savingsTransfer,
      transaction_date: formatDate(new Date(monthStart.getFullYear(), monthStart.getMonth(), 5)),
      description: 'Monthly savings transfer',
    })
    totalTransactions++

    // Vacation fund (around the 20th)
    const vacationTransfer = randomNormal(150, 50)
    await apiCall('POST', `/accounts/${checkingId}/transfers`, {
      medium: 'balance',
      payee_id: vacationId,
      amount: vacationTransfer,
      transaction_date: formatDate(new Date(monthStart.getFullYear(), monthStart.getMonth(), 20)),
      description: 'Vacation fund transfer',
    })
    totalTransactions++

    // Credit card payment (around the 25th)
    const ccPayment = randomNormal(1200, 300)
    await apiCall('POST', `/accounts/${checkingId}/transfers`, {
      medium: 'balance',
      payee_id: creditId,
      amount: ccPayment,
      transaction_date: formatDate(new Date(monthStart.getFullYear(), monthStart.getMonth(), 25)),
      description: 'Credit card payment',
    })
    totalTransactions++

    console.log(`   Month ${12 - monthOffset}/12: ${monthStart.toLocaleString('default', { month: 'short', year: 'numeric' })}`)
  }

  console.log(`\n✅ Created ${totalTransactions} transactions`)
  console.log(`   Total deposits: $${totalDeposits.toLocaleString()}`)
  console.log(`   Total purchases: $${totalPurchases.toLocaleString()}\n`)

  // 5. Create recurring bills
  console.log('📄 Creating recurring bills...')

  const bills = [
    { payee: 'Landlord - Rent', amount: 2200, day: 1, nickname: 'Rent' },
    { payee: 'National Grid', amount: 95, day: 12, nickname: 'Electric' },
    { payee: 'Eversource Gas', amount: 65, day: 15, nickname: 'Gas/Heat' },
    { payee: 'Xfinity', amount: 89, day: 8, nickname: 'Internet' },
    { payee: 'Verizon Wireless', amount: 85, day: 18, nickname: 'Phone' },
    { payee: 'Geico', amount: 125, day: 1, nickname: 'Car Insurance' },
    { payee: 'Netflix', amount: 15, day: 10, nickname: 'Netflix' },
    { payee: 'Spotify', amount: 11, day: 14, nickname: 'Spotify' },
    { payee: 'iCloud Storage', amount: 3, day: 5, nickname: 'iCloud' },
    { payee: 'New York Times', amount: 17, day: 22, nickname: 'News Subscription' },
  ]

  for (const bill of bills) {
    await apiCall('POST', `/accounts/${checkingId}/bills`, {
      status: 'recurring',
      payee: bill.payee,
      nickname: bill.nickname,
      payment_date: formatDate(new Date(today.getFullYear(), today.getMonth(), bill.day)),
      recurring_date: bill.day,
      payment_amount: bill.amount,
    })
    console.log(`   ✅ ${bill.nickname}: $${bill.amount}/mo`)
  }

  const totalBills = bills.reduce((sum, b) => sum + b.amount, 0)
  console.log(`\n   Total monthly bills: $${totalBills.toLocaleString()}\n`)

  // 6. Create loans
  console.log('💰 Creating loans...')

  // Auto loan
  await apiCall('POST', `/accounts/${checkingId}/loans`, {
    type: 'auto',
    status: 'approved',
    credit_score: 745,
    monthly_payment: 385,
    amount: 18500,
    description: 'Auto Loan - 2023 Honda Accord',
  })
  console.log('   ✅ Auto Loan: $18,500 @ $385/mo')

  // Student loan
  await apiCall('POST', `/accounts/${checkingId}/loans`, {
    type: 'personal',
    status: 'approved',
    credit_score: 745,
    monthly_payment: 280,
    amount: 24000,
    description: 'Student Loan - Federal',
  })
  console.log('   ✅ Student Loan: $24,000 @ $280/mo\n')

  // Summary
  console.log('═'.repeat(55))
  console.log('🎉 SEEDING COMPLETE!')
  console.log('═'.repeat(55))
  console.log(`
📊 CUSTOMER PROFILE SUMMARY

Customer ID: ${customerId}
Name: Alex Morgan (Boston, MA)

💳 ACCOUNTS
├── Checking:     $4,850   (ID: ${checkingId})
├── Emergency:    $12,500  (ID: ${savingsId})
├── Vacation:     $3,200   (ID: ${vacationId})
└── Credit Card:  $1,850   (ID: ${creditId})

💵 MONTHLY INCOME
├── Salary:       $6,400 (bi-weekly deposits)
├── Freelance:    ~$150 (variable)
└── Total:        ~$6,550/mo

📤 MONTHLY EXPENSES
├── Bills:        $2,705 (rent, utilities, subscriptions)
├── Loans:        $665 (auto + student)
├── Spending:     ~$1,500 (groceries, dining, etc.)
└── Savings:      ~$750 (emergency + vacation)

📈 TRANSACTION HISTORY
├── Duration:     12 months
├── Transactions: ${totalTransactions}
├── Merchants:    ${Object.keys(merchantIds).length}
└── Categories:   ${Object.keys(SPENDING_PATTERNS).length}

⚠️  UPDATE YOUR CODE:
Add this customer ID to your .env or nessieService.ts:
DEFAULT_CUSTOMER_ID = '${customerId}'
`)
}

// Run seeder
seedData().catch(console.error)
