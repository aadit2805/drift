# Seed Data - Jordan Smith (Average American Profile)

This document contains all the seeded data for the demo user, representing the **median American worker**.

## Data Sources

Based on 2024 national averages:
- Median individual income: ~$56,000/year
- Average savings account balance: ~$5,000
- Average credit card debt: ~$6,000
- Average auto loan balance: ~$23,000
- Average credit score: 680

## Customer Profile

| Field | Value |
|-------|-------|
| **Customer ID** | `697541cf95150878eafea4ff` |
| **Name** | Jordan Smith |
| **Address** | 847 Oak Street, Columbus, OH 43215 |
| **Location Notes** | Columbus chosen for median cost of living |

## Accounts

| Account | Type | Balance | Notes |
|---------|------|---------|-------|
| Everyday Checking | Checking | $2,400 | Median American has ~$2,500 |
| Savings Account | Savings | $4,800 | Average savings ~$5,000 |
| Rewards Card | Credit Card | $5,700 (debt) | Average CC debt ~$6,000 |

**Summary:**
- Total Liquid Assets: $7,200
- Total Debt: $28,200 (CC + auto loan)
- **Net Worth: -$21,000** (typical for average American with car loan)

## Income

| Source | Amount | Frequency |
|--------|--------|-----------|
| Salary (Direct Deposit) | $1,834 | Bi-weekly (1st & 15th) |
| Side Income (occasional) | ~$200 | ~20% of months |

**Take-Home Monthly Income:** ~$3,668

This represents a $56,000/year gross salary with ~$44,000 take-home after taxes.

## Recurring Bills

| Payee | Amount | Due Date |
|-------|--------|----------|
| Property Management LLC (Rent) | $1,450 | 1st |
| State Farm (Car Insurance) | $145 | 15th |
| Electric Company | $115 | 10th |
| Gas Utility | $70 | 12th |
| Spectrum (Internet) | $65 | 8th |
| Verizon Wireless (Phone) | $85 | 18th |
| Netflix | $15 | 5th |
| Spotify | $11 | 7th |
| Planet Fitness | $35 | 1st |

**Total Monthly Bills:** $1,991

## Auto Loan

| Field | Value |
|-------|-------|
| Type | Auto Loan |
| Balance | $22,500 |
| Monthly Payment | $485 |
| Description | 2021 Toyota Camry |
| Credit Score | 680 (average American) |

## Merchants (27 total)

### Groceries
- Walmart Grocery
- Kroger
- Aldi
- Costco

### Dining & Fast Food
- McDonald's
- Chick-fil-A
- Taco Bell
- Applebee's
- Local Pizza
- DoorDash
- Starbucks

### Gas Stations
- Shell
- Exxon
- BP

### Transportation
- Uber

### Shopping
- Amazon
- Walmart
- Target
- Dollar General
- T.J. Maxx

### Entertainment
- Netflix
- AMC Theatres
- Spotify

### Health
- CVS Pharmacy
- Walgreens
- Planet Fitness

### Personal
- Great Clips

## Spending Patterns (Monthly Averages)

| Category | Average | Notes |
|----------|---------|-------|
| Groceries | $380 | National average |
| Dining | $280 | Americans spend ~$250-300/mo eating out |
| Gas | $160 | Average gas spending |
| Transport | $40 | Occasional rideshare |
| Shopping | $180 | Discretionary purchases |
| Entertainment | $60 | Movies, events |
| Health | $90 | Pharmacy, gym extras |
| Personal | $40 | Haircuts, etc |

**Total Variable Spending:** ~$1,230/mo

## Seasonal Spending Multipliers

| Month | Multiplier | Reason |
|-------|------------|--------|
| January | 0.85x | Post-holiday recovery |
| February | 0.80x | Lowest spending month |
| March | 0.90x | Normal |
| April | 0.95x | Tax refund spending |
| May | 1.0x | Normal |
| June | 1.05x | Summer starts |
| July | 1.10x | Vacation season |
| August | 1.05x | Back to school |
| September | 0.95x | Normal |
| October | 1.0x | Normal |
| November | 1.15x | Black Friday |
| December | 1.30x | Holiday shopping |

## Monthly Cash Flow Summary

```
INCOME
├── Salary (bi-weekly):    $3,668
├── Side Income (rare):    ~$40 avg
└── TOTAL:                 ~$3,700

FIXED EXPENSES
├── Rent:                  $1,450
├── Utilities:             $185
├── Insurance:             $145
├── Phone:                 $85
├── Subscriptions:         $61
├── Gym:                   $35
└── SUBTOTAL:              $1,991

DEBT PAYMENTS
└── Auto Loan:             $485

VARIABLE SPENDING
├── Groceries:             $380
├── Dining:                $280
├── Gas:                   $160
├── Shopping:              $180
├── Other:                 $230
└── SUBTOTAL:              ~$1,230

TOTAL EXPENSES:            ~$3,706

NET CASH FLOW:             ~$-6 to -$150/mo
```

**Key Insight:** This profile represents an American living paycheck-to-paycheck, with essentially zero monthly savings. This is representative of ~60% of Americans.

## Transaction History

| Metric | Value |
|--------|-------|
| **Duration** | 12 months |
| **Total Transactions** | 341 |
| **Total Deposits** | $44,878 |
| **Total Purchases** | $15,902 |

## API Endpoints

```bash
# Get customer
curl "http://api.nessieisreal.com/customers/697541cf95150878eafea4ff?key=API_KEY"

# Get accounts
curl "http://api.nessieisreal.com/customers/697541cf95150878eafea4ff/accounts?key=API_KEY"

# Get purchases (use checking account ID)
curl "http://api.nessieisreal.com/accounts/{checking_id}/purchases?key=API_KEY"

# Get deposits
curl "http://api.nessieisreal.com/accounts/{checking_id}/deposits?key=API_KEY"

# Get bills
curl "http://api.nessieisreal.com/accounts/{checking_id}/bills?key=API_KEY"

# Get loans
curl "http://api.nessieisreal.com/accounts/{checking_id}/loans?key=API_KEY"
```

## Why This Profile?

This seed data was designed to represent the **median American worker**:

1. **Negative net worth** - Most Americans have more debt than savings
2. **Living paycheck-to-paycheck** - ~60% of Americans can't cover a $1,000 emergency
3. **Car loan debt** - Average American has $23K in auto loans
4. **Credit card balance** - Average American carries $6K in CC debt
5. **Low savings** - Median savings is under $5,000
6. **Rent-burdened** - Housing takes 40%+ of income

This creates a realistic scenario for the Monte Carlo simulation where:
- Goals are challenging but not impossible
- Small changes in spending have significant impact
- The user can see the value of financial planning
