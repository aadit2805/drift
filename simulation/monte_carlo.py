"""
Monte Carlo Simulation Engine

This module provides high-performance Monte Carlo simulations for financial planning.
Uses NumPy vectorization and multiprocessing for parallel execution.
"""

import numpy as np
from multiprocessing import Pool, cpu_count
from typing import Tuple, Callable, Optional
from models import SimulationRequest, SimulationResults, Percentiles, SimulationParams, Assumptions


def run_simulation_batch(args: Tuple[SimulationRequest, np.ndarray, int]) -> Tuple[np.ndarray, int]:
    """
    Run a batch of Monte Carlo simulations.

    This function is designed to be called in parallel by multiple workers.
    Supports both legacy mode and account-aware mode with per-card/loan modeling.
    """
    request, seeds, batch_id = args

    params = request.simulation_params or SimulationParams()
    n_sims = len(seeds)
    months = request.goal.timeline_months

    if months <= 0:
        raise ValueError(f"timeline_months must be positive, got {months}")

    # Initialize random state for reproducibility
    rng = np.random.default_rng(seeds[0])

    # Starting conditions
    starting_balance = (
        request.financial_profile.liquid_assets -
        request.financial_profile.credit_debt
    )
    base_income = request.user_inputs.monthly_income
    base_spending = request.financial_profile.monthly_spending
    monthly_loan_payments = request.financial_profile.monthly_loan_payments or 0.0

    # Emergency fund target (6 months of spending)
    emergency_fund_target = base_spending * 6

    # Pre-generate all random numbers for efficiency
    # Shape: (n_sims, months)
    income_noise = rng.normal(1.0, params.income_volatility, (n_sims, months))
    spending_noise = rng.normal(1.0, params.expense_volatility, (n_sims, months))
    emergency_events = rng.random((n_sims, months)) < params.emergency_probability
    emergency_amounts = rng.uniform(
        params.emergency_min,
        params.emergency_max,
        (n_sims, months)
    )

    # Inflation adjustments (monthly compounding)
    monthly_inflation = rng.normal(
        params.inflation_rate / 12,
        params.inflation_volatility / 12,
        (n_sims, months)
    )

    # Annual raises and semi-annual promotions
    # Pre-calculate which months get raises (every 12 months) and promotions (every 6 months)
    annual_raise_months = set(range(11, months, 12))  # Month 11, 23, 35, etc.
    promotion_months = set(range(5, months, 6))  # Month 5, 11, 17, 23, etc.

    annual_raises = rng.normal(
        params.annual_raise_mean,
        params.annual_raise_volatility,
        (n_sims, months)
    )

    promotion_events = rng.random((n_sims, months)) < params.promotion_probability
    promotion_raises = rng.normal(
        params.promotion_raise_mean,
        params.promotion_raise_volatility,
        (n_sims, months)
    )

    # Monthly market returns (convert annual to monthly)
    monthly_return_mean = params.annual_return_mean / 12
    monthly_return_std = params.annual_return_std / np.sqrt(12)
    market_returns = rng.normal(monthly_return_mean, monthly_return_std, (n_sims, months))

    # Run vectorized simulation
    balances = np.zeros((n_sims, months + 1))
    balances[:, 0] = starting_balance

    # Track cumulative income multiplier for raises and promotions
    income_multiplier = np.ones(n_sims)
    spending_multiplier = np.ones(n_sims)

    # Account-aware simulation: track credit card balances separately
    if params.use_account_aware_simulation and params.credit_cards:
        # Initialize credit card balances for each simulation
        # Shape: (n_sims, n_cards)
        n_cards = len(params.credit_cards)
        card_balances = np.zeros((n_sims, n_cards))
        card_aprs = np.zeros(n_cards)
        card_min_payments = np.zeros(n_cards)

        for i, card in enumerate(params.credit_cards):
            card_balances[:, i] = card.balance
            card_aprs[i] = card.apr / 100.0  # Convert percentage to decimal
            card_min_payments[i] = card.minimum_payment
    else:
        card_balances = None

    # Account-aware simulation: track loan balances separately
    if params.use_account_aware_simulation and params.loans:
        n_loans = len(params.loans)
        loan_balances = np.zeros((n_sims, n_loans))
        loan_rates = np.zeros(n_loans)
        loan_payments = np.zeros(n_loans)

        for i, loan in enumerate(params.loans):
            loan_balances[:, i] = loan.balance
            loan_rates[i] = loan.interest_rate / 100.0  # Convert percentage to decimal
            loan_payments[i] = loan.monthly_payment
    else:
        loan_balances = None

    for month in range(months):
        # Apply inflation to spending (compounds monthly)
        spending_multiplier *= (1 + monthly_inflation[:, month])

        # Apply annual raises
        if month in annual_raise_months:
            income_multiplier *= (1 + annual_raises[:, month])

        # Apply semi-annual promotion chances
        if month in promotion_months:
            promotions_this_month = promotion_events[:, month]
            income_multiplier[promotions_this_month] *= (1 + promotion_raises[:, month][promotions_this_month])

        # Income with variance, raises, and promotions
        income = base_income * income_multiplier * income_noise[:, month]

        # Spending with variance and inflation
        spending = base_spending * spending_multiplier * spending_noise[:, month]

        # Emergency expenses
        emergencies = emergency_events[:, month] * emergency_amounts[:, month]

        # Calculate investable balance (above emergency fund threshold)
        investable_balance = np.maximum(balances[:, month] - emergency_fund_target, 0)

        # Investment returns on investable portion only
        returns = investable_balance * market_returns[:, month]

        # ===== ACCOUNT-AWARE SIMULATION =====
        if params.use_account_aware_simulation:
            credit_interest = np.zeros(n_sims)
            credit_payments = np.zeros(n_sims)
            actual_loan_payments = np.zeros(n_sims)

            # Credit card interest accrual and payments
            if card_balances is not None:
                for i in range(len(params.credit_cards)):
                    # Monthly interest on outstanding balance
                    monthly_rate = card_aprs[i] / 12
                    interest = card_balances[:, i] * monthly_rate
                    credit_interest += interest

                    # Add interest to balance
                    card_balances[:, i] += interest

                    # Minimum payment reduces balance
                    payment = np.minimum(card_min_payments[i], card_balances[:, i])
                    card_balances[:, i] -= payment
                    credit_payments += payment

                    # Extra payment if positive cash flow and balance remains
                    # (Simplified: don't model extra payments in vectorized form for performance)

            # Loan interest and payments
            if loan_balances is not None:
                for i in range(len(params.loans)):
                    # Monthly interest
                    monthly_rate = loan_rates[i] / 12
                    interest = loan_balances[:, i] * monthly_rate

                    # Fixed payment covers interest + principal
                    payment = np.minimum(loan_payments[i], loan_balances[:, i] + interest)
                    principal_payment = np.maximum(0, payment - interest)

                    # Update loan balance
                    loan_balances[:, i] = np.maximum(0, loan_balances[:, i] - principal_payment)
                    actual_loan_payments += payment

            # Update balance with account-aware cash flows
            balances[:, month + 1] = (
                balances[:, month] +
                income -
                spending -
                emergencies -
                credit_interest -  # Interest cost
                credit_payments -  # Minimum payments
                actual_loan_payments +  # Loan payments
                returns
            )
        else:
            # ===== LEGACY SIMULATION =====
            # Update balances with all cash flows (original logic)
            balances[:, month + 1] = (
                balances[:, month] +
                income -
                spending -
                emergencies -
                monthly_loan_payments +  # Fixed loan payments
                returns
            )

    return balances[:, -1], batch_id  # Return final balances with batch id


