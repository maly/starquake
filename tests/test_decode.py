"""Decode tests use StarquakeHtmlWriter as the oracle for algorithm semantics."""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

from starquake_extract.decode import Decoder, overlay_replace
from starquake_extract.snapshot import load_z80

ROOT = Path(__file__).resolve().parents[1]
WRITER_DIR = ROOT / "reference" / "src"


def _reference(snapshot: list[int]):
    sys.path.insert(0, str(WRITER_DIR))
    from starquake import StarquakeHtmlWriter  # type: ignore

    class Oracle:
        def __init__(self, snap: list[int]) -> None:
            self.snapshot = snap

        get_rows = StarquakeHtmlWriter.get_rows
        get_cols = StarquakeHtmlWriter.get_cols
        get_udgs = StarquakeHtmlWriter.get_udgs
        get_block_attr = StarquakeHtmlWriter.get_block_attr
        udg_id_to_ptr = StarquakeHtmlWriter.udg_id_to_ptr

    return Oracle(snapshot)


@pytest.fixture(scope="module")
def snapshot(snapshot_path: Path) -> list[int]:
    return load_z80(snapshot_path)


@pytest.fixture(scope="module")
def decoder(snapshot: list[int]) -> Decoder:
    return Decoder(snapshot)


@pytest.fixture(scope="module")
def oracle(snapshot: list[int]):
    return _reference(snapshot)


def test_udg_0_trimmed_size_matches_flags(decoder: Decoder, oracle) -> None:
    addr = 0xECC4
    assert decoder.get_rows(addr) == oracle.get_rows(addr) == 3
    assert decoder.get_cols(addr) == oracle.get_cols(addr) == 4


def test_udg_pointer_table_matches_reference(decoder: Decoder, oracle) -> None:
    for ident in range(decoder.udg_count):
        assert decoder.udg_id_to_ptr(ident) == oracle.udg_id_to_ptr(ident)


def test_block_attr_translation_matches_reference(decoder: Decoder, oracle) -> None:
    for ident in range(256):
        assert decoder.get_block_attr(ident) == oracle.get_block_attr(ident), f"attr {ident}"


def test_room_0_block_ids_are_row_major_4_by_3(decoder: Decoder) -> None:
    room = decoder.get_room(0)
    assert room == [0x02, 0x02, 0x05, 0x05, 0x64, 0x07, 0x07, 0x00, 0x14, 0x00, 0x00, 0x0D]


def test_block_0_subblocks_are_stored_br_bl_tr_tl(decoder: Decoder) -> None:
    # Memory order is right-to-left, bottom-to-top: BR, BL, TR, TL.
    assert decoder.get_block(0) == [0x14, 0x14, 0x14, 0x14]


def test_overlay_replace_writes_foreground_over_background() -> None:
    bg = [[{"attr": 1, "data": [1] * 8} for _ in range(2)] for _ in range(2)]
    fg = [[{"attr": 7, "data": [0xFF] * 8}]]
    overlay_replace(bg, fg, 1, 0)
    assert bg[0][1]["attr"] == 7
    assert bg[0][1]["data"] == [0xFF] * 8
    assert bg[0][0]["attr"] == 1
