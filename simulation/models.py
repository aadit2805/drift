from pydantic import BaseModel, field_validator, ConfigDict
from typing import Optional, Dict, List, Literal


class FinancialProfile(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    
    liquid_assets: float
    credit_debt: float = 0.0
    loan_debt: float = 0.0
    monthly_loan_payments: float = 0.0  # CRITICAL: Now tracked properly
    monthly_spending: float
    spending_by_category: Dict[str, float] = {}
    spending_volatility: float = 0.15

    @field_validator('monthly_loan_payments', mode='before')
    @classmethod
    def validate_loan_payments(cls, v):
        """Ensure loan payments are tracked (not ignored)"""
        return float(v) if v else 0.0


class UserInputs(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    
    monthly_income: float
    age: int
    risk_tolerance: Literal["low", "medium", "high"]


class Goal(BaseModel):
    """Represents a financial goal, either hardcoded or AI-parsed from text"""
    model_config = ConfigDict(populate_by_name=True)
    
    target_amount: float
    timeline_months: int
    goal_type: str = "custom"
    goal_text: Optional[str] = None  # Original goal text if parsed from AI
    confidence: float = 1.0  # How confident the parser was (0-1)


class SimulationParams(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    
    n_simulations: int = 100000
    income_volatility: float = 0.05
    expense_volatility: float = 0.15
    emergency_probability: float = 0.08
    emergency_min: float = 500
    emergency_max: float = 3000
    annual_return_mean: float = 0.07
    annual_return_std: float = 0.15
    inflation_rate: float = 0.025
    inflation_volatility: float = 0.01  # Inflation variance (e.g., 2.5% ± 1%)
    annual_raise_mean: float = 0.03  # Average annual raise 3%
    annual_raise_volatility: float = 0.015  # Raise variance
    promotion_probability: float = 0.15  # 15% chance of promotion each half-year
    promotion_raise_mean: float = 0.08  # Average promotion raise 8%
    promotion_raise_volatility: float = 0.03  # Promotion raise variance
    
    @staticmethod
    def from_risk_tolerance(risk_tolerance: Literal["low", "medium", "high"], base_params: Optional['SimulationParams'] = None) -> 'SimulationParams':
        """
        Create SimulationParams with return expectations adjusted for risk tolerance.
        
        Low risk: Conservative returns (4% mean, 8% std)
        Medium risk: Moderate returns (7% mean, 15% std) - balanced portfolio
        High risk: Aggressive returns (10% mean, 20% std) - stock-heavy portfolio
        """
        params = base_params or SimulationParams()
        
        risk_profiles = {
            "low": {"annual_return_mean": 0.04, "annual_return_std": 0.08},
            "medium": {"annual_return_mean": 0.07, "annual_return_std": 0.15},
            "high": {"annual_return_mean": 0.10, "annual_return_std": 0.20},
        }
        
        profile = risk_profiles.get(risk_tolerance, risk_profiles["medium"])
        
        # Update return expectations
        params.annual_return_mean = profile["annual_return_mean"]
        params.annual_return_std = profile["annual_return_std"]
        
        return params


class SimulationRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    
    financial_profile: FinancialProfile
    user_inputs: UserInputs
    goal: Goal
    simulation_params: Optional[SimulationParams] = None


class Percentiles(BaseModel):
    p10: float
    p25: float
    p50: float
    p75: float
    p90: float


class Assumptions(BaseModel):
    """Simulation assumptions for transparency"""
    annual_return_mean: float
    annual_return_std: float
    inflation_rate: float
    inflation_volatility: float
    annual_raise_mean: float
    annual_raise_frequency: str  # e.g., "Annual (every 12 months)"
    promotion_probability_semi_annual: float
    promotion_raise_mean: float
    emergency_probability_monthly: float
    emergency_amount_range: str  # e.g., "$500 - $3,000"
    income_volatility: float
    expense_volatility: float


class SimulationResults(BaseModel):
    success_probability: float
    median_outcome: float
    percentiles: Percentiles
    mean: float
    std: float
    worst_case: float
    best_case: float
    simulations_run: int
    workers_used: int
    assumptions: Optional[Assumptions] = None


class SensitivityResult(BaseModel):
    delta: float
    new_probability: float
    impact: float


class SensitivityAnalysis(BaseModel):
    base_probability: float
    sensitivities: Dict[str, SensitivityResult]
    most_impactful: str
    recommendations: List[str]
