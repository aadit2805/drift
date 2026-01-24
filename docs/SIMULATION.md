# Monte Carlo Simulation Engine

## Overview

The simulation engine uses Monte Carlo methods to model financial uncertainty over time. By running thousands of simulations with random variations, we can estimate probability distributions for financial outcomes.

## How It Works

### 1. Input Parameters

The simulation takes three main inputs:

**Financial Profile** (from Nessie data):
- `liquidAssets`: Total checking + savings balances
- `creditDebt`: Credit card balances
- `monthlySpending`: Average monthly expenses
- `spendingVolatility`: How much spending varies month-to-month

**User Inputs**:
- `monthlyIncome`: Take-home pay
- `age`: User's current age
- `riskTolerance`: low/medium/high (affects investment allocation assumptions)

**Goal**:
- `targetAmount`: Dollar amount to achieve
- `timelineMonths`: Number of months to reach goal

### 2. Stochastic Variables

Each simulation run varies these parameters randomly:

| Variable | Distribution | Default Values |
|----------|--------------|----------------|
| Income | Normal(1.0, 0.05) | ±5% monthly variance |
| Spending | Normal(1.0, 0.15) | ±15% monthly variance |
| Emergency Expenses | Bernoulli(0.08) × Uniform(500, 3000) | 8% monthly chance |
| Investment Returns | Normal(0.07/12, 0.15/√12) | 7% annual ± 15% std |

### 3. Simulation Loop

For each simulation (default: 10,000):

```python
balance = starting_balance

for each month in timeline:
    # Income with variance
    income = base_income * random_normal(1.0, income_volatility)

    # Spending with variance
    spending = base_spending * random_normal(1.0, spending_volatility)

    # Random emergency (8% chance)
    if random() < 0.08:
        emergency = random_uniform(500, 3000)

    # Investment returns on positive balance
    returns = max(balance, 0) * random_normal(monthly_return, monthly_std)

    balance = balance + income - spending - emergency + returns

final_balances.append(balance)
```

### 4. Results Calculation

From the 10,000 final balances:

- **Success Probability**: % of simulations where `final_balance >= target_amount`
- **Percentiles**: p10, p25, p50 (median), p75, p90
- **Statistics**: mean, standard deviation, min, max

## HPC Implementation

### Parallelization Strategy

The simulation uses NumPy vectorization + Python multiprocessing:

1. **Vectorized Operations**: Instead of looping through simulations sequentially, we use NumPy arrays to process all simulations simultaneously:

```python
# Shape: (n_simulations, n_months)
income_noise = rng.normal(1.0, 0.05, (10000, 36))
spending_noise = rng.normal(1.0, 0.15, (10000, 36))
```

2. **Parallel Workers**: Work is split across CPU cores:

```python
with Pool(4) as pool:
    results = pool.map(run_batch, batches)
```

### Performance

| Workers | Time (10k sims) | Speedup |
|---------|-----------------|---------|
| 1 | ~800ms | 1.0x |
| 2 | ~450ms | 1.8x |
| 4 | ~250ms | 3.2x |

## Sensitivity Analysis

Runs the base simulation, then re-runs with modified parameters:

1. **Income +10%**: What if user gets a raise?
2. **Income -10%**: What if income drops?
3. **Spending -10%**: What if user cuts expenses?
4. **Spending -20%**: Aggressive expense reduction
5. **Timeline +6 months**: More time to save

The "impact" of each scenario is the change in success probability.

## Code Structure

```
simulation/
├── main.py              # CLI entry point
├── monte_carlo.py       # Core simulation engine
├── sensitivity.py       # Sensitivity analysis
├── data_processing.py   # Nessie data transformation
├── models.py            # Pydantic data models
└── requirements.txt
```

## Running Locally

```bash
# Install dependencies
cd simulation
pip install -r requirements.txt

# Run test
python ../scripts/test-simulation.py

# Run via CLI
echo '{"financialProfile": {...}, "userInputs": {...}, "goal": {...}}' | python main.py --mode simulate
```

## Mathematical Background

### Monte Carlo Integration

Monte Carlo methods approximate expectations by sampling:

```
E[f(X)] ≈ (1/N) Σ f(xᵢ)
```

For financial planning, we're estimating:
- P(final_balance > goal) = E[1{final_balance > goal}]

### Random Number Generation

We use NumPy's `default_rng()` which implements the PCG64 algorithm, providing:
- High-quality randomness
- Reproducibility via seeds
- Fast vectorized generation

### Confidence Intervals

With N=10,000 simulations, our probability estimates have standard error:

```
SE = √(p(1-p)/N) ≈ 0.5% for p=0.5
```

This means our probability estimates are accurate to within ~1-2%.
