#!/usr/bin/env python3
"""
Quick test to verify risk tolerance is affecting simulation results.
"""

import sys
sys.path.insert(0, '.')

from models import (
    FinancialProfile,
    UserInputs,
    Goal,
    SimulationRequest,
    SimulationParams
)
from monte_carlo import run_monte_carlo

def test_risk_tolerance():
    """Test that different risk tolerances produce different results."""

    base_request = {
        'financial_profile': FinancialProfile(
            liquid_assets=15000,
            credit_debt=2000,
            loan_debt=0,
            monthly_loan_payments=0,
            monthly_spending=3000
        ),
        'goal': Goal(
            target_amount=50000,
            timeline_months=36,
            goal_type="savings"
        ),
        'simulation_params': SimulationParams(n_simulations=5000)
    }

    # Test with low risk tolerance
    print("=" * 60)
    print("Testing LOW risk tolerance")
    print("=" * 60)
    request_low = SimulationRequest(
        **base_request,
        user_inputs=UserInputs(
            monthly_income=5000,
            age=30,
            risk_tolerance="low"
        )
    )

    # Apply risk tolerance adjustments
    request_low.simulation_params = SimulationParams.from_risk_tolerance("low", request_low.simulation_params)
    print(f"Low risk - Annual return mean: {request_low.simulation_params.annual_return_mean:.2%}")
    print(f"Low risk - Annual return std: {request_low.simulation_params.annual_return_std:.2%}")

    results_low = run_monte_carlo(request_low)
    print(f"\nResults:")
    print(f"  Success probability: {results_low.success_probability:.1%}")
    print(f"  Median outcome: ${results_low.median_outcome:,.0f}")
    print(f"  Std deviation: ${results_low.std:,.0f}")
    print(f"  P10: ${results_low.percentiles.p10:,.0f}")
    print(f"  P90: ${results_low.percentiles.p90:,.0f}")

    # Test with high risk tolerance
    print("\n" + "=" * 60)
    print("Testing HIGH risk tolerance")
    print("=" * 60)
    request_high = SimulationRequest(
        **base_request,
        user_inputs=UserInputs(
            monthly_income=5000,
            age=30,
            risk_tolerance="high"
        )
    )

    # Apply risk tolerance adjustments
    request_high.simulation_params = SimulationParams.from_risk_tolerance("high", request_high.simulation_params)
    print(f"High risk - Annual return mean: {request_high.simulation_params.annual_return_mean:.2%}")
    print(f"High risk - Annual return std: {request_high.simulation_params.annual_return_std:.2%}")

    results_high = run_monte_carlo(request_high)
    print(f"\nResults:")
    print(f"  Success probability: {results_high.success_probability:.1%}")
    print(f"  Median outcome: ${results_high.median_outcome:,.0f}")
    print(f"  Std deviation: ${results_high.std:,.0f}")
    print(f"  P10: ${results_high.percentiles.p10:,.0f}")
    print(f"  P90: ${results_high.percentiles.p90:,.0f}")

    # Analysis
    print("\n" + "=" * 60)
    print("Analysis")
    print("=" * 60)

    success_diff = results_high.success_probability - results_low.success_probability
    std_diff = results_high.std - results_low.std

    print(f"Success probability difference: {success_diff:+.1%}")
    print(f"Standard deviation difference: ${std_diff:+,.0f}")

    # Assertions
    assert results_low.success_probability != results_high.success_probability, "Success probabilities should differ"
    assert results_high.std > results_low.std, "High risk should have higher std than low risk"
    assert results_high.success_probability > results_low.success_probability, "High risk should have higher success probability"

    print("\n✓ All tests passed! Risk tolerance is affecting the simulation.")

if __name__ == "__main__":
    test_risk_tolerance()
