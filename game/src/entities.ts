import {
  ANNOY_DRAIN_BUMP,
  APPEAR_FRAMES,
  APPEAR_GRAPHIC,
  COLS,
  DEAD_GRAPHIC,
  DIE_FRAMES,
  DIR_TABLE,
  ENTITY_DRAW_MIN,
  ENTITY_DUMMY_PTR,
  ENTITY_PARK_Y,
  ENEMY_SETS,
  ENERGY_DRAIN_STEP,
  ENERGY_DRAIN_WRAP,
  GAME_Y_ORIGIN,
  GRAFIX_BASE,
  GRAFIX_STRIDE,
  HIT_DX,
  HIT_DY,
  KILL_GRAPHIC_HI,
  NASTY_EDGE_D,
  NASTY_EDGE_L,
  NASTY_EDGE_R,
  NASTY_EDGE_U,
  NASTY_INNER_STEPS,
  NASTY_SLOTS,
  NASTY_SPEED,
  ROOM_DATA_BASE,
  ROOM_DATA_STRIDE,
  ROWS,
  SPAWN_GUARD,
} from "./constants";
import type { BlobState } from "./physics";
import type { DacState, Entity, EntityCache, Prepared, World } from "./types";

function cellAttr(world: World, col: number, row: number): number {
  if (col < 0 || row < 0 || col >= COLS || row >= ROWS) return 0x47;
  return world.terrain.attr[row * COLS + col]!;
}

function cellSolid(world: World, col: number, row: number): boolean {
  return (cellAttr(world, col, row) & 0x40) === 0;
}

export function cloneEntity(e: Entity): Entity {
  return { ...e };
}

/** $D8B1: skip when X|Y < $10. Parking is X=0 Y=$0F with dummy $DF40 ($9E83). */
export function entityVisible(e: Entity): boolean {
  if (e.y === 0) return false;
  if (e.ptr === ENTITY_DUMMY_PTR) return false;
  return (e.x | e.y) >= ENTITY_DRAW_MIN;
}

export function setForPtr(ptr: number): string {
  const n = Math.max(0, Math.round((ptr - GRAFIX_BASE) / GRAFIX_STRIDE));
  return ENEMY_SETS[n] ?? "alien1";
}

export function dacStep(d: DacState): void {
  let hl = d.dac0 & 0xffff;
  const bc = hl;
  hl = ((hl << 8) | (hl >> 8)) & 0xffff;
  hl = (hl + bc + 0x29 + (d.dac2 & 0xffff)) & 0xffff;
  d.dac0 = hl;
  d.db19 = (d.db19 - 1) & 0xff;
  if (d.db19 !== 0) return;
  d.db19 = 5;
  let dac2 = d.dac2 & 0xffff;
  hl = (dac2 * 16 + dac2 + 0xc5 + (d.dac4 & 0xffff)) & 0xffff;
  d.dac2 = hl;
  d.db1a = (d.db1a - 1) & 0xff;
  if (d.db1a !== 0) return;
  d.db1a = 0x0b;
  hl = d.dac4 & 0xffff;
  hl = (((hl + hl + (d.dac0 & 0xffff)) & 0xffff) + (hl + hl + (d.dac0 & 0xffff)) + 0x4bbb) & 0xffff;
  d.dac4 = hl;
}

export function seedDac(room: number): DacState {
  const addr = ROOM_DATA_BASE + room * ROOM_DATA_STRIDE;
  return { dac0: addr, dac2: 0, dac4: addr, db19: 3, db1a: 3 };
}

function modBias(a: number, sub: number, add: number): number {
  let v = a & 0xff;
  while (v >= sub) v -= sub;
  return (v + add) & 0xff;
}

function emptyish(attr: number): boolean {
  return (attr & 0x60) === 0x40;
}

function spawnCellOk(world: World, x: number, y: number): boolean {
  const col = x >> 3;
  const row = (GAME_Y_ORIGIN - y) >> 3;
  for (const [dc, dr] of [
    [0, 0],
    [1, 0],
    [0, 1],
    [1, 1],
  ] as const) {
    if (!emptyish(cellAttr(world, col + dc, row + dr))) return false;
  }
  return true;
}

