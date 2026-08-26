import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  COLS,
  DD22_PAD,
  DEAD_GRAPHIC,
  FIRE_DIR_LEFT,
  FIRE_DIR_RIGHT,
  FIRE_END_X,
  FIRE_LEFT_PTR,
  FIRE_RIGHT_PTR,
  GRAFIX_BASE,
  GRAFIX_STRIDE,
  PAD_SHOT_PTRS,
  PAD_SHOT_PX,
  ROWS,
  START_FIREPOWER,
} from "./constants";
import { tickNasties } from "./entities";
import { createWorld, spawnBlob, tick } from "./physics";
import { tickFire, tickPadFire } from "./projectiles";
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

function idle() {
  return { left: false, right: false, up: false, down: false, fire: false };
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

describe("blob fire $C85A", () => {
  it("spawns one shot 6px to the right and spends 1 firepower", () => {
    const prep = grid(() => {
      /* air */
    });
    const world = createWorld(prep, 1);
    const blob = spawnBlob(prep, 1, world);
    blob.x = 36;
    blob.y = 143 - 39;
    blob.facing = 1;
    world.aim = FIRE_DIR_RIGHT;
    tickFire(prep, blob, true, world);
    assert.equal(world.fireDir, FIRE_DIR_RIGHT);
    assert.equal(world.bullet.x, 42);
    assert.equal(world.bullet.y, 39);
    assert.equal(world.bullet.ptr, FIRE_RIGHT_PTR);
    assert.equal(world.firepower, START_FIREPOWER - 1);
  });

  it("moves 6px per tick and parks at X>=$F2", () => {
    const prep = grid(() => {
      /* air */
    });
    const world = createWorld(prep, 1);
    const blob = spawnBlob(prep, 1, world);
    blob.x = 36;
    blob.y = 143 - 39;
    blob.facing = 1;
    world.aim = FIRE_DIR_RIGHT;
    tickFire(prep, blob, true, world);
    const xs: number[] = [];
    for (let i = 0; i < 40; i++) {
      tickFire(prep, blob, false, world);
      xs.push(world.bullet.x);
      if (world.fireDir === 0) break;
    }
    assert.deepEqual(
      xs.slice(0, 33),
      [48, 54, 60, 66, 72, 78, 84, 90, 96, 102, 108, 114, 120, 126, 132, 138, 144, 150, 156, 162, 168, 174, 180, 186, 192, 198, 204, 210, 216, 222, 228, 234, 240],
    );
    assert.equal(world.fireDir, 0);
    assert.equal(world.bullet.x, 0);
    assert.equal(world.bullet.y, 0x0f);
    assert.ok(xs[xs.length - 1] === 0);
    assert.ok(240 < FIRE_END_X);
  });

  it("fires left with $E974 and wraps off X=0", () => {
    const prep = grid(() => {
      /* air */
    });
    const world = createWorld(prep, 1);
    const blob = spawnBlob(prep, 1, world);
    blob.x = 36;
    blob.y = 143 - 39;
    blob.facing = -1;
    world.aim = FIRE_DIR_LEFT;
    tickFire(prep, blob, true, world);
    assert.equal(world.bullet.x, 30);
    assert.equal(world.bullet.ptr, FIRE_LEFT_PTR);
    const xs: number[] = [];
    for (let i = 0; i < 10; i++) {
      tickFire(prep, blob, false, world);
      xs.push(world.bullet.x);
      if (world.fireDir === 0) break;
    }
    assert.deepEqual(xs, [24, 18, 12, 6, 0, 0]);
    assert.equal(world.fireDir, 0);
    assert.equal(world.bullet.y, 0x0f);
  });

  it("does not fire when firepower is 0", () => {
    const prep = grid(() => {
      /* air */
    });
    const world = createWorld(prep, 1);
    const blob = spawnBlob(prep, 1, world);
    world.firepower = 0;
    world.aim = FIRE_DIR_RIGHT;
    tickFire(prep, blob, true, world);
    assert.equal(world.fireDir, 0);
    assert.equal(world.bullet.y, 0x0f);
    assert.equal(world.firepower, 0);
  });

  it("does not spend a second firepower while the shot is live", () => {
    const prep = grid(() => {
      /* air */
    });
    const world = createWorld(prep, 1);
    const blob = spawnBlob(prep, 1, world);
    blob.x = 36;
    blob.y = 143 - 39;
    blob.facing = 1;
    world.aim = FIRE_DIR_RIGHT;
    tickFire(prep, blob, true, world);
    const fp = world.firepower;
    const x = world.bullet.x;
    tickFire(prep, blob, true, world);
    assert.equal(world.firepower, fp);
    assert.equal(world.bullet.x, x + 6);
  });

  it("dies on a $D2F0 wall in the travel direction", () => {
    const prep = grid((solid) => {
      for (let r = 0; r < ROWS; r++) solid[r]![6] = 1;
    });
    const world = createWorld(prep, 1);
    const blob = spawnBlob(prep, 1, world);
    blob.x = 32;
    blob.y = 40;
    blob.facing = 1;
    world.aim = FIRE_DIR_RIGHT;
    tickFire(prep, blob, true, world);
    assert.equal(world.fireDir, 0);
    assert.equal(world.bullet.x, 0);
    assert.equal(world.bullet.y, 0x0f);
  });

  it("wires fire through tick()", () => {
    const prep = grid((solid) => {
      for (let x = 0; x < COLS; x++) solid[15]![x] = 1;
    });
    const world = createWorld(prep, 1);
    world.entities = [];
    world.nastyCount = 0;
    const blob = spawnBlob(prep, 1, world);
    blob.x = 36;
    blob.y = 15 * 8 - 16;
    blob.facing = 1;
    tick(prep, blob, { ...idle(), fire: true }, world);
    assert.equal(world.fireDir, FIRE_DIR_RIGHT);
    assert.equal(world.firepower, START_FIREPOWER - 1);
  });
});

describe("bullet hit $A054", () => {
  it("sets the nasty to dying stars and parks the shot", () => {
    const prep = grid(() => {
      /* air */
    });
    const world = createWorld(prep, 1);
    const blob = spawnBlob(prep, 1, world);
    world.entities = [liveEntity({ x: 80, y: 80, ai: 6 })];
    world.nastyCount = 1;
    world.fireDir = FIRE_DIR_RIGHT;
    world.bullet.x = 80;
    world.bullet.y = 80;
    world.bullet.ptr = FIRE_RIGHT_PTR;
    tickNasties(prep, blob, world);
    assert.equal(world.entities[0]!.state, 2);
    assert.equal(world.entities[0]!.ptr, DEAD_GRAPHIC);
    assert.equal(world.fireDir, 0);
    assert.equal(world.bullet.y, 0x0f);
  });
});

describe("pad fire $CA15", () => {
  it("steps 8 px, spends firepower, and does not use $C85A 3×2", () => {
    const prep = grid(() => {
      /* air */
    });
    const world = createWorld(prep, 1);
    const blob = spawnBlob(prep, 1, world);
    blob.x = 72;
    blob.y = 143 - 87;
    world.lastDir = 1;
    const fp = world.firepower;
    tickPadFire(prep, blob, true, world);
    assert.equal(world.firepower, fp - 1);
    assert.equal(world.fireDir, 0, "$C85A must not run while $CA15 owns slot 5");
    assert.equal(world.padShotDir, 1);
    assert.equal(world.bullet.x, (72 & 0xf8) + PAD_SHOT_PX);
    assert.ok(PAD_SHOT_PTRS.includes(world.bullet.ptr as (typeof PAD_SHOT_PTRS)[number]));
    assert.notEqual(world.bullet.ptr, FIRE_RIGHT_PTR);

    const x1 = world.bullet.x;
    tickPadFire(prep, blob, true, world);
    assert.equal(world.firepower, fp - 1, "live pad shot does not spend again");
    assert.equal(world.bullet.x, x1 + PAD_SHOT_PX);
    assert.equal(world.fireDir, 0);
  });

  it("tick() while boarded fires the 8 px pad shot, not blob 6 px", () => {
    const prep = grid(() => {
      /* air */
    });
    const world = createWorld(prep, 1);
    world.entities = [];
    world.nastyCount = 0;
    const blob = spawnBlob(prep, 1, world);
    blob.x = 40;
    blob.y = 40;
    world.dd22 = DD22_PAD;
    world.lastDir = 1;
    const fp = world.firepower;
    tick(prep, blob, { ...idle(), right: true, fire: true }, world);
    assert.equal(world.dd22, DD22_PAD);
    assert.equal(world.fireDir, 0);
    assert.ok(world.padShotDir !== 0);
    assert.equal(world.firepower, fp - 1);
    assert.ok(PAD_SHOT_PTRS.includes(world.bullet.ptr as (typeof PAD_SHOT_PTRS)[number]));
    const moved = Math.abs(world.bullet.x - (40 & 0xf8));
    assert.equal(moved, PAD_SHOT_PX);
  });
});
