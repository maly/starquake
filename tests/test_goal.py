"""Doors / core victory / end-screen paths through viewer/dump.js."""

from __future__ import annotations

import json
import shutil
import subprocess
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
DUMP = ROOT / "viewer" / "dump.js"
OUT = ROOT / "out"

DOOR_SHIFT_X = 0x30
DOOR_REASON = 0x03
CORE_VICTORY_PAIRS = 5

pytestmark = pytest.mark.skipif(shutil.which("node") is None, reason="node required")


def _run_dump(*args: str, timeout: int = 60) -> dict:
    proc = subprocess.run(
        ["node", str(DUMP), "--data", str(OUT), *args],
        check=True,
        capture_output=True,
        text=True,
        timeout=timeout,
    )
    return json.loads(proc.stdout)


@pytest.fixture(scope="module")
def built() -> None:
    if not DUMP.is_file() or not (OUT / "rooms.json").is_file():
        pytest.skip("dump.js or out/rooms.json missing")


def test_door_opens_with_key(built: None) -> None:
    payload = _run_dump("--door-test", "--room", "176")
    assert payload["door"]["x"] == 128
    assert payload["expected"] == [10, 10, 12]
    assert payload["after"]["shifted"] is True
    assert payload["after"]["x"] == (payload["before"]["x"] + DOOR_SHIFT_X) & 0xFF
    assert payload["after"]["d2c4"] == DOOR_REASON
    assert "AUTHORISED" in payload["after"]["message"].upper()


def test_victory_delivers_nine_cores(built: None) -> None:
    payload = _run_dump("--victory-test")
    assert payload["victory"] is True
    assert payload["gameOver"] is True
    assert payload["coresLeft"] == 0
    assert payload["corePairs"] == CORE_VICTORY_PAIRS
    er = payload["endResult"]
    assert er is not None
    assert er["victory"] is True
    assert er["coresReplaced"] == 9
    assert len(er["scoreDigits"]) == 6
    assert isinstance(er["adventure"], int)
    assert isinstance(er["timeMinutes"], int)
    assert isinstance(er["timeSeconds"], int)


def test_lives_zero_endresult_shape(built: None) -> None:
    payload = _run_dump("--end-test", "--mode", "gameover")
    assert payload["gameOver"] is True
    assert payload["victory"] is False
    assert payload["message"] == "GAME OVER"
    er = payload["endResult"]
    assert er is not None
    assert er["victory"] is False
    assert len(er["scoreDigits"]) == 6
    assert "coresReplaced" in er
    assert "adventure" in er
    assert "timeMinutes" in er
    assert "timeSeconds" in er
