import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CELL, COLS, PLAY_ORIGIN, ROWS, START_PLATFORMS } from "./constants";
import {
  blocksBlob,
  createWorld,
  enterRoom,
  platformCol,
  platformRow,
  playYToGame,
  spawnBlob,
  tick,
  type BlobState,
  type Input,
} from "./physics";
import { composeTiles, newBuffers, newRgba, rasterize } from "./render";
import type { Prepared, Room, World } from "./types";

function grid(draw: (solid: number[][], attr: number[][]) => void): Prepared {
  const solid = Array.from({ length: ROWS }, () => Array<number>(COLS).fill(0));
  const attributes = Array.from({ length: ROWS }, () => Array<number>(COLS).fill(0x47));
  draw(solid, attributes);
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (solid[y]![x]) attributes[y]![x] = 0x07;
    }
  }
  const template = (id: number): Room => ({ id, blocks: [], attributes, solid });
  const rooms: Room[] = Array.from({ length: 512 }, (_, id) => template(id));
  return {
    graphics: [],
    sprites: [],
    actorsBySet: new Map(),
    actorsByPtr: new Map(),
    blocks: [],
    rooms,
    itemsByRoom: Array.from({ length: 512 }, () => []),
  };
}

function emptyWorld(): Prepared {
  return grid(() => {
    /* air $47 */
  });
}

function idle(): Input {
  return { left: false, right: false, up: false, down: false };
}

function airborne(prep: Prepared, world: World, x = 16, y = 40): BlobState {
  const blob = spawnBlob(prep, 1, world);
  blob.x = x;
  blob.y = y;
  blob.fallIndex = 0;
  blob.jumpTicks = 0;
  blob.onGround = false;
  return blob;
}

function attrAt(world: World, col: number, row: number): number {
  return world.terrain.attr[row * COLS + col]!;
}

function platformCells(blob: BlobState): { col: number; row: number } {
  const col = ((blob.x + 4) & 0xf8) >> 3;
  const gameY = playYToGame(blob.y);
  const row = (((0xd6 - gameY) & 0xf8) >> 3) - PLAY_ORIGIN;
  return { col, row };
}

describe("platforms $C79F", () => {
  it("builds a 2-cell platform, clears bit 6, and Blob stands on it", () => {
    const prep = emptyWorld();
    const world = createWorld(prep, 1);
    const blob = airborne(prep, world);
    assert.equal(world.platforms, START_PLATFORMS);

    tick(prep, blob, { ...idle(), down: true }, world);
    const { col, row } = platformCells(blob);
    assert.equal(world.platforms, START_PLATFORMS - 2);
    assert.equal(blocksBlob(attrAt(world, col, row)), true, `left cell (${col},${row}) attr=${attrAt(world, col, row).toString(16)}`);
    assert.equal(blocksBlob(attrAt(world, col + 1, row)), true, "right cell");
    assert.equal(attrAt(world, col, row) & 0x40, 0, "bit 6 cleared ($DBA6 RES 6)");

    for (let i = 0; i < 24; i++) tick(prep, blob, idle(), world);
    assert.equal(blob.onGround, true);
    assert.equal(blob.y, row * CELL - 16);
  });

  it("does not build when $D2CE is 0", () => {
    const prep = emptyWorld();
    const world = createWorld(prep, 1);
    world.platforms = 0;
    const blob = airborne(prep, world);
    const before = Uint8Array.from(world.terrain.attr);
    tick(prep, blob, { ...idle(), down: true }, world);
    assert.equal(world.platforms, 0);
    assert.deepEqual(Uint8Array.from(world.terrain.attr), before);
    assert.equal(world.slots.every((s) => s === null), true);
  });

  it("does not build into a $64 cell", () => {
    const prep = grid((_, attr) => {
      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) attr[y]![x] = 0x64;
      }
    });
    const world = createWorld(prep, 1);
    const blob = airborne(prep, world, 16, 40);
    const stock = world.platforms;
    tick(prep, blob, { ...idle(), down: true }, world);
    assert.equal(world.platforms, stock);
    assert.equal(attrAt(world, platformCol(blob.x), platformRow(playYToGame(blob.y))) & 0x7f, 0x64);
  });

  it("restores export terrain when leaving the room ($A4B1 / $A426)", () => {
    const prep = emptyWorld();
    const world = createWorld(prep, 1);
    const blob = airborne(prep, world);
    tick(prep, blob, { ...idle(), down: true }, world);
    assert.ok(world.slots.some((s) => s !== null));

    const prevRoom = blob.room;
    enterRoom(prep, world, 2);
    blob.room = 2;
    for (let i = 0; i < COLS * ROWS; i++) assert.equal(world.terrain.attr[i], 0x47);
    assert.equal(world.slots.every((s) => s === null), true);

    enterRoom(prep, world, prevRoom);
    blob.room = prevRoom;
    for (let i = 0; i < COLS * ROWS; i++) {
      assert.equal(world.terrain.attr[i], prep.rooms[prevRoom]!.attributes[(i / COLS) | 0]![i % COLS]);
    }
    assert.equal(world.slots.every((s) => s === null), true);
  });

  it("expires a platform via $DBEC and restores bit 6", () => {
    const prep = emptyWorld();
    const world = createWorld(prep, 1);
    const blob = airborne(prep, world);
    tick(prep, blob, { ...idle(), down: true }, world);
    const { col, row } = platformCells(blob);
    assert.equal(blocksBlob(attrAt(world, col, row)), true);

    for (let i = 0; i < 12 * 12; i++) tick(prep, blob, idle(), world);
    assert.equal(blocksBlob(attrAt(world, col, row)), false);
    assert.equal(attrAt(world, col, row) & 0x40, 0x40);
    assert.equal(world.slots.every((s) => s === null), true);
  });

  it("does not hold-repeat: $DD2C latch until down is released", () => {
    const prep = emptyWorld();
    const world = createWorld(prep, 1);
    const blob = airborne(prep, world);
    tick(prep, blob, { ...idle(), down: true }, world);
    const stock = world.platforms;
    tick(prep, blob, { ...idle(), down: true }, world);
    assert.equal(world.platforms, stock);
    tick(prep, blob, idle(), world);
    tick(prep, blob, { ...idle(), down: true }, world);
    assert.equal(world.platforms, stock - 2);
  });
});

describe("mutable terrain vs export", () => {
  it("entered room raster matches composeTiles from export", () => {
    const prep = emptyWorld();
    const world = createWorld(prep, 1);
    const exportBuf = newBuffers();
    composeTiles(prep, exportBuf, 1);
    const live = newRgba();
    const exported = newRgba();
    rasterize(world.terrain, live, false, null);
    rasterize(exportBuf, exported, false, null);
    assert.deepEqual(live, exported);
  });
});
