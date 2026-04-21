import sys
from pathlib import Path

# Ensure the backend root is on sys.path so tests can import modules directly
sys.path.insert(0, str(Path(__file__).resolve().parent))
