import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import {
  COLS,
  EXTRA_CHEOPS,
  ITEM_COUNT,
  LIFT_ATTR,
  PLAY_ORIGIN,
  ROWS,
  START_ENERGY,
  START_FIREPOWER,
  START_LIVES,
  START_PLATFORMS,
} from "./constants";
import {
  applyCheopsChoice,
  applyExtra,
  a350Allows,
  clearA350Bit,
  itemGamePos,
  pickCheopsSlot,
  rollCheopsOffers,
} from "./items";
import { createWorld, enterRoom, spawnBlob, tick } from "./physics";
import { feedCheopsKey } from "./ui/overlay";
import { blitItems, newBuffers, prepare } from "./render";
import { REPO_ROOT } from "./server";
import type { ExtraObject, GameData, Item, Prepared, Room, World } from "./types";

function grid(items: Item[] = []): Prepared {
  const solid = Array.from({ length: ROWS }, () => Array<number>(COLS).fill(0));
  const attributes = Array.from({ length: ROWS }, () => Array<number>(COLS).fill(0x47));
  const rooms: Room[] = Array.from({ length: 512 }, (_, id) => ({ id, blocks: [], attributes, solid }));
  const itemsByRoom: Item[][] = Array.from({ length: 512 }, () => []);
  for (const it of items) {
    if (it.room >= 0 && it.room < 512) itemsByRoom[it.room]!.push(it);
  }
  return {
    graphics: [],
    sprites: [],
    actorsBySet: new Map(),
    actorsByPtr: new Map(),
    blocks: [],
    rooms,
    itemsByRoom,
  };
}

function idle() {
  return { left: false, right: false, up: false, down: false, fire: false };
}

function placed(over: Partial<Item> & Pick<Item, "index" | "room">): Item {
  return {
    col: 10,
    row: 8,
    placed: true,
    sprite: 26,
    attr_bits: 3,
    raw: [],
    ...over,
  };
}

function setStats(world: World, lives: number, energy: number, platforms: number, firepower: number): void {
  world.lives = lives;
  world.energy = energy;
  world.platforms = platforms;
  world.firepower = firepower;
}

function expectStats(world: World, lives: number, energy: number, platforms: number, firepower: number): void {
  assert.equal(world.lives, lives);
  assert.equal(world.energy, energy);
  assert.equal(world.platforms, platforms);
  assert.equal(world.firepower, firepower);
}

describe("item geometry $AA02", () => {
  it("maps cell (25,7) to pixel X=200 game-Y=135", () => {
    const p = itemGamePos(placed({ index: 0, room: 168, col: 25, row: 7 }));
    assert.equal(p.x, 200);
    assert.equal(p.y, 135);
  });
});

