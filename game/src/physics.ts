import {
  A350_BYTES,
  ANIM_PERIOD,
  BLOB_H,
  BLOB_W,
  CELL,
  COLS,
  DD22_LIFT,
  DD22_PAD,
  DD22_WALK,
  BLOB_INK,
  DEAD_GRAPHIC,
  DEATH_A_ENERGY,
  DEATH_A_OBJ06,
  DEATH_A_TILE,
  DEATH_FLASH_FRAMES,
  DEATH_FLY_FRAMES,
  DEATH_INK_XOR,
  DEATH_PAUSE_FRAMES,
  DEATH_RESTORE_MIN_A,
  DEATH_STAR_DIRS,
  DEATH_STAR_TIMERS,
  ENTITY_DUMMY_PTR,
  ENTER_BOTTOM_Y,
  ENTER_LEFT_X,
  ENTER_RIGHT_X,
  ENTER_TOP_Y,
  EXIT_DOWN_Y,
  EXIT_RIGHT,
  EXIT_UP_Y,
  FALL_TABLE,
  GAME_OVER_MSG,
  GAME_Y_ORIGIN,
  HEIGHT,
  HOVERPAD_FLY_PX,
  ITEM_COUNT,
  LIFT_ATTR,
  LIFT_PX,
  LIFT_X_BIAS,
  LIFT_X_MASK,
  LIFT_Y_MOD,
  NEW_GAME_X,
  NEW_GAME_Y,
  PAD_ENTER_UP_Y,
  PAD_EXIT_DOWN_Y,
  PLATFORM_COST,
  PLATFORM_INPUT,
  PLATFORM_LAYERS,
  PLATFORM_LIFE_BASE,
  PLATFORM_ROW_BASE,
  PLATFORM_SLOTS,
  PLATFORM_X_BIAS,
  PLAT_OR_ON_DEATH,
  PLAY_ORIGIN,
  RESPAWN_ENERGY,
  ROOM_COUNT,
  ROWS,
  SEATED_SETS,
  START_ENERGY,
  START_ENERGY_DRAIN,
  START_FIREPOWER,
  START_LIVES,
  START_PLATFORMS,
  CORE_ROOM,
  DOOR_MSG_BAD,
  DOOR_MSG_OK,
  DOOR_REASON,
  DOOR_SHIFT_X,
  PASSAGE_REASON,
  PASSAGE_SFX,
  SCORE_FIRST_VISIT,
  TELEPORT_INVALID_REASON,
  TELEPORT_MSG_BAD,
  TELEPORT_MSG_OK,
  TELEPORT_REASON,
  TEMP_JUMP_PX,
  WALK_LEFT_SETS,
  WALK_PX,
  WALK_RIGHT_SETS,
  WIDTH,
} from "./constants";
import { deliverCoreParts, initCoreState, initSocketFlags, tickCoreCeremony } from "./core";
import { copyPadFromBlob, enterNasties, syncHoverpad, tickEnergyDrain, tickNasties } from "./entities";
import { spawnExtra, tickPickup } from "./items";
import {
  evaluateTeleport,
  firstPassage,
  firstTeleport,
  makePulses,
  onStationPixel,
  tickPulses,
  walkSpecialObjects,
  type TeleportEval,
} from "./objects";
import { parkBullet, parkedBullet, tickFire, tickPadFire } from "./projectiles";
import { composeTiles, moveRoom, newBuffers } from "./render";
import {
  beginDoorUi,
  beginTeleportUi,
  idleUi,
  isUiBlocking,
  syncWorldMessage,
  tickDoorUi,
  tickTeleportUi,
} from "./ui/overlay";
import {
  a390Unvisited,
  addScore,
  clearA390Bit,
  composeEndResult,
  freshA390,
  zeroScore,
} from "./score";
import { requestSfx, SFX_STEP_INIT } from "./audio/effects";
import { CHAN_DEATH, CHAN_FALL, CHAN_LAND, CHAN_PLATFORM, emptyChan, requestA41B, tickChannel } from "./audio/channel";
import type { Entity, Graphic, Prepared, World } from "./types";

export interface Input {
  left: boolean;
  right: boolean;
  up: boolean;
  down?: boolean;
  fire?: boolean;
}

export interface BlobState {
  room: number;
  x: number;
  y: number;
  fallIndex: number;
  jumpTicks: number;
  facing: 1 | -1;
  walkTick: number;
  walkFrame: number;
  onGround: boolean;
}

export type InkPixel = readonly [number, number];

export function playYToGame(y: number): number {
  return GAME_Y_ORIGIN - y;
}

export function gameYToPlay(gameY: number): number {
  return GAME_Y_ORIGIN - gameY;
}

/**
 * Blob blocking from $D2F0 / $D2F4: `CP $40` / `JR C` — the probe fires when
 * attr < $40, i.e. bit 6 is clear. That is the inverse of $D280 `isSolid`
 * (bit 6 set, used by the export overlay). Empty play-area fill is $47 (walkable);
 * drawn tiles without bright/solidity ($07, $03, …) are walls and floors.
 */
export function blocksBlob(attr: number): boolean {
  return (attr & 0x40) === 0;
}

/**
 * Attribute at a play-area cell. Out of bounds is not a wall — $C8F4 needs X
 * to reach $F0 (sprite columns 30–32) and X=0, and $D2F0 simply does not run
 * a probe when the sampled column is off the 32-wide attr row as a blocker.
 */
