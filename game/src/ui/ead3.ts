import { ATTR_INK_SPECIAL, ATTR_PAPER_SPECIAL, EA62_MIN } from "../constants";

/** `$EA65` `$EA62`: ink from `$DAC0∧7` if ≥2, else `(row∧7)∨$02`. */
export function ea62ForRow(row: number, dac0 = 0): number {
  const a = dac0 & 7;
  if (a >= EA62_MIN) return a;
  return (row & 7) | EA62_MIN;
}

/** `$EAD3` specials on the raw ATTR stream from `graphics.json`. */
export function resolveEad3Attr(raw: number, ea62: number, ea63 = 0x05): number {
  const masked = raw & 0x3f;
  if (masked === ATTR_PAPER_SPECIAL) return (raw & 0xc0) | (ea63 & 0xff);
  if (masked === ATTR_INK_SPECIAL) return (raw & 0xf8) | (ea62 & 0xff);
  return raw & 0xff;
}
