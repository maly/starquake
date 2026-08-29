import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { COLS, ROWS } from "./constants";
import { createWorld } from "./physics";
import { composeEndResult, formatScore } from "./score";
import type { Prepared, Room } from "./types";

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

describe("$64A0 end score", () => {
  it("adds +1000 then scrambles D416..D418; ones is 0 or 5", () => {
    const world = createWorld(emptyPrep(), 0);
    world.scoreDigits = [0, 0, 0, 0, 0, 1];
    world.visitedCount = 0;
    const er = composeEndResult(world, false);
    assert.equal(formatScore(er.scoreDigits).slice(0, 3), "001");
    assert.ok(er.scoreDigits[5] === 0 || er.scoreDigits[5] === 5, `ones=${er.scoreDigits[5]}`);
    assert.notEqual(formatScore(er.scoreDigits), "001001");
  });

  it("opens Spectrum end UI: stats on life-out, cores text on victory", () => {
    const over = createWorld(emptyPrep(), 0);
    composeEndResult(over, false);
    assert.equal(over.ui.kind, "end");
    if (over.ui.kind !== "end") throw new Error("expected end ui");
    assert.equal(over.ui.phase, "stats");

    const win = createWorld(emptyPrep(), 0);
    composeEndResult(win, true, "THE CORES COMPLETE");
    assert.equal(win.ui.kind, "end");
    if (win.ui.kind !== "end") throw new Error("expected end ui");
    assert.equal(win.ui.phase, "cores");
  });
});
