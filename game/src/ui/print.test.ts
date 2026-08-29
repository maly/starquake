import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FONT_ADD4 } from "./font-data";
import { atInkString, newPrintState, plotChar, printMessage } from "./print";
import { cellIndex, newScreenBuffers } from "./screen";

describe("print $D3C1", () => {
  it("plots glyph bytes from FONT_ADD4 at AT position", () => {
    const buf = newScreenBuffers();
    const st = newPrintState();
    st.row = 2;
    st.col = 3;
    st.ink = 7;
    st.bright = 1;
    plotChar(buf, st, 0x30); // '0'
    const idx = cellIndex(2, 3);
    const glyph = FONT_ADD4.subarray(0, 8); // space is first; digit 0 is at ($30-$20)*8
    const zero = FONT_ADD4.subarray((0x30 - 0x20) * 8, (0x30 - 0x20) * 8 + 8);
    assert.deepEqual([...buf.data.subarray(idx * 8, idx * 8 + 8)], [...zero]);
    assert.equal(buf.attr[idx], 0x47); // bright + ink 7
    assert.equal(st.col, 4);
    void glyph;
  });

  it("honours AT / INK / BRIGHT / FF terminator", () => {
    const buf = newScreenBuffers();
    const st = newPrintState();
    const n = printMessage(buf, st, atInkString(3, 11, "04", { ink: 6, bright: 0 }));
    assert.ok(n > 4);
    assert.equal(st.row, 3);
    assert.equal(st.col, 13);
    assert.equal(buf.attr[cellIndex(3, 11)]! & 7, 6);
  });

  it("plots $8C mosaic as bottom-half block (PO_GR)", () => {
    const buf = newScreenBuffers();
    const st = newPrintState();
    st.row = 1;
    st.col = 0;
    printMessage(buf, st, [0x8c, 0xff]);
    assert.deepEqual([...buf.data.subarray(cellIndex(1, 0) * 8, cellIndex(1, 0) * 8 + 8)], [
      0, 0, 0, 0, 0xff, 0xff, 0xff, 0xff,
    ]);
  });

  it("INK 8 keeps existing cell ink", () => {
    const buf = newScreenBuffers();
    buf.attr[cellIndex(1, 16)] = 0x42; // bright ink 2
    const st = newPrintState();
    printMessage(buf, st, [0x16, 1, 16, 0x10, 8, 0x28, 0xff]);
    assert.equal(buf.attr[cellIndex(1, 16)]! & 7, 2);
  });
});
