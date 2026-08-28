import {
  BRIGHT,
  CELL,
  CLEAR_ATTR,
  COLS,
  CORE_D2DE_INIT,
  CORE_PANEL_ATTR_COL,
  CORE_PANEL_ATTR_ROW,
  CORE_PANEL_INK_DONE,
  CORE_PANEL_INK_PENDING,
  CORE_PANEL_STEP,
  CORE_ROOM,
  CORE_SLOTS,
  GAME_Y_ORIGIN,
  GRAFIX_FRAME,
  HEIGHT,
  MAP_COLS,
  MAP_ROWS,
  PLAY_ORIGIN,
  ROOM_COUNT,
  ROOM_SKIP,
  ROWS,
  SPECTRUM,
  WIDTH,
} from "./constants";
import { entityVisible, grafixAnimFrame } from "./entities";
import { rebuildItemIndex } from "./items";
import { hotspotsFromData } from "./objects";
import type { Buffers, ExtraObject, GameData, Graphic, Item, Prepared, Pulse, RenderOpts, Rgb, World } from "./types";

export function paperInk(attr: number): [Rgb, Rgb] {
  const table = attr & 0x40 ? BRIGHT : SPECTRUM;
  return [table[(attr >> 3) & 7], table[attr & 7]];
}

/** $D280: BIT 6 set and the byte is not $64. */
export function isSolid(attr: number): boolean {
  return (attr & 0x40) !== 0 && attr !== 0x64;
}

export function roomCol(id: number): number {
  return id % MAP_COLS;
}

export function roomRow(id: number): number {
  return (id / MAP_COLS) | 0;
}

export function moveRoom(id: number, dx: number, dy: number): number {
  const c = roomCol(id) + dx;
  const r = roomRow(id) + dy;
  if (c < 0 || c >= MAP_COLS || r < 0 || r >= MAP_ROWS) return id;
  return r * MAP_COLS + c;
}

export function clampRoom(id: number): number {
  if (id < 0) return 0;
  if (id >= ROOM_COUNT) return ROOM_COUNT - 1;
  return id | 0;
}

export function prepare(data: GameData): Prepared {
  const graphics: Graphic[] = [];
  for (const g of data.graphics.graphics) graphics[g.id] = g;
  const sprites: Graphic[] = [];
  for (const g of data.sprites.graphics) sprites[g.id] = g;
  const actorsBySet = new Map<string, Graphic[]>();
  const actorsByPtr = new Map<number, Graphic>();
  if (data.actors) {
    for (const g of data.actors.graphics) {
      const name = g.set ?? "";
      const list = actorsBySet.get(name) ?? [];
      list.push(g);
      actorsBySet.set(name, list);
      actorsByPtr.set(g.ptr, g);
    }
    for (const list of actorsBySet.values()) {
      list.sort((a, b) => (a.frame ?? 0) - (b.frame ?? 0));
    }
  }
  const blocks = data.blocks.blocks.map((b) => b.subblocks);
  const itemTable: Item[] = data.items.items.map((it) => ({ ...it, raw: [...(it.raw ?? [])] }));
  const itemTemplate: Item[] = itemTable.map((it) => ({ ...it, raw: [...it.raw] }));
  const itemsByRoom: Item[][] = Array.from({ length: ROOM_COUNT }, () => []);
  const rooms = data.rooms.rooms;
  const {
    stationsByRoom,
    teleportsByRoom,
    killsByRoom,
    pulsesByRoom,
    fixedNastiesByRoom,
    extraMarksByRoom,
    doorsByRoom,
    socketsByRoom,
    passagesByRoom,
    machinesByRoom,
  } = hotspotsFromData(data, rooms, blocks);
  const prep = {
    graphics,
    sprites,
    actorsBySet,
    actorsByPtr,
    blocks,
    rooms,
    itemsByRoom,
    itemTable,
    itemTemplate,
    stationsByRoom,
    teleportsByRoom,
    killsByRoom,
    pulsesByRoom,
    fixedNastiesByRoom,
    extraMarksByRoom,
    doorsByRoom,
    socketsByRoom,
    passagesByRoom,
    machinesByRoom,
  };
  rebuildItemIndex(prep);
  return prep;
}

