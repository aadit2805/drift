#!/usr/bin/env python3
"""
Fetch real data from Nessie API and cache it for testing.

This script pulls actual financial data from the Nessie API and saves it
to a local cache file for use in tests, avoiding repeated API calls.
"""

import os
import json
import requests
from pathlib import Path
from typing import Dict, Any, Optional, Tuple
from datetime import datetime

# Nessie API configuration
NESSIE_BASE_URL = os.getenv('NESSIE_BASE_URL', 'http://api.nessieisreal.com')
NESSIE_API_KEY = os.getenv('NESSIE_API_KEY', '4389318c54ddf318af62eda4ceed5f66')

# Cache file location
CACHE_DIR = Path(__file__).parent.parent / 'simulation' / 'tests' / 'test_data'
CACHE_FILE = CACHE_DIR / 'nessie_cache.json'


def fetch_nessie_data() -> Dict[str, Any]:
    """
    Fetch real data from Nessie API.

    Returns:
        Dictionary containing accounts, purchases, deposits, bills, and loans
    """
    print("Fetching data from Nessie API...")

    # Setup API client
    session = requests.Session()
    session.params = {'key': NESSIE_API_KEY}

    data = {
        'fetched_at': datetime.now().isoformat(),
        'accounts': [],
        'purchases_by_account': {},
        'deposits_by_account': {},
        'bills_by_account': {},
        'loans_by_account': {}
    }

    try:
        # Fetch all accounts
        print("  Fetching accounts...")
        response = session.get(f'{NESSIE_BASE_URL}/accounts')
        response.raise_for_status()
        accounts = response.json()
        data['accounts'] = accounts
        print(f"    ✓ Found {len(accounts)} accounts")

        # For each account, fetch transactions
        for account in accounts[:5]:  # Limit to first 5 accounts for testing
            account_id = account['_id']
            account_type = account.get('type', 'Unknown')
            print(f"\n  Processing account {account_id} ({account_type})...")

            # Fetch purchases
            try:
                response = session.get(f'{NESSIE_BASE_URL}/accounts/{account_id}/purchases')
                if response.status_code == 200:
                    purchases = response.json()
                    data['purchases_by_account'][account_id] = purchases
                    print(f"    ✓ Purchases: {len(purchases)}")
            except Exception as e:
                print(f"    ✗ Purchases failed: {e}")
                data['purchases_by_account'][account_id] = []

            # Fetch deposits
            try:
                response = session.get(f'{NESSIE_BASE_URL}/accounts/{account_id}/deposits')
                if response.status_code == 200:
                    deposits = response.json()
                    data['deposits_by_account'][account_id] = deposits
                    print(f"    ✓ Deposits: {len(deposits)}")
            except Exception as e:
                print(f"    ✗ Deposits failed: {e}")
                data['deposits_by_account'][account_id] = []

            # Fetch bills
            try:
                response = session.get(f'{NESSIE_BASE_URL}/accounts/{account_id}/bills')
                if response.status_code == 200:
                    bills = response.json()
                    data['bills_by_account'][account_id] = bills
                    print(f"    ✓ Bills: {len(bills)}")
            except Exception as e:
                print(f"    ✗ Bills failed: {e}")
                data['bills_by_account'][account_id] = []

            # Fetch loans
            try:
                response = session.get(f'{NESSIE_BASE_URL}/accounts/{account_id}/loans')
                if response.status_code == 200:
                    loans = response.json()
                    data['loans_by_account'][account_id] = loans
                    print(f"    ✓ Loans: {len(loans)}")
            except Exception as e:
                print(f"    ✗ Loans failed: {e}")
                data['loans_by_account'][account_id] = []

        print(f"\n✓ Successfully fetched Nessie data")
        return data

    except Exception as e:
        print(f"\n✗ Error fetching Nessie data: {e}")
        raise


def save_cache(data: Dict[str, Any]) -> None:
    """Save data to cache file."""
    CACHE_DIR.mkdir(exist_ok=True)

    with open(CACHE_FILE, 'w') as f:
        json.dump(data, f, indent=2)

    print(f"\n✓ Cached data saved to {CACHE_FILE}")


def load_cache() -> Dict[str, Any]:
    """Load data from cache file."""
    if not CACHE_FILE.exists():
        return None

    with open(CACHE_FILE, 'r') as f:
        data = json.load(f)

    print(f"✓ Loaded cached data from {CACHE_FILE}")
    print(f"  Fetched at: {data.get('fetched_at', 'unknown')}")
    print(f"  Accounts: {len(data.get('accounts', []))}")

    return data


def get_test_data(force_refresh: bool = False) -> Dict[str, Any]:
    """
    Get test data, either from cache or by fetching from API.

    Args:
        force_refresh: If True, always fetch fresh data from API

    Returns:
        Dictionary containing Nessie API data
    """
    if not force_refresh:
        cached_data = load_cache()
        if cached_data:
            return cached_data

    # Fetch fresh data
    data = fetch_nessie_data()
    save_cache(data)
    return data


