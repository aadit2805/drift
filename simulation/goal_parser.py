"""
Goal parsing using OpenAI API.

Parses vague goal descriptions like "I want to retire in 15 years"
and converts them into structured financial targets.
"""

import os
import json
import logging
from typing import Dict, Any, Optional, Tuple
from pathlib import Path
from pydantic import BaseModel

# Load .env if present so OPEN_AI_API_KEY/OPENAI_API_KEY is available when running scripts directly
try:
    from dotenv import load_dotenv  # type: ignore

    env_path = Path(__file__).resolve().parent.parent / ".env"
    if env_path.exists():
        load_dotenv(env_path)
except Exception:
    # Fail silently if python-dotenv is not installed
    pass

logger = logging.getLogger(__name__)

# OpenAI API configuration (support both env var names)
OPENAI_API_KEY = os.getenv('OPEN_AI_API_KEY') or os.getenv('OPENAI_API_KEY')

# Common goal templates for retirement/milestones
GOAL_TEMPLATES = {
    "retirement": {
        "description": "Retirement planning",
        "multiplier": lambda monthly_income: monthly_income * 12 * 25,  # 25x annual salary
        "default_years": 35
    },
    "house": {
        "description": "House down payment",
        "multiplier": lambda _: 100000,  # 20% down on $500k house
        "default_years": 5
    },
    "emergency_fund": {
        "description": "Emergency fund (6 months)",
        "multiplier": lambda monthly_income: monthly_income * 6,
        "default_years": 1
    },
    "vacation": {
        "description": "Vacation/travel",
        "multiplier": lambda _: 10000,
        "default_years": 2
    },
    "college": {
        "description": "College fund",
        "multiplier": lambda _: 100000,
        "default_years": 18
    },
    "car": {
        "description": "New car",
        "multiplier": lambda _: 30000,
        "default_years": 3
    }
}


class ParsedGoal(BaseModel):
    goal_type: str
    target_amount: float
    timeline_months: int
    description: str
    confidence: float
    source: str = "ai"  # ai | template | fallback


def _normalize_retirement_timeline(goal_text: str, current_age: int, default_years: int) -> int:
    """Derive retirement timeline in months. Handles phrases like "retire by 60"."""
    import re

    # Look for "by 60" or "by age 60"
    by_age_match = re.search(r"by\s+age?\s*(\d{2})", goal_text.lower())
    if by_age_match:
        retire_age = int(by_age_match.group(1))
        years_left = max(retire_age - current_age, 1)
        return years_left * 12

    # Look for "in 15 years"
    years_match = re.search(r"(\d+)\s*years?", goal_text.lower())
    if years_match:
        return max(int(years_match.group(1)), 1) * 12

    return default_years * 12


def _validate_goal_output(goal: ParsedGoal, monthly_income: float) -> ParsedGoal:
    """Clamp clearly bad outputs (e.g., $60 retirement goals)."""
    min_target_by_type = {
        "retirement": monthly_income * 12 * 15,  # at least 15x annual
        "house": 20000,
        "emergency_fund": monthly_income * 3,
    }

    min_target = min_target_by_type.get(goal.goal_type, 5000)
    if goal.target_amount < min_target:
        goal.target_amount = round(min_target, 2)
        goal.description += " (auto-corrected unrealistic target)"
        goal.confidence = min(goal.confidence, 0.6)
        goal.source = goal.source or "corrected"

    # Ensure timeline is at least 12 months
    if goal.timeline_months < 12:
        goal.timeline_months = 12
        goal.description += " (min 12 months enforced)"

    return goal


