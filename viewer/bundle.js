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
  function blitItems(prep, buf, roomId) {
    const list = prep.itemsByRoom[roomId];
    if (!list?.length) return;
    for (const it of list) {
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
  function blitGrafix(buf, frame, x, y, ink) {
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
          buf.data[(cy * COLS + cx) * CELL + (pyAbs & 7)] ^= 128 >> (pxAbs & 7);
          occupied.add(cy * COLS + cx);
        }
      }
    }
    const inkBits = ink & 7;
    for (const idx of occupied) {
      const attr = buf.attr[idx];
      if (attr & 32) continue;
      buf.attr[idx] = attr & 248 | inkBits;
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
    if (opts.items !== false) blitItems(prep, buf, roomId);
    if (opts.blob) {
      const frames = prep.actorsBySet.get(opts.blob.set);
      const frame = frames?.[opts.blob.frame];
      if (frame) blitGrafix(buf, frame, opts.blob.x, opts.blob.y, 7);
    }
    const solid = opts.overlay ? prep.rooms[roomId].solid : null;
    return rasterize(buf, rgba, !!opts.overlay, solid);
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
  function poseGraphic(prep, blob) {
    const anim = animationSet(blob);
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
      x: 136,
      y: gameYToPlay(63),
      fallIndex: 0,
      jumpTicks: 0,
      facing: 1,
      walkTick: 0,
      walkFrame: 0,
      onGround: false
    };
    nudgeOutOfSolid(prep, blob, blobInkPixels(poseGraphic(prep, blob)), world);
    blob.onGround = onFloor(prep, blob.room, blob.x, blob.y, world);
    return blob;
  }
  function applyRoomExit(prep, blob, movingRight, movingLeft, world) {
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
    if (world) enterRoom(prep, world, blob.room);
    nudgeOutOfSolid(prep, blob, blobInkPixels(poseGraphic(prep, blob)), world);
    return true;
  }
  function animationSet(blob) {
    const sets = blob.facing > 0 ? WALK_RIGHT_SETS : WALK_LEFT_SETS;
    return { set: sets[blob.walkFrame & 3], frame: 0 };
  }
  function tick(prep, blob, input2, world) {
    const pixels = blobInkPixels(poseGraphic(prep, blob));
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
        if (input2.up) {
          blob.jumpTicks = TEMP_JUMP_TICKS;
          blob.onGround = false;
        }
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
    if (world) {
      tryBuildPlatform(prep, blob, input2, world);
      tickBridges(world);
    }
    applyRoomExit(prep, blob, input2.right && !input2.left, input2.left && !input2.right, world);
    if (blob.room < 0 || blob.room >= ROOM_COUNT) blob.room = (blob.room % ROOM_COUNT + ROOM_COUNT) % ROOM_COUNT;
  }
  function createWorld(prep, room) {
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
    enterRoom(prep, world, room);
    return world;
  }
  function enterRoom(prep, world, room) {
    composeTiles(prep, world.terrain, room);
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
  function fallSpeed(blob) {
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
  var keys = { left: false, right: false, up: false, down: false };
  function input() {
    return { left: keys.left, right: keys.right, up: keys.up, down: keys.down };
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
      loadJson("actors.json")
    ]);
    const prep = prepare({
      rooms: pack[0],
      graphics: pack[1],
      blocks: pack[2],
      sprites: pack[3],
      items: pack[4],
      actors: pack[5]
    });
    const start = parseHash() ?? 0;
    const world = createWorld(prep, start);
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
      $("blob-vy").textContent = String(fallSpeed(blob));
      $("stat-energy").textContent = String(world.energy);
      $("stat-platforms").textContent = String(world.platforms);
      $("stat-firepower").textContent = String(world.firepower);
      gotoEl.value = String(blob.room);
      $("time").textContent = lastMs.toFixed(2) + " ms";
      $("avg").textContent = avgMs.toFixed(2) + " ms";
      $("fps").textContent = avgMs > 0 ? (1e3 / avgMs).toFixed(0) : "\u2014";
    }
    function draw() {
      const t0 = performance.now();
      const anim = animationSet(blob);
      renderWorld(prep, world, buf, imageData.data, blob.room, {
        items: true,
        overlay,
        blob: { x: blob.x, y: blob.y, set: anim.set, frame: anim.frame }
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
      } else if (ev.key === "ArrowUp" || ev.key === "w" || ev.key === "W" || ev.key === " ") {
        keys.up = true;
        ev.preventDefault();
      } else if (ev.key === "ArrowDown" || ev.key === "s" || ev.key === "S") {
        keys.down = true;
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
      else if (ev.key === "ArrowUp" || ev.key === "w" || ev.key === "W" || ev.key === " ") keys.up = false;
      else if (ev.key === "ArrowDown" || ev.key === "s" || ev.key === "S") keys.down = false;
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
    $("status").textContent = "50 Hz \xB7 \u0161ipky / WASD pohyb \xB7 mezern\xEDk skok \xB7 dol\u016F stav\xED plo\u0161inku";
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
