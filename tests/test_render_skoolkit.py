"""SkoolKit ImageWriter is no longer the acceptance oracle (bit 6 / 0x36).

These tests stay as a characterisation of the *old* coloured PNG path. They are
allowed to fail on attribute-sensitive rooms; room 0 still matches because its
visible cells do not exercise the EAD3 specials differently.
"""

from io import BytesIO
from pathlib import Path

from pathlib import Path

import pytest
from PIL import Image
from skoolkit.graphics import Frame, Udg
from skoolkit.image import ImageWriter

from starquake_extract.decode import Decoder
from starquake_extract.render import rasterize
from starquake_extract.snapshot import load_z80


def _skoolkit_png(udgs: list[list[dict]], scale: int) -> Image.Image:
    grid = [[Udg(cell["attr"], cell["data"]) for cell in row] for row in udgs]
    buf = BytesIO()
    ImageWriter().write_image([Frame(grid, scale)], buf)
    buf.seek(0)
    return Image.open(buf).convert("RGB")


@pytest.fixture(scope="module")
def decoder(snapshot_path: Path) -> Decoder:
    return Decoder(load_z80(snapshot_path))


def test_room_0_png_round_trips_through_imagewriter(decoder) -> None:
    cells = decoder.compose_room(0)
    ours = rasterize(cells, scale=1).convert("RGB")
    ref = _skoolkit_png(cells, 1)
    assert ours.size == ref.size
    assert ours.tobytes() == ref.tobytes()