def parse_goal_with_openai(
    goal_text: str,
    monthly_income: float,
    risk_tolerance: str = "medium",
    current_age: int = 30
) -> ParsedGoal:
    """
    Parse a vague goal description using OpenAI.
    
    Args:
        goal_text: User's goal in natural language (e.g., "retire in 15 years")
        monthly_income: User's monthly income for context
        risk_tolerance: User's risk tolerance level
    
    Returns:
        ParsedGoal with structured target amount and timeline
    """
    
    if not OPENAI_API_KEY:
        logger.warning("OpenAI API key not found, using template matching")
        return parse_goal_with_templates(goal_text, monthly_income, current_age=current_age)
    
    try:
        from openai import OpenAI

        client = OpenAI(api_key=OPENAI_API_KEY)
        
        prompt = f"""
You are a financial advisor. Parse the following savings goal and extract:
1. Type of goal (retirement, house, emergency_fund, vacation, college, car, custom)
2. Target amount in USD
3. Timeline in months
4. Whether the goal description contains enough information to parse (realistic and clear)

User context:
- Monthly income: ${monthly_income:,.0f}
- Risk tolerance: {risk_tolerance}
- Goal description: "{goal_text}"

Important: If the goal seems unrealistic or lacks critical information (e.g., "buy a corvette for $3" or goals with extremely low amounts relative to stated timeline), flag it and provide clarifying questions needed.

Respond as JSON with these fields:
{{
    "goal_type": "string (one of: retirement, house, emergency_fund, vacation, college, car, custom)",
    "target_amount": number (USD) or null if unclear,
    "timeline_months": number or null if unclear,
    "description": "string describing the goal",
    "confidence": number (0-1, how confident are you in this parsing),
    "needs_clarification": boolean (true if goal seems unrealistic or lacks critical info),
    "clarifying_questions": ["string"] or [] (questions to ask the user for clarification)
}}

Example: If user says "I want to retire in 15 years", respond:
{{
    "goal_type": "retirement",
    "target_amount": {monthly_income * 12 * 25},
    "timeline_months": 180,
    "description": "Retirement in 15 years (25x annual salary)",
    "confidence": 0.9,
    "needs_clarification": false,
    "clarifying_questions": []
}}

Example: If user says "Buy a corvette for $3", respond:
{{
    "goal_type": "car",
    "target_amount": null,
    "timeline_months": null,
    "description": "Purchase a corvette",
    "confidence": 0.2,
    "needs_clarification": true,
    "clarifying_questions": ["A corvette typically costs $50,000-$100,000+. Did you mean $300 or $30,000?", "When do you want to buy the corvette?"]
}}
"""
        
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": "You are a helpful financial planning assistant. Always respond with valid JSON."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.3,
            max_tokens=300
        )
        
        # Parse response
        response_text = response.choices[0].message.content.strip()
        
        # Extract JSON from response (handle markdown code blocks)
        if "```json" in response_text:
            response_text = response_text.split("```json")[1].split("```")[0].strip()
        elif "```" in response_text:
            response_text = response_text.split("```")[1].split("```")[0].strip()
        
        parsed = json.loads(response_text)
        
        # If clarification is needed, return a goal with low confidence and clarifying questions
        if parsed.get("needs_clarification", False):
            # Return a fallback goal but flag it for user clarification
            questions = parsed.get("clarifying_questions", [])
            goal = ParsedGoal(
                goal_type=parsed.get("goal_type", "custom"),
                target_amount=parsed.get("target_amount", monthly_income * 12 * 5),  # Default conservative estimate
                timeline_months=parsed.get("timeline_months", 36),
                description=parsed.get("description", "Goal needs clarification") + " (NEEDS CLARIFICATION)",
                confidence=min(0.3, float(parsed.get("confidence", 0.2))),
                source="ai_needs_clarification"
            )
            
            # Log the clarifying questions for frontend
            logger.warning(f"Goal needs clarification: {questions}")
            
            return goal

        # Build ParsedGoal with source metadata
        goal = ParsedGoal(
            goal_type=parsed.get("goal_type", "custom"),
            target_amount=parsed.get("target_amount", monthly_income * 12 * 20),
            timeline_months=parsed.get("timeline_months", 12 * 12),
            description=parsed.get("description", "AI parsed goal"),
            confidence=float(parsed.get("confidence", 0.6)),
            source="ai"
        )

        # If retirement and "by <age>" is present, normalize timeline
        if goal.goal_type == "retirement":
            goal.timeline_months = _normalize_retirement_timeline(goal_text, current_age, default_years=35)
            goal.description += " (retirement timeline normalized)"

        goal = _validate_goal_output(goal, monthly_income)

        logger.info(f"Parsed goal: {goal.goal_type} - ${goal.target_amount:,.0f} in {goal.timeline_months} months")

        return goal
        
    except Exception as e:
        logger.error(f"OpenAI parsing failed: {e}, falling back to templates")
        return parse_goal_with_templates(goal_text, monthly_income, current_age=current_age)


