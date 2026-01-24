/**
 * Nessie API Data Seeder - Average American Profile
 *
 * Creates a realistic demo user representing the median American worker.
 * Based on 2024 data:
 * - Median individual income: ~$56,000/year
 * - Average savings: ~$5,000
 * - Average credit card debt: ~$6,000
 * - Average auto loan: ~$23,000
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

// ============================================================
// CONFIGURATION - Based on Average American Financial Data
// ============================================================

// Income (after taxes) - $56K salary = ~$44K take-home = $3,667/month
const BIWEEKLY_SALARY = 1834 // $3,668/month take-home
const MONTHLY_INCOME = BIWEEKLY_SALARY * 2

// Account balances (median American)
const CHECKING_BALANCE = 2400    // Median American has ~$2,500
const SAVINGS_BALANCE = 4800     // Average savings ~$5,000
const CREDIT_CARD_BALANCE = 5700 // Average CC debt ~$6,000

// Auto loan (average American)
const AUTO_LOAN_BALANCE = 22500  // Average auto loan ~$23,000
const AUTO_LOAN_PAYMENT = 485    // ~5% APR, 60 months

// Monthly bills breakdown (national averages)
const MONTHLY_BILLS = {
  rent: 1450,           // National average for 1BR apartment
  carInsurance: 145,    // Average auto insurance
  electric: 115,        // Average electric bill
  gas: 70,              // Average gas/heat
  internet: 65,         // Average broadband
  phone: 85,            // Average cell phone
  netflix: 15,
  spotify: 11,
  gym: 35,
}
const TOTAL_MONTHLY_BILLS = Object.values(MONTHLY_BILLS).reduce((a, b) => a + b, 0)

// Merchants
const MERCHANTS = [
  // Groceries - where average Americans actually shop
  { name: 'Walmart Grocery', category: 'Groceries' },
  { name: 'Kroger', category: 'Groceries' },
  { name: 'Aldi', category: 'Groceries' },
  { name: 'Costco', category: 'Groceries' },

  // Fast food & dining (average American eats out 4-5x/week)
  { name: 'McDonald\'s', category: 'Dining' },
  { name: 'Chick-fil-A', category: 'Dining' },
  { name: 'Taco Bell', category: 'Dining' },
  { name: 'Applebee\'s', category: 'Dining' },
  { name: 'Local Pizza', category: 'Dining' },
  { name: 'DoorDash', category: 'Dining' },
  { name: 'Starbucks', category: 'Dining' },

  // Gas stations
  { name: 'Shell', category: 'Gas' },
  { name: 'Exxon', category: 'Gas' },
  { name: 'BP', category: 'Gas' },

  // Transportation
  { name: 'Uber', category: 'Transport' },

  // Shopping
  { name: 'Amazon', category: 'Shopping' },
  { name: 'Walmart', category: 'Shopping' },
  { name: 'Target', category: 'Shopping' },
  { name: 'Dollar General', category: 'Shopping' },
  { name: 'T.J. Maxx', category: 'Shopping' },

  // Entertainment
  { name: 'Netflix', category: 'Entertainment' },
  { name: 'AMC Theatres', category: 'Entertainment' },
  { name: 'Spotify', category: 'Entertainment' },

  // Health
  { name: 'CVS Pharmacy', category: 'Health' },
  { name: 'Walgreens', category: 'Health' },
  { name: 'Planet Fitness', category: 'Health' },

  // Personal
  { name: 'Great Clips', category: 'Personal' },
]

// Spending patterns (monthly totals, more conservative)
const SPENDING_PATTERNS: Record<string, { mean: number; std: number; frequency: number }> = {
  Groceries: { mean: 380, std: 80, frequency: 6 },       // $380/mo average
  Dining: { mean: 280, std: 100, frequency: 10 },        // Americans spend ~$250-300/mo eating out
  Gas: { mean: 160, std: 35, frequency: 4 },             // ~$160/mo on gas
  Transport: { mean: 40, std: 30, frequency: 1 },        // Occasional rideshare
  Shopping: { mean: 180, std: 120, frequency: 3 },       // $180/mo discretionary
  Entertainment: { mean: 60, std: 30, frequency: 2 },    // Movies, events
  Health: { mean: 90, std: 50, frequency: 2 },           // Pharmacy, gym
  Personal: { mean: 40, std: 20, frequency: 1 },         // Haircuts, etc
}

// Seasonal spending multipliers (index 0 = January)
const SEASONAL_MULTIPLIERS = [
  0.85,  // Jan - recovering from holidays
  0.80,  // Feb - lowest spending month
  0.90,  // Mar
  0.95,  // Apr - tax refund spending
  1.0,   // May
  1.05,  // Jun - summer starts
  1.10,  // Jul - vacation season
  1.05,  // Aug - back to school
  0.95,  // Sep
  1.0,   // Oct
  1.15,  // Nov - Black Friday
  1.30,  // Dec - Holiday shopping
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
  console.log('═'.repeat(60))
  console.log('🚀 NESSIE DATA SEEDER - Average American Profile')
  console.log('═'.repeat(60))
  console.log('\nCreating realistic 12-month financial history...\n')

  // 1. Create customer
  console.log('📋 CREATING CUSTOMER')
  console.log('─'.repeat(40))
  const customerResponse = await apiCall('POST', '/customers', {
    first_name: 'Jordan',
    last_name: 'Smith',
    address: {
      street_number: '847',
      street_name: 'Oak Street',
      city: 'Columbus',
      state: 'OH',
      zip: '43215',
    },
  })

  if (!customerResponse.objectCreated) {
    console.error('Failed to create customer:', customerResponse)
    return
  }

  const customerId = customerResponse.objectCreated._id
  console.log(`   Customer ID: ${customerId}`)
  console.log('   Name: Jordan Smith')
  console.log('   Location: Columbus, OH (median cost of living)\n')

  // 2. Create accounts
  console.log('🏦 CREATING ACCOUNTS')
  console.log('─'.repeat(40))

  // Primary Checking
  const checkingResponse = await apiCall('POST', `/customers/${customerId}/accounts`, {
    type: 'Checking',
    nickname: 'Everyday Checking',
    rewards: 0,
    balance: CHECKING_BALANCE,
  })
  const checkingId = checkingResponse.objectCreated._id
  console.log(`   ✓ Checking: $${CHECKING_BALANCE.toLocaleString()}`)

  // Savings
  const savingsResponse = await apiCall('POST', `/customers/${customerId}/accounts`, {
    type: 'Savings',
    nickname: 'Savings Account',
    rewards: 0,
    balance: SAVINGS_BALANCE,
  })
  console.log(`   ✓ Savings: $${SAVINGS_BALANCE.toLocaleString()}`)

  // Credit Card
  const creditResponse = await apiCall('POST', `/customers/${customerId}/accounts`, {
    type: 'Credit Card',
    nickname: 'Rewards Card',
    rewards: 8500,
    balance: CREDIT_CARD_BALANCE,
  })
  console.log(`   ✓ Credit Card: $${CREDIT_CARD_BALANCE.toLocaleString()} balance`)
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
        street_name: 'Main Street',
        city: 'Columbus',
        state: 'OH',
        zip: '43215',
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
    { payee: 'Property Management LLC', amount: MONTHLY_BILLS.rent, day: 1, name: 'Rent' },
    { payee: 'State Farm Insurance', amount: MONTHLY_BILLS.carInsurance, day: 15, name: 'Car Insurance' },
    { payee: 'Electric Company', amount: MONTHLY_BILLS.electric, day: 10, name: 'Electric' },
    { payee: 'Gas Utility', amount: MONTHLY_BILLS.gas, day: 12, name: 'Gas/Heat' },
    { payee: 'Spectrum', amount: MONTHLY_BILLS.internet, day: 8, name: 'Internet' },
    { payee: 'Verizon Wireless', amount: MONTHLY_BILLS.phone, day: 18, name: 'Phone' },
    { payee: 'Netflix', amount: MONTHLY_BILLS.netflix, day: 5, name: 'Netflix' },
    { payee: 'Spotify', amount: MONTHLY_BILLS.spotify, day: 7, name: 'Spotify' },
    { payee: 'Planet Fitness', amount: MONTHLY_BILLS.gym, day: 1, name: 'Gym' },
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

  // 5. Create auto loan
  console.log('🚗 CREATING AUTO LOAN')
  console.log('─'.repeat(40))
  await apiCall('POST', `/accounts/${checkingId}/loans`, {
    type: 'auto',
    status: 'approved',
    credit_score: 680, // Average American credit score
    monthly_payment: AUTO_LOAN_PAYMENT,
    amount: AUTO_LOAN_BALANCE,
    description: 'Auto Loan - 2021 Toyota Camry',
  })
  console.log(`   ✓ Auto Loan: $${AUTO_LOAN_BALANCE.toLocaleString()}`)
  console.log(`   ✓ Monthly Payment: $${AUTO_LOAN_PAYMENT}\n`)

  // 6. Create 12 months of transaction history
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

    // Occasional side income (~20% of months - gig work, selling stuff)
    if (Math.random() < 0.2) {
      const sideIncome = randomNormal(200, 100)
      await apiCall('POST', `/accounts/${checkingId}/deposits`, {
        medium: 'balance',
        transaction_date: formatDate(randomDay(monthStart)),
        amount: sideIncome,
        description: 'Venmo Transfer',
        status: 'completed',
      })
      monthDeposits += sideIncome
      totalTransactions++
    }

    // === PURCHASES ===
    const merchantNames = Object.keys(merchantIds)

    for (const [category, pattern] of Object.entries(SPENDING_PATTERNS)) {
      const categoryMerchants = merchantNames.filter(m => merchantCategories[m] === category)
      if (categoryMerchants.length === 0) continue

      // Adjust frequency by season
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

    totalDeposits += monthDeposits
    totalPurchases += monthPurchases

    const monthNet = monthDeposits - monthPurchases - TOTAL_MONTHLY_BILLS - AUTO_LOAN_PAYMENT
    console.log(`   ${monthName} ${monthStart.getFullYear()}: +$${monthDeposits.toLocaleString()} / -$${(monthPurchases + TOTAL_MONTHLY_BILLS + AUTO_LOAN_PAYMENT).toLocaleString()} (net: ${monthNet >= 0 ? '+' : ''}$${monthNet.toLocaleString()})`)
  }

  console.log('')

  // Summary
  console.log('═'.repeat(60))
  console.log('🎉 SEEDING COMPLETE!')
  console.log('═'.repeat(60))

  const monthlyVariableSpending = Math.round(totalPurchases / 12)
  const monthlyTotalExpenses = monthlyVariableSpending + TOTAL_MONTHLY_BILLS + AUTO_LOAN_PAYMENT
  const monthlyCashFlow = MONTHLY_INCOME - monthlyTotalExpenses

  console.log(`
📊 CUSTOMER PROFILE SUMMARY

Customer ID: ${customerId}
Name: Jordan Smith (Columbus, OH)

💰 ACCOUNTS
├── Checking:     $${CHECKING_BALANCE.toLocaleString()}
├── Savings:      $${SAVINGS_BALANCE.toLocaleString()}
└── Credit Card:  -$${CREDIT_CARD_BALANCE.toLocaleString()} (balance owed)

Total Assets:     $${(CHECKING_BALANCE + SAVINGS_BALANCE).toLocaleString()}
Total Debt:       $${(CREDIT_CARD_BALANCE + AUTO_LOAN_BALANCE).toLocaleString()}
Net Worth:        $${(CHECKING_BALANCE + SAVINGS_BALANCE - CREDIT_CARD_BALANCE - AUTO_LOAN_BALANCE).toLocaleString()}

📅 MONTHLY CASH FLOW
├── Income:           $${MONTHLY_INCOME.toLocaleString()}
├── Fixed Bills:      -$${TOTAL_MONTHLY_BILLS.toLocaleString()}
├── Loan Payment:     -$${AUTO_LOAN_PAYMENT}
├── Variable Spend:   -$${monthlyVariableSpending.toLocaleString()}
├── ─────────────────
└── Net Cash Flow:    ${monthlyCashFlow >= 0 ? '+' : ''}$${monthlyCashFlow.toLocaleString()}

📈 12-MONTH TOTALS
├── Transactions: ${totalTransactions}
├── Deposits:     $${totalDeposits.toLocaleString()}
└── Purchases:    $${totalPurchases.toLocaleString()}

═══════════════════════════════════════════════════════════

To use this customer, copy this ID:
${customerId}

Or update DEFAULT_CUSTOMER_ID in:
apps/api/src/services/nessieService.ts
`)
}

seedData().catch(console.error)
