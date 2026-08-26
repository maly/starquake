import * as fs from "node:fs";
import * as path from "node:path";
import {
  ALIEN1_PTR,
  BADALIEN1_PTR,
  BADALIEN2_PTR,
  GAME_Y_ORIGIN,
  GRAFIX_BASE,
  GRAFIX_STRIDE,
} from "./constants";
import { tickNasties } from "./entities";
import { itemGamePos } from "./items";
import { evaluateTeleport, firstTeleport, lastStation, teleportNameForRoom } from "./objects";
import { applyTeleport, createWorld, enterRoom, playYToGame, spawnBlob, tick, type BlobState } from "./physics";
import { tickFire } from "./projectiles";
import type { Entity, World } from "./types";
import {
  HEIGHT,
  WIDTH,
  clampRoom,
  itemCells,
  moveRoom,
  newBuffers,
  newRgba,
  prepare,
  renderRoom,
  renderWorld,
  roomCol,
  roomRow,
} from "./render";
import type { GameData, Prepared } from "./types";

function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(name);
  if (i === -1) return fallback;
  return process.argv[i + 1] ?? fallback;
}

function has(name: string): boolean {
  return process.argv.includes(name);
}

function loadData(dir: string): Prepared {
  const read = (name: string) => JSON.parse(fs.readFileSync(path.join(dir, name), "utf8"));
  const pack: GameData = {
    rooms: read("rooms.json"),
    graphics: read("graphics.json"),
    blocks: read("blocks.json"),
    sprites: read("sprites.json"),
    items: read("items.json"),
  };
  const actorsPath = path.join(dir, "actors.json");
  if (fs.existsSync(actorsPath)) pack.actors = JSON.parse(fs.readFileSync(actorsPath, "utf8"));
  const attrsPath = path.join(dir, "block_attrs.json");
  if (fs.existsSync(attrsPath)) pack.blockAttrs = JSON.parse(fs.readFileSync(attrsPath, "utf8"));
  return prepare(pack);
}

function parseRooms(spec: string, prep: Prepared): number[] {
  if (spec === "sample") {
    const set = new Set([0, 1, 15, 16, 31, 32, 168, 199, 255, 256, 511]);
    prep.itemsByRoom.forEach((list, id) => {
      if (list.length) set.add(id);
    });
    return [...set].sort((a, b) => a - b);
  }
  return spec.split(",").map((s) => parseInt(s, 10));
}

function metaFor(prep: Prepared, roomId: number) {
  const cells: Array<[number, number]> = [];
  for (const it of prep.itemsByRoom[roomId] ?? []) {
    for (const xy of itemCells(it)) cells.push(xy);
  }
  return {
    room: roomId,
    items: prep.itemsByRoom[roomId]?.length ?? 0,
    item_cells: cells,
    solid: prep.rooms[roomId]!.solid,
  };
}

if (has("--nav-test")) {
  const t = [
    moveRoom(0, -1, 0) === 0,
    moveRoom(0, 0, -1) === 0,
    moveRoom(15, 1, 0) === 15,
    moveRoom(15, 0, -1) === 15,
    moveRoom(496, 0, 1) === 496,
    moveRoom(511, 1, 0) === 511,
    moveRoom(511, 0, 1) === 511,
    moveRoom(0, 1, 0) === 1,
    moveRoom(0, 0, 1) === 16,
    moveRoom(15, 0, 1) === 31,
    roomCol(16) === 0 && roomRow(16) === 1,
    clampRoom(-3) === 0 && clampRoom(999) === 511,
  ];
  process.stdout.write(t.every(Boolean) ? "ok\n" : t.join(",") + "\n");
  process.exit(0);
}

const dataDir = arg("--data", "out");
const prep = loadData(dataDir);
const buf = newBuffers();
const rgba = newRgba();

function entityPublic(e: Entity) {
  return { x: e.x, y: e.y, state: e.state, dir: e.dir, ptr: e.ptr, timer: e.timer };
}

function deathSnap(blob: BlobState, world: World) {
  return {
    room: blob.room,
    x: blob.x,
    y: playYToGame(blob.y),
    energy: world.energy,
    lives: world.lives,
    platforms: world.platforms,
    firepower: world.firepower,
    dd22: world.dd22,
    gameOver: world.gameOver,
    message: world.message,
    d2c4: world.d2c4,
    deathA: world.deathA,
    inventory: world.inventory,
    energyDrain: world.energyDrain,
  };
}

