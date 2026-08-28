import {
  A350_BYTES,
  CHEOPS_D2DE_ADD,
  CHEOPS_D2DE_MIN,
  CHEOPS_D2DE_MOD,
  CHEOPS_OFFERS,
  CHEOPS_SKIP_MAX,
  CHEOPS_SKIP_MIN,
  CHEOPS_SPRITE_MASK,
  CLEAR_ATTR,
  COLS,
  EXTRA_CHEOPS,
  EXTRA_DAC_ROLLS,
  EXTRA_EFFECTS,
  EXTRA_LIFE_PLUS,
  EXTRA_LIVES_SPRITE,
  EXTRA_MIN_DAC,
  EXTRA_SPRITE_BASE,
  GAME_Y_ORIGIN,
  INVENTORY_SLOTS,
  ITEM_KEY_ROOMS,
  ITEM_PAIR_ROOMS,
  ITEM_SHUFFLE,
  ITEM_TOOL_ROOMS,
  ITEM_DROP_RIGHT_MIN,
  ITEM_DROP_Y_BASE,
  ITEM_NEAR,
  ITEM_ORIGIN_ROWS,
  LIFT_ATTR,
  PLAY_ORIGIN,
  ROOM_COUNT,
  ROOM_SKIP,
  ROWS,
  STAT_CAP,
} from "./constants";
import { requestSfx } from "./audio/effects";
import { dacStep, seedDac } from "./entities";
import type { BlobState } from "./physics";
import type { InventoryItem, Item, Prepared, World } from "./types";

export function rebuildItemIndex(prep: Prepared): void {
  prep.itemsByRoom = Array.from({ length: ROOM_COUNT }, () => []);
  for (const it of prep.itemTable ?? []) {
    if (it.sprite === 0xff) continue;
    if (!it.placed) continue;
    if ((it.row & 0x7f) < PLAY_ORIGIN) continue;
    if (it.room === ROOM_SKIP) continue;
    if (it.room >= 0 && it.room < ROOM_COUNT) prep.itemsByRoom[it.room]!.push(it);
  }
}

function rrca3(a: number): number {
  let v = a & 0xff;
  for (let i = 0; i < 3; i++) v = ((v >> 1) | ((v & 1) << 7)) & 0xff;
  return v;
}

function dacReduce(a: number, n: number): number {
  let v = a & 0xff;
  const e = n & 0xff;
  if (e === 0) return 0;
  do v = (v - e) & 0xff;
  while (v >= e);
  return v;
}

function rollCoreSprites(world: World): void {
  const slots = Array.from({ length: 9 }, () => 0);
  for (let n = 5; n > 0; n--) {
    let sprite = 0;
    for (;;) {
      dacStep(world.dac);
      let a = world.dac.dac0 & 0xff;
      while (a >= 0x0f) a -= 0x0f;
      a = (a + 0x89) & 0xff;
      if (a >= 0x8f) a = (a + 0x0b) & 0xff;
      if (slots.includes(a)) continue;
      sprite = a;
      break;
    }
    let slot = 0;
    for (;;) {
      dacStep(world.dac);
      let e = world.dac.dac0 & 0xff;
      while (e >= 9) e -= 9;
      e = (e + 9) & 0xff;
      while (e >= 9) e -= 9;
      slot = e;
      if (slots[slot] === 0) break;
    }
    slots[slot] = sprite;
  }
  for (let b = 9; b > 0; b--) {
    if (slots[9 - b] === 0) slots[9 - b] = (0x89 - b) & 0xff;
  }
  world.d2de = slots;
  world.d2deNeed = slots.slice();
}

function writeShuffled(prep: Prepared, index: number, room: number, sprite: number): void {
  const src = prep.itemTemplate?.[index] ?? prep.itemTable?.[index];
  const it = prep.itemTable?.[index];
  if (!it) return;
  it.room = room & 0x1ff;
  it.sprite = sprite & 0xff;
  it.placed = false;
  it.attr_bits = (src?.attr_bits ?? 0) & 7;
  it.col = (it.attr_bits << 5) & 0xe0;
  it.row = (room >> 8) & 1 ? 0x80 : 0;
}

