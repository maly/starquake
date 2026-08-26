/** Play-area and map geometry (same as the tile export). */
export const COLS = 32;
export const ROWS = 18;
export const CELL = 8;
export const WIDTH = COLS * CELL;
export const HEIGHT = ROWS * CELL;
export const PLAY_ORIGIN = 6;
export const MAP_COLS = 16;
export const MAP_ROWS = 32;
export const ROOM_COUNT = MAP_COLS * MAP_ROWS;
export const ROOM_SKIP = 199;
export const CLEAR_ATTR = 0x47;

/**
 * Horizontal walk speed in pixels per 50 Hz tick.
 * $C645 ADD A,$02 / $C68D SUB $02 on $DD1D.
 */
export const WALK_PX = 2;

/**
 * Fall speed per tick, indexed by airborne timer $DD29 (1..16).
 * Table at $C751, applied by $C747 SUB (HL) on $DD1E (Y from the screen bottom).
 */
export const FALL_TABLE = [1, 0, 1, 0, 1, 2, 1, 2, 1, 2, 2, 3, 2, 3, 3, 4] as const;

/** $C64C CP $03 — walk-frame counter $DD28 advances the animation every 3 ticks. */
export const ANIM_PERIOD = 3;

/**
 * Walk cycle from $C67C / $C6C3: HL = base, then HL += $DD25 * $C0 ($C6CA).
 * $C0 is one 4-frame GRAFIX set, so the pose is frame 0 of each successive set:
 * blobwr1 → blobsr1 → blobwr2 → blobsr2 (and the left-facing mirror).
 */
export const GRAFIX_SET_STRIDE = 0xc0;
export const WALK_RIGHT_SETS = ["blobwr1", "blobsr1", "blobwr2", "blobsr2"] as const;
export const WALK_LEFT_SETS = ["blobwl1", "blobsl1", "blobwl2", "blobsl2"] as const;

/** GRAFIX / BLOB footprint used by $DF70 (3×2 cells). */
export const BLOB_COLS = 3;
export const BLOB_ROWS = 2;
export const BLOB_W = BLOB_COLS * CELL;
export const BLOB_H = BLOB_ROWS * CELL;

/**
 * Screen Y is stored bottom-up in $DD1E. Play-area top (pixel 48) is 191-48=143.
 * playY = GAME_Y_ORIGIN - gameY.
 */
export const GAME_Y_ORIGIN = 143;

/**
 * Room-exit thresholds from $C8F4.
 * Right: X-$F0 < 4 → X=0, room+1. Left: X+2 < 4 → X=$F0, room-1.
 * Down:  Y < $0E → Y=$8F, room+16. Up: Y >= $90 → Y=$0F, room-16.
 */
export const EXIT_RIGHT = 0xf0;
export const ENTER_LEFT_X = 0;
export const EXIT_LEFT = 2;
export const ENTER_RIGHT_X = 0xf0;
export const EXIT_DOWN_Y = 0x0e;
export const ENTER_TOP_Y = 0x8f;
export const EXIT_UP_Y = 0x90;
export const ENTER_BOTTOM_Y = 0x0f;

/**
 * TEMPORARY jump. Walking Blob in $C5BD has no hop: $C79F CP $04 is platform
 * building (out of scope), jetpack is +2 px/tick at $C76D. A 12-tick hop at
 * the jetpack quantum lets the character reach platforms until a jump impulse
 * is found in the disassembly.
 */
export const TEMP_JUMP_TICKS = 12;
export const TEMP_JUMP_PX = 2;

/**
 * Blob status bytes starting at $D2CD: energy, bridge power, firepower.
 * $D425 prints them; $D4E9 (via $D41F) decrements index A by C.
 */
export const START_ENERGY = 0x17;
export const START_PLATFORMS = 0x30;
export const START_FIREPOWER = 0x7e;

/**
 * GRAFIX entity table at $DD18, 6 × 32 bytes. Slot 0 is Blob; $A01B walks
 * slots 1..$9C43 (usually 4) via `RRCA×3` offsets. $DF70 XOR-draws all 6.
 */
export const ENTITY_SLOT_BYTES = 32;
export const ENTITY_SLOTS = 6;
export const NASTY_SLOTS = 4;
export const NASTY_INNER_STEPS = 4;
export const ENTITY_TABLE = 0xdd18;
/** $9E86 parks a new slot at Y=$0F, X=0, graphic $DF40. $D8B1 CP $10 skips the draw. */
export const ENTITY_PARK_Y = 0x0f;
export const ENTITY_DUMMY_PTR = 0xdf40;
export const ENTITY_DRAW_MIN = 0x10;

/** $B208 + n×$C0 — GRAFIX sets used by $9DF9. High byte < $B4 is lethal ($A327). */
export const GRAFIX_BASE = 0xb208;
export const GRAFIX_STRIDE = 0xc0;
export const KILL_GRAPHIC_HI = 0xb4;
export const APPEAR_GRAPHIC = 0xb148;
export const DEAD_GRAPHIC = 0xbec8;
export const APPEAR_FRAMES = 0x10;
export const DIE_FRAMES = 0x08;

