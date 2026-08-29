import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  COLS,
  CORE_D2DE_INIT,
  CORE_ROOM,
  CORE_TOOL_SPRITE,
  CORE_VICTORY_PAIRS,
  DD22_PAD,
  DEATH_A_ENERGY,
  DEATH_A_OBJ06,
  DOOR_KEY_SPRITE,
  EXTRA_CHEOPS,
  GAME_Y_ORIGIN,
  GRAFIX_BASE,
  GRAFIX_STRIDE,
  ROWS,
} from "../constants";
import { beginCoreCeremony, deliverCoreParts, matchCoreDeliveries } from "../core";
import { tickNasties } from "../entities";
import { applyExtra, itemGamePos, tickPickup } from "../items";
import { tryClearSocket } from "../objects";
import { CHAN_FIRE, CHAN_KILL } from "./channel";
import { applyDeath, applyPassage, createWorld, spawnBlob, tick } from "../physics";
import { tickFire } from "../projectiles";
import type { Entity, Item, Prepared, Room } from "../types";
import {
  beginCheopsUi,
  beginDoorUi,
  beginTeleportUi,
  feedCheopsKey,
  feedTeleportKey,
  finishTeleportInput,
  tickCheopsUi,
  tickDoorUi,
} from "../ui/overlay";

function grid(items: Item[] = []): Prepared {
  const solid = Array.from({ length: ROWS }, () => Array<number>(COLS).fill(0));
  const attributes = Array.from({ length: ROWS }, () => Array<number>(COLS).fill(0x47));
  const rooms: Room[] = Array.from({ length: 512 }, (_, id) => ({ id, blocks: [], attributes, solid }));
  const itemsByRoom: Item[][] = Array.from({ length: 512 }, () => []);
  for (const it of items) {
    if (it.room >= 0 && it.room < 512) itemsByRoom[it.room]!.push(it);
  }
  return {
    graphics: [],
    sprites: [],
    actorsBySet: new Map(),
    actorsByPtr: new Map(),
    blocks: [],
    rooms,
    itemsByRoom,
  };
}

function idle() {
  return { left: false, right: false, up: false, down: false, fire: false };
}

function liveEntity(over: Partial<Entity>): Entity {
  return {
    x: 80,
    y: 80,
    ink: 4,
    set: "alien1",
    frame: 0,
    ptr: GRAFIX_BASE + 3 * GRAFIX_STRIDE,
    basePtr: GRAFIX_BASE + 3 * GRAFIX_STRIDE,
    dir: 2,
    speedX: 2,
    speedY: 2,
    period: 1,
    timer: 1,
    state: 1,
    stateTimer: 0,
    ai: 6,
    aiPeriod: 0x64,
    aiCount: 0x64,
    homeX: 80,
    homeY: 80,
    clipTerrain: true,
    ...over,
  };
}

