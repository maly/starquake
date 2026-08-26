"""Compose and rasterize rooms from extracted data (not from the snapshot)."""

from __future__ import annotations

from pathlib import Path

from PIL import Image

from starquake_extract.decode import CLEAR_ATTR, ROOM_COLS, ROOM_ROWS
from starquake_extract.extract import GameData, Graphic
from starquake_extract.palette import attr_paper_ink

ROOM_PIXEL_WIDTH = 256
ROOM_PIXEL_HEIGHT = 144


def compose_room_from_data(data: GameData, room_id: int) -> list[list[dict]]:
    """Rebuild pixels from graphics; colour from the stored 18x32 attribute grid."""
    bg = [[{"attr": CLEAR_ATTR, "data": [0] * 8} for _ in range(ROOM_COLS)] for _ in range(ROOM_ROWS)]
    blocks = data.rooms[room_id]
    x = 0
    y = 0
    for i in range(3):
        for j in range(4):
            _blit_block(data, bg, blocks[i * 4 + j], x, y)
            x += 8
        x = 0
        y += 6
    if data.room_attrs:
        for ry, row in enumerate(data.room_attrs[room_id]):
            for cx, attr in enumerate(row):
                bg[ry][cx]["attr"] = attr
    return bg


def _blit_block(data: GameData, bg: list[list[dict]], ident: int, x: int, y: int) -> None:
    rx = x + 4
    ry = y + 3
    subblocks = data.blocks[ident]
    for _i in range(2):
        for _j in range(2):
            subid = subblocks[_i * 2 + _j]
            _blit_graphic(data, bg, subid, rx, ry)
            rx -= 4
        rx = x + 4
        ry -= 3


def _blit_graphic(data: GameData, bg: list[list[dict]], ident: int, x: int, y: int) -> None:
    graphic = data.graphic(ident)
    if graphic is None or not graphic.cells:
        return
    for cell in graphic.cells:
        cy = y + cell["row"]
        cx = x + cell["col"]
        if 0 <= cy < ROOM_ROWS and 0 <= cx < ROOM_COLS:
            bg[cy][cx]["data"] = list(cell["data"])


def rasterize(udgs: list[list[dict]], scale: int = 1) -> Image.Image:
    rows = len(udgs)
    cols = len(udgs[0]) if udgs else 0
    image = Image.new("RGB", (cols * 8 * scale, rows * 8 * scale), (0, 0, 0))
    px = image.load()
    for cy, row in enumerate(udgs):
        for cx, cell in enumerate(row):
            paper, ink = attr_paper_ink(cell["attr"])
            for py, byte in enumerate(cell["data"]):
                for px_i in range(8):
                    colour = ink if byte & (0x80 >> px_i) else paper
                    if scale == 1:
                        px[cx * 8 + px_i, cy * 8 + py] = colour
                    else:
                        ox = (cx * 8 + px_i) * scale
                        oy = (cy * 8 + py) * scale
                        for sy in range(scale):
                            for sx in range(scale):
                                px[ox + sx, oy + sy] = colour
    return image


def rasterize_room(data: GameData, room_id: int, scale: int = 1) -> Image.Image:
    return rasterize(compose_room_from_data(data, room_id), scale=scale)


def render_room_png(data: GameData, room_id: int, path: str | Path, scale: int = 1) -> Path:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    rasterize_room(data, room_id, scale=scale).save(path)
    return path


def render_all_rooms(data: GameData, out_dir: str | Path, scale: int = 1) -> list[Path]:
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    paths = []
    for room_id in range(len(data.rooms)):
        paths.append(render_room_png(data, room_id, out / f"room_{room_id}.png", scale=scale))
    return paths
