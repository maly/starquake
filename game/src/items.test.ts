import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { COLS, EXTRA_CHEOPS, ITEM_COUNT, ROWS, START_ENERGY, START_PLATFORMS } from "./constants";
import { applyExtra, a350Allows, clearA350Bit, itemGamePos } from "./items";
import { createWorld, enterRoom, spawnBlob, tick } from "./physics";
import { blitItems, newBuffers } from "./render";
import type { ExtraObject, Item, Prepared, Room } from "./types";

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

describe("extra $A350 / $CC9A", () => {
  it("applies documented stat deltas and clamps at $7F", () => {
    const prep = grid();
    const world = createWorld(prep, 1);
    world.energy = 0;
    world.platforms = 0;
    world.firepower = 0;
    applyExtra(world, 0x11);
    assert.equal(world.energy, 0x20);
    applyExtra(world, 0x12);
    assert.equal(world.energy, 0x7f);
    applyExtra(world, 0x13);
    assert.equal(world.energy, 0x7f);
    applyExtra(world, 0x14);
    assert.equal(world.platforms, 0x32);
    applyExtra(world, 0x15);
    assert.equal(world.firepower, 0x20);
    applyExtra(world, 0x16);
    assert.equal(world.firepower, 0x20 + 0x3c);
  });

  it("extra $17 adds a life only when lives are 0 ($CCCC)", () => {
    const prep = grid();
    const world = createWorld(prep, 1);
    const lives = world.lives;
    applyExtra(world, 0x17);
    assert.equal(world.lives, lives);
    world.lives = 0;
    applyExtra(world, 0x17);
    assert.equal(world.lives, 1);
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

  it("records Cheops ($19) without implementing the exchange", () => {
    const prep = grid();
    const world = createWorld(prep, 1);
    const blob = spawnBlob(prep, 1, world);
    world.extra = { sprite: EXTRA_CHEOPS, ink: 6, col: 4, row: 8, x: 40, y: 70 };
    blob.x = 40;
    blob.y = 143 - 70;
    tick(prep, blob, { ...idle(), up: true }, world);
    assert.equal(world.cheops, true);
    assert.ok(world.extra);
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
