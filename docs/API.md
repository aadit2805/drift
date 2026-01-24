# Monte Carlo Finance - API Documentation

## Base URL

```
http://localhost:3001/api
```

## Endpoints

### Nessie Proxy

All Nessie endpoints are proxied through our backend to handle API key management.

#### Get All Accounts
```
GET /nessie/accounts
```

Response:
```json
[
  {
    "_id": "string",
    "type": "Checking" | "Savings" | "Credit Card",
    "nickname": "string",
    "balance": 5000,
    "customer_id": "string"
  }
]
```

#### Get Account Purchases
```
GET /nessie/accounts/:id/purchases
```

#### Get Account Deposits
```
GET /nessie/accounts/:id/deposits
```

#### Get Account Loans
```
GET /nessie/accounts/:id/loans
```

#### Get All Merchants
```
GET /nessie/merchants
```

---

### Financial Profile

#### Get Aggregated Financial Profile
```
GET /financial-profile
```

Aggregates data from all Nessie endpoints into a simulation-ready profile.

Response:
```json
{
  "liquidAssets": 13500,
  "creditDebt": 1200,
  "loanDebt": 15000,
  "monthlyLoanPayments": 350,
  "monthlySpending": 3200,
  "spendingByCategory": {
    "Groceries": 400,
    "Dining": 250
  },
  "spendingVolatility": 0.15
}
```

---

### LLM / Goal Parsing

#### Parse Natural Language Goal
```
POST /parse-goal
```

Request:
```json
{
  "goal": "I want to save $50,000 for a house down payment in 3 years"
}
```

Response:
```json
{
  "goalType": "major_purchase",
  "targetAmount": 50000,
  "timelineMonths": 36,
  "constraints": [],
  "clarifyingQuestions": null
}
```

---

### Simulation

#### Run Monte Carlo Simulation
```
POST /simulate
```

Request:
```json
{
  "financialProfile": {
    "liquidAssets": 13500,
    "creditDebt": 1200,
    "loanDebt": 15000,
    "monthlyLoanPayments": 350,
    "monthlySpending": 3200,
    "spendingByCategory": {},
    "spendingVolatility": 0.15
  },
  "userInputs": {
    "monthlyIncome": 5000,
    "age": 30,
    "riskTolerance": "medium"
  },
  "goal": {
    "targetAmount": 50000,
    "timelineMonths": 36,
    "goalType": "major_purchase"
  },
  "simulationParams": {
    "nSimulations": 10000
  }
}
```

Response:
```json
{
  "successProbability": 0.73,
  "medianOutcome": 48200,
  "percentiles": {
    "p10": 31000,
    "p25": 39500,
    "p50": 48200,
    "p75": 57800,
    "p90": 68500
  },
  "mean": 48500,
  "std": 12000,
  "worstCase": 15000,
  "bestCase": 85000
}
```

#### Run Sensitivity Analysis
```
POST /sensitivity
```

Same request body as `/simulate`.

Response:
```json
{
  "baseProbability": 0.73,
  "sensitivities": {
    "income_plus_10": {
      "delta": 0.11,
      "newProbability": 0.84,
      "impact": 0.11
    },
    "spending_minus_10": {
      "delta": 0.08,
      "newProbability": 0.81,
      "impact": 0.08
    }
  },
  "mostImpactful": "income_plus_10",
  "recommendations": [
    "Reducing spending by 10% could improve your success probability by 8%."
  ]
}
```

---

## Error Handling

All endpoints return errors in this format:

```json
{
  "error": "Error message description"
}
```

HTTP Status Codes:
- `200` - Success
- `400` - Bad Request (invalid input)
- `500` - Internal Server Error
