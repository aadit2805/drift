# Seed Data - Alex Morgan

This document contains all the seeded data for the demo user pulled from the Nessie API.

## Customer Profile

| Field | Value |
|-------|-------|
| **Customer ID** | `6975325e95150878eafe8c79` |
| **Name** | Alex Morgan |
| **Address** | 245 Commonwealth Avenue, Boston, MA 02116 |

## Accounts

| Account | Type | Balance | ID |
|---------|------|---------|-----|
| Primary Checking | Checking | $4,850 | `6975325e95150878eafe8c7a` |
| Emergency Fund | Savings | $12,500 | `6975325f95150878eafe8c7b` |
| Vacation Fund | Savings | $3,200 | `6975325f95150878eafe8c7c` |
| Cash Back Rewards | Credit Card | $1,850 (debt) | `6975325f95150878eafe8c7d` |

**Total Liquid Assets:** $20,550 (Checking + Savings)
**Total Credit Debt:** $1,850

## Income

| Source | Amount | Frequency |
|--------|--------|-----------|
| Salary (Direct Deposit) | $3,200 | Bi-weekly (1st & 15th) |
| Freelance Consulting | ~$500 | Variable (~30% of months) |
| Venmo/Zelle (bill splits) | ~$75 | Variable (~50% of months) |

**Estimated Monthly Income:** ~$6,400-$6,600

## Recurring Bills

| Payee | Amount | Due Date |
|-------|--------|----------|
| Landlord - Rent | $2,200 | 1st |
| Geico (Car Insurance) | $125 | 1st |
| National Grid (Electric) | $95 | 12th |
| Eversource (Gas/Heat) | $65 | 15th |
| Xfinity (Internet) | $89 | 8th |
| Verizon Wireless (Phone) | $85 | 18th |
| Netflix | $15 | 10th |
| Spotify | $11 | 14th |
| iCloud Storage | $3 | 5th |
| New York Times | $17 | 22nd |

**Total Monthly Bills:** $2,705

## Loans

| Type | Amount | Monthly Payment | Description |
|------|--------|-----------------|-------------|
| Auto Loan | $18,500 | $385 | 2023 Honda Accord |
| Student Loan | $24,000 | $280 | Federal Student Loan |

**Total Loan Debt:** $42,500
**Total Monthly Loan Payments:** $665

## Merchants (34 total)

### Groceries
- Whole Foods Market
- Trader Joe's
- Stop & Shop
- Costco

### Dining & Food
- Chipotle
- Starbucks
- Sweetgreen
- Local Restaurant
- DoorDash
- Uber Eats

### Transportation
- Shell Gas Station
- Exxon
- Uber
- Lyft
- MBTA

### Shopping
- Amazon
- Target
- Walmart
- Best Buy
- Home Depot
- TJ Maxx

### Entertainment
- Netflix
- Spotify
- HBO Max
- AMC Theatres
- Ticketmaster

### Health & Fitness
- Planet Fitness
- CVS Pharmacy
- Walgreens

### Travel
- Delta Airlines
- Airbnb
- Marriott Hotels

### Personal Care
- Supercuts
- Dry Cleaner

## Spending Patterns (Monthly Averages)

| Category | Average | Std Dev | Frequency |
|----------|---------|---------|-----------|
| Groceries | $500 | $100 | 8x/month |
| Dining | $350 | $120 | 12x/month |
| Gas | $180 | $40 | 4x/month |
| Transport | $100 | $50 | 6x/month |
| Shopping | $250 | $200 | 4x/month |
| Entertainment | $80 | $40 | 3x/month |
| Health | $120 | $60 | 2x/month |
| Travel | $150 | $300 | 0.5x/month |
| Personal | $60 | $30 | 1x/month |

**Estimated Monthly Spending:** ~$1,790 (variable purchases only)

## Seasonal Multipliers

Spending varies by month:

| Month | Multiplier | Reason |
|-------|------------|--------|
| January | 0.9x | Post-holiday recovery |
| February | 0.85x | Low spending |
| March | 0.95x | Normal |
| April | 1.0x | Normal |
| May | 1.0x | Normal |
| June | 1.1x | Summer activities |
| July | 1.15x | Vacation season |
| August | 1.1x | Back to school |
| September | 0.95x | Normal |
| October | 1.0x | Normal |
| November | 1.2x | Black Friday |
| December | 1.4x | Holiday shopping |

## Transaction History

| Metric | Value |
|--------|-------|
| **Duration** | 12 months |
| **Total Transactions** | 541 |
| **Total Deposits** | ~$79,938 |
| **Total Purchases** | ~$21,076 |

## Monthly Cash Flow Summary

```
INCOME
├── Salary:           $6,400
├── Side Income:      ~$150 (avg)
└── TOTAL:            ~$6,550

EXPENSES
├── Bills:            $2,705
├── Loan Payments:    $665
├── Variable Spend:   ~$1,790
└── TOTAL:            ~$5,160

SAVINGS
├── Emergency Fund:   ~$600/mo
├── Vacation Fund:    ~$150/mo
└── TOTAL:            ~$750/mo

NET CASH FLOW:        ~$640/mo (buffer)
```

## API Endpoints

To fetch this data:

```bash
# Get all accounts
curl "http://api.nessieisreal.com/customers/6975325e95150878eafe8c79/accounts?key=API_KEY"

# Get purchases
curl "http://api.nessieisreal.com/accounts/6975325e95150878eafe8c7a/purchases?key=API_KEY"

# Get deposits
curl "http://api.nessieisreal.com/accounts/6975325e95150878eafe8c7a/deposits?key=API_KEY"

# Get bills
curl "http://api.nessieisreal.com/accounts/6975325e95150878eafe8c7a/bills?key=API_KEY"

# Get loans
curl "http://api.nessieisreal.com/accounts/6975325e95150878eafe8c7a/loans?key=API_KEY"
```

## Code Reference

- **Seed Script:** `scripts/seed-nessie.ts`
- **Customer ID Constant:** `apps/api/src/services/nessieService.ts` line 7
- **Financial Profile Endpoint:** `apps/api/src/routes/simulation.ts`
