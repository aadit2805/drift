from pydantic import BaseModel, field_validator, ConfigDict
from typing import Optional, Dict, List, Literal


# =============================================================================
# Enhanced Account Types (from Plaid integration)
# =============================================================================

class DepositoryAccount(BaseModel):
    """Checking or savings account"""
    model_config = ConfigDict(populate_by_name=True)

    id: str
    type: Literal["depository"] = "depository"
    subtype: str  # "checking" or "savings"
    name: str
    balance: float
    available: Optional[float] = None


class CreditAccount(BaseModel):
    """Credit card account with APR and utilization"""
    model_config = ConfigDict(populate_by_name=True)

    id: str
    type: Literal["credit"] = "credit"
    name: str
    balance: float
    limit: float
    utilization: float
    apr: float  # Annual percentage rate
    minimum_payment: float
    last_payment_amount: Optional[float] = None
    last_payment_date: Optional[str] = None


class LoanAccount(BaseModel):
    """Loan account (student, auto, mortgage, personal)"""
    model_config = ConfigDict(populate_by_name=True)

    id: str
    type: Literal["loan", "mortgage"]
    subtype: str  # "student", "auto", "mortgage", "personal"
    name: str
    balance: float
    original_amount: Optional[float] = None
    interest_rate: float
    monthly_payment: float
    origination_date: Optional[str] = None
    expected_payoff_date: Optional[str] = None


class InvestmentHolding(BaseModel):
    """Single holding within an investment account"""
    model_config = ConfigDict(populate_by_name=True)

    symbol: Optional[str] = None
    name: Optional[str] = None
    quantity: float
    value: float
    type: Optional[str] = None  # "equity", "fixed income", "cash", etc.


class InvestmentAllocation(BaseModel):
    """Portfolio allocation percentages"""
    model_config = ConfigDict(populate_by_name=True)

    stocks: float = 0.0
    bonds: float = 0.0
    cash: float = 0.0
    other: float = 0.0


class InvestmentAccount(BaseModel):
    """Investment account (401k, IRA, brokerage)"""
    model_config = ConfigDict(populate_by_name=True)

    id: str
    type: Literal["investment"] = "investment"
    subtype: str  # "401k", "ira", "brokerage"
    name: str
    balance: float
    holdings: List[InvestmentHolding] = []
    allocation: InvestmentAllocation = InvestmentAllocation()


class IncomeProfile(BaseModel):
    """Detected income patterns from transactions"""
    model_config = ConfigDict(populate_by_name=True)

    monthly_amount: float
    frequency: Literal["weekly", "biweekly", "monthly", "irregular"] = "monthly"
    stability_score: float = 0.8  # 0-1, higher = more stable


class SpendingProfile(BaseModel):
    """Analyzed spending patterns from transactions"""
    model_config = ConfigDict(populate_by_name=True)

    monthly_amount: float
    by_category: Dict[str, float] = {}
    volatility: float = 0.15  # 0.05-0.40
    fixed_expenses: float = 0.0
    variable_expenses: float = 0.0


class EnhancedFinancialProfile(BaseModel):
    """
    Complete financial profile from Plaid with all account types.
    Used for dynamic parameter extraction.
    """
    model_config = ConfigDict(populate_by_name=True)

    # Accounts by type
    depository: List[DepositoryAccount] = []
    credit: List[CreditAccount] = []
    loans: List[LoanAccount] = []
    investments: List[InvestmentAccount] = []

    # Derived patterns
    income: Optional[IncomeProfile] = None
    spending: Optional[SpendingProfile] = None

    # Aggregates
    total_liquid: float = 0.0
    total_credit_debt: float = 0.0
    total_loan_debt: float = 0.0
    total_investments: float = 0.0
    net_worth: float = 0.0


# =============================================================================
# Original Financial Profile (backwards compatible)
# =============================================================================

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

    @field_validator('timeline_months')
    @classmethod
    def validate_timeline(cls, v):
        if v <= 0:
            raise ValueError(f'timeline_months must be positive, got {v}')
        return v

    @field_validator('target_amount')
    @classmethod
    def validate_target(cls, v):
        if v <= 0:
            raise ValueError(f'target_amount must be positive, got {v}')
        return v


