"""
Unit tests for Pydantic models and validation.
"""

import pytest
import warnings
from models import (
    FinancialProfile,
    UserInputs,
    Goal,
    SimulationParams,
    SimulationRequest,
    RISK_PROFILES
)


class TestFinancialProfile:
    """Test FinancialProfile validation."""
    
    def test_valid_profile(self):
        """Test creating a valid financial profile."""
        profile = FinancialProfile(
            liquid_assets=10000,
            credit_debt=1000,
            loan_debt=5000,
            monthly_loan_payments=200,
            monthly_spending=2000
        )
        assert profile.liquid_assets == 10000
        assert profile.spending_volatility is None  # Should be set by risk tolerance
    
    def test_negative_values_rejected(self):
        """Test that negative values are rejected."""
        with pytest.raises(ValueError, match="must be non-negative"):
            FinancialProfile(
                liquid_assets=-100,
                credit_debt=0,
                loan_debt=0,
                monthly_loan_payments=0,
                monthly_spending=1000
            )
    
    def test_volatility_range_validation(self):
        """Test spending volatility must be between 0 and 1."""
        with pytest.raises(ValueError, match="between 0 and 1"):
            FinancialProfile(
                liquid_assets=10000,
                credit_debt=0,
                loan_debt=0,
                monthly_loan_payments=0,
                monthly_spending=2000,
                spending_volatility=1.5
            )


class TestUserInputs:
    """Test UserInputs validation."""
    
    def test_valid_inputs(self):
        """Test creating valid user inputs."""
        inputs = UserInputs(
            monthly_income=5000,
            age=30,
            risk_tolerance="medium"
        )
        assert inputs.monthly_income == 5000
        assert inputs.risk_tolerance == "medium"
    
    def test_zero_income_rejected(self):
        """Test that zero or negative income is rejected."""
        with pytest.raises(ValueError, match="must be positive"):
            UserInputs(
                monthly_income=0,
                age=30,
                risk_tolerance="low"
            )
    
    def test_invalid_age_rejected(self):
        """Test age validation."""
        with pytest.raises(ValueError, match="between 18 and 100"):
            UserInputs(
                monthly_income=5000,
                age=150,
                risk_tolerance="medium"
            )
    
    def test_all_risk_tolerances(self):
        """Test all risk tolerance levels are accepted."""
        for risk in ["low", "medium", "high"]:
            inputs = UserInputs(
                monthly_income=5000,
                age=30,
                risk_tolerance=risk
            )
            assert inputs.risk_tolerance == risk


class TestGoal:
    """Test Goal validation."""
    
    def test_valid_goal(self):
        """Test creating a valid goal."""
        goal = Goal(
            target_amount=50000,
            timeline_months=36,
            goal_type="emergency_fund"
        )
        assert goal.target_amount == 50000
        assert goal.timeline_months == 36
    
    def test_negative_target_rejected(self):
        """Test that negative target is rejected."""
        with pytest.raises(ValueError, match="must be positive"):
            Goal(
                target_amount=-1000,
                timeline_months=12,
                goal_type="savings"
            )
    
    def test_zero_timeline_rejected(self):
        """Test that zero timeline is rejected."""
        with pytest.raises(ValueError, match="must be positive"):
            Goal(
                target_amount=10000,
                timeline_months=0,
                goal_type="savings"
            )
    
    def test_very_long_timeline_rejected(self):
        """Test that excessively long timelines are rejected."""
        with pytest.raises(ValueError, match="too long"):
            Goal(
                target_amount=10000,
                timeline_months=700,  # > 600 months
                goal_type="retirement"
            )


class TestSimulationParams:
    """Test SimulationParams validation and normalization."""
    
    def test_simulation_count_normalization_to_5000(self):
        """Test that counts < 27500 normalize to 5000."""
        with warnings.catch_warnings(record=True) as w:
            warnings.simplefilter("always")
            params = SimulationParams(n_simulations=8000)
            assert params.n_simulations == 5000
            assert len(w) == 1
            assert "normalized to 5000" in str(w[0].message)
    
    def test_simulation_count_normalization_to_50000(self):
        """Test that counts >= 27500 normalize to 50000."""
        with warnings.catch_warnings(record=True) as w:
            warnings.simplefilter("always")
            params = SimulationParams(n_simulations=30000)
            assert params.n_simulations == 50000
            assert len(w) == 1
            assert "normalized to 50000" in str(w[0].message)
    
    def test_valid_simulation_counts_no_warning(self):
        """Test that 5000 and 50000 don't trigger warnings."""
        with warnings.catch_warnings(record=True) as w:
            warnings.simplefilter("always")
            params_5k = SimulationParams(n_simulations=5000)
            params_50k = SimulationParams(n_simulations=50000)
            assert params_5k.n_simulations == 5000
            assert params_50k.n_simulations == 50000
            assert len(w) == 0
    
    def test_probability_validation(self):
        """Test probability values must be between 0 and 1."""
        with pytest.raises(ValueError, match="between 0 and 1"):
            SimulationParams(emergency_probability=1.5)
    
    def test_emergency_range_validation(self):
        """Test emergency min cannot exceed max."""
        with pytest.raises(ValueError, match="cannot exceed max"):
            SimulationParams(
                emergency_min=5000,
                emergency_max=1000
            )


class TestSimulationRequest:
    """Test SimulationRequest and risk tolerance application."""
    
    def test_low_risk_profile_applied(self):
        """Test that low risk tolerance applies conservative profile."""
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
                risk_tolerance="low"
            ),
            goal=Goal(
                target_amount=20000,
                timeline_months=24,
                goal_type="savings"
            )
        )
        
        assert request.simulation_params.annual_return_mean == 0.03
        assert request.simulation_params.annual_return_std == 0.08
        assert request.simulation_params.expense_volatility == 0.12
        assert request.financial_profile.spending_volatility == 0.12
    
    def test_medium_risk_profile_applied(self):
        """Test that medium risk tolerance applies moderate profile."""
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
                timeline_months=24,
                goal_type="savings"
            )
        )
        
        assert request.simulation_params.annual_return_mean == 0.07
        assert request.simulation_params.annual_return_std == 0.15
        assert request.simulation_params.expense_volatility == 0.15
    
    def test_high_risk_profile_applied(self):
        """Test that high risk tolerance applies aggressive profile."""
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
                risk_tolerance="high"
            ),
            goal=Goal(
                target_amount=20000,
                timeline_months=24,
                goal_type="savings"
            )
        )
        
        assert request.simulation_params.annual_return_mean == 0.10
        assert request.simulation_params.annual_return_std == 0.22
        assert request.simulation_params.expense_volatility == 0.18
    
    def test_explicit_params_override_risk_profile(self):
        """Test that explicitly provided params override risk profile."""
        request = SimulationRequest(
            financial_profile=FinancialProfile(
                liquid_assets=10000,
                credit_debt=0,
                loan_debt=0,
                monthly_loan_payments=0,
                monthly_spending=2000,
                spending_volatility=0.20  # Explicit value
            ),
            user_inputs=UserInputs(
                monthly_income=5000,
                age=30,
                risk_tolerance="low"
            ),
            goal=Goal(
                target_amount=20000,
                timeline_months=24,
                goal_type="savings"
            ),
            simulation_params=SimulationParams(
                annual_return_mean=0.05  # Explicit value
            )
        )
        
        # Explicit values should be preserved
        assert request.simulation_params.annual_return_mean == 0.05
        assert request.financial_profile.spending_volatility == 0.20
        # But non-explicit values should use risk profile
        assert request.simulation_params.annual_return_std == 0.08  # Low risk default
