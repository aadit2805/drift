"""
Integration tests for end-to-end simulation workflow.
"""

import pytest
import json
from models import SimulationRequest
from main import parse_request_from_json, results_to_camel_case
from monte_carlo import run_monte_carlo
from sensitivity import run_sensitivity_analysis


class TestJSONParsing:
    """Test JSON input parsing with camelCase/snake_case."""
    
    def test_parse_camel_case_input(self):
        """Test parsing camelCase JSON input."""
        json_input = json.dumps({
            "financialProfile": {
                "liquidAssets": 15000,
                "creditDebt": 2000,
                "loanDebt": 10000,
                "monthlyLoanPayments": 250,
                "monthlySpending": 3000,
                "spendingByCategory": {"groceries": 500},
                "spendingVolatility": 0.15
            },
            "userInputs": {
                "monthlyIncome": 5000,
                "age": 30,
                "riskTolerance": "medium"
            },
            "goal": {
                "targetAmount": 50000,
                "timelineMonths": 36,
                "goalType": "savings"
            },
            "simulationParams": {
                "nSimulations": 5000
            }
        })
        
        request = parse_request_from_json(json_input)
        
        assert request.financial_profile.liquid_assets == 15000
        assert request.user_inputs.monthly_income == 5000
        assert request.goal.target_amount == 50000
        assert request.simulation_params.n_simulations == 5000
    
    def test_parse_snake_case_input(self):
        """Test parsing snake_case JSON input."""
        json_input = json.dumps({
            "financial_profile": {
                "liquid_assets": 15000,
                "credit_debt": 2000,
                "loan_debt": 10000,
                "monthly_loan_payments": 250,
                "monthly_spending": 3000
            },
            "user_inputs": {
                "monthly_income": 5000,
                "age": 30,
                "risk_tolerance": "medium"
            },
            "goal": {
                "target_amount": 50000,
                "timeline_months": 36,
                "goal_type": "savings"
            }
        })
        
        request = parse_request_from_json(json_input)
        
        assert request.financial_profile.liquid_assets == 15000
        assert request.user_inputs.monthly_income == 5000


class TestOutputFormatting:
    """Test output formatting for JavaScript consumption."""
    
    def test_results_to_camel_case(self):
        """Test converting results to camelCase."""
        from models import SimulationResults, Percentiles
        
        results = SimulationResults(
            success_probability=0.75,
            median_outcome=48000,
            percentiles=Percentiles(
                p10=30000,
                p25=38000,
                p50=48000,
                p75=58000,
                p90=68000
            ),
            mean=48500,
            std=12000,
            worst_case=15000,
            best_case=85000,
            simulations_run=5000,
            workers_used=2
        )
        
        output = results_to_camel_case(results)
        
        assert 'successProbability' in output
        assert 'medianOutcome' in output
        assert 'workersUsed' in output
        assert output['successProbability'] == 0.75
        assert output['simulationsRun'] == 5000


class TestEndToEndWorkflow:
    """Test complete simulation workflow from JSON to results."""
    
    def test_complete_simulation_workflow(self):
        """Test full workflow: JSON → parse → simulate → format."""
        json_input = json.dumps({
            "financialProfile": {
                "liquidAssets": 15000,
                "creditDebt": 2000,
                "loanDebt": 0,
                "monthlyLoanPayments": 0,
                "monthlySpending": 3000
            },
            "userInputs": {
                "monthlyIncome": 5000,
                "age": 30,
                "riskTolerance": "medium"
            },
            "goal": {
                "targetAmount": 50000,
                "timelineMonths": 36,
                "goalType": "savings"
            },
            "simulationParams": {
                "nSimulations": 5000
            }
        })
        
        # Parse input
        request = parse_request_from_json(json_input)
        
        # Run simulation
        results = run_monte_carlo(request)
        
        # Format output
        output = results_to_camel_case(results)
        
        # Verify output structure
        assert isinstance(output, dict)
        assert 'successProbability' in output
        assert 'percentiles' in output
        assert 'workersUsed' in output
        assert output['workersUsed'] == 2
        assert output['simulationsRun'] == 5000
    
    def test_sensitivity_workflow(self):
        """Test sensitivity analysis workflow."""
        json_input = json.dumps({
            "financialProfile": {
                "liquidAssets": 15000,
                "creditDebt": 2000,
                "loanDebt": 0,
                "monthlyLoanPayments": 0,
                "monthlySpending": 3000
            },
            "userInputs": {
                "monthlyIncome": 5000,
                "age": 30,
                "riskTolerance": "medium"
            },
            "goal": {
                "targetAmount": 50000,
                "timelineMonths": 36,
                "goalType": "savings"
            },
            "simulationParams": {
                "nSimulations": 5000
            }
        })
        
        # Parse and run sensitivity
        request = parse_request_from_json(json_input)
        analysis = run_sensitivity_analysis(request)
        
        # Check results
        assert hasattr(analysis, 'base_probability')
        assert hasattr(analysis, 'sensitivities')
        assert hasattr(analysis, 'recommendations')
        assert 'income_plus_10' in analysis.sensitivities
        assert 'spending_minus_10' in analysis.sensitivities
        assert isinstance(analysis.recommendations, list)


class TestErrorHandling:
    """Test error handling and validation."""
    
    def test_invalid_json_raises_error(self):
        """Test that invalid JSON raises appropriate error."""
        with pytest.raises(json.JSONDecodeError):
            parse_request_from_json("invalid json{}")
    
    def test_missing_required_fields_raises_error(self):
        """Test that missing required fields raise validation errors."""
        json_input = json.dumps({
            "financialProfile": {
                "liquidAssets": 15000
                # Missing other required fields
            },
            "userInputs": {
                "monthlyIncome": 5000,
                "age": 30,
                "riskTolerance": "medium"
            },
            "goal": {
                "targetAmount": 50000,
                "timelineMonths": 36,
                "goalType": "savings"
            }
        })
        
        with pytest.raises(Exception):  # Pydantic validation error
            parse_request_from_json(json_input)
    
    def test_invalid_risk_tolerance_raises_error(self):
        """Test that invalid risk tolerance raises error."""
        json_input = json.dumps({
            "financialProfile": {
                "liquidAssets": 15000,
                "creditDebt": 0,
                "loanDebt": 0,
                "monthlyLoanPayments": 0,
                "monthlySpending": 2000
            },
            "userInputs": {
                "monthlyIncome": 5000,
                "age": 30,
                "riskTolerance": "extreme"  # Invalid
            },
            "goal": {
                "targetAmount": 50000,
                "timelineMonths": 36,
                "goalType": "savings"
            }
        })
        
        with pytest.raises(Exception):  # Pydantic validation error
            parse_request_from_json(json_input)
