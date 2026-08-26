"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/dump.ts
var fs = __toESM(require("node:fs"), 1);
var path = __toESM(require("node:path"), 1);

// src/constants.ts
var COLS = 32;
var ROWS = 18;
var CELL = 8;
var WIDTH = COLS * CELL;
var HEIGHT = ROWS * CELL;
var PLAY_ORIGIN = 6;
var MAP_COLS = 16;
var MAP_ROWS = 32;
var ROOM_COUNT = MAP_COLS * MAP_ROWS;
var ROOM_SKIP = 199;
var CLEAR_ATTR = 71;
var WALK_PX = 2;
var FALL_TABLE = [1, 0, 1, 0, 1, 2, 1, 2, 1, 2, 2, 3, 2, 3, 3, 4];
var ANIM_PERIOD = 3;
var WALK_RIGHT_SETS = ["blobwr1", "blobsr1", "blobwr2", "blobsr2"];
var WALK_LEFT_SETS = ["blobwl1", "blobsl1", "blobwl2", "blobsl2"];
var BLOB_COLS = 3;
var BLOB_ROWS = 2;
var BLOB_W = BLOB_COLS * CELL;
var BLOB_H = BLOB_ROWS * CELL;
var GAME_Y_ORIGIN = 143;
var EXIT_RIGHT = 240;
var ENTER_LEFT_X = 0;
var ENTER_RIGHT_X = 240;
var EXIT_DOWN_Y = 14;
var ENTER_TOP_Y = 143;
var EXIT_UP_Y = 144;
var ENTER_BOTTOM_Y = 15;
var TEMP_JUMP_TICKS = 12;
var TEMP_JUMP_PX = 2;
var START_ENERGY = 23;
var START_PLATFORMS = 48;
var START_FIREPOWER = 126;
var PLATFORM_COST = 2;
var PLATFORM_SLOTS = 12;
var PLATFORM_INPUT = 4;
var PLATFORM_ROW_BASE = 214;
var PLATFORM_X_BIAS = 4;
var PLATFORM_LIFE_BASE = 5;
var PLATFORM_LAYERS = [
  [
    [96, 192, 7, 28, 10, 2, 3, 0],
    [12, 6, 0, 0, 0, 4, 88, 0]
  ],
  [
    [216, 213, 67, 12, 0, 0, 24, 0],
    [10, 181, 232, 56, 80, 68, 240, 16]
  ],
  [
    [200, 242, 65, 8, 9, 5, 0, 8],
    [11, 28, 0, 32, 160, 32, 80, 32]
  ],
  [
    [128, 16, 2, 0, 8, 1, 0, 4],
    [2, 64, 8, 0, 32, 0, 32, 0]
  ]
];
var SPECTRUM = [
  [0, 0, 0],
  [0, 0, 197],
  [197, 0, 0],
  [197, 0, 197],
  [0, 198, 0],
  [0, 198, 197],
  [197, 198, 0],
  [205, 198, 205]
];
var BRIGHT = [
  [0, 0, 0],
  [0, 0, 255],
  [255, 0, 0],
  [255, 0, 255],
  [0, 255, 0],
  [0, 255, 255],
  [255, 255, 0],
  [255, 255, 255]
];

