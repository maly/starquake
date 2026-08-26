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

export interface Prepared {
  graphics: Graphic[];
  sprites: Graphic[];
  actorsBySet: Map<string, Graphic[]>;
  actorsByPtr: Map<number, Graphic>;
  blocks: number[][];
  rooms: Room[];
  itemsByRoom: Item[][];
  /** Object $0C stations per room, last one is $D2CA. */
  stationsByRoom?: Hotspot[][];
  /** Object $0D teleports per room. */
  teleportsByRoom?: Hotspot[][];
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
}

export interface EntityCache {
  room: number;
  entities: Entity[];
}

export interface InventoryItem {
  sprite: number;
  attr: number;
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
  buildLatch: boolean;
  pickupLatch: boolean;
  dac0: number;
  dac: DacState;
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
  /** $19 Cheops extra: state only, no exchange UI. */
  cheops: boolean;
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
  /** Last teleport overlay line. */
  message: string;
  /** After a code prompt, ignore Left/Right until they are released. */
  teleportLatch: boolean;
  /** Viewer supplies a blocking 5-char prompt; dump/tests call applyTeleport. */
  readTeleportCode?: (ownName: string) => string | null;
}

export interface RenderOpts {
  items?: boolean;
  overlay?: boolean;
  blob?: { x: number; y: number; set: string; frame: number } | null;
  enemies?: boolean;
}
