"""Sprites at $9088, GRAFIX/BLOB actors, and AA30 moving-layer draws."""

from pathlib import Path

import pytest

from starquake_extract.emulator import (
    draw_cells_on_clear,
    draw_sprite_on_clear,
    draw_sprite_xor_background,
    initialize_item_table,
    run_room_moving,
    trace_moving_draws,
)
from starquake_extract.extract import extract_game
from starquake_extract.moving import (
    GRAFIX_FRAME,
    ROOM_SKIP,
    SPRITE_BASE,
    SPRITE_COUNT,
    a350_allows_spawn,
    assignment_pools,
    decode_all_actors,
    decode_all_sprites,
    decode_grafix_frame,
    decode_sprite,
    items_in_room,
    packed_room,
    parse_item_table,
)
from starquake_extract.snapshot import load_z80


@pytest.fixture(scope="module")
def snapshot(snapshot_path: Path) -> list[int]:
    return load_z80(snapshot_path)


def test_sprite_table_is_35_entries_of_32_bytes(snapshot: list[int]) -> None:
    sprites = decode_all_sprites(snapshot)
    assert len(sprites) == SPRITE_COUNT
    assert sprites[0].ptr == SPRITE_BASE
    assert sprites[-1].ptr == SPRITE_BASE + 34 * 32
    assert sprites[1].ptr - sprites[0].ptr == 32
    assert all(len(s.cells) == 4 for s in sprites)


def test_sprite_cells_are_2x2_without_baked_attribute(snapshot: list[int]) -> None:
    spr = decode_sprite(snapshot, 8)
    assert {(c["row"], c["col"]) for c in spr.cells} == {(0, 0), (0, 1), (1, 0), (1, 1)}
    assert all(c["attr"] is None for c in spr.cells)
    assert all(len(c["data"]) == 8 for c in spr.cells)


def test_db24_xors_pixels_and_writes_full_attribute(snapshot: list[int]) -> None:
    spr = decode_sprite(snapshot, 8)
    screen = draw_sprite_on_clear(snapshot, 8, row=8, col=4, attr=0x47)
    for cell in spr.cells:
        y = 8 + cell["row"] - 6
        x = 4 + cell["col"]
        assert screen.attrs[y][x] == 0x47
        assert list(screen.pixels[y][x]) == cell["data"]


def test_db24_xors_against_existing_bitmap(snapshot: list[int]) -> None:
    spr = decode_sprite(snapshot, 8)
    screen, before = draw_sprite_xor_background(snapshot, 8, row=8, col=4, attr=0x43, fill=0xFF)
    for i, cell in enumerate(spr.cells):
        y = 8 + cell["row"] - 6
        x = 4 + cell["col"]
        assert screen.attrs[y][x] == 0x43
        assert list(screen.pixels[y][x]) == [b ^ 0xFF for b in cell["data"]]
        assert before[i] == [0xFF] * 8


def test_item_table_assigns_records_to_rooms(snapshot: list[int]) -> None:
    items = parse_item_table(snapshot)
    assert len(items) == 0x2D
    rooms = {it["room"] for it in items if it["sprite"] != 0xFF}
    assert 168 in rooms  # $A8 from the first record
    assert items_in_room(snapshot, 168)
    assert items[0]["placed"] is False  # y=0 in the snapshot; $AA30 fills it on entry


def test_aa30_draws_match_traced_db24(snapshot: list[int]) -> None:
    draws = trace_moving_draws(snapshot, 16)
    assert len(draws) >= 1
    assert all(d["sprite"] is not None for d in draws)
    assert all(0 <= d["sprite"] < SPRITE_COUNT for d in draws)
    again = trace_moving_draws(snapshot, 16)
    assert [(d["sprite"], d["row"], d["col"], d["attr"]) for d in draws] == [
        (d["sprite"], d["row"], d["col"], d["attr"]) for d in again
    ]


def test_aa30_skips_core_room(snapshot: list[int]) -> None:
    assert trace_moving_draws(snapshot, ROOM_SKIP) == []


def test_aa30_or40_sets_solid_bit_on_drawn_cells(snapshot: list[int]) -> None:
    draws = trace_moving_draws(snapshot, 16)
    assert draws
    assert all(d["attr"] & 0x40 for d in draws)
    assert all(d["attr"] & 0x80 == 0 for d in draws)


def test_grafix_frame_is_3x2_interleaved(snapshot: list[int]) -> None:
    frame = decode_grafix_frame(snapshot, 0xAFC8, ident=0, set_name="hoverpad", frame=0, kind="grafix")
    assert frame.cols == 3 and frame.rows == 2
    assert len(frame.cells) == 6
    # Scanline 0 of the top row is three consecutive bytes at the pointer.
    top = [c["data"][0] for c in frame.cells if c["row"] == 0]
    assert top == snapshot[0xAFC8 : 0xAFC8 + 3]
    # Bottom row starts at +$18; column 0 scanline 0 is byte ptr+$18.
    bottom0 = next(c for c in frame.cells if c["row"] == 1 and c["col"] == 0)
    assert bottom0["data"][0] == snapshot[0xAFC8 + 0x18]


def test_actor_sets_are_separate_frames(snapshot: list[int]) -> None:
    actors = decode_all_actors(snapshot)
    hover = [a for a in actors if a.set == "hoverpad"]
    assert [a.frame for a in hover] == [0, 1, 2, 3]
    assert hover[1].ptr - hover[0].ptr == GRAFIX_FRAME
    fire = [a for a in actors if a.set == "blobfire"]
    assert len(fire) == 8
    blob = [a for a in actors if a.set == "blobwr1"]
    assert len(blob) == 4 and blob[0].kind == "blob"


