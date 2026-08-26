import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ANIM_PERIOD, BLOB_H, BLOB_W, CELL, COLS, ROWS, WALK_PX, WALK_RIGHT_SETS } from "./constants";
import {
  animationSet,
  blobInkPixels,
  footColumns,
  onFloor,
  overlapsTerrain,
  spawnBlob,
  supportY,
  tick,
  type BlobState,
} from "./physics";
import { isSolid, moveRoom } from "./render";
import type { Graphic, Prepared, Room } from "./types";

function grid(draw: (solid: number[][], attr: number[][]) => void): Prepared {
  const solid = Array.from({ length: ROWS }, () => Array<number>(COLS).fill(0));
  const attributes = Array.from({ length: ROWS }, () => Array<number>(COLS).fill(0x47));
  draw(solid, attributes);
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      // Terrain that Blob stands on / is blocked by: attr < $40 ($D2F0).
      if (solid[y]![x]) attributes[y]![x] = 0x07;
    }
  }
  const room: Room = { id: 1, blocks: [], attributes, solid };
  const rooms: Room[] = Array.from({ length: 512 }, (_, id) =>
    id === 1 ? room : { id, blocks: [], attributes, solid },
  );
  rooms[0] = { ...room, id: 0 };
  rooms[2] = { ...room, id: 2 };
  rooms[16] = { ...room, id: 16 };
  return {
    graphics: [],
    sprites: [],
    actorsBySet: new Map(),
    blocks: [],
    rooms,
    itemsByRoom: Array.from({ length: 512 }, () => []),
  };
}

function floorWorld(): Prepared {
  return grid((solid) => {
    for (let x = 0; x < COLS; x++) solid[12]![x] = 1;
  });
}

function emptyWorld(): Prepared {
  return grid(() => {
    /* air */
  });
}

function gapWorld(): Prepared {
  return grid((solid) => {
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) solid[y]![x] = 1;
    }
    for (let y = 8; y <= 9; y++) {
      for (let x = 10; x <= 14; x++) solid[y]![x] = 0;
    }
  });
}

function emptyCell(): number[] {
  return [0, 0, 0, 0, 0, 0, 0, 0];
}

function fullCell(): number[] {
  return [0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff];
}

/** 3×2 GRAFIX with ink only in column 0 (left 8 pixels). */
function leftStripGraphic(): Graphic {
  return {
    id: 0,
    ptr: 0,
    cols: 3,
    rows: 2,
    cells: [
      { row: 0, col: 0, data: fullCell(), attr: null },
      { row: 0, col: 1, data: emptyCell(), attr: null },
      { row: 0, col: 2, data: emptyCell(), attr: null },
      { row: 1, col: 0, data: fullCell(), attr: null },
      { row: 1, col: 1, data: emptyCell(), attr: null },
      { row: 1, col: 2, data: emptyCell(), attr: null },
    ],
    set: "blobwr1",
    frame: 0,
  };
}

function withActor(prep: Prepared, graphic: Graphic): Prepared {
  const frames = [graphic, graphic, graphic, graphic];
  const actorsBySet = new Map(prep.actorsBySet);
  for (const name of ["blobwr1", "blobsr1", "blobwr2", "blobsr2", "blobwl1", "blobsl1", "blobwl2", "blobsl2"]) {
    actorsBySet.set(name, frames);
  }
  return { ...prep, actorsBySet };
}

