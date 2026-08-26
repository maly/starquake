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
 * Leftover hop quantum (unbound). $C5BD has no walk jump: Up is pickup
 * ($D09F / $DD23==$08), Down builds a platform ($C79F), jetpack is $C76D.
 * No key starts jumpTicks; the values remain for any leftover airborne ticks.
 */
export const TEMP_JUMP_TICKS = 12;
export const TEMP_JUMP_PX = 2;

/**
 * Blob status bytes starting at $D2CD: energy, bridge power, firepower.
 * $D425 prints them; $D4E9 (via $D41F) decrements index A by C.
 * Energy uses new-game `$6343`/`$D425` (`$7F`). Platforms/firepower stay snapshot.
 */
export const START_ENERGY = 0x7f;
export const START_PLATFORMS = 0x30;
export const START_FIREPOWER = 0x7e;

/** `$6343` new-game pair; `$D425` then caps energy/firepower at `$7F`. */
export const NEW_GAME_ENERGY = 0x7f;
export const NEW_GAME_PLATFORMS = 0x32;
export const NEW_GAME_FIREPOWER = 0x7f;
export const NEW_GAME_ROOM = 8;
export const NEW_GAME_X = 0x88;
export const NEW_GAME_Y = 0x3f;

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
export const DEATH_STAR_PTR = 0xbec8;
export const APPEAR_FRAMES = 0x10;
export const DIE_FRAMES = 0x08;

/** $9F27 / n=1. lo=$C8 → $C350 A=$11. */
export const BADALIEN1_PTR = 0xb2c8;
/** n=2. hi $B3 → $C350 A=$01. */
export const BADALIEN2_PTR = 0xb388;
/** First annoying set; hi ≥ $B4. */
export const ALIEN1_PTR = 0xb448;
/** $9E67 CP $02 → IX+$19 := $05. */
export const KIND_BADALIEN2 = 2;
export const AI_FORCED_KIND2 = 5;

/** $A339 CP $C8 on the live pointer lo byte. */
export const GRAPHIC_LO_C8 = 0xc8;

/** $A305 AABB on $DD1D/$DD1E: |dx| < $0E, |dy| < $0B. */
export const HIT_DX = 0x0e;
export const HIT_DY = 0x0b;

/** $C350 register A ($A535 / $A33B / $CE7D / $A568 / $A33F). */
export const DEATH_A_TILE = 0x00;
export const DEATH_A_LETHAL = 0x01;
export const DEATH_A_ENERGY = 0x02;
export const DEATH_A_OBJ06 = 0x10;
export const DEATH_A_LETHAL_C8 = 0x11;
/** $C363 CP $10 — NC → $D2C4 := 1. */
export const DEATH_RESTORE_MIN_A = 0x10;
/** $C377 LD B,$2D — energy-death ink flash (applied to every death for visibility). */
export const DEATH_FLASH_FRAMES = 0x2d;
/** $C43F LD B,$50 — $A01B of four $BEC8 clouds. */
export const DEATH_FLY_FRAMES = 0x50;
/** $C451 LD B,$32 HALT after parking the clouds. */
export const DEATH_PAUSE_FRAMES = 0x32;
/** $C37E XOR $05 on $DD21 (and pad ink when $DD22=2). */
export const DEATH_INK_XOR = 0x05;
/** $C498 dirs then leftover timers for the four burst slots. */
export const DEATH_STAR_DIRS = [0x0a, 0x04, 0x06, 0x0c] as const;
export const DEATH_STAR_TIMERS = [0x09, 0x14, 0x05, 0x1c] as const;
/** $C465 $FF then $D425. */
export const RESPAWN_ENERGY = 0x7f;
/** $C466 OR $08 into $D2CE, not a max. */
export const PLAT_OR_ON_DEATH = 0x08;
/** $C46B Blob graphic after respawn. */
export const RESPAWN_PTR = 0xe074;
/** $C461 RET / $6730. */
export const GAME_OVER_MSG = "GAME OVER";

/** $CE77 type $06 from $9740 high nibble $60. AABB same as items ($CBBB). */
export const KILL_TYPE = 0x06;
export const KILL_ATTR_HI = 0x60;
export const KILL_AABB = 0x0f;

