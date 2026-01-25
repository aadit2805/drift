#!/usr/bin/env python3
"""
Quick test to verify assumptions are included in results.
"""

import sys
import json
sys.path.insert(0, '.')

from models import (
    FinancialProfile,
    UserInputs,
    Goal,
    SimulationRequest,
    SimulationParams
)
from monte_carlo import run_monte_carlo

def test_assumptions():
    """Test that assumptions are included in simulation results."""
    
    request = SimulationRequest(
        financial_profile=FinancialProfile(
            liquid_assets=15000,
            credit_debt=2000,
            loan_debt=0,
            monthly_loan_payments=0,
            monthly_spending=3000
        ),
        user_inputs=UserInputs(
            monthly_income=5000,
            age=30,
            risk_tolerance="medium"
        ),
        goal=Goal(
            target_amount=50000,
            timeline_months=36,
            goal_type="savings"
        ),
        simulation_params=SimulationParams(n_simulations=1000)
    )
    
    # Apply risk tolerance
    request.simulation_params = SimulationParams.from_risk_tolerance("medium", request.simulation_params)
    
    # Run simulation
    results = run_monte_carlo(request)
    
    print("=" * 60)
    print("Simulation Results with Assumptions")
    print("=" * 60)
    
    print(f"\nSuccess Probability: {results.success_probability:.1%}")
    print(f"Median Outcome: ${results.median_outcome:,.0f}")
    
    if results.assumptions:
        print("\n" + "=" * 60)
        print("Assumptions Included:")
        print("=" * 60)
        
        assumptions_dict = results.assumptions.model_dump()
        
        for key, value in assumptions_dict.items():
            # Format percentage values
            if isinstance(value, float) and value < 1:
                if 'volatility' in key or 'probability' in key or 'mean' in key or 'std' in key:
                    print(f"  {key}: {value:.2%}")
                else:
                    print(f"  {key}: {value}")
            else:
                print(f"  {key}: {value}")
        
        print("\n✓ Assumptions are properly included in results!")
        
        # Verify all required fields
        required_fields = [
            'annual_return_mean',
            'annual_return_std',
            'inflation_rate',
            'inflation_volatility',
            'annual_raise_mean',
            'annual_raise_frequency',
            'promotion_probability_semi_annual',
            'promotion_raise_mean',
            'emergency_probability_monthly',
            'emergency_amount_range',
            'income_volatility',
            'expense_volatility',
        ]
        
        missing = [f for f in required_fields if f not in assumptions_dict]
        if missing:
            print(f"\n✗ Missing fields: {missing}")
        else:
            print("✓ All required assumption fields present!")
    else:
        print("\n✗ No assumptions found in results!")
        sys.exit(1)

if __name__ == "__main__":
    test_assumptions()
