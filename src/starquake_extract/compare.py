"""Pixel-by-pixel comparison of rendered rooms against SkoolKit HTML images."""

from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path

from PIL import Image

from starquake_extract.palette import BRIGHT, SPECTRUM

PALETTE = SPECTRUM + BRIGHT[1:]
# SkoolKit -H names rooms in hex (`room_a.png`, `room_1ff.png`); our renderer uses decimal.
ROOM_NAME = re.compile(r"room_([0-9a-f]+)\.png$", re.IGNORECASE)


@dataclass
class CompareResult:
    differing: int
    total: int
    scale: int = 1
    width: int = 0
    height: int = 0

    @property
    def ratio(self) -> float:
        return 0.0 if self.total == 0 else self.differing / self.total

    @property
    def match(self) -> bool:
        return self.differing == 0


def snap_to_spectrum_palette(rgb: tuple[int, int, int]) -> tuple[int, int, int]:
    return min(PALETTE, key=lambda c: _dist2(c, rgb))


def downsample_to(image: Image.Image, width: int, height: int) -> Image.Image:
    """Nearest-neighbour downsample taking the top-left pixel of each block."""
    image = image.convert("RGB")
    src_w, src_h = image.size
    if src_w % width or src_h % height:
        raise ValueError(f"cannot downsample {src_w}x{src_h} to {width}x{height} by integer scale")
    sx = src_w // width
    sy = src_h // height
    src = image.load()
    out = Image.new("RGB", (width, height))
    dst = out.load()
    for y in range(height):
        for x in range(width):
            dst[x, y] = src[x * sx, y * sy]
    return out


def compare_images(ours: Image.Image, reference: Image.Image, snap_palette: bool = True) -> CompareResult:
    ours_rgb = ours.convert("RGB")
    ref_rgb = reference.convert("RGB")
    scale = 1
    if ref_rgb.size != ours_rgb.size:
        rw, rh = ref_rgb.size
        ow, oh = ours_rgb.size
        if rw % ow == 0 and rh % oh == 0 and rw // ow == rh // oh and rw // ow >= 1:
            scale = rw // ow
            ref_rgb = downsample_to(ref_rgb, ow, oh)
        elif ow % rw == 0 and oh % rh == 0 and ow // rw == oh // rh:
            scale = ow // rw
            ours_rgb = downsample_to(ours_rgb, rw, rh)
        else:
            raise ValueError(f"incompatible sizes ours={ours_rgb.size} reference={ref_rgb.size}")

    w, h = ours_rgb.size
    total = w * h
    op = ours_rgb.load()
    rp = ref_rgb.load()
    differing = 0
    for y in range(h):
        for x in range(w):
            if op[x, y] != rp[x, y]:
                differing += 1
    if differing and snap_palette:
        differing = 0
        for y in range(h):
            for x in range(w):
                if snap_to_spectrum_palette(op[x, y]) != snap_to_spectrum_palette(rp[x, y]):
                    differing += 1
    return CompareResult(differing=differing, total=total, scale=scale, width=w, height=h)


def find_skoolkit_rooms(html_dir: str | Path) -> dict[int, Path]:
    html_dir = Path(html_dir)
    found: dict[int, Path] = {}
    for path in html_dir.rglob("room_*.png"):
        match = ROOM_NAME.search(path.name)
        if not match:
            continue
        found[int(match.group(1), 16)] = path
    return found


def compare_room_dirs(ours_dir: str | Path, reference_dir: str | Path) -> list[tuple[int, CompareResult]]:
    ours_dir = Path(ours_dir)
    refs = find_skoolkit_rooms(reference_dir)
    mismatches: list[tuple[int, CompareResult]] = []
    missing_ref: list[int] = []
    missing_ours: list[int] = []
    for room_id in range(512):
        ours_path = ours_dir / f"room_{room_id}.png"
        ref_path = refs.get(room_id)
        if ref_path is None:
            missing_ref.append(room_id)
            continue
        if not ours_path.is_file():
            missing_ours.append(room_id)
            continue
        result = compare_images(Image.open(ours_path), Image.open(ref_path))
        if not result.match:
            mismatches.append((room_id, result))
    if missing_ref or missing_ours:
        raise FileNotFoundError(
            "missing room images: "
            f"reference={missing_ref[:20]}{'...' if len(missing_ref) > 20 else ''} "
            f"ours={missing_ours[:20]}{'...' if len(missing_ours) > 20 else ''}"
        )
    return mismatches


def format_report(mismatches: list[tuple[int, CompareResult]]) -> str:
    if not mismatches:
        return "All 512 rooms match the SkoolKit reference images."
    lines = [f"{len(mismatches)} room(s) differ from SkoolKit:"]
    for room_id, result in mismatches:
        pct = result.ratio * 100
        lines.append(
            f"  room {room_id}: {result.differing}/{result.total} pixels differ ({pct:.4f}%)"
        )
    return "\n".join(lines)


def _dist2(a: tuple[int, int, int], b: tuple[int, int, int]) -> int:
    return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2
