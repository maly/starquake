import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { clampRoom, isSolid, moveRoom, roomCol, roomRow } from "./render";

describe("map grid", () => {
  it("stays on a 16×32 rectangle", () => {
    assert.equal(moveRoom(0, -1, 0), 0);
    assert.equal(moveRoom(0, 0, -1), 0);
    assert.equal(moveRoom(15, 1, 0), 15);
    assert.equal(moveRoom(496, 0, 1), 496);
    assert.equal(moveRoom(511, 1, 0), 511);
    assert.equal(moveRoom(0, 1, 0), 1);
    assert.equal(moveRoom(0, 0, 1), 16);
    assert.equal(moveRoom(15, 0, 1), 31);
    assert.equal(roomCol(16), 0);
    assert.equal(roomRow(16), 1);
    assert.equal(clampRoom(-1), 0);
    assert.equal(clampRoom(600), 511);
  });
});

describe("isSolid", () => {
  it("uses bit 6 except $64", () => {
    assert.equal(isSolid(0x47), true);
    assert.equal(isSolid(0x07), false);
    assert.equal(isSolid(0x64), false);
  });
});
