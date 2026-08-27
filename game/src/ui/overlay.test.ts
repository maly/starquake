import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { COLS, ROWS, TELEPORT_MSG_OK, TELEPORT_TABLE } from "../constants";
import { createWorld } from "../physics";
import type { Prepared, Room } from "../types";
import {
  beginTeleportUi,
  feedTeleportKey,
  finishTeleportInput,
  mapTeleportKey,
  tickTeleportUi,
  typeTeleportCode,
} from "./overlay";

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

describe("teleport input FSM ($CF8E / $D5C8)", () => {
  it("maps letters and digits; ignores Enter/Caps equivalents", () => {
    assert.equal(mapTeleportKey("a"), "A");
    assert.equal(mapTeleportKey("5"), "5");
    assert.equal(mapTeleportKey(" "), " ");
    assert.equal(mapTeleportKey("Enter"), null);
    assert.equal(mapTeleportKey("Shift"), null);
  });

  it("requires key release between characters (no prompt)", () => {
    const ui = beginTeleportUi(343);
    ui.phase = "input";
    ui.waitingRelease = false;
    feedTeleportKey(ui, "E", true);
    assert.equal(ui.buffer, "E");
    feedTeleportKey(ui, "X", true); // still held gate
    assert.equal(ui.buffer, "E");
    feedTeleportKey(ui, "E", false);
    feedTeleportKey(ui, "X", true);
    assert.equal(ui.buffer, "EX");
  });

  it("queues $11 when a character is accepted", () => {
    const world = createWorld(emptyPrep(), 1);
    const ui = beginTeleportUi(343, world);
    assert.ok(world.sfx.includes(0x07));
    world.sfx.length = 0;
    ui.phase = "input";
    ui.waitingRelease = false;
    feedTeleportKey(ui, "E", true, world);
    assert.equal(ui.buffer, "E");
    assert.deepEqual(world.sfx, [0x11]);
  });

  it("accepts exactly 5 chars then evaluates against TELEPORT_TABLE", () => {
    const [name] = TELEPORT_TABLE[7]!; // EXIAL → 343
    const ui = beginTeleportUi(40);
    typeTeleportCode(ui, name);
    assert.equal(ui.buffer, name);
    finishTeleportInput(ui, 40);
    assert.equal(ui.ok, true);
    assert.equal(ui.dest, 343);
    assert.equal(ui.phase, "result");
  });

  it("rejects unknown 5-letter codes", () => {
    const ui = beginTeleportUi(343);
    typeTeleportCode(ui, "NOPEE");
    finishTeleportInput(ui, 343);
    assert.equal(ui.ok, false);
    assert.equal(ui.dest, 343);
  });

  it("tickTeleportUi completes after result delay", () => {
    const ui = beginTeleportUi(40);
    typeTeleportCode(ui, "EXIAL");
    assert.equal(tickTeleportUi(ui, 40), false);
    assert.equal(ui.phase, "result");
    for (let i = 0; i < 40; i++) tickTeleportUi(ui, 40);
    assert.equal(ui.phase, "done");
    void TELEPORT_MSG_OK;
  });
});