function parkedEntity(over: Partial<Entity>): Entity {
  return {
    x: 80,
    y: 80,
    ink: 4,
    set: "alien1",
    frame: 0,
    ptr: GRAFIX_BASE + 3 * GRAFIX_STRIDE,
    basePtr: GRAFIX_BASE + 3 * GRAFIX_STRIDE,
    dir: 0,
    speedX: 2,
    speedY: 2,
    period: 0xff,
    timer: 0xff,
    state: 1,
    stateTimer: 0,
    ai: 6,
    aiPeriod: 0x64,
    aiCount: 0x64,
    homeX: 80,
    homeY: 80,
    ...over,
  };
}

if (has("--death-test")) {
  const mode = arg("--mode", "energy");
  const none = { left: false, right: false, up: false, down: false, fire: false };
  const room = mode === "terrain" ? 49 : 0;
  const world = createWorld(prep, room);
  const blob = spawnBlob(prep, room, world);
  world.entities = [];
  world.nastyCount = 0;
  world.pulses = [];

  if (mode === "terrain") {
    world.entry = { x: 0x88, y: 0x3f, dd22: 0 };
    blob.x = 0xd0;
    blob.y = GAME_Y_ORIGIN - 0x47;
  } else if (mode === "lethal" || mode === "lethal-c8" || mode === "annoy") {
    const ptr = mode === "lethal" ? BADALIEN2_PTR : mode === "lethal-c8" ? BADALIEN1_PTR : ALIEN1_PTR;
    world.entities = [
      parkedEntity({
        x: blob.x,
        y: playYToGame(blob.y),
        ptr,
        basePtr: ptr,
        set: mode === "annoy" ? "alien1" : mode === "lethal-c8" ? "badalien1" : "badalien2",
      }),
    ];
    world.nastyCount = 1;
  } else if (mode === "energy" || mode === "respawn" || mode === "gameover") {
    blob.x = 0x89;
    blob.y = GAME_Y_ORIGIN - 0x40;
    world.energy = 0;
    if (mode === "respawn") {
      world.platforms = 7;
      world.firepower = 0x10;
      world.inventory = [{ sprite: 0x1a, attr: 3 }];
    }
    if (mode === "gameover") world.lives = 0;
  }

  const before = deathSnap(blob, world);
  tick(prep, blob, none, world);
  for (let i = 0; i < 200 && world.deathPhase; i++) tick(prep, blob, none, world);
  process.stdout.write(
    JSON.stringify({
      mode,
      before,
      after: deathSnap(blob, world),
      entities: world.entities.map(entityPublic),
    }) + "\n",
  );
  process.exit(0);
}

if (has("--enemy-trace")) {
  const room = parseInt(arg("--room", "0"), 10);
  const frames = parseInt(arg("--frames", "40"), 10);
  const world = createWorld(prep, room);
  const blob = spawnBlob(prep, room, world);
  const initPath = arg("--enemy-init", "");
  if (initPath) {
    const init = JSON.parse(fs.readFileSync(initPath, "utf8")) as {
      dac?: typeof world.dac;
      blob?: { x: number; y: number };
      entities: Entity[];
    };
    if (init.dac) world.dac = init.dac;
    if (init.blob) {
      blob.x = init.blob.x;
      blob.y = init.blob.y;
    }
    world.entities = init.entities;
    world.nastyCount = init.entities.length;
  }
  const out = [];
  const none = { left: false, right: false, up: false, down: false };
  const onlyNasties = Boolean(initPath);
  for (let i = 0; i < frames; i++) {
    out.push({ frame: i, entities: world.entities.map(entityPublic) });
    if (onlyNasties) tickNasties(prep, blob, world);
    else tick(prep, blob, none, world);
  }
  process.stdout.write(JSON.stringify(out) + "\n");
  process.exit(0);
}

if (has("--fire-trace")) {
  const room = parseInt(arg("--room", "1"), 10);
  const frames = parseInt(arg("--frames", "40"), 10);
  const world = createWorld(prep, room);
  world.entities = [];
  world.nastyCount = 0;
  const blob = spawnBlob(prep, room, world);
  const initPath = arg("--fire-init", "");
  if (initPath) {
    const init = JSON.parse(fs.readFileSync(initPath, "utf8")) as {
      blob?: { x: number; y: number };
      aim?: number;
      firepower?: number;
    };
    if (init.blob) {
      blob.x = init.blob.x;
      blob.y = GAME_Y_ORIGIN - init.blob.y;
    }
    if (init.aim) {
      world.aim = init.aim;
      blob.facing = init.aim === 2 ? -1 : 1;
    }
    if (init.firepower !== undefined) world.firepower = init.firepower;
  }
  const out = [];
  for (let i = 0; i < frames; i++) {
    tickFire(prep, blob, i === 0, world);
    out.push({
      frame: i,
      x: world.bullet.x,
      y: world.bullet.y,
      fireDir: world.fireDir,
      ptr: world.bullet.ptr,
      firepower: world.firepower,
    });
    if (world.fireDir === 0 && i > 0) break;
  }
  process.stdout.write(JSON.stringify(out) + "\n");
  process.exit(0);
}

