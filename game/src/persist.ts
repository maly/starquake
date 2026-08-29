import type { BlobState } from "./physics";
import type { Item, World } from "./types";

export type DecodeStatus = "ok" | "empty" | "invalid";

export interface SaveV1 {
  v: 1;
  blob: BlobState;
  world: World;
  itemTable: Item[];
  control: number;
  udk: string[];
}

export type DecodeResult = { status: "ok"; data: SaveV1 } | { status: "empty" | "invalid" };

function pack(value: unknown): unknown {
  if (value instanceof Uint8Array) return { $u8: Array.from(value) };
  if (value instanceof Int16Array) return { $i16: Array.from(value) };
  if (Array.isArray(value)) return value.map(pack);
  if (value && typeof value === "object") {
    const o: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) o[k] = pack(v);
    return o;
  }
  return value;
}

function revive(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(revive);
  if (value && typeof value === "object") {
    const o = value as Record<string, unknown>;
    if (Array.isArray(o.$u8)) return Uint8Array.from(o.$u8 as number[]);
    if (Array.isArray(o.$i16)) return Int16Array.from(o.$i16 as number[]);
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(o)) out[k] = revive(v);
    return out;
  }
  return value;
}

export function encodeSave(input: {
  blob: BlobState;
  world: World;
  itemTable: Item[];
  control: number;
  udk: string[];
}): string {
  const world = { ...input.world, sfx: [] as number[], buzz: [] as Int16Array[] };
  return JSON.stringify(
    pack({
      v: 1,
      blob: input.blob,
      world,
      itemTable: input.itemTable,
      control: input.control,
      udk: input.udk,
    }),
  );
}

function isBlob(x: unknown): x is BlobState {
  if (!x || typeof x !== "object") return false;
  const b = x as BlobState;
  return typeof b.x === "number" && typeof b.y === "number" && typeof b.room === "number";
}

function isWorld(x: unknown): x is World {
  if (!x || typeof x !== "object") return false;
  const w = x as World;
  return typeof w.energy === "number" && w.collected instanceof Uint8Array;
}

export function decodeSave(raw: string | null | undefined): DecodeResult {
  if (raw == null || raw === "") return { status: "empty" };
  try {
    const parsed = revive(JSON.parse(raw)) as Partial<SaveV1>;
    if (parsed.v !== 1) return { status: "invalid" };
    if (!isBlob(parsed.blob) || !isWorld(parsed.world)) return { status: "invalid" };
    if (!Array.isArray(parsed.itemTable) || !Array.isArray(parsed.udk)) return { status: "invalid" };
    if (typeof parsed.control !== "number") return { status: "invalid" };
    return {
      status: "ok",
      data: {
        v: 1,
        blob: parsed.blob,
        world: parsed.world,
        itemTable: parsed.itemTable,
        control: parsed.control,
        udk: parsed.udk.map(String),
      },
    };
  } catch {
    return { status: "invalid" };
  }
}
