import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { COLS, MENU_BAR_H, ROWS } from "../constants";
import { createWorld } from "../physics";
import type { Graphic, Prepared, Room } from "../types";
import { FONT_ADD4, FONT_FIRST } from "./font-data";
import {
  beginMenuUi,
  beginPauseUi,
  beginSplashUi,
  drawMenuOverlay,
  drawPauseOverlay,
  feedMenuKey,
  feedMenuRelease,
  feedPauseKey,
} from "./menu";
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
    assert.equal(buf.attr[cellIndex(6, 4)]! & 7, 1);
    assert.equal(buf.attr[cellIndex(8, 4)]! & 7, 3);
    assert.equal(buf.attr[cellIndex(10, 4)]! & 7, 3);
    assert.equal(buf.attr[cellIndex(12, 4)]! & 7, 7);
    assert.equal(buf.attr[cellIndex(14, 4)]! & 7, 3);
  });

  it("0 goes to $666D intro; next key starts", () => {
    const ui = beginMenuUi();
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

  it("2–5 selects control and queues $0C; 1 Kempston is a no-op; same option is silent", () => {
    const world = createWorld(emptyPrep(), 0);
    const ui = beginMenuUi();
    assert.equal(ui.control, 4);
    assert.equal(feedMenuKey(ui, "1", world), "stay");
    assert.equal(ui.control, 4);
    assert.deepEqual(world.sfx, []);
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

  it("splash prints CLICK OR PRESS A KEY; key or click goes to options", () => {
    const buf = newScreenBuffers();
    const ui = beginSplashUi();
    assert.equal(ui.phase, "splash");
    drawMenuOverlay(buf, ui, emptyPrep());
    assert.deepEqual([...buf.data.subarray(cellIndex(16, 6) * 8, cellIndex(16, 6) * 8 + 8)], glyph(0x43));
    assert.equal(feedMenuKey(ui, "Shift"), "stay");
    assert.equal(ui.phase, "splash");
    assert.equal(feedMenuKey(ui, " "), "stay");
    assert.equal(ui.phase, "options");
    const click = beginSplashUi();
    assert.equal(feedMenuKey(click, "click"), "stay");
    assert.equal(click.phase, "options");
  });

  it("Kempston line is ink 1 (greyed)", () => {
    const buf = newScreenBuffers();
    drawMenuOverlay(buf, beginMenuUi(), emptyPrep());
    assert.equal(buf.attr[cellIndex(6, 4)]! & 7, 1);
  });

  it("6 opens $6194; six grid keys set UDK and control 5", () => {
    const world = createWorld(emptyPrep(), 0);
    const ui = beginMenuUi();
    assert.equal(feedMenuKey(ui, "6", world), "stay");
    assert.equal(ui.phase, "define");
    const buf = newScreenBuffers();
    drawMenuOverlay(buf, ui, emptyPrep());
    assert.deepEqual([...buf.data.subarray(cellIndex(14, 0) * 8, cellIndex(14, 0) * 8 + 8)], glyph(0x48));
    assert.deepEqual([...buf.data.subarray(cellIndex(17, 5) * 8, cellIndex(17, 5) * 8 + 8)], glyph(0x4c));
    feedMenuRelease(ui);
    const seq = ["O", "P", "A", "Q", "M", "*"];
    for (const k of seq) {
      assert.equal(feedMenuKey(ui, k, world), "stay");
      feedMenuRelease(ui);
    }
    assert.equal(ui.phase, "options");
    assert.equal(ui.control, 5);
    assert.deepEqual(ui.udk, seq);
    assert.ok(world.sfx.includes(0x01));
  });

  it("$6131 staggers rows (E=0,1,2,0) and prints $8C under each key", () => {
    const ui = beginMenuUi();
    feedMenuKey(ui, "6");
    const buf = newScreenBuffers();
    drawMenuOverlay(buf, ui, emptyPrep());
    assert.deepEqual([...buf.data.subarray(cellIndex(0, 0) * 8, cellIndex(0, 0) * 8 + 8)], glyph(0x31));
    assert.deepEqual([...buf.data.subarray(cellIndex(3, 1) * 8, cellIndex(3, 1) * 8 + 8)], glyph(0x51));
    assert.deepEqual(
      [...buf.data.subarray(cellIndex(1, 0) * 8, cellIndex(1, 0) * 8 + 8)],
      [0, 0, 0, 0, 0xff, 0xff, 0xff, 0xff],
    );
  });

  it("assigned LEFT key shows font arrow $3B (UDG $90 at $AEAC), not a fake mark", () => {
    const ui = beginMenuUi();
    feedMenuKey(ui, "6");
    feedMenuRelease(ui);
    feedMenuKey(ui, "O");
    const buf = newScreenBuffers();
    drawMenuOverlay(buf, ui, emptyPrep());
    // QWERTYUIOP: O is col 8, row 1 stagger E=1 → AT 3,25
    assert.deepEqual([...buf.data.subarray(cellIndex(3, 25) * 8, cellIndex(3, 25) * 8 + 8)], glyph(0x3b));
  });

  it("accepts Space as a bindable key (spacebar slot)", () => {
    const ui = beginMenuUi();
    feedMenuKey(ui, "6");
    feedMenuRelease(ui);
    assert.equal(feedMenuKey(ui, " ", undefined, "Space"), "stay");
    assert.equal(ui.defineStep, 1);
    assert.equal(ui.udk[0], " ");
    const buf = newScreenBuffers();
    drawMenuOverlay(buf, ui, emptyPrep());
    assert.deepEqual([...buf.data.subarray(cellIndex(12, 11) * 8, cellIndex(12, 11) * 8 + 8)], glyph(0x3b));
  });

  it("$6615 banner $8A $76 becomes bright cyan via $EA63=$05, not yellow", () => {
    const buf = newScreenBuffers();
    const prep = emptyPrep();
    const bar: Graphic = {
      id: MENU_BAR_H,
      ptr: 0,
      cols: 1,
      rows: 1,
      cells: [{ row: 0, col: 0, data: [0xff, 0, 0, 0, 0, 0, 0, 0], attr: 0x76 }],
    };
    prep.graphics[MENU_BAR_H] = bar;
    drawMenuOverlay(buf, beginMenuUi(), prep);
    assert.equal(buf.attr[cellIndex(0, 2)], 0x45);
  });

  it("$6233 ignores keys off the grid and duplicates", () => {
    const ui = beginMenuUi();
    feedMenuKey(ui, "6");
    feedMenuRelease(ui);
    feedMenuKey(ui, "ArrowLeft");
    assert.equal(ui.defineStep, 0);
    feedMenuKey(ui, "O");
    feedMenuRelease(ui);
    assert.equal(ui.defineStep, 1);
    feedMenuKey(ui, "O");
    assert.equal(ui.defineStep, 1);
    assert.equal(ui.phase, "define");
  });
});

describe("ESC pause menu", () => {
  it("prints 1.END GAME / 2.SAVE GAME / 3.LOAD GAME", () => {
    const buf = newScreenBuffers();
    const ui = beginPauseUi();
    drawPauseOverlay(buf, ui, emptyPrep());
    assert.deepEqual([...buf.data.subarray(cellIndex(8, 4) * 8, cellIndex(8, 4) * 8 + 8)], glyph(0x31));
    assert.deepEqual([...buf.data.subarray(cellIndex(10, 4) * 8, cellIndex(10, 4) * 8 + 8)], glyph(0x32));
    assert.deepEqual([...buf.data.subarray(cellIndex(12, 4) * 8, cellIndex(12, 4) * 8 + 8)], glyph(0x33));
  });

  it("1 ends, 2 saves, 3 loads, ESC or click resumes", () => {
    const ui = beginPauseUi();
    assert.equal(feedPauseKey(ui, "Escape"), "resume");
    assert.equal(feedPauseKey(beginPauseUi(), "click"), "resume");
    assert.equal(feedPauseKey(beginPauseUi(), "1"), "end");
    assert.equal(feedPauseKey(beginPauseUi(), "2"), "save");
    assert.equal(feedPauseKey(beginPauseUi(), "3"), "load");
  });

  it("prints GAME SAVED with the game font", () => {
    const buf = newScreenBuffers();
    const ui = beginPauseUi();
    ui.status = "GAME SAVED";
    drawPauseOverlay(buf, ui, emptyPrep());
    assert.deepEqual([...buf.data.subarray(cellIndex(20, 4) * 8, cellIndex(20, 4) * 8 + 8)], glyph(0x47));
  });
});
