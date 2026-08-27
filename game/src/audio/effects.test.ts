import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { COLS, ROWS } from "../constants";
import { createWorld } from "../physics";
import type { Prepared, Room } from "../types";
import { requestSfx, SFX_HANG, SFX_TABLE } from "./effects";
import { simulateSfx } from "./synth";

function emptyPrep(): Prepared {
  const solid = Array.from({ length: ROWS }, () => Array<number>(COLS).fill(0));
  const attributes = Array.from({ length: ROWS }, () => Array<number>(COLS).fill(0x47));
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

describe("$D839 table + requestSfx", () => {
  it("has 24 records of 5 bytes and hang at $17", () => {
    assert.equal(SFX_TABLE.length, 24);
    assert.deepEqual(SFX_TABLE[0x0c], [0x20, 0x00, 0x14, 0x00, 0x81]);
    assert.deepEqual(SFX_TABLE[0x14], [0x0a, 0x01, 0xff, 0x00, 0x01]);
    assert.deepEqual(SFX_TABLE[0x12], [0x40, 0x00, 0xff, 0x01, 0x81]);
    assert.equal(SFX_TABLE[SFX_HANG]![2], 0);
  });

  it("queues 0…23 except $17", () => {
    const world = createWorld(emptyPrep(), 1);
    requestSfx(world, 0x0c);
    requestSfx(world, 0x17);
    requestSfx(world, 24);
    requestSfx(world, -1);
    requestSfx(world, 0);
    assert.deepEqual(world.sfx, [0x0c, 0]);
  });
});

describe("$D7C0 n_out vs probe", () => {
  it("matches emu n_out for $0C / $14 / $12", () => {
    assert.equal(simulateSfx(0x0c).nOut, 46);
    assert.equal(simulateSfx(0x14).nOut, 10);
    assert.equal(simulateSfx(0x12).nOut, 65);
  });

  it("does not hang on $17 and yields no PCM", () => {
    const sim = simulateSfx(0x17);
    assert.equal(sim.nOut, 0);
    assert.equal(sim.pcm.length, 0);
  });

  it("sweep L=1 index $00 has 904 OUT", () => {
    assert.equal(simulateSfx(0x00).nOut, 904);
  });
});
