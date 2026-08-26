"""Headless Z80 runner: draw a room with the game's own routines.

Trampoline at $0000 calls Clear playing area ($A647) then Draw the room ($A80A).
The ROM multiply at $30A9 (used to turn the room id into a 12-byte offset) is
hooked in Python so we do not need a 48K ROM image.
"""

from __future__ import annotations

from dataclasses import dataclass

from z80 import Z80Machine

from starquake_extract.decode import PLAY_ROW0, ROOM_COLS, ROOM_ROWS

DRAW_ROOM = 0xA80A
CLEAR_PLAY = 0xA647
ROOM_ID = 0xD2C8
HL_TIMES_DE = 0x30A9
SPRITE_BUF = 0x5B20
EA60 = 0xEA60
STACK = 0x5FFE
TRAMPOLINE = 0x0000


@dataclass
class EmuRoom:
    """Play-area cells taken from Spectrum screen memory after A80A returns."""

    attrs: list[list[int]]
    pixels: list[list[list[int]]]


def draw_room(snapshot: list[int], room_id: int, *, moving: bool = False) -> EmuRoom:
    machine = _boot_room(snapshot, room_id, moving=moving)
    _run_with_multiply_hook(machine)
    if not machine.halted:
        raise RuntimeError(f"room {room_id} did not HALT (pc={machine.pc:#06x})")
    return _read_play_area(machine.memory)


def run_room_moving(source: list[int] | bytearray, room_id: int) -> bytearray:
    """A647+A80A+$AA30 on a copy of `source`; returns the resulting 64K image.

    `$94E8` and `$A350` in `source` are preserved so first-visit placement can
    be chained across rooms. `$A80A` reseeds `$DAC6` from the room data address.
    """
    machine = _boot_room(source, room_id, moving=True)
    _run_with_multiply_hook(machine)
    if not machine.halted:
        raise RuntimeError(f"room {room_id} did not HALT (pc={machine.pc:#06x})")
    return bytearray(machine.memory)


def initialize_item_table(snapshot: list[int]) -> bytearray:
    """Fill unplaced `$94E8` records by simulating the first entry to each room.

    Placement is one item per visit (`JR $AAA6`). This snapshot has at most one
    unplaced record per room; the loop still re-enters until that room has none.
    Visit order does not change the result: `$DAC6` is reseeded from the room
    address and `$D2C6` is constant after game start.
    """
    from starquake_extract.moving import ITEM_COUNT, ITEM_STRIDE, ITEM_TABLE, parse_item_table

    mem = bytearray(snapshot)
    rooms = sorted({it["room"] for it in parse_item_table(mem) if not it["placed"]})
    for room_id in rooms:
        for _ in range(ITEM_COUNT):
            before = bytes(mem[ITEM_TABLE : ITEM_TABLE + ITEM_COUNT * ITEM_STRIDE])
            mem = run_room_moving(mem, room_id)
            leftover = [
                it for it in parse_item_table(mem) if it["room"] == room_id and not it["placed"]
            ]
            if not leftover:
                break
            after = bytes(mem[ITEM_TABLE : ITEM_TABLE + ITEM_COUNT * ITEM_STRIDE])
            if after == before:
                raise RuntimeError(f"room {room_id} did not place remaining items")
    return mem


def trace_moving_draws(snapshot: list[int], room_id: int) -> list[dict]:
    """Run A80A including AA30 and record every $DB24 (2x2 sprite blit)."""
    from starquake_extract.moving import SPRITE_BASE, SPRITE_BYTES

    machine = _boot_room(snapshot, room_id, moving=True)
    machine.set_breakpoint(HL_TIMES_DE)
    machine.set_breakpoint(0xDB24)
    draws: list[dict] = []
    steps = 0
    while not machine.halted and steps < 400:
        machine.ticks_to_stop = 500_000
        machine.run()
        steps += 1
        if machine.halted:
            break
        if machine.pc == HL_TIMES_DE:
            _finish_multiply(machine)
            continue
        if machine.pc == 0xDB24:
            hl = machine.hl
            sprite = (hl - SPRITE_BASE) // SPRITE_BYTES if hl >= SPRITE_BASE else None
            draws.append(
                {
                    "sprite": sprite,
                    "ptr": hl,
                    "row": machine.b,
                    "col": machine.c,
                    "attr": machine.a,
                    "play_row": machine.b - PLAY_ROW0,
                    "play_col": machine.c,
                }
            )
            machine.clear_breakpoint(0xDB24)
            machine.ticks_to_stop = 400
            machine.run()
            machine.set_breakpoint(0xDB24)
            continue
        if steps > 200:
            raise RuntimeError(f"moving trace exceeded budget pc={machine.pc:#06x}")
    return draws


