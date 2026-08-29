import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { COLS, ROWS } from "./constants";
import { createWorld, spawnBlob } from "./physics";
import { decodeSave, encodeSave } from "./persist";
import type { Prepared, Room } from "./types";

function emptyPrep(): Prepared {
  const solid = Array.from({ length: ROWS }, () => Array<number>(COLS).fill(0));
  const attributes = Array.from({ length: ROWS }, () => Array<number>(COLS).fill(0x47));
  const rooms: Room[] = Array.from({ length: 512 }, (_, id) => ({ id, blocks: [], attributes, solid }));
  const itemTable = [
    {
      index: 0,
      room: 8,
      col: 4,
      row: 5,
      placed: true,
      sprite: 0x0f,
      attr_bits: 3,
      raw: [1, 2, 3],
    },
  ];
  return {
    graphics: [],
    sprites: [],
    actorsBySet: new Map(),
    actorsByPtr: new Map(),
    blocks: [],
    rooms,
    itemsByRoom: Array.from({ length: 512 }, () => []),
    itemTable,
  };
}

describe("save slot v1", () => {
  it("round-trips blob, collected, itemTable and pulse xorInk", () => {
    const prep = emptyPrep();
    const world = createWorld(prep, 8);
    world.collected[0] = 1;
    world.energy = 17;
    world.pulses = [
      {
        col: 3,
        row: 4,
        period: 8,
        timer: 2,
        flag: 1,
        xorInk: Uint8Array.from([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]),
        sparkAttr: 0x47,
        lastAnim: 2,
      },
    ];
    const blob = spawnBlob(prep, 8, world);
    blob.x = 40;
    const raw = encodeSave({
      blob,
      world,
      itemTable: prep.itemTable!,
      control: 5,
      udk: ["O", "P", "A", "Q", "M", "Z"],
    });
    const got = decodeSave(raw);
    assert.equal(got.status, "ok");
    if (got.status !== "ok") return;
    assert.equal(got.data.v, 1);
    assert.equal(got.data.blob.x, 40);
    assert.equal(got.data.world.energy, 17);
    assert.equal(got.data.world.collected[0], 1);
    assert.ok(got.data.world.collected instanceof Uint8Array);
    assert.deepEqual([...got.data.world.pulses[0]!.xorInk], [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
    assert.equal(got.data.itemTable[0]!.sprite, 0x0f);
    assert.equal(got.data.control, 5);
    assert.deepEqual(got.data.udk, ["O", "P", "A", "Q", "M", "Z"]);
  });

  it("empty slot is NO SAVE; bad version is invalid", () => {
    assert.equal(decodeSave(null).status, "empty");
    assert.equal(decodeSave("").status, "empty");
    assert.equal(decodeSave("{").status, "invalid");
    assert.equal(decodeSave(JSON.stringify({ v: 2, blob: {}, world: {}, itemTable: [], control: 4, udk: [] })).status, "invalid");
  });
});
