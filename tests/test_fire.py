"""Compare engine fire path and hit to a headless $C85A / $A01B run."""

from __future__ import annotations

import json
import shutil
import subprocess
from pathlib import Path

import pytest

from starquake_extract.emulator import EA60, HL_TIMES_DE, ROOM_ID, SPRITE_BUF, STACK
from starquake_extract.snapshot import load_z80
from z80 import Z80Machine

ROOT = Path(__file__).resolve().parents[1]
SNAPSHOT = ROOT / "reference" / "src" / "starquake.z80"
DUMP = ROOT / "viewer" / "dump.js"
OUT = ROOT / "out"

pytestmark = pytest.mark.skipif(shutil.which("node") is None, reason="node required")


def _run_until_halt(machine: Z80Machine, budget: int = 8000) -> None:
    machine.set_breakpoint(HL_TIMES_DE)
    machine.set_breakpoint(0xD7C0)
    steps = 0
    while True:
        machine.ticks_to_stop = 200_000
        machine.run()
        steps += 1
        if machine.halted:
            return
        if machine.pc == HL_TIMES_DE:
            product = (machine.hl * machine.de) & 0xFFFF
            sp = machine.sp
            ret = machine.memory[sp] | (machine.memory[sp + 1] << 8)
            machine.sp = (sp + 2) & 0xFFFF
            machine.hl = product
            machine.pc = ret
            continue
        if machine.pc == 0xD7C0:
            sp = machine.sp
            ret = machine.memory[sp] | (machine.memory[sp + 1] << 8)
            machine.sp = (sp + 2) & 0xFFFF
            machine.pc = ret
            continue
        if steps > budget:
            raise RuntimeError(f"emu budget pc={machine.pc:#06x}")


def _word(mem, addr: int) -> int:
    return mem[addr] | (mem[addr + 1] << 8)


def _boot(room: int) -> Z80Machine:
    snap = load_z80(SNAPSHOT)
    machine = Z80Machine()
    mem = bytearray(snap)
    mem[0:11] = bytes([0xF3, 0xCD, 0x47, 0xA6, 0xCD, 0x0A, 0xA8, 0xCD, 0x47, 0x9C, 0x76])
    mem[0xA8D0:0xA8D3] = bytes([0xC9, 0x00, 0x00])
    mem[0xD7C0] = 0xC9
    machine.set_memory_block(0, mem)
    machine.memory[ROOM_ID] = room & 0xFF
    machine.memory[ROOM_ID + 1] = (room >> 8) & 0xFF
    machine.memory[EA60] = SPRITE_BUF & 0xFF
    machine.memory[EA60 + 1] = SPRITE_BUF >> 8
    machine.sp = STACK
    machine.pc = 0
    _run_until_halt(machine)
    return machine


def _call(machine: Z80Machine, addr: int, at: int = 0x20) -> None:
    mem = bytearray(machine.memory)
    mem[at : at + 4] = bytes([0xCD, addr & 0xFF, addr >> 8, 0x76])
    machine.set_memory_block(0, mem)
    machine.sp = STACK
    machine.pc = at
    machine.halted = False
    _run_until_halt(machine)


def test_fire_path_matches_emulator_step_by_step(tmp_path: Path) -> None:
    if not SNAPSHOT.is_file() or not DUMP.is_file() or not (OUT / "rooms.json").is_file():
        pytest.skip("snapshot, dump.js, or out/ missing")
    machine = _boot(1)
    blob = {"x": machine.memory[0xDD1D], "y": machine.memory[0xDD1E]}
    machine.memory[0xDD27] = 1
    machine.memory[0xDD2B] = 1
    machine.memory[0xDD2A] = 0
    machine.memory[0xA41D] = 0
    emu = []
    for i in range(40):
        machine.memory[0xDD27] = 1 if i == 0 else 0
        _call(machine, 0xC85A)
        emu.append(
            {
                "x": machine.memory[0xDDBD],
                "y": machine.memory[0xDDBE],
                "fireDir": machine.memory[0xDD2A],
                "ptr": _word(machine.memory, 0xDDBF),
                "firepower": machine.memory[0xD2CF],
            }
        )
        if machine.memory[0xDD2A] == 0 and i > 0:
            break
    init_path = tmp_path / "fire.json"
    init_path.write_text(json.dumps({"blob": blob, "aim": 1, "firepower": 0x7E}), encoding="utf-8")
    proc = subprocess.run(
        [
            "node",
            str(DUMP),
            "--data",
            str(OUT),
            "--fire-trace",
            "--room",
            "1",
            "--frames",
            str(len(emu)),
            "--fire-init",
            str(init_path),
        ],
        check=True,
        capture_output=True,
        text=True,
        timeout=60,
    )
    engine = json.loads(proc.stdout)
    assert len(engine) == len(emu)
    for i, (got, want) in enumerate(zip(engine, emu)):
        assert got["x"] == want["x"], f"frame {i} x {got['x']} != {want['x']}"
        assert got["y"] == want["y"], f"frame {i} y"
        assert got["fireDir"] == want["fireDir"], f"frame {i} dir"
        assert got["ptr"] == want["ptr"], f"frame {i} ptr"
        assert got["firepower"] == want["firepower"], f"frame {i} fp"


def test_bullet_hit_parks_shot_and_kills_nasty() -> None:
    if not SNAPSHOT.is_file() or not DUMP.is_file() or not (OUT / "rooms.json").is_file():
        pytest.skip("snapshot, dump.js, or out/ missing")
    machine = _boot(1)
    base = 0xDD18 + 32
    machine.memory[base + 5] = 80
    machine.memory[base + 6] = 80
    machine.memory[base + 0x15] = 1
    machine.memory[base + 0x16] = 0
    machine.memory[0xDDBD] = 80
    machine.memory[0xDDBE] = 80
    machine.memory[0xDD2A] = 1
    machine.memory[0xDDBF] = 0xB4
    machine.memory[0xDDC0] = 0xE8
    _call(machine, 0xA01B, at=0x10)
    proc = subprocess.run(
        ["node", str(DUMP), "--data", str(OUT), "--hit-test"],
        check=True,
        capture_output=True,
        text=True,
        timeout=60,
    )
    engine = json.loads(proc.stdout)
    assert machine.memory[base + 0x15] == 2
    assert _word(machine.memory, base + 7) == 0xBEC8
    assert machine.memory[0xDD2A] == 0
    assert machine.memory[0xDDBE] == 0x0F
    assert engine["state"] == 2
    assert engine["ptr"] == 0xBEC8
    assert engine["fireDir"] == 0
    assert engine["bulletY"] == 0x0F
