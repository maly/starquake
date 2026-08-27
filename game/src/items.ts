import {
  A350_BYTES,
  EXTRA_CHEOPS,
  EXTRA_DAC_ROLLS,
  EXTRA_EFFECTS,
  EXTRA_LIFE_PLUS,
  EXTRA_LIVES_SPRITE,
  EXTRA_MIN_DAC,
  EXTRA_SPRITE_BASE,
  GAME_Y_ORIGIN,
  ITEM_NEAR,
  ITEM_ORIGIN_ROWS,
  ROOM_SKIP,
  STAT_CAP,
} from "./constants";
import { requestSfx } from "./audio/effects";
import { dacStep, seedDac } from "./entities";
import type { BlobState } from "./physics";
import type { Item, Prepared, World } from "./types";

export function itemGamePos(item: Item): { x: number; y: number } {
  const col = item.col & 0x1f;
  const row = item.row & 0x7f;
  return { x: (col << 3) & 0xff, y: (((ITEM_ORIGIN_ROWS - row) << 3) - 1) & 0xff };
}

export function nearItem(ax: number, ay: number, bx: number, by: number): boolean {
  return Math.abs(ax - bx) < ITEM_NEAR && Math.abs(ay - by) < ITEM_NEAR;
}

/** $ABBE / $ABF0: bit for `room` in the 128-byte map. */
export function a350Allows(a350: Uint8Array, room: number): boolean {
  const high = (room >> 8) & 1;
  const low = room & 0xff;
  const offset = ((high >> 3) | ((low & 0xf8) >> 3)) & 0xff;
  let value = a350[offset] ?? 0;
  for (let i = 0; i < (low & 7) + 1; i++) value = ((value << 1) | (value >> 7)) & 0xff;
  return (value & 1) !== 0;
}

/** $ABE1 / $A801: clear the room bit (caller A=0). */
export function clearA350Bit(a350: Uint8Array, room: number): void {
  const high = (room >> 8) & 1;
  const low = room & 0xff;
  const offset = ((high >> 3) | ((low & 0xf8) >> 3)) & 0xff;
  const rot = (low & 7) + 1;
  let value = a350[offset] ?? 0;
  for (let i = 0; i < rot; i++) value = ((value << 1) | (value >> 7)) & 0xff;
  value = (value & 0xfe) & 0xff;
  for (let i = 0; i < rot; i++) value = ((value >> 1) | ((value & 1) << 7)) & 0xff;
  a350[offset] = value;
}

export function freshA350(): Uint8Array {
  return new Uint8Array(A350_BYTES).fill(0xff);
}

/** $D425: cap energy/platforms/firepower at $7F. Lives ($D2CC) are not cut. */
function capEnergyPlatformsFire(world: World): void {
  if (world.energy > STAT_CAP) world.energy = STAT_CAP;
  if (world.platforms > STAT_CAP) world.platforms = STAT_CAP;
  if (world.firepower > STAT_CAP) world.firepower = STAT_CAP;
}

/**
 * $CCCC: extra $17 picks which $CCBC row to apply.
 * Lives==0 → A=$18. Else walk energy/platforms/firepower with A=$FF;
 * on A≥(HL) record E=2×(3−B) and replace A with (HL); return E+$12.
 */
function ccccSprite(world: World): number {
  if ((world.lives & 0xff) === 0) return EXTRA_LIFE_PLUS;
  let a = 0xff;
  let e = 0;
  const stats = [world.energy & 0xff, world.platforms & 0xff, world.firepower & 0xff];
  for (let b = 3; b !== 0; b--) {
    const hl = stats[3 - b]!;
    if (a < hl) continue;
    e = ((3 - b) << 1) & 0xff;
    a = hl;
  }
  return (e + 0x12) & 0xff;
}

/** $CC9A. Sprite $19 (Cheops) is recorded only — no exchange UI. */
export function applyExtra(world: World, sprite: number): void {
  if (sprite === EXTRA_CHEOPS) {
    world.cheops = true;
    return;
  }
  let a = sprite & 0xff;
  if (a === EXTRA_LIVES_SPRITE) a = ccccSprite(world);
  const row = EXTRA_EFFECTS[a - EXTRA_SPRITE_BASE];
  if (!row) return;
  const [off, add] = row;
  if (off === 0) world.lives = (world.lives + add) & 0xff;
  else if (off === 1) world.energy = (world.energy + add) & 0xff;
  else if (off === 2) world.platforms = (world.platforms + add) & 0xff;
  else if (off === 3) world.firepower = (world.firepower + add) & 0xff;
  capEnergyPlatformsFire(world);
  requestSfx(world, off);
}