export function solidAt(prep: Prepared, room: number, col: number, row: number, world?: World): boolean {
  if (col < 0 || row < 0 || col >= COLS || row >= ROWS) return false;
  const attr = world
    ? world.terrain.attr[row * COLS + col]!
    : prep.rooms[room]!.attributes[row]![col]!;
  return blocksBlob(attr);
}

export function attrAt(prep: Prepared, room: number, col: number, row: number, world?: World): number {
  if (col < 0 || row < 0 || col >= COLS || row >= ROWS) return 0x47;
  return world
    ? world.terrain.attr[row * COLS + col]!
    : prep.rooms[room]!.attributes[row]![col]!;
}

/**
 * Floor / wall probes from $D2F4 / $D2F0.
 * Reference point is the top-left of the 24×16 GRAFIX ($DD1D / $BF-Y).
 * When X is cell-aligned, two columns are tested; otherwise three ($D3A2).
 * Floor row is two cells below the top ($D39D ADD HL,DE twice).
 */
export function footColumns(x: number): number[] {
  const col = x >> 3;
  if ((x & 7) === 0) return [col, col + 1];
  return [col, col + 1, col + 2];
}

export function floorRow(y: number): number {
  return (y + BLOB_H) >> 3;
}

const bboxPixels: InkPixel[] = [];
for (let py = 0; py < BLOB_H; py++) {
  for (let px = 0; px < BLOB_W; px++) {
    bboxPixels.push([px, py]);
  }
}

const inkCache = new WeakMap<Graphic, InkPixel[]>();

/**
 * Ink pixels of a GRAFIX frame, relative to its top-left. Tests without
 * actors fall back to the full 24×16 box.
 */
export function blobInkPixels(graphic: Graphic | undefined): readonly InkPixel[] {
  if (!graphic) return bboxPixels;
  const hit = inkCache.get(graphic);
  if (hit) return hit;
  const pixels: InkPixel[] = [];
  for (const cell of graphic.cells) {
    for (let py = 0; py < CELL; py++) {
      const bits = cell.data[py]!;
      if (!bits) continue;
      for (let px = 0; px < CELL; px++) {
        if (bits & (0x80 >> px)) pixels.push([cell.col * CELL + px, cell.row * CELL + py]);
      }
    }
  }
  inkCache.set(graphic, pixels);
  return pixels;
}

export function poseGraphic(prep: Prepared, blob: BlobState, world?: World): Graphic | undefined {
  const anim = animationSet(blob, world);
  return prep.actorsBySet.get(anim.set)?.[anim.frame];
}

/**
 * True when any on-screen ink pixel sits in a cell with attr < $40.
 * Pixels past the play-area edge are ignored (not walls).
 */
export function overlapsTerrain(
  prep: Prepared,
  room: number,
  x: number,
  y: number,
  pixels: readonly InkPixel[],
  world?: World,
): boolean {
  for (const [ox, oy] of pixels) {
    const px = x + ox;
    const py = y + oy;
    if (px < 0 || py < 0 || px >= WIDTH || py >= HEIGHT) continue;
    if (solidAt(prep, room, px >> 3, py >> 3, world)) return true;
  }
  return false;
}

export function onFloor(prep: Prepared, room: number, x: number, y: number, world?: World): boolean {
  return supportY(prep, room, x, y, world) === y;
}

/** Snap Y so feet sit on the first solid row at or below them, or null if none. */
export function supportY(prep: Prepared, room: number, x: number, y: number, world?: World): number | null {
  const feet = y + BLOB_H;
  const start = Math.max(0, feet >> 3);
  for (let row = start; row < ROWS; row++) {
    let hit = false;
    for (const col of footColumns(x)) {
      if (solidAt(prep, room, col, row, world)) {
        hit = true;
        break;
      }
    }
    if (hit) return row * CELL - BLOB_H;
  }
  return null;
}

/**
 * $D2F0 wall probe, only when X is cell-aligned. Right column is origin+2
 * (`INC HL` twice), not origin+3; a column past the 32-wide attr map is open.
 */
export function wallBlocked(
  prep: Prepared,
  room: number,
  x: number,
  y: number,
  dir: 1 | -1,
  world?: World,
): boolean {
  if ((x & 7) !== 0) return false;
  const col = dir > 0 ? (x >> 3) + 2 : (x >> 3) - 1;
  const top = y >> 3;
  for (let r = 0; r < BLOB_H / CELL; r++) {
    if (solidAt(prep, room, col, top + r, world)) return true;
  }
  return false;
}

/**
 * $D2F0 bits: 0 right, 1 left. Only when X ∧ 7 = 0.
 * $D330: if (Y+1) ∧ 7 = 0 two attr rows, otherwise three (origin, +1, +2).
 */
export function d2f0Bits(prep: Prepared, room: number, x: number, playY: number, world?: World): number {
  if ((x & 7) !== 0) return 0;
  const col = x >> 3;
  const top = playY >> 3;
  const rows = ((playYToGame(playY) + 1) & 7) === 0 ? 2 : 3;
  let bits = 0;
  for (let r = 0; r < rows; r++) {
    if (solidAt(prep, room, col + 2, top + r, world)) bits |= 1;
    if (solidAt(prep, room, col - 1, top + r, world)) bits |= 2;
  }
  return bits;
}

