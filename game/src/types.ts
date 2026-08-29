export type Rgb = readonly [number, number, number];

export interface Cell {
  row: number;
  col: number;
  data: number[];
  attr: number | null;
}

export interface Graphic {
  id: number;
  ptr: number;
  cols: number;
  rows: number;
  cells: Cell[];
  kind?: string;
  set?: string;
  frame?: number;
}

export interface Item {
  index: number;
  room: number;
  col: number;
  row: number;
  placed: boolean;
  sprite: number;
  attr_bits: number;
  raw: number[];
}

export interface Room {
  id: number;
  blocks: number[];
  attributes: number[][];
  solid: number[][];
}

export interface GameData {
  graphics: { graphics: Graphic[] };
  sprites: { graphics: Graphic[] };
  actors?: { graphics: Graphic[]; sets?: { name: string; ptr: number; frames: number; kind: string }[] };
  blocks: { blocks: { id: number; subblocks: number[] }[] };
  rooms: { rooms: Room[]; play_origin_row?: number };
  items: { items: Item[] };
  /** $9740 raw bytes from block_attrs.json — high nibble $C0/$D0 never lands in drawn attrs. */
  blockAttrs?: { attributes: Array<{ id: number; raw: number; attr?: number }> };
}

/** Pixel hotspot from $AA02 (X left, Y from the bottom). */
export interface Hotspot {
  x: number;
  y: number;
}

/** $9635 record from $9740 nibble $70: cell col/row (full-screen, PLAY_ORIGIN in row). */
export interface PulseDef {
  col: number;
  row: number;
}

/** Live $9635 slot: period ($DAC0∧$0C)+8, flag starts 0, $A66C XORs flag. */
export interface Pulse extends PulseDef {
  period: number;
  timer: number;
  flag: number;
  /**
   * Persist XOR of `$DC55` layers (`$DB88` / `$DB50`) — 2 cells × 8 bytes.
   * Toggle XORs L5; while on, each `$A66C` visit XORs `$A6BD[timer∧3]`.
   */
  xorInk: Uint8Array;
  /** Last `$DB88` attribute (anim `$44+dac` or toggle `$47`). */
  sparkAttr: number;
  /** Last anim layer copied into xorInk (`$A6BD` value), or null. */
  lastAnim: number | null;
}

/** $D2DC / $D2C5 snapshot taken at the last room entry. Y is game-Y ($DD1E). */
export interface RoomEntry {
  x: number;
  y: number;
  dd22: number;
}

export interface Prepared {
  graphics: Graphic[];
  sprites: Graphic[];
  actorsBySet: Map<string, Graphic[]>;
  actorsByPtr: Map<number, Graphic>;
  blocks: number[][];
  rooms: Room[];
  itemsByRoom: Item[][];
  /** Live `$94E8` (45). */
  itemTable?: Item[];
  /** Snapshot copy for `$6351` reset. */
  itemTemplate?: Item[];
  /** Object $0C stations per room, last one is $D2CA. */
  stationsByRoom?: Hotspot[][];
  /** Object $0D teleports per room. */
  teleportsByRoom?: Hotspot[][];
  /** Object $06 poison plants, pixel XY from nibble $60. */
  killsByRoom?: Hotspot[][];
  /** $9635 pulses from nibble $70 (cell col/row). */
  pulsesByRoom?: PulseDef[][];
  /** $9F05 fixed $B2C8 from nibble $80, pixel XY. */
  fixedNastiesByRoom?: Hotspot[][];
  /** $96CB from $A90F nibble $90 (col/row of 2×2 extra spawn). Drawn attrs are never $90. */
  extraMarksByRoom?: Array<Array<{ col: number; row: number }>>;
  /** Type $00 security doors from raw $01–$0F (not nibble $80). */
  doorsByRoom?: Hotspot[][];
  /** Type $0F horizontal passages from nibble $F0. */
  passagesByRoom?: Hotspot[][];
  /** Type $0E machine from nibble $E0. Pixel XY like `$AA02`. */
  machinesByRoom?: Hotspot[][];
  /** Type $0B / nibble $B0 sockets; slot indexes into `$95F0`. */
  socketsByRoom?: SocketHotspot[][];
}

