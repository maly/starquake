"""Lift, hoverpad, and teleport paths through viewer/dump.js."""

from __future__ import annotations

import json
import shutil
import subprocess
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
DUMP = ROOT / "viewer" / "dump.js"
OUT = ROOT / "out"

GAME_Y_ORIGIN = 143
HOVERPAD_PTR = 0xAFC8
PAD_SHOT_PX = 8
START_ENERGY = 0x17

# teleports.md §9 / MOVEMENT.md: name → dest room, dest $0D XY.
TELEPORT_SPAWNS: list[tuple[str, int, int, int]] = [
    ("VEROX", 40, 0xA0, 0x3F),
    ("RAMIX", 31, 0x60, 0x3F),
    ("TULSA", 66, 0xA0, 0x3F),
    ("ASOIC", 150, 0xA0, 0x3F),
    ("DELTA", 162, 0xA0, 0x3F),
    ("QUAKE", 213, 0xA0, 0x3F),
    ("ALGOL", 289, 0xA0, 0x3F),
    ("EXIAL", 343, 0xA0, 0x3F),
    ("KYZIA", 380, 0x60, 0x3F),
    ("ULTRA", 433, 0xA0, 0x3F),
    ("IRAGE", 457, 0xA0, 0x3F),
    ("OKTUP", 461, 0xA0, 0x3F),
    ("SONIQ", 470, 0xA0, 0x3F),
    ("AMIGA", 499, 0x60, 0x27),
    ("AMAHA", 506, 0xA0, 0x27),
]

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
def rooms_json() -> list[dict]:
    path = OUT / "rooms.json"
    if not DUMP.is_file() or not path.is_file():
        pytest.skip("dump.js or out/rooms.json missing")
    return json.loads(path.read_text(encoding="utf-8"))["rooms"]


def _origin_attr(rooms: list[dict], room: int, x: int, game_y: int) -> int:
    play_y = GAME_Y_ORIGIN - game_y
    col, row = x >> 3, play_y >> 3
    return rooms[room]["attributes"][row][col]


def test_all_teleport_table_arrivals(rooms_json: list[dict]) -> None:
    source = 343
    for name, dest, x, y in TELEPORT_SPAWNS:
        payload = _run_dump("--teleport-test", "--code", name, "--room", str(source))
        assert payload["eval"]["ok"] is True, payload
        assert payload["eval"]["dest"] == dest, payload
        assert payload["after"]["room"] == dest, f"{name} room {payload['after']['room']} != {dest}"
        assert payload["after"]["x"] == x, f"{name} x {payload['after']['x']} != {x:#x}"
        assert payload["after"]["y"] == y, f"{name} y {payload['after']['y']} != {y:#x}"
        assert payload["after"]["x"] != 0x88 or dest == source, f"{name} stayed at start $88"
        assert payload["after"]["energy"] == payload["before"]["energy"] == START_ENERGY
        attr = _origin_attr(rooms_json, dest, x, y)
        assert (attr & 0x40) != 0, f"{name} dest origin attr=${attr:02x} is walk-solid (attr < $40)"

    bad = _run_dump("--teleport-test", "--code", "NOPE!", "--room", str(source))
    assert bad["eval"]["ok"] is False
    assert bad["after"]["room"] == source
    assert bad["after"]["message"] == "CODE NOT RECOGNISED"
    assert bad["after"]["energy"] == bad["before"]["energy"] == START_ENERGY
    assert bad["after"]["nastyCount"] == bad["before"]["nastyCount"]


def test_lift_differs_from_walk(rooms_json: list[dict]) -> None:
    lift = _run_dump("--lift-test", "--room", "422", "--x", "72", "--y", "81", "--frames", "8")
    frames = lift["frames"]
    assert frames[0]["dd22"] == 0
    assert frames[0]["y"] == 81
    assert frames[1]["dd22"] == 1
    assert frames[1]["y"] == 83
    for prev, cur in zip(frames[1:], frames[2:]):
        assert cur["dd22"] == 1, cur
        assert cur["y"] - prev["y"] == 2, (prev, cur)
        assert cur["x"] == 72

    room = rooms_json[422]
    found = 0
    for row, attrs in enumerate(room["attributes"]):
        for col, attr in enumerate(attrs):
            if attr != 0x64:
                continue
            found += 1
            assert room["solid"][row][col] == 0, f"$64 overlay-solid at ({col},{row})"
            assert (attr & 0x40) != 0, "$64 must not be walk-solid"
    assert found > 0

    ctrl = _run_dump("--lift-test", "--room", "0", "--x", "72", "--y", "81", "--frames", "4")
    assert all(f["dd22"] == 0 for f in ctrl["frames"]), ctrl
    assert ctrl["frames"][-1]["y"] <= ctrl["frames"][0]["y"]


def test_lift_continues_through_room_249_exit() -> None:
    """Idle ride through the $44 opening (rows 4–5); does not bounce at playY 36–38."""
    payload = _run_dump("--lift-test", "--room", "249", "--x", "104", "--y", "39", "--frames", "50")
    frames = payload["frames"]
    assert frames[0]["y"] == 39
    assert frames[1]["dd22"] == 1
    assert frames[-1]["y"] >= 120, frames[-1]
    assert frames[-1]["playY"] <= 24, frames[-1]
    bounce = [f["playY"] for f in frames if 36 <= f["playY"] <= 38 and f["dd22"] == 0]
    assert bounce == [], bounce


def test_pad_board_fly_fire() -> None:
    if not DUMP.is_file() or not (OUT / "rooms.json").is_file():
        pytest.skip("dump.js or out/ missing")
    payload = _run_dump("--pad-test", "--board", "--right", "--fire", "--room", "15", "--frames", "8")
    assert payload["station"]["x"], payload
    frames = payload["frames"]
    boarded = [f for f in frames if f["dd22"] == 2]
    assert boarded, payload
    first = boarded[0]
    assert first["pad"]["ptr"] == HOVERPAD_PTR
    assert first["pad"]["y"] == first["y"] - 8
    assert first["nastyCount"] == 3

    ys = [f["y"] for f in boarded]
    xs = [f["x"] for f in boarded]
    flew = any(b > a for a, b in zip(ys, ys[1:])) or any(b != a for a, b in zip(xs, xs[1:]))
    assert flew, f"no pad flight while boarded: x={xs} y={ys}"

    fp0 = frames[0]["firepower"]
    later = [f for f in frames if f["firepower"] < fp0]
    assert later, f"firepower did not drop: {[f['firepower'] for f in frames]}"
    shot = later[0]
    flying = shot["padShotDir"] != 0 or abs(shot["bullet"]["x"] - (first["x"] & 0xF8)) == PAD_SHOT_PX
    if not flying:
        # Next frame may be the 8 px step if spawn is recorded before the move.
        nxt = frames[frames.index(shot) + 1] if frames.index(shot) + 1 < len(frames) else shot
        flying = nxt["padShotDir"] != 0 or abs(nxt["bullet"]["x"] - shot["bullet"]["x"]) == PAD_SHOT_PX
    assert flying, shot
    assert shot["fireDir"] == 0 or shot["padShotDir"] != 0
