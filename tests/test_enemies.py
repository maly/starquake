"""Compare engine nasty positions to a headless $9C47 + $A01B run."""

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

GRAFIX_BASE = 0xB208
GRAFIX_STRIDE = 0xC0
ENEMY_SETS = [
    "corepieces2",
    "badalien1",
    "badalien2",
    "alien1",
    "alien2",
    "alien3",
    "alien4",
    "alien5",
    "alien6",
    "alien7",
    "alien8",
    "alien9",
    "aliena",
    "alienb",
    "alienc",
    "aliend",
    "aliene",
]

pytestmark = pytest.mark.skipif(shutil.which("node") is None, reason="node required")


def _set_for_ptr(ptr: int) -> str:
    n = max(0, round((ptr - GRAFIX_BASE) / GRAFIX_STRIDE))
    if n >= len(ENEMY_SETS):
        return "alien1"
    return ENEMY_SETS[n]


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


def _read_entity(mem, base: int) -> dict:
    ptr = _word(mem, base + 7)
    base_ptr = _word(mem, base + 0x0E)
    return {
        "x": mem[base + 5],
        "y": mem[base + 6],
        "ink": mem[base + 9],
        "set": "corepieces1" if mem[base + 0x15] == 0 else _set_for_ptr(base_ptr),
        "frame": 0,
        "ptr": ptr,
        "basePtr": base_ptr,
        "dir": mem[base + 0x0D],
        "speedX": mem[base + 0x11],
        "speedY": mem[base + 0x12],
        "period": mem[base + 0x13],
        "timer": mem[base + 0x14],
        "state": mem[base + 0x15],
        "stateTimer": mem[base + 0x16],
        "ai": mem[base + 0x19],
        "aiPeriod": mem[base + 0x17],
        "aiCount": mem[base + 0x18],
        "homeX": mem[base + 0x0A],
        "homeY": mem[base + 0x0B],
    }


def _boot_nasties(room: int) -> Z80Machine:
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


def _step_a01b(machine: Z80Machine) -> None:
    mem = bytearray(machine.memory)
    mem[0x10:0x14] = bytes([0xCD, 0x1B, 0xA0, 0x76])
    machine.set_memory_block(0, mem)
    machine.sp = STACK
    machine.pc = 0x10
    machine.halted = False
    _run_until_halt(machine)


def _init_payload(machine: Z80Machine) -> dict:
    mem = machine.memory
    return {
        "dac": {
            "dac0": _word(mem, 0xDAC0),
            "dac2": _word(mem, 0xDAC2),
            "dac4": _word(mem, 0xDAC4),
            "db19": mem[0xDB19],
            "db1a": mem[0xDB1A],
        },
        "blob": {"x": mem[0xDD1D], "y": 143 - mem[0xDD1E]},
        "entities": [_read_entity(mem, 0xDD18 + i * 32) for i in range(1, 5)],
    }


def _emu_trace(machine: Z80Machine, frames: int) -> list[list[tuple[int, int, int]]]:
    rows = []
    for _ in range(frames):
        rows.append(
            [
                (machine.memory[0xDD18 + i * 32 + 5], machine.memory[0xDD18 + i * 32 + 6], machine.memory[0xDD18 + i * 32 + 0x15])
                for i in range(1, 5)
            ]
        )
        _step_a01b(machine)
    return rows


@pytest.mark.parametrize("room,frames", [(0, 28), (1, 40), (52, 65), (253, 24)])
def test_nasty_positions_match_emulator_step_by_step(room: int, frames: int, tmp_path: Path) -> None:
    if not SNAPSHOT.is_file() or not DUMP.is_file() or not (OUT / "rooms.json").is_file():
        pytest.skip("snapshot, dump.js, or out/ missing")
    machine = _boot_nasties(room)
    init = _init_payload(machine)
    init_path = tmp_path / "init.json"
    init_path.write_text(json.dumps(init), encoding="utf-8")
    emu = _emu_trace(machine, frames)
    proc = subprocess.run(
        [
            "node",
            str(DUMP),
            "--data",
            str(OUT),
            "--enemy-trace",
            "--room",
            str(room),
            "--frames",
            str(frames),
            "--enemy-init",
            str(init_path),
        ],
        check=True,
        capture_output=True,
        text=True,
        timeout=60,
    )
    engine = json.loads(proc.stdout)
    assert len(engine) == frames
    for f in range(frames):
        got = [(e["x"], e["y"], e["state"]) for e in engine[f]["entities"]]
        assert got == emu[f], (
            f"room {room} frame {f}: engine {got} emu {emu[f]}"
        )