describe("sfx hooks", () => {
  it("createWorld starts with empty sfx and walk xor $14", () => {
    const world = createWorld(grid(), 1);
    assert.deepEqual(world.sfx, []);
    assert.equal(world.sfxStep, 0x14);
  });

  it("walk wrap ANIM_PERIOD on dd22=0 alternates $14/$15", () => {
    const prep = grid();
    const world = createWorld(prep, 1);
    const blob = spawnBlob(prep, 1, world);
    world.entities = [];
    world.nastyCount = 0;
    world.pulses = [];
    const right = { ...idle(), right: true };
    for (let i = 0; i < 3; i++) tick(prep, blob, right, world);
    assert.deepEqual(world.sfx, [0x15]);
    world.sfx.length = 0;
    for (let i = 0; i < 3; i++) tick(prep, blob, right, world);
    assert.deepEqual(world.sfx, [0x14]);
  });

  it("pad flight does not queue walk sfx", () => {
    const prep = grid();
    const world = createWorld(prep, 1);
    const blob = spawnBlob(prep, 1, world);
    world.entities = [];
    world.nastyCount = 0;
    world.pulses = [];
    world.dd22 = DD22_PAD;
    for (let i = 0; i < 6; i++) tick(prep, blob, { ...idle(), right: true }, world);
    assert.equal(world.sfx.some((a) => a === 0x14 || a === 0x15), false);
  });

  it("energy death queues $13 then $0F; terrain $10 only $13", () => {
    const prep = grid();
    const world = createWorld(prep, 1);
    const blob = spawnBlob(prep, 1, world);
    applyDeath(prep, blob, world, DEATH_A_ENERGY);
    assert.deepEqual(world.sfx, [0x13, 0x0f]);
    world.deathPhase = null;
    world.sfx.length = 0;
    applyDeath(prep, blob, world, DEATH_A_OBJ06);
    assert.deepEqual(world.sfx, [0x13]);
  });

  it("tickFire + hitByBullet queues $12", () => {
    const prep = grid();
    const world = createWorld(prep, 1);
    const blob = spawnBlob(prep, 1, world);
    blob.x = 36;
    blob.y = GAME_Y_ORIGIN - 80;
    blob.facing = 1;
    world.aim = 1;
    tickFire(prep, blob, true, world);
    world.entities = [liveEntity({ x: world.bullet.x, y: world.bullet.y, state: 1 })];
    world.nastyCount = 1;
    tickNasties(prep, blob, world);
    assert.ok(world.sfx.includes(0x12));
    assert.equal(world.chan.req1, CHAN_KILL);
  });

  it("tickFire writes A41B $05", () => {
    const prep = grid();
    const world = createWorld(prep, 1);
    const blob = spawnBlob(prep, 1, world);
    blob.facing = 1;
    world.aim = 1;
    tickFire(prep, blob, true, world);
    assert.equal(world.chan.req0, CHAN_FIRE);
  });

  it("nasty appear writes A41C 1..4 from dac0", () => {
    const prep = grid();
    const world = createWorld(prep, 1);
    const blob = spawnBlob(prep, 1, world);
    world.dac.dac0 = 2;
    world.entities = [
      liveEntity({
        state: 0,
        stateTimer: 0,
        timer: 1,
        period: 1,
        y: 0x0f,
        homeX: 80,
        homeY: 80,
      }),
    ];
    world.nastyCount = 1;
    tickNasties(prep, blob, world);
    assert.ok(world.chan.req1 >= 1 && world.chan.req1 <= 4);
  });

  it("tickPickup collect unshift queues $0C; empty Up does not", () => {
    const item: Item = {
      index: 4,
      room: 1,
      col: 10,
      row: 8,
      placed: true,
      sprite: 26,
      attr_bits: 3,
      raw: [],
    };
    const prep = grid([item]);
    const world = createWorld(prep, 1);
    const blob = spawnBlob(prep, 1, world);
    const pos = itemGamePos(item);
    blob.x = pos.x;
    blob.y = GAME_Y_ORIGIN - pos.y;
    tickPickup(prep, blob, idle(), world);
    assert.equal(world.sfx.includes(0x0c), false);
    tickPickup(prep, blob, { ...idle(), up: true }, world);
    assert.ok(world.sfx.includes(0x0c));
  });

  it("extra $11 queues $01; Cheops $19 is silent", () => {
    const world = createWorld(grid(), 1);
    applyExtra(world, 0x11);
    assert.ok(world.sfx.includes(0x01));
    world.sfx.length = 0;
    applyExtra(world, EXTRA_CHEOPS);
    assert.deepEqual(world.sfx, []);
  });

  it("Cheops overlay $0B; fail $0F; pick 1–5 $10", () => {
    const prep = grid();
    const failWorld = createWorld(prep, 0);
    failWorld.inventory = [];
    const failUi = beginCheopsUi(failWorld, 0);
    assert.ok(failWorld.sfx.includes(0x0b));
    failWorld.sfx.length = 0;
    for (let i = 0; i < 400 && failUi.phase !== "result"; i++) tickCheopsUi(failUi, failWorld);
    assert.equal(failUi.phase, "result");
    assert.ok(failWorld.sfx.includes(0x0f));

    const okWorld = createWorld(prep, 0);
    okWorld.inventory = [
      { sprite: DOOR_KEY_SPRITE, attr: 3 },
      { sprite: 0x1a, attr: 3 },
    ];
    okWorld.d2de = CORE_D2DE_INIT.map((v) => v);
    const okUi = beginCheopsUi(okWorld, 0);
    for (let i = 0; i < 400 && okUi.phase !== "exchange"; i++) tickCheopsUi(okUi, okWorld);
    okWorld.sfx.length = 0;
    feedCheopsKey(okUi, "5", okWorld);
    assert.deepEqual(okWorld.sfx, [0x10]);
  });

  it("beginDoorUi $08; intro→result OK $0A+$0F, fail $0F", () => {
    const prep = grid();
    const okWorld = createWorld(prep, 1);
    okWorld.inventory = [{ sprite: DOOR_KEY_SPRITE, attr: 3 }];
    const okUi = beginDoorUi(okWorld, 0, true);
    assert.ok(okWorld.sfx.includes(0x08));
    okWorld.sfx.length = 0;
    for (let i = 0; i < 400 && okUi.phase !== "result"; i++) tickDoorUi(okUi, okWorld);
    assert.equal(okUi.phase, "result");
    assert.ok(okWorld.sfx.includes(0x0a));
    assert.ok(okWorld.sfx.includes(0x0f));

    const badWorld = createWorld(prep, 1);
    const badUi = beginDoorUi(badWorld, 0, true);
    badWorld.sfx.length = 0;
    for (let i = 0; i < 400 && badUi.phase !== "result"; i++) tickDoorUi(badUi, badWorld);
    assert.equal(badUi.phase, "result");
    assert.ok(badWorld.sfx.includes(0x0f));
    assert.ok(!badWorld.sfx.includes(0x0a));
  });

  it("teleport start $07, char $11, OK $10+$09, fail $0F", () => {
    const world = createWorld(grid(), 1);
    const ui = beginTeleportUi(40, world);
    assert.ok(world.sfx.includes(0x07));
    world.sfx.length = 0;
    ui.phase = "input";
    ui.waitingRelease = false;
    feedTeleportKey(ui, "E", true, world);
    assert.deepEqual(world.sfx, [0x11]);
    world.sfx.length = 0;
    ui.buffer = "EXIAL";
    finishTeleportInput(ui, 40, world);
    assert.deepEqual(world.sfx, [0x10, 0x09]);

    const fail = beginTeleportUi(40);
    fail.buffer = "NOPEE";
    finishTeleportInput(fail, 40, world);
    assert.ok(world.sfx.includes(0x0f));
  });

  it("applyPassage queues $04", () => {
    const prep = grid();
    prep.passagesByRoom = Array.from({ length: 512 }, () => []);
    prep.passagesByRoom[2] = [{ x: 40, y: 80 }];
    const world = createWorld(prep, 1);
    const blob = spawnBlob(prep, 1, world);
    applyPassage(prep, blob, world, { left: false, right: true });
    assert.ok(world.sfx.includes(0x04));
    assert.equal(blob.room, 2);
    assert.equal(blob.x, 40);
  });

  it("tryClearSocket success queues $08", () => {
    const prep = grid();
    const world = createWorld(prep, 1);
    const blob = spawnBlob(prep, 1, world);
    world.inventory = [{ sprite: CORE_TOOL_SPRITE, attr: 3 }];
    prep.socketsByRoom = Array.from({ length: 512 }, () => []);
    prep.socketsByRoom[1] = [{ x: blob.x, y: GAME_Y_ORIGIN - blob.y, slot: 0 }];
    world.socketFlags[0] = 0x01;
    assert.equal(tryClearSocket(prep, blob, world), true);
    assert.ok(world.sfx.includes(0x08));
  });

  it("core delivery $03 per part; ceremony $14/$15; victory $11 once", () => {
    const prep = grid();
    const world = createWorld(prep, 1);
    const blob = spawnBlob(prep, 1, world);
    world.inventory = [{ sprite: CORE_D2DE_INIT[0]! & 0x7f, attr: 3 }];
    matchCoreDeliveries(world);
    assert.ok(world.sfx.includes(0x03));

    world.sfx.length = 0;
    world.dac.dac0 = 0;
    beginCoreCeremony(world);
    assert.deepEqual(world.sfx, [0x14]);
    world.corePhase = null;

    world.sfx.length = 0;
    world.dac.dac0 = 1;
    beginCoreCeremony(world);
    assert.deepEqual(world.sfx, [0x15]);
    world.corePhase = null;
    world.gameOver = false;
    world.victory = false;
    world.endResult = null;

    world.sfx.length = 0;
    world.corePairs = CORE_VICTORY_PAIRS - 1;
    world.coresLeft = 1;
    world.d2de = CORE_D2DE_INIT.map((v) => v);
    world.d2de[0] = 0x80;
    world.inventory = [{ sprite: 0, attr: 3 }];
    blob.room = CORE_ROOM;
    deliverCoreParts(prep, blob, world, () => undefined);
    assert.ok(world.sfx.includes(0x11));
  });
});
