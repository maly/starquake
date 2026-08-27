import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import {
  GAME_Y_ORIGIN,
  KILL_AABB,
  TELEPORT_COUNT,
  TELEPORT_MSG_BAD,
  TELEPORT_TABLE,
} from "./constants";
import { evaluateTeleport, firstTeleport, hitKillTerrain, teleportNameForRoom, tickPulses } from "./objects";
import { applyTeleport, attrAt, blocksBlob, createWorld, playYToGame, spawnBlob, tick } from "./physics";
import { prepare } from "./render";
import { REPO_ROOT } from "./server";
import type { GameData, Prepared } from "./types";

/** Dest hotspot XY from teleports.md / $AA02, not the name table. */
const TELEPORT_SPAWNS: ReadonlyArray<readonly [string, number, number, number]> = [
  ["VEROX", 40, 0xa0, 0x3f],
  ["RAMIX", 31, 0x60, 0x3f],
  ["TULSA", 66, 0xa0, 0x3f],
  ["ASOIC", 150, 0xa0, 0x3f],
  ["DELTA", 162, 0xa0, 0x3f],
  ["QUAKE", 213, 0xa0, 0x3f],
  ["ALGOL", 289, 0xa0, 0x3f],
  ["EXIAL", 343, 0xa0, 0x3f],
  ["KYZIA", 380, 0x60, 0x3f],
  ["ULTRA", 433, 0xa0, 0x3f],
  ["IRAGE", 457, 0xa0, 0x3f],
  ["OKTUP", 461, 0xa0, 0x3f],
  ["SONIQ", 470, 0xa0, 0x3f],
  ["AMIGA", 499, 0x60, 0x27],
  ["AMAHA", 506, 0xa0, 0x27],
];

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

describe("evaluateTeleport $CFB3", () => {
  it("maps all 15 $D036 names to the MOVEMENT.md rooms", () => {
    assert.equal(TELEPORT_TABLE.length, TELEPORT_COUNT);
    assert.equal(TELEPORT_SPAWNS.length, TELEPORT_COUNT);
    for (const [name, dest] of TELEPORT_TABLE) {
      const ev = evaluateTeleport(name, 343);
      assert.equal(ev.ok, true, name);
      assert.equal(ev.dest, dest, name);
      assert.equal(ev.name, name);
      const listed = TELEPORT_SPAWNS.find((row) => row[0] === name);
      assert.ok(listed, name);
      assert.equal(listed![1], dest, `${name} room`);
      assert.equal(teleportNameForRoom(dest), name);
    }
  });

  it("uppercases a lowercase valid name (exial → EXIAL)", () => {
    const ev = evaluateTeleport("exial", 40);
    assert.equal(ev.ok, true);
    assert.equal(ev.dest, 343);
    assert.equal(ev.name, "EXIAL");
  });

  it("rejects unknown, empty, and short codes", () => {
    const room = 343;
    for (const code of ["NOPE!", "NOPEE", "", "EXI", "EXIA"]) {
      const ev = evaluateTeleport(code, room);
      assert.equal(ev.ok, false, code);
      assert.equal(ev.dest, room, code);
      assert.equal(ev.name, "EXIAL", code);
    }
  });
});

describe("teleport dest hotspots $A4F6", () => {
  it("snaps to dest $0D XY, not start $88,$3F, and origin is not walk-solid", () => {
    const prep = loadPrep();
    if (!prep) return;
    for (const [name, dest, x, y] of TELEPORT_SPAWNS) {
      const pad = firstTeleport(prep, dest);
      assert.ok(pad, name);
      assert.equal(pad!.x, x, `${name} x`);
      assert.equal(pad!.y, y, `${name} y`);
      const world = createWorld(prep, 343);
      const blob = spawnBlob(prep, 343, world);
      blob.x = 0x88;
      blob.y = 143 - 0x3f;
      const energy = world.energy;
      const result = applyTeleport(prep, blob, world, name);
      assert.equal(result.ok, true, name);
      assert.equal(blob.room, dest, name);
      assert.equal(blob.x, x, `${name} snap x (not $88)`);
      assert.equal(playYToGame(blob.y), y, `${name} snap y (not $3F)`);
      assert.equal(world.energy, energy, name);
      const origin = attrAt(prep, dest, x >> 3, blob.y >> 3, world);
      assert.equal(blocksBlob(origin), false, `${name} origin attr=$${origin.toString(16)} is walk-solid`);
    }
  });

  it("invalid code stays put, reports CODE NOT RECOGNISED, and does not drain energy", () => {
    const prep = loadPrep();
    if (!prep) return;
    const world = createWorld(prep, 343);
    const blob = spawnBlob(prep, 343, world);
    const pad = firstTeleport(prep, 343);
    assert.ok(pad);
    blob.x = pad!.x;
    blob.y = 143 - pad!.y;
    const energy = world.energy;
    const room = blob.room;
    const nasties = world.nastyCount;
    const result = applyTeleport(prep, blob, world, "NOPE!");
    assert.equal(result.ok, false);
    assert.equal(result.message, TELEPORT_MSG_BAD);
    assert.equal(world.message, TELEPORT_MSG_BAD);
    assert.equal(blob.room, room);
    assert.equal(world.energy, energy);
    assert.equal(world.nastyCount, nasties, "invalid $A519 skips $9C47");
    assert.equal(world.slots.every((s) => s === null), true);
  });

  it("scanHotspots finds $D0 pads in the 15 table rooms", () => {
    const prep = loadPrep();
    if (!prep) return;
    for (const [name, dest] of TELEPORT_TABLE) {
      const list = prep.teleportsByRoom?.[dest] ?? [];
      assert.ok(list.length >= 1, `${name} room ${dest} missing $0D`);
    }
  });
});

