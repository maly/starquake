"""Command-line interface for extract / render / verify."""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

from starquake_extract.extract import extract_game, load_game_data
from starquake_extract.render import render_all_rooms, render_room_png

DEFAULT_OUT = Path("out")


def main(argv: list[str] | None = None) -> int:
    common = argparse.ArgumentParser(add_help=False)
    common.add_argument(
        "--snapshot",
        type=Path,
        default=None,
        help="Path to starquake.z80 (default: reference/src/starquake.z80)",
    )
    common.add_argument(
        "--out",
        type=Path,
        default=DEFAULT_OUT,
        help="Output directory (default: out/)",
    )

    parser = argparse.ArgumentParser(
        prog="starquake-extract",
        description="Extract Starquake graphics, blocks and rooms from a .z80 snapshot.",
    )
    sub = parser.add_subparsers(dest="command", required=True)

    sub.add_parser("extract", parents=[common], help="Write spritesheet PNG and JSON data files")

    render = sub.add_parser("render", parents=[common], help="Render room(s) from extracted data")
    render.add_argument("--room", type=int, metavar="N", help="Render a single room 0-511")
    render.add_argument("--all", action="store_true", help="Render all 512 rooms")

    verify = sub.add_parser("verify", parents=[common], help="Build SkoolKit HTML and compare every room")
    verify.add_argument(
        "--skool",
        type=Path,
        default=None,
        help="Path to starquake.skool (default: reference/src/starquake.skool)",
    )
    verify.add_argument("--skip-html", action="store_true", help="Reuse existing SkoolKit HTML output")

    sub.add_parser("all", parents=[common], help="Extract, render all rooms, then verify against SkoolKit")

    args = parser.parse_args(argv)
    snapshot = args.snapshot or _default_snapshot()
    out: Path = args.out

    if args.command == "extract":
        return _cmd_extract(snapshot, out)
    if args.command == "render":
        if args.room is None and not args.all:
            print("render: pass --room N or --all", file=sys.stderr)
            return 2
        return _cmd_render(out, room=args.room, all_rooms=args.all)
    if args.command == "verify":
        return _cmd_verify(snapshot, out, args.skool, args.skip_html)
    if args.command == "all":
        rc = _cmd_extract(snapshot, out)
        if rc:
            return rc
        rc = _cmd_render(out, room=None, all_rooms=True)
        if rc:
            return rc
        return _cmd_verify(snapshot, out, None, True)
    return 2


def _cmd_extract(snapshot: Path, out: Path) -> int:
    if not snapshot.is_file():
        print(f"snapshot not found: {snapshot}", file=sys.stderr)
        return 1
    paths = extract_game(snapshot, out)
    print(f"wrote {paths.graphics_png}")
    print(f"wrote {paths.graphics_json}")
    print(f"wrote {paths.blocks_json}")
    print(f"wrote {paths.block_attrs_json}")
    print(f"wrote {paths.rooms_json}")
    print(f"wrote {paths.sprites_png}")
    print(f"wrote {paths.sprites_json}")
    print(f"wrote {paths.actors_png}")
    print(f"wrote {paths.actors_json}")
    print(f"wrote {paths.items_json}")
    return 0


def _cmd_render(out: Path, room: int | None, all_rooms: bool) -> int:
    data_path = out / "rooms.json"
    if not data_path.is_file():
        print(f"extracted data not found in {out} (run extract first)", file=sys.stderr)
        return 1
    data = load_game_data(out)
    rooms_dir = out / "rooms"
    if all_rooms:
        paths = render_all_rooms(data, rooms_dir)
        print(f"wrote {len(paths)} rooms to {rooms_dir}")
        return 0
    if room is None or not 0 <= room < len(data.rooms):
        print(f"room must be 0..{len(data.rooms) - 1}", file=sys.stderr)
        return 2
    path = render_room_png(data, room, rooms_dir / f"room_{room}.png")
    print(f"wrote {path}")
    return 0


