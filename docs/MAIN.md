# TAMUhack 2026 Project Plan
## Project: GoalCast (HPC-Powered Personal Finance Goal Simulator)

**Tracks targeted:**
- NorthMark Compute & Cloud Challenge (HPC job submission for non-experts)
- Capital One Challenge (Best Financial Hack, optional Nessie API)

---

## 1) One-Sentence Pitch
GoalCast helps a non-expert estimate the probability of reaching a financial goal (house, car, retirement) by submitting a large-scale Monte Carlo simulation job to a simulated HPC cluster, then presenting decision-ready insights and “what-if” adjustments.

---

## 2) Core User Story (Judge-Friendly)
1. User loads mock banking data (Nessie or demo dataset).
2. User completes a short wizard (age, salary, dependents, rent, etc.).
3. User types a goal in plain English:  
   _“I want to buy a Corvette in 12 months.”_
4. The system converts that text into a structured JSON GoalSpec.
5. User clicks **Submit to Cluster**.
6. The system runs **50,000+ parallelized simulations** and returns:
   - Probability of success
   - Confidence distribution (P10/P50/P90)
   - Top drivers (risk factors)
   - What to change to improve success odds
7. User runs “what-if” scenarios instantly (ex: -$200 monthly spending).

---

## 3) NorthMark Track Requirements Mapping
### ✅ Requirement: Non-expert can submit HPC job without HPC knowledge
- UI is a wizard + goal text box
- No mention of Slurm/MPI/K8s required
- “Submit to Cluster” button abstracts compute

### ✅ Requirement: Inputs are structured
- Wizard produces `UserProfile` JSON
- LLM produces `GoalSpec` JSON
- Combined into a single `JobSpec`

### ✅ Requirement: Large-scale processing is abstracted
- System splits into tasks (chunks)
- Worker nodes run tasks in parallel
- Dashboard shows job state + progress

### ✅ Requirement: Results help decisions
- Success probability + percentiles
- “Smallest change to reach 80% probability”
- Recommended next simulations

### ✅ Requirement: Show how it was built + agentic/AI
- “How it works” panel shows:
  - JobSpec JSON
  - Task splitting
  - Worker node execution
  - LLM parsing output + explanations

---

## 4) Capital One Track Requirements Mapping
### ✅ Fintech value
- Helps users shop smarter (spending insights)
- Helps users plan major purchases & retirement (goal planning)
- Improves financial literacy (explain drivers and tradeoffs)

### Optional: Nessie mock banking data
- Import transactions as sample spending history
- Use as baseline to estimate cashflow & habits
- Cache locally so simulation does not rely on Nessie during compute

---

## 5) Project Goals (What “Done” Looks Like)
### MVP Must-Have (ship this)
- Wizard collects user info
- Goal text -> JSON GoalSpec (LLM or deterministic parsing fallback)
- Job submission creates JobSpec and enqueues work
- Parallel simulation across worker pool
- Job dashboard with:
  - queued/running/done
  - tasks completed / total
  - worker nodes status
- Results page showing:
  - success probability
  - P10/P50/P90 ending balance or time-to-goal
  - simple insight bullets
- “What-if” run: adjust monthly spending +/- X and resubmit job

### Strong Stretch (if time remains)
- Scenario comparison view (baseline vs what-if)
- “Smallest change to reach target probability” solver
- PDF export or shareable results link
- Nessie API import working end-to-end
- Enhanced realism: shock expenses + job loss probability

---

## 6) Non-Goals (avoid scope creep)
- Real financial advice or real credit score prediction
- Complex portfolio optimization
- Real-time bank integrations beyond mock data
- Perfect economic modeling
- Production-grade authentication

---

## 7) Functional Requirements

### 7.1 Wizard + User Profile
**Inputs (examples):**
- age
- salary (annual)
- dependents (0,1,2+)
- rent/mortgage
- current savings
- monthly discretionary spend estimate (or derived from transactions)
- risk tolerance: Conservative / Moderate / Aggressive

**Output: `UserProfile` JSON**
```json
{
  "age": 22,
  "annual_salary": 85000,
  "dependents": 0,
  "monthly_rent": 1600,
  "current_savings": 8000,
  "monthly_discretionary": 900,
  "risk_tolerance": "moderate"
}
