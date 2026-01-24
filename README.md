# Monte Carlo Finance

**HPC-powered personal financial simulation for everyone.**

> Run 10,000 simulations of your financial future in seconds. See probability distributions, not single-point estimates.

Built for the Capital One + NorthMark HPC hackathon tracks.

## The Problem

Traditional budgeting apps give you deterministic projections: "Save $500/month and you'll have $18,000 in 3 years."

But life isn't deterministic. Income varies. Unexpected expenses happen. Markets fluctuate.

## Our Solution

Monte Carlo simulation—the same technique used by hedge funds and financial advisors—made accessible to everyone:

1. **Connect your accounts** via Capital One's Nessie API
2. **Describe your goal** in plain English: "Save $50k for a house in 3 years"
3. **Run 10,000 simulations** with realistic variance models
4. **See your probability** of success, not a false single number

## Features

- **Natural Language Goals**: Our LLM parses "retire by 55" into simulation parameters
- **Real Banking Data**: Pulls spending patterns from Nessie API
- **HPC Simulation**: Parallel Monte Carlo engine runs 10k scenarios in <500ms
- **Probability Distributions**: See p10/p25/p50/p75/p90 outcomes
- **Sensitivity Analysis**: "Reducing dining out by 20% improves your odds by 8%"
- **Plain English Insights**: AI-generated recommendations

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind, Recharts
- **Backend**: Express.js, TypeScript
- **Simulation**: Python, NumPy (vectorized + multiprocessing)
- **APIs**: Nessie (Capital One), OpenAI/Claude

## Quick Start

### Prerequisites

- Node.js 18+
- Python 3.11+
- npm or yarn

### Installation

```bash
# Clone the repo
git clone https://github.com/yourteam/pff.git
cd pff

# Install dependencies
npm install

# Set up Python environment
cd simulation
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows
pip install -r requirements.txt
cd ..

# Copy environment variables
cp .env.example .env
# Edit .env with your API keys
```

### Running Locally

```bash
# Terminal 1: Start the API server
npm run dev:api

# Terminal 2: Start the frontend
npm run dev:web

# Terminal 3 (optional): Seed demo data
npm run seed
```

Open http://localhost:3000

## Project Structure

```
pff/
├── apps/
│   ├── web/              # Next.js frontend
│   └── api/              # Express backend
├── simulation/           # Python Monte Carlo engine
├── scripts/              # Utilities (data seeding, testing)
└── docs/                 # API and simulation documentation
```

## How the HPC Works

Our simulation engine demonstrates key HPC concepts:

1. **Parallelization**: Work split across CPU cores via `multiprocessing.Pool`
2. **Vectorization**: NumPy array operations instead of Python loops
3. **Abstraction**: Users see "Running simulation..." not matrix math

```
Sequential (1 worker):  ~800ms for 10k sims
Parallel (4 workers):   ~250ms for 10k sims
Speedup:                3.2x
```

See [docs/SIMULATION.md](docs/SIMULATION.md) for technical details.

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/financial-profile` | Aggregated Nessie data |
| `POST /api/parse-goal` | LLM goal parsing |
| `POST /api/simulate` | Run Monte Carlo simulation |
| `POST /api/sensitivity` | Run sensitivity analysis |

See [docs/API.md](docs/API.md) for full documentation.
