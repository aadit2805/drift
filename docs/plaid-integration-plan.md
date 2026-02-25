# Plaid Integration Plan

Replace Nessie (Capital One sandbox) with Plaid for production-ready bank connectivity. Dynamically adjust simulation parameters based on real account data.

---

## Overview

### Current State
- Nessie API provides fake bank data
- Simple financial profile: `liquidAssets`, `creditDebt`, `monthlySpending`
- Static simulation parameters (same for everyone)
- Basic frontend display

### Target State
- Plaid Link for real bank connections
- Full account type support (checking, savings, credit, loans, investments)
- Dynamic simulation parameters derived from actual financial data
- Account-aware frontend with type-specific UI

---

## Backend

### New Files

```
apps/api/src/
├── services/
│   ├── plaidService.ts      # Plaid API client
│   └── accountMappers.ts    # Transform Plaid → internal types
├── routes/
│   └── plaid.ts             # Plaid API endpoints
└── types/
    └── plaid.ts             # Plaid-specific types
```

### Plaid Service

```typescript
// apps/api/src/services/plaidService.ts

import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid'

const client = new PlaidApi(new Configuration({
  basePath: PlaidEnvironments[process.env.PLAID_ENV || 'sandbox'],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
      'PLAID-SECRET': process.env.PLAID_SECRET,
    },
  },
}))

export async function createLinkToken(userId: string) {
  const response = await client.linkTokenCreate({
    user: { client_user_id: userId },
    client_name: 'Drift',
    products: ['transactions', 'liabilities', 'investments'],
    country_codes: ['US'],
    language: 'en',
  })
  return response.data.link_token
}

export async function exchangePublicToken(publicToken: string) {
  const response = await client.itemPublicTokenExchange({ public_token: publicToken })
  return response.data.access_token
}

export async function getAccounts(accessToken: string) {
  const response = await client.accountsGet({ access_token: accessToken })
  return response.data.accounts
}

export async function getTransactions(accessToken: string, startDate: string, endDate: string) {
  const response = await client.transactionsGet({
    access_token: accessToken,
    start_date: startDate,
    end_date: endDate,
  })
  return response.data.transactions
}

export async function getLiabilities(accessToken: string) {
  const response = await client.liabilitiesGet({ access_token: accessToken })
  return response.data.liabilities
}

export async function getInvestments(accessToken: string) {
  const response = await client.investmentsHoldingsGet({ access_token: accessToken })
  return response.data
}
```

### API Routes

```typescript
// apps/api/src/routes/plaid.ts

router.post('/create-link-token', async (req, res) => {
  const { userId } = req.body
  const linkToken = await createLinkToken(userId)
  res.json({ linkToken })
})

router.post('/exchange-token', async (req, res) => {
  const { publicToken } = req.body
  const accessToken = await exchangePublicToken(publicToken)
  // Store accessToken securely (encrypted in DB)
  res.json({ success: true })
})

router.get('/accounts', async (req, res) => {
  const accessToken = getStoredAccessToken(req.userId)
  const accounts = await getAccounts(accessToken)
  const balances = await getBalances(accessToken)
  const liabilities = await getLiabilities(accessToken)
  const investments = await getInvestments(accessToken)

  const mapped = mapAllAccounts({ accounts, balances, liabilities, investments })
  res.json(mapped)
})

router.get('/financial-profile', async (req, res) => {
  // Aggregate all account data into EnhancedFinancialProfile
  const profile = await buildFinancialProfile(req.userId)
  res.json(profile)
})
```

### Account Mappers

