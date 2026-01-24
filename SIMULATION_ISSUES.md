# Simulation Issues - Audit

## Critical Issues (Simulation is Misleading)

| Issue | What's Wrong | Impact |
|-------|--------------|--------|
| **Loan payments ignored** | `monthlyLoanPayments` ($665) is in the data but simulation only uses `monthlySpending` | Overestimates savings by $665/month |
| **Risk tolerance unused** | User selects low/medium/high but it does nothing | Fake input field |
| **Goal type unused** | "retirement" vs "house" doesn't change anything | No difference in modeling |
| **No debt payoff** | $42k in loans never decreases | Unrealistic for debt goals |
| **Investment returns on everything** | Applies 7% to entire balance including checking | Overestimates growth |

## Missing Features (Would Make It Impressive)

| Feature | Why It Matters |
|---------|----------------|
| **No income growth** | People get raises - 3-5 year goals should model this |
| **No inflation** | $50k in 3 years is worth less than $50k today |
| **No monthly trajectory** | Only shows final number, not the journey |
| **No breakdown of assumptions** | User can't see what parameters were used |
| **Spending categories unused** | We have dining/groceries/etc but don't use it for "cut dining by 20%" scenarios |

## UX Issues

| Issue | Problem |
|-------|---------|
| **Results don't show inputs** | Can't verify "did it use MY data?" |
| **No financial profile page** | User never sees Alex's actual data |
| **Sensitivity analysis is vague** | "+10% income" - what does that mean in dollars? |
| **No explanation of the math** | "73% probability" - based on what? |

## Priority Fix List

### Must fix for demo:
1. Include loan payments in simulation
2. Make risk tolerance actually do something
3. Add a "Your Financial Profile" page showing Nessie data (DONE)
4. Show simulation inputs/assumptions on results page

### Would be impressive:
5. Monthly trajectory chart (not just final outcome)
6. Real NLP parsing with OpenAI (DONE)
7. Show the math: "You save ~$X/month → $Y over Z months"
8. Show better recommendations linked to financial data (DONE)
