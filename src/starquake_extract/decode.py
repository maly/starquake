"""Decode Starquake structures from a 64K memory image.

Room composition follows the game: print graphic at 0xEA65, attribute store at
0xEAD3, block walk at 0xA8D3, paper/ink mask at 0xA90F, and the DAC6 checksum
that feeds the ink mask at 0xEA62. Geometry helpers (row/column trim) stay for
spritesheet packing only.
"""

from __future__ import annotations

from dataclasses import dataclass

ROOM_DATA = 0x7530
NUM_ROOMS = 512
ROOM_BYTES = 12
BLOCK_ATTRS = 0x9740
BLOCK_DEFS = 0x9840
NUM_BLOCKS = 256
ATTR_TRANSLATION = 0xA7F7
UDG_PTR_TABLE = 0xEB23
UDG_PTR_TABLE_END = 0xEC53  # first byte after last pointer (UDG 0x97)
ROOM_ROWS = 18
ROOM_COLS = 32
PLAY_ROW0 = 6  # A80A starts drawing at screen row 6; status occupies 0-5.
CLEAR_ATTR = 0x47  # A647 fills play-area attributes with bright white on black.
EA62_INIT = 0xEA62
EA63_INIT = 0xEA63
DAC0 = 0xDAC0
A7F8 = 0xA7F8
TRANSLATION = 0xA7F7


def resolve_attr(fullattr: int, ea62: int, ea63: int) -> int:
    """Store the attribute byte the way 0xEAD3 does.

    `AND $3F` is only used to recognise the two specials. The byte written to
    attribute memory is otherwise unmodified, so bits 7 and 6 survive.
    """
    masked = fullattr & 0x3F
    if masked == 0x36:
        return (fullattr & 0xC0) | (ea63 & 0xFF)
    if masked == 0:
        return (fullattr & 0xF8) | (ea62 & 0xFF)
    return fullattr & 0xFF


def is_solid(attr: int) -> bool:
    """Platform solidity: bit 6 set, except the yellow-on-yellow cell $64.

    Matches 0xD280 (`BIT 6` then `CP $64` on the full byte). 0xC7DF is the same
    idea but compares `(attr & $7F)` to `$64`, i.e. it also treats flashing $E4
    as non-solid.
    """
    return (attr & 0x40) != 0 and attr != 0x64


def overlay_replace(bg: list[list[dict]], fg: list[list[dict]], x: int, y: int) -> None:
    """Replace background cells with foreground cells at cell origin (x, y).

    Matches `overlay_udgs(..., rattr=lambda bg, fg: fg, rbyte=lambda bg, fg, mk: fg)`
    for cell-aligned overlays (the only case used by the reference writer).
    """
    for fy, frow in enumerate(fg):
        by = y + fy
        if by < 0 or by >= len(bg):
            continue
        for fx, fcell in enumerate(frow):
            bx = x + fx
            if bx < 0 or bx >= len(bg[by]):
                continue
            bg[by][bx] = {"attr": fcell["attr"], "data": list(fcell["data"])}


