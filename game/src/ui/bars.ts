import { STAT_CAP } from "../constants";

/** Cap energy/platforms/firepower the way `$D469` does (`CP $7F` / store `$7F`). */
export function clampStat(val: number): number {
  const v = val & 0xff;
  return v > STAT_CAP ? STAT_CAP : v;
}

/**
 * `$D463` bar cells: up to 3× full `$28` plus one partial `$20`…`$27`.
 * `$7F` → four full `$28`. Fill left→right from column 16.
 */
export function barGlyphs(val: number): number[] {
  const v = clampStat(val);
  if (v === STAT_CAP) return [0x28, 0x28, 0x28, 0x28];
  // (val ROL 3) AND $03 → number of full cells
  const rol3 = ((v << 3) | (v >> 5)) & 0xff;
  const full = rol3 & 0x03;
  // (val ROR 2) AND $07 + $20
  const partial = ((v >> 2) & 0x07) + 0x20;
  const out: number[] = [];
  for (let i = 0; i < full; i++) out.push(0x28);
  out.push(partial);
  while (out.length < 4) out.push(0x20);
  return out.slice(0, 4);
}

/** Pixel width of the partial glyph `$20`…`$28` (0…8). */
export function barPartialWidth(glyph: number): number {
  if (glyph === 0x20) return 0;
  if (glyph === 0x28) return 8;
  if (glyph >= 0x21 && glyph <= 0x27) return glyph - 0x20;
  return 0;
}
