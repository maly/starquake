"""Build JSON + spritesheet artifacts from a decoded snapshot."""

from __future__ import annotations

import json
from dataclasses import asdict, dataclass, field
from pathlib import Path

from PIL import Image

from starquake_extract.decode import (
    ATTR_TRANSLATION,
    CLEAR_ATTR,
    NUM_BLOCKS,
    NUM_ROOMS,
    PLAY_ROW0,
    Decoder,
    is_solid,
)
from starquake_extract.emulator import initialize_item_table
from starquake_extract.moving import (
    D2C6,
    actor_payload,
    assignment_pools,
    decode_all_actors,
    decode_all_sprites,
    items_payload,
    parse_item_table,
    sprite_payload,
)
from starquake_extract.snapshot import load_z80

SHEET_WIDTH = 512
CELL = 8
INK = (255, 255, 255, 255)
PAPER = (0, 0, 0, 0)


@dataclass
class Graphic:
    id: int
    ptr: int
    cols: int
    rows: int
    row_attrs: list[int]
    row_flags: list[int]
    # Occupied cells only: list of {row, col, data[8]}. Empty cells are omitted
    # and must be treated as attr 0 / blank when compositing.
    cells: list[dict]
    x: int = 0
    y: int = 0
    width: int = 0
    height: int = 0
    attr: int = 0


@dataclass
class GameData:
    graphics: list[Graphic]
    blocks: list[list[int]]
    block_attrs_raw: list[int]
    block_attrs: list[int]
    translation: list[int]
    rooms: list[list[int]]
    room_attrs: list[list[list[int]]]
    room_solid: list[list[list[int]]]

    def graphic(self, ident: int) -> Graphic | None:
        if 0 <= ident < len(self.graphics):
            return self.graphics[ident]
        return None


@dataclass
class ExtractPaths:
    graphics_png: Path
    graphics_json: Path
    blocks_json: Path
    block_attrs_json: Path
    rooms_json: Path
    sprites_png: Path
    sprites_json: Path
    actors_png: Path
    actors_json: Path
    items_json: Path
    data: GameData = field(repr=False)


def extract_game(snapshot_path: str | Path, out_dir: str | Path) -> ExtractPaths:
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    decoder = Decoder(load_z80(snapshot_path))
    data = build_game_data(decoder)
    _pack_sheet(data.graphics, out / "graphics.png")
    _write_json(out / "graphics.json", _graphics_payload(data))
    sprites = decode_all_sprites(decoder.snapshot)
    actors = decode_all_actors(decoder.snapshot)
    snap_items = parse_item_table(decoder.snapshot)
    init_mem = initialize_item_table(decoder.snapshot)
    items = parse_item_table(init_mem)
    for item, original in zip(items, snap_items):
        item["snapshot_raw"] = original["raw"]
        item["initialized"] = item["raw"] != original["raw"]
    _pack_sheet(sprites, out / "sprites.png")
    _pack_sheet(actors, out / "actors.png")
    _write_json(out / "sprites.json", sprite_payload(sprites, "sprites.png"))
    _write_json(out / "actors.json", actor_payload(actors, "actors.png"))
    _write_json(
        out / "items.json",
        items_payload(
            items,
            d2c6=list(decoder.snapshot[D2C6 : D2C6 + 2]),
            pools=assignment_pools(decoder.snapshot),
        ),
    )
    _write_json(
        out / "blocks.json",
        {
            "order": (
                "Four sub-block identifiers per block, stored as in memory and drawn "
                "right-to-left then bottom-to-top: [bottom-right, bottom-left, "
                "top-right, top-left]."
            ),
            "blocks": [{"id": i, "subblocks": sub} for i, sub in enumerate(data.blocks)],
        },
    )
    _write_json(
        out / "block_attrs.json",
        {
            "translation_table": data.translation,
            "translation_rule": (
                "If raw is 0 or raw >= 0x50, use raw as the attribute. Otherwise "
                "replace it with translation_table[raw >> 4] (from 0xA7F7)."
            ),
            "attributes": [
                {"id": i, "raw": raw, "attr": attr}
                for i, (raw, attr) in enumerate(zip(data.block_attrs_raw, data.block_attrs))
            ],
        },
    )
    _write_json(
        out / "rooms.json",
        {
            "width": 4,
            "height": 3,
            "play_origin_row": PLAY_ROW0,
            "cells": [32, 18],
            "clear_attr": CLEAR_ATTR,
            "layout": "Row-major 4 columns x 3 rows of block identifiers.",
            "attributes": (
                "Each room.attributes is an 18 x 32 grid of full Spectrum attribute "
                "bytes as stored by 0xEAD3 (bits 7 and 6 preserved). solid[y][x] is 1 "
                "when bit 6 is set and the byte is not 0x64."
            ),
            "rooms": [
                {
                    "id": i,
                    "blocks": blocks,
                    "attributes": data.room_attrs[i],
                    "solid": data.room_solid[i],
                }
                for i, blocks in enumerate(data.rooms)
            ],
        },
    )
    return ExtractPaths(
        graphics_png=out / "graphics.png",
        graphics_json=out / "graphics.json",
        blocks_json=out / "blocks.json",
        block_attrs_json=out / "block_attrs.json",
        rooms_json=out / "rooms.json",
        sprites_png=out / "sprites.png",
        sprites_json=out / "sprites.json",
        actors_png=out / "actors.png",
        actors_json=out / "actors.json",
        items_json=out / "items.json",
        data=data,
    )