export function newBuffers(): Buffers {
  return {
    data: new Uint8Array(COLS * ROWS * CELL),
    attr: new Uint8Array(COLS * ROWS),
  };
}

export function copyBuffers(src: Buffers, dst: Buffers): void {
  dst.data.set(src.data);
  dst.attr.set(src.attr);
}

export function newRgba(): Uint8ClampedArray {
  return new Uint8ClampedArray(WIDTH * HEIGHT * 4);
}

function clearBuffers(buf: Buffers): void {
  buf.data.fill(0);
  buf.attr.fill(CLEAR_ATTR);
}

function blitGraphic(prep: Prepared, buf: Buffers, ident: number, x: number, y: number): void {
  const graphic = prep.graphics[ident];
  if (!graphic?.cells?.length) return;
  for (const cell of graphic.cells) {
    const cy = y + cell.row;
    const cx = x + cell.col;
    if (cx < 0 || cy < 0 || cx >= COLS || cy >= ROWS) continue;
    const dst = (cy * COLS + cx) * CELL;
    for (let py = 0; py < CELL; py++) buf.data[dst + py] = cell.data[py]!;
  }
}

function blitBlock(prep: Prepared, buf: Buffers, ident: number, x: number, y: number): void {
  const sub = prep.blocks[ident];
  if (!sub) return;
  let rx = x + 4;
  let ry = y + 3;
  let k = 0;
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 2; col++) {
      blitGraphic(prep, buf, sub[k]!, rx, ry);
      k += 1;
      rx -= 4;
    }
    rx = x + 4;
    ry -= 3;
  }
}

export function composeTiles(prep: Prepared, buf: Buffers, roomId: number): void {
  clearBuffers(buf);
  const room = prep.rooms[roomId]!;
  let x = 0;
  let y = 0;
  let n = 0;
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 4; j++) {
      blitBlock(prep, buf, room.blocks[n]!, x, y);
      n += 1;
      x += 8;
    }
    x = 0;
    y += 6;
  }
  const attrs = room.attributes;
  for (let ry = 0; ry < ROWS; ry++) {
    const row = attrs[ry]!;
    const base = ry * COLS;
    for (let cx = 0; cx < COLS; cx++) buf.attr[base + cx] = row[cx]!;
  }
}

export function itemCells(item: Item): Array<[number, number]> {
  const cells: Array<[number, number]> = [];
  const row0 = (item.row & 0x7f) - PLAY_ORIGIN;
  const col0 = item.col & 0x1f;
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 2; c++) {
      const cy = row0 + r;
      const cx = col0 + c;
      if (cx >= 0 && cy >= 0 && cx < COLS && cy < ROWS) cells.push([cx, cy]);
    }
  }
  return cells;
}

export function blitItems(prep: Prepared, buf: Buffers, roomId: number, collected?: Uint8Array): void {
  const list = prep.itemsByRoom[roomId];
  if (!list?.length) return;
  for (const it of list) {
    if (collected && collected[it.index]) continue;
    const sprite = prep.sprites[it.sprite];
    if (!sprite) continue;
    const attr = (it.attr_bits & 7) | 0x40;
    const row0 = (it.row & 0x7f) - PLAY_ORIGIN;
    const col0 = it.col & 0x1f;
    for (const cell of sprite.cells) {
      const cy = row0 + cell.row;
      const cx = col0 + cell.col;
      if (cx < 0 || cy < 0 || cx >= COLS || cy >= ROWS) continue;
      const dst = (cy * COLS + cx) * CELL;
      for (let py = 0; py < CELL; py++) buf.data[dst + py] ^= cell.data[py]!;
      buf.attr[cy * COLS + cx] = attr;
    }
  }
}

function blitSprite(prep: Prepared, buf: Buffers, spriteId: number, col: number, row: number, attr: number): void {
  const sprite = prep.sprites[spriteId];
  if (!sprite) return;
  for (const cell of sprite.cells) {
    const cy = row + cell.row;
    const cx = col + cell.col;
    if (cx < 0 || cy < 0 || cx >= COLS || cy >= ROWS) continue;
    const dst = (cy * COLS + cx) * CELL;
    for (let py = 0; py < CELL; py++) buf.data[dst + py]! ^= cell.data[py]!;
    buf.attr[cy * COLS + cx] = attr;
  }
}