describe("collision", () => {
  it("stays on a solid cell under the feet", () => {
    const prep = floorWorld();
    const y = 12 * CELL - BLOB_H;
    const blob: BlobState = {
      room: 1,
      x: 16,
      y,
      fallIndex: 0,
      jumpTicks: 0,
      facing: 1,
      walkTick: 0,
      walkFrame: 0,
      onGround: true,
    };
    assert.equal(onFloor(prep, 1, blob.x, blob.y), true);
    for (let i = 0; i < 20; i++) tick(prep, blob, { left: false, right: false, up: false });
    assert.equal(blob.y, y);
    assert.equal(blob.onGround, true);
  });

  it("falls when there is no support", () => {
    const prep = emptyWorld();
    const blob: BlobState = {
      room: 1,
      x: 16,
      y: 8,
      fallIndex: 0,
      jumpTicks: 0,
      facing: 1,
      walkTick: 0,
      walkFrame: 0,
      onGround: false,
    };
    const start = blob.y;
    for (let i = 0; i < 10; i++) tick(prep, blob, { left: false, right: false, up: false });
    assert.ok(blob.y > start, `expected fall, y=${blob.y}`);
    assert.equal(blob.onGround, false);
  });

  it("walks through a 3-cell-wide gap", () => {
    const prep = gapWorld();
    const blob: BlobState = {
      room: 1,
      x: 10 * CELL,
      y: 8 * CELL,
      fallIndex: 0,
      jumpTicks: 0,
      facing: 1,
      walkTick: 0,
      walkFrame: 0,
      onGround: false,
    };
    for (let i = 0; i < 20; i++) tick(prep, blob, { left: false, right: true, up: false });
    assert.ok(blob.x > 10 * CELL, `did not advance, x=${blob.x}`);
    assert.ok(blob.x + BLOB_W <= 15 * CELL + WALK_PX);
  });

  it("walks in $47 air and is blocked by $07 tiles", () => {
    const prep = grid((solid) => {
      for (let y = 0; y < ROWS; y++) solid[y]![16] = 1;
      for (let x = 0; x < COLS; x++) solid[12]![x] = 1;
    });
    const blob: BlobState = {
      room: 1,
      x: 8 * 8,
      y: 12 * CELL - BLOB_H,
      fallIndex: 0,
      jumpTicks: 0,
      facing: 1,
      walkTick: 0,
      walkFrame: 0,
      onGround: true,
    };
    const start = blob.x;
    for (let i = 0; i < 40; i++) tick(prep, blob, { left: false, right: true, up: false });
    assert.ok(blob.x > start, "should walk through empty $47");
    assert.ok(blob.x + BLOB_W <= 16 * CELL + WALK_PX, `walked into wall, x=${blob.x}`);
  });

  it("foot probe uses 2 columns when X is aligned", () => {
    assert.deepEqual(footColumns(16), [2, 3]);
    assert.deepEqual(footColumns(18), [2, 3, 4]);
  });

  it("blocks on ink pixels, not the 24×16 box", () => {
    const prep = withActor(
      grid((solid) => {
        for (let y = 8; y <= 9; y++) solid[y]![12] = 1;
        for (let x = 0; x < COLS; x++) solid[10]![x] = 1;
      }),
      leftStripGraphic(),
    );
    const blob: BlobState = {
      room: 1,
      x: 10 * CELL,
      y: 8 * CELL,
      fallIndex: 0,
      jumpTicks: 0,
      facing: 1,
      walkTick: 0,
      walkFrame: 0,
      onGround: false,
    };
    const box = blobInkPixels(undefined);
    assert.equal(overlapsTerrain(prep, 1, blob.x, blob.y, box), true, "bbox hits col 12");
    const ink = blobInkPixels(leftStripGraphic());
    assert.equal(overlapsTerrain(prep, 1, blob.x, blob.y, ink), false, "left 8px are in empty col 10");
    for (let i = 0; i < 8; i++) tick(prep, blob, { left: false, right: true, up: false });
    assert.ok(blob.x > 10 * CELL, `ink should clear the empty columns, x=${blob.x}`);
  });
});

describe("walk animation", () => {
  it("cycles $C0 sets and does not flash stand on the period wrap", () => {
    const prep = floorWorld();
    const blob: BlobState = {
      room: 1,
      x: 16,
      y: 12 * CELL - BLOB_H,
      fallIndex: 0,
      jumpTicks: 0,
      facing: 1,
      walkTick: 0,
      walkFrame: 0,
      onGround: true,
    };
    const sets: string[] = [];
    for (let i = 0; i < ANIM_PERIOD * 4; i++) {
      tick(prep, blob, { left: false, right: true, up: false });
      const anim = animationSet(blob);
      sets.push(anim.set);
      assert.equal(anim.frame, 0);
      assert.equal(WALK_RIGHT_SETS.includes(anim.set as (typeof WALK_RIGHT_SETS)[number]), true);
    }
    assert.equal(sets[ANIM_PERIOD - 1], "blobsr1");
    assert.equal(sets[ANIM_PERIOD], "blobsr1");
    assert.equal(sets[ANIM_PERIOD * 2 - 1], "blobwr2");
    assert.equal(sets[ANIM_PERIOD * 3 - 1], "blobsr2");
    assert.equal(sets[ANIM_PERIOD * 4 - 1], "blobwr1");
  });
});

describe("room transitions", () => {
  function openWorld(): Prepared {
    return grid((solid) => {
      for (let x = 0; x < COLS; x++) solid[16]![x] = 1;
    });
  }

  it("crosses all four edges onto a free cell", () => {
    const prep = openWorld();
    const none = { left: false, right: false, up: false };

    const right: BlobState = spawnBlob(prep, 1);
    right.x = 200;
    right.y = 16 * CELL - BLOB_H;
    for (let i = 0; i < 40 && right.room === 1; i++) tick(prep, right, { ...none, right: true });
    assert.equal(right.room, 2);
    assert.equal(right.x, 0);
    assert.equal(prep.rooms[right.room]!.solid[right.y >> 3]![right.x >> 3], 0);

    const left: BlobState = spawnBlob(prep, 1);
    left.x = 24;
    left.y = 16 * CELL - BLOB_H;
    for (let i = 0; i < 20 && left.room === 1; i++) tick(prep, left, { ...none, left: true });
    assert.equal(left.room, 0);
    assert.equal(left.x, 0xf0);

    const down: BlobState = spawnBlob(prep, 0);
    down.x = 40;
    down.y = 140;
    for (let i = 0; i < 30; i++) tick(prep, down, none);
    assert.equal(down.room, 16);

    const up: BlobState = spawnBlob(prep, 16);
    up.x = 40;
    up.y = 0;
    up.jumpTicks = 20;
    for (let i = 0; i < 30; i++) tick(prep, up, { ...none, up: true });
    assert.equal(up.room, 0);
  });

  it("map edges do not wrap", () => {
    assert.equal(moveRoom(0, -1, 0), 0);
    assert.equal(moveRoom(511, 1, 0), 511);
  });
});

describe("isSolid", () => {
  it("matches $D280", () => {
    assert.equal(isSolid(0x47), true);
    assert.equal(isSolid(0x07), false);
    assert.equal(isSolid(0x64), false);
    assert.equal(isSolid(0xe4), true);
  });
});

void supportY;
