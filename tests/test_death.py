"""Death / respawn / game-over paths through viewer/dump.js --death-test."""

from __future__ import annotations

import json
import shutil
import subprocess
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
DUMP = ROOT / "viewer" / "dump.js"
OUT = ROOT / "out"

START_ENERGY = 0x17
START_LIVES = 4
RESPAWN_ENERGY = 0x7F
PLAT_OR_ON_DEATH = 0x08
ANNOY_DRAIN_BUMP = 0x0A
NASTY_INNER_STEPS = 4
ALIGN_START_X = 0x89
ALIGN_START_Y = 0x40
ALIGN_AFTER_X = 0x88
ALIGN_AFTER_Y = 0x3F
TERRAIN_HOTSPOT_X = 0xD0
TERRAIN_HOTSPOT_Y = 0x47
CHECKPOINT_X = 0x88
CHECKPOINT_Y = 0x3F
GAME_OVER_MSG = "GAME OVER"

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
def rooms_ready() -> None:
    if not DUMP.is_file() or not (OUT / "rooms.json").is_file():
        pytest.skip("dump.js or out/rooms.json missing")


def _death(mode: str) -> dict:
    payload = _run_dump("--death-test", "--mode", mode)
    assert payload["mode"] == mode, payload
    assert "before" in payload and "after" in payload, payload
    return payload


def test_energy_death_respawns(rooms_ready: None) -> None:
    payload = _death("energy")
    before, after = payload["before"], payload["after"]
    assert before["energy"] == 0
    assert before["x"] == ALIGN_START_X and before["y"] == ALIGN_START_Y, before
    assert after["deathA"] == 2
    assert after["d2c4"] == 0
    assert after["energy"] == RESPAWN_ENERGY
    assert after["lives"] == START_LIVES - 1
    assert after["x"] == ALIGN_AFTER_X, f"energy XY engine ({after['x']:#x},{after['y']:#x})"
    assert after["y"] == ALIGN_AFTER_Y, f"energy XY engine ({after['x']:#x},{after['y']:#x})"
    assert after["gameOver"] is False


def test_terrain_kills_instantly(rooms_ready: None) -> None:
    payload = _death("terrain")
    before, after = payload["before"], payload["after"]
    assert before["x"] == TERRAIN_HOTSPOT_X and before["y"] == TERRAIN_HOTSPOT_Y, before
    assert after["deathA"] == 0x10
    assert after["d2c4"] == 1
    assert after["energy"] == RESPAWN_ENERGY
    assert after["lives"] == START_LIVES - 1
    assert (after["x"], after["y"]) != (TERRAIN_HOTSPOT_X, TERRAIN_HOTSPOT_Y), (
        f"terrain XY stayed on hotspot ${TERRAIN_HOTSPOT_X:02X},${TERRAIN_HOTSPOT_Y:02X} "
        f"engine ({after['x']:#x},{after['y']:#x})"
    )
    assert after["x"] == CHECKPOINT_X and after["y"] == CHECKPOINT_Y, (
        f"terrain XY engine ({after['x']:#x},{after['y']:#x}) "
        f"expected checkpoint (${CHECKPOINT_X:02X},${CHECKPOINT_Y:02X})"
    )
    assert after["gameOver"] is False


def test_lethal_enemy_kills_instantly(rooms_ready: None) -> None:
    payload = _death("lethal")
    before, after = payload["before"], payload["after"]
    assert before["energy"] == START_ENERGY, "energy must be unchanged in $A305 before respawn"
    assert after["deathA"] == 1
    assert after["d2c4"] == 0
    assert after["energy"] == RESPAWN_ENERGY
    assert after["energy"] != 0
    assert after["lives"] == START_LIVES - 1
    assert after["gameOver"] is False


def test_lethal_c8_restores_checkpoint(rooms_ready: None) -> None:
    payload = _death("lethal-c8")
    after = payload["after"]
    assert after["deathA"] == 0x11
    assert after["d2c4"] == 1
    assert after["energy"] == RESPAWN_ENERGY
    assert after["lives"] == START_LIVES - 1
    assert after["x"] == CHECKPOINT_X and after["y"] == CHECKPOINT_Y, (
        f"lethal-c8 XY engine ({after['x']:#x},{after['y']:#x})"
    )


def test_annoy_bumps_drain_not_energy(rooms_ready: None) -> None:
    payload = _death("annoy")
    before, after = payload["before"], payload["after"]
    assert after["deathA"] == 0
    assert after["gameOver"] is False
    assert after["lives"] == START_LIVES
    assert after["energy"] == START_ENERGY
    expected_drain = (before["energyDrain"] + 1 + ANNOY_DRAIN_BUMP * NASTY_INNER_STEPS) & 0xFF
    assert after["energyDrain"] == expected_drain, (
        f"drain before={before['energyDrain']:#x} after={after['energyDrain']:#x} "
        f"expected {expected_drain:#x} (+1 tick + $0A×{NASTY_INNER_STEPS})"
    )


def test_respawn_restores_stats(rooms_ready: None) -> None:
    payload = _death("respawn")
    before, after = payload["before"], payload["after"]
    assert before["platforms"] == 7
    assert before["firepower"] == 16
    assert before["inventory"]
    assert after["deathA"] == 2
    assert after["d2c4"] == 0
    assert after["energy"] == RESPAWN_ENERGY
    assert after["lives"] == START_LIVES - 1
    assert after["platforms"] == before["platforms"] | PLAT_OR_ON_DEATH
    assert after["platforms"] == 0x0F
    assert after["firepower"] == before["firepower"] == 16
    assert after["inventory"] == before["inventory"]
    assert after["gameOver"] is False


def test_gameover_on_zero_lives(rooms_ready: None) -> None:
    payload = _death("gameover")
    before, after = payload["before"], payload["after"]
    assert before["lives"] == 0
    assert after["deathA"] == 2
    assert after["lives"] == 0, f"DEC on game over: before={before['lives']} after={after['lives']}"
    assert after["gameOver"] is True
    assert after["message"] == GAME_OVER_MSG
