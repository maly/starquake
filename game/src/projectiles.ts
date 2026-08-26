import {
  BLOB_H,
  CELL,
  COLS,
  ENTITY_DUMMY_PTR,
  ENTITY_PARK_Y,
  FIRE_DIR_LEFT,
  FIRE_DIR_RIGHT,
  FIRE_END_X,
  FIRE_LEFT_PTR,
  FIRE_PX,
  FIRE_RIGHT_PTR,
  FIRE_STEPS,
  GAME_Y_ORIGIN,
  PAD_SHOT_BOUNCE_MAX,
  PAD_SHOT_PTRS,
  PAD_SHOT_PX,
  PAD_SHOT_Y_HI,
  PAD_SHOT_Y_LO,
  ROWS,
} from "./constants";
import type { BlobState } from "./physics";
import type { Entity, Prepared, World } from "./types";

function cellSolid(world: World, col: number, row: number): boolean {
  if (col < 0 || row < 0 || col >= COLS || row >= ROWS) return false;
  return (world.terrain.attr[row * COLS + col]! & 0x40) === 0;
}

/** $D2F0 bits at the bullet (IX=$DDB8): bit 0 right, bit 1 left. */
function wallBits(world: World, x: number, playY: number): number {
  if ((x & 7) !== 0) return 0;
  const col = x >> 3;
  const top = playY >> 3;
  let bits = 0;
  for (let r = 0; r < BLOB_H / CELL; r++) {
    if (cellSolid(world, col - 1, top + r)) bits |= 2;
    if (cellSolid(world, col + 2, top + r)) bits |= 1;
  }
  return bits;
}

export function parkedBullet(): Entity {
  return {
    x: 0,
    y: ENTITY_PARK_Y,
    ink: 7,
    set: "blobfire",
    frame: 0,
    ptr: ENTITY_DUMMY_PTR,
    basePtr: FIRE_RIGHT_PTR,
    dir: 0,
    speedX: FIRE_PX,
    speedY: 0,
    period: 1,
    timer: 1,
    state: 0,
    stateTimer: 0,
    ai: 0,
    aiPeriod: 0,
    aiCount: 0,
    homeX: 0,
    homeY: ENTITY_PARK_Y,
  };
}

export function parkBullet(world: World): void {
  world.bullet = parkedBullet();
  world.fireDir = 0;
  world.padShotDir = 0;
  world.padShotHits = 0;
  world.padShotFrame = 0;
}

export function shotFlying(world: World): boolean {
  return world.fireDir !== 0 || world.padShotDir !== 0;
}

function aimFromFacing(facing: 1 | -1): number {
  return facing > 0 ? FIRE_DIR_RIGHT : FIRE_DIR_LEFT;
}

/**
 * $C85A: fire if $DD2A=0, $DD27≠0, $D2CF≠0; then 3 steps of ±2 on $DDBD.
 * Shot does not follow Blob after spawn. $C8DD parks on wall, X≥$F2, or hit.
 */
function floorCeilingBits(world: World, x: number, playY: number): number {
  const gameY = GAME_Y_ORIGIN - playY;
  if (((gameY + 1) & 7) !== 0) return 0;
  const cols = (x & 7) === 0 ? [x >> 3, (x >> 3) + 1] : [x >> 3, (x >> 3) + 1, (x >> 3) + 2];
  const origin = playY >> 3;
  let bits = 0;
  for (const col of cols) {
    if (cellSolid(world, col, origin + 2)) bits |= 4;
    if (cellSolid(world, col, origin - 1)) bits |= 8;
  }
  return bits;
}

/**
 * $CA15: one 8 px step, XOR bounce, park after 2 wall hits or X≥$F2 / Y<$0F / Y≥$91.
 * Consumes $D2CF. Graphics $CB2B hfirepower.
 */
