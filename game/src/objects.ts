import {
  ATTR_NASTY_HI,
  CORE_SOCKET_ATTR_HI,
  CORE_SOCKET_TABLE,
  CORE_TOOL_SPRITE,
  DOOR_CODE_BC,
  DOOR_D2C6,
  DOOR_DIGIT_MAX,
  DOOR_DIGIT_MIN,
  DOOR_INPUT_MASK,
  DOOR_KEY_SPRITE,
  DOOR_RAW_MAX,
  DOOR_RAW_MIN,
  DOOR_SINGLE_WILDCARD,
  EXTRA_ATTR_HI,
  DD22_PAD,
  GAME_Y_ORIGIN,
  HOVERPAD_ATTR_HI,
  ITEM_NEAR,
  ITEM_ORIGIN_ROWS,
  KILL_AABB,
  KILL_ATTR_HI,
  PASSAGE_ATTR_HI,
  PLAY_ORIGIN,
  PULSE_AABB_DX,
  PULSE_AABB_DY,
  PULSE_ANIM_ATTR_BASE,
  PULSE_ANIM_LAYERS,
  PULSE_ATTR_HI,
  PULSE_COMP_BASE,
  PULSE_COMP_BIAS,
  PULSE_LAYERS,
  PULSE_TOGGLE_LAYER,
  PULSE_PERIOD_BASE,
  PULSE_PERIOD_MASK,
  PULSE_SLOTS,
  ROOM_COUNT,
  TELEPORT_ATTR_HI,
  TELEPORT_INPUT_MASK,
  TELEPORT_NAME_LEN,
  TELEPORT_TABLE,
} from "./constants";
import { requestSfx } from "./audio/effects";
import { parkBullet } from "./projectiles";
import type { BlobState } from "./physics";
import type { GameData, Hotspot, Prepared, Pulse, PulseDef, Room, SocketHotspot, World } from "./types";

export interface TeleportEval {
  ok: boolean;
  dest: number;
  name: string;
}

function emptyHotspots(): Hotspot[][] {
  return Array.from({ length: ROOM_COUNT }, () => []);
}

function emptyPulses(): PulseDef[][] {
  return Array.from({ length: ROOM_COUNT }, () => []);
}

function cellHotspot(col: number, row: number): Hotspot {
  return {
    x: (col << 3) & 0xff,
    y: (((ITEM_ORIGIN_ROWS - row) << 3) - 1) & 0xff,
  };
}

export interface HotspotScan {
  stationsByRoom: Hotspot[][];
  teleportsByRoom: Hotspot[][];
  killsByRoom: Hotspot[][];
  pulsesByRoom: PulseDef[][];
  fixedNastiesByRoom: Hotspot[][];
  extraMarksByRoom: Array<Array<{ col: number; row: number }>>;
  doorsByRoom: Hotspot[][];
  socketsByRoom: SocketHotspot[][];
  passagesByRoom: Hotspot[][];
}

function socketRoomId(slot: number): number {
  const row = CORE_SOCKET_TABLE[slot];
  if (!row) return -1;
  const [lo, flags] = row;
  return lo | ((flags & 0x80) << 1);
}

function socketSlotForRoom(room: number): number {
  for (let i = 0; i < CORE_SOCKET_TABLE.length; i++) {
    if (socketRoomId(i) === room) return i;
  }
  return -1;
}

/**
 * Replicate $A90F / $AA02 from rooms + blocks + $9740 raw.
 * $C0 → $0C, $D0 → $0D, $60 → $06, $70 → $9635, $80 → $9620, $90 → $96CB,
 * $F0 → $0F passage, raw $01–$0F → type $00 door, $B0 → type $0B socket.
 * Drawn attrs never hold those nibbles.
 */
