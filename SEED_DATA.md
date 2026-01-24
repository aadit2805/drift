# Seed Data - Demo Customer Profiles

This document contains all seeded data for the demo users in the FutureCast application.

## Quick Reference

| Customer | ID | Net Worth | Monthly Cash Flow | Profile |
|----------|-----|-----------|-------------------|---------|
| **Jordan Smith** | `697541cf95150878eafea4ff` | -$21,000 | -$50/mo | Paycheck-to-paycheck |
| **Taylor Chen** | `69754eb095150878eafeb524` | +$84,650 | +$1,256/mo | Well-off professional |

---

# Jordan Smith (Average American Profile)

Represents the **median American worker** - living paycheck-to-paycheck with negative net worth.

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

## Seed Script

```bash
npx tsx scripts/seed-nessie.ts
```

---

# Taylor Chen (Well-Off Professional Profile)

Represents an **upper-middle class tech professional** - positive cash flow with healthy savings.

## Data Sources

Based on upper-middle class professional:
- Senior engineer/manager salary: ~$145,000/year
- 6-month emergency fund
- Investment accounts
- Minimal debt (pays CC monthly)
- No car loan (paid-off vehicle)

## Customer Profile

| Field | Value |
|-------|-------|
| **Customer ID** | `69754eb095150878eafeb524` |
| **Name** | Taylor Chen |
| **Address** | 1250 Marina Boulevard, San Francisco, CA 94123 |
| **Location Notes** | San Francisco tech hub, higher cost of living |

## Accounts

| Account | Type | Balance | Notes |
|---------|------|---------|-------|
| Primary Checking | Checking | $12,500 | Comfortable buffer |
| Emergency Fund | Savings | $45,000 | 6-month emergency fund |
| Investment Account | Savings | $28,000 | Brokerage/investment |
| Travel Rewards Card | Credit Card | $850 (debt) | Current cycle only, pays monthly |

**Summary:**
- Total Liquid Assets: $85,500
- Total Debt: $850 (current CC cycle)
- **Net Worth: +$84,650**

## Income

| Source | Amount | Frequency |
|--------|--------|-----------|
| Salary (Direct Deposit) | $4,167 | Bi-weekly (1st & 15th) |
| Quarterly Bonus | ~$3,600 | Quarterly (Mar, Jun, Sep, Dec) |
| Investment Dividends | ~$250 | Occasional (~15% of months) |

**Take-Home Monthly Income:** ~$8,334 (base) + bonuses

This represents a $145,000/year gross salary with ~$100,000 take-home after taxes.

## Recurring Bills

| Payee | Amount | Due Date |
|-------|--------|----------|
| Bay Property Management (Rent) | $2,400 | 1st |
| GEICO (Car Insurance) | $110 | 15th |
| PG&E (Electric) | $95 | 10th |
| PG&E (Gas) | $45 | 10th |
| Sonic Fiber (Internet) | $80 | 5th |
| AT&T (Phone) | $65 | 18th |
| Netflix | $23 | 8th |
| Spotify | $11 | 8th |
| Equinox (Gym) | $85 | 1st |
| HBO Max | $16 | 12th |
| NY Times | $17 | 15th |

**Total Monthly Bills:** $2,947

## Monthly Cash Flow Summary

```
INCOME
├── Salary (bi-weekly):    $8,334
├── Quarterly Bonus:       ~$1,200/mo avg
├── Dividends (rare):      ~$40/mo avg
└── TOTAL:                 ~$9,500

FIXED EXPENSES
├── Rent:                  $2,400
├── Utilities:             $140
├── Insurance:             $110
├── Phone:                 $65
├── Subscriptions:         $67
├── Gym:                   $85
└── SUBTOTAL:              $2,947

VARIABLE SPENDING
├── Groceries:             $600
├── Dining:                $450
├── Gas:                   $120
├── Shopping:              $300
├── Entertainment:         $150
├── Health/Wellness:       $180
├── Travel:                $400
├── Investment Contrib:    $1,500
└── SUBTOTAL:              ~$4,131

TOTAL EXPENSES:            ~$7,078

NET CASH FLOW:             ~+$1,256 to +$2,500/mo
```

**Key Insight:** This profile represents financial stability - healthy savings, minimal debt, and consistent positive cash flow. Good for demonstrating achievable goals.

## Merchants (29 total)

### Groceries
- Whole Foods, Trader Joe's, Costco, Local Farmers Market

### Dining
- Sweetgreen, Chipotle, Local Bistro, Sushi Restaurant, Starbucks, Wine Bar

### Gas
- Shell, Chevron

### Transportation
- Uber, Lyft

### Shopping
- Amazon, REI, Apple Store, Nordstrom

### Entertainment
- AMC Theatres, Concert Venue, Golf Course

### Health & Wellness
- Equinox, CVS Pharmacy, Massage Envy

### Travel
- Delta Airlines, Airbnb, Marriott

### Personal
- Barber Shop, Dry Cleaner

## Seed Script

```bash
npx tsx scripts/seed-welloff.ts
```

---

# API Endpoints

```bash
# Jordan Smith
curl "http://api.nessieisreal.com/customers/697541cf95150878eafea4ff?key=API_KEY"

# Taylor Chen
curl "http://api.nessieisreal.com/customers/69754eb095150878eafeb524?key=API_KEY"

# Get accounts for any customer
curl "http://api.nessieisreal.com/customers/{CUSTOMER_ID}/accounts?key=API_KEY"
```

---

# Why These Profiles?

## Jordan Smith (Average American)
1. **Negative net worth** - Most Americans have more debt than savings
2. **Living paycheck-to-paycheck** - ~60% of Americans can't cover a $1,000 emergency
3. **Car loan debt** - Average American has $23K in auto loans
4. **Credit card balance** - Average American carries $6K in CC debt
5. **Low savings** - Median savings is under $5,000
6. **Rent-burdened** - Housing takes 40%+ of income

This creates a realistic scenario where:
- Goals are challenging but not impossible
- Small changes in spending have significant impact
- The user can see the value of financial planning

## Taylor Chen (Well-Off Professional)
1. **Positive net worth** - Healthy savings and investments
2. **Emergency fund** - 6 months of expenses saved
3. **No car loan** - Drives paid-off or company vehicle
4. **Pays CC monthly** - No revolving debt
5. **High savings rate** - Consistent $1,500/mo to investments
6. **Comfortable lifestyle** - Can afford nice things while still saving

This creates a scenario where:
- Goals are more achievable
- User can plan for larger goals (house down payment, early retirement)
- Demonstrates what "financial health" looks like
