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
var SCREEN_W = 256;
var SCREEN_H = 192;
var PLAY_ORIGIN = 6;
var PLAY_Y0 = PLAY_ORIGIN * CELL;
var DISPLAY_W = SCREEN_W * 2;
var DISPLAY_H = SCREEN_H * 2;
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
var TEMP_JUMP_PX = 2;
var START_ENERGY = 127;
var START_PLATFORMS = 48;
var START_FIREPOWER = 126;
var NEW_GAME_X = 136;
var NEW_GAME_Y = 63;
var NASTY_SLOTS = 4;
var NASTY_INNER_STEPS = 4;
var ENTITY_PARK_Y = 15;
var ENTITY_DUMMY_PTR = 57152;
var ENTITY_DRAW_MIN = 16;
var GRAFIX_BASE = 45576;
var GRAFIX_STRIDE = 192;
var GRAFIX_FRAME = 48;
var GRAFIX_FRAMES = 4;
var GRAFIX_ANIM_PERIOD = 2;
var KILL_GRAPHIC_HI = 180;
var APPEAR_GRAPHIC = 45384;
var DEAD_GRAPHIC = 48840;
var APPEAR_FRAMES = 16;
var DIE_FRAMES = 8;
var BADALIEN1_PTR = 45768;
var BADALIEN2_PTR = 45960;
var ALIEN1_PTR = 46152;
var KIND_BADALIEN2 = 2;
var AI_FORCED_KIND2 = 5;
var GRAPHIC_LO_C8 = 200;
var HIT_DX = 14;
var HIT_DY = 11;
var MIN_LETHAL_SPAWN_DIST = 64;
var DEATH_A_TILE = 0;
var DEATH_A_LETHAL = 1;
var DEATH_A_ENERGY = 2;
var DEATH_A_OBJ06 = 16;
var DEATH_A_LETHAL_C8 = 17;
var DEATH_RESTORE_MIN_A = 16;
var DEATH_FLASH_FRAMES = 45;
var DEATH_FLY_FRAMES = 80;
var DEATH_PAUSE_FRAMES = 50;
var DEATH_INK_XOR = 5;
var DEATH_STAR_DIRS = [10, 4, 6, 12];
var DEATH_STAR_TIMERS = [9, 20, 5, 28];
var RESPAWN_ENERGY = 127;
var PLAT_OR_ON_DEATH = 8;
var GAME_OVER_MSG = "GAME OVER";
var KILL_ATTR_HI = 96;
var KILL_AABB = 15;
var PULSE_ATTR_HI = 112;
var PULSE_AABB_DX = 14;
var PULSE_AABB_DY = 22;
var PULSE_COMP_BASE = 26;
var PULSE_COMP_BIAS = 2;
var PULSE_PERIOD_MASK = 12;
var PULSE_PERIOD_BASE = 8;
var PULSE_SLOTS = 4;
var PULSE_TOGGLE_LAYER = 5;
var PULSE_ANIM_LAYERS = [6, 7, 7, 6];
var PULSE_ANIM_ATTR_BASE = 68;
var PULSE_LAYERS = {
  5: [
    [2, 2, 71, 103, 61, 24, 16, 0],
    [8, 28, 20, 54, 162, 224, 192, 64]
  ],
  6: [
    [2, 18, 86, 94, 86, 22, 22, 4],
    [136, 220, 208, 80, 140, 216, 216, 80]
  ],
  7: [
    [8, 28, 13, 111, 25, 45, 39, 5],
    [128, 224, 166, 16, 250, 164, 16, 16]
  ]
};
var EXTRA_ATTR_HI = 144;
var ATTR_NASTY_HI = 128;
var FIXED_NASTY_PTR = 45768;
var FIXED_NASTY_AI = 6;
var FIXED_NASTY_DIR = 1;
var AI5_CHASE_MAX = 70;
var ENERGY_DRAIN_WRAP = 120;
var ENERGY_DRAIN_STEP = 1;
var START_ENERGY_DRAIN = 0;
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
var DIR_TABLE = [8, 9, 1, 5, 4, 6, 2, 10];
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
var FIRE_STEPS = 3;
var FIRE_PX = 2;
var FIRE_END_X = 242;
var FIRE_RIGHT_PTR = 59572;
var FIRE_LEFT_PTR = 59764;
var FIRE_DIR_RIGHT = 1;
var FIRE_DIR_LEFT = 2;
var BULLET_HIT = 14;
var STAT_CAP = 127;
var START_LIVES = 4;
var ITEM_COUNT = 45;
var ITEM_NEAR = 15;
var ITEM_ORIGIN_ROWS = 24;
var A350_BYTES = 128;
var EXTRA_MIN_DAC = 85;
var EXTRA_SPRITE_BASE = 17;
var EXTRA_CHEOPS = 25;
var EXTRA_DAC_ROLLS = 20;
var EXTRA_EFFECTS = [
  [1, 32],
  [1, 96],
  [1, 64],
  [2, 50],
  [3, 32],
  [3, 60],
  [0, 0],
  [0, 1]
];
var EXTRA_LIVES_SPRITE = 23;
var EXTRA_LIFE_PLUS = 24;
var BLOB_INK = 7;
var DD22_WALK = 0;
var DD22_LIFT = 1;
var DD22_PAD = 2;
var LIFT_ATTR = 100;
var LIFT_X_BIAS = 8;
var LIFT_X_MASK = 31;
var LIFT_Y_MOD = 3;
var LIFT_PX = 2;
var HOVERPAD_PTR = 45e3;
var HOVERPAD_INK = 7;
var HOVERPAD_Y_BIAS = 8;
var HOVERPAD_FLY_PX = 2;
var HOVERPAD_ATTR_HI = 192;
var NASTY_COUNT_WITH_PAD = 3;
var SEATED_SETS = ["blobwr1", "blobxr", "blobxs", "blobsl", "blobwl1"];
var PAD_SHOT_PX = 8;
var PAD_SHOT_BOUNCE_MAX = 2;
var PAD_SHOT_PTRS = [45192, 45240, 45288, 45336];
var PAD_SHOT_Y_LO = 15;
var PAD_SHOT_Y_HI = 145;
var PAD_EXIT_DOWN_Y = 22;
var PAD_ENTER_UP_Y = 23;
var TELEPORT_ATTR_HI = 208;
var TELEPORT_NAME_LEN = 5;
var TELEPORT_INPUT_MASK = 3;
var TELEPORT_REASON = 4;
var TELEPORT_INVALID_REASON = 3;
var TELEPORT_MSG_OK = "NOW TELEPORTING";
var TELEPORT_MSG_BAD = "CODE NOT RECOGNISED";
var TELEPORT_TABLE = [
  ["VEROX", 40],
  ["RAMIX", 31],
  ["TULSA", 66],
  ["ASOIC", 150],
  ["DELTA", 162],
  ["QUAKE", 213],
  ["ALGOL", 289],
  ["EXIAL", 343],
  ["KYZIA", 380],
  ["ULTRA", 433],
  ["IRAGE", 457],
  ["OKTUP", 461],
  ["SONIQ", 470],
  ["AMIGA", 499],
  ["AMAHA", 506]
];
var DOOR_RAW_MIN = 1;
var DOOR_RAW_MAX = 15;
var DOOR_INPUT_MASK = 3;
var DOOR_SHIFT_X = 48;
var DOOR_REASON = 3;
var DOOR_D2C6 = 31608;
var DOOR_CODE_BC = 4363;
var DOOR_KEY_SPRITE = 15;
var DOOR_SINGLE_WILDCARD = 14;
var DOOR_DIGIT_MIN = 9;
var DOOR_MSG_OK = "ACCESS AUTHORISED";
var DOOR_MSG_BAD = "ACCESS CODE INVALID";
var PASSAGE_ATTR_HI = 240;
var PASSAGE_REASON = 5;
var PASSAGE_SFX = 4;
var CORE_ROOM = 199;
var CORE_NEIGHBOR = 198;
var CORE_EJECT_X = 240;
var CORE_EJECT_Y = 39;
var CORE_SLOTS = 9;
var CORE_VICTORY_PAIRS = 5;
var CORE_PANEL_ATTR_ROW = 12;
var CORE_PANEL_ATTR_COL = 13;
var CORE_PANEL_STEP = 2;
var CORE_PANEL_INK_DONE = 7;
var CORE_PANEL_INK_PENDING = 2;
var CORE_D2DE_INIT = [128, 139, 137, 138, 132, 133, 161, 140, 136];
var CORE_LEFT_INIT = 9;
var CORE_PAIRS_INIT = 0;
var CORE_TOOL_SPRITE = 16;
var CORE_SOCKET_ATTR_HI = 176;
var CORE_SOCKET_TABLE = [
  [190, 1],
  [252, 1],
  [196, 129],
  [226, 129],
  [230, 129],
  [134, 1],
  [9, 83],
  [85, 67]
];
var CORE_GUARD_XY = [
  [80, 111],
  [168, 47],
  [80, 47],
  [168, 111]
];
var CORE_GUARD_PTR = 45576;
var CORE_GUARD_INK = 6;
var CORE_GUARD_DIR = 5;
var CORE_GUARD_PERIOD = 4;
var CORE_GUARD_AI_PERIOD = 10;
var CORE_CEREMONY_FRAMES = 200;
var CORES_COMPLETE_MSG = "THE CORES COMPLETE";
var SCORE_DIGITS = 6;
var SCORE_FIRST_VISIT = 250;
var SCORE_CORE_DELIVER = 1e4;
var SCORE_END_BONUS = 1e3;
var SCORE_KILL_HI_BASE = 174;
var A390_BYTES = 64;
var FRAME_HZ = 50;
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

// src/audio/effects.ts
var SFX_STEP_INIT = 20;
var SFX_HANG = 23;
function requestSfx(world, a) {
  if (!Number.isInteger(a) || a < 0 || a > 23 || a === SFX_HANG) return;
  world.sfx.push(a);
}

