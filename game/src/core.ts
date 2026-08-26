import {
  CORES_COMPLETE_MSG,
  CORE_CEREMONY_FRAMES,
  CORE_D2DE_INIT,
  CORE_EJECT_X,
  CORE_EJECT_Y,
  CORE_LEFT_INIT,
  CORE_NEIGHBOR,
  CORE_PAIRS_INIT,
  CORE_ROOM,
  CORE_SLOTS,
  CORE_SOCKET_TABLE,
  CORE_VICTORY_PAIRS,
  GAME_Y_ORIGIN,
  SCORE_CORE_DELIVER,
} from "./constants";
import { spawnCoreGuardians } from "./entities";
import { composeEndResult, addScore } from "./score";
import type { BlobState } from "./physics";
import type { Prepared, World } from "./types";

/** Snapshot `$95F0` flags after `$643B`. */
export function initSocketFlags(): number[] {
  return CORE_SOCKET_TABLE.map(([, flags]) => flags & 0xff);
}

export function initCoreState(): { d2de: number[]; coresLeft: number; corePairs: number } {
  return {
    d2de: CORE_D2DE_INIT.map((v) => v & 0xff),
    coresLeft: CORE_LEFT_INIT,
    corePairs: CORE_PAIRS_INIT,
  };
}

/** Match inventory to `$D2DE`; update counters/score. Returns how many were delivered. */
export function matchCoreDeliveries(world: World): number {
  let delivered = 0;
  for (let pass = 0; pass < 2; pass++) {
    for (let inv = 0; inv < world.inventory.length; ) {
      const sprite = world.inventory[inv]!.sprite & 0xff;
      let matched = -1;
      for (let i = 0; i < CORE_SLOTS; i++) {
        const need = world.d2de[i] ?? 0;
        if (!(need & 0x80)) continue;
        if ((need & 0x7f) === sprite) {
          matched = i;
          break;
        }
      }
      if (matched < 0) {
        inv += 1;
        continue;
      }
      world.d2de[matched] = matched & 0xff;
      world.inventory.splice(inv, 1);
      addScore(world, SCORE_CORE_DELIVER);
      world.coresLeft = (world.coresLeft - 1) & 0xff;
      if ((world.coresLeft & 1) === 0) {
        world.corePairs = (world.corePairs + 1) & 0xff;
      }
      delivered += 1;
    }
  }
  return delivered;
}

/**
 * `$A7D5` + `$9F78` + `$A757`: hide Blob, spawn guardians from `$D2E8`, run
 * ceremony frames then eject to `$C6` (`$A777`).
 */
export function beginCoreCeremony(world: World): void {
  world.blobHidden = true;
  world.pad = null;
  world.dd22 = 0;
  spawnCoreGuardians(world);
  world.corePhase = "ceremony";
  world.coreTicks = 0;
}

export function ejectToCoreNeighbor(blob: BlobState, world: World, enter: (room: number) => void): void {
  world.corePhase = null;
  world.coreTicks = 0;
  world.blobHidden = false;
  blob.room = CORE_NEIGHBOR;
  blob.x = CORE_EJECT_X;
  blob.y = GAME_Y_ORIGIN - CORE_EJECT_Y;
  blob.fallIndex = 0;
  blob.onGround = false;
  enter(CORE_NEIGHBOR);
}

/**
 * `$A6C1`: deliver any matching parts, then either victory or the core ceremony
 * (always leaves to `$C6` when not victorious — even with zero deliveries).
 */
export function deliverCoreParts(
  _prep: Prepared,
  blob: BlobState,
  world: World,
  enter: (room: number) => void,
): "victory" | "ceremony" | "none" {
  if (blob.room !== CORE_ROOM) return "none";
  if (world.corePhase === "ceremony") return "ceremony";
  matchCoreDeliveries(world);
  if (world.corePairs >= CORE_VICTORY_PAIRS) {
    world.blobHidden = false;
    world.corePhase = null;
    composeEndResult(world, true, CORES_COMPLETE_MSG);
    world.message = CORES_COMPLETE_MSG;
    return "victory";
  }
  beginCoreCeremony(world);
  return "ceremony";
}

/** One tick of `$A757` wait: move guardians; after `$C8` frames eject to `$C6`. */
export function tickCoreCeremony(
  prep: Prepared,
  blob: BlobState,
  world: World,
  tickNasties: (prep: Prepared, blob: BlobState, world: World) => number | null,
  enter: (room: number) => void,
): void {
  if (world.corePhase !== "ceremony") return;
  world.frames = (world.frames + 1) >>> 0;
  tickNasties(prep, blob, world);
  world.coreTicks += 1;
  if (world.coreTicks >= CORE_CEREMONY_FRAMES) {
    ejectToCoreNeighbor(blob, world, enter);
  }
}

export { CORE_ROOM, CORE_NEIGHBOR, CORE_CEREMONY_FRAMES };