if (has("--hit-test")) {
  const world = createWorld(prep, 1);
  const blob = spawnBlob(prep, 1, world);
  world.entities = [
    {
      x: 80,
      y: 80,
      ink: 4,
      set: "alien1",
      frame: 0,
      ptr: 0xb448,
      basePtr: 0xb448,
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
    },
  ];
  world.nastyCount = 1;
  world.fireDir = 1;
  world.bullet.x = 80;
  world.bullet.y = 80;
  world.bullet.ptr = 0xe8b4;
  tickNasties(prep, blob, world);
  process.stdout.write(
    JSON.stringify({
      state: world.entities[0]!.state,
      ptr: world.entities[0]!.ptr,
      y: world.entities[0]!.y,
      fireDir: world.fireDir,
      bulletY: world.bullet.y,
    }) + "\n",
  );
  process.exit(0);
}

if (has("--lift-test")) {
  const room = parseInt(arg("--room", "422"), 10);
  const frames = parseInt(arg("--frames", "16"), 10);
  const world = createWorld(prep, room);
  const blob = spawnBlob(prep, room, world);
  blob.x = parseInt(arg("--x", "72"), 10);
  blob.y = GAME_Y_ORIGIN - parseInt(arg("--y", "81"), 10);
  blob.fallIndex = 0;
  blob.jumpTicks = 0;
  const none = { left: false, right: false, up: false, down: false, fire: false };
  const out = [];
  for (let i = 0; i < frames; i++) {
    out.push({
      frame: i,
      x: blob.x,
      y: playYToGame(blob.y),
      playY: blob.y,
      dd22: world.dd22,
      walkTick: blob.walkTick,
    });
    tick(prep, blob, none, world);
  }
  process.stdout.write(JSON.stringify({ room, station: world.station, frames: out }) + "\n");
  process.exit(0);
}

if (has("--pad-test")) {
  const room = parseInt(arg("--room", "15"), 10);
  const frames = parseInt(arg("--frames", "8"), 10);
  const world = createWorld(prep, room);
  const blob = spawnBlob(prep, room, world);
  const station = lastStation(prep, room);
  if (has("--board") && (station.x || station.y)) {
    blob.x = station.x;
    blob.y = GAME_Y_ORIGIN - station.y;
    world.lastDir = 8;
  }
  const board = has("--board");
  const fire = has("--fire");
  const afterEnter = {
    dd22: world.dd22,
    nastyCount: world.nastyCount,
    pad: world.pad ? { x: world.pad.x, y: world.pad.y, ptr: world.pad.ptr } : null,
    station: world.station,
  };
  const out = [];
  for (let i = 0; i < frames; i++) {
    // Hold Up for the whole --board run so $DD24 bit 3 stays set. Right
    // without Up on the station pixel is a dismount ($CEAD), which would
    // park a pad shot before --fire could be observed.
    const input = {
      left: false,
      right: has("--right"),
      up: board,
      down: false,
      fire: fire && i === 1,
    };
    tick(prep, blob, input, world);
    out.push({
      frame: i,
      x: blob.x,
      y: playYToGame(blob.y),
      dd22: world.dd22,
      lastDir: world.lastDir,
      pad: world.pad ? { x: world.pad.x, y: world.pad.y, ptr: world.pad.ptr } : null,
      nastyCount: world.nastyCount,
      fireDir: world.fireDir,
      padShotDir: world.padShotDir,
      bullet: { x: world.bullet.x, y: world.bullet.y, ptr: world.bullet.ptr },
      firepower: world.firepower,
    });
  }
  process.stdout.write(
    JSON.stringify({
      room,
      station,
      stations: prep.stationsByRoom?.[room] ?? [],
      afterEnter,
      frames: out,
    }) + "\n",
  );
  process.exit(0);
}

if (has("--teleport-test")) {
  const room = parseInt(arg("--room", "343"), 10);
  const code = arg("--code", "VEROX");
  const world = createWorld(prep, room);
  const blob = spawnBlob(prep, room, world);
  const pad = firstTeleport(prep, room);
  if (pad) {
    blob.x = pad.x;
    blob.y = GAME_Y_ORIGIN - pad.y;
  }
  const ev = evaluateTeleport(code, room);
  const before = { room: blob.room, x: blob.x, y: playYToGame(blob.y), energy: world.energy, nastyCount: world.nastyCount };
  const result = applyTeleport(prep, blob, world, code);
  process.stdout.write(
    JSON.stringify({
      room,
      code,
      eval: ev,
      ownName: teleportNameForRoom(room),
      pad,
      destPad: firstTeleport(prep, blob.room),
      before,
      result,
      after: {
        room: blob.room,
        x: blob.x,
        y: playYToGame(blob.y),
        energy: world.energy,
        nastyCount: world.nastyCount,
        message: world.message,
        platforms: world.slots.some((s) => s !== null),
      },
    }) + "\n",
  );
  process.exit(0);
}

