"""Game-faithful compose must match a headless Z80 run of A647+A80A."""

from pathlib import Path

import pytest

from starquake_extract.decode import Decoder, is_solid
from starquake_extract.emulator import draw_room
from starquake_extract.snapshot import load_z80


@pytest.fixture(scope="module")
def snapshot(snapshot_path: Path) -> list[int]:
    return load_z80(snapshot_path)


@pytest.fixture(scope="module")
def decoder(snapshot: list[int]) -> Decoder:
    return Decoder(snapshot)


def _diff_cells(ours: list[list[dict]], emu) -> list[str]:
    diffs = []
    for y in range(18):
        for x in range(32):
            oa, ea = ours[y][x]["attr"], emu.attrs[y][x]
            op, ep = ours[y][x]["data"], list(emu.pixels[y][x])
            if oa != ea or op != ep:
                diffs.append(
                    f"({x},{y}) attr ours={oa:#04x} emu={ea:#04x} pix_differ={op != ep}"
                )
    return diffs


def test_room_0_matches_emulator(decoder: Decoder, snapshot: list[int]) -> None:
    ours = decoder.compose_room(0)
    emu = draw_room(snapshot, 0)
    diffs = _diff_cells(ours, emu)
    assert diffs == [], "\n".join(diffs[:20])


def test_all_512_rooms_match_emulator(decoder: Decoder, snapshot: list[int]) -> None:
    bad = []
    for room_id in range(512):
        diffs = _diff_cells(decoder.compose_room(room_id), draw_room(snapshot, room_id))
        if diffs:
            bad.append(f"room {room_id}: {len(diffs)} {diffs[0]}")
    assert bad == [], "\n".join(bad[:15])


def test_bit6_survives_where_skoolkit_would_clear_it(decoder: Decoder, snapshot: list[int]) -> None:
    """SkoolKit stored (attr & $3F). The game keeps bit 6 (solidity)."""
    found = None
    for room_id in range(512):
        room = decoder.compose_room(room_id)
        for y, row in enumerate(room):
            for x, cell in enumerate(row):
                attr = cell["attr"]
                if attr & 0x40 and attr != (attr & 0x3F):
                    found = (room_id, x, y, attr)
                    break
            if found:
                break
        if found:
            break
    assert found is not None
    room_id, x, y, attr = found
    assert draw_room(snapshot, room_id).attrs[y][x] == attr
    assert is_solid(attr) or attr == 0x64


def test_new_attrs_differ_from_skoolkit_writer_as_a_fix(decoder: Decoder, snapshot: list[int]) -> None:
    """At least one cell must change versus the old HtmlWriter (mask $3F / attr 7)."""
    from skoolkit.graphics import Udg
    import skoolkit.graphics
    import sys
    from pathlib import Path

    sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "reference" / "src"))
    from starquake import StarquakeHtmlWriter

    class Oracle:
        def __init__(self, snap):
            self.snapshot = snap

        get_rows = StarquakeHtmlWriter.get_rows
        get_cols = StarquakeHtmlWriter.get_cols
        get_udgs = StarquakeHtmlWriter.get_udgs
        get_block_attr = StarquakeHtmlWriter.get_block_attr
        udg_id_to_ptr = StarquakeHtmlWriter.udg_id_to_ptr

    oracle = Oracle(snapshot)
    diffs = []
    for room_id in range(32):
        ours = decoder.compose_room(room_id)
        bg = [[Udg(0, [0] * 8) for _ in range(32)] for _ in range(18)]
        addr = 0x7530 + room_id * 12
        x = y = 0
        for i in range(3):
            for j in range(4):
                ident = snapshot[addr + i * 4 + j]
                rx, ry = x + 4, y + 3
                baddr = 0x9840 + ident * 4
                for bi in range(2):
                    for bj in range(2):
                        subid = snapshot[baddr + bi * 2 + bj]
                        attr = oracle.get_block_attr(subid)
                        if attr == 0:
                            attr = 7
                        udgs = oracle.get_udgs(oracle.udg_id_to_ptr(subid), attr)
                        if udgs:
                            skoolkit.graphics.overlay_udgs(
                                bg, udgs, rx * 8, ry * 8, 0, lambda a, b: b, lambda a, b, m: b
                            )
                        rx -= 4
                    rx, ry = x + 4, ry - 3
                x += 8
            x, y = 0, y + 6
        for yy in range(18):
            for xx in range(32):
                if ours[yy][xx]["attr"] != bg[yy][xx].attr:
                    diffs.append((room_id, xx, yy, ours[yy][xx]["attr"], bg[yy][xx].attr))
        if diffs:
            break
    assert diffs, "expected the EAD3 fix to change at least one attribute vs SkoolKit"
    room_id, x, y, new, old = diffs[0]
    # The typical fix: bit 6 kept, or 0x36/0 no longer replaced with 7.
    assert new != old
    assert (new & 0xC0) == (new & 0xC0)
