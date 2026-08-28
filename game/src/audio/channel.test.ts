import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { COLS, ROWS } from "../constants";
import { createWorld } from "../physics";
import type { Prepared, Room } from "../types";
import {
  CHAN_FIRE,
  CHAN_KILL,
  CHAN_TABLE,
  fireSoundBusy,
  requestA41B,
  requestA41C,
  tickChannel,
} from "./channel";

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

describe("$A607 channel table", () => {
  it("has 16 records of 4 bytes; fire $05 is $06,$C8,$F7,$FA", () => {
    assert.equal(CHAN_TABLE.length, 16);
    assert.deepEqual(CHAN_TABLE[CHAN_FIRE - 1], [0x06, 0xc8, 0xf7, 0xfa]);
    assert.deepEqual(CHAN_TABLE[5], [0x46, 0xc8, 0xeb, 0xfa]);
    assert.deepEqual(CHAN_TABLE[CHAN_KILL - 1], [0x04, 0x3b, 0x05, 0x21]);
  });
});

describe("$A57B tick", () => {
  it("A41B fire loads live bytes and plays the same frame (count=1)", () => {
    const world = createWorld(emptyPrep(), 1);
    world.dac.dac0 = 8;
    requestA41B(world, CHAN_FIRE);
    assert.equal(world.chan.req0, CHAN_FIRE);
    tickChannel(world);
    assert.equal(world.chan.req0, 0);
    assert.equal(world.chan.dur, 5);
    assert.equal(world.chan.pitch, (0xc8 + 0xf7) & 0xff);
    assert.equal(world.chan.delta, 0xf7);
    assert.equal(world.buzz.length, 1);
    assert.ok(world.buzz[0]!.length > 0);
  });

  it("A41C waits until duration is 0; A41B interrupts", () => {
    const world = createWorld(emptyPrep(), 1);
    world.dac.dac0 = 8;
    requestA41B(world, CHAN_FIRE);
    tickChannel(world);
    requestA41C(world, 1);
    tickChannel(world);
    assert.equal(world.chan.req1, 1, "spawn stays queued while fire plays");
    assert.equal(world.chan.delta, 0xf7);
    while (world.chan.dur !== 0) tickChannel(world);
    tickChannel(world);
    assert.equal(world.chan.req1, 0);
    assert.equal(world.chan.delta, 0x03, "spawn record $0A,$0C,$03,$64");
  });

  it("fireSoundBusy is true while fire delta $F7 is live", () => {
    const world = createWorld(emptyPrep(), 1);
    world.dac.dac0 = 8;
    assert.equal(fireSoundBusy(world), false);
    requestA41B(world, CHAN_FIRE);
    tickChannel(world);
    assert.equal(fireSoundBusy(world), true);
  });

  it("idle + dac0<$04 queues ambient $0C..$0F on A41C", () => {
    const world = createWorld(emptyPrep(), 1);
    world.dac.dac0 = 0x0002;
    tickChannel(world);
    assert.ok(world.chan.req1 >= 0x0c && world.chan.req1 <= 0x0f);
    tickChannel(world);
    assert.equal(world.chan.req1, 0);
    tickChannel(world);
    assert.ok(world.buzz.length >= 1, "ambient $42 has rate 2, plays on the second live tick");
  });

  it("dac0>=$04 does not invent ambient", () => {
    const world = createWorld(emptyPrep(), 1);
    world.dac.dac0 = 0x0004;
    tickChannel(world);
    assert.equal(world.chan.req1, 0);
    assert.equal(world.buzz.length, 0);
  });
});
