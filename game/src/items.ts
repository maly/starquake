import {
  A350_BYTES,
  COLS,
  EXTRA_CHEOPS,
  EXTRA_DAC_ROLLS,
  EXTRA_EFFECTS,
  EXTRA_MIN_DAC,
  EXTRA_SPRITE_BASE,
  GAME_Y_ORIGIN,
  ITEM_NEAR,
  ITEM_ORIGIN_ROWS,
  PLAY_ORIGIN,
  ROWS,
  ROOM_SKIP,
  STAT_CAP,
} from "./constants";
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

function clampStat(v: number): number {
  if (v < 0) return 0;
  if (v > STAT_CAP) return STAT_CAP;
  return v;
}

/** $CC9A. Sprite $19 (Cheops) is recorded only — no exchange UI. */
export function applyExtra(world: World, sprite: number): void {
  if (sprite === EXTRA_CHEOPS) {
    world.cheops = true;
    return;
  }
  const row = EXTRA_EFFECTS[sprite - EXTRA_SPRITE_BASE];
  if (!row) return;
  const [off, add] = row;
  if (off === 0) world.lives = clampStat(world.lives + add);
  else if (off === 1) world.energy = clampStat(world.energy + add);
  else if (off === 2) world.platforms = clampStat(world.platforms + add);
  else if (off === 3) world.firepower = clampStat(world.firepower + add);
}

function markers90(world: World): Array<{ col: number; row: number }> {
  const out: Array<{ col: number; row: number }> = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      if (world.terrain.attr[row * COLS + col] === 0x90) {
        out.push({ col, row: row + PLAY_ORIGIN });
      }
    }
  }
  return out;
}

function extraPos(col: number, row: number): { x: number; y: number } {
  return { x: (col << 3) & 0xff, y: (((ITEM_ORIGIN_ROWS - row) << 3) - 1) & 0xff };
}

/**
 * $AAB6 after the $A350 bit test. Uses $90-attr cells as $96CB markers.
 * $DAC6 after $A80A is not fully replayed; type/effect still come from $CCBC.
 */
export function spawnExtra(_prep: Prepared, world: World, room: number): void {
  world.extra = null;
  if (room === ROOM_SKIP) return;
  if (!a350Allows(world.a350, room)) return;
  const marks = markers90(world);
  if (marks.length < 2) return;
  world.dac = seedDac(room);
  for (let i = 0; i < EXTRA_DAC_ROLLS; i++) dacStep(world.dac);
  if ((world.dac.dac0 & 0xff) < EXTRA_MIN_DAC) return;
  dacStep(world.dac);
  let slot = (world.dac.dac0 & 0x7f) % marks.length;
  const mark = marks[slot]!;
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
