import { INVENTORY_SLOTS } from "./constants";
import type { World } from "./types";

/** Viewer/dump helper: `$0F`, `0x10`, hex without prefix, or decimal. */
export function parseCheatSprite(text: string): number | null {
  const s = text.trim();
  if (!s) return null;
  let n: number;
  if (/^\$[0-9a-f]+$/i.test(s)) n = parseInt(s.slice(1), 16);
  else if (/^0x[0-9a-f]+$/i.test(s)) n = parseInt(s, 16);
  else if (/^[0-9a-f]+$/i.test(s) && /[a-f]/i.test(s)) n = parseInt(s, 16);
  else if (/^\d+$/.test(s)) n = parseInt(s, 10);
  else return null;
  if (!Number.isFinite(n) || n < 0 || n > 0xff) return null;
  return n & 0xff;
}

/**
 * Dev-only: write sprite into inventory index 0–3.
 * Pads earlier slots with `{0,0}` so the index stays put (not ROM `$D1CA`).
 */
export function setInventorySlot(world: World, slot: number, sprite: number, attr = 3): void {
  const i = Math.max(0, Math.min(INVENTORY_SLOTS - 1, slot | 0));
  while (world.inventory.length < INVENTORY_SLOTS) world.inventory.push({ sprite: 0, attr: 0 });
  world.inventory[i] = { sprite: sprite & 0xff, attr: attr & 0xff };
}