def build_game_data(decoder: Decoder) -> GameData:
    graphics = [_decode_graphic(decoder, ident) for ident in range(decoder.udg_count)]
    blocks = [decoder.get_block(i) for i in range(NUM_BLOCKS)]
    raw_attrs = [decoder.snapshot[0x9740 + i] for i in range(NUM_BLOCKS)]
    attrs = [decoder.get_block_attr(i) for i in range(NUM_BLOCKS)]
    translation = list(decoder.snapshot[ATTR_TRANSLATION : ATTR_TRANSLATION + 5])
    rooms = [decoder.get_room(i) for i in range(NUM_ROOMS)]
    composed = [decoder.compose_room(i) for i in range(NUM_ROOMS)]
    room_attrs = [[[cell["attr"] for cell in row] for row in room] for room in composed]
    room_solid = [[[int(is_solid(attr)) for attr in row] for row in grid] for grid in room_attrs]
    return GameData(
        graphics=graphics,
        blocks=blocks,
        block_attrs_raw=raw_attrs,
        block_attrs=attrs,
        translation=translation,
        rooms=rooms,
        room_attrs=room_attrs,
        room_solid=room_solid,
    )


def load_game_data(out_dir: str | Path) -> GameData:
    out = Path(out_dir)
    graphics_doc = json.loads((out / "graphics.json").read_text(encoding="utf-8"))
    blocks_doc = json.loads((out / "blocks.json").read_text(encoding="utf-8"))
    attrs_doc = json.loads((out / "block_attrs.json").read_text(encoding="utf-8"))
    rooms_doc = json.loads((out / "rooms.json").read_text(encoding="utf-8"))
    graphics = [Graphic(**item) for item in graphics_doc["graphics"]]
    blocks = [item["subblocks"] for item in blocks_doc["blocks"]]
    raw = [item["raw"] for item in attrs_doc["attributes"]]
    translated = [item["attr"] for item in attrs_doc["attributes"]]
    rooms = [item["blocks"] for item in rooms_doc["rooms"]]
    room_attrs = [item["attributes"] for item in rooms_doc["rooms"]]
    room_solid = [room["solid"] for room in rooms_doc["rooms"]]
    return GameData(
        graphics=graphics,
        blocks=blocks,
        block_attrs_raw=raw,
        block_attrs=translated,
        translation=attrs_doc["translation_table"],
        rooms=rooms,
        room_attrs=room_attrs,
        room_solid=room_solid,
    )


