"""
Sensitivity Analysis Module

Analyzes how changes in financial parameters affect goal success probability.
"""

from typing import Dict, List
from copy import deepcopy
from models import (
    SimulationRequest,
    SensitivityAnalysis,
    SensitivityResult
)
from monte_carlo import run_monte_carlo


def run_sensitivity_analysis(request: SimulationRequest) -> SensitivityAnalysis:
    """
    Run sensitivity analysis by varying key parameters.

    Tests the impact of:
    - Income changes (+/- 10%)
    - Spending changes (+/- 10%)
    - Timeline extension
    """
    # Run base simulation
    base_results = run_monte_carlo(request, n_workers=2)
    base_probability = base_results.success_probability

    # Define scenarios as (attribute_path, field, multiplier_or_delta) tuples
    scenarios = {
        "income_plus_10": ("user_inputs", "monthly_income", 1.1, "multiply"),
        "income_minus_10": ("user_inputs", "monthly_income", 0.9, "multiply"),
        "spending_minus_10": ("financial_profile", "monthly_spending", 0.9, "multiply"),
        "spending_minus_20": ("financial_profile", "monthly_spending", 0.8, "multiply"),
        "spending_plus_10": ("financial_profile", "monthly_spending", 1.1, "multiply"),
        "timeline_plus_6mo": ("goal", "timeline_months", 6, "add"),
        "timeline_plus_12mo": ("goal", "timeline_months", 12, "add"),
    }

    sensitivities: Dict[str, SensitivityResult] = {}
    max_impact = 0
    most_impactful = ""

    for name, (obj_attr, field, value, op) in scenarios.items():
        # Deep copy to avoid mutation
        modified_request = deepcopy(request)
        obj = getattr(modified_request, obj_attr)
        if op == "multiply":
            setattr(obj, field, getattr(obj, field) * value)
        else:
            setattr(obj, field, getattr(obj, field) + value)

        # Run simulation with modified parameters
        results = run_monte_carlo(modified_request, n_workers=2)

        impact = results.success_probability - base_probability

        sensitivities[name] = SensitivityResult(
            delta=impact,
            new_probability=results.success_probability,
            impact=abs(impact)
        )

        if abs(impact) > max_impact:
            max_impact = abs(impact)
            most_impactful = name

    # Generate recommendations
    recommendations = generate_recommendations(sensitivities, base_probability)

    return SensitivityAnalysis(
        base_probability=base_probability,
        sensitivities=sensitivities,
        most_impactful=most_impactful,
        recommendations=recommendations
    )


def generate_recommendations(
    sensitivities: Dict[str, SensitivityResult],
    base_probability: float
) -> List[str]:
    """
    Generate actionable recommendations based on sensitivity analysis.
    """
    recommendations = []

    # Check spending impact
    spending_impact = sensitivities.get("spending_minus_10", SensitivityResult(delta=0, new_probability=0, impact=0))
    if spending_impact.impact > 0.05:
        recommendations.append(
            f"Reducing spending by 10% could improve your success probability by "
            f"{spending_impact.impact:.0%} (to {spending_impact.new_probability:.0%})."
        )

    # Check income impact
    income_impact = sensitivities.get("income_plus_10", SensitivityResult(delta=0, new_probability=0, impact=0))
    if income_impact.impact > 0.05:
        recommendations.append(
            f"Increasing income by 10% (raise, side gig) could boost your odds by "
            f"{income_impact.impact:.0%}."
        )

    # Check timeline impact
    timeline_impact = sensitivities.get("timeline_plus_6mo", SensitivityResult(delta=0, new_probability=0, impact=0))
    if timeline_impact.impact > 0.05:
        recommendations.append(
            f"Extending your timeline by 6 months improves probability to "
            f"{timeline_impact.new_probability:.0%}."
        )

    # Low probability warning
    if base_probability < 0.5:
        recommendations.append(
            "Your current plan has less than 50% success probability. "
            "Consider adjusting your goal, timeline, or savings rate."
        )

    # High probability encouragement
    if base_probability > 0.8:
        recommendations.append(
            "You're on track! Your current plan has strong odds of success. "
            "Stay consistent with your savings."
        )

    return recommendations