```typescript
// apps/api/src/services/accountMappers.ts

export function mapDepositoryAccount(account, balances) {
  return {
    id: account.account_id,
    type: 'depository',
    subtype: account.subtype, // 'checking' | 'savings'
    name: account.name,
    balance: balances.current,
    available: balances.available,
  }
}

export function mapCreditAccount(account, liabilities) {
  const credit = liabilities.credit?.find(c => c.account_id === account.account_id)
  return {
    id: account.account_id,
    type: 'credit',
    name: account.name,
    balance: account.balances.current,
    limit: credit?.credit_limit || 0,
    utilization: account.balances.current / (credit?.credit_limit || 1),
    apr: credit?.aprs?.[0]?.apr_percentage || 0,
    minimumPayment: credit?.minimum_payment_amount || 0,
    lastPaymentAmount: credit?.last_payment_amount,
    lastPaymentDate: credit?.last_payment_date,
  }
}

export function mapLoanAccount(account, liabilities) {
  const loan = liabilities.student?.find(l => l.account_id === account.account_id)
    || liabilities.mortgage?.find(l => l.account_id === account.account_id)

  return {
    id: account.account_id,
    type: account.subtype === 'mortgage' ? 'mortgage' : 'loan',
    subtype: account.subtype, // 'student', 'auto', 'mortgage', 'personal'
    name: account.name,
    balance: account.balances.current,
    originalAmount: loan?.origination_principal_amount,
    interestRate: loan?.interest_rate_percentage,
    monthlyPayment: loan?.minimum_payment_amount,
    originationDate: loan?.origination_date,
    expectedPayoffDate: loan?.expected_payoff_date,
  }
}

export function mapInvestmentAccount(account, holdings, securities) {
  const accountHoldings = holdings.filter(h => h.account_id === account.account_id)

  const allocation = calculateAllocation(accountHoldings, securities)

  return {
    id: account.account_id,
    type: 'investment',
    subtype: account.subtype, // '401k', 'ira', 'brokerage'
    name: account.name,
    balance: account.balances.current,
    holdings: accountHoldings.map(h => ({
      symbol: securities.find(s => s.security_id === h.security_id)?.ticker_symbol,
      name: securities.find(s => s.security_id === h.security_id)?.name,
      quantity: h.quantity,
      value: h.institution_value,
      type: securities.find(s => s.security_id === h.security_id)?.type,
    })),
    allocation,
  }
}

function calculateAllocation(holdings, securities) {
  const total = holdings.reduce((sum, h) => sum + h.institution_value, 0)
  const byType = { stocks: 0, bonds: 0, cash: 0, other: 0 }

  for (const holding of holdings) {
    const security = securities.find(s => s.security_id === holding.security_id)
    const type = security?.type || 'other'
    const bucket = type === 'equity' ? 'stocks'
      : type === 'fixed income' ? 'bonds'
      : type === 'cash' ? 'cash'
      : 'other'
    byType[bucket] += holding.institution_value
  }

  return {
    stocks: byType.stocks / total,
    bonds: byType.bonds / total,
    cash: byType.cash / total,
    other: byType.other / total,
  }
}
```

---

## Simulation

### Enhanced Models

```python
# simulation/models.py - additions

class DepositoryAccount(BaseModel):
    id: str
    type: Literal["depository"]
    subtype: str  # checking, savings
    name: str
    balance: float
    available: float

class CreditAccount(BaseModel):
    id: str
    type: Literal["credit"]
    name: str
    balance: float
    limit: float
    utilization: float
    apr: float
    minimum_payment: float

class LoanAccount(BaseModel):
    id: str
    type: Literal["loan", "mortgage"]
    subtype: str  # student, auto, mortgage, personal
    name: str
    balance: float
    original_amount: Optional[float]
    interest_rate: float
    monthly_payment: float

class InvestmentAccount(BaseModel):
    id: str
    type: Literal["investment"]
    subtype: str  # 401k, ira, brokerage
    name: str
    balance: float
    allocation: Dict[str, float]  # stocks, bonds, cash, other

class IncomeProfile(BaseModel):
    monthly_amount: float
    frequency: str  # weekly, biweekly, monthly
    stability_score: float  # 0-1, based on variance
    employer_detected: Optional[str]

class SpendingProfile(BaseModel):
    monthly_amount: float
    by_category: Dict[str, float]
    volatility: float
    fixed_expenses: float  # rent, subscriptions, etc.
    variable_expenses: float

class EnhancedFinancialProfile(BaseModel):
    # Accounts by type
    depository: List[DepositoryAccount] = []
    credit: List[CreditAccount] = []
    loans: List[LoanAccount] = []
    investments: List[InvestmentAccount] = []

    # Derived metrics
    income: IncomeProfile
    spending: SpendingProfile

    # Aggregates
    total_liquid: float
    total_credit_debt: float
    total_loan_debt: float
    total_investments: float
    net_worth: float

    # For simulation selection
    included_account_ids: List[str] = []
```