def draw_sprite_on_clear(snapshot: list[int], ident: int, row: int, col: int, attr: int):
    """Zero a 2×2 cell, then CALL $DB24 with sprite `ident`.

    $A647 is skipped: it walks the $DE1E line table and is not required to
    check XOR + attribute on known cells. Background bytes of the four cells
    are forced to 0 so the XOR result equals the sprite bitmap.
    """
    from starquake_extract.moving import SPRITE_BASE, SPRITE_BYTES

    machine = Z80Machine()
    mem = bytearray(snapshot)
    ptr = SPRITE_BASE + ident * SPRITE_BYTES
    _zero_cells(mem, row, col, rows=2, cols=2)
    # DI; LD A,n; LD BC,nn; LD HL,nn; CALL $DB24; HALT
    mem[0x0000:0x000D] = bytes(
        [
            0xF3,
            0x3E,
            attr & 0xFF,
            0x01,
            col & 0xFF,
            row & 0xFF,
            0x21,
            ptr & 0xFF,
            (ptr >> 8) & 0xFF,
            0xCD,
            0x24,
            0xDB,
            0x76,
        ]
    )
    machine.set_memory_block(0, mem)
    machine.memory[EA60] = SPRITE_BUF & 0xFF
    machine.memory[EA60 + 1] = SPRITE_BUF >> 8
    machine.sp = STACK
    machine.pc = TRAMPOLINE
    _run_with_multiply_hook(machine)
    if not machine.halted:
        raise RuntimeError(f"DB24 did not HALT pc={machine.pc:#06x}")
    return _read_play_area(machine.memory)


def draw_sprite_xor_background(
    snapshot: list[int],
    ident: int,
    row: int,
    col: int,
    attr: int,
    fill: int,
):
    """Fill a 2×2 cell with `fill`, then CALL $DB24. Returns (screen, before_pixels)."""
    from starquake_extract.moving import SPRITE_BASE, SPRITE_BYTES

    machine = Z80Machine()
    mem = bytearray(snapshot)
    ptr = SPRITE_BASE + ident * SPRITE_BYTES
    _fill_cells(mem, row, col, rows=2, cols=2, pixel=fill, attr=0x20)
    before = [[mem[_pixel_addr(row + ry, col + cx, py)] for py in range(8)] for ry in range(2) for cx in range(2)]
    mem[0x0000:0x000D] = bytes(
        [
            0xF3,
            0x3E,
            attr & 0xFF,
            0x01,
            col & 0xFF,
            row & 0xFF,
            0x21,
            ptr & 0xFF,
            (ptr >> 8) & 0xFF,
            0xCD,
            0x24,
            0xDB,
            0x76,
        ]
    )
    machine.set_memory_block(0, mem)
    machine.memory[EA60] = SPRITE_BUF & 0xFF
    machine.memory[EA60 + 1] = SPRITE_BUF >> 8
    machine.sp = STACK
    machine.pc = TRAMPOLINE
    _run_with_multiply_hook(machine)
    if not machine.halted:
        raise RuntimeError(f"DB24 did not HALT pc={machine.pc:#06x}")
    return _read_play_area(machine.memory), before


def draw_cells_on_clear(snapshot: list[int], cells: list[dict], row: int, col: int, attr: int):
    """Zero occupied cells, then CALL $DB3B once per 8-byte UDG.

    Used to verify GRAFIX/BLOB frames after they have been de-interleaved into
    the same cell records the export stores. $DB3B is the per-cell body of $DB24.
    """
    machine = Z80Machine()
    mem = bytearray(snapshot)
    max_r = max(c["row"] for c in cells) + 1
    max_c = max(c["col"] for c in cells) + 1
    _zero_cells(mem, row, col, rows=max_r, cols=max_c)
    buf = SPRITE_BUF
    code = 0x0000
    mem[code] = 0xF3  # DI
    code += 1
    for cell in cells:
        addr = buf
        mem[addr : addr + 8] = bytes(cell["data"])
        buf += 8
        cr, cc = row + cell["row"], col + cell["col"]
        # LD A,n; LD BC,nn; LD HL,nn; CALL $DB3B
        mem[code : code + 11] = bytes(
            [
                0x3E,
                attr & 0xFF,
                0x01,
                cc & 0xFF,
                cr & 0xFF,
                0x21,
                addr & 0xFF,
                (addr >> 8) & 0xFF,
                0xCD,
                0x3B,
                0xDB,
            ]
        )
        code += 11
    mem[code] = 0x76  # HALT
    machine.set_memory_block(0, mem)
    # Keep the $EA60 collision-restore log off the UDG bytes at $5B20.
    log = 0x5BE0
    machine.memory[EA60] = log & 0xFF
    machine.memory[EA60 + 1] = log >> 8
    machine.sp = STACK
    machine.pc = TRAMPOLINE
    _run_with_multiply_hook(machine)
    if not machine.halted:
        raise RuntimeError(f"DB3B sequence did not HALT pc={machine.pc:#06x}")
    return _read_play_area(machine.memory)