describe("$A66C pulse slot round-robin", () => {
  it("updates one of 4 $9635 slots per tick, so period 8 toggles after 9 visits (36 ticks)", () => {
    const prep = loadPrep();
    if (!prep) return;
    const world = createWorld(prep, 13);
    world.pulses = [
      {
        col: 10,
        row: 12,
        period: 8,
        timer: 8,
        flag: 0,
        xorInk: new Uint8Array(16),
        sparkAttr: 0x47,
        lastAnim: null,
      },
    ];
    const blob = spawnBlob(prep, 13, world);
    blob.x = 0;
    blob.y = 0;
    for (let i = 0; i < 8; i++) tickPulses(blob, world);
    assert.equal(world.pulses[0]!.flag, 0, "must not toggle on the first 8 frames (that was 1:1 with 50 Hz)");
    assert.ok(world.pulses[0]!.xorInk.every((b) => b === 0), "no ink before flag on");
    for (let i = 0; i < 28; i++) tickPulses(blob, world);
    assert.equal(world.pulses[0]!.flag, 1, "DEC to $FF after 9 slot visits × 4 frames");
    assert.ok(world.pulses[0]!.xorInk.every((b) => b === 0), "toggle clears ink; anim blinks later");
  });

  it("two anim visits with the same layer keep a single L7 frame (no XOR blink-off)", () => {
    const prep = loadPrep();
    if (!prep) return;
    const world = createWorld(prep, 13);
    // timer 3→2 (&3=2→L7) then 2→1 (&3=1→L7): still exactly L7, not cleared.
    const p = {
      col: 10,
      row: 12,
      period: 8,
      timer: 3,
      flag: 1,
      xorInk: new Uint8Array(16),
      sparkAttr: 0x44,
      lastAnim: null as number | null,
    };
    world.pulses = [p];
    const blob = spawnBlob(prep, 13, world);
    blob.x = 0;
    blob.y = 0;
    world.pulseIndex = 3;
    tickPulses(blob, world); // 3→2, L7
    assert.equal(p.timer, 2);
    assert.equal(p.lastAnim, 7);
    assert.equal(p.xorInk[0], 0x08);
    world.pulseIndex = 3;
    tickPulses(blob, world); // 2→1, still L7 assigned
    assert.equal(p.timer, 1);
    assert.equal(p.lastAnim, 7);
    assert.equal(p.xorInk[0], 0x08);
    assert.equal(p.xorInk[1], 0x1c);
  });

  it("switching anim layer replaces instead of stacking L6⊕L7", () => {
    const prep = loadPrep();
    if (!prep) return;
    const world = createWorld(prep, 13);
    // 8→7: L6; 7→6: L7 — must not leave L6⊕L7 in xorInk
    const p = {
      col: 10,
      row: 12,
      period: 8,
      timer: 8,
      flag: 1,
      xorInk: new Uint8Array(16),
      sparkAttr: 0x44,
      lastAnim: null as number | null,
    };
    world.pulses = [p];
    const blob = spawnBlob(prep, 13, world);
    blob.x = 0;
    blob.y = 0;
    world.pulseIndex = 3;
    tickPulses(blob, world); // →7, L6
    const l6 = Uint8Array.from(p.xorInk);
    assert.equal(p.lastAnim, 6);
    world.pulseIndex = 3;
    tickPulses(blob, world); // →6, L7 replace
    // Pure L7 first cell (not L6⊕L7)
    assert.equal(p.lastAnim, 7);
    assert.equal(p.xorInk[0], 0x08);
    assert.equal(p.xorInk[1], 0x1c);
    assert.notDeepEqual([...p.xorInk], [...l6]);
    // And never the XOR-stack of both layers
    assert.notEqual(p.xorInk[0], l6[0]! ^ 0x08);
  });
});

