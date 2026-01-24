# API Integration Guide

## New Simplified Endpoint

The API should expose a new simplified endpoint that handles the entire workflow:

```typescript
POST /api/simulate

Request:
{
  goal: string;              // e.g., "I want to buy a house in 3 years"
  riskTolerance: "low" | "medium" | "high";
}

Response:
{
  success_probability: number;
  median_outcome: number;
  percentiles: {
    p10: number;
    p25: number;
    p50: number;
    p75: number;
    p90: number;
  };
  mean: number;
  std: number;
  worst_case: number;
  best_case: number;
  parsedGoal: {
    goal_type: string;
    target_amount: number;
    timeline_months: number;
    confidence: number;
  };
  financialProfile: {
    liquid_assets: number;
    credit_debt: number;
    loan_debt: number;
    monthly_loan_payments: number;  // NOW INCLUDED
    monthly_spending: number;
    monthly_income: number;  // Extracted from Nessie
  };
}
```

## Implementation Steps

### Step 1: Create Python Service Wrapper

Create `simulationWrapper.py`:
```python
from goal_parser import parse_goal_with_openai
from tests.fetch_nessie_data import (
    get_test_data, 
    create_simulation_request_from_nessie,
    extract_salary_from_deposits
)
from monte_carlo import run_monte_carlo
from models import SimulationRequest, Goal

async def simulate_from_goal(
    goal_text: str,
    risk_tolerance: str,
    nessie_api_key: str  # User's API key from session
) -> dict:
    """
    Execute complete simulation workflow from goal text.
    
    1. Fetch user's Nessie data
    2. Parse goal with AI
    3. Extract salary from deposits
    4. Run simulation
    5. Return results
    """
    
    # Step 1: Get real Nessie data for this user
    nessie_data = fetch_user_nessie_data(nessie_api_key)
    
    # Step 2: Parse goal with AI
    parsed_goal = parse_goal_with_openai(
        goal_text=goal_text,
        monthly_income=extract_salary_from_deposits(
            nessie_data.get('deposits_by_account', {})
        ),
        risk_tolerance=risk_tolerance
    )
    
    # Step 3: Create simulation request from Nessie data
    request_dict = create_simulation_request_from_nessie(nessie_data)
    
    # Step 4: Build request with parsed goal
    simulation_request = SimulationRequest(
        financial_profile=FinancialProfile(**request_dict['financialProfile']),
        user_inputs=UserInputs(
            monthly_income=extract_salary_from_deposits(...),
            age=30,  # Get from user profile
            risk_tolerance=risk_tolerance
        ),
        goal=Goal(
            target_amount=parsed_goal.target_amount,
            timeline_months=parsed_goal.timeline_months,
            goal_type=parsed_goal.goal_type,
            goal_text=goal_text,
            confidence=parsed_goal.confidence
        )
    )
    
    # Step 5: Run simulation (with progress callback for WebSocket)
    results = run_monte_carlo(simulation_request, n_workers=4)
    
    return {
        **results.dict(),
        "parsedGoal": parsed_goal.dict(),
        "financialProfile": request_dict['financialProfile']
    }
```

### Step 2: Update TypeScript Service

Update `apps/api/src/services/simulationService.ts`:

```typescript
interface SimulationRequest {
  goal: string;
  riskTolerance: "low" | "medium" | "high";
  userId: string;  // From auth
}

interface SimulationResponse {
  success_probability: number;
  median_outcome: number;
  percentiles: Record<string, number>;
  parsedGoal: {
    goal_type: string;
    target_amount: number;
    timeline_months: number;
    confidence: number;
  };
  financialProfile: {
    liquid_assets: number;
    monthly_income: number;
    monthly_loan_payments: number;
    monthly_spending: number;
  };
}

export async function runSimulation(
  request: SimulationRequest,
  onProgress?: (progress: ProgressUpdate) => void
): Promise<SimulationResponse> {
  // Get user's Nessie API key from database
  const user = await getUserProfile(request.userId);
  
  // Call Python backend
  const response = await fetch("/api/python/simulate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      goal: request.goal,
      riskTolerance: request.riskTolerance,
      nessieApiKey: user.nessieApiKey,
    }),
  });

  // Stream progress updates via WebSocket
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    const text = decoder.decode(value);
    const lines = text.split('\n');
    
    for (const line of lines) {
      if (line.startsWith('{"type":"progress"')) {
        const progress = JSON.parse(line);
        onProgress?.(progress);
      }
    }
  }

  return response.json();
}
```

