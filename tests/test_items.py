"""Collect $94E8 items: effect + persistence across rooms."""

from __future__ import annotations

import json
import shutil
import subprocess
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
DUMP = ROOT / "viewer" / "dump.js"
OUT = ROOT / "out"
ITEMS = OUT / "items.json"

pytestmark = pytest.mark.skipif(shutil.which("node") is None, reason="node required")


def _rooms_with_items() -> list[int]:
    data = json.loads(ITEMS.read_text(encoding="utf-8"))
    rooms = []
    for it in data["items"]:
        if it.get("placed") and it.get("sprite") not in (255,) and it.get("room") not in (199,):
            rooms.append(it["room"])
        if len(rooms) >= 3:
            break
    return rooms


def test_collect_persists_across_rooms() -> None:
    if not DUMP.is_file() or not ITEMS.is_file():
        pytest.skip("dump.js or items.json missing")
    rooms = _rooms_with_items()
    assert rooms, "need placed items"
    results = []
    for room in rooms:
        proc = subprocess.run(
            ["node", str(DUMP), "--data", str(OUT), "--collect-test", "--room", str(room)],
            check=True,
            capture_output=True,
            text=True,
            timeout=60,
        )
        payload = json.loads(proc.stdout)
        results.append((room, payload))
        assert payload["afterPick"]["collected"] == 1, payload
        assert payload["afterPick"]["inventory"], payload
        assert payload["afterReturn"]["collected"] == 1, payload
    assert len(results) >= 2