def extract_salary_from_deposits(nessie_data: Dict[str, Any]) -> Tuple[float, Dict[str, Any]]:
    """Estimate monthly salary and return details (count/method)."""
    import numpy as np

    all_deposits = []
    for account_id, deposits in nessie_data.get('deposits_by_account', {}).items():
        for deposit in deposits:
            amount = deposit.get('amount', 0)
            if amount > 0:
                all_deposits.append(amount)

    if not all_deposits:
        print("  ⚠ No deposits found, using default $5000/month")
        return 5000.0, {"deposits_count": 0, "method": "default", "q75": None}

    amounts_array = np.array(all_deposits)
    q75 = np.percentile(amounts_array, 75)

    large_deposits = [a for a in all_deposits if a >= q75]

    details = {
        "deposits_count": len(all_deposits),
        "large_deposits_count": len(large_deposits),
        "method": "q75_mean" if large_deposits else "median",
        "q75": float(q75)
    }

    if large_deposits:
        salary = np.mean(large_deposits)
        print(f"  ✓ Estimated salary: ${salary:,.0f}/month (from {len(large_deposits)} large deposits)")
    else:
        salary = np.median(amounts_array)
        print(f"  ✓ Estimated salary: ${salary:,.0f}/month (from median of {len(all_deposits)} deposits)")

    return round(salary, 2), details


def create_simulation_request_from_nessie(
    nessie_data: Dict[str, Any],
    user_monthly_income: Optional[float] = None
) -> Dict[str, Any]:
    """
    Transform Nessie API data into a simulation request.

    Args:
        nessie_data: Raw data from Nessie API
        user_monthly_income: Override estimated salary (use if provided)

    Returns:
        Dictionary in SimulationRequest format
    """
    accounts = nessie_data.get('accounts', [])

    # Calculate liquid assets (checking + savings)
    liquid_assets = sum(
        acc['balance']
        for acc in accounts
        if acc.get('type') in ['Checking', 'Savings']
    )

    # Calculate credit debt
    credit_debt = sum(
        acc['balance']
        for acc in accounts
        if acc.get('type') == 'Credit Card'
    )

    # Calculate loan debt and monthly payments from all accounts
    loan_debt = 0
    monthly_loan_payments = 0
    for account_id, loans in nessie_data.get('loans_by_account', {}).items():
        for loan in loans:
            loan_debt += loan.get('amount', 0)
            monthly_payment = loan.get('monthly_payment', 0)
            if monthly_payment > 0:
                monthly_loan_payments += monthly_payment
                print(f"  ✓ Loan payment: ${monthly_payment:,.2f}/month")
            else:
                # Estimate payment: 5% of loan amount per month (rough amortization)
                estimated_payment = loan.get('amount', 0) * 0.05
                monthly_loan_payments += estimated_payment
                print(f"  ℹ Estimated loan payment: ${estimated_payment:,.2f}/month (5% of balance)")

    # Calculate monthly spending from purchases
    all_purchases = []
    for account_id, purchases in nessie_data.get('purchases_by_account', {}).items():
        all_purchases.extend(purchases)

    if all_purchases:
        total_spending = sum(p.get('amount', 0) for p in all_purchases)
        # Assume purchases cover ~90 days
        monthly_spending = (total_spending / 90) * 30
    else:
        monthly_spending = 3000  # Default fallback

    # Calculate spending volatility from purchase variance
    import numpy as np
    if len(all_purchases) > 10:
        amounts = [p.get('amount', 0) for p in all_purchases]
        spending_volatility = np.std(amounts) / np.mean(amounts) if np.mean(amounts) > 0 else 0.15
        spending_volatility = min(max(spending_volatility, 0.05), 0.30)  # Clamp to reasonable range
    else:
        spending_volatility = 0.15

    # Extract salary from deposits or use override
    if user_monthly_income:
        monthly_income = user_monthly_income
        salary_details = {"method": "provided"}
        print(f"  ✓ Using provided monthly income: ${monthly_income:,.2f}")
    else:
        monthly_income, salary_details = extract_salary_from_deposits(nessie_data)

    return {
        "financialProfile": {
            "liquidAssets": round(liquid_assets, 2),
            "creditDebt": round(credit_debt, 2),
            "loanDebt": round(loan_debt, 2),
            "monthlyLoanPayments": round(monthly_loan_payments, 2),  # NOW INCLUDED!
            "monthlySpending": round(monthly_spending, 2),
            "spendingByCategory": {},
            "spendingVolatility": round(spending_volatility, 2)
        },
        "userInputs": {
            "monthlyIncome": round(monthly_income, 2),  # EXTRACTED FROM DEPOSITS
            "age": 30,  # Default - would come from user
            "riskTolerance": "medium"  # Default - would come from user
        },
        "goal": {
            "targetAmount": 50000,  # Default - would come from user via AI parsing
            "timelineMonths": 36,  # Default - would come from user via AI parsing
            "goalType": "savings"  # Default - would come from user via AI parsing
        },
        "simulationParams": {
            "nSimulations": 5000
        },
        "assumptions": {
            "salaryDetails": salary_details
        }
    }


if __name__ == '__main__':
    import argparse

    parser = argparse.ArgumentParser(description='Fetch and cache Nessie API data for testing')
    parser.add_argument('--refresh', action='store_true', help='Force refresh data from API')
    parser.add_argument('--create-request', action='store_true', help='Create simulation request from cached data')

    args = parser.parse_args()

    # Fetch or load data
    data = get_test_data(force_refresh=args.refresh)

    # Optionally create simulation request
    if args.create_request:
        print("\n" + "="*60)
        print("SIMULATION REQUEST FROM NESSIE DATA")
        print("="*60)
        request = create_simulation_request_from_nessie(data)
        print(json.dumps(request, indent=2))