/** $D2F4 bits: 2 floor, 3 ceiling. Only when (Y+1) ∧ 7 = 0. */
export function d2f4Bits(prep: Prepared, room: number, x: number, playY: number, world?: World): number {
  const gameY = playYToGame(playY);
  if (((gameY + 1) & 7) !== 0) return 0;
  const cols = footColumns(x);
  const origin = playY >> 3;
  let bits = 0;
  for (const col of cols) {
    if (solidAt(prep, room, col, origin + 2, world)) bits |= 4;
    if (solidAt(prep, room, col, origin - 1, world)) bits |= 8;
  }
  return bits;
}

export function dirBits(input: Input): number {
  return (input.right ? 1 : 0) | (input.left ? 2 : 0) | (input.down ? 4 : 0) | (input.up ? 8 : 0);
}

export function insideSolid(
  prep: Prepared,
  room: number,
  x: number,
  y: number,
  pixels: readonly InkPixel[] = bboxPixels,
  world?: World,
): boolean {
  return overlapsTerrain(prep, room, x, y, pixels, world);
}

function nudgeOutOfSolid(prep: Prepared, blob: BlobState, pixels: readonly InkPixel[], world?: World): void {
  let guard = 0;
  while (overlapsTerrain(prep, blob.room, blob.x, blob.y, pixels, world) && guard < HEIGHT) {
    blob.y -= 1;
    guard += 1;
    if (blob.y < 0) {
      blob.y = 0;
      break;
    }
  }
}

export function spawnBlob(prep: Prepared, room: number, world?: World): BlobState {
  const blob: BlobState = {
    room,
    x: NEW_GAME_X,
    y: gameYToPlay(NEW_GAME_Y),
    fallIndex: 0,
    jumpTicks: 0,
    facing: 1,
    walkTick: 0,
    walkFrame: 0,
    onGround: false,
  };
  nudgeOutOfSolid(prep, blob, blobInkPixels(poseGraphic(prep, blob)), world);
  blob.onGround = onFloor(prep, blob.room, blob.x, blob.y, world);
  if (world) saveEntry(world, blob);
  return blob;
}

function saveEntry(world: World, blob: BlobState): void {
  world.entry = { x: blob.x, y: playYToGame(blob.y), dd22: world.dd22 };
}

function alignDeathXY(blob: BlobState): void {
  blob.x &= 0xf8;
  const gy = playYToGame(blob.y);
  blob.y = gameYToPlay(((gy + 1) & 0xf8) - 1);
}

function parkDeathSlots(world: World): void {
  for (const e of world.entities) {
    e.x = 0;
    e.y = 0;
    e.ptr = ENTITY_DUMMY_PTR;
  }
  world.nastyCount = 0;
}

function spawnDeathStars(blob: BlobState, world: World): Entity[] {
  const x = blob.x & 0xfe;
  const y = (playYToGame(blob.y) | 1) & 0xff;
  return DEATH_STAR_DIRS.map((dir, i) => ({
    x,
    y,
    ink: 7,
    set: "stars",
    frame: 0,
    ptr: DEAD_GRAPHIC,
    basePtr: DEAD_GRAPHIC,
    dir,
    speedX: 2,
    speedY: 2,
    period: 4,
    timer: DEATH_STAR_TIMERS[i]!,
    state: 2,
    stateTimer: 0x14,
    ai: 0,
    aiPeriod: 8,
    aiCount: 8,
    homeX: x,
    homeY: y,
  }));
}

function finishDeath(prep: Prepared, blob: BlobState, world: World): void {
  world.deathPhase = null;
  world.deathTicks = 0;
  world.blobHidden = false;
  world.blobInk = BLOB_INK;
  if (world.lives === 0) {
    composeEndResult(world, false);
    world.message = GAME_OVER_MSG;
    return;
  }
  world.lives -= 1;
  world.energy = RESPAWN_ENERGY;
  world.platforms |= PLAT_OR_ON_DEATH;
  blob.facing = 1;
  blob.walkFrame = 0;
  blob.walkTick = 0;
  blob.jumpTicks = 0;
  blob.fallIndex = 0;
  if (world.d2c4 === 0) alignDeathXY(blob);
  else {
    blob.x = world.entry.x;
    blob.y = gameYToPlay(world.entry.y);
    world.dd22 = world.entry.dd22;
  }
  enterRoom(prep, world, blob.room, { blob });
  syncHoverpad(prep, world, blob.room, blob);
  blob.onGround = onFloor(prep, blob.room, blob.x, blob.y, world);
}

function tickDeath(prep: Prepared, blob: BlobState, world: World): void {
  if (world.deathPhase === "flash") {
    world.blobInk ^= DEATH_INK_XOR;
    if (world.dd22 === DD22_PAD && world.pad) world.pad.ink ^= DEATH_INK_XOR;
    world.deathTicks += 1;
    if (world.deathTicks >= DEATH_FLASH_FRAMES) {
      world.blobInk = BLOB_INK;
      world.blobHidden = true;
      world.pad = null;
      world.entities = spawnDeathStars(blob, world);
      world.nastyCount = 4;
      world.deathPhase = "fly";
      world.deathTicks = 0;
      requestA41B(world, CHAN_DEATH);
    }
    return;
  }
  if (world.deathPhase === "fly") {
    tickNasties(prep, blob, world);
    world.deathTicks += 1;
    if (world.deathTicks >= DEATH_FLY_FRAMES) {
      parkDeathSlots(world);
      world.deathPhase = "pause";
      world.deathTicks = 0;
    }
    return;
  }
  world.deathTicks += 1;
  if (world.deathTicks >= DEATH_PAUSE_FRAMES) finishDeath(prep, blob, world);
}