export function blitExtra(prep: Prepared, buf: Buffers, extra: ExtraObject | null): void {
  if (!extra) return;
  const playRow = extra.row - PLAY_ORIGIN;
  blitSprite(prep, buf, extra.sprite, extra.col, playRow, (extra.ink & 7) | 0x40);
}

/**
 * `$A78D` / `$C4AB`: 3×3 panel of `$D2DE` at attr (`$0C`,`$0D`), step 2.
 * Pending (bit7): sprite to bring, blinking ink (`$C506`).
 * Delivered: same need-sprite, steady ink `$07`.
 */
export function blitCorePanel(prep: Prepared, buf: Buffers, world: World, roomId: number): void {
  if (roomId !== CORE_ROOM) return;
  const col0 = CORE_PANEL_ATTR_COL;
  const row0 = CORE_PANEL_ATTR_ROW - PLAY_ORIGIN;
  const blinkOn = (world.frames & 8) !== 0;
  for (let i = 0; i < CORE_SLOTS; i++) {
    const r = (i / 3) | 0;
    const c = i % 3;
    const live = world.d2de[i] ?? 0;
    const pending = (live & 0x80) !== 0;
    const origin = world.d2deNeed[i] ?? CORE_D2DE_INIT[i] ?? live;
    const sprite = (pending ? live : origin) & 0x7f;
    let ink = CORE_PANEL_INK_DONE;
    if (pending) {
      ink = blinkOn ? CORE_PANEL_INK_PENDING : ((world.frames + i) & 3) + 2;
    }
    blitSprite(prep, buf, sprite, col0 + c * CORE_PANEL_STEP, row0 + r * CORE_PANEL_STEP, (ink & 7) | 0x40);
  }
}

/**
 * `$DB88` / `$DB50`: XOR persist spark (`xorInk`) onto playfield cells copied from terrain.
 */
export function blitPulses(buf: Buffers, pulses: Pulse[], _dac0: number): void {
  for (const p of pulses) {
    const ink = p.xorInk;
    if (!ink) continue;
    let any = false;
    for (let i = 0; i < 16; i++) if (ink[i]) {
      any = true;
      break;
    }
    if (!any) continue;
    const playRow = p.row - PLAY_ORIGIN;
    const attr = p.sparkAttr & 0xff;
    for (let i = 0; i < 2; i++) {
      const cx = p.col + i;
      if (cx < 0 || playRow < 0 || cx >= COLS || playRow >= ROWS) continue;
      const dst = (playRow * COLS + cx) * CELL;
      const base = i * 8;
      for (let py = 0; py < CELL; py++) buf.data[dst + py]! ^= ink[base + py]!;
      buf.attr[playRow * COLS + cx] = attr;
    }
  }
}

/**
 * $DF70 XOR of a GRAFIX frame (3×2, 8 scanlines × 3 interleaved bytes)
 * at pixel (x, y). $D8B1 then merges ink unless BRIGHT (bit 5) is set.
 */
export function packGrafix(frame: Graphic): Uint8Array {
  const out = new Uint8Array(48);
  for (const cell of frame.cells) {
    if (cell.row < 0 || cell.row > 1 || cell.col < 0 || cell.col > 2) continue;
    for (let py = 0; py < CELL; py++) out[cell.row * 24 + py * 3 + cell.col] = cell.data[py]!;
  }
  return out;
}

export function unpackGrafix(ptr: number, packed: Uint8Array): Graphic {
  const cells: Graphic["cells"] = [];
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 3; col++) {
      const data = [];
      for (let py = 0; py < CELL; py++) data.push(packed[row * 24 + py * 3 + col]!);
      cells.push({ row, col, data, attr: null });
    }
  }
  return { id: -1, ptr, cols: 3, rows: 2, cells };
}

const grafixPtrCache = new Map<string, Graphic>();