export function scanHotspots(
  rooms: Room[],
  blocks: number[][],
  rawBySub: number[],
): HotspotScan {
  const stationsByRoom = emptyHotspots();
  const teleportsByRoom = emptyHotspots();
  const killsByRoom = emptyHotspots();
  const pulsesByRoom = emptyPulses();
  const fixedNastiesByRoom = emptyHotspots();
  const doorsByRoom = emptyHotspots();
  const passagesByRoom = emptyHotspots();
  const socketsByRoom: SocketHotspot[][] = Array.from({ length: ROOM_COUNT }, () => []);
  const extraMarksByRoom: Array<Array<{ col: number; row: number }>> = Array.from(
    { length: ROOM_COUNT },
    () => [],
  );
  const empty: HotspotScan = {
    stationsByRoom,
    teleportsByRoom,
    killsByRoom,
    pulsesByRoom,
    fixedNastiesByRoom,
    extraMarksByRoom,
    doorsByRoom,
    socketsByRoom,
    passagesByRoom,
  };
  if (!rooms.length || !blocks.length || !rawBySub.length) return empty;
  for (const room of rooms) {
    const id = room.id;
    if (id < 0 || id >= ROOM_COUNT) continue;
    const data = room.blocks;
    if (!data?.length) continue;
    const sockSlot = socketSlotForRoom(id);
    let b = PLAY_ORIGIN;
    let n = 0;
    for (let br = 0; br < 3; br++) {
      let c = 0;
      for (let bc = 0; bc < 4; bc++) {
        const block = data[n++] ?? 0;
        const subs = blocks[block];
        if (subs?.length) {
          const origins: Array<[number, number, number]> = [
            [c + 4, b + 3, subs[0]!],
            [c, b + 3, subs[1]!],
            [c + 4, b, subs[2]!],
            [c, b, subs[3]!],
          ];
          for (const [col0, row0, sid] of origins) {
            const raw = rawBySub[sid] ?? 0;
            const hi = raw & 0xf0;
            const col = col0 + (raw & 3);
            const row = row0 + ((raw & 0x0c) >> 2);
            if (hi === HOVERPAD_ATTR_HI) stationsByRoom[id]!.push(cellHotspot(col, row));
            else if (hi === TELEPORT_ATTR_HI) teleportsByRoom[id]!.push(cellHotspot(col, row));
            else if (hi === KILL_ATTR_HI) killsByRoom[id]!.push(cellHotspot(col, row));
            else if (hi === PULSE_ATTR_HI) pulsesByRoom[id]!.push({ col, row });
            else if (hi === ATTR_NASTY_HI) fixedNastiesByRoom[id]!.push(cellHotspot(col, row));
            else if (hi === EXTRA_ATTR_HI) extraMarksByRoom[id]!.push({ col, row });
            else if (hi === CORE_SOCKET_ATTR_HI && sockSlot >= 0) {
              const hs = cellHotspot(col, row);
              socketsByRoom[id]!.push({ x: hs.x, y: hs.y, slot: sockSlot });
            } else if (hi === PASSAGE_ATTR_HI) passagesByRoom[id]!.push(cellHotspot(col, row));
            else if (raw >= DOOR_RAW_MIN && raw <= DOOR_RAW_MAX) {
              doorsByRoom[id]!.push(cellHotspot(col, row));
            }
          }
        }
        c += 8;
      }
      b += 6;
    }
  }
  return empty;
}

export function hotspotsFromData(data: GameData, rooms: Room[], blocks: number[][]): HotspotScan {
  const rawBySub: number[] = [];
  for (const a of data.blockAttrs?.attributes ?? []) rawBySub[a.id] = a.raw;
  return scanHotspots(rooms, blocks, rawBySub);
}

export function lastStation(prep: Prepared, room: number): Hotspot {
  const list = prep.stationsByRoom?.[room];
  const hit = list?.[list.length - 1];
  return hit ? { x: hit.x, y: hit.y } : { x: 0, y: 0 };
}

export function firstTeleport(prep: Prepared, room: number): Hotspot | null {
  const list = prep.teleportsByRoom?.[room];
  return list?.[0] ?? null;
}

/** First $0F in $96FC order — $A4E5 scans $96FE for type $0F. */
export function firstPassage(prep: Prepared, room: number): Hotspot | null {
  const list = prep.passagesByRoom?.[room];
  return list?.[0] ?? null;
}

export function teleportNameForRoom(room: number): string {
  for (const [name, dest] of TELEPORT_TABLE) {
    if (dest === room) return name;
  }
  return "";
}

/** $CFB3: 5 uppercase ASCII letters against $D036. Knowing the name is enough. */
export function evaluateTeleport(code: string, room: number): TeleportEval {
  const own = teleportNameForRoom(room);
  const norm = code.replace(/[^A-Za-z]/g, "").toUpperCase().slice(0, TELEPORT_NAME_LEN);
  if (norm.length !== TELEPORT_NAME_LEN) return { ok: false, dest: room, name: own };
  for (const [name, dest] of TELEPORT_TABLE) {
    if (name === norm) return { ok: true, dest, name };
  }
  return { ok: false, dest: room, name: own };
}

export function exactAt(blob: BlobState, x: number, y: number): boolean {
  return blob.x === x && GAME_Y_ORIGIN - blob.y === y;
}

function blobGame(blob: BlobState): { x: number; y: number } {
  return { x: blob.x, y: GAME_Y_ORIGIN - blob.y };
}

