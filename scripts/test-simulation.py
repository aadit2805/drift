#!/usr/bin/env python3
"""
Test script for the Monte Carlo simulation engine.
Runs a sample simulation and prints results.
"""

import sys
import os

# Add simulation directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'simulation'))

from models import SimulationRequest, FinancialProfile, UserInputs, Goal, SimulationParams
from monte_carlo import run_monte_carlo, benchmark_simulation
from sensitivity import run_sensitivity_analysis


def create_sample_request() -> SimulationRequest:
    """Create a sample simulation request for testing."""
    return SimulationRequest(
        financial_profile=FinancialProfile(
            liquid_assets=13500,  # $5500 checking + $8000 savings
            credit_debt=1200,
            loan_debt=15000,
            monthly_loan_payments=350,
            monthly_spending=3200,
            spending_by_category={
                'Groceries': 400,
                'Dining': 250,
                'Gas': 150,
                'Shopping': 200,
                'Entertainment': 50,
                'Health': 100,
                'Transport': 80,
                'Bills': 2000,
            },
            spending_volatility=0.15,
        ),
        user_inputs=UserInputs(
            monthly_income=5000,
            age=30,
            risk_tolerance='medium',
        ),
        goal=Goal(
            target_amount=50000,
            timeline_months=36,
            goal_type='major_purchase',
        ),
        simulation_params=SimulationParams(
            n_simulations=10000,
        ),
    )


def main():
    print("=" * 60)
    print("Monte Carlo Financial Simulation - Test Suite")
    print("=" * 60)
    print()

    request = create_sample_request()

    # Display input parameters
    print("📊 Input Parameters:")
    print(f"  Starting Balance: ${request.financial_profile.liquid_assets - request.financial_profile.credit_debt:,.0f}")
    print(f"  Monthly Income: ${request.user_inputs.monthly_income:,.0f}")
    print(f"  Monthly Spending: ${request.financial_profile.monthly_spending:,.0f}")
    print(f"  Monthly Savings Potential: ${request.user_inputs.monthly_income - request.financial_profile.monthly_spending:,.0f}")
    print(f"  Goal: ${request.goal.target_amount:,.0f} in {request.goal.timeline_months} months")
    print()

    # Run basic simulation
    print("🔄 Running Monte Carlo simulation (10,000 scenarios)...")
    results = run_monte_carlo(request, n_workers=4)
    print("✅ Simulation complete!")
    print()

    # Display results
    print("📈 Results:")
    print(f"  Success Probability: {results.success_probability:.1%}")
    print(f"  Median Outcome: ${results.median_outcome:,.0f}")
    print()
    print("  Percentile Distribution:")
    print(f"    10th percentile (worst): ${results.percentiles.p10:,.0f}")
    print(f"    25th percentile: ${results.percentiles.p25:,.0f}")
    print(f"    50th percentile (median): ${results.percentiles.p50:,.0f}")
    print(f"    75th percentile: ${results.percentiles.p75:,.0f}")
    print(f"    90th percentile (best): ${results.percentiles.p90:,.0f}")
    print()
    print(f"  Workers Used: {results.workers_used}")
    print(f"  Simulations Run: {results.simulations_run:,}")
    print()

    # Run benchmark
    print("⏱️  Running performance benchmark...")
    benchmark = benchmark_simulation(request)
    print("  Results:")
    for key, value in benchmark.items():
        if isinstance(value, dict):
            print(f"    {key}: {value['time_seconds']:.3f}s ({value['simulations_per_second']:.0f} sims/sec)")
        else:
            print(f"    {key}: {value:.2f}x")
    print()

    # Run sensitivity analysis
    print("🔍 Running sensitivity analysis...")
    sensitivity = run_sensitivity_analysis(request)
    print("✅ Analysis complete!")
    print()
    print("📊 Sensitivity Results:")
    print(f"  Base Probability: {sensitivity.base_probability:.1%}")
    print()
    print("  Scenario Impacts:")
    for param, result in sorted(sensitivity.sensitivities.items(), key=lambda x: -x[1].impact):
        direction = "↑" if result.delta > 0 else "↓"
        print(f"    {param}: {result.new_probability:.1%} ({direction}{abs(result.delta):.1%})")
    print()
    print(f"  Most Impactful: {sensitivity.most_impactful}")
    print()
    print("  Recommendations:")
    for rec in sensitivity.recommendations:
        print(f"    • {rec}")
    print()

    print("=" * 60)
    print("✅ All tests complete!")
    print("=" * 60)


if __name__ == '__main__':
    main()
