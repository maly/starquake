import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BADALIEN1_PTR,
  BADALIEN2_PTR,
  CELL,
  COLS,
  DEATH_A_LETHAL,
  DEATH_A_LETHAL_C8,
  GRAFIX_BASE,
  GRAFIX_STRIDE,
  HIT_DX,
  HIT_DY,
  ROWS,
  START_ENERGY,
} from "./constants";
import { cloneEntity, entityVisible, spawnOne, tickNasties } from "./entities";
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

  it("$9DE6 kind from $DAC1 is 2..16 (badalien2), not $B2C8 mixed into annoying", () => {
    const prep = grid(() => {
      /* air */
    });
    const world = createWorld(prep, 1);
    world.dac = { dac0: 0, dac2: 0, dac4: 0, db19: 3, db1a: 3 };
    const e = spawnOne(prep, 1, world, 1);
    assert.equal(e.basePtr, BADALIEN2_PTR);
    assert.notEqual(e.basePtr, BADALIEN1_PTR);
  });

  it("$D2F0 uses 3 attr rows when (Y+1)∧7≠0 so a wall on the third row bounces", () => {
    const prep = grid((solid) => {
      solid[9]![12] = 1;
    });
    const world = createWorld(prep, 1);
    const blob = spawnBlob(prep, 1, world);
    blob.x = 0;
    blob.y = 0;
    world.entities = [liveEntity({ x: 80, y: 80, dir: 1, ai: 0, period: 1, timer: 1 })];
    world.nastyCount = 1;
    tickNasties(prep, blob, world);
    assert.ok(world.entities[0]!.x < 80, `expected bounce left, x=${world.entities[0]!.x}`);
    assert.equal(world.entities[0]!.dir & 3, 2);
  });

  it("killing graphic ($B2C8) returns death A=$11 and does not zero energy", () => {
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
    const a = tickNasties(prep, blob, world);
    assert.equal(world.energy, START_ENERGY);
    assert.equal(a, DEATH_A_LETHAL_C8);
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

  it("lethal AABB |dx| < $0E, |dy| < $0B: 13/10 hit, 14/11 miss", () => {
    const prep = grid(() => {
      /* air */
    });
    const world = createWorld(prep, 1);
    const blob = spawnBlob(prep, 1, world);
    const gy = 143 - blob.y;
    const freeze = { dir: 0, period: 0xff, timer: 0xff, ai: 6, aiCount: 0x64 };
    const probe = (dx: number, dy: number): number | null => {
      world.entities = [
        liveEntity({
          x: blob.x + dx,
          y: gy + dy,
          ptr: BADALIEN2_PTR,
          basePtr: BADALIEN2_PTR,
          set: "badalien2",
          ...freeze,
        }),
      ];
      world.nastyCount = 1;
      world.energy = START_ENERGY;
      return tickNasties(prep, blob, world);
    };
    assert.equal(probe(HIT_DX - 1, 0), DEATH_A_LETHAL, "dx=13 inside");
    assert.equal(probe(HIT_DX, 0), null, "dx=14 outside");
    assert.equal(probe(0, HIT_DY - 1), DEATH_A_LETHAL, "dy=10 inside");
    assert.equal(probe(0, HIT_DY), null, "dy=11 outside");
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