// src/projectiles.ts
function cellSolid(world, col, row) {
  if (col < 0 || row < 0 || col >= COLS || row >= ROWS) return false;
  return (world.terrain.attr[row * COLS + col] & 64) === 0;
}
function wallBits(world, x, playY) {
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
function parkedBullet() {
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
    homeY: ENTITY_PARK_Y
  };
}
function parkBullet(world) {
  world.bullet = parkedBullet();
  world.fireDir = 0;
  world.padShotDir = 0;
  world.padShotHits = 0;
  world.padShotFrame = 0;
}
function shotFlying(world) {
  return world.fireDir !== 0 || world.padShotDir !== 0;
}
function aimFromFacing(facing) {
  return facing > 0 ? FIRE_DIR_RIGHT : FIRE_DIR_LEFT;
}
function floorCeilingBits(world, x, playY) {
  const gameY = GAME_Y_ORIGIN - playY;
  if ((gameY + 1 & 7) !== 0) return 0;
  const cols = (x & 7) === 0 ? [x >> 3, (x >> 3) + 1] : [x >> 3, (x >> 3) + 1, (x >> 3) + 2];
  const origin = playY >> 3;
  let bits = 0;
  for (const col of cols) {
    if (cellSolid(world, col, origin + 2)) bits |= 4;
    if (cellSolid(world, col, origin - 1)) bits |= 8;
  }
  return bits;
}
function tickPadFire(_prep, blob, fire, world) {
  if (world.padShotDir === 0) {
    if (world.fireDir !== 0) return;
    if (!fire || world.firepower === 0) return;
    world.firepower = Math.max(0, world.firepower - 1);
    const gameY = GAME_Y_ORIGIN - blob.y;
    world.padShotDir = world.lastDir || 1;
    world.padShotHits = 0;
    world.padShotFrame = 0;
    world.bullet.x = blob.x & 248;
    world.bullet.y = (gameY + 1 & 248) - 1;
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
  const hHit = dir & 3 & hWall;
  const vHit = dir & 12 & vWall;
  let hits = 0;
  const dac0 = world.dac.dac0 & 255;
  const dac1 = world.dac.dac0 >> 8 & 255;
  if (hHit && vHit) {
    hits = 2;
    if (dac0 & 32) dir &= 3;
    else dir &= 12;
  } else {
    if (hHit) {
      dir ^= 3;
      if ((dir & 12) === 0) dir = dir & 243 | (dac0 & 8 ? 8 : 4);
      hits += 1;
    }
    if (vHit) {
      dir ^= 12;
      if ((dir & 3) === 0) dir = dir & 252 | (dac1 & 1 ? 1 : 2);
      hits += 1;
    }
  }
  world.padShotHits += hits;
  world.padShotDir = dir;
  if (world.padShotHits >= PAD_SHOT_BOUNCE_MAX) {
    parkBullet(world);
    return;
  }
  if (dir & 1) world.bullet.x = world.bullet.x + PAD_SHOT_PX & 255;
  if (dir & 2) world.bullet.x = world.bullet.x - PAD_SHOT_PX & 255;
  if (dir & 8) world.bullet.y = world.bullet.y + PAD_SHOT_PX & 255;
  if (dir & 4) world.bullet.y = world.bullet.y - PAD_SHOT_PX & 255;
  if (world.bullet.x >= FIRE_END_X || world.bullet.y < PAD_SHOT_Y_LO || world.bullet.y >= PAD_SHOT_Y_HI) {
    parkBullet(world);
    return;
  }
  world.padShotFrame = world.padShotFrame + 1 & 3;
  world.bullet.ptr = PAD_SHOT_PTRS[world.padShotFrame];
  world.bullet.frame = world.padShotFrame;
  world.bullet.set = "hfirepower";
}
function tickFire(_prep, blob, fire, world) {
  if (blob.facing) world.aim = aimFromFacing(blob.facing);
  if (world.fireDir === 0) {
    if (world.padShotDir !== 0) return;
    if (!fire || world.firepower === 0) return;
    world.firepower = Math.max(0, world.firepower - 1);
    world.fireDir = world.aim || FIRE_DIR_RIGHT;
    world.bullet.x = blob.x & 255;
    world.bullet.y = GAME_Y_ORIGIN - blob.y & 255;
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
    if (world.fireDir === FIRE_DIR_RIGHT) world.bullet.x = world.bullet.x + FIRE_PX & 255;
    else world.bullet.x = world.bullet.x - FIRE_PX & 255;
    if (world.bullet.x >= FIRE_END_X) {
      parkBullet(world);
      return;
    }
  }
}

// src/objects.ts
function emptyHotspots() {
  return Array.from({ length: ROOM_COUNT }, () => []);
}
function emptyPulses() {
  return Array.from({ length: ROOM_COUNT }, () => []);
}
function cellHotspot(col, row) {
  return {
    x: col << 3 & 255,
    y: (ITEM_ORIGIN_ROWS - row << 3) - 1 & 255
  };
}
function socketRoomId(slot) {
  const row = CORE_SOCKET_TABLE[slot];
  if (!row) return -1;
  const [lo, flags] = row;
  return lo | (flags & 128) << 1;
}
function socketSlotForRoom(room2) {
  for (let i = 0; i < CORE_SOCKET_TABLE.length; i++) {
    if (socketRoomId(i) === room2) return i;
  }
  return -1;
}
function scanHotspots(rooms, blocks, rawBySub) {
  const stationsByRoom = emptyHotspots();
  const teleportsByRoom = emptyHotspots();
  const killsByRoom = emptyHotspots();
  const pulsesByRoom = emptyPulses();
  const fixedNastiesByRoom = emptyHotspots();
  const doorsByRoom = emptyHotspots();
  const passagesByRoom = emptyHotspots();
  const socketsByRoom = Array.from({ length: ROOM_COUNT }, () => []);
  const extraMarksByRoom = Array.from(
    { length: ROOM_COUNT },
    () => []
  );
  const empty = {
    stationsByRoom,
    teleportsByRoom,
    killsByRoom,
    pulsesByRoom,
    fixedNastiesByRoom,
    extraMarksByRoom,
    doorsByRoom,
    socketsByRoom,
    passagesByRoom
  };
  if (!rooms.length || !blocks.length || !rawBySub.length) return empty;
  for (const room2 of rooms) {
    const id = room2.id;
    if (id < 0 || id >= ROOM_COUNT) continue;
    const data = room2.blocks;
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
          const origins = [
            [c + 4, b + 3, subs[0]],
            [c, b + 3, subs[1]],
            [c + 4, b, subs[2]],
            [c, b, subs[3]]
          ];
          for (const [col0, row0, sid] of origins) {
            const raw = rawBySub[sid] ?? 0;
            const hi = raw & 240;
            const col = col0 + (raw & 3);
            const row = row0 + ((raw & 12) >> 2);
            if (hi === HOVERPAD_ATTR_HI) stationsByRoom[id].push(cellHotspot(col, row));
            else if (hi === TELEPORT_ATTR_HI) teleportsByRoom[id].push(cellHotspot(col, row));
            else if (hi === KILL_ATTR_HI) killsByRoom[id].push(cellHotspot(col, row));
            else if (hi === PULSE_ATTR_HI) pulsesByRoom[id].push({ col, row });
            else if (hi === ATTR_NASTY_HI) fixedNastiesByRoom[id].push(cellHotspot(col, row));
            else if (hi === EXTRA_ATTR_HI) extraMarksByRoom[id].push({ col, row });
            else if (hi === CORE_SOCKET_ATTR_HI && sockSlot >= 0) {
              const hs = cellHotspot(col, row);
              socketsByRoom[id].push({ x: hs.x, y: hs.y, slot: sockSlot });
            } else if (hi === PASSAGE_ATTR_HI) passagesByRoom[id].push(cellHotspot(col, row));
            else if (raw >= DOOR_RAW_MIN && raw <= DOOR_RAW_MAX) {
              doorsByRoom[id].push(cellHotspot(col, row));
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
function hotspotsFromData(data, rooms, blocks) {
  const rawBySub = [];
  for (const a of data.blockAttrs?.attributes ?? []) rawBySub[a.id] = a.raw;
  return scanHotspots(rooms, blocks, rawBySub);
}
function lastStation(prep2, room2) {
  const list = prep2.stationsByRoom?.[room2];
  const hit = list?.[list.length - 1];
  return hit ? { x: hit.x, y: hit.y } : { x: 0, y: 0 };
}
function firstTeleport(prep2, room2) {
  const list = prep2.teleportsByRoom?.[room2];
  return list?.[0] ?? null;
}
function firstPassage(prep2, room2) {
  const list = prep2.passagesByRoom?.[room2];
  return list?.[0] ?? null;
}
function teleportNameForRoom(room2) {
  for (const [name, dest] of TELEPORT_TABLE) {
    if (dest === room2) return name;
  }
  return "";
}
function evaluateTeleport(code, room2) {
  const own = teleportNameForRoom(room2);
  const norm = code.replace(/[^A-Za-z]/g, "").toUpperCase().slice(0, TELEPORT_NAME_LEN);
  if (norm.length !== TELEPORT_NAME_LEN) return { ok: false, dest: room2, name: own };
  for (const [name, dest] of TELEPORT_TABLE) {
    if (name === norm) return { ok: true, dest, name };
  }
  return { ok: false, dest: room2, name: own };
}
function exactAt(blob, x, y) {
  return blob.x === x && GAME_Y_ORIGIN - blob.y === y;
}
function blobGame(blob) {
  return { x: blob.x, y: GAME_Y_ORIGIN - blob.y };
}
function hitKillTerrain(prep2, blob) {
  const { x, y } = blobGame(blob);
  for (const s of prep2.killsByRoom?.[blob.room] ?? []) {
    if (Math.abs(x - s.x) < KILL_AABB && Math.abs(y - s.y) < KILL_AABB) return true;
  }
  return false;
}
function xorPulseLayer(ink, layer) {
  const cells = PULSE_LAYERS[layer];
  if (!cells) return;
  for (let i = 0; i < 2; i++) {
    const bytes = cells[i];
    const base = i * 8;
    for (let py = 0; py < 8; py++) ink[base + py] ^= bytes[py];
  }
}
function tickPulses(blob, world) {
  let i = world.pulseIndex + 1 & 255;
  if (i >= PULSE_SLOTS) i = 0;
  world.pulseIndex = i;
  const slot = world.pulses[i];
  if (slot) {
    slot.timer = slot.timer - 1 & 255;
    if (slot.timer === 255) {
      slot.timer = slot.period;
      slot.flag ^= 1;
      xorPulseLayer(slot.xorInk, PULSE_TOGGLE_LAYER);
      slot.lastAnim = null;
      slot.sparkAttr = 71;
    } else if (slot.flag !== 0) {
      const anim = PULSE_ANIM_LAYERS[slot.timer & 3];
      xorPulseLayer(slot.xorInk, anim);
      slot.lastAnim = anim;
      slot.sparkAttr = PULSE_ANIM_ATTR_BASE + (world.dac.dac0 & 3) & 255;
    }
  }
  const { x, y } = blobGame(blob);
  let hit = false;
  for (const p of world.pulses) {
    if (p.flag === 0) continue;
    const px = p.col << 3 & 255;
    const comp = (PULSE_COMP_BASE - p.row << 3) - PULSE_COMP_BIAS;
    if (Math.abs(x - px) < PULSE_AABB_DX && y >= comp - PULSE_AABB_DY && y <= comp) hit = true;
  }
  return hit;
}
function makePulses(defs, dac0) {
  const period = (dac0 & PULSE_PERIOD_MASK) + PULSE_PERIOD_BASE & 255;
  return (defs ?? []).map((p) => ({
    col: p.col,
    row: p.row,
    period,
    timer: period,
    flag: 0,
    xorInk: new Uint8Array(16),
    sparkAttr: 71,
    lastAnim: null
  }));
}
function onStationPixel(blob, world) {
  if (world.station.x === 0 && world.station.y === 0) return false;
  return exactAt(blob, world.station.x, world.station.y);
}
function boardPad(world) {
  parkBullet(world);
  world.dd22 = world.lastDir & 8 ? DD22_PAD : 0;
}
function reduceDoorDigit(raw) {
  return (raw & 63) % 5 + DOOR_DIGIT_MIN;
}
function expectedDoorCode(room2, d2c6 = DOOR_D2C6, bc = DOOR_CODE_BC) {
  const h = d2c6 >> 8 & 255;
  const l = d2c6 & 255;
  const e = room2 & 255;
  const b = bc >> 8 & 255;
  const c = bc & 255;
  let a = (b ^ h ^ e) & 255;
  const d5f7 = a;
  a = (a ^ l ^ c) & 255;
  const d5f9 = a;
  a = (a ^ h ^ b) & 255;
  return [reduceDoorDigit(d5f7), reduceDoorDigit(d5f9), reduceDoorDigit(a)];
}
function inventoryHasSprite(world, sprite) {
  return world.inventory.some((it) => (it.sprite & 255) === (sprite & 255));
}
function doorKeysAccepted(world, room2) {
  if (inventoryHasSprite(world, DOOR_KEY_SPRITE)) return true;
  const need = expectedDoorCode(room2);
  const used = new Array(world.inventory.length).fill(false);
  let wildcards = 0;
  for (const it of world.inventory) {
    if ((it.sprite & 255) === DOOR_SINGLE_WILDCARD) wildcards += 1;
  }
  for (const digit of need) {
    let found = -1;
    for (let i = 0; i < world.inventory.length; i++) {
      if (used[i]) continue;
      if ((world.inventory[i].sprite & 255) === (digit & 255)) {
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
function tryClearSocket(prep2, blob, world) {
  if (!inventoryHasSprite(world, CORE_TOOL_SPRITE)) return false;
  const { x, y } = blobGame(blob);
  for (const s of prep2.socketsByRoom?.[blob.room] ?? []) {
    if (Math.abs(x - s.x) >= ITEM_NEAR || Math.abs(y - s.y) >= ITEM_NEAR) continue;
    const flag = world.socketFlags[s.slot] ?? 0;
    if ((flag & 127) === 0) return false;
    world.socketFlags[s.slot] = flag & 128;
    requestSfx(world, 8);
    return true;
  }
  return false;
}
function walkSpecialObjects(prep2, blob, input, world) {
  if (hitKillTerrain(prep2, blob)) return "$06";
  tryClearSocket(prep2, blob, world);
  const stations = prep2.stationsByRoom?.[blob.room] ?? [];
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
  const doors = prep2.doorsByRoom?.[blob.room] ?? [];
  for (const d of doors) {
    if (!exactAt(blob, d.x, d.y)) continue;
    return "$00";
  }
  const pads = prep2.teleportsByRoom?.[blob.room] ?? [];
  for (const t of pads) {
    if (!exactAt(blob, t.x, t.y)) continue;
    return "$0D";
  }
  const passages = prep2.passagesByRoom?.[blob.room] ?? [];
  for (const p of passages) {
    if (!exactAt(blob, p.x, p.y)) continue;
    return "$0F";
  }
  return null;
}

// src/score.ts
function freshA390() {
  return new Uint8Array(A390_BYTES).fill(255);
}
function zeroScore() {
  return Array.from({ length: SCORE_DIGITS }, () => 0);
}
function addScore(world, amount) {
  let n = Math.max(0, amount | 0);
  for (let i = SCORE_DIGITS - 1; i >= 0; i--) {
    const sum = (world.scoreDigits[i] ?? 0) + n % 10;
    world.scoreDigits[i] = sum % 10;
    n = Math.floor(n / 10) + Math.floor(sum / 10);
  }
}
function killScorePoints(ptr) {
  const hi = ptr >> 8 & 255;
  const tens = (hi - SCORE_KILL_HI_BASE) * 2 & 255;
  return tens * 10;
}
function a390Unvisited(a390, room2) {
  const high = room2 >> 8 & 1;
  const low = room2 & 255;
  const offset = (high >> 3 | (low & 248) >> 3) & 255;
  let value = a390[offset] ?? 0;
  for (let i = 0; i < (low & 7) + 1; i++) value = (value << 1 | value >> 7) & 255;
  return (value & 1) !== 0;
}
function clearA390Bit(a390, room2) {
  const high = room2 >> 8 & 1;
  const low = room2 & 255;
  const offset = (high >> 3 | (low & 248) >> 3) & 255;
  const rot = (low & 7) + 1;
  let value = a390[offset] ?? 0;
  for (let i = 0; i < rot; i++) value = (value << 1 | value >> 7) & 255;
  value = value & 254 & 255;
  for (let i = 0; i < rot; i++) value = (value >> 1 | (value & 1) << 7) & 255;
  a390[offset] = value;
}
function adventureScore(visitedCount) {
  return visitedCount * 50 >> 8 & 255;
}
function framesToTime(frames) {
  const totalSec = Math.floor(Math.max(0, frames) / FRAME_HZ);
  return { minutes: Math.floor(totalSec / 60), seconds: totalSec % 60 };
}
function composeEndResult(world, victory, banner) {
  addScore(world, SCORE_END_BONUS);
  const time = framesToTime(world.frames);
  const result = {
    scoreDigits: world.scoreDigits.slice(),
    adventure: adventureScore(world.visitedCount),
    timeMinutes: time.minutes,
    timeSeconds: time.seconds,
    coresReplaced: CORE_LEFT_INIT - (world.coresLeft & 255),
    victory,
    banner
  };
  world.endResult = result;
  world.victory = victory;
  world.gameOver = true;
  return result;
}
function formatScore(digits) {
  return digits.map((d) => String(d & 15)).join("");
}
function formatTime(minutes, seconds) {
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");
  return `${mm}.${ss}`;
}

// src/entities.ts
function cellAttr(world, col, row) {
  if (col < 0 || row < 0 || col >= COLS || row >= ROWS) return 71;
  return world.terrain.attr[row * COLS + col];
}
function cellSolid2(world, col, row) {
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
function z80SubAdd(a, sub, add) {
  let v = a & 255;
  while (v >= sub) v -= sub;
  return v + add - sub & 255;
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
    const c = col + dc;
    const r = row + dr;
    if (c < 0 || r < 0 || c >= COLS || r >= ROWS) return false;
    if (!emptyish(cellAttr(world, c, r))) return false;
  }
  return true;
}
function farFromBlob(x, y, blob) {
  if (!blob) return true;
  const by = GAME_Y_ORIGIN - blob.y;
  const dx = x - blob.x;
  const dy = y - by;
  return dx * dx + dy * dy >= MIN_LETHAL_SPAWN_DIST * MIN_LETHAL_SPAWN_DIST;
}
function nudgeAwayFromBlob(e, blob) {
  const by = GAME_Y_ORIGIN - blob.y;
  let dx = e.x - blob.x;
  let dy = e.y - by;
  const len = Math.hypot(dx, dy);
  if (len < 1) {
    dx = MIN_LETHAL_SPAWN_DIST;
    dy = 0;
  } else {
    const scale = MIN_LETHAL_SPAWN_DIST / len;
    dx *= scale;
    dy *= scale;
  }
  e.x = Math.max(NASTY_EDGE_L, Math.min(NASTY_EDGE_R - 1, Math.round(blob.x + dx))) & 255;
  e.y = Math.max(NASTY_EDGE_U, Math.min(NASTY_EDGE_D - 1, Math.round(by + dy))) & 255;
  e.homeX = e.x;
  e.homeY = e.y;
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
function spawnOne(prep2, room2, world, slot, blob) {
  dacStep(world.dac);
  const kind = z80SubAdd(world.dac.dac0 >> 8 & 255, 15, 17);
  const ptr = GRAFIX_BASE + kind * GRAFIX_STRIDE;
  const lethal = ptr >> 8 < KILL_GRAPHIC_HI;
  const e = makeEntity(ptr);
  e.ink = world.dac.dac0 >> 5 & 7;
  if (e.ink === 0) e.ink = z80SubAdd(world.dac.dac0 & 255, 5, 7) & 7 || 2;
  e.period = z80SubAdd(world.dac.dac2 >> 4 & 255, 5, 9) || 4;
  e.timer = world.dac.dac2 & 255;
  e.aiPeriod = modBias(world.dac.dac4 & 15, 5, 5) || 8;
  if (e.aiPeriod === 0) e.aiPeriod = 100;
  e.aiCount = 8;
  e.ai = z80SubAdd(world.dac.dac4 >> 8 & 15, 5, 5);
  if (kind === KIND_BADALIEN2) e.ai = AI_FORCED_KIND2;
  e.dir = 85;
  e.set = "corepieces1";
  for (let attempt = 0; attempt < 100; attempt++) {
    dacStep(world.dac);
    let a = world.dac.dac0 & 255;
    const odd = (a & 1) !== 0;
    a = (a >> 1 | (odd ? 128 : 0)) & 255;
    const dac1 = world.dac.dac0 >> 8 & 255;
    let x;
    let y;
    if (odd) {
      y = (z80SubAdd(a, 9, 15) << 3) - 1 & 255;
      x = dac1 & 128 ? 2 : 238;
    } else {
      x = z80SubAdd(a, 23, 27) << 3 & 255;
      y = dac1 & 1 ? 17 : 141;
    }
    if (!spawnCellOk(world, x, y)) continue;
    if (lethal && !farFromBlob(x, y, blob)) continue;
    e.homeX = x;
    e.homeY = y;
    return e;
  }
  e.y = 0;
  e.homeY = 0;
  return e;
}
function applyFixedNasties(prep2, room2, world) {
  const list = prep2.fixedNastiesByRoom?.[room2] ?? [];
  for (let i = 0; i < list.length; i++) {
    const slotNum = list.length - i;
    const e = world.entities[slotNum - 1];
    const spot = list[i];
    if (!e || !spot) continue;
    e.x = spot.x;
    e.y = spot.y;
    e.ptr = FIXED_NASTY_PTR;
    e.set = setForPtr(FIXED_NASTY_PTR);
    e.dir = FIXED_NASTY_DIR;
    e.period = (e.period | 8) & 255;
    e.timer = 1;
    e.state = 1;
    e.stateTimer = 0;
    e.ai = FIXED_NASTY_AI;
  }
}
function spawnNasties(prep2, room2, world, blob) {
  world.dac = seedDac(room2);
  dacStep(world.dac);
  world.entities = [];
  for (let i = 0; i < NASTY_SLOTS; i++) world.entities.push(spawnOne(prep2, room2, world, i + 1, blob));
  world.nastyCount = NASTY_SLOTS;
  world.spawnGuard = SPAWN_GUARD;
  applyFixedNasties(prep2, room2, world);
}
function parkCoreSlot() {
  return {
    x: 0,
    y: 0,
    ink: 7,
    set: "corepieces2",
    frame: 0,
    ptr: ENTITY_DUMMY_PTR,
    basePtr: CORE_GUARD_PTR,
    dir: CORE_GUARD_DIR,
    speedX: NASTY_SPEED,
    speedY: NASTY_SPEED,
    period: CORE_GUARD_PERIOD,
    timer: CORE_GUARD_PERIOD,
    state: 0,
    stateTimer: 0,
    ai: 0,
    aiPeriod: CORE_GUARD_AI_PERIOD,
    aiCount: CORE_GUARD_AI_PERIOD,
    homeX: 0,
    homeY: 0
  };
}
function spawnCoreGuardians(world) {
  const n = Math.min(world.corePairs & 255, CORE_GUARD_XY.length);
  world.entities = [];
  for (let i = 0; i < NASTY_SLOTS; i++) world.entities.push(parkCoreSlot());
  for (let i = 0; i < n; i++) {
    const [x, y] = CORE_GUARD_XY[i];
    const e = world.entities[i];
    e.x = x;
    e.y = y;
    e.homeX = x;
    e.homeY = y;
    e.ptr = CORE_GUARD_PTR;
    e.basePtr = CORE_GUARD_PTR;
    e.set = setForPtr(CORE_GUARD_PTR);
    e.ink = CORE_GUARD_INK;
    e.state = 1;
    e.stateTimer = 0;
    e.period = CORE_GUARD_PERIOD;
    e.timer = CORE_GUARD_PERIOD;
    e.dir = CORE_GUARD_DIR;
    e.speedX = NASTY_SPEED;
    e.speedY = NASTY_SPEED;
    e.ai = 0;
    e.aiPeriod = CORE_GUARD_AI_PERIOD;
    e.aiCount = CORE_GUARD_AI_PERIOD;
  }
  world.nastyCount = NASTY_SLOTS;
  world.spawnGuard = 0;
  world.cacheRoom = CORE_ROOM;
}
function enterNasties(prep2, world, room2, blob) {
  if (room2 === CORE_ROOM) {
    spawnCoreGuardians(world);
    return;
  }
  if (room2 === CORE_NEIGHBOR) {
    world.entityCache = null;
    world.entities = [];
    world.nastyCount = 0;
    world.spawnGuard = 0;
    world.cacheRoom = room2;
    return;
  }
  const outgoing = { room: world.cacheRoom, entities: world.entities.map(cloneEntity) };
  const incoming = world.entityCache;
  world.entityCache = outgoing;
  if (incoming && incoming.room === room2 && world.spawnGuard !== 0) {
    world.entities = incoming.entities.map(cloneEntity);
    world.nastyCount = NASTY_SLOTS;
  } else {
    spawnNasties(prep2, room2, world, blob);
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
function applyContact(e, blob, world, allowAnnoy) {
  if (!hitBlob(e, blob)) return null;
  if (isLethal(e)) {
    return (e.ptr & 255) === GRAPHIC_LO_C8 ? DEATH_A_LETHAL_C8 : DEATH_A_LETHAL;
  }
  if (allowAnnoy) world.energyDrain = world.energyDrain + ANNOY_DRAIN_BUMP & 255;
  return null;
}
function makePad(x, blobGameY) {
  const py = blobGameY - HOVERPAD_Y_BIAS & 255;
  return {
    x: x & 255,
    y: py,
    ink: HOVERPAD_INK,
    set: "hoverpad",
    frame: 0,
    ptr: HOVERPAD_PTR,
    basePtr: HOVERPAD_PTR,
    dir: 0,
    speedX: 0,
    speedY: 0,
    period: 1,
    timer: 1,
    state: 0,
    stateTimer: 0,
    ai: 0,
    aiPeriod: 0,
    aiCount: 0,
    homeX: x & 255,
    homeY: py
  };
}
function copyPadFromBlob(world, blob) {
  world.pad = makePad(blob.x, GAME_Y_ORIGIN - blob.y);
  world.nastyCount = NASTY_COUNT_WITH_PAD;
}
function syncHoverpad(prep2, world, room2, blob) {
  world.station = lastStation(prep2, room2);
  if (world.station.x !== 0 || world.station.y !== 0) {
    world.pad = makePad(world.station.x, world.station.y);
    world.nastyCount = NASTY_COUNT_WITH_PAD;
  } else if (world.dd22 !== 2) {
    world.pad = null;
  }
  if (world.dd22 === 2 && blob) copyPadFromBlob(world, blob);
}
function hitByBullet(e, world) {
  if (!shotFlying(world)) return;
  if (e.state === 2) return;
  if (e.state === 0 && e.stateTimer === 0) return;
  const dx = Math.abs(e.x - world.bullet.x);
  const dy = Math.abs(e.y - world.bullet.y);
  if (dx >= BULLET_HIT || dy >= BULLET_HIT) return;
  addScore(world, killScorePoints(e.basePtr || e.ptr));
  requestSfx(world, 18);
  e.ptr = DEAD_GRAPHIC;
  e.set = "stars";
  e.ink = 7;
  e.state = 2;
  e.stateTimer = 0;
  parkBullet(world);
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
  const rows = (e.y + 1 & 7) === 0 ? 2 : 3;
  let left = false;
  let right = false;
  for (let r = 0; r < rows; r++) {
    if (cellSolid2(world, col - 1, top + r)) left = true;
    if (cellSolid2(world, col + 2, top + r)) right = true;
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
    if (cellSolid2(world, c, floor)) down = true;
    if (cellSolid2(world, c, ceil)) up = true;
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
function chaseDir(e, blob) {
  const bx = blob.x;
  const by = GAME_Y_ORIGIN - blob.y;
  return (e.x < bx ? 1 : 2) | (e.y < by ? 8 : 4);
}
function thinkAi3(e, world, slot) {
  e.speedX = NASTY_SPEED;
  e.speedY = NASTY_SPEED;
  e.dir = pickDir(world, slot, 7);
  let n = 0;
  let bits = e.dir;
  for (let i = 0; i < 4; i++) {
    if (bits & 1) n += 1;
    bits >>= 1;
  }
  if (n === 1) return;
  let a = rotateDac0(world, slot);
  const carry = (a & 128) !== 0;
  a = (a << 1 | a >> 7) & 255;
  if (carry) return;
  a = (a << 1 | a >> 7) & 255;
  const s = (a & 1) + 1;
  e.speedX = s;
  e.speedY = (s ^ 3) & 3 || 1;
}
function think(e, blob, world, slot) {
  e.aiCount -= 1;
  if (e.aiCount !== 0) return false;
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
    case 3:
      thinkAi3(e, world, slot);
      break;
    case 4:
      e.dir = chaseDir(e, blob);
      break;
    case 5: {
      e.dir = 0;
      let a = rotateDac0(world, slot);
      const carry = (a & 1) !== 0;
      a = (a >> 1 | (carry ? 128 : 0)) & 255;
      if (carry) break;
      if (a < AI5_CHASE_MAX) e.dir = chaseDir(e, blob);
      else thinkAi3(e, world, slot);
      break;
    }
    case 6:
      e.dir &= 3;
      if (e.dir === 0) e.dir = FIXED_NASTY_DIR;
      return true;
    default:
      break;
  }
  return false;
}
function appearOrDie(e, blob) {
  if (e.state === 2) {
    e.ptr = DEAD_GRAPHIC;
    e.set = "stars";
    e.stateTimer = e.stateTimer + 1 & 255;
    if (e.stateTimer === DIE_FRAMES) {
      e.y = 0;
      e.x = 0;
      return true;
    }
    return false;
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
    if (e.basePtr >> 8 < KILL_GRAPHIC_HI && blob && !farFromBlob(e.x, e.y, blob)) {
      nudgeAwayFromBlob(e, blob);
    }
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
function stepOne(e, prep2, blob, world, slot, inner) {
  if (e.y === 0) return null;
  hitByBullet(e, world);
  const death = applyContact(e, blob, world, inner === 0);
  if (death !== null) return { kind: "death", a: death };
  e.timer = e.timer - 1 & 255;
  if (e.timer !== 0) return null;
  e.timer = e.period;
  if (appearOrDie(e, blob) && e.y === 0) return null;
  const abort = think(e, blob, world, slot);
  stepMove(e, world);
  if (abort) return { kind: "abort" };
  return null;
}
function grafixAnimFrame(ticks) {
  return Math.floor(ticks / GRAFIX_ANIM_PERIOD) % GRAFIX_FRAMES;
}
function syncGrafixFrames(world) {
  const frame = grafixAnimFrame(world.frames);
  const n = Math.min(world.nastyCount, world.entities.length);
  for (let i = 0; i < n; i++) {
    const e = world.entities[i];
    if (!e || !entityVisible(e)) continue;
    e.frame = frame;
  }
  if (world.pad && entityVisible(world.pad)) world.pad.frame = frame;
}
function tickNasties(prep2, blob, world) {
  if (world.spawnGuard) world.spawnGuard -= 1;
  dacStep(world.dac);
  syncGrafixFrames(world);
  const n = Math.min(world.nastyCount, world.entities.length);
  for (let slot = n; slot >= 1; slot--) {
    const e = world.entities[slot - 1];
    if (!e) continue;
    for (let i = 0; i < NASTY_INNER_STEPS; i++) {
      const r = stepOne(e, prep2, blob, world, slot, i);
      if (r?.kind === "death") return r.a;
      if (r?.kind === "abort") return null;
    }
  }
  return null;
}
function tickEnergyDrain(world) {
  world.energyDrain = world.energyDrain + 1 & 255;
  if (world.energyDrain < ENERGY_DRAIN_WRAP) return;
  world.energyDrain = 0;
  world.energy = Math.max(0, world.energy - ENERGY_DRAIN_STEP);
}

// src/items.ts
function itemGamePos(item) {
  const col = item.col & 31;
  const row = item.row & 127;
  return { x: col << 3 & 255, y: (ITEM_ORIGIN_ROWS - row << 3) - 1 & 255 };
}
function nearItem(ax, ay, bx, by) {
  return Math.abs(ax - bx) < ITEM_NEAR && Math.abs(ay - by) < ITEM_NEAR;
}
function a350Allows(a350, room2) {
  const high = room2 >> 8 & 1;
  const low = room2 & 255;
  const offset = (high >> 3 | (low & 248) >> 3) & 255;
  let value = a350[offset] ?? 0;
  for (let i = 0; i < (low & 7) + 1; i++) value = (value << 1 | value >> 7) & 255;
  return (value & 1) !== 0;
}
function clearA350Bit(a350, room2) {
  const high = room2 >> 8 & 1;
  const low = room2 & 255;
  const offset = (high >> 3 | (low & 248) >> 3) & 255;
  const rot = (low & 7) + 1;
  let value = a350[offset] ?? 0;
  for (let i = 0; i < rot; i++) value = (value << 1 | value >> 7) & 255;
  value = value & 254 & 255;
  for (let i = 0; i < rot; i++) value = (value >> 1 | (value & 1) << 7) & 255;
  a350[offset] = value;
}
function capEnergyPlatformsFire(world) {
  if (world.energy > STAT_CAP) world.energy = STAT_CAP;
  if (world.platforms > STAT_CAP) world.platforms = STAT_CAP;
  if (world.firepower > STAT_CAP) world.firepower = STAT_CAP;
}
function ccccSprite(world) {
  if ((world.lives & 255) === 0) return EXTRA_LIFE_PLUS;
  let a = 255;
  let e = 0;
  const stats = [world.energy & 255, world.platforms & 255, world.firepower & 255];
  for (let b = 3; b !== 0; b--) {
    const hl = stats[3 - b];
    if (a < hl) continue;
    e = 3 - b << 1 & 255;
    a = hl;
  }
  return e + 18 & 255;
}
function applyExtra(world, sprite) {
  if (sprite === EXTRA_CHEOPS) {
    world.cheops = true;
    return;
  }
  let a = sprite & 255;
  if (a === EXTRA_LIVES_SPRITE) a = ccccSprite(world);
  const row = EXTRA_EFFECTS[a - EXTRA_SPRITE_BASE];
  if (!row) return;
  const [off, add] = row;
  if (off === 0) world.lives = world.lives + add & 255;
  else if (off === 1) world.energy = world.energy + add & 255;
  else if (off === 2) world.platforms = world.platforms + add & 255;
  else if (off === 3) world.firepower = world.firepower + add & 255;
  capEnergyPlatformsFire(world);
  requestSfx(world, off);
}
function extraPos(col, row) {
  return { x: col << 3 & 255, y: (ITEM_ORIGIN_ROWS - row << 3) - 1 & 255 };
}
function itemOccupiesMark(prep2, room2, col, row, world) {
  for (const it of prep2.itemsByRoom[room2] ?? []) {
    if (world.collected[it.index]) continue;
    if ((it.col & 31) === (col & 31) && (it.row & 127) === (row & 127)) return true;
  }
  return false;
}
function spawnExtra(prep2, world, room2) {
  world.extra = null;
  if (room2 === ROOM_SKIP) return;
  if (!a350Allows(world.a350, room2)) return;
  const marks = prep2.extraMarksByRoom?.[room2] ?? [];
  if (marks.length < 2) return;
  const free = marks.filter((m) => !itemOccupiesMark(prep2, room2, m.col, m.row, world));
  const pool = free.length > 0 ? free : marks;
  world.dac = seedDac(room2);
  for (let i = 0; i < EXTRA_DAC_ROLLS; i++) dacStep(world.dac);
  if ((world.dac.dac0 & 255) < EXTRA_MIN_DAC) return;
  dacStep(world.dac);
  let slot = (world.dac.dac0 & 127) % pool.length;
  const mark = pool[slot];
  dacStep(world.dac);
  let kind = world.dac.dac0 & 255;
  while (kind >= 9) kind -= 9;
  if (kind === 8) {
    dacStep(world.dac);
    if ((world.dac.dac2 & 255) >= 127) kind = 0;
  }
  const sprite = kind + EXTRA_SPRITE_BASE;
  dacStep(world.dac);
  let ink = world.dac.dac2 & 63;
  while (ink >= 6) ink -= 6;
  ink = ink + 2 & 7;
  const pos = extraPos(mark.col, mark.row);
  world.extra = {
    sprite,
    ink,
    col: mark.col,
    row: mark.row,
    x: pos.x,
    y: pos.y
  };
}
function collectTableItem(prep2, blob, world) {
  const list = prep2.itemsByRoom[blob.room] ?? [];
  const bx = blob.x;
  const by = GAME_Y_ORIGIN - blob.y;
  for (const it of list) {
    if (it.sprite === 255) continue;
    if (!it.placed) continue;
    if (world.collected[it.index]) continue;
    const pos = itemGamePos(it);
    if (!nearItem(bx, by, pos.x, pos.y)) continue;
    world.collected[it.index] = 1;
    world.inventory.unshift({ sprite: it.sprite, attr: it.attr_bits });
    if (world.inventory.length > 4) world.inventory.pop();
    requestSfx(world, 12);
    return;
  }
}
function tickPickup(prep2, blob, input, world) {
  const bx = blob.x;
  const by = GAME_Y_ORIGIN - blob.y;
  if (world.extra && nearItem(bx, by, world.extra.x, world.extra.y)) {
    if (world.extra.sprite === EXTRA_CHEOPS) {
      if (input.up && !input.left && !input.right) world.cheops = true;
    } else {
      applyExtra(world, world.extra.sprite);
      clearA350Bit(world.a350, blob.room);
      world.extra = null;
    }
  }
  const upOnly = Boolean(input.up) && !input.left && !input.right && !input.down && !input.fire;
  if (!upOnly) {
    world.pickupLatch = false;
    return;
  }
  if (world.pickupLatch) return;
  world.pickupLatch = true;
  collectTableItem(prep2, blob, world);
}

// src/core.ts
function initSocketFlags() {
  return CORE_SOCKET_TABLE.map(([, flags]) => flags & 255);
}
function initCoreState() {
  return {
    d2de: CORE_D2DE_INIT.map((v) => v & 255),
    coresLeft: CORE_LEFT_INIT,
    corePairs: CORE_PAIRS_INIT
  };
}
function matchCoreDeliveries(world) {
  let delivered = 0;
  for (let pass = 0; pass < 2; pass++) {
    for (let inv = 0; inv < world.inventory.length; ) {
      const sprite = world.inventory[inv].sprite & 255;
      let matched = -1;
      for (let i = 0; i < CORE_SLOTS; i++) {
        const need = world.d2de[i] ?? 0;
        if (!(need & 128)) continue;
        if ((need & 127) === sprite) {
          matched = i;
          break;
        }
      }
      if (matched < 0) {
        inv += 1;
        continue;
      }
      world.d2de[matched] = matched & 255;
      world.inventory.splice(inv, 1);
      addScore(world, SCORE_CORE_DELIVER);
      world.coresLeft = world.coresLeft - 1 & 255;
      if ((world.coresLeft & 1) === 0) {
        world.corePairs = world.corePairs + 1 & 255;
      }
      delivered += 1;
      requestSfx(world, 3);
    }
  }
  return delivered;
}
function beginCoreCeremony(world) {
  world.blobHidden = true;
  world.pad = null;
  world.dd22 = 0;
  spawnCoreGuardians(world);
  world.corePhase = "ceremony";
  world.coreTicks = 0;
  requestSfx(world, 20 + (world.dac.dac0 & 1));
}
function ejectToCoreNeighbor(blob, world, enter) {
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
function deliverCoreParts(_prep, blob, world, enter) {
  if (blob.room !== CORE_ROOM) return "none";
  if (world.corePhase === "ceremony") return "ceremony";
  matchCoreDeliveries(world);
  if (world.corePairs >= CORE_VICTORY_PAIRS) {
    if (!world.gameOver) requestSfx(world, 17);
    world.blobHidden = false;
    world.corePhase = null;
    composeEndResult(world, true, CORES_COMPLETE_MSG);
    world.message = CORES_COMPLETE_MSG;
    return "victory";
  }
  beginCoreCeremony(world);
  return "ceremony";
}
function tickCoreCeremony(prep2, blob, world, tickNasties2, enter) {
  if (world.corePhase !== "ceremony") return;
  world.frames = world.frames + 1 >>> 0;
  tickNasties2(prep2, blob, world);
  world.coreTicks += 1;
  if (world.coreTicks >= CORE_CEREMONY_FRAMES) {
    ejectToCoreNeighbor(blob, world, enter);
  }
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
    passagesByRoom
  } = hotspotsFromData(data, rooms, blocks);
  return {
    graphics,
    sprites,
    actorsBySet,
    actorsByPtr,
    blocks,
    rooms,
    itemsByRoom,
    stationsByRoom,
    teleportsByRoom,
    killsByRoom,
    pulsesByRoom,
    fixedNastiesByRoom,
    extraMarksByRoom,
    doorsByRoom,
    socketsByRoom,
    passagesByRoom
  };
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
function blitItems(prep2, buf2, roomId, collected) {
  const list = prep2.itemsByRoom[roomId];
  if (!list?.length) return;
  for (const it of list) {
    if (collected && collected[it.index]) continue;
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
function blitSprite(prep2, buf2, spriteId, col, row, attr) {
  const sprite = prep2.sprites[spriteId];
  if (!sprite) return;
  for (const cell of sprite.cells) {
    const cy = row + cell.row;
    const cx = col + cell.col;
    if (cx < 0 || cy < 0 || cx >= COLS || cy >= ROWS) continue;
    const dst = (cy * COLS + cx) * CELL;
    for (let py = 0; py < CELL; py++) buf2.data[dst + py] ^= cell.data[py];
    buf2.attr[cy * COLS + cx] = attr;
  }
}
function blitExtra(prep2, buf2, extra) {
  if (!extra) return;
  const playRow = extra.row - PLAY_ORIGIN;
  blitSprite(prep2, buf2, extra.sprite, extra.col, playRow, extra.ink & 7 | 64);
}
function blitCorePanel(prep2, buf2, world, roomId) {
  if (roomId !== CORE_ROOM) return;
  const col0 = CORE_PANEL_ATTR_COL;
  const row0 = CORE_PANEL_ATTR_ROW - PLAY_ORIGIN;
  const blinkOn = (world.frames & 8) !== 0;
  for (let i = 0; i < CORE_SLOTS; i++) {
    const r = i / 3 | 0;
    const c = i % 3;
    const need = CORE_D2DE_INIT[i];
    const live = world.d2de[i] ?? need;
    const pending = (live & 128) !== 0;
    const sprite = need & 127;
    let ink = CORE_PANEL_INK_DONE;
    if (pending) {
      ink = blinkOn ? CORE_PANEL_INK_PENDING : (world.frames + i & 3) + 2;
    }
    blitSprite(prep2, buf2, sprite, col0 + c * CORE_PANEL_STEP, row0 + r * CORE_PANEL_STEP, ink & 7 | 64);
  }
}
function blitPulses(buf2, pulses, _dac0) {
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
    const attr = p.sparkAttr & 255;
    for (let i = 0; i < 2; i++) {
      const cx = p.col + i;
      if (cx < 0 || playRow < 0 || cx >= COLS || playRow >= ROWS) continue;
      const dst = (playRow * COLS + cx) * CELL;
      const base = i * 8;
      for (let py = 0; py < CELL; py++) buf2.data[dst + py] ^= ink[base + py];
      buf2.attr[playRow * COLS + cx] = attr;
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
function grafixAnimDrawX(x, frame) {
  return x - (frame & 3) * 2;
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
  if (opts.items !== false) {
    blitItems(prep2, buf2, roomId, world.collected);
    blitExtra(prep2, buf2, world.extra);
  }
  blitCorePanel(prep2, buf2, world, roomId);
  blitPulses(buf2, world.pulses, world.dac.dac0);
  const solid = opts.overlay ? prep2.rooms[roomId].solid : null;
  rasterize(buf2, rgba2, !!opts.overlay, solid);
  if (opts.enemies !== false) {
    const fi = grafixAnimFrame(world.frames);
    const n = Math.min(world.nastyCount, world.entities.length);
    for (let i = 0; i < n; i++) {
      const e = world.entities[i];
      if (!entityVisible(e)) continue;
      const frame = graphicForPtr(prep2, e.ptr + fi * GRAFIX_FRAME) ?? prep2.actorsBySet.get(e.set)?.[fi];
      if (frame) stampGrafix(rgba2, frame, grafixAnimDrawX(e.x, fi), GAME_Y_ORIGIN - e.y, e.ink);
    }
    if (world.pad && entityVisible(world.pad)) {
      const frame = graphicForPtr(prep2, world.pad.ptr + fi * GRAFIX_FRAME) ?? prep2.actorsBySet.get(world.pad.set)?.[fi];
      if (frame) stampGrafix(rgba2, frame, grafixAnimDrawX(world.pad.x, fi), GAME_Y_ORIGIN - world.pad.y, world.pad.ink);
    }
  }
  if (opts.enemies !== false && entityVisible(world.bullet)) {
    const frame = graphicForPtr(prep2, world.bullet.ptr) ?? prep2.actorsBySet.get(world.bullet.set)?.[world.bullet.frame];
    if (frame) stampGrafix(rgba2, frame, world.bullet.x, GAME_Y_ORIGIN - world.bullet.y, world.bullet.ink);
  }
  if (opts.blob) {
    const frames = prep2.actorsBySet.get(opts.blob.set);
    const frame = frames?.[opts.blob.frame];
    if (frame) stampGrafix(rgba2, frame, opts.blob.x, opts.blob.y, opts.blob.ink ?? 7);
  }
  return rgba2;
}

// src/ui/font-data.ts
var FONT_ADD4 = Uint8Array.from([
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  128,
  0,
  128,
  128,
  0,
  128,
  0,
  0,
  192,
  0,
  192,
  192,
  0,
  192,
  0,
  0,
  224,
  0,
  224,
  224,
  0,
  224,
  0,
  0,
  240,
  0,
  240,
  240,
  0,
  240,
  0,
  0,
  248,
  0,
  248,
  248,
  0,
  248,
  0,
  0,
  252,
  0,
  252,
  252,
  0,
  252,
  0,
  0,
  254,
  0,
  254,
  254,
  0,
  254,
  0,
  0,
  255,
  0,
  254,
  254,
  0,
  255,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  28,
  0,
  127,
  93,
  53,
  119,
  0,
  0,
  0,
  12,
  12,
  12,
  12,
  12,
  12,
  12,
  124,
  0,
  0,
  255,
  255,
  255,
  255,
  0,
  0,
  0,
  0,
  0,
  0,
  127,
  127,
  0,
  0,
  0,
  0,
  0,
  0,
  48,
  48,
  0,
  99,
  99,
  6,
  60,
  120,
  123,
  123,
  0,
  126,
  110,
  110,
  111,
  111,
  111,
  127,
  0,
  60,
  28,
  28,
  62,
  62,
  62,
  62,
  0,
  127,
  103,
  7,
  127,
  96,
  127,
  127,
  0,
  126,
  14,
  14,
  127,
  15,
  127,
  127,
  0,
  110,
  110,
  127,
  127,
  15,
  15,
  15,
  0,
  126,
  102,
  96,
  127,
  15,
  127,
  127,
  0,
  126,
  102,
  96,
  127,
  111,
  111,
  127,
  0,
  126,
  110,
  14,
  15,
  15,
  15,
  15,
  0,
  126,
  110,
  111,
  127,
  111,
  111,
  127,
  0,
  127,
  111,
  111,
  127,
  15,
  15,
  15,
  0,
  0,
  24,
  24,
  0,
  24,
  24,
  0,
  0,
  8,
  24,
  63,
  127,
  63,
  24,
  8,
  0,
  8,
  12,
  126,
  127,
  126,
  12,
  8,
  0,
  28,
  28,
  28,
  127,
  62,
  28,
  8,
  0,
  8,
  28,
  62,
  127,
  28,
  28,
  28,
  0,
  127,
  97,
  103,
  65,
  71,
  71,
  127,
  0,
  126,
  127,
  127,
  126,
  120,
  120,
  120,
  0,
  63,
  59,
  59,
  127,
  123,
  123,
  123,
  0,
  127,
  123,
  123,
  126,
  123,
  123,
  127,
  0,
  127,
  123,
  120,
  120,
  120,
  123,
  127,
  0,
  127,
  123,
  59,
  59,
  59,
  123,
  127,
  0,
  126,
  112,
  126,
  120,
  120,
  127,
  127,
  0,
  126,
  112,
  126,
  120,
  120,
  120,
  120,
  0,
  127,
  115,
  112,
  119,
  115,
  115,
  127,
  0,
  123,
  123,
  123,
  127,
  123,
  123,
  123,
  0,
  63,
  30,
  30,
  30,
  30,
  30,
  63,
  0,
  31,
  15,
  15,
  15,
  15,
  111,
  127,
  0,
  123,
  123,
  122,
  126,
  123,
  123,
  123,
  0,
  120,
  120,
  120,
  120,
  120,
  120,
  127,
  0,
  127,
  127,
  117,
  117,
  117,
  117,
  117,
  0,
  123,
  123,
  123,
  127,
  119,
  115,
  115,
  0,
  127,
  123,
  123,
  123,
  123,
  123,
  127,
  0,
  127,
  123,
  123,
  127,
  120,
  120,
  120,
  0,
  126,
  118,
  118,
  118,
  126,
  119,
  127,
  0,
  126,
  118,
  118,
  127,
  123,
  123,
  123,
  0,
  126,
  118,
  112,
  127,
  3,
  127,
  127,
  0,
  127,
  28,
  28,
  28,
  28,
  28,
  28,
  0,
  123,
  123,
  123,
  123,
  123,
  127,
  127,
  0,
  123,
  123,
  123,
  123,
  126,
  124,
  120,
  0,
  117,
  117,
  117,
  117,
  117,
  127,
  127,
  0,
  123,
  123,
  123,
  62,
  127,
  123,
  123,
  0,
  123,
  123,
  123,
  30,
  30,
  30,
  30,
  0,
  63,
  51,
  3,
  127,
  120,
  127,
  127,
  0,
  127,
  87,
  117,
  0,
  111,
  58,
  106,
  0,
  0,
  0,
  111,
  123,
  107,
  0,
  0,
  0,
  0,
  126,
  87,
  0,
  46,
  60,
  0
]);

// src/ui/screen.ts
var SCREEN_COLS = 32;
var SCREEN_ROWS = 24;
var SCREEN_W2 = SCREEN_COLS * CELL;
var SCREEN_H2 = SCREEN_ROWS * CELL;
var PLAY_ROW0 = 6;
var PLAY_Y02 = PLAY_ROW0 * CELL;
var DISPLAY_W2 = SCREEN_W2 * 2;
var DISPLAY_H2 = SCREEN_H2 * 2;

// src/ui/overlay.ts
function idleUi() {
  return { kind: "none" };
}
function beginDoorUi(world, room2, openRight) {
  const ok = doorKeysAccepted(world, room2);
  requestSfx(world, 8);
  return {
    kind: "door",
    phase: "intro",
    ok,
    openRight,
    ticks: 0,
    digits: expectedDoorCode(room2)
  };
}
function beginTeleportUi(room2, world) {
  if (world) requestSfx(world, 7);
  return {
    kind: "teleport",
    phase: "prompt",
    ownName: teleportNameForRoom(room2) || "?????",
    buffer: "",
    waitingRelease: true,
    ok: false,
    dest: room2,
    ticks: 0
  };
}
function tickDoorUi(ui, world) {
  ui.ticks += 1;
  if (ui.phase === "intro" && ui.ticks >= 25) {
    ui.phase = "result";
    ui.ticks = 0;
    if (world) {
      if (ui.ok) {
        requestSfx(world, 10);
        requestSfx(world, 15);
      } else {
        requestSfx(world, 15);
      }
    }
  } else if (ui.phase === "result" && ui.ticks >= 40) {
    ui.phase = "done";
    return true;
  }
  return ui.phase === "done";
}
function finishTeleportInput(ui, room2, world) {
  const ev = evaluateTeleport(ui.buffer, room2);
  ui.ok = ev.ok;
  ui.dest = ev.dest;
  ui.phase = "result";
  ui.ticks = 0;
  if (world) {
    if (ui.ok) {
      requestSfx(world, 16);
      requestSfx(world, 9);
    } else {
      requestSfx(world, 15);
    }
  }
}
function tickTeleportUi(ui, room2, world) {
  if (ui.phase === "prompt") {
    ui.phase = "input";
    ui.waitingRelease = true;
  }
  if (ui.phase === "input" && ui.buffer.length >= TELEPORT_NAME_LEN) {
    finishTeleportInput(ui, room2, world);
  }
  if (ui.phase === "result") {
    ui.ticks += 1;
    if (ui.ticks >= 40) {
      ui.phase = "done";
      return true;
    }
  }
  return ui.phase === "done";
}
function syncWorldMessage(world, ui) {
  if (ui.kind === "door") {
    world.message = ui.ok ? DOOR_MSG_OK : DOOR_MSG_BAD;
  } else if (ui.kind === "teleport" && (ui.phase === "result" || ui.phase === "done")) {
    world.message = ui.ok ? TELEPORT_MSG_OK : TELEPORT_MSG_BAD;
  }
}
function isUiBlocking(ui) {
  return ui.kind !== "none";
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
function poseGraphic(prep2, blob, world) {
  const anim = animationSet(blob, world);
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
function d2f0Bits(prep2, room2, x, playY, world) {
  if ((x & 7) !== 0) return 0;
  const col = x >> 3;
  const top = playY >> 3;
  const rows = (playYToGame(playY) + 1 & 7) === 0 ? 2 : 3;
  let bits = 0;
  for (let r = 0; r < rows; r++) {
    if (solidAt(prep2, room2, col + 2, top + r, world)) bits |= 1;
    if (solidAt(prep2, room2, col - 1, top + r, world)) bits |= 2;
  }
  return bits;
}
function d2f4Bits(prep2, room2, x, playY, world) {
  const gameY = playYToGame(playY);
  if ((gameY + 1 & 7) !== 0) return 0;
  const cols = footColumns(x);
  const origin = playY >> 3;
  let bits = 0;
  for (const col of cols) {
    if (solidAt(prep2, room2, col, origin + 2, world)) bits |= 4;
    if (solidAt(prep2, room2, col, origin - 1, world)) bits |= 8;
  }
  return bits;
}
function dirBits(input) {
  return (input.right ? 1 : 0) | (input.left ? 2 : 0) | (input.down ? 4 : 0) | (input.up ? 8 : 0);
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
    x: NEW_GAME_X,
    y: gameYToPlay(NEW_GAME_Y),
    fallIndex: 0,
    jumpTicks: 0,
    facing: 1,
    walkTick: 0,
    walkFrame: 0,
    onGround: false
  };
  nudgeOutOfSolid(prep2, blob, blobInkPixels(poseGraphic(prep2, blob)), world);
  blob.onGround = onFloor(prep2, blob.room, blob.x, blob.y, world);
  if (world) saveEntry(world, blob);
  return blob;
}
function saveEntry(world, blob) {
  world.entry = { x: blob.x, y: playYToGame(blob.y), dd22: world.dd22 };
}
function alignDeathXY(blob) {
  blob.x &= 248;
  const gy = playYToGame(blob.y);
  blob.y = gameYToPlay((gy + 1 & 248) - 1);
}
function parkDeathSlots(world) {
  for (const e of world.entities) {
    e.x = 0;
    e.y = 0;
    e.ptr = ENTITY_DUMMY_PTR;
  }
  world.nastyCount = 0;
}
function spawnDeathStars(blob, world) {
  const x = blob.x & 254;
  const y = (playYToGame(blob.y) | 1) & 255;
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
    timer: DEATH_STAR_TIMERS[i],
    state: 2,
    stateTimer: 20,
    ai: 0,
    aiPeriod: 8,
    aiCount: 8,
    homeX: x,
    homeY: y
  }));
}
function finishDeath(prep2, blob, world) {
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
  enterRoom(prep2, world, blob.room, { blob });
  syncHoverpad(prep2, world, blob.room, blob);
  blob.onGround = onFloor(prep2, blob.room, blob.x, blob.y, world);
}
function tickDeath(prep2, blob, world) {
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
    }
    return;
  }
  if (world.deathPhase === "fly") {
    tickNasties(prep2, blob, world);
    world.deathTicks += 1;
    if (world.deathTicks >= DEATH_FLY_FRAMES) {
      parkDeathSlots(world);
      world.deathPhase = "pause";
      world.deathTicks = 0;
    }
    return;
  }
  world.deathTicks += 1;
  if (world.deathTicks >= DEATH_PAUSE_FRAMES) finishDeath(prep2, blob, world);
}
function applyDeath(prep2, blob, world, a) {
  if (world.deathPhase) return;
  world.deathA = a & 255;
  world.d2c4 = (a & 255) >= DEATH_RESTORE_MIN_A ? 1 : 0;
  world.deathPhase = "flash";
  world.deathTicks = 0;
  world.blobHidden = false;
  world.blobInk = BLOB_INK;
  parkBullet(world);
  parkDeathSlots(world);
  requestSfx(world, 19);
  if ((a & 255 & 7) === 2) requestSfx(world, 15);
}
function applyRoomExit(prep2, blob, movingRight, movingLeft, world) {
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
  blob.y = gameYToPlay((gy + 1 & 248) - 1);
  if (world) {
    enterRoom(prep2, world, blob.room, { blob });
    saveEntry(world, blob);
    syncHoverpad(prep2, world, blob.room, blob);
  }
  nudgeOutOfSolid(prep2, blob, blobInkPixels(poseGraphic(prep2, blob, world)), world);
  return true;
}
function animationSet(blob, world) {
  if (world?.dd22 === DD22_PAD) {
    return { set: SEATED_SETS[world.seatPose] ?? "blobxs", frame: 0 };
  }
  const sets = blob.facing > 0 ? WALK_RIGHT_SETS : WALK_LEFT_SETS;
  return { set: sets[blob.walkFrame & 3], frame: 0 };
}
function padPlayY(blob) {
  return blob.y + 8;
}
function tickLift(prep2, blob, world) {
  const ceil = d2f4Bits(prep2, blob.room, blob.x, blob.y, world) & 8;
  if (!ceil) blob.y = gameYToPlay(playYToGame(blob.y) + LIFT_PX);
  const walls = d2f0Bits(prep2, blob.room, blob.x, blob.y, world) & 3;
  if (walls !== 3) {
    world.dd22 = DD22_WALK;
    blob.walkTick = 2;
  }
  blob.fallIndex = 0;
  blob.onGround = false;
}
function tryEnterLift(prep2, blob, world) {
  if ((blob.x - LIFT_X_BIAS & LIFT_X_MASK) !== 0) return false;
  const gameY = playYToGame(blob.y);
  if ((gameY % LIFT_Y_MOD + LIFT_Y_MOD) % LIFT_Y_MOD !== 0) return false;
  const a = attrAt(prep2, blob.room, (blob.x >> 3) + 1, (blob.y >> 3) + 1, world);
  if (a !== LIFT_ATTR) return false;
  world.dd22 = DD22_LIFT;
  return true;
}
function tickPadFlight(prep2, blob, input, world) {
  const bits = dirBits(input);
  const vHit = d2f4Bits(prep2, blob.room, blob.x, blob.y, world) | d2f4Bits(prep2, blob.room, blob.x, padPlayY(blob), world);
  const vAllow = bits ^ bits & vHit;
  if (vAllow & 8) blob.y = gameYToPlay(playYToGame(blob.y) + HOVERPAD_FLY_PX);
  if (vAllow & 4) blob.y = gameYToPlay(playYToGame(blob.y) - HOVERPAD_FLY_PX);
  copyPadFromBlob(world, blob);
  const hHit = d2f0Bits(prep2, blob.room, blob.x, blob.y, world) | d2f0Bits(prep2, blob.room, blob.x, padPlayY(blob), world);
  const hAllow = bits ^ bits & hHit;
  if (hAllow & 1) {
    blob.x = blob.x + HOVERPAD_FLY_PX & 255;
    blob.facing = 1;
  }
  if (hAllow & 2) {
    blob.x = blob.x - HOVERPAD_FLY_PX & 255;
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
function applyWalk(prep2, blob, input, pixels, world) {
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
    if (world && world.dd22 === DD22_WALK) {
      world.sfxStep ^= 1;
      requestSfx(world, world.sfxStep);
    }
  }
  const onStation = world ? onStationPixel(blob, world) : false;
  if (onStation) {
    blob.fallIndex = 0;
    blob.onGround = true;
    return;
  }
  if (world && world.dd22 === DD22_WALK && tryEnterLift(prep2, blob, world)) {
    tickLift(prep2, blob, world);
    return;
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
}
function tick(prep2, blob, input, world) {
  if (world?.gameOver) return;
  if (world?.deathPhase) {
    tickDeath(prep2, blob, world);
    return;
  }
  if (world?.corePhase === "ceremony") {
    tickCoreCeremony(
      prep2,
      blob,
      world,
      tickNasties,
      (next) => enterRoom(prep2, world, next, { blob })
    );
    return;
  }
  if (world && isUiBlocking(world.ui)) {
    world.frames = world.frames + 1 >>> 0;
    tickOverlay(prep2, blob, world);
    return;
  }
  if (world) world.frames = world.frames + 1 >>> 0;
  const pixels = blobInkPixels(poseGraphic(prep2, blob, world));
  if (world) {
    const dirs = dirBits(input);
    if (dirs) world.lastDir = dirs;
  }
  const steer = world?.teleportLatch ? { ...input, left: false, right: false } : input;
  if (world?.dd22 === DD22_PAD) tickPadFlight(prep2, blob, steer, world);
  else if (world?.dd22 === DD22_LIFT) tickLift(prep2, blob, world);
  else applyWalk(prep2, blob, steer, pixels, world);
  if (!world) {
    applyRoomExit(prep2, blob, steer.right && !steer.left, steer.left && !steer.right, world);
    if (blob.room < 0 || blob.room >= ROOM_COUNT) blob.room = (blob.room % ROOM_COUNT + ROOM_COUNT) % ROOM_COUNT;
    return;
  }
  const walking = world.dd22 === DD22_WALK;
  const stationed = walking && onStationPixel(blob, world);
  if (walking && !stationed) tryBuildPlatform(prep2, blob, input, world);
  tickBridges(world);
  if (world.dd22 === DD22_PAD) tickPadFire(prep2, blob, !!input.fire, world);
  else tickFire(prep2, blob, !!input.fire, world);
  tickEnergyDrain(world);
  const pickupInput = stationed ? { ...input, up: false } : input;
  tickPickup(prep2, blob, pickupInput, world);
  const boardedBefore = world.dd22 === DD22_PAD;
  const code = walkSpecialObjects(prep2, blob, input, world);
  if (world.dd22 === DD22_PAD && !boardedBefore) copyPadFromBlob(world, blob);
  if (code === "$06") {
    applyDeath(prep2, blob, world, DEATH_A_OBJ06);
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
    applyPassage(prep2, blob, world, { left: !!input.left, right: !!input.right });
    return;
  }
  if (world.energy === 0) {
    applyDeath(prep2, blob, world, DEATH_A_ENERGY);
    return;
  }
  if (tickPulses(blob, world)) {
    applyDeath(prep2, blob, world, DEATH_A_TILE);
    return;
  }
  const nastyDeath = tickNasties(prep2, blob, world);
  if (nastyDeath !== null) {
    applyDeath(prep2, blob, world, nastyDeath);
    return;
  }
  applyRoomExit(prep2, blob, steer.right && !steer.left, steer.left && !steer.right, world);
  if (blob.room < 0 || blob.room >= ROOM_COUNT) blob.room = (blob.room % ROOM_COUNT + ROOM_COUNT) % ROOM_COUNT;
}
function createWorld(prep2, room2) {
  const core = initCoreState();
  const world = {
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
    a350: new Uint8Array(A350_BYTES).fill(255),
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
    sfxStep: SFX_STEP_INIT
  };
  enterRoom(prep2, world, room2);
  return world;
}
function enterRoom(prep2, world, room2, opts) {
  composeTiles(prep2, world.terrain, room2);
  for (let i = 0; i < PLATFORM_SLOTS; i++) world.slots[i] = null;
  world.slotIndex = 0;
  world.pulseIndex = 0;
  world.buildLatch = false;
  world.pickupLatch = false;
  parkBullet(world);
  if (a390Unvisited(world.a390, room2)) {
    addScore(world, SCORE_FIRST_VISIT);
    clearA390Bit(world.a390, room2);
    world.visitedCount += 1;
  }
  spawnExtra(prep2, world, room2);
  if (opts?.nasties !== false) enterNasties(prep2, world, room2, opts?.blob);
  world.pulses = makePulses(prep2.pulsesByRoom?.[room2], world.dac.dac0);
  syncHoverpad(prep2, world, room2, opts?.blob);
  if (opts?.blob && room2 === CORE_ROOM && opts.blob.room === CORE_ROOM) {
    deliverCoreParts(prep2, opts.blob, world, (next) => {
      enterRoom(prep2, world, next, { blob: opts.blob });
    });
  }
}
function tickOverlay(prep2, blob, world) {
  const ui = world.ui;
  if (ui.kind === "door") {
    if (tickDoorUi(ui, world)) {
      syncWorldMessage(world, ui);
      applySecurityDoor(prep2, blob, world, ui.ok, { left: !ui.openRight, right: ui.openRight });
      world.ui = idleUi();
    } else {
      syncWorldMessage(world, ui);
    }
    return;
  }
  if (ui.kind === "teleport") {
    if (tickTeleportUi(ui, blob.room, world)) {
      syncWorldMessage(world, ui);
      applyTeleport(prep2, blob, world, ui.buffer);
      if (blob.room < 0 || blob.room >= ROOM_COUNT) {
        blob.room = (blob.room % ROOM_COUNT + ROOM_COUNT) % ROOM_COUNT;
      }
      world.ui = idleUi();
    }
  }
}
function applyTeleport(prep2, blob, world, code) {
  const ev = evaluateTeleport(code, blob.room);
  world.teleportLatch = true;
  if (ev.ok) {
    blob.room = ev.dest;
    enterRoom(prep2, world, ev.dest, { blob });
    const pad = firstTeleport(prep2, ev.dest);
    if (pad) {
      blob.x = pad.x;
      blob.y = gameYToPlay(pad.y);
      blob.fallIndex = 0;
      blob.onGround = true;
    }
    syncHoverpad(prep2, world, blob.room, blob);
    saveEntry(world, blob);
    world.message = TELEPORT_MSG_OK;
    return { ...ev, message: world.message, reason: TELEPORT_REASON };
  }
  blob.x &= 248;
  blob.y = gameYToPlay((playYToGame(blob.y) + 1 & 248) - 1);
  enterRoom(prep2, world, blob.room, { nasties: false, blob });
  syncHoverpad(prep2, world, blob.room, blob);
  saveEntry(world, blob);
  world.message = TELEPORT_MSG_BAD;
  return { ...ev, dest: blob.room, message: world.message, reason: TELEPORT_INVALID_REASON };
}
function applySecurityDoor(prep2, blob, world, ok, input) {
  world.teleportLatch = true;
  if (ok) {
    const bit0 = input.right ? 1 : 0;
    if (bit0) blob.x = blob.x + DOOR_SHIFT_X & 255;
    else blob.x = blob.x - DOOR_SHIFT_X & 255;
    world.message = DOOR_MSG_OK;
  } else {
    world.message = DOOR_MSG_BAD;
  }
  blob.y = gameYToPlay((playYToGame(blob.y) + 1 & 248) - 1);
  world.d2c4 = DOOR_REASON;
  enterRoom(prep2, world, blob.room, { nasties: false, blob });
  syncHoverpad(prep2, world, blob.room, blob);
  saveEntry(world, blob);
  return {
    ok,
    x: blob.x,
    y: playYToGame(blob.y),
    reason: DOOR_REASON,
    message: world.message
  };
}
function applyPassage(prep2, blob, world, input) {
  const next = blob.room + (input.right ? 1 : -1);
  if (next >= 0 && next < ROOM_COUNT) blob.room = next;
  requestSfx(world, PASSAGE_SFX);
  world.d2c4 = PASSAGE_REASON;
  enterRoom(prep2, world, blob.room, { blob });
  const pad = firstPassage(prep2, blob.room);
  if (pad) {
    blob.x = pad.x;
    blob.y = gameYToPlay(pad.y);
  }
  syncHoverpad(prep2, world, blob.room, blob);
  saveEntry(world, blob);
  return { room: blob.room, x: blob.x, y: playYToGame(blob.y), reason: PASSAGE_REASON };
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
  const attrsPath = path.join(dir, "block_attrs.json");
  if (fs.existsSync(attrsPath)) pack.blockAttrs = JSON.parse(fs.readFileSync(attrsPath, "utf8"));
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
function deathSnap(blob, world) {
  return {
    room: blob.room,
    x: blob.x,
    y: playYToGame(blob.y),
    energy: world.energy,
    lives: world.lives,
    platforms: world.platforms,
    firepower: world.firepower,
    dd22: world.dd22,
    gameOver: world.gameOver,
    victory: world.victory,
    message: world.message,
    d2c4: world.d2c4,
    deathA: world.deathA,
    inventory: world.inventory,
    energyDrain: world.energyDrain,
    endResult: world.endResult,
    score: formatScore(world.scoreDigits),
    coresLeft: world.coresLeft,
    corePairs: world.corePairs
  };
}
function parkedEntity(over) {
  return {
    x: 80,
    y: 80,
    ink: 4,
    set: "alien1",
    frame: 0,
    ptr: GRAFIX_BASE + 3 * GRAFIX_STRIDE,
    basePtr: GRAFIX_BASE + 3 * GRAFIX_STRIDE,
    dir: 0,
    speedX: 2,
    speedY: 2,
    period: 255,
    timer: 255,
    state: 1,
    stateTimer: 0,
    ai: 6,
    aiPeriod: 100,
    aiCount: 100,
    homeX: 80,
    homeY: 80,
    ...over
  };
}
if (has("--death-test")) {
  const mode = arg("--mode", "energy");
  const none = { left: false, right: false, up: false, down: false, fire: false };
  const room2 = mode === "terrain" ? 49 : 0;
  const world = createWorld(prep, room2);
  const blob = spawnBlob(prep, room2, world);
  world.entities = [];
  world.nastyCount = 0;
  world.pulses = [];
  if (mode === "terrain") {
    world.entry = { x: 136, y: 63, dd22: 0 };
    blob.x = 208;
    blob.y = GAME_Y_ORIGIN - 71;
  } else if (mode === "lethal" || mode === "lethal-c8" || mode === "annoy") {
    const ptr = mode === "lethal" ? BADALIEN2_PTR : mode === "lethal-c8" ? BADALIEN1_PTR : ALIEN1_PTR;
    world.entities = [
      parkedEntity({
        x: blob.x,
        y: playYToGame(blob.y),
        ptr,
        basePtr: ptr,
        set: mode === "annoy" ? "alien1" : mode === "lethal-c8" ? "badalien1" : "badalien2"
      })
    ];
    world.nastyCount = 1;
  } else if (mode === "energy" || mode === "respawn" || mode === "gameover") {
    blob.x = 137;
    blob.y = GAME_Y_ORIGIN - 64;
    world.energy = 0;
    if (mode === "respawn") {
      world.platforms = 7;
      world.firepower = 16;
      world.inventory = [{ sprite: 26, attr: 3 }];
    }
    if (mode === "gameover") world.lives = 0;
  }
  const before = deathSnap(blob, world);
  tick(prep, blob, none, world);
  for (let i = 0; i < 200 && world.deathPhase; i++) tick(prep, blob, none, world);
  process.stdout.write(
    JSON.stringify({
      mode,
      before,
      after: deathSnap(blob, world),
      entities: world.entities.map(entityPublic)
    }) + "\n"
  );
  process.exit(0);
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
if (has("--fire-trace")) {
  const room2 = parseInt(arg("--room", "1"), 10);
  const frames = parseInt(arg("--frames", "40"), 10);
  const world = createWorld(prep, room2);
  world.entities = [];
  world.nastyCount = 0;
  const blob = spawnBlob(prep, room2, world);
  const initPath = arg("--fire-init", "");
  if (initPath) {
    const init = JSON.parse(fs.readFileSync(initPath, "utf8"));
    if (init.blob) {
      blob.x = init.blob.x;
      blob.y = GAME_Y_ORIGIN - init.blob.y;
    }
    if (init.aim) {
      world.aim = init.aim;
      blob.facing = init.aim === 2 ? -1 : 1;
    }
    if (init.firepower !== void 0) world.firepower = init.firepower;
  }
  const out = [];
  for (let i = 0; i < frames; i++) {
    tickFire(prep, blob, i === 0, world);
    out.push({
      frame: i,
      x: world.bullet.x,
      y: world.bullet.y,
      fireDir: world.fireDir,
      ptr: world.bullet.ptr,
      firepower: world.firepower
    });
    if (world.fireDir === 0 && i > 0) break;
  }
  process.stdout.write(JSON.stringify(out) + "\n");
  process.exit(0);
}
if (has("--hit-test")) {
  const world = createWorld(prep, 1);
  const blob = spawnBlob(prep, 1, world);
  world.entities = [
    {
      x: 80,
      y: 80,
      ink: 4,
      set: "alien1",
      frame: 0,
      ptr: 46152,
      basePtr: 46152,
      dir: 2,
      speedX: 2,
      speedY: 2,
      period: 1,
      timer: 1,
      state: 1,
      stateTimer: 0,
      ai: 6,
      aiPeriod: 100,
      aiCount: 100,
      homeX: 80,
      homeY: 80
    }
  ];
  world.nastyCount = 1;
  world.fireDir = 1;
  world.bullet.x = 80;
  world.bullet.y = 80;
  world.bullet.ptr = 59572;
  tickNasties(prep, blob, world);
  process.stdout.write(
    JSON.stringify({
      state: world.entities[0].state,
      ptr: world.entities[0].ptr,
      y: world.entities[0].y,
      fireDir: world.fireDir,
      bulletY: world.bullet.y
    }) + "\n"
  );
  process.exit(0);
}
if (has("--lift-test")) {
  const room2 = parseInt(arg("--room", "422"), 10);
  const frames = parseInt(arg("--frames", "16"), 10);
  const world = createWorld(prep, room2);
  const blob = spawnBlob(prep, room2, world);
  blob.x = parseInt(arg("--x", "72"), 10);
  blob.y = GAME_Y_ORIGIN - parseInt(arg("--y", "81"), 10);
  blob.fallIndex = 0;
  blob.jumpTicks = 0;
  const none = { left: false, right: false, up: false, down: false, fire: false };
  const out = [];
  for (let i = 0; i < frames; i++) {
    out.push({
      frame: i,
      x: blob.x,
      y: playYToGame(blob.y),
      playY: blob.y,
      dd22: world.dd22,
      walkTick: blob.walkTick
    });
    tick(prep, blob, none, world);
  }
  process.stdout.write(JSON.stringify({ room: room2, station: world.station, frames: out }) + "\n");
  process.exit(0);
}
if (has("--pad-test")) {
  const room2 = parseInt(arg("--room", "15"), 10);
  const frames = parseInt(arg("--frames", "8"), 10);
  const world = createWorld(prep, room2);
  const blob = spawnBlob(prep, room2, world);
  const station = lastStation(prep, room2);
  if (has("--board") && (station.x || station.y)) {
    blob.x = station.x;
    blob.y = GAME_Y_ORIGIN - station.y;
    world.lastDir = 8;
  }
  const board = has("--board");
  const fire = has("--fire");
  const afterEnter = {
    dd22: world.dd22,
    nastyCount: world.nastyCount,
    pad: world.pad ? { x: world.pad.x, y: world.pad.y, ptr: world.pad.ptr } : null,
    station: world.station
  };
  const out = [];
  for (let i = 0; i < frames; i++) {
    const input = {
      left: false,
      right: has("--right"),
      up: board,
      down: false,
      fire: fire && i === 1
    };
    tick(prep, blob, input, world);
    out.push({
      frame: i,
      x: blob.x,
      y: playYToGame(blob.y),
      dd22: world.dd22,
      lastDir: world.lastDir,
      pad: world.pad ? { x: world.pad.x, y: world.pad.y, ptr: world.pad.ptr } : null,
      nastyCount: world.nastyCount,
      fireDir: world.fireDir,
      padShotDir: world.padShotDir,
      bullet: { x: world.bullet.x, y: world.bullet.y, ptr: world.bullet.ptr },
      firepower: world.firepower
    });
  }
  process.stdout.write(
    JSON.stringify({
      room: room2,
      station,
      stations: prep.stationsByRoom?.[room2] ?? [],
      afterEnter,
      frames: out
    }) + "\n"
  );
  process.exit(0);
}
if (has("--teleport-test")) {
  const room2 = parseInt(arg("--room", "343"), 10);
  const code = arg("--code", "VEROX");
  const world = createWorld(prep, room2);
  const blob = spawnBlob(prep, room2, world);
  const pad = firstTeleport(prep, room2);
  if (pad) {
    blob.x = pad.x;
    blob.y = GAME_Y_ORIGIN - pad.y;
  }
  const ev = evaluateTeleport(code, room2);
  const before = { room: blob.room, x: blob.x, y: playYToGame(blob.y), energy: world.energy, nastyCount: world.nastyCount };
  const result = applyTeleport(prep, blob, world, code);
  process.stdout.write(
    JSON.stringify({
      room: room2,
      code,
      eval: ev,
      ownName: teleportNameForRoom(room2),
      pad,
      destPad: firstTeleport(prep, blob.room),
      before,
      result,
      after: {
        room: blob.room,
        x: blob.x,
        y: playYToGame(blob.y),
        energy: world.energy,
        nastyCount: world.nastyCount,
        message: world.message,
        platforms: world.slots.some((s) => s !== null)
      }
    }) + "\n"
  );
  process.exit(0);
}
if (has("--teleport-eval")) {
  const room2 = parseInt(arg("--room", "343"), 10);
  const code = arg("--code", "VEROX");
  process.stdout.write(JSON.stringify(evaluateTeleport(code, room2)) + "\n");
  process.exit(0);
}
if (has("--door-test")) {
  const room2 = parseInt(arg("--room", "176"), 10);
  const world = createWorld(prep, room2);
  const blob = spawnBlob(prep, room2, world);
  const doors = prep.doorsByRoom?.[room2] ?? [];
  const door = doors.find((d) => d.x === 128) ?? doors[0];
  if (!door) {
    process.stdout.write(JSON.stringify({ error: "no door", room: room2 }) + "\n");
    process.exit(1);
  }
  blob.x = door.x;
  blob.y = GAME_Y_ORIGIN - door.y;
  const expected = expectedDoorCode(room2);
  const useKey = !has("--code");
  if (useKey) world.inventory = [{ sprite: DOOR_KEY_SPRITE, attr: 3 }];
  else {
    const parts = arg("--code", expected.join(",")).split(/[\s,;]+/).filter(Boolean).map((p) => parseInt(p, 10));
    world.inventory = parts.map((sprite) => ({ sprite, attr: 3 }));
  }
  const before = { x: blob.x, y: playYToGame(blob.y), room: blob.room, nastyCount: world.nastyCount };
  const input = { left: false, right: true, up: false, down: false, fire: false };
  tick(prep, blob, input, world);
  for (let i = 0; i < 80 && world.ui.kind !== "none"; i++) tick(prep, blob, input, world);
  process.stdout.write(
    JSON.stringify({
      room: room2,
      door,
      expected,
      useKey,
      before,
      after: {
        x: blob.x,
        y: playYToGame(blob.y),
        room: blob.room,
        d2c4: world.d2c4,
        message: world.message,
        nastyCount: world.nastyCount,
        shifted: blob.x === (before.x + DOOR_SHIFT_X & 255)
      }
    }) + "\n"
  );
  process.exit(0);
}
if (has("--passage-test")) {
  const room2 = parseInt(arg("--room", "61"), 10);
  const dir = arg("--dir", "right");
  const world = createWorld(prep, room2);
  const blob = spawnBlob(prep, room2, world);
  const src = firstPassage(prep, room2);
  if (!src) {
    process.stdout.write(JSON.stringify({ error: "no $0F", room: room2 }) + "\n");
    process.exit(1);
  }
  blob.x = src.x;
  blob.y = GAME_Y_ORIGIN - src.y;
  const right = dir !== "left";
  const before = { room: blob.room, x: blob.x, y: playYToGame(blob.y), nastyCount: world.nastyCount };
  const result = applyPassage(prep, blob, world, { left: !right, right });
  process.stdout.write(
    JSON.stringify({
      room: room2,
      dir,
      src,
      dest: firstPassage(prep, blob.room),
      before,
      result,
      after: {
        room: blob.room,
        x: blob.x,
        y: playYToGame(blob.y),
        d2c4: world.d2c4,
        sfx: world.sfx,
        nastyCount: world.nastyCount
      }
    }) + "\n"
  );
  process.exit(0);
}
if (has("--victory-test")) {
  const world = createWorld(prep, 0);
  const blob = spawnBlob(prep, 0, world);
  world.inventory = CORE_D2DE_INIT.map((v) => ({ sprite: v & 127, attr: 3 })).slice(0, 4);
  const steps = [];
  while (world.coresLeft > 0 && !world.gameOver) {
    const batch = [];
    for (let i = 0; i < CORE_D2DE_INIT.length && batch.length < 4; i++) {
      const id = CORE_D2DE_INIT[i] & 127;
      if ((world.d2de[i] & 128) === 0) continue;
      batch.push({ sprite: id, attr: 3 });
    }
    world.inventory = batch;
    blob.room = CORE_ROOM;
    blob.x = 136;
    blob.y = GAME_Y_ORIGIN - 63;
    enterRoom(prep, world, CORE_ROOM, { blob });
    const empty = { left: false, right: false, up: false, down: false, fire: false };
    while (world.corePhase && !world.gameOver) tick(prep, blob, empty, world);
    steps.push({
      coresLeft: world.coresLeft,
      corePairs: world.corePairs,
      room: blob.room,
      score: formatScore(world.scoreDigits),
      gameOver: world.gameOver,
      victory: world.victory
    });
    if (world.gameOver) break;
  }
  process.stdout.write(
    JSON.stringify({
      steps,
      endResult: world.endResult,
      gameOver: world.gameOver,
      victory: world.victory,
      message: world.message,
      coresLeft: world.coresLeft,
      corePairs: world.corePairs,
      score: formatScore(world.scoreDigits)
    }) + "\n"
  );
  process.exit(0);
}
if (has("--end-test")) {
  const mode = arg("--mode", "gameover");
  const world = createWorld(prep, 0);
  const blob = spawnBlob(prep, 0, world);
  world.frames = 50 * 65 + 7;
  if (mode === "gameover") {
    world.lives = 0;
    world.energy = 0;
    tick(prep, blob, { left: false, right: false, up: false, down: false, fire: false }, world);
    for (let i = 0; i < 200 && world.deathPhase; i++) {
      tick(prep, blob, { left: false, right: false, up: false, down: false, fire: false }, world);
    }
  }
  process.stdout.write(
    JSON.stringify({
      mode,
      gameOver: world.gameOver,
      victory: world.victory,
      message: world.message || GAME_OVER_MSG,
      endResult: world.endResult,
      score: world.endResult ? formatScore(world.endResult.scoreDigits) : formatScore(world.scoreDigits),
      time: world.endResult ? formatTime(world.endResult.timeMinutes, world.endResult.timeSeconds) : null
    }) + "\n"
  );
  process.exit(0);
}
if (has("--collect-test")) {
  const room2 = parseInt(arg("--room", "168"), 10);
  const world = createWorld(prep, room2);
  const blob = spawnBlob(prep, room2, world);
  const item = (prep.itemsByRoom[room2] ?? []).find((it) => it.placed && it.sprite !== 255 && !world.collected[it.index]);
  if (!item) {
    process.stdout.write(JSON.stringify({ error: "no item", room: room2 }) + "\n");
    process.exit(1);
  }
  const pos = itemGamePos(item);
  blob.x = pos.x;
  blob.y = GAME_Y_ORIGIN - pos.y;
  tick(prep, blob, { left: false, right: false, up: true, down: false, fire: false }, world);
  const afterPick = {
    index: item.index,
    collected: world.collected[item.index],
    inventory: world.inventory,
    energy: world.energy,
    platforms: world.platforms,
    firepower: world.firepower,
    lives: world.lives
  };
  enterRoom(prep, world, room2 === 0 ? 1 : 0);
  enterRoom(prep, world, room2);
  process.stdout.write(
    JSON.stringify({
      afterPick,
      afterReturn: {
        collected: world.collected[item.index],
        extra: world.extra
      }
    }) + "\n"
  );
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