/** Frame at a $C0-indexed pointer; labeled #GRAFIX may start a few bytes later (alien5). */
export function graphicForPtr(prep: Prepared, ptr: number): Graphic | undefined {
  const exact = prep.actorsByPtr?.get(ptr);
  if (exact) return exact;
  const pool: Graphic[] = prep.actorsByPtr ? [...prep.actorsByPtr.values()] : [];
  if (!pool.length) {
    for (const list of prep.actorsBySet.values()) pool.push(...list);
  }
  let best: Graphic | undefined;
  let bestDist = 48;
  for (const g of pool) {
    const d = Math.abs(g.ptr - ptr);
    if (d !== 0 && d < bestDist) {
      bestDist = d;
      best = g;
    }
  }
  if (!best) return undefined;
  const key = `${ptr}:${best.ptr}`;
  const hit = grafixPtrCache.get(key);
  if (hit) return hit;
  const packed = packGrafix(best);
  const shifted = new Uint8Array(48);
  const delta = ptr - best.ptr;
  for (let i = 0; i < 48; i++) {
    const src = i + delta;
    shifted[i] = src >= 0 && src < 48 ? packed[src]! : 0;
  }
  const graphic = unpackGrafix(ptr, shifted);
  grafixPtrCache.set(key, graphic);
  return graphic;
}

export function blitGrafix(
  buf: Buffers,
  frame: Graphic,
  x: number,
  y: number,
  ink: number,
  opts?: { mergeInk?: boolean },
): void {
  const occupied = new Set<number>();
  for (const cell of frame.cells) {
    for (let py = 0; py < CELL; py++) {
      const bits = cell.data[py]!;
      if (!bits) continue;
      const pyAbs = y + cell.row * CELL + py;
      for (let px = 0; px < CELL; px++) {
        if (!(bits & (0x80 >> px))) continue;
        const pxAbs = x + cell.col * CELL + px;
        if (pxAbs < 0 || pyAbs < 0 || pxAbs >= WIDTH || pyAbs >= HEIGHT) continue;
        const cx = pxAbs >> 3;
        const cy = pyAbs >> 3;
        buf.data[(cy * COLS + cx) * CELL + (pyAbs & 7)] ^= 0x80 >> (pxAbs & 7);
        occupied.add(cy * COLS + cx);
      }
    }
  }
  if (opts?.mergeInk === false) return;
  const inkBits = ink & 7;
  for (const idx of occupied) {
    const attr = buf.attr[idx]!;
    if (attr & 0x20) continue;
    buf.attr[idx] = (attr & 0xf8) | inkBits;
  }
}

/** Per-pixel overlay: no cell-ink rewrite ($D8B1), so no attribute clash. */
/** Frames 1..3 of a GRAFIX set are the same sprite pre-shifted +2/+4/+6 for X∧7. */
export function grafixAnimDrawX(x: number, frame: number): number {
  return x - (frame & 3) * 2;
}

export function stampGrafix(
  rgba: Uint8ClampedArray,
  frame: Graphic,
  x: number,
  y: number,
  ink: number,
): void {
  const rgb = SPECTRUM[ink & 7]!;
  for (const cell of frame.cells) {
    for (let py = 0; py < CELL; py++) {
      const bits = cell.data[py]!;
      if (!bits) continue;
      const pyAbs = y + cell.row * CELL + py;
      if (pyAbs < 0 || pyAbs >= HEIGHT) continue;
      for (let px = 0; px < CELL; px++) {
        if (!(bits & (0x80 >> px))) continue;
        const pxAbs = x + cell.col * CELL + px;
        if (pxAbs < 0 || pxAbs >= WIDTH) continue;
        const p = (pyAbs * WIDTH + pxAbs) * 4;
        rgba[p] = rgb[0];
        rgba[p + 1] = rgb[1];
        rgba[p + 2] = rgb[2];
        rgba[p + 3] = 255;
      }
    }
  }
}