function extraPos(col: number, row: number): { x: number; y: number } {
  return { x: (col << 3) & 0xff, y: (((ITEM_ORIGIN_ROWS - row) << 3) - 1) & 0xff };
}

/**
 * $AAB6 after the $A350 bit test. $96CB markers come from $A90F nibble $90
 * (rooms+blocks+block_attrs raw), not drawn attr $90 — that nibble never lands
 * in the Spectrum grid. $DAC6 after $A80A is not fully replayed.
 */
function itemOccupiesMark(prep: Prepared, room: number, col: number, row: number, world: World): boolean {
  for (const it of prep.itemsByRoom[room] ?? []) {
    if (world.collected[it.index]) continue;
    if ((it.col & 0x1f) === (col & 0x1f) && (it.row & 0x7f) === (row & 0x7f)) return true;
  }
  return false;
}

export function spawnExtra(prep: Prepared, world: World, room: number): void {
  world.extra = null;
  if (room === ROOM_SKIP) return;
  if (!a350Allows(world.a350, room)) return;
  const marks = prep.extraMarksByRoom?.[room] ?? [];
  if (marks.length < 2) return;
  // Prefer marks without a live $94E8 item — same cell XOR of item+extra looks garbled (#416).
  const free = marks.filter((m) => !itemOccupiesMark(prep, room, m.col, m.row, world));
  const pool = free.length > 0 ? free : marks;
  world.dac = seedDac(room);
  for (let i = 0; i < EXTRA_DAC_ROLLS; i++) dacStep(world.dac);
  if ((world.dac.dac0 & 0xff) < EXTRA_MIN_DAC) return;
  dacStep(world.dac);
  let slot = (world.dac.dac0 & 0x7f) % pool.length;
  const mark = pool[slot]!;
  dacStep(world.dac);
  let kind = world.dac.dac0 & 0xff;
  while (kind >= 9) kind -= 9;
  if (kind === 8) {
    dacStep(world.dac);
    if ((world.dac.dac2 & 0xff) >= 0x7f) kind = 0;
  }
  const sprite = kind + EXTRA_SPRITE_BASE;
  dacStep(world.dac);
  let ink = world.dac.dac2 & 0x3f;
  while (ink >= 6) ink -= 6;
  ink = (ink + 2) & 7;
  const pos = extraPos(mark.col, mark.row);
  world.extra = {
    sprite,
    ink,
    col: mark.col,
    row: mark.row,
    x: pos.x,
    y: pos.y,
  };
}

function collectTableItem(prep: Prepared, blob: BlobState, world: World): void {
  const list = prep.itemsByRoom[blob.room] ?? [];
  const bx = blob.x;
  const by = GAME_Y_ORIGIN - blob.y;
  for (const it of list) {
    if (it.sprite === 0xff) continue;
    if (!it.placed) continue;
    if (world.collected[it.index]) continue;
    const pos = itemGamePos(it);
    if (!nearItem(bx, by, pos.x, pos.y)) continue;
    world.collected[it.index] = 1;
    world.inventory.unshift({ sprite: it.sprite, attr: it.attr_bits });
    if (world.inventory.length > 4) world.inventory.pop();
    requestSfx(world, 0x0c);
    return;
  }
}

/**
 * $CB8A extras + $94E8 Up-alone. Teleport $0D and hoverpad $0C are walkSpecialObjects.
 */
export function tickPickup(prep: Prepared, blob: BlobState, input: { left: boolean; right: boolean; up: boolean; down?: boolean; fire?: boolean }, world: World): void {
  const bx = blob.x;
  const by = GAME_Y_ORIGIN - blob.y;
  if (world.extra && nearItem(bx, by, world.extra.x, world.extra.y)) {
    if (world.extra.sprite === EXTRA_CHEOPS) {
      if (input.up && !input.left && !input.right) world.cheops = true;
    } else {
      applyExtra(world, world.extra.sprite);
      clearA350Bit(world.a350, blob.room);
      world.extra = null;
    }
  }
  const upOnly = Boolean(input.up) && !input.left && !input.right && !input.down && !input.fire;
  if (!upOnly) {
    world.pickupLatch = false;
    return;
  }
  if (world.pickupLatch) return;
  world.pickupLatch = true;
  collectTableItem(prep, blob, world);
}
