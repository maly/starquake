import {
  DD22_PAD,
  GAME_Y_ORIGIN,
  HOVERPAD_ATTR_HI,
  ITEM_ORIGIN_ROWS,
  PLAY_ORIGIN,
  ROOM_COUNT,
  TELEPORT_ATTR_HI,
  TELEPORT_INPUT_MASK,
  TELEPORT_NAME_LEN,
  TELEPORT_TABLE,
} from "./constants";
import { parkBullet } from "./projectiles";
import type { BlobState } from "./physics";
import type { GameData, Hotspot, Prepared, Room, World } from "./types";

export interface TeleportEval {
  ok: boolean;
  dest: number;
  name: string;
}

function emptyHotspots(): Hotspot[][] {
  return Array.from({ length: ROOM_COUNT }, () => []);
}

/**
 * Replicate $A90F / $AA02 from rooms + blocks + $9740 raw.
 * High nibble $C0 → type $0C, $D0 → type $0D. Drawn attrs never hold those nibbles.
 */
export function scanHotspots(
  rooms: Room[],
  blocks: number[][],
  rawBySub: number[],
): { stationsByRoom: Hotspot[][]; teleportsByRoom: Hotspot[][] } {
  const stationsByRoom = emptyHotspots();
  const teleportsByRoom = emptyHotspots();
  if (!rooms.length || !blocks.length || !rawBySub.length) {
    return { stationsByRoom, teleportsByRoom };
  }
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
            if (hi !== HOVERPAD_ATTR_HI && hi !== TELEPORT_ATTR_HI) continue;
            const col = col0 + (raw & 3);
            const row = row0 + ((raw & 0x0c) >> 2);
            const spot: Hotspot = {
              x: (col << 3) & 0xff,
              y: (((ITEM_ORIGIN_ROWS - row) << 3) - 1) & 0xff,
            };
            if (hi === HOVERPAD_ATTR_HI) stationsByRoom[id]!.push(spot);
            else teleportsByRoom[id]!.push(spot);
          }
        }
        c += 8;
      }
      b += 6;
    }
  }
  return { stationsByRoom, teleportsByRoom };
}

export function hotspotsFromData(data: GameData, rooms: Room[], blocks: number[][]): {
  stationsByRoom: Hotspot[][];
  teleportsByRoom: Hotspot[][];
} {
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

export function onStationPixel(blob: BlobState, world: World): boolean {
  if (world.station.x === 0 && world.station.y === 0) return false;
  return exactAt(blob, world.station.x, world.station.y);
}

function boardPad(world: World): void {
  parkBullet(world);
  world.dd22 = world.lastDir & 8 ? DD22_PAD : 0;
}

/**
 * $CB8A types $0C / $0D: exact XY, not AABB.
 * $CEAD board/dismount; $CEC9 teleport needs Left|Right.
 * Returns a typed code when the overlay should run.
 */
export function walkSpecialObjects(
  prep: Prepared,
  blob: BlobState,
  input: { left: boolean; right: boolean },
  world: World,
): string | null {
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
