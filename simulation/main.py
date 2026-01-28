#!/usr/bin/env python3
"""
Monte Carlo Finance - Simulation Engine Entry Point

This module provides CLI and programmatic access to the Monte Carlo simulation engine.
"""

import argparse
import json
import sys

from models import SimulationRequest, SimulationParams, FinancialProfile, UserInputs, Goal
from monte_carlo import run_monte_carlo, benchmark_simulation
from sensitivity import run_sensitivity_analysis


def parse_request_from_json(json_str: str) -> SimulationRequest:
    """Parse a JSON string into a SimulationRequest."""
    data = json.loads(json_str)

    # Handle camelCase to snake_case conversion
    financial_profile = data.get('financialProfile', data.get('financial_profile', {}))
    user_inputs = data.get('userInputs', data.get('user_inputs', {}))
    goal = data.get('goal', {})
    sim_params = data.get('simulationParams', data.get('simulation_params'))

    return SimulationRequest(
        financial_profile=FinancialProfile(
            liquid_assets=financial_profile.get('liquidAssets', financial_profile.get('liquid_assets', 0)),
            credit_debt=financial_profile.get('creditDebt', financial_profile.get('credit_debt', 0)),
            loan_debt=financial_profile.get('loanDebt', financial_profile.get('loan_debt', 0)),
            monthly_loan_payments=financial_profile.get('monthlyLoanPayments', financial_profile.get('monthly_loan_payments', 0)),
            monthly_spending=financial_profile.get('monthlySpending', financial_profile.get('monthly_spending', 3000)),
            spending_by_category=financial_profile.get('spendingByCategory', financial_profile.get('spending_by_category', {})),
            spending_volatility=financial_profile.get('spendingVolatility', financial_profile.get('spending_volatility', 0.15)),
        ),
        user_inputs=UserInputs(
            monthly_income=user_inputs.get('monthlyIncome', user_inputs.get('monthly_income', 5000)),
            age=user_inputs.get('age', 30),
            risk_tolerance=user_inputs.get('riskTolerance', user_inputs.get('risk_tolerance', 'medium')),
        ),
        goal=Goal(
            target_amount=goal.get('targetAmount', goal.get('target_amount', 50000)),
            timeline_months=goal.get('timelineMonths', goal.get('timeline_months', 36)),
            goal_type=goal.get('goalType', goal.get('goal_type', 'savings')),
        ),
        simulation_params=SimulationParams(**sim_params) if sim_params else None,
    )


def results_to_camel_case(results) -> dict:
    """Convert results to camelCase for JavaScript consumption."""
    if hasattr(results, 'model_dump'):
        data = results.model_dump()
    else:
        data = results

    def to_camel_case(snake_str: str) -> str:
        components = snake_str.split('_')
        return components[0] + ''.join(x.title() for x in components[1:])

    def convert_dict(d):
        if isinstance(d, dict):
            return {to_camel_case(k): convert_dict(v) for k, v in d.items()}
        elif isinstance(d, list):
            return [convert_dict(item) for item in d]
        else:
            return d

    return convert_dict(data)


def main():
    parser = argparse.ArgumentParser(description='Monte Carlo Financial Simulation Engine')
    parser.add_argument('--mode', choices=['simulate', 'sensitivity', 'benchmark'],
                        default='simulate', help='Operation mode')
    parser.add_argument('--input', type=str, help='JSON input string')
    parser.add_argument('--input-file', type=str, help='Path to JSON input file')
    parser.add_argument('--workers', type=int, default=4, help='Number of parallel workers')
    parser.add_argument('--output-format', choices=['json', 'pretty'], default='json',
                        help='Output format')

    args = parser.parse_args()

    # Get input
    if args.input:
        input_json = args.input
    elif args.input_file:
        with open(args.input_file, 'r') as f:
            input_json = f.read()
    else:
        # Read from stdin
        input_json = sys.stdin.read()

    try:
        request = parse_request_from_json(input_json)
    except Exception as e:
        print(json.dumps({'error': f'Failed to parse input: {str(e)}'}), file=sys.stderr)
        sys.exit(1)

    # Execute requested operation
    try:
        if args.mode == 'simulate':
            # Apply risk tolerance adjustments if not already set via simulation_params
            if request.simulation_params is None:
                request.simulation_params = SimulationParams()
            
            # Adjust returns based on risk tolerance
            request.simulation_params = SimulationParams.from_risk_tolerance(
                request.user_inputs.risk_tolerance,
                base_params=request.simulation_params
            )
            
            results = run_monte_carlo(request, n_workers=args.workers)
            output = results_to_camel_case(results)

        elif args.mode == 'sensitivity':
            results = run_sensitivity_analysis(request)
            output = results_to_camel_case(results)

        elif args.mode == 'benchmark':
            output = benchmark_simulation(request)

        # Output results
        if args.output_format == 'pretty':
            print(json.dumps(output, indent=2))
        else:
            print(json.dumps(output))

    except Exception as e:
        print(json.dumps({'error': str(e)}), file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