describe("collect $D09F / $D16B", () => {
  it("picks up on Up when Blob is within $0F and writes collected", () => {
    const item = placed({ index: 16, room: 1, sprite: 26, attr_bits: 5, col: 10, row: 8 });
    const prep = grid([item]);
    const world = createWorld(prep, 1);
    const blob = spawnBlob(prep, 1, world);
    const pos = itemGamePos(item);
    blob.x = pos.x;
    blob.y = 143 - pos.y;
    tick(prep, blob, { ...idle(), up: true }, world);
    assert.equal(world.collected[16], 1);
    assert.equal(world.inventory[0]?.sprite, 26);
    assert.equal(world.inventory[0]?.attr, 5);
    expectStats(world, START_LIVES, START_ENERGY, START_PLATFORMS, START_FIREPOWER);
  });

  it("collect $94E8 with lives=0 still fills inventory and leaves stats alone", () => {
    const item = placed({ index: 16, room: 1, sprite: 0x1a, attr_bits: 3, col: 10, row: 8 });
    const prep = grid([item]);
    const world = createWorld(prep, 1);
    const blob = spawnBlob(prep, 1, world);
    setStats(world, 0, START_ENERGY, START_PLATFORMS, START_FIREPOWER);
    const pos = itemGamePos(item);
    blob.x = pos.x;
    blob.y = 143 - pos.y;
    tick(prep, blob, { ...idle(), up: true }, world);
    assert.equal(world.collected[16], 1);
    assert.equal(world.inventory[0]?.sprite, 0x1a);
    assert.equal(world.inventory[0]?.attr, 3);
    expectStats(world, 0, START_ENERGY, START_PLATFORMS, START_FIREPOWER);
  });

  it("does not pick up without Up", () => {
    const item = placed({ index: 16, room: 1 });
    const prep = grid([item]);
    const world = createWorld(prep, 1);
    const blob = spawnBlob(prep, 1, world);
    const pos = itemGamePos(item);
    blob.x = pos.x;
    blob.y = 143 - pos.y;
    tick(prep, blob, idle(), world);
    assert.equal(world.collected[16], 0);
    assert.equal(world.inventory.length, 0);
  });

  it("stays collected after leaving and returning to the room", () => {
    const item = placed({ index: 16, room: 1, sprite: 30 });
    const prep = grid([item]);
    const world = createWorld(prep, 1);
    const blob = spawnBlob(prep, 1, world);
    const pos = itemGamePos(item);
    blob.x = pos.x;
    blob.y = 143 - pos.y;
    tick(prep, blob, { ...idle(), up: true }, world);
    blob.room = 2;
    tick(prep, blob, idle(), world);
    blob.room = 1;
    enterRoom(prep, world, 1);
    assert.equal(world.collected[16], 1);
    const buf = newBuffers();
    blitItems(prep, buf, 1, world.collected);
    assert.ok(buf.data.every((b) => b === 0));
  });

  it("does not collect twice on a held Up", () => {
    const a = placed({ index: 2, room: 1, col: 10, row: 8, sprite: 33 });
    const b = placed({ index: 3, room: 1, col: 10, row: 8, sprite: 8 });
    const prep = grid([a, b]);
    const world = createWorld(prep, 1);
    const blob = spawnBlob(prep, 1, world);
    const pos = itemGamePos(a);
    blob.x = pos.x;
    blob.y = 143 - pos.y;
    tick(prep, blob, { ...idle(), up: true }, world);
    tick(prep, blob, { ...idle(), up: true }, world);
    assert.equal(world.collected[2] + world.collected[3], 1);
  });
});

/** Screen-row 15 / col 10 → game-Y $47, same as tmp_overflow_probe.py. */
const DROP_COL = 10;
const DROP_ROW = 15;

function carried(index: number, sprite: number, room = 2): Item {
  return placed({ index, room, sprite, attr_bits: 3, col: 0, row: 8 });
}

function fillFour(world: World, items: Item[]): void {
  world.inventory = items.map((it) => ({ sprite: it.sprite, attr: it.attr_bits, index: it.index }));
  for (const it of items) world.collected[it.index] = 1;
}

function poke2x2(world: World, col: number, screenRow: number, attr: number): void {
  const playRow = screenRow - PLAY_ORIGIN;
  for (const dc of [0, 1]) {
    for (const dr of [0, 1]) {
      world.terrain.attr[(playRow + dr) * COLS + (col + dc)] = attr;
    }
  }
}

function pickFifth(prep: ReturnType<typeof grid>, world: World, fifth: Item) {
  const blob = spawnBlob(prep, fifth.room, world);
  const pos = itemGamePos(fifth);
  blob.x = pos.x;
  blob.y = 143 - pos.y;
  tick(prep, blob, { ...idle(), up: true }, world);
  return blob;
}

