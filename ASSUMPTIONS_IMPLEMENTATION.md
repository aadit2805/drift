# Simulation Assumptions Display - Implementation Summary

## Overview
Added comprehensive simulation assumptions tracking and display. Users can now see exactly what parameters and rates are being used in the Monte Carlo simulations, including:
- Investment return expectations
- Inflation rates
- Income growth (raises and promotions)
- Emergency/shock expenses

## Changes Made

### Backend - Python

#### `simulation/models.py`
- Added new `Assumptions` model class with fields:
  - `annual_return_mean` / `annual_return_std` - Investment return assumptions
  - `inflation_rate` / `inflation_volatility` - Inflation parameters
  - `annual_raise_mean` / `annual_raise_frequency` - Annual income raises
  - `promotion_probability_semi_annual` / `promotion_raise_mean` - Promotion parameters
  - `emergency_probability_monthly` / `emergency_amount_range` - Shock expenses
  - `income_volatility` / `expense_volatility` - Economic volatility

- Updated `SimulationResults` model to include optional `assumptions: Optional[Assumptions] = None` field

#### `simulation/monte_carlo.py`
- Imported `Assumptions` from models
- Updated `run_monte_carlo()` function to:
  - Extract all relevant parameters from `SimulationParams`
  - Create `Assumptions` object with human-readable formatting
  - Return `Assumptions` in `SimulationResults`

Example assumptions generated:
```python
Assumptions(
    annual_return_mean=0.07,
    annual_return_std=0.15,
    inflation_rate=0.025,
    inflation_volatility=0.01,
    annual_raise_mean=0.03,
    annual_raise_frequency="Annual (every 12 months)",
    promotion_probability_semi_annual=0.15,
    promotion_raise_mean=0.08,
    emergency_probability_monthly=0.08,
    emergency_amount_range="$500 - $3,000",
    income_volatility=0.05,
    expense_volatility=0.15,
)
```

### Backend - TypeScript/Node.js

#### `apps/api/src/types/index.ts`
- Added `Assumptions` interface matching Python model
- Updated `SimulationResults` interface to include optional `assumptions?: Assumptions`
- All field names converted to camelCase for JavaScript convention

### Frontend - React

#### `apps/web/types/index.ts`
- Added `Assumptions` interface (camelCase version of Python model)
- Updated `SimulationResults` type to include optional `assumptions`

#### `apps/web/components/AssumptionsDisplay.tsx` (NEW)
- Created reusable component to display all simulation assumptions
- Organized assumptions into logical sections:
  - **Investment Returns**: Annual return mean and volatility
  - **Inflation**: Expected rate and volatility
  - **Income Growth**: Annual raises, promotion frequency, and promotion raises
  - **Income & Spending**: Volatility factors
  - **Emergency Expenses**: Shock event probability and amount range
- Displays in a 2-column responsive grid layout
- Shows percentages, currency ranges, and frequencies
- Includes helpful context (e.g., "Average 1 emergency event per X years")

#### `apps/web/app/results/page.tsx`
- Imported `AssumptionsDisplay` component
- Imported `Assumptions` type
- Added assumptions display section above the existing assumptions detail section
- Assumptions automatically populated from simulation results

#### `apps/web/app/simulation/page.tsx`
- Already stores `simulationResults.assumptions` in localStorage
- Passes assumptions through to results page

## User Experience

### Before
- Users only saw success probability and outcome percentiles
- No transparency on what parameters were assumed
- Users couldn't understand how risk tolerance affected results

### After
- Full transparency on all simulation parameters
- Clear display of:
  - Expected investment returns (varies by risk tolerance)
  - Inflation assumptions
  - Income growth expectations (raises + promotions)
  - Shock expense probabilities and ranges
- Users understand exactly what assumptions drove the results
- Can make informed decisions about changing parameters

## Example Display

The AssumptionsDisplay component shows:
```
INVESTMENT RETURNS
├─ Annual Return (mean): 7.0%
└─ Volatility (std): 15.0%

INFLATION
├─ Expected Rate: 2.50%
└─ Volatility: ±1.00%

INCOME GROWTH
├─ Annual Raise: 3.0%
├─ Frequency: Annual (every 12 months)
├─ Promotion (every 6 months): 15% chance
└─ Promotion Raise: 8.0%

INCOME & SPENDING
├─ Income Volatility: ±5.0%
└─ Spending Volatility: ±15.0%

EMERGENCY EXPENSES (SHOCK EVENTS)
├─ Probability per month: 8.0%
├─ Amount range: $500 - $3,000
└─ Average 1 emergency event per 1 years
```

## Testing

### Test Script: `simulation/test_assumptions.py`
Verifies that:
- Assumptions object is created and populated
- All required fields are present
- Values are formatted correctly
- Assumptions are included in SimulationResults

Run with:
```bash
cd simulation
python test_assumptions.py
```

## Files Modified

### Python Backend
1. `simulation/models.py` - Added Assumptions model, updated SimulationResults
2. `simulation/monte_carlo.py` - Populate assumptions in results

### TypeScript/Node Backend
1. `apps/api/src/types/index.ts` - Added Assumptions interface

### React Frontend
1. `apps/web/types/index.ts` - Added Assumptions interface
2. `apps/web/components/AssumptionsDisplay.tsx` - NEW component
3. `apps/web/app/results/page.tsx` - Added assumptions display
4. `apps/web/app/simulation/page.tsx` - No changes (already stores assumptions)

## Files Created
1. `simulation/test_assumptions.py` - Test script for assumptions

## Integration Points

1. **Risk Tolerance Integration**: Assumptions now reflect the risk-adjusted investment returns
   - Low risk: 4% mean, 8% std
   - Medium risk: 7% mean, 15% std
   - High risk: 10% mean, 20% std

2. **Sensitivity Analysis**: Assumptions passed through to sensitivity results

3. **LocalStorage**: Assumptions saved and restored with simulation results

## Future Enhancements

Potential improvements:
- Allow users to customize assumptions for "what-if" scenarios
- Show assumptions adjustments when risk tolerance changes
- Add educational tooltips explaining each assumption
- Generate assumption presets for different user profiles (conservative, moderate, aggressive)