def parse_goal_with_templates(
    goal_text: str,
    monthly_income: float,
    current_age: int = 30
) -> ParsedGoal:
    """
    Fall back to template matching if OpenAI is unavailable.
    """
    goal_lower = goal_text.lower()
    
    # Try to match against known templates
    # Handle common synonym: "retire" should map to "retirement"
    if "retire" in goal_lower and "retirement" not in goal_lower:
        goal_lower += " retirement"

    for goal_type, template in GOAL_TEMPLATES.items():
        if goal_type in goal_lower:
            target = template['multiplier'](monthly_income)
            timeline = template['default_years'] * 12

            import re
            # Extract years if specified
            years_match = re.search(r'(\d+)\s*years?', goal_lower)
            # For retirement, allow "by 60"
            if goal_type == "retirement":
                timeline = _normalize_retirement_timeline(goal_text, current_age, default_years=template['default_years'])
            elif years_match:
                timeline = int(years_match.group(1)) * 12

            goal = ParsedGoal(
                goal_type=goal_type,
                target_amount=round(target, 2),
                timeline_months=timeline,
                description=template['description'],
                confidence=0.7,
                source="template"
            )

            return _validate_goal_output(goal, monthly_income)
    
    # Default: custom goal with conservative estimate
    logger.warning(f"Could not parse goal: {goal_text}, using default")
    
    goal = ParsedGoal(
        goal_type="custom",
        target_amount=25000,
        timeline_months=36,
        description=f"Custom goal: {goal_text}",
        confidence=0.3,
        source="fallback"
    )

    return _validate_goal_output(goal, monthly_income)


def extract_salary_from_deposits(
    deposits_by_account: Dict[str, list],
    purchases_data: Optional[Dict[str, list]] = None,
    return_details: bool = False
) -> Tuple[float, Optional[Dict[str, Any]]]:
    """
    Estimate monthly salary from deposit patterns.
    
    Looks for regular deposits (likely paychecks) by identifying
    recurring large deposits around the same time each month.
    
    Args:
        deposits_by_account: Deposits grouped by account
        purchases_data: Purchases data for context (to estimate spending)
    
    Returns:
        Estimated monthly salary
    """
    import numpy as np
    from datetime import datetime, timedelta
    
    all_deposits = []
    
    # Collect all deposits
    for account_id, deposits in deposits_by_account.items():
        for deposit in deposits:
            amount = deposit.get('amount', 0)
            if amount > 0:  # Only count positive deposits
                all_deposits.append({
                    'amount': amount,
                    'date': deposit.get('date', ''),
                    'description': deposit.get('description', '')
                })
    
    if not all_deposits:
        logger.warning("No deposits found, assuming $5000/month salary")
        return (5000.0, {"deposits_count": 0, "method": "default", "q75": None}) if return_details else 5000.0
    
    # Look for large recurring deposits (likely salary)
    amounts = [d['amount'] for d in all_deposits]
    amounts_array = np.array(amounts)
    
    # Filter to large deposits (> 75th percentile)
    q75 = np.percentile(amounts_array, 75)
    large_deposits = [a for a in amounts if a >= q75]
    
    details = {
        "deposits_count": len(all_deposits),
        "large_deposits_count": len(large_deposits),
        "method": "q75_mean" if large_deposits else "median",
        "q75": float(q75)
    }

    if large_deposits:
        salary = np.mean(large_deposits)
    else:
        salary = np.median(amounts)
    
    logger.info(f"Estimated monthly salary: ${salary:,.0f} (from {len(all_deposits)} deposits)")
    
    salary = round(salary, 2)
    return (salary, details) if return_details else salary