describe("inventory overflow $D1CA / $D1F8", () => {
  function fourCarried(base = 10): Item[] {
    return [0x0c, 0x0d, 0x0e, 0x0f].map((sprite, i) => carried(base + i, sprite));
  }

  it("drops the oldest $94E8 back at col−1 when $D267 is clear ($47)", () => {
    const held = fourCarried();
    const fifth = placed({ index: 0, room: 1, sprite: 0x1a, attr_bits: 3, col: DROP_COL, row: DROP_ROW });
    const prep = grid([...held, fifth]);
    const world = createWorld(prep, 1);
    fillFour(world, held);
    pickFifth(prep, world, fifth);
    assert.equal(world.collected[0], 1);
    assert.deepEqual(
      world.inventory.map((it) => it.sprite),
      [0x1a, 0x0c, 0x0d, 0x0e],
    );
    assert.equal(world.collected[13], 0);
    assert.equal(held[3]!.room, 1);
    assert.equal(held[3]!.col, DROP_COL - 1);
    assert.equal(held[3]!.row, DROP_ROW);
    assert.ok(prep.itemsByRoom[1]!.includes(held[3]!));
  });

  it("uses col+2 when the left 2×2 is solid or $64", () => {
    const held = fourCarried();
    const fifth = placed({ index: 0, room: 1, sprite: 0x1a, attr_bits: 3, col: DROP_COL, row: DROP_ROW });
    const prep = grid([...held, fifth]);
    const world = createWorld(prep, 1);
    fillFour(world, held);
    poke2x2(world, DROP_COL - 1, DROP_ROW, 0x07);
    pickFifth(prep, world, fifth);
    assert.equal(held[3]!.col, DROP_COL + 2);
    assert.equal(held[3]!.row, DROP_ROW);

    const fifth64 = placed({ index: 1, room: 1, sprite: 0x1b, attr_bits: 3, col: DROP_COL, row: DROP_ROW });
    const held64 = [0x0c, 0x0d, 0x0e, 0x0f].map((sprite, i) => carried(20 + i, sprite));
    const prep64 = grid([...held64, fifth64]);
    const world64 = createWorld(prep64, 1);
    fillFour(world64, held64);
    poke2x2(world64, DROP_COL - 1, DROP_ROW, LIFT_ATTR);
    pickFifth(prep64, world64, fifth64);
    assert.equal(held64[3]!.col, DROP_COL + 2);
  });

  it("keeps the blob column when both $D267 probes fail", () => {
    const held = fourCarried();
    const fifth = placed({ index: 0, room: 1, sprite: 0x1a, attr_bits: 3, col: DROP_COL, row: DROP_ROW });
    const prep = grid([...held, fifth]);
    const world = createWorld(prep, 1);
    fillFour(world, held);
    poke2x2(world, DROP_COL - 1, DROP_ROW, 0x07);
    poke2x2(world, DROP_COL + 2, DROP_ROW, 0x07);
    pickFifth(prep, world, fifth);
    assert.equal(held[3]!.col, DROP_COL);
    assert.equal(held[3]!.row, DROP_ROW);
  });

  it("skips left at col 0 and right when col ≥ $1D", () => {
    const held = fourCarried();
    const fifth = placed({ index: 0, room: 1, sprite: 0x1a, attr_bits: 3, col: 0, row: DROP_ROW });
    const prep = grid([...held, fifth]);
    const world = createWorld(prep, 1);
    fillFour(world, held);
    pickFifth(prep, world, fifth);
    assert.equal(held[3]!.col, 2);

    const heldR = [0x0c, 0x0d, 0x0e, 0x0f].map((sprite, i) => carried(30 + i, sprite));
    const fifthR = placed({ index: 1, room: 1, sprite: 0x1b, attr_bits: 3, col: 0x1d, row: DROP_ROW });
    const prepR = grid([...heldR, fifthR]);
    const worldR = createWorld(prepR, 1);
    fillFour(worldR, heldR);
    poke2x2(worldR, 0x1d - 1, DROP_ROW, 0x07);
    pickFifth(prepR, worldR, fifthR);
    assert.equal(heldR[3]!.col, 0x1d);
  });

  it("lets the dropped item be picked up again", () => {
    const held = fourCarried();
    const fifth = placed({ index: 0, room: 1, sprite: 0x1a, attr_bits: 3, col: DROP_COL, row: DROP_ROW });
    const prep = grid([...held, fifth]);
    const world = createWorld(prep, 1);
    fillFour(world, held);
    pickFifth(prep, world, fifth);
    world.pickupLatch = false;
    const blob = spawnBlob(prep, 1, world);
    const pos = itemGamePos(held[3]!);
    blob.x = pos.x;
    blob.y = 143 - pos.y;
    tick(prep, blob, { ...idle(), up: true }, world);
    assert.equal(world.collected[13], 1);
    assert.equal(world.inventory[0]?.sprite, 0x0f);
  });
});

