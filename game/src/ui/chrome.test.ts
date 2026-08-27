import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createWorld } from "../physics";
import { prepare } from "../render";
import type { GameData, Prepared, Room } from "../types";
import { drawChrome, drawScore, drawStatus } from "./chrome";
import { cellIndex, newScreenBuffers } from "./screen";
import { UDG_CHROME } from "./udg-chrome";

function emptyPrep(): Prepared {
  const attributes = Array.from({ length: 18 }, () => Array.from({ length: 32 }, () => 0x47));
  const solid = Array.from({ length: 18 }, () => Array.from({ length: 32 }, () => 0));
  const rooms: Room[] = Array.from({ length: 512 }, (_, id) => ({
    id,
    blocks: Array(12).fill(0),
    attributes,
    solid,
  }));
  const data: GameData = {
    rooms: { rooms },
    graphics: { graphics: [] },
    blocks: { blocks: [] },
    sprites: { graphics: [] },
    items: { items: [] },
  };
  return prepare(data);
}

describe("chrome HUD", () => {
  it("has UDG $91–$97 with nonempty cells", () => {
    for (const id of [0x91, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97]) {
      assert.ok(UDG_CHROME[id], `missing ${id}`);
      assert.ok(UDG_CHROME[id]!.cells.length > 0);
    }
  });

  it("drawChrome paints left frame at (0,1)", () => {
    const buf = newScreenBuffers();
    drawChrome(buf);
    const idx = cellIndex(0, 1);
    assert.ok(buf.data[idx * 8 + 1]! !== 0 || buf.data[idx * 8 + 2]! !== 0);
  });

  it("drawStatus writes score digits and lives", () => {
    const prep = emptyPrep();
    const world = createWorld(prep, 0);
    world.scoreDigits = [0, 0, 1, 2, 3, 4];
    world.lives = 4;
    world.energy = 0x7f;
    world.platforms = 0x20;
    world.firepower = 0x10;
    const buf = newScreenBuffers();
    drawChrome(buf);
    drawStatus(buf, world, prep);
    // score AT (2,3) first digit '0'
    assert.ok(buf.data[cellIndex(2, 3) * 8 + 1]! !== 0);
    drawScore(buf, [9, 9, 9, 9, 9, 9]);
    assert.ok(buf.data[cellIndex(2, 3) * 8 + 1]! !== 0);
  });

  it("drawStatus ATTR matches $D425 (BRIGHT from score persists)", () => {
    const prep = emptyPrep();
    const world = createWorld(prep, 0);
    world.scoreDigits = [0, 0, 2, 9, 5, 0];
    world.lives = 4;
    world.energy = 0x17;
    world.platforms = 0x30;
    world.firepower = 0x7e;
    const buf = newScreenBuffers();
    drawChrome(buf);
    drawStatus(buf, world, prep);
    // score BRIGHT+INK7, lives INK6+BRIGHT, energy blank INK2/4+BRIGHT
    assert.equal(buf.attr[cellIndex(2, 3)]!, 0x47);
    assert.equal(buf.attr[cellIndex(3, 11)]!, 0x46);
    assert.equal(buf.attr[cellIndex(1, 16)]!, 0x42);
    assert.equal(buf.attr[cellIndex(1, 17)]!, 0x44);
    assert.equal(buf.attr[cellIndex(2, 16)]!, 0x47);
    assert.equal(buf.attr[cellIndex(3, 16)]!, 0x46);
    // empty inventory strip: INK8 over chrome → bright black $40
    assert.equal(buf.attr[cellIndex(1, 21)]!, 0x40);
  });
});