### Step 3: Update Frontend Form

Current form asks for detailed financial info. Simplify to:

```typescript
interface OnboardingFormProps {
  onSubmit: (data: { goal: string; riskTolerance: string }) => void;
}

export function OnboardingForm({ onSubmit }: OnboardingFormProps) {
  const [goal, setGoal] = useState("");
  const [risk, setRisk] = useState("medium");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Show what will be done
    console.log("Will:");
    console.log("1. Fetch your Nessie financial data");
    console.log("2. Parse your goal with AI");
    console.log("3. Derive your salary from deposits");
    console.log("4. Run simulation with fixed logic");
    
    onSubmit({ goal, riskTolerance: risk });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>
          What's your financial goal?
          <input
            type="text"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="e.g., Buy a house in 3 years, Retire in 15 years"
          />
        </label>
      </div>

      <div>
        <label>
          Risk Tolerance
          <select value={risk} onChange={(e) => setRisk(e.target.value)}>
            <option value="low">Low (3% returns, less volatility)</option>
            <option value="medium">Medium (7% returns)</option>
            <option value="high">High (10% returns, more volatility)</option>
          </select>
        </label>
      </div>

      <button type="submit">Analyze My Financial Goal</button>
    </form>
  );
}
```

### Step 4: Show Results Page

Update results display to show:

```typescript
interface SimulationResultsProps {
  results: SimulationResponse;
}

export function SimulationResults({ results }: SimulationResultsProps) {
  const goal = results.parsedGoal;
  const profile = results.financialProfile;

  return (
    <div>
      {/* Parsed Goal */}
      <section>
        <h2>Your Goal</h2>
        <p>Type: {goal.goal_type}</p>
        <p>Target: ${goal.target_amount.toLocaleString()}</p>
        <p>Timeline: {goal.timeline_months} months ({(goal.timeline_months/12).toFixed(1)} years)</p>
        <p>Parser Confidence: {(goal.confidence * 100).toFixed(0)}%</p>
      </section>

      {/* Financial Summary */}
      <section>
        <h2>Your Financial Profile</h2>
        <p>Monthly Income: ${profile.monthly_income.toLocaleString()}</p>
        <p>Monthly Spending: ${profile.monthly_spending.toLocaleString()}</p>
        <p>Monthly Loan Payments: ${profile.monthly_loan_payments.toLocaleString()}</p>
        <p>Net Cash Flow: ${(profile.monthly_income - profile.monthly_spending - profile.monthly_loan_payments).toLocaleString()}</p>
      </section>

      {/* Results */}
      <section>
        <h2>Success Probability</h2>
        <p className={results.success_probability > 0.8 ? 'green' : 'red'}>
          {(results.success_probability * 100).toFixed(1)}%
        </p>
        
        <h3>Outcome Distribution</h3>
        <ul>
          <li>Worst Case (10%): ${results.percentiles.p10.toLocaleString()}</li>
          <li>25th Percentile: ${results.percentiles.p25.toLocaleString()}</li>
          <li>Median (50%): ${results.percentiles.p50.toLocaleString()}</li>
          <li>75th Percentile: ${results.percentiles.p75.toLocaleString()}</li>
          <li>Best Case (90%): ${results.percentiles.p90.toLocaleString()}</li>
        </ul>
      </section>

      {/* Recommendation */}
      <section>
        <h2>Analysis</h2>
        {results.success_probability > 0.8 && (
          <p>High confidence you can reach this goal!</p>
        )}
        {results.success_probability < 0.2 && (
          <p>To reach this goal, consider:</p>
          <ul>
            <li>Increasing your income</li>
            <li>Reducing monthly spending</li>
            <li>Extending your timeline</li>
            <li>Paying off high-interest debt first</li>
          </ul>
        )}
      </section>
    </div>
  );
}
```

## Key Changes from Previous Version

