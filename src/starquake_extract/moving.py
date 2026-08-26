"""Moving-object graphics and the tables $AA30 reads.

Two graphic formats exist besides the background UDGs at $EB23:

* Sprites $00–$22 at $9088: 2×2 cells, 32 consecutive bytes, no attribute
  stream. $CE68 maps an id to $9088 + id×32. $AA30 draws them with $DB24.
* GRAFIX / BLOB: 3×2 cells, 48 bytes per frame (8 scanlines × 3 interleaved
  columns), typically 4 frames ($C0 bytes) per set. The game loop XOR-blits
  them at pixel resolution via the unlabeled routine at $DF70; $AA30 does not.

The collectable table at $94E8 is 45 records with a room field, but it is not
a 512-slot static layer: unplaced rows are filled on entry, collected items
are marked y=$01, and extra 2×2 objects spawn from the $A350 bitmap + $DAC6.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass, field

SPRITE_BASE = 0x9088
SPRITE_BYTES = 32
SPRITE_COUNT = 35  # IDs $00–$22; the table ends at $94E8
ITEM_TABLE = 0x94E8
ITEM_COUNT = 0x2D
ITEM_STRIDE = 4
ROOM_SKIP = 0xC7  # $AA30 returns immediately for the core room
D2C6 = 0xD2C6  # game-start FRAMES copy; $AA30 XORs it into slot and Y
A350 = 0xA350
ASSIGN_PAIRS = 0x5E2C  # 18 two-byte room pairs for $648A
ASSIGN_SPECIAL = 0x5E50  # two groups of four rooms: sprites $0F and $10
CORE_SLOTS = 0x95F0  # eight fixed (room, flags) records for $B0 core tiles
A350_BYTES = 0x80
GRAFIX_FRAME = 48  # 3 columns × 2 rows × 8 bytes, interleaved by scanline
GRAFIX_STRIDE = 0xC0  # four frames; used by $C6CA

# Sets labeled #GRAFIX in the reference skool. Each is four 48-byte frames
# except where the next label leaves a different span; we always take `frames`
# frames of GRAFIX_FRAME bytes from `ptr`.
GRAFIX_SETS: list[tuple[str, int, int]] = [
    ("hoverpad", 0xAFC8, 4),
    ("hfirepower", 0xB088, 4),
    ("corepieces1", 0xB148, 4),
    ("corepieces2", 0xB208, 4),
    ("badalien1", 0xB2C8, 4),
    ("badalien2", 0xB388, 4),
    ("alien1", 0xB448, 4),
    ("alien2", 0xB508, 4),
    ("alien3", 0xB5C8, 4),
    ("alien4", 0xB688, 4),
    ("alien5", 0xB750, 4),
    ("alien6", 0xB810, 4),
    ("alien7", 0xB8C8, 4),
    ("alien8", 0xB988, 4),
    ("alien9", 0xBA48, 4),
    ("aliena", 0xBB08, 4),
    ("alienb", 0xBBC8, 4),
    ("alienc", 0xBC88, 4),
    ("aliend", 0xBD48, 4),
    ("aliene", 0xBE08, 4),
    ("stars", 0xBEC8, 4),
]

# Sets labeled #BLOB. Each frame is one GRAFIX; the macro expands four frames
# at +$00/+$30/+$60/+$90. blobfire occupies eight frames up to $EA34.
BLOB_SETS: list[tuple[str, int, int]] = [
    ("blobwr1", 0xE074, 4),
    ("blobsr1", 0xE134, 4),
    ("blobwr2", 0xE1F4, 4),
    ("blobsr2", 0xE2B4, 4),
    ("blobwl1", 0xE374, 4),
    ("blobsl1", 0xE434, 4),
    ("blobwl2", 0xE4F4, 4),
    ("blobsl2", 0xE5B4, 4),
    ("blobxr", 0xE674, 4),
    ("blobxs", 0xE734, 4),
    ("blobsl", 0xE7F4, 4),
    ("blobfire", 0xE8B4, 8),
]


@dataclass
class Sprite:
    id: int
    ptr: int
    cols: int
    rows: int
    cells: list[dict]
    x: int = 0
    y: int = 0
    width: int = 0
    height: int = 0
    kind: str = "sprite"
    set: str = "sprite"
    frame: int = 0
    attr: int | None = None
    row_attrs: list[int] = field(default_factory=list)
    row_flags: list[int] = field(default_factory=list)


def decode_sprite(snapshot: list[int], ident: int) -> Sprite:
    ptr = SPRITE_BASE + ident * SPRITE_BYTES
    cells = []
    for row in range(2):
        for col in range(2):
            addr = ptr + row * 16 + col * 8
            cells.append(
                {
                    "row": row,
                    "col": col,
                    "data": list(snapshot[addr : addr + 8]),
                    "attr": None,
                }
            )
    return Sprite(
        id=ident,
        ptr=ptr,
        cols=2,
        rows=2,
        cells=cells,
        width=16,
        height=16,
        kind="sprite",
        set=f"sprite-{ident:02d}",
        frame=0,
    )


def decode_all_sprites(snapshot: list[int]) -> list[Sprite]:
    return [decode_sprite(snapshot, i) for i in range(SPRITE_COUNT)]


def decode_grafix_frame(snapshot: list[int], ptr: int, *, ident: int, set_name: str, frame: int, kind: str) -> Sprite:
    """One 3×2 GRAFIX frame.

    Layout matches the SkoolKit macro
    ``#UDGARRAY3,7,,3(($a)-($a+2);($a+$18)-($a+$1A))``: each cell is 8 bytes
    at ``ptr + row*24 + py*3 + col``. No flag bytes, no attribute stream.
    """
    cells = []
    for row in range(2):
        for col in range(3):
            data = [snapshot[ptr + row * 24 + py * 3 + col] for py in range(8)]
            cells.append({"row": row, "col": col, "data": data, "attr": None})
    return Sprite(
        id=ident,
        ptr=ptr,
        cols=3,
        rows=2,
        cells=cells,
        width=24,
        height=16,
        kind=kind,
        set=set_name,
        frame=frame,
    )


def decode_all_actors(snapshot: list[int]) -> list[Sprite]:
    frames: list[Sprite] = []
    ident = 0
    for name, ptr, count in GRAFIX_SETS:
        for frame in range(count):
            frames.append(
                decode_grafix_frame(
                    snapshot,
                    ptr + frame * GRAFIX_FRAME,
                    ident=ident,
                    set_name=name,
                    frame=frame,
                    kind="grafix",
                )
            )
            ident += 1
    for name, ptr, count in BLOB_SETS:
        for frame in range(count):
            frames.append(
                decode_grafix_frame(
                    snapshot,
                    ptr + frame * GRAFIX_FRAME,
                    ident=ident,
                    set_name=name,
                    frame=frame,
                    kind="blob",
                )
            )
            ident += 1
    return frames


def parse_item_table(snapshot: list[int]) -> list[dict]:
    """Collectable records at $94E8. Layout as used by $AB40 / $D155, not the skool comment."""
    items = []
    for i in range(ITEM_COUNT):
        b0 = snapshot[ITEM_TABLE + i * ITEM_STRIDE]
        b1 = snapshot[ITEM_TABLE + i * ITEM_STRIDE + 1]
        b2 = snapshot[ITEM_TABLE + i * ITEM_STRIDE + 2]
        b3 = snapshot[ITEM_TABLE + i * ITEM_STRIDE + 3]
        room = ((b1 >> 7) & 1) * 256 + b2
        items.append(
            {
                "index": i,
                "room": room,
                "col": b0 & 0x1F,
                "row": b1 & 0x7F,
                "placed": (b1 & 0x7F) >= 6,
                "sprite": b3,
                "attr_bits": b0 >> 5,
                "raw": [b0, b1, b2, b3],
            }
        )
    return items


def items_in_room(snapshot: list[int], room_id: int) -> list[dict]:
    return [it for it in parse_item_table(snapshot) if it["room"] == room_id and it["sprite"] != 0xFF]


def a350_allows_spawn(snapshot: list[int], room_id: int) -> bool:
    """Bit for `room_id` in the 128-byte map at $A350, as $ABF0 / $ABBE read it.

    $ABBE takes byte index ``(high>>3) | ((low&$F8)>>3)`` (equals ``room>>3``
    for rooms 0–511) then ``RLCA`` ``(room&7)+1`` times so the selected bit
    lands in bit 0. $ABF0 then ``AND $01``.
    """
    high = (room_id >> 8) & 1
    low = room_id & 0xFF
    offset = ((high >> 3) | ((low & 0xF8) >> 3)) & 0xFF
    value = snapshot[A350 + offset] & 0xFF
    for _ in range((low & 7) + 1):
        value = ((value << 1) | (value >> 7)) & 0xFF
    return (value & 1) != 0


def sprite_payload(sprites: list[Sprite], sheet_name: str) -> dict:
    return {
        "spritesheet": sheet_name,
        "cell_size": 8,
        "colour": (
            "Monochrome: ink is opaque white, paper is transparent. Colour is "
            "not baked into the PNG; $AA30 / $DB24 supply the attribute at blit time."
        ),
        "format": (
            "Each sprite is 2×2 cells (16×16 pixels), 32 bytes at $9088+id×32. "
            "Bytes are four consecutive 8-byte UDGs in row-major order. There is "
            "no row-flag mask and no attribute stream; cells[].attr is null."
        ),
        "compositing": (
            "$DB24 XOR-blits the four cells onto the existing bitmap, then writes "
            "the full attribute byte unless bit 7 (FLASH) of that byte is set. "
            "$AA30 always does OR $40 before the call, so bit 6 (solidity / BRIGHT) "
            "is set and the collision grid can change. XOR is not a transparency "
            "mask: a second blit of the same sprite restores the pixels."
        ),
        "graphics": [asdict(s) for s in sprites],
    }


def actor_payload(actors: list[Sprite], sheet_name: str) -> dict:
    sets = []
    for name, ptr, count in GRAFIX_SETS:
        sets.append({"name": name, "ptr": ptr, "frames": count, "kind": "grafix"})
    for name, ptr, count in BLOB_SETS:
        sets.append({"name": name, "ptr": ptr, "frames": count, "kind": "blob"})
    return {
        "spritesheet": sheet_name,
        "cell_size": 8,
        "colour": (
            "Monochrome: ink is opaque white, paper is transparent. The game "
            "loop supplies the attribute (e.g. $DDA1 = 7 for the hoverpad)."
        ),
        "format": (
            "GRAFIX frame: 3×2 cells, 48 bytes. Scanline p of the top row is "
            "three consecutive bytes at ptr+p×3 (columns 0,1,2); the bottom row "
            "starts at ptr+$18. This is SkoolKit #GRAFIX / #UDGARRAY3 step 3. "
            "BLOB is four (or eight) GRAFIX frames at +$00/+$30/+$60/+$90. "
            "No row flags, no attribute stream."
        ),
        "compositing": (
            "The unlabeled routine at $DF70 XOR-blits three bytes per scanline "
            "onto the screen at pixel coordinates (with a shift when x&7 ≠ 0). "
            "$D8B1 then merges ink into existing attributes: if BRIGHT (bit 5) "
            "is already set the cell is skipped, otherwise AND $F8 / OR ink. "
            "Bit 6 (solidity) is not forced. $AA30 never calls this path."
        ),
        "sets": sets,
        "graphics": [asdict(s) for s in actors],
    }


def packed_room(byte: int) -> int:
    """Room id as $648A writes it: RL E / RR D into 94E8 bytes 1–2.

    Bit 7 of the table byte becomes the room-256 flag; the rest shifts left,
    so every assigned room is even.
    """
    return ((byte >> 7) & 1) * 256 + ((byte << 1) & 0xFF)


def assignment_pools(snapshot: list[int]) -> dict:
    """Static candidate rooms for the new-game shuffle at $6351 / $648A."""
    specials = []
    for i, sprite in enumerate((0x0F, 0x10)):
        base = ASSIGN_SPECIAL + i * 4
        specials.append(
            {
                "sprite": sprite,
                "table": base,
                "candidates": [packed_room(snapshot[base + j]) for j in range(4)],
            }
        )
    pairs = []
    for i in range(18):
        a = snapshot[ASSIGN_PAIRS + i * 2]
        b = snapshot[ASSIGN_PAIRS + i * 2 + 1]
        pairs.append(
            {
                "index": i,
                "table": ASSIGN_PAIRS + i * 2,
                "candidates": [packed_room(a), packed_room(b)],
            }
        )
    cores = []
    for i in range(8):
        lo = snapshot[CORE_SLOTS + i * 2]
        hi = snapshot[CORE_SLOTS + i * 2 + 1]
        cores.append(
            {
                "index": i,
                "room": ((hi >> 7) & 1) * 256 + lo,
                "flags": hi,
            }
        )
    return {
        "routine": "0x6351 writes records 0–19 via 0x648A; records 20–44 stay ROM (room $C7).",
        "safeguard": (
            "No retry after the shuffle. Items 0–19 only land in the 44 rooms "
            "listed here, all of which have at least one $90-nibble marker so "
            "$AA30 can place them. Sprites $0F and $10 (key / core tool) each "
            "pick 1 of 4 rooms; the other 18 records pick 1 of 2. Core-piece "
            "rooms at $95F0 are not shuffled."
        ),
        "specials": specials,
        "pairs": pairs,
        "core_slots": cores,
    }


def items_payload(items: list[dict], *, d2c6: list[int], pools: dict | None = None) -> dict:
    return {
        "table": ITEM_TABLE,
        "count": ITEM_COUNT,
        "stride": ITEM_STRIDE,
        "room_skip": ROOM_SKIP,
        "initialized": True,
        "d2c6": d2c6,
        "note": (
            "45 collectables after first-visit placement. Byte 0: column in bits "
            "0–4, ink in bits 5–7. Byte 1: row in bits 0–6 (values < 6 mean "
            "unplaced), bit 7 is room 256. Byte 2: room low. Byte 3: sprite id "
            "for $CE68. Coordinates of records that were unplaced in the snapshot "
            "are filled by $AA30 from $90 markers at $96CB and $DAC6 (seeded from "
            "the room data address). That step is a function of the room id plus "
            "the frozen $D2C6 from game start; visit order does not matter. "
            "Collecting ($D16B writes y=$01) and extra $A350 objects still need "
            "the engine. snapshot_raw is the four bytes before placement. "
            "Records 0–19 had their rooms shuffled at new game ($648A); 20–44 "
            "stay in room $C7 as ROM."
        ),
        "assignment": pools,
        "items": items,
    }