function rotateDac0(world: World, times: number): number {
  let a = world.dac.dac0 & 0xff;
  for (let i = 0; i < times; i++) a = ((a << 1) | (a >> 7)) & 0xff;
  return a;
}

function pickDir(world: World, slot: number, mask: number): number {
  const v = rotateDac0(world, slot) & mask;
  return DIR_TABLE[v & 7]!;
}

function makeEntity(ptr: number): Entity {
  return {
    x: 0,
    y: ENTITY_PARK_Y,
    ink: 4,
    set: "corepieces1",
    frame: 0,
    ptr: ENTITY_DUMMY_PTR,
    basePtr: ptr,
    dir: 0x55,
    speedX: NASTY_SPEED,
    speedY: NASTY_SPEED,
    period: 4,
    timer: 8,
    state: 0,
    stateTimer: 0,
    ai: 0,
    aiPeriod: 8,
    aiCount: 8,
    homeX: 0,
    homeY: 0x0f,
  };
}

/** $9DC2 fill of one slot, using $DAC6. */
export function spawnOne(prep: Prepared, room: number, world: World, slot: number): Entity {
  dacStep(world.dac);
  const kind = modBias(world.dac.dac0 & 0xff, 0x0f, 0x11) & 0x1f;
  const ptr = GRAFIX_BASE + (kind % ENEMY_SETS.length) * GRAFIX_STRIDE;
  const e = makeEntity(ptr);
  e.ink = (world.dac.dac0 >> 5) & 7;
  e.period = modBias((world.dac.dac2 >> 4) & 0xff, 5, 9) || 4;
  e.timer = world.dac.dac2 & 0xff;
  e.aiPeriod = modBias(world.dac.dac4 & 0x0f, 5, 5) || 8;
  if (e.aiPeriod === 0) e.aiPeriod = 0x64;
  e.aiCount = 8;
  e.ai = modBias((world.dac.dac4 >> 8) & 0x0f, 5, 5);
  if (kind === 2) e.ai = 5;
  e.dir = 0x55;
  e.set = "corepieces1";
  let x = 16;
  let y = 40;
  for (let attempt = 0; attempt < 0x64; attempt++) {
    dacStep(world.dac);
    const lo = world.dac.dac0 & 0xff;
    if (lo & 1) {
      y = ((modBias(lo, 9, 0x0f) << 3) - 1) & 0xff;
      x = world.dac.dac2 & 1 ? 0x02 : 0xee;
    } else {
      x = (modBias(lo, 0x17, 0x1b) << 3) & 0xff;
      y = world.dac.dac2 & 1 ? 0x11 : 0x8d;
    }
    if (spawnCellOk(world, x, y)) {
      e.homeX = x;
      e.homeY = y;
      return e;
    }
  }
  e.y = 0;
  e.homeY = 0;
  return e;
}

export function spawnNasties(prep: Prepared, room: number, world: World): void {
  world.dac = seedDac(room);
  dacStep(world.dac);
  world.entities = [];
  for (let i = 0; i < NASTY_SLOTS; i++) world.entities.push(spawnOne(prep, room, world, i + 1));
  world.nastyCount = NASTY_SLOTS;
  world.spawnGuard = SPAWN_GUARD;
}

export function enterNasties(prep: Prepared, world: World, room: number): void {
  const outgoing: EntityCache = { room: world.cacheRoom, entities: world.entities.map(cloneEntity) };
  const incoming = world.entityCache;
  world.entityCache = outgoing;
  if (incoming && incoming.room === room && world.spawnGuard !== 0) {
    world.entities = incoming.entities.map(cloneEntity);
    world.nastyCount = NASTY_SLOTS;
  } else {
    spawnNasties(prep, room, world);
  }
  world.cacheRoom = room;
}

function isLethal(e: Entity): boolean {
  return (e.ptr >> 8) < KILL_GRAPHIC_HI;
}

