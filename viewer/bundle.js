"use strict";
(() => {
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
  var TEMP_JUMP_PX = 2;
  var START_ENERGY = 23;
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
  var KILL_GRAPHIC_HI = 180;
  var APPEAR_GRAPHIC = 45384;
  var DEAD_GRAPHIC = 48840;
  var APPEAR_FRAMES = 16;
  var DIE_FRAMES = 8;
  var KIND_BADALIEN2 = 2;
  var AI_FORCED_KIND2 = 5;
  var GRAPHIC_LO_C8 = 200;
  var HIT_DX = 14;
  var HIT_DY = 11;
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
  var ATTR_NASTY_HI = 128;
  var FIXED_NASTY_PTR = 45768;
  var FIXED_NASTY_AI = 6;
  var FIXED_NASTY_DIR = 1;
  var AI5_CHASE_MAX = 70;
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
    [0, 0]
  ];
  var EXTRA_LIVES_SPRITE = 23;
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
  var TICK_MS = 20;
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
  function scanHotspots(rooms, blocks, rawBySub) {
    const stationsByRoom = emptyHotspots();
    const teleportsByRoom = emptyHotspots();
    const killsByRoom = emptyHotspots();
    const pulsesByRoom = emptyPulses();
    const fixedNastiesByRoom = emptyHotspots();
    const empty = {
      stationsByRoom,
      teleportsByRoom,
      killsByRoom,
      pulsesByRoom,
      fixedNastiesByRoom
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
  function lastStation(prep, room) {
    const list = prep.stationsByRoom?.[room];
    const hit = list?.[list.length - 1];
    return hit ? { x: hit.x, y: hit.y } : { x: 0, y: 0 };
  }
  function firstTeleport(prep, room) {
    const list = prep.teleportsByRoom?.[room];
    return list?.[0] ?? null;
  }
  function teleportNameForRoom(room) {
    for (const [name, dest] of TELEPORT_TABLE) {
      if (dest === room) return name;
    }
    return "";
  }
  function evaluateTeleport(code, room) {
    const own = teleportNameForRoom(room);
    const norm = code.replace(/[^A-Za-z]/g, "").toUpperCase().slice(0, TELEPORT_NAME_LEN);
    if (norm.length !== TELEPORT_NAME_LEN) return { ok: false, dest: room, name: own };
    for (const [name, dest] of TELEPORT_TABLE) {
      if (name === norm) return { ok: true, dest, name };
    }
    return { ok: false, dest: room, name: own };
  }
  function exactAt(blob, x, y) {
    return blob.x === x && GAME_Y_ORIGIN - blob.y === y;
  }
  function blobGame(blob) {
    return { x: blob.x, y: GAME_Y_ORIGIN - blob.y };
  }
  function hitKillTerrain(prep, blob) {
    const { x, y } = blobGame(blob);
    for (const s of prep.killsByRoom?.[blob.room] ?? []) {
      if (Math.abs(x - s.x) < KILL_AABB && Math.abs(y - s.y) < KILL_AABB) return true;
    }
    return false;
  }
  function tickPulses(blob, world) {
    const { x, y } = blobGame(blob);
    let hit = false;
    for (const p of world.pulses) {
      p.timer = p.timer - 1 & 255;
      if (p.timer === 0) {
        p.timer = p.period;
        p.flag ^= 1;
      }
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
      flag: 0
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
  function walkSpecialObjects(prep, blob, input2, world) {
    if (hitKillTerrain(prep, blob)) return "$06";
    const stations = prep.stationsByRoom?.[blob.room] ?? [];
    for (const s of stations) {
      if (exactAt(blob, s.x, s.y)) {
        boardPad(world);
        break;
      }
    }
    const horiz = (input2.left ? 2 : 0) | (input2.right ? 1 : 0);
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
  function seedDac(room) {
    const addr = ROOM_DATA_BASE + room * ROOM_DATA_STRIDE;
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
  function spawnOne(prep, room, world, slot) {
    dacStep(world.dac);
    const kind = z80SubAdd(world.dac.dac0 >> 8 & 255, 15, 17);
    const ptr = GRAFIX_BASE + kind * GRAFIX_STRIDE;
    const e = makeEntity(ptr);
    e.ink = world.dac.dac0 >> 5 & 7;
    e.period = z80SubAdd(world.dac.dac2 >> 4 & 255, 5, 9) || 4;
    e.timer = world.dac.dac2 & 255;
    e.aiPeriod = modBias(world.dac.dac4 & 15, 5, 5) || 8;
    if (e.aiPeriod === 0) e.aiPeriod = 100;
    e.aiCount = 8;
    e.ai = z80SubAdd(world.dac.dac4 >> 8 & 15, 5, 5);
    if (kind === KIND_BADALIEN2) e.ai = AI_FORCED_KIND2;
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
  function applyFixedNasties(prep, room, world) {
    const list = prep.fixedNastiesByRoom?.[room] ?? [];
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
  function spawnNasties(prep, room, world) {
    world.dac = seedDac(room);
    dacStep(world.dac);
    world.entities = [];
    for (let i = 0; i < NASTY_SLOTS; i++) world.entities.push(spawnOne(prep, room, world, i + 1));
    world.nastyCount = NASTY_SLOTS;
    world.spawnGuard = SPAWN_GUARD;
    applyFixedNasties(prep, room, world);
  }
  function enterNasties(prep, world, room) {
    const outgoing = { room: world.cacheRoom, entities: world.entities.map(cloneEntity) };
    const incoming = world.entityCache;
    world.entityCache = outgoing;
    if (incoming && incoming.room === room && world.spawnGuard !== 0) {
      world.entities = incoming.entities.map(cloneEntity);
      world.nastyCount = NASTY_SLOTS;
    } else {
      spawnNasties(prep, room, world);
    }
    world.cacheRoom = room;
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
    if (!hitBlob(e, blob)) return null;
    if (isLethal(e)) {
      return (e.ptr & 255) === GRAPHIC_LO_C8 ? DEATH_A_LETHAL_C8 : DEATH_A_LETHAL;
    }
    world.energyDrain = world.energyDrain + ANNOY_DRAIN_BUMP & 255;
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
  function syncHoverpad(prep, world, room, blob) {
    world.station = lastStation(prep, room);
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
  function appearOrDie(e) {
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
  function stepOne(e, prep, blob, world, slot) {
    if (e.y === 0) return null;
    hitByBullet(e, world);
    const death = applyContact(e, blob, world);
    if (death !== null) return { kind: "death", a: death };
    e.timer = e.timer - 1 & 255;
    if (e.timer !== 0) return null;
    e.timer = e.period;
    if (appearOrDie(e) && e.y === 0) return null;
    const abort = think(e, blob, world, slot);
    stepMove(e, world);
    if (abort) return { kind: "abort" };
    return null;
  }
  function tickNasties(prep, blob, world) {
    if (world.spawnGuard) world.spawnGuard -= 1;
    dacStep(world.dac);
    const n = Math.min(world.nastyCount, world.entities.length);
    for (let slot = n; slot >= 1; slot--) {
      const e = world.entities[slot - 1];
      if (!e) continue;
      for (let i = 0; i < NASTY_INNER_STEPS; i++) {
        const r = stepOne(e, prep, blob, world, slot);
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
  function a350Allows(a350, room) {
    const high = room >> 8 & 1;
    const low = room & 255;
    const offset = (high >> 3 | (low & 248) >> 3) & 255;
    let value = a350[offset] ?? 0;
    for (let i = 0; i < (low & 7) + 1; i++) value = (value << 1 | value >> 7) & 255;
    return (value & 1) !== 0;
  }
  function clearA350Bit(a350, room) {
    const high = room >> 8 & 1;
    const low = room & 255;
    const offset = (high >> 3 | (low & 248) >> 3) & 255;
    const rot = (low & 7) + 1;
    let value = a350[offset] ?? 0;
    for (let i = 0; i < rot; i++) value = (value << 1 | value >> 7) & 255;
    value = value & 254 & 255;
    for (let i = 0; i < rot; i++) value = (value >> 1 | (value & 1) << 7) & 255;
    a350[offset] = value;
  }
  function clampStat(v) {
    if (v < 0) return 0;
    if (v > STAT_CAP) return STAT_CAP;
    return v;
  }
  function applyExtra(world, sprite) {
    if (sprite === EXTRA_CHEOPS) {
      world.cheops = true;
      return;
    }
    if (sprite === EXTRA_LIVES_SPRITE) {
      if (world.lives === 0) world.lives = 1;
      return;
    }
    const row = EXTRA_EFFECTS[sprite - EXTRA_SPRITE_BASE];
    if (!row) return;
    const [off, add] = row;
    if (off === 1) world.energy = clampStat(world.energy + add);
    else if (off === 2) world.platforms = clampStat(world.platforms + add);
    else if (off === 3) world.firepower = clampStat(world.firepower + add);
  }
  function markers90(world) {
    const out = [];
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        if (world.terrain.attr[row * COLS + col] === 144) {
          out.push({ col, row: row + PLAY_ORIGIN });
        }
      }
    }
    return out;
  }
  function extraPos(col, row) {
    return { x: col << 3 & 255, y: (ITEM_ORIGIN_ROWS - row << 3) - 1 & 255 };
  }
  function spawnExtra(_prep, world, room) {
    world.extra = null;
    if (room === ROOM_SKIP) return;
    if (!a350Allows(world.a350, room)) return;
    const marks = markers90(world);
    if (marks.length < 2) return;
    world.dac = seedDac(room);
    for (let i = 0; i < EXTRA_DAC_ROLLS; i++) dacStep(world.dac);
    if ((world.dac.dac0 & 255) < EXTRA_MIN_DAC) return;
    dacStep(world.dac);
    let slot = (world.dac.dac0 & 127) % marks.length;
    const mark = marks[slot];
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
  function collectTableItem(prep, blob, world) {
    const list = prep.itemsByRoom[blob.room] ?? [];
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
      return;
    }
  }
  function tickPickup(prep, blob, input2, world) {
    const bx = blob.x;
    const by = GAME_Y_ORIGIN - blob.y;
    if (world.extra && nearItem(bx, by, world.extra.x, world.extra.y)) {
      if (world.extra.sprite === EXTRA_CHEOPS) {
        if (input2.up && !input2.left && !input2.right) world.cheops = true;
      } else {
        applyExtra(world, world.extra.sprite);
        clearA350Bit(world.a350, blob.room);
        world.extra = null;
      }
    }
    const upOnly = Boolean(input2.up) && !input2.left && !input2.right && !input2.down && !input2.fire;
    if (!upOnly) {
      world.pickupLatch = false;
      return;
    }
    if (world.pickupLatch) return;
    world.pickupLatch = true;
    collectTableItem(prep, blob, world);
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
    const { stationsByRoom, teleportsByRoom, killsByRoom, pulsesByRoom, fixedNastiesByRoom } = hotspotsFromData(data, rooms, blocks);
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
      fixedNastiesByRoom
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
  function clearBuffers(buf) {
    buf.data.fill(0);
    buf.attr.fill(CLEAR_ATTR);
  }
  function blitGraphic(prep, buf, ident, x, y) {
    const graphic = prep.graphics[ident];
    if (!graphic?.cells?.length) return;
    for (const cell of graphic.cells) {
      const cy = y + cell.row;
      const cx = x + cell.col;
      if (cx < 0 || cy < 0 || cx >= COLS || cy >= ROWS) continue;
      const dst = (cy * COLS + cx) * CELL;
      for (let py = 0; py < CELL; py++) buf.data[dst + py] = cell.data[py];
    }
  }
  function blitBlock(prep, buf, ident, x, y) {
    const sub = prep.blocks[ident];
    if (!sub) return;
    let rx = x + 4;
    let ry = y + 3;
    let k = 0;
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 2; col++) {
        blitGraphic(prep, buf, sub[k], rx, ry);
        k += 1;
        rx -= 4;
      }
      rx = x + 4;
      ry -= 3;
    }
  }
  function composeTiles(prep, buf, roomId) {
    clearBuffers(buf);
    const room = prep.rooms[roomId];
    let x = 0;
    let y = 0;
    let n = 0;
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 4; j++) {
        blitBlock(prep, buf, room.blocks[n], x, y);
        n += 1;
        x += 8;
      }
      x = 0;
      y += 6;
    }
    const attrs = room.attributes;
    for (let ry = 0; ry < ROWS; ry++) {
      const row = attrs[ry];
      const base = ry * COLS;
      for (let cx = 0; cx < COLS; cx++) buf.attr[base + cx] = row[cx];
    }
  }
  function blitItems(prep, buf, roomId, collected) {
    const list = prep.itemsByRoom[roomId];
    if (!list?.length) return;
    for (const it of list) {
      if (collected && collected[it.index]) continue;
      const sprite = prep.sprites[it.sprite];
      if (!sprite) continue;
      const attr = it.attr_bits & 7 | 64;
      const row0 = (it.row & 127) - PLAY_ORIGIN;
      const col0 = it.col & 31;
      for (const cell of sprite.cells) {
        const cy = row0 + cell.row;
        const cx = col0 + cell.col;
        if (cx < 0 || cy < 0 || cx >= COLS || cy >= ROWS) continue;
        const dst = (cy * COLS + cx) * CELL;
        for (let py = 0; py < CELL; py++) buf.data[dst + py] ^= cell.data[py];
        buf.attr[cy * COLS + cx] = attr;
      }
    }
  }
  function blitSprite(prep, buf, spriteId, col, row, attr) {
    const sprite = prep.sprites[spriteId];
    if (!sprite) return;
    for (const cell of sprite.cells) {
      const cy = row + cell.row;
      const cx = col + cell.col;
      if (cx < 0 || cy < 0 || cx >= COLS || cy >= ROWS) continue;
      const dst = (cy * COLS + cx) * CELL;
      for (let py = 0; py < CELL; py++) buf.data[dst + py] ^= cell.data[py];
      buf.attr[cy * COLS + cx] = attr;
    }
  }
  function blitExtra(prep, buf, extra) {
    if (!extra) return;
    const playRow = extra.row - PLAY_ORIGIN;
    blitSprite(prep, buf, extra.sprite, extra.col, playRow, extra.ink & 7 | 64);
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
  function graphicForPtr(prep, ptr) {
    const exact = prep.actorsByPtr?.get(ptr);
    if (exact) return exact;
    const pool = prep.actorsByPtr ? [...prep.actorsByPtr.values()] : [];
    if (!pool.length) {
      for (const list of prep.actorsBySet.values()) pool.push(...list);
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
  function stampGrafix(rgba, frame, x, y, ink) {
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
          rgba[p] = rgb[0];
          rgba[p + 1] = rgb[1];
          rgba[p + 2] = rgb[2];
          rgba[p + 3] = 255;
        }
      }
    }
  }
  function rasterize(buf, rgba, overlaySolid, solidGrid) {
    let p = 0;
    for (let cy = 0; cy < ROWS; cy++) {
      for (let py = 0; py < CELL; py++) {
        for (let cx = 0; cx < COLS; cx++) {
          const idx = cy * COLS + cx;
          const [paper, ink] = paperInk(buf.attr[idx]);
          const bits = buf.data[idx * CELL + py];
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
            rgba[p] = r;
            rgba[p + 1] = g;
            rgba[p + 2] = b;
            rgba[p + 3] = 255;
            p += 4;
          }
        }
      }
    }
    return rgba;
  }
  function renderWorld(prep, world, buf, rgba, roomId, opts = {}) {
    copyBuffers(world.terrain, buf);
    if (opts.items !== false) {
      blitItems(prep, buf, roomId, world.collected);
      blitExtra(prep, buf, world.extra);
    }
    const solid = opts.overlay ? prep.rooms[roomId].solid : null;
    rasterize(buf, rgba, !!opts.overlay, solid);
    if (opts.enemies !== false) {
      const n = Math.min(world.nastyCount, world.entities.length);
      for (let i = 0; i < n; i++) {
        const e = world.entities[i];
        if (!entityVisible(e)) continue;
        const frame = graphicForPtr(prep, e.ptr) ?? prep.actorsBySet.get(e.set)?.[e.frame];
        if (frame) stampGrafix(rgba, frame, e.x, GAME_Y_ORIGIN - e.y, e.ink);
      }
      if (world.pad && entityVisible(world.pad)) {
        const frame = graphicForPtr(prep, world.pad.ptr) ?? prep.actorsBySet.get(world.pad.set)?.[world.pad.frame];
        if (frame) stampGrafix(rgba, frame, world.pad.x, GAME_Y_ORIGIN - world.pad.y, world.pad.ink);
      }
    }
    if (opts.enemies !== false && entityVisible(world.bullet)) {
      const frame = graphicForPtr(prep, world.bullet.ptr) ?? prep.actorsBySet.get(world.bullet.set)?.[world.bullet.frame];
      if (frame) stampGrafix(rgba, frame, world.bullet.x, GAME_Y_ORIGIN - world.bullet.y, world.bullet.ink);
    }
    if (opts.blob) {
      const frames = prep.actorsBySet.get(opts.blob.set);
      const frame = frames?.[opts.blob.frame];
      if (frame) stampGrafix(rgba, frame, opts.blob.x, opts.blob.y, opts.blob.ink ?? 7);
    }
    return rgba;
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
  function solidAt(prep, room, col, row, world) {
    if (col < 0 || row < 0 || col >= COLS || row >= ROWS) return false;
    const attr = world ? world.terrain.attr[row * COLS + col] : prep.rooms[room].attributes[row][col];
    return blocksBlob(attr);
  }
  function attrAt(prep, room, col, row, world) {
    if (col < 0 || row < 0 || col >= COLS || row >= ROWS) return 71;
    return world ? world.terrain.attr[row * COLS + col] : prep.rooms[room].attributes[row][col];
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
  function poseGraphic(prep, blob, world) {
    const anim = animationSet(blob, world);
    return prep.actorsBySet.get(anim.set)?.[anim.frame];
  }
  function overlapsTerrain(prep, room, x, y, pixels, world) {
    for (const [ox, oy] of pixels) {
      const px = x + ox;
      const py = y + oy;
      if (px < 0 || py < 0 || px >= WIDTH || py >= HEIGHT) continue;
      if (solidAt(prep, room, px >> 3, py >> 3, world)) return true;
    }
    return false;
  }
  function onFloor(prep, room, x, y, world) {
    return supportY(prep, room, x, y, world) === y;
  }
  function supportY(prep, room, x, y, world) {
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
  function d2f0Bits(prep, room, x, playY, world) {
    if ((x & 7) !== 0) return 0;
    const col = x >> 3;
    const top = playY >> 3;
    const rows = (playYToGame(playY) + 1 & 7) === 0 ? 2 : 3;
    let bits = 0;
    for (let r = 0; r < rows; r++) {
      if (solidAt(prep, room, col + 2, top + r, world)) bits |= 1;
      if (solidAt(prep, room, col - 1, top + r, world)) bits |= 2;
    }
    return bits;
  }
  function d2f4Bits(prep, room, x, playY, world) {
    const gameY = playYToGame(playY);
    if ((gameY + 1 & 7) !== 0) return 0;
    const cols = footColumns(x);
    const origin = playY >> 3;
    let bits = 0;
    for (const col of cols) {
      if (solidAt(prep, room, col, origin + 2, world)) bits |= 4;
      if (solidAt(prep, room, col, origin - 1, world)) bits |= 8;
    }
    return bits;
  }
  function dirBits(input2) {
    return (input2.right ? 1 : 0) | (input2.left ? 2 : 0) | (input2.down ? 4 : 0) | (input2.up ? 8 : 0);
  }
  function nudgeOutOfSolid(prep, blob, pixels, world) {
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
  function spawnBlob(prep, room, world) {
    const blob = {
      room,
      x: NEW_GAME_X,
      y: gameYToPlay(NEW_GAME_Y),
      fallIndex: 0,
      jumpTicks: 0,
      facing: 1,
      walkTick: 0,
      walkFrame: 0,
      onGround: false
    };
    nudgeOutOfSolid(prep, blob, blobInkPixels(poseGraphic(prep, blob)), world);
    blob.onGround = onFloor(prep, blob.room, blob.x, blob.y, world);
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
  function finishDeath(prep, blob, world) {
    world.deathPhase = null;
    world.deathTicks = 0;
    world.blobHidden = false;
    world.blobInk = BLOB_INK;
    if (world.lives === 0) {
      world.gameOver = true;
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
    enterRoom(prep, world, blob.room);
    syncHoverpad(prep, world, blob.room, blob);
    blob.onGround = onFloor(prep, blob.room, blob.x, blob.y, world);
  }
  function tickDeath(prep, blob, world) {
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
  function applyDeath(prep, blob, world, a) {
    if (world.deathPhase) return;
    world.deathA = a & 255;
    world.d2c4 = (a & 255) >= DEATH_RESTORE_MIN_A ? 1 : 0;
    world.deathPhase = "flash";
    world.deathTicks = 0;
    world.blobHidden = false;
    world.blobInk = BLOB_INK;
    parkBullet(world);
    parkDeathSlots(world);
  }
  function applyRoomExit(prep, blob, movingRight, movingLeft, world) {
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
      enterRoom(prep, world, blob.room);
      saveEntry(world, blob);
      syncHoverpad(prep, world, blob.room, blob);
    }
    nudgeOutOfSolid(prep, blob, blobInkPixels(poseGraphic(prep, blob, world)), world);
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
  function tickLift(prep, blob, world) {
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
  function tryEnterLift(prep, blob, world) {
    if ((blob.x - LIFT_X_BIAS & LIFT_X_MASK) !== 0) return false;
    const gameY = playYToGame(blob.y);
    if ((gameY % LIFT_Y_MOD + LIFT_Y_MOD) % LIFT_Y_MOD !== 0) return false;
    const a = attrAt(prep, blob.room, (blob.x >> 3) + 1, (blob.y >> 3) + 1, world);
    if (a !== LIFT_ATTR) return false;
    world.dd22 = DD22_LIFT;
    return true;
  }
  function tickPadFlight(prep, blob, input2, world) {
    const bits = dirBits(input2);
    const vHit = d2f4Bits(prep, blob.room, blob.x, blob.y, world) | d2f4Bits(prep, blob.room, blob.x, padPlayY(blob), world);
    const vAllow = bits ^ bits & vHit;
    if (vAllow & 8) blob.y = gameYToPlay(playYToGame(blob.y) + HOVERPAD_FLY_PX);
    if (vAllow & 4) blob.y = gameYToPlay(playYToGame(blob.y) - HOVERPAD_FLY_PX);
    copyPadFromBlob(world, blob);
    const hHit = d2f0Bits(prep, blob.room, blob.x, blob.y, world) | d2f0Bits(prep, blob.room, blob.x, padPlayY(blob), world);
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
  function applyWalk(prep, blob, input2, pixels, world) {
    if (input2.right && !input2.left) {
      const nx = blob.x + WALK_PX;
      if (!overlapsTerrain(prep, blob.room, nx, blob.y, pixels, world)) blob.x = nx;
      blob.facing = 1;
      blob.walkTick += 1;
    } else if (input2.left && !input2.right) {
      const nx = blob.x - WALK_PX;
      if (!overlapsTerrain(prep, blob.room, nx, blob.y, pixels, world)) blob.x = nx;
      blob.facing = -1;
      blob.walkTick += 1;
    }
    if (blob.walkTick >= ANIM_PERIOD) {
      blob.walkTick = 0;
      blob.walkFrame = blob.walkFrame + 1 & 3;
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
        blob.y = support;
        blob.fallIndex = 0;
        blob.onGround = true;
      } else {
        blob.onGround = false;
        const idx = Math.min(blob.fallIndex, FALL_TABLE.length - 1);
        const dy = FALL_TABLE[idx];
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
  function tick(prep, blob, input2, world) {
    if (world?.gameOver) return;
    if (world?.deathPhase) {
      tickDeath(prep, blob, world);
      return;
    }
    const pixels = blobInkPixels(poseGraphic(prep, blob, world));
    if (world) {
      const dirs = dirBits(input2);
      if (dirs) world.lastDir = dirs;
    }
    const steer = world?.teleportLatch ? { ...input2, left: false, right: false } : input2;
    if (world?.dd22 === DD22_PAD) tickPadFlight(prep, blob, steer, world);
    else if (world?.dd22 === DD22_LIFT) tickLift(prep, blob, world);
    else applyWalk(prep, blob, steer, pixels, world);
    if (!world) {
      applyRoomExit(prep, blob, steer.right && !steer.left, steer.left && !steer.right, world);
      if (blob.room < 0 || blob.room >= ROOM_COUNT) blob.room = (blob.room % ROOM_COUNT + ROOM_COUNT) % ROOM_COUNT;
      return;
    }
    const walking = world.dd22 === DD22_WALK;
    const stationed = walking && onStationPixel(blob, world);
    if (walking && !stationed) tryBuildPlatform(prep, blob, input2, world);
    tickBridges(world);
    if (world.dd22 === DD22_PAD) tickPadFire(prep, blob, !!input2.fire, world);
    else tickFire(prep, blob, !!input2.fire, world);
    tickEnergyDrain(world);
    const pickupInput = stationed ? { ...input2, up: false } : input2;
    tickPickup(prep, blob, pickupInput, world);
    const boardedBefore = world.dd22 === DD22_PAD;
    const code = walkSpecialObjects(prep, blob, input2, world);
    if (world.dd22 === DD22_PAD && !boardedBefore) copyPadFromBlob(world, blob);
    if (code === "$06") {
      applyDeath(prep, blob, world, DEATH_A_OBJ06);
      return;
    }
    if (code !== null) {
      applyTeleport(prep, blob, world, code);
      if (blob.room < 0 || blob.room >= ROOM_COUNT) blob.room = (blob.room % ROOM_COUNT + ROOM_COUNT) % ROOM_COUNT;
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
    if (blob.room < 0 || blob.room >= ROOM_COUNT) blob.room = (blob.room % ROOM_COUNT + ROOM_COUNT) % ROOM_COUNT;
  }
  function createWorld(prep, room) {
    const world = {
      terrain: newBuffers(),
      energy: START_ENERGY,
      platforms: START_PLATFORMS,
      firepower: START_FIREPOWER,
      lives: START_LIVES,
      slots: Array.from({ length: PLATFORM_SLOTS }, () => null),
      slotIndex: 0,
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
      gameOver: false,
      d2c4: 0,
      deathA: 0,
      deathPhase: null,
      deathTicks: 0,
      blobInk: 7,
      blobHidden: false,
      entry: { x: NEW_GAME_X, y: NEW_GAME_Y, dd22: DD22_WALK },
      pulses: []
    };
    enterRoom(prep, world, room);
    return world;
  }
  function enterRoom(prep, world, room, opts) {
    composeTiles(prep, world.terrain, room);
    for (let i = 0; i < PLATFORM_SLOTS; i++) world.slots[i] = null;
    world.slotIndex = 0;
    world.buildLatch = false;
    world.pickupLatch = false;
    parkBullet(world);
    spawnExtra(prep, world, room);
    if (opts?.nasties !== false) enterNasties(prep, world, room);
    world.pulses = makePulses(prep.pulsesByRoom?.[room], world.dac.dac0);
    syncHoverpad(prep, world, room);
  }
  function applyTeleport(prep, blob, world, code) {
    const ev = evaluateTeleport(code, blob.room);
    world.teleportLatch = true;
    if (ev.ok) {
      blob.room = ev.dest;
      enterRoom(prep, world, ev.dest);
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
    blob.x &= 248;
    blob.y = gameYToPlay((playYToGame(blob.y) + 1 & 248) - 1);
    enterRoom(prep, world, blob.room, { nasties: false });
    syncHoverpad(prep, world, blob.room, blob);
    saveEntry(world, blob);
    world.message = TELEPORT_MSG_BAD;
    return { ...ev, dest: blob.room, message: world.message, reason: TELEPORT_INVALID_REASON };
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
  function floorBit6All(prep, blob, world) {
    const cols = footColumns(blob.x);
    const row = floorRow(blob.y);
    for (const col of cols) {
      if ((attrAt(prep, blob.room, col, row, world) & 64) === 0) return false;
    }
    return true;
  }
  function ceilingBlocked(prep, blob, world) {
    const cols = footColumns(blob.x);
    const row = (blob.y >> 3) - 1;
    for (const col of cols) {
      if (solidAt(prep, blob.room, col, row, world)) return true;
    }
    return false;
  }
  function isSpecial64(prep, room, col, row, world) {
    return (attrAt(prep, room, col, row, world) & 127) === 100;
  }
  function tryBuildPlatform(prep, blob, input2, world) {
    const bits = (input2.right ? 1 : 0) | (input2.left ? 2 : 0) | (input2.down ? PLATFORM_INPUT : 0) | (input2.up ? 8 : 0);
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
    if (gameY < 23 || !floorBit6All(prep, blob, world)) {
      if (ceilingBlocked(prep, blob, world)) return;
      const gy = playYToGame(blob.y);
      blob.y = gameYToPlay((gy + 1 & 248) + 8 - 1);
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
  function fallSpeed(blob, world) {
    if (world?.dd22 === DD22_LIFT) return -LIFT_PX;
    if (world?.dd22 === DD22_PAD) return 0;
    if (blob.jumpTicks > 0) return -TEMP_JUMP_PX;
    if (blob.onGround) return 0;
    const idx = Math.min(Math.max(blob.fallIndex - 1, 0), FALL_TABLE.length - 1);
    return FALL_TABLE[idx];
  }
  function cellPos(blob) {
    return { col: blob.x >> 3, row: blob.y >> 3 };
  }

  // src/main.ts
  var DATA_BASE = "../out";
  var keys = { left: false, right: false, up: false, down: false, fire: false };
  function input() {
    return { left: keys.left, right: keys.right, up: keys.up, down: keys.down, fire: keys.fire };
  }
  function $(id) {
    const el = document.getElementById(id);
    if (!el) throw new Error("#" + id);
    return el;
  }
  async function loadJson(name) {
    const res = await fetch(DATA_BASE + "/" + name);
    if (!res.ok) throw new Error(name + " HTTP " + res.status);
    return res.json();
  }
  function parseHash() {
    const h = (location.hash || "").replace(/^#/, "");
    if (!h) return null;
    const n = parseInt(h, 10);
    return Number.isNaN(n) ? null : clampRoom(n);
  }
  async function boot() {
    const canvas = $("screen");
    const rawCtx = canvas.getContext("2d", { alpha: false });
    if (!rawCtx) throw new Error("canvas");
    const ctx = rawCtx;
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    ctx.imageSmoothingEnabled = false;
    const imageData = ctx.createImageData(WIDTH, HEIGHT);
    const buf = newBuffers();
    const stage = $("stage");
    const overlayEl = $("overlay");
    const gotoEl = $("goto");
    $("status").textContent = "Na\u010D\xEDt\xE1m out/*.json \u2026";
    const pack = await Promise.all([
      loadJson("rooms.json"),
      loadJson("graphics.json"),
      loadJson("blocks.json"),
      loadJson("sprites.json"),
      loadJson("items.json"),
      loadJson("actors.json"),
      loadJson("block_attrs.json")
    ]);
    const prep = prepare({
      rooms: pack[0],
      graphics: pack[1],
      blocks: pack[2],
      sprites: pack[3],
      items: pack[4],
      actors: pack[5],
      blockAttrs: pack[6]
    });
    const start = parseHash() ?? 0;
    const world = createWorld(prep, start);
    world.readTeleportCode = (ownName) => {
      const typed = window.prompt(
        `YOU HAVE ENTERED TELEPORT
CODE : ${ownName}
ENTER TELEPORTAL DESTINATION CODE`,
        ""
      );
      keys.left = false;
      keys.right = false;
      return typed;
    };
    let blob = spawnBlob(prep, start, world);
    let overlay = false;
    let lastMs = 0;
    let avgMs = 0;
    let frames = 0;
    let acc = 0;
    let last = performance.now();
    function fitScale() {
      const scale = Math.max(1, Math.floor(Math.min(stage.clientWidth / WIDTH, stage.clientHeight / HEIGHT)));
      canvas.style.width = WIDTH * scale + "px";
      canvas.style.height = HEIGHT * scale + "px";
      $("scale").textContent = "\xD7" + scale;
    }
    function updatePanel() {
      $("room-id").textContent = String(blob.room);
      $("room-col").textContent = String(roomCol(blob.room));
      $("room-row").textContent = String(roomRow(blob.room));
      $("item-count").textContent = String(prep.itemsByRoom[blob.room]?.length ?? 0);
      $("blob-xy").textContent = `${blob.x}, ${blob.y}`;
      const cell = cellPos(blob);
      $("blob-cell").textContent = `${cell.col}, ${cell.row}`;
      $("blob-vy").textContent = String(fallSpeed(blob, world));
      $("stat-energy").textContent = String(world.energy);
      $("stat-platforms").textContent = String(world.platforms);
      $("stat-firepower").textContent = String(world.firepower);
      $("stat-lives").textContent = String(world.lives);
      $("stat-inv").textContent = world.inventory.length ? world.inventory.map((it) => "$" + it.sprite.toString(16)).join(" ") : "\u2014";
      $("stat-extra").textContent = world.extra ? "$" + world.extra.sprite.toString(16) : "\u2014";
      const dd22El = $("stat-dd22");
      dd22El.textContent = String(world.dd22);
      const padEl = $("stat-pad");
      padEl.textContent = world.pad ? `${world.pad.x}, ${world.pad.y}` : "\u2014";
      const tpEl = $("stat-teleport");
      tpEl.textContent = teleportNameForRoom(blob.room) || "\u2014";
      const msgEl = $("stat-message");
      msgEl.textContent = world.message || "\u2014";
      gotoEl.value = String(blob.room);
      $("time").textContent = lastMs.toFixed(2) + " ms";
      $("avg").textContent = avgMs.toFixed(2) + " ms";
      $("fps").textContent = avgMs > 0 ? (1e3 / avgMs).toFixed(0) : "\u2014";
    }
    function draw() {
      const t0 = performance.now();
      const anim = animationSet(blob, world);
      renderWorld(prep, world, buf, imageData.data, blob.room, {
        items: true,
        overlay,
        blob: world.blobHidden ? null : { x: blob.x, y: blob.y, set: anim.set, frame: anim.frame, ink: world.blobInk }
      });
      ctx.putImageData(imageData, 0, 0);
      const dt = performance.now() - t0;
      lastMs = dt;
      frames += 1;
      avgMs += (dt - avgMs) / Math.min(frames, 50);
      updatePanel();
    }
    function goRoom(id) {
      const room = clampRoom(id);
      enterRoom(prep, world, room);
      blob = spawnBlob(prep, room, world);
      const hash = "#" + blob.room;
      if (location.hash !== hash) history.replaceState(null, "", hash);
    }
    document.addEventListener("keydown", (ev) => {
      if (ev.target instanceof HTMLInputElement) return;
      if (ev.key === "ArrowLeft" || ev.key === "a" || ev.key === "A") {
        keys.left = true;
        ev.preventDefault();
      } else if (ev.key === "ArrowRight" || ev.key === "d" || ev.key === "D") {
        keys.right = true;
        ev.preventDefault();
      } else if (ev.key === "ArrowUp" || ev.key === "w" || ev.key === "W") {
        keys.up = true;
        ev.preventDefault();
      } else if (ev.key === " ") {
        keys.fire = true;
        ev.preventDefault();
      } else if (ev.key === "ArrowDown" || ev.key === "s" || ev.key === "S") {
        keys.down = true;
        ev.preventDefault();
      } else if (ev.key === "p" || ev.key === "P" || ev.key === "x" || ev.key === "X") {
        keys.fire = true;
        ev.preventDefault();
      } else if (ev.key === "PageUp") {
        goRoom(moveRoom(blob.room, 0, -1));
      } else if (ev.key === "PageDown") {
        goRoom(moveRoom(blob.room, 0, 1));
      }
    });
    document.addEventListener("keyup", (ev) => {
      if (ev.key === "ArrowLeft" || ev.key === "a" || ev.key === "A") keys.left = false;
      else if (ev.key === "ArrowRight" || ev.key === "d" || ev.key === "D") keys.right = false;
      else if (ev.key === "ArrowUp" || ev.key === "w" || ev.key === "W") keys.up = false;
      else if (ev.key === "ArrowDown" || ev.key === "s" || ev.key === "S") keys.down = false;
      else if (ev.key === " " || ev.key === "p" || ev.key === "P" || ev.key === "x" || ev.key === "X") keys.fire = false;
    });
    $("go").addEventListener("click", () => goRoom(parseInt(gotoEl.value, 10) || 0));
    gotoEl.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") goRoom(parseInt(gotoEl.value, 10) || 0);
    });
    overlayEl.addEventListener("change", () => {
      overlay = overlayEl.checked;
    });
    window.addEventListener("resize", fitScale);
    window.addEventListener("hashchange", () => {
      const id = parseHash();
      if (id !== null && id !== blob.room) goRoom(id);
    });
    $("status").textContent = "50 Hz \xB7 \u0161ipky / WASD pohyb \xB7 nahoru sebrat / nastoupit \xB7 dol\u016F plo\u0161inka \xB7 mezern\xEDk palba \xB7 Left/Right na teleportu k\xF3d";
    fitScale();
    function frame(now) {
      acc += now - last;
      last = now;
      if (acc > 100) acc = 100;
      while (acc >= TICK_MS) {
        const prev = blob.room;
        tick(prep, blob, input(), world);
        if (blob.room !== prev) {
          const hash = "#" + blob.room;
          if (location.hash !== hash) history.replaceState(null, "", hash);
        }
        acc -= TICK_MS;
      }
      draw();
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
  void boot().catch((err) => {
    const el = document.getElementById("status");
    if (el) {
      el.textContent = "Nelze na\u010D\xEDst data. python -m http.server 8000 z ko\u0159ene repozit\xE1\u0159e, /viewer/ (" + err.message + ")";
      el.className = "status error";
    }
  });
})();
