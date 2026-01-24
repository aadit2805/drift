"""
Test configuration and fixtures for pytest.
"""

import sys
from pathlib import Path

# Add parent directory to path for imports
simulation_dir = Path(__file__).parent.parent
sys.path.insert(0, str(simulation_dir))


def pytest_configure(config):
    """Configure pytest."""
    config.addinivalue_line(
        "markers", "slow: marks tests as slow (deselect with '-m \"not slow\"')"
    )
    config.addinivalue_line(
        "markers", "integration: marks tests as integration tests"
    )
