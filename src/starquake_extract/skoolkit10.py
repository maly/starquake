"""Adapt a SkoolKit 9 disassembly so SkoolKit 10 can parse it.

The reference repo still uses `#CALL:method(args)` and `#UDGARRAY*`. SkoolKit 10
requires `#CALL(method(args))` and `#FRAMES`. We convert a working copy and
leave the upstream files untouched.
"""

from __future__ import annotations

import re
import shutil
from pathlib import Path

_METHOD = re.compile(r"#CALL:([A-Za-z_][A-Za-z0-9_]*)")


def adapt_text(text: str) -> str:
    text = _convert_call(text)
    text = text.replace("#UDGARRAY*(", "#FRAMES(")
    return text


def prepare_sources(src_dir: str | Path, dest_dir: str | Path) -> Path:
    src_dir = Path(src_dir)
    dest_dir = Path(dest_dir)
    dest_dir.mkdir(parents=True, exist_ok=True)
    for src in src_dir.iterdir():
        if not src.is_file():
            continue
        dest = dest_dir / src.name
        if src.suffix in {".skool", ".ctl", ".ref"}:
            dest.write_text(adapt_text(src.read_text(encoding="utf-8")), encoding="utf-8")
        else:
            shutil.copy2(src, dest)
    return dest_dir / "starquake.skool"


def _convert_call(text: str) -> str:
    out = []
    index = 0
    while True:
        match = _METHOD.search(text, index)
        if not match:
            out.append(text[index:])
            break
        out.append(text[index : match.start()])
        name = match.group(1)
        pos = match.end()
        if pos >= len(text) or text[pos] != "(":
            out.append(match.group(0))
            index = match.end()
            continue
        end, args = _parse_parens(text, pos)
        if end is None:
            out.append(match.group(0))
            index = match.end()
            continue
        out.append(f"#CALL({name}({args}))")
        index = end
    return "".join(out)


def _parse_parens(text: str, index: int) -> tuple[int | None, str | None]:
    if index >= len(text) or text[index] != "(":
        return None, None
    depth = 1
    end = index + 1
    while depth and end < len(text):
        if text[end] == "(":
            depth += 1
        elif text[end] == ")":
            depth -= 1
        end += 1
    if depth:
        return None, None
    return end, text[index + 1 : end - 1]