class Decoder:
    def __init__(self, snapshot: list[int]) -> None:
        if len(snapshot) != 65536:
            raise ValueError(f"snapshot must be 65536 bytes, got {len(snapshot)}")
        self.snapshot = snapshot
        self.udg_count = (UDG_PTR_TABLE_END - UDG_PTR_TABLE) // 2

    # --- UDG geometry, copied from StarquakeHtmlWriter ---

    def get_rows(self, addr: int) -> int:
        n_rows = 6
        for i in range(0, 6):
            flag = self.snapshot[addr + 5 - i]
            if flag != 0:
                break
            n_rows -= 1
        return n_rows

    def get_cols(self, addr: int) -> int:
        n_cols = 0
        for i in range(0, 6):
            n_cols_for_row = 8
            flag = self.snapshot[addr + 5 - i]
            for i in range(0, 8):  # noqa: B020 - inner i shadows, same as reference
                if flag & 1:
                    break
                n_cols_for_row -= 1
                flag = flag >> 1
            if n_cols_for_row > n_cols:
                n_cols = n_cols_for_row
        return n_cols

    def get_udgs(self, addr: int, mask: int) -> list[list[dict]]:
        ptr = addr + 6
        udgs: list[list[dict]] = []
        n_rows = self.get_rows(addr)
        n_cols = self.get_cols(addr)

        if n_rows > 0:
            for row in range(0, n_rows):
                flag = self.snapshot[addr + row]
                attrptr = addr - row - 1
                udgline: list[dict] = []

                for col in range(0, n_cols):
                    fullattr = self.snapshot[attrptr]
                    attr = fullattr & 0x3F
                    if attr == 0:
                        attr = (fullattr & 0xF8) | mask
                    if attr == 0x36:
                        attr = mask
                    if flag & 0x80:
                        udg = {"attr": attr, "data": list(self.snapshot[ptr : ptr + 8])}
                        ptr += 8
                    else:
                        udg = {"attr": 0, "data": [0] * 8}
                    udgline.append(udg)
                    flag = flag * 2 - 0x100

                udgs.append(udgline)
                attrptr -= 1
        return udgs

    def udg_id_to_ptr(self, ident: int) -> int:
        addr = UDG_PTR_TABLE + ident * 2
        return self.snapshot[addr] + 0x100 * self.snapshot[addr + 1]

    def get_block_attr(self, ident: int) -> int:
        addr = BLOCK_ATTRS + ident
        attr = self.snapshot[addr]
        if attr != 0 and attr < 0x50:
            offset = attr >> 4
            attr = self.snapshot[ATTR_TRANSLATION + offset]
        return attr

    def get_block(self, ident: int) -> list[int]:
        addr = BLOCK_DEFS + ident * 4
        return list(self.snapshot[addr : addr + 4])

    def get_room(self, room_id: int) -> list[int]:
        addr = ROOM_DATA + room_id * ROOM_BYTES
        return list(self.snapshot[addr : addr + ROOM_BYTES])

    def make_background(self, rows: int, cols: int, attr: int = 0) -> list[list[dict]]:
        return [[{"attr": attr, "data": [0] * 8} for _ in range(cols)] for _ in range(rows)]

    def compose_room(self, room_id: int) -> list[list[dict]]:
        """Draw one room the way A647 + A80A do, returning the 32x18 play area."""
        screen = self.make_background(24, 32, attr=0)
        for row in range(PLAY_ROW0, 24):
            for col in range(32):
                screen[row][col]["attr"] = CLEAR_ATTR
        state = self._init_room_draw_state(room_id)
        blocks = self.get_room(room_id)
        b = PLAY_ROW0
        for i in range(3):
            c = 0
            for j in range(4):
                self._draw_block(screen, state, blocks[i * 4 + j], b, c)
                c += 8
            b += 6
        return [row[:] for row in screen[PLAY_ROW0:PLAY_ROW0 + ROOM_ROWS]]

    def _init_room_draw_state(self, room_id: int) -> "_DrawState":
        addr = ROOM_DATA + room_id * ROOM_BYTES
        first = self.snapshot[addr]
        state = _DrawState(
            dac0=addr,
            dac2=first | ((first ^ 0x5F) << 8),
            dac4=addr,
            db19=3,
            db1a=3,
            ea62=self.snapshot[EA62_INIT],
            ea63=self.snapshot[EA63_INIT],
            a7f8=[0, 0, 0, 0],
        )
        state.dac6()
        b = 4
        while b:
            state.dac6()
            if b == 1:
                a = state.dac0 >> 8
                a &= 0x3F
                while a >= 5:
                    a -= 5
                if a >= 2:
                    a += 1
                a += 2
            else:
                a = state.dac0 & 3
                if a >= 2:
                    a += 1
                a += 2
            if a in state.a7f8:
                continue
            state.a7f8[4 - b] = a
            b -= 1
        return state

    def _apply_block_mask(self, state: "_DrawState", subid: int) -> None:
        """A90F: update EA63 when the raw sub-block attribute is $10-$4F."""
        raw = self.snapshot[BLOCK_ATTRS + subid]
        if raw == 0:
            return
        high = raw & 0xF0
        if high == 0:
            return
        if high < 0x50:
            # A80A rebuilds $A7F8-$A7FB (table[1..4]) from DAC6; $A7F7 stays $20.
            table = [self.snapshot[TRANSLATION]] + state.a7f8
            state.ea63 = table[raw >> 4]

    def _draw_block(self, screen: list[list[dict]], state: "_DrawState", ident: int, row: int, col: int) -> None:
        # A8D3: origin at (col+4, row+3), 2x2 subblocks right-to-left, bottom-to-top.
        c = col + 4
        b = row + 3
        addr = BLOCK_DEFS + ident * 4
        for _down in range(2):
            for _across in range(2):
                subid = self.snapshot[addr]
                addr += 1
                self._apply_block_mask(state, subid)
                state.dac6()
                self._print_graphic(screen, state, subid, b, c)
                c -= 4
            c += 8
            b -= 3

    def _print_graphic(
        self, screen: list[list[dict]], state: "_DrawState", ident: int, row: int, col: int
    ) -> None:
        """EA65: set EA62, then walk 6x8 cells and copy occupied ones (EAB9/EAD3)."""
        a = state.dac0 & 7
        if a >= 2:
            state.ea62 = a
        else:
            state.ea62 = (row & 7) | 2
        ptr = self.udg_id_to_ptr(ident)
        if ptr == 0:
            return
        data_ptr = ptr + 6
        attr_ptr = ptr - 1
        b = row
        c0 = col
        for r in range(6):
            flag = self.snapshot[ptr + r]
            c = c0
            for _col in range(8):
                flag = ((flag << 1) | (flag >> 7)) & 0xFF
                if flag & 1:
                    fullattr = self.snapshot[attr_ptr]
                    attr_ptr = (attr_ptr - 1) & 0xFFFF
                    resolved = resolve_attr(fullattr, state.ea62, state.ea63)
                    data = list(self.snapshot[data_ptr : data_ptr + 8])
                    data_ptr += 8
                    sr, sc = _screen_cell(b, c)
                    if 0 <= sr < 24 and 0 <= sc < 32:
                        screen[sr][sc] = {"attr": resolved, "data": data}
                c += 1
            b += 1

    def raw_row_attrs(self, addr: int) -> list[int]:
        n_rows = self.get_rows(addr)
        return [self.snapshot[addr - row - 1] for row in range(n_rows)]

    def row_flags(self, addr: int) -> list[int]:
        n_rows = self.get_rows(addr)
        return [self.snapshot[addr + row] for row in range(n_rows)]