/**
 * $C350 / $C35E. Starts flash → $BEC8 burst → HALT pause, then respawn.
 * A ≥ $10 sets $D2C4=1 and restores XY/$DD22 from the last room entry.
 */
export function applyDeath(prep: Prepared, blob: BlobState, world: World, a: number): void {
  if (world.deathPhase) return;
  world.deathA = a & 0xff;
  world.d2c4 = (a & 0xff) >= DEATH_RESTORE_MIN_A ? 1 : 0;
  world.deathPhase = "flash";
  world.deathTicks = 0;
  world.blobHidden = false;
  world.blobInk = BLOB_INK;
  parkBullet(world);
  parkDeathSlots(world);
  requestSfx(world, 0x13);
  if (((a & 0xff) & 7) === 2) requestSfx(world, 0x0f);
}

function applyRoomExit(
  prep: Prepared,
  blob: BlobState,
  movingRight: boolean,
  movingLeft: boolean,
  world?: World,
): boolean {
  const boarded = world?.dd22 === DD22_PAD;
  const gameY = playYToGame(blob.y);
  const downY = boarded ? PAD_EXIT_DOWN_Y : EXIT_DOWN_Y;
  const enterUp = boarded ? PAD_ENTER_UP_Y : ENTER_BOTTOM_Y;
  let dx = 0;
  let dy = 0;
  if (blob.x >= EXIT_RIGHT && blob.x - EXIT_RIGHT < 4 && movingRight) {
    blob.x = ENTER_LEFT_X;
    dx = 1;
  } else if (blob.x + 2 < 4 && movingLeft) {
    blob.x = ENTER_RIGHT_X;
    dx = -1;
  } else if (gameY < downY) {
    blob.y = gameYToPlay(ENTER_TOP_Y);
    dy = 1;
  } else if (gameY >= EXIT_UP_Y) {
    blob.y = gameYToPlay(enterUp);
    dy = -1;
  } else {
    return false;
  }
  const next = moveRoom(blob.room, dx, dy);
  if (next === blob.room) {
    if (dx > 0) blob.x = WIDTH - BLOB_W;
    if (dx < 0) blob.x = 0;
    if (dy > 0) blob.y = HEIGHT - BLOB_H;
    if (dy < 0) blob.y = 0;
    return false;
  }
  blob.room = next;
  const gy = playYToGame(blob.y);
  blob.y = gameYToPlay(((gy + 1) & 0xf8) - 1);
  if (world) {
    enterRoom(prep, world, blob.room, { blob });
    saveEntry(world, blob);
    syncHoverpad(prep, world, blob.room, blob);
  }
  nudgeOutOfSolid(prep, blob, blobInkPixels(poseGraphic(prep, blob, world)), world);
  return true;
}

/**
 * $C679 stores $DD25 then $C67C/$C6C3 + $C0*E. Idle keeps the last pose
 * ($C6D6 does not rewrite $DD1F when no direction is held).
 */
export function animationSet(blob: BlobState, world?: World): { set: string; frame: number } {
  if (world?.dd22 === DD22_PAD) {
    return { set: SEATED_SETS[world.seatPose] ?? "blobxs", frame: 0 };
  }
  const sets = blob.facing > 0 ? WALK_RIGHT_SETS : WALK_LEFT_SETS;
  return { set: sets[blob.walkFrame & 3]!, frame: 0 };
}

function padPlayY(blob: BlobState): number {
  return blob.y + 8;
}

function tickLift(prep: Prepared, blob: BlobState, world: World): void {
  const ceil = d2f4Bits(prep, blob.room, blob.x, blob.y, world) & 8;
  if (!ceil) blob.y = gameYToPlay(playYToGame(blob.y) + LIFT_PX);
  const walls = d2f0Bits(prep, blob.room, blob.x, blob.y, world) & 3;
  if (walls !== 3) {
    world.dd22 = DD22_WALK;
    blob.walkTick = 2;
  }
  blob.fallIndex = 0;
  blob.onGround = false;
}

function tryEnterLift(prep: Prepared, blob: BlobState, world: World): boolean {
  if (((blob.x - LIFT_X_BIAS) & LIFT_X_MASK) !== 0) return false;
  const gameY = playYToGame(blob.y);
  if (((gameY % LIFT_Y_MOD) + LIFT_Y_MOD) % LIFT_Y_MOD !== 0) return false;
  const a = attrAt(prep, blob.room, (blob.x >> 3) + 1, (blob.y >> 3) + 1, world);
  if (a !== LIFT_ATTR) return false;
  world.dd22 = DD22_LIFT;
  return true;
}