/** `$95F0` socket hotspot plus table index. */
export interface SocketHotspot extends Hotspot {
  slot: number;
}

/** `$6730` end fields after `$64A0` (+1000; scramble skipped). */
export interface EndResult {
  scoreDigits: number[];
  adventure: number;
  timeMinutes: number;
  timeSeconds: number;
  coresReplaced: number;
  victory: boolean;
  banner?: string;
}

export interface Buffers {
  data: Uint8Array;
  attr: Uint8Array;
}

/** One built bridge in the $DBBB table (column, row, life, dissolve phase). */
export interface PlatformSlot {
  col: number;
  row: number;
  life: number;
  phase: number;
}

/**
 * Mutable play-area for the current room. Export rooms[] is the template
 * copied in at $A426 / $A7FC; $A4B1 then zeros the 12 platform slots.
 */
export interface DacState {
  dac0: number;
  dac2: number;
  dac4: number;
  db19: number;
  db1a: number;
}

/** One GRAFIX slot from $DD38 (X/Y are $DD1D/$DD1E: X left, Y from the bottom). */
export interface Entity {
  x: number;
  y: number;
  ink: number;
  set: string;
  frame: number;
  ptr: number;
  basePtr: number;
  dir: number;
  speedX: number;
  speedY: number;
  period: number;
  timer: number;
  state: number;
  stateTimer: number;
  ai: number;
  aiPeriod: number;
  aiCount: number;
  homeX: number;
  homeY: number;
  /**
   * False after spawn: `$D2F0` bounce is skipped so the 24×16 GRAFIX may sit in
   * `attr < $40`. Latches true once every occupied cell is air; then walls bounce.
   */
  clipTerrain: boolean;
}

export interface EntityCache {
  room: number;
  entities: Entity[];
}

export interface InventoryItem {
  sprite: number;
  attr: number;
  /** `$94E8` index; needed to drop the overflowed slot back (`$D236`). */
  index?: number;
}

/** Extra 2×2 from $AAB6. X/Y are $DD1D/$DD1E (pixel X, Y from the bottom). */
export interface ExtraObject {
  sprite: number;
  ink: number;
  col: number;
  row: number;
  x: number;
  y: number;
}