### Inputs Changed
```typescript
// OLD - Required detailed financial data
{
  financialProfile: {
    liquidAssets: 41050,
    creditDebt: 3050,
    loanDebt: 15000,
    monthlyLoanPayments: 350,    // User had to calculate
    monthlySpending: 5409,       // User had to know
    monthlyIncome: 5000,         // User input (often wrong)
  },
  userInputs: {
    age: 30,
    riskTolerance: "medium"
  },
  goal: {
    targetAmount: 50000,         // User guessed
    timelineMonths: 36,          // User guessed
  }
}

// NEW - Just goal text and risk tolerance
{
  goal: "Buy a house in 3 years",
  riskTolerance: "medium"
}
// Everything else derived from:
// - AI parses goal text
// - Nessie API provides financial data
// - Deposits analyzed for salary
```

### Workflow Changed
```typescript
// OLD
1. User manually enters all financial details
2. User manually specifies target amount and timeline
3. Simulation runs
4. Results might be wrong because user input was wrong

// NEW
1. User types a goal ("retire in 15 years")
2. AI parses it intelligently ("retirement" → $1.5M over 180 months)
3. Fetch real Nessie data (accounts, transactions, loans)
4. Extract salary from deposit patterns
5. Simulation uses real financial data
6. Results are accurate and trustworthy
```

## Error Handling

```python
class GoalParsingError(Exception):
    """Raised when goal cannot be parsed"""
    pass

class NessieDataError(Exception):
    """Raised when Nessie API fails or no data available"""
    pass

async def simulate_from_goal(...):
    try:
        # Fetch Nessie data
        nessie_data = fetch_user_nessie_data(nessie_api_key)
        if not nessie_data:
            raise NessieDataError("No Nessie data available")
        
        # Parse goal
        parsed_goal = parse_goal_with_openai(...)
        if parsed_goal.confidence < 0.5:
            raise GoalParsingError(
                f"Could not confidently parse goal: {goal_text}"
            )
        
        # Run simulation
        results = run_monte_carlo(request)
        
        return results
        
    except NessieDataError as e:
        return {"error": "Could not fetch financial data", "details": str(e)}
    except GoalParsingError as e:
        return {"error": "Could not parse goal", "details": str(e)}
    except Exception as e:
        logger.error(f"Simulation error: {e}")
        return {"error": "Simulation failed", "details": str(e)}
```

## Testing

```typescript
// Test goal parsing
describe("Goal Parsing", () => {
  it("should parse retirement goals", () => {
    const goal = parseGoal("retire in 15 years", 5000);
    expect(goal.goal_type).toBe("retirement");
    expect(goal.timeline_months).toBe(180);
    expect(goal.target_amount).toBeGreaterThan(1000000);
  });

  it("should parse house purchase goals", () => {
    const goal = parseGoal("buy a house", 5000);
    expect(goal.goal_type).toBe("house");
    expect(goal.target_amount).toBe(100000);  // 20% down
  });
});

// Test salary extraction  
describe("Salary Extraction", () => {
  it("should extract salary from recurring deposits", () => {
    const salary = extractSalary(nessieMockData);
    expect(salary).toBe(5000);
  });
});

// Test fixed simulation
describe("Simulation with Fixes", () => {
  it("should include loan payments", () => {
    const results = runSimulation(requestWithLoans);
    expect(results.success_probability).toBeLessThan(0.05);
  });

  it("should not apply returns to checking account", () => {
    const results = runSimulation(requestWithCheckingOnly);
    expect(results.percentiles.p90).toBeLessThan(startingBalance * 1.3);
  });
});
```

## Environment Variables

```bash
# .env
OPENAI_API_KEY=sk-...
NESSIE_API_KEY=4389318c54ddf318af62eda4ceed5f66
NESSIE_BASE_URL=http://api.nessieisreal.com

# Python simulation config
SIMULATION_WORKERS=4
SIMULATION_CACHE_DIR=./simulation/tests/test_data
```

## Deployment Checklist

- [ ] Update Python simulation backend with fixes
- [ ] Update TypeScript service layer with new endpoint
- [ ] Update React frontend form (only goal + risk)
- [ ] Update results page to show parsed goal
- [ ] Add error handling for parsing failures
- [ ] Add error handling for Nessie API failures
- [ ] Test with real Nessie accounts
- [ ] Test with various goal formats
- [ ] Monitor OpenAI API costs
- [ ] Add progress tracking with WebSocket
- [ ] Add logging for debugging