/** `$6351` / `$648A`: records 0–19 get a new room+sprite from FRAMES/`$DAC6`. */
export function shuffleCollectibles(prep: Prepared, world: World): void {
  if (!prep.itemTable || prep.itemTable.length < ITEM_SHUFFLE) return;
  if (prep.itemTemplate) {
    prep.itemTable = prep.itemTemplate.map((it) => ({ ...it, raw: [...(it.raw ?? [])] }));
  }
  dacStep(world.dac);
  writeShuffled(prep, 0, ITEM_KEY_ROOMS[world.dac.dac0 & 3]!, 0x0f);
  dacStep(world.dac);
  writeShuffled(prep, 1, ITEM_TOOL_ROOMS[world.dac.dac0 & 3]!, 0x10);
  rollCoreSprites(world);
  let c = 0;
  for (let pass = 0; pass < 2; pass++) {
    dacStep(world.dac);
    c = world.dac.dac0 & 7;
    for (let j = 0; j < 9; j++) {
      c = (c + 1) % 9;
      let sprite = (world.d2de[c] ?? 0) & 0x7f;
      if (pass === 1 && ((world.dac.dac0 >> 8) & 0xff) >= 0x96) sprite = (sprite & 7) + 0x1a;
      sprite &= 0x7f;
      dacStep(world.dac);
      const pair = ITEM_PAIR_ROOMS[pass * 9 + j]!;
      const room = (world.dac.dac0 & 0xff) < 0x7f ? pair[0]! : pair[1]!;
      writeShuffled(prep, 2 + pass * 9 + j, room, sprite);
    }
  }
  rebuildItemIndex(prep);
}

/** `$AA57`: one unplaced `$94E8` row for this room onto a `$90` marker. */
export function placeCollectiblesInRoom(prep: Prepared, world: World, room: number): void {
  if (room === ROOM_SKIP) return;
  const marks = prep.extraMarksByRoom?.[room] ?? [];
  if (!marks.length || !prep.itemTable) return;
  world.dac = seedDac(room);
  const slot = dacReduce(((world.dac.dac0 >> 8) ^ (world.d2c6 >> 8)) & 0x7f, marks.length);
  const mark = marks[slot]!;
  for (const it of prep.itemTable) {
    if (it.index >= ITEM_SHUFFLE) continue;
    if ((it.row & 0x7f) !== 0) continue;
    if (it.room !== room) continue;
    let mix = ((world.dac.dac2 & 0xff) ^ (world.d2c6 & 0xff)) & 0x3f;
    mix = dacReduce(mix, 6);
    mix = (mix + 2) & 0xff;
    const attr = rrca3(mix) & 0xe0;
    it.col = (mark.col & 0x1f) | attr;
    it.row = (it.row & 0x80) | (mark.row & 0x7f);
    it.placed = (it.row & 0x7f) >= PLAY_ORIGIN;
    it.attr_bits = attr >> 5;
    rebuildItemIndex(prep);
    break;
  }
}

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

