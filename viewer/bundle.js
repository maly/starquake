"use strict";
(() => {
  // src/audio/effects.ts
  var SFX_TABLE = [
    [63, 48, 1, 0, 129],
    [0, 127, 254, 0, 1],
    [197, 196, 3, 1, 193],
    [1, 127, 127, 1, 65],
    [1, 20, 255, 1, 65],
    [40, 34, 1, 127, 255],
    [50, 56, 254, 5, 195],
    [240, 241, 40, 1, 222],
    [30, 0, 1, 1, 195],
    [140, 128, 1, 127, 195],
    [0, 34, 1, 127, 223],
    [34, 0, 40, 127, 223],
    [32, 0, 20, 0, 129],
    [200, 201, 254, 5, 3],
    [0, 10, 254, 15, 7],
    [0, 3, 4, 23, 255],
    [30, 0, 7, 0, 65],
    [20, 10, 254, 0, 106],
    [64, 0, 255, 1, 129],
    [255, 254, 255, 255, 193],
    [10, 1, 255, 0, 1],
    [4, 0, 255, 20, 1],
    [7, 10, 255, 0, 1],
    [0, 0, 0, 0, 0]
  ];
  var SFX_STEP_INIT = 20;
  var SFX_HANG = 23;
  function requestSfx(world, a) {
    if (!Number.isInteger(a) || a < 0 || a > 23 || a === SFX_HANG) return;
    world.sfx.push(a);
  }

  // src/audio/synth.ts
  var SFX_CPU_HZ = 35e5;
  var SFX_SAMPLE_RATE = 44100;
  var DELAY_T = 45;
  var PERIOD_BIT7_0 = 112;
  var PERIOD_BIT7_1 = 134;
  var PCM_LEVEL = 12e3;
  var MAX_OUT = 1e6;
  var simCache = /* @__PURE__ */ new Map();
  function periodT(d, bit7) {
    const base = bit7 ? PERIOD_BIT7_1 : PERIOD_BIT7_0;
    const delay = d === 0 ? 256 : d;
    return base + DELAY_T * delay;
  }
  function simulateSfx(index) {
    const hit = simCache.get(index);
    if (hit) return hit;
    const rec = SFX_TABLE[index];
    if (!rec || index === SFX_HANG) {
      const empty = { nOut: 0, pcm: new Int16Array(0) };
      simCache.set(index, empty);
      return empty;
    }
    const [h0, h1, l0, x, f] = rec;
    if (l0 === 0 && (f & 64) === 0) {
      const empty = { nOut: 0, pcm: new Int16Array(0) };
      simCache.set(index, empty);
      return empty;
    }
    const bit6 = (f & 64) !== 0;
    const bit5 = (f & 32) !== 0;
    const bit7 = (f & 128) !== 0;
    const nMask = f & 31;
    const rounds = nMask === 0 ? 256 : nMask;
    const tStates = [];
    const signs = [];
    for (let i = 0; i < rounds; i++) {
      const aPrime = nMask - i & 255;
      let l = l0;
      if (bit6) {
        l = bit5 ? l - aPrime & 255 : l + aPrime & 255;
        if (l === 0) l = 1;
      }
      if (l === 0) break;
      let h = h0;
      let b = h;
      let speaker = 0;
      let steps = 0;
      for (; ; ) {
        let d = h & b ^ x;
        if (bit7) d = (d >> 1) - h & 255 & 63;
        tStates.push(periodT(d, bit7));
        signs.push(speaker ? PCM_LEVEL : -PCM_LEVEL);
        speaker ^= 1;
        if (tStates.length >= MAX_OUT) break;
        const carry = b < l;
        b = b - l & 255;
        if (!carry) continue;
        if (h === h1) break;
        h = h < h1 ? h + 1 & 255 : h - 1 & 255;
        b = h;
        steps += 1;
        if (steps > 512) break;
      }
      if (tStates.length >= MAX_OUT) break;
    }
    let cursorT = 0;
    let sampleIdx = 0;
    const samples = [];
    for (let i = 0; i < tStates.length; i++) {
      cursorT += tStates[i];
      const end = Math.round(cursorT * SFX_SAMPLE_RATE / SFX_CPU_HZ);
      const amp = signs[i];
      while (sampleIdx < end) {
        samples.push(amp);
        sampleIdx += 1;
      }
    }
    const sim = { nOut: tStates.length, pcm: Int16Array.from(samples) };
    simCache.set(index, sim);
    return sim;
  }
  function sfxPcm(index) {
    return simulateSfx(index).pcm;
  }

  // src/audio/tracks.ts
  var BGM_INTRO_URL = "intro.mp3";
  var BGM_LOOP_URL = "bgm.mp3";
  function musicUrlFor(ui) {
    return ui.kind === "menu" ? BGM_INTRO_URL : BGM_LOOP_URL;
  }

  // src/audio/player.ts
  var LS_MUTED = "starquake.audio.muted";
  var LS_BGM_MUTED = "starquake.audio.bgmMuted";
  var LS_SFX_GAIN = "starquake.audio.sfxGain";
  var LS_BGM_GAIN = "starquake.audio.bgmGain";
  var MUSIC_URLS = [BGM_INTRO_URL, BGM_LOOP_URL];
  function clamp01(n) {
    if (!Number.isFinite(n)) return 0;
    return Math.min(1, Math.max(0, n));
  }
  function readBool(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      if (v === null) return fallback;
      return v === "1" || v === "true";
    } catch {
      return fallback;
    }
  }
  function readNum(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      if (v === null) return fallback;
      const n = Number(v);
      return Number.isFinite(n) ? clamp01(n) : fallback;
    } catch {
      return fallback;
    }
  }
  var muted = readBool(LS_MUTED, false);
  var bgmMuted = readBool(LS_BGM_MUTED, false);
  var sfxGainValue = readNum(LS_SFX_GAIN, 0.75);
  var bgmGainValue = readNum(LS_BGM_GAIN, 0.4);
  var ctx = null;
  var sfxGain = null;
  var bgmGain = null;
  var musicEls = /* @__PURE__ */ new Map();
  var musicUrl = BGM_LOOP_URL;
  var unlocked = false;
  var nextSfxAt = 0;
  var resumeWait = null;
  var PENDING_MAX = 32;
  var pending = [];
  var bufferCache = /* @__PURE__ */ new Map();
  function persist() {
    try {
      localStorage.setItem(LS_MUTED, muted ? "1" : "0");
      localStorage.setItem(LS_BGM_MUTED, bgmMuted ? "1" : "0");
      localStorage.setItem(LS_SFX_GAIN, String(sfxGainValue));
      localStorage.setItem(LS_BGM_GAIN, String(bgmGainValue));
    } catch {
    }
  }
  function audioContextCtor() {
    if (typeof AudioContext !== "undefined") return AudioContext;
    const w = globalThis;
    return w.webkitAudioContext ?? null;
  }
  function applyGains() {
    if (sfxGain) sfxGain.gain.value = muted ? 0 : sfxGainValue;
    if (bgmGain) bgmGain.gain.value = muted || bgmMuted ? 0 : bgmGainValue;
    const want = muted || bgmMuted || !unlocked ? null : musicUrl;
    for (const [url, el] of musicEls) {
      if (url === want) {
        const p = el.play();
        if (p && typeof p.catch === "function") p.catch(() => void 0);
      } else {
        el.pause();
      }
    }
  }
  function attachTrack(ac, url) {
    if (musicEls.has(url)) return;
    const el = new Audio(url);
    el.loop = true;
    el.preload = "auto";
    el.addEventListener("error", () => {
      console.warn(`starquake: ${url} missing or unreadable; BGM silent`);
    });
    musicEls.set(url, el);
    try {
      ac.createMediaElementSource(el).connect(bgmGain ?? ac.destination);
    } catch {
      console.warn(`starquake: cannot attach ${url} to AudioContext; BGM silent`);
    }
  }
  function setupBgm(ac) {
    for (const url of MUSIC_URLS) attachTrack(ac, url);
  }
  function syncMusic(world) {
    const next = musicUrlFor(world.ui);
    if (next !== musicUrl) {
      const prev = musicEls.get(musicUrl);
      if (prev) {
        prev.pause();
        prev.currentTime = 0;
      }
      musicUrl = next;
      const incoming = musicEls.get(next);
      if (incoming) incoming.currentTime = 0;
    }
    applyGains();
  }
  function ensureCtx() {
    if (ctx) return ctx;
    const Ctor = audioContextCtor();
    if (!Ctor) return null;
    const ac = new Ctor({ sampleRate: SFX_SAMPLE_RATE });
    sfxGain = ac.createGain();
    bgmGain = ac.createGain();
    sfxGain.connect(ac.destination);
    bgmGain.connect(ac.destination);
    setupBgm(ac);
    ctx = ac;
    applyGains();
    return ac;
  }
  function bufferFor(ac, id) {
    const hit = bufferCache.get(id);
    if (hit) return hit;
    const pcm = sfxPcm(id);
    if (pcm.length === 0) return null;
    const buf = ac.createBuffer(1, pcm.length, SFX_SAMPLE_RATE);
    const ch = buf.getChannelData(0);
    const scale = 1 / 32768;
    for (let i = 0; i < pcm.length; i++) ch[i] = pcm[i] * scale;
    bufferCache.set(id, buf);
    return buf;
  }
  function enqueueSfx(id) {
    if (pending.length >= PENDING_MAX) pending.shift();
    pending.push(id);
  }
  function startSfx(ac, id) {
    if (muted) return;
    const buf = bufferFor(ac, id);
    if (!buf || !sfxGain) return;
    const src = ac.createBufferSource();
    src.buffer = buf;
    src.connect(sfxGain);
    const t = Math.max(ac.currentTime, nextSfxAt);
    src.start(t);
    nextSfxAt = t + buf.duration;
  }
  function flushPending() {
    const ac = ctx;
    if (!ac || ac.state === "suspended") return;
    const ids = pending.splice(0, pending.length);
    for (const id of ids) startSfx(ac, id);
  }
  function kickResume(ac) {
    if (ac.state !== "suspended") {
      flushPending();
      return;
    }
    if (resumeWait) return;
    const p = ac.resume();
    resumeWait = Promise.resolve(p).then(
      () => {
        resumeWait = null;
        flushPending();
        applyGains();
      },
      () => {
        resumeWait = null;
      }
    );
  }
  function unlock() {
    unlocked = true;
    const ac = ensureCtx();
    if (ac) kickResume(ac);
    applyGains();
  }
  function playSfx(id) {
    if (!Number.isInteger(id) || id < 0 || id > 23 || id === SFX_HANG) return;
    if (muted) return;
    if (!unlocked || !ctx || ctx.state === "suspended") {
      enqueueSfx(id);
      return;
    }
    startSfx(ctx, id);
  }
  function startPcm(ac, pcm) {
    if (muted || !sfxGain || pcm.length === 0) return;
    const buf = ac.createBuffer(1, pcm.length, SFX_SAMPLE_RATE);
    const ch = buf.getChannelData(0);
    const scale = 1 / 32768;
    for (let i = 0; i < pcm.length; i++) ch[i] = pcm[i] * scale;
    const src = ac.createBufferSource();
    src.buffer = buf;
    src.connect(sfxGain);
    src.start(Math.max(ac.currentTime, 0));
  }
  function drainSfx(world) {
    for (const id of world.sfx) playSfx(id);
    world.sfx.length = 0;
    const ac = ctx;
    if (!ac || ac.state === "suspended" || muted) {
      world.buzz.length = 0;
      return;
    }
    for (const pcm of world.buzz) startPcm(ac, pcm);
    world.buzz.length = 0;
  }
  function setMuted(value) {
    muted = value;
    persist();
    applyGains();
  }
  function setBgmMuted(value) {
    bgmMuted = value;
    persist();
    applyGains();
  }
  function setSfxGain(value) {
    sfxGainValue = clamp01(value);
    persist();
    applyGains();
  }
  function setBgmGain(value) {
    bgmGainValue = clamp01(value);
    persist();
    applyGains();
  }
  function bindCheck(id, checked, onChange) {
    const el = document.getElementById(id);
    if (!(el instanceof HTMLInputElement)) return;
    el.checked = checked;
    el.addEventListener("change", () => onChange(el.checked));
  }
  function bindRange(id, value, onChange) {
    const el = document.getElementById(id);
    if (!(el instanceof HTMLInputElement)) return;
    el.value = String(Math.round(value * 100));
    el.addEventListener("input", () => onChange(Number(el.value) / 100));
  }
  function wireAudioUi() {
    bindCheck("audio-sfx", !muted, (on) => {
      unlock();
      setMuted(!on);
    });
    bindCheck("audio-bgm", !bgmMuted, (on) => {
      unlock();
      setBgmMuted(!on);
    });
    bindRange("audio-sfx-gain", sfxGainValue, (v) => {
      unlock();
      setSfxGain(v);
    });
    bindRange("audio-bgm-gain", bgmGainValue, (v) => {
      unlock();
      setBgmGain(v);
    });
  }

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
  var NEW_GAME_ROOM = 8;
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
  var ITEM_SHUFFLE = 20;
  var ITEM_KEY_ROOMS = [8, 40, 168, 182];
  var ITEM_TOOL_ROOMS = [150, 198, 200, 246];
  var ITEM_PAIR_ROOMS = [
    [436, 422],
    [236, 222],
    [52, 16],
    [502, 504],
    [296, 314],
    [72, 106],
    [310, 278],
    [56, 42],
    [416, 352],
    [140, 14],
    [266, 316],
    [476, 482],
    [84, 86],
    [478, 62],
    [80, 82],
    [226, 194],
    [114, 116],
    [466, 372]
  ];
  var ITEM_NEAR = 15;
  var INVENTORY_SLOTS = 4;
  var ITEM_ORIGIN_ROWS = 24;
  var ITEM_DROP_Y_BASE = 191;
  var ITEM_DROP_RIGHT_MIN = 29;
  var A350_BYTES = 128;
  var EXTRA_MIN_DAC = 85;
  var EXTRA_SPRITE_BASE = 17;
  var EXTRA_CHEOPS = 25;
  var EXTRA_DAC_ROLLS = 20;
  var CHEOPS_CODE_BC = 3853;
  var CHEOPS_DIGIT_COUNT = 2;
  var CHEOPS_OFFERS = 5;
  var CHEOPS_SKIP_MIN = 9;
  var CHEOPS_SKIP_MAX = 26;
  var CHEOPS_D2DE_MOD = 9;
  var CHEOPS_D2DE_ADD = 10;
  var CHEOPS_D2DE_MIN = 128;
  var CHEOPS_SPRITE_MASK = 63;
  var CHEOPS_SFX_INTRO = 11;
  var CHEOPS_SFX_PICK = 16;
  var CHEOPS_MSG_TITLE = "CHEOPS PYRAMID";
  var CHEOPS_MSG_CODE = "CHEOPS KEY CODE";
  var CHEOPS_MSG_EXCHANGE = "EXCHANGE    FOR";
  var CHEOPS_MSG_HINT = "HIT ANY KEY FROM 1 TO 5";
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
  var DOOR_UDG_LEFT = 37;
  var DOOR_UDG_RIGHT = 38;
  var DOOR_UDG_ROW = 10;
  var DOOR_UDG_COL_L = 12;
  var DOOR_UDG_COL_R = 16;
  var TELEPORT_UDG = 36;
  var TELEPORT_UDG_ROW = 9;
  var TELEPORT_UDG_COL = 23;
  var ATTR_INK_SPECIAL = 0;
  var ATTR_PAPER_SPECIAL = 54;
  var EA62_MIN = 2;
  var D5FD_INTRO_HALT = 15;
  var D5FD_ROLL = 25;
  var D5FD_MATCH_FLASH = 10;
  var D5FD_PAUSE = 20;
  var D5FD_OK_FLASH = 35;
  var D5FD_FAIL_FLASH = 40;
  var D5FD_DIGIT_STRIDE = 4;
  var D5FD_ATTR_WAIT = 3;
  var D5FD_ATTR_OK = 7;
  var D5FD_SFX_ROLL_BASE = 12;
  var D5FD_SFX_MATCH = 3;
  var DOOR_DIGIT_ROW = 17;
  var DOOR_DIGIT_COL = 11;
  var CHEOPS_DIGIT_ROW = 15;
  var CHEOPS_DIGIT_COL = 13;
  var MENU_CONTROL_DEFAULT = 4;
  var MENU_INK_SELECTED = 7;
  var MENU_INK_IDLE = 3;
  var MENU_INK_STATIC = 4;
  var MENU_TITLE_ROW = 3;
  var MENU_TITLE_COL = 7;
  var MENU_TITLE_UDG90 = [0, 0, 0, 24, 24, 0, 0, 0];
  var MENU_TITLE = "STARQUAKE";
  var MENU_KEYS_4 = "OPAQM";
  var MENU_KEYS_5 = "QWERT";
  var MENU_BAR_H = 138;
  var MENU_BAR_V = 139;
  var MENU_FOOT_L = 136;
  var MENU_FOOT_R = 137;
  var MENU_FOOT_ROW = 22;
  var MENU_FOOT_COL_L = 9;
  var MENU_FOOT_COL_R = 17;
  var MENU_SFX_SELECT = 12;
  var MENU_QUIT_MSG = "QUIT THE GAME";
  var MENU_QUIT_HINT = "ARE YOU SURE...";
  var MENU_QUIT_YN = "Y OR N...";
  var MENU_GOODBYE = "SAY GOODBYE TO OLLY...";
  var MENU_OLLY_UDG = 86;
  var MENU_OLLY_ROW = 12;
  var MENU_OLLY_COL = 12;
  var MENU_CORNERS = [
    [0, 0, 140],
    [30, 0, 141],
    [0, 22, 142],
    [30, 22, 143]
  ];
  var INTRO_TITLE = "FLIGHT COMPUTER REPORT";
  var INTRO_LINE2 = "TOUCHDOWN IMMINENT PREPARE";
  var INTRO_LINE3 = "FOR MISSION STARQUAKE...";
  var INTRO_LINE4 = "CRASH... BANG... SMASH...";
  var INTRO_LINE5 = "TOUCTHDOWN";
  var INTRO_LINE6 = "COMTHUTER MALTHUNCTION";
  var INTRO_LINE7 = "MALFUNNYTHINKIN ...";
  var D5FD_INV_ROW = 1;
  var D5FD_INV_COL0 = 21;
  var MACHINE_ATTR_HI = 224;
  var MACHINE_FALL = 16;
  var MACHINE_LIFE = 2;
  var MACHINE_COL_DEC = 1;
  var MACHINE_COL_STRIDE = 2;
  var MACHINE_ROW_ADD = 2;
  var MACHINE_SFX = 16;
  var MACHINE_LAYER_START = 3;
  var MACHINE_LAYER_COUNT = 2;
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

  // src/audio/channel.ts
  var CHAN_TABLE = [
    [10, 12, 3, 100],
    [9, 12, 3, 0],
    [10, 90, 0, 13],
    [14, 24, 12, 243],
    [6, 200, 247, 250],
    [70, 200, 235, 250],
    [1, 150, 0, 0],
    [3, 120, 10, 15],
    [63, 0, 0, 26],
    [5, 29, 12, 26],
    [4, 59, 5, 33],
    [66, 12, 244, 255],
    [30, 0, 0, 30],
    [74, 12, 3, 200],
    [73, 120, 3, 0],
    [0, 0, 0, 0]
  ];
  var CHAN_FIRE = 5;
  var CHAN_FALL = 6;
  var CHAN_LAND = 7;
  var CHAN_PLATFORM = 8;
  var CHAN_DEATH = 9;
  var CHAN_KILL = 11;
  var CHAN_AMBIENT_BASE = 12;
  var CHAN_FIRE_DELTA = 247;
  var PCM_LEVEL2 = 12e3;
  var FRAME_HZ2 = 50;
  var OUTER_T = 23;
  var INNER_T = 35;
  function emptyChan() {
    return { req0: 0, req1: 0, dur: 0, pitch: 0, delta: 0, noise: 0, count: 0, reload: 0 };
  }
  function requestA41B(world, a) {
    if (!Number.isInteger(a) || a < 1 || a > 16) return;
    world.chan.req0 = a;
  }
  function requestA41C(world, a) {
    if (!Number.isInteger(a) || a < 1 || a > 16) return;
    world.chan.req1 = a;
  }
  function fireSoundBusy(world) {
    return world.chan.dur !== 0 && world.chan.delta === CHAN_FIRE_DELTA;
  }
  function load(world, a) {
    const rec = CHAN_TABLE[a - 1];
    if (!rec) return;
    const b0 = rec[0];
    world.chan.dur = b0 & 63;
    world.chan.pitch = rec[1];
    world.chan.delta = rec[2];
    world.chan.noise = rec[3];
    const r = (b0 >> 6 & 3) + 1;
    world.chan.count = r;
    world.chan.reload = r;
  }
  function framePcm(e) {
    const n = e === 0 ? 256 : e;
    const halfT = OUTER_T + INNER_T * n;
    const nSamp = Math.round(SFX_SAMPLE_RATE / FRAME_HZ2);
    const tPer = SFX_CPU_HZ / SFX_SAMPLE_RATE;
    const pcm = new Int16Array(nSamp);
    let acc = 0;
    let speaker = 1;
    for (let i = 0; i < nSamp; i++) {
      acc += tPer;
      while (acc >= halfT) {
        acc -= halfT;
        speaker ^= 1;
      }
      pcm[i] = speaker ? PCM_LEVEL2 : -PCM_LEVEL2;
    }
    return pcm;
  }
  function tickChannel(world) {
    const ch = world.chan;
    if (ch.req0) {
      load(world, ch.req0);
      ch.req0 = 0;
    } else if (ch.dur === 0) {
      if (ch.req1) {
        load(world, ch.req1);
        ch.req1 = 0;
      } else {
        const dac0 = world.dac.dac0 & 255;
        if (dac0 < 4) {
          const dac1 = world.dac.dac0 >> 8 & 255;
          ch.req1 = (dac1 & 3) + CHAN_AMBIENT_BASE;
        }
        return;
      }
    }
    ch.count = ch.count - 1 & 255;
    if (ch.count !== 0) return;
    ch.count = ch.reload;
    ch.dur = ch.dur - 1 & 255;
    ch.pitch = ch.pitch + ch.delta & 255;
    const e = (ch.pitch ^ ch.noise) >> 1 & 127;
    ch.noise = ch.noise + 1 & 255;
    world.buzz.push(framePcm(e));
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
      homeY: ENTITY_PARK_Y,
      clipTerrain: true
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
      if (fireSoundBusy(world)) return;
      requestA41B(world, CHAN_FIRE);
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
      if (fireSoundBusy(world)) return;
      requestA41B(world, CHAN_FIRE);
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
  function socketSlotForRoom(room) {
    for (let i = 0; i < CORE_SOCKET_TABLE.length; i++) {
      if (socketRoomId(i) === room) return i;
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
    const machinesByRoom = emptyHotspots();
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
      passagesByRoom,
      machinesByRoom
    };
    if (!rooms.length || !blocks.length || !rawBySub.length) return empty;
    for (const room of rooms) {
      const id = room.id;
      if (id < 0 || id >= ROOM_COUNT) continue;
      const data = room.blocks;
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
              else if (hi === MACHINE_ATTR_HI) machinesByRoom[id].push(cellHotspot(col, row));
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
  function lastStation(prep, room) {
    const list = prep.stationsByRoom?.[room];
    const hit = list?.[list.length - 1];
    return hit ? { x: hit.x, y: hit.y } : { x: 0, y: 0 };
  }
  function firstTeleport(prep, room) {
    const list = prep.teleportsByRoom?.[room];
    return list?.[0] ?? null;
  }
  function firstPassage(prep, room) {
    const list = prep.passagesByRoom?.[room];
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
  function expectedDoorCode(room, d2c6 = DOOR_D2C6, bc = DOOR_CODE_BC) {
    return accessCodeDigits(room, d2c6, bc);
  }
  function expectedCheopsCode(room, d2c6 = DOOR_D2C6) {
    return accessCodeDigits(room, d2c6, CHEOPS_CODE_BC).slice(0, CHEOPS_DIGIT_COUNT);
  }
  function accessCodeDigits(room, d2c6, bc) {
    const h = d2c6 >> 8 & 255;
    const l = d2c6 & 255;
    const e = room & 255;
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
    return world.inventory.some(
      (it) => (it.sprite & 255) === (sprite & 255) && ((it.sprite & 255) !== 0 || (it.attr & 255) !== 0)
    );
  }
  function doorKeysAccepted(world, room) {
    return inventoryMatchesDigits(world, expectedDoorCode(room));
  }
  function cheopsKeysAccepted(world, room) {
    return inventoryMatchesDigits(world, expectedCheopsCode(room));
  }
  function inventoryMatchesDigits(world, need) {
    if (inventoryHasSprite(world, DOOR_KEY_SPRITE)) return true;
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
  function blankSocketGap(world, hs) {
    const col = (hs.x >> 3 & 252 | 1) & 31;
    const screenRow = ITEM_ORIGIN_ROWS - ((hs.y + 1 & 255) >> 3);
    const row0 = screenRow - PLAY_ORIGIN;
    for (let i = 0; i < 3; i++) {
      const row = row0 + i;
      if (col < 0 || row < 0 || col >= COLS || row >= ROWS) continue;
      const idx = row * COLS + col;
      world.terrain.attr[idx] = CLEAR_ATTR;
      const dst = idx * CELL;
      for (let py = 0; py < CELL; py++) world.terrain.data[dst + py] = 0;
    }
  }
  function restoreClearedSockets(prep, world, room) {
    for (const s of prep.socketsByRoom?.[room] ?? []) {
      if (((world.socketFlags[s.slot] ?? 0) & 127) !== 0) continue;
      blankSocketGap(world, s);
    }
  }
  function tryClearSocket(prep, blob, world) {
    if (!inventoryHasSprite(world, CORE_TOOL_SPRITE)) return false;
    const { x, y } = blobGame(blob);
    for (const s of prep.socketsByRoom?.[blob.room] ?? []) {
      if (Math.abs(x - s.x) >= ITEM_NEAR || Math.abs(y - s.y) >= ITEM_NEAR) continue;
      const flag = world.socketFlags[s.slot] ?? 0;
      if ((flag & 127) === 0) return false;
      world.socketFlags[s.slot] = flag & 128;
      blankSocketGap(world, s);
      requestSfx(world, 8);
      return true;
    }
    return false;
  }
  function walkSpecialObjects(prep, blob, input2, world) {
    if (hitKillTerrain(prep, blob)) return "$06";
    tryClearSocket(prep, blob, world);
    const stations = prep.stationsByRoom?.[blob.room] ?? [];
    for (const s of stations) {
      if (exactAt(blob, s.x, s.y)) {
        boardPad(world);
        break;
      }
    }
    const horiz = (input2.left ? 2 : 0) | (input2.right ? 1 : 0);
    if (!(horiz & (TELEPORT_INPUT_MASK | DOOR_INPUT_MASK))) {
      world.teleportLatch = false;
      return null;
    }
    if (world.teleportLatch) return null;
    const doors = prep.doorsByRoom?.[blob.room] ?? [];
    for (const d of doors) {
      if (!exactAt(blob, d.x, d.y)) continue;
      return "$00";
    }
    const pads = prep.teleportsByRoom?.[blob.room] ?? [];
    for (const t of pads) {
      if (!exactAt(blob, t.x, t.y)) continue;
      return "$0D";
    }
    const passages = prep.passagesByRoom?.[blob.room] ?? [];
    for (const p of passages) {
      if (!exactAt(blob, p.x, p.y)) continue;
      return "$0F";
    }
    return null;
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
  var FONT_FIRST = 32;
  var FONT_COUNT = 62;

  // src/ui/screen.ts
  var SCREEN_COLS = 32;
  var SCREEN_ROWS = 24;
  var SCREEN_W2 = SCREEN_COLS * CELL;
  var SCREEN_H2 = SCREEN_ROWS * CELL;
  var PLAY_ROW0 = 6;
  var PLAY_Y02 = PLAY_ROW0 * CELL;
  var DISPLAY_W2 = SCREEN_W2 * 2;
  var DISPLAY_H2 = SCREEN_H2 * 2;
  function newScreenBuffers() {
    return {
      data: new Uint8Array(SCREEN_COLS * SCREEN_ROWS * CELL),
      attr: new Uint8Array(SCREEN_COLS * SCREEN_ROWS)
    };
  }
  function clearScreen(buf, attr = 0) {
    buf.data.fill(0);
    buf.attr.fill(attr);
  }
  function clearPlayfield(buf) {
    for (let row = PLAY_ROW0; row < SCREEN_ROWS; row++) {
      const base = row * SCREEN_COLS;
      for (let col = 0; col < SCREEN_COLS; col++) {
        const idx = base + col;
        buf.attr[idx] = CLEAR_ATTR;
        const dst = idx * CELL;
        for (let py = 0; py < CELL; py++) buf.data[dst + py] = 0;
      }
    }
  }
  function pastePlayfield(screen, play) {
    for (let row = 0; row < ROWS; row++) {
      const sBase = (row + PLAY_ROW0) * SCREEN_COLS;
      const pBase = row * COLS;
      for (let col = 0; col < COLS; col++) {
        screen.attr[sBase + col] = play.attr[pBase + col];
        const sDst = (sBase + col) * CELL;
        const pDst = (pBase + col) * CELL;
        for (let py = 0; py < CELL; py++) screen.data[sDst + py] = play.data[pDst + py];
      }
    }
  }
  function cellIndex(row, col) {
    return row * SCREEN_COLS + col;
  }

  // src/ui/print.ts
  function newPrintState() {
    return {
      row: 0,
      col: 0,
      ink: 7,
      paper: 0,
      bright: 0,
      flash: 0,
      over: 0,
      transparentInk: false
    };
  }
  function glyphBytes(code) {
    const idx = code - FONT_FIRST;
    if (idx < 0 || idx >= FONT_COUNT) return null;
    return FONT_ADD4.subarray(idx * 8, idx * 8 + 8);
  }
  function writeAttr(buf, row, col, st) {
    const idx = cellIndex(row, col);
    let ink = st.ink & 7;
    if (st.transparentInk) ink = buf.attr[idx] & 7;
    const attr = (st.flash & 1) << 7 | (st.bright & 1) << 6 | (st.paper & 7) << 3 | ink;
    if (st.over) {
      return;
    }
    buf.attr[idx] = attr;
  }
  function plotChar(buf, st, code) {
    const g = glyphBytes(code);
    if (!g) {
      st.col = st.col + 1 & 31;
      return;
    }
    const { row, col } = st;
    if (row >= 0 && row < SCREEN_ROWS && col >= 0 && col < SCREEN_COLS) {
      const dst = cellIndex(row, col) * CELL;
      if (st.over) {
        for (let py = 0; py < CELL; py++) buf.data[dst + py] ^= g[py];
      } else {
        for (let py = 0; py < CELL; py++) buf.data[dst + py] = g[py];
      }
      writeAttr(buf, row, col, st);
    }
    st.col = st.col + 1 & 31;
  }
  function printMessage(buf, st, bytes, start = 0) {
    let i = start;
    while (i < bytes.length) {
      const b = bytes[i] & 255;
      i += 1;
      if (b === 255) break;
      if (b === 16) {
        const n = bytes[i] & 255;
        i += 1;
        st.transparentInk = n === 8;
        if (n <= 7) st.ink = n;
        continue;
      }
      if (b === 17) {
        st.paper = bytes[i] & 7;
        i += 1;
        continue;
      }
      if (b === 18) {
        st.flash = bytes[i] & 1;
        i += 1;
        continue;
      }
      if (b === 19) {
        st.bright = bytes[i] & 1;
        i += 1;
        continue;
      }
      if (b === 21) {
        st.over = bytes[i] & 1;
        i += 1;
        continue;
      }
      if (b === 22) {
        st.row = bytes[i] & 255;
        st.col = bytes[i + 1] & 255;
        i += 2;
        continue;
      }
      if (b === 8) {
        st.col = st.col - 1 & 31;
        continue;
      }
      if (b >= 32) plotChar(buf, st, b);
    }
    return i - start;
  }

  // src/ui/menu.ts
  function beginMenuUi() {
    return { kind: "menu", phase: "options", control: MENU_CONTROL_DEFAULT };
  }
  function printAt(buf, row, col, text, ink, bright = 1) {
    const bytes = [22, row, col, 19, bright, 16, ink, 17, 0, ...[...text].map((c) => c.charCodeAt(0)), 255];
    printMessage(buf, newPrintState(), bytes);
  }
  function blitGraphic(buf, prep, id, row, col) {
    const graphic = prep?.graphics[id];
    if (!graphic) return;
    for (const cell of graphic.cells) {
      const cy = row + cell.row;
      const cx = col + cell.col;
      if (cy < 0 || cy >= 24 || cx < 0 || cx >= SCREEN_COLS) continue;
      const idx = cellIndex(cy, cx);
      const dst = idx * CELL;
      for (let py = 0; py < CELL; py++) buf.data[dst + py] = cell.data[py];
      if (cell.attr != null) buf.attr[idx] = cell.attr & 255;
    }
  }
  function plotUdg(buf, row, col, data, attr) {
    if (row < 0 || row >= 24 || col < 0 || col >= SCREEN_COLS) return;
    const idx = cellIndex(row, col);
    const dst = idx * CELL;
    for (let py = 0; py < 8; py++) buf.data[dst + py] = data[py];
    buf.attr[idx] = attr & 255;
  }
  function drawBanners(buf, prep) {
    for (let i = 0; i < 7; i++) {
      const col = 2 + i * 4;
      blitGraphic(buf, prep, MENU_BAR_H, 0, col);
      blitGraphic(buf, prep, MENU_BAR_H, MENU_FOOT_ROW, col);
    }
    for (let i = 0; i < 5; i++) {
      const row = 2 + i * 4;
      blitGraphic(buf, prep, MENU_BAR_V, row, 0);
      blitGraphic(buf, prep, MENU_BAR_V, row, 30);
    }
    for (const [col, row, id] of MENU_CORNERS) blitGraphic(buf, prep, id, row, col);
  }
  function drawTitle(buf) {
    const attr = 71;
    let col = MENU_TITLE_COL;
    for (let i = 0; i < MENU_TITLE.length; i++) {
      printAt(buf, MENU_TITLE_ROW, col, MENU_TITLE[i], 7);
      col += 1;
      if (i + 1 < MENU_TITLE.length) {
        plotUdg(buf, MENU_TITLE_ROW, col, MENU_TITLE_UDG90, attr);
        col += 1;
      }
    }
  }
  function optionInk(ui, n) {
    return ui.control === n ? MENU_INK_SELECTED : MENU_INK_IDLE;
  }
  function drawOptions(buf, ui) {
    printAt(buf, 6, 4, "1.KEMPSTON JOYSTICK", optionInk(ui, 1));
    printAt(buf, 8, 4, "2.CURSOR JOYSTICK", optionInk(ui, 2));
    printAt(buf, 10, 4, "3.SINCLAIR ZX2 JOYSTICK", optionInk(ui, 3));
    printAt(buf, 12, 4, "4.KEYBOARD ... " + MENU_KEYS_4, optionInk(ui, 4));
    printAt(buf, 14, 4, "5.UDK KEYBOARD ... " + MENU_KEYS_5, optionInk(ui, 5));
    printAt(buf, 16, 4, "6.DEFINE YOUR OWN KEYS", MENU_INK_STATIC);
    printAt(buf, 18, 4, "0.START GAME", MENU_INK_STATIC);
    printAt(buf, 20, 4, "Q.QUIT", MENU_INK_STATIC);
  }
  function drawQuit(buf) {
    printAt(buf, 4, 9, MENU_QUIT_MSG, 6);
    printAt(buf, 6, 9, MENU_QUIT_HINT, 6);
    printAt(buf, 9, 12, MENU_QUIT_YN, 6);
  }
  function drawBannerFrame(buf, prep) {
    drawBanners(buf, prep);
  }
  function drawMenuOverlay(buf, ui, prep) {
    clearScreen(buf, 7);
    drawBannerFrame(buf, prep);
    if (ui.phase === "options") {
      blitGraphic(buf, prep, MENU_FOOT_L, MENU_FOOT_ROW, MENU_FOOT_COL_L);
      blitGraphic(buf, prep, MENU_FOOT_R, MENU_FOOT_ROW, MENU_FOOT_COL_R);
      drawTitle(buf);
      drawOptions(buf, ui);
      return;
    }
    if (ui.phase === "intro") {
      printAt(buf, 4, 5, INTRO_TITLE, 5);
      printAt(buf, 7, 3, INTRO_LINE2, 3);
      printAt(buf, 9, 5, INTRO_LINE3, 3);
      printAt(buf, 11, 4, INTRO_LINE4, 3);
      printAt(buf, 13, 10, INTRO_LINE5, 3);
      printAt(buf, 15, 5, INTRO_LINE6, 3);
      printAt(buf, 17, 7, INTRO_LINE7, 3);
      return;
    }
    drawQuit(buf);
    if (ui.phase === "goodbye") {
      printAt(buf, 19, 6, MENU_GOODBYE, 2);
      blitGraphic(buf, prep, MENU_OLLY_UDG, MENU_OLLY_ROW, MENU_OLLY_COL);
    }
  }
  function menuDigitFromKey(key, physical) {
    if (physical) {
      const digit = physical.match(/^(?:Digit|Numpad)([0-6])$/);
      if (digit) return digit[1].charCodeAt(0) - 48 & 255;
    }
    if (key.length === 1 && key >= "0" && key <= "6") return key.charCodeAt(0) - 48;
    return null;
  }
  function feedMenuKey(ui, key, world, physical) {
    if (ui.phase === "goodbye") return "stay";
    if (ui.phase === "intro") {
      if (key === "Shift" || key === "Control" || key === "Alt" || key === "AltGraph") return "stay";
      return "start";
    }
    if (ui.phase === "quit") {
      const ch = key.length === 1 ? key.toUpperCase() : "";
      if (ch === "Y") ui.phase = "goodbye";
      else if (ch === "N") ui.phase = "options";
      return "stay";
    }
    const digit = menuDigitFromKey(key, physical);
    if (digit === 0) {
      ui.phase = "intro";
      return "stay";
    }
    if (digit !== null && digit >= 1 && digit <= 5) {
      if (digit !== ui.control) {
        ui.control = digit;
        if (world) requestSfx(world, MENU_SFX_SELECT);
      }
      return "stay";
    }
    if (key === "q" || key === "Q") {
      ui.phase = "quit";
      return "stay";
    }
    return "stay";
  }

  // src/ui/end.ts
  function beginEndUi(victory, fields) {
    return {
      kind: "end",
      phase: victory ? "cores" : "stats",
      scoreDigits: fields.scoreDigits.slice(),
      adventure: fields.adventure,
      timeMinutes: fields.timeMinutes,
      timeSeconds: fields.timeSeconds,
      coresReplaced: fields.coresReplaced
    };
  }
  function feedEndKey(ui, key) {
    if (ui.phase !== "cores") return;
    if (key === "Shift" || key === "Control" || key === "Alt" || key === "AltGraph") return;
    ui.phase = "stats";
  }
  function printBytes(buf, bytes) {
    printMessage(buf, newPrintState(), bytes);
  }
  var CORES_COMPLETE = [
    22,
    3,
    7,
    16,
    5,
    ..."THE CORES COMPLETE".split("").map((c) => c.charCodeAt(0)),
    22,
    5,
    6,
    ..."BUT HOW ARE YOU GONNA".split("").map((c) => c.charCodeAt(0)),
    22,
    7,
    6,
    ..."GET HOME WHEN ONLY A".split("").map((c) => c.charCodeAt(0)),
    22,
    9,
    3,
    ..."THTUPID LOONY WOULD WANDER".split("").map((c) => c.charCodeAt(0)),
    22,
    11,
    3,
    ..."THIS FAR OUT IN THE GALAXY".split("").map((c) => c.charCodeAt(0)),
    255
  ];
  var GAME_OVER_LABELS = [
    22,
    3,
    11,
    16,
    7,
    ..."GAME  OVER".split("").map((c) => c.charCodeAt(0)),
    22,
    6,
    10,
    16,
    5,
    ..."SCORE".split("").map((c) => c.charCodeAt(0)),
    22,
    9,
    7,
    16,
    3,
    ..."ADVENTURE SCORE".split("").map((c) => c.charCodeAt(0)),
    22,
    12,
    8,
    16,
    4,
    ..."TIME TAKEN".split("").map((c) => c.charCodeAt(0)),
    22,
    15,
    5,
    16,
    7,
    ..."CORE ELEMENTS".split("").map((c) => c.charCodeAt(0)),
    22,
    17,
    7,
    ..."REPLACED".split("").map((c) => c.charCodeAt(0)),
    255
  ];
  function atString(row, col, ink, text) {
    return [22, row, col, 16, ink, 19, 1, ...[...text].map((c) => c.charCodeAt(0)), 255];
  }
  function drawEndOverlay(buf, ui, prep) {
    clearScreen(buf, 2);
    drawBannerFrame(buf, prep);
    if (ui.phase === "cores") {
      printBytes(buf, CORES_COMPLETE);
      return;
    }
    printBytes(buf, GAME_OVER_LABELS);
    const score = ui.scoreDigits.map((d) => String(d & 15)).join("");
    printBytes(buf, atString(6, 16, 5, score));
    printBytes(buf, atString(9, 23, 3, `${ui.adventure & 255}/`));
    const mm = String(ui.timeMinutes).padStart(2, "0");
    const ss = String(ui.timeSeconds).padStart(2, "0");
    printBytes(buf, atString(12, 20, 4, `${mm}.${ss}`));
    const cores = Math.max(0, ui.coresReplaced | 0);
    printBytes(buf, atString(19, 10, 7, cores < 10 ? `0${cores}` : String(cores)));
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
  function a390Unvisited(a390, room) {
    const high = room >> 8 & 1;
    const low = room & 255;
    const offset = (high >> 3 | (low & 248) >> 3) & 255;
    let value = a390[offset] ?? 0;
    for (let i = 0; i < (low & 7) + 1; i++) value = (value << 1 | value >> 7) & 255;
    return (value & 1) !== 0;
  }
  function clearA390Bit(a390, room) {
    const high = room >> 8 & 1;
    const low = room & 255;
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
  function dac6(d) {
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
  function scrambleEndDigits(world, adventure) {
    const d0 = world.scoreDigits[0] ?? 0;
    const d1 = world.scoreDigits[1] ?? 0;
    const d2 = world.scoreDigits[2] ?? 0;
    const a = adventure & 255;
    world.dac.dac0 = (d0 | d1 << 8) & 65535;
    world.dac.dac2 = (d2 | a << 8) & 65535;
    world.dac.dac4 = (a | a << 8) & 65535;
    world.dac.db19 = 3;
    world.dac.db1a = 3;
    for (let i = 0; i < 30; i++) dac6(world.dac);
    for (let i = 3; i <= 4; i++) {
      dac6(world.dac);
      let v = world.dac.dac0 & 255;
      while (v >= 10) v -= 10;
      world.scoreDigits[i] = v;
    }
    world.scoreDigits[5] = world.dac.dac0 >> 8 & 1 ? 5 : 0;
  }
  function composeEndResult(world, victory, banner) {
    addScore(world, SCORE_END_BONUS);
    const adventure = adventureScore(world.visitedCount);
    scrambleEndDigits(world, adventure);
    const time = framesToTime(world.frames);
    const result = {
      scoreDigits: world.scoreDigits.slice(),
      adventure,
      timeMinutes: time.minutes,
      timeSeconds: time.seconds,
      coresReplaced: CORE_LEFT_INIT - (world.coresLeft & 255),
      victory,
      banner
    };
    world.endResult = result;
    world.victory = victory;
    world.gameOver = true;
    world.ui = beginEndUi(victory, result);
    return result;
  }
  function formatScore(digits) {
    return digits.map((d) => String(d & 15)).join("");
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
      homeY: 15,
      clipTerrain: false
    };
  }
  function spawnOne(prep, room, world, slot, blob) {
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
      e.clipTerrain = false;
    }
  }
  function spawnNasties(prep, room, world, blob) {
    world.dac = seedDac(room);
    dacStep(world.dac);
    world.entities = [];
    for (let i = 0; i < NASTY_SLOTS; i++) world.entities.push(spawnOne(prep, room, world, i + 1, blob));
    world.nastyCount = NASTY_SLOTS;
    world.spawnGuard = SPAWN_GUARD;
    applyFixedNasties(prep, room, world);
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
      homeY: 0,
      clipTerrain: false
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
      e.clipTerrain = false;
    }
    world.nastyCount = NASTY_SLOTS;
    world.spawnGuard = 0;
    world.cacheRoom = CORE_ROOM;
  }
  function enterNasties(prep, world, room, blob) {
    if (room === CORE_ROOM) {
      spawnCoreGuardians(world);
      return;
    }
    if (room === CORE_NEIGHBOR) {
      world.entityCache = null;
      world.entities = [];
      world.nastyCount = 0;
      world.spawnGuard = 0;
      world.cacheRoom = room;
      return;
    }
    const outgoing = { room: world.cacheRoom, entities: world.entities.map(cloneEntity) };
    const incoming = world.entityCache;
    world.entityCache = outgoing;
    if (incoming && incoming.room === room && world.spawnGuard !== 0) {
      world.entities = incoming.entities.map(cloneEntity);
      world.nastyCount = NASTY_SLOTS;
    } else {
      spawnNasties(prep, room, world, blob);
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
      homeY: py,
      clipTerrain: true
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
    addScore(world, killScorePoints(e.basePtr || e.ptr));
    requestSfx(world, 18);
    requestA41C(world, CHAN_KILL);
    e.ptr = DEAD_GRAPHIC;
    e.set = "stars";
    e.ink = 7;
    e.state = 2;
    e.stateTimer = 0;
    parkBullet(world);
  }
  function spriteAir(e, world) {
    const playY = GAME_Y_ORIGIN - e.y;
    const col0 = e.x >> 3;
    const row0 = playY >> 3;
    const ncols = (e.x & 7) === 0 ? 3 : 4;
    const nrows = (e.y + 1 & 7) === 0 ? 2 : 3;
    for (let r = 0; r < nrows; r++) {
      for (let c = 0; c < ncols; c++) {
        if (cellSolid2(world, col0 + c, row0 + r)) return false;
      }
    }
    return true;
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
    if (!e.clipTerrain) return;
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
    if (!e.clipTerrain) return;
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
  function appearOrDie(e, blob, world) {
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
      e.clipTerrain = false;
      e.ptr = APPEAR_GRAPHIC;
      e.set = "corepieces1";
      if (world) requestA41C(world, (world.dac.dac0 & 3) + 1);
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
    if (!e.clipTerrain && spriteAir(e, world)) e.clipTerrain = true;
    bounceH(e, world);
    if (skip64(e, world)) return;
    if (e.dir & 1) e.x = e.x + e.speedX & 255;
    if (e.dir & 2) e.x = e.x - e.speedX & 255;
    bounceV(e, world);
    if (e.dir & 4) e.y = e.y - e.speedY & 255;
    if (e.dir & 8) e.y = e.y + e.speedY & 255;
  }
  function stepOne(e, prep, blob, world, slot, inner) {
    if (e.y === 0) return null;
    hitByBullet(e, world);
    const death = applyContact(e, blob, world, inner === 0);
    if (death !== null) return { kind: "death", a: death };
    e.timer = e.timer - 1 & 255;
    if (e.timer !== 0) return null;
    e.timer = e.period;
    if (appearOrDie(e, blob, world) && e.y === 0) return null;
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
  function tickNasties(prep, blob, world) {
    if (world.spawnGuard) world.spawnGuard -= 1;
    dacStep(world.dac);
    syncGrafixFrames(world);
    const n = Math.min(world.nastyCount, world.entities.length);
    for (let slot = n; slot >= 1; slot--) {
      const e = world.entities[slot - 1];
      if (!e) continue;
      for (let i = 0; i < NASTY_INNER_STEPS; i++) {
        const r = stepOne(e, prep, blob, world, slot, i);
        if (r?.kind === "death") return r.a;
        if (r?.kind === "abort") return null;
      }
    }
    return null;
  }
  function tickEnergyDrain(world) {
    if (world.cheatGod) return;
    world.energyDrain = world.energyDrain + 1 & 255;
    if (world.energyDrain < ENERGY_DRAIN_WRAP) return;
    world.energyDrain = 0;
    world.energy = Math.max(0, world.energy - ENERGY_DRAIN_STEP);
  }

  // src/core.ts
  function initSocketFlags() {
    return CORE_SOCKET_TABLE.map(([, flags]) => flags & 255);
  }
  function initCoreState() {
    const d2de = CORE_D2DE_INIT.map((v) => v & 255);
    return {
      d2de,
      d2deNeed: d2de.slice(),
      coresLeft: CORE_LEFT_INIT,
      corePairs: CORE_PAIRS_INIT
    };
  }
  function matchCoreDeliveries(world) {
    let delivered = 0;
    for (let pass = 0; pass < 2; pass++) {
      for (let inv = 0; inv < world.inventory.length; ) {
        const slot = world.inventory[inv];
        if ((slot.sprite & 255) === 0 && (slot.attr & 255) === 0) {
          inv += 1;
          continue;
        }
        const sprite = slot.sprite & 255;
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
  function tickCoreCeremony(prep, blob, world, tickNasties2, enter) {
    if (world.corePhase !== "ceremony") return;
    world.frames = world.frames + 1 >>> 0;
    tickNasties2(prep, blob, world);
    world.coreTicks += 1;
    if (world.coreTicks >= CORE_CEREMONY_FRAMES) {
      ejectToCoreNeighbor(blob, world, enter);
    }
  }

  // src/items.ts
  function rebuildItemIndex(prep) {
    prep.itemsByRoom = Array.from({ length: ROOM_COUNT }, () => []);
    for (const it of prep.itemTable ?? []) {
      if (it.sprite === 255) continue;
      if (!it.placed) continue;
      if ((it.row & 127) < PLAY_ORIGIN) continue;
      if (it.room === ROOM_SKIP) continue;
      if (it.room >= 0 && it.room < ROOM_COUNT) prep.itemsByRoom[it.room].push(it);
    }
  }
  function rrca3(a) {
    let v = a & 255;
    for (let i = 0; i < 3; i++) v = (v >> 1 | (v & 1) << 7) & 255;
    return v;
  }
  function dacReduce(a, n) {
    let v = a & 255;
    const e = n & 255;
    if (e === 0) return 0;
    do
      v = v - e & 255;
    while (v >= e);
    return v;
  }
  function rollCoreSprites(world) {
    const slots = Array.from({ length: 9 }, () => 0);
    for (let n = 5; n > 0; n--) {
      let sprite = 0;
      for (; ; ) {
        dacStep(world.dac);
        let a = world.dac.dac0 & 255;
        while (a >= 15) a -= 15;
        a = a + 137 & 255;
        if (a >= 143) a = a + 11 & 255;
        if (slots.includes(a)) continue;
        sprite = a;
        break;
      }
      let slot = 0;
      for (; ; ) {
        dacStep(world.dac);
        let e = world.dac.dac0 & 255;
        while (e >= 9) e -= 9;
        e = e + 9 & 255;
        while (e >= 9) e -= 9;
        slot = e;
        if (slots[slot] === 0) break;
      }
      slots[slot] = sprite;
    }
    for (let b = 9; b > 0; b--) {
      if (slots[9 - b] === 0) slots[9 - b] = 137 - b & 255;
    }
    world.d2de = slots;
    world.d2deNeed = slots.slice();
  }
  function writeShuffled(prep, index, room, sprite) {
    const src = prep.itemTemplate?.[index] ?? prep.itemTable?.[index];
    const it = prep.itemTable?.[index];
    if (!it) return;
    it.room = room & 511;
    it.sprite = sprite & 255;
    it.placed = false;
    it.attr_bits = (src?.attr_bits ?? 0) & 7;
    it.col = it.attr_bits << 5 & 224;
    it.row = room >> 8 & 1 ? 128 : 0;
  }
  function shuffleCollectibles(prep, world) {
    if (!prep.itemTable || prep.itemTable.length < ITEM_SHUFFLE) return;
    if (prep.itemTemplate) {
      prep.itemTable = prep.itemTemplate.map((it) => ({ ...it, raw: [...it.raw ?? []] }));
    }
    dacStep(world.dac);
    writeShuffled(prep, 0, ITEM_KEY_ROOMS[world.dac.dac0 & 3], 15);
    dacStep(world.dac);
    writeShuffled(prep, 1, ITEM_TOOL_ROOMS[world.dac.dac0 & 3], 16);
    rollCoreSprites(world);
    let c = 0;
    for (let pass = 0; pass < 2; pass++) {
      dacStep(world.dac);
      c = world.dac.dac0 & 7;
      for (let j = 0; j < 9; j++) {
        c = (c + 1) % 9;
        let sprite = (world.d2de[c] ?? 0) & 127;
        if (pass === 1 && (world.dac.dac0 >> 8 & 255) >= 150) sprite = (sprite & 7) + 26;
        sprite &= 127;
        dacStep(world.dac);
        const pair = ITEM_PAIR_ROOMS[pass * 9 + j];
        const room = (world.dac.dac0 & 255) < 127 ? pair[0] : pair[1];
        writeShuffled(prep, 2 + pass * 9 + j, room, sprite);
      }
    }
    rebuildItemIndex(prep);
  }
  function placeCollectiblesInRoom(prep, world, room) {
    if (room === ROOM_SKIP) return;
    const marks = prep.extraMarksByRoom?.[room] ?? [];
    if (!marks.length || !prep.itemTable) return;
    world.dac = seedDac(room);
    const slot = dacReduce((world.dac.dac0 >> 8 ^ world.d2c6 >> 8) & 127, marks.length);
    const mark = marks[slot];
    for (const it of prep.itemTable) {
      if (it.index >= ITEM_SHUFFLE) continue;
      if ((it.row & 127) !== 0) continue;
      if (it.room !== room) continue;
      let mix = (world.dac.dac2 & 255 ^ world.d2c6 & 255) & 63;
      mix = dacReduce(mix, 6);
      mix = mix + 2 & 255;
      const attr = rrca3(mix) & 224;
      it.col = mark.col & 31 | attr;
      it.row = it.row & 128 | mark.row & 127;
      it.placed = (it.row & 127) >= PLAY_ORIGIN;
      it.attr_bits = attr >> 5;
      rebuildItemIndex(prep);
      break;
    }
  }
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
  function itemOccupiesMark(prep, room, col, row, world) {
    for (const it of prep.itemsByRoom[room] ?? []) {
      if (world.collected[it.index]) continue;
      if ((it.col & 31) === (col & 31) && (it.row & 127) === (row & 127)) return true;
    }
    return false;
  }
  function spawnExtra(prep, world, room) {
    world.extra = null;
    if (room === ROOM_SKIP) return;
    if (!a350Allows(world.a350, room)) return;
    const marks = prep.extraMarksByRoom?.[room] ?? [];
    if (marks.length < 2) return;
    const free = marks.filter((m) => !itemOccupiesMark(prep, room, m.col, m.row, world));
    const pool = free.length > 0 ? free : marks;
    world.dac = seedDac(room);
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
  function padInventory(inventory) {
    const slots = inventory.slice(0, 4).map((it) => ({ sprite: it.sprite & 255, attr: it.attr & 255 }));
    while (slots.length < 4) slots.push({ sprite: 0, attr: 0 });
    return slots;
  }
  function pickCheopsSlot(inventory) {
    const slots = padInventory(inventory);
    for (let i = 0; i < 4; i++) {
      const a = slots[i].sprite & 255;
      if (a === 0) continue;
      if (a < CHEOPS_SKIP_MIN || a >= CHEOPS_SKIP_MAX) return i;
    }
    for (let i = 3; i >= 0; i--) {
      if ((slots[i].sprite & 255) !== 0) return i;
    }
    return 0;
  }
  function z80SubAdd2(a, sub, add) {
    let v = a & 255;
    while (v >= sub) v -= sub;
    return v + add - sub & 255;
  }
  function rollCheopsSprite(world) {
    for (let n = 0; n < 4096; n++) {
      dacStep(world.dac);
      const idx = z80SubAdd2(world.dac.dac0 & 255, CHEOPS_D2DE_MOD, CHEOPS_D2DE_ADD);
      const val = world.d2de[idx - 1] ?? 0;
      if (val < CHEOPS_D2DE_MIN) continue;
      return val & CHEOPS_SPRITE_MASK;
    }
    return 0;
  }
  function rollCheopsOffers(world, given) {
    const offers = [0, 0, 0, 0, given & 255];
    for (let i = CHEOPS_OFFERS - 2; i >= 0; i--) offers[i] = rollCheopsSprite(world);
    return offers;
  }
  function applyCheopsChoice(world, slot, offers, choice) {
    const spr = (offers[choice] ?? 0) & 255;
    while (world.inventory.length <= slot) world.inventory.push({ sprite: 0, attr: 0 });
    const it = world.inventory[slot];
    if (!it) world.inventory[slot] = { sprite: spr, attr: 0 };
    else it.sprite = spr;
  }
  function playAttr(prep, world, room, col, playRow) {
    if (col < 0 || playRow < 0 || col >= COLS || playRow >= ROWS) return CLEAR_ATTR;
    const fromWorld = world.terrain.attr[playRow * COLS + col];
    if (fromWorld !== void 0) return fromWorld;
    return prep.rooms[room]?.attributes[playRow]?.[col] ?? CLEAR_ATTR;
  }
  function dropCellClear(prep, world, room, col, screenRow) {
    const playRow = screenRow - PLAY_ORIGIN;
    for (const dc of [0, 1]) {
      for (const dr of [0, 1]) {
        const attr = playAttr(prep, world, room, col + dc, playRow + dr);
        if ((attr & 64) === 0) return false;
        if (attr === LIFT_ATTR) return false;
      }
    }
    return true;
  }
  function overflowDropCell(prep, blob, world) {
    const gameY = GAME_Y_ORIGIN - blob.y;
    let col = blob.x >> 3 & 31;
    const row = ITEM_DROP_Y_BASE - gameY >> 3 & 31;
    if (col >= 1 && dropCellClear(prep, world, blob.room, col - 1, row)) {
      return { col: col - 1, row };
    }
    if (col < ITEM_DROP_RIGHT_MIN && dropCellClear(prep, world, blob.room, col + 2, row)) {
      return { col: col + 2, row };
    }
    return { col, row };
  }
  function findItem(prep, index) {
    for (const list of prep.itemsByRoom) {
      const hit = list.find((it) => it.index === index);
      if (hit) return hit;
    }
    return void 0;
  }
  function dropOverflowItem(prep, blob, world, dropped) {
    if (dropped.index === void 0) return;
    const item = findItem(prep, dropped.index);
    if (!item) return;
    const dest = overflowDropCell(prep, blob, world);
    const fromRoom = item.room;
    if (fromRoom !== blob.room) {
      const old = prep.itemsByRoom[fromRoom];
      if (old) {
        const i = old.indexOf(item);
        if (i >= 0) old.splice(i, 1);
      }
      if (blob.room >= 0 && blob.room < ROOM_COUNT) {
        (prep.itemsByRoom[blob.room] ??= []).push(item);
      }
    }
    item.room = blob.room;
    item.col = dest.col & 31;
    item.row = dest.row & 127;
    item.sprite = dropped.sprite & 255;
    item.placed = true;
    world.collected[dropped.index] = 0;
  }
  function rotateInventoryEmpty(prep, blob, world) {
    world.inventory.unshift({ sprite: 0, attr: 0 });
    if (world.inventory.length > INVENTORY_SLOTS) {
      dropOverflowItem(prep, blob, world, world.inventory.pop());
    }
    requestSfx(world, 12);
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
      world.inventory.unshift({ sprite: it.sprite, attr: it.attr_bits, index: it.index });
      if (world.inventory.length > INVENTORY_SLOTS) {
        dropOverflowItem(prep, blob, world, world.inventory.pop());
      }
      requestSfx(world, 12);
      return true;
    }
    return false;
  }
  function tickPickup(prep, blob, input2, world) {
    const bx = blob.x;
    const by = GAME_Y_ORIGIN - blob.y;
    if (world.extra && nearItem(bx, by, world.extra.x, world.extra.y)) {
      if (world.extra.sprite === EXTRA_CHEOPS) {
        if (input2.up) return "cheops";
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
    if (!collectTableItem(prep, blob, world)) rotateInventoryEmpty(prep, blob, world);
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
    const itemTable = data.items.items.map((it) => ({ ...it, raw: [...it.raw ?? []] }));
    const itemTemplate = itemTable.map((it) => ({ ...it, raw: [...it.raw] }));
    const itemsByRoom = Array.from({ length: ROOM_COUNT }, () => []);
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
      passagesByRoom,
      machinesByRoom
    } = hotspotsFromData(data, rooms, blocks);
    const prep = {
      graphics,
      sprites,
      actorsBySet,
      actorsByPtr,
      blocks,
      rooms,
      itemsByRoom,
      itemTable,
      itemTemplate,
      stationsByRoom,
      teleportsByRoom,
      killsByRoom,
      pulsesByRoom,
      fixedNastiesByRoom,
      extraMarksByRoom,
      doorsByRoom,
      socketsByRoom,
      passagesByRoom,
      machinesByRoom
    };
    rebuildItemIndex(prep);
    return prep;
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
  function blitGraphic2(prep, buf, ident, x, y) {
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
        blitGraphic2(prep, buf, sub[k], rx, ry);
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
  function blitCorePanel(prep, buf, world, roomId) {
    if (roomId !== CORE_ROOM) return;
    const col0 = CORE_PANEL_ATTR_COL;
    const row0 = CORE_PANEL_ATTR_ROW - PLAY_ORIGIN;
    const blinkOn = (world.frames & 8) !== 0;
    for (let i = 0; i < CORE_SLOTS; i++) {
      const r = i / 3 | 0;
      const c = i % 3;
      const live = world.d2de[i] ?? 0;
      const pending2 = (live & 128) !== 0;
      const origin = world.d2deNeed[i] ?? CORE_D2DE_INIT[i] ?? live;
      const sprite = (pending2 ? live : origin) & 127;
      let ink = CORE_PANEL_INK_DONE;
      if (pending2) {
        ink = blinkOn ? CORE_PANEL_INK_PENDING : (world.frames + i & 3) + 2;
      }
      blitSprite(prep, buf, sprite, col0 + c * CORE_PANEL_STEP, row0 + r * CORE_PANEL_STEP, ink & 7 | 64);
    }
  }
  function blitPulses(buf, pulses, _dac0) {
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
        for (let py = 0; py < CELL; py++) buf.data[dst + py] ^= ink[base + py];
        buf.attr[playRow * COLS + cx] = attr;
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
  function grafixAnimDrawX(x, frame) {
    return x - (frame & 3) * 2;
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
    blitCorePanel(prep, buf, world, roomId);
    blitPulses(buf, world.pulses, world.dac.dac0);
    const solid = opts.overlay ? prep.rooms[roomId].solid : null;
    rasterize(buf, rgba, !!opts.overlay, solid);
    if (opts.enemies !== false) {
      const fi = grafixAnimFrame(world.frames);
      const n = Math.min(world.nastyCount, world.entities.length);
      for (let i = 0; i < n; i++) {
        const e = world.entities[i];
        if (!entityVisible(e)) continue;
        const frame = graphicForPtr(prep, e.ptr + fi * GRAFIX_FRAME) ?? prep.actorsBySet.get(e.set)?.[fi];
        if (frame) stampGrafix(rgba, frame, grafixAnimDrawX(e.x, fi), GAME_Y_ORIGIN - e.y, e.ink);
      }
      if (world.pad && entityVisible(world.pad)) {
        const frame = graphicForPtr(prep, world.pad.ptr + fi * GRAFIX_FRAME) ?? prep.actorsBySet.get(world.pad.set)?.[fi];
        if (frame) stampGrafix(rgba, frame, grafixAnimDrawX(world.pad.x, fi), GAME_Y_ORIGIN - world.pad.y, world.pad.ink);
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

  // src/ui/overlay.ts
  var MSG_SECURITY_DOOR = "SECURITY  DOOR";
  var MSG_ACCESS_CODE = "ACCESS  CODE";
  var MSG_ACCESS_OK = "ACCESS AUTHORISED";
  var MSG_ACCESS_BAD = "ACCESS CODE INVALID";
  var MSG_ENTERED = "YOU HAVE ENTERED";
  var MSG_TELEPORT = "TELEPORT";
  var MSG_CODE_PREFIX = "CODE : ";
  var MSG_ENTER_TP = "ENTER TELEPORTAL";
  var MSG_DEST_CODE = "DESTINATION CODE";
  var MSG_DASHES = "- - - - -";
  var MSG_TP_OK = "NOW TELEPORTING";
  var MSG_TP_BAD = "CODE NOT RECOGNISED";
  function idleUi() {
    return { kind: "none" };
  }
  function printAt2(buf, row, col, text, ink = 7) {
    const bytes = [22, row, col, 16, ink, 19, 1, ...[...text].map((c) => c.charCodeAt(0)), 255];
    printMessage(buf, newPrintState(), bytes);
  }
  function planDigitMatches(world, digits) {
    const matched = digits.map(() => false);
    const invCols = digits.map(() => D5FD_INV_COL0);
    const used = world.inventory.map(() => false);
    for (let d = 0; d < digits.length; d++) {
      let hit = -1;
      for (let i = 0; i < world.inventory.length && i < 4; i++) {
        if (used[i]) continue;
        if ((world.inventory[i].sprite & 255) === DOOR_KEY_SPRITE) {
          hit = i;
          break;
        }
      }
      if (hit < 0) {
        for (let i = 0; i < world.inventory.length && i < 4; i++) {
          if (used[i]) continue;
          if ((world.inventory[i].sprite & 255) === (digits[d] & 255)) {
            hit = i;
            used[i] = true;
            break;
          }
        }
      }
      if (hit < 0) {
        for (let i = 0; i < world.inventory.length && i < 4; i++) {
          if (used[i]) continue;
          if ((world.inventory[i].sprite & 255) === DOOR_SINGLE_WILDCARD) {
            hit = i;
            used[i] = true;
            break;
          }
        }
      }
      if (hit >= 0) {
        matched[d] = true;
        invCols[d] = D5FD_INV_COL0 + hit * 2;
      }
    }
    return { matched, invCols };
  }
  function d5fdFields(world, digits) {
    const { matched, invCols } = planDigitMatches(world, digits);
    return {
      digitIndex: 0,
      rollSlot: 0,
      ink: 7,
      flags: digits.map(() => D5FD_ATTR_WAIT),
      matched,
      invCols
    };
  }
  function beginDoorUi(world, room, openRight) {
    const ok = doorKeysAccepted(world, room);
    requestSfx(world, 8);
    const digits = expectedDoorCode(room);
    return {
      kind: "door",
      phase: "intro",
      ok,
      openRight,
      ticks: 0,
      digits,
      ...d5fdFields(world, digits)
    };
  }
  function beginTeleportUi(room, world) {
    if (world) requestSfx(world, 7);
    return {
      kind: "teleport",
      phase: "prompt",
      ownName: teleportNameForRoom(room) || "?????",
      buffer: "",
      waitingRelease: true,
      ok: false,
      dest: room,
      ticks: 0
    };
  }
  function beginCheopsUi(world, room) {
    requestSfx(world, CHEOPS_SFX_INTRO);
    const digits = expectedCheopsCode(room);
    return {
      kind: "cheops",
      phase: "intro",
      ok: cheopsKeysAccepted(world, room),
      chosen: false,
      ticks: 0,
      digits,
      ...d5fdFields(world, digits),
      slot: 0,
      given: 0,
      offers: []
    };
  }
  function enterCheopsExchange(ui, world) {
    ui.slot = pickCheopsSlot(world.inventory);
    const given = world.inventory[ui.slot]?.sprite ?? 0;
    ui.given = given & 255;
    ui.offers = rollCheopsOffers(world, ui.given);
    ui.phase = "exchange";
    ui.ticks = 0;
  }
  function ea62ForRow(row, dac0 = 0) {
    const a = dac0 & 7;
    if (a >= EA62_MIN) return a;
    return row & 7 | EA62_MIN;
  }
  function resolveEad3Attr(raw, ea62, ea63 = 5) {
    const masked = raw & 63;
    if (masked === ATTR_PAPER_SPECIAL) return raw & 192 | ea63 & 255;
    if (masked === ATTR_INK_SPECIAL) return raw & 248 | ea62 & 255;
    return raw & 255;
  }
  function blitGraphic3(buf, prep, id, row, col, dac0 = 0) {
    const graphic = prep?.graphics[id];
    if (!graphic) return;
    const ea62 = ea62ForRow(row, dac0);
    for (const cell of graphic.cells) {
      const cy = row + cell.row;
      const cx = col + cell.col;
      if (cy < 0 || cy >= 24 || cx < 0 || cx >= SCREEN_COLS) continue;
      const idx = cellIndex(cy, cx);
      const dst = idx * CELL;
      for (let py = 0; py < CELL; py++) buf.data[dst + py] = cell.data[py];
      if (cell.attr != null) buf.attr[idx] = resolveEad3Attr(cell.attr, ea62);
    }
  }
  function blitSprite2(buf, prep, spriteId, row, col, attr) {
    const sprite = prep?.sprites[spriteId];
    if (!sprite) return;
    for (const cell of sprite.cells) {
      const cy = row + cell.row;
      const cx = col + cell.col;
      if (cy < 0 || cy >= 24 || cx < 0 || cx >= SCREEN_COLS) continue;
      const idx = cellIndex(cy, cx);
      const dst = idx * CELL;
      for (let py = 0; py < CELL; py++) buf.data[dst + py] ^= cell.data[py];
      buf.attr[idx] = attr;
    }
  }
  function digitAttr(ui, i) {
    if (ui.phase === "roll" && i === ui.rollSlot) return ui.ink & 7;
    if (ui.phase === "match" && i === ui.digitIndex) return ui.ink & 7 | 2;
    return ui.flags[i] ?? D5FD_ATTR_WAIT;
  }
  function drawDigitRoll(buf, prep, ui, row, col0) {
    if (ui.phase === "intro") return;
    for (let i = 0; i < ui.digits.length; i++) {
      blitSprite2(buf, prep, ui.digits[i], row, col0 + i * D5FD_DIGIT_STRIDE, digitAttr(ui, i));
    }
    if (ui.phase === "match") {
      const col = ui.invCols[ui.digitIndex] ?? D5FD_INV_COL0;
      const attr = ui.ink & 7 | 2;
      for (let dy = 0; dy < 2; dy++) {
        for (let dx = 0; dx < 2; dx++) {
          const idx = cellIndex(D5FD_INV_ROW + dy, col + dx);
          if (idx >= 0 && idx < buf.attr.length) buf.attr[idx] = attr;
        }
      }
    }
  }
  function drawDoorOverlay(buf, ui, prep, dac0 = 0) {
    clearPlayfield(buf);
    printAt2(buf, 8, 9, MSG_SECURITY_DOOR);
    printAt2(buf, 15, 10, MSG_ACCESS_CODE);
    blitGraphic3(buf, prep, DOOR_UDG_LEFT, DOOR_UDG_ROW, DOOR_UDG_COL_L, dac0);
    blitGraphic3(buf, prep, DOOR_UDG_RIGHT, DOOR_UDG_ROW, DOOR_UDG_COL_R, dac0);
    drawDigitRoll(buf, prep, ui, DOOR_DIGIT_ROW, DOOR_DIGIT_COL);
    if (ui.phase === "result" || ui.phase === "done") {
      if (ui.ok) printAt2(buf, 21, 7, MSG_ACCESS_OK);
      else printAt2(buf, 21, 6, MSG_ACCESS_BAD);
    }
  }
  function drawTeleportOverlay(buf, ui, prep, dac0 = 0) {
    clearPlayfield(buf);
    printAt2(buf, 8, 4, MSG_ENTERED);
    printAt2(buf, 10, 8, MSG_TELEPORT);
    printAt2(buf, 12, 6, MSG_CODE_PREFIX + ui.ownName.slice(0, TELEPORT_NAME_LEN));
    blitGraphic3(buf, prep, TELEPORT_UDG, TELEPORT_UDG_ROW, TELEPORT_UDG_COL, dac0);
    printAt2(buf, 14, 8, MSG_ENTER_TP);
    printAt2(buf, 16, 8, MSG_DEST_CODE);
    if (ui.phase === "prompt" || ui.phase === "input") {
      printAt2(buf, 19, 12, MSG_DASHES);
      let col = 12;
      for (let i = 0; i < ui.buffer.length; i++) {
        printAt2(buf, 19, col, ui.buffer[i] + " ");
        col += 2;
      }
    }
    if (ui.phase === "result" || ui.phase === "done") {
      if (ui.ok) printAt2(buf, 21, 9, MSG_TP_OK);
      else printAt2(buf, 21, 6, MSG_TP_BAD);
    }
  }
  function drawCheopsOverlay(buf, ui, prep) {
    clearPlayfield(buf);
    printAt2(buf, 9, 6, CHEOPS_MSG_TITLE);
    if (ui.phase === "intro" || ui.phase === "roll" || ui.phase === "match" || ui.phase === "pause" || ui.phase === "result") {
      printAt2(buf, 13, 9, CHEOPS_MSG_CODE);
      drawDigitRoll(buf, prep, ui, CHEOPS_DIGIT_ROW, CHEOPS_DIGIT_COL);
    }
    if (ui.phase === "result") {
      if (ui.ok) printAt2(buf, 21, 7, MSG_ACCESS_OK);
      else printAt2(buf, 21, 6, MSG_ACCESS_BAD);
    }
    if (ui.phase === "exchange" || ui.phase === "done" && ui.chosen) {
      printAt2(buf, 13, 8, CHEOPS_MSG_EXCHANGE);
      printAt2(buf, 21, 4, CHEOPS_MSG_HINT);
      blitSprite2(buf, prep, ui.given, 12, 17, 71);
      for (let i = 0; i < CHEOPS_OFFERS; i++) {
        const col = 4 + i * 6;
        printAt2(buf, 15, col, `${i + 1}.`);
        blitSprite2(buf, prep, ui.offers[i] ?? 0, 16, col, 71);
      }
    }
  }
  function drawUiOverlay(buf, ui, prep, dac0 = 0) {
    if (ui.kind === "door") drawDoorOverlay(buf, ui, prep, dac0);
    else if (ui.kind === "teleport") drawTeleportOverlay(buf, ui, prep, dac0);
    else if (ui.kind === "cheops") drawCheopsOverlay(buf, ui, prep);
    else if (ui.kind === "menu") drawMenuOverlay(buf, ui, prep);
    else if (ui.kind === "end") drawEndOverlay(buf, ui, prep);
  }
  function nextD5fdInk(world, prev) {
    dacStep(world.dac);
    let a = world.dac.dac0 >> 8 & 63;
    while (a >= 6) a -= 6;
    a = a + 2 & 255;
    if (a === (prev & 255)) a ^= 1;
    return a;
  }
  function advanceDigit(ui) {
    ui.digitIndex += 1;
    ui.ticks = 0;
    if (ui.digitIndex >= ui.digits.length) ui.phase = "pause";
    else ui.phase = "roll";
  }
  function tickD5fd(ui, world) {
    if (ui.phase === "result" || ui.phase === "done" || ui.phase === "exchange") return false;
    ui.ticks += 1;
    if (ui.phase === "intro") {
      if (ui.ticks >= D5FD_INTRO_HALT) {
        ui.phase = "roll";
        ui.ticks = 0;
        ui.digitIndex = 0;
      }
      return false;
    }
    if (ui.phase === "roll") {
      if (world) {
        ui.ink = nextD5fdInk(world, ui.ink);
        const n = ui.digits.length || 1;
        let slot = world.dac.dac0 & 31;
        while (slot >= n) slot -= n;
        ui.rollSlot = slot;
        requestSfx(world, (world.dac.dac0 >> 8 & 3) + D5FD_SFX_ROLL_BASE);
      }
      if (ui.ticks >= D5FD_ROLL) {
        if (ui.matched[ui.digitIndex]) {
          ui.phase = "match";
          ui.ticks = 0;
          ui.flags[ui.digitIndex] = D5FD_ATTR_OK;
          if (world) requestSfx(world, D5FD_SFX_MATCH);
        } else {
          advanceDigit(ui);
        }
      }
      return false;
    }
    if (ui.phase === "match") {
      ui.ink = (ui.ink ^ 7 | 2) & 255;
      if (world) requestSfx(world, D5FD_SFX_MATCH);
      if (ui.ticks >= D5FD_MATCH_FLASH) advanceDigit(ui);
      return false;
    }
    if (ui.phase === "pause") {
      if (ui.ticks >= D5FD_PAUSE) {
        ui.phase = "result";
        ui.ticks = 0;
        return true;
      }
    }
    return false;
  }
  function tickDoorUi(ui, world) {
    if (tickD5fd(ui, world) && world) {
      if (ui.ok) requestSfx(world, 10);
      requestSfx(world, 15);
    }
    if (ui.phase === "result") {
      ui.ticks += 1;
      if (ui.ticks >= (ui.ok ? D5FD_OK_FLASH : D5FD_FAIL_FLASH)) {
        ui.phase = "done";
        return true;
      }
    }
    return ui.phase === "done";
  }
  function tickCheopsUi(ui, world) {
    if (ui.phase === "done") return true;
    if (ui.phase === "exchange") return false;
    if (tickD5fd(ui, world) && world) requestSfx(world, 15);
    if (ui.phase === "result") {
      ui.ticks += 1;
      if (ui.ticks >= (ui.ok ? D5FD_OK_FLASH : D5FD_FAIL_FLASH)) {
        if (ui.ok && world) {
          enterCheopsExchange(ui, world);
          return false;
        }
        ui.phase = "done";
        return true;
      }
    }
    return false;
  }
  function cheopsChoiceFromKey(key, physical) {
    if (physical) {
      const digit = physical.match(/^(?:Digit|Numpad)([1-5])$/);
      if (digit) return digit[1].charCodeAt(0) - 49 & 255;
    }
    if (key.length === 1) {
      const c = key.charCodeAt(0);
      if (c >= 49 && c <= 53) return c - 49;
    }
    return null;
  }
  function feedCheopsKey(ui, key, world, physical) {
    if (ui.phase !== "exchange") return;
    const choice = cheopsChoiceFromKey(key, physical);
    if (choice === null) return;
    if (world) {
      applyCheopsChoice(world, ui.slot, ui.offers, choice);
      requestSfx(world, CHEOPS_SFX_PICK);
    }
    ui.chosen = true;
    ui.phase = "done";
  }
  function mapTeleportKey(key) {
    if (key === " ") return " ";
    if (key.length === 1) {
      const ch = key.toUpperCase();
      const code = ch.charCodeAt(0);
      if (code >= 48 && code <= 57) return ch;
      if (code >= 65 && code <= 90) return ch;
    }
    return null;
  }
  function feedTeleportKey(ui, key, down, world) {
    if (ui.phase !== "input" && ui.phase !== "prompt") return;
    if (ui.phase === "prompt") ui.phase = "input";
    if (!down) {
      ui.waitingRelease = false;
      return;
    }
    if (ui.waitingRelease) return;
    if (ui.buffer.length >= TELEPORT_NAME_LEN) return;
    const ch = mapTeleportKey(key);
    if (!ch) return;
    ui.buffer += ch;
    ui.waitingRelease = true;
    if (world) requestSfx(world, 17);
  }
  function finishTeleportInput(ui, room, world) {
    const ev = evaluateTeleport(ui.buffer, room);
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
  function tickTeleportUi(ui, room, world) {
    if (ui.phase === "prompt") {
      ui.phase = "input";
      ui.waitingRelease = true;
    }
    if (ui.phase === "input" && ui.buffer.length >= TELEPORT_NAME_LEN) {
      finishTeleportInput(ui, room, world);
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
    } else if (ui.kind === "cheops") {
      if (ui.phase === "exchange" || ui.phase === "done" && ui.chosen) {
        world.message = CHEOPS_MSG_EXCHANGE;
      } else if (ui.phase === "result" || ui.phase === "done") {
        world.message = ui.ok ? DOOR_MSG_OK : DOOR_MSG_BAD;
      } else {
        world.message = CHEOPS_MSG_CODE;
      }
    } else if (ui.kind === "menu") {
      world.message = ui.phase === "options" ? "STARQUAKE" : ui.phase === "intro" ? INTRO_TITLE : ui.phase === "quit" ? MENU_QUIT_MSG : MENU_GOODBYE;
    } else if (ui.kind === "end") {
      world.message = ui.phase === "cores" ? "THE CORES COMPLETE" : "GAME OVER";
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
      homeY: y,
      clipTerrain: false
    }));
  }
  function finishDeath(prep, blob, world) {
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
  function applyDeath(prep, blob, world, a) {
    if (world.cheatGod) return;
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
      enterRoom(prep, world, blob.room, { blob });
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
    try {
      tickBody(prep, blob, input2, world);
    } finally {
      if (world) tickChannel(world);
    }
  }
  function tickBody(prep, blob, input2, world) {
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
        (next) => enterRoom(prep, world, next, { blob })
      );
      return;
    }
    if (world && isUiBlocking(world.ui)) {
      world.frames = world.frames + 1 >>> 0;
      tickOverlay(prep, blob, world);
      return;
    }
    if (world) world.frames = world.frames + 1 >>> 0;
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
    const pickupInput = stationed || world.dd22 === DD22_PAD || world.dd22 === DD22_LIFT ? { ...input2, up: false } : input2;
    if (tickPickup(prep, blob, pickupInput, world) === "cheops") {
      world.teleportLatch = true;
      world.ui = beginCheopsUi(world, blob.room);
      syncWorldMessage(world, world.ui);
      return;
    }
    tryFireMachine(prep, blob, world);
    const boardedBefore = world.dd22 === DD22_PAD;
    const code = walkSpecialObjects(prep, blob, input2, world);
    if (world.dd22 === DD22_PAD && !boardedBefore) copyPadFromBlob(world, blob);
    if (code === "$06") {
      applyDeath(prep, blob, world, DEATH_A_OBJ06);
      return;
    }
    if (code === "$00") {
      world.teleportLatch = true;
      world.ui = beginDoorUi(world, blob.room, !!input2.right);
      syncWorldMessage(world, world.ui);
      return;
    }
    if (code === "$0D") {
      world.teleportLatch = true;
      world.ui = beginTeleportUi(blob.room, world);
      return;
    }
    if (code === "$0F") {
      applyPassage(prep, blob, world, { left: !!input2.left, right: !!input2.right });
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
  function createWorld(prep, room, opts) {
    const core = initCoreState();
    const world = {
      terrain: newBuffers(),
      energy: START_ENERGY,
      platforms: START_PLATFORMS,
      firepower: START_FIREPOWER,
      lives: START_LIVES,
      slots: Array.from({ length: PLATFORM_SLOTS }, () => null),
      slotIndex: 0,
      machineSpent: [],
      pulseIndex: 0,
      buildLatch: false,
      pickupLatch: false,
      dac0: 0,
      dac: { dac0: 0, dac2: 0, dac4: 0, db19: 3, db1a: 3 },
      d2c6: opts?.frames ?? DOOR_D2C6,
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
      cheatGod: false,
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
      d2deNeed: core.d2deNeed,
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
      buzz: []
    };
    if (opts?.shuffleItems) {
      world.dac = { dac0: world.d2c6, dac2: 0, dac4: 0, db19: 3, db1a: 3 };
      shuffleCollectibles(prep, world);
    }
    enterRoom(prep, world, room);
    return world;
  }
  function enterRoom(prep, world, room, opts) {
    composeTiles(prep, world.terrain, room);
    restoreClearedSockets(prep, world, room);
    for (let i = 0; i < PLATFORM_SLOTS; i++) world.slots[i] = null;
    world.slotIndex = 0;
    world.pulseIndex = 0;
    world.buildLatch = false;
    world.pickupLatch = false;
    world.machineSpent = [];
    parkBullet(world);
    placeCollectiblesInRoom(prep, world, room);
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
  function tickOverlay(prep, blob, world) {
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
          blob.room = (blob.room % ROOM_COUNT + ROOM_COUNT) % ROOM_COUNT;
        }
        world.ui = idleUi();
      }
      return;
    }
    if (ui.kind === "cheops") {
      if (tickCheopsUi(ui, world)) {
        syncWorldMessage(world, ui);
        applyCheopsFinish(prep, blob, world, ui);
        world.ui = idleUi();
      } else {
        syncWorldMessage(world, ui);
      }
    }
  }
  function applyCheopsFinish(prep, blob, world, ui) {
    world.teleportLatch = true;
    if (ui.chosen) {
      world.cheops = true;
      world.extra = null;
      clearA350Bit(world.a350, blob.room);
    }
    blob.y = gameYToPlay((playYToGame(blob.y) + 1 & 248) - 1);
    world.d2c4 = DOOR_REASON;
    enterRoom(prep, world, blob.room, { nasties: false, blob });
    syncHoverpad(prep, world, blob.room, blob);
    saveEntry(world, blob);
  }
  function applyTeleport(prep, blob, world, code) {
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
    blob.x &= 248;
    blob.y = gameYToPlay((playYToGame(blob.y) + 1 & 248) - 1);
    enterRoom(prep, world, blob.room, { nasties: false, blob });
    syncHoverpad(prep, world, blob.room, blob);
    saveEntry(world, blob);
    world.message = TELEPORT_MSG_BAD;
    return { ...ev, dest: blob.room, message: world.message, reason: TELEPORT_INVALID_REASON };
  }
  function applySecurityDoor(prep, blob, world, ok, input2) {
    world.teleportLatch = true;
    if (ok) {
      const bit0 = input2.right ? 1 : 0;
      if (bit0) blob.x = blob.x + DOOR_SHIFT_X & 255;
      else blob.x = blob.x - DOOR_SHIFT_X & 255;
      world.message = DOOR_MSG_OK;
    } else {
      world.message = DOOR_MSG_BAD;
    }
    blob.y = gameYToPlay((playYToGame(blob.y) + 1 & 248) - 1);
    world.d2c4 = DOOR_REASON;
    enterRoom(prep, world, blob.room, { nasties: false, blob });
    syncHoverpad(prep, world, blob.room, blob);
    saveEntry(world, blob);
    return {
      ok,
      x: blob.x,
      y: playYToGame(blob.y),
      reason: DOOR_REASON,
      message: world.message
    };
  }
  function applyPassage(prep, blob, world, input2) {
    const next = blob.room + (input2.right ? 1 : -1);
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
  function writeMachinePlatform(world, col, row) {
    const free = world.slots.findIndex((s) => s === null);
    if (free < 0) return false;
    let layer = MACHINE_LAYER_START;
    for (let n = 0; n < MACHINE_LAYER_COUNT; n++) {
      xorPlatformLayer(world, col, row, layer);
      layer -= 1;
    }
    paintPlatformAttr(world, col, row, false);
    world.slots[free] = { col, row, life: MACHINE_LIFE, phase: MACHINE_LAYER_COUNT };
    return true;
  }
  function tryFireMachine(prep, blob, world) {
    if (blob.fallIndex !== MACHINE_FALL) return;
    const gx = blob.x;
    const gy = playYToGame(blob.y);
    for (const m of prep.machinesByRoom?.[blob.room] ?? []) {
      const key = `${m.x},${m.y}`;
      if (world.machineSpent.includes(key)) continue;
      if (Math.abs(gx - m.x) >= ITEM_NEAR) continue;
      if (gy !== m.y) continue;
      world.machineSpent.push(key);
      requestSfx(world, MACHINE_SFX);
      const screenRow = (ITEM_DROP_Y_BASE - gy >> 3) + MACHINE_ROW_ADD & 31;
      const playRow = screenRow - PLAY_ORIGIN;
      let col = (m.x >> 3) - MACHINE_COL_DEC & 31;
      for (let n = 0; n < 2; n++) {
        writeMachinePlatform(world, col, playRow);
        col = col + MACHINE_COL_STRIDE & 31;
      }
      return;
    }
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
    requestA41B(world, CHAN_PLATFORM);
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

  // src/cheat.ts
  function parseCheatSprite(text) {
    const s = text.trim();
    if (!s) return null;
    let n;
    if (/^\$[0-9a-f]+$/i.test(s)) n = parseInt(s.slice(1), 16);
    else if (/^0x[0-9a-f]+$/i.test(s)) n = parseInt(s, 16);
    else if (/^[0-9a-f]+$/i.test(s) && /[a-f]/i.test(s)) n = parseInt(s, 16);
    else if (/^\d+$/.test(s)) n = parseInt(s, 10);
    else return null;
    if (!Number.isFinite(n) || n < 0 || n > 255) return null;
    return n & 255;
  }
  function setInventorySlot(world, slot, sprite, attr = 3) {
    const i = Math.max(0, Math.min(INVENTORY_SLOTS - 1, slot | 0));
    while (world.inventory.length < INVENTORY_SLOTS) world.inventory.push({ sprite: 0, attr: 0 });
    world.inventory[i] = { sprite: sprite & 255, attr: attr & 255 };
  }

  // src/ui/bars.ts
  function clampStat(val) {
    const v = val & 255;
    return v > STAT_CAP ? STAT_CAP : v;
  }
  function barGlyphs(val) {
    const v = clampStat(val);
    if (v === STAT_CAP) return [40, 40, 40, 40];
    const rol3 = (v << 3 | v >> 5) & 255;
    const full = rol3 & 3;
    const partial = (v >> 2 & 7) + 32;
    const out = [];
    for (let i = 0; i < full; i++) out.push(40);
    out.push(partial);
    while (out.length < 4) out.push(32);
    return out.slice(0, 4);
  }

  // src/ui/udg-chrome.ts
  var UDG_CHROME = {
    145: { id: 145, rows: 6, cols: 3, cells: [
      { row: 0, col: 0, attr: 70, data: [0, 23, 59, 107, 61, 77, 114, 124] },
      { row: 0, col: 1, attr: 70, data: [0, 255, 98, 250, 250, 178, 255, 0] },
      { row: 0, col: 2, attr: 66, data: [0, 0, 255, 199, 223, 255, 0, 0] },
      { row: 1, col: 0, attr: 70, data: [94, 126, 122, 94, 90, 66, 126, 66] },
      { row: 2, col: 0, attr: 66, data: [60, 36, 52, 52, 60, 60, 60, 60] },
      { row: 3, col: 0, attr: 66, data: [60, 60, 60, 60, 44, 44, 36, 60] },
      { row: 4, col: 0, attr: 70, data: [66, 126, 66, 90, 94, 126, 122, 94] },
      { row: 5, col: 0, attr: 70, data: [124, 114, 77, 61, 107, 59, 23, 0] },
      { row: 5, col: 1, attr: 70, data: [0, 255, 178, 250, 250, 98, 255, 0] },
      { row: 5, col: 2, attr: 66, data: [0, 0, 255, 199, 223, 255, 0, 0] }
    ] },
    146: { id: 146, rows: 6, cols: 3, cells: [
      { row: 0, col: 0, attr: 66, data: [0, 0, 255, 251, 227, 255, 0, 0] },
      { row: 0, col: 1, attr: 70, data: [0, 255, 70, 95, 95, 75, 255, 0] },
      { row: 0, col: 2, attr: 70, data: [0, 232, 220, 214, 188, 178, 78, 62] },
      { row: 1, col: 2, attr: 70, data: [122, 94, 126, 122, 90, 66, 126, 66] },
      { row: 2, col: 2, attr: 66, data: [60, 36, 52, 52, 60, 60, 60, 60] },
      { row: 3, col: 2, attr: 66, data: [60, 60, 60, 60, 44, 44, 36, 60] },
      { row: 4, col: 2, attr: 70, data: [66, 126, 66, 90, 122, 126, 94, 122] },
      { row: 5, col: 0, attr: 66, data: [0, 0, 255, 251, 227, 255, 0, 0] },
      { row: 5, col: 1, attr: 70, data: [0, 255, 77, 95, 95, 70, 255, 0] },
      { row: 5, col: 2, attr: 70, data: [62, 78, 178, 188, 214, 220, 232, 0] }
    ] },
    147: { id: 147, rows: 1, cols: 6, cells: [
      { row: 0, col: 0, attr: 66, data: [0, 0, 255, 255, 255, 255, 0, 0] },
      { row: 0, col: 1, attr: 66, data: [0, 0, 255, 255, 255, 255, 0, 0] },
      { row: 0, col: 2, attr: 66, data: [0, 0, 254, 246, 198, 254, 0, 0] },
      { row: 0, col: 3, attr: 66, data: [0, 0, 255, 199, 223, 255, 0, 0] },
      { row: 0, col: 4, attr: 66, data: [0, 0, 255, 255, 255, 255, 0, 0] },
      { row: 0, col: 5, attr: 66, data: [0, 0, 255, 255, 255, 255, 0, 0] }
    ] },
    148: { id: 148, rows: 5, cols: 8, cells: [
      { row: 1, col: 0, attr: 5, data: [0, 127, 127, 127, 112, 119, 119, 118] },
      { row: 1, col: 1, attr: 5, data: [255, 255, 255, 255, 0, 255, 255, 0] },
      { row: 1, col: 2, attr: 5, data: [255, 255, 255, 255, 0, 255, 255, 0] },
      { row: 1, col: 3, attr: 5, data: [255, 255, 255, 255, 0, 255, 255, 0] },
      { row: 1, col: 4, attr: 5, data: [255, 255, 255, 255, 0, 255, 255, 0] },
      { row: 1, col: 5, attr: 5, data: [255, 255, 255, 255, 0, 255, 255, 0] },
      { row: 1, col: 6, attr: 5, data: [255, 255, 255, 255, 0, 255, 255, 0] },
      { row: 1, col: 7, attr: 5, data: [255, 255, 255, 255, 15, 207, 207, 79] },
      { row: 2, col: 0, attr: 5, data: [246, 246, 246, 246, 246, 246, 246, 246] },
      { row: 2, col: 7, attr: 5, data: [79, 79, 79, 79, 79, 79, 79, 79] },
      { row: 3, col: 0, attr: 5, data: [246, 247, 240, 240, 255, 255, 255, 255] },
      { row: 3, col: 1, attr: 5, data: [0, 255, 0, 0, 255, 255, 239, 239] },
      { row: 3, col: 2, attr: 5, data: [0, 255, 0, 0, 255, 255, 255, 255] },
      { row: 3, col: 3, attr: 5, data: [0, 255, 0, 0, 255, 255, 255, 255] },
      { row: 3, col: 4, attr: 5, data: [0, 255, 0, 0, 255, 255, 255, 255] },
      { row: 3, col: 5, attr: 5, data: [0, 255, 0, 0, 255, 255, 255, 255] },
      { row: 3, col: 6, attr: 5, data: [0, 255, 0, 0, 255, 255, 247, 247] },
      { row: 3, col: 7, attr: 5, data: [79, 207, 15, 15, 255, 255, 255, 255] },
      { row: 4, col: 0, attr: 5, data: [127, 127, 127, 127, 127, 127, 127, 0] },
      { row: 4, col: 1, attr: 5, data: [239, 239, 225, 255, 255, 255, 255, 255] },
      { row: 4, col: 2, attr: 13, data: [195, 195, 195, 195, 195, 255, 255, 255] },
      { row: 4, col: 3, attr: 13, data: [255, 15, 12, 12, 12, 255, 255, 255] },
      { row: 4, col: 4, attr: 13, data: [255, 255, 63, 48, 48, 255, 255, 255] },
      { row: 4, col: 5, attr: 13, data: [255, 255, 255, 255, 195, 255, 255, 255] },
      { row: 4, col: 6, attr: 5, data: [247, 247, 7, 255, 255, 255, 255, 255] },
      { row: 4, col: 7, attr: 5, data: [255, 255, 255, 255, 255, 255, 255, 255] }
    ] },
    149: { id: 149, rows: 5, cols: 8, cells: [
      { row: 1, col: 0, attr: 5, data: [238, 238, 238, 238, 238, 238, 238, 238] },
      { row: 1, col: 1, attr: 71, data: [0, 0, 7, 27, 13, 60, 88, 96] },
      { row: 1, col: 2, attr: 71, data: [208, 216, 64, 104, 172, 220, 126, 254] },
      { row: 1, col: 3, attr: 5, data: [78, 78, 78, 78, 78, 78, 78, 78] },
      { row: 1, col: 4, attr: 67, data: [0, 127, 119, 99, 119, 127, 127, 0] },
      { row: 1, col: 5, attr: 67, data: [0, 252, 4, 118, 6, 4, 252, 0] },
      { row: 2, col: 0, attr: 5, data: [238, 238, 238, 238, 238, 238, 238, 238] },
      { row: 2, col: 1, attr: 71, data: [113, 123, 63, 63, 223, 231, 120, 60] },
      { row: 2, col: 2, attr: 71, data: [254, 254, 156, 96, 190, 14, 252, 248] },
      { row: 2, col: 3, attr: 5, data: [78, 78, 78, 78, 78, 78, 78, 78] },
      { row: 2, col: 4, attr: 7, data: [0, 120, 123, 3, 12, 5, 26, 0] },
      { row: 2, col: 5, attr: 7, data: [0, 30, 222, 192, 48, 160, 88, 0] },
      { row: 3, col: 0, attr: 5, data: [238, 238, 238, 238, 238, 238, 238, 238] },
      { row: 3, col: 3, attr: 5, data: [78, 78, 78, 78, 78, 78, 78, 78] },
      { row: 3, col: 4, attr: 71, data: [0, 4, 14, 155, 113, 32, 0, 0] },
      { row: 3, col: 5, attr: 71, data: [0, 24, 60, 126, 206, 134, 0, 0] },
      { row: 4, col: 0, attr: 5, data: [238, 239, 224, 224, 255, 255, 255, 255] },
      { row: 4, col: 1, attr: 5, data: [0, 255, 0, 0, 255, 255, 255, 255] },
      { row: 4, col: 2, attr: 5, data: [0, 255, 0, 0, 255, 255, 255, 255] },
      { row: 4, col: 3, attr: 5, data: [78, 207, 0, 0, 255, 255, 255, 255] },
      { row: 4, col: 4, attr: 5, data: [0, 255, 0, 0, 255, 255, 255, 255] },
      { row: 4, col: 5, attr: 5, data: [0, 255, 0, 0, 255, 255, 255, 255] },
      { row: 4, col: 6, attr: 5, data: [0, 255, 0, 0, 255, 255, 255, 255] },
      { row: 4, col: 7, attr: 5, data: [0, 255, 0, 0, 255, 255, 255, 255] }
    ] },
    150: { id: 150, rows: 5, cols: 8, cells: [
      { row: 1, col: 2, attr: 5, data: [78, 78, 78, 78, 78, 78, 78, 78] },
      { row: 2, col: 2, attr: 5, data: [78, 78, 78, 78, 78, 78, 78, 78] },
      { row: 3, col: 2, attr: 5, data: [78, 79, 64, 64, 79, 79, 79, 79] },
      { row: 3, col: 3, attr: 5, data: [0, 255, 0, 0, 255, 255, 255, 255] },
      { row: 3, col: 4, attr: 5, data: [0, 255, 0, 0, 255, 224, 231, 255] },
      { row: 3, col: 5, attr: 5, data: [0, 255, 0, 0, 255, 7, 231, 231] },
      { row: 3, col: 6, attr: 5, data: [0, 255, 0, 0, 255, 255, 255, 255] },
      { row: 3, col: 7, attr: 5, data: [0, 255, 0, 0, 255, 255, 255, 255] },
      { row: 4, col: 0, attr: 5, data: [0, 255, 0, 0, 255, 255, 255, 255] },
      { row: 4, col: 1, attr: 5, data: [0, 255, 0, 0, 255, 255, 255, 255] },
      { row: 4, col: 2, attr: 5, data: [79, 207, 15, 15, 255, 255, 255, 255] },
      { row: 4, col: 3, attr: 5, data: [255, 255, 255, 255, 255, 255, 255, 255] },
      { row: 4, col: 4, attr: 5, data: [239, 199, 131, 1, 1, 1, 255, 255] },
      { row: 4, col: 5, attr: 5, data: [231, 231, 227, 227, 255, 255, 255, 255] },
      { row: 4, col: 6, attr: 5, data: [255, 255, 102, 102, 255, 255, 255, 255] },
      { row: 4, col: 7, attr: 5, data: [255, 255, 48, 48, 255, 255, 255, 255] }
    ] },
    151: { id: 151, rows: 5, cols: 4, cells: [
      { row: 1, col: 3, attr: 5, data: [0, 78, 78, 78, 78, 78, 78, 78] },
      { row: 2, col: 3, attr: 5, data: [79, 79, 79, 79, 79, 79, 79, 79] },
      { row: 3, col: 0, attr: 5, data: [0, 255, 0, 0, 255, 192, 207, 207] },
      { row: 3, col: 1, attr: 5, data: [0, 255, 0, 0, 255, 15, 207, 255] },
      { row: 3, col: 2, attr: 5, data: [0, 255, 0, 0, 255, 255, 255, 255] },
      { row: 3, col: 3, attr: 5, data: [79, 207, 15, 15, 255, 255, 255, 255] },
      { row: 4, col: 0, attr: 5, data: [207, 207, 143, 143, 255, 255, 255, 255] },
      { row: 4, col: 1, attr: 5, data: [1, 1, 1, 131, 199, 239, 255, 255] },
      { row: 4, col: 2, attr: 5, data: [255, 255, 255, 255, 255, 255, 255, 255] },
      { row: 4, col: 3, attr: 5, data: [254, 254, 254, 254, 254, 254, 254, 0] }
    ] }
  };

  // src/ui/chrome.ts
  function blitChromeUdg(buf, id, row, col) {
    const udg = UDG_CHROME[id];
    if (!udg) return;
    for (const cell of udg.cells) {
      const cy = row + cell.row;
      const cx = col + cell.col;
      if (cy < 0 || cy >= 24 || cx < 0 || cx >= SCREEN_COLS) continue;
      const idx = cellIndex(cy, cx);
      buf.attr[idx] = cell.attr & 255;
      const dst = idx * CELL;
      for (let py = 0; py < CELL; py++) buf.data[dst + py] = cell.data[py];
    }
  }
  function drawChrome(buf) {
    blitChromeUdg(buf, 145, 0, 1);
    let c = 1 + 3;
    for (let e = 5; e > 0; e--) {
      blitChromeUdg(buf, 147, 0, c);
      blitChromeUdg(buf, 147, 5, c);
      c += 4;
      if (e === 4 || e === 3) c += 1;
    }
    c += 2;
    blitChromeUdg(buf, 146, 0, c);
    blitChromeUdg(buf, 148, 0, 2);
    blitChromeUdg(buf, 149, 0, 10);
    blitChromeUdg(buf, 150, 0, 18);
    blitChromeUdg(buf, 151, 0, 26);
  }
  function printBytes2(buf, bytes, st) {
    printMessage(buf, st ?? newPrintState(), bytes);
  }
  function drawScore(buf, digits, st) {
    const text = digits.slice(0, SCORE_DIGITS).map((d) => String((d | 0) % 10)).join("").padStart(SCORE_DIGITS, "0");
    printBytes2(buf, [22, 2, 3, 19, 1, 16, 7, ...[...text].map((ch) => ch.charCodeAt(0)), 255], st);
  }
  function drawLives(buf, lives, st) {
    const text = String(lives & 255).padStart(2, "0").slice(-2);
    printBytes2(buf, [22, 3, 11, 16, 6, ...[...text].map((ch) => ch.charCodeAt(0)), 255], st);
  }
  function drawBars(buf, energy, platforms, firepower, st) {
    const ps = st ?? newPrintState();
    printBytes2(
      buf,
      [
        22,
        1,
        16,
        16,
        2,
        32,
        16,
        4,
        32,
        32,
        32,
        22,
        2,
        16,
        16,
        7,
        32,
        32,
        32,
        32,
        22,
        3,
        16,
        16,
        6,
        32,
        32,
        32,
        32,
        16,
        8,
        255
      ],
      ps
    );
    const values = [clampStat(energy), clampStat(platforms), clampStat(firepower)];
    const rows = [1, 2, 3];
    const ordered = [values[0], values[1], values[2]];
    for (let i = 0; i < 3; i++) {
      const glyphs = barGlyphs(ordered[i]);
      const row = rows[i];
      const msg = [22, row, 16];
      for (const g of glyphs) msg.push(g);
      msg.push(255);
      printBytes2(buf, msg, ps);
    }
  }
  function drawInventory(buf, prep, world, st) {
    printBytes2(
      buf,
      [
        22,
        1,
        21,
        32,
        32,
        32,
        32,
        32,
        32,
        32,
        32,
        22,
        2,
        21,
        32,
        32,
        32,
        32,
        32,
        32,
        32,
        32,
        255
      ],
      st
    );
    if (!prep) return;
    const cols = [21, 23, 25, 27];
    for (let i = 0; i < world.inventory.length && i < 4; i++) {
      const it = world.inventory[i];
      if ((it.sprite & 255) === 0 && (it.attr & 255) === 0) continue;
      const sprite = prep.sprites[it.sprite];
      if (!sprite) continue;
      const attr = (it.attr & 7 | 64) & 255;
      const col0 = cols[i];
      const row0 = 1;
      for (const cell of sprite.cells) {
        const cy = row0 + cell.row;
        const cx = col0 + cell.col;
        if (cy < 0 || cy >= 24 || cx < 0 || cx >= SCREEN_COLS) continue;
        const idx = cellIndex(cy, cx);
        const dst = idx * CELL;
        for (let py = 0; py < CELL; py++) buf.data[dst + py] ^= cell.data[py];
        buf.attr[idx] = attr;
      }
    }
  }
  function drawStatus(buf, world, prep = null) {
    const st = newPrintState();
    drawScore(buf, world.scoreDigits, st);
    drawLives(buf, world.lives, st);
    drawBars(buf, world.energy, world.platforms, world.firepower, st);
    drawInventory(buf, prep, world, st);
  }
  function clampWorldStats(world) {
    world.energy = clampStat(world.energy);
    world.platforms = clampStat(world.platforms);
    world.firepower = clampStat(world.firepower);
  }

  // src/ui/compose.ts
  function paperInk2(attr) {
    const table = attr & 64 ? BRIGHT : SPECTRUM;
    return [table[attr >> 3 & 7], table[attr & 7]];
  }
  function rasterizeScreen(buf, rgba) {
    let p = 0;
    for (let cy = 0; cy < SCREEN_ROWS; cy++) {
      for (let py = 0; py < CELL; py++) {
        for (let cx = 0; cx < SCREEN_COLS; cx++) {
          const idx = cy * SCREEN_COLS + cx;
          const [paper, ink] = paperInk2(buf.attr[idx]);
          const bits = buf.data[idx * CELL + py];
          for (let px = 0; px < CELL; px++) {
            const on = bits & 128 >> px;
            rgba[p] = on ? ink[0] : paper[0];
            rgba[p + 1] = on ? ink[1] : paper[1];
            rgba[p + 2] = on ? ink[2] : paper[2];
            rgba[p + 3] = 255;
            p += 4;
          }
        }
      }
    }
    return rgba;
  }
  function blitPlayfieldRgba(screen, play, playY0, playH, width) {
    const rowBytes = width * 4;
    for (let y = 0; y < playH; y++) {
      const src = y * rowBytes;
      const dst = (y + playY0) * rowBytes;
      screen.set(play.subarray(src, src + rowBytes), dst);
    }
  }

  // src/main.ts
  var DATA_BASE = "out";
  var keys = { left: false, right: false, up: false, down: false, fire: false };
  function input() {
    return { left: keys.left, right: keys.right, up: keys.up, down: keys.down, fire: keys.fire };
  }
  function $(id) {
    const el = document.getElementById(id);
    if (!el) throw new Error("#" + id);
    return el;
  }
  function fmtStat(n) {
    return `${n} ($${n.toString(16).padStart(2, "0")})`;
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
  function applyDevToggle() {
    const q = new URLSearchParams(location.search);
    const off = q.get("dev") === "0";
    document.body.classList.toggle("dev-off", off);
    document.body.classList.toggle("dev-on", !off);
  }
  async function boot() {
    applyDevToggle();
    const canvas = $("screen");
    const rawCtx = canvas.getContext("2d", { alpha: false });
    if (!rawCtx) throw new Error("canvas");
    const ctx2 = rawCtx;
    canvas.width = SCREEN_W;
    canvas.height = SCREEN_H;
    ctx2.imageSmoothingEnabled = false;
    canvas.style.width = DISPLAY_W + "px";
    canvas.style.height = DISPLAY_H + "px";
    const imageData = ctx2.createImageData(SCREEN_W, SCREEN_H);
    const screenRgba = imageData.data;
    const playRgba = new Uint8ClampedArray(WIDTH * HEIGHT * 4);
    const playBuf = newBuffers();
    const screenBuf = newScreenBuffers();
    const hudScratch = newScreenBuffers();
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
    const hashed = parseHash();
    const start = hashed ?? NEW_GAME_ROOM;
    let world = createWorld(prep, start);
    wireAudioUi();
    let blob = spawnBlob(prep, start, world);
    if (hashed === null) world.ui = beginMenuUi();
    else if (blob.room === start) enterRoom(prep, world, start, { blob });
    syncMusic(world);
    let overlay = false;
    let lastMs = 0;
    let avgMs = 0;
    let frames = 0;
    let acc = 0;
    let last = performance.now();
    let chromeRoom = -1;
    function rebuildChrome() {
      clearScreen(hudScratch, 0);
      drawChrome(hudScratch);
      chromeRoom = blob.room;
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
      $("stat-energy").textContent = fmtStat(world.energy);
      $("stat-platforms").textContent = fmtStat(world.platforms);
      $("stat-firepower").textContent = fmtStat(world.firepower);
      $("stat-lives").textContent = fmtStat(world.lives);
      $("stat-score").textContent = formatScore(world.scoreDigits);
      $("stat-cores").textContent = `${9 - world.coresLeft}/9 (pairs ${world.corePairs})`;
      $("stat-inv").textContent = world.inventory.length ? world.inventory.map((it) => "$" + it.sprite.toString(16)).join(" ") : "\u2014";
      $("stat-extra").textContent = world.extra ? "$" + world.extra.sprite.toString(16) + " @ " + world.extra.col + "," + world.extra.row : "\u2014";
      const on = world.pulses.filter((p) => p.flag !== 0);
      $("stat-pulse").textContent = on.length ? on.map((p) => p.col + "," + p.row).join(" ") : world.pulses.length ? "off" : "\u2014";
      $("stat-dd22").textContent = String(world.dd22);
      $("stat-pad").textContent = world.pad ? `${world.pad.x}, ${world.pad.y}` : "\u2014";
      $("stat-teleport").textContent = teleportNameForRoom(blob.room) || "\u2014";
      const passage = prep.passagesByRoom?.[blob.room]?.[0];
      $("stat-passage").textContent = passage ? `${passage.x},${passage.y}  L\u2192${blob.room - 1}  R\u2192${blob.room + 1}` : "\u2014";
      const doorEl = $("stat-door");
      const doors = prep.doorsByRoom?.[blob.room] ?? [];
      if (doors.length) {
        const need = expectedDoorCode(blob.room);
        const keyTxt = need.map((n) => "$" + n.toString(16).toUpperCase()).join(" ");
        const hasUni = world.inventory.some((it) => it.sprite === 15);
        doorEl.textContent = hasUni ? `${keyTxt} (m\xE1\u0161 $0F)` : keyTxt;
      } else {
        doorEl.textContent = "\u2014";
      }
      const cheopsEl = $("stat-cheops");
      if (cheopsEl) {
        if (world.ui.kind === "cheops") {
          const ui = world.ui;
          const code = ui.digits.map((n) => "$" + n.toString(16).toUpperCase()).join(" ");
          const offers = ui.offers.map((n, i) => `${i + 1}:$${n.toString(16)}`).join(" ");
          cheopsEl.textContent = ui.phase === "exchange" ? offers : `${ui.phase} ${code}`;
        } else if (world.extra?.sprite === 25) {
          const code = expectedCheopsCode(blob.room).map((n) => "$" + n.toString(16).toUpperCase()).join(" ");
          cheopsEl.textContent = `extra $19  k\xF3d ${code}`;
        } else {
          cheopsEl.textContent = world.cheops ? "v\xFDm\u011Bna hotov\xE1" : "\u2014";
        }
      }
      $("stat-message").textContent = world.ui.kind === "end" ? world.ui.phase === "cores" ? "THE CORES COMPLETE" : "GAME OVER" : world.message || "\u2014";
      gotoEl.value = String(blob.room);
      $("time").textContent = lastMs.toFixed(2) + " ms";
      $("avg").textContent = avgMs.toFixed(2) + " ms";
      $("fps").textContent = avgMs > 0 ? (1e3 / avgMs).toFixed(0) : "\u2014";
      $("scale").textContent = "\xD72";
    }
    function draw() {
      const t0 = performance.now();
      clampWorldStats(world);
      if (chromeRoom !== blob.room) rebuildChrome();
      screenBuf.data.set(hudScratch.data);
      screenBuf.attr.set(hudScratch.attr);
      drawStatus(screenBuf, world, prep);
      if (isUiBlocking(world.ui)) {
        drawUiOverlay(screenBuf, world.ui, prep, world.dac.dac0);
        rasterizeScreen(screenBuf, screenRgba);
      } else {
        const anim = animationSet(blob, world);
        renderWorld(prep, world, playBuf, playRgba, blob.room, {
          items: true,
          overlay,
          blob: world.blobHidden ? null : { x: blob.x, y: blob.y, set: anim.set, frame: anim.frame, ink: world.blobInk }
        });
        pastePlayfield(screenBuf, playBuf);
        rasterizeScreen(screenBuf, screenRgba);
        blitPlayfieldRgba(screenRgba, playRgba, PLAY_Y02, HEIGHT, WIDTH);
      }
      ctx2.putImageData(imageData, 0, 0);
      const dt = performance.now() - t0;
      lastMs = dt;
      frames += 1;
      avgMs += (dt - avgMs) / Math.min(frames, 50);
      updatePanel();
    }
    function startPlay(id, writeHash, newGame = false) {
      const room = clampRoom(id);
      if (newGame) {
        const god = world.cheatGod;
        world = createWorld(prep, room, {
          shuffleItems: true,
          frames: (Date.now() ^ (performance.now() | 0)) & 65535
        });
        world.cheatGod = god;
        blob = spawnBlob(prep, room, world);
        chromeRoom = -1;
      } else {
        world.ui = idleUi();
        blob = spawnBlob(prep, room, world);
        enterRoom(prep, world, room, { blob });
        chromeRoom = -1;
      }
      syncMusic(world);
      if (!writeHash) return;
      const hash = "#" + blob.room;
      if (location.hash !== hash) history.replaceState(null, "", hash);
    }
    function goRoom(id) {
      startPlay(id, true);
    }
    document.addEventListener("keydown", (ev) => {
      unlock();
      if (ev.target instanceof HTMLInputElement || ev.target instanceof HTMLSelectElement) return;
      if (world.ui.kind === "menu") {
        const act = feedMenuKey(world.ui, ev.key, world, ev.code);
        if (act === "start") startPlay(NEW_GAME_ROOM, false, true);
        ev.preventDefault();
        return;
      }
      if (world.ui.kind === "end") {
        feedEndKey(world.ui, ev.key);
        ev.preventDefault();
        return;
      }
      if (world.ui.kind === "teleport") {
        feedTeleportKey(world.ui, ev.key, true, world);
        if (ev.key.length === 1 || ev.key === " ") ev.preventDefault();
        return;
      }
      if (world.ui.kind === "cheops") {
        feedCheopsKey(world.ui, ev.key, world, ev.code);
        ev.preventDefault();
        return;
      }
      if (isUiBlocking(world.ui)) {
        ev.preventDefault();
        return;
      }
      if (ev.key === "o" || ev.key === "O") {
        keys.left = true;
        ev.preventDefault();
      } else if (ev.key === "p" || ev.key === "P") {
        keys.right = true;
        ev.preventDefault();
      } else if (ev.key === "q" || ev.key === "Q") {
        keys.up = true;
        ev.preventDefault();
      } else if (ev.key === "a" || ev.key === "A") {
        keys.down = true;
        ev.preventDefault();
      } else if (ev.key === " ") {
        keys.fire = true;
        ev.preventDefault();
      } else if (ev.key === "PageUp") {
        goRoom(moveRoom(blob.room, 0, -1));
      } else if (ev.key === "PageDown") {
        goRoom(moveRoom(blob.room, 0, 1));
      }
    });
    document.addEventListener("keyup", (ev) => {
      if (world.ui.kind === "teleport") {
        feedTeleportKey(world.ui, ev.key, false, world);
      }
      if (ev.key === "o" || ev.key === "O") keys.left = false;
      else if (ev.key === "p" || ev.key === "P") keys.right = false;
      else if (ev.key === "q" || ev.key === "Q") keys.up = false;
      else if (ev.key === "a" || ev.key === "A") keys.down = false;
      else if (ev.key === " ") keys.fire = false;
    });
    document.addEventListener("pointerdown", () => unlock());
    document.addEventListener("click", () => unlock());
    $("go").addEventListener("click", () => goRoom(parseInt(gotoEl.value, 10) || 0));
    gotoEl.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") goRoom(parseInt(gotoEl.value, 10) || 0);
    });
    overlayEl.addEventListener("change", () => {
      overlay = overlayEl.checked;
    });
    const cheatGodEl = $("cheat-god");
    const cheatSlotEl = $("cheat-slot");
    const cheatSpriteEl = $("cheat-sprite");
    function insertCheatSprite(raw) {
      const sprite = parseCheatSprite(raw);
      if (sprite === null) {
        $("status").textContent = "Cheat: sprite $00\u2013$FF (nap\u0159. $0F)";
        return;
      }
      const slot = parseInt(cheatSlotEl.value, 10) || 0;
      setInventorySlot(world, slot, sprite);
      cheatSpriteEl.value = "$" + sprite.toString(16).toUpperCase().padStart(2, "0");
    }
    cheatGodEl.addEventListener("change", () => {
      world.cheatGod = cheatGodEl.checked;
    });
    $("cheat-insert").addEventListener("click", () => insertCheatSprite(cheatSpriteEl.value));
    cheatSpriteEl.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") {
        ev.preventDefault();
        insertCheatSprite(cheatSpriteEl.value);
      }
    });
    document.querySelectorAll(".cheat-presets [data-sprite]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const raw = btn.getAttribute("data-sprite") || "";
        cheatSpriteEl.value = raw;
        insertCheatSprite(raw);
      });
    });
    window.addEventListener("hashchange", () => {
      const id = parseHash();
      if (id !== null && id !== blob.room) goRoom(id);
    });
    $("status").textContent = "50 Hz \xB7 HUD+playfield 256\xD7192 \xB7 Q/A/O/P + mezern\xEDk \xB7 teleport 5 znak\u016F \xB7 dve\u0159e invent\xE1\u0159 \xB7 ?dev=0";
    void stage;
    function frame(now) {
      acc += now - last;
      last = now;
      if (acc > 100) acc = 100;
      while (acc >= TICK_MS) {
        const prev = blob.room;
        tick(prep, blob, input(), world);
        syncMusic(world);
        drainSfx(world);
        if (blob.room !== prev) {
          chromeRoom = -1;
          const hash = "#" + blob.room;
          if (location.hash !== hash) history.replaceState(null, "", hash);
        }
        acc -= TICK_MS;
      }
      draw();
      requestAnimationFrame(frame);
    }
    rebuildChrome();
    requestAnimationFrame(frame);
  }
  void boot().catch((err) => {
    const el = document.getElementById("status");
    if (el) {
      el.textContent = "Nelze na\u010D\xEDst data. npm start z ko\u0159ene repozit\xE1\u0159e, /viewer/ (" + err.message + ")";
      el.className = "status error";
    }
  });
})();