/** $A968 nibble $70 → 8-byte $9635 record, not $96FC. */
export const PULSE_ATTR_HI = 0x70;
export const PULSE_AABB_DX = 0x0e;
export const PULSE_AABB_DY = 0x16;
export const PULSE_COMP_BASE = 0x1a;
export const PULSE_COMP_BIAS = 2;
export const PULSE_PERIOD_MASK = 0x0c;
export const PULSE_PERIOD_BASE = 8;
/** $A670 CP $04 — $A66C visits one of four $9635 records per 50 Hz tick. */
export const PULSE_SLOTS = 4;
/** $A69B LD L,$05 — XOR this $DC55 layer on flag toggle. */
export const PULSE_TOGGLE_LAYER = 5;
/** $A6BD: timer∧3 → layer 6,7,7,6 while flag ≠ 0. */
export const PULSE_ANIM_LAYERS = [6, 7, 7, 6] as const;
/** $A6B7 AND $03 / ADD $44, then $DB88 OR $80; $DBA6 writes $44–$47. */
export const PULSE_ANIM_ATTR_BASE = 0x44;
/**
 * $DC55 + L×$10, two cells. L=5..7 are the spark; 0..3 are platforms.
 */
export const PULSE_LAYERS: Readonly<Record<number, ReadonlyArray<ReadonlyArray<number>>>> = {
  5: [
    [0x02, 0x02, 0x47, 0x67, 0x3d, 0x18, 0x10, 0x00],
    [0x08, 0x1c, 0x14, 0x36, 0xa2, 0xe0, 0xc0, 0x40],
  ],
  6: [
    [0x02, 0x12, 0x56, 0x5e, 0x56, 0x16, 0x16, 0x04],
    [0x88, 0xdc, 0xd0, 0x50, 0x8c, 0xd8, 0xd8, 0x50],
  ],
  7: [
    [0x08, 0x1c, 0x0d, 0x6f, 0x19, 0x2d, 0x27, 0x05],
    [0x80, 0xe0, 0xa6, 0x10, 0xfa, 0xa4, 0x10, 0x10],
  ],
};

/** $A90F nibble $90 → $96CB extra 2×2 markers. Drawn attrs never hold $90. */
export const EXTRA_ATTR_HI = 0x90;

/** $A991 nibble $80 → $9620, then $9F05. */
export const ATTR_NASTY_HI = 0x80;
export const FIXED_NASTY_PTR = 0xb2c8;
export const FIXED_NASTY_AI = 6;
export const FIXED_NASTY_DIR = 1;

/** $A2AE+$A285: after RRCA, A < $46 chases. */
export const AI5_CHASE_MAX = 0x46;

/** $CB58: $DD30 += 1 per tick, wrap at $78 → $D41F A=0 C=$04 (energy −4). */
export const ENERGY_DRAIN_WRAP = 0x78;
export const ENERGY_DRAIN_STEP = 4;
/** `$6452` zeros `$DD30` on new game. Snapshot `g$DD30` is `$51`. */
export const START_ENERGY_DRAIN = 0;
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

/** $A2B9 direction table (bytes of the following instructions). */
export const DIR_TABLE = [0x08, 0x09, 0x01, 0x05, 0x04, 0x06, 0x02, 0x0a] as const;

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

/**
 * Blob fire from $C85A. One shot in GRAFIX slot $DDB8 (table index 5).
 * $C8A8 LD B,$03 substeps of 2 px; $C8D0 CP $F2 ends the shot.
 * $C888 LD A,$02 / LD C,$01 → $D41F decrements $D2CF by 1.
 * Right graphic $E8B4 (blobfire frame 0); left $E974 ($E8B4+$C0).
 */
export const FIRE_SLOT = 5;
export const FIRE_STEPS = 3;
export const FIRE_PX = 2;
export const FIRE_END_X = 0xf2;
export const FIRE_COST = 1;
export const FIREPOWER_STAT = 2;
export const FIRE_RIGHT_PTR = 0xe8b4;
export const FIRE_LEFT_PTR = 0xe974;
export const FIRE_DIR_RIGHT = 1;
export const FIRE_DIR_LEFT = 2;
export const BULLET_HIT = 0x0e;
export const STAT_CAP = 0x7f;

/** $D2CC lives; $D2CD–$D2CF are energy / platforms / firepower. */
export const START_LIVES = 4;

/** $94E8: 45 × 4 bytes. $D16B writes byte1=$01 (row < 6 → hidden). */
export const ITEM_TABLE = 0x94e8;
export const ITEM_COUNT = 0x2d;
export const ITEM_STRIDE = 4;
export const ITEM_COLLECTED_Y = 0x01;
export const ITEM_NEAR = 0x0f;
export const ITEM_TYPE_BASE = 0x14;
export const INVENTORY_SLOTS = 4;
export const ITEM_ORIGIN_ROWS = 0x18;

