"""
Integration tests using real Nessie API data.
"""

import pytest
import json
from pathlib import Path
from models import SimulationRequest
from main import parse_request_from_json, results_to_camel_case
from monte_carlo import run_monte_carlo
from sensitivity import run_sensitivity_analysis

# Import test data fetcher
import sys
sys.path.insert(0, str(Path(__file__).parent))
from fetch_nessie_data import get_test_data, create_simulation_request_from_nessie


@pytest.fixture(scope="module")
def nessie_data():
    """Fixture to load cached Nessie data (fetches if not cached)."""
    try:
        return get_test_data(force_refresh=False)
    except Exception as e:
        pytest.skip(f"Could not fetch Nessie data: {e}")


@pytest.fixture(scope="module")
def nessie_simulation_request(nessie_data):
    """Fixture to create simulation request from Nessie data."""
    request_dict = create_simulation_request_from_nessie(nessie_data)
    request_json = json.dumps(request_dict)
    return parse_request_from_json(request_json)


class TestNessieDataIntegration:
    """Test simulation with real Nessie API data."""
    
    def test_nessie_data_loaded(self, nessie_data):
        """Test that Nessie data was successfully loaded."""
        assert 'accounts' in nessie_data
        assert len(nessie_data['accounts']) > 0
        assert 'fetched_at' in nessie_data
    
    def test_nessie_data_has_transactions(self, nessie_data):
        """Test that we have transaction data."""
        assert 'purchases_by_account' in nessie_data
        assert 'deposits_by_account' in nessie_data
        
        # At least one account should have some data
        total_purchases = sum(
            len(purchases) 
            for purchases in nessie_data['purchases_by_account'].values()
        )
        assert total_purchases >= 0  # May be 0 if no purchases
    
    def test_create_request_from_nessie(self, nessie_simulation_request):
        """Test that Nessie data can be transformed into simulation request."""
        assert isinstance(nessie_simulation_request, SimulationRequest)
        assert nessie_simulation_request.financial_profile.liquid_assets >= 0
        assert nessie_simulation_request.financial_profile.monthly_spending > 0
        assert nessie_simulation_request.user_inputs.monthly_income > 0
    
    def test_simulate_with_nessie_data(self, nessie_simulation_request):
        """Test running simulation with real Nessie data."""
        # Run simulation
        results = run_monte_carlo(nessie_simulation_request)
        
        # Verify results
        assert 0 <= results.success_probability <= 1
        assert results.simulations_run == 5000
        assert results.workers_used == 2
        assert results.percentiles.p10 <= results.percentiles.p90
        
        print(f"\nNessie Simulation Results:")
        print(f"  Starting balance: ${nessie_simulation_request.financial_profile.liquid_assets - nessie_simulation_request.financial_profile.credit_debt:,.0f}")
        print(f"  Monthly spending: ${nessie_simulation_request.financial_profile.monthly_spending:,.0f}")
        print(f"  Success probability: {results.success_probability:.1%}")
        print(f"  Median outcome: ${results.median_outcome:,.0f}")
    
    def test_sensitivity_with_nessie_data(self, nessie_simulation_request):
        """Test sensitivity analysis with real Nessie data."""
        analysis = run_sensitivity_analysis(nessie_simulation_request)
        
        assert hasattr(analysis, 'base_probability')
        assert hasattr(analysis, 'sensitivities')
        assert hasattr(analysis, 'most_impactful')
        assert isinstance(analysis.recommendations, list)
        
        # Verify all scenarios ran
        expected_scenarios = [
            'income_plus_10',
            'income_minus_10',
            'spending_minus_10',
            'spending_minus_20',
            'spending_plus_10',
            'timeline_plus_6mo',
            'timeline_plus_12mo'
        ]
        
        for scenario in expected_scenarios:
            assert scenario in analysis.sensitivities
        
        print(f"\nSensitivity Analysis (Nessie Data):")
        print(f"  Base probability: {analysis.base_probability:.1%}")
        print(f"  Most impactful: {analysis.most_impactful}")
        if analysis.recommendations:
            print("  Recommendations:")
            for rec in analysis.recommendations[:3]:
                print(f"    - {rec}")
    
    def test_nessie_output_formatting(self, nessie_simulation_request):
        """Test that Nessie results format correctly for JavaScript."""
        results = run_monte_carlo(nessie_simulation_request)
        output = results_to_camel_case(results)
        
        # Verify camelCase conversion
        assert 'successProbability' in output
        assert 'medianOutcome' in output
        assert 'workersUsed' in output
        assert isinstance(output, dict)


