import {
  ANIM_PERIOD,
  BLOB_H,
  BLOB_W,
  CELL,
  COLS,
  ENTER_BOTTOM_Y,
  ENTER_LEFT_X,
  ENTER_RIGHT_X,
  ENTER_TOP_Y,
  EXIT_DOWN_Y,
  EXIT_RIGHT,
  EXIT_UP_Y,
  FALL_TABLE,
  GAME_Y_ORIGIN,
  HEIGHT,
  PLATFORM_COST,
  PLATFORM_INPUT,
  PLATFORM_LAYERS,
  PLATFORM_LIFE_BASE,
  PLATFORM_ROW_BASE,
  PLATFORM_SLOTS,
  PLATFORM_X_BIAS,
  PLAY_ORIGIN,
  ROOM_COUNT,
  ROWS,
  START_ENERGY,
  START_FIREPOWER,
  START_PLATFORMS,
  TEMP_JUMP_PX,
  TEMP_JUMP_TICKS,
  WALK_LEFT_SETS,
  WALK_PX,
  WALK_RIGHT_SETS,
  WIDTH,
} from "./constants";
import { composeTiles, moveRoom, newBuffers } from "./render";
import type { Graphic, Prepared, World } from "./types";

export interface Input {
  left: boolean;
  right: boolean;
  up: boolean;
  down?: boolean;
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

export function poseGraphic(prep: Prepared, blob: BlobState): Graphic | undefined {
  const anim = animationSet(blob);
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
    x: 0x88,
    y: gameYToPlay(0x3f),
    fallIndex: 0,
    jumpTicks: 0,
    facing: 1,
    walkTick: 0,
    walkFrame: 0,
    onGround: false,
  };
  nudgeOutOfSolid(prep, blob, blobInkPixels(poseGraphic(prep, blob)), world);
  blob.onGround = onFloor(prep, blob.room, blob.x, blob.y, world);
  return blob;
}

function applyRoomExit(
  prep: Prepared,
  blob: BlobState,
  movingRight: boolean,
  movingLeft: boolean,
  world?: World,
): boolean {
  const gameY = playYToGame(blob.y);
  let dx = 0;
  let dy = 0;
  if (blob.x >= EXIT_RIGHT && blob.x - EXIT_RIGHT < 4 && movingRight) {
    blob.x = ENTER_LEFT_X;
    dx = 1;
  } else if (blob.x + 2 < 4 && movingLeft) {
    blob.x = ENTER_RIGHT_X;
    dx = -1;
  } else if (gameY < EXIT_DOWN_Y) {
    blob.y = gameYToPlay(ENTER_TOP_Y);
    dy = 1;
  } else if (gameY >= EXIT_UP_Y) {
    blob.y = gameYToPlay(ENTER_BOTTOM_Y);
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
  if (world) enterRoom(prep, world, blob.room);
  nudgeOutOfSolid(prep, blob, blobInkPixels(poseGraphic(prep, blob)), world);
  return true;
}

/**
 * $C679 stores $DD25 then $C67C/$C6C3 + $C0*E. Idle keeps the last pose
 * ($C6D6 does not rewrite $DD1F when no direction is held).
 */
export function animationSet(blob: BlobState): { set: string; frame: number } {
  const sets = blob.facing > 0 ? WALK_RIGHT_SETS : WALK_LEFT_SETS;
  return { set: sets[blob.walkFrame & 3]!, frame: 0 };
}

export function tick(prep: Prepared, blob: BlobState, input: Input, world?: World): void {
  const pixels = blobInkPixels(poseGraphic(prep, blob));

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
      blob.y = support;
      blob.fallIndex = 0;
      blob.onGround = true;
      if (input.up) {
        blob.jumpTicks = TEMP_JUMP_TICKS;
        blob.onGround = false;
      }
    } else {
      blob.onGround = false;
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

  if (world) {
    tryBuildPlatform(prep, blob, input, world);
    tickBridges(world);
  }

  applyRoomExit(prep, blob, input.right && !input.left, input.left && !input.right, world);
  if (blob.room < 0 || blob.room >= ROOM_COUNT) blob.room = ((blob.room % ROOM_COUNT) + ROOM_COUNT) % ROOM_COUNT;
}

export function createWorld(prep: Prepared, room: number): World {
  const world: World = {
    terrain: newBuffers(),
    energy: START_ENERGY,
    platforms: START_PLATFORMS,
    firepower: START_FIREPOWER,
    slots: Array.from({ length: PLATFORM_SLOTS }, () => null),
    slotIndex: 0,
    buildLatch: false,
    dac0: 0,
  };
  enterRoom(prep, world, room);
  return world;
}

/** $A426 draws the packed room then $A4B1 zeros $DBBB for $31 bytes. */
export function enterRoom(prep: Prepared, world: World, room: number): void {
  composeTiles(prep, world.terrain, room);
  for (let i = 0; i < PLATFORM_SLOTS; i++) world.slots[i] = null;
  world.slotIndex = 0;
  world.buildLatch = false;
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

export function fallSpeed(blob: BlobState): number {
  if (blob.jumpTicks > 0) return -TEMP_JUMP_PX;
  if (blob.onGround) return 0;
  const idx = Math.min(Math.max(blob.fallIndex - 1, 0), FALL_TABLE.length - 1);
  return FALL_TABLE[idx]!;
}

export function cellPos(blob: BlobState): { col: number; row: number } {
  return { col: blob.x >> 3, row: blob.y >> 3 };
}