class CreditCardParams(BaseModel):
    """Credit card parameters for simulation"""
    model_config = ConfigDict(populate_by_name=True)

    id: str
    balance: float
    apr: float
    minimum_payment: float


class LoanParams(BaseModel):
    """Loan parameters for simulation"""
    model_config = ConfigDict(populate_by_name=True)

    id: str
    balance: float
    interest_rate: float
    monthly_payment: float


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

    # Enhanced: per-card and per-loan modeling
    credit_cards: List[CreditCardParams] = []
    loans: List[LoanParams] = []

    # Whether to use account-aware simulation logic
    use_account_aware_simulation: bool = False

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

    @staticmethod
    def from_financial_profile(
        profile: EnhancedFinancialProfile,
        risk_tolerance: Literal["low", "medium", "high"] = "medium"
    ) -> 'SimulationParams':
        """
        Create SimulationParams dynamically derived from actual account data.

        Extracts:
        - Investment returns from actual portfolio allocation
        - Income volatility from income stability score
        - Expense volatility from spending patterns
        - Credit card details for interest modeling
        - Loan details for amortization modeling
        """
        # Start with risk-tolerance base
        params = SimulationParams.from_risk_tolerance(risk_tolerance)
        params.use_account_aware_simulation = True

        # Override investment returns from actual allocation
        if profile.investments:
            inv_params = SimulationParams._extract_investment_params(profile.investments)
            params.annual_return_mean = inv_params["annual_return"]
            params.annual_return_std = inv_params["annual_volatility"]

        # Override income volatility from detected patterns
        if profile.income:
            # Convert stability_score (0-1, higher=stable) to volatility (higher=more volatile)
            params.income_volatility = max(0.02, min(0.15, 1.0 - profile.income.stability_score) * 0.15)

        # Override expense volatility from spending patterns
        if profile.spending:
            params.expense_volatility = max(0.05, min(0.40, profile.spending.volatility))

        # Extract credit card details for per-card interest modeling
        for card in profile.credit:
            if card.balance > 0:
                params.credit_cards.append(CreditCardParams(
                    id=card.id,
                    balance=card.balance,
                    apr=card.apr,
                    minimum_payment=card.minimum_payment,
                ))

        # Extract loan details for amortization modeling
        for loan in profile.loans:
            if loan.balance > 0:
                params.loans.append(LoanParams(
                    id=loan.id,
                    balance=loan.balance,
                    interest_rate=loan.interest_rate,
                    monthly_payment=loan.monthly_payment,
                ))

        return params

    @staticmethod
    def _extract_investment_params(investments: List[InvestmentAccount]) -> Dict[str, float]:
        """
        Determine expected return/volatility from actual portfolio allocation.

        Uses historical averages:
        - Stocks: 10% return, 18% volatility
        - Bonds: 4% return, 6% volatility
        - Cash: 2% return, 1% volatility
        - Other: 6% return, 12% volatility
        """
        if not investments:
            return {"annual_return": 0.07, "annual_volatility": 0.15}

        total_value = sum(a.balance for a in investments)
        if total_value == 0:
            return {"annual_return": 0.07, "annual_volatility": 0.15}

        # Aggregate allocation across all investment accounts
        weighted_allocation = {"stocks": 0.0, "bonds": 0.0, "cash": 0.0, "other": 0.0}

        for account in investments:
            weight = account.balance / total_value
            weighted_allocation["stocks"] += account.allocation.stocks * weight
            weighted_allocation["bonds"] += account.allocation.bonds * weight
            weighted_allocation["cash"] += account.allocation.cash * weight
            weighted_allocation["other"] += account.allocation.other * weight

        # Historical averages by asset class
        returns = {"stocks": 0.10, "bonds": 0.04, "cash": 0.02, "other": 0.06}
        volatilities = {"stocks": 0.18, "bonds": 0.06, "cash": 0.01, "other": 0.12}

        expected_return = sum(weighted_allocation[k] * returns[k] for k in returns)
        expected_volatility = sum(weighted_allocation[k] * volatilities[k] for k in volatilities)

        # Ensure reasonable bounds
        expected_return = max(0.02, min(0.15, expected_return))
        expected_volatility = max(0.05, min(0.25, expected_volatility))

        return {
            "annual_return": expected_return,
            "annual_volatility": expected_volatility,
        }


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
