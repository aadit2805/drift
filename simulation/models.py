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
    
    n_simulations: int = 10000
    income_volatility: float = 0.05
    expense_volatility: float = 0.15
    emergency_probability: float = 0.08
    emergency_min: float = 500
    emergency_max: float = 3000
    annual_return_mean: float = 0.07
    annual_return_std: float = 0.15
    inflation_rate: float = 0.025


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


class SensitivityResult(BaseModel):
    delta: float
    new_probability: float
    impact: float


class SensitivityAnalysis(BaseModel):
    base_probability: float
    sensitivities: Dict[str, SensitivityResult]
    most_impactful: str
    recommendations: List[str]
