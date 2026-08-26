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
var NASTY_SLOTS = 4;
var NASTY_INNER_STEPS = 4;
var ENTITY_PARK_Y = 15;
var ENTITY_DUMMY_PTR = 57152;
var ENTITY_DRAW_MIN = 16;
var GRAFIX_BASE = 45576;
var GRAFIX_STRIDE = 192;
var KILL_GRAPHIC_HI = 180;
var APPEAR_GRAPHIC = 45384;
var DEAD_GRAPHIC = 48840;
var APPEAR_FRAMES = 16;
var DIE_FRAMES = 8;
var HIT_DX = 14;
var HIT_DY = 11;
var ENERGY_DRAIN_WRAP = 120;
var ENERGY_DRAIN_STEP = 4;
var START_ENERGY_DRAIN = 81;
var ANNOY_DRAIN_BUMP = 10;
var SPAWN_GUARD = 180;
var NASTY_SPEED = 2;
var NASTY_EDGE_L = 3;
var NASTY_EDGE_R = 238;
var NASTY_EDGE_D = 18;
var NASTY_EDGE_U = 141;
var ROOM_DATA_BASE = 3e4;
var ROOM_DATA_STRIDE = 12;
var ENEMY_SETS = [
  "corepieces2",
  "badalien1",
  "badalien2",
  "alien1",
  "alien2",
  "alien3",
  "alien4",
  "alien5",
  "alien6",
  "alien7",
  "alien8",
  "alien9",
  "aliena",
  "alienb",
  "alienc",
  "aliend",
  "aliene"
];
var DIR_TABLE = [8, 9, 1, 4, 5, 6, 2, 10];
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

