import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CELL, COLS, GRAFIX_BASE, GRAFIX_STRIDE, ROWS, START_ENERGY } from "./constants";
import { cloneEntity, entityVisible, tickNasties } from "./entities";
import { createWorld, enterRoom, spawnBlob } from "./physics";
import type { Entity, Prepared, Room } from "./types";

function grid(draw: (solid: number[][], attr: number[][]) => void): Prepared {
  const solid = Array.from({ length: ROWS }, () => Array<number>(COLS).fill(0));
  const attributes = Array.from({ length: ROWS }, () => Array<number>(COLS).fill(0x47));
  draw(solid, attributes);
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (solid[y]![x]) attributes[y]![x] = 0x07;
    }
  }
  const rooms: Room[] = Array.from({ length: 512 }, (_, id) => ({ id, blocks: [], attributes, solid }));
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

function liveEntity(over: Partial<Entity>): Entity {
  return {
    x: 80,
    y: 80,
    ink: 4,
    set: "alien1",
    frame: 0,
    ptr: GRAFIX_BASE + 3 * GRAFIX_STRIDE,
    basePtr: GRAFIX_BASE + 3 * GRAFIX_STRIDE,
    dir: 2,
    speedX: 2,
    speedY: 2,
    period: 1,
    timer: 1,
    state: 1,
    stateTimer: 0,
    ai: 6,
    aiPeriod: 0x64,
    aiCount: 0x64,
    homeX: 80,
    homeY: 80,
    ...over,
  };
}

describe("nasty draw skip $D8B1", () => {
  it("does not show the $9E86 parking pose at X=0 Y=$0F", () => {
    const prep = grid(() => {
      /* air */
    });
    const world = createWorld(prep, 1);
    const parked = world.entities.filter((e) => e.y !== 0);
    assert.ok(parked.length > 0, "spawned slots sit at Y=$0F until the appear timer");
    for (const e of parked) {
      if (e.state === 0 && e.stateTimer === 0) {
        assert.equal(e.x, 0);
        assert.equal(e.y, 0x0f);
        assert.equal(entityVisible(e), false);
      }
    }
    assert.equal(entityVisible(liveEntity({ x: 0, y: 0x0f, ptr: 0xdf40 })), false);
    assert.equal(entityVisible(liveEntity({ x: 192, y: 17 })), true);
  });
});

describe("nasties $A01B", () => {
  it("moves left 8px in one tick when period is 1 (4 inner steps × 2)", () => {
    const prep = grid(() => {
      /* air */
    });
    const world = createWorld(prep, 1);
    world.entities = [liveEntity({ x: 80, y: 80, dir: 2, ai: 6 })];
    world.nastyCount = 1;
    const blob = spawnBlob(prep, 1, world);
    blob.x = 0;
    blob.y = 0;
    tickNasties(prep, blob, world);
    assert.equal(world.entities[0]!.x, 72);
    assert.equal(world.entities[0]!.y, 80);
  });

  it("killing graphic ($B2xx) zeros energy on contact", () => {
    const prep = grid(() => {
      /* air */
    });
    const world = createWorld(prep, 1);
    const blob = spawnBlob(prep, 1, world);
    const e = liveEntity({
      x: blob.x,
      y: 143 - blob.y,
      ptr: GRAFIX_BASE + GRAFIX_STRIDE,
      basePtr: GRAFIX_BASE + GRAFIX_STRIDE,
      set: "badalien1",
    });
    world.entities = [e];
    world.nastyCount = 1;
    world.energy = START_ENERGY;
    tickNasties(prep, blob, world);
    assert.equal(world.energy, 0);
  });

  it("annoying graphic ($B4xx) bumps $DD30 instead of killing", () => {
    const prep = grid(() => {
      /* air */
    });
    const world = createWorld(prep, 1);
    const blob = spawnBlob(prep, 1, world);
    world.energy = START_ENERGY;
    const drain = world.energyDrain;
    world.entities = [
      liveEntity({
        x: blob.x,
        y: 143 - blob.y,
        ptr: GRAFIX_BASE + 3 * GRAFIX_STRIDE,
        basePtr: GRAFIX_BASE + 3 * GRAFIX_STRIDE,
        set: "alien1",
      }),
    ];
    world.nastyCount = 1;
    tickNasties(prep, blob, world);
    assert.equal(world.energy, START_ENERGY);
    assert.equal(world.energyDrain, (drain + 0x0a * 4) & 0xff);
  });
});

describe("nasty spawn / room cache $9C47", () => {
  it("creates four slots on enter and does not accumulate on revisits", () => {
    const prep = grid(() => {
      /* air */
    });
    const world = createWorld(prep, 1);
    assert.equal(world.entities.length, 4);
    enterRoom(prep, world, 2);
    assert.equal(world.entities.length, 4);
    enterRoom(prep, world, 3);
    assert.equal(world.entities.length, 4);
    enterRoom(prep, world, 4);
    assert.equal(world.entities.length, 4);
  });

  it("restores the previous room when toggling back ($959C swap)", () => {
    const prep = grid(() => {
      /* air */
    });
    const world = createWorld(prep, 1);
    world.entities[0]!.x = 99;
    world.entities[0]!.y = 77;
    const snap = cloneEntity(world.entities[0]!);
    enterRoom(prep, world, 2);
    assert.notEqual(world.entities[0]!.x, 99);
    enterRoom(prep, world, 1);
    assert.equal(world.entities[0]!.x, snap.x);
    assert.equal(world.entities[0]!.y, snap.y);
  });
});

void CELL;
