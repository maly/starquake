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
}

export interface Prepared {
  graphics: Graphic[];
  sprites: Graphic[];
  actorsBySet: Map<string, Graphic[]>;
  blocks: number[][];
  rooms: Room[];
  itemsByRoom: Item[][];
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
export interface World {
  terrain: Buffers;
  energy: number;
  platforms: number;
  firepower: number;
  slots: Array<PlatformSlot | null>;
  slotIndex: number;
  buildLatch: boolean;
  dac0: number;
}

export interface RenderOpts {
  items?: boolean;
  overlay?: boolean;
  blob?: { x: number; y: number; set: string; frame: number } | null;
}
