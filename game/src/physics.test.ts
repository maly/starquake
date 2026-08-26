import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ANIM_PERIOD,
  BLOB_H,
  BLOB_W,
  CELL,
  COLS,
  DD22_LIFT,
  DD22_PAD,
  DD22_WALK,
  HOVERPAD_PTR,
  LIFT_ATTR,
  LIFT_PX,
  NASTY_COUNT_WITH_PAD,
  ROWS,
  WALK_PX,
  WALK_RIGHT_SETS,
} from "./constants";
import {
  animationSet,
  attrAt,
  blobInkPixels,
  blocksBlob,
  createWorld,
  footColumns,
  gameYToPlay,
  onFloor,
  overlapsTerrain,
  playYToGame,
  spawnBlob,
  supportY,
  tick,
  type BlobState,
} from "./physics";
import { isSolid, moveRoom } from "./render";
import type { Graphic, Hotspot, Prepared, Room } from "./types";

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
    actorsByPtr: new Map(),
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

  it("does not hop on Up — $D09F uses Up for pickup", () => {
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
    tick(prep, blob, { left: false, right: false, up: true });
    assert.equal(blob.jumpTicks, 0);
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

function idleInput() {
  return { left: false, right: false, up: false, down: false, fire: false };
}

function withStations(prep: Prepared, room: number, spots: Hotspot[]): Prepared {
  const stationsByRoom = Array.from({ length: 512 }, () => [] as Hotspot[]);
  stationsByRoom[room] = spots;
  return { ...prep, stationsByRoom };
}

describe("$64 lift $C71C / $C761", () => {
  function liftShaft(): Prepared {
    const prep = grid((solid) => {
      for (let y = 0; y < ROWS; y++) {
        solid[y]![8] = 1;
        solid[y]![11] = 1;
      }
    });
    for (const room of [prep.rooms[1]!]) {
      for (let row = 0; row < ROWS; row++) {
        for (const col of [9, 10]) {
          room.attributes[row]![col] = LIFT_ATTR;
          room.solid[row]![col] = 0;
        }
      }
    }
    return prep;
  }

  it("sets dd22=1 and raises game-Y by 2/tick; $64 is not overlay-solid or walk-solid", () => {
    const prep = liftShaft();
    const world = createWorld(prep, 1);
    const blob = spawnBlob(prep, 1, world);
    blob.x = 72;
    blob.y = gameYToPlay(81);
    blob.fallIndex = 0;
    const sample = attrAt(prep, 1, 10, 8, world);
    assert.equal(sample, LIFT_ATTR);
    assert.equal(isSolid(sample), false);
    assert.equal(blocksBlob(sample), false);
    assert.equal(prep.rooms[1]!.solid[8]![10], 0);

    const none = idleInput();
    tick(prep, blob, none, world);
    assert.equal(world.dd22, DD22_LIFT);
    assert.equal(playYToGame(blob.y), 81 + LIFT_PX);
    for (let i = 0; i < 6; i++) {
      const y0 = playYToGame(blob.y);
      tick(prep, blob, none, world);
      assert.equal(world.dd22, DD22_LIFT, `tick ${i + 1} dropped the lift flag`);
      assert.equal(playYToGame(blob.y), y0 + LIFT_PX);
      assert.equal(blob.x, 72);
    }
  });

  /**
   * Room 249: $04 walls with a 2-row $44 opening (walkable). $D2F0 tests
   * 3 attr rows when (Y+1)∧7 ≠ 0, so the $04 row below still holds $DD22.
   * Idle ride continues through the exit; Left/Right on the opening walks off.
   */
  it("rides through a $44 side-exit unless Left/Right is held ($D2F0 3 rows)", () => {
    const prep = grid((solid) => {
      for (let y = 0; y < ROWS; y++) {
        solid[y]![12] = 1;
        solid[y]![15] = 1;
      }
    });
    const room = prep.rooms[1]!;
    for (let y = 0; y < ROWS; y++) {
      room.attributes[y]![12] = 0x04;
      room.attributes[y]![15] = 0x04;
      room.attributes[y]![13] = LIFT_ATTR;
      room.attributes[y]![14] = LIFT_ATTR;
      room.solid[y]![13] = 0;
      room.solid[y]![14] = 0;
    }
    for (const y of [4, 5]) {
      room.attributes[y]![12] = 0x44;
      room.attributes[y]![15] = 0x44;
      room.solid[y]![12] = 0;
      room.solid[y]![15] = 0;
    }
    const world = createWorld(prep, 1);
    const blob = spawnBlob(prep, 1, world);
    blob.x = 104;
    blob.y = 80;
    blob.fallIndex = 0;
    const none = idleInput();
    tick(prep, blob, none, world);
    assert.equal(world.dd22, DD22_LIFT);
    for (let i = 0; i < 40 && blob.y > 24; i++) tick(prep, blob, none, world);
    assert.ok(blob.y <= 24, `idle ride should pass the $44 opening, playY=${blob.y}`);
    assert.equal(blob.x, 104);
  });

  it("does not lift when the sample cell is not $64", () => {
    const prep = grid((solid) => {
      for (let x = 0; x < COLS; x++) solid[12]![x] = 1;
    });
    const world = createWorld(prep, 1);
    const blob = spawnBlob(prep, 1, world);
    blob.x = 72;
    blob.y = gameYToPlay(81);
    blob.fallIndex = 0;
    assert.notEqual(attrAt(prep, 1, 10, 8, world), LIFT_ATTR);
    tick(prep, blob, idleInput(), world);
    assert.equal(world.dd22, DD22_WALK);
    assert.notEqual(playYToGame(blob.y), 81 + LIFT_PX);
  });

  it("walk still blocks on attr < $40", () => {
    assert.equal(blocksBlob(0x07), true);
    assert.equal(blocksBlob(0x03), true);
    assert.equal(blocksBlob(0x47), false);
    assert.equal(blocksBlob(0x64), false);
  });
});

describe("hoverpad $CEAD / $C967", () => {
  it("boards on exact XY + lastDir bit 3, copies pad Y-8, nastyCount=3, flies +2 X", () => {
    const station: Hotspot = { x: 72, y: 87 };
    const prep = withStations(
      grid(() => {
        /* air */
      }),
      1,
      [station],
    );
    const world = createWorld(prep, 1);
    const blob = spawnBlob(prep, 1, world);
    blob.x = station.x;
    blob.y = gameYToPlay(station.y);
    blob.fallIndex = 0;
    assert.equal(world.nastyCount, NASTY_COUNT_WITH_PAD);
    assert.equal(world.pad?.ptr, HOVERPAD_PTR);
    assert.equal(world.pad?.y, station.y - 8);

    tick(prep, blob, { ...idleInput(), up: true }, world);
    assert.equal(world.dd22, DD22_PAD);
    assert.equal(blob.x, station.x);
    assert.equal(playYToGame(blob.y), station.y);
    assert.equal(world.pad?.ptr, HOVERPAD_PTR);
    assert.equal(world.pad?.y, playYToGame(blob.y) - 8);
    assert.equal(world.nastyCount, NASTY_COUNT_WITH_PAD);

    const x0 = blob.x;
    tick(prep, blob, { ...idleInput(), up: true, right: true }, world);
    assert.equal(world.dd22, DD22_PAD);
    assert.equal(blob.x, x0 + 2);
    assert.equal(world.pad?.y, playYToGame(blob.y) - 8);
  });

  it("dismounts at the station when lastDir has no Up", () => {
    const station: Hotspot = { x: 72, y: 87 };
    const prep = withStations(
      grid((solid) => {
        for (let y = 0; y < ROWS; y++) {
          solid[y]![8] = 1;
          solid[y]![11] = 1;
        }
        for (let x = 0; x < COLS; x++) {
          solid[6]![x] = 1;
          solid[9]![x] = 1;
        }
      }),
      1,
      [station],
    );
    const world = createWorld(prep, 1);
    const blob = spawnBlob(prep, 1, world);
    blob.x = station.x;
    blob.y = gameYToPlay(station.y);
    tick(prep, blob, { ...idleInput(), up: true }, world);
    assert.equal(world.dd22, DD22_PAD);
    tick(prep, blob, { ...idleInput(), right: true }, world);
    assert.equal(world.dd22, DD22_WALK);
    assert.equal(blob.x, station.x);
    assert.equal(playYToGame(blob.y), station.y);
  });
});

void supportY;