def test_grafix_cells_match_screen_after_db3b(snapshot: list[int]) -> None:
    frame = decode_grafix_frame(snapshot, 0xAFC8, ident=0, set_name="hoverpad", frame=0, kind="grafix")
    screen = draw_cells_on_clear(snapshot, frame.cells, row=8, col=4, attr=0x07)
    for cell in frame.cells:
        y = 8 + cell["row"] - 6
        x = 4 + cell["col"]
        assert screen.attrs[y][x] == 0x07
        assert list(screen.pixels[y][x]) == cell["data"]


def test_a350_start_of_game_allows_most_rooms(snapshot: list[int]) -> None:
    allowed = sum(1 for room in range(512) if a350_allows_spawn(snapshot, room))
    # $6431 fills 128 bytes with $FF; the snapshot still has almost all bits set.
    assert allowed >= 500


def test_first_visit_places_every_unplaced_item(snapshot: list[int]) -> None:
    original = parse_item_table(snapshot)
    unplaced = [it for it in original if not it["placed"]]
    assert len(unplaced) == 20
    assert len({it["room"] for it in unplaced}) == 20
    mem = initialize_item_table(snapshot)
    placed = parse_item_table(mem)
    assert all(it["placed"] for it in placed)
    for it, orig in zip(placed, original):
        if orig["placed"]:
            assert it["raw"] == orig["raw"]
        else:
            assert it["raw"] != orig["raw"]
            assert it["room"] == orig["room"]
            assert it["sprite"] == orig["sprite"]


def test_item_placement_does_not_depend_on_visit_order(snapshot: list[int]) -> None:
    rooms = sorted({it["room"] for it in parse_item_table(snapshot) if not it["placed"]})
    a, b = rooms[0], rooms[-1]
    fwd = run_room_moving(run_room_moving(snapshot, a), b)
    rev = run_room_moving(run_room_moving(snapshot, b), a)
    assert parse_item_table(fwd) == parse_item_table(rev)


def test_initialized_coordinates_match_aa30_blit(snapshot: list[int]) -> None:
    original = {it["index"]: it for it in parse_item_table(snapshot)}
    placed = parse_item_table(initialize_item_table(snapshot))
    filled = [it for it in placed if not original[it["index"]]["placed"]]
    assert filled
    for it in filled:
        draws = trace_moving_draws(snapshot, it["room"])
        match = [
            d
            for d in draws
            if d["sprite"] == it["sprite"] and d["col"] == it["col"] and d["row"] == it["row"]
        ]
        assert match, f"item {it['index']} room {it['room']} not drawn at {it['col']},{it['row']}: {draws}"


def test_assignment_pools_are_even_rooms_with_90_markers(snapshot: list[int]) -> None:
    from starquake_extract.decode import BLOCK_ATTRS, BLOCK_DEFS, ROOM_DATA

    def n90(room: int) -> int:
        n = 0
        blocks = snapshot[ROOM_DATA + room * 12 : ROOM_DATA + room * 12 + 12]
        for block in blocks:
            for graphic in snapshot[BLOCK_DEFS + block * 4 : BLOCK_DEFS + block * 4 + 4]:
                if (snapshot[BLOCK_ATTRS + graphic] & 0xF0) == 0x90:
                    n += 1
        return n

    pools = assignment_pools(snapshot)
    assert pools["specials"][0]["sprite"] == 0x0F
    assert pools["specials"][0]["candidates"] == [8, 40, 168, 182]
    assert pools["specials"][1]["candidates"] == [150, 198, 200, 246]
    assert len(pools["pairs"]) == 18
    rooms: set[int] = set()
    for spec in pools["specials"]:
        rooms.update(spec["candidates"])
    for pair in pools["pairs"]:
        rooms.update(pair["candidates"])
    assert all(r % 2 == 0 for r in rooms)
    assert all(n90(r) >= 1 for r in rooms)
    assert packed_room(0x54) == 168


def test_extract_writes_moving_graphics(snapshot_path: Path, tmp_path: Path) -> None:
    paths = extract_game(snapshot_path, tmp_path)
    for name in ("sprites.png", "sprites.json", "actors.png", "actors.json", "items.json"):
        assert (tmp_path / name).is_file(), name
    assert paths.sprites_json == tmp_path / "sprites.json"
    import json

    sprites = json.loads((tmp_path / "sprites.json").read_text(encoding="utf-8"))
    actors = json.loads((tmp_path / "actors.json").read_text(encoding="utf-8"))
    items = json.loads((tmp_path / "items.json").read_text(encoding="utf-8"))
    assert len(sprites["graphics"]) == SPRITE_COUNT
    assert sprites["graphics"][8]["cells"][0]["attr"] is None
    assert any(g["set"] == "hoverpad" and g["frame"] == 0 for g in actors["graphics"])
    assert any(g["set"] == "blobwr1" and g["frame"] == 3 for g in actors["graphics"])
    assert len(items["items"]) == 0x2D
    assert items["initialized"] is True
    assert all(it["placed"] for it in items["items"])
    assert sum(1 for it in items["items"] if it["initialized"]) == 20
    assert items["assignment"]["specials"][0]["sprite"] == 15
    assert len(items["assignment"]["pairs"]) == 18
    assert "rooms.json" not in str(paths.sprites_json)
