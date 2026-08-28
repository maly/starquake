import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import {
  CORE_CEREMONY_FRAMES,
  CORE_D2DE_INIT,
  CORE_GUARD_XY,
  CORE_NEIGHBOR,
  CORE_ROOM,
  CORE_TOOL_SPRITE,
  CORE_VICTORY_PAIRS,
  CLEAR_ATTR,
  DOOR_KEY_SPRITE,
  DOOR_REASON,
  DOOR_SHIFT_X,
  GAME_OVER_MSG,
  GAME_Y_ORIGIN,
  SCORE_CORE_DELIVER,
  SCORE_END_BONUS,
  SCORE_FIRST_VISIT,
} from "./constants";
import { expectedDoorCode } from "./objects";
import { attrAt, blocksBlob, createWorld, enterRoom, spawnBlob, tick } from "./physics";
import { blitCorePanel, newBuffers, prepare } from "./render";
import { addScore, adventureScore, formatScore, killScorePoints } from "./score";
import { REPO_ROOT } from "./server";
import type { GameData, Prepared, World } from "./types";
import type { BlobState } from "./physics";

function loadPrep(): Prepared | null {
  const dir = path.join(REPO_ROOT, "out");
  if (!existsSync(path.join(dir, "rooms.json"))) return null;
  const read = (name: string) => JSON.parse(readFileSync(path.join(dir, name), "utf8"));
  const pack: GameData = {
    rooms: read("rooms.json"),
    graphics: read("graphics.json"),
    blocks: read("blocks.json"),
    sprites: read("sprites.json"),
    items: read("items.json"),
  };
  if (existsSync(path.join(dir, "actors.json"))) pack.actors = read("actors.json");
  if (existsSync(path.join(dir, "block_attrs.json"))) pack.blockAttrs = read("block_attrs.json");
  return prepare(pack);
}

describe("security doors $00", () => {
  it("scans room 176 hotspots and shifts X+$30 with key $0F", () => {
    const prep = loadPrep();
    if (!prep) return;
    const room = 176;
    const doors = prep.doorsByRoom?.[room] ?? [];
    assert.equal(doors.length, 2, JSON.stringify(doors));
    assert.ok(doors.some((d) => d.x === 128 && d.y === 63));
    assert.ok(doors.some((d) => d.x === 176 && d.y === 63));
    assert.deepEqual(expectedDoorCode(room), [10, 10, 12]);

    const world = createWorld(prep, room);
    const blob = spawnBlob(prep, room, world);
    const left = doors.find((d) => d.x === 128)!;
    blob.x = left.x;
    blob.y = GAME_Y_ORIGIN - left.y;
    world.inventory = [{ sprite: DOOR_KEY_SPRITE, attr: 3 }];
    const open = { left: false, right: true, up: false, down: false, fire: false };
    tick(prep, blob, open, world);
    assert.equal(world.ui.kind, "door");
    for (let i = 0; i < 80; i++) tick(prep, blob, open, world);
    assert.equal(world.ui.kind, "none");
    assert.equal(blob.x, (left.x + DOOR_SHIFT_X) & 0xff);
    assert.equal(world.d2c4, DOOR_REASON);
    assert.match(world.message, /AUTHORISED/i);
  });

  it("terrain blocks walking across the wall strip without keys", () => {
    const prep = loadPrep();
    if (!prep) return;
    const room = 176;
    const world = createWorld(prep, room);
    const blob = spawnBlob(prep, room, world);
    world.inventory = [];
    // Between hotspots but left of the solid strip (cols 18–21).
    blob.x = 140;
    blob.y = GAME_Y_ORIGIN - 63;
    for (let i = 0; i < 40; i++) {
      tick(prep, blob, { left: false, right: true, up: false, down: false, fire: false }, world);
    }
    assert.ok(blob.x < 176, `crossed wall to x=${blob.x}`);
    assert.equal(world.d2c4, 0);
  });

  it("rejects empty inventory without shifting X", () => {
    const prep = loadPrep();
    if (!prep) return;
    const room = 176;
    const world = createWorld(prep, room);
    const blob = spawnBlob(prep, room, world);
    blob.x = 128;
    blob.y = GAME_Y_ORIGIN - 63;
    world.inventory = [];
    const open = { left: false, right: true, up: false, down: false, fire: false };
    tick(prep, blob, open, world);
    for (let i = 0; i < 80; i++) tick(prep, blob, open, world);
    assert.equal(blob.x, 128);
    assert.equal(world.d2c4, DOOR_REASON);
    assert.match(world.message, /INVALID/i);
  });

  it("opens with the three digit sprites in inventory (not prompt)", () => {
    const prep = loadPrep();
    if (!prep) return;
    const room = 176;
    const need = expectedDoorCode(room);
    const world = createWorld(prep, room);
    const blob = spawnBlob(prep, room, world);
    blob.x = 128;
    blob.y = GAME_Y_ORIGIN - 63;
    world.inventory = need.map((sprite) => ({ sprite, attr: 3 }));
    const open = { left: false, right: true, up: false, down: false, fire: false };
    tick(prep, blob, open, world);
    for (let i = 0; i < 80; i++) tick(prep, blob, open, world);
    assert.equal(blob.x, (128 + DOOR_SHIFT_X) & 0xff);
    assert.match(world.message, /AUTHORISED/i);
  });

  it("finds the eight note door rooms including 362 singleton", () => {
    const prep = loadPrep();
    if (!prep) return;
    const found: number[] = [];
    for (let id = 0; id < 512; id++) {
      if ((prep.doorsByRoom?.[id] ?? []).length) found.push(id);
    }
    assert.deepEqual(found, [176, 187, 200, 210, 265, 352, 362, 429]);
    assert.equal(prep.doorsByRoom![362]!.length, 1);
  });
});

