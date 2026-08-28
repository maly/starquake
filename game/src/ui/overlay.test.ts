import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { COLS, DOOR_KEY_SPRITE, DOOR_MSG_BAD, DOOR_MSG_OK, ROWS, TELEPORT_MSG_OK, TELEPORT_TABLE } from "../constants";
import { createWorld } from "../physics";
import type { Graphic, Prepared, Room } from "../types";
import {
  beginCheopsUi,
  beginDoorUi,
  beginTeleportUi,
  drawCheopsOverlay,
  drawUiOverlay,
  feedCheopsKey,
  feedTeleportKey,
  finishTeleportInput,
  mapTeleportKey,
  tickCheopsUi,
  tickDoorUi,
  tickTeleportUi,
  typeTeleportCode,
} from "./overlay";
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

  function driveCheops(ui: ReturnType<typeof beginCheopsUi>, world: ReturnType<typeof createWorld>, phase: string): void {
    for (let i = 0; i < 400; i++) {
      if (ui.phase === phase) return;
      tickCheopsUi(ui, world);
    }
    assert.equal(ui.phase, phase);
  }

  it("fail key code goes intro→result→done without exchange", () => {
    const world = createWorld(emptyPrep(), 0);
    world.inventory = [];
    const ui = beginCheopsUi(world, 0);
    assert.equal(ui.ok, false);
    driveCheops(ui, world, "result");
    assert.ok(world.sfx.includes(0x0f));
    driveCheops(ui, world, "done");
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
    driveCheops(ui, world, "exchange");
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
    driveCheops(ui, world, "exchange");
    const offer1 = ui.offers[1]!;
    feedCheopsKey(ui, "ě", world, "Digit2");
    assert.equal(ui.phase, "done");
    assert.equal(world.inventory[ui.slot]?.sprite, offer1);
  });
});

function markGraphic(id: number, marker: number): Graphic {
  return {
    id,
    ptr: 0,
    cols: 1,
    rows: 1,
    cells: [{ row: 0, col: 0, data: [marker, 0, 0, 0, 0, 0, 0, 0], attr: 7 }],
  };
}

function prepWithMarks(): Prepared {
  const prep = emptyPrep();
  prep.graphics[0x24] = markGraphic(0x24, 0xa1);
  prep.graphics[0x25] = markGraphic(0x25, 0xa2);
  prep.graphics[0x26] = markGraphic(0x26, 0xa3);
  for (let id = 0x09; id <= 0x0d; id++) {
    prep.sprites[id] = markGraphic(id, 0xb0 + id);
  }
  return prep;
}

describe("door/teleport overlay icons $EA65 + digit roll $D78B", () => {
  it("door intro copies UDG $25@$0A0C and $26@$0A10; digits wait for $D5FD", () => {
    const prep = prepWithMarks();
    const world = createWorld(prep, 0);
    const ui = beginDoorUi(world, 0, true);
    const buf = newScreenBuffers();
    drawUiOverlay(buf, ui, prep);
    assert.equal(buf.data[cellIndex(10, 12) * 8]!, 0xa2);
    assert.equal(buf.data[cellIndex(10, 16) * 8]!, 0xa3);
    assert.equal(buf.data[cellIndex(17, 11) * 8]!, 0);
  });

  it("teleport prompt copies UDG $24@$0917", () => {
    const prep = prepWithMarks();
    const ui = beginTeleportUi(343);
    const buf = newScreenBuffers();
    drawUiOverlay(buf, ui, prep);
    assert.equal(buf.data[cellIndex(9, 23) * 8]!, 0xa1);
  });

  it("$D5FD intro is 15 HALTs then roll draws $D78B digits at $110B stride 4", () => {
    const prep = prepWithMarks();
    const world = createWorld(prep, 0);
    const ui = beginDoorUi(world, 0, true);
    for (let i = 0; i < 14; i++) tickDoorUi(ui, world);
    assert.equal(ui.phase, "intro");
    tickDoorUi(ui, world);
    assert.equal(ui.phase, "roll");
    const buf = newScreenBuffers();
    drawUiOverlay(buf, ui, prep);
    const d0 = ui.digits[0]!;
    assert.equal(buf.data[cellIndex(17, 11) * 8]!, 0xb0 + d0);
    assert.equal(buf.data[cellIndex(17, 15) * 8]!, 0xb0 + ui.digits[1]!);
    assert.equal(buf.data[cellIndex(17, 19) * 8]!, 0xb0 + ui.digits[2]!);
  });

  it("Cheops $D5FD draws two sprites at $0F0D", () => {
    const prep = prepWithMarks();
    const world = createWorld(prep, 0);
    world.inventory = [{ sprite: DOOR_KEY_SPRITE, attr: 3 }];
    const ui = beginCheopsUi(world, 0);
    for (let i = 0; i < 15; i++) tickCheopsUi(ui, world);
    assert.equal(ui.phase, "roll");
    const buf = newScreenBuffers();
    drawCheopsOverlay(buf, ui, prep);
    assert.equal(buf.data[cellIndex(15, 13) * 8]!, 0xb0 + ui.digits[0]!);
    assert.equal(buf.data[cellIndex(15, 17) * 8]!, 0xb0 + ui.digits[1]!);
  });

  it("each roll tick queues $D679 SFX ($DAC1∧3)+$0C", () => {
    const prep = prepWithMarks();
    const world = createWorld(prep, 0);
    const ui = beginDoorUi(world, 0, true);
    world.sfx.length = 0;
    for (let i = 0; i < 15; i++) tickDoorUi(ui, world);
    world.sfx.length = 0;
    tickDoorUi(ui, world);
    assert.equal(ui.phase, "roll");
    assert.equal(world.sfx.length, 1);
    const a = world.sfx[0]!;
    assert.ok(a >= 0x0c && a <= 0x0f, `sfx=${a}`);
  });

  it("matched digit queues $D70E $03 after $19 roll frames", () => {
    const prep = prepWithMarks();
    const world = createWorld(prep, 0);
    world.inventory = [{ sprite: DOOR_KEY_SPRITE, attr: 3 }];
    const ui = beginDoorUi(world, 0, true);
    for (let i = 0; i < 15 + 24; i++) tickDoorUi(ui, world);
    assert.equal(ui.phase, "roll");
    world.sfx.length = 0;
    tickDoorUi(ui, world);
    assert.equal(ui.phase, "match");
    assert.ok(world.sfx.includes(0x03), JSON.stringify(world.sfx));
  });
});