export function rasterize(
  buf: Buffers,
  rgba: Uint8ClampedArray,
  overlaySolid: boolean,
  solidGrid: number[][] | null,
): Uint8ClampedArray {
  let p = 0;
  for (let cy = 0; cy < ROWS; cy++) {
    for (let py = 0; py < CELL; py++) {
      for (let cx = 0; cx < COLS; cx++) {
        const idx = cy * COLS + cx;
        const [paper, ink] = paperInk(buf.attr[idx]!);
        const bits = buf.data[idx * CELL + py]!;
        const mark = overlaySolid && solidGrid && solidGrid[cy]![cx];
        for (let px = 0; px < CELL; px++) {
          const on = bits & (0x80 >> px);
          let r = on ? ink[0] : paper[0];
          let g = on ? ink[1] : paper[1];
          let b = on ? ink[2] : paper[2];
          if (mark) {
            r = (r + 255) >> 1;
            g = g >> 1;
            b = (b + 255) >> 1;
          }
          rgba[p] = r;
          rgba[p + 1] = g;
          rgba[p + 2] = b;
          rgba[p + 3] = 255;
          p += 4;
        }
      }
    }
  }
  return rgba;
}

export function renderRoom(
  prep: Prepared,
  buf: Buffers,
  rgba: Uint8ClampedArray,
  roomId: number,
  opts: RenderOpts = {},
): Uint8ClampedArray {
  composeTiles(prep, buf, roomId);
  if (opts.items !== false) blitItems(prep, buf, roomId);
  if (opts.blob) {
    const frames = prep.actorsBySet.get(opts.blob.set);
    const frame = frames?.[opts.blob.frame];
    if (frame) blitGrafix(buf, frame, opts.blob.x, opts.blob.y, 7);
  }
  const solid = opts.overlay ? prep.rooms[roomId]!.solid : null;
  return rasterize(buf, rgba, !!opts.overlay, solid);
}

/** Draw the live room (export is only the template applied at enterRoom). */
export function renderWorld(
  prep: Prepared,
  world: World,
  buf: Buffers,
  rgba: Uint8ClampedArray,
  roomId: number,
  opts: RenderOpts = {},
): Uint8ClampedArray {
  copyBuffers(world.terrain, buf);
  if (opts.items !== false) {
    blitItems(prep, buf, roomId, world.collected);
    blitExtra(prep, buf, world.extra);
  }
  blitCorePanel(prep, buf, world, roomId);
  blitPulses(buf, world.pulses, world.dac.dac0);
  const solid = opts.overlay ? prep.rooms[roomId]!.solid : null;
  rasterize(buf, rgba, !!opts.overlay, solid);
  if (opts.enemies !== false) {
    const fi = grafixAnimFrame(world.frames);
    const n = Math.min(world.nastyCount, world.entities.length);
    for (let i = 0; i < n; i++) {
      const e = world.entities[i]!;
      if (!entityVisible(e)) continue;
      const frame =
        graphicForPtr(prep, e.ptr + fi * GRAFIX_FRAME) ?? prep.actorsBySet.get(e.set)?.[fi];
      if (frame) stampGrafix(rgba, frame, grafixAnimDrawX(e.x, fi), GAME_Y_ORIGIN - e.y, e.ink);
    }
    // Pad entity: on station while walking ($9F49); on Blob while boarded ($C94D).
    // Empty stations when boarded happen because the pad left the dock, not by hiding it.
    if (world.pad && entityVisible(world.pad)) {
      const frame =
        graphicForPtr(prep, world.pad.ptr + fi * GRAFIX_FRAME) ??
        prep.actorsBySet.get(world.pad.set)?.[fi];
      if (frame) stampGrafix(rgba, frame, grafixAnimDrawX(world.pad.x, fi), GAME_Y_ORIGIN - world.pad.y, world.pad.ink);
    }
  }
  if (opts.enemies !== false && entityVisible(world.bullet)) {
    const frame = graphicForPtr(prep, world.bullet.ptr) ?? prep.actorsBySet.get(world.bullet.set)?.[world.bullet.frame];
    if (frame) stampGrafix(rgba, frame, world.bullet.x, GAME_Y_ORIGIN - world.bullet.y, world.bullet.ink);
  }
  if (opts.blob) {
    const frames = prep.actorsBySet.get(opts.blob.set);
    const frame = frames?.[opts.blob.frame];
    if (frame) stampGrafix(rgba, frame, opts.blob.x, opts.blob.y, opts.blob.ink ?? 7);
  }
  return rgba;
}

export {
  COLS,
  ROWS,
  WIDTH,
  HEIGHT,
  PLAY_ORIGIN,
  MAP_COLS,
  MAP_ROWS,
  ROOM_COUNT,
  ROOM_SKIP,
};