describe("socket $B0 / $A807 in room 486", () => {
  it("tool $10 punches $AB9F 3-cell gap so the $03 pillar is walkable", () => {
    const prep = loadPrep();
    if (!prep) return;
    const room = 486;
    const sockets = prep.socketsByRoom?.[room] ?? [];
    assert.ok(sockets.length >= 1, "room 486 is $95F0 socket $E6");
    const world = createWorld(prep, room);
    const blob = spawnBlob(prep, room, world);
    const hs = sockets[0]!;
    blob.x = hs.x;
    blob.y = GAME_Y_ORIGIN - hs.y;
    world.inventory = [{ sprite: CORE_TOOL_SPRITE, attr: 3 }];
    const col = ((hs.x >> 3) & 0xfc) | 1;
    const screenRow = 24 - (((hs.y + 1) & 0xff) >> 3);
    const row0 = screenRow - 6;
    assert.equal(attrAt(prep, room, col, row0, world) & 0xff, 0x03);
    assert.equal(blocksBlob(attrAt(prep, room, col, row0, world)), true);
    tick(prep, blob, { left: false, right: false, up: false, down: false, fire: false }, world);
    for (let i = 0; i < 3; i++) {
      const a = attrAt(prep, room, col, row0 + i, world);
      assert.equal(a, CLEAR_ATTR, `cell ${col},${row0 + i}`);
      assert.equal(blocksBlob(a), false);
    }
    enterRoom(prep, world, room, { blob });
    assert.equal(attrAt(prep, room, col, row0, world), CLEAR_ATTR);
  });
});

describe("core panel $A78D / $C4AB", () => {
  it("draws 3×3 need-sprites in $C7; pending cells differ from delivered ink", () => {
    const prep = loadPrep();
    if (!prep) return;
    const world = createWorld(prep, CORE_ROOM);
    // Slot 1 need $0B has pixels; mark delivered. Slot 2 stays pending.
    world.d2de[1] = 0x01;
    world.frames = 0;
    const buf = newBuffers();
    blitCorePanel(prep, buf, world, CORE_ROOM);
    const col0 = 0x0d;
    const row0 = 0x0c - 6;
    const doneCol = col0 + 2;
    const pendCol = col0 + 4;
    const doneAttr = buf.attr[row0 * 32 + doneCol]!;
    const pendAttr = buf.attr[row0 * 32 + pendCol]!;
    assert.equal(doneAttr & 7, 7);
    assert.notEqual(pendAttr & 7, 7);
    assert.ok((buf.data[(row0 * 32 + doneCol) * 8]! | buf.data[(row0 * 32 + doneCol + 1) * 8]!) !== 0);
    assert.ok((buf.data[(row0 * 32 + pendCol) * 8]! | buf.data[(row0 * 32 + pendCol + 1) * 8]!) !== 0);
  });
});

function runCoreCeremony(prep: Prepared, blob: BlobState, world: World) {
  const empty = { left: false, right: false, up: false, down: false, fire: false };
  for (let i = 0; i < CORE_CEREMONY_FRAMES + 2 && world.corePhase; i++) {
    tick(prep, blob, empty, world);
  }
}

