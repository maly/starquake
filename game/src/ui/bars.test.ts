import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { barGlyphs, barPartialWidth, clampStat } from "./bars";

describe("stat bars $D463", () => {
  it("clamps above $7F", () => {
    assert.equal(clampStat(0x80), 0x7f);
    assert.equal(clampStat(0xff), 0x7f);
    assert.equal(clampStat(0x30), 0x30);
  });

  it("encodes empty / partial / full / max", () => {
    assert.deepEqual(barGlyphs(0x00), [0x20, 0x20, 0x20, 0x20]);
    assert.deepEqual(barGlyphs(0x04), [0x21, 0x20, 0x20, 0x20]);
    assert.deepEqual(barGlyphs(0x1f), [0x27, 0x20, 0x20, 0x20]);
    assert.deepEqual(barGlyphs(0x20), [0x28, 0x20, 0x20, 0x20]);
    assert.deepEqual(barGlyphs(0x3f), [0x28, 0x27, 0x20, 0x20]);
    assert.deepEqual(barGlyphs(0x7e), [0x28, 0x28, 0x28, 0x27]);
    assert.deepEqual(barGlyphs(0x7f), [0x28, 0x28, 0x28, 0x28]);
    assert.deepEqual(barGlyphs(0xff), [0x28, 0x28, 0x28, 0x28]);
  });

  it("reports partial pixel widths", () => {
    assert.equal(barPartialWidth(0x20), 0);
    assert.equal(barPartialWidth(0x21), 1);
    assert.equal(barPartialWidth(0x27), 7);
    assert.equal(barPartialWidth(0x28), 8);
  });
});