### Dynamic Parameter Extraction

```python
# simulation/parameter_extraction.py

def extract_income_profile(transactions: List[dict]) -> IncomeProfile:
    """Detect salary deposits from transaction patterns."""

    # Filter likely income (large deposits, recurring)
    deposits = [t for t in transactions if t['amount'] < 0]  # Plaid: negative = income

    # Group by amount to find recurring salary
    from collections import Counter
    amounts = [round(abs(t['amount']), -2) for t in deposits]  # Round to nearest 100
    common = Counter(amounts).most_common(3)

    # Detect frequency
    salary_txns = [t for t in deposits if round(abs(t['amount']), -2) == common[0][0]]
    dates = sorted([t['date'] for t in salary_txns])
    avg_gap = average_days_between(dates)

    frequency = 'weekly' if avg_gap < 10 else 'biweekly' if avg_gap < 20 else 'monthly'

    # Calculate stability (low variance = stable)
    amounts = [abs(t['amount']) for t in salary_txns]
    stability = 1 - (np.std(amounts) / np.mean(amounts)) if amounts else 0.5

    return IncomeProfile(
        monthly_amount=estimate_monthly(common[0][0], frequency),
        frequency=frequency,
        stability_score=min(max(stability, 0), 1),
    )

def extract_spending_profile(transactions: List[dict]) -> SpendingProfile:
    """Categorize and analyze spending patterns."""

    expenses = [t for t in transactions if t['amount'] > 0]

    # Group by category
    by_category = defaultdict(float)
    for t in expenses:
        category = t.get('category', ['Other'])[0]
        by_category[category] += t['amount']

    # Identify fixed vs variable
    recurring = detect_recurring_transactions(expenses)
    fixed = sum(t['amount'] for t in recurring)
    variable = sum(t['amount'] for t in expenses) - fixed

    # Calculate volatility
    daily_spending = group_by_day(expenses)
    volatility = np.std(daily_spending) / np.mean(daily_spending) if daily_spending else 0.15

    return SpendingProfile(
        monthly_amount=sum(by_category.values()) / months_of_data,
        by_category=dict(by_category),
        volatility=min(max(volatility, 0.05), 0.40),
        fixed_expenses=fixed / months_of_data,
        variable_expenses=variable / months_of_data,
    )

def extract_investment_params(accounts: List[InvestmentAccount]) -> dict:
    """Determine expected return/volatility from actual portfolio allocation."""

    if not accounts:
        return {'annual_return': 0.07, 'annual_volatility': 0.15}  # Default

    # Aggregate allocation across all investment accounts
    total_value = sum(a.balance for a in accounts)
    weighted_allocation = {'stocks': 0, 'bonds': 0, 'cash': 0, 'other': 0}

    for account in accounts:
        weight = account.balance / total_value
        for asset_class, pct in account.allocation.items():
            weighted_allocation[asset_class] += pct * weight

    # Expected returns by asset class (historical averages)
    returns = {'stocks': 0.10, 'bonds': 0.04, 'cash': 0.02, 'other': 0.06}
    volatilities = {'stocks': 0.18, 'bonds': 0.06, 'cash': 0.01, 'other': 0.12}

    expected_return = sum(weighted_allocation[k] * returns[k] for k in returns)
    expected_volatility = sum(weighted_allocation[k] * volatilities[k] for k in volatilities)

    return {
        'annual_return': expected_return,
        'annual_volatility': expected_volatility,
        'allocation': weighted_allocation,
    }
```

### SimulationParams from Accounts

```python
# simulation/models.py - add to SimulationParams

@classmethod
def from_financial_profile(
    cls,
    profile: EnhancedFinancialProfile,
    risk_tolerance: str = "medium"
) -> "SimulationParams":
    """Build simulation params from actual account data."""

    base = cls.from_risk_tolerance(risk_tolerance)

    # Override with real data where available

    # Investment returns from actual allocation
    if profile.investments:
        inv_params = extract_investment_params(profile.investments)
        base.annual_return_mean = inv_params['annual_return']
        base.annual_return_std = inv_params['annual_volatility']

    # Income volatility from detected patterns
    if profile.income:
        base.income_volatility = 1 - profile.income.stability_score

    # Expense volatility from transaction variance
    if profile.spending:
        base.expense_volatility = profile.spending.volatility

    # Credit card interest modeling
    if profile.credit:
        base.credit_cards = [
            {'balance': c.balance, 'apr': c.apr, 'minimum': c.minimum_payment}
            for c in profile.credit
        ]

    # Loan amortization modeling
    if profile.loans:
        base.loans = [
            {'balance': l.balance, 'rate': l.interest_rate, 'payment': l.monthly_payment}
            for l in profile.loans
        ]

    return base
```