describe("core delivery $A6C1 / victory", () => {
  it("delivers all 9 parts and sets victory EndResult", () => {
    const prep = loadPrep();
    if (!prep) return;
    const world = createWorld(prep, 0);
    const blob = spawnBlob(prep, 0, world);
    const startScore = Number(formatScore(world.scoreDigits));
    while (world.coresLeft > 0 && !world.gameOver) {
      const batch = [];
      for (let i = 0; i < CORE_D2DE_INIT.length && batch.length < 4; i++) {
        if ((world.d2de[i]! & 0x80) === 0) continue;
        batch.push({ sprite: CORE_D2DE_INIT[i]! & 0x7f, attr: 3 });
      }
      world.inventory = batch;
      blob.room = CORE_ROOM;
      enterRoom(prep, world, CORE_ROOM, { blob });
      if (world.corePhase) runCoreCeremony(prep, blob, world);
    }
    assert.equal(world.gameOver, true);
    assert.equal(world.victory, true);
    assert.ok(world.endResult);
    assert.equal(world.endResult!.victory, true);
    assert.equal(world.endResult!.coresReplaced, 9);
    assert.equal(world.corePairs, CORE_VICTORY_PAIRS);
    assert.equal(world.coresLeft, 0);
    const score = Number(formatScore(world.endResult!.scoreDigits));
    assert.ok(score >= startScore + 9 * SCORE_CORE_DELIVER + SCORE_END_BONUS - SCORE_FIRST_VISIT);
  });

  it("hides Blob, flies guardians, then ejects to $C6 (even with 0 deliveries)", () => {
    const prep = loadPrep();
    if (!prep) return;
    const world = createWorld(prep, 0);
    const blob = spawnBlob(prep, 0, world);
    world.corePairs = 2;
    world.inventory = [];
    blob.room = CORE_ROOM;
    enterRoom(prep, world, CORE_ROOM, { blob });
    assert.equal(world.corePhase, "ceremony");
    assert.equal(world.blobHidden, true);
    assert.equal(world.entities[0]!.x, CORE_GUARD_XY[0]![0]);
    assert.equal(world.entities[0]!.y, CORE_GUARD_XY[0]![1]);
    assert.equal(world.entities[0]!.state, 1);
    assert.equal(world.entities[2]!.y, 0);
    assert.equal(world.entities[3]!.y, 0);
    tick(prep, blob, { left: false, right: false, up: false, down: false, fire: false }, world);
    assert.notEqual(world.entities[0]!.x, CORE_GUARD_XY[0]![0]);
    assert.equal(world.entities[2]!.y, 0);
    runCoreCeremony(prep, blob, world);
    assert.equal(world.corePhase, null);
    assert.equal(world.blobHidden, false);
    assert.equal(blob.room, CORE_NEIGHBOR);
    assert.equal(blob.x, 0xf0);
  });

  it("ejects to $C6 after a partial delivery ceremony", () => {
    const prep = loadPrep();
    if (!prep) return;
    const world = createWorld(prep, 0);
    const blob = spawnBlob(prep, 0, world);
    world.inventory = [{ sprite: CORE_D2DE_INIT[0]! & 0x7f, attr: 3 }];
    blob.room = CORE_ROOM;
    enterRoom(prep, world, CORE_ROOM, { blob });
    assert.equal(world.coresLeft, 8);
    assert.equal(world.corePairs, 1);
    assert.equal(world.corePhase, "ceremony");
    runCoreCeremony(prep, blob, world);
    assert.equal(blob.room, CORE_NEIGHBOR);
    assert.equal(blob.x, 0xf0);
  });

  it("room $C6 (198) has no aliens ($9C5C corridor)", () => {
    const prep = loadPrep();
    if (!prep) return;
    const world = createWorld(prep, CORE_NEIGHBOR);
    const blob = spawnBlob(prep, CORE_NEIGHBOR, world);
    assert.equal(world.nastyCount, 0);
    assert.equal(world.entities.length, 0);
    enterRoom(prep, world, 0, { blob });
    assert.ok(world.nastyCount > 0);
    enterRoom(prep, world, CORE_NEIGHBOR, { blob });
    assert.equal(world.nastyCount, 0);
    assert.equal(world.entities.length, 0);
  });
});

describe("end evaluation lives=0", () => {
  it("compose EndResult with victory false and GAME OVER", () => {
    const prep = loadPrep();
    if (!prep) return;
    const world = createWorld(prep, 0);
    const blob = spawnBlob(prep, 0, world);
    world.lives = 0;
    world.energy = 0;
    tick(prep, blob, { left: false, right: false, up: false, down: false, fire: false }, world);
    for (let i = 0; i < 200 && world.deathPhase; i++) {
      tick(prep, blob, { left: false, right: false, up: false, down: false, fire: false }, world);
    }
    assert.equal(world.gameOver, true);
    assert.equal(world.victory, false);
    assert.equal(world.message, GAME_OVER_MSG);
    assert.ok(world.endResult);
    assert.equal(world.endResult!.victory, false);
    assert.equal(typeof world.endResult!.adventure, "number");
    assert.equal(typeof world.endResult!.timeMinutes, "number");
    assert.equal(typeof world.endResult!.timeSeconds, "number");
    assert.equal(world.endResult!.scoreDigits.length, 6);
    assert.equal(world.endResult!.coresReplaced, 9 - world.coresLeft);
  });
});

describe("scoring helpers", () => {
  it("kill formula and adventure math", () => {
    assert.equal(killScorePoints(0xb208), 80);
    assert.equal(killScorePoints(0xb388), 100);
    assert.equal(adventureScore(0), 0);
    assert.equal(adventureScore(512), 100);
    const prep = loadPrep();
    if (!prep) return;
    const world = createWorld(prep, 0);
    const before = Number(formatScore(world.scoreDigits));
    addScore(world, 250);
    assert.equal(Number(formatScore(world.scoreDigits)), before + SCORE_FIRST_VISIT);
  });
});