/** $A350: 128 bytes, one bit per room. $AAB6 spawns extra 2×2; $A801 clears. */
export const A350 = 0xa350;
export const A350_BYTES = 0x80;
export const EXTRA_MIN_DAC = 0x55;
export const EXTRA_SPRITE_BASE = 0x11;
export const EXTRA_TYPE = 0x01;
export const EXTRA_CHEOPS = 0x19;
export const EXTRA_DAC_ROLLS = 0x14;

/**
 * $CCBC pairs for extra sprites $11–$18: offset from $D2CC, addend.
 * $17 is $CCCC overlay, not the table `$00,$00` at $CCC8.
 * $18 overflows the 15-byte table: $CCCA=$00, $CCCB=$01 → lives +1, no $7F cap.
 */
export const EXTRA_TABLE = 0xccbc;
export const EXTRA_CCCC = 0xcccc;
export const STATS_BASE = 0xd2cc;
export const STAT_HUD = 0xd425;
export const EXTRA_EFFECTS: ReadonlyArray<readonly [number, number]> = [
  [1, 0x20],
  [1, 0x60],
  [1, 0x40],
  [2, 0x32],
  [3, 0x20],
  [3, 0x3c],
  [0, 0x00],
  [0, 0x01],
];
/** $CC9A CP $17 / CALL Z,$CCCC before SUB $11. */
export const EXTRA_LIVES_SPRITE = 0x17;
/** $CC9A sprite $18 → $CCBC+$0E lives +1. */
export const EXTRA_LIFE_PLUS = 0x18;

/** $DD21 / $DDA1 default ink for GRAFIX merge ($D8B1). */
export const BLOB_INK = 7;

/**
 * $DD22 movement mode ($C625). 0 walk, 1 green lift $C761, 2 hoverpad $C967.
 * $C76D +2 is the lift, not the pad.
 */
export const DD22_WALK = 0;
export const DD22_LIFT = 1;
export const DD22_PAD = 2;

/** $C71D CP $64 — exact attribute of the green lift field. */
export const LIFT_ATTR = 0x64;
/** $C708 (X−8) ∧ $1F = 0; $C70F Y ≡ 0 (mod 3). */
export const LIFT_X_BIAS = 8;
export const LIFT_X_MASK = 0x1f;
export const LIFT_Y_MOD = 3;
/** $C76D ADD A,$02 — game-Y up while $DD22=1. */
export const LIFT_PX = 2;

/** $9F67 GRAFIX $AFC8, ink 7, slot 4. $C952 pad Y = blob Y − 8. */
export const HOVERPAD_PTR = 0xafc8;
export const HOVERPAD_INK = 7;
export const HOVERPAD_SLOT = 4;
export const HOVERPAD_Y_BIAS = 8;
export const HOVERPAD_FLY_PX = 2;
export const HOVERPAD_TYPE = 0x0c;
export const HOVERPAD_ATTR_HI = 0xc0;
export const NASTY_COUNT_WITH_PAD = 3;

/** $CA0B seated Blob pointers while boarded. */
export const SEATED_SETS = ["blobwr1", "blobxr", "blobxs", "blobsl", "blobwl1"] as const;

/** $CA15 pad shot: 8 px / tick, bounce, park after 2 wall hits. */
export const PAD_SHOT_PX = 8;
export const PAD_SHOT_BOUNCE_MAX = 2;
export const PAD_SHOT_PTRS = [0xb088, 0xb0b8, 0xb0e8, 0xb118] as const;
export const PAD_SHOT_Y_LO = 0x0f;
export const PAD_SHOT_Y_HI = 0x91;
/** $CB3F / $CB50 boarded room exits. */
export const PAD_EXIT_DOWN_Y = 0x16;
export const PAD_ENTER_UP_Y = 0x17;

/** $0D teleport ($CEC4). Names at $D036, 15 × (5 chars + room word). */
export const TELEPORT_TYPE = 0x0d;
export const TELEPORT_ATTR_HI = 0xd0;
export const TELEPORT_COUNT = 15;
export const TELEPORT_NAME_LEN = 5;
export const TELEPORT_TABLE_ADDR = 0xd036;
export const TELEPORT_INPUT_MASK = 0x03;
export const TELEPORT_REASON = 0x04;
export const TELEPORT_INVALID_REASON = 0x03;
export const TELEPORT_MSG_OK = "NOW TELEPORTING";
export const TELEPORT_MSG_BAD = "CODE NOT RECOGNISED";

/** $D036 name → dest room. Spawn XY comes from the dest $0D hotspot, not this table. */
export const TELEPORT_TABLE: ReadonlyArray<readonly [string, number]> = [
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
  ["AMAHA", 506],
];