// src/render.ts
function paperInk(attr) {
  const table = attr & 64 ? BRIGHT : SPECTRUM;
  return [table[attr >> 3 & 7], table[attr & 7]];
}
function roomCol(id) {
  return id % MAP_COLS;
}
function roomRow(id) {
  return id / MAP_COLS | 0;
}
function moveRoom(id, dx, dy) {
  const c = roomCol(id) + dx;
  const r = roomRow(id) + dy;
  if (c < 0 || c >= MAP_COLS || r < 0 || r >= MAP_ROWS) return id;
  return r * MAP_COLS + c;
}
function clampRoom(id) {
  if (id < 0) return 0;
  if (id >= ROOM_COUNT) return ROOM_COUNT - 1;
  return id | 0;
}
function prepare(data) {
  const graphics = [];
  for (const g of data.graphics.graphics) graphics[g.id] = g;
  const sprites = [];
  for (const g of data.sprites.graphics) sprites[g.id] = g;
  const actorsBySet = /* @__PURE__ */ new Map();
  if (data.actors) {
    for (const g of data.actors.graphics) {
      const name = g.set ?? "";
      const list = actorsBySet.get(name) ?? [];
      list.push(g);
      actorsBySet.set(name, list);
    }
    for (const list of actorsBySet.values()) {
      list.sort((a, b) => (a.frame ?? 0) - (b.frame ?? 0));
    }
  }
  const blocks = data.blocks.blocks.map((b) => b.subblocks);
  const itemsByRoom = Array.from({ length: ROOM_COUNT }, () => []);
  for (const it of data.items.items) {
    if (it.sprite === 255) continue;
    if (!it.placed) continue;
    if ((it.row & 127) < PLAY_ORIGIN) continue;
    if (it.room === ROOM_SKIP) continue;
    if (it.room >= 0 && it.room < ROOM_COUNT) itemsByRoom[it.room].push(it);
  }
  return { graphics, sprites, actorsBySet, blocks, rooms: data.rooms.rooms, itemsByRoom };
}
function newBuffers() {
  return {
    data: new Uint8Array(COLS * ROWS * CELL),
    attr: new Uint8Array(COLS * ROWS)
  };
}
function copyBuffers(src, dst) {
  dst.data.set(src.data);
  dst.attr.set(src.attr);
}
function newRgba() {
  return new Uint8ClampedArray(WIDTH * HEIGHT * 4);
}
function clearBuffers(buf2) {
  buf2.data.fill(0);
  buf2.attr.fill(CLEAR_ATTR);
}
function blitGraphic(prep2, buf2, ident, x, y) {
  const graphic = prep2.graphics[ident];
  if (!graphic?.cells?.length) return;
  for (const cell of graphic.cells) {
    const cy = y + cell.row;
    const cx = x + cell.col;
    if (cx < 0 || cy < 0 || cx >= COLS || cy >= ROWS) continue;
    const dst = (cy * COLS + cx) * CELL;
    for (let py = 0; py < CELL; py++) buf2.data[dst + py] = cell.data[py];
  }
}
function blitBlock(prep2, buf2, ident, x, y) {
  const sub = prep2.blocks[ident];
  if (!sub) return;
  let rx = x + 4;
  let ry = y + 3;
  let k = 0;
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 2; col++) {
      blitGraphic(prep2, buf2, sub[k], rx, ry);
      k += 1;
      rx -= 4;
    }
    rx = x + 4;
    ry -= 3;
  }
}
function composeTiles(prep2, buf2, roomId) {
  clearBuffers(buf2);
  const room2 = prep2.rooms[roomId];
  let x = 0;
  let y = 0;
  let n = 0;
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 4; j++) {
      blitBlock(prep2, buf2, room2.blocks[n], x, y);
      n += 1;
      x += 8;
    }
    x = 0;
    y += 6;
  }
  const attrs = room2.attributes;
  for (let ry = 0; ry < ROWS; ry++) {
    const row = attrs[ry];
    const base = ry * COLS;
    for (let cx = 0; cx < COLS; cx++) buf2.attr[base + cx] = row[cx];
  }
}
function itemCells(item) {
  const cells = [];
  const row0 = (item.row & 127) - PLAY_ORIGIN;
  const col0 = item.col & 31;
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 2; c++) {
      const cy = row0 + r;
      const cx = col0 + c;
      if (cx >= 0 && cy >= 0 && cx < COLS && cy < ROWS) cells.push([cx, cy]);
    }
  }
  return cells;
}
function blitItems(prep2, buf2, roomId) {
  const list = prep2.itemsByRoom[roomId];
  if (!list?.length) return;
  for (const it of list) {
    const sprite = prep2.sprites[it.sprite];
    if (!sprite) continue;
    const attr = it.attr_bits & 7 | 64;
    const row0 = (it.row & 127) - PLAY_ORIGIN;
    const col0 = it.col & 31;
    for (const cell of sprite.cells) {
      const cy = row0 + cell.row;
      const cx = col0 + cell.col;
      if (cx < 0 || cy < 0 || cx >= COLS || cy >= ROWS) continue;
      const dst = (cy * COLS + cx) * CELL;
      for (let py = 0; py < CELL; py++) buf2.data[dst + py] ^= cell.data[py];
      buf2.attr[cy * COLS + cx] = attr;
    }
  }
}
function blitGrafix(buf2, frame, x, y, ink) {
  const occupied = /* @__PURE__ */ new Set();
  for (const cell of frame.cells) {
    for (let py = 0; py < CELL; py++) {
      const bits = cell.data[py];
      if (!bits) continue;
      const pyAbs = y + cell.row * CELL + py;
      for (let px = 0; px < CELL; px++) {
        if (!(bits & 128 >> px)) continue;
        const pxAbs = x + cell.col * CELL + px;
        if (pxAbs < 0 || pyAbs < 0 || pxAbs >= WIDTH || pyAbs >= HEIGHT) continue;
        const cx = pxAbs >> 3;
        const cy = pyAbs >> 3;
        buf2.data[(cy * COLS + cx) * CELL + (pyAbs & 7)] ^= 128 >> (pxAbs & 7);
        occupied.add(cy * COLS + cx);
      }
    }
  }
  const inkBits = ink & 7;
  for (const idx of occupied) {
    const attr = buf2.attr[idx];
    if (attr & 32) continue;
    buf2.attr[idx] = attr & 248 | inkBits;
  }
}
function rasterize(buf2, rgba2, overlaySolid, solidGrid) {
  let p = 0;
  for (let cy = 0; cy < ROWS; cy++) {
    for (let py = 0; py < CELL; py++) {
      for (let cx = 0; cx < COLS; cx++) {
        const idx = cy * COLS + cx;
        const [paper, ink] = paperInk(buf2.attr[idx]);
        const bits = buf2.data[idx * CELL + py];
        const mark = overlaySolid && solidGrid && solidGrid[cy][cx];
        for (let px = 0; px < CELL; px++) {
          const on = bits & 128 >> px;
          let r = on ? ink[0] : paper[0];
          let g = on ? ink[1] : paper[1];
          let b = on ? ink[2] : paper[2];
          if (mark) {
            r = r + 255 >> 1;
            g = g >> 1;
            b = b + 255 >> 1;
          }
          rgba2[p] = r;
          rgba2[p + 1] = g;
          rgba2[p + 2] = b;
          rgba2[p + 3] = 255;
          p += 4;
        }
      }
    }
  }
  return rgba2;
}
function renderRoom(prep2, buf2, rgba2, roomId, opts = {}) {
  composeTiles(prep2, buf2, roomId);
  if (opts.items !== false) blitItems(prep2, buf2, roomId);
  if (opts.blob) {
    const frames = prep2.actorsBySet.get(opts.blob.set);
    const frame = frames?.[opts.blob.frame];
    if (frame) blitGrafix(buf2, frame, opts.blob.x, opts.blob.y, 7);
  }
  const solid = opts.overlay ? prep2.rooms[roomId].solid : null;
  return rasterize(buf2, rgba2, !!opts.overlay, solid);
}
function renderWorld(prep2, world, buf2, rgba2, roomId, opts = {}) {
  copyBuffers(world.terrain, buf2);
  if (opts.items !== false) blitItems(prep2, buf2, roomId);
  if (opts.blob) {
    const frames = prep2.actorsBySet.get(opts.blob.set);
    const frame = frames?.[opts.blob.frame];
    if (frame) blitGrafix(buf2, frame, opts.blob.x, opts.blob.y, 7);
  }
  const solid = opts.overlay ? prep2.rooms[roomId].solid : null;
  return rasterize(buf2, rgba2, !!opts.overlay, solid);
}