describe("extra $A350 / $CC9A", () => {
  it("extra $11 adds $20 energy", () => {
    const world = createWorld(grid(), 1);
    setStats(world, 4, 0x17, 0x30, 0x7e);
    applyExtra(world, 0x11);
    expectStats(world, 4, 0x37, 0x30, 0x7e);
  });

  it("extra $11 caps energy at $7F ($D425)", () => {
    const world = createWorld(grid(), 1);
    setStats(world, 4, 0x7e, 0x30, 0x7e);
    applyExtra(world, 0x11);
    expectStats(world, 4, 0x7f, 0x30, 0x7e);
  });

  it("extra $12 adds $60 energy", () => {
    const world = createWorld(grid(), 1);
    setStats(world, 4, 0x17, 0x30, 0x7e);
    applyExtra(world, 0x12);
    expectStats(world, 4, 0x77, 0x30, 0x7e);
  });

  it("extra $13 adds $40 energy", () => {
    const world = createWorld(grid(), 1);
    setStats(world, 4, 0x17, 0x30, 0x7e);
    applyExtra(world, 0x13);
    expectStats(world, 4, 0x57, 0x30, 0x7e);
  });

  it("extra $14 adds $32 platforms", () => {
    const world = createWorld(grid(), 1);
    setStats(world, 4, 0x17, 0x30, 0x7e);
    applyExtra(world, 0x14);
    expectStats(world, 4, 0x17, 0x62, 0x7e);
  });

  it("extra $15 adds $20 firepower and caps at $7F", () => {
    const world = createWorld(grid(), 1);
    setStats(world, 4, 0x17, 0x30, 0x7e);
    applyExtra(world, 0x15);
    expectStats(world, 4, 0x17, 0x30, 0x7f);
  });

  it("extra $16 adds $3C firepower and caps at $7F", () => {
    const world = createWorld(grid(), 1);
    setStats(world, 4, 0x17, 0x30, 0x7e);
    applyExtra(world, 0x16);
    expectStats(world, 4, 0x17, 0x30, 0x7f);
  });

  it("extra $17 with lives=0 applies $CCCC A=$18 (lives +1)", () => {
    const world = createWorld(grid(), 1);
    setStats(world, 0, 0x17, 0x30, 0x7e);
    applyExtra(world, 0x17);
    expectStats(world, 1, 0x17, 0x30, 0x7e);
  });

  it("extra $17 with lives=4 and energy $17 applies $CCCC A=$12", () => {
    const world = createWorld(grid(), 1);
    setStats(world, 4, 0x17, 0x30, 0x7e);
    applyExtra(world, 0x17);
    expectStats(world, 4, 0x77, 0x30, 0x7e);
  });

  it("extra $17 with lives=4 and energy $7E applies $CCCC A=$14", () => {
    const world = createWorld(grid(), 1);
    setStats(world, 4, 0x7e, 0x30, 0x7e);
    applyExtra(world, 0x17);
    expectStats(world, 4, 0x7e, 0x62, 0x7e);
  });

  it("extra $17 with E/P/F all $7F applies $CCCC A=$16 and stays capped", () => {
    const world = createWorld(grid(), 1);
    setStats(world, 4, 0x7f, 0x7f, 0x7f);
    applyExtra(world, 0x17);
    expectStats(world, 4, 0x7f, 0x7f, 0x7f);
  });

  it("extra $17 with energy $FF applies $CCCC A=$14 and $D425 caps energy", () => {
    const world = createWorld(grid(), 1);
    setStats(world, 4, 0xff, 0x30, 0x7e);
    applyExtra(world, 0x17);
    expectStats(world, 4, 0x7f, 0x62, 0x7e);
  });

  it("extra $17 with lives=1 keeps lives and adds $60 energy", () => {
    const world = createWorld(grid(), 1);
    setStats(world, 1, 0x17, 0x30, 0x7e);
    applyExtra(world, 0x17);
    expectStats(world, 1, 0x77, 0x30, 0x7e);
  });

  it("extra $18 adds one life", () => {
    const world = createWorld(grid(), 1);
    setStats(world, 4, 0x17, 0x30, 0x7e);
    applyExtra(world, 0x18);
    expectStats(world, 5, 0x17, 0x30, 0x7e);
  });

  it("extra $18 does not cap lives at $7F", () => {
    const world = createWorld(grid(), 1);
    setStats(world, 0x7f, 0x17, 0x30, 0x7e);
    applyExtra(world, 0x18);
    expectStats(world, 0x80, 0x17, 0x30, 0x7e);
  });

  it("extra $18 wraps lives $FF to 0", () => {
    const world = createWorld(grid(), 1);
    setStats(world, 0xff, 0x17, 0x30, 0x7e);
    applyExtra(world, 0x18);
    expectStats(world, 0, 0x17, 0x30, 0x7e);
  });

  it("extra $19 skips $CC9A table and leaves stats", () => {
    const world = createWorld(grid(), 1);
    setStats(world, 4, 0x17, 0x30, 0x7e);
    applyExtra(world, EXTRA_CHEOPS);
    assert.equal(world.cheops, false);
    expectStats(world, 4, 0x17, 0x30, 0x7e);
  });

  it("spawns extra from $96CB nibble $90 marks, not drawn attr $90 ($AAB6)", () => {
    const prep = grid();
    prep.extraMarksByRoom = Array.from({ length: 512 }, () => []);
    prep.extraMarksByRoom[8] = [
      { col: 13, row: 19 },
      { col: 29, row: 19 },
    ];
    const world = createWorld(prep, 8);
    assert.ok(world.extra, "room 8 has two $90 markers and dac0>=$55");
    assert.equal(world.extra!.sprite, 0x17);
    assert.equal(world.extra!.col, 13);
    assert.equal(world.extra!.row, 19);
    assert.ok(prep.rooms[8]!.attributes.every((row) => row.every((a) => a !== 0x90)));
  });

  it("does not spawn extra when $96CA is 1 (one $90 marker)", () => {
    const prep = grid();
    prep.extraMarksByRoom = Array.from({ length: 512 }, () => []);
    prep.extraMarksByRoom[8] = [{ col: 13, row: 19 }];
    const world = createWorld(prep, 8);
    assert.equal(world.extra, null);
  });

  it("room 416 does not stack extra on the $94E8 item cell", () => {
    const dir = path.join(REPO_ROOT, "out");
    if (!existsSync(path.join(dir, "rooms.json"))) return;
    const read = (name: string) => JSON.parse(readFileSync(path.join(dir, name), "utf8"));
    const pack: GameData = {
      rooms: read("rooms.json"),
      graphics: read("graphics.json"),
      blocks: read("blocks.json"),
      sprites: read("sprites.json"),
      items: read("items.json"),
    };
    if (existsSync(path.join(dir, "actors.json"))) pack.actors = read("actors.json");
    if (existsSync(path.join(dir, "block_attrs.json"))) pack.blockAttrs = read("block_attrs.json");
    const prep = prepare(pack);
    const world = createWorld(prep, 416);
    const item = (prep.itemsByRoom[416] ?? [])[0];
    assert.ok(item);
    assert.ok(world.extra);
    assert.notEqual(
      `${world.extra!.col},${world.extra!.row}`,
      `${item!.col & 0x1f},${item!.row & 0x7f}`,
    );
  });

  it("start room 8 from export spawns extra $17 at $90 marker (13,19)", () => {
    const dir = path.join(REPO_ROOT, "out");
    if (!existsSync(path.join(dir, "rooms.json"))) return;
    const read = (name: string) => JSON.parse(readFileSync(path.join(dir, name), "utf8"));
    const pack: GameData = {
      rooms: read("rooms.json"),
      graphics: read("graphics.json"),
      blocks: read("blocks.json"),
      sprites: read("sprites.json"),
      items: read("items.json"),
    };
    if (existsSync(path.join(dir, "actors.json"))) pack.actors = read("actors.json");
    if (existsSync(path.join(dir, "block_attrs.json"))) pack.blockAttrs = read("block_attrs.json");
    const prep = prepare(pack);
    assert.equal(prep.extraMarksByRoom?.[8]?.length, 2);
    const world = createWorld(prep, 8);
    assert.ok(world.extra);
    assert.equal(world.extra!.sprite, 0x17);
    assert.equal(world.extra!.col, 13);
    assert.equal(world.extra!.row, 19);
  });

  it("picks up an extra on overlap, applies the table, and clears the $A350 bit", () => {
    const prep = grid();
    const world = createWorld(prep, 1);
    const blob = spawnBlob(prep, 1, world);
    const extra: ExtraObject = { sprite: 0x15, ink: 4, col: 4, row: 8, x: 32, y: 80 };
    world.extra = extra;
    world.firepower = 0;
    blob.x = 32;
    blob.y = 143 - 80;
    const before = world.a350.slice();
    tick(prep, blob, idle(), world);
    assert.equal(world.extra, null);
    assert.equal(world.firepower, 0x20);
    assert.equal(a350Allows(world.a350, 1), false);
    assert.notDeepEqual([...world.a350], [...before]);
  });

  it("does not respawn an extra after the bit is cleared", () => {
    const prep = grid();
    const world = createWorld(prep, 1);
    clearA350Bit(world.a350, 1);
    enterRoom(prep, world, 1);
    assert.equal(world.extra, null);
    assert.equal(a350Allows(world.a350, 1), false);
  });

  it("Up on extra $19 starts Cheops UI and leaves the extra until success", () => {
    const prep = grid();
    const world = createWorld(prep, 1);
    const blob = spawnBlob(prep, 1, world);
    world.extra = { sprite: EXTRA_CHEOPS, ink: 6, col: 4, row: 8, x: 40, y: 70 };
    blob.x = 40;
    blob.y = 143 - 70;
    tick(prep, blob, { ...idle(), up: true }, world);
    assert.equal(world.ui.kind, "cheops");
    assert.ok(world.extra);
    assert.equal(world.cheops, false);
  });

  it("AABB overlap without Up does not start Cheops", () => {
    const prep = grid();
    const world = createWorld(prep, 1);
    const blob = spawnBlob(prep, 1, world);
    world.extra = { sprite: EXTRA_CHEOPS, ink: 6, col: 4, row: 8, x: 40, y: 70 };
    blob.x = 40;
    blob.y = 143 - 70;
    tick(prep, blob, idle(), world);
    assert.equal(world.ui.kind, "none");
    assert.ok(world.extra);
  });

  it("successful exchange clears $A350, drops extra, sets cheops", () => {
    const prep = grid();
    const world = createWorld(prep, 1);
    const blob = spawnBlob(prep, 1, world);
    world.extra = { sprite: EXTRA_CHEOPS, ink: 6, col: 4, row: 8, x: 40, y: 70 };
    blob.x = 40;
    blob.y = 143 - 70;
    world.inventory = [
      { sprite: 0x0f, attr: 3 },
      { sprite: 0x1a, attr: 3 },
    ];
    tick(prep, blob, { ...idle(), up: true }, world);
    assert.equal(world.ui.kind, "cheops");
    for (let i = 0; i < 65; i++) tick(prep, blob, idle(), world);
    assert.equal(world.ui.kind, "cheops");
    if (world.ui.kind !== "cheops") throw new Error("expected cheops ui");
    const offer0 = world.ui.offers[0]!;
    feedCheopsKey(world.ui, "1", world);
    tick(prep, blob, idle(), world);
    assert.equal(world.ui.kind, "none");
    assert.equal(world.cheops, true);
    assert.equal(world.extra, null);
    assert.equal(a350Allows(world.a350, 1), false);
    assert.equal(world.inventory[1]?.sprite, offer0);
    assert.equal(world.d2c4, 0x03);
  });
});

