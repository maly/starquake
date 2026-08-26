"""Tests for .z80 snapshot loading. Written before the loader existed."""

from pathlib import Path

import pytest

from starquake_extract.snapshot import SnapshotError, load_z80


def _header_v1(*, compressed: bool, pc: int = 0x8000) -> bytearray:
    header = bytearray(30)
    header[6] = pc & 0xFF
    header[7] = (pc >> 8) & 0xFF
    if compressed:
        header[12] = 0x20
    return header


def _rle(byte: int, count: int) -> bytes:
    assert 1 <= count <= 255
    return bytes((0xED, 0xED, count, byte))


def test_uncompressed_v1_places_ram_at_0x4000(tmp_path: Path) -> None:
    ram = bytearray(49152)
    ram[0] = 0xAA
    ram[0x4000] = 0xBB  # address 0x8000
    ram[0x8000] = 0xCC  # address 0xC000
    path = tmp_path / "plain.z80"
    path.write_bytes(_header_v1(compressed=False) + ram)

    memory = load_z80(path)

    assert len(memory) == 65536
    assert memory[0x0000] == 0
    assert memory[0x4000] == 0xAA
    assert memory[0x8000] == 0xBB
    assert memory[0xC000] == 0xCC


def test_compressed_v1_expands_ed_ed_runs_and_end_marker(tmp_path: Path) -> None:
    # 49152 bytes of 0x11, encoded as 192 * 255 + 192.
    payload = bytearray()
    for _ in range(192):
        payload.extend(_rle(0x11, 255))
    payload.extend(_rle(0x11, 192))
    payload.extend((0x00, 0xED, 0xED, 0x00))
    path = tmp_path / "rle.z80"
    path.write_bytes(_header_v1(compressed=True) + payload)

    memory = load_z80(path)

    assert memory[0x4000:0x4000 + 49152] == [0x11] * 49152


def test_compressed_v1_does_not_treat_single_ed_as_run(tmp_path: Path) -> None:
    # ED 22 followed by a run of five 0x00, plus enough zeros to fill 48K.
    rest = 49152 - 2 - 5
    payload = bytearray((0xED, 0x22, 0xED, 0xED, 5, 0x00))
    while rest:
        chunk = min(rest, 255)
        payload.extend(_rle(0x00, chunk))
        rest -= chunk
    payload.extend((0x00, 0xED, 0xED, 0x00))
    path = tmp_path / "ed.z80"
    path.write_bytes(_header_v1(compressed=True) + payload)

    memory = load_z80(path)

    assert memory[0x4000] == 0xED
    assert memory[0x4001] == 0x22
    assert memory[0x4002:0x4007] == [0, 0, 0, 0, 0]


def test_v2_48k_pages_map_to_spectrum_address_space(tmp_path: Path) -> None:
    header = bytearray(32 + 23)
    header[30] = 23  # additional header length -> version 2
    header[32] = 0x00
    header[33] = 0x80  # PC
    header[34] = 0  # 48K
    page4 = _page_block(page=4, fill=0x41)  # 8000-BFFF
    page5 = _page_block(page=5, fill=0x42)  # C000-FFFF
    page8 = _page_block(page=8, fill=0x43)  # 4000-7FFF
    path = tmp_path / "v2.z80"
    path.write_bytes(header + page8 + page4 + page5)

    memory = load_z80(path)

    assert memory[0x4000] == 0x43
    assert memory[0x8000] == 0x41
    assert memory[0xC000] == 0x42


def test_rejects_truncated_file(tmp_path: Path) -> None:
    path = tmp_path / "short.z80"
    path.write_bytes(b"\x00" * 10)
    with pytest.raises(SnapshotError):
        load_z80(path)


def test_starquake_snapshot_matches_skoolkit(snapshot_path: Path) -> None:
    pytest.importorskip("skoolkit")
    from skoolkit.snapshot import get_snapshot

    ours = load_z80(snapshot_path)
    theirs = get_snapshot(str(snapshot_path))
    assert ours == theirs


def test_starquake_snapshot_has_documented_tables(snapshot_path: Path) -> None:
    memory = load_z80(snapshot_path)
    # Room 0 from the SkoolKit listing at 0x7530.
    assert memory[0x7530:0x753C] == [0x02, 0x02, 0x05, 0x05, 0x64, 0x07, 0x07, 0x00, 0x14, 0x00, 0x00, 0x0D]
    assert memory[0xA7F7:0xA7FC] == [0x20, 0x03, 0x02, 0x05, 0x06]
    # UDG 0 pointer is little-endian 0xECC4.
    assert memory[0xEB23] + 256 * memory[0xEB24] == 0xECC4


def _page_block(page: int, fill: int) -> bytes:
    data = bytes([fill] * 16384)
    return bytes((0xFF, 0xFF, page)) + data