def _screen_cell(row: int, col: int) -> tuple[int, int]:
    """Map (row, col) the way 0xEAB9 builds a Spectrum attribute address."""
    lo = (((row << 5) | (row >> 3)) & 0xE0) + col
    lo &= 0xFF
    hi = ((row & 0x18) | 0x40) + 7  # last pixel row of the cell (after 8× INC B, DEC B)
    hi &= 0xFF
    rot = ((hi >> 3) | (hi << 5)) & 0xFF
    attr_hi = (rot & 0x03) | 0x58
    offset = ((attr_hi << 8) | lo) - 0x5800
    return divmod(offset, 32)


@dataclass
class _DrawState:
    dac0: int
    dac2: int
    dac4: int
    db19: int
    db1a: int
    ea62: int
    ea63: int
    a7f8: list[int]

    def dac6(self) -> None:
        """Checksum/PRNG at 0xDAC6. Mutates DAC0, and sometimes DAC2/DAC4."""
        swapped = ((self.dac0 & 0xFF) << 8) | (self.dac0 >> 8)
        hl = (swapped + self.dac0 + 0x29 + self.dac2) & 0xFFFF
        self.dac0 = hl
        self.db19 = (self.db19 - 1) & 0xFF
        if self.db19 != 0:
            return
        self.db19 = 5
        hl = (self.dac2 * 17 + 0xC5 + self.dac4) & 0xFFFF
        self.dac2 = hl
        self.db1a = (self.db1a - 1) & 0xFF
        if self.db1a != 0:
            return
        self.db1a = 0x0B
        hl = (self.dac4 << 1) & 0xFFFF
        hl = (hl + self.dac0) & 0xFFFF
        hl = (hl << 1) & 0xFFFF
        self.dac4 = (hl + 0x4BBB) & 0xFFFF
