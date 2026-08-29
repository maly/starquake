import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { actionFromEvent, DEFAULT_BINDINGS } from "./input";

describe("in-game key bindings", () => {
  it("Escape is always pause", () => {
    assert.equal(actionFromEvent(DEFAULT_BINDINGS, "Escape"), "pause");
  });

  it("scheme 4 is OPAQM plus * pause", () => {
    const b = { ...DEFAULT_BINDINGS, control: 4 };
    assert.equal(actionFromEvent(b, "o"), "left");
    assert.equal(actionFromEvent(b, "P"), "right");
    assert.equal(actionFromEvent(b, "a"), "down");
    assert.equal(actionFromEvent(b, "q"), "up");
    assert.equal(actionFromEvent(b, "m"), "fire");
    assert.equal(actionFromEvent(b, "*"), "pause");
  });

  it("scheme 2 is arrows plus Space", () => {
    const b = { ...DEFAULT_BINDINGS, control: 2 };
    assert.equal(actionFromEvent(b, "ArrowLeft"), "left");
    assert.equal(actionFromEvent(b, "ArrowRight"), "right");
    assert.equal(actionFromEvent(b, "ArrowDown"), "down");
    assert.equal(actionFromEvent(b, "ArrowUp"), "up");
    assert.equal(actionFromEvent(b, " "), "fire");
  });

  it("scheme 3 is WASD plus Space", () => {
    const b = { ...DEFAULT_BINDINGS, control: 3 };
    assert.equal(actionFromEvent(b, "w"), "up");
    assert.equal(actionFromEvent(b, "a"), "left");
    assert.equal(actionFromEvent(b, "s"), "down");
    assert.equal(actionFromEvent(b, "d"), "right");
    assert.equal(actionFromEvent(b, " "), "fire");
  });

  it("scheme 5 uses UDK including the 6th pause key", () => {
    const b = { control: 5, udk: ["O", "P", "A", "Q", "M", "Z"] };
    assert.equal(actionFromEvent(b, "o"), "left");
    assert.equal(actionFromEvent(b, "z"), "pause");
    assert.equal(actionFromEvent(b, "w"), null);
  });

  it("scheme 5 matches a bound space", () => {
    const b = { control: 5, udk: [" ", "P", "A", "Q", "M", "Z"] };
    assert.equal(actionFromEvent(b, " "), "left");
  });
});
