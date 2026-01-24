#!/usr/bin/env python3
"""
Quick start script for testing the Monte Carlo simulation.

This script:
1. Fetches real Nessie data (if not cached)
2. Creates a simulation request
3. Runs the simulation
4. Displays results
"""

import sys
import json
from pathlib import Path

# Add simulation directory to path
simulation_dir = Path(__file__).parent
sys.path.insert(0, str(simulation_dir))

from tests.fetch_nessie_data import get_test_data, create_simulation_request_from_nessie
from main import parse_request_from_json
from monte_carlo import run_monte_carlo
from sensitivity import run_sensitivity_analysis


def print_section(title: str):
    """Print a section header."""
    print("\n" + "=" * 70)
    print(f"  {title}")
    print("=" * 70)


def main():
    print_section("MONTE CARLO SIMULATION - QUICK START")
    
    # Step 1: Get Nessie data
    print("\n📊 Step 1: Fetching Nessie API data...")
    try:
        nessie_data = get_test_data(force_refresh=False)
        print(f"✓ Loaded {len(nessie_data.get('accounts', []))} accounts")
    except Exception as e:
        print(f"✗ Error loading Nessie data: {e}")
        print("\nUsing mock data instead...")
        # Fallback to mock data
        nessie_data = {
            'accounts': [
                {'_id': 'mock', 'type': 'Checking', 'balance': 15000},
                {'_id': 'mock2', 'type': 'Credit Card', 'balance': 2000}
            ],
            'purchases_by_account': {'mock': []},
            'deposits_by_account': {'mock': []},
            'bills_by_account': {'mock': []},
            'loans_by_account': {'mock': []}
        }
    
    # Step 2: Create simulation request
    print("\n🔧 Step 2: Creating simulation request...")
    request_dict = create_simulation_request_from_nessie(nessie_data)
    
    # Display input parameters
    print_section("INPUT PARAMETERS")
    fp = request_dict['financialProfile']
    ui = request_dict['userInputs']
    goal = request_dict['goal']
    
    starting_balance = fp['liquidAssets'] - fp['creditDebt']
    print(f"\n💰 Financial Profile:")
    print(f"   Liquid Assets:        ${fp['liquidAssets']:>10,.2f}")
    print(f"   Credit Debt:          ${fp['creditDebt']:>10,.2f}")
    print(f"   Loan Debt:            ${fp['loanDebt']:>10,.2f}")
    print(f"   ──────────────────────────────────────")
    print(f"   Starting Balance:     ${starting_balance:>10,.2f}")
    print(f"\n📊 Monthly Cash Flow:")
    print(f"   Income:               ${ui['monthlyIncome']:>10,.2f}")
    print(f"   Spending:             ${fp['monthlySpending']:>10,.2f}")
    print(f"   Loan Payments:        ${fp['monthlyLoanPayments']:>10,.2f}")
    net_monthly = ui['monthlyIncome'] - fp['monthlySpending'] - fp['monthlyLoanPayments']
    print(f"   ──────────────────────────────────────")
    print(f"   Net Monthly:          ${net_monthly:>10,.2f}")
    print(f"\n🎯 Goal:")
    print(f"   Target Amount:        ${goal['targetAmount']:>10,.2f}")
    print(f"   Timeline:             {goal['timelineMonths']:>10} months ({goal['timelineMonths']//12} years)")
    print(f"   Goal Type:            {goal['goalType']}")
    print(f"\n⚙️  Risk Profile:          {ui['riskTolerance'].upper()}")
    
    # Step 3: Parse and run simulation
    print_section("RUNNING MONTE CARLO SIMULATION")
    print("\n🔄 Running 5,000 simulations with 2 workers...")
    
    request_json = json.dumps(request_dict)
    request = parse_request_from_json(request_json)
    
    results = run_monte_carlo(request)
    
    # Display results
    print_section("SIMULATION RESULTS")
    
    print(f"\n📈 Success Probability:    {results.success_probability:>6.1%}")
    print(f"   Simulations Run:        {results.simulations_run:>10,}")
    print(f"   Workers Used:           {results.workers_used:>10}")
    
    print(f"\n💵 Projected Outcomes:")
    print(f"   Best Case (P90):        ${results.percentiles.p90:>10,.0f}")
    print(f"   Above Average (P75):    ${results.percentiles.p75:>10,.0f}")
    print(f"   Median (P50):           ${results.percentiles.p50:>10,.0f}")
    print(f"   Below Average (P25):    ${results.percentiles.p25:>10,.0f}")
    print(f"   Worst Case (P10):       ${results.percentiles.p10:>10,.0f}")
    
    print(f"\n📊 Statistics:")
    print(f"   Mean Outcome:           ${results.mean:>10,.0f}")
    print(f"   Standard Deviation:     ${results.std:>10,.0f}")
    print(f"   Range:                  ${results.worst_case:>10,.0f} to ${results.best_case:>10,.0f}")
    
    # Interpretation
    print_section("INTERPRETATION")
    
    if results.success_probability >= 0.80:
        print("\n✅ EXCELLENT! You have a strong likelihood of reaching your goal.")
    elif results.success_probability >= 0.60:
        print("\n👍 GOOD! You have a reasonable chance of success.")
    elif results.success_probability >= 0.40:
        print("\n⚠️  MODERATE. Consider adjusting your plan to improve odds.")
    else:
        print("\n❌ CHALLENGING. Significant changes may be needed to reach your goal.")
    
    gap = goal['targetAmount'] - results.median_outcome
    if gap > 0:
        print(f"\n   Median outcome is ${gap:,.0f} short of your target.")
        monthly_increase_needed = gap / goal['timelineMonths']
        print(f"   You'd need ~${monthly_increase_needed:,.0f}/month more to close the gap.")
    else:
        surplus = abs(gap)
        print(f"\n   Median outcome exceeds target by ${surplus:,.0f}!")
    
    # Step 4: Sensitivity analysis
    print_section("SENSITIVITY ANALYSIS")
    print("\n🔍 Testing different scenarios...")
    
    analysis = run_sensitivity_analysis(request)
    
    print(f"\n📊 Most Impactful Change: {analysis.most_impactful.replace('_', ' ').title()}")
    
    if analysis.recommendations:
        print("\n💡 Recommendations:")
        for i, rec in enumerate(analysis.recommendations, 1):
            print(f"   {i}. {rec}")
    else:
        print("\n✓ Your current plan looks solid!")
    
    # Display key sensitivities
    print("\n📈 Scenario Impact:")
    scenarios = [
        ('spending_minus_10', 'Reduce spending 10%'),
        ('spending_minus_20', 'Reduce spending 20%'),
        ('income_plus_10', 'Increase income 10%'),
        ('timeline_plus_6mo', 'Extend timeline 6mo'),
    ]
    
    for key, label in scenarios:
        if key in analysis.sensitivities:
            sens = analysis.sensitivities[key]
            change = sens.delta
            new_prob = sens.new_probability
            arrow = "↑" if change > 0 else "↓"
            print(f"   {label:.<30} {arrow} {abs(change):>5.1%} (to {new_prob:.1%})")
    
    print_section("COMPLETE")
    print("\n✓ Simulation finished successfully!\n")


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️  Simulation interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