function tickPadFlight(prep: Prepared, blob: BlobState, input: Input, world: World): void {
  const bits = dirBits(input);
  const vHit =
    d2f4Bits(prep, blob.room, blob.x, blob.y, world) | d2f4Bits(prep, blob.room, blob.x, padPlayY(blob), world);
  const vAllow = bits ^ (bits & vHit);
  if (vAllow & 8) blob.y = gameYToPlay(playYToGame(blob.y) + HOVERPAD_FLY_PX);
  if (vAllow & 4) blob.y = gameYToPlay(playYToGame(blob.y) - HOVERPAD_FLY_PX);
  copyPadFromBlob(world, blob);
  const hHit =
    d2f0Bits(prep, blob.room, blob.x, blob.y, world) | d2f0Bits(prep, blob.room, blob.x, padPlayY(blob), world);
  const hAllow = bits ^ (bits & hHit);
  if (hAllow & 1) {
    blob.x = (blob.x + HOVERPAD_FLY_PX) & 0xff;
    blob.facing = 1;
  }
  if (hAllow & 2) {
    blob.x = (blob.x - HOVERPAD_FLY_PX) & 0xff;
    blob.facing = -1;
  }
  world.seatTick += 1;
  if (world.seatTick >= ANIM_PERIOD) {
    world.seatTick = 0;
    if (hAllow & 1) world.seatPose = Math.max(0, world.seatPose - 1);
    if (hAllow & 2) world.seatPose = Math.min(4, world.seatPose + 1);
  }
  blob.fallIndex = 0;
  blob.onGround = false;
}

function applyWalk(
  prep: Prepared,
  blob: BlobState,
  input: Input,
  pixels: readonly InkPixel[],
  world?: World,
): void {
  if (input.right && !input.left) {
    const nx = blob.x + WALK_PX;
    if (!overlapsTerrain(prep, blob.room, nx, blob.y, pixels, world)) blob.x = nx;
    blob.facing = 1;
    blob.walkTick += 1;
  } else if (input.left && !input.right) {
    const nx = blob.x - WALK_PX;
    if (!overlapsTerrain(prep, blob.room, nx, blob.y, pixels, world)) blob.x = nx;
    blob.facing = -1;
    blob.walkTick += 1;
  }

  if (blob.walkTick >= ANIM_PERIOD) {
    blob.walkTick = 0;
    blob.walkFrame = (blob.walkFrame + 1) & 3;
    if (world && world.dd22 === DD22_WALK) {
      world.sfxStep ^= 0x01;
      requestSfx(world, world.sfxStep);
    }
  }

  const onStation = world ? onStationPixel(blob, world) : false;
  if (onStation) {
    blob.fallIndex = 0;
    blob.onGround = true;
    return;
  }

  if (world && world.dd22 === DD22_WALK && tryEnterLift(prep, blob, world)) {
    tickLift(prep, blob, world);
    return;
  }

  if (blob.jumpTicks > 0) {
    const ny = blob.y - TEMP_JUMP_PX;
    if (!overlapsTerrain(prep, blob.room, blob.x, ny, pixels, world)) blob.y = ny;
    blob.jumpTicks -= 1;
    blob.fallIndex = 0;
    blob.onGround = false;
  } else {
    const support = supportY(prep, blob.room, blob.x, blob.y, world);
    if (support !== null && support <= blob.y) {
      if (world && blob.fallIndex !== 0) requestA41B(world, CHAN_LAND);
      blob.y = support;
      blob.fallIndex = 0;
      blob.onGround = true;
    } else {
      blob.onGround = false;
      if (world && blob.fallIndex === 0) requestA41B(world, CHAN_FALL);
      const idx = Math.min(blob.fallIndex, FALL_TABLE.length - 1);
      const dy = FALL_TABLE[idx]!;
      const nextY = blob.y + dy;
      blob.fallIndex = Math.min(blob.fallIndex + 1, FALL_TABLE.length);
      const land = supportY(prep, blob.room, blob.x, nextY, world);
      if (land !== null && land <= nextY && land >= blob.y) {
        blob.y = land;
        blob.fallIndex = 0;
        blob.onGround = true;
      } else {
        blob.y = nextY;
      }
    }
  }
}

/**
 * Walk/lift/pad → platforms → fire → drain → pickup → $0C/$0D/$0F/$06 → energy 0 →
 * $70 pulse → nasties → room exit. Teleport, passage and death skip the rest of the tick.
 */
export function tick(prep: Prepared, blob: BlobState, input: Input, world?: World): void {
  if (world?.gameOver) return;
  try {
    tickBody(prep, blob, input, world);
  } finally {
    if (world) tickChannel(world);
  }
}