def _decode_graphic(decoder: Decoder, ident: int) -> Graphic:
    ptr = decoder.udg_id_to_ptr(ident)
    if ptr == 0:
        return Graphic(id=ident, ptr=0, cols=0, rows=0, row_attrs=[], row_flags=[], cells=[], attr=0)
    rows = decoder.get_rows(ptr)
    cols = decoder.get_cols(ptr)
    row_attrs = decoder.raw_row_attrs(ptr)
    row_flags = decoder.row_flags(ptr)
    cells: list[dict] = []
    data_ptr = ptr + 6
    attr_ptr = ptr - 1
    for row in range(6):
        flag = decoder.snapshot[ptr + row]
        for col in range(8):
            flag = ((flag << 1) | (flag >> 7)) & 0xFF
            if flag & 1:
                raw = decoder.snapshot[attr_ptr]
                attr_ptr = (attr_ptr - 1) & 0xFFFF
                data = list(decoder.snapshot[data_ptr : data_ptr + 8])
                data_ptr += 8
                if row < rows and col < cols:
                    cells.append({"row": row, "col": col, "data": data, "attr": raw})
    attr = cells[0]["attr"] if cells else 0
    return Graphic(
        id=ident,
        ptr=ptr,
        cols=cols,
        rows=rows,
        row_attrs=row_attrs,
        row_flags=row_flags,
        cells=cells,
        width=cols * CELL,
        height=rows * CELL,
        attr=attr,
    )


def _pack_sheet(graphics, path: Path) -> None:
    # First pass: place unique (ptr, cols, rows) graphics; copies share the box.
    x = 0
    y = 0
    row_h = 0
    placed: dict[tuple[int, int, int], tuple[int, int]] = {}
    positions: list[tuple[int, int]] = []
    for graphic in graphics:
        if graphic.rows == 0 or graphic.cols == 0:
            positions.append((0, 0))
            continue
        key = (graphic.ptr, graphic.cols, graphic.rows)
        if key in placed:
            positions.append(placed[key])
            continue
        w, h = graphic.width, graphic.height
        if x > 0 and x + w > SHEET_WIDTH:
            x = 0
            y += row_h + 1
            row_h = 0
        placed[key] = (x, y)
        positions.append((x, y))
        x += w + 1
        row_h = max(row_h, h)
    sheet_h = max(y + row_h, 1)
    sheet = Image.new("RGBA", (SHEET_WIDTH, sheet_h), PAPER)
    px = sheet.load()
    drawn: set[tuple[int, int, int]] = set()
    for graphic, (gx, gy) in zip(graphics, positions):
        graphic.x, graphic.y = gx, gy
        if graphic.rows == 0 or graphic.cols == 0:
            continue
        key = (graphic.ptr, graphic.cols, graphic.rows)
        if key in drawn:
            continue
        drawn.add(key)
        occupied = {(c["row"], c["col"]): c["data"] for c in graphic.cells}
        for row in range(graphic.rows):
            for col in range(graphic.cols):
                bits = occupied.get((row, col))
                if not bits:
                    continue
                for py, byte in enumerate(bits):
                    for px_i in range(8):
                        if byte & (0x80 >> px_i):
                            px[gx + col * CELL + px_i, gy + row * CELL + py] = INK
    sheet.save(path)


def _graphics_payload(data: GameData) -> dict:
    return {
        "spritesheet": "graphics.png",
        "cell_size": CELL,
        "colour": (
            "Monochrome: ink is opaque white, paper is transparent. Apply the "
            "Spectrum attribute at render time; colour is not baked into the PNG."
        ),
        "graphics": [asdict(g) for g in data.graphics],
    }


def _write_json(path: Path, payload: dict) -> None:
    path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
