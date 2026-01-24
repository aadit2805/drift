# Simulation Test Suite

Comprehensive test coverage for the Monte Carlo simulation engine, including integration tests with real Nessie API data.

## Setup

### Install Test Dependencies

```bash
pip install pytest pytest-cov requests
```

### Fetch Real Nessie Data (First Time)

Before running integration tests, fetch and cache real data from the Nessie API:

```bash
cd simulation/tests
python fetch_nessie_data.py
```

This will:
1. Fetch real account, purchase, deposit, bill, and loan data from Nessie API
2. Cache it to `test_data/nessie_cache.json`
3. Use cached data for all future test runs (no repeated API calls)

To refresh the cache with new data:

```bash
python fetch_nessie_data.py --refresh
```

To see what a simulation request looks like with Nessie data:

```bash
python fetch_nessie_data.py --create-request
```

## Running Tests

### Install Test Dependencies

```bash
pip install pytest pytest-cov
```

### Run All Tests

```bash
cd simulation
pytest tests/
```

### Run Tests with Nessie Integration

```bash
# Run all tests including Nessie integration
pytest tests/ -v

# Run only Nessie integration tests
pytest tests/test_nessie_integration.py -v
```

### Run Specific Test Files

```bash
# Model validation tests
pytest tests/test_models.py -v

# Monte Carlo simulation tests
pytest tests/test_monte_carlo.py -v

# Integration tests
pytest tests/test_integration.py -v

# Performance benchmarks
pytest tests/test_performance.py -v
```

### Run with Coverage

```bash
pytest tests/ --cov=. --cov-report=html
```

### Run Fast Tests Only (Skip Performance)

```bash
pytest tests/ -m "not slow"
```

## Test Structure

### `test_models.py`
- **Purpose**: Validate Pydantic models and input validation
- **Coverage**:
  - FinancialProfile validation (non-negative values, volatility ranges)
  - UserInputs validation (income, age, risk tolerance)
  - Goal validation (positive amounts, timeline limits)
  - SimulationParams normalization (5000/50000 rounding)
  - Risk tolerance profile application (low/medium/high)

### `test_monte_carlo.py`
- **Purpose**: Test core simulation engine
- **Coverage**:
  - Worker allocation (2 workers for 5000, 4 for 50000)
  - Batch execution and reproducibility
  - Full simulation results validation
  - Percentile ordering
  - Progress callback functionality
  - Edge cases (easy goals, impossible goals)

### `test_integration.py`
- **Purpose**: End-to-end workflow testing with mock data
- **Coverage**:
  - JSON parsing (camelCase and snake_case)
  - Output formatting for JavaScript
  - Complete simulation workflow
  - Sensitivity analysis workflow
  - Error handling (invalid JSON, missing fields)

### `test_nessie_integration.py` ⭐ NEW
- **Purpose**: Integration testing with real Nessie API data
- **Coverage**:
  - Fetching and caching real financial data
  - Transforming Nessie data to simulation requests
  - Running simulations with real user data
  - Sensitivity analysis with real data
  - Edge cases (negative balance, aggressive goals)
  - Data caching performance
- **Note**: Requires Nessie data cache (run `fetch_nessie_data.py` first)

### `test_performance.py`
- **Purpose**: Performance benchmarks
- **Coverage**:
  - 5000 simulations complete in < 10 seconds
  - 50000 simulations complete in < 60 seconds
  - Worker speedup verification
  - Memory efficiency with long timelines
  - Reproducibility across runs
  - Risk tolerance impact on results

## Expected Performance Targets

| Simulations | Workers | Max Time | Expected Throughput |
|------------|---------|----------|---------------------|
| 5,000      | 2       | 10s      | ~500-1000 sims/sec  |
| 50,000     | 4       | 60s      | ~800-1500 sims/sec  |

## Test Categories

### Unit Tests
- Individual function testing
- Input validation
- Model creation
- Worker allocation logic

### Integration Tests
- JSON parsing → simulation → output
- Sensitivity analysis workflow
- Error handling and recovery

### Performance Tests
- Execution time benchmarks
- Scalability verification
- Memory efficiency
- Reproducibility

## Continuous Integration

Add to your CI pipeline:

```yaml
- name: Run simulation tests
  run: |
    cd simulation
    pip install -r requirements.txt
    pip install pytest pytest-cov
    pytest tests/ -v --cov=. --cov-report=xml
```

## Writing New Tests

### Test Naming Convention
- Test files: `test_*.py`
- Test classes: `Test*`
- Test methods: `test_*`

### Example Test

```python
def test_my_feature():
    """Test description."""
    # Arrange
    request = create_test_request()
    
    # Act
    result = run_monte_carlo(request)
    
    # Assert
    assert result.success_probability > 0
```

### Fixtures

Common test fixtures are in `conftest.py`. Add new fixtures there for reuse across test files.

## Troubleshooting

### Import Errors
Make sure you're running tests from the `simulation/` directory:
```bash
cd simulation
pytest tests/
```

### Slow Tests
Skip performance benchmarks during development:
```bash
pytest tests/ --ignore=tests/test_performance.py
```

### Reproducibility Issues
If tests fail due to randomness, check that:
1. Seeds are being set consistently
2. Worker allocation is deterministic
3. NumPy version matches (>= 1.24.0)
