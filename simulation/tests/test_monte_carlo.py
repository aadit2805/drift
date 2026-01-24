"""
Unit tests for monte_carlo simulation engine.
"""

import pytest
import numpy as np
from models import (
    FinancialProfile,
    UserInputs,
    Goal,
    SimulationRequest,
    SimulationParams
)
from monte_carlo import (
    get_worker_count,
    run_simulation_batch,
    run_monte_carlo
)


class TestWorkerAllocation:
    """Test worker count allocation logic."""
    
    def test_5000_sims_uses_2_workers(self):
        """Test that 5000 simulations use 2 workers."""
        assert get_worker_count(5000) == 2
    
    def test_50000_sims_uses_4_workers(self):
        """Test that 50000 simulations use 4 workers."""
        assert get_worker_count(50000) == 4
    
    def test_small_count_uses_2_workers(self):
        """Test that counts <= 5000 use 2 workers."""
        assert get_worker_count(1000) == 2
        assert get_worker_count(100) == 2
    
    def test_large_count_uses_4_workers(self):
        """Test that counts > 5000 use 4 workers."""
        assert get_worker_count(10000) == 4
        assert get_worker_count(100000) == 4


class TestSimulationBatch:
    """Test individual simulation batch execution."""
    
    def create_test_request(self, **overrides):
        """Helper to create a test simulation request."""
        defaults = {
            'financial_profile': FinancialProfile(
                liquid_assets=10000,
                credit_debt=1000,
                loan_debt=0,
                monthly_loan_payments=0,
                monthly_spending=2000
            ),
            'user_inputs': UserInputs(
                monthly_income=5000,
                age=30,
                risk_tolerance="medium"
            ),
            'goal': Goal(
                target_amount=20000,
                timeline_months=12,
                goal_type="savings"
            ),
            'simulation_params': SimulationParams(n_simulations=100)
        }
        defaults.update(overrides)
        return SimulationRequest(**defaults)
    
    def test_batch_returns_correct_shape(self):
        """Test that batch returns one balance per simulation."""
        request = self.create_test_request()
        seeds = np.arange(100)
        
        balances = run_simulation_batch((request, seeds, 0))
        
        assert len(balances) == 100
        assert isinstance(balances, np.ndarray)
    
    def test_batch_reproducibility(self):
        """Test that same seeds produce same results."""
        request = self.create_test_request()
        seeds = np.arange(50)
        
        balances1 = run_simulation_batch((request, seeds, 0))
        balances2 = run_simulation_batch((request, seeds, 0))
        
        np.testing.assert_array_equal(balances1, balances2)
    
    def test_different_seeds_different_results(self):
        """Test that different seeds produce different results."""
        request = self.create_test_request()
        seeds1 = np.arange(50)
        seeds2 = np.arange(50, 100)
        
        balances1 = run_simulation_batch((request, seeds1, 0))
        balances2 = run_simulation_batch((request, seeds2, 1))
        
        # Results should be different (extremely unlikely to be identical)
        assert not np.array_equal(balances1, balances2)
    
    def test_positive_income_increases_balance(self):
        """Test that positive income generally increases balance."""
        request = self.create_test_request(
            financial_profile=FinancialProfile(
                liquid_assets=10000,
                credit_debt=0,
                loan_debt=0,
                monthly_loan_payments=0,
                monthly_spending=1000  # Less than income
            ),
            user_inputs=UserInputs(
                monthly_income=5000,  # Much more than spending
                age=30,
                risk_tolerance="low"  # Low volatility
            )
        )
        seeds = np.arange(100)
        
        balances = run_simulation_batch((request, seeds, 0))
        
        # Starting balance: 10000
        # Most simulations should end higher
        assert np.median(balances) > 10000