### Monte Carlo Updates

```python
# simulation/monte_carlo.py - enhanced simulation step

def simulate_month(state: SimulationState, params: SimulationParams) -> SimulationState:
    """Single month simulation with account-aware logic."""

    # Income (with detected volatility)
    income = state.monthly_income * (1 + np.random.normal(0, params.income_volatility))

    # Expenses (with real volatility)
    expenses = state.monthly_expenses * (1 + np.random.normal(0, params.expense_volatility))

    # Credit card interest accrual
    credit_interest = 0
    for card in params.credit_cards:
        monthly_rate = card['apr'] / 12
        credit_interest += state.credit_balances.get(card['id'], card['balance']) * monthly_rate

    # Loan payments (fixed)
    loan_payments = sum(loan['payment'] for loan in params.loans)

    # Investment growth (based on actual allocation)
    monthly_return = np.random.normal(
        params.annual_return_mean / 12,
        params.annual_return_std / np.sqrt(12)
    )
    investment_growth = state.investment_balance * monthly_return

    # 401k contribution + employer match (if detected)
    if params.retirement_contribution:
        contribution = income * params.retirement_contribution_rate
        match = min(contribution, income * params.employer_match_rate)
        investment_growth += contribution + match
        income -= contribution  # Pre-tax

    # Net cash flow
    net = income - expenses - credit_interest - loan_payments

    # Update state
    new_state = state.copy()
    new_state.liquid_balance += net
    new_state.investment_balance += investment_growth

    # Pay down debt if positive cash flow and debt exists
    if net > 0 and state.total_debt > 0:
        # Apply extra to highest APR debt first (avalanche method)
        ...

    return new_state
```

---

## Frontend

### New Components

```
apps/web/components/
├── accounts/
│   ├── AccountList.tsx         # Grid of all linked accounts
│   ├── AccountCard.tsx         # Base card, delegates to type-specific
│   ├── DepositoryCard.tsx      # Checking/savings
│   ├── CreditCard.tsx          # Credit card with utilization
│   ├── LoanCard.tsx            # Loan with payoff progress
│   ├── InvestmentCard.tsx      # Investment with allocation
│   └── AccountSelector.tsx     # Choose accounts for simulation
├── PlaidLink.tsx               # Plaid Link button/modal
└── insights/
    ├── NetWorth.tsx            # Assets - liabilities
    ├── CashFlow.tsx            # Income - expenses
    ├── DebtBreakdown.tsx       # All debts with APRs
    └── InvestmentAllocation.tsx # Portfolio pie chart
```

### Plaid Link Component

```tsx
// apps/web/components/PlaidLink.tsx

import { usePlaidLink } from 'react-plaid-link'

interface PlaidLinkProps {
  onSuccess: () => void
}

export function PlaidLink({ onSuccess }: PlaidLinkProps) {
  const [linkToken, setLinkToken] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/plaid/create-link-token', { method: 'POST' })
      .then(res => res.json())
      .then(data => setLinkToken(data.linkToken))
  }, [])

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: async (publicToken) => {
      await fetch('/api/plaid/exchange-token', {
        method: 'POST',
        body: JSON.stringify({ publicToken }),
      })
      onSuccess()
    },
  })

  return (
    <Button onClick={() => open()} disabled={!ready}>
      Connect Bank Account
    </Button>
  )
}
```

### Account Cards

