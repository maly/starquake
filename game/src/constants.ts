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
