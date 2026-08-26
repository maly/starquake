"""Load a ZX Spectrum .z80 snapshot into a 64K byte-addressable memory image.

The 16K ROM area (0x0000-0x3FFF) is filled with zeros. RAM from the snapshot
occupies 0x4000-0xFFFF. Compression follows the scheme documented at
https://worldofspectrum.org/faq/reference/z80format.htm.
"""

from __future__ import annotations

from pathlib import Path


class SnapshotError(ValueError):
    """Raised when a .z80 file cannot be parsed."""


def load_z80(path: str | Path) -> list[int]:
    """Return a 65536-length list of byte values for the given snapshot."""
    data = Path(path).read_bytes()
    if len(data) < 30:
        raise SnapshotError(f"{path}: file too short to be a .z80 snapshot")

    memory = [0] * 65536
    pc = data[6] | (data[7] << 8)
    if pc != 0:
        _load_v1(data, memory)
    else:
        _load_v2v3(data, memory)
    return memory


def _load_v1(data: bytes, memory: list[int]) -> None:
    compressed = bool(data[12] & 0x20) if data[12] != 255 else True
    payload = data[30:]
    if compressed:
        if len(payload) < 4:
            raise SnapshotError("truncated compressed v1 snapshot")
        ram = _decompress(payload[:-4])
    else:
        ram = list(payload)
    if len(ram) != 49152:
        raise SnapshotError(f"v1 RAM is {len(ram)} bytes (should be 49152)")
    memory[0x4000:0x10000] = ram


def _load_v2v3(data: bytes, memory: list[int]) -> None:
    extra_len = data[30] | (data[31] << 8)
    header_end = 32 + extra_len
    if len(data) < header_end:
        raise SnapshotError("truncated v2/v3 header")

    offset = header_end
    banks: dict[int, list[int]] = {}
    while offset < len(data):
        if offset + 3 > len(data):
            raise SnapshotError("truncated memory block header")
        length = data[offset] | (data[offset + 1] << 8)
        page = data[offset + 2]
        offset += 3
        if length == 0xFFFF:
            length = 16384
            if offset + length > len(data):
                raise SnapshotError(f"truncated uncompressed page {page}")
            block = list(data[offset : offset + length])
        else:
            if offset + length > len(data):
                raise SnapshotError(f"truncated compressed page {page}")
            block = _decompress(data[offset : offset + length])
        if len(block) != 16384:
            raise SnapshotError(f"page {page} is {len(block)} bytes (should be 16384)")
        banks[page] = block
        offset += length

    # 48K mapping: file page -> address. See WOS z80 format table.
    mapping = {
        8: 0x4000,
        4: 0x8000,
        5: 0xC000,
    }
    for page, addr in mapping.items():
        if page in banks:
            memory[addr : addr + 16384] = banks[page]


def _decompress(payload: bytes | bytearray) -> list[int]:
    """Expand ED ED xx yy runs. A single ED is stored literally with the next byte."""
    out: list[int] = []
    i = 0
    n = len(payload)
    while i < n:
        b = payload[i]
        i += 1
        if b == 0xED and i < n:
            c = payload[i]
            i += 1
            if c == 0xED:
                if i + 1 >= n:
                    raise SnapshotError("truncated ED ED run")
                count = payload[i]
                byte = payload[i + 1]
                i += 2
                if count == 0:
                    raise SnapshotError(f"invalid run ED ED 00 {byte:02X}")
                out.extend([byte] * count)
            else:
                out.append(b)
                out.append(c)
        else:
            out.append(b)
    return out
