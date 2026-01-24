"""
Monte Carlo Simulation Engine

This module provides high-performance Monte Carlo simulations for financial planning.
Uses NumPy vectorization and multiprocessing for parallel execution.
"""

import numpy as np
from multiprocessing import Pool, cpu_count
from typing import Tuple, Callable, Optional
from models import SimulationRequest, SimulationResults, Percentiles, SimulationParams


def run_simulation_batch(args: Tuple[SimulationRequest, np.ndarray, int]) -> Tuple[np.ndarray, int]:
    """
    Run a batch of Monte Carlo simulations.

    This function is designed to be called in parallel by multiple workers.
    """
    request, seeds, batch_id = args

    params = request.simulation_params or SimulationParams()
    n_sims = len(seeds)
    months = request.goal.timeline_months

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

    # Monthly market returns (convert annual to monthly)
    monthly_return_mean = params.annual_return_mean / 12
    monthly_return_std = params.annual_return_std / np.sqrt(12)
    market_returns = rng.normal(monthly_return_mean, monthly_return_std, (n_sims, months))

    # Run vectorized simulation
    balances = np.zeros((n_sims, months + 1))
    balances[:, 0] = starting_balance

    for month in range(months):
        # Income with variance
        income = base_income * income_noise[:, month]

        # Spending with variance
        spending = base_spending * spending_noise[:, month]

        # Emergency expenses
        emergencies = emergency_events[:, month] * emergency_amounts[:, month]

        # CRITICAL FIX #1: Include loan payments in balance calculation
        # Previously these were completely ignored, causing unrealistic scenarios
        
        # Calculate investable balance (above emergency fund threshold)
        investable_balance = np.maximum(balances[:, month] - emergency_fund_target, 0)

        # CRITICAL FIX #2: Only apply investment returns to investable portion
        # Previously returns were applied to entire balance including cash accounts
        # This caused unrealistic positive outcomes and mixed up account types
        returns = investable_balance * market_returns[:, month]

        # Update balances with all cash flows
        # The key fix: include monthly_loan_payments which was missing before
        balances[:, month + 1] = (
            balances[:, month] +
            income -
            spending -
            emergencies -
            monthly_loan_payments +  # CRITICAL FIX: Include loan payments
            returns
        )

        # Prevent unrealistic negative balances (can go negative but represents debt)
        # This is realistic - user can go into overdraft, but it costs more interest

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
            "simulations_per_second": request.simulation_params.n_simulations / elapsed
        }

    # Calculate speedup
    if 1 in results and 4 in results:
        results["speedup_4x"] = results["1_workers"]["time_seconds"] / results["4_workers"]["time_seconds"]

    return results