class TestMonteCarloSimulation:
    """Test full Monte Carlo simulation."""
    
    def create_test_request(self, n_simulations=5000, **overrides):
        """Helper to create a test simulation request."""
        defaults = {
            'financial_profile': FinancialProfile(
                liquid_assets=15000,
                credit_debt=2000,
                loan_debt=0,
                monthly_loan_payments=0,
                monthly_spending=3000
            ),
            'user_inputs': UserInputs(
                monthly_income=5000,
                age=30,
                risk_tolerance="medium"
            ),
            'goal': Goal(
                target_amount=50000,
                timeline_months=36,
                goal_type="savings"
            ),
            'simulation_params': SimulationParams(n_simulations=n_simulations)
        }
        defaults.update(overrides)
        return SimulationRequest(**defaults)
    
    def test_simulation_5000_uses_2_workers(self):
        """Test that 5000 simulation request uses 2 workers."""
        request = self.create_test_request(n_simulations=5000)
        results = run_monte_carlo(request)
        
        assert results.workers_used == 2
        assert results.simulations_run == 5000
    
    def test_simulation_50000_uses_4_workers(self):
        """Test that 50000 simulation request uses 4 workers."""
        request = self.create_test_request(n_simulations=50000)
        results = run_monte_carlo(request)
        
        assert results.workers_used == 4
        assert results.simulations_run == 50000
    
    def test_results_have_all_fields(self):
        """Test that results contain all required fields."""
        request = self.create_test_request(n_simulations=5000)
        results = run_monte_carlo(request)
        
        assert hasattr(results, 'success_probability')
        assert hasattr(results, 'median_outcome')
        assert hasattr(results, 'percentiles')
        assert hasattr(results, 'mean')
        assert hasattr(results, 'std')
        assert hasattr(results, 'worst_case')
        assert hasattr(results, 'best_case')
    
    def test_probability_in_valid_range(self):
        """Test that success probability is between 0 and 1."""
        request = self.create_test_request(n_simulations=5000)
        results = run_monte_carlo(request)
        
        assert 0 <= results.success_probability <= 1
    
    def test_percentiles_ordered(self):
        """Test that percentiles are in ascending order."""
        request = self.create_test_request(n_simulations=5000)
        results = run_monte_carlo(request)
        
        p = results.percentiles
        assert p.p10 <= p.p25 <= p.p50 <= p.p75 <= p.p90
    
    def test_median_equals_p50(self):
        """Test that median outcome equals p50 percentile."""
        request = self.create_test_request(n_simulations=5000)
        results = run_monte_carlo(request)
        
        assert results.median_outcome == results.percentiles.p50
    
    def test_worst_case_less_than_best_case(self):
        """Test that worst case is less than best case."""
        request = self.create_test_request(n_simulations=5000)
        results = run_monte_carlo(request)
        
        assert results.worst_case <= results.best_case
    
    def test_reproducibility_with_progress_callback(self):
        """Test that results are reproducible even with progress callback."""
        request = self.create_test_request(n_simulations=5000)
        
        results1 = run_monte_carlo(request)
        results2 = run_monte_carlo(request)
        
        # Should be identical (deterministic seeds)
        assert results1.success_probability == results2.success_probability
        assert results1.median_outcome == results2.median_outcome
    
    def test_easy_goal_high_success_probability(self):
        """Test that easy goals have high success probability."""
        request = self.create_test_request(
            n_simulations=5000,
            financial_profile=FinancialProfile(
                liquid_assets=20000,
                credit_debt=0,
                loan_debt=0,
                monthly_loan_payments=0,
                monthly_spending=2000
            ),
            user_inputs=UserInputs(
                monthly_income=6000,
                age=30,
                risk_tolerance="low"  # Conservative
            ),
            goal=Goal(
                target_amount=25000,  # Easy to reach
                timeline_months=12,
                goal_type="savings"
            )
        )
        
        results = run_monte_carlo(request)
        
        # Should have very high success probability
        assert results.success_probability > 0.80
    
    def test_impossible_goal_low_success_probability(self):
        """Test that impossible goals have low success probability."""
        request = self.create_test_request(
            n_simulations=5000,
            financial_profile=FinancialProfile(
                liquid_assets=1000,
                credit_debt=0,
                loan_debt=0,
                monthly_loan_payments=0,
                monthly_spending=4000
            ),
            user_inputs=UserInputs(
                monthly_income=4500,  # Barely covering expenses
                age=30,
                risk_tolerance="low"
            ),
            goal=Goal(
                target_amount=100000,  # Impossible
                timeline_months=12,
                goal_type="savings"
            )
        )
        
        results = run_monte_carlo(request)
        
        # Should have very low success probability
        assert results.success_probability < 0.05


class TestProgressCallback:
    """Test progress callback functionality."""
    
    def test_progress_callback_invoked(self):
        """Test that progress callback is called during simulation."""
        request = SimulationRequest(
            financial_profile=FinancialProfile(
                liquid_assets=10000,
                credit_debt=0,
                loan_debt=0,
                monthly_loan_payments=0,
                monthly_spending=2000
            ),
            user_inputs=UserInputs(
                monthly_income=5000,
                age=30,
                risk_tolerance="medium"
            ),
            goal=Goal(
                target_amount=20000,
                timeline_months=12,
                goal_type="savings"
            ),
            simulation_params=SimulationParams(n_simulations=5000)
        )
        
        progress_calls = []
        
        def track_progress(completed, total, message):
            progress_calls.append({
                'completed': completed,
                'total': total,
                'message': message
            })
        
        run_monte_carlo(request, progress_callback=track_progress)
        
        # Should have been called at least once
        assert len(progress_calls) > 0
        
        # Last call should be completion
        last_call = progress_calls[-1]
        assert last_call['completed'] == last_call['total']
    
    def test_progress_monotonically_increases(self):
        """Test that progress values increase monotonically."""
        request = SimulationRequest(
            financial_profile=FinancialProfile(
                liquid_assets=10000,
                credit_debt=0,
                loan_debt=0,
                monthly_loan_payments=0,
                monthly_spending=2000
            ),
            user_inputs=UserInputs(
                monthly_income=5000,
                age=30,
                risk_tolerance="medium"
            ),
            goal=Goal(
                target_amount=20000,
                timeline_months=12,
                goal_type="savings"
            ),
            simulation_params=SimulationParams(n_simulations=5000)
        )
        
        completed_values = []
        
        def track_progress(completed, total, message):
            completed_values.append(completed)
        
        run_monte_carlo(request, progress_callback=track_progress)
        
        # Progress should only increase
        for i in range(1, len(completed_values)):
            assert completed_values[i] >= completed_values[i-1]
