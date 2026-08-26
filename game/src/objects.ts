import {
  ATTR_NASTY_HI,
  DD22_PAD,
  GAME_Y_ORIGIN,
  HOVERPAD_ATTR_HI,
  ITEM_ORIGIN_ROWS,
  KILL_AABB,
  KILL_ATTR_HI,
  PLAY_ORIGIN,
  PULSE_AABB_DX,
  PULSE_AABB_DY,
  PULSE_ATTR_HI,
  PULSE_COMP_BASE,
  PULSE_COMP_BIAS,
  PULSE_PERIOD_BASE,
  PULSE_PERIOD_MASK,
  ROOM_COUNT,
  TELEPORT_ATTR_HI,
  TELEPORT_INPUT_MASK,
  TELEPORT_NAME_LEN,
  TELEPORT_TABLE,
} from "./constants";
import { parkBullet } from "./projectiles";
import type { BlobState } from "./physics";
import type { GameData, Hotspot, Prepared, Pulse, PulseDef, Room, World } from "./types";

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
}

/**
 * Replicate $A90F / $AA02 from rooms + blocks + $9740 raw.
 * $C0 → $0C, $D0 → $0D, $60 → $06, $70 → $9635, $80 → $9620.
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
  const empty: HotspotScan = {
    stationsByRoom,
    teleportsByRoom,
    killsByRoom,
    pulsesByRoom,
    fixedNastiesByRoom,
  };
  if (!rooms.length || !blocks.length || !rawBySub.length) return empty;
  for (const room of rooms) {
    const id = room.id;
    if (id < 0 || id >= ROOM_COUNT) continue;
    const data = room.blocks;
    if (!data?.length) continue;
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

/**
 * $A66C: DEC timer, reload period, XOR flag. Then $A56A AABB when flag ≠ 0.
 * |dx| < $0E, Y in [comp−$16, comp], comp = ($1A−row)<<3 − 2.
 */
export function tickPulses(blob: BlobState, world: World): boolean {
  const { x, y } = blobGame(blob);
  let hit = false;
  for (const p of world.pulses) {
    p.timer = (p.timer - 1) & 0xff;
    if (p.timer === 0) {
      p.timer = p.period;
      p.flag ^= 1;
    }
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

/**
 * $CB8A types $06 / $0C / $0D. $06 is AABB (`$CBBB`) and needs no key.
 * $CEAD board/dismount; $CEC9 teleport needs Left|Right.
 * Returns `"$06"` on poison-plant hit, a typed code when the overlay should run.
 */
export function walkSpecialObjects(
  prep: Prepared,
  blob: BlobState,
  input: { left: boolean; right: boolean },
  world: World,
): string | null {
  if (hitKillTerrain(prep, blob)) return "$06";

  const stations = prep.stationsByRoom?.[blob.room] ?? [];
  for (const s of stations) {
    if (exactAt(blob, s.x, s.y)) {
      boardPad(world);
      break;
    }
  }

  const horiz = (input.left ? 2 : 0) | (input.right ? 1 : 0);
  if (!(horiz & TELEPORT_INPUT_MASK)) {
    world.teleportLatch = false;
    return null;
  }
  if (world.teleportLatch) return null;
  const pads = prep.teleportsByRoom?.[blob.room] ?? [];
  for (const t of pads) {
    if (!exactAt(blob, t.x, t.y)) continue;
    const own = teleportNameForRoom(blob.room);
    if (!world.readTeleportCode) return null;
    const typed = world.readTeleportCode(own);
    return typed ?? "";
  }
  return null;
}