function tickBody(prep: Prepared, blob: BlobState, input: Input, world?: World): void {
  if (world?.deathPhase) {
    tickDeath(prep, blob, world);
    return;
  }
  if (world?.corePhase === "ceremony") {
    tickCoreCeremony(
      prep,
      blob,
      world,
      tickNasties,
      (next) => enterRoom(prep, world, next, { blob }),
    );
    return;
  }

  if (world && isUiBlocking(world.ui)) {
    world.frames = (world.frames + 1) >>> 0;
    tickOverlay(prep, blob, world);
    return;
  }

  if (world) world.frames = (world.frames + 1) >>> 0;

  const pixels = blobInkPixels(poseGraphic(prep, blob, world));
  if (world) {
    const dirs = dirBits(input);
    if (dirs) world.lastDir = dirs;
  }

  const steer = world?.teleportLatch ? { ...input, left: false, right: false } : input;

  if (world?.dd22 === DD22_PAD) tickPadFlight(prep, blob, steer, world);
  else if (world?.dd22 === DD22_LIFT) tickLift(prep, blob, world);
  else applyWalk(prep, blob, steer, pixels, world);

  if (!world) {
    applyRoomExit(prep, blob, steer.right && !steer.left, steer.left && !steer.right, world);
    if (blob.room < 0 || blob.room >= ROOM_COUNT) blob.room = ((blob.room % ROOM_COUNT) + ROOM_COUNT) % ROOM_COUNT;
    return;
  }

  const walking = world.dd22 === DD22_WALK;
  const stationed = walking && onStationPixel(blob, world);
  if (walking && !stationed) tryBuildPlatform(prep, blob, input, world);
  tickBridges(world);

  if (world.dd22 === DD22_PAD) tickPadFire(prep, blob, !!input.fire, world);
  else tickFire(prep, blob, !!input.fire, world);

  tickEnergyDrain(world);

  const pickupInput = stationed ? { ...input, up: false } : input;
  tickPickup(prep, blob, pickupInput, world);

  const boardedBefore = world.dd22 === DD22_PAD;
  const code = walkSpecialObjects(prep, blob, input, world);
  if (world.dd22 === DD22_PAD && !boardedBefore) copyPadFromBlob(world, blob);
  if (code === "$06") {
    applyDeath(prep, blob, world, DEATH_A_OBJ06);
    return;
  }
  if (code === "$00") {
    world.teleportLatch = true;
    world.ui = beginDoorUi(world, blob.room, !!input.right);
    syncWorldMessage(world, world.ui);
    return;
  }
  if (code === "$0D") {
    world.teleportLatch = true;
    world.ui = beginTeleportUi(blob.room, world);
    return;
  }
  if (code === "$0F") {
    applyPassage(prep, blob, world, { left: !!input.left, right: !!input.right });
    return;
  }

  if (world.energy === 0) {
    applyDeath(prep, blob, world, DEATH_A_ENERGY);
    return;
  }

  if (tickPulses(blob, world)) {
    applyDeath(prep, blob, world, DEATH_A_TILE);
    return;
  }

  const nastyDeath = tickNasties(prep, blob, world);
  if (nastyDeath !== null) {
    applyDeath(prep, blob, world, nastyDeath);
    return;
  }

  applyRoomExit(prep, blob, steer.right && !steer.left, steer.left && !steer.right, world);
  if (blob.room < 0 || blob.room >= ROOM_COUNT) blob.room = ((blob.room % ROOM_COUNT) + ROOM_COUNT) % ROOM_COUNT;
}

export function createWorld(prep: Prepared, room: number): World {
  const core = initCoreState();
  const world: World = {
    terrain: newBuffers(),
    energy: START_ENERGY,
    platforms: START_PLATFORMS,
    firepower: START_FIREPOWER,
    lives: START_LIVES,
    slots: Array.from({ length: PLATFORM_SLOTS }, () => null),
    slotIndex: 0,
    pulseIndex: 0,
    buildLatch: false,
    pickupLatch: false,
    dac0: 0,
    dac: { dac0: 0, dac2: 0, dac4: 0, db19: 3, db1a: 3 },
    entities: [],
    entityCache: null,
    cacheRoom: -1,
    nastyCount: 0,
    spawnGuard: 0,
    energyDrain: START_ENERGY_DRAIN,
    bullet: parkedBullet(),
    fireDir: 0,
    aim: 1,
    collected: new Uint8Array(ITEM_COUNT),
    a350: new Uint8Array(A350_BYTES).fill(0xff),
    extra: null,
    inventory: [],
    cheops: false,
    dd22: DD22_WALK,
    lastDir: 0,
    station: { x: 0, y: 0 },
    pad: null,
    padShotDir: 0,
    padShotHits: 0,
    padShotFrame: 0,
    seatPose: 2,
    seatTick: 0,
    message: "",
    teleportLatch: false,
    ui: idleUi(),
    gameOver: false,
    victory: false,
    endResult: null,
    scoreDigits: zeroScore(),
    a390: freshA390(),
    visitedCount: 0,
    frames: 0,
    d2de: core.d2de,
    coresLeft: core.coresLeft,
    corePairs: core.corePairs,
    corePhase: null,
    coreTicks: 0,
    socketFlags: initSocketFlags(),
    d2c4: 0,
    deathA: 0,
    deathPhase: null,
    deathTicks: 0,
    blobInk: 7,
    blobHidden: false,
    entry: { x: NEW_GAME_X, y: NEW_GAME_Y, dd22: DD22_WALK },
    pulses: [],
    sfx: [],
    sfxStep: SFX_STEP_INIT,
    chan: emptyChan(),
    buzz: [],
  };
  enterRoom(prep, world, room);
  return world;
}

export interface EnterRoomOpts {
  /** $A519 CP $03: invalid teleport / door skips $9C47. */
  nasties?: boolean;
  /** Needed for `$A6C1` core delivery when room is `$C7`. */
  blob?: BlobState;
}

/** $A426 draws the packed room then $A4B1 zeros $DBBB for $31 bytes. */
export function enterRoom(prep: Prepared, world: World, room: number, opts?: EnterRoomOpts): void {
  composeTiles(prep, world.terrain, room);
  for (let i = 0; i < PLATFORM_SLOTS; i++) world.slots[i] = null;
  world.slotIndex = 0;
  world.pulseIndex = 0;
  world.buildLatch = false;
  world.pickupLatch = false;
  parkBullet(world);
  /** `$A47E` first visit +250 / clear `$A390` bit. */
  if (a390Unvisited(world.a390, room)) {
    addScore(world, SCORE_FIRST_VISIT);
    clearA390Bit(world.a390, room);
    world.visitedCount += 1;
  }
  spawnExtra(prep, world, room);
  if (opts?.nasties !== false) enterNasties(prep, world, room, opts?.blob);
  world.pulses = makePulses(prep.pulsesByRoom?.[room], world.dac.dac0);
  syncHoverpad(prep, world, room, opts?.blob);
  if (opts?.blob && room === CORE_ROOM && opts.blob.room === CORE_ROOM) {
    deliverCoreParts(prep, opts.blob, world, (next) => {
      enterRoom(prep, world, next, { blob: opts.blob });
    });
  }
}

