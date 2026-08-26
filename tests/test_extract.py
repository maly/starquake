"""Extraction writes JSON + a monochrome spritesheet usable without the snapshot."""

from pathlib import Path

from starquake_extract.decode import Decoder
from starquake_extract.extract import extract_game
from starquake_extract.render import rasterize_room
from starquake_extract.snapshot import load_z80


def test_extract_writes_required_files(snapshot_path: Path, tmp_path: Path) -> None:
    paths = extract_game(snapshot_path, tmp_path)
    for name in (
        "graphics.png",
        "graphics.json",
        "blocks.json",
        "block_attrs.json",
        "rooms.json",
        "sprites.png",
        "sprites.json",
        "actors.png",
        "actors.json",
        "items.json",
    ):
        assert (tmp_path / name).is_file(), name
    assert paths.graphics_png == tmp_path / "graphics.png"


def test_extracted_counts(snapshot_path: Path, tmp_path: Path) -> None:
    data = extract_game(snapshot_path, tmp_path).data
    assert len(data.graphics) == 0x98
    assert len(data.blocks) == 256
    assert len(data.block_attrs) == 256
    assert len(data.rooms) == 512
    assert data.rooms[0] == [0x02, 0x02, 0x05, 0x05, 0x64, 0x07, 0x07, 0x00, 0x14, 0x00, 0x00, 0x0D]
    assert len(data.room_attrs) == 512
    assert len(data.room_attrs[0]) == 18
    assert len(data.room_attrs[0][0]) == 32
    assert all(0 <= b <= 255 for row in data.room_attrs[0] for b in row)


def test_spritesheet_is_monochrome_ink_on_transparent(snapshot_path: Path, tmp_path: Path) -> None:
    from PIL import Image

    extract_game(snapshot_path, tmp_path)
    img = Image.open(tmp_path / "graphics.png")
    assert img.mode == "RGBA"
    pix = img.load()
    width, height = img.size
    colours = {pix[x, y] for y in range(height) for x in range(width)}
    allowed = {(0, 0, 0, 0), (255, 255, 255, 255)}
    assert colours <= allowed, f"unexpected colours in spritesheet: {colours - allowed}"


def test_exported_attribute_grid_matches_decoder(snapshot_path: Path, tmp_path: Path) -> None:
    decoder = Decoder(load_z80(snapshot_path))
    data = extract_game(snapshot_path, tmp_path).data
    for room_id in range(512):
        from_snap = [[c["attr"] for c in row] for row in decoder.compose_room(room_id)]
        assert from_snap == data.room_attrs[room_id], f"room {room_id} attr grid diverges"


def test_room_raster_is_256_by_144(snapshot_path: Path, tmp_path: Path) -> None:
    data = extract_game(snapshot_path, tmp_path).data
    image = rasterize_room(data, 0)
    assert image.size == (256, 144)