```tsx
// apps/web/components/accounts/CreditCard.tsx

interface CreditCardProps {
  account: CreditAccount
  onToggle?: (included: boolean) => void
  included?: boolean
}

export function CreditCard({ account, onToggle, included = true }: CreditCardProps) {
  const utilizationColor = account.utilization > 0.7 ? 'error'
    : account.utilization > 0.3 ? 'warning'
    : 'success'

  return (
    <Card className="p-4">
      <div className="flex justify-between items-start mb-3">
        <div>
          <p className="font-medium">{account.name}</p>
          <p className="text-sm text-muted-foreground">Credit Card</p>
        </div>
        {onToggle && (
          <Checkbox checked={included} onCheckedChange={onToggle} />
        )}
      </div>

      <div className="space-y-3">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span>Balance</span>
            <span className="font-medium">${account.balance.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm mb-1">
            <span>Limit</span>
            <span>${account.limit.toLocaleString()}</span>
          </div>
        </div>

        {/* Utilization bar */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span>Utilization</span>
            <span className={`text-${utilizationColor}`}>
              {Math.round(account.utilization * 100)}%
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full bg-${utilizationColor}`}
              style={{ width: `${account.utilization * 100}%` }}
            />
          </div>
        </div>

        <div className="flex justify-between text-sm pt-2 border-t">
          <span className="text-muted-foreground">APR</span>
          <span className="text-error">{account.apr}%</span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Min Payment</span>
          <span>${account.minimumPayment}</span>
        </div>
      </div>
    </Card>
  )
}
```

```tsx
// apps/web/components/accounts/InvestmentCard.tsx