/** $CBBB |dx|<$0F |dy|<$0F against a $06 hotspot. No key. */
export function hitKillTerrain(prep: Prepared, blob: BlobState): boolean {
  const { x, y } = blobGame(blob);
  for (const s of prep.killsByRoom?.[blob.room] ?? []) {
    if (Math.abs(x - s.x) < KILL_AABB && Math.abs(y - s.y) < KILL_AABB) return true;
  }
  return false;
}

/** $DB88: XOR one `$DC55` layer (2×8) into the persist spark buffer. */
function xorPulseLayer(ink: Uint8Array, layer: number): void {
  const cells = PULSE_LAYERS[layer];
  if (!cells) return;
  for (let i = 0; i < 2; i++) {
    const bytes = cells[i]!;
    const base = i * 8;
    for (let py = 0; py < 8; py++) ink[base + py] ^= bytes[py]!;
  }
}

/**
 * $A66C: one of 4 $9635 slots per tick ($9634 INC, wrap at $04).
 * DEC timer; $FF → reload period, XOR flag, `$DB88` L=$05 A=$47, RET.
 * Else if flag≠0 → `$DB88` `$A6BD[timer∧3]` onto the same cells.
 * xorInk is the display-file delta (persist XOR), not the current layer.
 *
 * |dx| < $0E, Y in [comp−$16, comp], comp = ($1A−row)<<3 − 2.
 */
export function tickPulses(blob: BlobState, world: World): boolean {
  let i = (world.pulseIndex + 1) & 0xff;
  if (i >= PULSE_SLOTS) i = 0;
  world.pulseIndex = i;
  const slot = world.pulses[i];
  if (slot) {
    slot.timer = (slot.timer - 1) & 0xff;
    if (slot.timer === 0xff) {
      slot.timer = slot.period;
      slot.flag ^= 1;
      xorPulseLayer(slot.xorInk, PULSE_TOGGLE_LAYER);
      slot.lastAnim = null;
      slot.sparkAttr = 0x47;
    } else if (slot.flag !== 0) {
      const anim = PULSE_ANIM_LAYERS[slot.timer & 3]!;
      xorPulseLayer(slot.xorInk, anim);
      slot.lastAnim = anim;
      slot.sparkAttr = (PULSE_ANIM_ATTR_BASE + (world.dac.dac0 & 3)) & 0xff;
    }
  }
  const { x, y } = blobGame(blob);
  let hit = false;
  for (const p of world.pulses) {
    if (p.flag === 0) continue;
    const px = (p.col << 3) & 0xff;
    const comp = ((PULSE_COMP_BASE - p.row) << 3) - PULSE_COMP_BIAS;
    if (Math.abs(x - px) < PULSE_AABB_DX && y >= comp - PULSE_AABB_DY && y <= comp) hit = true;
  }
  return hit;
}

export function makePulses(defs: PulseDef[] | undefined, dac0: number): Pulse[] {
  const period = ((dac0 & PULSE_PERIOD_MASK) + PULSE_PERIOD_BASE) & 0xff;
  return (defs ?? []).map((p) => ({
    col: p.col,
    row: p.row,
    period,
    timer: period,
    flag: 0,
    xorInk: new Uint8Array(16),
    sparkAttr: 0x47,
    lastAnim: null,
  }));
}

export function onStationPixel(blob: BlobState, world: World): boolean {
  if (world.station.x === 0 && world.station.y === 0) return false;
  return exactAt(blob, world.station.x, world.station.y);
}

function boardPad(world: World): void {
  parkBullet(world);
  world.dd22 = world.lastDir & 8 ? DD22_PAD : 0;
}

/** `$D633`: `(n ∧ $3F) % 5 + 9` → `$09`–`$0D`. */
export function reduceDoorDigit(raw: number): number {
  return ((raw & 0x3f) % 5) + DOOR_DIGIT_MIN;
}

/**
 * `$D616`…`$D63B` door code for room.lo and `BC=$110B`.
 * Seed `$D2C6` from snapshot (`DOOR_D2C6` = `$7B78`).
 */
export function expectedDoorCode(room: number, d2c6: number = DOOR_D2C6, bc: number = DOOR_CODE_BC): number[] {
  const h = (d2c6 >> 8) & 0xff;
  const l = d2c6 & 0xff;
  const e = room & 0xff;
  const b = (bc >> 8) & 0xff;
  const c = bc & 0xff;
  let a = (b ^ h ^ e) & 0xff;
  const d5f7 = a;
  a = (a ^ l ^ c) & 0xff;
  const d5f9 = a;
  a = (a ^ h ^ b) & 0xff;
  return [reduceDoorDigit(d5f7), reduceDoorDigit(d5f9), reduceDoorDigit(a)];
}