export function tickPadFire(_prep: Prepared, blob: BlobState, fire: boolean, world: World): void {
  if (world.padShotDir === 0) {
    if (world.fireDir !== 0) return;
    if (!fire || world.firepower === 0) return;
    world.firepower = Math.max(0, world.firepower - 1);
    const gameY = GAME_Y_ORIGIN - blob.y;
    world.padShotDir = world.lastDir || 1;
    world.padShotHits = 0;
    world.padShotFrame = 0;
    world.bullet.x = blob.x & 0xf8;
    world.bullet.y = ((gameY + 1) & 0xf8) - 1;
    world.bullet.ptr = PAD_SHOT_PTRS[0];
    world.bullet.set = "hfirepower";
    world.bullet.frame = 0;
    world.bullet.ink = 7;
    world.bullet.basePtr = PAD_SHOT_PTRS[0];
  }

  let dir = world.padShotDir;
  const playY = GAME_Y_ORIGIN - world.bullet.y;
  const hWall = wallBits(world, world.bullet.x, playY);
  const vWall = floorCeilingBits(world, world.bullet.x, playY);
  const hHit = (dir & 3) & hWall;
  const vHit = (dir & 0x0c) & vWall;
  let hits = 0;
  const dac0 = world.dac.dac0 & 0xff;
  const dac1 = (world.dac.dac0 >> 8) & 0xff;
  if (hHit && vHit) {
    hits = 2;
    if (dac0 & 0x20) dir &= 0x03;
    else dir &= 0x0c;
  } else {
    if (hHit) {
      dir ^= 3;
      if ((dir & 0x0c) === 0) dir = (dir & 0xf3) | (dac0 & 8 ? 8 : 4);
      hits += 1;
    }
    if (vHit) {
      dir ^= 0x0c;
      if ((dir & 3) === 0) dir = (dir & 0xfc) | (dac1 & 1 ? 1 : 2);
      hits += 1;
    }
  }
  world.padShotHits += hits;
  world.padShotDir = dir;
  if (world.padShotHits >= PAD_SHOT_BOUNCE_MAX) {
    parkBullet(world);
    return;
  }
  if (dir & 1) world.bullet.x = (world.bullet.x + PAD_SHOT_PX) & 0xff;
  if (dir & 2) world.bullet.x = (world.bullet.x - PAD_SHOT_PX) & 0xff;
  if (dir & 8) world.bullet.y = (world.bullet.y + PAD_SHOT_PX) & 0xff;
  if (dir & 4) world.bullet.y = (world.bullet.y - PAD_SHOT_PX) & 0xff;
  if (world.bullet.x >= FIRE_END_X || world.bullet.y < PAD_SHOT_Y_LO || world.bullet.y >= PAD_SHOT_Y_HI) {
    parkBullet(world);
    return;
  }
  world.padShotFrame = (world.padShotFrame + 1) & 3;
  world.bullet.ptr = PAD_SHOT_PTRS[world.padShotFrame]!;
  world.bullet.frame = world.padShotFrame;
  world.bullet.set = "hfirepower";
}

/**
 * $C85A: fire if $DD2A=0, $DD27≠0, $D2CF≠0; then 3 steps of ±2 on $DDBD.
 * Shot does not follow Blob after spawn. $C8DD parks on wall, X≥$F2, or hit.
 */
export function tickFire(_prep: Prepared, blob: BlobState, fire: boolean, world: World): void {
  if (blob.facing) world.aim = aimFromFacing(blob.facing);
  if (world.fireDir === 0) {
    if (world.padShotDir !== 0) return;
    if (!fire || world.firepower === 0) return;
    world.firepower = Math.max(0, world.firepower - 1);
    world.fireDir = world.aim || FIRE_DIR_RIGHT;
    world.bullet.x = blob.x & 0xff;
    world.bullet.y = (GAME_Y_ORIGIN - blob.y) & 0xff;
    const right = (world.fireDir & 1) !== 0;
    world.bullet.ptr = right ? FIRE_RIGHT_PTR : FIRE_LEFT_PTR;
    world.bullet.set = "blobfire";
    world.bullet.frame = right ? 0 : 4;
    world.bullet.ink = 7;
    world.bullet.basePtr = world.bullet.ptr;
  }
  const playY = GAME_Y_ORIGIN - world.bullet.y;
  for (let step = 0; step < FIRE_STEPS; step++) {
    const bits = wallBits(world, world.bullet.x, playY);
    if (bits & world.fireDir) {
      parkBullet(world);
      return;
    }
    if (world.fireDir === FIRE_DIR_RIGHT) world.bullet.x = (world.bullet.x + FIRE_PX) & 0xff;
    else world.bullet.x = (world.bullet.x - FIRE_PX) & 0xff;
    if (world.bullet.x >= FIRE_END_X) {
      parkBullet(world);
      return;
    }
  }
}