def _zero_cells(mem: bytearray, row: int, col: int, *, rows: int, cols: int) -> None:
    _fill_cells(mem, row, col, rows=rows, cols=cols, pixel=0, attr=0)


def _fill_cells(mem: bytearray, row: int, col: int, *, rows: int, cols: int, pixel: int, attr: int) -> None:
    for ry in range(rows):
        for cx in range(cols):
            for py in range(8):
                mem[_pixel_addr(row + ry, col + cx, py)] = pixel & 0xFF
            mem[0x5800 + (row + ry) * 32 + (col + cx)] = attr & 0xFF


def _boot_room(snapshot: list[int], room_id: int, *, moving: bool) -> Z80Machine:
    machine = Z80Machine()
    mem = bytearray(snapshot)
    _install_trampoline(mem, moving=moving)
    machine.set_memory_block(0, mem)
    machine.memory[ROOM_ID] = room_id & 0xFF
    machine.memory[ROOM_ID + 1] = (room_id >> 8) & 0xFF
    machine.memory[EA60] = SPRITE_BUF & 0xFF
    machine.memory[EA60 + 1] = SPRITE_BUF >> 8
    for i in range(0xA0):
        machine.memory[SPRITE_BUF + i] = 0
    machine.sp = STACK
    machine.pc = TRAMPOLINE
    return machine


def _install_trampoline(mem: bytearray, *, moving: bool = False) -> None:
    # DI; CALL $A647; CALL $A80A; HALT
    mem[0x0000:0x0008] = bytes([0xF3, 0xCD, 0x47, 0xA6, 0xCD, 0x0A, 0xA8, 0x76])
    if not moving:
        # A80A ends with JP $AA30. RET after the 12 static blocks so the
        # collision grid is the tile layer 0xEAD3 writes.
        mem[0xA8D0:0xA8D3] = bytes([0xC9, 0x00, 0x00])


def _finish_multiply(machine: Z80Machine) -> None:
    product = (machine.hl * machine.de) & 0xFFFF
    sp = machine.sp
    ret = machine.memory[sp] | (machine.memory[sp + 1] << 8)
    machine.sp = (sp + 2) & 0xFFFF
    machine.hl = product
    machine.pc = ret


def _run_with_multiply_hook(machine: Z80Machine) -> None:
    machine.set_breakpoint(HL_TIMES_DE)
    steps = 0
    while not machine.halted:
        machine.ticks_to_stop = 500_000
        reason = machine.run()
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
        if steps > 200:
            raise RuntimeError(f"room draw exceeded tick budget at pc={machine.pc:#06x}")


def _read_play_area(memory) -> EmuRoom:
    attrs: list[list[int]] = []
    pixels: list[list[list[int]]] = []
    for row in range(PLAY_ROW0, PLAY_ROW0 + ROOM_ROWS):
        attr_row: list[int] = []
        pix_row: list[list[int]] = []
        for col in range(ROOM_COLS):
            attr_row.append(memory[0x5800 + row * 32 + col])
            pix_row.append([memory[_pixel_addr(row, col, py)] for py in range(8)])
        attrs.append(attr_row)
        pixels.append(pix_row)
    return EmuRoom(attrs=attrs, pixels=pixels)


def _pixel_addr(row: int, col: int, py: int) -> int:
    third = row // 8
    cell_row = row % 8
    return 0x4000 + third * 0x800 + py * 0x100 + cell_row * 32 + col


def cells_from_emu(room: EmuRoom) -> list[list[dict]]:
    return [
        [{"attr": room.attrs[y][x], "data": list(room.pixels[y][x])} for x in range(ROOM_COLS)]
        for y in range(ROOM_ROWS)
    ]
