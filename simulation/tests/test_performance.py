"""
Performance and benchmark tests.
"""

import pytest
import time
from models import (
    FinancialProfile,
    UserInputs,
    Goal,
    SimulationRequest,
    SimulationParams
)
from monte_carlo import run_monte_carlo


class TestPerformanceBenchmarks:
    """Performance benchmarks for simulation engine."""
    
    def create_test_request(self, n_simulations):
        """Create a standard test request."""
        return SimulationRequest(
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
            simulation_params=SimulationParams(n_simulations=n_simulations)
        )
    
    def test_5000_sims_performance(self):
        """Test that 5000 simulations complete in reasonable time."""
        request = self.create_test_request(5000)
        
        start = time.time()
        results = run_monte_carlo(request)
        elapsed = time.time() - start
        
        # Should complete in < 10 seconds
        assert elapsed < 10.0, f"5000 sims took {elapsed:.2f}s, expected < 10s"
        assert results.simulations_run == 5000
        assert results.workers_used == 2
        
        sims_per_sec = 5000 / elapsed
        print(f"\n5000 sims: {elapsed:.2f}s ({sims_per_sec:.0f} sims/sec)")
    
    def test_50000_sims_performance(self):
        """Test that 50000 simulations complete in reasonable time."""
        request = self.create_test_request(50000)
        
        start = time.time()
        results = run_monte_carlo(request)
        elapsed = time.time() - start
        
        # Should complete in < 60 seconds
        assert elapsed < 60.0, f"50000 sims took {elapsed:.2f}s, expected < 60s"
        assert results.simulations_run == 50000
        assert results.workers_used == 4
        
        sims_per_sec = 50000 / elapsed
        print(f"\n50000 sims: {elapsed:.2f}s ({sims_per_sec:.0f} sims/sec)")
    
    def test_worker_speedup(self):
        """Test that 4 workers are faster than 2 workers."""
        request_5k = self.create_test_request(5000)
        request_50k = self.create_test_request(50000)
        
        # 5000 with 2 workers
        start = time.time()
        run_monte_carlo(request_5k)
        time_2workers = time.time() - start
        
        # 50000 with 4 workers
        start = time.time()
        run_monte_carlo(request_50k)
        time_4workers = time.time() - start
        
        # Time per simulation should be better with more workers
        time_per_sim_2w = time_2workers / 5000
        time_per_sim_4w = time_4workers / 50000
        
        # 4 workers should be at least as efficient as 2 workers
        assert time_per_sim_4w <= time_per_sim_2w * 1.5  # Allow some overhead
        
        print(f"\n2 workers: {time_per_sim_2w*1000:.3f}ms per sim")
        print(f"4 workers: {time_per_sim_4w*1000:.3f}ms per sim")


class TestMemoryEfficiency:
    """Test memory efficiency of vectorized operations."""
    
    def test_large_timeline_memory(self):
        """Test that large timelines don't cause memory issues."""
        request = SimulationRequest(
            financial_profile=FinancialProfile(
                liquid_assets=50000,
                credit_debt=0,
                loan_debt=0,
                monthly_loan_payments=0,
                monthly_spending=2000
            ),
            user_inputs=UserInputs(
                monthly_income=6000,
                age=25,
                risk_tolerance="medium"
            ),
            goal=Goal(
                target_amount=500000,
                timeline_months=360,  # 30 years
                goal_type="retirement"
            ),
            simulation_params=SimulationParams(n_simulations=5000)
        )
        
        # Should not crash or timeout
        results = run_monte_carlo(request)
        assert results.simulations_run == 5000


class TestReproducibility:
    """Test reproducibility of simulation results."""
    
    def test_identical_inputs_identical_outputs(self):
        """Test that identical inputs produce identical outputs."""
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
            simulation_params=SimulationParams(n_simulations=5000)
        )
        
        # Run multiple times
        results1 = run_monte_carlo(request)
        results2 = run_monte_carlo(request)
        results3 = run_monte_carlo(request)
        
        # All results should be identical (deterministic seeds)
        assert results1.success_probability == results2.success_probability
        assert results2.success_probability == results3.success_probability
        assert results1.median_outcome == results2.median_outcome
        assert results2.median_outcome == results3.median_outcome
        assert results1.mean == results2.mean
    
    def test_risk_tolerance_changes_results(self):
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
        
        # Low risk
        request_low = SimulationRequest(
            **base_request,
            user_inputs=UserInputs(
                monthly_income=5000,
                age=30,
                risk_tolerance="low"
            )
        )
        
        # High risk
        request_high = SimulationRequest(
            **base_request,
            user_inputs=UserInputs(
                monthly_income=5000,
                age=30,
                risk_tolerance="high"
            )
        )
        
        results_low = run_monte_carlo(request_low)
        results_high = run_monte_carlo(request_high)
        
        # Results should differ due to different return assumptions
        assert results_low.success_probability != results_high.success_probability
        # High risk should have higher variance
        assert results_high.std > results_low.std