def _cmd_verify(snapshot: Path, out: Path, skool: Path | None, skip_html: bool) -> int:
    from starquake_extract.decode import Decoder
    from starquake_extract.emulator import draw_room
    from starquake_extract.snapshot import load_z80

    if not (out / "rooms.json").is_file():
        print(f"extracted data not found in {out} (run extract first)", file=sys.stderr)
        return 1
    data = load_game_data(out)
    memory = load_z80(snapshot)
    decoder = Decoder(memory)
    mismatches: list[str] = []
    for room_id in range(len(data.rooms)):
        emu = draw_room(memory, room_id)
        ours = decoder.compose_room(room_id)
        exported = data.room_attrs[room_id]
        cells: list[str] = []
        for y in range(18):
            for x in range(32):
                reasons = []
                if ours[y][x]["attr"] != emu.attrs[y][x] or ours[y][x]["data"] != list(emu.pixels[y][x]):
                    reasons.append(
                        f"compose attr {ours[y][x]['attr']:#04x}/{emu.attrs[y][x]:#04x} "
                        f"pix={'differ' if ours[y][x]['data'] != list(emu.pixels[y][x]) else 'ok'}"
                    )
                if exported[y][x] != emu.attrs[y][x]:
                    reasons.append(f"json attr {exported[y][x]:#04x}/{emu.attrs[y][x]:#04x}")
                if reasons:
                    cells.append(f"({x},{y}): " + "; ".join(reasons))
        if cells:
            mismatches.append(f"room {room_id}: {len(cells)} cells\n  " + "\n  ".join(cells[:12]))
            if len(cells) > 12:
                mismatches[-1] += f"\n  ... {len(cells) - 12} more"
        if room_id % 64 == 63:
            print(f"verified rooms 0..{room_id}")
    if mismatches:
        print(f"{len(mismatches)} room(s) differ from the Z80 A647+A80A dump:")
        print("\n".join(mismatches))
        return 1
    print("All 512 rooms match the emulator in bitmap and full attribute bytes.")
    return 0


def _run_skool2html(skool: Path, dest: Path) -> int:
    if not skool.is_file():
        print(f"skool file not found: {skool}", file=sys.stderr)
        return 1
    from skoolkit.skool2html import main as skool2html_main

    from starquake_extract.skoolkit10 import prepare_sources

    dest = dest.resolve()
    dest.mkdir(parents=True, exist_ok=True)
    adapted = dest / "_skool_src"
    skool = prepare_sources(skool.parent, adapted)
    writer_dir = adapted
    argv = [
        "-H",
        "-T",
        "dark",
        "-W",
        ".:starquake.StarquakeHtmlWriter",
        "-d",
        str(dest),
        "-o",
        "-t",
        str(skool.resolve()),
    ]
    print("running skool2html:", " ".join(argv))
    print(f"  cwd={writer_dir}")
    old_cwd = os.getcwd()
    try:
        os.chdir(writer_dir)
        try:
            skool2html_main(argv)
        except SystemExit as exc:
            code = exc.code
            if code not in (0, None):
                print(f"skool2html failed with exit {code}", file=sys.stderr)
                return int(code) if isinstance(code, int) else 1
        return 0
    except Exception as exc:
        print(f"skool2html error: {exc}", file=sys.stderr)
        return 1
    finally:
        os.chdir(old_cwd)


def _repo_root() -> Path:
    here = Path(__file__).resolve()
    for parent in here.parents:
        candidate = parent / "reference" / "src" / "starquake.z80"
        if candidate.is_file():
            return parent
    return Path.cwd()


def _default_snapshot() -> Path:
    return _repo_root() / "reference" / "src" / "starquake.z80"


def _default_skool() -> Path:
    return _repo_root() / "reference" / "src" / "starquake.skool"


if __name__ == "__main__":
    raise SystemExit(main())
