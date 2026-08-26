"""JS map viewer: raster vs exported PNG, solid overlay, timing, navigation."""

from __future__ import annotations

import json
import shutil
import subprocess
from pathlib import Path

import pytest
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "out"
DUMP = ROOT / "viewer" / "dump.js"


def _node_available() -> bool:
    return shutil.which("node") is not None


pytestmark = pytest.mark.skipif(not _node_available(), reason="node is required for viewer tests")


@pytest.fixture(scope="module")
def out_dir() -> Path:
    if not (OUT / "rooms.json").is_file() or not (OUT / "rooms" / "room_0.png").is_file():
        pytest.skip("run extract+render into out/ first")
    return OUT


def _run_dump(out_dir: Path, *args: str, timeout: int = 60) -> subprocess.CompletedProcess[str]:
    cmd = ["node", str(DUMP), "--data", str(out_dir), *args]
    return subprocess.run(cmd, check=True, capture_output=True, text=True, timeout=timeout)


def _rgba_image(path: Path) -> Image.Image:
    raw = path.read_bytes()
    assert len(raw) == 256 * 144 * 4
    return Image.frombytes("RGBA", (256, 144), raw).convert("RGB")


def _dump_room(out_dir: Path, tmp_path: Path, room: int, *, items: bool, overlay: bool = False) -> tuple[Image.Image, dict]:
    rgba = tmp_path / f"room_{room}_{int(items)}_{int(overlay)}.rgba"
    args = ["--room", str(room), "--rgba", str(rgba), "--meta"]
    if not items:
        args.append("--no-items")
    if overlay:
        args.append("--overlay")
    proc = _run_dump(out_dir, *args)
    meta = json.loads(proc.stdout)
    return _rgba_image(rgba), meta


def _pixel_diffs(a: Image.Image, b: Image.Image) -> list[tuple[int, int]]:
    pa, pb = a.load(), b.load()
    hits = []
    for y in range(144):
        for x in range(256):
            if pa[x, y] != pb[x, y]:
                hits.append((x, y))
    return hits


def test_navigation_stays_on_16_by_32_grid() -> None:
    proc = subprocess.run(
        ["node", str(DUMP), "--nav-test"],
        check=True,
        capture_output=True,
        text=True,
        timeout=30,
    )
    assert proc.stdout.strip() == "ok"


def test_sample_rooms_match_png_except_item_cells(out_dir: Path, tmp_path: Path) -> None:
    items = json.loads((out_dir / "items.json").read_text(encoding="utf-8"))
    sample = {0, 1, 15, 16, 31, 32, 199, 255, 256, 511}
    for it in items["items"]:
        if it.get("placed") and it.get("sprite") != 255 and it.get("room") != 199:
            sample.add(it["room"])
    ids = ",".join(str(i) for i in sorted(sample))
    tiles_dir = tmp_path / "tiles"
    items_dir = tmp_path / "items"
    _run_dump(out_dir, "--rooms", ids, "--outdir", str(tiles_dir), "--no-items")
    items_proc = _run_dump(out_dir, "--rooms", ids, "--outdir", str(items_dir))
    metas = {m["room"]: m for m in json.loads(items_proc.stdout)}
    for room in sorted(sample):
        png = Image.open(out_dir / "rooms" / f"room_{room}.png").convert("RGB")
        tiles = _rgba_image(tiles_dir / f"room_{room}.rgba")
        assert _pixel_diffs(tiles, png) == [], f"room {room} tile layer diverges from PNG"
        full = _rgba_image(items_dir / f"room_{room}.rgba")
        allowed = {(c[0], c[1]) for c in metas[room]["item_cells"]}
        leaks = [(x, y) for x, y in _pixel_diffs(full, png) if (x // 8, y // 8) not in allowed]
        assert leaks == [], f"room {room} differs outside item cells: {leaks[:8]}"


def test_solid_overlay_matches_export_grid(out_dir: Path, tmp_path: Path) -> None:
    room = 0
    plain, _ = _dump_room(out_dir, tmp_path, room, items=False, overlay=False)
    marked, meta = _dump_room(out_dir, tmp_path, room, items=False, overlay=True)
    solid = meta["solid"]
    pa, pb = plain.load(), marked.load()
    for y in range(18):
        for x in range(32):
            changed = False
            for py in range(8):
                for px in range(8):
                    if pa[x * 8 + px, y * 8 + py] != pb[x * 8 + px, y * 8 + py]:
                        changed = True
                        break
                if changed:
                    break
            if solid[y][x]:
                assert changed, f"solid cell ({x},{y}) was not highlighted"
            else:
                assert not changed, f"empty cell ({x},{y}) was highlighted"


def test_render_is_fast_enough_for_50fps(out_dir: Path) -> None:
    proc = _run_dump(out_dir, "--timing", "--repeat", "40", "--rooms", "0,16,168,255,511")
    stats = json.loads(proc.stdout)
    assert stats["frames"] == 200
    # 20 ms/frame = 50 fps. Measured mean on this machine is well below 1 ms.
    assert stats["mean_ms"] < 20, stats
    assert stats["live_mean_ms"] < 20, stats