describe("Cheops slot pick $CD32 / offers $CD56", () => {
  it("picks the first sprite outside $09–$19", () => {
    assert.equal(pickCheopsSlot([{ sprite: 0x0f, attr: 3 }, { sprite: 0x1a, attr: 3 }]), 1);
    assert.equal(pickCheopsSlot([{ sprite: 0x05, attr: 3 }]), 0);
    assert.equal(pickCheopsSlot([{ sprite: 0x0a, attr: 3 }, { sprite: 0x0b, attr: 3 }]), 1);
    assert.equal(pickCheopsSlot([]), 0);
  });

  it("rolls four $D2DE bit7 sprites into $CCEA..$CCED, option 5 is the given item", () => {
    const world = createWorld(grid(), 1);
    world.d2de = [0x80, 0x8b, 0x89, 0x8a, 0x84, 0x85, 0xa1, 0x8c, 0x88];
    world.dac = { dac0: 0x1234, dac2: 0, dac4: 0x1234, db19: 3, db1a: 3 };
    const offers = rollCheopsOffers(world, 0x1a);
    assert.equal(offers.length, 5);
    assert.equal(offers[4], 0x1a);
    for (const spr of offers.slice(0, 4)) {
      assert.ok([0x00, 0x0b, 0x09, 0x0a, 0x04, 0x05, 0x21, 0x0c, 0x08].includes(spr));
    }
  });

  it("applyCheopsChoice writes the chosen sprite into the slot and keeps attr", () => {
    const world = createWorld(grid(), 1);
    world.inventory = [
      { sprite: 0x0f, attr: 5 },
      { sprite: 0x1a, attr: 3 },
    ];
    applyCheopsChoice(world, 1, [0x21, 0x0b, 0x09, 0x0a, 0x1a], 0);
    assert.equal(world.inventory[1]?.sprite, 0x21);
    assert.equal(world.inventory[1]?.attr, 3);
    assert.equal(world.inventory[0]?.sprite, 0x0f);
  });
});

describe("collected table size", () => {
  it("tracks all 45 $94E8 slots", () => {
    const prep = grid();
    const world = createWorld(prep, 0);
    assert.equal(world.collected.length, ITEM_COUNT);
    assert.equal(world.energy, START_ENERGY);
    assert.equal(world.platforms, START_PLATFORMS);
  });
});