/** $CC9A. Sprite $19 (Cheops) jumps to `$CCF1` — this table is not used. */
export function applyExtra(world: World, sprite: number): void {
  if (sprite === EXTRA_CHEOPS) {
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

function padInventory(inventory: InventoryItem[]): InventoryItem[] {
  const slots = inventory.slice(0, 4).map((it) => ({ sprite: it.sprite & 0xff, attr: it.attr & 0xff }));
  while (slots.length < 4) slots.push({ sprite: 0, attr: 0 });
  return slots;
}

/** `$CD32`: first sprite `<$09` or `≥$1A`; else last nonempty; empty → slot 0. */
export function pickCheopsSlot(inventory: InventoryItem[]): number {
  const slots = padInventory(inventory);
  for (let i = 0; i < 4; i++) {
    const a = slots[i]!.sprite & 0xff;
    if (a === 0) continue;
    if (a < CHEOPS_SKIP_MIN || a >= CHEOPS_SKIP_MAX) return i;
  }
  for (let i = 3; i >= 0; i--) {
    if ((slots[i]!.sprite & 0xff) !== 0) return i;
  }
  return 0;
}

/** Z80 `SUB n / JR NC` then `ADD m` → (a%n)−n+m. `$CD5D` SUB `$09` ADD `$0A`. */
function z80SubAdd(a: number, sub: number, add: number): number {
  let v = a & 0xff;
  while (v >= sub) v -= sub;
  return (v + add - sub) & 0xff;
}

function rollCheopsSprite(world: World): number {
  for (let n = 0; n < 4096; n++) {
    dacStep(world.dac);
    const idx = z80SubAdd(world.dac.dac0 & 0xff, CHEOPS_D2DE_MOD, CHEOPS_D2DE_ADD);
    const val = world.d2de[idx - 1] ?? 0;
    if (val < CHEOPS_D2DE_MIN) continue;
    return val & CHEOPS_SPRITE_MASK;
  }
  return 0;
}

/** `$CD56`: fill `$CCED`…`$CCEA` (key 4…1), `$CCEE` = given (key 5). */
export function rollCheopsOffers(world: World, given: number): number[] {
  const offers = [0, 0, 0, 0, given & 0xff];
  for (let i = CHEOPS_OFFERS - 2; i >= 0; i--) offers[i] = rollCheopsSprite(world);
  return offers;
}

/** `$CDEC` LD (HL),A — sprite only; attr stays. */
export function applyCheopsChoice(world: World, slot: number, offers: number[], choice: number): void {
  const spr = (offers[choice] ?? 0) & 0xff;
  while (world.inventory.length <= slot) world.inventory.push({ sprite: 0, attr: 0 });
  const it = world.inventory[slot];
  if (!it) world.inventory[slot] = { sprite: spr, attr: 0 };
  else it.sprite = spr;
}

function playAttr(prep: Prepared, world: World, room: number, col: number, playRow: number): number {
  if (col < 0 || playRow < 0 || col >= COLS || playRow >= ROWS) return CLEAR_ATTR;
  const fromWorld = world.terrain.attr[playRow * COLS + col];
  if (fromWorld !== undefined) return fromWorld;
  return prep.rooms[room]?.attributes[playRow]?.[col] ?? CLEAR_ATTR;
}

/** `$D267`: 2×2 at (col, screen-row); A=0 when every cell has bit 6 and is not `$64`. */
function dropCellClear(prep: Prepared, world: World, room: number, col: number, screenRow: number): boolean {
  const playRow = screenRow - PLAY_ORIGIN;
  for (const dc of [0, 1]) {
    for (const dr of [0, 1]) {
      const attr = playAttr(prep, world, room, col + dc, playRow + dr);
      if ((attr & 0x40) === 0) return false;
      if (attr === LIFT_ATTR) return false;
    }
  }
  return true;
}

/**
 * `$D204`–`$D235`: blob cell, then left col−1 if `$D267` clear, else col+2
 * when col `< $1D`, else the original column. Row is (`$BF`−`$DD1E`)≫3.
 */
export function overflowDropCell(prep: Prepared, blob: BlobState, world: World): { col: number; row: number } {
  const gameY = GAME_Y_ORIGIN - blob.y;
  let col = (blob.x >> 3) & 0x1f;
  const row = ((ITEM_DROP_Y_BASE - gameY) >> 3) & 0x1f;
  if (col >= 1 && dropCellClear(prep, world, blob.room, col - 1, row)) {
    return { col: col - 1, row };
  }
  if (col < ITEM_DROP_RIGHT_MIN && dropCellClear(prep, world, blob.room, col + 2, row)) {
    return { col: col + 2, row };
  }
  return { col, row };
}

function findItem(prep: Prepared, index: number): Item | undefined {
  for (const list of prep.itemsByRoom) {
    const hit = list.find((it) => it.index === index);
    if (hit) return hit;
  }
  return undefined;
}

/** `$D236`: rewrite the overflowed `$94E8` row into the current room and `$AA02`. */
function dropOverflowItem(prep: Prepared, blob: BlobState, world: World, dropped: InventoryItem): void {
  if (dropped.index === undefined) return;
  const item = findItem(prep, dropped.index);
  if (!item) return;
  const dest = overflowDropCell(prep, blob, world);
  const fromRoom = item.room;
  if (fromRoom !== blob.room) {
    const old = prep.itemsByRoom[fromRoom];
    if (old) {
      const i = old.indexOf(item);
      if (i >= 0) old.splice(i, 1);
    }
    if (blob.room >= 0 && blob.room < ROOM_COUNT) {
      (prep.itemsByRoom[blob.room] ??= []).push(item);
    }
  }
  item.room = blob.room;
  item.col = dest.col & 0x1f;
  item.row = dest.row & 0x7f;
  item.sprite = dropped.sprite & 0xff;
  item.placed = true;
  world.collected[dropped.index] = 0;
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
    world.inventory.unshift({ sprite: it.sprite, attr: it.attr_bits, index: it.index });
    if (world.inventory.length > INVENTORY_SLOTS) {
      dropOverflowItem(prep, blob, world, world.inventory.pop()!);
    }
    requestSfx(world, 0x0c);
    return;
  }
}

/**
 * $CB8A extras + $94E8 Up-alone. Teleport $0D and hoverpad $0C are walkSpecialObjects.
 */
export function tickPickup(prep: Prepared, blob: BlobState, input: { left: boolean; right: boolean; up: boolean; down?: boolean; fire?: boolean }, world: World): "cheops" | void {
  const bx = blob.x;
  const by = GAME_Y_ORIGIN - blob.y;
  if (world.extra && nearItem(bx, by, world.extra.x, world.extra.y)) {
    if (world.extra.sprite === EXTRA_CHEOPS) {
      if (input.up) return "cheops";
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
