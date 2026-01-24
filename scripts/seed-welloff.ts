/**
 * Nessie API Data Seeder - Well-Off Professional Profile
 *
 * Creates a financially stable demo user representing an upper-middle class professional.
 * - Senior software engineer / manager level income
 * - Healthy savings and emergency fund
 * - Low debt, positive cash flow
 * - Consistent saver
 *
 * Run with: npx tsx scripts/seed-welloff.ts
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

// ============================================================
// CONFIGURATION - Well-Off Professional Profile
// ============================================================

// Income (after taxes) - $145K salary = ~$100K take-home = $8,333/month
const BIWEEKLY_SALARY = 4167 // $8,334/month take-home
const MONTHLY_INCOME = BIWEEKLY_SALARY * 2

// Account balances (well-off professional)
const CHECKING_BALANCE = 12500   // Comfortable buffer
const SAVINGS_BALANCE = 45000    // 6-month emergency fund
const INVESTMENT_BALANCE = 28000 // Additional savings/brokerage
const CREDIT_CARD_BALANCE = 850  // Pays off monthly, current cycle charges

// No car loan - drives paid-off vehicle or leases through work
const HAS_AUTO_LOAN = false

// Monthly bills breakdown (higher quality of life)
const MONTHLY_BILLS = {
  rent: 2400,           // Nice 1BR in good neighborhood
  carInsurance: 110,    // Good driver discount
  electric: 95,         // Efficient apartment
  gas: 45,              // Mild climate
  internet: 80,         // High-speed fiber
  phone: 65,            // Company partial reimbursement
  netflix: 23,          // Premium plan
  spotify: 11,
  gym: 85,              // Nice gym
  hbo: 16,
  nyt: 17,
}
const TOTAL_MONTHLY_BILLS = Object.values(MONTHLY_BILLS).reduce((a, b) => a + b, 0)

// Merchants (higher-end mix)
const MERCHANTS = [
  // Groceries
  { name: 'Whole Foods', category: 'Groceries' },
  { name: 'Trader Joe\'s', category: 'Groceries' },
  { name: 'Costco', category: 'Groceries' },
  { name: 'Local Farmers Market', category: 'Groceries' },

  // Dining (nicer restaurants)
  { name: 'Sweetgreen', category: 'Dining' },
  { name: 'Chipotle', category: 'Dining' },
  { name: 'Local Bistro', category: 'Dining' },
  { name: 'Sushi Restaurant', category: 'Dining' },
  { name: 'Starbucks', category: 'Dining' },
  { name: 'Wine Bar', category: 'Dining' },

  // Gas
  { name: 'Shell', category: 'Gas' },
  { name: 'Chevron', category: 'Gas' },

  // Transportation
  { name: 'Uber', category: 'Transport' },
  { name: 'Lyft', category: 'Transport' },

  // Shopping (quality over quantity)
  { name: 'Amazon', category: 'Shopping' },
  { name: 'REI', category: 'Shopping' },
  { name: 'Apple Store', category: 'Shopping' },
  { name: 'Nordstrom', category: 'Shopping' },

  // Entertainment
  { name: 'AMC Theatres', category: 'Entertainment' },
  { name: 'Concert Venue', category: 'Entertainment' },
  { name: 'Golf Course', category: 'Entertainment' },

  // Health & Wellness
  { name: 'Equinox', category: 'Health' },
  { name: 'CVS Pharmacy', category: 'Health' },
  { name: 'Massage Envy', category: 'Health' },

  // Travel (more frequent)
  { name: 'Delta Airlines', category: 'Travel' },
  { name: 'Airbnb', category: 'Travel' },
  { name: 'Marriott', category: 'Travel' },

  // Personal
  { name: 'Barber Shop', category: 'Personal' },
  { name: 'Dry Cleaner', category: 'Personal' },
]

// Spending patterns (comfortable but not extravagant)
const SPENDING_PATTERNS: Record<string, { mean: number; std: number; frequency: number }> = {
  Groceries: { mean: 600, std: 100, frequency: 6 },       // Quality groceries
  Dining: { mean: 450, std: 150, frequency: 8 },          // Eats out regularly
  Gas: { mean: 120, std: 30, frequency: 3 },              // Fuel-efficient car
  Transport: { mean: 80, std: 50, frequency: 2 },         // Occasional rideshare
  Shopping: { mean: 300, std: 200, frequency: 3 },        // Quality items
  Entertainment: { mean: 150, std: 80, frequency: 3 },    // Active social life
  Health: { mean: 180, std: 60, frequency: 3 },           // Wellness focused
  Travel: { mean: 400, std: 300, frequency: 1 },          // Monthly trips
  Personal: { mean: 100, std: 40, frequency: 2 },         // Grooming, dry cleaning
}

// Seasonal spending multipliers
const SEASONAL_MULTIPLIERS = [
  0.90,  // Jan
  0.85,  // Feb
  0.95,  // Mar
  1.0,   // Apr
  1.0,   // May
  1.1,   // Jun - summer travel
  1.15,  // Jul - vacation
  1.0,   // Aug
  0.95,  // Sep
  1.0,   // Oct
  1.1,   // Nov
  1.25,  // Dec - holidays & gifts
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

function randomDay(month: Date): Date {
  const day = Math.floor(Math.random() * 28) + 1
  return new Date(month.getFullYear(), month.getMonth(), day)
}

async function seedData() {
  console.log('═'.repeat(60))
  console.log('🚀 NESSIE DATA SEEDER - Well-Off Professional Profile')
  console.log('═'.repeat(60))
  console.log('\nCreating realistic 12-month financial history...\n')

  // 1. Create customer
  console.log('📋 CREATING CUSTOMER')
  console.log('─'.repeat(40))
  const customerResponse = await apiCall('POST', '/customers', {
    first_name: 'Taylor',
    last_name: 'Chen',
    address: {
      street_number: '1250',
      street_name: 'Marina Boulevard',
      city: 'San Francisco',
      state: 'CA',
      zip: '94123',
    },
  })

  if (!customerResponse.objectCreated) {
    console.error('Failed to create customer:', customerResponse)
    return
  }

  const customerId = customerResponse.objectCreated._id
  console.log(`   Customer ID: ${customerId}`)
  console.log('   Name: Taylor Chen')
  console.log('   Location: San Francisco, CA (tech hub)\n')

  // 2. Create accounts
  console.log('🏦 CREATING ACCOUNTS')
  console.log('─'.repeat(40))

  // Primary Checking
  const checkingResponse = await apiCall('POST', `/customers/${customerId}/accounts`, {
    type: 'Checking',
    nickname: 'Primary Checking',
    rewards: 0,
    balance: CHECKING_BALANCE,
  })
  const checkingId = checkingResponse.objectCreated._id
  console.log(`   ✓ Checking: $${CHECKING_BALANCE.toLocaleString()}`)

  // High-Yield Savings
  const savingsResponse = await apiCall('POST', `/customers/${customerId}/accounts`, {
    type: 'Savings',
    nickname: 'Emergency Fund',
    rewards: 0,
    balance: SAVINGS_BALANCE,
  })
  console.log(`   ✓ Emergency Fund: $${SAVINGS_BALANCE.toLocaleString()}`)

  // Investment/Brokerage (as Savings)
  const investmentResponse = await apiCall('POST', `/customers/${customerId}/accounts`, {
    type: 'Savings',
    nickname: 'Investment Account',
    rewards: 0,
    balance: INVESTMENT_BALANCE,
  })
  console.log(`   ✓ Investment Account: $${INVESTMENT_BALANCE.toLocaleString()}`)

  // Credit Card (low balance)
  const creditResponse = await apiCall('POST', `/customers/${customerId}/accounts`, {
    type: 'Credit Card',
    nickname: 'Travel Rewards Card',
    rewards: 125000, // Lots of travel points
    balance: CREDIT_CARD_BALANCE,
  })
  console.log(`   ✓ Credit Card: $${CREDIT_CARD_BALANCE.toLocaleString()} balance (125K points)`)
  console.log('')

  // 3. Create merchants
  console.log('🏪 CREATING MERCHANTS')
  console.log('─'.repeat(40))
  const merchantIds: Record<string, string> = {}
  const merchantCategories: Record<string, string> = {}

  for (const merchant of MERCHANTS) {
    const response = await apiCall('POST', '/merchants', {
      name: merchant.name,
      category: merchant.category,
      address: {
        street_number: String(Math.floor(Math.random() * 999) + 1),
        street_name: 'Market Street',
        city: 'San Francisco',
        state: 'CA',
        zip: '94103',
      },
    })

    if (response.objectCreated) {
      merchantIds[merchant.name] = response.objectCreated._id
      merchantCategories[merchant.name] = merchant.category
    }
  }
  console.log(`   ✓ Created ${Object.keys(merchantIds).length} merchants\n`)

  // 4. Create recurring bills
  console.log('📄 CREATING RECURRING BILLS')
  console.log('─'.repeat(40))

  const billsData = [
    { payee: 'Bay Property Management', amount: MONTHLY_BILLS.rent, day: 1, name: 'Rent' },
    { payee: 'GEICO', amount: MONTHLY_BILLS.carInsurance, day: 15, name: 'Car Insurance' },
    { payee: 'PG&E', amount: MONTHLY_BILLS.electric, day: 10, name: 'Electric' },
    { payee: 'PG&E Gas', amount: MONTHLY_BILLS.gas, day: 10, name: 'Gas' },
    { payee: 'Sonic Fiber', amount: MONTHLY_BILLS.internet, day: 5, name: 'Internet' },
    { payee: 'AT&T', amount: MONTHLY_BILLS.phone, day: 18, name: 'Phone' },
    { payee: 'Netflix', amount: MONTHLY_BILLS.netflix, day: 8, name: 'Netflix' },
    { payee: 'Spotify', amount: MONTHLY_BILLS.spotify, day: 8, name: 'Spotify' },
    { payee: 'Equinox', amount: MONTHLY_BILLS.gym, day: 1, name: 'Gym' },
    { payee: 'HBO Max', amount: MONTHLY_BILLS.hbo, day: 12, name: 'HBO' },
    { payee: 'NY Times', amount: MONTHLY_BILLS.nyt, day: 15, name: 'NYT' },
  ]

  for (const bill of billsData) {
    await apiCall('POST', `/accounts/${checkingId}/bills`, {
      status: 'recurring',
      payee: bill.payee,
      nickname: bill.name,
      payment_date: formatDate(new Date(2025, 0, bill.day)),
      recurring_date: bill.day,
      payment_amount: bill.amount,
    })
    console.log(`   ✓ ${bill.name}: $${bill.amount}/mo`)
  }
  console.log(`   ─────────────────────`)
  console.log(`   Total Bills: $${TOTAL_MONTHLY_BILLS}/mo\n`)

  // 5. Create 12 months of transaction history
  console.log('💳 CREATING 12 MONTHS OF TRANSACTIONS')
  console.log('─'.repeat(40))

  const today = new Date()
  let totalTransactions = 0
  let totalDeposits = 0
  let totalPurchases = 0

  for (let monthOffset = 11; monthOffset >= 0; monthOffset--) {
    const monthStart = new Date(today.getFullYear(), today.getMonth() - monthOffset, 1)
    const monthIndex = monthStart.getMonth()
    const seasonalMultiplier = SEASONAL_MULTIPLIERS[monthIndex]
    const monthName = monthStart.toLocaleString('default', { month: 'short' })

    let monthDeposits = 0
    let monthPurchases = 0

    // === INCOME ===

    // Bi-weekly salary (1st and 15th)
    for (const payDay of [1, 15]) {
      await apiCall('POST', `/accounts/${checkingId}/deposits`, {
        medium: 'balance',
        transaction_date: formatDate(new Date(monthStart.getFullYear(), monthStart.getMonth(), payDay)),
        amount: BIWEEKLY_SALARY,
        description: 'Direct Deposit - Employer',
        status: 'completed',
      })
      monthDeposits += BIWEEKLY_SALARY
      totalTransactions++
    }

    // Quarterly bonus (~10% of salary, so ~$3,600 quarterly)
    if (monthIndex % 3 === 2) { // March, June, Sept, Dec
      const bonus = randomNormal(3600, 500)
      await apiCall('POST', `/accounts/${checkingId}/deposits`, {
        medium: 'balance',
        transaction_date: formatDate(new Date(monthStart.getFullYear(), monthStart.getMonth(), 28)),
        amount: bonus,
        description: 'Quarterly Bonus',
        status: 'completed',
      })
      monthDeposits += bonus
      totalTransactions++
    }

    // Occasional investment dividends (~15% of months)
    if (Math.random() < 0.15) {
      const dividend = randomNormal(250, 100)
      await apiCall('POST', `/accounts/${checkingId}/deposits`, {
        medium: 'balance',
        transaction_date: formatDate(randomDay(monthStart)),
        amount: dividend,
        description: 'Investment Dividend',
        status: 'completed',
      })
      monthDeposits += dividend
      totalTransactions++
    }

    // === PURCHASES ===
    const merchantNames = Object.keys(merchantIds)

    for (const [category, pattern] of Object.entries(SPENDING_PATTERNS)) {
      const categoryMerchants = merchantNames.filter(m => merchantCategories[m] === category)
      if (categoryMerchants.length === 0) continue

      const adjustedFrequency = Math.round(pattern.frequency * seasonalMultiplier)
      const adjustedMean = pattern.mean * seasonalMultiplier

      for (let i = 0; i < adjustedFrequency; i++) {
        const merchant = categoryMerchants[Math.floor(Math.random() * categoryMerchants.length)]
        const perTransactionAmount = adjustedMean / pattern.frequency
        const amount = randomNormal(perTransactionAmount, pattern.std / Math.sqrt(pattern.frequency))

        if (amount > 0) {
          await apiCall('POST', `/accounts/${checkingId}/purchases`, {
            merchant_id: merchantIds[merchant],
            medium: 'balance',
            purchase_date: formatDate(randomDay(monthStart)),
            amount: amount,
            description: merchant,
            status: 'completed',
          })
          monthPurchases += amount
          totalTransactions++
        }
      }
    }

    // Monthly investment contribution (auto-transfer to savings)
    const investmentContribution = 1500
    await apiCall('POST', `/accounts/${checkingId}/purchases`, {
      merchant_id: Object.values(merchantIds)[0], // Placeholder
      medium: 'balance',
      purchase_date: formatDate(new Date(monthStart.getFullYear(), monthStart.getMonth(), 5)),
      amount: investmentContribution,
      description: 'Investment Contribution',
      status: 'completed',
    })
    monthPurchases += investmentContribution
    totalTransactions++

    totalDeposits += monthDeposits
    totalPurchases += monthPurchases

    const monthNet = monthDeposits - monthPurchases - TOTAL_MONTHLY_BILLS
    console.log(`   ${monthName} ${monthStart.getFullYear()}: +$${monthDeposits.toLocaleString()} / -$${(monthPurchases + TOTAL_MONTHLY_BILLS).toLocaleString()} (net: ${monthNet >= 0 ? '+' : ''}$${monthNet.toLocaleString()})`)
  }

  console.log('')

  // Summary
  console.log('═'.repeat(60))
  console.log('🎉 SEEDING COMPLETE!')
  console.log('═'.repeat(60))

  const totalAssets = CHECKING_BALANCE + SAVINGS_BALANCE + INVESTMENT_BALANCE
  const totalDebt = CREDIT_CARD_BALANCE
  const netWorth = totalAssets - totalDebt

  const monthlyVariableSpending = Math.round(totalPurchases / 12)
  const monthlyTotalExpenses = monthlyVariableSpending + TOTAL_MONTHLY_BILLS
  const monthlyCashFlow = MONTHLY_INCOME - monthlyTotalExpenses

  console.log(`
📊 CUSTOMER PROFILE SUMMARY

Customer ID: ${customerId}
Name: Taylor Chen (San Francisco, CA)

💰 ACCOUNTS
├── Checking:         $${CHECKING_BALANCE.toLocaleString()}
├── Emergency Fund:   $${SAVINGS_BALANCE.toLocaleString()}
├── Investments:      $${INVESTMENT_BALANCE.toLocaleString()}
└── Credit Card:      -$${CREDIT_CARD_BALANCE.toLocaleString()} (current cycle)

Total Assets:         $${totalAssets.toLocaleString()}
Total Debt:           $${totalDebt.toLocaleString()}
Net Worth:            $${netWorth.toLocaleString()}

📅 MONTHLY CASH FLOW
├── Income:           $${MONTHLY_INCOME.toLocaleString()}
├── Fixed Bills:      -$${TOTAL_MONTHLY_BILLS.toLocaleString()}
├── Variable Spend:   -$${monthlyVariableSpending.toLocaleString()}
├── ─────────────────
└── Net Cash Flow:    +$${monthlyCashFlow.toLocaleString()}

📈 12-MONTH TOTALS
├── Transactions: ${totalTransactions}
├── Deposits:     $${totalDeposits.toLocaleString()}
└── Purchases:    $${totalPurchases.toLocaleString()}

═══════════════════════════════════════════════════════════

To use this customer, copy this ID:
${customerId}
`)
}

seedData().catch(console.error)
