import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { COLS, DOOR_KEY_SPRITE, DOOR_MSG_BAD, DOOR_MSG_OK, ROWS, TELEPORT_MSG_OK, TELEPORT_TABLE } from "../constants";
import { createWorld } from "../physics";
import type { Prepared, Room } from "../types";
import {
  beginCheopsUi,
  beginTeleportUi,
  feedCheopsKey,
  feedTeleportKey,
  finishTeleportInput,
  mapTeleportKey,
  tickCheopsUi,
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

describe("Cheops UI $CCF1", () => {
  it("beginCheopsUi queues $0B and starts intro", () => {
    const world = createWorld(emptyPrep(), 0);
    world.inventory = [{ sprite: DOOR_KEY_SPRITE, attr: 3 }];
    const ui = beginCheopsUi(world, 0);
    assert.equal(ui.kind, "cheops");
    assert.equal(ui.phase, "intro");
    assert.equal(ui.ok, true);
    assert.deepEqual(ui.digits, [0x0b, 0x0a]);
    assert.ok(world.sfx.includes(0x0b));
  });

  it("fail key code goes intro→result→done without exchange", () => {
    const world = createWorld(emptyPrep(), 0);
    world.inventory = [];
    const ui = beginCheopsUi(world, 0);
    assert.equal(ui.ok, false);
    for (let i = 0; i < 25; i++) tickCheopsUi(ui, world);
    assert.equal(ui.phase, "result");
    assert.ok(world.sfx.includes(0x0f));
    for (let i = 0; i < 40; i++) tickCheopsUi(ui, world);
    assert.equal(ui.phase, "done");
    void DOOR_MSG_BAD;
  });

  it("ok key code then 1–5 swaps inventory and queues $10", () => {
    const world = createWorld(emptyPrep(), 0);
    world.inventory = [
      { sprite: DOOR_KEY_SPRITE, attr: 3 },
      { sprite: 0x1a, attr: 4 },
    ];
    world.d2de = [0x80, 0x8b, 0x89, 0x8a, 0x84, 0x85, 0xa1, 0x8c, 0x88];
    const ui = beginCheopsUi(world, 0);
    for (let i = 0; i < 65; i++) tickCheopsUi(ui, world);
    assert.equal(ui.phase, "exchange");
    assert.equal(ui.offers.length, 5);
    assert.equal(ui.offers[4], 0x1a);
    world.sfx.length = 0;
    feedCheopsKey(ui, "1", world);
    assert.equal(ui.phase, "done");
    assert.equal(world.inventory[ui.slot]?.sprite, ui.offers[0]);
    assert.deepEqual(world.sfx, [0x10]);
    void DOOR_MSG_OK;
  });

  it("accepts Digit1–5 even when ev.key is Czech (+ěščř), not only Numpad", () => {
    const world = createWorld(emptyPrep(), 0);
    world.inventory = [
      { sprite: DOOR_KEY_SPRITE, attr: 3 },
      { sprite: 0x1a, attr: 4 },
    ];
    world.d2de = [0x80, 0x8b, 0x89, 0x8a, 0x84, 0x85, 0xa1, 0x8c, 0x88];
    const ui = beginCheopsUi(world, 0);
    for (let i = 0; i < 65; i++) tickCheopsUi(ui, world);
    const offer1 = ui.offers[1]!;
    feedCheopsKey(ui, "ě", world, "Digit2");
    assert.equal(ui.phase, "done");
    assert.equal(world.inventory[ui.slot]?.sprite, offer1);
  });
});
