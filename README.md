# Drift

Monte Carlo financial simulation that shows you the probability of hitting your goals.

## What It Does

Traditional budgeting tools give you single-point estimates. Drift runs 100,000 simulations to show probability distributions instead.

1. Connect bank accounts via Nessie API
2. Enter a goal in plain English ("Save $50k for a house in 3 years")
3. Get success probability, percentile outcomes, and what-if scenarios

## Features

- Natural language goal parsing via Gemini
- Real banking data from Capital One Nessie API
- Parallel Monte Carlo simulation (100k runs in ~500ms)
- Sensitivity analysis and what-if scenarios
- Voice narration of results via ElevenLabs

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind, Recharts, Three.js
- **Backend**: Express.js, TypeScript
- **Simulation**: Python, NumPy, multiprocessing
- **APIs**: Nessie (Capital One), Google Gemini, ElevenLabs

## Quick Start

### Prerequisites

- Node.js 18+
- Python 3.11+
- npm or yarn

### Installation

```bash
# Clone and install
git clone https://github.com/aadit2805/drift.git
cd drift

# Install dependencies
npm install

# (Optional) Set up Python environment for faster simulations
cd simulation
python3 -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows
pip install -r requirements.txt
cd ..
```

### Environment Variables

Add your API keys to `.env`:
- `NESSIE_API_KEY` - Capital One Nessie API key
- `GEMINI_API_KEY` - Google Gemini for goal parsing
- `ELEVENLABS_API_KEY` - For voice narration (optional)

### Run

```bash
npm run dev
```

Runs both the API (port 3001) and web app (port 3000) via Turborepo.

Open http://localhost:3000

## Project Structure

```
drift/
├── apps/
│   ├── web/              # Next.js frontend
│   └── api/              # Express backend
├── simulation/           # Python Monte Carlo engine
├── scripts/              # Utilities (data seeding, testing)
└── docs/                 # API and simulation documentation
```

## Simulation

The Python engine uses NumPy vectorization and multiprocessing to run 100k simulations across CPU cores. Models include income growth variance, spending volatility, investment returns, emergency events, and inflation.