function hitBlob(e: Entity, blob: BlobState): boolean {
  if (e.y === 0 || e.state !== 1) return false;
  const dx = Math.abs(e.x - blob.x);
  const dy = Math.abs(e.y - (GAME_Y_ORIGIN - blob.y));
  return dx < HIT_DX && dy < HIT_DY;
}

function applyContact(e: Entity, blob: BlobState, world: World): void {
  if (!hitBlob(e, blob)) return;
  if (isLethal(e)) {
    world.energy = 0;
    return;
  }
  world.energyDrain = (world.energyDrain + ANNOY_DRAIN_BUMP) & 0xff;
}

function bounceH(e: Entity, world: World): void {
  if (e.x < NASTY_EDGE_L) {
    e.dir = (e.dir & 0xfc) | 1;
    return;
  }
  if (e.x >= NASTY_EDGE_R) {
    e.dir = (e.dir & 0xfc) | 2;
    return;
  }
  const playY = GAME_Y_ORIGIN - e.y;
  if ((e.x & 7) !== 0) return;
  const col = e.x >> 3;
  const top = playY >> 3;
  let left = false;
  let right = false;
  for (let r = 0; r < 2; r++) {
    if (cellSolid(world, col - 1, top + r)) left = true;
    if (cellSolid(world, col + 2, top + r)) right = true;
  }
  const bits = (right ? 1 : 0) | (left ? 2 : 0);
  if (!bits) return;
  e.dir = (e.dir & 0xfc) | (bits ^ 3);
}

function bounceV(e: Entity, world: World): void {
  if (e.ai === 6) return;
  if (e.y < NASTY_EDGE_D) {
    e.dir = (e.dir & 0xf3) | 8;
    return;
  }
  if (e.y >= NASTY_EDGE_U) {
    e.dir = (e.dir & 0xf3) | 4;
    return;
  }
  const playY = GAME_Y_ORIGIN - e.y;
  if (((e.y + 1) & 7) !== 0) return;
  const cols = (e.x & 7) === 0 ? [e.x >> 3, (e.x >> 3) + 1] : [e.x >> 3, (e.x >> 3) + 1, (e.x >> 3) + 2];
  const floor = (playY + 16) >> 3;
  const ceil = (playY >> 3) - 1;
  let down = false;
  let up = false;
  for (const c of cols) {
    if (cellSolid(world, c, floor)) down = true;
    if (cellSolid(world, c, ceil)) up = true;
  }
  const bits = (down ? 4 : 0) | (up ? 8 : 0);
  if (!bits) return;
  e.dir = (e.dir & 0xf3) | (bits ^ 0x0c);
}

function skip64(e: Entity, world: World): boolean {
  if ((e.x & 7) !== 0 || ((e.y + 1) & 7) !== 0) return false;
  const col = e.x >> 3;
  const row = (GAME_Y_ORIGIN - e.y) >> 3;
  for (const [dc, dr] of [
    [0, 0],
    [1, 0],
    [0, 1],
    [1, 1],
  ] as const) {
    if ((cellAttr(world, col + dc, row + dr) & 0x7f) === 0x64) return true;
  }
  return false;
}

