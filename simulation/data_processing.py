"""
Data Processing Module

Transforms Nessie API data into simulation-ready financial profiles.
"""

from typing import List, Dict, Any
import numpy as np
from models import FinancialProfile


def process_nessie_data(
    accounts: List[Dict[str, Any]],
    purchases: List[Dict[str, Any]],
    merchants: Dict[str, Dict[str, Any]],
    loans: List[Dict[str, Any]] = None,
    bills: List[Dict[str, Any]] = None,
) -> FinancialProfile:
    """
    Process raw Nessie API data into a FinancialProfile.

    Args:
        accounts: List of account objects from Nessie
        purchases: List of purchase transactions
        merchants: Dict mapping merchant_id to merchant object
        loans: Optional list of loans
        bills: Optional list of bills

    Returns:
        FinancialProfile ready for simulation
    """
    # Calculate liquid assets (checking + savings)
    liquid_assets = sum(
        acc.get('balance', 0)
        for acc in accounts
        if acc.get('type') in ('Checking', 'Savings')
    )

    # Calculate credit debt
    credit_debt = sum(
        acc.get('balance', 0)
        for acc in accounts
        if acc.get('type') == 'Credit Card'
    )

    # Calculate loan obligations
    loan_debt = 0
    monthly_loan_payments = 0
    if loans:
        for loan in loans:
            loan_debt += loan.get('amount', 0)
            monthly_loan_payments += loan.get('monthly_payment', 0)

    # Analyze spending patterns
    spending_by_category = analyze_spending_categories(purchases, merchants)
    total_spending = sum(spending_by_category.values())

    # Estimate monthly spending (assume purchases span 3 months)
    monthly_spending = total_spending / 3 if total_spending > 0 else 3000

    # Calculate spending volatility
    spending_volatility = calculate_spending_volatility(purchases)

    return FinancialProfile(
        liquid_assets=liquid_assets,
        credit_debt=credit_debt,
        loan_debt=loan_debt,
        monthly_loan_payments=monthly_loan_payments,
        monthly_spending=monthly_spending,
        spending_by_category=spending_by_category,
        spending_volatility=spending_volatility,
    )


def analyze_spending_categories(
    purchases: List[Dict[str, Any]],
    merchants: Dict[str, Dict[str, Any]],
) -> Dict[str, float]:
    """
    Categorize spending based on merchant categories.
    """
    category_totals: Dict[str, float] = {}

    for purchase in purchases:
        amount = purchase.get('amount', 0)
        merchant_id = purchase.get('merchant_id')

        # Look up merchant category
        merchant = merchants.get(merchant_id, {})
        category = merchant.get('category', 'Other')

        if category not in category_totals:
            category_totals[category] = 0
        category_totals[category] += amount

    return category_totals


def calculate_spending_volatility(purchases: List[Dict[str, Any]]) -> float:
    """
    Calculate the coefficient of variation for monthly spending.

    Returns a value between 0 and 1, where higher values indicate
    more variable spending patterns.
    """
    if not purchases:
        return 0.15  # Default volatility

    # Group purchases by month
    monthly_totals: Dict[str, float] = {}

    for purchase in purchases:
        date_str = purchase.get('purchase_date', '')
        if not date_str:
            continue

        # Extract year-month
        month_key = date_str[:7]  # "YYYY-MM"

        if month_key not in monthly_totals:
            monthly_totals[month_key] = 0
        monthly_totals[month_key] += purchase.get('amount', 0)

    if len(monthly_totals) < 2:
        return 0.15  # Default volatility

    amounts = list(monthly_totals.values())
    mean = np.mean(amounts)
    std = np.std(amounts)

    # Coefficient of variation (capped at 0.5)
    if mean > 0:
        cv = min(std / mean, 0.5)
    else:
        cv = 0.15

    return float(cv)