/** $96FC type $00 from raw $9740 $01–$0F (subs $25/$26). Not nibble $80. */
export const DOOR_TYPE = 0x00;
export const DOOR_RAW_MIN = 0x01;
export const DOOR_RAW_MAX = 0x0f;
export const DOOR_INPUT_MASK = 0x03;
export const DOOR_SHIFT_X = 0x30;
/** $D2C4 after door minigame — skip $9C47 ($A51C). */
export const DOOR_REASON = 0x03;
/** Snapshot `$D2C6` = $7B78 (FRAMES freeze at game start). */
export const DOOR_D2C6 = 0x7b78;
export const DOOR_CODE_BC = 0x110b;
export const DOOR_KEY_SPRITE = 0x0f;
/** `$D6AB` one-digit wildcard (optional fidelity). */
export const DOOR_SINGLE_WILDCARD = 0x0e;
export const DOOR_DIGIT_MIN = 0x09;
export const DOOR_DIGIT_MAX = 0x0d;
export const DOOR_MSG_TITLE = "SECURITY DOOR";
export const DOOR_MSG_OK = "ACCESS AUTHORISED";
export const DOOR_MSG_BAD = "ACCESS CODE INVALID";

/** Room $C7 core / neighbour $C6. */
export const CORE_ROOM = 0xc7;
export const CORE_NEIGHBOR = 0xc6;
export const CORE_EJECT_X = 0xf0;
export const CORE_EJECT_Y = 0x27;
export const CORE_SLOTS = 9;
export const CORE_VICTORY_PAIRS = 5;
/** `$A78D` BC=`$0C0D` → full-screen attr (row,col); play row = `$0C`−`PLAY_ORIGIN`. */
export const CORE_PANEL_ATTR_ROW = 0x0c;
export const CORE_PANEL_ATTR_COL = 0x0d;
export const CORE_PANEL_STEP = 2;
/** `$C4B9` / `$C4BF`: delivered ink `$07`, pending start `$02`; `$C506` blinks pending. */
export const CORE_PANEL_INK_DONE = 0x07;
export const CORE_PANEL_INK_PENDING = 0x02;
/** Snapshot `$D2DE` after `$6399` (bit7 = undelivered). */
export const CORE_D2DE_INIT = [0x80, 0x8b, 0x89, 0x8a, 0x84, 0x85, 0xa1, 0x8c, 0x88] as const;
export const CORE_LEFT_INIT = 9;
export const CORE_PAIRS_INIT = 0;
export const CORE_TOOL_SPRITE = 0x10;
export const CORE_SOCKET_ATTR_HI = 0xb0;
export const CORE_SOCKET_TYPE = 0x0b;
/** `$95F0` eight (room_lo, flags) — bit7 of flags = room≥256. */
export const CORE_SOCKET_TABLE: ReadonlyArray<readonly [number, number]> = [
  [0xbe, 0x01],
  [0xfc, 0x01],
  [0xc4, 0x81],
  [0xe2, 0x81],
  [0xe6, 0x81],
  [0x86, 0x01],
  [0x09, 0x53],
  [0x55, 0x43],
];
/** `$9F78` live guardians: up to 4 of `$B208` at these XY when `$D2E8`>0. */
export const CORE_GUARD_XY: ReadonlyArray<readonly [number, number]> = [
  [80, 111],
  [168, 47],
  [80, 47],
  [168, 111],
];
export const CORE_GUARD_PTR = 0xb208;
/** `$9FC0` template after XY: ink `$06`, dir `$05`, speeds 2, period/timer 4, AI 0, aiPeriod `$0A`. */
export const CORE_GUARD_INK = 0x06;
export const CORE_GUARD_DIR = 0x05;
export const CORE_GUARD_PERIOD = 0x04;
export const CORE_GUARD_AI_PERIOD = 0x0a;
/** `$A757 LD B,$C8` — frames of `$A01B` + panel blink before eject to `$C6`. */
export const CORE_CEREMONY_FRAMES = 0xc8;
export const CORE_DELIVERED_Y = 0x0a;
export const CORES_COMPLETE_MSG = "THE CORES COMPLETE";

/** Score `$D413` / work `$D419` / `$D422`→`$D521`. */
export const SCORE_DIGITS = 6;
export const SCORE_FIRST_VISIT = 250;
export const SCORE_CORE_DELIVER = 10000;
export const SCORE_END_BONUS = 1000;
/** Kill: `(hi−$AE)×2` tens → points = that × 10. */
export const SCORE_KILL_HI_BASE = 0xae;
/** `$A390` visited bitmap (64 B / 512 rooms). Bit set = not yet scored. */
export const A390_BYTES = 0x40;
export const FRAME_HZ = 50;

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