// src/entities.ts
function cellAttr(world, col, row) {
  if (col < 0 || row < 0 || col >= COLS || row >= ROWS) return 71;
  return world.terrain.attr[row * COLS + col];
}
function cellSolid(world, col, row) {
  return (cellAttr(world, col, row) & 64) === 0;
}
function cloneEntity(e) {
  return { ...e };
}
function entityVisible(e) {
  if (e.y === 0) return false;
  if (e.ptr === ENTITY_DUMMY_PTR) return false;
  return (e.x | e.y) >= ENTITY_DRAW_MIN;
}
function setForPtr(ptr) {
  const n = Math.max(0, Math.round((ptr - GRAFIX_BASE) / GRAFIX_STRIDE));
  return ENEMY_SETS[n] ?? "alien1";
}
function dacStep(d) {
  let hl = d.dac0 & 65535;
  const bc = hl;
  hl = (hl << 8 | hl >> 8) & 65535;
  hl = hl + bc + 41 + (d.dac2 & 65535) & 65535;
  d.dac0 = hl;
  d.db19 = d.db19 - 1 & 255;
  if (d.db19 !== 0) return;
  d.db19 = 5;
  let dac2 = d.dac2 & 65535;
  hl = dac2 * 16 + dac2 + 197 + (d.dac4 & 65535) & 65535;
  d.dac2 = hl;
  d.db1a = d.db1a - 1 & 255;
  if (d.db1a !== 0) return;
  d.db1a = 11;
  hl = d.dac4 & 65535;
  hl = (hl + hl + (d.dac0 & 65535) & 65535) + (hl + hl + (d.dac0 & 65535)) + 19387 & 65535;
  d.dac4 = hl;
}
function seedDac(room2) {
  const addr = ROOM_DATA_BASE + room2 * ROOM_DATA_STRIDE;
  return { dac0: addr, dac2: 0, dac4: addr, db19: 3, db1a: 3 };
}
function modBias(a, sub, add) {
  let v = a & 255;
  while (v >= sub) v -= sub;
  return v + add & 255;
}
function emptyish(attr) {
  return (attr & 96) === 64;
}
function spawnCellOk(world, x, y) {
  const col = x >> 3;
  const row = GAME_Y_ORIGIN - y >> 3;
  for (const [dc, dr] of [
    [0, 0],
    [1, 0],
    [0, 1],
    [1, 1]
  ]) {
    if (!emptyish(cellAttr(world, col + dc, row + dr))) return false;
  }
  return true;
}
function rotateDac0(world, times) {
  let a = world.dac.dac0 & 255;
  for (let i = 0; i < times; i++) a = (a << 1 | a >> 7) & 255;
  return a;
}
function pickDir(world, slot, mask) {
  const v = rotateDac0(world, slot) & mask;
  return DIR_TABLE[v & 7];
}
function makeEntity(ptr) {
  return {
    x: 0,
    y: ENTITY_PARK_Y,
    ink: 4,
    set: "corepieces1",
    frame: 0,
    ptr: ENTITY_DUMMY_PTR,
    basePtr: ptr,
    dir: 85,
    speedX: NASTY_SPEED,
    speedY: NASTY_SPEED,
    period: 4,
    timer: 8,
    state: 0,
    stateTimer: 0,
    ai: 0,
    aiPeriod: 8,
    aiCount: 8,
    homeX: 0,
    homeY: 15
  };
}
function spawnOne(prep2, room2, world, slot) {
  dacStep(world.dac);
  const kind = modBias(world.dac.dac0 & 255, 15, 17) & 31;
  const ptr = GRAFIX_BASE + kind % ENEMY_SETS.length * GRAFIX_STRIDE;
  const e = makeEntity(ptr);
  e.ink = world.dac.dac0 >> 5 & 7;
  e.period = modBias(world.dac.dac2 >> 4 & 255, 5, 9) || 4;
  e.timer = world.dac.dac2 & 255;
  e.aiPeriod = modBias(world.dac.dac4 & 15, 5, 5) || 8;
  if (e.aiPeriod === 0) e.aiPeriod = 100;
  e.aiCount = 8;
  e.ai = modBias(world.dac.dac4 >> 8 & 15, 5, 5);
  if (kind === 2) e.ai = 5;
  e.dir = 85;
  e.set = "corepieces1";
  let x = 16;
  let y = 40;
  for (let attempt = 0; attempt < 100; attempt++) {
    dacStep(world.dac);
    const lo = world.dac.dac0 & 255;
    if (lo & 1) {
      y = (modBias(lo, 9, 15) << 3) - 1 & 255;
      x = world.dac.dac2 & 1 ? 2 : 238;
    } else {
      x = modBias(lo, 23, 27) << 3 & 255;
      y = world.dac.dac2 & 1 ? 17 : 141;
    }
    if (spawnCellOk(world, x, y)) {
      e.homeX = x;
      e.homeY = y;
      return e;
    }
  }
  e.y = 0;
  e.homeY = 0;
  return e;
}
function spawnNasties(prep2, room2, world) {
  world.dac = seedDac(room2);
  dacStep(world.dac);
  world.entities = [];
  for (let i = 0; i < NASTY_SLOTS; i++) world.entities.push(spawnOne(prep2, room2, world, i + 1));
  world.nastyCount = NASTY_SLOTS;
  world.spawnGuard = SPAWN_GUARD;
}
function enterNasties(prep2, world, room2) {
  const outgoing = { room: world.cacheRoom, entities: world.entities.map(cloneEntity) };
  const incoming = world.entityCache;
  world.entityCache = outgoing;
  if (incoming && incoming.room === room2 && world.spawnGuard !== 0) {
    world.entities = incoming.entities.map(cloneEntity);
    world.nastyCount = NASTY_SLOTS;
  } else {
    spawnNasties(prep2, room2, world);
  }
  world.cacheRoom = room2;
}
function isLethal(e) {
  return e.ptr >> 8 < KILL_GRAPHIC_HI;
}
function hitBlob(e, blob) {
  if (e.y === 0 || e.state !== 1) return false;
  const dx = Math.abs(e.x - blob.x);
  const dy = Math.abs(e.y - (GAME_Y_ORIGIN - blob.y));
  return dx < HIT_DX && dy < HIT_DY;
}
function applyContact(e, blob, world) {
  if (!hitBlob(e, blob)) return;
  if (isLethal(e)) {
    world.energy = 0;
    return;
  }
  world.energyDrain = world.energyDrain + ANNOY_DRAIN_BUMP & 255;
}
function bounceH(e, world) {
  if (e.x < NASTY_EDGE_L) {
    e.dir = e.dir & 252 | 1;
    return;
  }
  if (e.x >= NASTY_EDGE_R) {
    e.dir = e.dir & 252 | 2;
    return;
  }
  const playY = GAME_Y_ORIGIN - e.y;
  if ((e.x & 7) !== 0) return;
  const col = e.x >> 3;
  const top = playY >> 3;
  let left = false;
  let right = false;
  for (let r = 0; r < 2; r++) {
    if (cellSolid(world, col - 1, top + r)) left = true;
    if (cellSolid(world, col + 2, top + r)) right = true;
  }
  const bits = (right ? 1 : 0) | (left ? 2 : 0);
  if (!bits) return;
  e.dir = e.dir & 252 | bits ^ 3;
}
function bounceV(e, world) {
  if (e.ai === 6) return;
  if (e.y < NASTY_EDGE_D) {
    e.dir = e.dir & 243 | 8;
    return;
  }
  if (e.y >= NASTY_EDGE_U) {
    e.dir = e.dir & 243 | 4;
    return;
  }
  const playY = GAME_Y_ORIGIN - e.y;
  if ((e.y + 1 & 7) !== 0) return;
  const cols = (e.x & 7) === 0 ? [e.x >> 3, (e.x >> 3) + 1] : [e.x >> 3, (e.x >> 3) + 1, (e.x >> 3) + 2];
  const floor = playY + 16 >> 3;
  const ceil = (playY >> 3) - 1;
  let down = false;
  let up = false;
  for (const c of cols) {
    if (cellSolid(world, c, floor)) down = true;
    if (cellSolid(world, c, ceil)) up = true;
  }
  const bits = (down ? 4 : 0) | (up ? 8 : 0);
  if (!bits) return;
  e.dir = e.dir & 243 | bits ^ 12;
}
function skip64(e, world) {
  if ((e.x & 7) !== 0 || (e.y + 1 & 7) !== 0) return false;
  const col = e.x >> 3;
  const row = GAME_Y_ORIGIN - e.y >> 3;
  for (const [dc, dr] of [
    [0, 0],
    [1, 0],
    [0, 1],
    [1, 1]
  ]) {
    if ((cellAttr(world, col + dc, row + dr) & 127) === 100) return true;
  }
  return false;
}
function think(e, blob, world, slot) {
  e.aiCount -= 1;
  if (e.aiCount !== 0) return;
  e.aiCount = e.aiPeriod === 100 ? e.aiPeriod : e.aiPeriod;
  if (e.aiPeriod === 100) {
    e.aiCount = (world.dac.dac0 >> 8 & 3) + 1;
    e.aiCount <<= 1;
  }
  switch (e.ai) {
    case 0:
      if ((e.dir & 11) === 0) e.dir |= 2;
      if ((e.dir & 12) === 0) e.dir |= 8;
      break;
    case 1:
      e.speedX = NASTY_SPEED;
      e.speedY = NASTY_SPEED;
      e.dir = DIR_TABLE[(rotateDac0(world, slot) & 3) << 1];
      break;
    case 2:
      e.speedX = NASTY_SPEED;
      e.speedY = NASTY_SPEED;
      e.dir = pickDir(world, slot, 7);
      break;
    case 3: {
      e.speedX = NASTY_SPEED;
      e.speedY = NASTY_SPEED;
      const bits = rotateDac0(world, slot);
      let n = 0;
      let a = bits;
      for (let i = 0; i < 4; i++) {
        if (a & 1) n += 1;
        a >>= 1;
      }
      if (n === 1) break;
      const hi = world.dac.dac0 >> 8 & 255;
      if (hi & 128) break;
      const s = (hi & 1) + 1;
      e.speedX = s;
      e.speedY = (s ^ 3) & 3 || 1;
      break;
    }
    case 4: {
      const bx = blob.x;
      const by = GAME_Y_ORIGIN - blob.y;
      let dir = 0;
      dir |= e.x < bx ? 1 : 2;
      dir |= e.y < by ? 8 : 4;
      e.dir = dir;
      break;
    }
    case 5:
      e.dir = 0;
      if (rotateDac0(world, slot) & 1) break;
      if ((world.dac.dac0 & 255) < 70) {
        const bx = blob.x;
        const by = GAME_Y_ORIGIN - blob.y;
        e.dir = (e.x < bx ? 1 : 2) | (e.y < by ? 8 : 4);
      } else {
        e.ai = 3;
      }
      break;
    case 6:
      if ((e.dir & 3) === 0) e.dir = e.dir & 252 | 1;
      break;
    default:
      break;
  }
}
function appearOrDie(e) {
  if (e.state === 2) {
    e.ptr = DEAD_GRAPHIC;
    e.set = "stars";
    e.stateTimer += 1;
    if (e.stateTimer >= DIE_FRAMES) {
      e.y = 0;
      e.x = 0;
    }
    return true;
  }
  if (e.state !== 0) return false;
  const was = e.stateTimer;
  e.stateTimer += 1;
  if (was === 0) {
    e.x = e.homeX;
    e.y = e.homeY;
    e.ptr = APPEAR_GRAPHIC;
    e.set = "corepieces1";
  }
  if (was === APPEAR_FRAMES) {
    e.state = 1;
    e.stateTimer = 0;
    e.ptr = e.basePtr;
    e.set = setForPtr(e.basePtr);
  }
  return false;
}
function stepMove(e, world) {
  bounceH(e, world);
  if (skip64(e, world)) return;
  if (e.dir & 1) e.x = e.x + e.speedX & 255;
  if (e.dir & 2) e.x = e.x - e.speedX & 255;
  bounceV(e, world);
  if (e.dir & 4) e.y = e.y - e.speedY & 255;
  if (e.dir & 8) e.y = e.y + e.speedY & 255;
}
function stepOne(e, prep2, blob, world, slot) {
  if (e.y === 0) return;
  applyContact(e, blob, world);
  e.timer = e.timer - 1 & 255;
  if (e.timer !== 0) return;
  e.timer = e.period;
  if (appearOrDie(e) && e.y === 0) return;
  if (e.state === 2) return;
  think(e, blob, world, slot);
  stepMove(e, world);
}
function tickNasties(prep2, blob, world) {
  if (world.spawnGuard) world.spawnGuard -= 1;
  dacStep(world.dac);
  const n = Math.min(world.nastyCount, world.entities.length);
  for (let slot = n; slot >= 1; slot--) {
    const e = world.entities[slot - 1];
    if (!e) continue;
    for (let i = 0; i < NASTY_INNER_STEPS; i++) stepOne(e, prep2, blob, world, slot);
  }
}
function tickEnergyDrain(world) {
  world.energyDrain = world.energyDrain + 1 & 255;
  if (world.energyDrain < ENERGY_DRAIN_WRAP) return;
  world.energyDrain = 0;
  world.energy = Math.max(0, world.energy - ENERGY_DRAIN_STEP);
}

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
  const actorsByPtr = /* @__PURE__ */ new Map();
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
  const itemsByRoom = Array.from({ length: ROOM_COUNT }, () => []);
  for (const it of data.items.items) {
    if (it.sprite === 255) continue;
    if (!it.placed) continue;
    if ((it.row & 127) < PLAY_ORIGIN) continue;
    if (it.room === ROOM_SKIP) continue;
    if (it.room >= 0 && it.room < ROOM_COUNT) itemsByRoom[it.room].push(it);
  }
  return { graphics, sprites, actorsBySet, actorsByPtr, blocks, rooms: data.rooms.rooms, itemsByRoom };
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
function packGrafix(frame) {
  const out = new Uint8Array(48);
  for (const cell of frame.cells) {
    if (cell.row < 0 || cell.row > 1 || cell.col < 0 || cell.col > 2) continue;
    for (let py = 0; py < CELL; py++) out[cell.row * 24 + py * 3 + cell.col] = cell.data[py];
  }
  return out;
}
function unpackGrafix(ptr, packed) {
  const cells = [];
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 3; col++) {
      const data = [];
      for (let py = 0; py < CELL; py++) data.push(packed[row * 24 + py * 3 + col]);
      cells.push({ row, col, data, attr: null });
    }
  }
  return { id: -1, ptr, cols: 3, rows: 2, cells };
}
var grafixPtrCache = /* @__PURE__ */ new Map();
function graphicForPtr(prep2, ptr) {
  const exact = prep2.actorsByPtr?.get(ptr);
  if (exact) return exact;
  const pool = prep2.actorsByPtr ? [...prep2.actorsByPtr.values()] : [];
  if (!pool.length) {
    for (const list of prep2.actorsBySet.values()) pool.push(...list);
  }
  let best;
  let bestDist = 48;
  for (const g of pool) {
    const d = Math.abs(g.ptr - ptr);
    if (d !== 0 && d < bestDist) {
      bestDist = d;
      best = g;
    }
  }
  if (!best) return void 0;
  const key = `${ptr}:${best.ptr}`;
  const hit = grafixPtrCache.get(key);
  if (hit) return hit;
  const packed = packGrafix(best);
  const shifted = new Uint8Array(48);
  const delta = ptr - best.ptr;
  for (let i = 0; i < 48; i++) {
    const src = i + delta;
    shifted[i] = src >= 0 && src < 48 ? packed[src] : 0;
  }
  const graphic = unpackGrafix(ptr, shifted);
  grafixPtrCache.set(key, graphic);
  return graphic;
}
function blitGrafix(buf2, frame, x, y, ink, opts) {
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
  if (opts?.mergeInk === false) return;
  const inkBits = ink & 7;
  for (const idx of occupied) {
    const attr = buf2.attr[idx];
    if (attr & 32) continue;
    buf2.attr[idx] = attr & 248 | inkBits;
  }
}
function stampGrafix(rgba2, frame, x, y, ink) {
  const rgb = SPECTRUM[ink & 7];
  for (const cell of frame.cells) {
    for (let py = 0; py < CELL; py++) {
      const bits = cell.data[py];
      if (!bits) continue;
      const pyAbs = y + cell.row * CELL + py;
      if (pyAbs < 0 || pyAbs >= HEIGHT) continue;
      for (let px = 0; px < CELL; px++) {
        if (!(bits & 128 >> px)) continue;
        const pxAbs = x + cell.col * CELL + px;
        if (pxAbs < 0 || pxAbs >= WIDTH) continue;
        const p = (pyAbs * WIDTH + pxAbs) * 4;
        rgba2[p] = rgb[0];
        rgba2[p + 1] = rgb[1];
        rgba2[p + 2] = rgb[2];
        rgba2[p + 3] = 255;
      }
    }
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
  const solid = opts.overlay ? prep2.rooms[roomId].solid : null;
  rasterize(buf2, rgba2, !!opts.overlay, solid);
  if (opts.enemies !== false) {
    for (const e of world.entities) {
      if (!entityVisible(e)) continue;
      const frame = graphicForPtr(prep2, e.ptr) ?? prep2.actorsBySet.get(e.set)?.[e.frame];
      if (frame) stampGrafix(rgba2, frame, e.x, GAME_Y_ORIGIN - e.y, e.ink);
    }
  }
  if (opts.blob) {
    const frames = prep2.actorsBySet.get(opts.blob.set);
    const frame = frames?.[opts.blob.frame];
    if (frame) stampGrafix(rgba2, frame, opts.blob.x, opts.blob.y, 7);
  }
  return rgba2;
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
    tickNasties(prep2, blob, world);
    tickEnergyDrain(world);
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
    dac0: 0,
    dac: { dac0: 0, dac2: 0, dac4: 0, db19: 3, db1a: 3 },
    entities: [],
    entityCache: null,
    cacheRoom: -1,
    nastyCount: 0,
    spawnGuard: 0,
    energyDrain: START_ENERGY_DRAIN
  };
  enterRoom(prep2, world, room2);
  return world;
}
function enterRoom(prep2, world, room2) {
  composeTiles(prep2, world.terrain, room2);
  for (let i = 0; i < PLATFORM_SLOTS; i++) world.slots[i] = null;
  world.slotIndex = 0;
  world.buildLatch = false;
  enterNasties(prep2, world, room2);
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
function entityPublic(e) {
  return { x: e.x, y: e.y, state: e.state, dir: e.dir, ptr: e.ptr, timer: e.timer };
}
if (has("--enemy-trace")) {
  const room2 = parseInt(arg("--room", "0"), 10);
  const frames = parseInt(arg("--frames", "40"), 10);
  const world = createWorld(prep, room2);
  const blob = spawnBlob(prep, room2, world);
  const initPath = arg("--enemy-init", "");
  if (initPath) {
    const init = JSON.parse(fs.readFileSync(initPath, "utf8"));
    if (init.dac) world.dac = init.dac;
    if (init.blob) {
      blob.x = init.blob.x;
      blob.y = init.blob.y;
    }
    world.entities = init.entities;
    world.nastyCount = init.entities.length;
  }
  const out = [];
  const none = { left: false, right: false, up: false, down: false };
  const onlyNasties = Boolean(initPath);
  for (let i = 0; i < frames; i++) {
    out.push({ frame: i, entities: world.entities.map(entityPublic) });
    if (onlyNasties) tickNasties(prep, blob, world);
    else tick(prep, blob, none, world);
  }
  process.stdout.write(JSON.stringify(out) + "\n");
  process.exit(0);
}
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
      enemies: true,
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