export function InvestmentCard({ account }: { account: InvestmentAccount }) {
  const allocationData = [
    { name: 'Stocks', value: account.allocation.stocks, color: '#22c55e' },
    { name: 'Bonds', value: account.allocation.bonds, color: '#3b82f6' },
    { name: 'Cash', value: account.allocation.cash, color: '#a855f7' },
    { name: 'Other', value: account.allocation.other, color: '#6b7280' },
  ].filter(d => d.value > 0)

  return (
    <Card className="p-4">
      <div className="flex justify-between items-start mb-3">
        <div>
          <p className="font-medium">{account.name}</p>
          <p className="text-sm text-muted-foreground capitalize">{account.subtype}</p>
        </div>
        <p className="text-xl font-semibold">${account.balance.toLocaleString()}</p>
      </div>

      {/* Mini allocation pie */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16">
          <PieChart data={allocationData} />
        </div>
        <div className="flex-1 space-y-1">
          {allocationData.map(d => (
            <div key={d.name} className="flex justify-between text-xs">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                {d.name}
              </span>
              <span>{Math.round(d.value * 100)}%</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}
```

### Account Selector

```tsx
// apps/web/components/accounts/AccountSelector.tsx

interface AccountSelectorProps {
  accounts: Account[]
  selected: string[]
  onChange: (selected: string[]) => void
}

export function AccountSelector({ accounts, selected, onChange }: AccountSelectorProps) {
  const grouped = groupBy(accounts, 'type')

  const toggle = (id: string) => {
    onChange(
      selected.includes(id)
        ? selected.filter(s => s !== id)
        : [...selected, id]
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium mb-2">Include in Simulation</h3>
        <p className="text-sm text-muted-foreground">
          Select which accounts to include in your financial projection
        </p>
      </div>

      {Object.entries(grouped).map(([type, accounts]) => (
        <div key={type}>
          <h4 className="text-xs uppercase text-muted-foreground mb-2">
            {type}
          </h4>
          <div className="space-y-2">
            {accounts.map(account => (
              <label
                key={account.id}
                className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={selected.includes(account.id)}
                    onCheckedChange={() => toggle(account.id)}
                  />
                  <div>
                    <p className="font-medium">{account.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatCurrency(account.balance)}
                    </p>
                  </div>
                </div>
                <ImpactBadge account={account} />
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
```

### Updated Results Page

```tsx
// Additional section for apps/web/app/results/page.tsx

{/* Account Contributions */}
<Card className="p-6 mb-8">
  <h2 className="font-medium mb-4">Account Impact Analysis</h2>

  <div className="space-y-3">
    {accountContributions.map(contrib => (
      <div key={contrib.id} className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AccountIcon type={contrib.type} />
          <div>
            <p className="font-medium">{contrib.name}</p>
            <p className="text-sm text-muted-foreground">{contrib.type}</p>
          </div>
        </div>
        <div className="text-right">
          <p className={contrib.impact > 0 ? 'text-success' : 'text-error'}>
            {contrib.impact > 0 ? '+' : ''}{formatCurrency(contrib.monthlyImpact)}/mo
          </p>
          <p className="text-xs text-muted-foreground">
            {Math.abs(contrib.percentageOfGoal)}% of goal
          </p>
        </div>
      </div>
    ))}
  </div>
</Card>

{/* Account-Specific What-Ifs */}
<Card className="p-6 mb-8">
  <h2 className="font-medium mb-4">Account-Based Scenarios</h2>

  <div className="space-y-3">
    {profile.credit.map(card => (
      <ScenarioRow
        key={card.id}
        label={`Pay off ${card.name}`}
        description={`Eliminate ${card.apr}% APR interest`}
        currentProb={results.successProbability}
        newProb={calculatePayoffScenario(card)}
      />
    ))}

    {profile.investments.filter(a => a.subtype === '401k').map(inv => (
      <ScenarioRow
        key={inv.id}
        label="Max out 401k contributions"
        description="Increase to $23,000/year limit"
        currentProb={results.successProbability}
        newProb={calculateContributionScenario(inv)}
      />
    ))}

    {profile.loans.filter(l => l.interest_rate > 5).map(loan => (
      <ScenarioRow
        key={loan.id}
        label={`Refinance ${loan.name}`}
        description={`From ${loan.interest_rate}% to 4.5%`}
        currentProb={results.successProbability}
        newProb={calculateRefinanceScenario(loan)}
      />
    ))}
  </div>
</Card>
```

---

## Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  PLAID LINK                                                                 │
│  ──────────                                                                 │
│  User connects bank → public_token → exchange → access_token stored        │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  DATA FETCH (on dashboard load)                                             │
│  ──────────────────────────────                                             │
│  /accounts       → depository, credit, loan, investment accounts           │
│  /transactions   → 90 days of history for income/spending analysis         │
│  /liabilities    → credit card APRs, loan terms                            │
│  /investments    → holdings, securities for allocation                      │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ACCOUNT MAPPING                                                            │
│  ───────────────                                                            │
│  Raw Plaid data → Typed account objects → EnhancedFinancialProfile         │
│                                                                             │
│  Extraction:                                                                │
│  - Income: detect salary deposits, frequency, stability                     │
│  - Spending: categorize, identify recurring, calculate volatility          │
│  - Investments: aggregate allocation across accounts                        │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  SIMULATION                                                                 │
│  ──────────                                                                 │
│  EnhancedFinancialProfile → SimulationParams.from_financial_profile()      │
│                                                                             │
│  Dynamic params:                                                            │
│  - annual_return from actual investment allocation                          │
│  - income_volatility from deposit variance                                  │
│  - expense_volatility from transaction variance                             │
│  - credit interest modeled per-card with real APRs                         │
│  - loan payments modeled with real amortization                            │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  RESULTS                                                                    │
│  ───────                                                                    │
│  - Success probability (account-aware)                                      │
│  - Per-account contribution breakdown                                       │
│  - Auto-generated what-if scenarios based on linked accounts               │
│  - Account-specific recommendations from advisor                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Environment Variables

```bash
# apps/api/.env
PLAID_CLIENT_ID=your_client_id
PLAID_SECRET=your_secret
PLAID_ENV=sandbox  # sandbox | development | production

# Sandbox test credentials (for Plaid Link):
# Username: user_good
# Password: pass_good
```

---

## Migration Path

### Phase 1: Backend + Basic Frontend
1. Add Plaid service and routes
2. Add PlaidLink component to login
3. Store access tokens
4. Fetch and display accounts on dashboard

### Phase 2: Account Type UI
1. Build type-specific account cards
2. Add account selector
3. Show account breakdown on dashboard

### Phase 3: Simulation Integration
1. Update Python models
2. Add parameter extraction
3. Update Monte Carlo to use real data
4. Pass selected accounts through simulation flow

### Phase 4: Enhanced Results
1. Show per-account contributions
2. Generate account-based what-if scenarios
3. Update advisor context with account data

### Phase 5: Polish
1. Handle edge cases (no accounts, API errors)
2. Add refresh/resync functionality
3. Support multiple Plaid items (multiple banks)
4. Optimize data fetching