// src/physics.ts
function playYToGame(y) {
  return GAME_Y_ORIGIN - y;
}
function gameYToPlay(gameY) {
  return GAME_Y_ORIGIN - gameY;
}
function blocksBlob(attr) {
  return (attr & 64) === 0;
}
function solidAt(prep2, room2, col, row, world) {
  if (col < 0 || row < 0 || col >= COLS || row >= ROWS) return false;
  const attr = world ? world.terrain.attr[row * COLS + col] : prep2.rooms[room2].attributes[row][col];
  return blocksBlob(attr);
}
function attrAt(prep2, room2, col, row, world) {
  if (col < 0 || row < 0 || col >= COLS || row >= ROWS) return 71;
  return world ? world.terrain.attr[row * COLS + col] : prep2.rooms[room2].attributes[row][col];
}
function footColumns(x) {
  const col = x >> 3;
  if ((x & 7) === 0) return [col, col + 1];
  return [col, col + 1, col + 2];
}
function floorRow(y) {
  return y + BLOB_H >> 3;
}
var bboxPixels = [];
for (let py = 0; py < BLOB_H; py++) {
  for (let px = 0; px < BLOB_W; px++) {
    bboxPixels.push([px, py]);
  }
}
var inkCache = /* @__PURE__ */ new WeakMap();
function blobInkPixels(graphic) {
  if (!graphic) return bboxPixels;
  const hit = inkCache.get(graphic);
  if (hit) return hit;
  const pixels = [];
  for (const cell of graphic.cells) {
    for (let py = 0; py < CELL; py++) {
      const bits = cell.data[py];
      if (!bits) continue;
      for (let px = 0; px < CELL; px++) {
        if (bits & 128 >> px) pixels.push([cell.col * CELL + px, cell.row * CELL + py]);
      }
    }
  }
  inkCache.set(graphic, pixels);
  return pixels;
}
function poseGraphic(prep2, blob) {
  const anim = animationSet(blob);
  return prep2.actorsBySet.get(anim.set)?.[anim.frame];
}
function overlapsTerrain(prep2, room2, x, y, pixels, world) {
  for (const [ox, oy] of pixels) {
    const px = x + ox;
    const py = y + oy;
    if (px < 0 || py < 0 || px >= WIDTH || py >= HEIGHT) continue;
    if (solidAt(prep2, room2, px >> 3, py >> 3, world)) return true;
  }
  return false;
}
function onFloor(prep2, room2, x, y, world) {
  return supportY(prep2, room2, x, y, world) === y;
}
function supportY(prep2, room2, x, y, world) {
  const feet = y + BLOB_H;
  const start = Math.max(0, feet >> 3);
  for (let row = start; row < ROWS; row++) {
    let hit = false;
    for (const col of footColumns(x)) {
      if (solidAt(prep2, room2, col, row, world)) {
        hit = true;
        break;
      }
    }
    if (hit) return row * CELL - BLOB_H;
  }
  return null;
}
function nudgeOutOfSolid(prep2, blob, pixels, world) {
  let guard = 0;
  while (overlapsTerrain(prep2, blob.room, blob.x, blob.y, pixels, world) && guard < HEIGHT) {
    blob.y -= 1;
    guard += 1;
    if (blob.y < 0) {
      blob.y = 0;
      break;
    }
  }
}
function spawnBlob(prep2, room2, world) {
  const blob = {
    room: room2,
    x: 136,
    y: gameYToPlay(63),
    fallIndex: 0,
    jumpTicks: 0,
    facing: 1,
    walkTick: 0,
    walkFrame: 0,
    onGround: false
  };
  nudgeOutOfSolid(prep2, blob, blobInkPixels(poseGraphic(prep2, blob)), world);
  blob.onGround = onFloor(prep2, blob.room, blob.x, blob.y, world);
  return blob;
}
function applyRoomExit(prep2, blob, movingRight, movingLeft, world) {
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
  blob.y = gameYToPlay((gy + 1 & 248) - 1);
  if (world) enterRoom(prep2, world, blob.room);
  nudgeOutOfSolid(prep2, blob, blobInkPixels(poseGraphic(prep2, blob)), world);
  return true;
}
function animationSet(blob) {
  const sets = blob.facing > 0 ? WALK_RIGHT_SETS : WALK_LEFT_SETS;
  return { set: sets[blob.walkFrame & 3], frame: 0 };
}
function tick(prep2, blob, input, world) {
  const pixels = blobInkPixels(poseGraphic(prep2, blob));
  if (input.right && !input.left) {
    const nx = blob.x + WALK_PX;
    if (!overlapsTerrain(prep2, blob.room, nx, blob.y, pixels, world)) blob.x = nx;
    blob.facing = 1;
    blob.walkTick += 1;
  } else if (input.left && !input.right) {
    const nx = blob.x - WALK_PX;
    if (!overlapsTerrain(prep2, blob.room, nx, blob.y, pixels, world)) blob.x = nx;
    blob.facing = -1;
    blob.walkTick += 1;
  }
  if (blob.walkTick >= ANIM_PERIOD) {
    blob.walkTick = 0;
    blob.walkFrame = blob.walkFrame + 1 & 3;
  }
  if (blob.jumpTicks > 0) {
    const ny = blob.y - TEMP_JUMP_PX;
    if (!overlapsTerrain(prep2, blob.room, blob.x, ny, pixels, world)) blob.y = ny;
    blob.jumpTicks -= 1;
    blob.fallIndex = 0;
    blob.onGround = false;
  } else {
    const support = supportY(prep2, blob.room, blob.x, blob.y, world);
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
      const dy = FALL_TABLE[idx];
      const nextY = blob.y + dy;
      blob.fallIndex = Math.min(blob.fallIndex + 1, FALL_TABLE.length);
      const land = supportY(prep2, blob.room, blob.x, nextY, world);
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
    tryBuildPlatform(prep2, blob, input, world);
    tickBridges(world);
  }
  applyRoomExit(prep2, blob, input.right && !input.left, input.left && !input.right, world);
  if (blob.room < 0 || blob.room >= ROOM_COUNT) blob.room = (blob.room % ROOM_COUNT + ROOM_COUNT) % ROOM_COUNT;
}
function createWorld(prep2, room2) {
  const world = {
    terrain: newBuffers(),
    energy: START_ENERGY,
    platforms: START_PLATFORMS,
    firepower: START_FIREPOWER,
    slots: Array.from({ length: PLATFORM_SLOTS }, () => null),
    slotIndex: 0,
    buildLatch: false,
    dac0: 0
  };
  enterRoom(prep2, world, room2);
  return world;
}
function enterRoom(prep2, world, room2) {
  composeTiles(prep2, world.terrain, room2);
  for (let i = 0; i < PLATFORM_SLOTS; i++) world.slots[i] = null;
  world.slotIndex = 0;
  world.buildLatch = false;
}
function platformCol(x) {
  return (x + PLATFORM_X_BIAS & 248) >> 3;
}
function platformRow(gameY) {
  return ((PLATFORM_ROW_BASE - gameY & 248) >> 3) - PLAY_ORIGIN;
}
function xorPlatformLayer(world, col, row, layer) {
  const cells = PLATFORM_LAYERS[layer];
  if (!cells) return;
  for (let i = 0; i < 2; i++) {
    const cx = col + i;
    if (cx < 0 || row < 0 || cx >= COLS || row >= ROWS) continue;
    const bytes = cells[i];
    const dst = (row * COLS + cx) * CELL;
    for (let py = 0; py < CELL; py++) world.terrain.data[dst + py] ^= bytes[py];
  }
}
function paintPlatformAttr(world, col, row, setBit6) {
  for (let i = 0; i < 2; i++) {
    const cx = col + i;
    if (cx < 0 || row < 0 || cx >= COLS || row >= ROWS) continue;
    const idx = row * COLS + cx;
    if (setBit6) world.terrain.attr[idx] |= 64;
    else world.terrain.attr[idx] &= ~64;
  }
}
function writePlatform(world, col, row) {
  for (let layer = 0; layer < PLATFORM_LAYERS.length; layer++) xorPlatformLayer(world, col, row, layer);
  paintPlatformAttr(world, col, row, false);
}
function floorBit6All(prep2, blob, world) {
  const cols = footColumns(blob.x);
  const row = floorRow(blob.y);
  for (const col of cols) {
    if ((attrAt(prep2, blob.room, col, row, world) & 64) === 0) return false;
  }
  return true;
}
function ceilingBlocked(prep2, blob, world) {
  const cols = footColumns(blob.x);
  const row = (blob.y >> 3) - 1;
  for (const col of cols) {
    if (solidAt(prep2, blob.room, col, row, world)) return true;
  }
  return false;
}
function isSpecial64(prep2, room2, col, row, world) {
  return (attrAt(prep2, room2, col, row, world) & 127) === 100;
}
function tryBuildPlatform(prep2, blob, input, world) {
  const bits = (input.right ? 1 : 0) | (input.left ? 2 : 0) | (input.down ? PLATFORM_INPUT : 0) | (input.up ? 8 : 0);
  if (bits !== PLATFORM_INPUT) {
    world.buildLatch = false;
    return;
  }
  if (world.buildLatch) return;
  if (world.platforms === 0) return;
  world.buildLatch = true;
  let gameY = playYToGame(blob.y);
  if (gameY < 23) {
    blob.y = gameYToPlay(15);
    gameY = 15;
  }
  if (gameY < 23 || !floorBit6All(prep2, blob, world)) {
    if (ceilingBlocked(prep2, blob, world)) return;
    const gy = playYToGame(blob.y);
    blob.y = gameYToPlay((gy + 1 & 248) + 8 - 1);
  }
  const col = platformCol(blob.x);
  const row = platformRow(playYToGame(blob.y));
  if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return;
  if (isSpecial64(prep2, blob.room, col, row, world) || isSpecial64(prep2, blob.room, col + 1, row, world)) return;
  const free = world.slots.findIndex((s) => s === null);
  if (free < 0) return;
  world.slots[free] = {
    col,
    row,
    life: (world.dac0 & 3) + PLATFORM_LIFE_BASE,
    phase: 0
  };
  writePlatform(world, col, row);
  world.platforms = Math.max(0, world.platforms - PLATFORM_COST);
}
function tickBridges(world) {
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

// src/dump.ts
function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  if (i === -1) return fallback;
  return process.argv[i + 1] ?? fallback;
}
function has(name) {
  return process.argv.includes(name);
}
function loadData(dir) {
  const read = (name) => JSON.parse(fs.readFileSync(path.join(dir, name), "utf8"));
  const pack = {
    rooms: read("rooms.json"),
    graphics: read("graphics.json"),
    blocks: read("blocks.json"),
    sprites: read("sprites.json"),
    items: read("items.json")
  };
  const actorsPath = path.join(dir, "actors.json");
  if (fs.existsSync(actorsPath)) pack.actors = JSON.parse(fs.readFileSync(actorsPath, "utf8"));
  return prepare(pack);
}
function parseRooms(spec, prep2) {
  if (spec === "sample") {
    const set = /* @__PURE__ */ new Set([0, 1, 15, 16, 31, 32, 168, 199, 255, 256, 511]);
    prep2.itemsByRoom.forEach((list, id) => {
      if (list.length) set.add(id);
    });
    return [...set].sort((a, b) => a - b);
  }
  return spec.split(",").map((s) => parseInt(s, 10));
}
function metaFor(prep2, roomId) {
  const cells = [];
  for (const it of prep2.itemsByRoom[roomId] ?? []) {
    for (const xy of itemCells(it)) cells.push(xy);
  }
  return {
    room: roomId,
    items: prep2.itemsByRoom[roomId]?.length ?? 0,
    item_cells: cells,
    solid: prep2.rooms[roomId].solid
  };
}
if (has("--nav-test")) {
  const t = [
    moveRoom(0, -1, 0) === 0,
    moveRoom(0, 0, -1) === 0,
    moveRoom(15, 1, 0) === 15,
    moveRoom(15, 0, -1) === 15,
    moveRoom(496, 0, 1) === 496,
    moveRoom(511, 1, 0) === 511,
    moveRoom(511, 0, 1) === 511,
    moveRoom(0, 1, 0) === 1,
    moveRoom(0, 0, 1) === 16,
    moveRoom(15, 0, 1) === 31,
    roomCol(16) === 0 && roomRow(16) === 1,
    clampRoom(-3) === 0 && clampRoom(999) === 511
  ];
  process.stdout.write(t.every(Boolean) ? "ok\n" : t.join(",") + "\n");
  process.exit(0);
}
var dataDir = arg("--data", "out");
var prep = loadData(dataDir);
var buf = newBuffers();
var rgba = newRgba();
if (has("--timing")) {
  const repeat = parseInt(arg("--repeat", "80"), 10);
  const rooms = parseRooms(arg("--rooms", "0,16,168,255,511"), prep);
  const t0 = process.hrtime.bigint();
  let n = 0;
  for (let i = 0; i < repeat; i++) {
    for (const id of rooms) {
      renderRoom(prep, buf, rgba, id, { items: true, overlay: false });
      n += 1;
    }
  }
  const ns = Number(process.hrtime.bigint() - t0);
  const meanMs = ns / 1e6 / n;
  const liveId = rooms[0] ?? 0;
  const world = createWorld(prep, liveId);
  const blob = spawnBlob(prep, liveId, world);
  const none = { left: false, right: false, up: false, down: false };
  const liveRepeat = Math.max(n, 1);
  const t1 = process.hrtime.bigint();
  for (let i = 0; i < liveRepeat; i++) {
    tick(prep, blob, i % 17 === 0 ? { ...none, down: true } : none, world);
    renderWorld(prep, world, buf, rgba, blob.room, {
      items: true,
      overlay: false,
      blob: { x: blob.x, y: blob.y, set: "blobwr1", frame: 0 }
    });
  }
  const liveNs = Number(process.hrtime.bigint() - t1);
  const liveMeanMs = liveNs / 1e6 / liveRepeat;
  process.stdout.write(
    JSON.stringify({
      frames: n,
      mean_ms: meanMs,
      fps: 1e3 / meanMs,
      live_frames: liveRepeat,
      live_mean_ms: liveMeanMs,
      live_fps: 1e3 / liveMeanMs,
      rooms
    }) + "\n"
  );
  process.exit(0);
}
var overlay = has("--overlay");
var items = !has("--no-items");
var outdir = arg("--outdir", "");
var roomList = has("--rooms") ? parseRooms(arg("--rooms", "0"), prep) : [parseInt(arg("--room", "0"), 10)];
if (outdir) {
  fs.mkdirSync(outdir, { recursive: true });
  const batch = [];
  for (const id of roomList) {
    renderRoom(prep, buf, rgba, id, { items, overlay });
    fs.writeFileSync(path.join(outdir, "room_" + id + ".rgba"), Buffer.from(rgba));
    batch.push(metaFor(prep, id));
  }
  process.stdout.write(JSON.stringify(batch) + "\n");
  process.exit(0);
}
var room = roomList[0];
renderRoom(prep, buf, rgba, room, { items, overlay });
if (has("--rgba")) fs.writeFileSync(arg("--rgba", "room.rgba"), Buffer.from(rgba));
if (has("--meta")) process.stdout.write(JSON.stringify(metaFor(prep, room)) + "\n");
