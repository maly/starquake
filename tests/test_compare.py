from pathlib import Path

from PIL import Image

from starquake_extract.compare import compare_images, downsample_to, snap_to_spectrum_palette


def test_identical_images_match() -> None:
    a = Image.new("RGB", (8, 8), (197, 0, 0))
    b = a.copy()
    result = compare_images(a, b)
    assert result.differing == 0
    assert result.total == 64


def test_scale_two_reference_is_downsampled() -> None:
    small = Image.new("RGB", (2, 2), (0, 0, 0))
    small.putpixel((1, 1), (255, 255, 255))
    big = small.resize((4, 4), Image.Resampling.NEAREST)
    result = compare_images(small, big)
    assert result.differing == 0
    assert result.scale == 2


def test_reports_pixel_differences() -> None:
    a = Image.new("RGB", (2, 2), (0, 0, 0))
    b = Image.new("RGB", (2, 2), (0, 0, 0))
    b.putpixel((0, 0), (255, 0, 0))
    result = compare_images(a, b)
    assert result.differing == 1
    assert result.ratio == 0.25


def test_downsample_takes_top_left_of_each_block() -> None:
    img = Image.new("RGB", (4, 2), (0, 0, 0))
    img.putpixel((0, 0), (1, 2, 3))
    img.putpixel((2, 0), (4, 5, 6))
    out = downsample_to(img, 2, 1)
    assert out.size == (2, 1)
    assert out.getpixel((0, 0)) == (1, 2, 3)
    assert out.getpixel((1, 0)) == (4, 5, 6)


def test_skoolkit_hex_filenames_map_to_room_ids(tmp_path: Path) -> None:
    from starquake_extract.compare import find_skoolkit_rooms

    (tmp_path / "images").mkdir()
    (tmp_path / "images" / "room_a.png").write_bytes(b"x")
    (tmp_path / "images" / "room_1ff.png").write_bytes(b"x")
    found = find_skoolkit_rooms(tmp_path)
    assert found[10].name == "room_a.png"
    assert found[511].name == "room_1ff.png"


def test_palette_snap_maps_nearby_red_to_spectrum_red() -> None:
    assert snap_to_spectrum_palette((200, 0, 0)) == (197, 0, 0)