export function parseDoorCodeInput(text: string): number[] | null {
  const parts = text.trim().split(/[\s,;]+/).filter(Boolean);
  if (parts.length >= 3) {
    const out = parts.slice(0, 3).map((p) => parseInt(p, 10));
    if (out.every((n) => n >= DOOR_DIGIT_MIN && n <= DOOR_DIGIT_MAX)) return out;
  }
  const digits = text.replace(/[^0-9A-Fa-f]/g, "");
  if (digits.length < 3) return null;
  const out: number[] = [];
  for (let i = 0; i < 3; i++) {
    const n = parseInt(digits[i]!, 16);
    if (n < DOOR_DIGIT_MIN || n > DOOR_DIGIT_MAX) return null;
    out.push(n);
  }
  return out;
}

export function inventoryHasSprite(world: World, sprite: number): boolean {
  return world.inventory.some((it) => (it.sprite & 0xff) === (sprite & 0xff));
}

/**
 * `$D693`: open when inventory holds `$0F` (universal), or the three digit
 * sprites (multiset; each slot used once). `$0E` may cover one digit.
 * Typed prompt codes are not used — player brings keys.
 */
export function doorKeysAccepted(world: World, room: number): boolean {
  if (inventoryHasSprite(world, DOOR_KEY_SPRITE)) return true;
  const need = expectedDoorCode(room);
  const used = new Array(world.inventory.length).fill(false);
  let wildcards = 0;
  for (const it of world.inventory) {
    if ((it.sprite & 0xff) === DOOR_SINGLE_WILDCARD) wildcards += 1;
  }
  for (const digit of need) {
    let found = -1;
    for (let i = 0; i < world.inventory.length; i++) {
      if (used[i]) continue;
      if ((world.inventory[i]!.sprite & 0xff) === (digit & 0xff)) {
        found = i;
        break;
      }
    }
    if (found >= 0) {
      used[found] = true;
      continue;
    }
    if (wildcards > 0) {
      wildcards -= 1;
      continue;
    }
    return false;
  }
  return true;
}

/** @deprecated Use doorKeysAccepted — kept for dump helpers. */
export function doorCodeAccepted(world: World, room: number, _typed: string | null): boolean {
  return doorKeysAccepted(world, room);
}

/** `$CE96`: tool `$10` clears low 7 bits of `$95F0` flag (keep room-hi bit7). */
export function tryClearSocket(prep: Prepared, blob: BlobState, world: World): boolean {
  if (!inventoryHasSprite(world, CORE_TOOL_SPRITE)) return false;
  const { x, y } = blobGame(blob);
  for (const s of prep.socketsByRoom?.[blob.room] ?? []) {
    if (Math.abs(x - s.x) >= ITEM_NEAR || Math.abs(y - s.y) >= ITEM_NEAR) continue;
    const flag = world.socketFlags[s.slot] ?? 0;
    if ((flag & 0x7f) === 0) return false;
    world.socketFlags[s.slot] = flag & 0x80;
    requestSfx(world, 0x08);
    return true;
  }
  return false;
}

/**
 * $CB8A types $06 / $00 / $0B / $0C / $0D / $0F.
 * $06 AABB; $00/$0F exact + L|R; $0B AABB + tool `$10`; $0C/$0D as before.
 * Returns `"$06"`, `"$00"`, `"$0D"`, `"$0F"`, or null.
 */
export function walkSpecialObjects(
  prep: Prepared,
  blob: BlobState,
  input: { left: boolean; right: boolean },
  world: World,
): string | null {
  if (hitKillTerrain(prep, blob)) return "$06";

  tryClearSocket(prep, blob, world);

  const stations = prep.stationsByRoom?.[blob.room] ?? [];
  for (const s of stations) {
    if (exactAt(blob, s.x, s.y)) {
      boardPad(world);
      break;
    }
  }

  const horiz = (input.left ? 2 : 0) | (input.right ? 1 : 0);
  if (!(horiz & (TELEPORT_INPUT_MASK | DOOR_INPUT_MASK))) {
    world.teleportLatch = false;
    return null;
  }
  if (world.teleportLatch) return null;

  const doors = prep.doorsByRoom?.[blob.room] ?? [];
  for (const d of doors) {
    if (!exactAt(blob, d.x, d.y)) continue;
    // Overlay + `$D5FD` inventory check run in the UI FSM (`$00`).
    return "$00";
  }

  const pads = prep.teleportsByRoom?.[blob.room] ?? [];
  for (const t of pads) {
    if (!exactAt(blob, t.x, t.y)) continue;
    // 5-char keyboard input via overlay (`$D5C8`), not window.prompt.
    return "$0D";
  }

  const passages = prep.passagesByRoom?.[blob.room] ?? [];
  for (const p of passages) {
    if (!exactAt(blob, p.x, p.y)) continue;
    return "$0F";
  }
  return null;
}