export interface World {
  terrain: Buffers;
  energy: number;
  platforms: number;
  firepower: number;
  lives: number;
  slots: Array<PlatformSlot | null>;
  slotIndex: number;
  /** `$D0B3` type `$05` for this room visit; `$A80A` rebuilds `$0E`. */
  machineSpent: string[];
  /** $9634: which of 4 $9635 pulse records $A66C visits this tick. */
  pulseIndex: number;
  buildLatch: boolean;
  pickupLatch: boolean;
  dac0: number;
  dac: DacState;
  /** `$D2C6` freeze of FRAMES at new game (`$636F`). */
  d2c6: number;
  entities: Entity[];
  entityCache: EntityCache | null;
  cacheRoom: number;
  nastyCount: number;
  spawnGuard: number;
  energyDrain: number;
  /** $DDB8 GRAFIX slot. Parked at X=0 Y=$0F ptr $DF40 while $DD2A=0. */
  bullet: Entity;
  /** $DD2A: 0 idle, 1 right, 2 left. */
  fireDir: number;
  /** $DD2B last horizontal bits (1 right / 2 left). */
  aim: number;
  /** $94E8 byte1=$01 per index; stays collected across rooms. */
  collected: Uint8Array;
  /** Live copy of $A350 (128 bytes). */
  a350: Uint8Array;
  extra: ExtraObject | null;
  inventory: InventoryItem[];
  /** `$CCF1` succeeded (inventory swap + `$A801`). */
  cheops: boolean;
  /** Viewer cheat: skip `$CB58` drain and `$C350` death. Not ROM. */
  cheatGod: boolean;
  /** $DD22: 0 walk, 1 lift $C761, 2 hoverpad $C967. */
  dd22: number;
  /** $DD24 last nonzero dirs 0–3 ($C61B). Releasing keys does not clear it. */
  lastDir: number;
  /** $D2CA hoverpad station XY after $A80A, or (0,0). */
  station: Hotspot;
  /** GRAFIX slot 4. Null when $D2CA=0 and $DD22≠2. */
  pad: Entity | null;
  /** $DD2D pad-shot direction (slot 5 shared with Blob fire). */
  padShotDir: number;
  /** $DD2E wall-hit count; park at 2 ($CAF7). */
  padShotHits: number;
  /** $DD2F modulo 4 into $CB2B. */
  padShotFrame: number;
  /** $DD26 seated pose 0..4. */
  seatPose: number;
  /** $DD28 while boarded. */
  seatTick: number;
  /** Last teleport / door overlay line. */
  message: string;
  /** After a code prompt, ignore Left/Right until they are released. */
  teleportLatch: boolean;
  /**
   * In-game overlay FSM (door inventory minigame / teleport 5-char input).
   * `kind: "none"` when idle. Dump/tests may still call applyTeleport directly.
   */
  ui: import("./ui/overlay").UiState;
  /** $C461 / $6730 — further ticks return immediately. */
  gameOver: boolean;
  /** Victory path set `$A7CF`; same EndResult shape as lives=0. */
  victory: boolean;
  /** `$6730` SCORE/ADVENTURE/TIME/CORES after `$64A0`. */
  endResult: EndResult | null;
  /** 6 BCD digits `$D413`…`$D418`. */
  scoreDigits: number[];
  /** `$A390` first-visit bits (set = not yet +250). */
  a390: Uint8Array;
  visitedCount: number;
  /** 50 Hz frame counter from new game (FRAMES `$5C78`). */
  frames: number;
  /** `$D2DE` nine core IDs; bit7 = still needed. */
  d2de: number[];
  /** Original `$D2DE` after `$6399` (bit7 set); panel keeps these after delivery overwrites the slot with 0…8. */
  d2deNeed: number[];
  /** `$D2E7` cores left (start 9). */
  coresLeft: number;
  /** `$D2E8` even-delivery pairs / core guardians (0…5). */
  corePairs: number;
  /** `$A6C1` wait loop: hide Blob, fly guardians, then eject `$C6`. */
  corePhase: "ceremony" | null;
  coreTicks: number;
  /** Live `$95F0` socket flags (8 bytes). */
  socketFlags: number[];
  /** $D2C4. Set by $C35E when A ≥ $10; checkpoint restore on respawn. */
  d2c4: number;
  /** Last A passed to $C350, for --death-test. */
  deathA: number;
  /** $C35E flash / $BEC8 burst / HALT pause. Null when not dying. */
  deathPhase: "flash" | "fly" | "pause" | null;
  deathTicks: number;
  /** $DD21 Blob ink; $C37E XOR $05 while flashing. */
  blobInk: number;
  /** Dummy $DF40 after flash — stars replace the sprite. */
  blobHidden: boolean;
  /** $D2DC / $D2C5: Blob XY (game-Y) and $DD22 at last room entry. */
  entry: RoomEntry;
  /** Live $9635 pulses for the current room. */
  pulses: Pulse[];
  /** Queued `$D7C0` indexes A; browser drains after tick. */
  sfx: number[];
  /** `$C6FF` walk XOR state; snapshot `$14`, XOR `$01` → `$14`/`$15`. */
  sfxStep: number;
  /** `$A41B`/`$A41C` live voice (`$A57B`). */
  chan: ChanState;
  /** One 20 ms `$A57B` burst per playing tick; browser drains after tick. */
  buzz: Int16Array[];
}

/** `$A41B` request + `$A41D`…`$A422` live 4-byte voice. */
export interface ChanState {
  req0: number;
  req1: number;
  dur: number;
  pitch: number;
  delta: number;
  noise: number;
  count: number;
  reload: number;
}

export interface RenderOpts {
  items?: boolean;
  overlay?: boolean;
  blob?: { x: number; y: number; set: string; frame: number; ink?: number } | null;
  enemies?: boolean;
}
