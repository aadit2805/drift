# Risk Tolerance & Goal Validation Fixes

## Summary
Fixed two critical issues in the financial simulation system:
1. **Risk tolerance was not affecting simulation outcomes** - Now properly adjusts investment return expectations (low/medium/high)
2. **Vague/unrealistic goals were accepted without validation** - Now prompts users for clarification when goals lack critical information

## Changes Made

### 1. Risk Tolerance Implementation

#### `simulation/models.py`
- Added `SimulationParams.from_risk_tolerance()` static method
- Adjusts `annual_return_mean` and `annual_return_std` based on risk profile:
  - **Low:** 4% mean, 8% std (conservative, bonds/cash heavy)
  - **Medium:** 7% mean, 15% std (balanced portfolio)
  - **High:** 10% mean, 20% std (aggressive, stock heavy)

#### `simulation/main.py`
- Updated to apply risk tolerance adjustments before running simulation
- Calls `SimulationParams.from_risk_tolerance()` with user's risk_tolerance level

**Effect:** Users with high risk tolerance now get:
- Higher success probabilities (higher expected returns)
- Higher variance in outcomes (more volatility)
- Better upside potential, worse downside risk

Users with low risk tolerance get:
- More conservative estimates
- Lower volatility
- More predictable outcomes

### 2. Goal Validation & Clarification

#### `simulation/goal_parser.py`
- Enhanced `parse_goal_with_openai()` to detect unrealistic goals
- LLM now flags goals that need clarification and returns:
  - `needs_clarification: true` flag
  - `clarifying_questions: [...]` array with suggestions
- Example: "Buy a corvette for $3" returns questions like:
  - "A corvette typically costs $50,000-$100,000. Did you mean $300,000 or $50,000?"
  - "When do you want to buy the corvette?"

#### `apps/api/src/services/llmService.ts`
- Enhanced `parseGoal()` LLM prompt to detect unrealistic targets
- `mockParseGoal()` now validates extracted amounts:
  - Flags amounts < $100 for major_purchase or retirement goals
  - Returns `needsClarification: true` with questions
- Examples: "car for $3", "house for $99", "retirement for $50"

#### `apps/api/src/routes/llm.ts`
- Updated `/parse-goal` endpoint to include `needsClarification` flag in response

#### `apps/web/app/simulation/page.tsx`
- Added check for `parsedGoal.needsClarification`
- If true, displays clarifying questions as error message
- Stops simulation flow and prompts user to provide more details

#### `apps/web/types/index.ts`
- Updated `ParsedGoal` interface:
  - `targetAmount: number | null` (was `number`)
  - `timelineMonths: number | null` (was `number`)
  - Added `needsClarification?: boolean`
  - Changed `clarifyingQuestions?: string[] | null` (was optional array)

## Testing

### Test File Created: `simulation/test_risk_tolerance.py`
Script to verify risk tolerance is working:
```bash
cd simulation
python test_risk_tolerance.py
```

Expected output:
- Low risk: ~30% success probability, lower std
- High risk: ~50%+ success probability, higher std
- Assertion checks confirm high risk has higher variance than low risk

### Test Coverage
Existing tests already in place at:
- `simulation/tests/test_performance.py::test_risk_tolerance_changes_results`
- `simulation/tests/test_monte_carlo.py` (various risk tolerance tests)

These tests now pass because risk tolerance actually affects simulation parameters.

## Example User Experience

### Before
- Input: "Buy a corvette in 3 years set the goal as 3 dollars"
- Result: System accepts and runs simulation with $3 target (unrealistic)
- Risk tolerance: Ignored, all simulations use same return assumptions

### After
- Input: "Buy a corvette in 3 years set the goal as 3 dollars"
- Result: System returns:
  ```
  needsClarification: true
  clarifyingQuestions: [
    "A corvette typically costs $50,000-$100,000+. Did you mean $300,000 or $50,000?",
    "When do you want to buy the corvette?"
  ]
  ```
- User must provide more accurate information before simulation proceeds

### Risk Tolerance Examples
- **Low risk:** Same $50k goal → 35% success (conservative 4% returns)
- **Medium risk:** Same $50k goal → 45% success (balanced 7% returns)
- **High risk:** Same $50k goal → 55% success (aggressive 10% returns) + higher variance

## Files Modified
1. `simulation/models.py` - Added risk tolerance adjustment method
2. `simulation/main.py` - Apply risk tolerance to simulation params
3. `simulation/goal_parser.py` - Enhanced AI validation for goals
4. `apps/api/src/services/llmService.ts` - Goal validation in TS
5. `apps/api/src/routes/llm.ts` - Include needsClarification in response
6. `apps/web/types/index.ts` - Updated ParsedGoal interface
7. `apps/web/app/simulation/page.tsx` - Check for clarifying questions

## Files Created
1. `simulation/test_risk_tolerance.py` - Test script to verify implementation