export interface TeleportResult extends TeleportEval {
  message: string;
  reason: number;
}

/** Advance door / teleport overlay; apply result when the FSM finishes. */
export function tickOverlay(prep: Prepared, blob: BlobState, world: World): void {
  const ui = world.ui;
  if (ui.kind === "door") {
    if (tickDoorUi(ui, world)) {
      syncWorldMessage(world, ui);
      applySecurityDoor(prep, blob, world, ui.ok, { left: !ui.openRight, right: ui.openRight });
      world.ui = idleUi();
    } else {
      syncWorldMessage(world, ui);
    }
    return;
  }
  if (ui.kind === "teleport") {
    if (tickTeleportUi(ui, blob.room, world)) {
      syncWorldMessage(world, ui);
      applyTeleport(prep, blob, world, ui.buffer);
      if (blob.room < 0 || blob.room >= ROOM_COUNT) {
        blob.room = ((blob.room % ROOM_COUNT) + ROOM_COUNT) % ROOM_COUNT;
      }
      world.ui = idleUi();
    }
  }
}

/**
 * $CFB3 then $A426. Valid $D2C4=$04 loads dest and snaps to its $0D.
 * Invalid $D2C4=$03 stays, wipes platforms, does not respawn nasties.
 */
export function applyTeleport(prep: Prepared, blob: BlobState, world: World, code: string): TeleportResult {
  const ev = evaluateTeleport(code, blob.room);
  world.teleportLatch = true;
  if (ev.ok) {
    blob.room = ev.dest;
    enterRoom(prep, world, ev.dest, { blob });
    const pad = firstTeleport(prep, ev.dest);
    if (pad) {
      blob.x = pad.x;
      blob.y = gameYToPlay(pad.y);
      blob.fallIndex = 0;
      blob.onGround = true;
    }
    syncHoverpad(prep, world, blob.room, blob);
    saveEntry(world, blob);
    world.message = TELEPORT_MSG_OK;
    return { ...ev, message: world.message, reason: TELEPORT_REASON };
  }
  blob.x &= 0xf8;
  blob.y = gameYToPlay(((playYToGame(blob.y) + 1) & 0xf8) - 1);
  enterRoom(prep, world, blob.room, { nasties: false, blob });
  syncHoverpad(prep, world, blob.room, blob);
  saveEntry(world, blob);
  world.message = TELEPORT_MSG_BAD;
  return { ...ev, dest: blob.room, message: world.message, reason: TELEPORT_INVALID_REASON };
}

export interface DoorResult {
  ok: boolean;
  x: number;
  y: number;
  reason: number;
  message: string;
}

/**
 * `$CBDC` / `$CC4B`: success shifts X ±`$30` by Left/Right bit0; fail keeps X.
 * Y snap; `$D2C4=$03`; reload same room without enemy respawn (`$A51C`).
 */
export function applySecurityDoor(
  prep: Prepared,
  blob: BlobState,
  world: World,
  ok: boolean,
  input: { left: boolean; right: boolean },
): DoorResult {
  world.teleportLatch = true;
  if (ok) {
    const bit0 = input.right ? 1 : 0;
    if (bit0) blob.x = (blob.x + DOOR_SHIFT_X) & 0xff;
    else blob.x = (blob.x - DOOR_SHIFT_X) & 0xff;
    world.message = DOOR_MSG_OK;
  } else {
    world.message = DOOR_MSG_BAD;
  }
  blob.y = gameYToPlay(((playYToGame(blob.y) + 1) & 0xf8) - 1);
  world.d2c4 = DOOR_REASON;
  enterRoom(prep, world, blob.room, { nasties: false, blob });
  syncHoverpad(prep, world, blob.room, blob);
  saveEntry(world, blob);
  return {
    ok,
    x: blob.x,
    y: playYToGame(blob.y),
    reason: DOOR_REASON,
    message: world.message,
  };
}

export interface PassageResult {
  room: number;
  x: number;
  y: number;
  reason: number;
}

/**
 * `$D117`: bit0 Right → `$D2C8++` else `--`; sfx `$04`; `$D2C4=$05`;
 * `$A4DF` snaps XY to the dest room's type `$0F`. Nasties respawn (`$A51C` is `$03` only).
 */
export function applyPassage(
  prep: Prepared,
  blob: BlobState,
  world: World,
  input: { left: boolean; right: boolean },
): PassageResult {
  const next = blob.room + (input.right ? 1 : -1);
  if (next >= 0 && next < ROOM_COUNT) blob.room = next;
  requestSfx(world, PASSAGE_SFX);
  world.d2c4 = PASSAGE_REASON;
  enterRoom(prep, world, blob.room, { blob });
  const pad = firstPassage(prep, blob.room);
  if (pad) {
    blob.x = pad.x;
    blob.y = gameYToPlay(pad.y);
  }
  syncHoverpad(prep, world, blob.room, blob);
  saveEntry(world, blob);
  return { room: blob.room, x: blob.x, y: playYToGame(blob.y), reason: PASSAGE_REASON };
}

