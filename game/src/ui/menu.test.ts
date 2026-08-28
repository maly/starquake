import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { COLS, ROWS } from "../constants";
import { createWorld } from "../physics";
import type { Prepared, Room } from "../types";
import { FONT_ADD4, FONT_FIRST } from "./font-data";
import { beginMenuUi, drawMenuOverlay, feedMenuKey } from "./menu";
import { cellIndex, newScreenBuffers } from "./screen";

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

function glyph(code: number): number[] {
  const i = (code - FONT_FIRST) * 8;
  return [...FONT_ADD4.subarray(i, i + 8)];
}

describe("title/menu $5E81", () => {
  it("prints STARQUAKE at AT 3,7 with $90 separators ($5EAA)", () => {
    const buf = newScreenBuffers();
    const ui = beginMenuUi();
    drawMenuOverlay(buf, ui, emptyPrep());
    assert.deepEqual([...buf.data.subarray(cellIndex(3, 7) * 8, cellIndex(3, 7) * 8 + 8)], glyph(0x53));
    assert.deepEqual([...buf.data.subarray(cellIndex(3, 8) * 8, cellIndex(3, 8) * 8 + 8)], [0, 0, 0, 0x18, 0x18, 0, 0, 0]);
    assert.deepEqual([...buf.data.subarray(cellIndex(3, 9) * 8, cellIndex(3, 9) * 8 + 8)], glyph(0x54));
  });

  it("prints control lines and 0.START GAME / Q.QUIT", () => {
    const buf = newScreenBuffers();
    drawMenuOverlay(buf, beginMenuUi(), emptyPrep());
    assert.deepEqual([...buf.data.subarray(cellIndex(6, 4) * 8, cellIndex(6, 4) * 8 + 8)], glyph(0x31));
    assert.deepEqual([...buf.data.subarray(cellIndex(18, 4) * 8, cellIndex(18, 4) * 8 + 8)], glyph(0x30));
    assert.deepEqual([...buf.data.subarray(cellIndex(20, 4) * 8, cellIndex(20, 4) * 8 + 8)], glyph(0x51));
  });

  it("highlights default $5E58=4 with INK 7; others INK 3", () => {
    const buf = newScreenBuffers();
    drawMenuOverlay(buf, beginMenuUi(), emptyPrep());
    assert.equal(buf.attr[cellIndex(6, 4)]! & 7, 3);
    assert.equal(buf.attr[cellIndex(8, 4)]! & 7, 3);
    assert.equal(buf.attr[cellIndex(10, 4)]! & 7, 3);
    assert.equal(buf.attr[cellIndex(12, 4)]! & 7, 7);
    assert.equal(buf.attr[cellIndex(14, 4)]! & 7, 3);
  });

  it("0 goes to $666D intro; next key starts; 6 stays", () => {
    const ui = beginMenuUi();
    assert.equal(feedMenuKey(ui, "6"), "stay");
    assert.equal(ui.phase, "options");
    assert.equal(feedMenuKey(ui, "0"), "stay");
    assert.equal(ui.phase, "intro");
    assert.equal(feedMenuKey(ui, " "), "start");
  });

  it("Digit0–6 work when ev.key is Czech QWERTZ (+ěščřžý)", () => {
    const world = createWorld(emptyPrep(), 0);
    const ui = beginMenuUi();
    assert.equal(feedMenuKey(ui, "ě", world, "Digit2"), "stay");
    assert.equal(ui.control, 2);
    assert.deepEqual(world.sfx, [0x0c]);
    const start = beginMenuUi();
    assert.equal(feedMenuKey(start, "+", undefined, "Digit0"), "stay");
    assert.equal(start.phase, "intro");
    assert.equal(feedMenuKey(start, "ý", undefined, "Numpad0"), "start");
  });

  it("intro prints FLIGHT COMPUTER REPORT at AT 4,5", () => {
    const buf = newScreenBuffers();
    const ui = beginMenuUi();
    feedMenuKey(ui, "0");
    drawMenuOverlay(buf, ui, emptyPrep());
    assert.deepEqual([...buf.data.subarray(cellIndex(4, 5) * 8, cellIndex(4, 5) * 8 + 8)], glyph(0x46));
  });

  it("1–5 selects control and queues $0C; same option is silent", () => {
    const world = createWorld(emptyPrep(), 0);
    const ui = beginMenuUi();
    assert.equal(ui.control, 4);
    assert.equal(feedMenuKey(ui, "2", world), "stay");
    assert.equal(ui.control, 2);
    assert.deepEqual(world.sfx, [0x0c]);
    world.sfx.length = 0;
    feedMenuKey(ui, "2", world);
    assert.deepEqual(world.sfx, []);
  });

  it("Q then N returns to options; Q then Y shows goodbye", () => {
    const buf = newScreenBuffers();
    const ui = beginMenuUi();
    assert.equal(feedMenuKey(ui, "q"), "stay");
    assert.equal(ui.phase, "quit");
    drawMenuOverlay(buf, ui, emptyPrep());
    assert.deepEqual([...buf.data.subarray(cellIndex(4, 9) * 8, cellIndex(4, 9) * 8 + 8)], glyph(0x51));
    assert.equal(feedMenuKey(ui, "n"), "stay");
    assert.equal(ui.phase, "options");
    feedMenuKey(ui, "Q");
    assert.equal(feedMenuKey(ui, "Y"), "stay");
    assert.equal(ui.phase, "goodbye");
    drawMenuOverlay(buf, ui, emptyPrep());
    assert.deepEqual([...buf.data.subarray(cellIndex(19, 6) * 8, cellIndex(19, 6) * 8 + 8)], glyph(0x53));
  });
});