def run_monte_carlo(
    request: SimulationRequest,
    n_workers: int = None,
    progress_callback: Optional[Callable[[dict], None]] = None
) -> SimulationResults:
    """
    Run full Monte Carlo simulation with parallel workers.

    Args:
        request: Simulation request containing financial profile, inputs, and goal
        n_workers: Number of parallel workers (defaults to CPU count)

    Returns:
        SimulationResults with probability distributions and statistics
    """
    params = request.simulation_params or SimulationParams()
    n_simulations = params.n_simulations

    if n_workers is None:
        n_workers = min(cpu_count(), 4)  # Cap at 4 for demo

    # Generate seeds for reproducibility
    seeds = np.arange(n_simulations)

    # Split work across workers
    batches = np.array_split(seeds, n_workers)
    batch_args = [(request, batch, i) for i, batch in enumerate(batches)]

    # Run parallel simulations with progress reporting
    if n_workers > 1:
        results_list = []
        completed = 0
        with Pool(n_workers) as pool:
            for balances, batch_id in pool.imap_unordered(run_simulation_batch, batch_args):
                results_list.append(balances)
                completed += len(balances)
                if progress_callback:
                    progress_callback({
                        "type": "progress",
                        "completed": int(completed),
                        "total": int(n_simulations),
                        "worker": int(batch_id),
                        "percentage": round(completed / n_simulations * 100, 2)
                    })
        final_balances = np.concatenate(results_list)
    else:
        final_balances, batch_id = run_simulation_batch(batch_args[0])
        if progress_callback:
            progress_callback({
                "type": "progress",
                "completed": int(n_simulations),
                "total": int(n_simulations),
                "worker": int(batch_id),
                "percentage": 100.0
            })

    # Calculate statistics
    sorted_balances = np.sort(final_balances)

    success_count = np.sum(final_balances >= request.goal.target_amount)
    success_probability = success_count / n_simulations

    percentiles = Percentiles(
        p10=float(np.percentile(sorted_balances, 10)),
        p25=float(np.percentile(sorted_balances, 25)),
        p50=float(np.percentile(sorted_balances, 50)),
        p75=float(np.percentile(sorted_balances, 75)),
        p90=float(np.percentile(sorted_balances, 90)),
    )
    
    # Build assumptions for transparency
    assumptions = Assumptions(
        annual_return_mean=params.annual_return_mean,
        annual_return_std=params.annual_return_std,
        inflation_rate=params.inflation_rate,
        inflation_volatility=params.inflation_volatility,
        annual_raise_mean=params.annual_raise_mean,
        annual_raise_frequency="Annual (every 12 months)",
        promotion_probability_semi_annual=params.promotion_probability,
        promotion_raise_mean=params.promotion_raise_mean,
        emergency_probability_monthly=params.emergency_probability,
        emergency_amount_range=f"${params.emergency_min:,.0f} - ${params.emergency_max:,.0f}",
        income_volatility=params.income_volatility,
        expense_volatility=params.expense_volatility,
    )

    return SimulationResults(
        success_probability=float(success_probability),
        median_outcome=float(percentiles.p50),
        percentiles=percentiles,
        mean=float(np.mean(final_balances)),
        std=float(np.std(final_balances)),
        worst_case=float(sorted_balances[0]),
        best_case=float(sorted_balances[-1]),
        simulations_run=n_simulations,
        workers_used=n_workers,
        assumptions=assumptions,
    )


def benchmark_simulation(request: SimulationRequest) -> dict:
    """
    Benchmark simulation performance with different worker counts.
    """
    import time

    results = {}

    for n_workers in [1, 2, 4]:
        start = time.time()
        run_monte_carlo(request, n_workers=n_workers)
        elapsed = time.time() - start

        results[f"{n_workers}_workers"] = {
            "time_seconds": elapsed,
            "simulations_per_second": request.simulation_params.n_simulations / elapsed if elapsed > 0 else float('inf')
        }

    # Calculate speedup
    if 1 in results and 4 in results:
        results["speedup_4x"] = results["1_workers"]["time_seconds"] / results["4_workers"]["time_seconds"]

    return results