function think(e: Entity, blob: BlobState, world: World, slot: number): void {
  e.aiCount -= 1;
  if (e.aiCount !== 0) return;
  e.aiCount = e.aiPeriod === 0x64 ? e.aiPeriod : e.aiPeriod;
  if (e.aiPeriod === 0x64) {
    e.aiCount = ((world.dac.dac0 >> 8) & 3) + 1;
    e.aiCount <<= 1;
  }
  switch (e.ai) {
    case 0:
      if ((e.dir & 0x0b) === 0) e.dir |= 2;
      if ((e.dir & 0x0c) === 0) e.dir |= 8;
      break;
    case 1:
      e.speedX = NASTY_SPEED;
      e.speedY = NASTY_SPEED;
      e.dir = DIR_TABLE[(rotateDac0(world, slot) & 3) << 1]!;
      break;
    case 2:
      e.speedX = NASTY_SPEED;
      e.speedY = NASTY_SPEED;
      e.dir = pickDir(world, slot, 7);
      break;
    case 3: {
      e.speedX = NASTY_SPEED;
      e.speedY = NASTY_SPEED;
      const bits = rotateDac0(world, slot);
      let n = 0;
      let a = bits;
      for (let i = 0; i < 4; i++) {
        if (a & 1) n += 1;
        a >>= 1;
      }
      if (n === 1) break;
      const hi = (world.dac.dac0 >> 8) & 0xff;
      if (hi & 0x80) break;
      const s = (hi & 1) + 1;
      e.speedX = s;
      e.speedY = (s ^ 3) & 3 || 1;
      break;
    }
    case 4: {
      const bx = blob.x;
      const by = GAME_Y_ORIGIN - blob.y;
      let dir = 0;
      dir |= e.x < bx ? 1 : 2;
      dir |= e.y < by ? 8 : 4;
      e.dir = dir;
      break;
    }
    case 5:
      e.dir = 0;
      if (rotateDac0(world, slot) & 1) break;
      if ((world.dac.dac0 & 0xff) < 0x46) {
        const bx = blob.x;
        const by = GAME_Y_ORIGIN - blob.y;
        e.dir = (e.x < bx ? 1 : 2) | (e.y < by ? 8 : 4);
      } else {
        e.ai = 3;
      }
      break;
    case 6:
      if ((e.dir & 3) === 0) e.dir = (e.dir & 0xfc) | 1;
      break;
    default:
      break;
  }
}

function appearOrDie(e: Entity): boolean {
  if (e.state === 2) {
    e.ptr = DEAD_GRAPHIC;
    e.set = "stars";
    e.stateTimer += 1;
    if (e.stateTimer >= DIE_FRAMES) {
      e.y = 0;
      e.x = 0;
    }
    return true;
  }
  if (e.state !== 0) return false;
  const was = e.stateTimer;
  e.stateTimer += 1;
  if (was === 0) {
    e.x = e.homeX;
    e.y = e.homeY;
    e.ptr = APPEAR_GRAPHIC;
    e.set = "corepieces1";
  }
  if (was === APPEAR_FRAMES) {
    e.state = 1;
    e.stateTimer = 0;
    e.ptr = e.basePtr;
    e.set = setForPtr(e.basePtr);
  }
  return false;
}

function stepMove(e: Entity, world: World): void {
  bounceH(e, world);
  if (skip64(e, world)) return;
  if (e.dir & 1) e.x = (e.x + e.speedX) & 0xff;
  if (e.dir & 2) e.x = (e.x - e.speedX) & 0xff;
  bounceV(e, world);
  if (e.dir & 4) e.y = (e.y - e.speedY) & 0xff;
  if (e.dir & 8) e.y = (e.y + e.speedY) & 0xff;
}

function stepOne(e: Entity, prep: Prepared, blob: BlobState, world: World, slot: number): void {
  if (e.y === 0) return;
  applyContact(e, blob, world);
  e.timer = (e.timer - 1) & 0xff;
  if (e.timer !== 0) return;
  e.timer = e.period;
  if (appearOrDie(e) && e.y === 0) return;
  if (e.state === 2) return;
  think(e, blob, world, slot);
  stepMove(e, world);
}

/** $A01B: one $DAC6, then slots $9C43..1, 4 inner steps each. */
export function tickNasties(prep: Prepared, blob: BlobState, world: World): void {
  if (world.spawnGuard) world.spawnGuard -= 1;
  dacStep(world.dac);
  const n = Math.min(world.nastyCount, world.entities.length);
  for (let slot = n; slot >= 1; slot--) {
    const e = world.entities[slot - 1];
    if (!e) continue;
    for (let i = 0; i < NASTY_INNER_STEPS; i++) stepOne(e, prep, blob, world, slot);
  }
}

export function tickEnergyDrain(world: World): void {
  world.energyDrain = (world.energyDrain + 1) & 0xff;
  if (world.energyDrain < ENERGY_DRAIN_WRAP) return;
  world.energyDrain = 0;
  world.energy = Math.max(0, world.energy - ENERGY_DRAIN_STEP);
}

export function entityPlayY(e: Entity): number {
  return GAME_Y_ORIGIN - e.y;
}