export function platformCol(x: number): number {
  return ((x + PLATFORM_X_BIAS) & 0xf8) >> 3;
}

export function platformRow(gameY: number): number {
  return (((PLATFORM_ROW_BASE - gameY) & 0xf8) >> 3) - PLAY_ORIGIN;
}

function xorPlatformLayer(world: World, col: number, row: number, layer: number): void {
  const cells = PLATFORM_LAYERS[layer];
  if (!cells) return;
  for (let i = 0; i < 2; i++) {
    const cx = col + i;
    if (cx < 0 || row < 0 || cx >= COLS || row >= ROWS) continue;
    const bytes = cells[i]!;
    const dst = (row * COLS + cx) * CELL;
    for (let py = 0; py < CELL; py++) world.terrain.data[dst + py]! ^= bytes[py]!;
  }
}

function paintPlatformAttr(world: World, col: number, row: number, setBit6: boolean): void {
  for (let i = 0; i < 2; i++) {
    const cx = col + i;
    if (cx < 0 || row < 0 || cx >= COLS || row >= ROWS) continue;
    const idx = row * COLS + cx;
    if (setBit6) world.terrain.attr[idx]! |= 0x40;
    else world.terrain.attr[idx]! &= ~0x40;
  }
}

function writePlatform(world: World, col: number, row: number): void {
  for (let layer = 0; layer < PLATFORM_LAYERS.length; layer++) xorPlatformLayer(world, col, row, layer);
  paintPlatformAttr(world, col, row, false);
}

function floorBit6All(prep: Prepared, blob: BlobState, world: World): boolean {
  const cols = footColumns(blob.x);
  const row = floorRow(blob.y);
  for (const col of cols) {
    if ((attrAt(prep, blob.room, col, row, world) & 0x40) === 0) return false;
  }
  return true;
}

function ceilingBlocked(prep: Prepared, blob: BlobState, world: World): boolean {
  const cols = footColumns(blob.x);
  const row = (blob.y >> 3) - 1;
  for (const col of cols) {
    if (solidAt(prep, blob.room, col, row, world)) return true;
  }
  return false;
}

function isSpecial64(prep: Prepared, room: number, col: number, row: number, world: World): boolean {
  return (attrAt(prep, room, col, row, world) & 0x7f) === 0x64;
}

/**
 * $C79F: Down alone ($DD23==$04), stock $D2CE > 0, latch $DD2C, then XOR
 * four $DC55 layers and RES 6 on the two cells ($DB88 / $DBA6).
 */
function tryBuildPlatform(prep: Prepared, blob: BlobState, input: Input, world: World): void {
  const bits =
    (input.right ? 1 : 0) | (input.left ? 2 : 0) | (input.down ? PLATFORM_INPUT : 0) | (input.up ? 8 : 0);
  if (bits !== PLATFORM_INPUT) {
    world.buildLatch = false;
    return;
  }
  if (world.buildLatch) return;
  if (world.platforms === 0) return;
  world.buildLatch = true;

  let gameY = playYToGame(blob.y);
  if (gameY < 0x17) {
    blob.y = gameYToPlay(0x0f);
    gameY = 0x0f;
  }

  if (gameY < 0x17 || !floorBit6All(prep, blob, world)) {
    if (ceilingBlocked(prep, blob, world)) return;
    const gy = playYToGame(blob.y);
    blob.y = gameYToPlay(((gy + 1) & 0xf8) + 8 - 1);
  }

  const col = platformCol(blob.x);
  const row = platformRow(playYToGame(blob.y));
  if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return;
  if (isSpecial64(prep, blob.room, col, row, world) || isSpecial64(prep, blob.room, col + 1, row, world)) return;

  const free = world.slots.findIndex((s) => s === null);
  if (free < 0) return;

  world.slots[free] = {
    col,
    row,
    life: (world.dac0 & 3) + PLATFORM_LIFE_BASE,
    phase: 0,
  };
  writePlatform(world, col, row);
  world.platforms = Math.max(0, world.platforms - PLATFORM_COST);
  requestA41B(world, CHAN_PLATFORM);
}

/** $DBEC: one of 12 slots per tick. DEC life; below 4, peel XOR layers then SET 6. */
function tickBridges(world: World): void {
  world.slotIndex += 1;
  if (world.slotIndex >= PLATFORM_SLOTS) world.slotIndex = 0;
  const slot = world.slots[world.slotIndex];
  if (!slot) return;
  slot.life -= 1;
  if (slot.life >= 4) return;
  slot.phase += 1;
  xorPlatformLayer(world, slot.col, slot.row, slot.phase - 1);
  if (slot.phase < 4) return;
  paintPlatformAttr(world, slot.col, slot.row, true);
  world.slots[world.slotIndex] = null;
}

export function fallSpeed(blob: BlobState, world?: World): number {
  if (world?.dd22 === DD22_LIFT) return -LIFT_PX;
  if (world?.dd22 === DD22_PAD) return 0;
  if (blob.jumpTicks > 0) return -TEMP_JUMP_PX;
  if (blob.onGround) return 0;
  const idx = Math.min(Math.max(blob.fallIndex - 1, 0), FALL_TABLE.length - 1);
  return FALL_TABLE[idx]!;
}

export function cellPos(blob: BlobState): { col: number; row: number } {
  return { col: blob.x >> 3, row: blob.y >> 3 };
}
