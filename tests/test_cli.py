from pathlib import Path

from starquake_extract.cli import main


def test_extract_command_writes_outputs(snapshot_path: Path, tmp_path: Path) -> None:
    rc = main(["extract", "--snapshot", str(snapshot_path), "--out", str(tmp_path)])
    assert rc == 0
    assert (tmp_path / "graphics.png").is_file()
    assert (tmp_path / "rooms.json").is_file()


def test_render_single_room(snapshot_path: Path, tmp_path: Path) -> None:
    assert main(["extract", "--snapshot", str(snapshot_path), "--out", str(tmp_path)]) == 0
    rc = main(["render", "--out", str(tmp_path), "--room", "0"])
    assert rc == 0
    assert (tmp_path / "rooms" / "room_0.png").is_file()