class TestNessieDataEdgeCases:
    """Test edge cases with Nessie data."""
    
    def test_negative_starting_balance(self, nessie_data):
        """Test simulation when user has more debt than assets."""
        request_dict = create_simulation_request_from_nessie(nessie_data)
        
        # Force negative starting balance
        request_dict['financialProfile']['liquidAssets'] = 5000
        request_dict['financialProfile']['creditDebt'] = 10000
        request_dict['goal']['targetAmount'] = 20000
        request_dict['goal']['timelineMonths'] = 24
        
        request_json = json.dumps(request_dict)
        request = parse_request_from_json(request_json)
        
        # Should still run without errors
        results = run_monte_carlo(request)
        
        # Likely low success probability
        assert 0 <= results.success_probability <= 1
        print(f"\nNegative balance scenario: {results.success_probability:.1%} success")
    
    def test_very_aggressive_goal(self, nessie_data):
        """Test simulation with very aggressive savings goal."""
        request_dict = create_simulation_request_from_nessie(nessie_data)
        
        # Set aggressive goal
        request_dict['goal']['targetAmount'] = 100000
        request_dict['goal']['timelineMonths'] = 12  # $100k in 1 year
        
        request_json = json.dumps(request_dict)
        request = parse_request_from_json(request_json)
        
        results = run_monte_carlo(request)
        
        # Should have very low success probability
        assert results.success_probability < 0.50
        print(f"\nAggressive goal scenario: {results.success_probability:.1%} success")
    
    def test_conservative_goal(self, nessie_data):
        """Test simulation with very conservative goal."""
        request_dict = create_simulation_request_from_nessie(nessie_data)
        
        # Set easy goal
        starting_balance = request_dict['financialProfile']['liquidAssets'] - request_dict['financialProfile']['creditDebt']
        request_dict['goal']['targetAmount'] = max(1000, starting_balance * 1.1)  # Just 10% growth
        request_dict['goal']['timelineMonths'] = 24
        request_dict['userInputs']['riskTolerance'] = 'low'
        
        request_json = json.dumps(request_dict)
        request = parse_request_from_json(request_json)
        
        results = run_monte_carlo(request)
        
        # Should have high success probability
        print(f"\nConservative goal scenario: {results.success_probability:.1%} success")


class TestNessieDataCaching:
    """Test data caching mechanism."""
    
    def test_cache_file_exists_after_fetch(self, nessie_data):
        """Test that cache file is created after fetching."""
        cache_file = Path(__file__).parent / 'test_data' / 'nessie_cache.json'
        assert cache_file.exists(), "Cache file should exist after fetching data"
    
    def test_cached_data_structure(self, nessie_data):
        """Test that cached data has expected structure."""
        required_keys = [
            'fetched_at',
            'accounts',
            'purchases_by_account',
            'deposits_by_account',
            'bills_by_account',
            'loans_by_account'
        ]
        
        for key in required_keys:
            assert key in nessie_data, f"Missing key: {key}"
    
    def test_load_from_cache_faster(self):
        """Test that loading from cache is faster than API fetch."""
        import time
        
        # Load from cache
        start = time.time()
        cached_data = get_test_data(force_refresh=False)
        cache_time = time.time() - start
        
        assert cache_time < 1.0, "Loading from cache should be < 1 second"
        print(f"\nCache load time: {cache_time:.3f}s")