describe("kill terrain $06 AABB $CBBB", () => {
  it("|d| < $0F: dx/dy 14 hits, 15 misses (room 49 $D0,$47)", () => {
    const prep = loadPrep();
    if (!prep) return;
    const hx = 0xd0;
    const hy = 0x47;
    const kills = prep.killsByRoom?.[49] ?? [];
    assert.ok(
      kills.some((s) => s.x === hx && s.y === hy),
      `room 49 missing $06 at $${hx.toString(16)},$${hy.toString(16)}: ${JSON.stringify(kills)}`,
    );
    const world = createWorld(prep, 49);
    const blob = spawnBlob(prep, 49, world);
    blob.x = hx;
    blob.y = GAME_Y_ORIGIN - hy;
    assert.equal(hitKillTerrain(prep, blob), true, "exact hotspot");
    blob.x = hx + (KILL_AABB - 1);
    assert.equal(hitKillTerrain(prep, blob), true, "dx=14 inside");
    blob.x = hx + KILL_AABB;
    assert.equal(hitKillTerrain(prep, blob), false, "dx=15 outside");
    blob.x = hx;
    blob.y = GAME_Y_ORIGIN - (hy - (KILL_AABB - 1));
    assert.equal(hitKillTerrain(prep, blob), true, "dy=14 inside");
    blob.y = GAME_Y_ORIGIN - (hy - KILL_AABB);
    assert.equal(hitKillTerrain(prep, blob), false, "dy=15 outside");
  });
});

/** $F0 / type $0F pairs: left room (right alcove) ↔ right room (left alcove). */
const PASSAGE_ROOMS = [
  41, 42, 51, 52, 61, 62, 121, 122, 154, 155, 157, 158, 192, 193, 194, 195, 236, 237, 241, 242, 361,
  362,
] as const;

describe("horizontal passage $0F $D117", () => {
  it("scanHotspots finds $F0 in 22 rooms including 61 and 236", () => {
    const prep = loadPrep();
    if (!prep) return;
    const found: number[] = [];
    for (let id = 0; id < 512; id++) {
      if ((prep.passagesByRoom?.[id] ?? []).length) found.push(id);
    }
    assert.deepEqual(found, [...PASSAGE_ROOMS]);
    const a61 = prep.passagesByRoom![61]!;
    assert.equal(a61.length, 1);
    assert.equal(a61[0]!.x, 200);
    assert.equal(a61[0]!.y, 0x57);
    const a236 = prep.passagesByRoom![236]!;
    assert.equal(a236.length, 1);
    assert.equal(a236[0]!.x, 200);
    assert.equal(a236[0]!.y, 0x27);
  });

  it("room 61 exact XY + Right reloads 62 and snaps to dest $0F", () => {
    const prep = loadPrep();
    if (!prep) return;
    const world = createWorld(prep, 61);
    const blob = spawnBlob(prep, 61, world);
    blob.x = 200;
    blob.y = GAME_Y_ORIGIN - 0x57;
    world.sfx.length = 0;
    tick(prep, blob, { left: false, right: true, up: false, down: false, fire: false }, world);
    assert.equal(blob.room, 62);
    assert.equal(blob.x, 40);
    assert.equal(playYToGame(blob.y), 0x57);
    assert.equal(world.d2c4, 0x05);
    assert.ok(world.sfx.includes(0x04));
    const dest = attrAt(prep, 62, blob.x >> 3, blob.y >> 3, world);
    assert.equal(blocksBlob(dest), false, `dest attr=$${dest.toString(16)} walk-solid`);
  });

  it("room 62 exact XY + Left returns to 61 dest $0F", () => {
    const prep = loadPrep();
    if (!prep) return;
    const world = createWorld(prep, 62);
    const blob = spawnBlob(prep, 62, world);
    blob.x = 40;
    blob.y = GAME_Y_ORIGIN - 0x57;
    tick(prep, blob, { left: true, right: false, up: false, down: false, fire: false }, world);
    assert.equal(blob.room, 61);
    assert.equal(blob.x, 200);
    assert.equal(playYToGame(blob.y), 0x57);
    assert.equal(world.d2c4, 0x05);
  });

  it("exact XY without Left/Right stays put", () => {
    const prep = loadPrep();
    if (!prep) return;
    const world = createWorld(prep, 61);
    const blob = spawnBlob(prep, 61, world);
    blob.x = 200;
    blob.y = GAME_Y_ORIGIN - 0x57;
    tick(prep, blob, { left: false, right: false, up: false, down: false, fire: false }, world);
    assert.equal(blob.room, 61);
    assert.equal(blob.x, 200);
    assert.equal(playYToGame(blob.y), 0x57);
  });

  it("walk that does not land on exact XY does not warp", () => {
    const prep = loadPrep();
    if (!prep) return;
    const world = createWorld(prep, 61);
    const blob = spawnBlob(prep, 61, world);
    // X=196 + Right → 198, still 2px short of the $0F at 200.
    blob.x = 196;
    blob.y = GAME_Y_ORIGIN - 0x57;
    tick(prep, blob, { left: false, right: true, up: false, down: false, fire: false }, world);
    assert.equal(blob.room, 61);
    assert.equal(blob.x, 198);
  });
});