/** $A305 AABB on $DD1D/$DD1E: |dx| < $0E, |dy| < $0B. */
export const HIT_DX = 0x0e;
export const HIT_DY = 0x0b;

/** $CB58: $DD30 += 1 per tick, wrap at $78 → $D41F A=0 C=$04 (energy −4). */
export const ENERGY_DRAIN_WRAP = 0x78;
export const ENERGY_DRAIN_STEP = 4;
export const START_ENERGY_DRAIN = 0x51;
export const ANNOY_DRAIN_BUMP = 0x0a;

/** $9C40 set to $B4 on spawn; $A4B1 / $9C47 swap 21 bytes × 4 into $959C. */
export const SPAWN_GUARD = 0xb4;
export const NASTY_CACHE = 0x959c;

/** $9E90 / $A2A5 default pixel step. */
export const NASTY_SPEED = 2;

/** $A0E4 / $A0F2 / $A14F / $A15D edge bounce. */
export const NASTY_EDGE_L = 3;
export const NASTY_EDGE_R = 0xee;
export const NASTY_EDGE_D = 0x12;
export const NASTY_EDGE_U = 0x8d;

export const ROOM_DATA_BASE = 0x7530;
export const ROOM_DATA_STRIDE = 12;

export const ENEMY_SETS = [
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
  "aliene",
] as const;

/** $A2B9 direction table (bytes of the following instructions, indexed ×2). */
export const DIR_TABLE = [0x08, 0x09, 0x01, 0x04, 0x05, 0x06, 0x02, 0x0a] as const;

/** $C848 LD A,$01 / $C84A LD C,$02 — $D41F decreases $D2CE by 2. */
export const PLATFORM_STAT_INDEX = 1;
export const PLATFORM_COST = 2;

/** $C807 LD B,$0C — 4-byte slots at $DBBB, cleared by $A4B1 on room draw. */
export const PLATFORM_SLOTS = 12;

/** $C79F LD A,($DD23) / CP $04 — build only when down is held alone. */
export const PLATFORM_INPUT = 0x04;

/**
 * $C827 LD A,$D6 / SUB Y, then AND $F8 / >>3 gives the full-screen attr row
 * of the 2-cell platform. Play-area row subtracts PLAY_ORIGIN (6).
 */
export const PLATFORM_ROW_BASE = 0xd6;

/** $C819 ADD A,$04 / AND $F8 / >>3 — column from Blob X. Two cells, $DB88 INC C. */
export const PLATFORM_X_BIAS = 4;

/**
 * $C833 LD A,($DAC0) / AND $03 / ADD A,$05 — initial byte3 lifetime.
 * $DBEC visits one of 12 slots per 50 Hz tick and DEC that counter.
 */
export const PLATFORM_LIFE_BASE = 5;

/**
 * Four 2-cell XOR layers at $DC55 + L*$10, drawn by $DB88 at build
 * (A=0, L=0..3) and peeled off by $DBEC as the high bits of byte0 step by $20.
 */
export const PLATFORM_LAYERS: ReadonlyArray<ReadonlyArray<ReadonlyArray<number>>> = [
  [
    [0x60, 0xc0, 0x07, 0x1c, 0x0a, 0x02, 0x03, 0x00],
    [0x0c, 0x06, 0x00, 0x00, 0x00, 0x04, 0x58, 0x00],
  ],
  [
    [0xd8, 0xd5, 0x43, 0x0c, 0x00, 0x00, 0x18, 0x00],
    [0x0a, 0xb5, 0xe8, 0x38, 0x50, 0x44, 0xf0, 0x10],
  ],
  [
    [0xc8, 0xf2, 0x41, 0x08, 0x09, 0x05, 0x00, 0x08],
    [0x0b, 0x1c, 0x00, 0x20, 0xa0, 0x20, 0x50, 0x20],
  ],
  [
    [0x80, 0x10, 0x02, 0x00, 0x08, 0x01, 0x00, 0x04],
    [0x02, 0x40, 0x08, 0x00, 0x20, 0x00, 0x20, 0x00],
  ],
];

/** $DD21 / $DDA1 default ink for GRAFIX merge ($D8B1). */
export const BLOB_INK = 7;

export const TICK_MS = 20;

export const SPECTRUM: ReadonlyArray<readonly [number, number, number]> = [
  [0, 0, 0],
  [0, 0, 197],
  [197, 0, 0],
  [197, 0, 197],
  [0, 198, 0],
  [0, 198, 197],
  [197, 198, 0],
  [205, 198, 205],
];

export const BRIGHT: ReadonlyArray<readonly [number, number, number]> = [
  [0, 0, 0],
  [0, 0, 255],
  [255, 0, 0],
  [255, 0, 255],
  [0, 255, 0],
  [0, 255, 255],
  [255, 255, 0],
  [255, 255, 255],
];