if (has("--teleport-eval")) {
  const room = parseInt(arg("--room", "343"), 10);
  const code = arg("--code", "VEROX");
  process.stdout.write(JSON.stringify(evaluateTeleport(code, room)) + "\n");
  process.exit(0);
}

if (has("--collect-test")) {
  const room = parseInt(arg("--room", "168"), 10);
  const world = createWorld(prep, room);
  const blob = spawnBlob(prep, room, world);
  const item = (prep.itemsByRoom[room] ?? []).find((it) => it.placed && it.sprite !== 0xff && !world.collected[it.index]);
  if (!item) {
    process.stdout.write(JSON.stringify({ error: "no item", room }) + "\n");
    process.exit(1);
  }
  const pos = itemGamePos(item);
  blob.x = pos.x;
  blob.y = GAME_Y_ORIGIN - pos.y;
  tick(prep, blob, { left: false, right: false, up: true, down: false, fire: false }, world);
  const afterPick = {
    index: item.index,
    collected: world.collected[item.index],
    inventory: world.inventory,
    energy: world.energy,
    platforms: world.platforms,
    firepower: world.firepower,
  };
  enterRoom(prep, world, room === 0 ? 1 : 0);
  enterRoom(prep, world, room);
  process.stdout.write(
    JSON.stringify({
      afterPick,
      afterReturn: {
        collected: world.collected[item.index],
        extra: world.extra,
      },
    }) + "\n",
  );
  process.exit(0);
}

if (has("--timing")) {
  const repeat = parseInt(arg("--repeat", "80"), 10);
  const rooms = parseRooms(arg("--rooms", "0,16,168,255,511"), prep);
  const t0 = process.hrtime.bigint();
  let n = 0;
  for (let i = 0; i < repeat; i++) {
    for (const id of rooms) {
      renderRoom(prep, buf, rgba, id, { items: true, overlay: false });
      n += 1;
    }
  }
  const ns = Number(process.hrtime.bigint() - t0);
  const meanMs = ns / 1e6 / n;

  const liveId = rooms[0] ?? 0;
  const world = createWorld(prep, liveId);
  const blob = spawnBlob(prep, liveId, world);
  const none = { left: false, right: false, up: false, down: false };
  const liveRepeat = Math.max(n, 1);
  const t1 = process.hrtime.bigint();
  for (let i = 0; i < liveRepeat; i++) {
    tick(prep, blob, i % 17 === 0 ? { ...none, down: true } : none, world);
    renderWorld(prep, world, buf, rgba, blob.room, {
      items: true,
      overlay: false,
      enemies: true,
      blob: { x: blob.x, y: blob.y, set: "blobwr1", frame: 0 },
    });
  }
  const liveNs = Number(process.hrtime.bigint() - t1);
  const liveMeanMs = liveNs / 1e6 / liveRepeat;
  process.stdout.write(
    JSON.stringify({
      frames: n,
      mean_ms: meanMs,
      fps: 1000 / meanMs,
      live_frames: liveRepeat,
      live_mean_ms: liveMeanMs,
      live_fps: 1000 / liveMeanMs,
      rooms,
    }) + "\n",
  );
  process.exit(0);
}

const overlay = has("--overlay");
const items = !has("--no-items");
const outdir = arg("--outdir", "");
const roomList = has("--rooms")
  ? parseRooms(arg("--rooms", "0"), prep)
  : [parseInt(arg("--room", "0"), 10)];

if (outdir) {
  fs.mkdirSync(outdir, { recursive: true });
  const batch = [];
  for (const id of roomList) {
    renderRoom(prep, buf, rgba, id, { items, overlay });
    fs.writeFileSync(path.join(outdir, "room_" + id + ".rgba"), Buffer.from(rgba));
    batch.push(metaFor(prep, id));
  }
  process.stdout.write(JSON.stringify(batch) + "\n");
  process.exit(0);
}

const room = roomList[0]!;
renderRoom(prep, buf, rgba, room, { items, overlay });
if (has("--rgba")) fs.writeFileSync(arg("--rgba", "room.rgba"), Buffer.from(rgba));
if (has("--meta")) process.stdout.write(JSON.stringify(metaFor(prep, room)) + "\n");

void WIDTH;
void HEIGHT;
