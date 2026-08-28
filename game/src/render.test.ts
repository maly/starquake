import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SPECTRUM } from "./constants";
import {
  blitGrafix,
  blitPulses,
  clampRoom,
  grafixAnimDrawX,
  graphicForPtr,
  isSolid,
  moveRoom,
  newBuffers,
  newRgba,
  roomCol,
  roomRow,
  stampGrafix,
} from "./render";
import type { Graphic, Prepared, Pulse } from "./types";

function fullCell(): number[] {
  return [0x80, 0, 0, 0, 0, 0, 0, 0];
}

function dotGraphic(ptr: number): Graphic {
  return {
    id: 0,
    ptr,
    cols: 3,
    rows: 2,
    cells: [{ row: 0, col: 0, data: fullCell(), attr: null }],
  };
}

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

describe("GRAFIX draw", () => {
  it("cancels the +2px pre-shift stored in frames 1..3", () => {
    assert.equal(grafixAnimDrawX(72, 0), 72);
    assert.equal(grafixAnimDrawX(72, 1), 70);
    assert.equal(grafixAnimDrawX(72, 2), 68);
    assert.equal(grafixAnimDrawX(72, 3), 66);
  });

  it("stampGrafix paints ink pixels without changing cell attributes", () => {
    const buf = newBuffers();
    buf.attr.fill(0x47);
    const rgba = newRgba();
    stampGrafix(rgba, dotGraphic(0), 0, 0, 2);
    assert.equal(buf.attr[0], 0x47);
    const [r, g, b] = SPECTRUM[2]!;
    assert.equal(rgba[0], r);
    assert.equal(rgba[1], g);
    assert.equal(rgba[2], b);
    assert.equal(rgba[4], 0);
  });

  it("blitGrafix can skip the $D8B1 ink merge", () => {
    const buf = newBuffers();
    buf.attr.fill(0x47);
    blitGrafix(buf, dotGraphic(0), 0, 0, 2, { mergeInk: false });
    assert.equal(buf.attr[0], 0x47);
    assert.equal(buf.data[0] & 0x80, 0x80);
  });

  it("graphicForPtr realigns a labeled set to the $C0-indexed pointer", () => {
    const extracted = dotGraphic(0xb750);
    const prep = { actorsByPtr: new Map([[extracted.ptr, extracted]]), actorsBySet: new Map() } as unknown as Prepared;
    const aligned = graphicForPtr(prep, 0xb748);
    assert.ok(aligned);
    const origin = aligned.cells.find((c) => c.row === 0 && c.col === 0);
    const shifted = aligned.cells.find((c) => c.row === 0 && c.col === 2);
    assert.ok(origin);
    assert.ok(shifted);
    assert.equal(origin.data[0], 0);
    assert.equal(shifted.data[2] & 0x80, 0x80);
  });
});

describe("$A66C pulse $DB88", () => {
  const pulse = (flag: number, timer = 8, ink?: number[]): Pulse => ({
    col: 4,
    row: 8,
    period: 8,
    timer,
    flag,
    xorInk: Uint8Array.from(ink ?? new Array(16).fill(0)),
    sparkAttr: 0x44,
    lastAnim: null,
  });

  it("does not draw when xorInk is empty", () => {
    const buf = newBuffers();
    blitPulses(buf, [pulse(1, 8)], 0);
    assert.ok(buf.data.every((b) => b === 0));
  });

  it("XORs xorInk onto terrain cells ($DB50), twice cancels", () => {
    const buf = newBuffers();
    const playRow = 8 - 6;
    const dst = (playRow * 32 + 4) * 8;
    buf.data[dst] = 0xf0;
    const ink = [
      0x02, 0x12, 0x56, 0x5e, 0x56, 0x16, 0x16, 0x04, 0x88, 0xdc, 0xd0, 0x50, 0x8c, 0xd8, 0xd8, 0x50,
    ];
    blitPulses(buf, [pulse(1, 8, ink)], 0);
    assert.equal(buf.data[dst], 0xf0 ^ 0x02);
    assert.equal(buf.data[dst + 1], 0x12);
    assert.equal(buf.attr[playRow * 32 + 4] & 0x47, 0x44);
    blitPulses(buf, [pulse(1, 8, ink)], 0);
    assert.equal(buf.data[dst], 0xf0);
  });
});
