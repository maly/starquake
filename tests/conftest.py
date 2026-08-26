from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
SNAPSHOT_PATH = ROOT / "reference" / "src" / "starquake.z80"
REFERENCE_WRITER = ROOT / "reference" / "src" / "starquake.py"


@pytest.fixture(scope="session")
def snapshot_path() -> Path:
    if not SNAPSHOT_PATH.is_file():
        pytest.skip(f"reference snapshot missing: {SNAPSHOT_PATH}")
    return SNAPSHOT_PATH
